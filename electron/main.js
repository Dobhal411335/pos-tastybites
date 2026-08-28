import { app, BrowserWindow, shell, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getLoadUrl,
  getAllowedOrigins,
  isAllowedNavigation,
  isPackagedApp,
} from './config.js';
import { initAutoUpdater } from './updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOAD_URL = getLoadUrl();
const ALLOWED_ORIGINS = getAllowedOrigins(LOAD_URL);

let mainWindow = null;

function getAppIcon() {
  const iconPath = isPackagedApp()
    ? path.join(process.resourcesPath, 'icons', 'POS.png')
    : path.join(__dirname, '..', 'public', 'icons', 'POS.png');
  const icon = nativeImage.createFromPath(iconPath);
  return icon.isEmpty() ? undefined : icon;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Tasty Bites POS',
    icon: getAppIcon(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedNavigation(url, ALLOWED_ORIGINS)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url, ALLOWED_ORIGINS)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });

  if (isPackagedApp()) {
    loadUrl(mainWindow, LOAD_URL);
  } else {
    loadWithRetry(mainWindow, LOAD_URL);
  }

  initAutoUpdater(mainWindow);

  if (process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools();
  }
}

async function loadUrl(window, url) {
  await window.loadURL(url);
}

const RETRY_INTERVAL_MS = 1500;
const MAX_RETRIES = 40;

async function loadWithRetry(window, url, attempt = 0) {
  try {
    await window.loadURL(url);
  } catch (err) {
    const refused =
      err?.code === 'ERR_CONNECTION_REFUSED' ||
      String(err?.message || err).includes('ERR_CONNECTION_REFUSED');

    if (refused && attempt < MAX_RETRIES) {
      if (attempt === 0) {
        console.log(
          `Waiting for dev server at ${url} — start it with: npm run dev`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
      return loadWithRetry(window, url, attempt + 1);
    }

    throw err;
  }
}

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
