import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Users, Layers, ScrollText, Plus, UserPlus, ToggleLeft, ToggleRight,
  Edit3, Eye, Loader2, AlertCircle, Check, HelpCircle
} from 'lucide-react';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'depts', 'audit'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data states
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Form states
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'editor',
    department_id: ''
  });

  const [newDept, setNewDept] = useState({
    dept_code: '',
    dept_name: ''
  });

  // Fetch admin data
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Fetch users error:', err);
      setErrorMsg('ไม่สามารถโหลดข้อมูลผู้ใช้งานได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Fetch depts error:', err);
      setErrorMsg('ไม่สามารถโหลดข้อมูลแผนกได้');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit-logs');
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Fetch audit logs error:', err);
      setErrorMsg('ไม่สามารถโหลดประวัติการใช้งานได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
      fetchDepts();
    } else if (activeTab === 'depts') {
      fetchDepts();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Handle create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      setErrorMsg('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const payload = { ...newUser };
      if (payload.role === 'admin' || payload.role === 'viewer') {
        delete payload.department_id; // no dept for admin/viewer
      }
      await api.post('/auth/register', payload);
      setSuccessMsg('สร้างผู้ใช้งานสำเร็จแล้ว!');
      setNewUser({ username: '', password: '', full_name: '', role: 'editor', department_id: '' });
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Create user error:', err);
      setErrorMsg(err.response?.data?.error || 'เกิดข้อผิดพลาดในการลงทะเบียน');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Handle toggle user active status
  const handleToggleUserStatus = async (userItem) => {
    try {
      await api.patch(`/auth/users/${userItem.id}`, {
        is_active: !userItem.is_active
      });
      setUsers(prev => prev.map(u => u.id === userItem.id ? { ...u, is_active: !u.is_active } : u));
      setSuccessMsg('อัปเดตสถานะผู้ใช้งานสำเร็จ');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      console.error('Toggle status error:', err);
      setErrorMsg('ไม่สามารถเปลี่ยนสถานะได้');
    }
  };

  // Handle create department
  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDept.dept_code || !newDept.dept_name) {
      setErrorMsg('กรุณากรอกรหัสแผนกและชื่อแผนก');
      return;
    }

    try {
      await api.post('/departments', newDept);
      setSuccessMsg('สร้างแผนกสำเร็จแล้ว!');
      setNewDept({ dept_code: '', dept_name: '' });
      fetchDepts();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Create dept error:', err);
      setErrorMsg(err.response?.data?.error || 'ไม่สามารถสร้างแผนกได้');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Formatter for logs
  const renderValueDiff = (log) => {
    if (log.action_type === 'create') {
      const val = log.new_value || {};
      return (
        <span className="text-emerald-400">
          สร้างรายการ: "{val.item_name}" จำนวนเงิน: {parseFloat(val.amount).toLocaleString()}
        </span>
      );
    }
    if (log.action_type === 'delete') {
      const val = log.old_value || {};
      return (
        <span className="text-rose-400">
          ลบรายการ: "{val.item_name}"
        </span>
      );
    }
    if (log.action_type === 'update') {
      const oldVal = log.old_value || {};
      const newVal = log.new_value || {};

      const changes = [];
      if (oldVal.item_name !== newVal.item_name) changes.push(`ชื่อรายการ: "${oldVal.item_name}" -> "${newVal.item_name}"`);
      if (parseFloat(oldVal.amount) !== parseFloat(newVal.amount)) changes.push(`เงิน: ${parseFloat(oldVal.amount).toLocaleString()} -> ${parseFloat(newVal.amount).toLocaleString()}`);
      if (oldVal.account_code !== newVal.account_code) changes.push(`รหัสบัญชี: "${oldVal.account_code || '-'}" -> "${newVal.account_code || '-'}"`);
      if (oldVal.cost_center_id !== newVal.cost_center_id) changes.push(`ศูนย์ต้นทุนถูกเปลี่ยน`);

      return (
        <div className="text-xs space-y-0.5 text-purple-300">
          {changes.map((c, i) => <div key={i}>• {c}</div>)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

      {/* Sidebar Tabs */}
      <div className="xl:col-span-1 space-y-2">
        <button
          onClick={() => { setActiveTab('users'); setErrorMsg(''); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition ${activeTab === 'users' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25' : 'bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
        >
          <Users className="h-5 w-5" />
          <span>จัดการผู้ใช้งาน (Users)</span>
        </button>

        <button
          onClick={() => { setActiveTab('depts'); setErrorMsg(''); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition ${activeTab === 'depts' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25' : 'bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
        >
          <Layers className="h-5 w-5" />
          <span>จัดการแผนก (Master Data)</span>
        </button>

        <button
          onClick={() => { setActiveTab('audit'); setErrorMsg(''); }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition ${activeTab === 'audit' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25' : 'bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
        >
          <ScrollText className="h-5 w-5" />
          <span>ประวัติกิจกรรม (Audit Logs)</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="xl:col-span-3 space-y-6">

        {/* Messages */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-800/80 text-red-200 text-sm rounded-xl p-4 flex items-center gap-2 shadow-md">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-sm rounded-xl p-4 flex items-center gap-2 shadow-md">
            <Check className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Users Management */}
        {activeTab === 'users' && (
          <div className="space-y-6">

            {/* Create User Form */}
            <div className="glass-panel border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-400" />
                <span>สร้างบัญชีผู้ใช้งานใหม่</span>
              </h3>

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="flex flex-col md:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5">ชื่อผู้ใช้ (Username)</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    className="glass-input text-sm"
                    placeholder="เช่น user_ppb"
                  />
                </div>

                <div className="flex flex-col md:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5">รหัสผ่าน (Password)</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="glass-input text-sm"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex flex-col md:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5">ชื่อ-นามสกุลจริง</label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                    className="glass-input text-sm"
                    placeholder="สมชาย ใจดี"
                  />
                </div>

                <div className="flex flex-col md:col-span-1">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5">สิทธิ์การใช้งาน (Role)</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="glass-input text-sm bg-slate-950/70"
                  >
                    <option value="admin" className="bg-slate-900">Admin</option>
                    <option value="editor" className="bg-slate-900">Editor</option>
                    <option value="viewer" className="bg-slate-900">Viewer</option>
                  </select>
                </div>

                {newUser.role === 'editor' ? (
                  <div className="flex flex-col md:col-span-1">
                    <label className="text-xs font-semibold text-slate-400 mb-1.5">แผนกที่สังกัด</label>
                    <select
                      value={newUser.department_id}
                      onChange={(e) => setNewUser(prev => ({ ...prev, department_id: e.target.value }))}
                      className="glass-input text-sm bg-slate-950/70"
                    >
                      <option value="" className="bg-slate-900">-- เลือกแผนก --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id} className="bg-slate-900">{d.dept_name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="md:col-span-1">
                    <button type="submit" className="glass-btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-1.5">
                      <Plus className="h-4 w-4" />
                      <span>สร้างผู้ใช้</span>
                    </button>
                  </div>
                )}

                {newUser.role === 'editor' && (
                  <div className="md:col-span-5 flex justify-end mt-2">
                    <button type="submit" className="glass-btn-primary w-fit px-8 py-2.5 text-sm flex items-center justify-center gap-1.5">
                      <Plus className="h-4 w-4" />
                      <span>สร้างผู้ใช้</span>
                    </button>
                  </div>
                )}
              </form>
            </div>

            {/* Users List Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl glass-panel">
              <div className="p-4 border-b border-slate-800">
                <span className="font-bold text-slate-100">บัญชีผู้ใช้งานทั้งหมด</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-850 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                      <th className="px-5 py-3">ชื่อผู้ใช้ (Username)</th>
                      <th className="px-5 py-3">ชื่อจริง</th>
                      <th className="px-5 py-3">สิทธิ์</th>
                      <th className="px-5 py-3">แผนกที่ผูก</th>
                      <th className="px-5 py-3 text-center">สถานะ</th>
                      <th className="px-5 py-3 text-center">เปิด/ปิด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                          กำลังโหลดรายชื่อผู้ใช้...
                        </td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-800/20 border-b border-slate-800/50">
                          <td className="px-5 py-3.5 font-semibold text-slate-200">{u.username}</td>
                          <td className="px-5 py-3.5 text-slate-300">{u.full_name}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                                u.role === 'editor' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                                  'bg-slate-850 text-slate-400 border border-slate-700'
                              }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{u.dept_name || '-'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950/60 text-red-400'
                              }`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className="text-slate-400 hover:text-slate-200 transition"
                            >
                              {u.is_active ? (
                                <ToggleRight className="h-6 w-6 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="h-6 w-6 text-slate-600" />
                              )}
                            </button>
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

        {/* Tab 2: Departments Management */}
        {activeTab === 'depts' && (
          <div className="space-y-6">

            {/* Create Dept Form */}
            <div className="glass-panel border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-400" />
                <span>เพิ่มแผนกบริการ (Master Department)</span>
              </h3>

              <form onSubmit={handleCreateDept} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5">รหัสย่อแผนก (เช่น D06)</label>
                  <input
                    type="text"
                    value={newDept.dept_code}
                    onChange={(e) => setNewDept(prev => ({ ...prev, dept_code: e.target.value }))}
                    className="glass-input text-sm"
                    placeholder="D06"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-slate-400 mb-1.5">ชื่อเต็มแผนก (เช่น แผนกการเงิน)</label>
                  <input
                    type="text"
                    value={newDept.dept_name}
                    onChange={(e) => setNewDept(prev => ({ ...prev, dept_name: e.target.value }))}
                    className="glass-input text-sm"
                    placeholder="ผกบ.กฟส.ศรช."
                  />
                </div>

                <div>
                  <button type="submit" className="glass-btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มแผนกใหม่</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Departments List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl glass-panel">
              <div className="p-4 border-b border-slate-800">
                <span className="font-bold text-slate-100">แผนกทั้งหมดในระบบ</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-850 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                      <th className="px-5 py-3">รหัสแผนก</th>
                      <th className="px-5 py-3">ชื่อแผนก</th>
                      <th className="px-5 py-3">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-12 text-center text-slate-500">
                          กำลังโหลดข้อมูลแผนก...
                        </td>
                      </tr>
                    ) : (
                      departments.map(d => (
                        <tr key={d.id} className="hover:bg-slate-800/20 border-b border-slate-800/50">
                          <td className="px-5 py-3.5 font-bold text-purple-400">{d.dept_code}</td>
                          <td className="px-5 py-3.5 text-slate-200 font-semibold">{d.dept_name}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${d.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950/60 text-red-400'
                              }`}>
                              {d.is_active ? 'Active' : 'Inactive'}
                            </span>
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

        {/* Tab 3: Audit Logs */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl glass-panel">
            <div className="p-4 border-b border-slate-800">
              <span className="font-bold text-slate-100">ประวัติบันทึกการแก้ไขงบประมาณ (Audit Logs - ล่าสุด 100 รายการ)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-850 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="px-5 py-3 w-[15%]">เวลา</th>
                    <th className="px-5 py-3 w-[15%]">ผู้ปฏิบัติการ</th>
                    <th className="px-5 py-3 w-[12%]">ประเภทการทำงาน</th>
                    <th className="px-5 py-3 w-[58%]">รายละเอียดการเปลี่ยนแปลง</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                        กำลังประมวลผลประวัติกิจกรรม...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                        ยังไม่มีประวัติการทำกิจกรรมในระบบ
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-800/10 border-b border-slate-800/30 text-xs">
                        <td className="px-5 py-3 text-slate-400">
                          {new Date(log.action_at).toLocaleString('th-TH')}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-300">
                          {log.full_name} ({log.username})
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.action_type === 'create' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' :
                              log.action_type === 'delete' ? 'bg-red-950 text-red-300 border border-red-800/40' :
                                'bg-purple-950 text-purple-300 border border-purple-800/40'
                            }`}>
                            {log.action_type === 'create' ? 'เพิ่มแถว' : log.action_type === 'delete' ? 'ลบแถว' : 'แก้ไข'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium">
                          {renderValueDiff(log)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
