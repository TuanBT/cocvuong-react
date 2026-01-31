/**
 * Firebase Service Layer
 * Cung cấp các hàm tiện ích để tương tác với Firebase
 */

import { initializeApp, FirebaseApp } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  remove, 
  child, 
  onValue,
  off,
  Database,
  DatabaseReference,
  DataSnapshot
} from "firebase/database";
import { Tournament, TournamentSetting, CombatMatch, CombatArena, RefereeScore } from '../types';

// Singleton instance
let dbInstance: Database | null = null;

interface FirebaseConfig {
  apiKey: string | undefined;
  authDomain: string | undefined;
  databaseURL: string | undefined;
  projectId: string | undefined;
  storageBucket: string | undefined;
  messagingSenderId: string | undefined;
  appId: string | undefined;
}

/**
 * Khởi tạo và trả về Firebase Database instance
 */
export const getFirebaseDb = (): Database => {
  if (dbInstance) {
    return dbInstance;
  }

  console.log("Database environment: ", process.env.REACT_APP_FIREBASE_ENV);
  
  const firebaseConfig: FirebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };

  const app: FirebaseApp = initializeApp(firebaseConfig);
  dbInstance = getDatabase(app);
  return dbInstance;
};

/**
 * Đọc dữ liệu một lần từ Firebase
 */
export const getData = async <T = any>(path: string): Promise<T | null> => {
  const db = getFirebaseDb();
  const snapshot = await get(child(ref(db), path));
  return snapshot.val() as T | null;
};

/**
 * Ghi dữ liệu vào Firebase
 */
export const setData = async <T>(path: string, data: T): Promise<void> => {
  const db = getFirebaseDb();
  return set(ref(db, path), data);
};

/**
 * Cập nhật dữ liệu trong Firebase
 */
export const updateData = async (path: string, data: Record<string, any>): Promise<void> => {
  const db = getFirebaseDb();
  return update(ref(db, path), data);
};

/**
 * Xóa dữ liệu từ Firebase
 */
export const removeData = async (path: string): Promise<void> => {
  const db = getFirebaseDb();
  return remove(ref(db, path));
};

/**
 * Lắng nghe thay đổi dữ liệu realtime
 */
export const subscribeToData = <T = any>(
  path: string, 
  callback: (data: T | null, snapshot: DataSnapshot) => void
): () => void => {
  const db = getFirebaseDb();
  const dataRef = ref(db, path);
  
  onValue(dataRef, (snapshot) => {
    callback(snapshot.val() as T | null, snapshot);
  });

  // Trả về hàm unsubscribe
  return () => {
    off(dataRef);
  };
};

/**
 * Kiểm tra kết nối internet qua Firebase
 */
export const subscribeToConnectionStatus = (callback: (connected: boolean) => void): () => void => {
  const db = getFirebaseDb();
  const connectedRef = ref(db, '.info/connected');
  
  onValue(connectedRef, (snapshot) => {
    callback(snapshot.val() === true);
  });

  return () => {
    off(connectedRef);
  };
};

/**
 * Xác thực mật khẩu
 */
export const verifyPassword = async (
  passwordType: 'passwordSetting' | 'passwordGiamSat' | 'passwordGiamDinh', 
  inputPassword: string
): Promise<boolean> => {
  if (!inputPassword) {
    return false;
  }
  
  const correctPassword = await getData<string | number>(`commonSetting/${passwordType}`);
  return String(inputPassword) === String(correctPassword);
};

interface TournamentListItem {
  index: number;
  name: string;
}

/**
 * Lấy danh sách giải đấu
 */
export const getTournaments = async (): Promise<TournamentListItem[]> => {
  const tournaments = await getData<Tournament[]>('tournament');
  if (!tournaments) return [];
  
  return tournaments.map((tournament, index) => ({
    index,
    name: tournament.setting?.tournamentName || `Giải ${index + 1}`
  }));
};

/**
 * Lấy cài đặt giải đấu
 */
export const getTournamentSetting = async (tournamentIndex: number = 0): Promise<TournamentSetting | null> => {
  return getData<TournamentSetting>(`tournament/${tournamentIndex}/setting`);
};

/**
 * Lấy thông tin trận đấu đối kháng
 */
export const getCombatMatch = async (tournamentIndex: number, combatIndex: number): Promise<CombatMatch | null> => {
  return getData<CombatMatch>(`tournament/${tournamentIndex}/combat/${combatIndex}`);
};

/**
 * Cập nhật thông tin trận đấu
 */
export const updateCombatMatch = async (
  tournamentIndex: number, 
  combatIndex: number, 
  matchData: Partial<CombatMatch>
): Promise<void> => {
  return updateData(`tournament/${tournamentIndex}/combat/${combatIndex}`, matchData);
};

/**
 * Lấy thông tin sân thi đấu
 */
export const getCombatArena = async (tournamentIndex: number, arenaIndex: number): Promise<CombatArena | null> => {
  return getData<CombatArena>(`tournament/${tournamentIndex}/combatArena/${arenaIndex}`);
};

/**
 * Subscribe vào trận đấu hiện tại
 */
export const subscribeToLastMatch = (
  tournamentIndex: number, 
  arenaIndex: number, 
  callback: (data: { no: number } | null, snapshot: DataSnapshot) => void
): () => void => {
  return subscribeToData(
    `tournament/${tournamentIndex}/combatArena/${arenaIndex}/lastMatch`,
    callback
  );
};

/**
 * Subscribe vào điểm của giám định
 */
export const subscribeToRefereeScores = (
  tournamentIndex: number, 
  arenaIndex: number, 
  callback: (data: RefereeScore[] | null, snapshot: DataSnapshot) => void
): () => void => {
  return subscribeToData(
    `tournament/${tournamentIndex}/combatArena/${arenaIndex}/referee`,
    callback
  );
};

/**
 * Cập nhật điểm giám định
 */
export const updateRefereeScore = async (
  tournamentIndex: number, 
  arenaIndex: number, 
  refereeIndex: number, 
  scores: RefereeScore
): Promise<void> => {
  return updateData(
    `tournament/${tournamentIndex}/combatArena/${arenaIndex}/referee/${refereeIndex}`,
    scores
  );
};

// Export các hàm Firebase gốc để sử dụng khi cần
export { ref, set, get, update, remove, child, onValue, off };

// Giữ backward compatibility với code cũ
export default getFirebaseDb;
