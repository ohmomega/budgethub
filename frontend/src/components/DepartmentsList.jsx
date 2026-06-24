import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Loader2,
  Building2
} from 'lucide-react';

const dict = {
  TH: {
    title: 'จัดการแผนก / หมวดหมู่',
    subtitle: 'เพิ่ม แก้ไข หรือระงับแผนก เพื่อใช้กรองและจัดกลุ่มข้อมูลงบประมาณ',
    createBtn: 'เพิ่มแผนก',
    searchPlaceholder: 'ค้นหารหัสหรือชื่อแผนก...',
    colCode: 'รหัสแผนก',
    colName: 'ชื่อแผนก',
    colStatus: 'สถานะ',
    colAction: 'จัดการ',
    statusActive: 'ใช้งาน',
    statusInactive: 'ระงับการใช้',
    deleteConfirm: 'คุณต้องการลบแผนกนี้ใช่หรือไม่? หากมีข้อมูลงบประมาณอยู่แล้ว ระบบจะระงับการใช้งานแทนการลบ',
    deleteSuccess: 'ลบแผนกสำเร็จ',
    deactivateSuccess: 'แผนกนี้มีข้อมูลงบประมาณอยู่แล้ว จึงถูกระงับการใช้งานแทนการลบ',
    modalCreateTitle: 'เพิ่มแผนกใหม่',
    modalEditTitle: 'แก้ไขแผนก',
    fieldCode: 'รหัสแผนก',
    fieldName: 'ชื่อแผนก',
    fieldStatus: 'สถานะใช้งาน',
    cancel: 'ยกเลิก',
    submit: 'บันทึกข้อมูล',
    noData: 'ยังไม่มีแผนก กดปุ่ม "เพิ่มแผนก" เพื่อเริ่มต้น'
  },
  EN: {
    title: 'Departments / Categories',
    subtitle: 'Add, edit, or suspend departments used to filter and group budget data.',
    createBtn: 'Add Department',
    searchPlaceholder: 'Search by code or name...',
    colCode: 'Code',
    colName: 'Department Name',
    colStatus: 'Status',
    colAction: 'Actions',
    statusActive: 'Active',
    statusInactive: 'Suspended',
    deleteConfirm: 'Delete this department? If it already has budget data it will be deactivated instead of removed.',
    deleteSuccess: 'Department deleted successfully',
    deactivateSuccess: 'This department has budget data, so it was deactivated instead of deleted.',
    modalCreateTitle: 'Add New Department',
    modalEditTitle: 'Edit Department',
    fieldCode: 'Department Code',
    fieldName: 'Department Name',
    fieldStatus: 'Active Status',
    cancel: 'Cancel',
    submit: 'Save Info',
    noData: 'No departments yet. Click "Add Department" to get started.'
  }
};

export default function DepartmentsList({ user, lang }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [editingDept, setEditingDept] = useState(null);
  const [form, setForm] = useState({ dept_code: '', dept_name: '', is_active: true });

  const t = dict[lang];

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenCreate = () => {
    setEditingDept(null);
    setForm({ dept_code: '', dept_name: '', is_active: true });
    setShowModal(true);
  };

  const handleOpenEdit = (d) => {
    setEditingDept(d);
    setForm({ dept_code: d.dept_code, dept_name: d.dept_name, is_active: d.is_active });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dept_code.trim() || !form.dept_name.trim()) return;
    try {
      if (editingDept) {
        await api.patch(`/departments/${editingDept.id}`, {
          dept_name: form.dept_name,
          is_active: form.is_active
        });
      } else {
        await api.post('/departments', {
          dept_code: form.dept_code.trim(),
          dept_name: form.dept_name.trim()
        });
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || (lang === 'TH' ? 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' : 'Failed to save'));
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/departments/${id}`);
      await fetchDepartments();
      alert(res.data?.deactivated ? t.deactivateSuccess : t.deleteSuccess);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || (lang === 'TH' ? 'ไม่สามารถลบแผนกได้' : 'Could not delete department'));
    }
  };

  const handleToggleActive = async (d) => {
    try {
      const updatedStatus = !d.is_active;
      await api.patch(`/departments/${d.id}`, { is_active: updatedStatus });
      setDepartments(prev => prev.map(item => item.id === d.id ? { ...item, is_active: updatedStatus } : item));
    } catch (err) {
      console.error(err);
      alert(lang === 'TH' ? 'ไม่สามารถเปลี่ยนสถานะได้' : 'Could not change status');
    }
  };

  const filtered = departments.filter(d =>
    d.dept_code.toLowerCase().includes(search.toLowerCase()) ||
    (d.dept_name && d.dept_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.title}</h2>
          <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
        </div>
        {user.role === 'admin' && (
          <button onClick={handleOpenCreate} className="glass-btn-primary py-2.5 self-start md:self-center">
            <Plus className="h-4.5 w-4.5" />
            <span>{t.createBtn}</span>
          </button>
        )}
      </div>

      {/* Search */}
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

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mx-auto mb-3" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-semibold">{t.noData}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold tracking-wider">
                  <th className="px-6 py-4">{t.colCode}</th>
                  <th className="px-6 py-4">{t.colName}</th>
                  <th className="px-6 py-4 text-center">{t.colStatus}</th>
                  {user.role === 'admin' && <th className="px-6 py-4 text-center">{t.colAction}</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/40 text-slate-700 text-xs">
                    <td className="px-6 py-4 font-black text-[var(--color-primary)]">{d.dept_code}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-300" />
                      {d.dept_name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleActive(d)}
                        disabled={user.role !== 'admin'}
                        className={`px-2.5 py-1 text-[10px] font-black rounded-md tracking-wider ${
                          d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        } ${user.role === 'admin' ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        {d.is_active ? t.statusActive : t.statusInactive}
                      </button>
                    </td>
                    {user.role === 'admin' && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(d)}
                            className="p-1.5 text-slate-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-bg-light)] border border-transparent rounded-xl transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeptToDelete(d.id)}
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingDept ? t.modalEditTitle : t.modalCreateTitle}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.fieldCode}</label>
                <input
                  type="text"
                  value={form.dept_code}
                  onChange={(e) => setForm(prev => ({ ...prev, dept_code: e.target.value }))}
                  className="glass-input w-full text-sm font-semibold"
                  placeholder={lang === 'TH' ? 'เช่น D01' : 'e.g. D01'}
                  disabled={!!editingDept}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.fieldName}</label>
                <input
                  type="text"
                  value={form.dept_name}
                  onChange={(e) => setForm(prev => ({ ...prev, dept_name: e.target.value }))}
                  className="glass-input w-full text-sm font-semibold"
                  placeholder={lang === 'TH' ? 'เช่น ผกส.กฟส.ศรช.' : 'e.g. Operations Dept.'}
                  required
                />
              </div>

              {editingDept && (
                <div className="flex items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    id="dept_is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4.5 w-4.5 text-[var(--color-primary)] focus:ring-[var(--color-primary)] border-slate-300 rounded cursor-pointer"
                  />
                  <label htmlFor="dept_is_active" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                    {t.fieldStatus}
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="glass-btn-secondary text-sm font-bold">
                  {t.cancel}
                </button>
                <button type="submit" className="glass-btn-primary text-sm font-bold">
                  {t.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deptToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {lang === 'TH' ? 'ยืนยันการลบแผนก' : 'Confirm Deletion'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed px-2">{t.deleteConfirm}</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => setDeptToDelete(null)} className="glass-btn-secondary py-2 px-5 text-xs font-bold w-full">
                {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const id = deptToDelete;
                  setDeptToDelete(null);
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
