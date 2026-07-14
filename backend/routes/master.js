const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, isAdmin, isEditorOrAdmin } = require('../middleware/auth');

// =========================================================================
// DEPARTMENTS
// =========================================================================

// @route   GET /api/departments
// @desc    Get all active departments
router.get('/departments', verifyToken, async (req, res) => {
  try {
    const query = req.user.role === 'admin' 
      ? 'SELECT * FROM departments ORDER BY dept_code ASC'
      : 'SELECT * FROM departments WHERE is_active = true ORDER BY dept_code ASC';
    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch departments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate a short, unique department code. Departments are identified by name
// in the UI now, but the column is still UNIQUE NOT NULL in the schema, so we
// mint a value here. Retries a few times in the (near-impossible for an offline
// single-user app) event of a collision.
async function generateDeptCode() {
  for (let i = 0; i < 20; i++) {
    const candidate = 'D' + Date.now().toString(36).toUpperCase().slice(-4) +
      Math.floor(Math.random() * 900 + 100);
    const exists = await db.query('SELECT id FROM departments WHERE dept_code = $1', [candidate]);
    if (exists.rows.length === 0) return candidate;
  }
  // Extremely unlikely fallback.
  return 'D' + Date.now().toString(36).toUpperCase();
}

// @route   POST /api/departments
// @desc    Create a new department (Admin only). dept_code is auto-generated;
//          the UI only collects a name.
router.post('/departments', verifyToken, isAdmin, async (req, res) => {
  const { dept_code, dept_name } = req.body;

  if (!dept_name || !dept_name.trim()) {
    return res.status(400).json({ error: 'dept_name is required' });
  }

  try {
    // Honour an explicit code if one is supplied (legacy callers); otherwise
    // auto-generate a unique one.
    let code = dept_code && dept_code.trim() ? dept_code.trim() : null;
    if (code) {
      const deptExists = await db.query('SELECT id FROM departments WHERE dept_code = $1', [code]);
      if (deptExists.rows.length > 0) {
        return res.status(400).json({ error: 'Department code already exists' });
      }
    } else {
      code = await generateDeptCode();
    }

    const result = await db.query(
      'INSERT INTO departments (dept_code, dept_name) VALUES ($1, $2) RETURNING *',
      [code, dept_name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create department error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/departments/:id
// @desc    Update a department (Admin only)
router.patch('/departments/:id', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { dept_name, is_active } = req.body;

  try {
    let query = 'UPDATE departments SET ';
    const params = [];
    let paramIndex = 1;

    if (dept_name !== undefined) {
      query += `dept_name = $${paramIndex++}, `;
      params.push(dept_name.trim());
    }
    if (is_active !== undefined) {
      query += `is_active = $${paramIndex++}, `;
      params.push(is_active);
    }

    if (params.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    query = query.slice(0, -2); // Remove trailing comma and space
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    const result = await db.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update department error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/departments/:id
// @desc    Delete a department (Admin only). A department that still has budget
//          data cannot be deleted — the caller must remove that data first
//          (delete the month's rows, or delete the whole sheet). Once no live
//          data references it, it is permanently removed.
router.delete('/departments/:id', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Count only entries that are still present (soft-deleted rows and deleted
    // sheets don't count, so clearing a month's data frees the department).
    const entriesRes = await db.query(
      'SELECT COUNT(*) AS n FROM expense_entries WHERE department_id = $1 AND is_deleted = false',
      [id]
    );
    if (parseInt(entriesRes.rows[0].n, 10) > 0) {
      return res.status(400).json({
        error: 'Cannot delete: this department still has budget data.',
        code: 'HAS_DATA',
      });
    }

    // No live data. Purge any leftover soft-deleted rows (and their audit logs)
    // so the foreign key is clear, detach references, then hard-delete.
    await db.query(
      'DELETE FROM audit_logs WHERE entry_id IN (SELECT id FROM expense_entries WHERE department_id = $1)',
      [id]
    );
    await db.query('DELETE FROM expense_entries WHERE department_id = $1', [id]);
    await db.query('UPDATE cost_centers SET department_id = NULL WHERE department_id = $1', [id]);
    await db.query('UPDATE users SET department_id = NULL WHERE department_id = $1', [id]);

    const result = await db.query('DELETE FROM departments WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.json({ message: 'Department deleted successfully', id });
  } catch (err) {
    console.error('Delete department error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// =========================================================================
// COST CENTERS
// =========================================================================

// @route   GET /api/cost-centers
// @desc    Get all active cost centers
router.get('/cost-centers', verifyToken, async (req, res) => {
  const { department_id } = req.query;
  try {
    let query = `
      SELECT cc.*, d.dept_name, d.dept_code, COUNT(e.id) as entries_count
      FROM cost_centers cc
      LEFT JOIN departments d ON cc.department_id = d.id
      LEFT JOIN expense_entries e ON e.cost_center_id = cc.id AND e.is_deleted = false
      WHERE cc.is_deleted = false
    `;
    const params = [];
    let paramIndex = 1;

    if (department_id) {
      query += ` AND (cc.department_id IS NULL OR cc.department_id = $${paramIndex++})`;
      params.push(department_id);
    }

    if (req.user.role !== 'admin') {
      query += ' AND cc.is_active = true';
    }

    query += ' GROUP BY cc.id, d.id ORDER BY cc.cc_code ASC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch cost centers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/cost-centers
// @desc    Create a new cost center (usable by all departments)
router.post('/cost-centers', verifyToken, isEditorOrAdmin, async (req, res) => {
  const { cc_code, cc_name, department_id } = req.body;

  if (!cc_code) {
    return res.status(400).json({ error: 'cc_code is required' });
  }

  try {
    const code = cc_code.trim();
    // Check if unique code exists (active or inactive, including deleted)
    const ccExists = await db.query(
      'SELECT id, is_deleted FROM cost_centers WHERE cc_code = $1',
      [code]
    );

    if (ccExists.rows.length > 0) {
      const existing = ccExists.rows[0];
      if (existing.is_deleted) {
        // Reactivate soft-deleted cost center
        const name = cc_name ? cc_name.trim() : `ศูนย์ต้นทุน ${code}`;
        const reactivateRes = await db.query(
          'UPDATE cost_centers SET is_deleted = false, cc_name = $1, department_id = $2, is_active = true, created_at = now() WHERE id = $3 RETURNING *',
          [name, department_id || null, existing.id]
        );
        return res.status(201).json(reactivateRes.rows[0]);
      } else {
        return res.status(400).json({ error: 'Cost center code already exists' });
      }
    }

    const name = cc_name ? cc_name.trim() : `ศูนย์ต้นทุน ${code}`;
    const result = await db.query(
      'INSERT INTO cost_centers (cc_code, cc_name, department_id) VALUES ($1, $2, $3) RETURNING *',
      [code, name, department_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create cost center error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PATCH /api/cost-centers/:id
// @desc    Update a cost center (Admin only)
router.patch('/cost-centers/:id', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { cc_code, cc_name, department_id, is_active } = req.body;

  try {
    // The code can now be changed after creation. Entries reference the cost
    // center by id (not by code), so renaming the code is safe as long as it
    // stays unique.
    if (cc_code !== undefined) {
      const code = (cc_code || '').trim();
      if (!code) {
        return res.status(400).json({ error: 'cc_code cannot be empty' });
      }
      const clash = await db.query(
        'SELECT id FROM cost_centers WHERE cc_code = $1 AND id <> $2',
        [code, id]
      );
      if (clash.rows.length > 0) {
        return res.status(400).json({ error: 'Cost center code already exists' });
      }
    }

    let query = 'UPDATE cost_centers SET ';
    const params = [];
    let paramIndex = 1;

    if (cc_code !== undefined) {
      query += `cc_code = $${paramIndex++}, `;
      params.push(cc_code.trim());
    }
    if (cc_name !== undefined) {
      query += `cc_name = $${paramIndex++}, `;
      params.push(cc_name.trim());
    }
    if (department_id !== undefined) {
      query += `department_id = $${paramIndex++}, `;
      params.push(department_id || null);
    }
    if (is_active !== undefined) {
      query += `is_active = $${paramIndex++}, `;
      params.push(is_active);
    }

    if (params.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    query = query.slice(0, -2);
    query += ` WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);

    const result = await db.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost center not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update cost center error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
// @route   DELETE /api/cost-centers/:id
// @desc    Delete a cost center (soft delete, Admin only)
router.delete('/cost-centers/:id', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('UPDATE cost_centers SET is_deleted = true WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cost center not found' });
    }
    res.json({ message: 'Cost center deleted successfully', id });
  } catch (err) {
    console.error('Delete cost center error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
