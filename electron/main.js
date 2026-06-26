// Electron main process for BudgetHub.
//
// Responsibilities:
//   1. Decide where the SQLite database lives (per-user AppData folder).
//   2. On first launch, build + seed that database.
//   3. Start the Express API/static server hidden on a local port.
//   4. Open a single native window pointing at that server.
//
// There is no console window, no browser, and no PostgreSQL server process.

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure only one instance runs (closing the window fully quits the app).
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow = null;
let serverInfo = null;

// In a packaged build, frontend/dist is copied to resources via
// electron-builder's extraResources. In development it sits in the repo.
function getPaths() {
  if (app.isPackaged) {
    return { distDir: path.join(process.resourcesPath, 'dist') };
  }
  return { distDir: path.join(__dirname, '..', 'frontend', 'dist') };
}

async function bootstrap() {
  const dbPath = path.join(app.getPath('userData'), 'budgethub.db');
  process.env.BUDGETHUB_DB_PATH = dbPath;

  const { distDir } = getPaths();

  // First-run: create and seed the database (empty — admin account only).
  if (!fs.existsSync(dbPath)) {
    try {
      const { seedDatabase } = require('../backend/seed');
      await seedDatabase({ dbPath });
    } catch (err) {
      dialog.showErrorBox(
        'BudgetHub — Database setup failed',
        'Could not create the initial database.\n\n' + (err && err.stack ? err.stack : err)
      );
      app.quit();
      return;
    }
  }

  // Start the hidden local server (port 0 = OS picks a free port).
  try {
    const { startServer } = require('../backend/app');
    serverInfo = await startServer({ distDir, port: 0 });
  } catch (err) {
    dialog.showErrorBox(
      'BudgetHub — Server failed to start',
      err && err.stack ? err.stack : String(err)
    );
    app.quit();
    return;
  }

  createWindow();
}

function createWindow() {
  Menu.setApplicationMenu(null); // hide the default menu bar

  // In a packaged build the exe icon is supplied by electron-builder; this
  // mainly helps the dev run (npm start) show the brand icon.
  const devIcon = path.join(__dirname, '..', 'build', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'BudgetHub',
    backgroundColor: '#ffffff',
    icon: fs.existsSync(devIcon) ? devIcon : undefined,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // BudgetHub is a single-window app. Never spawn a second BrowserWindow:
  // links to the local backend (e.g. file exports) must not pop open a blank
  // window — they are handled in-page — and real external links open in the
  // system browser instead.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://127.0.0.1:${serverInfo.port}/`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverInfo) {
    createWindow();
  }
});
