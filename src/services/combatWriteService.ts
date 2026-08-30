/**
 * Combat Write Service — Logic ghi dữ liệu trận đối kháng
 *
 * Tách nguyên văn từ giamSatDoiKhang.container.tsx (replaceFighter,
 * makeScoreTimer, saveMatch, restoreMatch, redWin/blueWin guard) để test có
 * thể gọi ĐÚNG code mà app đang chạy, thay vì test một bản copy.
 *
 * QUY TẮC: hành vi ở đây phải giống hệt bản cũ trong container — kể cả cách
 * ghi cả node `fighters` và off-by-one ở canRescoreMatch. Bộ test e2e dựa vào
 * đó để phát hiện hồi quy; đừng "tiện tay" sửa mà không cập nhật test.
 */

import { Database } from 'firebase/database';
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
export const matchWinPath = (t: TournamentId, i: number) => `tournament/${t}/combat/${i}/match/win`;
export const refereePath = (t: TournamentId, a: number) => `tournament/${t}/combatArena/${a}/referee`;
export const lastMatchPath = (t: TournamentId, a: number) => `tournament/${t}/combatArena/${a}/lastMatch/no`;

// ==================== Hàm thuần (không đụng Firebase) ====================

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
 * Trả về false nếu trận đã được dùng kết quả ở trận sau.
 *
 * ⚠️ GIỮ NGUYÊN off-by-one của bản gốc: `winMatch2 = "W." + j` với j là
 * INDEX mảng, trong khi số trận = index + 1. Bộ test e2e có case đánh dấu
 * bug này (knownBug: rescore-guard-off-by-one).
 */
export function canRescoreMatch(combatObj: CombatMatch[], matchNoCurrent: number): boolean {
  const winMatch = "W." + matchNoCurrent;
  for (let i = matchNoCurrent; i < combatObj.length; i++) {
    const fightersTemp = combatObj[i].fighters;
    if (fightersTemp.redFighter.result === winMatch) {
      for (let j = i; j < combatObj.length; j++) {
        const fightersTemp2 = combatObj[j].fighters;
        const winMatch2 = "W." + j;
        if (fightersTemp2.redFighter.result === winMatch2)
          if (fightersTemp2.redFighter.name !== winMatch2) {
            return false;
          }
        if (fightersTemp2.blueFighter.result === winMatch2) {
          if (fightersTemp2.blueFighter.name !== winMatch2) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

// ==================== Ghi Firebase ====================

/**
 * Điền VĐV thắng/thua vào ô W.x / L.x của trận kế tiếp.
 *
 * ⚠️ Ghi CẢ node `fighters` (redFighter + blueFighter) lấy từ bản mirror
 * `combatObj` của client. Nếu sân kia vừa điền ô còn lại của cùng trận mà
 * mirror chưa kịp cập nhật, ghi này sẽ đè mất kết quả của sân kia.
 * Bộ test e2e có case đánh dấu bug này (knownBug: replace-fighter-lost-update).
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
  let winFighter: Fighter;
  let loseFighter: Fighter;

  if (winColor === "red") {
    winFighter = match.fighters.redFighter;
    loseFighter = match.fighters.blueFighter;
  } else {
    winFighter = match.fighters.blueFighter;
    loseFighter = match.fighters.redFighter;
  }

  for (let i = matchNoCurrent; i < combatObj.length; i++) {
    const fightersTemp = combatObj[i].fighters;

    if (fightersTemp.redFighter.result === matchWin) {
      fightersTemp.redFighter = JSON.parse(JSON.stringify(winFighter));
      fightersTemp.redFighter.result = matchWin;
      resetFighterState(fightersTemp.redFighter);
      smartUpdate(ctx.db, fightersPath(ctx.tournamentIndex, i), fightersTemp);
      return i;
    }

    if (fightersTemp.redFighter.result === matchLose) {
      fightersTemp.redFighter = JSON.parse(JSON.stringify(loseFighter));
      fightersTemp.redFighter.result = matchLose;
      resetFighterState(fightersTemp.redFighter);
      smartUpdate(ctx.db, fightersPath(ctx.tournamentIndex, i), fightersTemp);
      return i;
    }

    if (fightersTemp.blueFighter.result === matchWin) {
      fightersTemp.blueFighter = JSON.parse(JSON.stringify(winFighter));
      fightersTemp.blueFighter.result = matchWin;
      resetFighterState(fightersTemp.blueFighter);
      smartUpdate(ctx.db, fightersPath(ctx.tournamentIndex, i), fightersTemp);
      return i;
    }

    if (fightersTemp.blueFighter.result === matchLose) {
      fightersTemp.blueFighter = JSON.parse(JSON.stringify(loseFighter));
      fightersTemp.blueFighter.result = matchLose;
      resetFighterState(fightersTemp.blueFighter);
      smartUpdate(ctx.db, fightersPath(ctx.tournamentIndex, i), fightersTemp);
      return i;
    }
  }

  return -1;
}

/**
 * Cộng điểm của phiên chấm vào trận và reset bảng giám định của sân.
 *
 * ⚠️ `score +=` đọc-sửa-ghi trên bản mirror rồi `set` CẢ node `fighters`
 * (không dùng transaction). Bộ test e2e có case đánh dấu bug này
 * (knownBug: score-commit-lost-update).
 */
export function commitRefereeScores(
  ctx: CombatWriteContext,
  matchIndex: number,
  match: CombatMatch,
  refereeObj: RefereeScore[],
  numReferee: number,
  refereeConst: RefereeScore[]
): { red: number; blue: number } {
  const tally = tallyRefereeScores(refereeObj, numReferee);

  match.fighters.redFighter.score += tally.red;
  match.fighters.blueFighter.score += tally.blue;
  smartSet(ctx.db, fightersPath(ctx.tournamentIndex, matchIndex), match.fighters);

  // Reset Giám định
  smartSet(ctx.db, refereePath(ctx.tournamentIndex, ctx.arenaIndex), refereeConst);

  return tally;
}

/** Ghi lại toàn bộ trận hiện tại (điểm cộng/trừ tay, caution, đòn chân) */
export function saveMatch(ctx: CombatWriteContext, matchIndex: number, match: CombatMatch): void {
  smartUpdate(ctx.db, combatPath(ctx.tournamentIndex, matchIndex), match);
}

/** Ghi kết quả thắng của trận */
export function saveMatchWin(ctx: CombatWriteContext, matchIndex: number, winColor: string): void {
  smartSet(ctx.db, matchWinPath(ctx.tournamentIndex, matchIndex), winColor);
}

/** Đặt trận đang thi đấu của sân */
export function setLastMatch(ctx: CombatWriteContext, matchNo: number): void {
  smartSet(ctx.db, lastMatchPath(ctx.tournamentIndex, ctx.arenaIndex), matchNo);
}

/** Reset bảng điểm giám định của sân về 0 */
export function resetRefereeScores(ctx: CombatWriteContext, referees: RefereeScore[]): void {
  smartSet(ctx.db, refereePath(ctx.tournamentIndex, ctx.arenaIndex), referees);
}
