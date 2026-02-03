/**
 * CocVuong Desktop - Electron Main Process
 * 
 * App đơn giản:
 * 1. Load https://cocvuong.buitientuan.com trong Electron window
 * 2. Chạy Bridge WebSocket server embedded
 * 3. Inject bridge info vào web page
 * 
 * Mục đích: Cho phép chấm điểm qua LAN khi mạng Internet không ổn định
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, clipboard, nativeImage } = require('electron');
const path = require('path');
const { BridgeServer } = require('./bridge-server');

// =============================================================================
// CONFIGURATION
// =============================================================================

const REMOTE_URL = 'https://cocvuong.buitientuan.com';
const APP_NAME = 'CocVuong Desktop';

// =============================================================================
// GLOBAL REFERENCES
// =============================================================================

let mainWindow = null;
let statusWindow = null;
let tray = null;
let bridgeServer = null;
let serverInfo = null;

// =============================================================================
// BRIDGE SERVER
// =============================================================================

async function initBridgeServer() {
  bridgeServer = new BridgeServer();
  
  bridgeServer.onLog((log) => {
    // Gửi log tới status window nếu có
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

  bridgeServer.onServerReady((info) => {
    serverInfo = info;
    console.log(`[Bridge] Ready at ${info.wsUrl}`);
    
    // Gửi info tới status window
    if (statusWindow && !statusWindow.isDestroyed()) {
      statusWindow.webContents.send('server-ready', info);
    }
    
    // Inject vào main window nếu đã load
    injectBridgeInfo();
  });

  await bridgeServer.start();
}

// =============================================================================
// MAIN WINDOW (Load Remote URL)
// =============================================================================

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: APP_NAME,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload-remote.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // QUAN TRỌNG: Cho phép HTTPS → ws:// (bypass mixed content)
      webSecurity: false
    }
  });

  // Load remote URL
  mainWindow.loadURL(REMOTE_URL);

  // Khi page load xong, inject bridge info
  mainWindow.webContents.on('did-finish-load', () => {
    injectBridgeInfo();
  });

  // Khi đóng main window, ẩn xuống tray thay vì thoát
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// =============================================================================
// STATUS WINDOW (Hiển thị IP/QR/Clients)
// =============================================================================

function createStatusWindow() {
  statusWindow = new BrowserWindow({
    width: 400,
    height: 550,
    minWidth: 350,
    minHeight: 400,
    title: 'CocVuong Bridge',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  statusWindow.loadFile(path.join(__dirname, 'renderer', 'index-simple.html'));

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
// INJECT BRIDGE INFO VÀO MAIN WINDOW
// =============================================================================

function injectBridgeInfo() {
  if (!mainWindow || mainWindow.isDestroyed() || !serverInfo) return;

  const script = `
    window.__COCVUONG_BRIDGE__ = {
      url: '${serverInfo.wsUrl}',
      localIP: '${serverInfo.localIP}',
      port: ${serverInfo.port},
      isElectron: true
    };
    
    // Dispatch event để React app biết
    window.dispatchEvent(new CustomEvent('cocvuong-bridge-ready', {
      detail: window.__COCVUONG_BRIDGE__
    }));
    
    console.log('[CocVuong Desktop] Bridge info injected:', window.__COCVUONG_BRIDGE__);
  `;

  mainWindow.webContents.executeJavaScript(script).catch(err => {
    console.error('[Inject] Error:', err.message);
  });
}

// =============================================================================
// TRAY ICON
// =============================================================================

function createTray() {
  // Tạo icon (dùng template cho macOS)
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (process.platform === 'darwin') {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
      trayIcon.setTemplateImage(true);
    }
  } catch (e) {
    // Fallback: tạo icon đơn giản
    trayIcon = nativeImage.createEmpty();
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
        }
      }
    },
    {
      label: 'Hiện Bridge Status',
      click: () => {
        if (statusWindow) {
          statusWindow.show();
          statusWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: serverInfo ? `Bridge: ${serverInfo.localIP}:${serverInfo.port}` : 'Bridge: Đang khởi động...',
      enabled: false
    },
    {
      label: 'Copy Bridge URL',
      click: () => {
        if (serverInfo) {
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
  return bridgeServer ? await bridgeServer.getServerInfo() : null;
});

ipcMain.handle('get-clients', () => {
  return bridgeServer ? bridgeServer.getClients() : [];
});

ipcMain.handle('restart-server', async () => {
  if (bridgeServer) {
    await bridgeServer.restart();
    return true;
  }
  return false;
});

ipcMain.handle('copy-to-clipboard', (event, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('open-main-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
  return true;
});

// =============================================================================
// APP LIFECYCLE
// =============================================================================

app.whenReady().then(async () => {
  // Khởi động Bridge server trước
  await initBridgeServer();
  
  // Tạo các windows
  createMainWindow();
  createStatusWindow();
  
  // Tạo tray
  createTray();
  
  // macOS: Re-create window khi click dock icon
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Không thoát app, giữ trong tray
});

app.on('before-quit', () => {
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
