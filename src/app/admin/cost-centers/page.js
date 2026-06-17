'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LayoutShell from '@/components/LayoutShell';
import { useApp } from '@/context/AppContext';
import { getTranslation } from '@/lib/translations';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';

export default function CostCentersAdminPage() {
  const { user, showToast, language } = useApp();

  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ccToDelete, setCcToDelete] = useState(null);

  const t = (key) => getTranslation(key, language);

  const fetchCostCenters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cost-centers');
      if (res.ok) {
        const data = await res.json();
        setCostCenters(data.costCenters);
      } else {
        showToast(getTranslation('ccLoading', language), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(getTranslation('connectionError', language), 'error');
    } finally {
      setLoading(false);
    }
  }, [language, showToast]);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const isCodeDuplicate = () => {
    if (!code.trim()) return false;
    return costCenters.some(cc => cc.code.toLowerCase() === code.trim().toLowerCase() && cc.id !== selectedId);
  };

  const isCodeFormatInvalid = () => {
    if (!code.trim()) return false;
    return !/^[a-zA-Z0-9_-]+$/.test(code);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setSelectedId(null);
    setCode('');
    setName('');
    setDescription('');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (cc) => {
    setIsEditing(true);
    setSelectedId(cc.id);
    setCode(cc.code);
    setName(cc.name);
    setDescription(cc.description || '');
    setIsActive(cc.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      showToast(t('ccCodeFormatWarn'), 'error');
      return;
    }
    if (isCodeDuplicate()) {
      showToast(t('ccDuplicateWarn'), 'error');
      return;
    }

    try {
      setSubmitting(true);
      const url = isEditing ? `/api/cost-centers/${selectedId}` : '/api/cost-centers';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim(),
          description: description.trim(),
          isActive
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (language === 'th' ? 'ไม่สามารถบันทึกข้อมูลศูนย์ต้นทุนได้' : 'Failed to save Cost Center'));
      }

      showToast(
        isEditing
          ? `${t('ccModify')} ${code} ✓`
          : `${t('ccCreate')} ${code} ✓`,
        'success'
      );

      setModalOpen(false);
      fetchCostCenters();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cc) => {
    try {
      const res = await fetch(`/api/cost-centers/${cc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cc.isActive })
      });

      if (res.ok) {
        showToast(`${cc.code} → ${!cc.isActive ? t('ccActive') : t('ccInactive')}`, 'success');
        fetchCostCenters();
      } else {
        const data = await res.json();
        throw new Error(data.error || (language === 'th' ? 'ไม่สามารถเปลี่ยนสถานะได้' : 'Failed to toggle status'));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const triggerDelete = (cc) => {
    setCcToDelete(cc);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!ccToDelete) return;
    try {
      const res = await fetch(`/api/cost-centers/${ccToDelete.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `${ccToDelete.code} ${language === 'th' ? 'ถูกลบแล้ว' : 'deleted'}`, 'success');
        setDeleteConfirmOpen(false);
        setCcToDelete(null);
        fetchCostCenters();
      } else {
        throw new Error(data.error || (language === 'th' ? 'การลบล้มเหลว' : 'Delete failed'));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (user && user.role !== 'admin') {
    return (
      <LayoutShell>
        <div className="flex flex-col items-center justify-center p-12 text-center select-none">
          <Building2 className="h-12 w-12 text-rose-500 mb-4" />
          <h1 className="text-xl font-bold text-text-primary">{t('ccAccessDenied')}</h1>
          <p className="text-sm text-text-secondary mt-2">{t('ccAdminOnly')}</p>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {t('ccRegistryTitle')}
          </h1>
          <p className="text-sm text-text-secondary mt-1 font-medium">
            {t('ccRegistrySubtitle')}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-shadow active:scale-[0.98] transition-all cursor-pointer w-fit"
        >
          <Plus className="h-4.5 w-4.5" />
          {t('ccCreateBtn')}
        </button>
      </div>

      {/* Grid Table */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm font-medium text-text-secondary">{t('ccLoading')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/30 text-text-secondary font-semibold text-xs border-b border-border uppercase select-none">
                  <th className="p-4 w-36">{t('ccCodeCol')}</th>
                  <th className="p-4 w-52">{t('ccNameCol')}</th>
                  <th className="p-4">{t('ccDescCol')}</th>
                  <th className="p-4 w-28 text-center">{t('ccTransactionsCol')}</th>
                  <th className="p-4 w-44">{t('ccLastModified')}</th>
                  <th className="p-4 w-32 text-center">{t('ccStatusCol')}</th>
                  <th className="p-4 w-36 text-center">{t('ccActionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {costCenters.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center font-medium text-text-muted">
                      {t('ccEmpty')}
                    </td>
                  </tr>
                ) : (
                  costCenters.map((cc) => (
                    <tr key={cc.id} className="hover:bg-surface-hover transition-colors">
                      <td className="p-4 font-bold text-primary font-mono">
                        {cc.code}
                      </td>
                      <td className="p-4 font-semibold text-text-primary">
                        {cc.name}
                      </td>
                      <td className="p-4 text-text-secondary font-medium max-w-xs truncate">
                        {cc.description || '-'}
                      </td>
                      <td className="p-4 text-center font-semibold text-text-secondary font-mono text-xs">
                        {cc._count?.transactions || 0}
                      </td>
                      <td className="p-4 text-text-secondary font-medium">
                        {cc.updatedAt ? new Date(cc.updatedAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-US') : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleActive(cc)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95 cursor-pointer ${cc.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-300 dark:border-emerald-900/50'
                            : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/25 dark:text-rose-300 dark:border-rose-900/50'
                            }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cc.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {cc.isActive ? t('ccActive') : t('ccInactive')}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(cc)}
                            className="p-1.5 hover:bg-surface-hover rounded-lg text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                            title={t('ccEditTooltip')}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => triggerDelete(cc)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-text-muted hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title={t('ccDeleteTooltip')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="bg-primary-light text-primary p-2 rounded-xl">
                <Building2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-primary">
                {isEditing ? t('ccModify') : t('ccCreate')}
              </h3>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-4">

                {/* Code field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">{t('ccCodeLabel')}</label>
                  {isEditing ? (
                    <div className="w-full p-2.5 rounded-xl border border-border bg-slate-100 dark:bg-slate-800 text-sm font-bold text-text-secondary font-mono select-all">
                      {code}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder={t('ccCodePlaceholder')}
                        className={`w-full p-2.5 rounded-xl border bg-surface-hover focus:bg-surface focus:ring-1 focus:ring-primary outline-none text-sm transition-all text-text-primary ${isCodeDuplicate()
                          ? 'border-rose-500 focus:border-rose-500'
                          : 'border-border focus:border-primary'
                          }`}
                      />
                      {isCodeFormatInvalid() && (
                        <p className="text-[10px] text-amber-505 font-semibold">
                          {t('ccCodeFormatWarn')}
                        </p>
                      )}
                      {isCodeDuplicate() && (
                        <p className="text-[10px] text-rose-500 font-semibold">
                          {t('ccDuplicateWarn')}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Name field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">{t('ccNameLabel')}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('ccNamePlaceholder')}
                    className="w-full p-2.5 rounded-xl border border-border bg-surface-hover focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all text-text-primary"
                  />
                </div>

                {/* Description field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary">{t('ccDescLabel')}</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('ccDescPlaceholder')}
                    rows="3"
                    className="w-full p-2.5 rounded-xl border border-border bg-surface-hover focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all text-text-primary resize-none"
                  ></textarea>
                </div>

                {/* Status Toggle */}
                <div className="flex items-center gap-3 select-none">
                  <input
                    id="isActiveCheck"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4.5 w-4.5 accent-primary border border-border rounded"
                  />
                  <label htmlFor="isActiveCheck" className="text-xs font-semibold text-text-secondary">
                    {t('ccMarkActive')}
                  </label>
                </div>

              </div>

              <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-border hover:bg-surface-hover rounded-xl text-xs font-semibold text-text-secondary transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || isCodeDuplicate()}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-shadow transition-colors cursor-pointer"
                >
                  {submitting ? t('ccSaving') : t('ccSaveChanges')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 p-2 rounded-xl">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-text-primary">{t('ccDeleteTitle')}</h3>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium text-text-secondary leading-relaxed">
                {t('ccDeleteConfirm')} <span className="font-bold text-text-primary">{ccToDelete?.code}</span>?
                <br />
                {ccToDelete?.isActive ? (
                  <span className="text-xs text-rose-500 font-bold mt-3 block p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl">
                    ⚠️ {t('ccActiveDeleteWarning')}
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 font-semibold mt-2 block">
                    {t('ccDeleteWarning')}
                  </span>
                )}
              </p>
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-800/30 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 border border-border hover:bg-surface-hover rounded-xl text-xs font-semibold text-text-secondary transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/10 transition-colors cursor-pointer"
              >
                {t('ccConfirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </LayoutShell>
  );
}
