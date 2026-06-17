'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LayoutShell from '@/components/LayoutShell';
import { useApp } from '@/context/AppContext';
import { getTranslation } from '@/lib/translations';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { downloadFileViaServer } from '@/lib/download';
import {
  Calendar,
  Filter,
  Plus,
  FolderOpen,
  Trash2,
  FileText
} from 'lucide-react';

export default function PeriodsPage() {
  const { user, showToast, language } = useApp();
  const router = useRouter();

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  
  // Period Creation Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete Sheet Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Selected Periods State for Bulk Export
  const [selectedPeriods, setSelectedPeriods] = useState([]);

  const t = (key) => getTranslation(key, language);

  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/periods';
      const params = [];
      if (dateFilter) {
        const [year, month] = dateFilter.split('-');
        params.push(`year=${parseInt(year, 10)}`);
        params.push(`month=${parseInt(month, 10)}`);
      }
      if (params.length > 0) url += `?${params.join('&')}`;
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPeriods(data.periods);
      } else {
        showToast(getTranslation('connectionError', language), 'error');
      }
    } catch (err) {
      console.error('Fetch periods error:', err);
      showToast(getTranslation('connectionError', language), 'error');
    } finally {
      setLoading(false);
    }
  }, [dateFilter, language, showToast]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    if (user?.role === 'viewer') return;

    const newYear = parseInt(selectedYear, 10);
    const newMonth = parseInt(selectedMonth, 10);

    try {
      setCreating(true);
      const res = await fetch('/api/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: newYear, month: newMonth, name: newName.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create period');
      }

      showToast(`${t('createSheet')} ${newYear}-${String(newMonth).padStart(2, '0')} ✓`, 'success');
      setCreateModalOpen(false);
      router.push(`/periods/${data.period.id}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
    setNewName('');
    setCreateModalOpen(true);
  };

  const handleDeletePeriod = async () => {
    if (!periodToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/periods/${periodToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `${t('deleteSheet')} ✓`, 'success');
        setDeleteModalOpen(false);
        setPeriodToDelete(null);
        fetchPeriods();
      } else {
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPeriods(periods.map(p => p.id));
    } else {
      setSelectedPeriods([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedPeriods(prev => [...prev, id]);
    } else {
      setSelectedPeriods(prev => prev.filter(item => item !== id));
    }
  };

  const handleBulkExportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('l', 'mm', 'a4');
      const filename = `Combined_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

      // Load Thai font (using chunked reader to prevent stack overflow crash)
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

      // Fetch details sequentially
      for (let index = 0; index < selectedPeriods.length; index++) {
        const periodId = selectedPeriods[index];
        const res = await fetch(`/api/periods/${periodId}`);
        if (!res.ok) continue;
        const data = await res.json();
        const p = data.period;
        const rows = p.transactions || [];

        if (index > 0) {
          doc.addPage();
        }

        // Header details
        doc.setFontSize(16);
        doc.setTextColor(13, 148, 136); // primary color
        doc.text(getTranslation('monthlyPerfReport', language), 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(`${getTranslation('sheetName', language)}: ${p.name || `${p.year}-${String(p.month).padStart(2, '0')}`}`, 14, 28);
        doc.text(`${getTranslation('statusLabel', language)}: ${p.status?.toUpperCase()}`, 14, 34);
        doc.text(`${getTranslation('exportedAt', language)}: ${new Date().toLocaleString()}`, 14, 40);

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 45, 282, 45);

        // Map transactions body
        const body = rows.map((r, i) => [
          i + 1,
          r.accountCode || '',
          r.costCenter ? `${r.costCenter.code} - ${r.costCenter.name}` : 'Unassigned',
          r.description || '',
          formatCurrencyPDF(r.amountBeforeTax),
          formatCurrencyPDF(r.taxAmount),
          formatCurrencyPDF(r.totalAmount),
          r.notes || '',
          r.includedInBudgetCut ? 'YES' : 'NO',
          r.transactionType.toUpperCase()
        ]);

        const sumBeforeTax = rows.reduce((s, r) => s + r.amountBeforeTax, 0);
        const sumTax = rows.reduce((s, r) => s + r.taxAmount, 0);
        const sumTotal = rows.reduce((s, r) => s + r.totalAmount, 0);

        body.push([
          '', '', '',
          getTranslation('overallTotals', language),
          formatCurrencyPDF(sumBeforeTax),
          formatCurrencyPDF(sumTax),
          formatCurrencyPDF(sumTotal),
          '', '', ''
        ]);

        const bcBeforeTax = rows.reduce((s, r) => s + (r.includedInBudgetCut ? r.amountBeforeTax : 0), 0);
        const bcTax = rows.reduce((s, r) => s + (r.includedInBudgetCut ? r.taxAmount : 0), 0);
        const bcTotal = rows.reduce((s, r) => s + (r.includedInBudgetCut ? r.totalAmount : 0), 0);

        body.push([
          '', '', '',
          getTranslation('budgetCutTotals', language),
          formatCurrencyPDF(bcBeforeTax),
          formatCurrencyPDF(bcTax),
          formatCurrencyPDF(bcTotal),
          '', '', ''
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
          headStyles: { fillColor: [13, 148, 136], font: 'Sarabun' },
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
                data.cell.styles.textColor = '#0d9488';
              }
            }
          }
        });
      }

      const blob = doc.output('blob');
      downloadFileViaServer(blob, filename, 'application/pdf');
      showToast(t('pdfExportSuccess'), 'success');
      setSelectedPeriods([]); // Clear selection
    } catch (err) {
      console.error(err);
      showToast(t('pdfExportFail'), 'error');
    }
  };

  const formatCurrencyPDF = (val) => {
    const num = new Intl.NumberFormat(language === 'th' ? 'th-TH' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
    return `฿${num}`;
  };

  const getMonthName = (monthNum) => {
    const date = new Date(2000, monthNum - 1, 1);
    return date.toLocaleString(language === 'th' ? 'th-TH' : 'en-US', { month: 'long' });
  };

  const currentYear = new Date().getFullYear();

  return (
    <LayoutShell>
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {t('budgetPeriods')}
          </h1>
          <p className="text-sm text-text-secondary mt-1 font-medium">
            {t('manageSheets')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedPeriods.length > 0 && (
            <button
              onClick={handleBulkExportPDF}
              className="flex items-center gap-2 px-4 py-2.5 border border-border bg-surface hover:bg-surface-hover text-text-primary rounded-xl text-sm font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <FileText className="h-4.5 w-4.5 text-rose-500" />
              <span>{t('exportSelectedPdf')} ({selectedPeriods.length})</span>
            </button>
          )}

          {user?.role !== 'viewer' && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-shadow active:scale-[0.98] transition-all cursor-pointer w-fit"
            >
              <Plus className="h-4.5 w-4.5" />
              {t('newPeriod')}
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-2.5 text-text-secondary">
          <Filter className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted">{t('filters')}</span>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Calendar Picker Filter */}
          <div className="flex items-center gap-2.5">
            <label className="text-xs font-semibold text-text-secondary">{t('filterByPeriod')}</label>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="p-2 border border-border bg-surface-hover focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs font-semibold outline-none text-text-primary transition-all cursor-pointer"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="px-3 py-2 border border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {t('clearFilter')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm font-medium text-text-secondary">{t('loading')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/30 text-text-secondary font-semibold text-xs border-b border-border uppercase select-none">
                  <th className="p-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={periods.length > 0 && selectedPeriods.length === periods.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 accent-primary border-border rounded cursor-pointer"
                    />
                  </th>
                  <th className="p-4">{t('period')}</th>
                  <th className="p-4">{t('sheetName')}</th>
                  <th className="p-4">{t('status')}</th>
                  <th className="p-4">{t('createdBy')}</th>
                  <th className="p-4">{t('lastModified')}</th>
                  <th className="p-4 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {periods.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center font-medium text-text-muted">
                      {t('noSheetsFound')}
                    </td>
                  </tr>
                ) : (
                  periods.map((p) => {
                    const isSelected = selectedPeriods.includes(p.id);
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => router.push(`/periods/${p.id}`)}
                        className={`hover:bg-surface-hover transition-colors cursor-pointer ${isSelected ? 'bg-primary-light/10 dark:bg-primary-light/5' : ''}`}
                      >
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectOne(e, p.id)}
                            className="h-4 w-4 accent-primary border-border rounded cursor-pointer"
                          />
                        </td>
                        <td className="p-4 font-semibold text-text-primary">
                          {p.name || `${p.year}-${String(p.month).padStart(2, '0')}`} ({getMonthName(p.month)} {p.year})
                        </td>
                        <td className="p-4 text-text-secondary font-medium">
                          {p.name || '-'}
                        </td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded border ${
                            p.status === 'draft'
                              ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-text-secondary font-medium">
                          {p.user?.username || 'System'}
                        </td>
                        <td className="p-4 text-text-secondary font-medium">
                          {p.updatedAt ? new Date(p.updatedAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-US') : '-'}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/periods/${p.id}`}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors bg-primary-light hover:bg-primary-light/80 px-3.5 py-1.5 rounded-lg border border-primary-border"
                            >
                              <FolderOpen className="h-3.5 w-3.5" />
                              {t('openSheet')}
                            </Link>
                            {user?.role !== 'viewer' && (
                              <button
                                onClick={() => {
                                  setPeriodToDelete(p);
                                  setDeleteModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-50 transition-colors bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 cursor-pointer"
                                title={t('deleteSheet')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Sheet Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 p-2 rounded-xl">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-primary">{t('deleteSheet')}</h3>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium text-text-secondary leading-relaxed">
                {t('deleteSheetConfirm')}
                <br />
                <span className="font-bold text-text-primary mt-1 block">
                  {periodToDelete?.name || `${periodToDelete?.year}-${String(periodToDelete?.month).padStart(2, '0')}`}
                </span>
                <span className="text-xs text-rose-600 font-semibold mt-2 block">
                  {t('deleteSheetWarning')}
                </span>
              </p>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setPeriodToDelete(null);
                }}
                className="px-4 py-2 border border-border hover:bg-surface-hover rounded-xl text-xs font-semibold text-text-secondary transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeletePeriod}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/10 transition-colors cursor-pointer"
              >
                {deleting ? t('deleting') : t('confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Period Dialog Modal — Calendar Dropdown */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="bg-primary-light text-primary p-2 rounded-xl">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-primary">{t('createBudgetPeriod')}</h3>
            </div>
            
            <form onSubmit={handleCreatePeriod}>
              <div className="p-5 space-y-4">
                
                {/* Month Picker Calendar Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">{t('selectMonth')}</label>
                  <input
                    type="month"
                    required
                    value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const [y, m] = val.split('-');
                        setSelectedYear(parseInt(y, 10));
                        setSelectedMonth(parseInt(m, 10));
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-border bg-surface-hover focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all text-text-primary cursor-pointer"
                  />
                </div>

                {/* Sheet Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">{t('sheetNameOptional')}</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={language === 'th' ? 'เช่น งบ Q2, แผนการตลาด' : 'e.g. Q2 Operations, Marketing Draft'}
                    className="w-full p-2.5 rounded-xl border border-border bg-surface-hover focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all text-text-primary"
                  />
                </div>

              </div>

              <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-border hover:bg-surface-hover rounded-xl text-xs font-semibold text-text-secondary transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-shadow transition-colors cursor-pointer"
                >
                  {creating ? t('saving') : t('createSheet')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </LayoutShell>
  );
}
