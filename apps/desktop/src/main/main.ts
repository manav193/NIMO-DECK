import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
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
    const indexPath = path.join(__dirname, '../../index.html');
    mainWindow.loadFile(indexPath).catch(() => {
      // In development / testing environments without prebuilt bundle
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
