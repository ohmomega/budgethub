import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  FileDown, 
  Plus, 
  TrendingDown, 
  Coins, 
  ChevronRight,
  Loader2,
  Calendar,
  X
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
    title: 'แผงควบคุม',
    greeting: (name) => `ยินดีต้อนรับกลับมา, ${name}. นี่คือสถานะงบประมาณของคุณโดยสรุป`,
    currentPeriod: 'งบประมาณปัจจุบัน:',
    downloadReport: 'ดาวน์โหลดรายงาน',
    createSheet: 'สร้างแผ่นใหม่',
    statBudgetCut: 'งบดำเนินงานที่ตัด',
    statTotal: 'ยอดรวมสุทธิ',
    monthlyComparison: 'การเปรียบเทียบรายเดือน',
    trendTitle: 'แนวโน้มย้อนหลัง',
    ccBreakdown: 'สัดส่วนตามศูนย์ต้นทุน',
    editSheetLink: 'แก้ไขแผ่นงบประมาณปัจจุบัน >',
    recentSheets: 'แผ่นงบประมาณล่าสุด',
    viewAllSheets: 'ดูแผ่นงานทั้งหมด >',
    colName: 'ชื่อแผนงาน',
    colStatus: 'สถานะ',
    colCreator: 'สร้างโดย',
    colUpdated: 'แก้ไขล่าสุด',
    colAction: 'จัดการ',
    openBtn: 'เปิด',
    modalCreateTitle: 'สร้างแผ่นงบประมาณใหม่',
    modalMonth: 'เลือกเดือน',
    modalYear: 'เลือกปี (พ.ศ.)',
    cancel: 'ยกเลิก',
    submit: 'สร้างแผ่นงาน',
    deptFilterLabel: 'แผนกที่กรอง:',
    allDepts: 'ทุกแผนก (รวม)'
  },
  EN: {
    title: 'Dashboard',
    greeting: (name) => `Welcome back, ${name}. Here is your budget summary.`,
    currentPeriod: 'Active Budget Period:',
    downloadReport: 'Download Report',
    createSheet: 'Create New Sheet',
    statBudgetCut: 'Operating Budget Cuts',
    statTotal: 'Net Grand Total',
    monthlyComparison: 'Monthly Comparison',
    trendTitle: 'Historical Trend',
    ccBreakdown: 'Allocation by Cost Center',
    editSheetLink: 'Edit Active Budget Sheet >',
    recentSheets: 'Recent Budget Sheets',
    viewAllSheets: 'View All Sheets >',
    colName: 'Plan Name',
    colStatus: 'Status',
    colCreator: 'Created By',
    colUpdated: 'Last Modified',
    colAction: 'Actions',
    openBtn: 'Open',
    modalCreateTitle: 'Create New Budget Sheet',
    modalMonth: 'Select Month',
    modalYear: 'Select Year',
    cancel: 'Cancel',
    submit: 'Create Sheet',
    deptFilterLabel: 'Filter Department:',
    allDepts: 'All Departments (Consolidated)'
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

export default function Dashboard({ user, lang, onOpenSheet }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Create sheet state
  const [createMonth, setCreateMonth] = useState(6); // June
  const [createYear, setCreateYear] = useState(2026);

  const t = dict[lang];

  // Fetch dashboard stats
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const deptParam = selectedDeptId === 'all' ? '' : `&department_id=${selectedDeptId}`;
      const res = await api.get(`/dashboard?${deptParam}`);
      setData(res.data);
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments for filter
  useEffect(() => {
    const fetchDepts = async () => {
      if (user.role === 'admin' || user.role === 'viewer') {
        try {
          const res = await api.get('/departments');
          setDepartments(res.data);
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchDepts();
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDeptId]);

  const handleCreateSheet = async (e) => {
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

  const handleExport = async (type) => {
    if (!data?.period) return;
    try {
      // Ping the auth/me endpoint to auto-refresh the token if it has expired
      await api.get('/auth/me');
      const token = localStorage.getItem('accessToken');
      window.open(`/api/export/${type}?month=${data.period.month}&year=${data.period.year}&Authorization=Bearer ${token}`);
      setShowExportModal(false);
    } catch (err) {
      console.error('Refresh token failed before export:', err);
      alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
    }
  };

  const getPeriodLabel = (period) => {
    if (!period) return '';
    const mName = MONTH_NAMES[lang][period.month - 1];
    const yLabel = lang === 'TH' ? period.year + 543 : period.year;
    return lang === 'TH' ? `${mName} ${yLabel}` : `${mName} ${yLabel}`;
  };

  if (loading && !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const { period, stats, costCenterBreakdown, monthlyTrend, latestSheets } = data || {
    period: null,
    stats: { totalAmount: 0, budgetCutAmount: 0, budgetCutTotalAmount: 0 },
    costCenterBreakdown: [],
    monthlyTrend: [],
    latestSheets: []
  };

  // Chart max value calculate
  const maxTrendAmount = monthlyTrend.length > 0 ? Math.max(...monthlyTrend.map(m => m.amount), 1000) : 1000;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. Header welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t.greeting(user.full_name)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="glass-btn-secondary py-2.5"
            disabled={!period}
          >
            <FileDown className="h-4.5 w-4.5" />
            <span>{t.downloadReport}</span>
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="glass-btn-primary py-2.5"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>{t.createSheet}</span>
          </button>
        </div>
      </div>

      {/* Department Filter (Admin & Viewer only) */}
      {(user.role === 'admin' || user.role === 'viewer') && (
        <div className="flex items-center gap-3 bg-white p-3.5 border border-slate-200 rounded-2xl w-fit">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            {t.deptFilterLabel}
          </span>
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="all">{t.allDepts}</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.dept_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* 2. Current period badge & metrics */}
      {period ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {t.currentPeriod}
            </span>
            <span className="text-sm font-bold text-slate-800 uppercase bg-slate-200/50 px-3 py-1 rounded-xl">
              {period.month < 10 ? `0${period.month}` : period.month}/{period.year} - {getPeriodLabel(period)}
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-black rounded-md tracking-wider ${
              period.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {period.status === 'open' ? 'DRAFT' : 'FINALIZED'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Stat Box 1: Operating Budget Cuts */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {t.statBudgetCut}
                </span>
                <span className="text-3xl font-black text-slate-900 mt-2 block tracking-tight">
                  ฿{stats.budgetCutTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-14 w-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                <TrendingDown className="h-7 w-7" />
              </div>
            </div>

            {/* Stat Box 2: Net Grand Total */}
            <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {t.statTotal}
                </span>
                <span className="text-3xl font-black text-slate-900 mt-2 block tracking-tight">
                  ฿{stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="h-14 w-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
                <Coins className="h-7 w-7" />
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500">
          ไม่พบข้อมูลแผ่นงบประมาณในขณะนี้ กรุณากดปุ่มเพื่อเริ่มสร้างแผ่นงานงบประมาณใหม่
        </div>
      )}

      {/* 3. Graphs Section */}
      {period && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Trend Chart (Col span 2) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">{t.monthlyComparison}</h3>
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">
                {t.trendTitle}
              </span>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="h-60 w-full relative flex items-end justify-around border-b border-slate-100 pb-2">
              {monthlyTrend.length > 0 ? (
                monthlyTrend.map((m, idx) => {
                  const percentage = (m.amount / maxTrendAmount) * 80; // capped at 80% height
                  const label = `${m.year}-${m.month < 10 ? '0' + m.month : m.month}`;
                  
                  return (
                    <div key={idx} className="h-full flex flex-col justify-end items-center group w-1/6 relative">
                      {/* Tooltip on Hover */}
                      <div className="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition duration-150 shadow pointer-events-none whitespace-nowrap">
                        ฿{m.amount.toLocaleString()}
                      </div>
                      
                      {/* Bar Graphic */}
                      <div 
                        style={{ height: `${Math.max(percentage, 5)}%` }}
                        className="w-12 bg-gradient-to-t from-rose-400 to-pink-500 rounded-t-lg shadow-sm transition-all duration-300 group-hover:from-rose-500 group-hover:to-pink-600"
                      />
                      
                      {/* X-axis Label */}
                      <span className="text-[10px] font-bold text-slate-400 mt-2 block">
                        {label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-400 text-xs py-20 text-center w-full">ไม่มีข้อมูลแนวโน้มงบประมาณ</div>
              )}
            </div>

            {/* Chart Legend */}
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 bg-pink-500 rounded-full inline-block" />
              <span className="text-xs font-semibold text-slate-600">{t.statBudgetCut}</span>
            </div>

          </div>

          {/* Allocation progress bars (Col span 1) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">{t.ccBreakdown}</h3>
            </div>

            {/* Breakdown List */}
            <div className="space-y-4 my-6 overflow-y-auto max-h-56 pr-1">
              {costCenterBreakdown.length > 0 ? (
                costCenterBreakdown.map((cc, idx) => {
                  const maxAmt = Math.max(...costCenterBreakdown.map(c => c.total_amount), 1);
                  const percentage = (cc.total_amount / maxAmt) * 100;
                  
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span className="truncate max-w-[150px]">{cc.cc_code} - {cc.cc_name}</span>
                        <span>฿{cc.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          style={{ width: `${percentage}%` }}
                          className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-400 text-xs py-12 text-center">ไม่มีข้อมูลศูนย์ต้นทุนที่ตัดงบ</div>
              )}
            </div>

            {/* Edit active budget sheet link */}
            <button
              onClick={() => onOpenSheet(period.month, period.year)}
              className="text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1 cursor-pointer transition select-none"
            >
              <span>{t.editSheetLink}</span>
            </button>
          </div>

        </div>
      )}

      {/* 4. Latest budget sheets list */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800 text-base">{t.recentSheets}</h3>
          
          <button
            onClick={() => onOpenSheet('list', 'list')} // triggers tab redirect in parent grid
            className="text-xs font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center gap-1 cursor-pointer transition select-none"
          >
            <span>{t.viewAllSheets}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold tracking-wider">
                <th className="px-6 py-4">{t.colName}</th>
                <th className="px-6 py-4">{t.colStatus}</th>
                <th className="px-6 py-4">{t.colCreator}</th>
                <th className="px-6 py-4">{t.colUpdated}</th>
                <th className="px-6 py-4 text-center">{t.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {latestSheets.map((sheet, index) => {
                const label = getPeriodLabel(sheet);
                return (
                  <tr key={sheet.id} className="border-b border-slate-100 hover:bg-slate-50/40 text-slate-700 text-xs">
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {label}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-md tracking-wider ${
                        sheet.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {sheet.status === 'open' ? 'DRAFT' : 'FINALIZED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold">{sheet.creator_name || sheet.creator_username}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(sheet.created_at).toLocaleString('th-TH')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onOpenSheet(sheet.month, sheet.year)}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-[var(--color-primary-bg-light)] hover:text-[var(--color-primary)] border border-slate-200 hover:border-[var(--color-primary-light)] font-bold text-slate-700 text-xs rounded-xl cursor-pointer transition select-none flex items-center gap-1 mx-auto"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{t.openBtn}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal: Create New Budget Sheet */}
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

            <form onSubmit={handleCreateSheet} className="space-y-4">
              {/* Month */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.modalMonth}
                </label>
                <select
                  value={createMonth}
                  onChange={(e) => setCreateMonth(parseInt(e.target.value))}
                  className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  {MONTH_NAMES[lang].map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.modalYear}
                </label>
                <select
                  value={createYear}
                  onChange={(e) => setCreateYear(parseInt(e.target.value))}
                  className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  {YEARS.map(y => (
                    <option key={y.value} value={y.value}>
                      {lang === 'TH' ? y.labelTH : y.labelEN}
                    </option>
                  ))}
                </select>
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

      {/* 6. Modal: Export Select Format */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-extrabold text-slate-900 text-base">
                {t.downloadReport}
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleExport('xlsx')}
                className="p-4 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition"
              >
                <span className="font-black text-lg text-emerald-600">XLSX</span>
                <span className="text-xs font-bold text-slate-500">Excel Spreadsheet</span>
              </button>
              
              <button
                onClick={() => handleExport('pdf')}
                className="p-4 border border-slate-200 hover:border-rose-500 hover:bg-rose-50/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition"
              >
                <span className="font-black text-lg text-rose-600">PDF</span>
                <span className="text-xs font-bold text-slate-500">PDF Report Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
