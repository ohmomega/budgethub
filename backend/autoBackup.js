// Automatic 2-slot rotating backup, run once each time the app quits
// (electron/main.js calls runAutoBackup() from its 'before-quit' handler).
//
// Only two files ever exist — autobackup-1.bhbackup (newest) and
// autobackup-2.bhbackup (the one from the save before that) — so disk usage
// never grows past two backup-sized files. Before writing the new backup, the
// current slot 1 is copied to slot 2 first, so if anything goes wrong partway
// through writing the new slot 1 (crash, disk full, power loss), slot 2 still
// holds the last known-good backup rather than the app ending up with none.
//
// Reuses the exact same snapshot + AES-256-GCM encryption used by the manual
// "Download Backup File" button (backend/routes/backup.js), so this is the
// same already-tested code path, just triggered by app-quit instead of a
// click.

const fs = require('fs');
const path = require('path');
const db = require('./db');
const { createEncryptedBackup } = require('./routes/backup');

function backupsDir() {
  return path.join(path.dirname(db.dbPath), 'backups');
}

function slotPaths() {
  const dir = backupsDir();
  return {
    dir,
    slot1: path.join(dir, 'autobackup-1.bhbackup'),
    slot2: path.join(dir, 'autobackup-2.bhbackup'),
  };
}

async function runAutoBackup() {
  const { dir, slot1, slot2 } = slotPaths();
  fs.mkdirSync(dir, { recursive: true });

  const encrypted = await createEncryptedBackup();

  // Rotate first (slot 1 -> slot 2), then write the new backup into slot 1.
  if (fs.existsSync(slot1)) {
    fs.copyFileSync(slot1, slot2);
  }
  fs.writeFileSync(slot1, encrypted);
}

module.exports = { runAutoBackup, backupsDir, slotPaths };
