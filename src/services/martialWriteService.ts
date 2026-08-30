/**
 * Martial Write Service — Logic ghi dữ liệu Thi Quyền
 *
 * Tách nguyên văn từ giamDinhThiQuyen.container.tsx (submitInput) và
 * giamSatThiQuyen.container.tsx (confirmSubmit, restoreMatch, computeRanking)
 * để bộ test gọi ĐÚNG code app đang chạy.
 *
 * QUY TẮC: đây là chỗ DUY NHẤT ghi điểm thi quyền. Hai màn thi quyền và bộ
 * test e2e đều gọi vào đây.
 *
 * Hai luật giữ cho điểm không bị nuốt:
 *   · Điểm tổng Giám Sát ghi đè bằng tay là QUYẾT ĐỊNH CUỐI của lượt đó —
 *     giám định bấm sau không được tính lại đè lên (`finalScoreOverride`).
 *   · Một lượt thi chỉ thuộc về MỘT sân tại một thời điểm (`martialTurnLock`).
 */

import { Database, ref, get, update, runTransaction } from 'firebase/database';
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
/**
 * Khoá lượt thi — sân nào đang chấm lượt này.
 *
 * Phải là node RIÊNG chứ không suy ra từ `lastMatchMartial`: cả hai sân đều
 * khởi tạo `lastMatchMartial = {1,1}` nên nhìn vào đó thì lượt đầu tiên lúc
 * nào cũng có vẻ đang bị sân kia giữ.
 */
export const martialTurnLockPath = (t: TournamentId, matchIdx: number, teamIdx: number) =>
  `tournament/${t}/martialTurnLock/${matchIdx}_${teamIdx}`;

/**
 * Khoá cũ hơn ngần này thì sân khác được giành lại.
 *
 * Máy Giám Sát sập nguồn / mất mạng / đóng tab cứng thì `releaseMartialTurn`
 * không kịp chạy, khoá nằm lại vĩnh viễn và lượt thi đó KHÔNG SÂN NÀO chấm
 * được nữa — giữa buổi thi thì đó là hỏng nặng hơn cả bug đang sửa. 15 phút đủ
 * dài để không cướp khoá của người đang chấm thật (một lượt thi tính bằng phút)
 * và đủ ngắn để không kẹt hết buổi. Mốc thời gian do máy giành khoá ghi nên
 * lệch giờ giữa các máy vẫn nằm gọn trong khoảng này.
 */
export const MARTIAL_TURN_LOCK_TTL_MS = 15 * 60 * 1000;

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
 * Trả về điểm tổng sau khi chấm, hoặc `null` nếu cú chấm bị TỪ CHỐI.
 *
 * Hai cửa kiểm, chạy TRƯỚC khi ghi bất cứ thứ gì:
 *   1. Lượt thi này có đang thuộc sân của giám định không (khoá lượt thi).
 *   2. Giám Sát đã chốt điểm tổng bằng tay chưa (`finalScoreOverride`).
 *
 * Bị từ chối thì KHÔNG ghi gì cả. Ghi điểm vào bảng rồi chặn ở bước tính tổng
 * là kiểu sai nguy hiểm nhất: bảng trên màn hình mang điểm của sân này, còn
 * điểm tổng lại là của sân kia — nhìn vào không ai biết số nào đúng, mà lần
 * chấm kế tiếp sẽ tính tổng từ bảng đã bị pha tạp.
 *
 * Nơi gọi PHẢI báo cho giám định biết khi trả về `null` — bấm vào hư không mà
 * máy vẫn báo "chấm điểm thành công" là mất điểm không ai phát hiện.
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
  const teamPath = martialTeamPath(t, matchIdx, teamIdx);

  // 1. Sân khác đang giữ lượt thi này
  const holder = await martialTurnHolder(ctx, matchIdx, teamIdx);
  if (holder !== -1 && holder !== ctx.arenaIndex) {
    console.warn(`[thi quyền] lượt ${matchIdx + 1}/${teamIdx + 1} đang do sân ${holder} chấm — từ chối`);
    return null;
  }

  const before = await get(ref(db, teamPath));
  const teamObj = before.val();
  if (!teamObj) return null;

  // 2. Giám Sát đã "Lấy điểm chính" -> giữ nguyên quyết định của Giám Sát.
  //    Muốn chấm lại thì Giám Sát ghi đè lần nữa bằng số đúng.
  if (teamObj.finalScoreOverride === true) {
    console.warn('[thi quyền] điểm tổng lượt này đã do Giám Sát chốt tay — từ chối');
    return null;
  }

  await update(ref(db, martialRefereePath(t, matchIdx, teamIdx, refereeIndex)), { score });

  const after = await get(ref(db, teamPath));
  const teamAfter = after.val();
  if (!teamAfter) return null;

  const finalScore = computeFinalScore(teamAfter.refereeMartial, numReferee);
  await update(ref(db, teamPath), { finalScore: parseInt(String(finalScore)) });
  return finalScore;
}

/**
 * Giám Sát ghi đè điểm tổng bằng tay ("Lấy điểm chính").
 *
 * Đặt cờ `finalScoreOverride` để giám định bấm muộn không tính lại đè lên.
 * Trước đây người bấm sau đọc bảng vừa bị reset về 0, tính ra một con số khác
 * rồi ghi đè, xoá mất quyết định của Giám Sát mà không cảnh báo gì
 * (bug martial-override-overwritten).
 *
 * Ghi CẢ BA ô trong một lệnh: hai lệnh `update` liên tiếp như bản cũ để hở một
 * khe cho cú chấm chen vào giữa.
 */
export function overrideMartialFinalScore(
  ctx: MartialWriteContext,
  matchIdx: number,
  teamIdx: number,
  finalScore: number
): void {
  smartUpdate(ctx.db, martialTeamPath(ctx.tournamentIndex, matchIdx, teamIdx), {
    finalScore: finalScore || 0,
    finalScoreOverride: true,
    refereeMartial: emptyRefereeMartial(),
  });
}

/** Mở lại chấm tự động cho lượt thi (gỡ cờ ghi đè tay của Giám Sát) */
export function clearMartialFinalScoreOverride(
  ctx: MartialWriteContext,
  matchIdx: number,
  teamIdx: number
): void {
  smartUpdate(ctx.db, martialTeamPath(ctx.tournamentIndex, matchIdx, teamIdx), {
    finalScoreOverride: false,
  });
}

// ==================== Khoá lượt thi giữa 2 sân ====================

/**
 * Sân nào đang giữ lượt thi này. `-1` = chưa sân nào giữ.
 *
 * Giải cũ (chưa có node khoá) luôn trả `-1` nên chạy y như trước.
 */
export async function martialTurnHolder(
  ctx: MartialWriteContext,
  matchIdx: number,
  teamIdx: number
): Promise<number> {
  const snap = await get(ref(ctx.db, martialTurnLockPath(ctx.tournamentIndex, matchIdx, teamIdx)));
  const val = snap.val();
  return typeof val?.arenaIndex === 'number' ? val.arenaIndex : -1;
}

export interface MartialTurnClaim {
  ok: boolean;
  /** Sân đang giữ lượt (khi ok = false) */
  heldBy: number;
}

/**
 * Giám Sát mở một lượt thi — giành quyền chấm cho sân mình.
 *
 * Trả về `ok: false` nếu sân kia đang chấm chính lượt đó. Trước đây không có
 * khoá nào: hai sân cùng mở một lượt thì tổ chấm sau đè hẳn điểm tổ trước,
 * không cảnh báo gì (bug martial-no-turn-lock-across-arenas).
 */
export async function claimMartialTurn(
  ctx: MartialWriteContext,
  matchIdx: number,
  teamIdx: number
): Promise<MartialTurnClaim> {
  const lockRef = ref(ctx.db, martialTurnLockPath(ctx.tournamentIndex, matchIdx, teamIdx));

  const now = Date.now();
  const res = await runTransaction(lockRef, (current) => {
    if (current == null) return { arenaIndex: ctx.arenaIndex, at: now };
    if (current.arenaIndex === ctx.arenaIndex) return { ...current, at: now };
    // Sân kia giữ khoá nhưng đã bỏ đó quá lâu (máy sập, mất mạng) -> giành lại
    const at = typeof current.at === 'number' ? current.at : 0;
    if (now - at > MARTIAL_TURN_LOCK_TTL_MS) return { arenaIndex: ctx.arenaIndex, at: now };
    return undefined; // sân khác đang chấm thật -> huỷ giao dịch
  });

  const heldBy = res.snapshot.val()?.arenaIndex;
  const owner = typeof heldBy === 'number' ? heldBy : -1;
  if (!res.committed || owner !== ctx.arenaIndex) return { ok: false, heldBy: owner };
  return { ok: true, heldBy: ctx.arenaIndex };
}

/** Giám Sát rời lượt thi — nhả khoá để sân kia dùng được */
export async function releaseMartialTurn(
  ctx: MartialWriteContext,
  matchIdx: number,
  teamIdx: number
): Promise<void> {
  const lockRef = ref(ctx.db, martialTurnLockPath(ctx.tournamentIndex, matchIdx, teamIdx));
  await runTransaction(lockRef, (current) => {
    if (current != null && current.arenaIndex !== ctx.arenaIndex) return undefined;
    return null;
  }).catch(() => { /* nhả khoá hỏng thì thôi, khoá sẽ bị sân sau ghi đè khi trống */ });
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
