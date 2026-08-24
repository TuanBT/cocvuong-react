/**
 * matchRunner — chạy trọn một trận đấu "như thật"
 *
 * Giám định bấm điểm (qua sendScoreFromGiamDinh) → Giám Sát nhận qua
 * subscribeScoreForGiamSat → makeScoreTimer chốt điểm → xác nhận thắng
 * → replaceFighter điền VĐV vào trận sau.
 */
import { ArenaClient } from './arenaClient';
import { RefereePanel } from './refereeClient';
import { delay } from './env';
import { CombatMatch } from '../../../src/types';

export interface PlayOptions {
  /** Số phiên chấm điểm (mỗi phiên = 1 lần quá bán giám định bấm) */
  rounds?: number;
  /** Bên thắng; 'auto' = bên có điểm cao hơn */
  winner?: 'red' | 'blue' | 'auto';
  /** Tỉ lệ điểm cho đỏ trong mỗi phiên (0..1) */
  redShare?: number;
  gapMs?: number;
}

export interface PlayResult {
  matchNo: number;
  category: string;
  type: string;
  winColor: 'red' | 'blue';
  winnerName: string;
  redScore: number;
  blueScore: number;
  blocked: boolean;
}

/** Đánh trọn 1 trận trên 1 sân */
export async function playMatch(
  arena: ArenaClient,
  panel: RefereePanel,
  matchNo: number,
  o: PlayOptions = {}
): Promise<PlayResult> {
  const rounds = o.rounds ?? 2;
  const redShare = o.redShare ?? 1;
  const gapMs = o.gapMs ?? 20;

  await arena.goToMatch(matchNo);
  await arena.waitFor(() => arena.match != null, 5000, `dữ liệu trận ${matchNo}`);

  const m = arena.match as CombatMatch;
  if (!m) throw new Error(`Không đọc được trận ${matchNo}`);

  for (let r = 0; r < rounds; r++) {
    const color: 'red' | 'blue' = r < Math.round(rounds * redShare) ? 'red' : 'blue';
    // bấm cùng nhịp — xem RefereePanel.voteTogether() để biết vì sao
    await panel.voteTogether(color, 1);
    await delay(gapMs * 3 + 120);
    await panel.clearAll();
    await delay(gapMs + 60);
  }

  const red = m.fighters.redFighter.score;
  const blue = m.fighters.blueFighter.score;
  const winColor: 'red' | 'blue' =
    o.winner && o.winner !== 'auto' ? o.winner : red >= blue ? 'red' : 'blue';

  const ok = await arena.declareWin(winColor);
  const winner = winColor === 'red' ? m.fighters.redFighter : m.fighters.blueFighter;

  return {
    matchNo,
    category: m.match.category,
    type: m.match.type,
    winColor,
    winnerName: winner.name,
    redScore: red,
    blueScore: blue,
    blocked: !ok,
  };
}
