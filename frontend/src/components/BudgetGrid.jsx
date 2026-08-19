import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api, { downloadBlob } from '../api';
import { showAlert } from '../showAlert';
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
  Unlock,
  Edit2,
  Edit3,
  X,
  Building2,
  Settings2,
  GripVertical,
  ArrowUpDown,
  History
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
    reopen: 'ยกเลิกการยืนยัน',
    addDept: 'เพิ่มแผนก',
    manageDept: 'จัดการแผนก (แก้ไข/ลบ)',
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
    placeholderReason: 'เหตุผล (ถ้ามี)',
    reorderBtn: 'แก้ไขลำดับ',
    reorderDone: 'เสร็จสิ้น',
    reorderTitle: 'โหมดแก้ไขลำดับแถว',
    reorderHint: 'ลากแถวขึ้น-ลง หรือกดลูกศร ▲ ▼ ในคอลัมน์การจัดการ เพื่อย้ายแถว — กด "เสร็จสิ้น" เมื่อจัดลำดับเรียบร้อยแล้ว',
    reorderLocked: 'กดปุ่ม "แก้ไขลำดับ" ก่อน จึงจะย้ายแถวได้',
    autofillLabel: 'ล่าสุด',
    autofillHint: 'กด Tab เพื่อเติม',
    placeholderItem: 'ชื่อรายการ'
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
    reopen: 'Reopen',
    addDept: 'Add Department',
    manageDept: 'Manage Departments (edit/delete)',
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
    placeholderReason: 'Reason (if any)',
    reorderBtn: 'Reorder rows',
    reorderDone: 'Done',
    reorderTitle: 'Row reordering mode',
    reorderHint: 'Drag a row up or down, or use the ▲ ▼ arrows in the Actions column to move it — click "Done" when the order looks right.',
    reorderLocked: 'Click "Reorder rows" first to move rows',
    autofillLabel: 'Last used',
    autofillHint: 'Press Tab to fill',
    placeholderItem: 'Item name'
  }
};

// Format a number as a money string with thousands separators (e.g. 500,000.00).
function formatMoney(value) {
  const n = Number(value);
  if (!isFinite(n)) return '';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Autofill — "repeat what I just typed"
//
// The sheet remembers ONLY the most recent value typed in each kind of cell
// (account code / item / amount / reason). When the next empty cell of that
// kind is focused, that single value is offered as a one-tap suggestion:
// press Tab or click the chip to fill it in. It is deliberately not a history
// list — only the latest value is kept, which is what repeated data entry
// (same account code down a column, same reason for several rows) needs.
// ---------------------------------------------------------------------------
const AUTOFILL_KEY = 'bh_autofill_last_v1';
const AUTOFILL_FIELDS = ['account_code', 'item_name', 'amount', 'reason_note'];

// Values the app itself writes into a brand new row. They count as "empty" so
// the suggestion still appears on a freshly added row.
const NEW_ROW_PLACEHOLDERS = ['รายการใหม่', 'รายการใหม่ (แทรก)'];

function loadLastTyped() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTOFILL_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    // Keep only the fields we know about, so an old/edited entry can't leak in.
    return AUTOFILL_FIELDS.reduce((acc, f) => {
      if (parsed[f] !== undefined && parsed[f] !== null && parsed[f] !== '') acc[f] = parsed[f];
      return acc;
    }, {});
  } catch {
    return {};
  }
}

// The little chip that offers the remembered value. It is rendered in a portal
// because the sheet container clips its own overflow, which would cut off a
// suggestion opened on one of the last rows.
function SuggestionChip({ anchorRef, show, text, label, hint, onAccept }) {
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!show) {
      setCoords(null);
      return;
    }
    const place = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Flip above the cell when there is no room below, so a suggestion on the
      // last row of a long sheet is never half off the bottom of the window.
      const flipUp = r.bottom + 44 > window.innerHeight;
      setCoords({
        top: flipUp ? undefined : r.bottom + 4,
        bottom: flipUp ? window.innerHeight - r.top + 4 : undefined,
        left: r.left,
        width: r.width,
      });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [show, anchorRef]);

  if (!show || !coords) return null;

  return createPortal(
    <button
      type="button"
      // A plain click would blur the cell first (and close the chip), so the
      // suggestion is accepted on mousedown with the blur suppressed.
      onMouseDown={(e) => { e.preventDefault(); onAccept(); }}
      style={{
        position: 'fixed',
        top: coords.top,
        bottom: coords.bottom,
        left: coords.left,
        minWidth: Math.max(coords.width, 180),
        maxWidth: 340,
      }}
      className="autofill-chip"
    >
      <History className="h-4 w-4 shrink-0" />
      <span className="font-black shrink-0">{label}:</span>
      <span className="truncate font-bold flex-1 min-w-0 text-left">{text}</span>
      <span className="shrink-0 opacity-70 font-semibold hidden sm:inline">{hint}</span>
    </button>,
    document.body
  );
}

// Text cell with the autofill suggestion attached. Commits on blur; ENTER
// confirms, ESC dismisses the suggestion (or restores the original value).
function AutofillInput({ value, suggestion, disabled, onCommit, className, placeholder, t, treatAsEmpty = [] }) {
  const [text, setText] = useState(value ?? '');
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef(null);
  const committedRef = useRef(value ?? '');
  const pendingRef = useRef(false);

  // Keep in sync with values coming from outside (reload, another edit), but
  // never stomp on what the user is typing — nor on a value that is still being
  // saved, which would otherwise flash the old text back into the cell until
  // the server replies.
  useEffect(() => {
    if (focused) return;
    const incoming = value ?? '';
    if (pendingRef.current) {
      if (incoming !== committedRef.current) return; // our save is still in flight
      pendingRef.current = false;
    }
    setText(incoming);
  }, [value, focused]);

  const commit = (v) => {
    if (v === committedRef.current) return;
    committedRef.current = v;
    pendingRef.current = true;
    onCommit(v);
  };

  const isEmptyish = (v) => {
    const s = String(v ?? '').trim();
    return s === '' || treatAsEmpty.includes(s);
  };

  // Offer the remembered value on an empty cell, or while what has been typed
  // so far is still the beginning of it.
  const canSuggest = !!suggestion && !disabled && suggestion !== text &&
    (isEmptyish(text) || suggestion.toLowerCase().startsWith(String(text).toLowerCase()));
  const show = focused && !dismissed && canSuggest;

  const accept = () => {
    setText(suggestion);
    setDismissed(true);
    commit(suggestion);
    if (ref.current) ref.current.focus();
  };

  return (
    <>
      <input
        ref={ref}
        type="text"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => { setFocused(true); setDismissed(false); }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (show && e.key === 'Tab') {
            e.preventDefault(); // Tab fills the suggestion in and stays put
            accept();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            if (show) {
              setDismissed(true); // first ESC just hides the suggestion
            } else {
              setText(value ?? '');
              e.target.blur();
            }
          }
        }}
        onBlur={() => { setFocused(false); setDismissed(false); commit(text); }}
        className={className}
      />
      <SuggestionChip
        anchorRef={ref}
        show={show}
        text={suggestion}
        label={t.autofillLabel}
        hint={t.autofillHint}
        onAccept={accept}
      />
    </>
  );
}

// Amount cell: a formatted text input (not a number spinner).
//  - shows the value with thousands separators while idle (500,000.00)
//  - shows the raw editable number while focused, with everything selected
//  - commits on ENTER (confirm) or on blur; ESC cancels and restores the value
//  - offers the last amount typed as an autofill suggestion on an empty row
function AmountInput({ value, suggestion, disabled, onCommit, t }) {
  const [text, setText] = useState(formatMoney(value));
  const [editing, setEditing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef(null);
  const committedRef = useRef(Number(value));
  const pendingRef = useRef(false);

  // Keep the displayed value in sync when it changes from outside (e.g. reload),
  // but never stomp on what the user is typing, nor on an amount that is still
  // being saved (that flashed the previous amount back for a moment).
  useEffect(() => {
    if (editing) return;
    if (pendingRef.current) {
      if (Number(value) !== committedRef.current) return; // save still in flight
      pendingRef.current = false;
    }
    setText(formatMoney(value));
  }, [value, editing]);

  const commit = (raw) => {
    const parsed = parseFloat(String(raw).replace(/,/g, ''));
    if (isNaN(parsed) || parsed < 0) {
      setText(formatMoney(value)); // invalid -> restore previous value
      return;
    }
    setText(formatMoney(parsed));
    if (parsed === committedRef.current) return;
    committedRef.current = parsed;
    pendingRef.current = true;
    onCommit(parsed);
  };

  // A new row starts at 0, which counts as empty for the suggestion.
  const typed = String(text).replace(/,/g, '').trim();
  const suggestionText = suggestion == null ? '' : String(suggestion);
  const canSuggest = suggestion != null && !disabled && Number(suggestion) !== Number(value) &&
    (typed === '' || typed === '0' || suggestionText.startsWith(typed));
  const show = editing && !dismissed && canSuggest;

  const accept = () => {
    setText(suggestionText);
    setDismissed(true);
    if (Number(suggestion) !== committedRef.current) {
      committedRef.current = Number(suggestion);
      pendingRef.current = true;
      onCommit(Number(suggestion));
    }
    if (ref.current) ref.current.focus();
  };

  return (
    <>
      <input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={text}
        disabled={disabled}
        onFocus={(e) => {
          setEditing(true);
          setDismissed(false);
          setText(value == null ? '' : String(value));
          // select after the raw value has been swapped in
          requestAnimationFrame(() => e.target.select());
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (show && e.key === 'Tab') {
            e.preventDefault(); // Tab fills the suggested amount in
            accept();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur(); // ENTER confirms the typed amount
          } else if (e.key === 'Escape') {
            e.preventDefault();
            if (show) {
              setDismissed(true);
            } else {
              setText(value == null ? '' : String(value));
              e.target.blur();
            }
          }
        }}
        onBlur={() => {
          setEditing(false);
          setDismissed(false);
          commit(text);
        }}
        className="bg-transparent w-full text-right text-slate-800 focus:outline-none focus:bg-slate-100 px-1 py-0.5 rounded border border-transparent focus:border-slate-300 font-bold text-sm"
      />
      <SuggestionChip
        anchorRef={ref}
        show={show}
        text={formatMoney(suggestion)}
        label={t.autofillLabel}
        hint={t.autofillHint}
        onAccept={accept}
      />
    </>
  );
}

export default function BudgetGrid({ user, lang, periodInfo, onBack, onNavigate }) {
  const [departments, setDepartments] = useState([]);
  const [deptsLoaded, setDeptsLoaded] = useState(false);
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
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  // Departments are added / edited / deleted from inside the sheet now.
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [savingDept, setSavingDept] = useState(false);
  const [showManageDept, setShowManageDept] = useState(false);
  // Inline hint shown when someone presses "Add Department" with an empty name,
  // so the button never looks like a dead / un-clickable control.
  const [deptHint, setDeptHint] = useState('');
  const deptNameInputRef = useRef(null);

  // Drag and drop states
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Row reordering is a deliberate mode ("แก้ไขลำดับ" / "Reorder rows"): rows
  // only become draggable — and the up/down arrows only work — once it is on.
  // Outside the mode the cells stay plain editable fields, so text can be
  // selected with the mouse without the row running away as a drag.
  const [reorderMode, setReorderMode] = useState(false);

  // Autofill memory: the single most recent value typed in each kind of cell.
  const [lastTyped, setLastTyped] = useState(loadLastTyped);

  const t = dict[lang];

  // Remember a value the user just typed, so the next empty cell of the same
  // kind can offer it. Only the latest value per field is kept.
  const rememberTyped = (field, value) => {
    if (!AUTOFILL_FIELDS.includes(field)) return;

    let remembered;
    if (field === 'amount') {
      const n = Number(value);
      if (!isFinite(n) || n <= 0) return;
      remembered = n;
    } else {
      remembered = String(value ?? '').trim();
      if (!remembered || NEW_ROW_PLACEHOLDERS.includes(remembered)) return;
    }

    setLastTyped(prev => {
      if (prev[field] === remembered) return prev;
      const next = { ...prev, [field]: remembered };
      try {
        localStorage.setItem(AUTOFILL_KEY, JSON.stringify(next));
      } catch {
        // A full / blocked storage must never break data entry.
      }
      return next;
    });
  };

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
      } finally {
        setDeptsLoaded(true);
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
      rememberTyped(field, value); // feed the autofill suggestion
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

  // Turn row reordering on / off. Reordering works on the real row order, so a
  // filtered view is cleared first — otherwise "move up" would jump over rows
  // the user cannot currently see.
  const toggleReorderMode = () => {
    setActiveDropdownRow(null); // a cost-center menu left open would float over locked cells
    setReorderMode(prev => {
      if (!prev) setSearchTerm('');
      return !prev;
    });
  };

  // Move row up or down by adjusting sort_order
  const handleMoveRow = async (index, direction) => {
    const isReadOnly = user.role === 'viewer' || (period && period.status === 'closed');
    if (isReadOnly || !reorderMode) return;

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

  // Drag and drop handlers (only active while the reorder mode is on)
  const handleDragStart = (e, index) => {
    if (isReadOnly || !reorderMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    if (isReadOnly || !reorderMode) return;
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e, index) => {
    if (isReadOnly || !reorderMode) return;
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

  // Reload the department list, keeping a sensible selection. If `preferId` is
  // given it is selected; otherwise the current selection is kept when it still
  // exists, else the first department (or none) is chosen.
  const reloadDepartments = async (preferId) => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
      setSelectedDeptId(prev => {
        if (preferId) return preferId;
        if (res.data.some(d => d.id === prev)) return prev;
        return res.data.length > 0 ? res.data[0].id : '';
      });
      setDeptsLoaded(true);
      return res.data;
    } catch (err) {
      console.error('Reload departments failed:', err);
      return departments;
    }
  };

  // Create a department without leaving the sheet, then select it. If the name
  // is empty we don't silently no-op (that made the button feel broken); we show
  // a hint and refocus the field instead.
  const handleCreateDept = async () => {
    const name = newDeptName.trim();
    if (!name) {
      setDeptHint(lang === 'TH' ? 'กรุณากรอกชื่อแผนกก่อนกดเพิ่ม' : 'Please enter a department name first');
      if (deptNameInputRef.current) deptNameInputRef.current.focus();
      return;
    }
    setDeptHint('');
    setSavingDept(true);
    try {
      const res = await api.post('/departments', { dept_name: name });
      await reloadDepartments(res.data.id);
      setShowAddDept(false);
      setNewDeptName('');
    } catch (err) {
      console.error('Create department failed:', err);
      showAlert(err.response?.data?.error || (lang === 'TH' ? 'ไม่สามารถเพิ่มแผนกได้' : 'Could not add department'));
    } finally {
      setSavingDept(false);
    }
  };

  // Finalize Sheet
  const handleFinalize = async () => {
    if (user.role !== 'admin') return;
    setShowFinalizeConfirm(true);
  };

  // Reopen (un-finalize) a confirmed sheet so it can be edited again.
  const handleReopen = async () => {
    if (user.role !== 'admin' || !period) return;
    try {
      await api.patch(`/periods/${period.id}`, { status: 'open' });
      setPeriod(prev => ({ ...prev, status: 'open' }));
      setShowReopenConfirm(false);
    } catch (err) {
      console.error('Reopen sheet failed:', err);
      showAlert(lang === 'TH' ? 'ไม่สามารถยกเลิกการยืนยันได้' : 'Could not reopen the sheet');
    }
  };

  const handleExport = async (type) => {
    try {
      const res = await api.get(`/export/${type}`, {
        params: { month: periodInfo.month, year: periodInfo.year },
        responseType: 'blob',
      });
      downloadBlob(res.data, `BudgetHub_${periodInfo.month}_${periodInfo.year}.${type}`);
    } catch (err) {
      console.error('Export failed:', err);
      showAlert(lang === 'TH' ? 'ไม่สามารถสร้างรายงานได้' : 'Could not generate the report');
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
  // While rows are being reordered the cells are locked, so a drag never lands
  // inside a text box and edits cannot happen by accident mid-drag.
  const cellsLocked = isReadOnly || reorderMode;
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
      showAlert(err.response?.data?.error || 'ไม่สามารถเพิ่มศูนย์ต้นทุนใหม่ได้');
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

  // Guard: a budget sheet needs at least one department to hold its entries.
  // Without this, "Add Row" silently no-ops and the grid looks frozen, so we
  // guide the user to create a department first instead of showing a dead grid.
  if (deptsLoaded && departments.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <button
          onClick={onBack}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition select-none inline-flex items-center gap-1 text-xs font-bold"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          <span>{t.backBtn}</span>
        </button>

        <div className="bg-white border border-slate-200 rounded-3xl p-10 md:p-12 shadow-sm text-center max-w-xl mx-auto space-y-5">
          <div className="mx-auto w-16 h-16 bg-[var(--color-primary-bg-light)] rounded-2xl flex items-center justify-center text-[var(--color-primary)]">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-900">
              {lang === 'TH' ? 'เริ่มต้นด้วยการเพิ่มแผนก' : 'Start by adding a department'}
            </h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              {lang === 'TH'
                ? 'พิมพ์ชื่อแผนกแล้วกดเพิ่ม เพื่อเริ่มกรอกข้อมูลงบประมาณของแผนกนั้นได้ทันที'
                : 'Type a department name and add it to start entering this department’s budget right away.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1 max-w-md mx-auto">
            <input
              ref={deptNameInputRef}
              type="text"
              value={newDeptName}
              onChange={(e) => { setNewDeptName(e.target.value); if (deptHint) setDeptHint(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateDept(); } }}
              placeholder={lang === 'TH' ? 'เช่น บัญชี' : 'e.g. Accounting'}
              className="glass-input w-full text-sm font-semibold"
              autoFocus
            />
            <button
              onClick={handleCreateDept}
              disabled={savingDept}
              className="glass-btn-primary text-sm font-bold w-full sm:w-auto shrink-0 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{t.addDept}</span>
            </button>
          </div>
          {deptHint && (
            <p className="text-xs font-bold text-rose-500 -mt-2">{deptHint}</p>
          )}
        </div>
      </div>
    );
  }

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
                <span className={`px-2 py-0.5 text-[12px] font-black rounded-md tracking-wider ${
                  period.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {period.status === 'open' ? 'DRAFT' : 'FINALIZED'}
                </span>
              )}

              {/* Status Indicator */}
              <div className="flex items-center gap-1 text-[12px] font-bold text-slate-400 pl-2">
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

            <span className="text-[12px] text-slate-400 font-bold block mt-0.5">
              {lang === 'TH' ? 'แก้ไขล่าสุด' : 'Last modified'}: {period && (period.last_modified || period.created_at) ? new Date(period.last_modified || period.created_at).toLocaleString(lang === 'TH' ? 'th-TH' : 'en-GB') : '-'}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          {/* Department switcher + inline add (departments live in the sheet) */}
          {(user.role === 'admin' || user.role === 'viewer') && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.dept_name}</option>
                ))}
              </select>
              {user.role !== 'viewer' && (
                <>
                  <button
                    onClick={() => { setNewDeptName(''); setDeptHint(''); setShowAddDept(true); }}
                    className="p-2.5 bg-slate-50 hover:bg-[var(--color-primary-bg-light)] hover:text-[var(--color-primary)] border border-slate-200 rounded-xl cursor-pointer transition"
                    title={t.addDept}
                  >
                    <Building2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowManageDept(true)}
                    disabled={departments.length === 0}
                    className="p-2.5 bg-slate-50 hover:bg-[var(--color-primary-bg-light)] hover:text-[var(--color-primary)] border border-slate-200 rounded-xl cursor-pointer transition disabled:opacity-40 disabled:cursor-default"
                    title={t.manageDept}
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
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

          {/* Reopen (un-finalize) a confirmed sheet to edit it again */}
          {user.role === 'admin' && period && period.status === 'closed' && (
            <button
              onClick={() => setShowReopenConfirm(true)}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold rounded-xl cursor-pointer transition select-none flex items-center gap-1.5"
            >
              <Unlock className="h-4 w-4" />
              <span>{t.reopen}</span>
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
                
                <div className="space-y-1 text-[13px] font-semibold text-slate-500">
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
              {dict[lang].colItem}
              {departments.find(d => d.id === selectedDeptId)?.dept_name
                ? ` • ${departments.find(d => d.id === selectedDeptId).dept_name}`
                : ''}
            </span>
            
            {/* Search Input field */}
            <div className="relative w-full sm:w-64 shrink-0">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={reorderMode}
                placeholder={lang === 'TH' ? 'ค้นหา รหัส, ชื่อรายการ, ศูนย์ต้นทุน...' : 'Search code, item, CC...'}
                className="w-full text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-light)] font-semibold text-slate-700 shadow-sm disabled:bg-slate-100 disabled:text-slate-400"
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
              <span className="text-[12px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-bg-light)] border border-[var(--color-primary-light)] px-2.5 py-1 rounded-lg shrink-0 transition animate-fade-in">
                {lang === 'TH' 
                  ? `พบ ${filteredEntries.length} จาก ${entries.length} รายการ`
                  : `Found ${filteredEntries.length} of ${entries.length} entries`
                }
              </span>
            )}
          </div>
          
          {!isReadOnly && (
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {/* Reorder mode toggle — sits next to "Add Row" */}
              <button
                onClick={toggleReorderMode}
                disabled={!reorderMode && entries.length < 2}
                title={t.reorderTitle}
                className={`py-2 px-4 text-sm font-bold rounded-xl border transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-default ${
                  reorderMode
                    ? 'bg-amber-500 border-amber-500 text-white hover:bg-amber-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)]'
                }`}
              >
                {reorderMode ? <Check className="h-4 w-4" /> : <ArrowUpDown className="h-4 w-4" />}
                <span>{reorderMode ? t.reorderDone : t.reorderBtn}</span>
              </button>

              <button
                onClick={handleAddRow}
                className="glass-btn-primary py-2 px-4 text-sm font-bold"
              >
                <Plus className="h-4 w-4" />
                <span>{t.addBtn}</span>
              </button>
            </div>
          )}
        </div>

        {/* Reorder mode banner — explains the two ways to move a row */}
        {reorderMode && !isReadOnly && (
          <div className="flex items-start gap-2.5 bg-amber-50 border-b border-amber-200 px-4 py-3 animate-fade-in">
            <GripVertical className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 font-semibold leading-relaxed">
              <span className="font-black mr-1">{t.reorderTitle}:</span>
              {t.reorderHint}
            </p>
          </div>
        )}

        {/* Table Element — fits the container (no horizontal scrollbar). */}
        <div className="w-full min-h-[320px]">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200">
                <th className="grid-header w-[5%]">{t.colNo}</th>
                <th className="grid-header w-[11%]">{t.colAccount}</th>
                <th className="grid-header w-[12%]">{t.colCostCenter}</th>
                <th className="grid-header w-[16%]">{t.colItem}</th>
                <th className="grid-header w-[9%]">{t.colAmount}</th>
                <th className="grid-header w-[7%]">{t.colTax}</th>
                <th className="grid-header w-[9%]">{t.colTotal}</th>
                <th className="grid-header w-[11%]">{t.colReason}</th>
                <th className="grid-header w-[6%]">{t.colDeduct}</th>
                <th className="grid-header w-[6%]">{t.colType}</th>
                {!isReadOnly && <th className="grid-header w-[11%]">{t.colAction}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 10 : 11} className="py-20 text-center text-slate-400 text-sm font-semibold">
                    {searchTerm ? (lang === 'TH' ? 'ไม่พบรายการที่ตรงกับการค้นหา' : 'No matching entries found') : (lang === 'TH' ? 'ไม่มีรายการงบประมาณรายจ่ายในงวดนี้' : 'No budget entries in this period')}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry, index) => {
                  const originalIndex = entries.findIndex(e => e.id === entry.id);
                  return (
                    <tr
                      key={entry.id}
                      draggable={!isReadOnly && reorderMode && !searchTerm}
                      onDragStart={(e) => handleDragStart(e, originalIndex)}
                      onDragOver={(e) => handleDragOver(e, originalIndex)}
                      onDrop={(e) => handleDrop(e, originalIndex)}
                      onDragEnd={handleDragEnd}
                      className={`border-b border-slate-100 transition-colors ${
                        entry.is_budget_cut ? 'bg-[var(--color-primary-bg-light)]/40 font-semibold' : ''
                      } ${activeDropdownRow === entry.id ? 'relative z-20' : ''} ${
                        reorderMode ? 'select-none hover:bg-amber-50' : 'hover:bg-slate-50/50'
                      } ${
                        draggedIndex === originalIndex ? 'opacity-40 bg-slate-100' : ''
                      } ${
                        dragOverIndex === originalIndex ? 'border-t-2 border-t-[var(--color-primary)]' : ''
                      }`}
                      style={{ cursor: !isReadOnly && reorderMode && !searchTerm ? 'grab' : 'default' }}
                    >
                      {/* 1. Drag handle (reorder mode) & No. */}
                      <td className="grid-cell text-center text-slate-400 font-bold font-sans">
                        {reorderMode && !isReadOnly ? (
                          <span className="inline-flex items-center gap-0.5 text-amber-600">
                            <GripVertical className="h-4 w-4" />
                            <span>{originalIndex + 1}</span>
                          </span>
                        ) : (
                          originalIndex + 1
                        )}
                      </td>

                      {/* 2. Account Code */}
                      <td className="grid-cell">
                        <AutofillInput
                          value={entry.account_code || ''}
                          suggestion={lastTyped.account_code}
                          onCommit={(val) => handleCellBlur(entry, 'account_code', val)}
                          className="bg-transparent w-full text-slate-800 focus:outline-none focus:bg-slate-100 px-1 py-0.5 rounded border border-transparent focus:border-slate-300 text-sm font-semibold disabled:cursor-default"
                          disabled={cellsLocked}
                          t={t}
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
                          isReadOnly={cellsLocked}
                          lang={lang}
                          isDropup={index >= 2 && index >= entries.length - 2}
                        />
                      </td>

                      {/* 4. Item details */}
                      <td className="grid-cell">
                        <AutofillInput
                          value={entry.item_name || ''}
                          suggestion={lastTyped.item_name}
                          treatAsEmpty={NEW_ROW_PLACEHOLDERS}
                          onCommit={(val) => handleCellBlur(entry, 'item_name', val)}
                          className="bg-transparent w-full text-slate-800 focus:outline-none focus:bg-slate-100 px-1 py-0.5 rounded border border-transparent focus:border-slate-300 text-sm font-bold truncate disabled:cursor-default"
                          placeholder={t.placeholderItem}
                          disabled={cellsLocked}
                          t={t}
                        />
                      </td>

                      {/* 5. Amount */}
                      <td className="grid-cell">
                        <AmountInput
                          value={entry.amount}
                          suggestion={lastTyped.amount}
                          disabled={cellsLocked}
                          onCommit={(val) => handleCellBlur(entry, 'amount', val)}
                          t={t}
                        />
                      </td>

                      {/* 6. Tax (read-only) */}
                      <td className="grid-cell text-right text-slate-400 font-bold text-sm font-sans">
                        {parseFloat(entry.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 7. Total amount (read-only) */}
                      <td className="grid-cell text-right text-slate-800 font-black text-sm font-sans">
                        {parseFloat(entry.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* 8. Reason */}
                      <td className="grid-cell">
                        <AutofillInput
                          value={entry.reason_note || ''}
                          suggestion={lastTyped.reason_note}
                          onCommit={(val) => handleCellBlur(entry, 'reason_note', val)}
                          className="bg-transparent w-full text-slate-600 focus:outline-none focus:bg-slate-100 px-1 py-0.5 rounded border border-transparent focus:border-slate-300 text-sm placeholder-slate-400 disabled:cursor-default"
                          placeholder={t.placeholderReason}
                          disabled={cellsLocked}
                          t={t}
                        />
                      </td>

                      {/* 9. Deduct budget (is_budget_cut check) */}
                      <td className="grid-cell text-center">
                        <input
                          type="checkbox"
                          checked={!!entry.is_budget_cut}
                          onChange={(e) => handleCellBlur(entry, 'is_budget_cut', e.target.checked)}
                          className="h-5 w-5 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-slate-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-default"
                          disabled={cellsLocked}
                        />
                      </td>

                      {/* 10. Type (entry_type dropdown select) */}
                      <td className="grid-cell overflow-visible relative">
                        <select
                          value={entry.entry_type || 'รายจ่าย'}
                          onChange={(e) => handleCellBlur(entry, 'entry_type', e.target.value)}
                          className="bg-transparent w-full text-sm font-bold text-slate-700 focus:outline-none cursor-pointer focus:bg-slate-100 p-1 border border-transparent rounded focus:border-slate-200"
                          disabled={cellsLocked}
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
                              disabled={reorderMode}
                              className="text-[var(--color-primary)] p-1 hover:bg-slate-100 rounded-lg transition disabled:opacity-20"
                              title={lang === 'TH' ? 'แทรกแถวด้านล่าง' : 'Insert row below'}
                            >
                              <Plus className="h-4 w-4" />
                            </button>

                            {/* Move Up — only usable in the reorder mode */}
                            <button
                              onClick={() => handleMoveRow(originalIndex, -1)}
                              disabled={!reorderMode || originalIndex === 0 || !!searchTerm}
                              className={`p-1 rounded-lg transition disabled:opacity-20 ${
                                reorderMode
                                  ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                  : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={reorderMode ? (lang === 'TH' ? 'ย้ายแถวขึ้น' : 'Move row up') : t.reorderLocked}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>

                            {/* Move Down — only usable in the reorder mode */}
                            <button
                              onClick={() => handleMoveRow(originalIndex, 1)}
                              disabled={!reorderMode || originalIndex === entries.length - 1 || !!searchTerm}
                              className={`p-1 rounded-lg transition disabled:opacity-20 ${
                                reorderMode
                                  ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50'
                                  : 'text-slate-400 hover:bg-slate-100'
                              }`}
                              title={reorderMode ? (lang === 'TH' ? 'ย้ายแถวลง' : 'Move row down') : t.reorderLocked}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setRowToDelete(entry.id)}
                              disabled={reorderMode}
                              className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition disabled:opacity-20"
                              title={lang === 'TH' ? 'ลบแถว' : 'Delete row'}
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
              <span className="text-[12px] font-extrabold text-slate-400 uppercase tracking-widest">
                {t.totalLabel}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-4 mt-2">
                <span className="text-xl font-black text-slate-900">
                  ฿{subtotalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[12px] font-bold text-slate-500">
                  (ก่อนภาษี: ฿{subtotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} • ภาษี: ฿{subtotalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                </span>
              </div>
            </div>

            {/* Deducted Total box */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
              <span className="text-[12px] font-extrabold text-[var(--color-primary)] uppercase tracking-widest">
                {t.deductLabel}
              </span>
              <div className="flex flex-wrap items-baseline gap-x-4 mt-2">
                <span className="text-xl font-black text-[var(--color-primary)]">
                  ฿{subtotalDeductTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[12px] font-bold text-slate-500">
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

      {/* Add Department (inline, from the sheet) */}
      {showAddDept && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {lang === 'TH' ? 'เพิ่มแผนกใหม่' : 'Add New Department'}
              </h3>
              <button
                onClick={() => setShowAddDept(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {lang === 'TH' ? 'ชื่อแผนก' : 'Department Name'}
                </label>
                <input
                  ref={deptNameInputRef}
                  type="text"
                  value={newDeptName}
                  onChange={(e) => { setNewDeptName(e.target.value); if (deptHint) setDeptHint(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateDept(); } }}
                  placeholder={lang === 'TH' ? 'เช่น บัญชี' : 'e.g. Accounting'}
                  className="glass-input w-full text-sm font-semibold"
                  autoFocus
                />
                {deptHint && (
                  <p className="text-xs font-bold text-rose-500 mt-2">{deptHint}</p>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddDept(false)} className="glass-btn-secondary text-sm font-bold">
                  {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleCreateDept}
                  disabled={savingDept}
                  className="glass-btn-primary text-sm font-bold disabled:opacity-50"
                >
                  {lang === 'TH' ? 'บันทึกข้อมูล' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Departments (rename / delete, with confirm) */}
      {showManageDept && (
        <ManageDepartmentsModal
          departments={departments}
          lang={lang}
          onClose={() => setShowManageDept(false)}
          onReload={reloadDepartments}
        />
      )}

      {/* Reopen (un-finalize) confirmation */}
      {showReopenConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-md shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <Unlock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {lang === 'TH' ? 'ยกเลิกการยืนยันแผ่นงาน' : 'Reopen Sheet'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed px-4">
                {lang === 'TH'
                  ? 'แผ่นงานจะกลับมาเป็นแบบร่างและแก้ไขได้อีกครั้ง ต้องการดำเนินการต่อหรือไม่?'
                  : 'This sheet will return to draft and become editable again. Continue?'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowReopenConfirm(false)}
                className="glass-btn-secondary py-2 px-5 text-xs font-bold w-full"
              >
                {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={handleReopen}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition w-full"
              >
                {lang === 'TH' ? 'ยืนยัน' : 'Confirm'}
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
                    showAlert('ไม่สามารถยืนยันแผ่นงานได้');
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

// Manage departments (rename / delete) without leaving the sheet. Deleting a
// department that still has budget data deactivates it instead (handled by the
// backend) to protect history; we surface that outcome to the user.
function ManageDepartmentsModal({ departments, lang, onClose, onReload }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const startEdit = (d) => { setEditingId(d.id); setEditName(d.dept_name); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); };

  const saveEdit = async (d) => {
    const name = editName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await api.patch(`/departments/${d.id}`, { dept_name: name });
      await onReload();
      cancelEdit();
    } catch (err) {
      console.error('Rename department failed:', err);
      showAlert(err.response?.data?.error || (lang === 'TH' ? 'ไม่สามารถบันทึกได้' : 'Could not save'));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    const d = deptToDelete;
    if (!d) return;
    // Close the confirm dialog immediately, like every other delete flow in
    // the app. Previously this only closed on success, so a blocked delete
    // (department still has data) left two stacked overlays on screen —
    // looked frozen until the user noticed they had to click Cancel.
    setDeptToDelete(null);
    setBusy(true);
    try {
      await api.delete(`/departments/${d.id}`);
      await onReload();
    } catch (err) {
      console.error('Delete department failed:', err);
      // A department that still has budget data cannot be deleted.
      if (err.response?.data?.code === 'HAS_DATA') {
        showAlert(lang === 'TH'
          ? 'ไม่สามารถลบแผนกได้ เนื่องจากยังมีข้อมูลงบประมาณอยู่ กรุณาลบข้อมูล/แผ่นงานของแผนกนี้ก่อน แล้วจึงลบแผนกได้'
          : 'This department cannot be deleted because it still has budget data. Remove its data / sheets first, then delete it.');
      } else {
        showAlert(err.response?.data?.error || (lang === 'TH' ? 'ไม่สามารถลบแผนกได้' : 'Could not delete department'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-[28px] p-6 w-full max-w-md shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-extrabold text-slate-900 text-lg">
            {lang === 'TH' ? 'จัดการแผนก' : 'Manage Departments'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {departments.map(d => (
            <div key={d.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5">
              {editingId === d.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEdit(d); } if (e.key === 'Escape') cancelEdit(); }}
                    className="glass-input flex-1 text-sm font-semibold !py-1.5"
                    autoFocus
                  />
                  <button
                    onClick={() => saveEdit(d)}
                    disabled={busy || !editName.trim()}
                    className="p-1.5 text-[var(--color-primary)] hover:bg-[var(--color-primary-bg-light)] rounded-lg transition disabled:opacity-40"
                    title={lang === 'TH' ? 'บันทึก' : 'Save'}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition"
                    title={lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 text-slate-300 shrink-0" />
                  <span className="flex-1 text-sm font-bold text-slate-800 truncate" title={d.dept_name}>
                    {d.dept_name}
                    {!d.is_active && (
                      <span className="ml-2 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                        {lang === 'TH' ? '(ระงับ)' : '(suspended)'}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => startEdit(d)}
                    className="p-1.5 text-slate-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-bg-light)] rounded-lg transition cursor-pointer"
                    title={lang === 'TH' ? 'แก้ไขชื่อ' : 'Edit name'}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeptToDelete(d)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title={lang === 'TH' ? 'ลบแผนก' : 'Delete department'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
          {departments.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm font-semibold">
              {lang === 'TH' ? 'ยังไม่มีแผนก' : 'No departments yet'}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end pt-4 mt-3 border-t border-slate-100">
          <button onClick={onClose} className="glass-btn-secondary text-sm font-bold">
            {lang === 'TH' ? 'ปิด' : 'Close'}
          </button>
        </div>
      </div>

      {/* Delete confirmation (sits above the manage modal) */}
      {deptToDelete && (
        <div className="fixed inset-0 z-[55] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {lang === 'TH' ? 'ยืนยันการลบแผนก' : 'Confirm Deletion'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed px-2">
                {lang === 'TH'
                  ? `ต้องการลบแผนก "${deptToDelete.dept_name}" ใช่หรือไม่? แผนกที่ยังมีข้อมูลงบประมาณอยู่จะลบไม่ได้`
                  : `Delete department "${deptToDelete.dept_name}"? A department that still has budget data cannot be deleted.`}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeptToDelete(null)}
                disabled={busy}
                className="glass-btn-secondary py-2 px-5 text-xs font-bold w-full disabled:opacity-50"
              >
                {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition w-full disabled:opacity-50"
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
  const searchInputRef = useRef(null);
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
        <span className="text-slate-800 font-bold text-sm flex-1 break-words">
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
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim() && !costCenters.some(cc => cc.cc_code === search.trim())) {
                  e.preventDefault();
                  handleNewCCSubmit();
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 text-sm rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-light)]"
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
                className="w-full text-left px-3 py-2.5 text-[14px] text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] rounded flex items-start gap-2 cursor-pointer font-semibold break-words leading-normal"
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

          {/* Inline Create shortcut — always visible so users can add a cost
              center without leaving the sheet. Type a code then click/Enter. */}
          {!costCenters.some(cc => cc.cc_code === search.trim()) && (
            <button
              onClick={() => {
                if (search.trim()) {
                  handleNewCCSubmit();
                } else if (searchInputRef.current) {
                  searchInputRef.current.focus();
                }
              }}
              type="button"
              className="w-full text-center mt-2 bg-[var(--color-primary-bg-light)] hover:bg-[var(--color-primary-light)] border border-[var(--color-primary-light)] text-[var(--color-primary)] font-bold rounded-lg py-1.5 text-xs flex items-center justify-center gap-1 cursor-pointer transition"
            >
              <Plus className="h-3 w-3" />
              <span>
                {search.trim()
                  ? (lang === 'TH' ? `เพิ่มศูนย์ต้นทุน "${search.trim()}"` : `Add cost center "${search.trim()}"`)
                  : (lang === 'TH' ? 'เพิ่มศูนย์ต้นทุนใหม่' : 'Add new cost center')}
              </span>
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
