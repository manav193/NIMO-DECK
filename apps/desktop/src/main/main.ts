import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { DesktopRuntime } from './runtime.js';
import { IPCGateway } from './ipc-gateway.js';

let mainWindow: BrowserWindow | null = null;
let runtime: DesktopRuntime | null = null;

function createWindow(): void {
  // 1. Initialize services runtime & IPC Gateway
  runtime = new DesktopRuntime();
  const gateway = new IPCGateway(runtime);
  gateway.registerHandlers();

  // 2. Resolve preload path
  const preloadPath = path.join(__dirname, '../preload/preload.js');

  // 3. Create sandboxed browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'NIMO-DECK Command Center',
    backgroundColor: '#0A0F1D',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 4. Secure external link handling: strictly block arbitrary renderer navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://github.com') || url.startsWith('https://google.com')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow?.webContents.getURL()) {
      event.preventDefault();
      if (url.startsWith('https://github.com')) {
        shell.openExternal(url);
      }
    }
  });

  // 5. Load UI (either development server or built bundle)
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const rendererPath = path.join(__dirname, '../renderer/index.html');
    const fallbackPath = path.join(__dirname, '../../index.html');
    const targetPath = fs.existsSync(rendererPath) ? rendererPath : fallbackPath;
    mainWindow.loadFile(targetPath).catch((err) => {
      console.error('[NIMO-DECK Desktop] Failed to load renderer bundle:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  // Desktop startup integration (Windows login item setting)
  try {
    if (process.platform === 'win32') {
      const loginSettings = app.getLoginItemSettings();
      if (!loginSettings.openAtLogin && process.env.NODE_ENV === 'production') {
        app.setLoginItemSettings({
          openAtLogin: true,
          openAsHidden: true
        });
      }
    }
  } catch {
    // Ignore in non-packaged dev environment
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

let isQuitting = false;
app.on('before-quit', async (event) => {
  if (!isQuitting && runtime) {
    event.preventDefault();
    isQuitting = true;
    try {
      await runtime.daemonManager.gracefulShutdown();
    } finally {
      app.quit();
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
