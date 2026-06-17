'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LayoutShell from '@/components/LayoutShell';
import { useApp } from '@/context/AppContext';
import { getTranslation } from '@/lib/translations';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { downloadFileViaServer } from '@/lib/download';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Calendar,
  ChevronRight,
  ArrowRight,
  FolderOpen,
  FileDown,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

// Dynamically import chart to prevent SSR hydration errors with Recharts
const TrendsChart = dynamic(() => import('@/components/TrendsChart'), { ssr: false });

export default function DashboardPage() {
  const { user, showToast, language, theme } = useApp();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState('month'); // 'month' or 'year'
  const [exportFormat, setExportFormat] = useState('pdf'); // 'pdf' or 'excel' or 'jpg'
  const [downloading, setDownloading] = useState(false);

  // Period Creation Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const t = (key) => getTranslation(key, language);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, periodsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/periods')
      ]);

      if (statsRes.ok && periodsRes.ok) {
        const statsData = await statsRes.json();
        const periodsData = await periodsRes.json();
        setStats(statsData);
        setPeriods(periodsData.periods.slice(0, 5)); // show top 5 recent
      } else {
        showToast(getTranslation('connectionError', language), 'error');
      }
    } catch (err) {
      console.error('Fetch dashboard error:', err);
      showToast(getTranslation('connectionError', language), 'error');
    } finally {
      setLoading(false);
    }
  }, [language, showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

  const getMonthName = (monthNum) => {
    const date = new Date(2000, monthNum - 1, 1);
    return date.toLocaleString(language === 'th' ? 'th-TH' : 'en-US', { month: 'long' });
  };

  const formatCurrency = (val) => {
    const num = new Intl.NumberFormat(language === 'th' ? 'th-TH' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
    return `฿${num}`;
  };

  // Get theme primary color for PDF exports
  const getThemePrimaryColor = () => {
    switch (theme) {
      case 'dark': return { r: 45, g: 212, b: 191, hex: '#2dd4bf' };
      case 'pink': return { r: 133, g: 40, b: 133, hex: '#852885' };
      default: return { r: 13, g: 148, b: 136, hex: '#0d9488' };
    }
  };

  const getExportData = async (scope) => {
    if (scope === 'month') {
      return stats;
    } else {
      const targetYear = stats?.activeStats?.year || new Date().getFullYear();
      const res = await fetch(`/api/dashboard/stats?scope=year&year=${targetYear}`);
      if (res.ok) {
        return await res.json();
      } else {
        throw new Error('Failed to fetch yearly dashboard stats');
      }
    }
  };

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const data = await getExportData(exportScope);

      if (exportFormat === 'pdf') {
        await handleExportPDF(data, exportScope);
      } else if (exportFormat === 'excel') {
        await handleExportExcel(data, exportScope);
      } else if (exportFormat === 'jpg') {
        await handleExportJPG(data, exportScope);
      }
      setExportModalOpen(false);
    } catch (err) {
      console.error('Download report error:', err);
      showToast(err.message || t('pdfExportFail'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleExportExcel = async (exportData = stats, scope = 'month') => {
    try {
      const XLSX = await import('xlsx');
      const targetYear = exportData?.activeStats?.year || new Date().getFullYear();
      const sheetName = exportData?.activeStats?.name || `${targetYear}-${String(exportData?.activeStats?.month || '').padStart(2, '0')}`;
      const filename = scope === 'year'
        ? `BudgetHub_Dashboard_${targetYear}.xlsx`
        : `${sheetName.replace(/[^a-zA-Z0-9ก-๙-_]/g, '_')}.xlsx`;

      const wb = XLSX.utils.book_new();

      const activeStats = exportData?.activeStats || {};
      const overviewAoa = [
        [scope === 'year' ? 'BUDGETHUB ANNUAL DASHBOARD REPORT' : 'BUDGETHUB DASHBOARD REPORT'],
        [],
        [t('generatedBy') + ':', user?.username || 'Guest'],
        [t('exportedAt') + ':', new Date().toLocaleString()],
        [],
        [scope === 'year' ? t('summaryYear') : t('activePeriodLabel')],
        [t('period') + ':', activeStats.name || 'N/A'],
        [t('year') + ':', activeStats.year || 'N/A'],
        [t('month') + ':', activeStats.month || 'N/A'],
        [t('status') + ':', (activeStats.status || 'N/A').toUpperCase()],
        [],
        [t('financialMetric')],
        [t('financialMetric'), t('value')],
        [t('totalExpense'), activeStats.expense || 0],
        [t('netBalance'), { f: 'B14' }]
      ];
      const wsOverview = XLSX.utils.aoa_to_sheet(overviewAoa);
      wsOverview['!cols'] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsOverview, scope === 'year' ? 'Annual Summary' : 'Active Period Summary');

      const ccBreakdown = exportData?.costCenterBreakdown || [];
      const ccAoa = [
        [t('costCenterShare')],
        [],
        [t('costCenterCol'), t('costCenterName'), t('totalCol')]
      ];
      ccBreakdown.forEach(cc => {
        ccAoa.push([cc.code, cc.name, cc.beforeTax || 0]);
      });
      const ccLastRow = ccAoa.length;
      ccAoa.push([]);
      ccAoa.push([t('overallTotals'), '', { f: `SUM(C3:C${ccLastRow})` }]);

      const wsCC = XLSX.utils.aoa_to_sheet(ccAoa);
      wsCC['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsCC, 'Cost Center Breakdown');

      const trends = (exportData?.trends || []).filter(tr => scope === 'month' || tr.year === targetYear);
      const trendsAoa = [
        [t('historicalTrends')],
        [],
        [t('period'), t('totalExpense'), t('netBalance')]
      ];
      trends.forEach((tr, i) => {
        const r = i + 4;
        trendsAoa.push([
          tr.period || tr.label,
          tr.expense || 0,
          { f: `B${r}` }
        ]);
      });

      const wsTrends = XLSX.utils.aoa_to_sheet(trendsAoa);
      wsTrends['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsTrends, 'Historical Trends');

      const b64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      downloadFileViaServer(b64, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      showToast(t('excelExportSuccess'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('excelExportFail'), 'error');
    }
  };

  const handleExportPDF = async (exportData = stats, scope = 'month') => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('p', 'mm', 'a4');
      const themeColor = getThemePrimaryColor();
      const targetYear = exportData?.activeStats?.year || new Date().getFullYear();
      const sheetName = exportData?.activeStats?.name || `${targetYear}-${String(exportData?.activeStats?.month || '').padStart(2, '0')}`;
      const filename = scope === 'year'
        ? `BudgetHub_Dashboard_${targetYear}.pdf`
        : `${sheetName.replace(/[^a-zA-Z0-9ก-๙-_]/g, '_')}.pdf`;

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

      // Header Design
      doc.setFontSize(20);
      doc.setTextColor(themeColor.r, themeColor.g, themeColor.b);
      const reportTitle = scope === 'year' ? t('annualReportTitle') : t('monthlyReportTitle');
      doc.text(reportTitle, 14, 22);

      // Metadata
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${t('generatedBy')}: ${user?.username || 'Guest'}`, 14, 30);
      doc.text(`${t('exportedAt')}: ${new Date().toLocaleString()}`, 14, 35);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 40, 196, 40);

      // Active Period Info
      const activeStats = exportData?.activeStats || {};
      const activeName = scope === 'year'
        ? `${t('summaryYear')}: ${targetYear}`
        : `${t('activePeriodLabel')}: ${activeStats.name || `${getMonthName(activeStats.month)} ${activeStats.year}`} (${(activeStats.status || 'N/A').toUpperCase()})`;

      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(activeName, 14, 48);

      const overviewBody = [
        [t('totalExpense'), formatCurrency(activeStats.expense)],
        [t('netBalance'), formatCurrency(Math.abs(activeStats.net))]
      ];

      autoTable(doc, {
        startY: 52,
        head: [[t('financialMetric'), t('value')]],
        body: overviewBody,
        theme: 'striped',
        headStyles: { fillColor: [themeColor.r, themeColor.g, themeColor.b] },
        styles: { fontSize: 9, font: 'Sarabun' },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 100, fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.row.index === 2) {
            data.cell.styles.textColor = activeStats.net >= 0 ? '#10b981' : '#f43f5e';
          }
        }
      });

      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(t('costCenterShare'), 14, doc.lastAutoTable.finalY + 12);

      const ccBreakdown = exportData?.costCenterBreakdown || [];
      const ccBody = ccBreakdown.map(cc => [
        cc.code,
        cc.name,
        formatCurrency(cc.beforeTax)
      ]);

      const ccSum = ccBreakdown.reduce((sum, cc) => sum + cc.beforeTax, 0);
      ccBody.push([t('overallTotals'), '', formatCurrency(ccSum)]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 16,
        head: [[t('costCenterCol'), t('costCenterName'), t('totalCol')]],
        body: ccBody,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9, font: 'Sarabun' },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 80 },
          2: { cellWidth: 60, fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.row.index === ccBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          }
        }
      });

      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(scope === 'year' ? t('historicalTrends') : t('monthlyComparisons'), 14, doc.lastAutoTable.finalY + 12);

      const trends = (exportData?.trends || []).filter(tr => scope === 'month' || tr.year === targetYear);
      const trendsBody = trends.map(tr => [
        tr.period || tr.label,
        formatCurrency(tr.expense),
        formatCurrency(Math.abs(tr.net))
      ]);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 16,
        head: [[t('period'), t('totalExpense'), t('netBalance')]],
        body: trendsBody,
        theme: 'striped',
        headStyles: { fillColor: [themeColor.r, themeColor.g, themeColor.b] },
        styles: { fontSize: 9, font: 'Sarabun' },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 60 },
          2: { cellWidth: 60, fontStyle: 'bold' }
        }
      });

      const blob = doc.output('blob');
      downloadFileViaServer(blob, filename, 'application/pdf');
      showToast(t('pdfExportSuccess'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('pdfExportFail'), 'error');
    }
  };

  const handleExportJPG = (exportData = stats, scope = 'month') => {
    try {
      const activeStats = exportData?.activeStats || {};
      const ccBreakdown = exportData?.costCenterBreakdown || [];
      const targetYear = activeStats.year || new Date().getFullYear();
      const trends = (exportData?.trends || []).filter(tr => scope === 'month' || tr.year === targetYear);
      const sheetName = activeStats.name || `${targetYear}-${String(activeStats.month || '').padStart(2, '0')}`;

      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 950;
      const ctx = canvas.getContext('2d');

      // Theme-based colors for canvas styling
      let colors = {
        bgStart: '#0b0f19',
        bgEnd: '#1e293b',
        title: '#38bdf8',
        subtitle: '#94a3b8',
        line: '#334155',
        cardBg: '#111827',
        cardBorder: '#1e293b',
        cardLabel: '#64748b',
        textPrimary: '#f8fafc',
        textSecondary: '#e2e8f0',
        textMuted: '#94a3b8',
        meterBg: '#1e293b',
        footer: '#475569',
        primaryGradStart: '#06b6d4',
        primaryGradEnd: '#14b8a6'
      };

      if (theme === 'pink') {
        colors = {
          bgStart: '#fcfbfe',
          bgEnd: '#f4edf5',
          title: '#852885',
          subtitle: '#927a96',
          line: '#ebd0ed',
          cardBg: '#ffffff',
          cardBorder: '#ebd0ed',
          cardLabel: '#927a96',
          textPrimary: '#1f0c22',
          textSecondary: '#5a3e5f',
          textMuted: '#927a96',
          meterBg: '#f4e6f5',
          footer: '#927a96',
          primaryGradStart: '#852885',
          primaryGradEnd: '#c2992b'
        };
      } else if (theme === 'normal' || theme === 'default') {
        colors = {
          bgStart: '#f8f9fb',
          bgEnd: '#e2e8f0',
          title: '#0d9488',
          subtitle: '#64748b',
          line: '#cbd5e1',
          cardBg: '#ffffff',
          cardBorder: '#e2e8f0',
          cardLabel: '#64748b',
          textPrimary: '#0f172a',
          textSecondary: '#475569',
          textMuted: '#94a3b8',
          meterBg: '#ccfbf1',
          footer: '#64748b',
          primaryGradStart: '#0d9488',
          primaryGradEnd: '#0891b2'
        };
      } else { // dark / default dark
        colors = {
          bgStart: '#090d16',
          bgEnd: '#111827',
          title: '#2dd4bf',
          subtitle: '#94a3b8',
          line: '#1e293b',
          cardBg: '#101726',
          cardBorder: '#1e293b',
          cardLabel: '#64748b',
          textPrimary: '#f1f5f9',
          textSecondary: '#94a3b8',
          textMuted: '#64748b',
          meterBg: '#1e293b',
          footer: '#475569',
          primaryGradStart: '#2dd4bf',
          primaryGradEnd: '#22d3ee'
        };
      }

      const gradBg = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradBg.addColorStop(0, colors.bgStart);
      gradBg.addColorStop(1, colors.bgEnd);
      ctx.fillStyle = gradBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = colors.title;
      ctx.font = 'bold 26px Helvetica, Arial, sans-serif';
      const mainTitle = scope === 'year' ? t('annualPerfReport') : t('monthlyPerfReport');
      ctx.fillText(mainTitle, 50, 60);

      const subtitleText = scope === 'year'
        ? `${t('summaryYear')}: ${targetYear} | ${t('generated')}: ${new Date().toLocaleDateString()}`
        : `${t('activePeriodLabel')}: ${activeStats.name || `${getMonthName(activeStats.month)} ${activeStats.year}`} | ${t('statusLabel')}: ${(activeStats.status || 'draft').toUpperCase()} | ${t('generated')}: ${new Date().toLocaleDateString()}`;
      ctx.fillStyle = colors.subtitle;
      ctx.font = '16px Helvetica, Arial, sans-serif';
      ctx.fillText(subtitleText, 50, 95);

      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(50, 120);
      ctx.lineTo(1150, 120);
      ctx.stroke();

      const drawRoundRect = (c, x, y, width, height, radius, fill, stroke) => {
        c.beginPath();
        c.moveTo(x + radius, y);
        c.lineTo(x + width - radius, y);
        c.quadraticCurveTo(x + width, y, x + width, y + radius);
        c.lineTo(x + width, y + height - radius);
        c.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        c.lineTo(x + radius, y + height);
        c.quadraticCurveTo(x, y + height, x, y + height - radius);
        c.lineTo(x, y + radius);
        c.quadraticCurveTo(x, y, x + radius, y);
        c.closePath();
        if (fill) {
          c.fillStyle = fill;
          c.fill();
        }
        if (stroke) {
          c.strokeStyle = stroke;
          c.stroke();
        }
      };

      const cardWidth = 535;
      const cardHeight = 130;
      const cardY = 150;
      const cardXSpacing = 30;
      const startX = 50;

      // Card 1: Expense
      const x1 = startX;
      drawRoundRect(ctx, x1, cardY, cardWidth, cardHeight, 16, colors.cardBg, colors.cardBorder);
      ctx.fillStyle = colors.cardLabel;
      ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
      ctx.fillText(t('totalExpense').toUpperCase(), x1 + 25, cardY + 40);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 28px Helvetica, Arial, sans-serif';
      ctx.fillText(formatCurrency(activeStats.expense), x1 + 25, cardY + 85);

      // Card 2: Net Total
      const x2 = startX + cardWidth + cardXSpacing;
      drawRoundRect(ctx, x2, cardY, cardWidth, cardHeight, 16, colors.cardBg, colors.cardBorder);
      ctx.fillStyle = colors.cardLabel;
      ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
      ctx.fillText(t('netBalance').toUpperCase(), x2 + 25, cardY + 40);
      ctx.fillStyle = colors.primaryGradStart;
      ctx.font = 'bold 28px Helvetica, Arial, sans-serif';
      ctx.fillText(formatCurrency(Math.abs(activeStats.net)), x2 + 25, cardY + 85);

      // Sections
      const secY = 320;
      const secWidth = 520;
      const secHeight = 560;

      // Section A: Monthly Trends
      const secAX = 50;
      drawRoundRect(ctx, secAX, secY, secWidth, secHeight, 16, colors.cardBg, colors.cardBorder);
      ctx.fillStyle = colors.textPrimary;
      ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
      ctx.fillText(scope === 'year' ? t('historicalTrends') : t('monthlyComparisons'), secAX + 25, secY + 40);

      const chartX = secAX + 40;
      const chartY = secY + 480;
      const chartW = 440;
      const chartH = 360;

      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(chartX, chartY);
      ctx.lineTo(chartX + chartW, chartY);
      ctx.stroke();

      const numMonths = trends.length;
      if (numMonths > 0) {
        const maxVal = Math.max(...trends.map(tr => tr.expense || 0)) || 1000;
        const colW = chartW / numMonths;
        const barW = colW * 0.4;

        trends.forEach((tr, i) => {
          const midX = chartX + i * colW + colW / 2;
          const expH = ((tr.expense || 0) / maxVal) * chartH;
          const expY = chartY - expH;
          const redGrad = ctx.createLinearGradient(0, expY, 0, chartY);
          redGrad.addColorStop(0, '#f43f5e');
          redGrad.addColorStop(1, '#e11d48');
          ctx.fillStyle = redGrad;
          ctx.fillRect(midX - barW / 2, expY, barW, expH);

          ctx.fillStyle = colors.textMuted;
          ctx.font = '11px Helvetica, Arial, sans-serif';
          ctx.textAlign = 'center';
          const periodLabel = tr.period || tr.label;
          const displayLabel = scope === 'year' ? periodLabel.slice(5) : periodLabel;
          ctx.fillText(displayLabel, midX, chartY + 25);
        });
        ctx.textAlign = 'left';

        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(secAX + 410, secY + 28, 12, 12);
        ctx.fillStyle = colors.textSecondary;
        ctx.font = '12px Helvetica, Arial, sans-serif';
        ctx.fillText(t('expense'), secAX + 430, secY + 38);
      } else {
        ctx.fillStyle = colors.textMuted;
        ctx.font = '14px Helvetica, Arial, sans-serif';
        ctx.fillText(t('noHistoricalData'), chartX + 100, chartY - 180);
      }

      // Section B: Cost Center Share
      const secBX = 630;
      drawRoundRect(ctx, secBX, secY, secWidth, secHeight, 16, colors.cardBg, colors.cardBorder);
      ctx.fillStyle = colors.textPrimary;
      ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
      ctx.fillText(t('costCenterShare'), secBX + 25, secY + 40);

      let listY = secY + 90;
      const ccMaxTotal = activeStats.expense || 1;

      if (ccBreakdown.length > 0) {
        ccBreakdown.forEach((cc, index) => {
          if (index >= 6) return;
          ctx.fillStyle = colors.textSecondary;
          ctx.font = 'bold 12px Helvetica, Arial, sans-serif';
          ctx.fillText(`${cc.code} - ${cc.name}`, secBX + 25, listY);
          ctx.fillStyle = colors.textMuted;
          ctx.font = '12px monospace';
          ctx.fillText(formatCurrency(cc.beforeTax), secBX + 400, listY);

          const meterX = secBX + 25;
          const meterY = listY + 10;
          const meterW = 470;
          const meterH = 8;
          drawRoundRect(ctx, meterX, meterY, meterW, meterH, 4, colors.meterBg);
          const fillPercent = ccMaxTotal > 0 ? (cc.beforeTax / ccMaxTotal) : 0;
          const fillW = meterW * fillPercent;
          if (fillW > 0) {
            const barGrad = ctx.createLinearGradient(meterX, 0, meterX + fillW, 0);
            barGrad.addColorStop(0, colors.primaryGradStart);
            barGrad.addColorStop(1, colors.primaryGradEnd);
            drawRoundRect(ctx, meterX, meterY, fillW, meterH, 4, barGrad);
          }
          listY += 75;
        });
      } else {
        ctx.fillStyle = colors.textMuted;
        ctx.font = '14px Helvetica, Arial, sans-serif';
        ctx.fillText(t('noCcTransactions'), secBX + 100, secY + 250);
      }

      ctx.fillStyle = colors.footer;
      ctx.font = '11px Helvetica, Arial, sans-serif';
      ctx.fillText(t('confidentialFooter'), 50, 915);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const jpgFilename = scope === 'year'
        ? `BudgetHub_Dashboard_${targetYear}.jpg`
        : `${sheetName.replace(/[^a-zA-Z0-9ก-๙-_]/g, '_')}.jpg`;
      downloadFileViaServer(imgData, jpgFilename, 'image/jpeg');
      showToast(t('jpgExportSuccess'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('jpgExportFail'), 'error');
    }
  };

  return (
    <LayoutShell>
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 select-none">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {t('dashboard')}
          </h1>
          <p className="text-sm text-text-secondary mt-1 font-medium font-sans">
            {t('welcome')}, {user?.username}. {t('glance')}
          </p>
        </div>

        <div className="flex items-center gap-3 w-fit sm:w-auto">
          {/* Export Button */}
          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-border bg-surface hover:bg-surface-hover text-text-primary rounded-xl text-sm font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <FileDown className="h-4.5 w-4.5 text-primary" />
            <span>{t('downloadReport')}</span>
          </button>

          {user?.role !== 'viewer' && (
            <button
              onClick={() => {
                const now = new Date();
                setSelectedYear(now.getFullYear());
                setSelectedMonth(now.getMonth() + 1);
                setNewName('');
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-shadow active:scale-[0.98] transition-all cursor-pointer w-fit"
            >
              <Plus className="h-4.5 w-4.5" />
              {t('newPeriod')}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-surface border border-border rounded-2xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-[380px] bg-surface border border-border rounded-2xl"></div>
            <div className="h-[380px] bg-surface border border-border rounded-2xl"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 font-sans">

          {/* Active Period Summary Cards */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3.5 select-none font-sans font-semibold">
              {t('activePeriod')}: {stats?.activeStats?.name || (stats?.activeStats?.periodId ? `${getMonthName(stats.activeStats.month)} ${stats.activeStats.year}` : t('noActivePeriod'))}
              {stats?.activeStats?.status && stats?.activeStats?.status !== 'none' && (
                <span className={`ml-2 px-2 py-0.5 text-[9px] uppercase tracking-wide rounded-md border font-semibold inline-block ${stats.activeStats.status === 'draft'
                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/60'
                  : stats.activeStats.status === 'finalized'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/60'
                    : 'bg-slate-50 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-400'
                  }`}>
                  {stats.activeStats.status}
                </span>
              )}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Expense Card */}
              <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider select-none">{t('totalExpense')}</p>
                  <p className="text-2xl font-bold text-text-primary tracking-tight">
                    {formatCurrency(stats?.activeStats?.expense)}
                  </p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/60">
                  <TrendingDown className="h-6 w-6" />
                </div>
              </div>

              {/* Net Balance Card — positive styling */}
              <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm flex items-center justify-between">
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider select-none">{t('netBalance')}</p>
                  <p className="text-2xl font-bold tracking-tight text-primary">
                    {formatCurrency(Math.abs(stats?.activeStats?.net))}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl border bg-primary-light text-primary border-primary-border">
                  <span className="text-2xl font-bold">฿</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts & Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Trends Chart */}
            <div className="lg:col-span-2 bg-surface border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4 select-none">
                <h3 className="font-bold text-text-primary">{t('monthlyComparisons')}</h3>
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{t('historicalTrends')}</span>
              </div>
              <TrendsChart data={stats?.trends} />
            </div>

            {/* Cost Center Breakdown */}
            <div className="bg-surface border border-border p-6 rounded-2xl shadow-sm flex flex-col">
              <h3 className="font-bold text-text-primary mb-4 select-none">{t('costCenterShare')}</h3>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[260px] pr-1">
                {stats?.costCenterBreakdown?.length === 0 ? (
                  <p className="text-sm font-semibold text-text-muted text-center py-12 select-none">
                    {t('noTransactions')}
                  </p>
                ) : (
                  stats?.costCenterBreakdown?.map((cc, idx) => (
                    <div key={idx} className="space-y-1.5 font-medium">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-secondary truncate max-w-[150px]">
                          {cc.code} - {cc.name}
                        </span>
                        <span className="text-text-primary">{formatCurrency(cc.beforeTax)}</span>
                      </div>
                      <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full animate-all"
                          style={{
                            width: `${Math.min(
                              100,
                              stats.activeStats?.expense > 0
                                ? (cc.beforeTax / stats.activeStats.expense) * 100
                                : 0
                            )}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {stats?.activeStats?.periodId && (
                <Link
                  href={`/periods/${stats.activeStats.periodId}`}
                  className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-primary hover:text-primary-hover transition-colors uppercase pt-4 border-t border-border"
                >
                  {t('editCurrentSheet')}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Recent Periods */}
          <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden font-medium">
            <div className="p-5 border-b border-border flex items-center justify-between select-none">
              <h3 className="font-bold text-text-primary">{t('recentBudgetSheets')}</h3>
              <Link
                href="/periods"
                className="text-xs font-bold text-primary hover:text-primary-hover transition-colors uppercase flex items-center gap-1.5"
              >
                {t('viewAllSheets')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/30 text-text-secondary font-semibold text-xs border-b border-border uppercase select-none">
                    <th className="p-4">{t('sheetName')}</th>
                    <th className="p-4">{t('status')}</th>
                    <th className="p-4">{t('createdBy')}</th>
                    <th className="p-4">{t('lastModified')}</th>
                    <th className="p-4 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {periods.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center font-medium text-text-muted select-none">
                        {t('noSheetsFound')}
                      </td>
                    </tr>
                  ) : (
                    periods.map((p) => (
                      <tr key={p.id} className="hover:bg-surface-hover transition-colors">
                        <td className="p-4 font-semibold text-text-primary">
                          {p.name || `${p.year}-${String(p.month).padStart(2, '0')}`}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${p.status === 'draft'
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
                        <td className="p-4 text-right">
                          <Link
                            href={`/periods/${p.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover transition-colors bg-primary-light hover:bg-primary-light/80 px-3 py-1.5 rounded-lg border border-primary-border"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                            {t('open')}
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Export Options Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250 font-sans select-none">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="bg-primary-light text-primary p-2 rounded-xl">
                <FileDown className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-primary">{t('exportDashboard')}</h3>
            </div>

            <div className="p-5 space-y-5">
              {/* Scope Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t('exportScope')}
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${exportScope === 'month'
                    ? 'border-primary bg-primary-light text-text-primary'
                    : 'border-border hover:bg-surface-hover text-text-secondary'
                    }`}>
                    <input
                      type="radio"
                      name="exportScope"
                      value="month"
                      checked={exportScope === 'month'}
                      onChange={() => setExportScope('month')}
                      className="accent-primary h-4 w-4"
                    />
                    <div className="text-xs font-semibold">
                      <div>{t('currentMonthOnly')}</div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${exportScope === 'year'
                    ? 'border-primary bg-primary-light text-text-primary'
                    : 'border-border hover:bg-surface-hover text-text-secondary'
                    }`}>
                    <input
                      type="radio"
                      name="exportScope"
                      value="year"
                      checked={exportScope === 'year'}
                      onChange={() => setExportScope('year')}
                      className="accent-primary h-4 w-4"
                    />
                    <div className="text-xs font-semibold">
                      <div>{t('fullYearHistorical')}</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Format Selection */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t('exportFormat')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`flex flex-col items-center justify-center p-3 border rounded-xl gap-2 transition-all cursor-pointer ${exportFormat === 'pdf'
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-border text-text-secondary hover:bg-surface-hover'
                      }`}
                  >
                    <FileText className="h-5 w-5 text-rose-500" />
                    <span className="text-[10px] font-bold">PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('excel')}
                    className={`flex flex-col items-center justify-center p-3 border rounded-xl gap-2 transition-all cursor-pointer ${exportFormat === 'excel'
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-border text-text-secondary hover:bg-surface-hover'
                      }`}
                  >
                    <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    <span className="text-[10px] font-bold">Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('jpg')}
                    className={`flex flex-col items-center justify-center p-3 border rounded-xl gap-2 transition-all cursor-pointer ${exportFormat === 'jpg'
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-border text-text-secondary hover:bg-surface-hover'
                      }`}
                  >
                    <ImageIcon className="h-5 w-5 text-blue-500" />
                    <span className="text-[10px] font-bold">JPG</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-border flex items-center justify-end gap-3 font-semibold">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 border border-border hover:bg-surface-hover rounded-xl text-xs text-text-secondary transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleDownloadReport}
                disabled={downloading || !stats}
                className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs shadow-md shadow-primary-shadow transition-colors cursor-pointer"
              >
                {downloading ? t('sending') : t('downloadReport')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Period Dialog Modal — Calendar Dropdown */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250 font-sans">
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

              <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-border flex items-center justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-border hover:bg-surface-hover rounded-xl text-xs text-text-secondary transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs shadow-md shadow-primary-shadow transition-colors cursor-pointer"
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
