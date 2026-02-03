/**
 * CocVuong Bridge App - Electron Main Process (Combined)
 * 
 * Chức năng:
 * 1. Main Window: Load web app từ online (cho Giám Sát laptop)
 * 2. HTTP Server: Serve build folder cho Giám Định điện thoại
 * 3. WebSocket Bridge: LAN scoring server
 * 4. Status Window: Hiển thị IP/QR/connections
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, clipboard, nativeImage, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { BridgeServer } = require('./bridge-server');

// =============================================================================
// CONFIGURATION
// =============================================================================

const APP_NAME = 'CocVuong Bridge';
const ONLINE_URL = 'https://cocvuong.buitientuan.com';
const HTTP_PORT = 3000;

// Build path for HTTP server (for mobile Giám Định)
function getBuildPath() {
  // In production (packaged app), build is in extraResources
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build');
  }
  // In development, build is sibling folder or in cocvuong-lan
  const devPaths = [
    path.join(__dirname, 'build'),
    path.join(__dirname, '..', 'build')
  ];
  for (const p of devPaths) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, 'build');
}

// =============================================================================
// GLOBAL REFERENCES
// =============================================================================

let mainWindow = null;
let statusWindow = null;
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
// HTTP SERVER (For mobile Giám Định)
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

function startHttpServer(buildPath) {
  return new Promise((resolve, reject) => {
    // Check if build folder exists
    if (!fs.existsSync(buildPath)) {
      console.warn('[HTTP] Build folder not found:', buildPath);
      console.warn('[HTTP] Mobile Giám Định sẽ không hoạt động.');
      console.warn('[HTTP] Để fix: copy folder build/ vào cocvuong-lan/');
      // Don't reject - app can still work for desktop Giám Sát
      resolve(false);
      return;
    }

    httpServer = http.createServer((req, res) => {
      // Handle CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      let filePath = path.join(buildPath, req.url === '/' ? 'index.html' : req.url);
      
      // Handle React Router (SPA) - return index.html for non-file routes
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(buildPath, 'index.html');
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        
        const mimeType = getMimeType(filePath);
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
      });
    });

    httpServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[HTTP] Port ${HTTP_PORT} đã được sử dụng.`);
        resolve(false);
      } else {
        console.error('[HTTP] Server error:', err.message);
        reject(err);
      }
    });

    httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`[HTTP] Server running on port ${HTTP_PORT}`);
      console.log(`[HTTP] Build path: ${buildPath}`);
      resolve(true);
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
    serverInfo.httpUrl = `http://${info.localIP}:${HTTP_PORT}`;
    
    // Generate QR for HTTP URL (for mobile Giám Định)
    serverInfo.qrCode = await bridgeServer.generateQRCode(serverInfo.httpUrl);
    
    console.log(`[Bridge] Ready at ${info.wsUrl}`);
    console.log(`[HTTP] Web app at ${serverInfo.httpUrl}`);
    
    // Send to status window
    if (statusWindow && !statusWindow.isDestroyed()) {
      statusWindow.webContents.send('server-ready', serverInfo);
    }
    
    // Inject bridge info to main window
    injectBridgeToMainWindow();
    
    updateTrayMenu();
  });

  await bridgeServer.start();
}

function injectBridgeToMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed() && serverInfo.wsUrl) {
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
// MAIN WINDOW (Load online for desktop Giám Sát)
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
    injectBridgeToMainWindow();
  });

  // Also inject when navigating within the app
  mainWindow.webContents.on('did-navigate-in-page', () => {
    injectBridgeToMainWindow();
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
// STATUS WINDOW (Bridge Info + QR)
// =============================================================================

function createStatusWindow() {
  statusWindow = new BrowserWindow({
    width: 420,
    height: 580,
    minWidth: 380,
    minHeight: 500,
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
      label: 'Mở CocVuong (trình duyệt)',
      click: () => {
        shell.openExternal(serverInfo.httpUrl || `http://localhost:${HTTP_PORT}`);
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
      label: serverInfo.httpUrl ? `Giám Định: ${serverInfo.httpUrl}` : 'Đang khởi động...',
      enabled: false
    },
    {
      label: serverInfo.wsUrl ? `Bridge: ${serverInfo.wsUrl}` : '',
      enabled: false,
      visible: !!serverInfo.wsUrl
    },
    { type: 'separator' },
    {
      label: 'Copy link cho Giám Định',
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
    await startHttpServer(getBuildPath());
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
  // Mở http://IP:3000 để người dùng có thể truy cập từ thiết bị khác trong LAN
  if (serverInfo.httpUrl) {
    shell.openExternal(serverInfo.httpUrl);
  } else {
    // Fallback: mở online URL
    shell.openExternal(ONLINE_URL);
  }
  return true;
});

ipcMain.handle('show-main-window', () => {
  // Mở trong browser thay vì Electron window
  if (serverInfo.httpUrl) {
    shell.openExternal(serverInfo.httpUrl);
  } else {
    shell.openExternal(ONLINE_URL);
  }
  return true;
});

// Get version/build date
ipcMain.handle('get-version', () => {
  const packageJson = require('./package.json');
  
  // Try to read buildInfo.json for actual build date
  let buildDate = new Date().toLocaleDateString('vi-VN');
  try {
    const buildInfoPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app', 'buildInfo.json')
      : path.join(__dirname, 'buildInfo.json');
    
    if (fs.existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
      buildDate = buildInfo.buildDate || buildDate;
    }
  } catch (err) {
    console.log('[Version] Could not read buildInfo.json, using current date');
  }
  
  return {
    version: packageJson.version || '1.0.0',
    buildDate: buildDate
  };
});

// =============================================================================
// APP LIFECYCLE
// =============================================================================

app.whenReady().then(async () => {
  try {
    const buildPath = getBuildPath();
    console.log('[App] Build path:', buildPath);
    
    // Start HTTP server for mobile Giám Định (and local access)
    const httpStarted = await startHttpServer(buildPath);
    if (!httpStarted) {
      console.warn('[App] HTTP server không khởi động được.');
      console.warn('[App] Giám Định điện thoại sẽ không hoạt động.');
      console.warn('[App] Copy folder build/ vào cocvuong-lan/ để fix.');
    }
    
    // Start Bridge server
    await initBridgeServer();
    
    // Only create Status Window at startup
    // Users can open Main Window (CocVuong) via button or browser (localhost:3000)
    createStatusWindow();
    createTray();
    
    // macOS: Re-create status window khi click dock icon
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createStatusWindow();
      } else if (statusWindow) {
        statusWindow.show();
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
