import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  AlertCircle, 
  X,
  Loader2
} from 'lucide-react';

const dict = {
  TH: {
    title: 'ทะเบียนศูนย์ต้นทุน',
    subtitle: 'จัดการศูนย์ต้นทุน รหัสหน่วยงาน และสถานะใช้งาน/ไม่ใช้งาน',
    createBtn: 'สร้างศูนย์ต้นทุน',
    searchPlaceholder: 'ค้นหารหัสหรือชื่อศูนย์ต้นทุน...',
    colCode: 'รหัส',
    colName: 'ชื่อ',
    colDesc: 'คำอธิบาย',
    colEntries: 'รายการ',
    colUpdated: 'แก้ไขล่าสุด',
    colStatus: 'สถานะ',
    colAction: 'จัดการ',
    statusActive: 'ใช้งาน',
    statusInactive: 'ระงับการใช้',
    deleteConfirm: 'คุณต้องการลบศูนย์ต้นทุนนี้ใช่หรือไม่?',
    deleteSuccess: 'ลบศูนย์ต้นทุนสำเร็จ',
    modalCreateTitle: 'เพิ่มศูนย์ต้นทุนใหม่',
    modalEditTitle: 'แก้ไขศูนย์ต้นทุน',
    fieldCode: 'รหัสศูนย์ต้นทุน',
    fieldName: 'ชื่อศูนย์ต้นทุน',
    fieldDesc: 'คำอธิบาย / รายละเอียด',
    fieldDept: 'แผนกที่สังกัด',
    fieldStatus: 'สถานะใช้งาน',
    cancel: 'ยกเลิก',
    submit: 'บันทึกข้อมูล',
    noData: 'ไม่พบศูนย์ต้นทุน'
  },
  EN: {
    title: 'Cost Center Registry',
    subtitle: 'Manage cost centers, department codes, and active/inactive status.',
    createBtn: 'Create Cost Center',
    searchPlaceholder: 'Search by code or name...',
    colCode: 'Code',
    colName: 'Name',
    colDesc: 'Description',
    colEntries: 'Entries',
    colUpdated: 'Last Modified',
    colStatus: 'Status',
    colAction: 'Actions',
    statusActive: 'Active',
    statusInactive: 'Suspended',
    deleteConfirm: 'Are you sure you want to delete this cost center?',
    deleteSuccess: 'Cost center deleted successfully',
    modalCreateTitle: 'Add New Cost Center',
    modalEditTitle: 'Edit Cost Center',
    fieldCode: 'Cost Center Code',
    fieldName: 'Cost Center Name',
    fieldDesc: 'Description / Details',
    fieldDept: 'Department',
    fieldStatus: 'Active Status',
    cancel: 'Cancel',
    submit: 'Save Info',
    noData: 'No cost centers found'
  }
};

export default function CostCentersList({ user, lang }) {
  const [costCenters, setCostCenters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [ccToDelete, setCcToDelete] = useState(null);
  const [editingCc, setEditingCc] = useState(null); // cc object if editing, null if creating
  const [ccForm, setCcForm] = useState({
    cc_code: '',
    cc_name: '',
    cc_desc: '',
    department_id: '',
    is_active: true
  });

  const t = dict[lang];

  const fetchCostCenters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/cost-centers');
      setCostCenters(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepts = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCostCenters();
    fetchDepts();
  }, []);

  const handleOpenCreate = () => {
    setEditingCc(null);
    setCcForm({
      cc_code: '',
      cc_name: '',
      cc_desc: '',
      department_id: '',
      is_active: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (cc) => {
    setEditingCc(cc);
    setCcForm({
      cc_code: cc.cc_code,
      cc_name: cc.cc_name,
      cc_desc: cc.cc_desc || '',
      department_id: cc.department_id || '',
      is_active: cc.is_active
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ccForm.cc_code.trim()) return;

    try {
      if (editingCc) {
        // Edit mode (Admin only)
        const payload = {
          cc_name: ccForm.cc_name,
          department_id: ccForm.department_id || null,
          is_active: ccForm.is_active
        };
        await api.patch(`/cost-centers/${editingCc.id}`, payload);
      } else {
        // Create mode (Admin/Editor)
        const payload = {
          cc_code: ccForm.cc_code.trim(),
          cc_name: ccForm.cc_name.trim(),
          department_id: ccForm.department_id || null
        };
        await api.post('/cost-centers', payload);
      }
      setShowModal(false);
      fetchCostCenters();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleDelete = async (id) => {
    if (user.role !== 'admin') return;
    try {
      await api.delete(`/cost-centers/${id}`);
      setCostCenters(prev => prev.filter(cc => cc.id !== id));
      alert(t.deleteSuccess);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'ไม่สามารถลบศูนย์ต้นทุนนี้ได้');
    }
  };

  const handleToggleActive = async (cc) => {
    if (user.role !== 'admin') return;
    try {
      const updatedStatus = !cc.is_active;
      await api.patch(`/cost-centers/${cc.id}`, { is_active: updatedStatus });
      setCostCenters(prev => prev.map(item => item.id === cc.id ? { ...item, is_active: updatedStatus } : item));
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  const filteredCc = costCenters.filter(cc => 
    cc.cc_code.toLowerCase().includes(search.toLowerCase()) ||
    (cc.cc_name && cc.cc_name.toLowerCase().includes(search.toLowerCase())) ||
    (cc.dept_name && cc.dept_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t.title}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {t.subtitle}
          </p>
        </div>

        {/* Editors & Admins can create CC */}
        {user.role !== 'viewer' && (
          <button
            onClick={handleOpenCreate}
            className="glass-btn-primary py-2.5 self-start md:self-center"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>{t.createBtn}</span>
          </button>
        )}
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full !pl-10 text-xs bg-slate-50 border-slate-200"
            placeholder={t.searchPlaceholder}
          />
        </div>
      </div>

      {/* CC List Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mx-auto mb-3" />
            <span>กำลังโหลดทะเบียนศูนย์ต้นทุน...</span>
          </div>
        ) : filteredCc.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-semibold">
            {t.noData}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold tracking-wider">
                  <th className="px-6 py-4">{t.colCode}</th>
                  <th className="px-6 py-4">{t.colName}</th>
                  <th className="px-6 py-4">{t.colDesc}</th>
                  <th className="px-6 py-4 text-center">{t.colEntries}</th>
                  <th className="px-6 py-4">{t.colUpdated}</th>
                  <th className="px-6 py-4 text-center">{t.colStatus}</th>
                  {user.role === 'admin' && <th className="px-6 py-4 text-center">{t.colAction}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCc.map(cc => (
                  <tr key={cc.id} className="border-b border-slate-100 hover:bg-slate-50/40 text-slate-700 text-xs">
                    <td className="px-6 py-4 font-black text-[var(--color-primary)]">
                      {cc.cc_code}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {cc.cc_name}
                      {cc.dept_name && (
                        <div className="text-[10px] text-slate-400 font-medium block mt-0.5 font-sans">
                          {cc.dept_name} {cc.dept_code ? `(${cc.dept_code})` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-[240px] truncate" title={cc.cc_desc}>
                      {cc.cc_desc || '-'}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-600">
                      {cc.entries_count || 0}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(cc.created_at).toLocaleString('th-TH')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(cc)}
                        disabled={user.role !== 'admin'}
                        className={`px-2.5 py-1 text-[10px] font-black rounded-md tracking-wider ${
                          cc.is_active 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-slate-100 text-slate-500'
                        } ${user.role === 'admin' ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        {cc.is_active ? t.statusActive : t.statusInactive}
                      </button>
                    </td>
                    {user.role === 'admin' && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(cc)}
                            className="p-1.5 text-slate-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-bg-light)] border border-transparent rounded-xl transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setCcToDelete(cc.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create/Edit Cost Center */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingCc ? t.modalEditTitle : t.modalCreateTitle}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Cost Center Code */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.fieldCode}
                </label>
                <input
                  type="text"
                  value={ccForm.cc_code}
                  onChange={(e) => setCcForm(prev => ({ ...prev, cc_code: e.target.value }))}
                  className="glass-input w-full text-sm font-semibold"
                  placeholder="เช่น H307101030"
                  disabled={!!editingCc} // Code cannot be edited once created
                  required
                />
              </div>

              {/* Cost Center Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.fieldName}
                </label>
                <input
                  type="text"
                  value={ccForm.cc_name}
                  onChange={(e) => setCcForm(prev => ({ ...prev, cc_name: e.target.value }))}
                  className="glass-input w-full text-sm font-semibold"
                  placeholder="เช่น Operations & Facilities"
                  required
                />
              </div>

              {/* Scoped Department Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.fieldDept}
                </label>
                <select
                  value={ccForm.department_id || ''}
                  onChange={(e) => setCcForm(prev => ({ ...prev, department_id: e.target.value }))}
                  className="glass-input w-full text-sm font-semibold cursor-pointer"
                >
                  <option value="">{lang === 'TH' ? 'ทุกแผนก (ใช้ได้ทุกแผนก)' : 'All Departments (Global)'}</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.dept_name} ({d.dept_code})
                    </option>
                  ))}
                </select>
              </div>



              {/* Status Selector (Admin only edit) */}
              {editingCc && (
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={ccForm.is_active}
                    onChange={(e) => setCcForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4.5 w-4.5 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    {t.fieldStatus}
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
      {ccToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {lang === 'TH' ? 'ยืนยันการลบศูนย์ต้นทุน' : 'Confirm Deletion'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed px-2">
                {t.deleteConfirm}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCcToDelete(null)}
                className="glass-btn-secondary py-2 px-5 text-xs font-bold w-full"
              >
                {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const id = ccToDelete;
                  setCcToDelete(null);
                  await handleDelete(id);
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
