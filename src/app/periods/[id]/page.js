'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import LayoutShell from '@/components/LayoutShell';
import { useApp } from '@/context/AppContext';
import { getTranslation } from '@/lib/translations';
import { useParams, useRouter } from 'next/navigation';
import { downloadFileViaServer } from '@/lib/download';
import {
  ArrowLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Lock,
  Unlock,
  FileSpreadsheet,
  FileText,
  Save,
  Search,
  ChevronDown,
  Edit2,
  GripVertical
} from 'lucide-react';

export default function PeriodDetailPage() {
  const { user, showToast, language, theme } = useApp();
  const params = useParams();
  const router = useRouter();
  
  const [period, setPeriod] = useState(null);
  const [rows, setRows] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'unsaved', 'saving', 'error'
  const [hasEdits, setHasEdits] = useState(false);
  
  // Naming/Renaming state
  const [isRenaming, setIsRenaming] = useState(false);
  const [editNameText, setEditNameText] = useState('');
  
  // Cost Center Dropdown Search state
  const [activeDropdownRow, setActiveDropdownRow] = useState(null);
  const [ccSearchText, setCcSearchText] = useState('');
  
  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [rowToDeleteIdx, setRowToDeleteIdx] = useState(null);
  
  // Finalize Confirmation Modal State
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // Revert to Draft Confirmation Modal State
  const [revertModalOpen, setRevertModalOpen] = useState(false);
  const [reverting, setReverting] = useState(false);

  // Drag and Drop state
  const [draggedRowIdx, setDraggedRowIdx] = useState(null);

  // References for mounting checks
  const isInitialMount = useRef(true);
  const dropdownRef = useRef(null);
  const latestRowsRef = useRef([]);
  const isSavingRef = useRef(false);
  const hasPendingSaveRef = useRef(false);

  useEffect(() => {
    latestRowsRef.current = rows;
  }, [rows]);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const periodId = params.id;
      
      const [periodRes, ccRes] = await Promise.all([
        fetch(`/api/periods/${periodId}`),
        fetch('/api/cost-centers')
      ]);

      if (periodRes.ok && ccRes.ok) {
        const periodData = await periodRes.json();
        const ccData = await ccRes.json();
        
        setPeriod(periodData.period);
        setRows(periodData.period.transactions || []);
        setCostCenters(ccData.costCenters);
        setEditNameText(periodData.period.name || '');
      } else {
        showToast('Failed to fetch period details', 'error');
        router.push('/periods');
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      showToast('Connection error', 'error');
    } finally {
      setLoading(false);
    }
  }, [params.id, router, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Click outside handler for Cost Center dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownRow(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Batch Save logic
  const saveChanges = useCallback(async (rowsToSave = latestRowsRef.current) => {
    if (!period || period.status === 'finalized' || user?.role === 'viewer') return;
    if (isSavingRef.current) {
      hasPendingSaveRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');
    
    try {
      const res = await fetch(`/api/periods/${period.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: rowsToSave })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save changes');
      }
      
      // Update local rows with fresh IDs from db if there is no pending newer save
      if (!hasPendingSaveRef.current) {
        setRows(data.transactions);
        setSaveStatus('saved');
        setHasEdits(false);
      }
    } catch (err) {
      console.error('Auto-save error:', err);
      setSaveStatus('error');
      showToast(err.message || 'Auto-save failed', 'error');
    } finally {
      isSavingRef.current = false;
      if (hasPendingSaveRef.current) {
        hasPendingSaveRef.current = false;
        saveChanges(latestRowsRef.current);
      }
    }
  }, [period, user?.role, showToast]);

  // Debounced auto-save triggers 2 seconds after edits stop
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!hasEdits) return;

    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      saveChanges(latestRowsRef.current);
    }, 2000);

    return () => clearTimeout(timer);
  }, [hasEdits, rows, saveChanges]);

  // Handle cell text/amount changes
  const handleCellChange = (index, field, value) => {
    if (!period || period.status === 'finalized' || user?.role === 'viewer') return;

    const updated = [...rows];
    let parsedValue = value;
    
    if (field === 'amountBeforeTax') {
      parsedValue = parseFloat(value) || 0.0;
    } else if (field === 'includedInBudgetCut') {
      parsedValue = value === true;
    }
    
    updated[index] = {
      ...updated[index],
      [field]: parsedValue
    };

    // Calculate tax and total real-time on front-end
    if (field === 'amountBeforeTax') {
      const amountBeforeTax = parsedValue;
      const taxAmount = Math.round(amountBeforeTax * 0.07 * 100) / 100;
      const totalAmount = Math.round((amountBeforeTax + taxAmount) * 100) / 100;
      
      updated[index].taxAmount = taxAmount;
      updated[index].totalAmount = totalAmount;
    }

    setRows(updated);
    setHasEdits(true);
  };

  // Spreadsheet-style keyboard navigation
  const handleKeyDown = (e, rowIndex, colName) => {
    const columns = ['accountCode', 'costCenterId', 'description', 'amountBeforeTax', 'notes', 'transactionType'];
    const colIdx = columns.indexOf(colName);
    
    if (e.key === 'Tab') {
      e.preventDefault();
      let nextRow = rowIndex;
      let nextCol = colIdx + (e.shiftKey ? -1 : 1);
      
      if (nextCol >= columns.length) {
        nextCol = 0;
        nextRow += 1;
      } else if (nextCol < 0) {
        nextCol = columns.length - 1;
        nextRow -= 1;
      }
      
      if (nextRow >= 0 && nextRow < rows.length) {
        const nextColName = columns[nextCol];
        const element = document.getElementById(`cell-${nextRow}-${nextColName}`);
        if (element) {
          element.focus();
          if (element.select) element.select();
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Move down a row
      const nextRow = rowIndex + 1;
      if (nextRow < rows.length) {
        const element = document.getElementById(`cell-${nextRow}-${colName}`);
        if (element) {
          element.focus();
          if (element.select) element.select();
        }
      }
    }
  };

  // Row operations
  const addRow = () => {
    if (!period || period.status === 'finalized' || user?.role === 'viewer') return;
    
    const newRow = {
      id: -Date.now(), // negative temporary id
      accountCode: '',
      description: '',
      costCenterId: costCenters.find(cc => cc.isActive)?.id || null,
      amountBeforeTax: 0.0,
      taxAmount: 0.0,
      totalAmount: 0.0,
      transactionType: 'expense',
      includedInBudgetCut: true,
      notes: '',
      rowOrder: rows.length + 1
    };
    
    const updated = [...rows, newRow];
    setRows(updated);
    setHasEdits(true);
    
    // Focus new row account code input on next tick
    setTimeout(() => {
      const el = document.getElementById(`cell-${rows.length}-accountCode`);
      if (el) el.focus();
    }, 50);
  };

  const insertRowAbove = (index) => {
    if (!period || period.status === 'finalized' || user?.role === 'viewer') return;
    
    const newRow = {
      id: -Date.now(),
      accountCode: '',
      description: '',
      costCenterId: costCenters.find(cc => cc.isActive)?.id || null,
      amountBeforeTax: 0.0,
      taxAmount: 0.0,
      totalAmount: 0.0,
      transactionType: 'expense',
      includedInBudgetCut: true,
      notes: '',
      rowOrder: index + 1
    };
    
    const updated = [...rows];
    updated.splice(index, 0, newRow);
    
    // Update order indexes
    const reordered = updated.map((r, i) => ({ ...r, rowOrder: i + 1 }));
    setRows(reordered);
    setHasEdits(true);
    
    setTimeout(() => {
      const el = document.getElementById(`cell-${index}-accountCode`);
      if (el) el.focus();
    }, 50);
  };

  const moveRow = (index, direction) => {
    if (!period || period.status === 'finalized' || user?.role === 'viewer') return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rows.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...rows];
    
    // Swap rows
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    
    // Re-index rowOrder values
    const reordered = updated.map((r, i) => ({ ...r, rowOrder: i + 1 }));
    
    setRows(reordered);
    setHasEdits(true);
  };

  const triggerDeleteRow = (index) => {
    if (!period || period.status === 'finalized' || user?.role === 'viewer') return;
    setRowToDeleteIdx(index);
    setDeleteModalOpen(true);
  };

  const confirmDeleteRow = () => {
    if (rowToDeleteIdx === null) return;
    
    const updated = rows.filter((_, idx) => idx !== rowToDeleteIdx);
    const reordered = updated.map((r, i) => ({ ...r, rowOrder: i + 1 }));
    
    setRows(reordered);
    setHasEdits(true);
    setDeleteModalOpen(false);
    setRowToDeleteIdx(null);
    showToast('Row removed from spreadsheet.', 'info');
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e, index) => {
    if (!period || period.status === 'finalized' || user?.role === 'viewer') return;
    setDraggedRowIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedRowIdx === null || draggedRowIdx === index) return;
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedRowIdx === null || draggedRowIdx === index) return;

    const updated = [...rows];
    const draggedRow = updated[draggedRowIdx];
    
    // Remove from old index and insert into new index
    updated.splice(draggedRowIdx, 1);
    updated.splice(index, 0, draggedRow);

    // Re-index rowOrder values
    const reordered = updated.map((r, i) => ({ ...r, rowOrder: i + 1 }));
    
    setRows(reordered);
    setHasEdits(true);
    setDraggedRowIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedRowIdx(null);
  };

  // Finalize budget period
  const handleFinalizePeriod = async () => {
    if (user?.role === 'viewer') return;
    
    try {
      setFinalizing(true);
      // Force save any pending changes first
      await saveChanges(rows);

      const res = await fetch(`/api/periods/${period.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finalized' })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to finalize period');
      }

      setPeriod({ ...period, status: 'finalized' });
      setFinalizeModalOpen(false);
      showToast('Budget sheet finalized! Read-only mode activated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setFinalizing(false);
    }
  };

  // Revert budget period to draft status
  const handleRevertPeriod = async () => {
    if (user?.role === 'viewer') return;
    
    try {
      setReverting(true);
      const res = await fetch(`/api/periods/${period.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revert period');
      }

      setPeriod({ ...period, status: 'draft' });
      setRevertModalOpen(false);
      showToast('Budget sheet reverted to draft! Edit mode reactivated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setReverting(false);
    }
  };

  // Rename budget period
  const handleRename = async () => {
    if (user?.role === 'viewer') return;
    if (!editNameText.trim()) {
      showToast('Sheet name cannot be empty', 'error');
      return;
    }
    
    try {
      const res = await fetch(`/api/periods/${period.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editNameText.trim() })
      });
      
      const data = await res.json();
      if (res.ok) {
        setPeriod(prev => ({ ...prev, name: data.period.name }));
        setIsRenaming(false);
        showToast('Budget sheet renamed successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to rename sheet');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Get theme primary color for PDF exports
  const getThemePrimaryColor = () => {
    switch (theme) {
      case 'dark': return { r: 45, g: 212, b: 191, hex: '#2dd4bf' };
      case 'pink': return { r: 133, g: 40, b: 133, hex: '#852885' };
      default: return { r: 13, g: 148, b: 136, hex: '#0d9488' };
    }
  };

  const handleExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF('l', 'mm', 'a4');
      const themeColor = getThemePrimaryColor();
      const filename = period?.name 
        ? `${period.name.replace(/[^a-zA-Z0-9ก-๙-_]/g, '_')}.pdf`
        : `BudgetHub_Export_${period?.year}_${String(period?.month).padStart(2, '0')}.pdf`;
      
      // Load Thai font (Regular & Bold)
      try {
        const regRes = await fetch('/fonts/Sarabun-Regular.ttf');
        if (regRes.ok) {
          const fontBuffer = await regRes.arrayBuffer();
          const bytes = new Uint8Array(fontBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i += 8192) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
          }
          const fontBase64 = btoa(binary);
          doc.addFileToVFS('Sarabun.ttf', fontBase64);
          doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
          // Fallback bold style to regular font initially
          doc.addFont('Sarabun.ttf', 'Sarabun', 'bold');
          doc.setFont('Sarabun');
        }

        try {
          const boldRes = await fetch('/fonts/Sarabun-Bold.ttf');
          if (boldRes.ok) {
            const fontBuffer = await boldRes.arrayBuffer();
            const bytes = new Uint8Array(fontBuffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i += 8192) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
            }
            const fontBase64 = btoa(binary);
            doc.addFileToVFS('Sarabun-Bold.ttf', fontBase64);
            doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');
          }
        } catch (boldErr) {
          console.warn('Could not load bold Thai font, using regular font as bold style:', boldErr);
        }
      } catch (fontErr) {
        console.warn('Could not load Thai font, falling back to helvetica:', fontErr);
        doc.setFont('helvetica');
      }

      // Header details
      doc.setFontSize(18);
      doc.text(getTranslation('monthlyPerfReport', language), 14, 20);
      
      doc.setFontSize(10);
      doc.text(`${getTranslation('budgetPeriodLabel', language)}: ${period?.name || (period ? `${period.year}-${String(period.month).padStart(2, '0')}` : 'Loading...')}`, 14, 28);
      doc.text(`${getTranslation('statusLabel', language)}: ${period?.status?.toUpperCase()}`, 14, 34);
      doc.text(`${getTranslation('exportedAt', language)}: ${new Date().toLocaleString()}`, 14, 40);
      
      // Horizontal bar
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 45, 282, 45);

      // Table mapping
      const body = rows.map((r, i) => [
        i + 1,
        r.accountCode || '',
        r.costCenter ? `${r.costCenter.code} - ${r.costCenter.name}` : 'Unassigned',
        r.description || '',
        formatCurrency(r.amountBeforeTax),
        formatCurrency(r.taxAmount),
        formatCurrency(r.totalAmount),
        r.notes || '',
        r.includedInBudgetCut ? 'YES' : 'NO',
        r.transactionType.toUpperCase()
      ]);

      // Row aggregate calculations
      const sumBeforeTax = rows.reduce((s, r) => s + r.amountBeforeTax, 0);
      const sumTax = rows.reduce((s, r) => s + r.taxAmount, 0);
      const sumTotal = rows.reduce((s, r) => s + r.totalAmount, 0);

      // Add summary line
      body.push([
        '',
        '',
        '',
        getTranslation('overallTotals', language),
        formatCurrency(sumBeforeTax),
        formatCurrency(sumTax),
        formatCurrency(sumTotal),
        '',
        '',
        ''
      ]);

      // Budget Cut calculations
      const bcBeforeTax = rows.reduce((s, r) => s + (r.includedInBudgetCut ? r.amountBeforeTax : 0), 0);
      const bcTax = rows.reduce((s, r) => s + (r.includedInBudgetCut ? r.taxAmount : 0), 0);
      const bcTotal = rows.reduce((s, r) => s + (r.includedInBudgetCut ? r.totalAmount : 0), 0);

      body.push([
        '',
        '',
        '',
        getTranslation('budgetCutTotals', language),
        formatCurrency(bcBeforeTax),
        formatCurrency(bcTax),
        formatCurrency(bcTotal),
        '',
        '',
        ''
      ]);

      autoTable(doc, {
        startY: 50,
        head: [[
          getTranslation('noCol', language),
          getTranslation('accountCodeCol', language),
          getTranslation('costCenterCol', language),
          getTranslation('descriptionCol', language),
          getTranslation('amountCol', language),
          getTranslation('taxCol', language),
          getTranslation('totalCol', language),
          getTranslation('notesCol', language),
          getTranslation('budgetCutCol', language),
          getTranslation('typeCol', language)
        ]],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [themeColor.r, themeColor.g, themeColor.b], font: 'Sarabun' },
        styles: { fontSize: 8, font: 'Sarabun' },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 25 },
          2: { cellWidth: 40 },
          3: { cellWidth: 40 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 25 },
          7: { cellWidth: 35 },
          8: { cellWidth: 20 },
          9: { cellWidth: 20 }
        },
        didParseCell: (data) => {
          if (data.row.index === body.length - 2 || data.row.index === body.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            if (data.row.index === body.length - 1) {
              data.cell.styles.textColor = themeColor.hex;
            }
          }
        }
      });

      // Save file
      const blob = doc.output('blob');
      downloadFileViaServer(blob, filename, 'application/pdf');

      // Log download to database
      await fetch('/api/export-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: period.id,
          exportType: 'pdf',
          fileName: filename
        })
      });

      showToast('PDF exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export PDF', 'error');
    }
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const filename = period.name 
        ? `${period.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.xlsx`
        : `BudgetHub_Export_${period.year}_${String(period.month).padStart(2, '0')}.xlsx`;
      
      // Header names matching our spreadsheet columns
      const headers = [
        getTranslation('noCol', language),
        getTranslation('accountCodeCol', language),
        getTranslation('costCenterCol', language),
        getTranslation('descriptionCol', language),
        getTranslation('amountCol', language),
        getTranslation('taxCol', language),
        getTranslation('totalCol', language),
        getTranslation('notesCol', language),
        getTranslation('budgetCutCol', language),
        getTranslation('typeCol', language)
      ];

      const aoa = [headers];

      for (let i = 0; i < rows.length; i++) {
        const t = rows[i];
        const r = i + 2; // Excel row index (1-based, header is 1)
        aoa.push([
          i + 1,
          t.accountCode || '',
          t.costCenter ? `${t.costCenter.code} - ${t.costCenter.name}` : 'Unassigned',
          t.description || '',
          t.amountBeforeTax || 0,
          { f: `E${r}*0.07` },
          { f: `E${r}+F${r}` },
          t.notes || '',
          t.includedInBudgetCut !== false ? 'TRUE' : 'FALSE',
          t.transactionType.toUpperCase()
        ]);
      }

      const lastRow = rows.length + 1;
      // Empty row separation
      aoa.push([]);

      // Totals Row
      const totalsRowData = Array(10).fill('');
      totalsRowData[3] = getTranslation('overallTotals', language);
      totalsRowData[4] = { f: `SUM(E2:E${lastRow})` };
      totalsRowData[5] = { f: `SUM(F2:F${lastRow})` };
      totalsRowData[6] = { f: `SUM(G2:G${lastRow})` };
      aoa.push(totalsRowData);

      // Budget Cut Row
      const budgetCutRowData = Array(10).fill('');
      budgetCutRowData[3] = getTranslation('budgetCutTotals', language);
      budgetCutRowData[4] = { f: `SUMIF(I2:I${lastRow}, "TRUE", E2:E${lastRow})` };
      budgetCutRowData[6] = { f: `SUMIF(I2:I${lastRow}, "TRUE", G2:G${lastRow})` };
      aoa.push(budgetCutRowData);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      
      // Apply beautiful column widths
      ws['!cols'] = [
        { wch: 6 },  // No.
        { wch: 18 }, // Account Code
        { wch: 25 }, // Cost Center
        { wch: 30 }, // Description
        { wch: 18 }, // Before Tax
        { wch: 12 }, // Tax
        { wch: 15 }, // Total
        { wch: 30 }, // Notes
        { wch: 22 }, // Included in Budget Cut
        { wch: 10 }  // Type
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Budget Sheet');
      const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      downloadFileViaServer(b64, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      // Log export to database
      await fetch('/api/export-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: period.id,
          exportType: 'excel',
          fileName: filename
        })
      });

      showToast('Excel spreadsheet exported with formulas!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to export Excel', 'error');
    }
  };

  // Cost Center Summary Aggregator logic
  const getCostCenterTotals = () => {
    const ccMap = {};
    costCenters.forEach(cc => {
      ccMap[cc.id] = { code: cc.code, name: cc.name };
    });

    const groups = {};
    rows.forEach(r => {
      const ccId = r.costCenterId || 0;
      if (!groups[ccId]) {
        groups[ccId] = {
          code: ccId ? (ccMap[ccId]?.code || 'CC_UNKNOWN') : 'UNASSIGNED',
          name: ccId ? (ccMap[ccId]?.name || 'Unknown Cost Center') : 'Unassigned',
          beforeTax: 0,
          tax: 0,
          total: 0,
          budgetCutBeforeTax: 0,
          budgetCutTotal: 0
        };
      }
      groups[ccId].beforeTax += r.amountBeforeTax;
      groups[ccId].tax += r.taxAmount;
      groups[ccId].total += r.totalAmount;
      
      if (r.includedInBudgetCut !== false) {
        groups[ccId].budgetCutBeforeTax += r.amountBeforeTax;
        groups[ccId].budgetCutTotal += r.totalAmount;
      }
    });

    return Object.values(groups);
  };

  const ccTotals = getCostCenterTotals();

  // Grid Sum Aggregators
  const totals = rows.reduce(
    (acc, row) => {
      acc.beforeTax += row.amountBeforeTax;
      acc.tax += row.taxAmount;
      acc.total += row.totalAmount;
      
      if (row.includedInBudgetCut !== false) {
        acc.budgetCutBeforeTax += row.amountBeforeTax;
        acc.budgetCutTax += row.taxAmount;
        acc.budgetCutTotal += row.totalAmount;
      }
      
      return acc;
    },
    { beforeTax: 0, tax: 0, total: 0, budgetCutBeforeTax: 0, budgetCutTax: 0, budgetCutTotal: 0 }
  );

  const formatCurrency = (val) => {
    const num = new Intl.NumberFormat(language === 'th' ? 'th-TH' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
    return `฿${num}`;
  };

  // Filter cost centers based on search input, only active ones should be shown for selection
  // EXCEPT we also include the cost center currently selected for the active row, even if it is inactive.
  const activeRow = activeDropdownRow !== null ? rows[activeDropdownRow] : null;
  const filteredCostCenters = costCenters.filter(cc => 
    (cc.isActive || (activeRow && activeRow.costCenterId === cc.id)) && (
      cc.code.toLowerCase().includes(ccSearchText.toLowerCase()) ||
      cc.name.toLowerCase().includes(ccSearchText.toLowerCase())
    )
  );

  const isFinalized = period?.status === 'finalized';

  return (
    <LayoutShell>
      {/* Top Navigation Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/periods')}
            className="p-2 border border-border bg-surface rounded-xl hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
              {isRenaming ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editNameText}
                    onChange={(e) => setEditNameText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') setIsRenaming(false);
                    }}
                    className="px-2.5 py-1 text-sm border border-primary focus:border-primary-hover rounded-lg bg-surface text-text-primary font-semibold outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleRename}
                    className="p-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setIsRenaming(false)}
                    className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer"
                  >
                    {getTranslation('cancel', language)}
                  </button>
                </div>
              ) : (
                <h1 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
                  {period?.name || (period ? `${period.year}-${String(period.month).padStart(2, '0')}` : 'Loading...')}
                  {period && !isFinalized && user?.role !== 'viewer' && (
                    <button
                      onClick={() => {
                        setEditNameText(period.name || `${period.year}-${String(period.month).padStart(2, '0')}`);
                        setIsRenaming(true);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                      title="Rename Sheet"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </h1>
              )}
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center gap-2 mt-1">
              {period && (
                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                  period.status === 'draft'
                    ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                }`}>
                  {period.status}
                </span>
              )}

              {/* Save Status indicators */}
              {period?.status === 'draft' && (
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${
                  saveStatus === 'saved'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : saveStatus === 'unsaved'
                    ? 'text-amber-600 dark:text-amber-400'
                    : saveStatus === 'saving'
                    ? 'text-primary'
                    : 'text-rose-600 dark:text-rose-400'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    saveStatus === 'saved'
                      ? 'bg-emerald-500'
                      : saveStatus === 'unsaved'
                      ? 'bg-amber-500 animate-pulse'
                      : saveStatus === 'saving'
                      ? 'bg-primary animate-ping'
                      : 'bg-rose-500'
                  }`}></span>
                  {saveStatus === 'saved' && getTranslation('saved', language)}
                  {saveStatus === 'unsaved' && getTranslation('unsavedChanges', language)}
                  {saveStatus === 'saving' && getTranslation('saving', language)}
                  {saveStatus === 'error' && getTranslation('errorSaving', language)}
                </span>
              )}
              {period && (
                <span className="text-[10px] text-text-secondary font-medium ml-3.5 select-none">
                  {getTranslation('lastModified', language)}: {period.updatedAt ? new Date(period.updatedAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-US') : '-'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2.5">
          {/* PDF Export */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-3.5 py-2 border border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <FileText className="h-4 w-4 text-rose-500" />
            {getTranslation('exportPdf', language)}
          </button>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 border border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            {getTranslation('exportExcel', language)}
          </button>

          {/* Finalize Button */}
          {period?.status === 'draft' && user?.role !== 'viewer' && (
            <button
              onClick={() => setFinalizeModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-shadow active:scale-[0.98] transition-all cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              {getTranslation('finalizePeriod', language)}
            </button>
          )}

          {/* Revert to Draft Button */}
          {period?.status === 'finalized' && user?.role !== 'viewer' && (
            <button
              onClick={() => setRevertModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-550 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Unlock className="h-4 w-4" />
              {getTranslation('revertToDraft', language)}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-20 flex flex-col items-center justify-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-400">Loading budget worksheet...</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Bottom section: Cost Center Summary Drawer (Moved to top) */}
          <div className="bg-surface border border-border rounded-2xl shadow-sm p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 select-none">
              {getTranslation('summaryCostCenter', language)}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ccTotals.map((cc, i) => (
                <div
                  key={i}
                  className="bg-slate-50 dark:bg-slate-800/35 border border-slate-100 dark:border-slate-850 p-4 rounded-xl flex flex-col gap-2.5"
                >
                  <p className="font-bold text-xs text-primary uppercase tracking-wide truncate">
                    {cc.code} - {cc.name}
                  </p>
                  
                  <div className="space-y-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>{getTranslation('beforeTax', language)}:</span>
                      <span className="font-mono text-text-secondary">{formatCurrency(cc.beforeTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{getTranslation('taxCol', language)}:</span>
                      <span className="font-mono text-text-secondary">{formatCurrency(cc.tax)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800 font-bold text-text-primary">
                      <span>{getTranslation('grandTotal', language)}:</span>
                      <span className="font-mono text-text-primary">{formatCurrency(cc.total)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200/30 dark:border-slate-800/50 font-bold text-primary">
                      <span>{getTranslation('budgetCutTotals', language)}:</span>
                      <span className="font-mono">{formatCurrency(cc.budgetCutTotal)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Row Button (Moved to top of the table) */}
          {period?.status === 'draft' && user?.role !== 'viewer' && (
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl text-sm font-semibold shadow-sm active:scale-[0.99] transition-all cursor-pointer w-fit"
            >
              <Plus className="h-4.5 w-4.5 text-primary" />
              {getTranslation('addCol', language)}
            </button>
          )}

          {/* Main Worksheet Table Card */}
          <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/35 text-slate-500 dark:text-slate-400 font-semibold text-xs border-b border-slate-200 dark:border-slate-850 uppercase select-none">
                    <th className="p-3 w-12 text-center">{getTranslation('noCol', language)}</th>
                    <th className="p-3 w-32">{getTranslation('accountCodeCol', language)}</th>
                    <th className="p-3 min-w-[180px]">{getTranslation('costCenterCol', language)}</th>
                    <th className="p-3 min-w-[200px]">{getTranslation('descriptionCol', language)}</th>
                    <th className="p-3 w-36">{getTranslation('amountCol', language)}</th>
                    <th className="p-3 w-28">{getTranslation('taxCol', language)}</th>
                    <th className="p-3 w-32">{getTranslation('totalCol', language)}</th>
                    <th className="p-3 min-w-[180px]">{getTranslation('notesCol', language)}</th>
                    <th className="p-3 w-24 text-center">{getTranslation('budgetCutCol', language)}</th>
                    <th className="p-3 w-28">{getTranslation('typeCol', language)}</th>
                    {period?.status === 'draft' && user?.role !== 'viewer' && (
                      <th className="p-3 w-36 text-center">{getTranslation('actionsCol', language)}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-855">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={period?.status === 'draft' ? 11 : 10} className="p-16 text-center font-medium text-slate-400">
                        {getTranslation('emptySpreadsheet', language)}
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => {
                      const isViewer = user?.role === 'viewer';
                      const isCcDropdownActive = activeDropdownRow === idx;
                      
                      const selectedCc = costCenters.find(c => c.id === row.costCenterId);

                      return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50/40 dark:hover:bg-slate-900/20 focus-within:bg-primary-light/30 dark:focus-within:bg-primary-light/5 transition-colors ${
                            draggedRowIdx === idx ? 'opacity-40 bg-primary-light/40 dark:bg-primary-light/10' : ''
                          }`}
                          draggable={!isFinalized && !isViewer}
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          onDrop={(e) => handleDrop(e, idx)}
                        >
                          {/* Row Number */}
                          <td className="p-3 text-center font-medium text-slate-400 select-none flex items-center justify-center gap-1.5 min-h-[44px]">
                            {!isFinalized && !isViewer && (
                              <GripVertical className="h-3.5 w-3.5 text-slate-350 dark:text-slate-600 cursor-grab active:cursor-grabbing shrink-0" />
                            )}
                            <span>{idx + 1}</span>
                          </td>

                          {/* Account Code Input */}
                          <td className="p-2">
                            <input
                              id={`cell-${idx}-accountCode`}
                              type="text"
                              disabled={isFinalized || isViewer}
                              value={row.accountCode || ''}
                              onChange={(e) => handleCellChange(idx, 'accountCode', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, idx, 'accountCode')}
                              placeholder="53010060..."
                              className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-primary dark:hover:border-slate-800 dark:focus:border-primary bg-transparent disabled:border-transparent outline-none transition-all text-slate-850 dark:text-white font-mono text-xs"
                            />
                          </td>

                          {/* Cost Center Dropdown Selector */}
                          <td className="p-2 relative">
                            {isFinalized || isViewer ? (
                              <div className="px-2 py-1.5 text-slate-800 dark:text-slate-300 font-medium truncate text-xs">
                                {selectedCc ? `${selectedCc.code} - ${selectedCc.name}` : 'Unassigned'}
                              </div>
                            ) : (
                              <div>
                                <button
                                  id={`cell-${idx}-costCenterId`}
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownRow(idx);
                                    setCcSearchText('');
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, idx, 'costCenterId')}
                                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-primary bg-transparent text-left outline-none transition-all text-text-primary text-xs"
                                >
                                  <span className="truncate font-medium">
                                    {selectedCc ? `${selectedCc.code} - ${selectedCc.name}` : getTranslation('selectCostCenter', language)}
                                  </span>
                                  <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                                </button>

                                {/* Dropdown popover overlay */}
                                {isCcDropdownActive && (
                                  <div
                                    ref={dropdownRef}
                                    className="absolute left-2 right-2 mt-1 bg-surface border border-border rounded-xl shadow-xl z-50 p-2 max-h-56 overflow-y-auto flex flex-col gap-2"
                                  >
                                    {/* Search Box */}
                                    <div className="relative">
                                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                      <input
                                        type="text"
                                        autoFocus
                                        placeholder={getTranslation('searchCostCenter', language)}
                                        value={ccSearchText}
                                        onChange={(e) => setCcSearchText(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-xs text-text-primary"
                                      />
                                    </div>

                                    {/* Cost Center List options */}
                                    <div className="space-y-0.5 max-h-40 overflow-y-auto pr-1">
                                      {filteredCostCenters.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 text-center py-4 font-semibold">
                                          {getTranslation('noCcFound', language)}
                                        </p>
                                      ) : (
                                        filteredCostCenters.map(cc => (
                                          <button
                                            key={cc.id}
                                            type="button"
                                            onClick={() => {
                                              handleCellChange(idx, 'costCenterId', cc.id);
                                              setActiveDropdownRow(null);
                                            }}
                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                              row.costCenterId === cc.id
                                                ? 'bg-primary-light text-primary'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                          >
                                            {cc.code} - {cc.name}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Description Input */}
                          <td className="p-2">
                            <input
                              id={`cell-${idx}-description`}
                              type="text"
                              disabled={isFinalized || isViewer}
                              value={row.description}
                              onChange={(e) => handleCellChange(idx, 'description', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, idx, 'description')}
                              placeholder={getTranslation('describeItem', language)}
                              className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-primary dark:hover:border-slate-800 dark:focus:border-primary bg-transparent disabled:border-transparent outline-none transition-all text-slate-850 dark:text-white text-xs"
                            />
                          </td>

                          {/* Amount Input */}
                          <td className="p-2">
                            <input
                              id={`cell-${idx}-amountBeforeTax`}
                              type="number"
                              step="0.01"
                              disabled={isFinalized || isViewer}
                              value={row.amountBeforeTax === 0 ? '' : row.amountBeforeTax}
                              onChange={(e) => handleCellChange(idx, 'amountBeforeTax', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, idx, 'amountBeforeTax')}
                              placeholder="0.00"
                              className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-primary bg-transparent disabled:border-transparent outline-none transition-all text-text-primary font-mono font-medium text-xs"
                            />
                          </td>

                          {/* Tax Amount (Read-only) */}
                          <td className="p-3 text-slate-500 dark:text-slate-400 font-mono font-medium text-xs">
                            {formatCurrency(row.taxAmount)}
                          </td>

                          {/* Total Amount (Read-only) */}
                          <td className="p-3 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs">
                            {formatCurrency(row.totalAmount)}
                          </td>

                          {/* Notes Input */}
                          <td className="p-2">
                            <input
                              id={`cell-${idx}-notes`}
                              type="text"
                              disabled={isFinalized || isViewer}
                              value={row.notes || ''}
                              onChange={(e) => handleCellChange(idx, 'notes', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, idx, 'notes')}
                              placeholder={getTranslation('notesReason', language)}
                              className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-primary bg-transparent disabled:border-transparent outline-none transition-all text-text-primary text-xs"
                            />
                          </td>

                          {/* Budget Cut Checkbox */}
                          <td className="p-2 text-center">
                            <input
                              id={`cell-${idx}-includedInBudgetCut`}
                              type="checkbox"
                              disabled={isFinalized || isViewer}
                              checked={row.includedInBudgetCut !== false}
                              onChange={(e) => handleCellChange(idx, 'includedInBudgetCut', e.target.checked)}
                              className="h-4 w-4 accent-primary border border-slate-200 rounded cursor-pointer disabled:opacity-60"
                            />
                          </td>

                          {/* Transaction Type Select */}
                          <td className="p-2">
                            <select
                              id={`cell-${idx}-transactionType`}
                              disabled={isFinalized || isViewer}
                              value={row.transactionType}
                              onChange={(e) => handleCellChange(idx, 'transactionType', e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, idx, 'transactionType')}
                              className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-primary dark:hover:border-slate-800 dark:focus:border-primary bg-transparent outline-none transition-all text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              <option value="expense">{getTranslation('expenseOpt', language)}</option>
                            </select>
                          </td>

                          {/* Actions panel */}
                          {!isFinalized && !isViewer && (
                            <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => insertRowAbove(idx)}
                                  title="Insert row above"
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveRow(idx, 'up')}
                                  title="Move row up"
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === rows.length - 1}
                                  onClick={() => moveRow(idx, 'down')}
                                  title="Move row down"
                                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerDeleteRow(idx)}
                                  title="Delete row"
                                  className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom aggregate sums row */}
            <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 flex flex-col gap-3 font-semibold text-xs text-slate-500 uppercase tracking-wider select-none">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>{getTranslation('overallTotals', language)}:</div>
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    {getTranslation('beforeTax', language)}: <span className="font-mono text-sm text-slate-850 dark:text-white ml-1">{formatCurrency(totals.beforeTax)}</span>
                  </div>
                  <div>
                    {getTranslation('tax', language)}: <span className="font-mono text-sm text-slate-850 dark:text-white ml-1">{formatCurrency(totals.tax)}</span>
                  </div>
                  <div>
                    {getTranslation('grandTotal', language)}: <span className="font-mono text-sm font-bold text-slate-950 dark:text-white ml-1">{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2.5 border-t border-slate-200/50 dark:border-slate-800/50 text-primary">
                <div>{getTranslation('budgetCutTotals', language)}:</div>
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    {getTranslation('beforeTax', language)}: <span className="font-mono text-sm text-slate-850 dark:text-white ml-1">{formatCurrency(totals.budgetCutBeforeTax)}</span>
                  </div>
                  <div>
                    {getTranslation('tax', language)}: <span className="font-mono text-sm text-slate-850 dark:text-white ml-1">{formatCurrency(totals.budgetCutTax)}</span>
                  </div>
                  <div>
                    {getTranslation('grandTotal', language)}: <span className="font-mono text-sm font-bold text-primary ml-1">{formatCurrency(totals.budgetCutTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Row Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 p-2 rounded-xl">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-850 dark:text-slate-200">{getTranslation('deleteRow', language)}</h3>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {getTranslation('confirmDeleteRow', language)}
              </p>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors"
              >
                {getTranslation('cancel', language)}
              </button>
              <button
                onClick={confirmDeleteRow}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/10 transition-colors cursor-pointer"
              >
                {getTranslation('deleteBtn', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Finalize Period Confirmation Modal */}
      {finalizeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 p-2 rounded-xl">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-850 dark:text-slate-200">{getTranslation('finalizeSheet', language)}</h3>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                {getTranslation('confirmFinalize', language)}
              </p>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setFinalizeModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-855 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors"
              >
                {getTranslation('cancel', language)}
              </button>
              <button
                onClick={handleFinalizePeriod}
                disabled={finalizing}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-shadow transition-colors cursor-pointer"
              >
                {finalizing ? (language === 'th' ? 'กำลังดำเนินการ...' : 'Finalizing...') : getTranslation('finalizeNow', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert to Draft Confirmation Modal */}
      {revertModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 p-2 rounded-xl">
                <Unlock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-855 dark:text-slate-200">{getTranslation('revertToDraft', language)}</h3>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                {getTranslation('confirmRevert', language)}
              </p>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setRevertModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-855 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors"
              >
                {getTranslation('cancel', language)}
              </button>
              <button
                onClick={handleRevertPeriod}
                disabled={reverting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-amber-600/10 transition-colors cursor-pointer"
              >
                {reverting ? (language === 'th' ? 'กำลังดำเนินการ...' : 'Reverting...') : getTranslation('revertNow', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutShell>
  );
}
