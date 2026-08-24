/**
 * Môi trường chạy test — Firebase Emulator (mặc định) hoặc DB dev thật (--live)
 */
import './browserShim';

import { initializeApp, FirebaseApp, deleteApp } from 'firebase/app';
import {
  getDatabase,
  connectDatabaseEmulator,
  goOffline,
  Database,
  ref,
  remove,
  get,
} from 'firebase/database';
import * as fs from 'fs';
import * as path from 'path';

export type Mode = 'emulator' | 'live';

export const EMULATOR_HOST = '127.0.0.1';
export const EMULATOR_PORT = 9000;

/**
 * Số slot giải mà bộ test cần dùng cùng lúc.
 * Trên live, các slot này được cấp phát NỐI TIẾP sau giải cuối cùng đang có,
 * để node `tournament` vẫn là array liên tục — nếu chèn index rời rạc (vd 90)
 * Firebase trả về object và danh sách giải trong app dev sẽ rỗng.
 */
export const SLOT_COUNT = 4;

/** Trên emulator, DB sạch nên bắt đầu từ 0. Trên live sẽ được cấp phát động. */
let slotBase = 0;

/**
 * Chế độ GIỮ LẠI dữ liệu sau khi chạy (--keep).
 * Mặc định test dọn sạch để lần chạy sau không bị chiếm slot. Bật --keep khi
 * muốn mở app lên xem tận mắt giải vừa chạy, rồi tự xoá bằng tay
 * (hoặc `npm run test:e2e:clean`).
 */
let keepData = false;
const keptSlots = new Set<number>();

export function setKeepData(v: boolean): void {
  keepData = v;
}

export function isKeepData(): boolean {
  return keepData;
}

/** Danh sách giải được giữ lại của lần chạy này */
export function getKeptSlots(): number[] {
  return [...keptSlots].sort((a, b) => a - b);
}

let app: FirebaseApp | null = null;
let db: Database | null = null;
let mode: Mode = 'emulator';

/**
 * Mỗi "thiết bị" (giám định, giám sát) là một kết nối Firebase RIÊNG.
 *
 * Rất quan trọng: dùng chung một kết nối thì bộ nhớ đệm phía client của
 * Firebase khiến `get()` sau `update()` nhìn thấy luôn cả ghi của "thiết bị"
 * khác — che mất đúng loại lỗi đọc-rồi-ghi mà bộ test muốn bắt.
 * Ngoài sân thật mỗi người một máy, nên harness cũng phải một máy một kết nối.
 */
const clients = new Map<string, { app: FirebaseApp; db: Database }>();
let lastConfig: Record<string, any> | null = null;

function readEnvFile(file: string): Record<string, string> {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) throw new Error(`Không tìm thấy ${file}`);
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

export function getMode(): Mode {
  return mode;
}

export function initTestDb(requestedMode: Mode): Database {
  if (db) return db;
  mode = requestedMode;

  if (mode === 'emulator') {
    // Emulator không kiểm tra credential; databaseURL chỉ cần đúng dạng.
    lastConfig = {
      apiKey: 'emulator-fake-key',
      projectId: 'cocvuong-e2e',
      databaseURL: 'https://cocvuong-e2e.firebaseio.com',
    };
    app = initializeApp(lastConfig, 'e2e-emulator');
    db = getDatabase(app);
    connectDatabaseEmulator(db, EMULATOR_HOST, EMULATOR_PORT);
  } else {
    // Đọc CHÍNH .env.development của app — không hardcode key trong test,
    // để test không thể lệch cấu hình so với app.
    const env = readEnvFile('.env.development');
    const url = env.REACT_APP_FIREBASE_DATABASE_URL || '';
    if (!url) throw new Error('.env.development thiếu REACT_APP_FIREBASE_DATABASE_URL');
    if (url.includes('cocvuong-se60824')) {
      throw new Error(
        'TỪ CHỐI CHẠY: .env.development đang trỏ vào Firebase PRODUCTION.\n' +
        '  Test ghi/xoá dữ liệu nên không được phép chạy trên production.'
      );
    }
    lastConfig = {
      apiKey: env.REACT_APP_FIREBASE_API_KEY,
      authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      databaseURL: url,
      projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.REACT_APP_FIREBASE_APP_ID,
    };
    app = initializeApp(lastConfig, 'e2e-live');
    db = getDatabase(app);
  }

  return db;
}

export function getTestDb(): Database {
  if (!db) throw new Error('Chưa init DB — gọi initTestDb() trước.');
  return db;
}

/**
 * Kết nối Firebase riêng cho một "thiết bị".
 * Gọi lại cùng `clientName` sẽ trả về đúng kết nối cũ.
 */
export function getClientDb(clientName: string): Database {
  const existing = clients.get(clientName);
  if (existing) return existing.db;
  if (!lastConfig) throw new Error('Chưa init DB — gọi initTestDb() trước.');

  const clientApp = initializeApp(lastConfig, `e2e-client-${clientName}`);
  const clientDb = getDatabase(clientApp);
  if (mode === 'emulator') {
    connectDatabaseEmulator(clientDb, EMULATOR_HOST, EMULATOR_PORT);
  }
  clients.set(clientName, { app: clientApp, db: clientDb });
  return clientDb;
}

/** Đóng hết kết nối của các "thiết bị" mô phỏng */
export async function closeAllClients(): Promise<void> {
  for (const { app: a, db: d } of clients.values()) {
    goOffline(d);
    try { await deleteApp(a); } catch { /* ignore */ }
  }
  clients.clear();
}

/**
 * Cấp phát dải slot giải cho lần chạy này.
 *
 * - emulator: DB sạch -> dùng 0..SLOT_COUNT-1
 * - live: đọc các giải đang có, lấy dải NGAY SAU giải cuối cùng, và từ chối
 *   chạy nếu bất kỳ slot nào trong dải đã có dữ liệu (tránh ghi đè giải thật).
 */
export async function allocateSlots(): Promise<{ base: number; existing: string[] }> {
  if (mode === 'emulator') {
    slotBase = 0;
    return { base: 0, existing: [] };
  }

  const snap = await get(ref(getTestDb(), 'tournament'));
  const val = snap.val();
  const keys: number[] = val
    ? Object.keys(val).map(Number).filter((n) => !Number.isNaN(n))
    : [];
  const existing = keys
    .sort((a, b) => a - b)
    .map((k) => `[${k}] ${val[k]?.setting?.tournamentName ?? '(không tên)'}`);

  slotBase = keys.length ? Math.max(...keys) + 1 : 0;

  for (let i = 0; i < SLOT_COUNT; i++) {
    const idx = slotBase + i;
    const occupied = await get(ref(getTestDb(), `tournament/${idx}`));
    if (occupied.exists()) {
      throw new Error(
        `TỪ CHỐI CHẠY: tournament/${idx} trên DB dev đã có dữ liệu.\n` +
        `  Bộ test cần ${SLOT_COUNT} slot trống liên tiếp từ ${slotBase}.`
      );
    }
  }

  return { base: slotBase, existing };
}

/** Index giải cho slot thứ `slot` của lần chạy này */
export function tournamentIndexFor(slot: number): number {
  if (slot < 0 || slot >= SLOT_COUNT) {
    throw new Error(`slot ${slot} nằm ngoài 0..${SLOT_COUNT - 1}`);
  }
  return slotBase + slot;
}

/**
 * Xoá sạch một giải. Trên live chỉ cho phép xoá slot do chính lần chạy này cấp phát.
 * Ở chế độ --keep thì KHÔNG xoá, chỉ ghi nhận lại để báo cho người chạy.
 */
export async function wipeTournament(tournamentIndex: number): Promise<void> {
  if (keepData) {
    keptSlots.add(tournamentIndex);
    return;
  }
  if (mode === 'live') {
    const inRange = tournamentIndex >= slotBase && tournamentIndex < slotBase + SLOT_COUNT;
    if (!inRange) {
      throw new Error(
        `TỪ CHỐI XOÁ tournament/${tournamentIndex} trên DB dev — ` +
        `ngoài dải slot của lần chạy này (${slotBase}..${slotBase + SLOT_COUNT - 1}).`
      );
    }
  }
  await remove(ref(getTestDb(), `tournament/${tournamentIndex}`));
}

/** Dọn toàn bộ slot đã cấp phát */
export async function wipeAllSlots(): Promise<void> {
  for (let i = 0; i < SLOT_COUNT; i++) {
    await wipeTournament(tournamentIndexFor(i));
  }
}

export async function closeTestDb(): Promise<void> {
  await closeAllClients();
  if (db) goOffline(db);
  if (app) await deleteApp(app);
  app = null;
  db = null;
}

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Đọc lại cho tới khi thoả điều kiện, hoặc hết giờ thì trả về giá trị cuối.
 *
 * Cần thiết vì mỗi "thiết bị" có kết nối Firebase riêng: giá trị vừa ghi từ
 * máy này có thể chưa về tới máy khác ngay. Đây là độ trễ mạng bình thường,
 * không phải lỗi, nên test phải chờ thay vì đọc một phát rồi kết luận.
 */
export async function readUntil<T>(
  read: () => Promise<T>,
  ok: (v: T) => boolean,
  timeoutMs = 3000,
  stepMs = 100
): Promise<T> {
  const t0 = Date.now();
  let last = await read();
  while (!ok(last)) {
    if (Date.now() - t0 > timeoutMs) return last;
    await delay(stepMs);
    last = await read();
  }
  return last;
}
