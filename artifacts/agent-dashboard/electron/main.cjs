'use strict';

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { URL } = require('node:url');

const isDev = process.env.ELECTRON_DEV === 'true';
const DEV_PORT = 5173;
const ALLOWED_PUTER_HOSTS = new Set([
  'puter.com',
  'www.puter.com',
  'auth.puter.com',
  'api.puter.com',
]);

function isAllowedPuterPopup(urlString) {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'https:' && ALLOWED_PUTER_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function isSafeExternalUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Nexus Agent',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
    titleBarStyle: 'default',
  });

  // Handle popups — Puter auth opens an OAuth popup window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedPuterPopup(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 720,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }

    // Open all other external URLs in the system browser
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL(`http://localhost:${DEV_PORT}`);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'electron-app', 'index.html');
    win.loadFile(indexPath);
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
