import React, { useRef, useState } from 'react';
import api, { downloadBlob } from '../api';
import { showAlert } from '../showAlert';
import {
  DatabaseBackup,
  Download,
  Upload,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

const dict = {
  TH: {
    title: 'สำรอง & กู้คืนข้อมูล',
    subtitle: 'เก็บสำเนาข้อมูลงบประมาณทั้งหมดไว้กันลืม หรือกู้คืนจากไฟล์ที่เคยสำรองไว้',

    exportTitle: 'สำรองข้อมูล',
    exportDesc: 'ดาวน์โหลดสำเนาฐานข้อมูลทั้งหมด (ทุกแผนก ทุกแผ่นงบประมาณ) เป็นไฟล์เดียวที่เข้ารหัสไว้ ไฟล์จะถูกบันทึกไว้ที่โฟลเดอร์ดาวน์โหลด (Downloads) ของเครื่องคุณ จากนั้นสามารถย้าย/คัดลอกไปเก็บที่อื่นได้ตามปกติ เช่น ไดรฟ์ภายนอก',
    exportBtn: 'ดาวน์โหลดไฟล์สำรองข้อมูล',
    exportHint: 'ไฟล์จะถูกบันทึกในโฟลเดอร์ดาวน์โหลด (Downloads) โดยอัตโนมัติ',
    exportFailed: 'ไม่สามารถสร้างไฟล์สำรองข้อมูลได้',
    exportSuccess: 'สร้างไฟล์สำรองข้อมูลสำเร็จ บันทึกไว้ในโฟลเดอร์ดาวน์โหลด (Downloads) แล้ว คุณสามารถย้ายไปเก็บที่อื่นได้ตามต้องการ',

    restoreTitle: 'กู้คืนข้อมูล',
    restoreDesc: 'เลือกไฟล์ .bhbackup ที่เคยสำรองไว้ ระบบจะตรวจสอบว่าไฟล์ไม่ถูกแก้ไขก่อนกู้คืนเสมอ ระบบจะรับเฉพาะไฟล์ .bhbackup ของ BudgetHub เท่านั้น ไฟล์ประเภทอื่นจะถูกปฏิเสธ',
    restoreBtn: 'เลือกไฟล์เพื่อกู้คืน',
    restoring: 'กำลังกู้คืนข้อมูล...',
    restartNote: 'เมื่อกู้คืนสำเร็จ โปรแกรมจะปิดและเปิดใหม่โดยอัตโนมัติ',
    restartNoteManual: 'กู้คืนสำเร็จ กรุณาปิดและเปิดโปรแกรมใหม่ด้วยตนเอง',

    confirmTitle: 'ยืนยันการกู้คืนข้อมูล',
    confirmBody: 'การกู้คืนจะแทนที่ข้อมูลปัจจุบันทั้งหมดด้วยข้อมูลจากไฟล์ที่เลือก และไม่สามารถย้อนกลับได้\n\nไฟล์: ',
    confirmCancel: 'ยกเลิก',
    confirmProceed: 'ยืนยันกู้คืนข้อมูล',

    securityTitle: 'ความปลอดภัยของไฟล์สำรองข้อมูล',
    securityDesc: 'ไฟล์สำรองข้อมูลถูกเข้ารหัสและมีลายเซ็นตรวจสอบความถูกต้องในตัว หากไฟล์ถูกแก้ไขไม่ว่าจะโดยตั้งใจหรือเสียหายระหว่างการเก็บ/ส่งไฟล์ ระบบจะตรวจพบและปฏิเสธการกู้คืนทันที เพื่อป้องกันไม่ให้ข้อมูลที่ถูกแก้ไขจากภายนอกเข้ามาแทนที่ข้อมูลจริง',

    errors: {
      INVALID_FORMAT: 'ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลของ BudgetHub (.bhbackup)',
      TAMPERED: 'ไฟล์นี้ถูกแก้ไขหรือเสียหาย ไม่สามารถกู้คืนได้เพื่อความปลอดภัยของข้อมูล',
      INVALID_DB: 'ไฟล์นี้ไม่ใช่ฐานข้อมูลที่ถูกต้อง',
      NOT_BUDGETHUB: 'ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลของ BudgetHub',
      INTEGRITY_FAILED: 'ไฟล์ฐานข้อมูลไม่ผ่านการตรวจสอบความถูกต้อง',
      EMPTY: 'ไม่พบไฟล์ที่เลือก',
      default: 'ไม่สามารถกู้คืนข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
    }
  },
  EN: {
    title: 'Backup & Restore',
    subtitle: 'Keep a copy of all your budget data, or restore from a file you saved earlier.',

    exportTitle: 'Backup',
    exportDesc: 'Download a single encrypted file containing all departments and budget sheets. It saves to your Downloads folder, then you can move or copy it anywhere else — an external drive, for example.',
    exportBtn: 'Download Backup File',
    exportHint: 'The file is saved to your Downloads folder automatically.',
    exportFailed: 'Could not create the backup file',
    exportSuccess: 'Backup file created and saved to your Downloads folder. You can move it anywhere you like.',

    restoreTitle: 'Restore',
    restoreDesc: 'Pick a .bhbackup file you saved earlier. The file is always checked for tampering before anything is restored — only genuine BudgetHub .bhbackup files are accepted, any other file type is rejected.',
    restoreBtn: 'Choose File to Restore',
    restoring: 'Restoring data...',
    restartNote: 'Once restored, the app will close and reopen automatically.',
    restartNoteManual: 'Restore complete. Please close and reopen the app manually.',

    confirmTitle: 'Confirm Data Restore',
    confirmBody: 'Restoring will replace ALL current data with the data from the selected file, and this cannot be undone.\n\nFile: ',
    confirmCancel: 'Cancel',
    confirmProceed: 'Yes, Restore Data',

    securityTitle: 'How backup files stay safe',
    securityDesc: "Backup files are encrypted and self-verifying. If a file is edited — on purpose or by accidental corruption while copying/storing it — restoring it is detected and blocked automatically, so tampered data can never silently replace your real data.",

    errors: {
      INVALID_FORMAT: 'This is not a BudgetHub backup file (.bhbackup)',
      TAMPERED: 'This file has been modified or corrupted and cannot be restored, to protect your data',
      INVALID_DB: 'This file is not a valid database',
      NOT_BUDGETHUB: 'This is not a BudgetHub backup file',
      INTEGRITY_FAILED: 'The database file failed its integrity check',
      EMPTY: 'No file was selected',
      default: 'Could not restore the data. Please try again.'
    }
  }
};

export default function BackupRestore({ lang }) {
  const t = dict[lang];
  const fileInputRef = useRef(null);

  const [exporting, setExporting] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // File selected, awaiting confirmation
  const [restoring, setRestoring] = useState(false);
  const [restoreDone, setRestoreDone] = useState(null); // { restarting: bool } once successful

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/backup/export', { responseType: 'blob' });
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(res.data, `BudgetHub_backup_${stamp}.bhbackup`);
      showAlert(t.exportSuccess);
    } catch (err) {
      console.error('Backup export failed:', err);
      showAlert(t.exportFailed);
    } finally {
      setExporting(false);
    }
  };

  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setPendingFile(file);
  };

  const handleConfirmRestore = async () => {
    const file = pendingFile;
    setPendingFile(null);
    if (!file) return;

    setRestoring(true);
    try {
      const buf = await file.arrayBuffer();
      const res = await api.post('/backup/restore', buf, {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
      setRestoreDone({ restarting: !!res.data.restarting });
    } catch (err) {
      console.error('Backup restore failed:', err);
      const code = err.response?.data?.code;
      const message = (code && t.errors[code]) || err.response?.data?.error || t.errors.default;
      showAlert(message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <DatabaseBackup className="h-6 w-6 text-[var(--color-primary)]" />
          {t.title}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="h-12 w-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600">
            <Download className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">{t.exportTitle}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">{t.exportDesc}</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="glass-btn-primary py-2.5 w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exporting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Download className="h-4.5 w-4.5" />}
            <span>{t.exportBtn}</span>
          </button>
          <p className="text-[11px] text-slate-400 font-semibold text-center">{t.exportHint}</p>
        </div>

        {/* Restore */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">{t.restoreTitle}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">{t.restoreDesc}</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".bhbackup"
            onChange={handlePickFile}
            className="hidden"
          />

          {restoring ? (
            <div className="glass-btn-secondary py-2.5 w-full opacity-70 cursor-not-allowed justify-center">
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              <span>{t.restoring}</span>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="glass-btn-secondary py-2.5 w-full"
            >
              <Upload className="h-4.5 w-4.5" />
              <span>{t.restoreBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Security explainer */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-start gap-4">
        <div className="h-11 w-11 bg-[var(--color-primary-bg-light)] rounded-2xl flex items-center justify-center text-[var(--color-primary)] shrink-0">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm">{t.securityTitle}</h3>
          <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">{t.securityDesc}</p>
        </div>
      </div>

      {/* Confirm-restore modal */}
      {pendingFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-md shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">{t.confirmTitle}</h3>
              <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed whitespace-pre-line px-2">
                {t.confirmBody}
                <span className="font-bold text-slate-700">{pendingFile.name}</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPendingFile(null)}
                className="glass-btn-secondary py-2 px-5 text-xs font-bold w-full"
              >
                {t.confirmCancel}
              </button>
              <button
                onClick={handleConfirmRestore}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition w-full"
              >
                {t.confirmProceed}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-restore status modal */}
      {restoreDone && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 w-full max-w-sm shadow-2xl animate-scale-in text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800 leading-relaxed">
              {restoreDone.restarting ? t.restartNote : t.restartNoteManual}
            </p>
            {restoreDone.restarting && (
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!restoreDone.restarting && (
              <button
                onClick={() => setRestoreDone(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition w-full"
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
