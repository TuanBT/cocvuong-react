/**
 * CocVuong Bridge Server Module
 * WebSocket server cho việc chấm điểm qua mạng LAN
 */

const { WebSocketServer, WebSocket } = require('ws');
const os = require('os');
const net = require('net');
const QRCode = require('qrcode');

const DEFAULT_WS_PORT = 9765;

class BridgeServer {
  constructor() {
    this.wss = null;
    this.port = DEFAULT_WS_PORT;
    this.clients = new Map();
    this.localIP = null;
    this.isRunning = false;
    
    // Callbacks
    this.onLogCallback = null;
    this.onClientsChangeCallback = null;
    this.onServerReadyCallback = null;
  }

  /**
   * Lấy IP local của máy
   */
  getLocalIP() {
    if (this.localIP) return this.localIP;
    
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          this.localIP = iface.address;
          return this.localIP;
        }
      }
    }
    this.localIP = '127.0.0.1';
    return this.localIP;
  }

  /**
   * Kiểm tra port available
   */
  isPortAvailable(port) {
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
   * Tìm port available
   */
  async findAvailablePort(startPort) {
    let port = startPort;
    for (let i = 0; i < 10; i++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
      port++;
    }
    throw new Error('Không tìm được port khả dụng');
  }

  /**
   * Tạo QR Code
   */
  async generateQRCode(text) {
    try {
      return await QRCode.toDataURL(text, {
        width: 200,
        margin: 2,
        color: { dark: '#2c3e50', light: '#ffffff' }
      });
    } catch (err) {
      return null;
    }
  }

  /**
   * Log message
   */
  log(type, message) {
    const logData = { type, message, timestamp: new Date().toISOString() };
    console.log(`[Bridge ${type}] ${message}`);
    if (this.onLogCallback) {
      this.onLogCallback(logData);
    }
  }

  /**
   * Cập nhật danh sách clients
   */
  updateClientsList() {
    const clientsList = Array.from(this.clients.values()).map(c => ({
      id: c.id,
      type: c.type,
      name: c.name,
      arena: c.arena || '',
      tournament: c.tournament || 0,
      connected: c.ws.readyState === WebSocket.OPEN
    }));

    if (this.onClientsChangeCallback) {
      this.onClientsChangeCallback(clientsList);
    }

    // Broadcast tới Giám Sát
    this.broadcastToGiamSat({
      type: 'clients_list',
      clients: clientsList
    });
  }

  /**
   * Broadcast tới tất cả Giám Sát
   */
  broadcastToGiamSat(message) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.type === 'giam_sat' && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * Broadcast tới tất cả (trừ sender)
   */
  broadcast(message, excludeId = null) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client, id) => {
      if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * Gửi tới loại client cụ thể
   */
  sendToType(type, message) {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.type === type && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * Xử lý message từ client
   */
  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'register':
        client.type = message.clientType;
        client.name = message.name || message.clientType;
        client.arena = message.arena || 'A';
        client.tournament = message.tournament || 0;
        this.clients.set(clientId, client);
        
        this.log('success', `${client.name} (Sân ${client.arena}) đã đăng ký`);
        this.updateClientsList();
        
        // Broadcast thông báo
        this.broadcast({
          type: 'client_registered',
          clientId: clientId,
          clientType: client.type,
          clientName: client.name,
          arena: client.arena
        }, clientId);
        break;

      case 'score':
        // Giám Định gửi điểm đối kháng
        this.log('info', `${client.name}: +${message.score} ${message.color === 'red' ? 'Đỏ' : 'Xanh'}`);
        
        // Gửi tới Giám Sát cùng sân
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
        
        this.clients.forEach((c) => {
          if (c.type === 'giam_sat' && c.arena === client.arena && c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(JSON.stringify(scoreMessage));
          }
        });
        break;

      case 'martial_score':
        // Giám Định Thi Quyền gửi điểm
        this.log('info', `${client.name}: Chấm ${message.score} điểm`);
        
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
        
        this.clients.forEach((c) => {
          if (c.type === 'giam_sat' && c.arena === client.arena && c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(JSON.stringify(martialScoreMessage));
          }
        });
        break;

      case 'reset_score':
        this.log('warning', `${client.name} đã reset điểm`);
        this.sendToType('giam_dinh', {
          type: 'score_reset',
          from: client.name,
          arena: client.arena
        });
        break;

      case 'match_change':
        this.log('info', `Chuyển sang trận ${message.matchNo}`);
        this.broadcast({
          type: 'match_changed',
          matchNo: message.matchNo,
          arena: client.arena
        }, clientId);
        break;

      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        // Forward message
        this.broadcast(message, clientId);
    }
  }

  /**
   * Khởi động server
   */
  async start() {
    try {
      this.port = await this.findAvailablePort(DEFAULT_WS_PORT);
      
      if (this.port !== DEFAULT_WS_PORT) {
        this.log('warning', `Port ${DEFAULT_WS_PORT} đã dùng, chuyển sang ${this.port}`);
      }

      this.wss = new WebSocketServer({ port: this.port });

      this.wss.on('listening', async () => {
        this.isRunning = true;
        const ip = this.getLocalIP();
        const wsUrl = `ws://${ip}:${this.port}`;
        const qrCode = await this.generateQRCode(wsUrl);
        
        this.log('success', `Bridge đang chạy tại ${ip}:${this.port}`);
        
        if (this.onServerReadyCallback) {
          this.onServerReadyCallback({
            localIP: ip,
            port: this.port,
            wsUrl: wsUrl,
            qrCode: qrCode
          });
        }
      });

      this.wss.on('error', (error) => {
        this.log('error', `Lỗi server: ${error.message}`);
      });

      this.wss.on('connection', (ws, req) => {
        const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const clientIP = req.socket.remoteAddress;

        this.clients.set(clientId, {
          id: clientId,
          type: 'unknown',
          name: 'Chờ đăng ký...',
          arena: '',
          ws: ws,
          ip: clientIP
        });

        this.log('info', `Kết nối mới từ ${clientIP}`);
        this.updateClientsList();

        // Welcome message
        ws.send(JSON.stringify({
          type: 'welcome',
          clientId: clientId,
          message: 'Kết nối thành công với CocVuong Bridge'
        }));

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(clientId, message);
          } catch (err) {
            // Silent fail
          }
        });

        ws.on('close', () => {
          const client = this.clients.get(clientId);
          if (client) {
            this.log('warning', `${client.name} đã ngắt kết nối`);
            this.clients.delete(clientId);
            this.updateClientsList();
            
            this.broadcast({
              type: 'client_disconnected',
              clientId: clientId,
              clientName: client.name
            });
          }
        });

        ws.on('error', (error) => {
          this.log('error', `Lỗi kết nối: ${error.message}`);
        });
      });

      return true;
    } catch (err) {
      this.log('error', `Lỗi khởi tạo: ${err.message}`);
      return false;
    }
  }

  /**
   * Dừng server
   */
  stop() {
    if (this.wss) {
      this.clients.forEach((client) => {
        client.ws.close();
      });
      this.clients.clear();
      this.wss.close();
      this.wss = null;
      this.isRunning = false;
      this.log('info', 'Bridge đã dừng');
    }
  }

  /**
   * Restart server
   */
  async restart() {
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 500));
    return this.start();
  }

  /**
   * Lấy thông tin server
   */
  async getServerInfo() {
    const ip = this.getLocalIP();
    const wsUrl = `ws://${ip}:${this.port}`;
    const qrCode = await this.generateQRCode(wsUrl);
    
    return {
      localIP: ip,
      port: this.port,
      wsUrl: wsUrl,
      qrCode: qrCode,
      isRunning: this.isRunning,
      clientsCount: this.clients.size
    };
  }

  /**
   * Lấy danh sách clients
   */
  getClients() {
    return Array.from(this.clients.values()).map(c => ({
      id: c.id,
      type: c.type,
      name: c.name,
      arena: c.arena || '',
      tournament: c.tournament || 0,
      connected: c.ws.readyState === WebSocket.OPEN
    }));
  }

  // Setters cho callbacks
  onLog(callback) { this.onLogCallback = callback; }
  onClientsChange(callback) { this.onClientsChangeCallback = callback; }
  onServerReady(callback) { this.onServerReadyCallback = callback; }
}

module.exports = { BridgeServer };
