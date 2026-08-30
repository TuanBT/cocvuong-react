/**
 * Martial Write Service — Logic ghi dữ liệu Thi Quyền
 *
 * Tách nguyên văn từ giamDinhThiQuyen.container.tsx (submitInput) và
 * giamSatThiQuyen.container.tsx (confirmSubmit, restoreMatch, computeRanking)
 * để bộ test gọi ĐÚNG code app đang chạy.
 *
 * QUY TẮC: hành vi phải giống hệt bản cũ trong container — kể cả việc
 * finalScore do CHÍNH client giám định tính bằng đọc-rồi-ghi, và việc reset
 * bảng điểm luôn ghi 5 ô. Bộ test e2e dựa vào đó để phát hiện hồi quy.
 */

import { Database, ref, get, update } from 'firebase/database';
import { smartUpdate, smartSet } from './offlineService';
import { emptyRefereeMartial, type MartialContent, type MartialTeamEntry } from '../utils/martialBuilder';
import type { TournamentId } from '../types';

// ==================== Context ====================

export interface MartialWriteContext {
  db: Database;
  tournamentIndex: TournamentId;
  /** 0 = Sân A, 1 = Sân B */
  arenaIndex: number;
}

// ==================== Đường dẫn Firebase ====================

export const martialTeamPath = (t: TournamentId, matchIdx: number, teamIdx: number) =>
  `tournament/${t}/martial/${matchIdx}/team/${teamIdx}`;
export const martialRefereePath = (t: TournamentId, matchIdx: number, teamIdx: number, refIdx: number) =>
  `${martialTeamPath(t, matchIdx, teamIdx)}/refereeMartial/${refIdx}`;
export const lastMatchMartialPath = (t: TournamentId, a: number) =>
  `tournament/${t}/martialArena/${a}/lastMatchMartial`;

// ==================== Hàm thuần ====================

/**
 * Tính điểm tổng của một đội từ bảng điểm giám định.
 *
 * 3 giám định: cộng cả 3.
 * 5 giám định: bỏ điểm thấp nhất và cao nhất, cộng 3 điểm giữa.
 *
 * Nguyên văn phần tính trong giamDinhThiQuyen.submitInput().
 */
export function computeFinalScore(
  refereeMartial: { score: number }[],
  numReferee: number
): number {
  let totalRefereeScore = 0;
  let minScore = refereeMartial[0].score;
  let maxScore = refereeMartial[0].score;

  for (let i = 0; i < numReferee; i++) {
    const score = refereeMartial[i].score;
    totalRefereeScore += score;
    minScore = Math.min(minScore, score);
    maxScore = Math.max(maxScore, score);
  }

  if (numReferee === 5) {
    return totalRefereeScore - (minScore + maxScore);
  }
  return totalRefereeScore;
}

export interface RankedTeam {
  no: number;
  finalScore: number;
  code: string;
  fighters: string[];
  rank: number;
}

/**
 * Xếp hạng các đội trong cùng một nội dung.
 * Chỉ xếp hạng đội đã thi (finalScore > 0); đồng điểm thì đồng hạng.
 *
 * Nguyên văn computeRanking() trong giamSatThiQuyen.container.tsx.
 */
export function rankTeams(content: MartialContent | null | undefined): {
  ranked: RankedTeam[];
  pending: RankedTeam[];
} {
  const allTeams: Omit<RankedTeam, 'rank'>[] = [];
  if (content?.team) {
    content.team.forEach((t: any) => {
      const fighters: string[] = [];
      if (t.fighters) {
        t.fighters.forEach((f: any) => {
          if (f.fighter?.name) fighters.push(f.fighter.name);
        });
      }
      allTeams.push({
        no: t.no,
        finalScore: t.finalScore || 0,
        code: t.code || (t.fighters?.[0]?.fighter?.code || ''),
        fighters,
      });
    });
  }

  const sorted = allTeams.filter((t) => t.finalScore > 0).sort((a, b) => b.finalScore - a.finalScore);

  const ranked: RankedTeam[] = [];
  for (let idx = 0; idx < sorted.length; idx++) {
    const team = sorted[idx];
    let rank = idx + 1;
    if (idx > 0 && team.finalScore === sorted[idx - 1].finalScore) {
      rank = ranked[idx - 1].rank;
    }
    ranked.push({ ...team, rank });
  }

  const pending: RankedTeam[] = allTeams
    .filter((t) => t.finalScore <= 0)
    .sort((a, b) => a.no - b.no)
    .map((t) => ({ ...t, rank: 0 }));

  return { ranked, pending };
}

// ==================== Ghi Firebase ====================

/**
 * Giám định gửi điểm cho một đội.
 *
 * ⚠️ ĐỌC-RỒI-GHI trên nhiều máy: sau khi ghi điểm của mình, client này đọc lại
 * cả bảng điểm rồi TỰ TÍNH finalScore và ghi đè. Bộ test e2e đã đo 20 lượt với
 * 5 giám định bấm cùng lúc và điểm tổng vẫn đúng, nên chưa có bằng chứng lỗi ở
 * luồng chấm bình thường — nhưng đây vẫn là điểm yếu kiến trúc: cùng cơ chế này
 * ĐÃ gây lỗi thật khi Giám Sát ghi đè điểm tổng (xem case
 * knownBug: martial-override-overwritten).
 * Nếu sửa, hướng đúng là để một chỗ duy nhất tính điểm tổng, hoặc runTransaction.
 */
export async function submitMartialRefereeScore(
  ctx: MartialWriteContext,
  matchIdx: number,
  teamIdx: number,
  refereeIndex: number,
  score: number,
  numReferee: number
): Promise<number | null> {
  const { db, tournamentIndex: t } = ctx;

  await update(ref(db, martialRefereePath(t, matchIdx, teamIdx, refereeIndex)), { score });

  const teamPath = martialTeamPath(t, matchIdx, teamIdx);
  const snapshot = await get(ref(db, teamPath));
  const teamObj = snapshot.val();
  if (!teamObj) return null;

  const finalScore = computeFinalScore(teamObj.refereeMartial, numReferee);
  await update(ref(db, teamPath), { finalScore: parseInt(String(finalScore)) });
  return finalScore;
}

/**
 * Giám Sát ghi đè điểm tổng bằng tay ("Lấy điểm chính").
 *
 * ⚠️ Ghi finalScore rồi reset bảng giám định về 5 ô 0 — kể cả giải chỉ dùng
 * 3 giám định (cùng họ với bug referee-array-length-oscillates bên đối kháng).
 */
export function overrideMartialFinalScore(
  ctx: MartialWriteContext,
  matchIdx: number,
  teamIdx: number,
  finalScore: number
): void {
  const path = martialTeamPath(ctx.tournamentIndex, matchIdx, teamIdx);
  smartUpdate(ctx.db, path, { finalScore: finalScore || 0 });
  smartUpdate(ctx.db, path, { refereeMartial: emptyRefereeMartial() });
}

/** Đặt lượt thi hiện tại của sân */
export function setLastMatchMartial(
  ctx: MartialWriteContext,
  matchMartialNo: number,
  teamMartialNo: number
): void {
  smartSet(ctx.db, lastMatchMartialPath(ctx.tournamentIndex, ctx.arenaIndex), {
    matchMartialNo,
    teamMartialNo,
  });
}

// ==================== Điều hướng lượt thi ====================

export interface MartialPosition {
  matchMartialNo: number;
  teamMartialNo: number;
}

/** Kẹp vị trí về khoảng hợp lệ — nguyên văn initVariable() */
export function clampMartialPosition(
  martial: MartialContent[],
  pos: MartialPosition
): MartialPosition & { theFirstTeamOfMatch: boolean; theLastTeamOfMatch: boolean } {
  let { matchMartialNo, teamMartialNo } = pos;

  if (matchMartialNo > martial.length) matchMartialNo = martial.length;
  if (matchMartialNo < 1) matchMartialNo = 1;

  const matchIdx = matchMartialNo - 1;
  const teams = martial[matchIdx]?.team ?? [];

  let theLastTeamOfMatch = false;
  if (teamMartialNo > teams.length) teamMartialNo = teams.length;
  if (teamMartialNo === teams.length) theLastTeamOfMatch = true;

  let theFirstTeamOfMatch = false;
  if (teamMartialNo < 1) teamMartialNo = 1;
  if (teamMartialNo === 1) theFirstTeamOfMatch = true;

  return { matchMartialNo, teamMartialNo, theFirstTeamOfMatch, theLastTeamOfMatch };
}

/** Lượt thi kế tiếp — nguyên văn nextMatchMartial() */
export function nextMartialPosition(
  martial: MartialContent[],
  pos: MartialPosition
): MartialPosition {
  const cur = clampMartialPosition(martial, pos);
  const isVeryLast =
    cur.matchMartialNo === martial.length &&
    cur.teamMartialNo === martial[cur.matchMartialNo - 1].team.length;
  if (isVeryLast) return { matchMartialNo: cur.matchMartialNo, teamMartialNo: cur.teamMartialNo };

  let teamMartialNo = cur.teamMartialNo + 1;
  let matchMartialNo = cur.matchMartialNo;
  if (cur.theLastTeamOfMatch) {
    matchMartialNo++;
    teamMartialNo = 1;
  }
  return { matchMartialNo, teamMartialNo };
}

/** Lượt thi trước đó — nguyên văn prevMatchMartial() */
export function prevMartialPosition(
  martial: MartialContent[],
  pos: MartialPosition
): MartialPosition {
  const cur = clampMartialPosition(martial, pos);
  if (cur.matchMartialNo === 1 && cur.teamMartialNo === 1) {
    return { matchMartialNo: 1, teamMartialNo: 1 };
  }

  let teamMartialNo = cur.teamMartialNo - 1;
  let matchMartialNo = cur.matchMartialNo;
  if (cur.theFirstTeamOfMatch) {
    matchMartialNo--;
    teamMartialNo = martial[matchMartialNo - 1].team.length;
  }
  return { matchMartialNo, teamMartialNo };
}

/** Tổng số lượt thi của cả giải */
export function totalMartialTurns(martial: MartialContent[]): number {
  return martial.reduce((n, c) => n + (c.team?.length ?? 0), 0);
}

export type { MartialContent, MartialTeamEntry };
