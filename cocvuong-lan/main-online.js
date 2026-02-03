/**
 * CocVuong Bridge App - Electron Main Process
 * 
 * Chức năng:
 * 1. Load web app từ online (https://cocvuong.buitientuan.com)
 * 2. WebSocket Bridge server cho LAN scoring
 * 3. Tắt webSecurity để bypass mixed content HTTPS + ws://
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, clipboard, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { BridgeServer } = require('./bridge-server');

// =============================================================================
// CONFIGURATION
// =============================================================================

const APP_NAME = 'CocVuong Bridge';
const ONLINE_URL = 'https://cocvuong.buitientuan.com';

// =============================================================================
// GLOBAL REFERENCES
// =============================================================================

let mainWindow = null;
let statusWindow = null;
let tray = null;
let bridgeServer = null;
let serverInfo = {
  localIP: '',
  wsPort: 0,
  wsUrl: '',
  qrCode: null
};

// =============================================================================
// BRIDGE SERVER (WebSocket)
// =============================================================================

async function initBridgeServer() {
  bridgeServer = new BridgeServer();
  
  bridgeServer.onLog((log) => {
    if (statusWindow && !statusWindow.isDestroyed()) {
      statusWindow.webContents.send('log', log);
    }
  });

  bridgeServer.onClientsChange((clients) => {
    if (statusWindow && !statusWindow.isDestroyed()) {
      statusWindow.webContents.send('clients-update', clients);
    }
    updateTrayTitle(clients.length);
  });

  bridgeServer.onServerReady(async (info) => {
    serverInfo.localIP = info.localIP;
    serverInfo.wsPort = info.port;
    serverInfo.wsUrl = info.wsUrl;
    
    // Generate QR for WebSocket URL
    serverInfo.qrCode = await bridgeServer.generateQRCode(info.wsUrl);
    
    console.log(`[Bridge] Ready at ${info.wsUrl}`);
    
    if (statusWindow && !statusWindow.isDestroyed()) {
      statusWindow.webContents.send('server-ready', serverInfo);
    }
    
    // Update main window's preload info
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.executeJavaScript(`
        window.__COCVUONG_BRIDGE__ = {
          url: '${info.wsUrl}',
          localIP: '${info.localIP}',
          port: ${info.port},
          isElectron: true
        };
        window.dispatchEvent(new CustomEvent('cocvuong-bridge-ready', { 
          detail: window.__COCVUONG_BRIDGE__ 
        }));
        console.log('[CocVuong] Bridge ready:', window.__COCVUONG_BRIDGE__);
      `);
    }
    
    updateTrayMenu();
  });

  await bridgeServer.start();
}

// =============================================================================
// APP ICON
// =============================================================================

function getAppIcon() {
  const iconPaths = [
    path.join(__dirname, 'assets', 'icon.png'),
    path.join(__dirname, '..', 'public', 'favicon.ico'),
    path.join(__dirname, '..', 'src', 'assets', 'img', 'logo.png')
  ];
  
  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
  }
  return undefined;
}

// =============================================================================
// MAIN WINDOW (Web App)
// =============================================================================

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'CocVuong',
    icon: getAppIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload-online.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // IMPORTANT: Tắt webSecurity để HTTPS có thể connect ws://
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  // Load online URL
  mainWindow.loadURL(ONLINE_URL);

  // Inject bridge info when page loads
  mainWindow.webContents.on('did-finish-load', () => {
    if (serverInfo.wsUrl) {
      mainWindow.webContents.executeJavaScript(`
        window.__COCVUONG_BRIDGE__ = {
          url: '${serverInfo.wsUrl}',
          localIP: '${serverInfo.localIP}',
          port: ${serverInfo.wsPort},
          isElectron: true
        };
        window.dispatchEvent(new CustomEvent('cocvuong-bridge-ready', { 
          detail: window.__COCVUONG_BRIDGE__ 
        }));
        console.log('[CocVuong] Bridge injected:', window.__COCVUONG_BRIDGE__);
      `);
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =============================================================================
// STATUS WINDOW (Bridge Info)
// =============================================================================

function createStatusWindow() {
  statusWindow = new BrowserWindow({
    width: 400,
    height: 500,
    minWidth: 350,
    minHeight: 400,
    title: 'CocVuong Bridge',
    icon: getAppIcon(),
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  statusWindow.loadFile(path.join(__dirname, 'renderer', 'index-simple.html'));

  // Ẩn xuống tray khi đóng
  statusWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      statusWindow.hide();
    }
  });

  statusWindow.on('closed', () => {
    statusWindow = null;
  });
}

// =============================================================================
// TRAY ICON
// =============================================================================

function createTray() {
  let trayIcon;
  
  const iconPaths = [
    path.join(__dirname, 'assets', 'tray-icon.png'),
    path.join(__dirname, 'assets', 'icon.png'),
    path.join(__dirname, '..', 'public', 'favicon.ico')
  ];
  
  for (const iconPath of iconPaths) {
    try {
      if (fs.existsSync(iconPath)) {
        trayIcon = nativeImage.createFromPath(iconPath);
        if (!trayIcon.isEmpty()) {
          break;
        }
      }
    } catch (e) {
      // Continue to next icon
    }
  }
  
  if (!trayIcon || trayIcon.isEmpty()) {
    trayIcon = nativeImage.createEmpty();
  }
  
  if (process.platform === 'darwin' && !trayIcon.isEmpty()) {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
    trayIcon.setTemplateImage(true);
  }

  tray = new Tray(trayIcon);
  tray.setToolTip(APP_NAME);
  
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

function updateTrayTitle(clientsCount = 0) {
  if (tray) {
    const title = clientsCount > 0 ? `${clientsCount}` : '';
    tray.setTitle(title);
  }
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mở CocVuong',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    {
      label: 'Bridge Status',
      click: () => {
        if (statusWindow) {
          statusWindow.show();
          statusWindow.focus();
        } else {
          createStatusWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: serverInfo.wsUrl ? `Bridge: ${serverInfo.wsUrl}` : 'Đang khởi động...',
      enabled: false
    },
    {
      label: 'Copy Bridge URL',
      click: () => {
        if (serverInfo.wsUrl) {
          clipboard.writeText(serverInfo.wsUrl);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Thoát',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// =============================================================================
// IPC HANDLERS
// =============================================================================

ipcMain.handle('get-server-info', async () => {
  return serverInfo;
});

ipcMain.handle('get-clients', () => {
  return bridgeServer ? bridgeServer.getClients() : [];
});

ipcMain.handle('restart-server', async () => {
  try {
    if (bridgeServer) {
      await bridgeServer.restart();
    }
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('open-in-browser', () => {
  shell.openExternal(ONLINE_URL);
  return true;
});

ipcMain.handle('show-main-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createMainWindow();
  }
  return true;
});

// =============================================================================
// APP LIFECYCLE
// =============================================================================

app.whenReady().then(async () => {
  try {
    // Start Bridge server first
    await initBridgeServer();
    
    // Create windows
    createMainWindow();
    createStatusWindow();
    createTray();
    
    // macOS: Re-create window khi click dock icon
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  } catch (err) {
    console.error('[App] Startup error:', err.message);
    
    const { dialog } = require('electron');
    dialog.showErrorBox('Lỗi khởi động', `Không thể khởi động server:\n${err.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Không thoát app, giữ trong tray
});

app.on('before-quit', async () => {
  app.isQuitting = true;
  if (bridgeServer) {
    bridgeServer.stop();
  }
});

// =============================================================================
// SINGLE INSTANCE
// =============================================================================

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
