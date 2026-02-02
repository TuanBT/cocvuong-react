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
 * - Ưu tiên Bridge (LAN) vì nhanh hơn và hoạt động khi offline
 * - Firebase làm fallback khi không có Bridge
 * - Tự động chuyển đổi khi Bridge connect/disconnect
 * 
 * @param onScoreUpdate callback nhận (refereeIndex, redScore, blueScore, isFullUpdate)
 *   - isFullUpdate = true: Firebase update, ghi đè cả 2 giá trị
 *   - isFullUpdate = false: Bridge update, chỉ 1 màu có giá trị
 */
export function subscribeScoreForGiamSat(
  config: ScoreSubscribeConfig,
  numReferee: number,
  onScoreUpdate: (refereeIndex: number, redScore: number, blueScore: number, isFullUpdate: boolean) => void
): () => void {
  const { db, tournamentNoIndex, combatArenaNoIndex } = config;
  const cleanupFns: Array<() => void> = [];
  
  // Track để ưu tiên Bridge
  let bridgeScoreTimestamps: Map<string, number> = new Map(); // key: "gdIndex-color"
  const BRIDGE_PRIORITY_WINDOW = 2000; // 2 giây - bỏ qua Firebase nếu Bridge đã gửi điểm này gần đây

  // 1. Subscribe từ Bridge - luôn đăng ký callback (ngay cả khi chưa connected)
  // BridgeService sẽ gọi callback khi nhận được điểm từ LAN
  const unsubscribeBridge = bridgeService.onScoreUpdate((scoreMsg) => {
    const key = `${scoreMsg.gdIndex}-${scoreMsg.color}`;
    bridgeScoreTimestamps.set(key, Date.now());
    
    // Bridge điểm ưu tiên - gọi update ngay
    // isFullUpdate = false vì Bridge chỉ gửi 1 màu tại 1 thời điểm
    const score = scoreMsg.color === 'red' 
      ? { red: scoreMsg.score, blue: 0 }
      : { red: 0, blue: scoreMsg.score };
    onScoreUpdate(scoreMsg.gdIndex, score.red, score.blue, false);
  });
  cleanupFns.push(unsubscribeBridge);

  // 2. Subscribe từ Firebase (backup khi không có Bridge)
  const refereePath = `tournament/${tournamentNoIndex}/combatArena/${combatArenaNoIndex}/referee`;
  const refereeRef = ref(db, refereePath);
  
  onValue(refereeRef, (snapshot) => {
    const refereeData = snapshot.val();
    if (refereeData && Array.isArray(refereeData)) {
      refereeData.forEach((referee: any, index: number) => {
        if (referee && (referee.redScore !== undefined || referee.blueScore !== undefined)) {
          const redScore = referee.redScore || 0;
          const blueScore = referee.blueScore || 0;
          
          // QUAN TRỌNG: Nếu Firebase trả về điểm = 0, đây là reset từ Giám Sát
          // Phải luôn áp dụng reset, không bỏ qua dù Bridge vừa gửi điểm
          if (redScore === 0 && blueScore === 0) {
            // Clear bridge timestamps for this referee to allow fresh scoring
            bridgeScoreTimestamps.delete(`${index}-red`);
            bridgeScoreTimestamps.delete(`${index}-blue`);
            onScoreUpdate(index, 0, 0, true); // isFullUpdate = true để reset cả 2 màu
            return;
          }
          
          // Kiểm tra xem Bridge đã gửi điểm này gần đây chưa
          // Nếu có Bridge connected và đã nhận điểm từ Bridge trong 2s → bỏ qua Firebase
          const now = Date.now();
          const redKey = `${index}-red`;
          const blueKey = `${index}-blue`;
          
          const redBridgeTime = bridgeScoreTimestamps.get(redKey) || 0;
          const blueBridgeTime = bridgeScoreTimestamps.get(blueKey) || 0;
          
          // Nếu Bridge connected và đã gửi điểm gần đây → Firebase chỉ là echo, bỏ qua
          if (bridgeService.isConnected) {
            const skipRed = (now - redBridgeTime) < BRIDGE_PRIORITY_WINDOW;
            const skipBlue = (now - blueBridgeTime) < BRIDGE_PRIORITY_WINDOW;
            
            if (skipRed && skipBlue) {
              // Cả 2 đều đã nhận từ Bridge → bỏ qua Firebase update này
              return;
            }
          }
          
          // Không có Bridge hoặc Bridge chưa gửi điểm này → dùng Firebase
          // isFullUpdate = true vì Firebase có cả 2 giá trị
          onScoreUpdate(index, redScore, blueScore, true);
        }
      });
    }
  });

  cleanupFns.push(() => off(refereeRef));

  // Return cleanup function
  return () => {
    cleanupFns.forEach(fn => fn());
    bridgeScoreTimestamps.clear();
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
    const displayName = name || `Giám Định ${gdIndex + 1}`;
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
 * Gửi thông báo reset điểm qua Bridge (dùng cho Giám Sát)
 */
export function sendResetScoreViaBridge(): void {
  if (bridgeService.isConnected) {
    bridgeService.sendResetScore();
  }
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
