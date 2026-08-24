/**
 * Seed — dựng giải đấu trên Firebase từ file Excel thô, qua ĐÚNG code của app
 *
 * Luồng giống hệt trang Tạo Giải:
 *   file .xlsx  →  đọc sheet "data"  →  buildCombatSchedule()  →
 *   toCombatMatches()  →  ghi tournament/{i}/{setting,combat,combatArena}
 *
 * Toàn bộ phần sinh nhánh đấu dùng src/utils/scheduleBuilder.ts — cùng module
 * mà createTournament.container.tsx đang gọi.
 */
import './browserShim';

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { ref, set, get } from 'firebase/database';

import {
  buildCombatSchedule,
  toCombatMatches,
  toStandardRows,
  COMBAT_ARRANGE_HEADER,
  type MatchSchema,
} from '../../../src/utils/scheduleBuilder';
import {
  buildMartialContents,
  type MartialContent,
} from '../../../src/utils/martialBuilder';
import {
  DEFAULT_MATCH_OBJ,
  DEFAULT_COMBAT_SETTINGS,
  DEFAULT_MARTIAL_SETTINGS,
} from '../../../src/constants/settings';
import { CombatMatch, TournamentSetting, CombatArena } from '../../../src/types';
import { getTestDb } from './env';

// ==================== Đọc file Excel thô ====================

export type DataKind = 'doikhang' | 'thiquyen';

/**
 * Đoán file thô là Đối Kháng hay Thi Quyền.
 *
 * Hai loại có cùng 5 cột nên phải nhìn tiêu đề cột 2:
 * Đối Kháng ghi "HẠNG CÂN", Thi Quyền ghi "NỘI DUNG".
 * Không có tiêu đề rõ thì đoán theo dữ liệu: hạng cân hầu như luôn có "kg".
 */
export function detectDataKind(filePath: string): DataKind {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const wb = XLSX.readFile(abs);
  const ws = wb.Sheets['data'];
  if (!ws) throw new Error(`Không có sheet "data" trong ${filePath}`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

  const header = String((rows[0] ?? [])[1] ?? '').trim().toUpperCase();
  if (header.includes('HẠNG CÂN')) return 'doikhang';
  if (header.includes('NỘI DUNG')) return 'thiquyen';

  let withKg = 0;
  let total = 0;
  for (let i = 1; i < rows.length; i++) {
    const v = String((rows[i] ?? [])[1] ?? '').trim();
    if (!v) continue;
    total++;
    if (/\d\s*kg/i.test(v)) withKg++;
  }
  if (total === 0) throw new Error(`File ${filePath} không có dòng dữ liệu nào`);
  return withKg / total > 0.5 ? 'doikhang' : 'thiquyen';
}

/** Đọc file .xlsx thô — nguyên văn cách handleimportCombatRawFile() parse */
export function readRawExcel(filePath: string): any[][] {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`Không tìm thấy file: ${abs}`);

  const wb = XLSX.readFile(abs);
  const ws = wb.Sheets['data'];
  if (!ws) throw new Error(`Không có sheet "data". Có: ${wb.SheetNames.join(', ')}`);

  const excelData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
  const raw: any[][] = [];
  for (let i = 1; i < excelData.length; i++) {
    const v = excelData[i];
    if (v && v.length !== 0) {
      raw.push([
        v[0] !== undefined ? v[0] : '',
        v[1] !== undefined ? String(v[1]).trim() : '',
        v[2] !== undefined ? String(v[2]).trim() : '',
        v[3] !== undefined ? String(v[3]).trim() : '',
        v[4] !== undefined ? String(v[4]).trim() : '',
      ]);
    }
  }
  return raw;
}

/** Ghi danh sách trận đã sắp ra file .xlsx (giống nút "Xuất file chuẩn") */
export function writeStandardExcel(matchs: MatchSchema[], outPath: string): string {
  const rows = toStandardRows(matchs);
  const aoa = [COMBAT_ARRANGE_HEADER, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = { Sheets: { data: ws }, SheetNames: ['data'] };
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return outPath;
}

/** Lọc danh sách VĐV thô theo hạng cân */
export function filterCategories(raw: any[][], categories: string[]): any[][] {
  return raw.filter((r) => categories.includes(String(r[1]).trim()));
}

/** Thống kê số VĐV mỗi hạng cân */
export function categoryCounts(raw: any[][]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of raw) {
    const k = String(r[1]).trim();
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

// ==================== Dựng giải trên Firebase ====================

export interface SeedOptions {
  tournamentIndex: number;
  tournamentName?: string;
  numReferee?: 3 | 5;
  showArenaB?: boolean;
}

export interface SeededTournament {
  tournamentIndex: number;
  matchs: MatchSchema[];
  combats: CombatMatch[];
  numReferee: number;
}

export function buildSetting(o: SeedOptions): TournamentSetting {
  const numReferee = o.numReferee ?? 3;
  return {
    tournamentName: o.tournamentName ?? 'Giải E2E',
    combat: {
      ...DEFAULT_COMBAT_SETTINGS,
      isShowArenaB: o.showArenaB ?? true,
      isShowFiveReferee: numReferee === 5,
    },
    martial: { ...DEFAULT_MARTIAL_SETTINGS },
  };
}

function buildArena(name: string, numReferee: number): CombatArena {
  return {
    combatArenaName: name,
    lastMatch: { no: 1 },
    referee: Array.from({ length: numReferee }, () => ({ redScore: 0, blueScore: 0 })),
  };
}

/**
 * Tạo giải từ danh sách VĐV thô và ghi lên Firebase.
 * Trả về đúng những gì app sẽ ghi, để scenario đối chiếu.
 */
export async function seedTournamentFromRaw(
  raw: any[][],
  o: SeedOptions
): Promise<SeededTournament> {
  const numReferee = o.numReferee ?? 3;

  // Sắp lịch bằng code thật của app
  const matchs = buildCombatSchedule(JSON.parse(JSON.stringify(raw)));
  const combats = toCombatMatches(matchs, DEFAULT_MATCH_OBJ) as unknown as CombatMatch[];

  const db = getTestDb();
  const base = `tournament/${o.tournamentIndex}`;
  await set(ref(db, `${base}/setting`), buildSetting(o));
  await set(ref(db, `${base}/combat`), combats);
  await set(ref(db, `${base}/combatArena`), [
    buildArena('Sân A', numReferee),
    buildArena('Sân B', numReferee),
  ]);

  return { tournamentIndex: o.tournamentIndex, matchs, combats, numReferee };
}

/** Tạo giải trực tiếp từ file Excel */
export async function seedTournamentFromExcel(
  filePath: string,
  o: SeedOptions & { categories?: string[] }
): Promise<SeededTournament> {
  let raw = readRawExcel(filePath);
  if (o.categories) raw = filterCategories(raw, o.categories);
  return seedTournamentFromRaw(raw, o);
}

// ==================== Đọc lại để kiểm tra ====================

export async function readCombats(tournamentIndex: number): Promise<CombatMatch[]> {
  const snap = await get(ref(getTestDb(), `tournament/${tournamentIndex}/combat`));
  return (snap.val() as CombatMatch[]) ?? [];
}

export async function readCombat(tournamentIndex: number, index: number): Promise<CombatMatch | null> {
  const snap = await get(ref(getTestDb(), `tournament/${tournamentIndex}/combat/${index}`));
  return snap.val();
}

export async function readArena(tournamentIndex: number, arenaIndex: number): Promise<CombatArena | null> {
  const snap = await get(ref(getTestDb(), `tournament/${tournamentIndex}/combatArena/${arenaIndex}`));
  return snap.val();
}

/** Tìm index (0-based) của trận mà cả 2 ô đều là placeholder W.x đến từ 2 trận khác nhau */
export function findCrossFedMatch(combats: CombatMatch[]): number {
  for (let i = 0; i < combats.length; i++) {
    const r = combats[i].fighters.redFighter.result;
    const b = combats[i].fighters.blueFighter.result;
    if (/^W\.\d+$/.test(r) && /^W\.\d+$/.test(b) && r !== b) return i;
  }
  return -1;
}


// ==================== Thi Quyền ====================

export interface SeededMartial {
  tournamentIndex: number;
  martial: MartialContent[];
  numReferee: number;
  /** Tổng số lượt thi của cả giải */
  totalTurns: number;
}

function buildMartialArena(name: string): any {
  return { martialArenaName: name, lastMatchMartial: { matchMartialNo: 1, teamMartialNo: 1 } };
}

/** Tạo giải Thi Quyền từ danh sách VĐV thô và ghi lên Firebase */
export async function seedMartialFromRaw(
  raw: any[][],
  o: SeedOptions
): Promise<SeededMartial> {
  const numReferee = o.numReferee ?? 3;
  const martial = buildMartialContents(JSON.parse(JSON.stringify(raw)));

  const db = getTestDb();
  const base = `tournament/${o.tournamentIndex}`;
  const setting = buildSetting(o);
  setting.martial.isShowFiveReferee = numReferee === 5;
  setting.martial.isShowArenaB = o.showArenaB ?? true;

  await set(ref(db, `${base}/setting`), setting);
  await set(ref(db, `${base}/martial`), martial);
  await set(ref(db, `${base}/martialArena`), [
    buildMartialArena('Sân A'),
    buildMartialArena('Sân B'),
  ]);

  return {
    tournamentIndex: o.tournamentIndex,
    martial,
    numReferee,
    totalTurns: martial.reduce((n, c) => n + c.team.length, 0),
  };
}

export async function seedMartialFromExcel(
  filePath: string,
  o: SeedOptions & { contents?: string[] }
): Promise<SeededMartial> {
  let raw = readRawExcel(filePath);
  if (o.contents) raw = raw.filter((r) => o.contents!.includes(String(r[1]).trim()));
  return seedMartialFromRaw(raw, o);
}

export async function readMartial(tournamentIndex: number): Promise<MartialContent[]> {
  const snap = await get(ref(getTestDb(), `tournament/${tournamentIndex}/martial`));
  return (snap.val() as MartialContent[]) ?? [];
}

export async function readMartialTeam(
  tournamentIndex: number,
  matchIdx: number,
  teamIdx: number
): Promise<any> {
  const snap = await get(
    ref(getTestDb(), `tournament/${tournamentIndex}/martial/${matchIdx}/team/${teamIdx}`)
  );
  return snap.val();
}

export async function readMartialArena(tournamentIndex: number, arenaIndex: number): Promise<any> {
  const snap = await get(
    ref(getTestDb(), `tournament/${tournamentIndex}/martialArena/${arenaIndex}`)
  );
  return snap.val();
}

/** Thống kê số lượt thi mỗi nội dung */
export function martialContentCounts(raw: any[][]): Map<string, number> {
  const contents = buildMartialContents(JSON.parse(JSON.stringify(raw)));
  return new Map(contents.map((c) => [c.match.name, c.team.length]));
}
