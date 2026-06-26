const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, isEditorOrAdmin, checkDeptOwnership } = require('../middleware/auth');

const TAX_RATE = 0.07;

// Audit log helper
async function createAuditLog(entryId, userId, actionType, oldValue, newValue) {
  try {
    await db.query(
      `INSERT INTO audit_logs (entry_id, user_id, action_type, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)`,
      [entryId, userId, actionType, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]
    );
  } catch (err) {
    console.error('Audit log generation failed:', err);
  }
}

// Get or create period id
async function getOrCreatePeriod(month, year, userId) {
  const periodRes = await db.query(
    'SELECT id, status FROM budget_periods WHERE month = $1 AND year = $2',
    [month, year]
      );
  if (periodRes.rows.length > 0) {
    return periodRes.rows[0];
  }
  const createRes = await db.query(
    'INSERT INTO budget_periods (month, year, created_by) VALUES ($1, $2, $3) RETURNING id, status',
    [month, year, userId]
  );
  return createRes.rows[0];
}

// @route   GET /api/expenses
// @desc    Get expense entries for a specific period and department
router.get('/expenses', verifyToken, async (req, res) => {
  const { month, year, department_id } = req.query;

  if (!month || !year || !department_id) {
    return res.status(400).json({ error: 'month, year, and department_id are required' });
  }

  // Check department access (Editors can only see their own department)
  if (req.user.role === 'editor' && req.user.department_id !== department_id) {
    return res.status(403).json({ error: 'Access denied to this department data' });
  }

  try {
    const periodRes = await db.query(
      `SELECT id, status, month, year, created_at,
              (SELECT MAX(e.updated_at) FROM expense_entries e
               WHERE e.period_id = budget_periods.id AND e.is_deleted = false) AS last_modified
       FROM budget_periods WHERE month = $1 AND year = $2`,
      [parseInt(month), parseInt(year)]
    );

    if (periodRes.rows.length === 0) {
      return res.json({ period: null, entries: [] });
    }

    const period = periodRes.rows[0];

    const entriesRes = await db.query(
      `SELECT e.*, c.cc_code, c.cc_name, d.dept_name, d.dept_code, u.full_name as creator_name
       FROM expense_entries e
       LEFT JOIN cost_centers c ON e.cost_center_id = c.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.period_id = $1 AND e.department_id = $2 AND e.is_deleted = false
       ORDER BY e.sort_order ASC`,
      [period.id, department_id]
    );

    res.json({
      period,
      entries: entriesRes.rows
    });
  } catch (err) {
    console.error('Fetch expenses error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/expenses
// @desc    Create a new expense entry (with fractional sort order logic)
router.post('/expenses', verifyToken, isEditorOrAdmin, checkDeptOwnership, async (req, res) => {
  const {
    month,
    year,
    department_id,
    cost_center_id,
    account_code,
    item_name,
    amount,
    reason_note,
    insert_after_id, // Optional UUID of the row we want to insert after
    is_budget_cut,
    entry_type
  } = req.body;

  if (!month || !year || !department_id || !item_name || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ error: 'Amount must be a non-negative number' });
  }

  try {
    const period = await getOrCreatePeriod(parseInt(month), parseInt(year), req.user.id);
    if (period.status === 'closed') {
      return res.status(400).json({ error: 'Budget period is closed for modifications' });
    }

    // Server-side tax and total calculation (Source of Truth)
    const taxAmount = parseFloat((parsedAmount * TAX_RATE).toFixed(2));
    const totalAmount = parseFloat((parsedAmount + taxAmount).toFixed(2));

    // Calculate sort_order
    let newSortOrder = 10.0;

    if (insert_after_id) {
      // Find sort_order of row to insert after (S1)
      const afterRes = await db.query(
        'SELECT sort_order FROM expense_entries WHERE id = $1 AND period_id = $2 AND department_id = $3',
        [insert_after_id, period.id, department_id]
      );

      if (afterRes.rows.length > 0) {
        const s1 = afterRes.rows[0].sort_order;

        // Find the next row's sort_order (S2)
        const nextRes = await db.query(
          `SELECT sort_order FROM expense_entries 
           WHERE period_id = $1 AND department_id = $2 AND sort_order > $3 AND is_deleted = false
           ORDER BY sort_order ASC LIMIT 1`,
          [period.id, department_id, s1]
        );

        if (nextRes.rows.length > 0) {
          const s2 = nextRes.rows[0].sort_order;
          newSortOrder = (s1 + s2) / 2.0;
        } else {
          newSortOrder = s1 + 10.0;
        }
      }
    } else {
      // Append to the end
      const maxRes = await db.query(
        'SELECT MAX(sort_order) as max_sort FROM expense_entries WHERE period_id = $1 AND department_id = $2 AND is_deleted = false',
        [period.id, department_id]
      );
      if (maxRes.rows[0].max_sort !== null) {
        newSortOrder = maxRes.rows[0].max_sort + 10.0;
      }
    }

    if (cost_center_id) {
      const ccVal = await db.query(
        'SELECT is_active, is_deleted FROM cost_centers WHERE id = $1',
        [cost_center_id]
      );
      if (ccVal.rows.length === 0 || ccVal.rows[0].is_deleted || !ccVal.rows[0].is_active) {
        return res.status(400).json({ error: 'Selected cost center is inactive or deleted' });
      }
    }

    const insertRes = await db.query(
      `INSERT INTO expense_entries (
        period_id, department_id, cost_center_id, account_code, item_name,
        amount, tax_amount, total_amount, reason_note, sort_order, created_by, is_budget_cut, entry_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        period.id, department_id, cost_center_id || null, account_code || null, item_name.trim(),
        parsedAmount, taxAmount, totalAmount, reason_note || null, newSortOrder, req.user.id,
        is_budget_cut === true || is_budget_cut === 'true', entry_type || 'รายจ่าย'
      ]
    );

    const newEntry = insertRes.rows[0];

    // Create Audit Log
    await createAuditLog(newEntry.id, req.user.id, 'create', null, newEntry);

    // Fetch full details of new entry with joins
    const detailsRes = await db.query(
      `SELECT e.*, c.cc_code, c.cc_name, d.dept_name, d.dept_code, u.full_name as creator_name
       FROM expense_entries e
       LEFT JOIN cost_centers c ON e.cost_center_id = c.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = $1`,
      [newEntry.id]
    );

    res.status(201).json(detailsRes.rows[0]);
  } catch (err) {
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/expenses/:id
// @desc    Update an expense entry (with audit log and auto recalculation)
router.patch('/expenses/:id', verifyToken, isEditorOrAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    cost_center_id,
    account_code,
    item_name,
    amount,
    reason_note,
    is_budget_cut,
    entry_type,
    sort_order
  } = req.body;

  try {
    // 1. Fetch current entry
    const entryRes = await db.query('SELECT * FROM expense_entries WHERE id = $1', [id]);
    if (entryRes.rows.length === 0) {
      return res.status(404).json({ error: 'Expense entry not found' });
    }

    const currentEntry = entryRes.rows[0];

    // 2. Check department access
    if (req.user.role === 'editor' && req.user.department_id !== currentEntry.department_id) {
      return res.status(403).json({ error: 'Access denied to this department data' });
    }

    // 3. Check if period is closed
    const periodRes = await db.query('SELECT status FROM budget_periods WHERE id = $1', [currentEntry.period_id]);
    if (periodRes.rows[0].status === 'closed') {
      return res.status(400).json({ error: 'Budget period is closed for modifications' });
    }

    if (cost_center_id !== undefined && cost_center_id !== currentEntry.cost_center_id) {
      if (cost_center_id !== null) {
        const ccVal = await db.query(
          'SELECT is_active, is_deleted FROM cost_centers WHERE id = $1',
          [cost_center_id]
        );
        if (ccVal.rows.length === 0 || ccVal.rows[0].is_deleted || !ccVal.rows[0].is_active) {
          return res.status(400).json({ error: 'Selected cost center is inactive or deleted' });
        }
      }
    }

    // Build update parameters dynamically
    let query = 'UPDATE expense_entries SET ';
    const params = [];
    let paramIndex = 1;

    if (cost_center_id !== undefined) {
      query += `cost_center_id = $${paramIndex++}, `;
      params.push(cost_center_id);
    }
    if (account_code !== undefined) {
      query += `account_code = $${paramIndex++}, `;
      params.push(account_code);
    }
    if (item_name !== undefined) {
      query += `item_name = $${paramIndex++}, `;
      params.push(item_name.trim());
    }
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ error: 'Amount must be a non-negative number' });
      }
      const taxAmount = parseFloat((parsedAmount * TAX_RATE).toFixed(2));
      const totalAmount = parseFloat((parsedAmount + taxAmount).toFixed(2));

      query += `amount = $${paramIndex++}, tax_amount = $${paramIndex++}, total_amount = $${paramIndex++}, `;
      params.push(parsedAmount, taxAmount, totalAmount);
    }
    if (reason_note !== undefined) {
      query += `reason_note = $${paramIndex++}, `;
      params.push(reason_note);
    }
    if (is_budget_cut !== undefined) {
      query += `is_budget_cut = $${paramIndex++}, `;
      params.push(is_budget_cut === true || is_budget_cut === 'true');
    }
    if (entry_type !== undefined) {
      query += `entry_type = $${paramIndex++}, `;
      params.push(entry_type);
    }
    if (sort_order !== undefined) {
      const parsedSortOrder = parseFloat(sort_order);
      if (isNaN(parsedSortOrder)) {
        return res.status(400).json({ error: 'sort_order must be a number' });
      }
      query += `sort_order = $${paramIndex++}, `;
      params.push(parsedSortOrder);
    }

    query += `updated_at = now(), `;

    // Remove trailing comma and space
    query = query.slice(0, -2);
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    const updateRes = await db.query(query, params);
    const updatedEntry = updateRes.rows[0];

    // Create Audit Log
    await createAuditLog(id, req.user.id, 'update', currentEntry, updatedEntry);

    // Fetch full details of updated entry
    const detailsRes = await db.query(
      `SELECT e.*, c.cc_code, c.cc_name, d.dept_name, d.dept_code, u.full_name as creator_name
       FROM expense_entries e
       LEFT JOIN cost_centers c ON e.cost_center_id = c.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN users u ON e.created_by = u.id
       WHERE e.id = $1`,
      [id]
    );

    res.json(detailsRes.rows[0]);
  } catch (err) {
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Soft delete an expense entry
router.delete('/expenses/:id', verifyToken, isEditorOrAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const entryRes = await db.query('SELECT * FROM expense_entries WHERE id = $1', [id]);
    if (entryRes.rows.length === 0) {
      return res.status(404).json({ error: 'Expense entry not found' });
    }

    const currentEntry = entryRes.rows[0];

    // Check department access
    if (req.user.role === 'editor' && req.user.department_id !== currentEntry.department_id) {
      return res.status(403).json({ error: 'Access denied to this department data' });
    }

    // Check if period is closed
    const periodRes = await db.query('SELECT status FROM budget_periods WHERE id = $1', [currentEntry.period_id]);
    if (periodRes.rows[0].status === 'closed') {
      return res.status(400).json({ error: 'Budget period is closed for modifications' });
    }

    // Soft delete
    const deleteRes = await db.query(
      'UPDATE expense_entries SET is_deleted = true, updated_at = now() WHERE id = $1 RETURNING *',
      [id]
    );
    const deletedEntry = deleteRes.rows[0];

    // Create Audit Log
    await createAuditLog(id, req.user.id, 'delete', currentEntry, deletedEntry);

    res.json({ message: 'Entry deleted successfully', id });
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/audit-logs
// @desc    Get all audit logs (Admin only)
router.get('/audit-logs', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin only' });
  }

  try {
    const logsRes = await db.query(
      `SELECT a.*, u.username, u.full_name, e.item_name
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN expense_entries e ON a.entry_id = e.id
       ORDER BY a.action_at DESC
       LIMIT 100`
    );
    res.json(logsRes.rows);
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/periods
// @desc    Get all budget periods
router.get('/periods', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*,
              (SELECT MAX(e.updated_at) FROM expense_entries e
               WHERE e.period_id = p.id AND e.is_deleted = false) AS last_modified
       FROM budget_periods p
       ORDER BY p.year DESC, p.month DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch periods error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/periods
// @desc    Create/initialize a budget period
router.post('/periods', verifyToken, async (req, res) => {
  const { month, year } = req.body;
  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year are required' });
  }
  try {
    const period = await getOrCreatePeriod(parseInt(month), parseInt(year), req.user.id);
    res.status(201).json(period);
  } catch (err) {
    console.error('Create period error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/periods/:id
// @desc    Update budget period status (open/closed) (Admin only)
router.patch('/periods/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin only' });
  }

  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['open', 'closed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be open or closed' });
  }

  try {
    const result = await db.query(
      'UPDATE budget_periods SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget period not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update period error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/periods/:id
// @desc    Delete a budget period and its entries (Admin only)
router.delete('/periods/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin only' });
  }

  const { id } = req.params;

  try {
    // Delete audit logs first due to foreign key constraints
    await db.query('DELETE FROM audit_logs WHERE entry_id IN (SELECT id FROM expense_entries WHERE period_id = $1)', [id]);
    
    // Delete expense entries and export logs first due to foreign key constraints
    await db.query('DELETE FROM expense_entries WHERE period_id = $1', [id]);
    await db.query('DELETE FROM export_logs WHERE period_id = $1', [id]);
    const result = await db.query('DELETE FROM budget_periods WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget period not found' });
    }

    res.json({ message: 'Budget period and entries deleted successfully', id });
  } catch (err) {
    console.error('Delete period error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// @route   GET /api/dashboard
// @desc    Get dashboard metrics and summaries
router.get('/dashboard', verifyToken, async (req, res) => {
  const { month, year, department_id } = req.query;
  
  let targetDeptId = req.user.role === 'editor' ? req.user.department_id : department_id;
  if (targetDeptId === 'all' || targetDeptId === '') targetDeptId = null;

  try {
    // 1. Get period
    let period;
    if (month && year) {
      const periodRes = await db.query(
        'SELECT id, month, year, status FROM budget_periods WHERE month = $1 AND year = $2',
        [parseInt(month), parseInt(year)]
      );
      period = periodRes.rows[0];
    } else {
      // Default to latest period
      const latestPeriodRes = await db.query(
        'SELECT id, month, year, status FROM budget_periods ORDER BY year DESC, month DESC LIMIT 1'
      );
      period = latestPeriodRes.rows[0];
    }

    if (!period) {
      return res.json({
        period: null,
        stats: { totalAmount: 0, amountBeforeTax: 0, taxAmount: 0, budgetCutAmount: 0, budgetCutTotalAmount: 0 },
        costCenterBreakdown: [],
        monthlyTrend: [],
        latestSheets: []
      });
    }

    // 2. Total amount and budget cut amount
    const totalsQuery = `
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(amount), 0) as amount_before_tax,
        COALESCE(SUM(tax_amount), 0) as tax_amount,
        COALESCE(SUM(CASE WHEN is_budget_cut = true THEN amount ELSE 0 END), 0) as budget_cut_amount,
        COALESCE(SUM(CASE WHEN is_budget_cut = true THEN total_amount ELSE 0 END), 0) as budget_cut_total_amount
      FROM expense_entries
      WHERE period_id = $1 AND is_deleted = false AND ($2::uuid IS NULL OR department_id = $2)
    `;
    const totalsRes = await db.query(totalsQuery, [period.id, targetDeptId]);
    const stats = {
      totalAmount: parseFloat(totalsRes.rows[0].total_amount),
      amountBeforeTax: parseFloat(totalsRes.rows[0].amount_before_tax),
      taxAmount: parseFloat(totalsRes.rows[0].tax_amount),
      budgetCutAmount: parseFloat(totalsRes.rows[0].budget_cut_amount),
      budgetCutTotalAmount: parseFloat(totalsRes.rows[0].budget_cut_total_amount)
    };

    // 3. Cost Center Breakdown (only for budget cut entries in this period)
    const ccQuery = `
      SELECT 
        c.cc_code, 
        c.cc_name, 
        COALESCE(SUM(e.amount), 0) as amount,
        COALESCE(SUM(e.total_amount), 0) as total_amount
      FROM expense_entries e
      JOIN cost_centers c ON e.cost_center_id = c.id
      WHERE e.period_id = $1 AND e.is_deleted = false AND e.is_budget_cut = true AND ($2::uuid IS NULL OR e.department_id = $2)
      GROUP BY c.cc_code, c.cc_name
      ORDER BY amount DESC
    `;
    const ccRes = await db.query(ccQuery, [period.id, targetDeptId]);
    const costCenterBreakdown = ccRes.rows.map(row => ({
      cc_code: row.cc_code,
      cc_name: row.cc_name || `ศูนย์ต้นทุน ${row.cc_code}`,
      amount: parseFloat(row.amount),
      total_amount: parseFloat(row.total_amount)
    }));

    // 4. Monthly Trend (last 6 periods): budget cuts + net grand total
    const trendQuery = `
      SELECT p.id, p.month, p.year, p.status,
             COALESCE(SUM(CASE WHEN e.is_budget_cut = true THEN e.total_amount ELSE 0 END), 0) as budget_cut_amount,
             COALESCE(SUM(e.total_amount), 0) as net_total_amount
      FROM budget_periods p
      LEFT JOIN expense_entries e ON e.period_id = p.id AND e.is_deleted = false AND ($1::uuid IS NULL OR e.department_id = $1)
      GROUP BY p.id, p.year, p.month, p.status
      ORDER BY p.year DESC, p.month DESC
      LIMIT 6
    `;
    const trendRes = await db.query(trendQuery, [targetDeptId]);
    // Reverse it to display chronologically from past to present
    const monthlyTrend = trendRes.rows.map(row => ({
      month: row.month,
      year: row.year,
      amount: parseFloat(row.budget_cut_amount),
      totalAmount: parseFloat(row.net_total_amount)
    })).reverse();

    // 5. Latest budget sheets
    const sheetsQuery = `
      SELECT p.*, u.username as creator_username, u.full_name as creator_name,
             (SELECT MAX(e.updated_at) FROM expense_entries e
              WHERE e.period_id = p.id AND e.is_deleted = false) AS last_modified
      FROM budget_periods p
      JOIN users u ON p.created_by = u.id
      ORDER BY p.year DESC, p.month DESC
      LIMIT 5
    `;
    const sheetsRes = await db.query(sheetsQuery);
    const latestSheets = sheetsRes.rows;

    res.json({
      period,
      stats,
      costCenterBreakdown,
      monthlyTrend,
      latestSheets
    });
  } catch (err) {
    console.error('Fetch dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/dashboard/yearly
// @desc    Per-month totals for every month of a year (for the dashboard report
//          graph). Always returns all 12 months; months with no data read as 0.
router.get('/dashboard/yearly', verifyToken, async (req, res) => {
  const { year, department_id } = req.query;

  let targetDeptId = req.user.role === 'editor' ? req.user.department_id : department_id;
  if (targetDeptId === 'all' || targetDeptId === '') targetDeptId = null;

  const targetYear = parseInt(year) || new Date().getFullYear();

  try {
    const monthsQuery = `
      SELECT p.month,
        COALESCE(SUM(e.total_amount), 0) AS total_amount,
        COALESCE(SUM(e.amount), 0) AS amount_before_tax,
        COALESCE(SUM(CASE WHEN e.is_budget_cut = true THEN e.total_amount ELSE 0 END), 0) AS budget_cut_total
      FROM budget_periods p
      LEFT JOIN expense_entries e
        ON e.period_id = p.id AND e.is_deleted = false
        AND ($2::uuid IS NULL OR e.department_id = $2)
      WHERE p.year = $1
      GROUP BY p.month
    `;
    const rows = (await db.query(monthsQuery, [targetYear, targetDeptId])).rows;

    const byMonth = {};
    for (const r of rows) {
      byMonth[r.month] = {
        totalAmount: parseFloat(r.total_amount),
        amountBeforeTax: parseFloat(r.amount_before_tax),
        budgetCutTotal: parseFloat(r.budget_cut_total)
      };
    }

    const months = [];
    let yearTotalAmount = 0;
    let yearBudgetCutTotal = 0;
    for (let m = 1; m <= 12; m++) {
      const v = byMonth[m] || { totalAmount: 0, amountBeforeTax: 0, budgetCutTotal: 0 };
      months.push({ month: m, ...v });
      yearTotalAmount += v.totalAmount;
      yearBudgetCutTotal += v.budgetCutTotal;
    }

    res.json({
      year: targetYear,
      months,
      yearTotal: { totalAmount: yearTotalAmount, budgetCutTotal: yearBudgetCutTotal }
    });
  } catch (err) {
    console.error('Fetch yearly dashboard error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
