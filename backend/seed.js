// Seeds a fresh SQLite database for BudgetHub.
//
// Exposed as seedDatabase({ dbPath, excelPath }) so the Electron main process
// can build the database on first launch. Also runnable directly with
// `node backend/seed.js` for development.

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');

const uuid = () => crypto.randomUUID();

async function seedDatabase(options = {}) {
  const dbPath =
    options.dbPath ||
    process.env.BUDGETHUB_DB_PATH ||
    path.join(__dirname, '..', 'budgethub.db');
  const excelPath =
    options.excelPath || path.join(__dirname, '..', 'Example', 'test.xlsx');

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);
    console.log('[seed] Schema created.');

    // 1. Departments
    const departmentsList = [
      { code: 'D01', name: 'ผกส.กฟส.ศรช.' },
      { code: 'D02', name: 'ผปบ.กฟส.ศรช.' },
      { code: 'D03', name: 'ผบส.กฟส.ศรช.' },
      { code: 'D04', name: 'ผคพ.กฟส.ศรช.' },
      { code: 'D05', name: 'กฟย.เกาะสีชัง' },
    ];

    const insertDept = db.prepare(
      'INSERT INTO departments (id, dept_code, dept_name) VALUES (?, ?, ?)'
    );
    const deptMap = {}; // name -> id
    for (const dept of departmentsList) {
      const id = uuid();
      insertDept.run(id, dept.code, dept.name);
      deptMap[dept.name] = id;
    }
    console.log('[seed] Departments seeded.');

    // 2. Users
    const adminPasswordHash = bcrypt.hashSync('admin1234', 10);
    const editorPasswordHash = bcrypt.hashSync('password123', 10);

    const insertUser = db.prepare(
      `INSERT INTO users (id, username, password_hash, full_name, role, department_id, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const adminId = uuid();
    insertUser.run(
      adminId,
      'admin',
      adminPasswordHash,
      'Administrator',
      'admin',
      null,
      'admin@budgethub.com'
    );

    const editorMap = {};
    for (const dept of departmentsList) {
      const id = uuid();
      const username = `editor_${dept.code.toLowerCase()}`;
      insertUser.run(
        id,
        username,
        editorPasswordHash,
        `Editor ${dept.name}`,
        'editor',
        deptMap[dept.name],
        `${username}@budgethub.com`
      );
      editorMap[dept.name] = id;
    }

    insertUser.run(
      uuid(),
      'viewer',
      editorPasswordHash,
      'Viewer User',
      'viewer',
      null,
      'viewer@budgethub.com'
    );
    console.log('[seed] Users seeded.');

    // 3. Budget period for April 2026
    const periodId = uuid();
    db.prepare(
      `INSERT INTO budget_periods (id, month, year, status, created_by)
       VALUES (?, 4, 2026, 'open', ?)`
    ).run(periodId, adminId);
    console.log('[seed] Budget period (April 2026) seeded.');

    // 4. Demo entries imported from the example Excel sheet (best-effort).
    await seedFromExcel(db, { excelPath, periodId, deptMap, editorMap, adminId });

    console.log('[seed] Seeding completed successfully.');
  } finally {
    db.close();
  }
}

async function seedFromExcel(db, { excelPath, periodId, deptMap, editorMap, adminId }) {
  if (!fs.existsSync(excelPath)) {
    console.warn(`[seed] Example file not found at ${excelPath}; skipping demo entries.`);
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const sheet = workbook.worksheets[0];

    const findCC = db.prepare('SELECT id FROM cost_centers WHERE cc_code = ?');
    const insertCC = db.prepare(
      'INSERT INTO cost_centers (id, cc_code, cc_name) VALUES (?, ?, ?)'
    );
    const ccMap = {}; // cc_code -> id

    function getOrCreateCostCenter(code) {
      const ccCode = (code || '-').toString().trim();
      if (ccMap[ccCode]) return ccMap[ccCode];
      const existing = findCC.get(ccCode);
      if (existing) {
        ccMap[ccCode] = existing.id;
        return existing.id;
      }
      const id = uuid();
      const name = ccCode === '-' ? 'ทั่วไป' : `ศูนย์ต้นทุน ${ccCode}`;
      insertCC.run(id, ccCode, name);
      ccMap[ccCode] = id;
      return id;
    }

    const insertEntry = db.prepare(
      `INSERT INTO expense_entries (
        id, period_id, department_id, cost_center_id, account_code, item_name,
        amount, tax_amount, total_amount, reason_note, sort_order, created_by, is_budget_cut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

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
        const ccId = getOrCreateCostCenter(ccCode);
        const userId = editorMap[currentDeptName] || adminId;

        insertEntry.run(
          uuid(),
          periodId,
          deptId,
          ccId,
          accountCode,
          itemName,
          amount,
          taxAmount,
          totalAmount,
          reasonNote,
          sortOrder,
          userId,
          ccCode && ccCode.startsWith('H307') ? 1 : 0
        );
        sortOrder += 10.0;
        count++;
      }
    }
    console.log(`[seed] Imported ${count} demo entries from Excel.`);
  } catch (err) {
    console.error('[seed] Excel import failed (continuing without demo data):', err.message);
  }
}

module.exports = { seedDatabase };

// Allow `node backend/seed.js` for standalone seeding during development.
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] Fatal:', err);
      process.exit(1);
    });
}
