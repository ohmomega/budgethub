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

// In a packaged build, frontend/dist and Example are copied to resources via
// electron-builder's extraResources. In development they sit in the repo.
function getPaths() {
  if (app.isPackaged) {
    const res = process.resourcesPath;
    return {
      distDir: path.join(res, 'dist'),
      excelPath: path.join(res, 'Example', 'test.xlsx'),
    };
  }
  const root = path.join(__dirname, '..');
  return {
    distDir: path.join(root, 'frontend', 'dist'),
    excelPath: path.join(root, 'Example', 'test.xlsx'),
  };
}

async function bootstrap() {
  const dbPath = path.join(app.getPath('userData'), 'budgethub.db');
  process.env.BUDGETHUB_DB_PATH = dbPath;

  const { distDir, excelPath } = getPaths();

  // First-run: create and seed the database.
  if (!fs.existsSync(dbPath)) {
    try {
      const { seedDatabase } = require('../backend/seed');
      await seedDatabase({ dbPath, excelPath });
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

  // Open external links (e.g. target=_blank) in the system browser, not in-app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
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
