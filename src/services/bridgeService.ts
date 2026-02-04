/**
 * Bridge Service - Kết nối với CocVuong Bridge qua WebSocket
 * Dùng để chấm điểm qua mạng LAN khi mạng Internet không ổn định
 */

// Types
export interface BridgeConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface BridgeMessage {
  type: string;
  [key: string]: any;
}

export interface ScoreMessage {
  type: 'score';
  gdIndex: number;
  color: 'red' | 'blue';
  score: number;
}

export interface ScoreUpdateMessage {
  type: 'score_update';
  from: string;
  fromId: string;
  gdIndex: number;
  color: 'red' | 'blue';
  score: number;
  arena: string;
  timestamp: number;
}

export interface RefereeStatusMessage {
  type: 'referee_status_update';
  from: string;
  fromId: string;
  gdIndex: number;
  hasInternet: boolean;
  hasLan: boolean;
  arena: string;
  timestamp: number;
}

export type ClientType = 'giam_sat' | 'giam_dinh' | 'unknown';

export interface BridgeClient {
  id: string;
  type: ClientType;
  name: string;
  connected: boolean;
  arena?: string;
  tournament?: number;
}

type MessageCallback = (message: BridgeMessage) => void;
type ConnectionCallback = (connected: boolean) => void;
type ClientsListCallback = (clients: BridgeClient[]) => void;
type RefereeStatusCallback = (status: RefereeStatusMessage) => void;

// Default config
const DEFAULT_CONFIG: Required<BridgeConfig> = {
  url: 'ws://localhost:8765',
  reconnectInterval: 3000,
  maxReconnectAttempts: 10
};

/**
 * Kiểm tra xem đang chạy trong CocVuong Desktop (Electron) không
 */
function getElectronBridgeInfo(): { url: string; localIP: string; port: number } | null {
  const win = window as any;
  
  // Check từ injected global variable
  if (win.__COCVUONG_BRIDGE__) {
    return win.__COCVUONG_BRIDGE__;
  }
  
  return null;
}

/**
 * Kiểm tra có đang chạy trong Electron không
 */
export function isRunningInElectron(): boolean {
  return !!(window as any).__COCVUONG_BRIDGE__?.isElectron || !!(window as any).cocvuongElectron?.isElectron;
}

/**
 * Kiểm tra có đang truy cập từ CocVuong Bridge server không (http://IP:3000)
 * Nếu có thì tự động lấy WebSocket URL từ cùng IP
 */
export function getBridgeUrlFromLocation(): string | null {
  const { hostname, port, protocol } = window.location;
  
  // Chỉ apply khi:
  // 1. Đang dùng HTTP (không phải HTTPS) - để tránh mixed content
  // 2. Port 3000 (port mặc định của CocVuong Bridge HTTP server)
  // 3. Không phải localhost (đang trên LAN)
  if (protocol === 'http:' && port === '3000' && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Bridge WebSocket mặc định chạy ở port 9765
    return `ws://${hostname}:9765`;
  }
  
  return null;
}

class BridgeService {
  private ws: WebSocket | null = null;
  private config: Required<BridgeConfig> = DEFAULT_CONFIG;
  private clientId: string | null = null;
  private clientType: ClientType = 'unknown';
  private clientName: string = '';
  private arena: string = 'A';
  private tournament: number = 0;
  
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect: boolean = false;
  
  private messageCallbacks: Set<MessageCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private scoreCallbacks: Set<(score: ScoreUpdateMessage) => void> = new Set();
  private clientsListCallbacks: Set<ClientsListCallback> = new Set();
  private refereeStatusCallbacks: Set<RefereeStatusCallback> = new Set();
  private connectedClients: BridgeClient[] = [];
  
  /**
   * Lấy URL Bridge tự động (từ Electron hoặc từ URL location)
   */
  getAutoBridgeUrl(): string | null {
    // Ưu tiên 1: Electron injected info
    const electronInfo = getElectronBridgeInfo();
    if (electronInfo?.url) {
      return electronInfo.url;
    }
    
    // Ưu tiên 2: Từ URL location (khi truy cập http://IP:3000)
    const locationUrl = getBridgeUrlFromLocation();
    if (locationUrl) {
      return locationUrl;
    }
    
    return null;
  }

  /**
   * Lấy URL Bridge từ Electron nếu có (legacy - giữ để backward compatible)
   */
  getElectronBridgeUrl(): string | null {
    return this.getAutoBridgeUrl();
  }

  /**
   * Cấu hình service
   */
  configure(config: Partial<BridgeConfig>): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Kiểm tra xem đã kết nối chưa
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Lấy URL hiện tại
   */
  get currentUrl(): string {
    return this.config.url;
  }

  /**
   * Kết nối tới Bridge
   */
  connect(url?: string): Promise<void> {
    if (url) {
      this.config.url = url;
    }

    return new Promise((resolve, reject) => {
      try {
        // Đóng kết nối cũ nếu có
        this.disconnect();
        this.isManualDisconnect = false;

        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.notifyConnectionChange(true);
          resolve();
        };

        this.ws.onclose = (event) => {
          this.clientId = null;
          this.notifyConnectionChange(false);
          
          // Auto reconnect nếu không phải manual disconnect
          if (!this.isManualDisconnect) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          reject(new Error('Không thể kết nối tới Cóc Vương LAN'));
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as BridgeMessage;
            this.handleMessage(message);
          } catch (err) {
            // Silent fail for parse errors
          }
        };

      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Ngắt kết nối
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.clientId = null;
  }

  /**
   * Đăng ký với Bridge
   */
  register(type: ClientType, name: string, arena: string, tournament: number, gdIndex?: number): void {
    this.clientType = type;
    this.clientName = name;
    this.arena = arena;
    this.tournament = tournament;

    this.send({
      type: 'register',
      clientType: type,
      name: name,
      arena: arena,
      tournament: tournament,
      gdIndex: gdIndex
    });
  }

  /**
   * Gửi điểm (dùng cho Giám Định Đối Kháng)
   */
  sendScore(gdIndex: number, color: 'red' | 'blue', score: number): void {
    this.send({
      type: 'score',
      gdIndex: gdIndex,
      color: color,
      score: score
    });
  }

  /**
   * Gửi điểm thi quyền (dùng cho Giám Định Thi Quyền)
   */
  sendMartialScore(gdIndex: number, score: number, matchNo: number, teamNo: number): void {
    this.send({
      type: 'martial_score',
      gdIndex: gdIndex,
      score: score,
      matchNo: matchNo,
      teamNo: teamNo
    });
  }

  /**
   * Reset điểm (dùng cho Giám Sát)
   */
  sendResetScore(): void {
    this.send({
      type: 'reset_score',
      arena: this.arena
    });
  }

  /**
   * Thông báo thay đổi trận đấu
   */
  sendMatchChange(matchNo: number): void {
    this.send({
      type: 'match_change',
      matchNo: matchNo,
      arena: this.arena
    });
  }

  /**
   * Gửi trạng thái kết nối (dùng cho Giám Định)
   * Giám Sát sẽ nhận được realtime status thay vì phụ thuộc Firebase presence
   */
  sendStatusUpdate(gdIndex: number, hasInternet: boolean): void {
    this.send({
      type: 'status_update',
      gdIndex: gdIndex,
      hasInternet: hasInternet
    });
  }

  /**
   * Gửi message tới Bridge
   */
  send(message: BridgeMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Đăng ký callback khi nhận message
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * Đăng ký callback khi trạng thái kết nối thay đổi
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * Đăng ký callback khi nhận điểm (dùng cho Giám Sát)
   */
  onScoreUpdate(callback: (score: ScoreUpdateMessage) => void): () => void {
    this.scoreCallbacks.add(callback);
    return () => this.scoreCallbacks.delete(callback);
  }

  /**
   * Đăng ký callback khi danh sách clients thay đổi
   */
  onClientsListChange(callback: ClientsListCallback): () => void {
    this.clientsListCallbacks.add(callback);
    // Gọi ngay với danh sách hiện tại
    callback(this.connectedClients);
    return () => this.clientsListCallbacks.delete(callback);
  }

  /**
   * Đăng ký callback khi nhận trạng thái Giám Định (dùng cho Giám Sát)
   */
  onRefereeStatusUpdate(callback: RefereeStatusCallback): () => void {
    this.refereeStatusCallbacks.add(callback);
    return () => this.refereeStatusCallbacks.delete(callback);
  }

  /**
   * Lấy danh sách clients đã kết nối
   */
  getConnectedClients(): BridgeClient[] {
    return [...this.connectedClients];
  }

  /**
   * Xử lý message nhận được
   */
  private handleMessage(message: BridgeMessage): void {
    switch (message.type) {
      case 'welcome':
        this.clientId = message.clientId;
        
        // Tự động đăng ký nếu đã có thông tin
        if (this.clientType !== 'unknown') {
          this.register(this.clientType, this.clientName, this.arena, this.tournament);
        }
        break;

      case 'clients_list':
        // Cập nhật danh sách clients từ Bridge server
        this.connectedClients = (message.clients || []) as BridgeClient[];
        this.clientsListCallbacks.forEach(cb => cb(this.connectedClients));
        break;

      case 'client_registered':
      case 'client_disconnected':
        // Khi có client đăng ký hoặc ngắt kết nối, server sẽ gửi clients_list
        // Nhưng cũng forward message này cho UI nếu cần
        this.messageCallbacks.forEach(cb => cb(message));
        break;

      case 'score_update':
        // Giám Sát nhận điểm từ Giám Định
        this.scoreCallbacks.forEach(cb => cb(message as ScoreUpdateMessage));
        break;

      case 'referee_status_update':
        // Giám Sát nhận trạng thái kết nối từ Giám Định
        this.refereeStatusCallbacks.forEach(cb => cb(message as RefereeStatusMessage));
        break;

      case 'score_reset':
        // Giám Định nhận lệnh reset từ Giám Sát
        this.messageCallbacks.forEach(cb => cb(message));
        break;

      case 'match_changed':
        // Thay đổi trận đấu
        this.messageCallbacks.forEach(cb => cb(message));
        break;

      case 'pong':
        // Keep-alive response
        break;

      default:
        // Forward các message khác
        this.messageCallbacks.forEach(cb => cb(message));
    }
  }

  /**
   * Thông báo thay đổi trạng thái kết nối
   */
  private notifyConnectionChange(connected: boolean): void {
    this.connectionCallbacks.forEach(cb => cb(connected));
  }

  /**
   * Lên lịch reconnect
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Silent fail for reconnect errors
      });
    }, this.config.reconnectInterval);
  }
}

// Singleton instance
export const bridgeService = new BridgeService();

// Export class cho testing
export { BridgeService };

/**
 * Auto-connect tới Bridge nếu đang chạy trong môi trường LAN
 * (Electron Desktop hoặc truy cập qua http://IP:3000)
 * Gọi hàm này khi app khởi động
 */
export function setupElectronBridgeAutoConnect(): void {
  // Ưu tiên 1: Check Electron injected info
  const bridgeInfo = (window as any).__COCVUONG_BRIDGE__;
  if (bridgeInfo?.url) {
    console.log('[Bridge] Detected Electron Desktop, auto-connecting to:', bridgeInfo.url);
    bridgeService.configure({ url: bridgeInfo.url });
    localStorage.setItem('bridgeUrl', bridgeInfo.url);
    localStorage.setItem('use_bridge', 'true');
    return;
  }
  
  // Ưu tiên 2: Check location-based URL (http://IP:3000)
  const locationUrl = getBridgeUrlFromLocation();
  if (locationUrl) {
    console.log('[Bridge] Detected LAN access, auto-configuring Bridge URL:', locationUrl);
    bridgeService.configure({ url: locationUrl });
    localStorage.setItem('bridgeUrl', locationUrl);
    localStorage.setItem('use_bridge', 'true');
    return;
  }
  
  // Lắng nghe event từ preload script (phòng trường hợp inject sau - chỉ cho Electron)
  window.addEventListener('cocvuong-bridge-ready', (event: any) => {
    const detail = event.detail;
    if (detail?.url) {
      console.log('[Bridge] Received bridge-ready event:', detail.url);
      bridgeService.configure({ url: detail.url });
      localStorage.setItem('bridgeUrl', detail.url);
      localStorage.setItem('use_bridge', 'true');
    }
  });
}
