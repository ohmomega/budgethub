const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../db');
const { verifyToken } = require('../middleware/auth');

const THAI_MONTHS = [
  '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Helper to log exports
async function logExport(periodId, fileType, userId) {
  try {
    await db.query(
      'INSERT INTO export_logs (period_id, file_type, exported_by) VALUES ($1, $2, $3)',
      [periodId, fileType, userId]
    );
  } catch (err) {
    console.error('Export logging failed:', err);
  }
}

// Fetch all export data for a period
async function getExportData(month, year) {
  // Get period
  const periodRes = await db.query(
    'SELECT id FROM budget_periods WHERE month = $1 AND year = $2',
    [month, year]
  );
  if (periodRes.rows.length === 0) {
    return { period: null, departments: [] };
  }
  const periodId = periodRes.rows[0].id;

  // Get active departments
  const deptRes = await db.query('SELECT * FROM departments WHERE is_active = true ORDER BY dept_code ASC');
  const departments = deptRes.rows;

  // Fetch entries and cost centers for each department
  for (const dept of departments) {
    const entriesRes = await db.query(
      `SELECT e.*, c.cc_code, c.cc_name
       FROM expense_entries e
       LEFT JOIN cost_centers c ON e.cost_center_id = c.id
       WHERE e.period_id = $1 AND e.department_id = $2 AND e.is_deleted = false
       ORDER BY e.sort_order ASC`,
      [periodId, dept.id]
    );
    dept.entries = entriesRes.rows;
  }

  return { periodId, departments };
}

// Net total + budget-cut total for a single period (used by the combined
// export's summary sheet).
async function getPeriodTotals(periodId) {
  const totalsRes = await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) as total_amount,
            COALESCE(SUM(CASE WHEN is_budget_cut = true THEN total_amount ELSE 0 END), 0) as budget_cut_total
     FROM expense_entries WHERE period_id = $1 AND is_deleted = false`,
    [periodId]
  );
  return {
    totalAmount: parseFloat(totalsRes.rows[0].total_amount),
    budgetCutTotal: parseFloat(totalsRes.rows[0].budget_cut_total)
  };
}

// Build one worksheet (consolidated + per-department detail tables) for a
// single month/year into an existing workbook. Shared by the single-sheet
// export and the multi-period combined export.
function buildMonthWorksheet(workbook, month, year, departments) {
    const sheetName = `${THAI_MONTHS[month].substring(0, 3)}. ${year + 543}`;
    const worksheet = workbook.addWorksheet(sheetName);

    // Grid options
    worksheet.views = [{ showGridLines: true }];

    // Column configurations (A to J)
    worksheet.columns = [
      { key: 'dept', width: 18 },
      { key: 'no', width: 8 },
      { key: 'account', width: 15 },
      { key: 'cost_center', width: 16 },
      { key: 'item', width: 45 },
      { key: 'amount', width: 16 },
      { key: 'tax', width: 14 },
      { key: 'total', width: 16 },
      { key: 'reason', width: 20 },
      { key: 'budget_cut', width: 22 }
    ];

    const titleText = `สรุปงบประมาณ เดือน ${THAI_MONTHS[month]} ${year + 543}`;

    // Styles definitions
    const fontName = 'Segoe UI';
    // Clear, visible black grid lines (the classic Excel "All Borders" look) so
    // the exported table is easy to read. Previously these were near-invisible
    // light grey (FFD3D3D3).
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F2FF' }
    };
    const subheaderFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F5F5' }
    };

    // Title Row (Row 2)
    worksheet.getRow(2).getCell(5).value = titleText;
    worksheet.getRow(2).getCell(5).font = { name: fontName, size: 16, bold: true };
    worksheet.getRow(2).getCell(5).alignment = { horizontal: 'center' };

    // =========================================================================
    // PART 1: CONSOLIDATION SUMMARY (Top Table)
    // =========================================================================
    const headerRow1 = 4;
    const headers = ['แผนก', 'ลำดับที', 'รหัสบัญชี', 'รหัสศูนย์ต้นทุน', 'รายการ', 'จำนวนเงิน', 'ภาษี', 'ราคารวม', 'เหตุผล', 'ตัดงบทำการ (ไม่รวมภาษี)'];
    
    // Write headers
    const hRow = worksheet.getRow(headerRow1);
    headers.forEach((h, idx) => {
      const cell = hRow.getCell(idx + 1);
      cell.value = h;
      cell.font = { name: fontName, size: 11, bold: true };
      cell.fill = headerFill;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderStyle;
    });
    hRow.height = 25;

    let currentRow = 5;
    const part1StartRow = 5;

    // Output all entries grouped by department
    for (const dept of departments) {
      if (dept.entries.length === 0) continue;

      // Department Section Title Row
      const dRow = worksheet.getRow(currentRow);
      dRow.getCell(1).value = dept.dept_name;
      dRow.getCell(1).font = { name: fontName, size: 11, bold: true };
      for (let c = 1; c <= 10; c++) {
        dRow.getCell(c).border = borderStyle;
      }
      currentRow++;

      const deptStartRow = currentRow;

      // Entries for this department in Part 1
      for (const entry of dept.entries) {
        const row = worksheet.getRow(currentRow);
        row.getCell(3).value = entry.account_code ? parseFloat(entry.account_code) : null;
        row.getCell(4).value = entry.cc_code === '-' ? '-' : entry.cc_code;
        row.getCell(5).value = entry.item_name;
        
        // Use Excel formulas for VAT and Total
        row.getCell(6).value = parseFloat(entry.amount);
        row.getCell(7).value = { formula: `F${currentRow}*7%` };
        row.getCell(8).value = { formula: `F${currentRow}+G${currentRow}` };
        row.getCell(9).value = entry.reason_note || '';
        row.getCell(10).value = entry.is_budget_cut ? { formula: `F${currentRow}` } : null;

        // Formats and borders
        row.getCell(3).numFmt = '@';
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(6).numFmt = '#,##0.00';
        row.getCell(7).numFmt = '#,##0.00';
        row.getCell(8).numFmt = '#,##0.00';
        row.getCell(10).numFmt = '#,##0.00';

        for (let c = 1; c <= 10; c++) {
          row.getCell(c).border = borderStyle;
          row.getCell(c).font = { name: fontName, size: 10 };
        }
        currentRow++;
      }
    }

    const part1EndRow = currentRow - 1;

    // Part 1 Grand Total Row
    const totalRowPart1 = worksheet.getRow(currentRow);
    totalRowPart1.getCell(1).value = 'รวม';
    totalRowPart1.getCell(1).font = { name: fontName, size: 11, bold: true };
    totalRowPart1.getCell(1).alignment = { horizontal: 'center' };

    totalRowPart1.getCell(6).value = { formula: `SUM(F${part1StartRow}:F${part1EndRow})` };
    totalRowPart1.getCell(7).value = { formula: `SUM(G${part1StartRow}:G${part1EndRow})` };
    totalRowPart1.getCell(8).value = { formula: `SUM(H${part1StartRow}:H${part1EndRow})` };
    totalRowPart1.getCell(10).value = { formula: `SUM(J${part1StartRow}:J${part1EndRow})` };

    // Format total row
    ['amount', 'tax', 'total', 'budget_cut'].forEach(col => {
      const cell = totalRowPart1.getCell(col === 'amount' ? 6 : col === 'tax' ? 7 : col === 'total' ? 8 : 10);
      cell.numFmt = '#,##0.00';
      cell.font = { name: fontName, size: 11, bold: true };
    });

    const doubleBottomBorder = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } }
    };
    for (let c = 1; c <= 10; c++) {
      totalRowPart1.getCell(c).border = doubleBottomBorder;
    }
    currentRow += 5; // Add space before Part 2

    // =========================================================================
    // PART 2: DETAILED SECTIONS BY DEPARTMENT (Bottom Tables)
    // =========================================================================
    for (const dept of departments) {
      if (dept.entries.length === 0) continue;

      // Section Header (e.g. ผกส.กฟส.ศรช. in Column E)
      worksheet.getRow(currentRow).getCell(5).value = dept.dept_name;
      worksheet.getRow(currentRow).getCell(5).font = { name: fontName, size: 12, bold: true };
      currentRow += 4; // Add space matching test.xlsx structure

      // Detailed Table Headers
      const subHeader = worksheet.getRow(currentRow);
      headers.forEach((h, idx) => {
        const cell = subHeader.getCell(idx + 1);
        cell.value = h;
        cell.font = { name: fontName, size: 11, bold: true };
        cell.fill = subheaderFill;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderStyle;
      });
      currentRow++;

      // Department Row inside the sub-table
      const deptTitleRow = worksheet.getRow(currentRow);
      deptTitleRow.getCell(1).value = dept.dept_name;
      deptTitleRow.getCell(1).font = { name: fontName, size: 11, bold: true };
      for (let c = 1; c <= 10; c++) {
        deptTitleRow.getCell(c).border = borderStyle;
      }
      currentRow++;

      const sectionStartRow = currentRow;

      // Write section entries
      for (const entry of dept.entries) {
        const row = worksheet.getRow(currentRow);
        row.getCell(3).value = entry.account_code ? parseFloat(entry.account_code) : null;
        row.getCell(4).value = entry.cc_code === '-' ? '-' : entry.cc_code;
        row.getCell(5).value = entry.item_name;
        
        row.getCell(6).value = parseFloat(entry.amount);
        row.getCell(7).value = { formula: `F${currentRow}*7%` };
        row.getCell(8).value = { formula: `F${currentRow}+G${currentRow}` };
        row.getCell(9).value = entry.reason_note || '';
        row.getCell(10).value = entry.is_budget_cut ? { formula: `F${currentRow}` } : null;

        row.getCell(3).numFmt = '@';
        row.getCell(4).alignment = { horizontal: 'center' };
        row.getCell(6).numFmt = '#,##0.00';
        row.getCell(7).numFmt = '#,##0.00';
        row.getCell(8).numFmt = '#,##0.00';
        row.getCell(10).numFmt = '#,##0.00';

        for (let c = 1; c <= 10; c++) {
          row.getCell(c).border = borderStyle;
          row.getCell(c).font = { name: fontName, size: 10 };
        }
        currentRow++;
      }

      const sectionEndRow = currentRow - 1;

      // Department sub-total row
      const subTotalRow = worksheet.getRow(currentRow);
      subTotalRow.getCell(1).value = 'รวม';
      subTotalRow.getCell(1).font = { name: fontName, size: 11, bold: true };
      subTotalRow.getCell(1).alignment = { horizontal: 'center' };

      subTotalRow.getCell(6).value = { formula: `SUM(F${sectionStartRow}:F${sectionEndRow})` };
      subTotalRow.getCell(7).value = { formula: `SUM(G${sectionStartRow}:G${sectionEndRow})` };
      subTotalRow.getCell(8).value = { formula: `SUM(H${sectionStartRow}:H${sectionEndRow})` };
      subTotalRow.getCell(10).value = { formula: `SUM(J${sectionStartRow}:J${sectionEndRow})` };

      ['amount', 'tax', 'total', 'budget_cut'].forEach(col => {
        const cell = subTotalRow.getCell(col === 'amount' ? 6 : col === 'tax' ? 7 : col === 'total' ? 8 : 10);
        cell.numFmt = '#,##0.00';
        cell.font = { name: fontName, size: 11, bold: true };
      });

      for (let c = 1; c <= 10; c++) {
        subTotalRow.getCell(c).border = doubleBottomBorder;
      }

      currentRow += 4; // Add spacing before next section
    }

    return worksheet;
}

// Build a "summary" worksheet listing one row per selected period (net total +
// budget cut) plus a grand-total row, used as page 1 of the combined export.
function buildSummaryWorksheet(workbook, periodsWithTotals) {
  const border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };
  const fontName = 'Segoe UI';

  const ws = workbook.addWorksheet('สรุป', { properties: { tabColor: { argb: 'FF0D9488' } } });
  ws.columns = [
    { key: 'period', width: 26 },
    { key: 'total', width: 22 },
    { key: 'cut', width: 24 }
  ];

  const label = periodsWithTotals
    .map(p => `${THAI_MONTHS[p.month].substring(0, 3)}. ${p.year + 543}`)
    .join(', ');

  ws.mergeCells('A1:C1');
  ws.getCell('A1').value = `สรุปงบประมาณรวม: ${label}`;
  ws.getCell('A1').font = { name: fontName, size: 16, bold: true };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  const headers = ['เดือน', 'ยอดรวม (บาท)', 'ยอดงบทำการที่ตัด (บาท)'];
  const hRow = ws.getRow(3);
  headers.forEach((h, i) => {
    const c = hRow.getCell(i + 1);
    c.value = h;
    c.font = { name: fontName, size: 11, bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } };
    c.alignment = { horizontal: 'center' };
    c.border = border;
  });

  let r = 4;
  let grandTotal = 0;
  let grandCut = 0;
  for (const p of periodsWithTotals) {
    const row = ws.getRow(r);
    row.getCell(1).value = `${THAI_MONTHS[p.month]} ${p.year + 543}`;
    row.getCell(2).value = p.totalAmount;
    row.getCell(3).value = p.budgetCutTotal;
    row.getCell(2).numFmt = '#,##0.00';
    row.getCell(3).numFmt = '#,##0.00';
    for (let c = 1; c <= 3; c++) {
      row.getCell(c).border = border;
      row.getCell(c).font = { name: fontName, size: 10 };
    }
    grandTotal += p.totalAmount;
    grandCut += p.budgetCutTotal;
    r++;
  }

  const tRow = ws.getRow(r);
  tRow.getCell(1).value = 'รวมทั้งหมด';
  tRow.getCell(2).value = grandTotal;
  tRow.getCell(3).value = grandCut;
  tRow.getCell(2).numFmt = '#,##0.00';
  tRow.getCell(3).numFmt = '#,##0.00';
  for (let c = 1; c <= 3; c++) {
    tRow.getCell(c).border = border;
    tRow.getCell(c).font = { name: fontName, size: 11, bold: true };
  }

  return ws;
}

// @route   GET /api/export/xlsx
// @desc    Export budget sheet as Excel file matching the original format
router.get('/xlsx', verifyToken, async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'month and year are required' });
  }

  try {
    const { periodId, departments } = await getExportData(parseInt(month), parseInt(year));

    if (!periodId) {
      return res.status(404).json({ error: 'No data found for this period' });
    }

    await logExport(periodId, 'xlsx', req.user.id);

    const workbook = new ExcelJS.Workbook();
    buildMonthWorksheet(workbook, parseInt(month), parseInt(year), departments);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=BudgetHub_${month}_${year}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/export/xlsx/combined
// @desc    Export several budget sheets as a single Excel workbook: page 1 is
//          a summary of all selected months, followed by one full detail page
//          per selected month (chronological order).
router.post('/xlsx/combined', verifyToken, async (req, res) => {
  const periods = Array.isArray(req.body.periods) ? req.body.periods : [];

  const cleaned = periods
    .map(p => ({ month: parseInt(p.month), year: parseInt(p.year) }))
    .filter(p => p.month >= 1 && p.month <= 12 && p.year > 0);

  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'periods must be a non-empty array of { month, year }' });
  }

  // De-duplicate and sort chronologically.
  const seen = new Set();
  const unique = [];
  for (const p of cleaned) {
    const key = `${p.year}-${p.month}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  unique.sort((a, b) => (a.year - b.year) || (a.month - b.month));

  try {
    const resolved = [];
    for (const p of unique) {
      const { periodId, departments } = await getExportData(p.month, p.year);
      if (!periodId) continue; // skip months with no budget sheet
      const totals = await getPeriodTotals(periodId);
      resolved.push({ ...p, periodId, departments, ...totals });
    }

    if (resolved.length === 0) {
      return res.status(404).json({ error: 'No data found for the selected periods' });
    }

    for (const p of resolved) {
      await logExport(p.periodId, 'xlsx', req.user.id);
    }

    const workbook = new ExcelJS.Workbook();
    buildSummaryWorksheet(workbook, resolved);
    for (const p of resolved) {
      buildMonthWorksheet(workbook, p.month, p.year, p.departments);
    }

    const fileLabel = resolved.map(p => `${p.month}-${p.year}`).join('_');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=BudgetHub_combined_${fileLabel}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Combined Excel export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/export/pdf
// @desc    Export budget sheet as PDF document
router.get('/pdf', verifyToken, async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'month and year are required' });
  }

  try {
    const { periodId, departments } = await getExportData(parseInt(month), parseInt(year));

    if (!periodId) {
      return res.status(404).json({ error: 'No data found for this period' });
    }

    await logExport(periodId, 'pdf', req.user.id);

    // Initialize landscape A4 PDF document
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 25, left: 25, right: 25, bottom: 25 }
    });

    // Register local system Thai font (Tahoma)
    doc.registerFont('ThaiRegular', 'C:\\Windows\\Fonts\\tahoma.ttf');
    doc.registerFont('ThaiBold', 'C:\\Windows\\Fonts\\tahomabd.ttf');

    // Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=BudgetHub_${month}_${year}.pdf`
    );

    doc.pipe(res);

    const titleText = `สรุปงบประมาณ เดือน ${THAI_MONTHS[parseInt(month)]} ${parseInt(year) + 543}`;

    // PDF Page Title
    doc.font('ThaiBold').fontSize(16).text(titleText, { align: 'center' });
    doc.moveDown(1);

    // Columns config
    const tableCols = [
      { label: 'แผนก', width: 95 },
      { label: 'รหัสบัญชี', width: 55 },
      { label: 'รหัสศูนย์ฯ', width: 65 },
      { label: 'รายการ', width: 185 },
      { label: 'จำนวนเงิน', width: 75, align: 'right' },
      { label: 'ภาษี 7%', width: 55, align: 'right' },
      { label: 'ราคารวม', width: 75, align: 'right' },
      { label: 'ตัดงบทำการ', width: 75, align: 'right' }
    ];

    const startX = 25;
    const startY = 60;
    let currentY = startY;

    // Helper to draw row grid border
    function drawRowGrid(y, height) {
      doc.lineWidth(0.5).strokeColor('#CCCCCC');
      doc.moveTo(startX, y).lineTo(startX + 680, y).stroke();
      doc.moveTo(startX, y + height).lineTo(startX + 680, y + height).stroke();
    }

    // Helper to draw table header
    function drawHeader(y) {
      doc.rect(startX, y, 680, 20).fill('#E6F2FF').strokeColor('#999999').lineWidth(0.5).stroke();
      doc.font('ThaiBold').fontSize(9).fillColor('#000000');
      
      let curX = startX;
      tableCols.forEach(col => {
        doc.text(col.label, curX + 3, y + 5, {
          width: col.width - 6,
          align: col.align || 'left'
        });
        curX += col.width;
      });
    }

    // 1. Draw Consolidated Part
    drawHeader(currentY);
    currentY += 20;

    let totalAmount = 0;
    let totalTax = 0;
    let totalTotal = 0;
    let totalBudgetCut = 0;

    for (const dept of departments) {
      if (dept.entries.length === 0) continue;

      // Group title
      doc.font('ThaiBold').fontSize(9).fillColor('#000000');
      doc.text(dept.dept_name, startX + 3, currentY + 4);
      drawRowGrid(currentY, 15);
      currentY += 15;

      for (const entry of dept.entries) {
        // Page break if near bottom
        if (currentY > 520) {
          doc.addPage();
          currentY = 40;
          drawHeader(currentY);
          currentY += 20;
        }

        doc.font('ThaiRegular').fontSize(8).fillColor('#333333');
        
        let curX = startX;
        
        // 1. Dept
        curX += tableCols[0].width;

        // 2. Account Code
        const acc = entry.account_code || '';
        doc.text(acc, curX + 3, currentY + 3, { width: tableCols[1].width - 6 });
        curX += tableCols[1].width;

        // 3. Cost Center
        const cc = entry.cc_code === '-' ? '-' : entry.cc_code || '';
        doc.text(cc, curX + 3, currentY + 3, { width: tableCols[2].width - 6 });
        curX += tableCols[2].width;

        // 4. Item Name
        const name = entry.item_name || '';
        doc.text(name, curX + 3, currentY + 3, { width: tableCols[3].width - 6, height: 10, ellipsis: true });
        curX += tableCols[3].width;

        // 5. Amount
        const amt = parseFloat(entry.amount);
        doc.text(amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), curX + 3, currentY + 3, {
          width: tableCols[4].width - 6,
          align: 'right'
        });
        curX += tableCols[4].width;

        // 6. Tax
        const tax = parseFloat(entry.tax_amount);
        doc.text(tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), curX + 3, currentY + 3, {
          width: tableCols[5].width - 6,
          align: 'right'
        });
        curX += tableCols[5].width;

        // 7. Total
        const tot = parseFloat(entry.total_amount);
        doc.text(tot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), curX + 3, currentY + 3, {
          width: tableCols[6].width - 6,
          align: 'right'
        });
        curX += tableCols[6].width;

        // 8. Budget Cut
        if (entry.is_budget_cut) {
          const cutAmt = parseFloat(entry.amount);
          doc.text(cutAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), curX + 3, currentY + 3, {
            width: tableCols[7].width - 6,
            align: 'right'
          });
          totalBudgetCut += cutAmt;
        }

        drawRowGrid(currentY, 15);
        currentY += 15;

        totalAmount += amt;
        totalTax += tax;
        totalTotal += tot;
      }
    }

    // Consolidated Total Row
    doc.rect(startX, currentY, 680, 18).fill('#F5F5F5').strokeColor('#000000').lineWidth(1).stroke();
    doc.font('ThaiBold').fontSize(9).fillColor('#000000');
    doc.text('รวม', startX + 3, currentY + 4);

    let finalX = startX + tableCols[0].width + tableCols[1].width + tableCols[2].width + tableCols[3].width;
    // Amount total
    doc.text(totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }), finalX + 3, currentY + 4, {
      width: tableCols[4].width - 6,
      align: 'right'
    });
    finalX += tableCols[4].width;
    // Tax total
    doc.text(totalTax.toLocaleString(undefined, { minimumFractionDigits: 2 }), finalX + 3, currentY + 4, {
      width: tableCols[5].width - 6,
      align: 'right'
    });
    finalX += tableCols[5].width;
    // Total total
    doc.text(totalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }), finalX + 3, currentY + 4, {
      width: tableCols[6].width - 6,
      align: 'right'
    });
    finalX += tableCols[6].width;
    // Budget cut total
    doc.text(totalBudgetCut.toLocaleString(undefined, { minimumFractionDigits: 2 }), finalX + 3, currentY + 4, {
      width: tableCols[7].width - 6,
      align: 'right'
    });

    doc.end();
  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Yearly report exports (used by the dashboard report graph: PDF / XLSX).
// ---------------------------------------------------------------------------

// Aggregate per-month totals for a whole year (optionally one department).
async function getYearlyData(year, deptId) {
  const q = `
    SELECT p.month,
      COALESCE(SUM(e.total_amount), 0) AS total_amount,
      COALESCE(SUM(CASE WHEN e.is_budget_cut = true THEN e.total_amount ELSE 0 END), 0) AS budget_cut_total
    FROM budget_periods p
    LEFT JOIN expense_entries e
      ON e.period_id = p.id AND e.is_deleted = false
      AND ($2::uuid IS NULL OR e.department_id = $2)
    WHERE p.year = $1
    GROUP BY p.month`;
  const rows = (await db.query(q, [year, deptId])).rows;
  const byMonth = {};
  for (const r of rows) {
    byMonth[r.month] = {
      totalAmount: parseFloat(r.total_amount),
      budgetCutTotal: parseFloat(r.budget_cut_total)
    };
  }
  const months = [];
  let yearTotal = 0;
  let yearCut = 0;
  for (let m = 1; m <= 12; m++) {
    const v = byMonth[m] || { totalAmount: 0, budgetCutTotal: 0 };
    months.push({ month: m, ...v });
    yearTotal += v.totalAmount;
    yearCut += v.budgetCutTotal;
  }
  return { months, yearTotal, yearCut };
}

function normalizeDept(deptId) {
  if (!deptId || deptId === 'all' || deptId === '') return null;
  return deptId;
}

// @route   GET /api/export/yearly-xlsx
router.get('/yearly-xlsx', verifyToken, async (req, res) => {
  const year = parseInt(req.query.year);
  if (!year) return res.status(400).json({ error: 'year is required' });
  const deptId = normalizeDept(req.query.department_id);

  try {
    const { months, yearTotal, yearCut } = await getYearlyData(year, deptId);

    const border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(`สรุป ${year + 543}`);
    ws.columns = [
      { key: 'month', width: 22 },
      { key: 'total', width: 22 },
      { key: 'cut', width: 24 }
    ];

    ws.mergeCells('A1:C1');
    ws.getCell('A1').value = `รายงานสรุปงบประมาณรายปี ${year + 543}`;
    ws.getCell('A1').font = { name: 'Tahoma', size: 16, bold: true };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    const headers = ['เดือน', 'ยอดรวม (บาท)', 'ยอดงบทำการที่ตัด (บาท)'];
    const hRow = ws.getRow(3);
    headers.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.font = { name: 'Tahoma', size: 11, bold: true };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F2FF' } };
      c.alignment = { horizontal: 'center' };
      c.border = border;
    });

    let r = 4;
    for (const m of months) {
      const row = ws.getRow(r);
      row.getCell(1).value = THAI_MONTHS[m.month];
      row.getCell(2).value = m.totalAmount;
      row.getCell(3).value = m.budgetCutTotal;
      row.getCell(2).numFmt = '#,##0.00';
      row.getCell(3).numFmt = '#,##0.00';
      for (let c = 1; c <= 3; c++) {
        row.getCell(c).border = border;
        row.getCell(c).font = { name: 'Tahoma', size: 10 };
      }
      r++;
    }

    const tRow = ws.getRow(r);
    tRow.getCell(1).value = 'รวมทั้งปี';
    tRow.getCell(2).value = yearTotal;
    tRow.getCell(3).value = yearCut;
    tRow.getCell(2).numFmt = '#,##0.00';
    tRow.getCell(3).numFmt = '#,##0.00';
    for (let c = 1; c <= 3; c++) {
      tRow.getCell(c).border = border;
      tRow.getCell(c).font = { name: 'Tahoma', size: 11, bold: true };
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=BudgetHub_report_${year}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Yearly xlsx export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/export/yearly-pdf
router.get('/yearly-pdf', verifyToken, async (req, res) => {
  const year = parseInt(req.query.year);
  if (!year) return res.status(400).json({ error: 'year is required' });
  const deptId = normalizeDept(req.query.department_id);

  try {
    const { months, yearTotal, yearCut } = await getYearlyData(year, deptId);

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margins: { top: 40, left: 40, right: 40, bottom: 40 }
    });
    doc.registerFont('ThaiRegular', 'C:\\Windows\\Fonts\\tahoma.ttf');
    doc.registerFont('ThaiBold', 'C:\\Windows\\Fonts\\tahomabd.ttf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=BudgetHub_report_${year}.pdf`);
    doc.pipe(res);

    doc.font('ThaiBold').fontSize(18).fillColor('#000000')
      .text(`รายงานสรุปงบประมาณรายปี ${year + 543}`, { align: 'center' });
    doc.moveDown(0.4);
    doc.font('ThaiRegular').fontSize(12).fillColor('#333333')
      .text(`ยอดรวมทั้งปี: ${yearTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท`, { align: 'center' });
    doc.moveDown(1);

    // Colours for the two series
    const netColor = '#0D9488';   // net total (teal)
    const cutColor = '#EC4899';   // budget cut (pink)

    // Legend
    const legendY = doc.y;
    doc.rect(60, legendY, 10, 10).fill(netColor);
    doc.fillColor('#333333').font('ThaiRegular').fontSize(10).text('ยอดรวมสุทธิ', 75, legendY);
    doc.rect(190, legendY, 10, 10).fill(cutColor);
    doc.fillColor('#333333').font('ThaiRegular').fontSize(10).text('งบทำการที่ตัด', 205, legendY);
    doc.y = legendY + 24;

    // Bar chart (twin bars per month: net total + budget cut)
    const chartX = 60;
    const chartW = 475;
    const chartTop = doc.y;
    const chartH = 180;
    const baseY = chartTop + chartH;
    const maxAmt = Math.max(...months.map(m => Math.max(m.totalAmount, m.budgetCutTotal)), 1);
    const slot = chartW / 12;

    doc.lineWidth(0.5).strokeColor('#CCCCCC')
      .moveTo(chartX, baseY).lineTo(chartX + chartW, baseY).stroke();

    months.forEach((m, i) => {
      const groupW = slot * 0.6;
      const barW = (groupW - 3) / 2;
      const gx = chartX + slot * i + (slot - groupW) / 2;
      const netH = (m.totalAmount / maxAmt) * chartH;
      const cutH = (m.budgetCutTotal / maxAmt) * chartH;
      if (m.totalAmount > 0) doc.rect(gx, baseY - netH, barW, netH).fill(netColor);
      if (m.budgetCutTotal > 0) doc.rect(gx + barW + 3, baseY - cutH, barW, cutH).fill(cutColor);
      doc.fillColor('#666666').font('ThaiRegular').fontSize(7)
        .text(THAI_MONTHS[m.month].substring(0, 3), gx - 4, baseY + 4, { width: groupW + 8, align: 'center' });
    });

    // Table
    let ty = baseY + 30;
    const cols = [
      { x: 60, w: 200, label: 'เดือน', align: 'left' },
      { x: 260, w: 140, label: 'ยอดรวม (บาท)', align: 'right' },
      { x: 400, w: 135, label: 'ยอดงบที่ตัด (บาท)', align: 'right' }
    ];

    const drawRow = (cells, bold, fill) => {
      if (fill) doc.rect(60, ty, 475, 20).fill(fill);
      doc.font(bold ? 'ThaiBold' : 'ThaiRegular').fontSize(10).fillColor('#000000');
      cols.forEach((c, i) => {
        doc.text(cells[i], c.x + 3, ty + 5, { width: c.w - 6, align: c.align });
      });
      doc.lineWidth(0.5).strokeColor('#DDDDDD')
        .moveTo(60, ty + 20).lineTo(535, ty + 20).stroke();
      ty += 20;
    };

    drawRow(cols.map(c => c.label), true, '#E6F2FF');
    for (const m of months) {
      drawRow([
        THAI_MONTHS[m.month],
        m.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }),
        m.budgetCutTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })
      ], false, null);
    }
    drawRow([
      'รวมทั้งปี',
      yearTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      yearCut.toLocaleString(undefined, { minimumFractionDigits: 2 })
    ], true, '#F5F5F5');

    doc.end();
  } catch (err) {
    console.error('Yearly pdf export error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
