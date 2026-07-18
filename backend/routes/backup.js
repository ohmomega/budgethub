// Backup & Restore for the BudgetHub SQLite database.
//
// Exports produce a proprietary ".bhbackup" file: the live database, snapshotted
// via better-sqlite3's online backup API (safe to do while the app is running,
// including under WAL), then encrypted with AES-256-GCM. The GCM auth tag makes
// the file tamper-evident — any edit to a ".bhbackup" file (by hand, by another
// program, or a bit-flip in transit) fails decryption instead of silently
// producing a corrupt database, and only this app can produce a file that
// verifies. Restore only accepts files that pass that check, so "import only
// specific file types" is enforced by content, not just by extension.
//
// This is app-level tamper protection for a single-user offline desktop tool,
// not a defense against a determined attacker with source-code access — the
// key below is derived from fixed strings embedded in the app, not a secret
// the user supplies.

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Database = require('better-sqlite3');
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// require('electron') resolves to the Electron API object only when this code
// is executing inside the Electron process; under plain `node`, Electron's
// module shim returns the path to the electron binary (a string) instead, so
// `.app` below is simply undefined and the relaunch step is skipped.
const electron = require('electron');
const electronApp = electron && typeof electron === 'object' ? electron.app : null;

const MAGIC = Buffer.from('BHBK');
const FORMAT_VERSION = 1;
const SQLITE_MAGIC = Buffer.from([
  0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
  0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00
]); // "SQLite format 3\x00"
const REQUIRED_TABLES = ['budget_periods', 'expense_entries', 'departments', 'users', 'cost_centers'];

const BACKUP_KEY = crypto.scryptSync('BudgetHub-Backup-v1', 'budgethub-fixed-salt-2026', 32);

function encryptBuffer(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', BACKUP_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, Buffer.from([FORMAT_VERSION]), iv, authTag, ciphertext]);
}

// Throws if the file is the wrong format, wrong key, or was modified in any
// way (the auth tag check fails on the smallest change to the ciphertext).
function decryptBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 33 || !buf.slice(0, 4).equals(MAGIC)) {
    const err = new Error('Not a BudgetHub backup file');
    err.code = 'INVALID_FORMAT';
    throw err;
  }
  const iv = buf.slice(5, 17);
  const authTag = buf.slice(17, 33);
  const ciphertext = buf.slice(33);
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', BACKUP_KEY, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (e) {
    const err = new Error('Backup file failed integrity check (modified, corrupted, or not a BudgetHub backup)');
    err.code = 'TAMPERED';
    throw err;
  }
}

// Snapshots the live database (safe under WAL, doesn't block other queries)
// and returns it as an encrypted .bhbackup buffer. Shared by the manual
// "Download Backup File" button (below) and the automatic on-quit backup
// (backend/autoBackup.js) — one code path, two triggers.
async function createEncryptedBackup() {
  const tmpPath = path.join(os.tmpdir(), `budgethub_export_${Date.now()}_${Math.random().toString(36).slice(2)}.db`);
  try {
    await db.raw.backup(tmpPath);
    const plain = fs.readFileSync(tmpPath);
    return encryptBuffer(plain);
  } finally {
    fs.promises.unlink(tmpPath).catch(() => {});
  }
}

// @route   GET /api/backup/export
// @desc    Snapshot the live database and download it as an encrypted
//          .bhbackup file (saved to the browser's default download location).
router.get('/export', verifyToken, isAdmin, async (req, res) => {
  try {
    const encrypted = await createEncryptedBackup();
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `BudgetHub_backup_${stamp}.bhbackup`;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(encrypted);
  } catch (err) {
    console.error('Backup export error:', err);
    res.status(500).json({ error: 'ไม่สามารถสร้างไฟล์สำรองข้อมูลได้' });
  }
});

// @route   POST /api/backup/restore
// @desc    Decrypt + validate an uploaded .bhbackup file, then replace the
//          live database with it. Restarts the app (Electron) so every open
//          connection picks up the restored data from a clean state.
router.post(
  '/restore',
  verifyToken,
  isAdmin,
  express.raw({ type: 'application/octet-stream', limit: '300mb' }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'ไม่พบไฟล์ที่อัปโหลด', code: 'EMPTY' });
    }

    let plain;
    try {
      plain = decryptBuffer(req.body);
    } catch (err) {
      return res.status(400).json({ error: err.message, code: err.code || 'INVALID' });
    }

    if (plain.length < 16 || !plain.slice(0, 16).equals(SQLITE_MAGIC)) {
      return res.status(400).json({ error: 'ไฟล์สำรองข้อมูลไม่ใช่ฐานข้อมูลที่ถูกต้อง', code: 'INVALID_DB' });
    }

    const dbPath = db.dbPath;
    const tmpRestorePath = `${dbPath}.restore-tmp`;

    try {
      fs.writeFileSync(tmpRestorePath, plain);

      // Validate before touching the live database: integrity check + the
      // tables BudgetHub actually needs, so an unrelated (but validly
      // encrypted-by-us, in theory) SQLite file can't wipe out real data.
      const testDb = new Database(tmpRestorePath, { readonly: true });
      try {
        const check = testDb.pragma('integrity_check', { simple: true });
        if (check !== 'ok') {
          throw Object.assign(new Error('ไฟล์ฐานข้อมูลไม่ผ่านการตรวจสอบความถูกต้อง'), { code: 'INTEGRITY_FAILED' });
        }
        const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
        for (const required of REQUIRED_TABLES) {
          if (!tables.includes(required)) {
            throw Object.assign(new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลของ BudgetHub'), { code: 'NOT_BUDGETHUB' });
          }
        }
      } finally {
        testDb.close();
      }

      // Swap: close the live handle, replace the file (+ WAL/SHM siblings), reopen.
      db.closeForRestore();
      for (const ext of ['', '-wal', '-shm']) {
        const p = dbPath + ext;
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
      fs.renameSync(tmpRestorePath, dbPath);
      db.reopen();

      res.json({ ok: true, restarting: !!electronApp });

      if (electronApp) {
        setTimeout(() => {
          electronApp.relaunch();
          electronApp.exit(0);
        }, 800);
      }
    } catch (err) {
      fs.promises.unlink(tmpRestorePath).catch(() => {});
      console.error('Backup restore error:', err);
      const code = err.code || 'RESTORE_FAILED';
      res.status(400).json({ error: err.message || 'เกิดข้อผิดพลาดขณะกู้คืนข้อมูล', code });
    }
  }
);

router.createEncryptedBackup = createEncryptedBackup;
module.exports = router;
