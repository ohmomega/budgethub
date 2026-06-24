// Loads the educational sample dataset into the *running* database on demand.
//
// This is what the in-app admin "Load sample data" button calls. Unlike
// backend/seed.js (which builds a brand-new SQLite file synchronously), this
// module works against the live database through the async db.query() layer so
// it can run while the app is open.
//
// It is safe to call more than once: departments and cost centers are matched
// by code, and the demo budget period is skipped entirely if it already has
// entries, so a second click will not duplicate data.

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const db = require('./db');

const DEMO_MONTH = 4;
const DEMO_YEAR = 2026;

const DEPARTMENTS = [
  { code: 'D01', name: 'ผกส.กฟส.ศรช.' },
  { code: 'D02', name: 'ผปบ.กฟส.ศรช.' },
  { code: 'D03', name: 'ผบส.กฟส.ศรช.' },
  { code: 'D04', name: 'ผคพ.กฟส.ศรช.' },
  { code: 'D05', name: 'กฟย.เกาะสีชัง' },
];

function resolveExcelPath() {
  return (
    process.env.BUDGETHUB_EXAMPLE_PATH ||
    path.join(__dirname, '..', 'Example', 'test.xlsx')
  );
}

async function getAdminId() {
  const res = await db.query("SELECT id FROM users WHERE username = 'admin' LIMIT 1");
  return res.rows.length > 0 ? res.rows[0].id : null;
}

// Ensure every demo department exists; return a { name -> id } map.
async function ensureDepartments() {
  const deptMap = {};
  for (const dept of DEPARTMENTS) {
    const existing = await db.query(
      'SELECT id FROM departments WHERE dept_code = $1',
      [dept.code]
    );
    if (existing.rows.length > 0) {
      deptMap[dept.name] = existing.rows[0].id;
    } else {
      const inserted = await db.query(
        'INSERT INTO departments (dept_code, dept_name) VALUES ($1, $2) RETURNING *',
        [dept.code, dept.name]
      );
      deptMap[dept.name] = inserted.rows[0].id;
    }
  }
  return deptMap;
}

// Find (or create) a cost center by code; returns its id.
async function getOrCreateCostCenter(code, cache) {
  const ccCode = (code || '-').toString().trim();
  if (cache[ccCode]) return cache[ccCode];

  const existing = await db.query(
    'SELECT id FROM cost_centers WHERE cc_code = $1',
    [ccCode]
  );
  if (existing.rows.length > 0) {
    cache[ccCode] = existing.rows[0].id;
    return existing.rows[0].id;
  }

  const name = ccCode === '-' ? 'ทั่วไป' : `ศูนย์ต้นทุน ${ccCode}`;
  const inserted = await db.query(
    'INSERT INTO cost_centers (cc_code, cc_name) VALUES ($1, $2) RETURNING *',
    [ccCode, name]
  );
  cache[ccCode] = inserted.rows[0].id;
  return inserted.rows[0].id;
}

// Main entry point. Returns { skipped } when the demo period already has data,
// otherwise { imported } with the number of entries created.
async function importSampleData() {
  const adminId = await getAdminId();
  if (!adminId) {
    throw new Error('Admin account not found; cannot import sample data.');
  }

  const excelPath = resolveExcelPath();
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Sample file not found at ${excelPath}`);
  }

  const deptMap = await ensureDepartments();

  // Find or create the demo budget period.
  let periodId;
  const periodRes = await db.query(
    'SELECT id FROM budget_periods WHERE month = $1 AND year = $2',
    [DEMO_MONTH, DEMO_YEAR]
  );
  if (periodRes.rows.length > 0) {
    periodId = periodRes.rows[0].id;
    // If the demo period already has entries, do nothing (avoid duplicates).
    const countRes = await db.query(
      'SELECT COUNT(*) AS n FROM expense_entries WHERE period_id = $1 AND is_deleted = false',
      [periodId]
    );
    if (parseInt(countRes.rows[0].n, 10) > 0) {
      return { skipped: true, periodId, month: DEMO_MONTH, year: DEMO_YEAR };
    }
  } else {
    const created = await db.query(
      "INSERT INTO budget_periods (month, year, status, created_by) VALUES ($1, $2, 'open', $3) RETURNING id",
      [DEMO_MONTH, DEMO_YEAR, adminId]
    );
    periodId = created.rows[0].id;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const sheet = workbook.worksheets[0];

  const ccCache = {};
  let currentDeptName = null;
  let insideEntries = false;
  let sortOrder = 10.0;
  let count = 0;

  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const rowVals = Array.isArray(row.values) ? row.values.slice(1) : [];
    if (rowVals.length === 0) continue;

    const firstCell = rowVals[0] ? rowVals[0].toString().trim() : '';

    if (firstCell === 'แผนก' && rowVals[2] && rowVals[2].toString().trim() === 'รหัสบัญชี') {
      insideEntries = true;
      const nextRow = sheet.getRow(r + 1);
      const nextVals = Array.isArray(nextRow.values) ? nextRow.values.slice(1) : [];
      if (nextVals[0]) {
        currentDeptName = nextVals[0].toString().trim();
        r++;
      }
      continue;
    }

    if (firstCell === 'รวม') {
      insideEntries = false;
      currentDeptName = null;
      continue;
    }

    if (insideEntries && currentDeptName) {
      const rawAmount = rowVals[5];
      if (rawAmount === null || rawAmount === undefined) continue;
      const amount = parseFloat(rawAmount.toString().replace(/,/g, ''));
      if (isNaN(amount)) continue;

      const accountCode = rowVals[2] ? rowVals[2].toString().trim() : null;
      const ccCode = rowVals[3] ? rowVals[3].toString().trim() : '-';
      const itemName = rowVals[4] ? rowVals[4].toString().trim() : '';
      const taxAmount =
        parseFloat((rowVals[6] || amount * 0.07).toString().replace(/,/g, '')) || 0;
      const totalAmount =
        parseFloat((rowVals[7] || amount + taxAmount).toString().replace(/,/g, '')) || 0;
      const reasonNote = rowVals[8] ? rowVals[8].toString().trim() : null;

      const deptId = deptMap[currentDeptName];
      if (!deptId) continue; // unknown department label; skip
      const ccId = await getOrCreateCostCenter(ccCode, ccCache);

      await db.query(
        `INSERT INTO expense_entries (
          period_id, department_id, cost_center_id, account_code, item_name,
          amount, tax_amount, total_amount, reason_note, sort_order, created_by, is_budget_cut
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          periodId, deptId, ccId, accountCode, itemName,
          amount, taxAmount, totalAmount, reasonNote, sortOrder, adminId,
          Boolean(ccCode && ccCode.startsWith('H307')),
        ]
      );
      sortOrder += 10.0;
      count++;
    }
  }

  return { skipped: false, imported: count, periodId, month: DEMO_MONTH, year: DEMO_YEAR };
}

module.exports = { importSampleData };
