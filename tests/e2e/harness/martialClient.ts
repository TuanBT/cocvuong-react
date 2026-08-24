/**
 * MartialArenaClient / MartialRefereePanel — Thi Quyền chạy headless
 *
 * Mô phỏng vòng đời của giamSatThiQuyen + giamDinhThiQuyen:
 *   - Giám Sát giữ mirror `/martial` qua onValue, điều khiển lượt thi của sân mình
 *   - Giám Định gửi điểm, rồi TỰ ĐỌC LẠI cả bảng và tính finalScore
 *
 * Mọi thao tác ghi đều gọi src/services/martialWriteService.ts.
 */
import './browserShim';

import { ref, onValue, off, get } from 'firebase/database';
import {
  submitMartialRefereeScore,
  overrideMartialFinalScore,
  setLastMatchMartial,
  rankTeams,
  nextMartialPosition,
  prevMartialPosition,
  clampMartialPosition,
  totalMartialTurns,
  type MartialWriteContext,
  type RankedTeam,
} from '../../../src/services/martialWriteService';
import type { MartialContent, MartialTeamEntry } from '../../../src/utils/martialBuilder';
import { getTestDb, getClientDb, delay } from './env';

export interface MartialArenaOptions {
  tournamentIndex: number;
  /** 0 = Sân A, 1 = Sân B */
  arenaIndex: number;
  numReferee: number;
  label?: string;
}

export interface MartialTurn {
  matchMartialNo: number;
  teamMartialNo: number;
  matchIdx: number;
  teamIdx: number;
  contentName: string;
  teamNo: number;
  fighters: string[];
}

export class MartialArenaClient {
  readonly opts: Required<MartialArenaOptions>;
  readonly ctx: MartialWriteContext;

  martialObj: MartialContent[] | null = null;
  matchMartialNoCurrent = 1;
  teamMartialNoCurrent = 1;
  teamMartial: MartialTeamEntry | null = null;

  readonly log: string[] = [];

  private mirrorFrozen = false;
  private pendingMartial: MartialContent[] | null = null;
  private refs: any[] = [];

  constructor(o: MartialArenaOptions) {
    this.opts = { label: o.arenaIndex === 0 ? 'Sân A' : 'Sân B', ...o } as Required<MartialArenaOptions>;
    this.ctx = {
      db: getClientDb(`tq-giamsat-a${this.opts.arenaIndex}`),
      tournamentIndex: this.opts.tournamentIndex,
      arenaIndex: this.opts.arenaIndex,
    };
  }

  private note(s: string): void {
    this.log.push(`[${this.opts.label}] ${s}`);
  }

  // ==================== Kết nối ====================

  async connect(): Promise<void> {
    const db = this.ctx.db;
    const t = this.opts.tournamentIndex;
    const a = this.opts.arenaIndex;

    const lastRef = ref(db, `tournament/${t}/martialArena/${a}/lastMatchMartial`);
    this.refs.push(lastRef);
    onValue(lastRef, (snap) => {
      const v = snap.val();
      if (v) {
        this.matchMartialNoCurrent = v.matchMartialNo;
        this.teamMartialNoCurrent = v.teamMartialNo;
        this.syncCurrent();
      }
    });

    const martialRef = ref(db, `tournament/${t}/martial`);
    this.refs.push(martialRef);
    onValue(martialRef, (snap) => {
      const val = snap.val() as MartialContent[] | null;
      if (this.mirrorFrozen) {
        this.pendingMartial = val;
        return;
      }
      this.applyMartial(val);
    });

    await this.waitFor(() => this.martialObj !== null, 5000, 'mirror /martial đầu tiên');
  }

  private applyMartial(val: MartialContent[] | null): void {
    this.martialObj = val;
    this.syncCurrent();
  }

  /** Nguyên văn initVariable() — kẹp vị trí về khoảng hợp lệ */
  private syncCurrent(): void {
    if (!this.martialObj) return;
    const c = clampMartialPosition(this.martialObj, {
      matchMartialNo: this.matchMartialNoCurrent,
      teamMartialNo: this.teamMartialNoCurrent,
    });
    this.matchMartialNoCurrent = c.matchMartialNo;
    this.teamMartialNoCurrent = c.teamMartialNo;
    this.teamMartial =
      this.martialObj[c.matchMartialNo - 1]?.team[c.teamMartialNo - 1] ?? null;
  }

  async disconnect(): Promise<void> {
    for (const r of this.refs) off(r);
    this.refs = [];
  }

  // ==================== Điều khiển mirror ====================

  freezeMirror(): void {
    this.mirrorFrozen = true;
    this.note('đóng băng mirror /martial');
  }

  async thawMirror(): Promise<void> {
    this.mirrorFrozen = false;
    if (this.pendingMartial !== null) {
      this.applyMartial(this.pendingMartial);
      this.pendingMartial = null;
    }
    await delay(50);
  }

  async waitFor(cond: () => boolean, timeoutMs = 5000, what = 'điều kiện'): Promise<void> {
    const t0 = Date.now();
    while (!cond()) {
      if (Date.now() - t0 > timeoutMs) {
        throw new Error(`[${this.opts.label}] hết ${timeoutMs}ms chờ ${what}`);
      }
      await delay(20);
    }
  }

  // ==================== Thông tin lượt thi ====================

  get matchIdx(): number { return this.matchMartialNoCurrent - 1; }
  get teamIdx(): number { return this.teamMartialNoCurrent - 1; }

  currentTurn(): MartialTurn | null {
    if (!this.martialObj || !this.teamMartial) return null;
    const content = this.martialObj[this.matchIdx];
    return {
      matchMartialNo: this.matchMartialNoCurrent,
      teamMartialNo: this.teamMartialNoCurrent,
      matchIdx: this.matchIdx,
      teamIdx: this.teamIdx,
      contentName: content.match.name,
      teamNo: this.teamMartial.no,
      fighters: this.teamMartial.fighters.map((f) => f.fighter.name),
    };
  }

  totalTurns(): number {
    return this.martialObj ? totalMartialTurns(this.martialObj) : 0;
  }

  ranking(): { ranked: RankedTeam[]; pending: RankedTeam[] } {
    return rankTeams(this.martialObj?.[this.matchIdx]);
  }

  // ==================== Hành động của Giám Sát ====================

  /** Chuyển tới đúng lượt thi — tương ứng restoreMatch() */
  async goTo(matchMartialNo: number, teamMartialNo: number): Promise<void> {
    setLastMatchMartial(this.ctx, matchMartialNo, teamMartialNo);
    await this.waitFor(
      () => this.matchMartialNoCurrent === matchMartialNo && this.teamMartialNoCurrent === teamMartialNo,
      5000,
      `lượt thi ${matchMartialNo}/${teamMartialNo}`
    );
    this.note(`đến nội dung ${matchMartialNo}, lượt ${teamMartialNo}`);
  }

  async next(): Promise<boolean> {
    if (!this.martialObj) return false;
    const cur = { matchMartialNo: this.matchMartialNoCurrent, teamMartialNo: this.teamMartialNoCurrent };
    const n = nextMartialPosition(this.martialObj, cur);
    if (n.matchMartialNo === cur.matchMartialNo && n.teamMartialNo === cur.teamMartialNo) return false;
    await this.goTo(n.matchMartialNo, n.teamMartialNo);
    return true;
  }

  async prev(): Promise<boolean> {
    if (!this.martialObj) return false;
    const cur = { matchMartialNo: this.matchMartialNoCurrent, teamMartialNo: this.teamMartialNoCurrent };
    const p = prevMartialPosition(this.martialObj, cur);
    if (p.matchMartialNo === cur.matchMartialNo && p.teamMartialNo === cur.teamMartialNo) return false;
    await this.goTo(p.matchMartialNo, p.teamMartialNo);
    return true;
  }

  /** Giám Sát ghi đè điểm tổng bằng tay ("Lấy điểm chính") */
  overrideFinalScore(score: number): void {
    overrideMartialFinalScore(this.ctx, this.matchIdx, this.teamIdx, score);
    this.note(`ghi đè điểm tổng lượt ${this.matchMartialNoCurrent}/${this.teamMartialNoCurrent} = ${score}`);
  }
}

// ==================== Giám Định Thi Quyền ====================

export class MartialRefereePanel {
  constructor(
    readonly tournamentIndex: number,
    readonly arenaIndex: number,
    readonly numReferee: number
  ) {}

  /**
   * Mỗi giám định là một THIẾT BỊ riêng nên phải có kết nối Firebase riêng.
   * Dùng chung kết nối thì bộ nhớ đệm client làm `get()` thấy luôn ghi của
   * người khác, che mất lỗi đọc-rồi-ghi có thật ngoài sân.
   */
  private ctxFor(refereeIndex: number): MartialWriteContext {
    return {
      db: getClientDb(`tq-a${this.arenaIndex}-gd${refereeIndex}`),
      tournamentIndex: this.tournamentIndex,
      arenaIndex: this.arenaIndex,
    };
  }

  /** Một giám định gửi điểm — dùng ĐÚNG hàm của app */
  async score(
    matchIdx: number,
    teamIdx: number,
    refereeIndex: number,
    score: number
  ): Promise<number | null> {
    return submitMartialRefereeScore(
      this.ctxFor(refereeIndex), matchIdx, teamIdx, refereeIndex, score, this.numReferee
    );
  }

  /** Cả tổ chấm LẦN LƯỢT (mỗi người chờ người trước ghi xong) */
  async scoreAllSequential(
    matchIdx: number,
    teamIdx: number,
    scores: number[],
    gapMs = 20
  ): Promise<number | null> {
    let last: number | null = null;
    for (let i = 0; i < Math.min(scores.length, this.numReferee); i++) {
      last = await this.score(matchIdx, teamIdx, i, scores[i]);
      if (gapMs > 0) await delay(gapMs);
    }
    return last;
  }

  /** Cả tổ bấm CÙNG LÚC — không ai chờ ai (đúng thực tế trên sân) */
  async scoreAllConcurrent(
    matchIdx: number,
    teamIdx: number,
    scores: number[]
  ): Promise<(number | null)[]> {
    return Promise.all(
      scores
        .slice(0, this.numReferee)
        .map((s, i) => this.score(matchIdx, teamIdx, i, s))
    );
  }
}
