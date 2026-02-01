/**
 * Score Sync Utility
 * 
 * Utility để đồng bộ điểm giữa Giám Định và Giám Sát
 * Hỗ trợ cả Firebase (online) và Bridge (LAN)
 */

import { bridgeService } from '../services/bridgeService';
import { ref, update, onValue, off } from 'firebase/database';

export interface ScoreSyncConfig {
  db: any; // Firebase Database
  tournamentNoIndex: number;
  combatArenaNoIndex: number;
  refereeIndex: number;
  arena: string;
}

export interface ScoreSubscribeConfig {
  db: any; // Firebase Database
  tournamentNoIndex: number;
  combatArenaNoIndex: number;
  arena?: string;
}

/**
 * Gửi điểm từ Giám Định
 * - Nếu có Bridge connection: gửi qua Bridge trước
 * - Luôn gửi lên Firebase (nếu có mạng) để backup
 */
export function sendScoreFromGiamDinh(
  config: ScoreSyncConfig,
  color: 'red' | 'blue',
  score: number
): void {
  const { db, tournamentNoIndex, combatArenaNoIndex, refereeIndex, arena } = config;
  const path = `tournament/${tournamentNoIndex}/combatArena/${combatArenaNoIndex}/referee/${refereeIndex}`;

  // 1. Gửi qua Bridge nếu có kết nối
  if (bridgeService.isConnected) {
    bridgeService.sendScore(refereeIndex, color, score);
  }

  // 2. Gửi lên Firebase
  const updateData = color === 'red' ? { redScore: score } : { blueScore: score };
  update(ref(db, path), updateData)
    .then(() => {
    })
    .catch((err) => {
    });
}

/**
 * Đăng ký nhận điểm cho Giám Sát
 * - Nhận từ Bridge (ưu tiên)
 * - Fallback Firebase
 */
export function subscribeScoreForGiamSat(
  config: ScoreSubscribeConfig,
  numReferee: number,
  onScoreUpdate: (refereeIndex: number, redScore: number, blueScore: number) => void
): () => void {
  const { db, tournamentNoIndex, combatArenaNoIndex } = config;
  const cleanupFns: Array<() => void> = [];

  // 1. Subscribe từ Bridge
  if (bridgeService.isConnected) {
    const unsubscribeBridge = bridgeService.onScoreUpdate((scoreMsg) => {
      const score = scoreMsg.color === 'red' 
        ? { red: scoreMsg.score, blue: 0 }
        : { red: 0, blue: scoreMsg.score };
      onScoreUpdate(scoreMsg.gdIndex, score.red, score.blue);
    });
    cleanupFns.push(unsubscribeBridge);
  }

  // 2. Subscribe từ Firebase (luôn để đồng bộ multi-sân)
  const refereePath = `tournament/${tournamentNoIndex}/combatArena/${combatArenaNoIndex}/referee`;
  const refereeRef = ref(db, refereePath);
  
  onValue(refereeRef, (snapshot) => {
    const refereeData = snapshot.val();
    if (refereeData && Array.isArray(refereeData)) {
      refereeData.forEach((referee: any, index: number) => {
        if (referee && (referee.redScore !== undefined || referee.blueScore !== undefined)) {
          onScoreUpdate(index, referee.redScore || 0, referee.blueScore || 0);
        }
      });
    }
  });

  cleanupFns.push(() => off(refereeRef));

  // Return cleanup function
  return () => {
    cleanupFns.forEach(fn => fn());
  };
}

/**
 * Kết nối Bridge từ Giám Định
 */
export async function connectBridgeAsGiamDinh(
  bridgeUrl: string,
  gdIndex: number,
  arena: string,
  tournament: number,
  name?: string
): Promise<boolean> {
  try {
    await bridgeService.connect(bridgeUrl);
    const displayName = name || `Giám định ${gdIndex + 1}`;
    bridgeService.register('giam_dinh', displayName, arena, tournament);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Kết nối Bridge từ Giám Sát
 */
export async function connectBridgeAsGiamSat(
  bridgeUrl: string,
  arena: string,
  tournament: number,
  name?: string
): Promise<boolean> {
  try {
    await bridgeService.connect(bridgeUrl);
    const displayName = name || `Giám sát sân ${arena}`;
    bridgeService.register('giam_sat', displayName, arena, tournament);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Kiểm tra trạng thái Bridge
 */
export function isBridgeConnected(): boolean {
  return bridgeService.isConnected;
}

/**
 * Ngắt kết nối Bridge
 */
export function disconnectBridge(): void {
  bridgeService.disconnect();
}

/**
 * Đăng ký callback khi trạng thái Bridge thay đổi
 */
export function onBridgeConnectionChange(callback: (connected: boolean) => void): () => void {
  return bridgeService.onConnectionChange(callback);
}

/**
 * Đăng ký callback khi danh sách clients thay đổi (cho Giám Sát)
 */
export function onBridgeClientsChange(callback: (clients: any[]) => void): () => void {
  return bridgeService.onClientsListChange(callback);
}

/**
 * Lấy danh sách clients đã kết nối qua Bridge
 */
export function getBridgeClients(): any[] {
  return bridgeService.getConnectedClients();
}
