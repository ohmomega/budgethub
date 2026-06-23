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
    const sheetName = `${THAI_MONTHS[parseInt(month)].substring(0, 3)}. ${parseInt(year) + 543}`;
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

    const titleText = `สรุปงบประมาณ เดือน ${THAI_MONTHS[parseInt(month)]} ${parseInt(year) + 543}`;

    // Styles definitions
    const fontName = 'Segoe UI';
    const borderStyle = {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
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

    // Set Response headers
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

module.exports = router;
