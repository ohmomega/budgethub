'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LayoutShell from '@/components/LayoutShell';
import { useApp } from '@/context/AppContext';
import { getTranslation } from '@/lib/translations';
import {
  Users,
  Plus,
  Key,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react';

export default function UsersAdminPage() {
  const { user: currentUser, showToast, language } = useApp();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [password, setPassword] = useState('');

  // Password reset field
  const [newPassword, setNewPassword] = useState('');

  const t = (key) => getTranslation(key, language);

  const getRoleTranslation = (role) => {
    switch (role) {
      case 'admin': return t('roleAdmin');
      case 'user': return t('roleUser');
      case 'viewer': return t('roleViewer');
      case 'deactivated': return t('roleDeactivated');
      default: return role;
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        // Sort by role priority: admin, user, viewer, deactivated
        const rolePriority = { admin: 0, user: 1, viewer: 2, deactivated: 3 };
        const sorted = [...data.users].sort((a, b) => {
          const pa = rolePriority[a.role] ?? 99;
          const pb = rolePriority[b.role] ?? 99;
          if (pa !== pb) return pa - pb;
          return a.username.localeCompare(b.username);
        });
        setUsers(sorted);
      } else {
        showToast(getTranslation('connectionError', language), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(getTranslation('connectionError', language), 'error');
    } finally {
      setLoading(false);
    }
  }, [language, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreateModal = () => {
    setUsername('');
    setEmail('');
    setRole('user');
    setPassword('');
    setCreateModalOpen(true);
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setResetModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      showToast(data.message || `${t('deleteUserTooltip')} ✓`, 'success');
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password || !role) {
      showToast(t('fillAllFields'), 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          role
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      showToast(`${t('createAccount')} "${username}" ✓`, 'success');
      setCreateModalOpen(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      showToast(t('fillAllFields'), 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      showToast(`${t('resetCredentials')} "${selectedUser.username}" ✓`, 'success');
      setResetModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDeactivate = async (user) => {
    if (user.id === currentUser?.id) {
      showToast(t('accessDenied'), 'error');
      return;
    }

    const nextRole = user.role === 'deactivated' ? 'user' : 'deactivated';
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole })
      });

      if (res.ok) {
        showToast(
          `"${user.username}" → ${nextRole === 'deactivated' ? t('deactivateTooltip') : t('reactivateTooltip')} ✓`,
          'success'
        );
        fetchUsers();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update user status');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center p-12 text-center select-none">
          <Users className="h-12 w-12 text-rose-500 mb-4" />
          <h1 className="text-xl font-bold text-text-primary">{t('accessDenied')}</h1>
          <p className="text-sm text-text-secondary mt-2">{t('adminOnlyPage')}</p>
        </div>
      </LayoutShell>
    );
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
      case 'user':
        return 'bg-primary-light text-primary border-primary-border';
      case 'viewer':
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700';
      case 'deactivated':
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <LayoutShell>
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {t('userAccounts')}
          </h1>
          <p className="text-sm text-text-secondary mt-1 font-medium">
            {t('userAccountsSubtitle')}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-shadow active:scale-[0.98] transition-all cursor-pointer w-fit"
        >
          <Plus className="h-4.5 w-4.5" />
          {t('createUser')}
        </button>
      </div>

      {/* Grid Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm font-medium text-text-secondary">{t('loadingUsers')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/30 text-text-secondary font-semibold text-xs border-b border-border uppercase select-none">
                  <th className="p-4 w-40">{t('usernameCol')}</th>
                  <th className="p-4">{t('emailCol')}</th>
                  <th className="p-4 w-36">{t('roleCol')}</th>
                  <th className="p-4 w-44">{t('lastActive')}</th>
                  <th className="p-4 w-44 text-center">{t('actionsColUsers')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-hover transition-colors">
                    <td className="p-4 font-bold text-text-primary">
                      {u.username}
                      {u.id === currentUser?.id && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[8px] font-bold uppercase rounded bg-primary-light border border-primary-border text-primary">
                          {t('youBadge')}
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-text-secondary">
                      {u.email}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getRoleBadgeColor(u.role)}`}>
                        {getRoleTranslation(u.role)}
                      </span>
                    </td>
                    <td className="p-4 text-text-secondary font-medium">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString(language === 'th' ? 'th-TH' : 'en-US') : t('neverLoggedIn')}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Password Reset */}
                        <button
                          onClick={() => openResetModal(u)}
                          className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                          title={t('resetPasswordTooltip')}
                        >
                          <Key className="h-4 w-4" />
                        </button>

                        {/* Delete User */}
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => openDeleteModal(u)}
                            className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted hover:text-rose-600 transition-colors cursor-pointer"
                            title={t('deleteUserTooltip')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="bg-primary-light text-primary p-2 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-primary">{t('createUserAccount')}</h3>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="p-5 space-y-4">

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">{t('usernameLabel')}</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="john_doe"
                    className="w-full p-2.5 rounded-xl border border-border bg-surface-hover focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all text-text-primary"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">{t('emailLabel')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full p-2.5 rounded-xl border border-border bg-surface-hover focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all text-text-primary"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">{t('roleLabel')}</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-border bg-surface-hover focus:border-primary outline-none text-sm transition-all text-text-primary cursor-pointer"
                  >
                    <option value="user">{t('userStandard')}</option>
                    <option value="viewer">{t('viewerReadonly')}</option>
                    <option value="admin">{t('adminFull')}</option>
                  </select>
                </div>

                {/* Temp Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">{t('tempPassword')}</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-shadow transition-colors cursor-pointer"
                >
                  {submitting ? t('creating') : t('createAccount')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="bg-primary-light text-primary p-2 rounded-xl">
                <Key className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-primary">{t('resetCredentials')}</h3>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="p-5 space-y-4">
                <p className="text-xs font-semibold text-text-secondary leading-relaxed">
                  {t('resetCredentialsFor')} <span className="font-bold text-text-primary">&quot;{selectedUser?.username}&quot;</span>
                </p>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">{t('newPasswordLabel')}</label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full p-2.5 rounded-xl border border-border bg-surface-hover focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all text-text-primary"
                  />
                </div>
              </div>

              <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 border border-border hover:bg-surface-hover rounded-xl text-xs font-semibold text-text-secondary transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-shadow transition-colors cursor-pointer"
                >
                  {submitting ? t('resetting') : t('confirmResetBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250 font-sans">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 p-2 rounded-xl">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-primary">{t('deleteAccountTitle')}</h3>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium text-text-secondary leading-relaxed font-sans">
                {t('deleteAccountConfirm')} <span className="font-bold text-text-primary">&quot;{userToDelete?.username}&quot;</span>?
                <span className="text-xs text-rose-600 font-semibold mt-2 block font-sans">
                  {t('deleteAccountNote')}
                </span>
              </p>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-border flex items-center justify-end gap-3 font-semibold">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 border border-border hover:bg-surface-hover rounded-xl text-xs text-text-secondary transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs shadow-md shadow-rose-600/10 transition-colors cursor-pointer"
              >
                {submitting ? t('deleting') : t('confirmDeleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

    </LayoutShell>
  );
}
