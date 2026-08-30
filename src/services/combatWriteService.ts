/**
 * Combat Write Service — Logic ghi dữ liệu trận đối kháng
 *
 * Tách nguyên văn từ giamSatDoiKhang.container.tsx (replaceFighter,
 * makeScoreTimer, saveMatch, restoreMatch, redWin/blueWin guard) để test có
 * thể gọi ĐÚNG code mà app đang chạy, thay vì test một bản copy.
 *
 * QUY TẮC: đây là chỗ DUY NHẤT ghi dữ liệu trận đối kháng. Màn Giám Sát và bộ
 * test e2e đều gọi vào đây, nên đừng dựng bản chép tay thứ hai ở nơi khác.
 *
 * Nguyên tắc ghi (rút ra sau đợt sửa các bug chạy song song):
 *   · Ghi HẸP NHẤT có thể — đúng ô mình đổi, không bao giờ `set` cả node
 *     `fighters`. Hai sân chạy song song luôn có máy cầm mirror cũ; ghi rộng
 *     là xoá mất việc sân kia vừa làm.
 *   · Cộng dồn (điểm) phải đi qua `runTransaction`, không đọc-sửa-ghi.
 */

import { Database, ref, runTransaction } from 'firebase/database';
import { getModes } from '../utils/helpers';
import { smartSet, smartUpdate } from './offlineService';
import { CombatMatch, Fighter, RefereeScore, TournamentId } from '../types';

// ==================== Context ====================

export interface CombatWriteContext {
  db: Database;
  /** Khoá giải (tournament/{tournamentIndex}) — chuỗi mờ, xem `TournamentId` */
  tournamentIndex: TournamentId;
  /** Index sân: 0 = Sân A, 1 = Sân B */
  arenaIndex: number;
}

// ==================== Đường dẫn Firebase ====================

export const combatPath = (t: TournamentId, i: number) => `tournament/${t}/combat/${i}`;
export const fightersPath = (t: TournamentId, i: number) => `tournament/${t}/combat/${i}/fighters`;
/** Đường tới ĐÚNG một góc VĐV — dùng để ghi hẹp, không đụng góc còn lại */
export const fighterSidePath = (t: TournamentId, i: number, side: FighterSide) =>
  `${fightersPath(t, i)}/${side}`;
export const matchWinPath = (t: TournamentId, i: number) => `tournament/${t}/combat/${i}/match/win`;
export const refereePath = (t: TournamentId, a: number) => `tournament/${t}/combatArena/${a}/referee`;
export const lastMatchPath = (t: TournamentId, a: number) => `tournament/${t}/combatArena/${a}/lastMatch/no`;

export type FighterSide = 'redFighter' | 'blueFighter';

// ==================== Hàm thuần (không đụng Firebase) ====================

/**
 * Bảng giám định rỗng ĐÚNG số ô của giải.
 *
 * ⚠️ Đừng dùng `DEFAULT_COMBAT_CONST.referee` để reset: hằng số đó LUÔN có 5 ô
 * nên giải 3 giám định bị nhảy 3 ↔ 5 ô suốt trận (bug referee-array-length-oscillates).
 */
export function zeroRefereeScores(numReferee: number): RefereeScore[] {
  return Array.from({ length: numReferee }, () => ({ redScore: 0, blueScore: 0 }));
}

/** Reset trạng thái thi đấu của VĐV khi chuyển sang trận mới */
export function resetFighterState(fighter: Fighter): void {
  fighter.score = 0;
  fighter.legStrike = false;
  fighter.caution = { bound: 0, fall: 0, medical: 0, remind: 0, warning: 0 };
}

/** Đếm số giám định đã chấm điểm khác 0 cho mỗi bên */
export function countRefereesScored(
  refereeObj: RefereeScore[],
  numReferee: number
): { red: number; blue: number } {
  let red = 0;
  let blue = 0;
  for (let j = 0; j < numReferee; j++) {
    const refereeJ = refereeObj[j];
    if (!refereeJ) continue;
    if (refereeJ.redScore !== 0) red++;
    if (refereeJ.blueScore !== 0) blue++;
  }
  return { red, blue };
}

/** Đã đủ quorum (>50% giám định chấm) cho ít nhất một bên chưa */
export function hasScoreQuorum(refereeObj: RefereeScore[], numReferee: number): boolean {
  const { red, blue } = countRefereesScored(refereeObj, numReferee);
  return red > numReferee / 2 || blue > numReferee / 2;
}

/** Có giám định nào đang chấm điểm (khác 0) không */
export function hasAnyRefereeScored(refereeObj: RefereeScore[], numReferee: number): boolean {
  for (let i = 0; i < numReferee; i++) {
    const referee = refereeObj[i];
    if (!referee) continue;
    if (referee.redScore !== 0 || referee.blueScore !== 0) return true;
  }
  return false;
}

/** Chốt điểm của phiên chấm: lấy mode điểm của các giám định */
export function tallyRefereeScores(
  refereeObj: RefereeScore[],
  numReferee: number
): { red: number; blue: number } {
  const redScoreArray: number[] = [];
  const blueScoreArray: number[] = [];
  for (let k = 0; k < numReferee; k++) {
    redScoreArray.push(refereeObj[k].redScore);
    blueScoreArray.push(refereeObj[k].blueScore);
  }
  return { red: getModes(redScoreArray), blue: getModes(blueScoreArray) };
}

/**
 * Guard "Bạn không thể chấm lại trận đấu này!" trong redWin/blueWin.
 *
 * Chặn khi kết quả của trận này ĐÃ ĐƯỢC DÙNG: có ô W.x/L.x ở trận sau đã được
 * `replaceFighter` điền VĐV thật vào (tên không còn là chỗ trống "W.x"/"L.x").
 * Chấm lại lúc đó sẽ để lại một VĐV sai nằm trong nhánh sau mà không ai gỡ.
 *
 * Bản cũ so `"W." + j` với j là INDEX mảng, trong khi số trận = index + 1, nên
 * gần như không bao giờ khớp và guard chưa từng chặn được lần nào
 * (bug rescore-guard-off-by-one).
 */
export function canRescoreMatch(combatObj: CombatMatch[], matchNoCurrent: number): boolean {
  const fedBy = ["W." + matchNoCurrent, "L." + matchNoCurrent];

  // Ô của trận sau mang result = W.x/L.x của trận này; matchNoCurrent là số
  // trận nên combatObj[matchNoCurrent] đã là TRẬN KẾ TIẾP.
  for (let i = matchNoCurrent; i < combatObj.length; i++) {
    const fighters = combatObj[i]?.fighters;
    if (!fighters) continue;

    for (const side of ['redFighter', 'blueFighter'] as FighterSide[]) {
      const slot = fighters[side];
      if (!slot || !fedBy.includes(slot.result)) continue;
      // Còn mang đúng chỗ trống ⇒ chưa ai điền vào ⇒ vẫn được chấm lại
      if (slot.name !== slot.result) return false;
    }
  }

  return true;
}

// ==================== Ghi Firebase ====================

/**
 * Điền VĐV thắng/thua vào ô W.x / L.x của trận kế tiếp.
 *
 * Chỉ ghi ĐÚNG góc vừa điền (`fighters/redFighter` hoặc `fighters/blueFighter`).
 * Bản cũ ghi cả node `fighters` lấy từ mirror của client: hai bán kết chạy ở
 * hai sân cùng nuôi một chung kết thì sân xác nhận sau xoá mất VĐV sân trước
 * vừa điền (bug replace-fighter-lost-update).
 *
 * @returns index trận đã ghi, hoặc -1 nếu không tìm thấy ô nào để điền
 */
export function replaceFighter(
  ctx: CombatWriteContext,
  combatObj: CombatMatch[],
  matchNoCurrent: number,
  match: CombatMatch,
  winColor: string
): number {
  const matchWin = "W." + matchNoCurrent;
  const matchLose = "L." + matchNoCurrent;

  const winFighter = winColor === "red" ? match.fighters.redFighter : match.fighters.blueFighter;
  const loseFighter = winColor === "red" ? match.fighters.blueFighter : match.fighters.redFighter;

  for (let i = matchNoCurrent; i < combatObj.length; i++) {
    const fightersTemp = combatObj[i]?.fighters;
    if (!fightersTemp) continue;

    for (const side of ['redFighter', 'blueFighter'] as FighterSide[]) {
      const slotResult = fightersTemp[side]?.result;
      if (slotResult !== matchWin && slotResult !== matchLose) continue;

      const source = slotResult === matchWin ? winFighter : loseFighter;
      const filled: Fighter = JSON.parse(JSON.stringify(source));
      filled.result = slotResult;
      resetFighterState(filled);

      fightersTemp[side] = filled;
      smartSet(ctx.db, fighterSidePath(ctx.tournamentIndex, i, side), filled);
      return i;
    }
  }

  return -1;
}

/**
 * Cộng thêm `delta` vào ô điểm của một góc — bằng transaction, nên hai sân
 * cùng chốt một trận thì CẢ HAI lần cộng đều vào (bug no-match-lock-across-arenas).
 *
 * @param fallback giá trị mirror đã cộng sẵn, dùng khi mất mạng
 */
function bumpFighterScore(
  ctx: CombatWriteContext,
  matchIndex: number,
  side: FighterSide,
  delta: number,
  fallback: number
): void {
  const path = `${fighterSidePath(ctx.tournamentIndex, matchIndex, side)}/score`;
  runTransaction(ref(ctx.db, path), (current) =>
    (typeof current === 'number' ? current : 0) + delta
  ).catch((err) => {
    // Mất mạng / rules từ chối: rơi về đường ghi có hàng đợi offline
    console.warn('[combat] cộng điểm bằng transaction hỏng, ghi bù:', err);
    smartSet(ctx.db, path, fallback);
  });
}

/**
 * Chốt phiên chấm: cộng mode điểm của các giám định vào trận, xoá bảng giám định.
 *
 * Cộng điểm đi qua transaction trên ĐÚNG ô `score`. Bản cũ `score +=` trên
 * mirror rồi `set` cả node `fighters`: vừa nuốt mất một lần cộng khi hai sân
 * chốt cùng lúc (score-commit-lost-update), vừa xoá tên VĐV sân kia vừa điền.
 */
export function commitRefereeScores(
  ctx: CombatWriteContext,
  matchIndex: number,
  match: CombatMatch,
  refereeObj: RefereeScore[],
  numReferee: number
): { red: number; blue: number } {
  const tally = tallyRefereeScores(refereeObj, numReferee);

  // Mirror lên trước để màn hình nhảy ngay; onValue sẽ chỉnh lại theo giá trị thật
  match.fighters.redFighter.score += tally.red;
  match.fighters.blueFighter.score += tally.blue;

  if (tally.red !== 0) {
    bumpFighterScore(ctx, matchIndex, 'redFighter', tally.red, match.fighters.redFighter.score);
  }
  if (tally.blue !== 0) {
    bumpFighterScore(ctx, matchIndex, 'blueFighter', tally.blue, match.fighters.blueFighter.score);
  }

  // Reset Giám định — ĐÚNG số ô của giải
  resetRefereeScores(ctx, zeroRefereeScores(numReferee));

  return tally;
}

/**
 * Ghi lại trạng thái thi đấu của trận hiện tại (điểm cộng/trừ tay, caution,
 * đòn chân) — CHỈ những ô Giám Sát thực sự đổi được.
 *
 * Bản cũ `update` cả node `combat/{i}` với object `match` đang cầm; RTDB thay
 * NGUYÊN cây con `fighters`, nên một cú bấm cảnh cáo ở sân A xoá mất VĐV sân B
 * vừa điền vào cùng trận đó (bug save-match-lost-update). Tên / mã / result là
 * việc của replaceFighter, không phải của nút cảnh cáo.
 */
export function saveMatch(ctx: CombatWriteContext, matchIndex: number, match: CombatMatch): void {
  const patch: Record<string, any> = {};
  for (const side of ['redFighter', 'blueFighter'] as FighterSide[]) {
    const f = match.fighters[side];
    if (!f) continue;
    patch[`fighters/${side}/score`] = f.score;
    patch[`fighters/${side}/caution`] = f.caution;
    patch[`fighters/${side}/legStrike`] = f.legStrike;
  }
  smartUpdate(ctx.db, combatPath(ctx.tournamentIndex, matchIndex), patch);
}

/** Ghi kết quả thắng của trận */
export function saveMatchWin(ctx: CombatWriteContext, matchIndex: number, winColor: string): void {
  smartSet(ctx.db, matchWinPath(ctx.tournamentIndex, matchIndex), winColor);
}

/**
 * Đặt trận đang thi đấu của sân.
 *
 * Trả về promise để nơi gọi CHỜ ĐƯỢC nếu cần thứ tự chắc chắn; màn Giám Sát
 * gọi bỏ promise như cũ.
 */
export function setLastMatch(ctx: CombatWriteContext, matchNo: number): Promise<void> {
  return smartSet(ctx.db, lastMatchPath(ctx.tournamentIndex, ctx.arenaIndex), matchNo);
}

/**
 * Reset bảng điểm giám định của sân về 0.
 *
 * ⚠️ Máy Giám Sát và máy giám định là HAI kết nối Firebase khác nhau, không có
 * bảo đảm thứ tự giữa chúng. Lệnh xoá bảng này mà còn đang bay thì cú bấm của
 * giám định ngay sau đó sẽ bị nó ghi đè về 0 — điểm mất mà không ai thấy.
 * Chuyển trận xong PHẢI chờ lệnh này xong rồi mới mở cho tổ giám định bấm.
 */
export function resetRefereeScores(ctx: CombatWriteContext, referees: RefereeScore[]): Promise<void> {
  return smartSet(ctx.db, refereePath(ctx.tournamentIndex, ctx.arenaIndex), referees);
}
