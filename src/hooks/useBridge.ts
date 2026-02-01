/**
 * Hook để quản lý kết nối Bridge
 * Cung cấp interface đơn giản để sử dụng trong components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { bridgeService, BridgeMessage, ScoreUpdateMessage, ClientType } from '../services/bridgeService';

interface UseBridgeConnectionOptions {
  autoConnect?: boolean;
  url?: string;
  clientType?: ClientType;
  clientName?: string;
  arena?: string;
  tournament?: number;
}

interface UseBridgeConnectionResult {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: (url?: string) => Promise<void>;
  disconnect: () => void;
  register: (type: ClientType, name: string, arena: string, tournament: number) => void;
  bridgeUrl: string;
  setBridgeUrl: (url: string) => void;
}

/**
 * Hook để quản lý kết nối Bridge
 */
export function useBridgeConnection(options: UseBridgeConnectionOptions = {}): UseBridgeConnectionResult {
  const {
    autoConnect = false,
    url = 'ws://localhost:8765',
    clientType,
    clientName,
    arena,
    tournament
  } = options;

  const [isConnected, setIsConnected] = useState(bridgeService.isConnected);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bridgeUrl, setBridgeUrl] = useState(url);
  
  const mountedRef = useRef(true);

  // Theo dõi trạng thái kết nối
  useEffect(() => {
    mountedRef.current = true;
    
    const unsubscribe = bridgeService.onConnectionChange((connected) => {
      if (mountedRef.current) {
        setIsConnected(connected);
        setIsConnecting(false);
        if (!connected) {
          setError('Mất kết nối với Bridge');
        } else {
          setError(null);
        }
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Auto connect nếu được enable
  useEffect(() => {
    if (autoConnect && bridgeUrl && !isConnected && !isConnecting) {
      connect(bridgeUrl);
    }
  }, [autoConnect, bridgeUrl]);

  // Auto register sau khi kết nối
  useEffect(() => {
    if (isConnected && clientType && clientName && arena !== undefined && tournament !== undefined) {
      bridgeService.register(clientType, clientName, arena, tournament);
    }
  }, [isConnected, clientType, clientName, arena, tournament]);

  const connect = useCallback(async (connectUrl?: string) => {
    const urlToUse = connectUrl || bridgeUrl;
    
    setIsConnecting(true);
    setError(null);

    try {
      await bridgeService.connect(urlToUse);
      if (mountedRef.current) {
        setBridgeUrl(urlToUse);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Không thể kết nối');
        setIsConnecting(false);
      }
    }
  }, [bridgeUrl]);

  const disconnect = useCallback(() => {
    bridgeService.disconnect();
    setIsConnected(false);
  }, []);

  const register = useCallback((type: ClientType, name: string, arenaId: string, tournamentId: number) => {
    bridgeService.register(type, name, arenaId, tournamentId);
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    register,
    bridgeUrl,
    setBridgeUrl
  };
}

/**
 * Hook để gửi điểm qua Bridge (dùng cho Giám Định)
 */
export function useBridgeScoreSender() {
  const sendScore = useCallback((gdIndex: number, color: 'red' | 'blue', score: number) => {
    if (bridgeService.isConnected) {
      bridgeService.sendScore(gdIndex, color, score);
      return true;
    }
    return false;
  }, []);

  return { sendScore, isConnected: bridgeService.isConnected };
}

/**
 * Hook để nhận điểm từ Bridge (dùng cho Giám Sát)
 */
export function useBridgeScoreReceiver(onScore: (score: ScoreUpdateMessage) => void) {
  const callbackRef = useRef(onScore);
  
  useEffect(() => {
    callbackRef.current = onScore;
  }, [onScore]);

  useEffect(() => {
    const unsubscribe = bridgeService.onScoreUpdate((score) => {
      callbackRef.current(score);
    });

    return unsubscribe;
  }, []);
}

/**
 * Hook để lắng nghe các message từ Bridge
 */
export function useBridgeMessages(onMessage: (message: BridgeMessage) => void) {
  const callbackRef = useRef(onMessage);
  
  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    const unsubscribe = bridgeService.onMessage((message) => {
      callbackRef.current(message);
    });

    return unsubscribe;
  }, []);
}

// Export type
export type { ScoreUpdateMessage, BridgeMessage, ClientType };
