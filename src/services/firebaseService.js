/**
 * Firebase Service Layer
 * Cung cấp các hàm tiện ích để tương tác với Firebase
 */

import { initializeApp } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  remove, 
  child, 
  onValue,
  off 
} from "firebase/database";

// Singleton instance
let dbInstance = null;

/**
 * Khởi tạo và trả về Firebase Database instance
 * @returns {Database} Firebase Database instance
 */
export const getFirebaseDb = () => {
  if (dbInstance) {
    return dbInstance;
  }

  console.log("Database environment: ", process.env.REACT_APP_FIREBASE_ENV);
  
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };

  const app = initializeApp(firebaseConfig);
  dbInstance = getDatabase(app);
  return dbInstance;
};

/**
 * Đọc dữ liệu một lần từ Firebase
 * @param {string} path - Đường dẫn trong database
 * @returns {Promise<any>} Dữ liệu tại path
 */
export const getData = async (path) => {
  const db = getFirebaseDb();
  const snapshot = await get(child(ref(db), path));
  return snapshot.val();
};

/**
 * Ghi dữ liệu vào Firebase
 * @param {string} path - Đường dẫn trong database
 * @param {any} data - Dữ liệu cần ghi
 * @returns {Promise<void>}
 */
export const setData = async (path, data) => {
  const db = getFirebaseDb();
  return set(ref(db, path), data);
};

/**
 * Cập nhật dữ liệu trong Firebase
 * @param {string} path - Đường dẫn trong database
 * @param {object} data - Object chứa các field cần update
 * @returns {Promise<void>}
 */
export const updateData = async (path, data) => {
  const db = getFirebaseDb();
  return update(ref(db, path), data);
};

/**
 * Xóa dữ liệu từ Firebase
 * @param {string} path - Đường dẫn trong database
 * @returns {Promise<void>}
 */
export const removeData = async (path) => {
  const db = getFirebaseDb();
  return remove(ref(db, path));
};

/**
 * Lắng nghe thay đổi dữ liệu realtime
 * @param {string} path - Đường dẫn trong database
 * @param {function} callback - Hàm callback nhận snapshot
 * @returns {function} Hàm unsubscribe để hủy listener
 */
export const subscribeToData = (path, callback) => {
  const db = getFirebaseDb();
  const dataRef = ref(db, path);
  
  onValue(dataRef, (snapshot) => {
    callback(snapshot.val(), snapshot);
  });

  // Trả về hàm unsubscribe
  return () => {
    off(dataRef);
  };
};

/**
 * Kiểm tra kết nối internet qua Firebase
 * @param {function} callback - Hàm callback nhận trạng thái connected (boolean)
 * @returns {function} Hàm unsubscribe
 */
export const subscribeToConnectionStatus = (callback) => {
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
 * @param {string} passwordType - Loại mật khẩu: 'passwordSetting' | 'passwordGiamSat' | 'passwordGiamDinh'
 * @param {string} inputPassword - Mật khẩu người dùng nhập
 * @returns {Promise<boolean>} True nếu mật khẩu đúng
 */
export const verifyPassword = async (passwordType, inputPassword) => {
  if (!inputPassword) {
    return false;
  }
  
  const correctPassword = await getData(`commonSetting/${passwordType}`);
  // Sử dụng strict equality
  return String(inputPassword) === String(correctPassword);
};

/**
 * Lấy danh sách giải đấu
 * @returns {Promise<Array>} Mảng các giải đấu
 */
export const getTournaments = async () => {
  const tournaments = await getData('tournament');
  if (!tournaments) return [];
  
  return tournaments.map((tournament, index) => ({
    index,
    name: tournament.setting?.tournamentName || `Giải ${index + 1}`
  }));
};

/**
 * Lấy cài đặt giải đấu
 * @param {number} tournamentIndex - Index của giải đấu
 * @returns {Promise<object>} Cài đặt giải đấu
 */
export const getTournamentSetting = async (tournamentIndex = 0) => {
  return getData(`tournament/${tournamentIndex}/setting`);
};

/**
 * Lấy thông tin trận đấu đối kháng
 * @param {number} tournamentIndex - Index giải đấu
 * @param {number} combatIndex - Index trận đấu
 * @returns {Promise<object>} Thông tin trận đấu
 */
export const getCombatMatch = async (tournamentIndex, combatIndex) => {
  return getData(`tournament/${tournamentIndex}/combat/${combatIndex}`);
};

/**
 * Cập nhật thông tin trận đấu
 * @param {number} tournamentIndex - Index giải đấu
 * @param {number} combatIndex - Index trận đấu
 * @param {object} matchData - Dữ liệu cần cập nhật
 * @returns {Promise<void>}
 */
export const updateCombatMatch = async (tournamentIndex, combatIndex, matchData) => {
  return updateData(`tournament/${tournamentIndex}/combat/${combatIndex}`, matchData);
};

/**
 * Lấy thông tin sân thi đấu
 * @param {number} tournamentIndex - Index giải đấu
 * @param {number} arenaIndex - Index sân
 * @returns {Promise<object>}
 */
export const getCombatArena = async (tournamentIndex, arenaIndex) => {
  return getData(`tournament/${tournamentIndex}/combatArena/${arenaIndex}`);
};

/**
 * Subscribe vào trận đấu hiện tại
 * @param {number} tournamentIndex 
 * @param {number} arenaIndex 
 * @param {function} callback 
 * @returns {function} Unsubscribe function
 */
export const subscribeToLastMatch = (tournamentIndex, arenaIndex, callback) => {
  return subscribeToData(
    `tournament/${tournamentIndex}/combatArena/${arenaIndex}/lastMatch`,
    callback
  );
};

/**
 * Subscribe vào điểm của giám định
 * @param {number} tournamentIndex 
 * @param {number} arenaIndex 
 * @param {function} callback 
 * @returns {function} Unsubscribe function
 */
export const subscribeToRefereeScores = (tournamentIndex, arenaIndex, callback) => {
  return subscribeToData(
    `tournament/${tournamentIndex}/combatArena/${arenaIndex}/referee`,
    callback
  );
};

/**
 * Cập nhật điểm giám định
 * @param {number} tournamentIndex 
 * @param {number} arenaIndex 
 * @param {number} refereeIndex 
 * @param {object} scores - { redScore, blueScore }
 */
export const updateRefereeScore = async (tournamentIndex, arenaIndex, refereeIndex, scores) => {
  return updateData(
    `tournament/${tournamentIndex}/combatArena/${arenaIndex}/referee/${refereeIndex}`,
    scores
  );
};

// Export các hàm Firebase gốc để sử dụng khi cần
export { ref, set, get, update, remove, child, onValue, off };

// Giữ backward compatibility với code cũ
export default getFirebaseDb;
