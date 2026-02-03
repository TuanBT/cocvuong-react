/**
 * Offline Service - Quản lý cache data giải đấu cho chế độ offline
 * 
 * Chức năng:
 * 1. Cache data giải đấu vào localStorage
 * 2. Đọc từ cache khi offline
 * 3. Queue các thao tác ghi khi offline
 * 4. Sync pending writes khi online lại
 */

// Types
export interface CachedTournament {
  id: number;
  name: string;
  data: any;
  combatArenas: any[];
  combat: any[];
  settings: any;
  cachedAt: number; // timestamp
}

export interface PendingWrite {
  id: string;
  path: string;
  data: any;
  operation: 'set' | 'update';
  timestamp: number;
}

// Constants
const CACHE_PREFIX = 'cocvuong_offline_';
const PENDING_WRITES_KEY = 'cocvuong_pending_writes';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Kiểm tra trạng thái online/offline
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Lắng nghe thay đổi trạng thái mạng
 */
export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

/**
 * Lưu data giải đấu vào cache
 */
export function cacheTournament(tournamentId: number, data: CachedTournament): void {
  try {
    const key = `${CACHE_PREFIX}tournament_${tournamentId}`;
    data.cachedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`[Offline] Cached tournament ${tournamentId}`);
  } catch (err) {
    console.error('[Offline] Failed to cache tournament:', err);
    // localStorage có thể đầy, thử xóa cache cũ
    clearExpiredCache();
  }
}

/**
 * Đọc data giải đấu từ cache
 */
export function getCachedTournament(tournamentId: number): CachedTournament | null {
  try {
    const key = `${CACHE_PREFIX}tournament_${tournamentId}`;
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedTournament;
    
    // Kiểm tra cache có hết hạn không
    if (Date.now() - data.cachedAt > CACHE_EXPIRY_MS) {
      console.log(`[Offline] Cache expired for tournament ${tournamentId}`);
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('[Offline] Failed to read cached tournament:', err);
    return null;
  }
}

/**
 * Lấy danh sách các giải đấu đã cache
 */
export function getCachedTournamentList(): { id: number; name: string; cachedAt: number }[] {
  const list: { id: number; name: string; cachedAt: number }[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${CACHE_PREFIX}tournament_`)) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        list.push({
          id: data.id,
          name: data.name,
          cachedAt: data.cachedAt
        });
      } catch (err) {
        // Skip invalid entries
      }
    }
  }
  
  return list.sort((a, b) => b.cachedAt - a.cachedAt);
}

/**
 * Xóa cache của giải đấu
 */
export function clearTournamentCache(tournamentId: number): void {
  const key = `${CACHE_PREFIX}tournament_${tournamentId}`;
  localStorage.removeItem(key);
  console.log(`[Offline] Cleared cache for tournament ${tournamentId}`);
}

/**
 * Xóa tất cả cache đã hết hạn
 */
export function clearExpiredCache(): void {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${CACHE_PREFIX}tournament_`)) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (Date.now() - data.cachedAt > CACHE_EXPIRY_MS) {
          keysToRemove.push(key);
        }
      } catch (err) {
        keysToRemove.push(key);
      }
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log(`[Offline] Cleared ${keysToRemove.length} expired cache entries`);
}

// =============================================================================
// PENDING WRITES QUEUE
// =============================================================================

/**
 * Thêm thao tác ghi vào queue (khi offline)
 */
export function addPendingWrite(path: string, data: any, operation: 'set' | 'update' = 'set'): string {
  const pendingWrites = getPendingWrites();
  
  const write: PendingWrite = {
    id: `pw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    path,
    data,
    operation,
    timestamp: Date.now()
  };
  
  pendingWrites.push(write);
  savePendingWrites(pendingWrites);
  
  console.log(`[Offline] Added pending write: ${path}`);
  return write.id;
}

/**
 * Lấy danh sách pending writes
 */
export function getPendingWrites(): PendingWrite[] {
  try {
    const stored = localStorage.getItem(PENDING_WRITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    return [];
  }
}

/**
 * Lưu pending writes
 */
function savePendingWrites(writes: PendingWrite[]): void {
  try {
    localStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(writes));
  } catch (err) {
    console.error('[Offline] Failed to save pending writes:', err);
  }
}

/**
 * Xóa pending write sau khi đã sync thành công
 */
export function removePendingWrite(writeId: string): void {
  const writes = getPendingWrites().filter(w => w.id !== writeId);
  savePendingWrites(writes);
}

/**
 * Xóa tất cả pending writes
 */
export function clearPendingWrites(): void {
  localStorage.removeItem(PENDING_WRITES_KEY);
}

/**
 * Đếm số pending writes
 */
export function getPendingWritesCount(): number {
  return getPendingWrites().length;
}

// =============================================================================
// SYNC MANAGER
// =============================================================================

import { ref, set, update, Database } from 'firebase/database';

/**
 * Sync tất cả pending writes lên Firebase
 */
export async function syncPendingWrites(db: Database): Promise<{ success: number; failed: number }> {
  const writes = getPendingWrites();
  if (writes.length === 0) {
    return { success: 0, failed: 0 };
  }
  
  console.log(`[Offline] Syncing ${writes.length} pending writes...`);
  
  let success = 0;
  let failed = 0;
  
  for (const write of writes) {
    try {
      const dbRef = ref(db, write.path);
      
      if (write.operation === 'set') {
        await set(dbRef, write.data);
      } else {
        await update(dbRef, write.data);
      }
      
      removePendingWrite(write.id);
      success++;
      console.log(`[Offline] Synced: ${write.path}`);
    } catch (err) {
      console.error(`[Offline] Failed to sync: ${write.path}`, err);
      failed++;
    }
  }
  
  console.log(`[Offline] Sync complete: ${success} success, ${failed} failed`);
  return { success, failed };
}

// =============================================================================
// COMBAT ARENA CACHE (cho Giám Sát)
// =============================================================================

/**
 * Cache thông tin sân thi đấu
 */
export interface CachedCombatArena {
  tournamentId: number;
  arenaIndex: number;
  arenaName: string;
  combat: any[]; // Danh sách trận đấu
  settings: any; // Cài đặt (thời gian, số trọng tài...)
  lastMatch: number;
  cachedAt: number;
}

/**
 * Lưu cache sân thi đấu
 */
export function cacheCombatArena(tournamentId: number, arenaIndex: number, data: Partial<CachedCombatArena>): void {
  const key = `${CACHE_PREFIX}arena_${tournamentId}_${arenaIndex}`;
  const existingData: Partial<CachedCombatArena> = getCachedCombatArena(tournamentId, arenaIndex) || {};
  
  const cacheData: CachedCombatArena = {
    tournamentId,
    arenaIndex,
    arenaName: data.arenaName || existingData.arenaName || `Sân ${arenaIndex + 1}`,
    combat: data.combat || existingData.combat || [],
    settings: data.settings || existingData.settings || {},
    lastMatch: data.lastMatch ?? existingData.lastMatch ?? 0,
    cachedAt: Date.now()
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`[Offline] Cached arena ${tournamentId}/${arenaIndex}`);
  } catch (err) {
    console.error('[Offline] Failed to cache arena:', err);
  }
}

/**
 * Đọc cache sân thi đấu
 */
export function getCachedCombatArena(tournamentId: number, arenaIndex: number): CachedCombatArena | null {
  const key = `${CACHE_PREFIX}arena_${tournamentId}_${arenaIndex}`;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedCombatArena;
    
    // Kiểm tra hết hạn
    if (Date.now() - data.cachedAt > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Cập nhật lastMatch trong cache
 */
export function updateCachedLastMatch(tournamentId: number, arenaIndex: number, lastMatch: number): void {
  const cached = getCachedCombatArena(tournamentId, arenaIndex);
  if (cached) {
    cacheCombatArena(tournamentId, arenaIndex, { ...cached, lastMatch });
  }
}

// =============================================================================
// HELPER - Smart Firebase Operation
// =============================================================================

/**
 * Thực hiện thao tác Firebase với fallback offline
 * - Online: Ghi trực tiếp lên Firebase
 * - Offline: Thêm vào pending queue và cập nhật cache local
 */
export function smartSet(
  db: Database,
  path: string,
  data: any,
  options?: {
    tournamentId?: number;
    arenaIndex?: number;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      // Online: ghi trực tiếp
      set(ref(db, path), data)
        .then(resolve)
        .catch((err) => {
          // Nếu ghi thất bại, thêm vào queue
          console.warn('[Offline] Firebase write failed, queuing:', err);
          addPendingWrite(path, data, 'set');
          resolve(); // Vẫn resolve để app tiếp tục
        });
    } else {
      // Offline: thêm vào queue
      addPendingWrite(path, data, 'set');
      resolve();
    }
  });
}

export function smartUpdate(
  db: Database,
  path: string,
  data: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      update(ref(db, path), data)
        .then(resolve)
        .catch((err) => {
          console.warn('[Offline] Firebase update failed, queuing:', err);
          addPendingWrite(path, data, 'update');
          resolve();
        });
    } else {
      addPendingWrite(path, data, 'update');
      resolve();
    }
  });
}

// =============================================================================
// MARTIAL ARENA CACHE (cho Giám Sát Thi Quyền)
// =============================================================================

/**
 * Cache thông tin sân thi quyền
 */
export interface CachedMartialArena {
  tournamentId: number;
  arenaIndex: number | string;
  arenaName: string;
  martial: any[]; // Danh sách bài quyền
  settings: any;
  lastMatchMartial: {
    matchMartialNo: number;
    teamMartialNo: number;
  };
  cachedAt: number;
}

/**
 * Lưu cache sân thi quyền
 */
export function cacheMartialArena(tournamentId: number, arenaIndex: number | string, data: Partial<CachedMartialArena>): void {
  const key = `${CACHE_PREFIX}martial_${tournamentId}_${arenaIndex}`;
  const existingData: Partial<CachedMartialArena> = getCachedMartialArena(tournamentId, arenaIndex) || {};
  
  const cacheData: CachedMartialArena = {
    tournamentId,
    arenaIndex,
    arenaName: data.arenaName || existingData.arenaName || `Sân ${arenaIndex}`,
    martial: data.martial || existingData.martial || [],
    settings: data.settings || existingData.settings || {},
    lastMatchMartial: data.lastMatchMartial || existingData.lastMatchMartial || { matchMartialNo: 1, teamMartialNo: 1 },
    cachedAt: Date.now()
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(cacheData));
    console.log(`[Offline] Cached martial arena ${tournamentId}/${arenaIndex}`);
  } catch (err) {
    console.error('[Offline] Failed to cache martial arena:', err);
  }
}

/**
 * Đọc cache sân thi quyền
 */
export function getCachedMartialArena(tournamentId: number, arenaIndex: number | string): CachedMartialArena | null {
  const key = `${CACHE_PREFIX}martial_${tournamentId}_${arenaIndex}`;
  
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const data = JSON.parse(cached) as CachedMartialArena;
    
    // Kiểm tra hết hạn
    if (Date.now() - data.cachedAt > CACHE_EXPIRY_MS) {
      localStorage.removeItem(key);
      return null;
    }
    
    return data;
  } catch (err) {
    return null;
  }
}
