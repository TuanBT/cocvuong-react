const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');
const os = require('os');
const net = require('net');
const QRCode = require('qrcode');

// Cấu hình
const DEFAULT_WS_PORT = 9765;
let WS_PORT = DEFAULT_WS_PORT;

// Global references
let mainWindow = null;
let wss = null;
let clients = new Map(); // Lưu trữ các kết nối: { id, type, ws, name, arena }

/**
 * Lấy IP local của máy
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Bỏ qua IPv6 và loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * Kiểm tra port có available không
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

/**
 * Tìm port available bắt đầu từ port mặc định
 */
async function findAvailablePort(startPort) {
  let port = startPort;
  const maxAttempts = 10;
  
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  
  throw new Error('Không tìm được port khả dụng');
}

/**
 * Tạo QR Code data URL
 */
async function generateQRCode(text) {
  try {
    return await QRCode.toDataURL(text, {
      width: 256,
      margin: 2,
      color: {
        dark: '#2c3e50',
        light: '#ffffff'
      }
    });
  } catch (err) {
    return null;
  }
}

/**
 * Gửi log tới renderer
 */
function sendLog(type, message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log', { type, message, timestamp: new Date().toISOString() });
  }
}

/**
 * Cập nhật danh sách clients cho renderer
 */
function updateClientsList() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const clientsList = Array.from(clients.values()).map(c => ({
      id: c.id,
      type: c.type,
      name: c.name,
      arena: c.arena || '',
      connected: c.ws.readyState === WebSocket.OPEN
    }));
    mainWindow.webContents.send('clients-update', clientsList);
  }
  
  // Broadcast danh sách clients tới tất cả Giám Sát
  broadcastClientsListToGiamSat();
}

/**
 * Broadcast danh sách clients tới các Giám Sát
 */
function broadcastClientsListToGiamSat() {
  const clientsList = Array.from(clients.values()).map(c => ({
    id: c.id,
    type: c.type,
    name: c.name,
    arena: c.arena || '',
    connected: c.ws.readyState === WebSocket.OPEN,
    tournament: c.tournament || 0
  }));
  
  const message = JSON.stringify({
    type: 'clients_list',
    clients: clientsList
  });
  
  // Gửi tới tất cả Giám Sát
  clients.forEach((client) => {
    if (client.type === 'giam_sat' && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

/**
 * Broadcast message tới tất cả clients (trừ sender)
 */
function broadcast(message, excludeId = null) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client, id) => {
    if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

/**
 * Gửi message tới một loại client cụ thể
 */
function sendToType(type, message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.type === type && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  });
}

/**
 * Khởi tạo WebSocket Server
 */
async function initWebSocketServer() {
  try {
    // Tìm port khả dụng
    WS_PORT = await findAvailablePort(DEFAULT_WS_PORT);
    
    if (WS_PORT !== DEFAULT_WS_PORT) {
      sendLog('warning', `Port ${DEFAULT_WS_PORT} đã được sử dụng, chuyển sang port ${WS_PORT}`);
    }
    
    wss = new WebSocketServer({ port: WS_PORT });
    
    wss.on('listening', async () => {
      const localIP = getLocalIP();
      const address = `${localIP}:${WS_PORT}`;
      sendLog('success', `Đang chạy tại ${address}`);
      
      // Gửi thông tin server cho renderer (event "init")
      if (mainWindow && !mainWindow.isDestroyed()) {
        const qrCode = await generateQRCode(`ws://${localIP}:${WS_PORT}`);
        mainWindow.webContents.send('init', {
          localIP: localIP,
          wsPort: WS_PORT,
          wsUrl: `ws://${localIP}:${WS_PORT}`,
          qrCode: qrCode
        });
      }
    });
    
    wss.on('error', (error) => {
      sendLog('error', `Lỗi server: ${error.message}`);
    });

    wss.on('connection', (ws, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const clientIP = req.socket.remoteAddress;
    
    // Khởi tạo client với type chưa xác định
    clients.set(clientId, {
      id: clientId,
      type: 'unknown',
      name: 'Chờ đăng ký...',
      arena: '',
      ws: ws,
      ip: clientIP
    });

    sendLog('info', `Kết nối mới từ ${clientIP}`);
    updateClientsList();

    // Gửi client ID cho client
    ws.send(JSON.stringify({
      type: 'welcome',
      clientId: clientId,
      message: 'Kết nối thành công với CocVuong Bridge'
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(clientId, message);
      } catch (err) {
        sendLog('error', `Lỗi parse message từ ${clientId}`);
      }
    });

    ws.on('close', () => {
      const client = clients.get(clientId);
      if (client) {
        sendLog('warning', `${client.name} đã ngắt kết nối`);
        clients.delete(clientId);
        updateClientsList();
        
        // Thông báo cho các client khác
        broadcast({
          type: 'client_disconnected',
          clientId: clientId,
          clientName: client.name
        });
      }
    });

    ws.on('error', (error) => {
      sendLog('error', `Lỗi kết nối: ${error.message}`);
    });
  });

  wss.on('error', (error) => {
    sendLog('error', `Lỗi server: ${error.message}`);
  });
  
  } catch (err) {
    sendLog('error', `Lỗi khởi tạo server: ${err.message}`);
  }
}

/**
 * Xử lý message từ clients
 */
function handleMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'register':
      // Đăng ký loại client (giam_sat, giam_dinh_1, giam_dinh_2, ...)
      client.type = message.clientType;
      client.name = message.name || message.clientType;
      client.arena = message.arena || 'A';
      client.tournament = message.tournament || 0;
      clients.set(clientId, client);
      
      sendLog('success', `${client.name} (Sân ${client.arena}) đã đăng ký`);
      updateClientsList();
      
      // Nếu là Giám Sát, gửi ngay danh sách clients hiện tại
      if (client.type === 'giam_sat') {
        const clientsList = Array.from(clients.values()).map(c => ({
          id: c.id,
          type: c.type,
          name: c.name,
          arena: c.arena || '',
          connected: c.ws.readyState === WebSocket.OPEN,
          tournament: c.tournament || 0
        }));
        client.ws.send(JSON.stringify({
          type: 'clients_list',
          clients: clientsList
        }));
      }
      
      // Thông báo cho các client khác
      broadcast({
        type: 'client_registered',
        clientId: clientId,
        clientType: client.type,
        clientName: client.name,
        arena: client.arena
      }, clientId);
      break;

    case 'score':
      // Giám Định gửi điểm
      sendLog('info', `${client.name}: +${message.score} ${message.color === 'red' ? 'Đỏ' : 'Xanh'}`);
      
      // Chuyển tiếp tới tất cả Giám Sát cùng sân
      const scoreMessage = {
        type: 'score_update',
        from: client.name,
        fromId: clientId,
        gdIndex: message.gdIndex,
        color: message.color,
        score: message.score,
        arena: client.arena,
        timestamp: Date.now()
      };
      
      // Gửi tới Giám Sát cùng sân
      clients.forEach((c) => {
        if (c.type === 'giam_sat' && c.arena === client.arena && c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(JSON.stringify(scoreMessage));
        }
      });
      
      // Broadcast để các GĐ khác biết (optional, cho sync UI)
      broadcast({
        type: 'score_broadcast',
        ...scoreMessage
      }, clientId);
      break;

    case 'martial_score':
      // Giám Định Thi Quyền gửi điểm
      sendLog('info', `${client.name}: Chấm ${message.score} điểm`);
      
      // Chuyển tiếp tới tất cả Giám Sát cùng sân
      const martialScoreMessage = {
        type: 'martial_score_update',
        from: client.name,
        fromId: clientId,
        gdIndex: message.gdIndex,
        score: message.score,
        matchNo: message.matchNo,
        teamNo: message.teamNo,
        arena: client.arena,
        timestamp: Date.now()
      };
      
      // Gửi tới Giám Sát cùng sân
      clients.forEach((c) => {
        if (c.type === 'giam_sat' && c.arena === client.arena && c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(JSON.stringify(martialScoreMessage));
        }
      });
      
      // Broadcast để các GĐ khác biết (optional, cho sync UI)
      broadcast({
        type: 'martial_score_broadcast',
        ...martialScoreMessage
      }, clientId);
      break;

    case 'reset_score':
      // Giám Sát reset điểm
      sendLog('warning', `${client.name} đã reset điểm`);
      sendToType('giam_dinh', {
        type: 'score_reset',
        from: client.name,
        arena: client.arena
      });
      break;

    case 'match_change':
      // Thay đổi trận đấu
      sendLog('info', `Chuyển sang trận ${message.matchNo}`);
      broadcast({
        type: 'match_changed',
        matchNo: message.matchNo,
        arena: client.arena
      }, clientId);
      break;

    case 'ping':
      // Keep-alive
      client.ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'status_update':
      // Giám Định gửi trạng thái kết nối
      // Chuyển tiếp tới tất cả Giám Sát cùng sân
      const statusMessage = {
        type: 'referee_status_update',
        from: client.name,
        fromId: clientId,
        gdIndex: message.gdIndex,
        hasInternet: message.hasInternet,
        hasLan: true, // Nếu gửi được message này thì chắc chắn có LAN
        arena: client.arena,
        timestamp: Date.now()
      };
      
      // Gửi tới Giám Sát cùng sân
      clients.forEach((c) => {
        if (c.type === 'giam_sat' && c.arena === client.arena && c.ws.readyState === WebSocket.OPEN) {
          c.ws.send(JSON.stringify(statusMessage));
        }
      });
      break;

    default:
      // Forward các message khác
      broadcast(message, clientId);
  }
}

/**
 * Tạo cửa sổ chính
 */
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 700,
    minWidth: 400,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: 'CocVuong Bridge',
    resizable: true,
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Khởi tạo WebSocket sau khi window ready
  mainWindow.webContents.on('did-finish-load', async () => {
    // Start WebSocket server (sẽ gửi init sau khi listening)
    initWebSocketServer();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.handle('get-server-info', async () => {
  const localIP = getLocalIP();
  const wsUrl = `ws://${localIP}:${WS_PORT}`;
  const qrData = await generateQRCode(wsUrl);
  return {
    localIP: localIP,
    wsPort: WS_PORT,
    wsUrl: wsUrl,
    qrCode: qrData
  };
});

ipcMain.handle('restart-server', async () => {
  // Đóng server cũ
  if (wss) {
    clients.forEach((client) => {
      client.ws.close();
    });
    clients.clear();
    wss.close();
  }
  
  // Khởi động lại
  setTimeout(() => {
    initWebSocketServer();
    sendLog('success', 'Server đã khởi động lại');
    updateClientsList();
  }, 500);
  
  return true;
});

ipcMain.handle('copy-to-clipboard', async (event, text) => {
  const { clipboard } = require('electron');
  clipboard.writeText(text);
  return true;
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (wss) {
    wss.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Cleanup on exit
app.on('before-quit', () => {
  if (wss) {
    clients.forEach((client) => {
      client.ws.close();
    });
    wss.close();
  }
});
