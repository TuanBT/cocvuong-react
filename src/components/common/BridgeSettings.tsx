/**
 * Bridge Settings Component
 * Hiển thị trong Settings để cấu hình kết nối LAN Bridge
 */

import React, { useState, useEffect } from 'react';
import { bridgeService } from '../../services/bridgeService';

interface BridgeSettingsProps {
  clientType: 'giam_sat' | 'giam_dinh';
  clientName: string;
  arena: string;
  tournament: number;
  onConnectionChange?: (connected: boolean) => void;
}

export const BridgeSettings: React.FC<BridgeSettingsProps> = ({
  clientType,
  clientName,
  arena,
  tournament,
  onConnectionChange
}) => {
  const [bridgeUrl, setBridgeUrl] = useState(
    localStorage.getItem('bridge_url') || 'ws://192.168.1.100:8765'
  );
  const [isConnected, setIsConnected] = useState(bridgeService.isConnected);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBridge, setUseBridge] = useState(
    localStorage.getItem('use_bridge') === 'true'
  );

  useEffect(() => {
    const unsubscribe = bridgeService.onConnectionChange((connected) => {
      setIsConnected(connected);
      setIsConnecting(false);
      onConnectionChange?.(connected);
    });

    return unsubscribe;
  }, [onConnectionChange]);

  const handleConnect = async () => {
    if (!bridgeUrl.trim()) {
      setError('Vui lòng nhập địa chỉ Bridge');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await bridgeService.connect(bridgeUrl);
      bridgeService.register(clientType, clientName, arena, tournament);
      localStorage.setItem('bridge_url', bridgeUrl);
      localStorage.setItem('use_bridge', 'true');
      setUseBridge(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể kết nối');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    bridgeService.disconnect();
    setUseBridge(false);
    localStorage.setItem('use_bridge', 'false');
  };

  const handleToggleBridge = () => {
    if (useBridge) {
      handleDisconnect();
    } else {
      handleConnect();
    }
  };

  return (
    <div className="bridge-settings">
      <div className="bridge-settings-header">
        <h3>
          <span className="icon">🌉</span>
          Kết nối LAN (Bridge)
        </h3>
        <p className="description">
          Sử dụng khi mạng Internet không ổn định. Cần bật app CocVuong Bridge trên máy Giám Sát.
        </p>
      </div>

      <div className="bridge-settings-content">
        {/* Toggle */}
        <div className="setting-row">
          <label className="setting-label">
            <span>Bật chế độ LAN</span>
            <small>Chấm điểm qua mạng nội bộ</small>
          </label>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={useBridge && isConnected}
              onChange={handleToggleBridge}
              disabled={isConnecting}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* URL Input */}
        <div className="setting-row">
          <label className="setting-label">
            <span>Địa chỉ Bridge</span>
            <small>Nhập từ QR code hoặc app Bridge</small>
          </label>
          <div className="input-group">
            <input
              type="text"
              value={bridgeUrl}
              onChange={(e) => setBridgeUrl(e.target.value)}
              placeholder="ws://192.168.1.100:8765"
              disabled={isConnected || isConnecting}
              className="bridge-url-input"
            />
          </div>
        </div>

        {/* Status */}
        <div className="setting-row status-row">
          <div className={`connection-status ${isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {isConnecting ? 'Đang kết nối...' : isConnected ? 'Đã kết nối' : 'Chưa kết nối'}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message">
            <span className="icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="setting-actions">
          {!isConnected ? (
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={isConnecting || !bridgeUrl.trim()}
            >
              {isConnecting ? '⏳ Đang kết nối...' : '🔗 Kết nối Bridge'}
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={handleDisconnect}
            >
              ❌ Ngắt kết nối
            </button>
          )}
        </div>

        {/* Help */}
        <div className="help-text">
          <h4>Hướng dẫn:</h4>
          <ol>
            <li>Mở app <strong>CocVuong Bridge</strong> trên laptop Giám Sát</li>
            <li>Scan QR code hoặc copy link từ app Bridge</li>
            <li>Dán link vào ô địa chỉ ở trên</li>
            <li>Nhấn "Kết nối Bridge"</li>
          </ol>
        </div>
      </div>

      <style>{`
        .bridge-settings {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          margin: 15px 0;
        }

        .bridge-settings-header h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 8px 0;
          color: #2c3e50;
          font-size: 18px;
        }

        .bridge-settings-header .description {
          color: #7f8c8d;
          font-size: 13px;
          margin: 0 0 15px 0;
        }

        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
        }

        .setting-row:last-child {
          border-bottom: none;
        }

        .setting-label {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .setting-label span {
          font-weight: 500;
          color: #2c3e50;
        }

        .setting-label small {
          color: #95a5a6;
          font-size: 12px;
        }

        .toggle-switch {
          position: relative;
          width: 50px;
          height: 26px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
          border-radius: 26px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: #27ae60;
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(24px);
        }

        .bridge-url-input {
          width: 100%;
          padding: 10px 14px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          font-family: monospace;
        }

        .bridge-url-input:focus {
          outline: none;
          border-color: #3498db;
        }

        .bridge-url-input:disabled {
          background: #f5f5f5;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }

        .connection-status.connected {
          background: #d4edda;
          color: #155724;
        }

        .connection-status.connecting {
          background: #fff3cd;
          color: #856404;
        }

        .connection-status.disconnected {
          background: #f8d7da;
          color: #721c24;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: currentColor;
        }

        .connected .status-dot {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-top: 10px;
        }

        .setting-actions {
          margin-top: 15px;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3498db;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2980b9;
        }

        .btn-secondary {
          background: #e74c3c;
          color: white;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .help-text {
          margin-top: 20px;
          padding: 15px;
          background: #e8f4fd;
          border-radius: 8px;
          font-size: 13px;
        }

        .help-text h4 {
          margin: 0 0 10px 0;
          color: #2c3e50;
        }

        .help-text ol {
          margin: 0;
          padding-left: 20px;
          color: #34495e;
        }

        .help-text li {
          margin: 6px 0;
        }
      `}</style>
    </div>
  );
};

export default BridgeSettings;
