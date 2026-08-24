/**
 * RefereeClient — Giám Định chạy headless
 *
 * Gửi điểm bằng ĐÚNG hàm của app: sendScoreFromGiamDinh() trong
 * src/utils/scoreSync.ts
 */
import './browserShim';

import { ref, update } from 'firebase/database';
import { sendScoreFromGiamDinh } from '../../../src/utils/scoreSync';
import { getTestDb, getClientDb, delay } from './env';

export interface RefereeClientOptions {
  tournamentIndex: number;
  arenaIndex: number;
  refereeIndex: number;
}

export class RefereeClient {
  constructor(private readonly o: RefereeClientOptions) {}

  private get config() {
    return {
      // mỗi giám định là một thiết bị riêng -> kết nối riêng
      db: getClientDb(`dk-a${this.o.arenaIndex}-gd${this.o.refereeIndex}`),
      tournamentNoIndex: this.o.tournamentIndex,
      combatArenaNoIndex: this.o.arenaIndex,
      refereeIndex: this.o.refereeIndex,
      arena: this.o.arenaIndex === 0 ? 'A' : 'B',
    };
  }

  score(color: 'red' | 'blue', points: number): void {
    sendScoreFromGiamDinh(this.config, color, points);
  }

  clear(): void {
    sendScoreFromGiamDinh(this.config, 'red', 0);
    sendScoreFromGiamDinh(this.config, 'blue', 0);
  }
}

/** Một tổ giám định của 1 sân */
export class RefereePanel {
  readonly referees: RefereeClient[];

  constructor(
    readonly tournamentIndex: number,
    readonly arenaIndex: number,
    numReferee: number
  ) {
    this.referees = Array.from({ length: numReferee }, (_, i) =>
      new RefereeClient({ tournamentIndex, arenaIndex, refereeIndex: i })
    );
  }

  /**
   * `count` giám định cùng chấm `points` điểm cho `color`.
   * Đây là cách điểm thật sự lên bảng: cần > 50% giám định chấm.
   */
  async vote(color: 'red' | 'blue', points: number, count: number, gapMs = 30): Promise<void> {
    for (let i = 0; i < count; i++) {
      this.referees[i].score(color, points);
      if (gapMs > 0) await delay(gapMs);
    }
  }

  /** Đủ quorum: quá bán, các giám định bấm LẦN LƯỢT (mỗi người một lệnh ghi) */
  async voteMajority(color: 'red' | 'blue', points = 1, gapMs = 30): Promise<void> {
    const quorum = Math.floor(this.referees.length / 2) + 1;
    await this.vote(color, points, quorum, gapMs);
  }

  /**
   * Quá bán giám định bấm CÙNG MỘT NHỊP — cả nhóm về tới Giám Sát trong cùng
   * một snapshot Firebase.
   *
   * Đây là trường hợp DUY NHẤT điểm thực sự lên được: nếu các giám định bấm
   * lệch nhịp thì makeScoreTimer() chốt non và xoá bảng trước khi người thứ
   * hai kịp bấm (xem case "score-window-collapsed" ở scenario 02).
   * Dùng hàm này ở những test không nhắm vào chuyện chấm điểm, để chúng không
   * bị nhiễu bởi bug đó.
   */
  async voteTogether(color: 'red' | 'blue', points = 1): Promise<void> {
    const quorum = Math.floor(this.referees.length / 2) + 1;
    const patch: Record<string, number> = {};
    for (let i = 0; i < quorum; i++) {
      patch[`${i}/${color === 'red' ? 'redScore' : 'blueScore'}`] = points;
    }
    await update(
      ref(getTestDb(), `tournament/${this.tournamentIndex}/combatArena/${this.arenaIndex}/referee`),
      patch
    );
  }

  /** Xoá bảng điểm cả tổ trong một lệnh ghi */
  async clearAll(): Promise<void> {
    const patch: Record<string, number> = {};
    for (let i = 0; i < this.referees.length; i++) {
      patch[`${i}/redScore`] = 0;
      patch[`${i}/blueScore`] = 0;
    }
    await update(
      ref(getTestDb(), `tournament/${this.tournamentIndex}/combatArena/${this.arenaIndex}/referee`),
      patch
    );
  }
}
