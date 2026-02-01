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

export type ClientType = 'giam_sat' | 'giam_dinh' | 'unknown';

export interface BridgeClient {
  id: string;
  type: ClientType;
  name: string;
  connected: boolean;
}

type MessageCallback = (message: BridgeMessage) => void;
type ConnectionCallback = (connected: boolean) => void;

// Default config
const DEFAULT_CONFIG: Required<BridgeConfig> = {
  url: 'ws://localhost:8765',
  reconnectInterval: 3000,
  maxReconnectAttempts: 10
};

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

        console.log('[Bridge] Đang kết nối tới:', this.config.url);
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('[Bridge] Đã kết nối!');
          this.reconnectAttempts = 0;
          this.notifyConnectionChange(true);
          resolve();
        };

        this.ws.onclose = (event) => {
          console.log('[Bridge] Đã ngắt kết nối:', event.code, event.reason);
          this.clientId = null;
          this.notifyConnectionChange(false);
          
          // Auto reconnect nếu không phải manual disconnect
          if (!this.isManualDisconnect) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('[Bridge] Lỗi kết nối:', error);
          reject(new Error('Không thể kết nối tới Bridge'));
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as BridgeMessage;
            this.handleMessage(message);
          } catch (err) {
            console.error('[Bridge] Lỗi parse message:', err);
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
  register(type: ClientType, name: string, arena: string, tournament: number): void {
    this.clientType = type;
    this.clientName = name;
    this.arena = arena;
    this.tournament = tournament;

    this.send({
      type: 'register',
      clientType: type,
      name: name,
      arena: arena,
      tournament: tournament
    });
  }

  /**
   * Gửi điểm (dùng cho Giám Định)
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
   * Gửi message tới Bridge
   */
  send(message: BridgeMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[Bridge] Chưa kết nối, không thể gửi message');
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
   * Xử lý message nhận được
   */
  private handleMessage(message: BridgeMessage): void {
    console.log('[Bridge] Nhận message:', message.type, message);

    switch (message.type) {
      case 'welcome':
        this.clientId = message.clientId;
        console.log('[Bridge] Client ID:', this.clientId);
        
        // Tự động đăng ký nếu đã có thông tin
        if (this.clientType !== 'unknown') {
          this.register(this.clientType, this.clientName, this.arena, this.tournament);
        }
        break;

      case 'score_update':
        // Giám Sát nhận điểm từ Giám Định
        this.scoreCallbacks.forEach(cb => cb(message as ScoreUpdateMessage));
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
      console.log('[Bridge] Đã hết số lần thử kết nối lại');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[Bridge] Thử kết nối lại lần ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} sau ${this.config.reconnectInterval}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(err => {
        console.error('[Bridge] Kết nối lại thất bại:', err);
      });
    }, this.config.reconnectInterval);
  }
}

// Singleton instance
export const bridgeService = new BridgeService();

// Export class cho testing
export { BridgeService };
