import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import { 
  ArrowLeft,
  Plus, 
  Trash2, 
  ArrowDown, 
  ArrowUp, 
  ArrowDownToLine, 
  Check, 
  AlertCircle, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  ChevronDown, 
  Loader2,
  Lock,
  Edit2,
  X
} from 'lucide-react';

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const EN_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const dict = {
  TH: {
    backBtn: 'กลับ',
    saved: 'บันทึกแล้ว',
    saving: 'กำลังบันทึก...',
    saveError: 'มีข้อผิดพลาด',
    exportPdf: 'ส่งออก PDF',
    exportExcel: 'ส่งออก Excel',
    finalize: 'ยืนยันแผ่นงาน',
    finalized: 'ยืนยันแล้ว',
    summaryTitle: 'สรุปตามศูนย์ต้นทุน',
    beforeTax: 'ก่อนภาษี:',
    tax: 'ภาษี (7%):',
    total: 'ยอดรวมสุทธิ:',
    deduct: 'ยอดรวมตัดงบทำการ:',
    colNo: 'ลำดับ',
    colAccount: 'รหัสบัญชี',
    colCostCenter: 'รหัสศูนย์ต้นทุน',
    colItem: 'รายการ',
    colAmount: 'จำนวนเงิน',
    colTax: 'ภาษี (7%)',
    colTotal: 'ราคารวม',
    colReason: 'เหตุผล',
    colDeduct: 'ตัดงบทำการ',
    colType: 'ประเภท',
    colAction: 'การจัดการ',
    addBtn: 'เพิ่มแถว',
    totalLabel: 'ยอดรวมทั้งหมด:',
    deductLabel: 'ยอดรวมตัดงบทำการ:',
    placeholderCC: 'เลือกศูนย์ต้นทุน...',
    confirmDelete: 'คุณต้องการลบรายการนี้ใช่หรือไม่?',
    confirmFinalize: 'คุณต้องการยืนยันแผ่นงบประมาณนี้ใช่หรือไม่? การยืนยันจะปิดงวดและล็อคแผ่นงานไม่ให้แก้ไขเพิ่มเติม',
    placeholderReason: 'เหตุผล (ถ้ามี)'
  },
  EN: {
    backBtn: 'Back',
    saved: 'Saved',
    saving: 'Saving...',
    saveError: 'Error saving',
    exportPdf: 'Export PDF',
    exportExcel: 'Export Excel',
    finalize: 'Finalize Sheet',
    finalized: 'Finalized',
    summaryTitle: 'Summary by Cost Center',
    beforeTax: 'Pre-Tax:',
    tax: 'VAT (7%):',
    total: 'Net Total:',
    deduct: 'Deducted Total:',
    colNo: 'No',
    colAccount: 'Account',
    colCostCenter: 'Cost Center',
    colItem: 'Item Details',
    colAmount: 'Amount',
    colTax: 'Tax (7%)',
    colTotal: 'Total Price',
    colReason: 'Reason',
    colDeduct: 'Deduct Budget',
    colType: 'Type',
    colAction: 'Actions',
    addBtn: 'Add Row',
    totalLabel: 'Grand Total:',
    deductLabel: 'Deducted Budget Total:',
    placeholderCC: 'Select cost center...',
    confirmDelete: 'Are you sure you want to delete this row?',
    confirmFinalize: 'Are you sure you want to finalize this budget sheet? This will lock it for further edits.',
    placeholderReason: 'Reason (if any)'
  }
};

export default function BudgetGrid({ user, lang, periodInfo, onBack }) {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [costCenters, setCostCenters] = useState([]);
  const [entries, setEntries] = useState([]);
  const [period, setPeriod] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [errorMsg, setErrorMsg] = useState('');

  // Dropdown state for searchable select
  const [activeDropdownRow, setActiveDropdownRow] = useState(null);

  const [rowToDelete, setRowToDelete] = useState(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // Drag and drop states
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const t = dict[lang];

  // Load departments
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data);
        
        // Auto-select department
        if (user.role === 'editor' && user.department_id) {
          setSelectedDeptId(user.department_id);
        } else if (res.data.length > 0) {
          setSelectedDeptId(res.data[0].id);
        }
      } catch (err) {
        console.error('Fetch departments failed:', err);
        setErrorMsg('ไม่สามารถโหลดข้อมูลแผนกได้');
      }
    };
    fetchDepts();
  }, [user]);

  // Load cost centers for selected department
  useEffect(() => {
    if (!selectedDeptId) return;

    const fetchCostCenters = async () => {
      try {
        const res = await api.get(`/cost-centers?department_id=${selectedDeptId}`);
        setCostCenters(res.data);
      } catch (err) {
        console.error('Fetch cost centers failed:', err);
      }
    };
    fetchCostCenters();
  }, [selectedDeptId]);

  // Fetch entries
  const fetchEntries = async () => {
    if (!selectedDeptId || !periodInfo) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/expenses?month=${periodInfo.month}&year=${periodInfo.year}&department_id=${selectedDeptId}`);
      setEntries(res.data.entries);
      setPeriod(res.data.period);
    } catch (err) {
      console.error('Fetch entries failed:', err);
      setErrorMsg('ไม่สามารถโหลดรายการได้ หรือไม่มีข้อมูลในระบบ');
      setEntries([]);
      setPeriod(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedDeptId, periodInfo]);

  // Handle cell edit save (blur)
  const handleCellBlur = async (entry, field, value) => {
    // If value has not changed, do nothing
    if (entry[field] === value) return;

    const isReadOnly = user.role === 'viewer' || (period && period.status === 'closed');
    if (isReadOnly) return;

    setSaveStatus('saving');
    try {
      const payload = { [field]: value };
      
      // Send PATCH to update
      const res = await api.patch(`/expenses/${entry.id}`, payload);
      
      // Update local state with recalculated database values
      setEntries(prev => prev.map(e => e.id === entry.id ? res.data : e));
      setSaveStatus('saved');
    } catch (err) {
      console.error('Update entry failed:', err);
      setSaveStatus('error');
      setErrorMsg('ไม่สามารถบันทึกข้อมูลอัตโนมัติได้');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Add row
  const handleAddRow = async () => {
    if (!selectedDeptId) return;
    setSaveStatus('saving');
    try {
      const res = await api.post('/expenses', {
        month: periodInfo.month,
        year: periodInfo.year,
        department_id: selectedDeptId,
        cost_center_id: costCenters.length > 0 ? costCenters[0].id : null,
        account_code: '',
        item_name: 'รายการใหม่',
        amount: 0,
        reason_note: '',
        is_budget_cut: false,
        entry_type: 'รายจ่าย'
      });

      setEntries(prev => [...prev, res.data]);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Create row failed:', err);
      setSaveStatus('error');
      setErrorMsg('ไม่สามารถสร้างรายการใหม่ได้');
    }
  };

  // Insert row inline
  const handleInsertRow = async (afterEntryId) => {
    if (!selectedDeptId) return;
    setSaveStatus('saving');
    try {
      const res = await api.post('/expenses', {
        month: periodInfo.month,
        year: periodInfo.year,
        department_id: selectedDeptId,
        cost_center_id: costCenters.length > 0 ? costCenters[0].id : null,
        account_code: '',
        item_name: 'รายการใหม่ (แทรก)',
        amount: 0,
        reason_note: '',
        is_budget_cut: false,
        entry_type: 'รายจ่าย',
        insert_after_id: afterEntryId
      });

      const index = entries.findIndex(e => e.id === afterEntryId);
      const newEntries = [...entries];
      newEntries.splice(index + 1, 0, res.data);
      setEntries(newEntries);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Insert row failed:', err);
      setSaveStatus('error');
      setErrorMsg('ไม่สามารถแทรกรายการใหม่ได้');
    }
  };

  // Delete row
  const handleDeleteRow = async (id) => {
    setSaveStatus('saving');
    try {
      await api.delete(`/expenses/${id}`);
      setEntries(prev => prev.filter(e => e.id !== id));
      setSaveStatus('saved');
    } catch (err) {
      console.error('Delete row failed:', err);
      setSaveStatus('error');
      setErrorMsg('ไม่สามารถลบรายการได้');
    }
  };

  // Move row up or down by adjusting sort_order
  const handleMoveRow = async (index, direction) => {
    const isReadOnly = user.role === 'viewer' || (period && period.status === 'closed');
    if (isReadOnly) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= entries.length) return;

    const rowToMove = entries[index];
    let newSortOrder;

    if (direction === -1) {
      // Moving up. Target position is targetIndex.
      const prevRowOfTarget = entries[targetIndex - 1];
      const targetRow = entries[targetIndex];
      
      if (prevRowOfTarget) {
        newSortOrder = (prevRowOfTarget.sort_order + targetRow.sort_order) / 2;
      } else {
        newSortOrder = targetRow.sort_order - 10.0;
      }
    } else {
      // Moving down. Target position is targetIndex.
      const targetRow = entries[targetIndex];
      const nextRowOfTarget = entries[targetIndex + 1];
      
      if (nextRowOfTarget) {
        newSortOrder = (targetRow.sort_order + nextRowOfTarget.sort_order) / 2;
      } else {
        newSortOrder = targetRow.sort_order + 10.0;
      }
    }

    setSaveStatus('saving');
    try {
      const res = await api.patch(`/expenses/${rowToMove.id}`, { sort_order: newSortOrder });
      
      // Update entry and re-sort locally
      const updatedEntries = entries.map(e => e.id === rowToMove.id ? res.data : e);
      updatedEntries.sort((a, b) => a.sort_order - b.sort_order);
      setEntries(updatedEntries);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Move row failed:', err);
      setSaveStatus('error');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    if (isReadOnly) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    if (isReadOnly) return;
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e, index) => {
    if (isReadOnly) return;
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      await handleDragReorder(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragReorder = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    const rowToMove = entries[fromIndex];
    const targetRow = entries[toIndex];
    let newSortOrder;
    
    if (fromIndex < toIndex) {
      // Moving down: place AFTER the target row
      const nextRow = entries[toIndex + 1];
      if (nextRow) {
        newSortOrder = (targetRow.sort_order + nextRow.sort_order) / 2;
      } else {
        newSortOrder = targetRow.sort_order + 10.0;
      }
    } else {
      // Moving up: place BEFORE the target row
      const prevRow = entries[toIndex - 1];
      if (prevRow) {
        newSortOrder = (prevRow.sort_order + targetRow.sort_order) / 2;
      } else {
        newSortOrder = targetRow.sort_order - 10.0;
      }
    }

    setSaveStatus('saving');
    try {
      const res = await api.patch(`/expenses/${rowToMove.id}`, { sort_order: newSortOrder });
      
      // Update entry and re-sort locally
      const updatedEntries = entries.map(e => e.id === rowToMove.id ? res.data : e);
      updatedEntries.sort((a, b) => a.sort_order - b.sort_order);
      setEntries(updatedEntries);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Drag reorder failed:', err);
      setSaveStatus('error');
    }
  };

  // Finalize Sheet
  const handleFinalize = async () => {
    if (user.role !== 'admin') return;
    setShowFinalizeConfirm(true);
  };

  const handleExport = async (type) => {
    try {
      // Ping the auth/me endpoint to auto-refresh the token if it has expired
      await api.get('/auth/me');
      const token = localStorage.getItem('accessToken');
      window.open(`/api/export/${type}?month=${periodInfo.month}&year=${periodInfo.year}&Authorization=Bearer ${token}`);
    } catch (err) {
      console.error('Refresh token failed before export:', err);
      alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
    }
  };



  // Calculate totals (simple additions)
  const subtotalAmount = entries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const subtotalTax = entries.reduce((sum, e) => sum + parseFloat(e.tax_amount || 0), 0);
  const subtotalTotal = entries.reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);

  // Checked items (is_budget_cut is true)
  const subtotalDeductAmount = entries.filter(e => e.is_budget_cut).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const subtotalDeductTax = entries.filter(e => e.is_budget_cut).reduce((sum, e) => sum + parseFloat(e.tax_amount || 0), 0);
  const subtotalDeductTotal = entries.filter(e => e.is_budget_cut).reduce((sum, e) => sum + parseFloat(e.total_amount || 0), 0);

  // Group by Cost Center for top cards
  const ccGroups = entries.reduce((acc, e) => {
    const ccId = e.cost_center_id || 'none';
    const ccCode = e.cc_code || '-';
    const ccName = e.cc_name || 'ทั่วไป';
    
    if (!acc[ccId]) {
      acc[ccId] = {
        id: ccId,
        code: ccCode,
        name: ccName,
        amount: 0,
        tax: 0,
        total: 0,
        deduct: 0
      };
    }
    
    acc[ccId].amount += parseFloat(e.amount || 0);
    acc[ccId].tax += parseFloat(e.tax_amount || 0);
    acc[ccId].total += parseFloat(e.total_amount || 0);
    if (e.is_budget_cut) {
      acc[ccId].deduct += parseFloat(e.total_amount || 0);
    }
    
    return acc;
  }, {});

  const ccCardsList = Object.values(ccGroups);

  const isReadOnly = user.role === 'viewer' || (period && period.status === 'closed');
  const monthName = lang === 'TH' ? THAI_MONTH_NAMES[periodInfo.month - 1] : EN_MONTH_NAMES[periodInfo.month - 1];
  const yearName = lang === 'TH' ? periodInfo.year + 543 : periodInfo.year;

  // Inline cost center addition helper
  const handleCreateCostCenter = async (ccCode, rowEntry) => {
    if (!ccCode) return;
    try {
      const res = await api.post('/cost-centers', {
        cc_code: ccCode,
        cc_name: `ศูนย์ต้นทุน ${ccCode}`
      });
      setCostCenters(prev => [...prev, res.data]);
      await handleCellBlur(rowEntry, 'cost_center_id', res.data.id);
      setActiveDropdownRow(null);
    } catch (err) {
      console.error('Create CC failed:', err);
      alert(err.response?.data?.error || 'ไม่สามารถเพิ่มศูนย์ต้นทุนใหม่ได้');
    }
  };

  // Filter entries based on search term (case-insensitive search by item_name, account_code, cc_code, cc_name, or reason_note)
  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    return (
      (entry.item_name || '').toLowerCase().includes(term) ||
      (entry.account_code || '').toLowerCase().includes(term) ||
      (entry.cc_code || '').toLowerCase().includes(term) ||
      (entry.cc_name || '').toLowerCase().includes(term) ||
      (entry.reason_note || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 border border-slate-200 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button
            onClick={onBack}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition select-none flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            <span>{t.backBtn}</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{monthName} {yearName} Operations</span>
                <Edit2 className="h-4 w-4 text-slate-350" />
              </h2>
              {period && (
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-md tracking-wider ${
                  period.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {period.status === 'open' ? 'DRAFT' : 'FINALIZED'}
                </span>
              )}

              {/* Status Indicator */}
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 pl-2">
                {saveStatus === 'saving' && (
                  <span className="text-purple-600 font-bold flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t.saving}
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    {t.saved}
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {t.saveError}
                  </span>
                )}
              </div>
            </div>

            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
              แก้ไขล่าสุด: {period ? new Date(period.created_at).toLocaleString('th-TH') : '-'}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          {/* Department switcher (Admin / Viewer only) */}
          {(user.role === 'admin' || user.role === 'viewer') && (
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.dept_name}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl cursor-pointer transition select-none flex items-center gap-1.5"
          >
            <FileText className="h-4 w-4" />
            <span>{t.exportPdf}</span>
          </button>
          
          <button
            onClick={() => handleExport('xlsx')}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl cursor-pointer transition select-none flex items-center gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>{t.exportExcel}</span>
          </button>

          {user.role === 'admin' && period && period.status === 'open' && (
            <button
              onClick={handleFinalize}
              className="px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold rounded-xl cursor-pointer transition select-none flex items-center gap-1.5"
            >
              <Lock className="h-4 w-4" />
              <span>{t.finalize}</span>
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-4 flex items-center gap-2 shadow-sm font-medium">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. CC Allocation Cards Section ("สรุปตามศูนย์ต้นทุน") */}
      {ccCardsList.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest pl-1">
            {t.summaryTitle}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {ccCardsList.map(cc => (
              <div key={cc.id} className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-sm space-y-2.5">
                <span className="text-xs font-bold text-[var(--color-primary)] block truncate" title={`${cc.code} - ${cc.name}`}>
                  {cc.code} - {cc.name}
                </span>
                
                <div className="space-y-1 text-[11px] font-semibold text-slate-500">
                  <div className="flex justify-between">
                    <span>{t.beforeTax}</span>
                    <span className="text-slate-800">฿{cc.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t.tax}</span>
                    <span className="text-slate-800">฿{cc.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-slate-100 pt-1 mt-1 text-slate-800">
                    <span>{t.total}</span>
                    <span>฿{cc.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-[var(--color-primary)] font-extrabold">
                    <span>{t.deduct}</span>
                    <span>฿{cc.deduct.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. The Grid Spreadsheet container */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col">
        
        {/* Table header bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/10">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <span className="font-extrabold text-slate-800 text-sm shrink-0">
              {dict[lang].colItem} ({departments.find(d => d.id === selectedDeptId)?.dept_code || ''})
            </span>
            
            {/* Search Input field */}
            <div className="relative w-full sm:w-64 shrink-0">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={lang === 'TH' ? 'ค้นหา รหัส, ชื่อรายการ, ศูนย์ต้นทุน...' : 'Search code, item, CC...'}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] font-semibold text-slate-700 shadow-sm"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {searchTerm && (
              <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-bg-light)] border border-[var(--color-primary-light)] px-2.5 py-1 rounded-lg shrink-0 transition animate-fade-in">
                {lang === 'TH' 
                  ? `พบ ${filteredEntries.length} จาก ${entries.length} รายการ`
                  : `Found ${filteredEntries.length} of ${entries.length} entries`
                }
              </span>
            )}
          </div>
          
          {!isReadOnly && (
            <button
              onClick={handleAddRow}
              className="glass-btn-primary py-2 px-4 text-xs font-bold shrink-0 self-end sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>{t.addBtn}</span>
            </button>
          )}
        </div>

        {/* Table Element */}
        <div className="overflow-x-auto w-full min-h-[320px]">
          <table className="w-full min-w-[1300px] table-fixed border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200">
                <th className="grid-header w-[3%]">{t.colNo}</th>
                <th className="grid-header w-[12%]">{t.colAccount}</th>
                <th className="grid-header w-[12%]">{t.colCostCenter}</th>
                <th className="grid-header w-[20%]">{t.colItem}</th>
                <th className="grid-header w-[9%]">{t.colAmount}</th>
                <th className="grid-header w-[7%]">{t.colTax}</th>
                <th className="grid-header w-[9%]">{t.colTotal}</th>
                <th className="grid-header w-[13%]">{t.colReason}</th>
                <th className="grid-header w-[7%]">{t.colDeduct}</th>
                <th className="grid-header w-[8%]">{t.colType}</th>
                {!isReadOnly && <th className="grid-header w-[10%]">{t.colAction}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 10 : 11} className="py-20 text-center text-slate-400 text-xs font-semibold">
                    {searchTerm ? (lang === 'TH' ? 'ไม่พบรายการที่ตรงกับการค้นหา' : 'No matching entries found') : (lang === 'TH' ? 'ไม่มีรายการงบประมาณรายจ่ายในงวดนี้' : 'No budget entries in this period')}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => {
                  const originalIndex = entries.findIndex(e => e.id === entry.id);
                  return (
                    <tr 
                      key={entry.id} 
                      draggable={!isReadOnly && !searchTerm}
                      onDragStart={(e) => handleDragStart(e, originalIndex)}
                      onDragOver={(e) => handleDragOver(e, originalIndex)}
                      onDrop={(e) => handleDrop(e, originalIndex)}
                      onDragEnd={handleDragEnd}
                      className={`hover:bg-slate-50/50 border-b border-slate-100 transition-colors ${
                        entry.is_budget_cut ? 'bg-[var(--color-primary-bg-light)]/40 font-semibold' : ''
                      } ${activeDropdownRow === entry.id ? 'relative z-20' : ''} ${
                        draggedIndex === originalIndex ? 'opacity-40 bg-slate-100' : ''
                      } ${
                        dragOverIndex === originalIndex ? 'border-t-2 border-t-[var(--color-primary)]' : ''
                      }`}
                      style={{ cursor: isReadOnly || searchTerm ? 'default' : 'grab' }}
                    >
                      {/* 1. Drag icon & No. */}
                      <td className="grid-cell text-center text-slate-400 font-bold font-sans">
                        {originalIndex + 1}
                      </td>

                      {/* 2. Account Code */}
                      <td className="grid-cell">
                        <input
                          type="text"
                          defaultValue={entry.account_code || ''}
                          onBlur={(e) => handleCellBlur(entry, 'account_code', e.target.value)}
                          className="bg-transparent w-full text-slate-800 focus:outline-none focus:bg-slate-100 px-1 py-0.5 rounded border border-transparent focus:border-slate-300 text-xs font-semibold"
                          disabled={isReadOnly}
                        />
                      </td>

                      {/* 3. Cost Center Dropdown */}
                      <td className={`grid-cell overflow-visible relative ${activeDropdownRow === entry.id ? 'z-30' : ''}`}>
                        <CostCenterDropdown
                          entry={entry}
                          costCenters={costCenters}
                          activeDropdownRow={activeDropdownRow}
                          setActiveDropdownRow={setActiveDropdownRow}
                          onCCSelect={(val) => handleCellBlur(entry, 'cost_center_id', val)}
                          onCreateNewCC={(code) => handleCreateCostCenter(code, entry)}
                          isReadOnly={isReadOnly}
                          lang={lang}
                          isDropup={index >= 2 && index >= entries.length - 2}
                        />
                      </td>

                      {/* 4. Item details */}
                      <td className="grid-cell">
                        <input
                          type="text"
                          defaultValue={entry.item_name || ''}
                          onBlur={(e) => handleCellBlur(entry, 'item_name', e.target.value)}
                          className="bg-transparent w-full text-slate-800 focus:outline-none focus:bg-slate-100 px-1 py-0.5 rounded border border-transparent focus:border-slate-300 text-xs font-bold truncate"
                          disabled={isReadOnly}
                        />
                      </td>

                      {/* 5. Amount */}
                      <td className="grid-cell">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={entry.amount}
                          onFocus={(e) => e.target.select()}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || val < 0) {
                              e.target.value = entry.amount;
                              return;
                            }
                            e.target.value = val;
                            handleCellBlur(entry, 'amount', val);
                          }}
                          className="bg-transparent w-full text-right text-slate-800 focus:outline-none focus:bg-slate-100 px-1 py-0.5 rounded border border-transparent focus:border-slate-300 font-bold text-xs"
                          disabled={isReadOnly}
                        />
                      </td>

                      {/* 6. Tax (read-only) */}
                      <td className="grid-cell text-right text-slate-400 font-bold text-xs font-sans">
                        {parseFloat(entry.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 7. Total amount (read-only) */}
                      <td className="grid-cell text-right text-slate-800 font-black text-xs font-sans">
                        {parseFloat(entry.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 8. Reason */}
                      <td className="grid-cell">
                        <input
                          type="text"
                          defaultValue={entry.reason_note || ''}
                          onBlur={(e) => handleCellBlur(entry, 'reason_note', e.target.value)}
                          className="bg-transparent w-full text-slate-600 focus:outline-none focus:bg-slate-100 px-1 py-0.5 rounded border border-transparent focus:border-slate-300 text-xs placeholder-slate-400"
                          placeholder={t.placeholderReason}
                          disabled={isReadOnly}
                        />
                      </td>

                      {/* 9. Deduct budget (is_budget_cut check) */}
                      <td className="grid-cell text-center">
                        <input
                          type="checkbox"
                          checked={!!entry.is_budget_cut}
                          onChange={(e) => handleCellBlur(entry, 'is_budget_cut', e.target.checked)}
                          className="h-4.5 w-4.5 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-slate-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-default"
                          disabled={isReadOnly}
                        />
                      </td>

                      {/* 10. Type (entry_type dropdown select) */}
                      <td className="grid-cell overflow-visible relative">
                        <select
                          value={entry.entry_type || 'รายจ่าย'}
                          onChange={(e) => handleCellBlur(entry, 'entry_type', e.target.value)}
                          className="bg-transparent w-full text-xs font-bold text-slate-700 focus:outline-none cursor-pointer focus:bg-slate-100 p-1 border border-transparent rounded focus:border-slate-200"
                          disabled={isReadOnly}
                        >
                          <option value="รายจ่าย">{lang === 'TH' ? 'รายจ่าย' : 'Expense'}</option>
                        </select>
                      </td>

                      {/* 11. Actions */}
                      {!isReadOnly && (
                        <td className="grid-cell text-center whitespace-nowrap overflow-visible">
                          <div className="flex items-center justify-center gap-1">
                            {/* Insert row */}
                            <button
                              onClick={() => handleInsertRow(entry.id)}
                              className="text-[var(--color-primary)] p-1 hover:bg-slate-100 rounded-lg transition"
                              title="Insert row below"
                            >
                              <Plus className="h-4 w-4" />
                            </button>

                            {/* Move Up */}
                            <button
                              onClick={() => handleMoveRow(originalIndex, -1)}
                              disabled={originalIndex === 0 || !!searchTerm}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-1 hover:bg-slate-100 rounded-lg transition"
                              title="Move row up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>

                            {/* Move Down */}
                            <button
                              onClick={() => handleMoveRow(originalIndex, 1)}
                              disabled={originalIndex === entries.length - 1 || !!searchTerm}
                              className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-1 hover:bg-slate-100 rounded-lg transition"
                              title="Move row down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setRowToDelete(entry.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition"
                              title="Delete row"
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

        {/* 4. Subtotal Sums Footer */}
        <div className="bg-slate-50/50 p-6 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Grand Total box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                {t.totalLabel}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-4 mt-2">
                <span className="text-xl font-black text-slate-900">
                  ฿{subtotalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  (ก่อนภาษี: ฿{subtotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} • ภาษี: ฿{subtotalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                </span>
              </div>
            </div>

            {/* Deducted Total box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-extrabold text-[var(--color-primary)] uppercase tracking-widest">
                {t.deductLabel}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-4 mt-2">
                <span className="text-xl font-black text-[var(--color-primary)]">
                  ฿{subtotalDeductTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  (ก่อนภาษี: ฿{subtotalDeductAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} • ภาษี: ฿{subtotalDeductTax.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                </span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Custom Confirmation Modals */}
      {rowToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {lang === 'TH' ? 'ยืนยันการลบรายการ' : 'Confirm Deletion'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
                {t.confirmDelete}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setRowToDelete(null)}
                className="glass-btn-secondary py-2 px-5 text-xs font-bold w-full"
              >
                {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const id = rowToDelete;
                  setRowToDelete(null);
                  await handleDeleteRow(id);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition w-full"
              >
                {lang === 'TH' ? 'ยืนยันการลบ' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-md shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {lang === 'TH' ? 'ยืนยันการยืนยันแผ่นงาน' : 'Confirm Finalize'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed px-4">
                {t.confirmFinalize}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                className="glass-btn-secondary py-2 px-5 text-xs font-bold w-full"
              >
                {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  setShowFinalizeConfirm(false);
                  try {
                    await api.patch(`/periods/${period.id}`, { status: 'closed' });
                    setPeriod(prev => ({ ...prev, status: 'closed' }));
                  } catch (err) {
                    console.error(err);
                    alert('ไม่สามารถยืนยันแผ่นงานได้');
                  }
                }}
                className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs rounded-xl transition w-full"
              >
                {lang === 'TH' ? 'ยืนยัน' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Subcomponent for Searchable Cost Center Dropdown inside cell
function CostCenterDropdown({ 
  entry, 
  costCenters, 
  activeDropdownRow, 
  setActiveDropdownRow, 
  onCCSelect, 
  onCreateNewCC,
  isReadOnly,
  lang,
  isDropup
}) {
  const [search, setSearch] = useState('');
  const [pendingNewCC, setPendingNewCC] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, width: 0, direction: 'down' });
  
  const isOpen = activeDropdownRow === entry.id;

  // Combine loaded costCenters list with the entry's currently set cost center
  // if it is not in the list (e.g. if it is inactive or deleted).
  const dropdownOptions = [...costCenters];
  if (entry.cost_center_id && !dropdownOptions.some(cc => cc.id === entry.cost_center_id)) {
    dropdownOptions.push({
      id: entry.cost_center_id,
      cc_code: entry.cc_code || '',
      cc_name: entry.cc_name || '',
      is_active: false
    });
  }

  const filteredCC = dropdownOptions.filter(cc => {
    const matchesSearch = cc.cc_code.toLowerCase().includes(search.toLowerCase()) ||
      (cc.cc_name && cc.cc_name.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    return cc.is_active || cc.id === entry.cost_center_id;
  });

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // If space below is less than 200px and space above is greater, open upward
      const direction = (spaceBelow < 200 && spaceAbove > spaceBelow) ? 'up' : 'down';
      
      setCoords({
        top: rect.bottom + 4,
        bottom: (window.innerHeight - rect.top) + 4,
        left: rect.left,
        width: rect.width,
        direction
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(event.target);
      const clickedMenu = menuRef.current && menuRef.current.contains(event.target);
      const clickedConfirmModal = event.target.closest('.z-55');
      
      if (!clickedTrigger && !clickedMenu && !clickedConfirmModal) {
        setActiveDropdownRow(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setActiveDropdownRow]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = (event) => {
      if (event.type === 'scroll' && menuRef.current && menuRef.current.contains(event.target)) {
        return;
      }
      setActiveDropdownRow(null);
    };

    window.addEventListener('scroll', handleScrollOrResize, { capture: true });
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, setActiveDropdownRow]);

  const handleSelect = (ccId) => {
    onCCSelect(ccId);
    setActiveDropdownRow(null);
  };

  const handleNewCCSubmit = () => {
    if (!search.trim()) return;
    setPendingNewCC(search.trim());
  };

  return (
    <div ref={triggerRef} className="w-full relative">
      <button
        onClick={() => {
          if (isReadOnly) return;
          if (isOpen) {
            setActiveDropdownRow(null);
          } else {
            setActiveDropdownRow(entry.id);
          }
        }}
        type="button"
        disabled={isReadOnly}
        className="w-full text-left bg-transparent hover:bg-slate-100 px-2 py-2 leading-normal rounded border border-transparent focus:border-slate-200 flex items-start gap-2 group disabled:hover:bg-transparent cursor-pointer disabled:cursor-default break-words"
      >
        <span className="text-slate-800 font-bold text-xs flex-1 break-words">
          {entry.cc_code === '-' ? '-' : entry.cc_code || (lang === 'TH' ? 'เลือกศูนย์ต้นทุน...' : 'Select...')}
        </span>
        {!isReadOnly && <ChevronDown className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0 mt-0.5" />}
      </button>

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          style={{
            position: 'fixed',
            top: coords.direction === 'down' ? coords.top : undefined,
            bottom: coords.direction === 'up' ? coords.bottom : undefined,
            left: coords.left,
            width: coords.width,
            minWidth: '220px',
          }}
          className="bg-white border border-slate-200 shadow-2xl rounded-xl z-[9999] p-2 animate-scale-in"
        >
          {/* Search CC input */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-light)]"
              placeholder={lang === 'TH' ? 'ค้นหาหรือพิมพ์รหัสใหม่...' : 'Search or type code...'}
              autoFocus
            />
          </div>

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto space-y-0.5">
            {filteredCC.map(cc => (
              <button
                key={cc.id}
                onClick={() => handleSelect(cc.id)}
                type="button"
                className="w-full text-left px-3 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] rounded flex items-start gap-2 cursor-pointer font-semibold break-words leading-normal"
              >
                <span className="flex-1 break-words">{cc.cc_code} {cc.cc_name && `- ${cc.cc_name}`}</span>
                {entry.cost_center_id === cc.id && <Check className="h-3.5 w-3.5 text-[var(--color-primary)] shrink-0 mt-0.5" />}
              </button>
            ))}
            {filteredCC.length === 0 && (
              <div className="text-center py-3 text-xs text-slate-400">
                {lang === 'TH' ? 'ไม่พบรหัสศูนย์ต้นทุนนี้' : 'No cost centers found'}
              </div>
            )}
          </div>

          {/* Inline Create Trigger */}
          {search && !costCenters.some(cc => cc.cc_code === search.trim()) && (
            <button
              onClick={handleNewCCSubmit}
              type="button"
              className="w-full text-center mt-2 bg-[var(--color-primary-bg-light)] hover:bg-[var(--color-primary-light)] border border-[var(--color-primary-light)] text-[var(--color-primary)] font-bold rounded-lg py-1.5 text-xs flex items-center justify-center gap-1 cursor-pointer transition"
            >
              <Plus className="h-3 w-3" />
              <span>{lang === 'TH' ? `เพิ่ม "${search}" ใหม่ inline` : `Add new "${search}" inline`}</span>
            </button>
          )}
        </div>,
        document.body
      )}

      {/* Inline CC Confirm Modal */}
      {pendingNewCC && (
        <div className="fixed inset-0 z-55 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-[var(--color-primary)]">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {lang === 'TH' ? 'เพิ่มศูนย์ต้นทุนใหม่' : 'Create Cost Center'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed px-2">
                {lang === 'TH' 
                  ? `คุณต้องการเพิ่มศูนย์ต้นทุนใหม่ "${pendingNewCC}" หรือไม่?`
                  : `Do you want to create a new cost center "${pendingNewCC}"?`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPendingNewCC(null)}
                className="glass-btn-secondary py-2 px-5 text-xs font-bold w-full"
              >
                {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  const code = pendingNewCC;
                  setPendingNewCC(null);
                  onCreateNewCC(code);
                }}
                className="px-5 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-bold text-xs rounded-xl transition w-full"
              >
                {lang === 'TH' ? 'ยืนยัน' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
