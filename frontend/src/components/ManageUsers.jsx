import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  Plus, 
  Search, 
  Key, 
  Trash2, 
  X, 
  ToggleLeft, 
  ToggleRight,
  Loader2,
  Check
} from 'lucide-react';

const dict = {
  TH: {
    title: 'บัญชีผู้ใช้งาน',
    subtitle: 'จัดการการเข้าถึงระบบ สร้างบัญชี รีเซ็ตรหัสผ่าน ระงับผู้ใช้',
    createBtn: 'สร้างผู้ใช้',
    searchPlaceholder: 'ค้นหาชื่อผู้ใช้หรือชื่อจริง...',
    colUsername: 'ชื่อผู้ใช้',
    colEmail: 'อีเมล',
    colRole: 'บทบาท',
    colLastLogin: 'เข้าใช้งานล่าสุด',
    colAction: 'จัดการ',
    youBadge: 'คุณ',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    roleAdmin: 'ผู้ดูแลระบบ',
    roleEditor: 'ผู้ใช้งาน',
    roleViewer: 'ผู้ชม',
    neverLoggedIn: 'ยังไม่เคยเข้าสู่ระบบ',
    deleteConfirm: 'คุณต้องการลบผู้ใช้งานนี้ใช่หรือไม่?',
    deleteSuccess: 'ลบผู้ใช้งานสำเร็จ',
    modalCreateTitle: 'สร้างผู้ใช้งานใหม่',
    modalPasswordTitle: 'เปลี่ยนรหัสผ่านใหม่',
    fieldUsername: 'ชื่อผู้ใช้ (Username)',
    fieldPassword: 'รหัสผ่าน (Password)',
    fieldFullName: 'ชื่อจริง - นามสกุล',
    fieldEmail: 'อีเมล (Email)',
    fieldRole: 'สิทธิ์การใช้งาน (Role)',
    fieldDept: 'แผนกที่สังกัด',
    cancel: 'ยกเลิก',
    submit: 'บันทึกข้อมูล',
    noData: 'ไม่พบข้อมูลผู้ใช้งาน'
  },
  EN: {
    title: 'User Accounts',
    subtitle: 'Manage system access. Create accounts, reset passwords, suspend users.',
    createBtn: 'Create User',
    searchPlaceholder: 'Search by username or name...',
    colUsername: 'Username',
    colEmail: 'Email',
    colRole: 'Role',
    colLastLogin: 'Last Login',
    colAction: 'Actions',
    youBadge: 'You',
    statusActive: 'Active',
    statusInactive: 'Inactive',
    roleAdmin: 'Admin',
    roleEditor: 'Editor',
    roleViewer: 'Viewer',
    neverLoggedIn: 'Never logged in',
    deleteConfirm: 'Are you sure you want to delete this user?',
    deleteSuccess: 'User deleted successfully',
    modalCreateTitle: 'Create New User',
    modalPasswordTitle: 'Reset Password',
    fieldUsername: 'Username',
    fieldPassword: 'Password',
    fieldFullName: 'Full Name',
    fieldEmail: 'Email Address',
    fieldRole: 'Role',
    fieldDept: 'Department',
    cancel: 'Cancel',
    submit: 'Save Info',
    noData: 'No users found'
  }
};

export default function ManageUsers({ user: currentUser, lang }) {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'editor',
    department_id: ''
  });
  const [newPassword, setNewPassword] = useState('');

  const t = dict[lang];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
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
    fetchUsers();
    fetchDepts();
  }, []);

  const handleOpenCreate = () => {
    setNewUser({
      username: '',
      password: '',
      full_name: '',
      email: '',
      role: 'editor',
      department_id: departments.length > 0 ? departments[0].id : ''
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.full_name) return;

    try {
      const payload = { ...newUser };
      if (payload.role !== 'editor') {
        delete payload.department_id;
      }
      if (!payload.email) {
        payload.email = `${payload.username}@budgethub.com`;
      }
      await api.post('/auth/register', payload);
      setShowCreateModal(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'เกิดข้อผิดพลาดในการลงทะเบียน');
    }
  };

  const handleOpenResetPassword = (userItem) => {
    setSelectedUser(userItem);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) return;

    try {
      await api.patch(`/auth/users/${selectedUser.id}`, { password: newPassword });
      setShowPasswordModal(false);
      alert(lang === 'TH' ? 'เปลี่ยนรหัสผ่านสำเร็จ' : 'Password updated successfully');
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเปลี่ยนรหัสผ่านได้');
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/auth/users/${id}`);
      setUsers(prev => prev.filter(u => u.id !== id));
      alert(t.deleteSuccess);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'ไม่สามารถลบผู้ใช้นี้ได้');
    }
  };

  const handleToggleActive = async (userItem) => {
    if (currentUser.id === userItem.id) return;
    try {
      const newStatus = !userItem.is_active;
      await api.patch(`/auth/users/${userItem.id}`, { is_active: newStatus });
      setUsers(prev => prev.map(u => u.id === userItem.id ? { ...u, is_active: newStatus } : u));
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleLabel = (role) => {
    if (role === 'admin') return t.roleAdmin;
    if (role === 'editor') return t.roleEditor;
    return t.roleViewer;
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
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

        <button
          onClick={handleOpenCreate}
          className="glass-btn-primary py-2.5 self-start md:self-center"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>{t.createBtn}</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
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

      {/* Users List Grid Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mx-auto mb-3" />
            <span>กำลังโหลดรายชื่อผู้ใช้...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm font-semibold">
            {t.noData}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold tracking-wider">
                  <th className="px-6 py-4">{t.colUsername}</th>
                  <th className="px-6 py-4">{t.colEmail}</th>
                  <th className="px-6 py-4">{t.colRole}</th>
                  <th className="px-6 py-4">{t.colLastLogin}</th>
                  <th className="px-6 py-4 text-center">{t.colAction}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const isYou = currentUser.id === u.id;
                  return (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/40 text-slate-700 text-xs">
                      <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                        <span>{u.username}</span>
                        {isYou && (
                          <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-600 text-[9px] font-black rounded uppercase">
                            {t.youBadge}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5 font-sans">
                          {u.full_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-sans">{u.email || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-md tracking-wider ${
                          u.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                          u.role === 'editor' ? 'bg-teal-100 text-teal-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {getRoleLabel(u.role)}
                          {u.role === 'editor' && u.dept_name ? ` (${u.dept_name})` : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {u.last_login_at 
                          ? new Date(u.last_login_at).toLocaleString('th-TH') 
                          : t.neverLoggedIn}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Toggle Active status */}
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={isYou}
                            className={`p-1 text-slate-400 hover:text-[var(--color-primary)] disabled:opacity-30 ${
                              isYou ? 'cursor-default' : 'cursor-pointer'
                            }`}
                            title={u.is_active ? 'Active' : 'Inactive'}
                          >
                            {u.is_active ? (
                              <ToggleRight className="h-6 w-6 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="h-6 w-6 text-slate-350" />
                            )}
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => handleOpenResetPassword(u)}
                            className="p-1.5 text-slate-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-bg-light)] border border-transparent rounded-xl transition cursor-pointer"
                            title="Reset password"
                          >
                            <Key className="h-4 w-4" />
                          </button>

                          {/* Delete user */}
                          <button
                            onClick={() => setUserToDelete(u.id)}
                            disabled={isYou}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition disabled:opacity-30 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Modal: Create User */}
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

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.fieldUsername}
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  className="glass-input w-full text-sm font-semibold"
                  placeholder="เช่น user_ppb"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.fieldPassword}
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="glass-input w-full text-sm font-semibold"
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.fieldFullName}
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  className="glass-input w-full text-sm font-semibold"
                  placeholder="เช่น สมชาย ใจดี"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.fieldEmail}
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="glass-input w-full text-sm font-semibold"
                  placeholder="เช่น somchai@budgethub.com"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.fieldRole}
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                  <option value="admin">{t.roleAdmin}</option>
                  <option value="editor">{t.roleEditor}</option>
                  <option value="viewer">{t.roleViewer}</option>
                </select>
              </div>

              {/* Department (Only for Editor role) */}
              {newUser.role === 'editor' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    {t.fieldDept}
                  </label>
                  <select
                    value={newUser.department_id}
                    onChange={(e) => setNewUser(prev => ({ ...prev, department_id: e.target.value }))}
                    className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.dept_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
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

      {/* Modal: Reset Password */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[28px] p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <h3 className="font-extrabold text-slate-900 text-base">
                {t.modalPasswordTitle} ({selectedUser?.username})
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  {t.fieldPassword}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="glass-input w-full text-sm font-semibold"
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
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
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {lang === 'TH' ? 'ยืนยันการลบผู้ใช้งาน' : 'Confirm Deletion'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed px-2">
                {t.deleteConfirm}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="glass-btn-secondary py-2 px-5 text-xs font-bold w-full"
              >
                {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  const id = userToDelete;
                  setUserToDelete(null);
                  await handleDeleteUser(id);
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
