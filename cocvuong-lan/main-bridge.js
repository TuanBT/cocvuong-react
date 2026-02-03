/**
 * CocVuong Bridge App - Electron Main Process
 * 
 * Chức năng:
 * 1. WebSocket Bridge server cho LAN scoring
 * 2. HTTP server để serve web app
 * 3. Hiển thị IP/QR cho người dùng connect
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, clipboard, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { BridgeServer } = require('./bridge-server');

// =============================================================================
// CONFIGURATION
// =============================================================================

const APP_NAME = 'CocVuong Bridge';
const HTTP_PORT = 3000;

// Build path - different in dev vs production
function getBuildPath() {
  // In production (packaged app), build is in extraResources
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build');
  }
  // In development, build is sibling folder
  return path.join(__dirname, 'build');
}

let BUILD_PATH = null; // Will be set after app is ready

// =============================================================================
// GLOBAL REFERENCES
// =============================================================================

let mainWindow = null;
let tray = null;
let bridgeServer = null;
let httpServer = null;
let serverInfo = {
  localIP: '',
  wsPort: 0,
  httpPort: HTTP_PORT,
  wsUrl: '',
  httpUrl: '',
  qrCode: null
};

// =============================================================================
// HTTP SERVER (Serve Web App)
// =============================================================================

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function startHttpServer() {
  return new Promise((resolve, reject) => {
    // Check if build folder exists
    if (!fs.existsSync(BUILD_PATH)) {
      console.error('[HTTP] Build folder not found:', BUILD_PATH);
      reject(new Error('Build folder not found. Please run npm run build first.'));
      return;
    }

    httpServer = http.createServer((req, res) => {
      // Handle CORS for local development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      let filePath = path.join(BUILD_PATH, req.url === '/' ? 'index.html' : req.url);
      
      // Handle React Router (SPA) - return index.html for non-file routes
      if (!path.extname(filePath) || !fs.existsSync(filePath)) {
        // If file doesn't exist and has no extension, serve index.html
        if (!fs.existsSync(filePath)) {
          filePath = path.join(BUILD_PATH, 'index.html');
        }
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // File not found - serve index.html (for SPA routing)
          fs.readFile(path.join(BUILD_PATH, 'index.html'), (err2, data2) => {
            if (err2) {
              res.writeHead(404);
              res.end('Not Found');
              return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data2);
          });
          return;
        }
        
        const mimeType = getMimeType(filePath);
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
      });
    });

    httpServer.on('error', (err) => {
      console.error('[HTTP] Server error:', err.message);
      reject(err);
    });

    httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`[HTTP] Server running on port ${HTTP_PORT}`);
      resolve();
    });
  });
}

function stopHttpServer() {
  return new Promise((resolve) => {
    if (httpServer) {
      httpServer.close(() => {
        httpServer = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// =============================================================================
// BRIDGE SERVER (WebSocket)
// =============================================================================

async function initBridgeServer() {
  bridgeServer = new BridgeServer();
  
  bridgeServer.onLog((log) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log', log);
    }
  });

  bridgeServer.onClientsChange((clients) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clients-update', clients);
    }
    updateTrayTitle(clients.length);
  });

  bridgeServer.onServerReady(async (info) => {
    serverInfo.localIP = info.localIP;
    serverInfo.wsPort = info.port;
    serverInfo.wsUrl = info.wsUrl;
    serverInfo.httpUrl = `http://${info.localIP}:${HTTP_PORT}`;
    
    // Generate QR for HTTP URL (not WebSocket)
    serverInfo.qrCode = await bridgeServer.generateQRCode(serverInfo.httpUrl);
    
    console.log(`[Bridge] Ready at ${info.wsUrl}`);
    console.log(`[HTTP] Web app at ${serverInfo.httpUrl}`);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('server-ready', serverInfo);
    }
    
    updateTrayMenu();
  });

  await bridgeServer.start();
}

// =============================================================================
// MAIN WINDOW (Status UI)
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

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 600,
    minWidth: 380,
    minHeight: 500,
    title: APP_NAME,
    icon: getAppIcon(),
    resizable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index-simple.html'));

  // Ẩn xuống tray khi đóng
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
// TRAY ICON
// =============================================================================

function createTray() {
  let trayIcon;
  
  // Try multiple icon locations
  const iconPaths = [
    path.join(__dirname, 'assets', 'tray-icon.png'),
    path.join(__dirname, 'assets', 'icon.png'),
    path.join(__dirname, '..', 'public', 'favicon.ico')
  ];
  
  for (const iconPath of iconPaths) {
    try {
      if (require('fs').existsSync(iconPath)) {
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
      label: 'Hiện cửa sổ',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: serverInfo.httpUrl ? `Web: ${serverInfo.httpUrl}` : 'Đang khởi động...',
      enabled: false
    },
    {
      label: serverInfo.wsUrl ? `Bridge: ${serverInfo.wsUrl}` : '',
      enabled: false,
      visible: !!serverInfo.wsUrl
    },
    { type: 'separator' },
    {
      label: 'Copy link web',
      click: () => {
        if (serverInfo.httpUrl) {
          clipboard.writeText(serverInfo.httpUrl);
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
    await stopHttpServer();
    if (bridgeServer) {
      await bridgeServer.restart();
    }
    await startHttpServer();
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
  if (serverInfo.httpUrl) {
    require('electron').shell.openExternal(serverInfo.httpUrl);
  }
  return true;
});

// =============================================================================
// APP LIFECYCLE
// =============================================================================

app.whenReady().then(async () => {
  try {
    // Set build path (app object now available)
    BUILD_PATH = getBuildPath();
    console.log('[App] Build path:', BUILD_PATH);
    
    // Start HTTP server first
    await startHttpServer();
    
    // Then Bridge server
    await initBridgeServer();
    
    // Create UI
    createMainWindow();
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
    
    // Show error dialog
    const { dialog } = require('electron');
    dialog.showErrorBox('Lỗi khởi động', `Không thể khởi động server:\n${err.message}\n\nVui lòng kiểm tra folder build/ đã tồn tại.`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // Không thoát app, giữ trong tray
});

app.on('before-quit', async () => {
  app.isQuitting = true;
  await stopHttpServer();
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
