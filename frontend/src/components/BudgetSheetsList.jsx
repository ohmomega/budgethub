import React, { useState, useEffect } from 'react';
import api from '../api';
import MonthYearPicker from './MonthYearPicker';
import {
  FolderOpen,
  Trash2,
  Plus,
  Filter,
  Loader2,
  Calendar,
  X,
  Search,
  FileText,
  FileSpreadsheet
} from 'lucide-react';

const MONTH_NAMES = {
  TH: [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ],
  EN: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
};

const dict = {
  TH: {
    title: 'แผ่นงบประมาณ',
    subtitle: 'จัดการงบประมาณรายเดือนและแผ่นงานรายจ่ายของคุณ คลิกที่แถวเพื่อเปิด',
    createSheet: 'สร้างแผ่นใหม่',
    filtersLabel: 'ตัวกรอง',
    filterByMonthYear: 'กรองตามเดือน/ปี',
    colPeriod: 'ช่วงเวลา',
    colSheetName: 'ชื่อแผ่นงาน',
    colStatus: 'สถานะ',
    colCreator: 'สร้างโดย',
    colUpdated: 'แก้ไขล่าสุด',
    colAction: 'การจัดการ',
    openBtn: 'เปิดแผ่นงาน',
    deleteConfirm: 'คุณต้องการลบแผ่นงบประมาณนี้และรายการทั้งหมดใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
    deleteSuccess: 'ลบแผ่นงบประมาณสำเร็จ',
    modalCreateTitle: 'สร้างแผ่นงบประมาณใหม่',
    modalMonth: 'เลือกเดือน',
    modalYear: 'เลือกปี (พ.ศ.)',
    cancel: 'ยกเลิก',
    submit: 'สร้างแผ่นงาน',
    noData: 'ไม่พบข้อมูลแผ่นงบประมาณที่ค้นหา'
  },
  EN: {
    title: 'Budget Sheets',
    subtitle: 'Manage your monthly budgets and expense sheets. Click a row to open.',
    createSheet: 'Create New Sheet',
    filtersLabel: 'Filters',
    filterByMonthYear: 'Filter by Month/Year',
    colPeriod: 'Period',
    colSheetName: 'Sheet Name',
    colStatus: 'Status',
    colCreator: 'Created By',
    colUpdated: 'Last Modified',
    colAction: 'Actions',
    openBtn: 'Open Sheet',
    deleteConfirm: 'Are you sure you want to delete this budget sheet and all its entries? This action cannot be undone.',
    deleteSuccess: 'Budget sheet deleted successfully',
    modalCreateTitle: 'Create New Budget Sheet',
    modalMonth: 'Select Month',
    modalYear: 'Select Year',
    cancel: 'Cancel',
    submit: 'Create Sheet',
    noData: 'No matching budget sheets found'
  }
};

const YEARS = [
  { value: 2024, labelTH: '2567', labelEN: '2024' },
  { value: 2025, labelTH: '2568', labelEN: '2025' },
  { value: 2026, labelTH: '2569', labelEN: '2026' },
  { value: 2027, labelTH: '2570', labelEN: '2027' },
  { value: 2028, labelTH: '2571', labelEN: '2028' },
  { value: 2029, labelTH: '2572', labelEN: '2029' },
  { value: 2030, labelTH: '2573', labelEN: '2030' }
];

export default function BudgetSheetsList({ user, lang, onOpenSheet }) {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(null); // number 1-12 or null
  const [filterYear, setFilterYear] = useState(null); // number or null
  
  // Selection
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  const [createMonth, setCreateMonth] = useState(6);
  const [createYear, setCreateYear] = useState(2026);

  const t = dict[lang];

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await api.get('/periods');
      setPeriods(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const handleCreateSheetSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/periods', { month: createMonth, year: createYear });
      setShowCreateModal(false);
      onOpenSheet(createMonth, createYear);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการสร้างแผ่นงาน');
    }
  };

  const handleDeletePeriod = async (id) => {
    if (user.role !== 'admin') {
      alert(lang === 'TH' ? 'สิทธิ์ไม่เพียงพอ เฉพาะ Admin เท่านั้น' : 'Access denied: Admin only');
      return;
    }
    try {
      await api.delete(`/periods/${id}`);
      setPeriods(prev => prev.filter(p => p.id !== id));
      alert(t.deleteSuccess);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'ไม่สามารถลบได้');
    }
  };

  const getPeriodTitle = (p) => {
    const mName = MONTH_NAMES[lang][p.month - 1];
    const yLabel = lang === 'TH' ? p.year + 543 : p.year;
    return `${mName} ${yLabel}`;
  };

  const getSheetName = (p) => {
    const mName = MONTH_NAMES.EN[p.month - 1];
    return `${mName} ${p.year} Operations`;
  };

  const handleToggleSelectAll = () => {
    if (selectedPeriods.length === filteredPeriods.length) {
      setSelectedPeriods([]);
    } else {
      setSelectedPeriods(filteredPeriods.map(p => p.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedPeriods(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filter logic
  const filteredPeriods = periods.filter(p => {
    if (filterMonth && p.month !== filterMonth) return false;
    if (filterYear && p.year !== filterYear) return false;
    return true;
  });

  // Export a single sheet to PDF or Excel.
  const handleExport = async (e, p, type) => {
    e.stopPropagation();
    try {
      await api.get('/auth/me'); // refresh token if needed
      const token = localStorage.getItem('accessToken');
      window.open(`/api/export/${type}?month=${p.month}&year=${p.year}&Authorization=Bearer ${token}`);
    } catch (err) {
      console.error('Export failed:', err);
      alert(lang === 'TH' ? 'ไม่สามารถส่งออกไฟล์ได้' : 'Could not export file');
    }
  };

  const formatModified = (p) => {
    const ts = p.last_modified || p.created_at;
    return ts ? new Date(ts).toLocaleString(lang === 'TH' ? 'th-TH' : 'en-GB') : '-';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t.subtitle}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="glass-btn-primary py-2.5 self-start md:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>{t.createSheet}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-bold">{t.filtersLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-400">{t.filterByMonthYear}:</span>
          <MonthYearPicker
            month={filterMonth}
            year={filterYear}
            onChange={(m, y) => { setFilterMonth(m); setFilterYear(y); }}
            lang={lang}
            allowClear
            placeholder={lang === 'TH' ? 'ทุกเดือน/ปี' : 'All months/years'}
            widthClass="w-56"
          />
        </div>
      </div>

      {/* Sheets List Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mx-auto mb-3" />
            <span>กำลังโหลดรายการงบประมาณ...</span>
          </div>
        ) : filteredPeriods.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-semibold">
            {t.noData}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold tracking-wider">
                  <th className="w-12 px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={filteredPeriods.length > 0 && selectedPeriods.length === filteredPeriods.length}
                      onChange={handleToggleSelectAll}
                      className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-slate-350 rounded cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4">{t.colPeriod}</th>
                  <th className="px-6 py-4">{t.colSheetName}</th>
                  <th className="px-6 py-4">{t.colStatus}</th>
                  <th className="px-6 py-4">{t.colCreator}</th>
                  <th className="px-6 py-4">{t.colUpdated}</th>
                  <th className="px-6 py-4 text-center">{t.colAction}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeriods.map((p, index) => {
                  const isChecked = selectedPeriods.includes(p.id);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/40 text-slate-700 text-xs">
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(p.id)}
                          className="h-4 w-4 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-slate-300 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {getPeriodTitle(p)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">
                        {getSheetName(p)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-md tracking-wider ${
                          p.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {p.status === 'open' ? 'DRAFT' : 'FINALIZED'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold">{p.creator_username || 'admin'}</td>
                      <td className="px-6 py-4 text-slate-400">
                        {formatModified(p)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onOpenSheet(p.month, p.year)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl cursor-pointer transition select-none flex items-center gap-1.5"
                          >
                            <FolderOpen className="h-4.5 w-4.5" />
                            <span>{t.openBtn}</span>
                          </button>

                          {/* Export to PDF */}
                          <button
                            onClick={(e) => handleExport(e, p, 'pdf')}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl cursor-pointer transition"
                            title={lang === 'TH' ? 'ส่งออก PDF' : 'Export PDF'}
                          >
                            <FileText className="h-4.5 w-4.5" />
                          </button>

                          {/* Export to Excel */}
                          <button
                            onClick={(e) => handleExport(e, p, 'xlsx')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-xl cursor-pointer transition"
                            title={lang === 'TH' ? 'ส่งออก Excel' : 'Export Excel'}
                          >
                            <FileSpreadsheet className="h-4.5 w-4.5" />
                          </button>

                          {user.role === 'admin' && (
                            <button
                              onClick={() => setPeriodToDelete(p.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl cursor-pointer transition"
                              title="Delete sheet"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create New Budget Sheet */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {t.modalCreateTitle}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSheetSubmit} className="space-y-4">
              {/* Month / Year via calendar picker */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {lang === 'TH' ? 'เลือกเดือน/ปี' : 'Select Month / Year'}
                </label>
                <MonthYearPicker
                  month={createMonth}
                  year={createYear}
                  onChange={(m, y) => { setCreateMonth(m); setCreateYear(y); }}
                  lang={lang}
                  widthClass="w-full"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="glass-btn-secondary text-sm font-bold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="glass-btn-primary text-sm font-bold"
                >
                  {t.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {periodToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-md shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {lang === 'TH' ? 'ยืนยันการลบแผ่นงบประมาณ' : 'Confirm Deletion'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed px-4">
                {t.deleteConfirm}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPeriodToDelete(null)}
                className="glass-btn-secondary py-2 px-5 text-xs font-bold w-full"
              >
                {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const id = periodToDelete;
                  setPeriodToDelete(null);
                  await handleDeletePeriod(id);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition w-full"
              >
                {lang === 'TH' ? 'ยืนยันการลบ' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
