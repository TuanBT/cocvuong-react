/**
 * E2E Test Setup — Firebase helpers & test utilities
 * 
 * Cung cấp các hàm tiện ích để tương tác với Firebase dev DB
 * cho mục đích test E2E giả lập trận đấu thực tế.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  Database,
  DataSnapshot,
} from 'firebase/database';

// ==================== Firebase Config (Dev) ====================

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDN_BFuEJOqHqNzQN1w1v-6hWRDIeNgf9I',
  authDomain: 'fvc-score.firebaseapp.com',
  databaseURL: 'https://fvc-score.firebaseio.com',
  projectId: 'fvc-score',
  storageBucket: 'fvc-score.appspot.com',
  messagingSenderId: '1052570611922',
  appId: '1:1052570611922:web:d80a668f5fe7e251d5bd0b',
};

// Test uses tournament index 99 to avoid conflicts with real data
export const TEST_TOURNAMENT_INDEX = 99;

let app: FirebaseApp;
let db: Database;

export function initFirebase(): Database {
  if (db) return db;
  app = initializeApp(FIREBASE_CONFIG, 'e2e-test');
  db = getDatabase(app);
  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Firebase not initialized. Call initFirebase() first.');
  return db;
}

// ==================== Types ====================

export interface Caution {
  remind: number;
  warning: number;
  medical: number;
  fall: number;
  bound: number;
}

export interface Fighter {
  name: string;
  code: string;
  country: string;
  result: string;
  score: number;
  legStrike: boolean;
  caution: Caution;
}

export interface CombatMatch {
  match: {
    no: number;
    type: string;
    category: string;
    win: string;
  };
  fighters: {
    redFighter: Fighter;
    blueFighter: Fighter;
  };
}

export interface RefereeScore {
  redScore: number;
  blueScore: number;
}

export interface CombatArena {
  combatArenaName: string;
  lastMatch: { no: number };
  referee: RefereeScore[];
}

export interface TournamentSetting {
  tournamentName: string;
  combat: {
    isShowArenaB: boolean;
    isShowCautionBox: boolean;
    isShowCountryFlag: boolean;
    isShowFiveReferee: boolean;
    timeBreak: number;
    timeExtra: number;
    timeExtraBreak: number;
    timeRound: number;
  };
  martial: {
    isShowArenaB: boolean;
    isShowCountryFlag: boolean;
    isShowFiveReferee: boolean;
  };
}

// ==================== Default Data Factories ====================

export function defaultCaution(): Caution {
  return { remind: 0, warning: 0, medical: 0, fall: 0, bound: 0 };
}

export function createFighter(
  name: string,
  code: string,
  result: string = '',
  overrides: Partial<Fighter> = {}
): Fighter {
  return {
    name,
    code,
    country: '',
    result,
    score: 0,
    legStrike: false,
    caution: defaultCaution(),
    ...overrides,
  };
}

export function createCombatMatch(
  no: number,
  category: string,
  type: string,
  redFighter: Fighter,
  blueFighter: Fighter,
  win: string = ''
): CombatMatch {
  return {
    match: { no, type, category, win },
    fighters: { redFighter, blueFighter },
  };
}

export function createRefereeScores(count: number): RefereeScore[] {
  return Array.from({ length: count }, () => ({ redScore: 0, blueScore: 0 }));
}

export function createArena(name: string, lastMatchNo: number, numReferees: number): CombatArena {
  return {
    combatArenaName: name,
    lastMatch: { no: lastMatchNo },
    referee: createRefereeScores(numReferees),
  };
}

export function createTestSetting(fiveReferee: boolean = false): TournamentSetting {
  return {
    tournamentName: 'E2E Test Tournament',
    combat: {
      isShowArenaB: true,
      isShowCautionBox: true,
      isShowCountryFlag: false,
      isShowFiveReferee: fiveReferee,
      timeBreak: 30,
      timeExtra: 60,
      timeExtraBreak: 30,
      timeRound: 120,
    },
    martial: {
      isShowArenaB: false,
      isShowCountryFlag: false,
      isShowFiveReferee: false,
    },
  };
}

// ==================== Firebase CRUD Helpers ====================

const basePath = (tournamentIndex: number = TEST_TOURNAMENT_INDEX) =>
  `tournament/${tournamentIndex}`;

// --- Combat ---

export async function readCombat(combatIndex: number, tournamentIndex?: number): Promise<CombatMatch | null> {
  const snapshot = await get(ref(getDb(), `${basePath(tournamentIndex)}/combat/${combatIndex}`));
  return snapshot.val();
}

export async function writeCombat(combatIndex: number, data: CombatMatch, tournamentIndex?: number): Promise<void> {
  await set(ref(getDb(), `${basePath(tournamentIndex)}/combat/${combatIndex}`), data);
}

export async function writeCombatList(combats: CombatMatch[], tournamentIndex?: number): Promise<void> {
  await set(ref(getDb(), `${basePath(tournamentIndex)}/combat`), combats);
}

export async function updateCombatField(
  combatIndex: number,
  path: string,
  value: any,
  tournamentIndex?: number
): Promise<void> {
  await set(ref(getDb(), `${basePath(tournamentIndex)}/combat/${combatIndex}/${path}`), value);
}

// --- Arena ---

export async function readArena(arenaIndex: number, tournamentIndex?: number): Promise<CombatArena | null> {
  const snapshot = await get(ref(getDb(), `${basePath(tournamentIndex)}/combatArena/${arenaIndex}`));
  return snapshot.val();
}

export async function writeArena(arenaIndex: number, data: CombatArena, tournamentIndex?: number): Promise<void> {
  await set(ref(getDb(), `${basePath(tournamentIndex)}/combatArena/${arenaIndex}`), data);
}

// --- Referee ---

export async function writeRefereeScore(
  arenaIndex: number,
  refereeIndex: number,
  score: RefereeScore,
  tournamentIndex?: number
): Promise<void> {
  await update(
    ref(getDb(), `${basePath(tournamentIndex)}/combatArena/${arenaIndex}/referee/${refereeIndex}`),
    score
  );
}

export async function readRefereeScores(arenaIndex: number, tournamentIndex?: number): Promise<RefereeScore[] | null> {
  const snapshot = await get(ref(getDb(), `${basePath(tournamentIndex)}/combatArena/${arenaIndex}/referee`));
  return snapshot.val();
}

export async function resetRefereeScores(arenaIndex: number, numReferees: number, tournamentIndex?: number): Promise<void> {
  const scores = createRefereeScores(numReferees);
  await set(ref(getDb(), `${basePath(tournamentIndex)}/combatArena/${arenaIndex}/referee`), scores);
}

// --- Setting ---

export async function writeSetting(setting: TournamentSetting, tournamentIndex?: number): Promise<void> {
  await set(ref(getDb(), `${basePath(tournamentIndex)}/setting`), setting);
}

// --- Last Match ---

export async function writeLastMatch(arenaIndex: number, matchNo: number, tournamentIndex?: number): Promise<void> {
  await set(ref(getDb(), `${basePath(tournamentIndex)}/combatArena/${arenaIndex}/lastMatch/no`), matchNo);
}

export async function readLastMatch(arenaIndex: number, tournamentIndex?: number): Promise<number | null> {
  const snapshot = await get(ref(getDb(), `${basePath(tournamentIndex)}/combatArena/${arenaIndex}/lastMatch/no`));
  return snapshot.val();
}

// ==================== Subscription helpers ====================

/**
 * Subscribe to a Firebase path and resolve when the condition is met.
 * Times out after `timeoutMs` milliseconds.
 */
export function waitForValue<T>(
  path: string,
  condition: (value: T | null) => boolean,
  timeoutMs: number = 5000
): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const dataRef = ref(getDb(), path);
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        off(dataRef);
        reject(new Error(`Timeout after ${timeoutMs}ms waiting for condition on ${path}`));
      }
    }, timeoutMs);

    onValue(dataRef, (snapshot: DataSnapshot) => {
      const val = snapshot.val() as T | null;
      if (!resolved && condition(val)) {
        resolved = true;
        clearTimeout(timer);
        off(dataRef);
        resolve(val);
      }
    });
  });
}

// ==================== Test Data Setup / Cleanup ====================

/**
 * Tạo toàn bộ data test cho 1 tournament
 * Gồm: setting, 2 arenas (A, B), 6 combats đủ để test replaceFighter
 */
export async function setupTestTournament(fiveReferee: boolean = false): Promise<void> {
  const numReferees = fiveReferee ? 5 : 3;

  // Setting
  await writeSetting(createTestSetting(fiveReferee));

  // Arenas
  await writeArena(0, createArena('Sân A', 1, numReferees));
  await writeArena(1, createArena('Sân B', 1, numReferees));

  // Combats — 6 trận, 2 hạng cân (60kg, 73kg)
  // Trận 1-2: Bán kết 60kg → Trận 5: Chung kết 60kg
  // Trận 3-4: Bán kết 73kg → Trận 6: Chung kết 73kg
  const combats: CombatMatch[] = [
    // index 0: Trận 1 - Bán kết 60kg
    createCombatMatch(1, '60kg nam', 'Bán Kết',
      createFighter('Nguyễn Văn A', 'TEST001', ''),
      createFighter('Trần Văn B', 'TEST002', '')
    ),
    // index 1: Trận 2 - Bán kết 60kg
    createCombatMatch(2, '60kg nam', 'Bán Kết',
      createFighter('Lê Văn C', 'TEST003', ''),
      createFighter('Phạm Văn D', 'TEST004', '')
    ),
    // index 2: Trận 3 - Bán kết 73kg
    createCombatMatch(3, '73kg nam', 'Bán Kết',
      createFighter('Đặng Văn E', 'TEST005', ''),
      createFighter('Hoàng Văn F', 'TEST006', '')
    ),
    // index 3: Trận 4 - Bán kết 73kg
    createCombatMatch(4, '73kg nam', 'Bán Kết',
      createFighter('Vũ Văn G', 'TEST007', ''),
      createFighter('Bùi Văn H', 'TEST008', '')
    ),
    // index 4: Trận 5 - Chung kết 60kg (placeholder W.1 vs W.2)
    createCombatMatch(5, '60kg nam', 'Chung Kết',
      createFighter('W.1', '', 'W.1'),
      createFighter('W.2', '', 'W.2')
    ),
    // index 5: Trận 6 - Chung kết 73kg (placeholder W.3 vs W.4)
    createCombatMatch(6, '73kg nam', 'Chung Kết',
      createFighter('W.3', '', 'W.3'),
      createFighter('W.4', '', 'W.4')
    ),
  ];

  await writeCombatList(combats);
}

/**
 * Cleanup: Xóa toàn bộ data test tournament
 */
export async function cleanupTestTournament(): Promise<void> {
  await remove(ref(getDb(), basePath()));
}

// ==================== Assertion Helpers ====================

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  const sortedStringify = (obj: any): string => JSON.stringify(obj, Object.keys(obj || {}).sort());
  const actualStr = typeof actual === 'object' ? sortedStringify(actual) : JSON.stringify(actual);
  const expectedStr = typeof expected === 'object' ? sortedStringify(expected) : JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new AssertionError(
      `${message}\n  Expected: ${expectedStr}\n  Actual:   ${actualStr}`
    );
  }
}

export function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new AssertionError(message);
  }
}

export function assertNotNull<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new AssertionError(`${message} — got ${value}`);
  }
}

// ==================== Logging ====================

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

export function logScenario(name: string): void {
  console.log(`\n${COLORS.bold}${COLORS.cyan}━━━ Scenario: ${name} ━━━${COLORS.reset}`);
}

export function logStep(step: string): void {
  console.log(`  ${COLORS.blue}▸${COLORS.reset} ${step}`);
}

export function logPass(message: string): void {
  console.log(`  ${COLORS.green}✓${COLORS.reset} ${message}`);
}

export function logFail(message: string): void {
  console.log(`  ${COLORS.red}✗${COLORS.reset} ${message}`);
}

export function logInfo(message: string): void {
  console.log(`  ${COLORS.dim}ℹ ${message}${COLORS.reset}`);
}

export function logSummary(passed: number, failed: number): void {
  const total = passed + failed;
  const color = failed === 0 ? COLORS.green : COLORS.red;
  console.log(`\n${COLORS.bold}${color}═══ Results: ${passed}/${total} passed ═══${COLORS.reset}`);
  if (failed > 0) {
    console.log(`${COLORS.red}  ${failed} scenario(s) FAILED${COLORS.reset}`);
  } else {
    console.log(`${COLORS.green}  All scenarios PASSED ✓${COLORS.reset}`);
  }
}

// ==================== Utility ====================

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Giả lập logic getModes (mode thống kê) giống app thật
 */
export function getModes(array: number[]): number {
  if (!array || array.length === 0) return 0;

  const frequency: Record<string, number> = {};
  let maxFreq = 0;
  const modes: string[] = [];

  for (const value of array) {
    const key = String(value);
    frequency[key] = (frequency[key] || 0) + 1;
    if (frequency[key] > maxFreq) {
      maxFreq = frequency[key];
    }
  }

  for (const key in frequency) {
    if (frequency[key] === maxFreq) {
      modes.push(key);
    }
  }

  return modes.length === 1 ? +modes[0] : 0;
}

/**
 * Giả lập logic replaceFighter giống app thật
 * Trả về index của trận đã được update, hoặc -1 nếu không tìm thấy
 */
export async function simulateReplaceFighter(
  combats: CombatMatch[],
  matchNoCurrent: number,
  winColor: 'red' | 'blue',
  tournamentIndex?: number
): Promise<number> {
  const currentIndex = matchNoCurrent - 1;
  const currentMatch = combats[currentIndex];
  if (!currentMatch) return -1;

  const matchWin = 'W.' + matchNoCurrent;
  const matchLose = 'L.' + matchNoCurrent;
  const winFighter = winColor === 'red' ? currentMatch.fighters.redFighter : currentMatch.fighters.blueFighter;
  const loseFighter = winColor === 'red' ? currentMatch.fighters.blueFighter : currentMatch.fighters.redFighter;

  for (let i = matchNoCurrent; i < combats.length; i++) {
    const fighters = combats[i].fighters;

    const tryReplace = (
      side: 'redFighter' | 'blueFighter',
      sourceMatch: string,
      sourceFighter: Fighter
    ): boolean => {
      if (fighters[side].result === sourceMatch) {
        const copied = JSON.parse(JSON.stringify(sourceFighter));
        copied.result = sourceMatch;
        copied.score = 0;
        copied.legStrike = false;
        copied.caution = defaultCaution();
        fighters[side] = copied;
        return true;
      }
      return false;
    };

    if (tryReplace('redFighter', matchWin, winFighter)) {
      await writeCombat(i, combats[i], tournamentIndex);
      return i;
    }
    if (tryReplace('redFighter', matchLose, loseFighter)) {
      await writeCombat(i, combats[i], tournamentIndex);
      return i;
    }
    if (tryReplace('blueFighter', matchWin, winFighter)) {
      await writeCombat(i, combats[i], tournamentIndex);
      return i;
    }
    if (tryReplace('blueFighter', matchLose, loseFighter)) {
      await writeCombat(i, combats[i], tournamentIndex);
      return i;
    }
  }

  return -1;
}
