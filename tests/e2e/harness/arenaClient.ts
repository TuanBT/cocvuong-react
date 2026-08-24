/**
 * ArenaClient — Giám Sát Đối Kháng chạy headless
 *
 * Mô phỏng đúng vòng đời của giamSatDoiKhang.container.tsx:
 *   - giữ bản mirror `combatObj` của TOÀN BỘ danh sách trận qua onValue('/combat')
 *   - lắng nghe lastMatch + bảng điểm giám định của RIÊNG sân mình
 *   - mọi thao tác ghi đều gọi src/services/combatWriteService.ts — tức là
 *     ĐÚNG code mà app đang chạy, không phải bản copy.
 *
 * Điểm mấu chốt để test song song: `freezeMirror()` giả lập việc bản mirror
 * của sân này chưa nhận kịp thay đổi từ sân kia (mạng trễ / offline / Firebase
 * chưa đẩy về). Nhờ vậy race giữa 2 sân trở nên TẤT ĐỊNH, tái hiện 100%
 * thay vì "thỉnh thoảng mới lỗi".
 */
import './browserShim';

import { ref, onValue, off, get, Unsubscribe } from 'firebase/database';
import { CombatMatch, RefereeScore } from '../../../src/types';
import { DEFAULT_COMBAT_CONST } from '../../../src/constants/settings';
import {
  replaceFighter,
  commitRefereeScores,
  saveMatch as saveMatchData,
  saveMatchWin,
  setLastMatch,
  resetRefereeScores,
  canRescoreMatch,
  hasScoreQuorum,
  type CombatWriteContext,
} from '../../../src/services/combatWriteService';
import { subscribeScoreForGiamSat } from '../../../src/utils/scoreSync';
import { getTestDb, getClientDb, delay } from './env';

export interface ArenaClientOptions {
  tournamentIndex: number;
  /** 0 = Sân A, 1 = Sân B */
  arenaIndex: number;
  numReferee: number;
  /**
   * Độ trễ giữa replaceFighter và lúc ghi match.win.
   * App thật dùng setTimeout 1000ms (giamSatDoiKhang.container.tsx redWin/blueWin).
   */
  winCommitDelayMs?: number;
  /** TIME_SCORE — số nhịp chờ trước khi chốt điểm dù chưa đủ quorum */
  timeScore?: number;
  label?: string;
}

export class ArenaClient {
  readonly opts: Required<ArenaClientOptions>;
  readonly ctx: CombatWriteContext;

  // --- state mirror giống container ---
  combatObj: CombatMatch[] | null = null;
  lastMatchObj: { no: number } | null = null;
  refereeObj: RefereeScore[] | null = null;
  match: CombatMatch | null = null;
  matchNoCurrent: number | undefined;
  matchNoCurrentIndex: number | undefined;
  combatConst = JSON.parse(JSON.stringify(DEFAULT_COMBAT_CONST));
  scoreTimerCount: number;
  isFirstRefereeScore = false;

  /** Ghi lại mọi hành động để scenario kiểm tra/diễn giải */
  readonly log: string[] = [];

  private mirrorFrozen = false;
  private pendingCombat: CombatMatch[] | null = null;
  private unsubs: Array<() => void> = [];
  private refs: any[] = [];

  constructor(o: ArenaClientOptions) {
    this.opts = {
      winCommitDelayMs: 1000,
      timeScore: 3,
      label: o.arenaIndex === 0 ? 'Sân A' : 'Sân B',
      ...o,
    } as Required<ArenaClientOptions>;
    this.scoreTimerCount = this.opts.timeScore;
    this.ctx = {
      // Giám Sát mỗi sân là một máy riêng -> kết nối Firebase riêng
      db: getClientDb(`dk-giamsat-a${this.opts.arenaIndex}`),
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

    const combatRef = ref(db, `tournament/${t}/combat`);
    this.refs.push(combatRef);
    onValue(combatRef, (snap) => {
      const val = snap.val() as CombatMatch[] | null;
      if (this.mirrorFrozen) {
        // Giả lập: dữ liệu đã tới nhưng client chưa áp dụng (mạng trễ / offline)
        this.pendingCombat = val;
        return;
      }
      this.applyCombat(val);
    });

    const lastMatchRef = ref(db, `tournament/${t}/combatArena/${a}/lastMatch`);
    this.refs.push(lastMatchRef);
    onValue(lastMatchRef, (snap) => {
      this.lastMatchObj = snap.val();
      if (this.lastMatchObj) {
        this.matchNoCurrent = this.lastMatchObj.no;
        this.matchNoCurrentIndex = this.matchNoCurrent - 1;
        if (this.combatObj) this.match = this.combatObj[this.matchNoCurrentIndex];
      }
    });

    // Dùng ĐÚNG hàm subscribe của app
    const cleanup = subscribeScoreForGiamSat(
      { db, tournamentNoIndex: t, combatArenaNoIndex: a, arena: a === 0 ? 'A' : 'B' },
      this.opts.numReferee,
      (refereeIndex, redScore, blueScore) => {
        if (!this.refereeObj) {
          this.refereeObj = JSON.parse(JSON.stringify(this.combatConst.referee));
        }
        if (this.refereeObj![refereeIndex]) {
          this.refereeObj![refereeIndex].redScore = redScore;
          this.refereeObj![refereeIndex].blueScore = blueScore;
          this.makeScoreTimer();
        }
      }
    );
    this.unsubs.push(cleanup);

    // chờ mirror có dữ liệu lần đầu
    await this.waitFor(() => this.combatObj !== null, 5000, 'combat mirror đầu tiên');
  }

  private applyCombat(val: CombatMatch[] | null): void {
    this.combatObj = val;
    if (this.combatObj && this.matchNoCurrentIndex !== undefined) {
      this.match = this.combatObj[this.matchNoCurrentIndex];
    }
    if (this.refereeObj == null) {
      this.refereeObj = JSON.parse(JSON.stringify(this.combatConst.referee));
    }
  }

  async disconnect(): Promise<void> {
    for (const u of this.unsubs) u();
    for (const r of this.refs) off(r);
    this.unsubs = [];
    this.refs = [];
  }

  // ==================== Điều khiển mirror (để test race tất định) ====================

  /** Từ giờ, mọi cập nhật /combat từ Firebase sẽ KHÔNG được áp vào mirror. */
  freezeMirror(): void {
    this.mirrorFrozen = true;
    this.note('đóng băng mirror (giả lập chưa nhận được update từ sân kia)');
  }

  /** Áp lại thay đổi đã bị giữ và tiếp tục nhận realtime. */
  async thawMirror(): Promise<void> {
    this.mirrorFrozen = false;
    if (this.pendingCombat !== null) {
      this.applyCombat(this.pendingCombat);
      this.pendingCombat = null;
    }
    this.note('mở băng mirror');
    await delay(50);
  }

  /** Ép đọc lại /combat từ server (bỏ qua mirror cũ) */
  async refreshMirror(): Promise<void> {
    const snap = await get(ref(this.ctx.db, `tournament/${this.opts.tournamentIndex}/combat`));
    this.applyCombat(snap.val());
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

  // ==================== Hành động của Giám Sát ====================

  /** Chuyển sang trận số `no` — tương ứng restoreMatch() trong container */
  async goToMatch(no: number): Promise<void> {
    setLastMatch(this.ctx, no);

    const referees: RefereeScore[] = [];
    if (!this.refereeObj) this.refereeObj = JSON.parse(JSON.stringify(this.combatConst.referee));
    for (let i = 0; i < this.opts.numReferee; i++) {
      this.refereeObj![i] = { blueScore: 0, redScore: 0 };
      referees.push(this.refereeObj![i]);
    }
    resetRefereeScores(this.ctx, referees);

    this.scoreTimerCount = this.opts.timeScore;
    this.isFirstRefereeScore = false;

    await this.waitFor(() => this.matchNoCurrent === no, 5000, `lastMatch = ${no}`);
    this.note(`đến trận ${no}`);
  }

  /** Nhịp chấm điểm — bản sao trung thực của makeScoreTimer() trong container */
  makeScoreTimer(): void {
    if (!this.refereeObj || !this.match || this.matchNoCurrentIndex === undefined) return;

    for (let i = 0; i < this.opts.numReferee; i++) {
      const referee = this.refereeObj[i];
      if (!referee) continue;

      if (referee.redScore !== 0 || referee.blueScore !== 0) {
        if (!this.isFirstRefereeScore) this.isFirstRefereeScore = true;
        this.scoreTimerCount--;
        if (this.scoreTimerCount === 0 || hasScoreQuorum(this.refereeObj, this.opts.numReferee)) {
          const tally = commitRefereeScores(
            this.ctx,
            this.matchNoCurrentIndex,
            this.match,
            this.refereeObj,
            this.opts.numReferee,
            this.combatConst.referee
          );
          this.note(`chốt điểm trận ${this.matchNoCurrent}: đỏ +${tally.red}, xanh +${tally.blue}`);
          this.refereeObj = JSON.parse(JSON.stringify(this.combatConst.referee));
          this.scoreTimerCount = this.opts.timeScore;
          this.isFirstRefereeScore = false;
          break;
        }
      }
    }
  }

  /**
   * Xác nhận thắng — tương ứng redWin/blueWin sau khi bấm OK ở modal.
   * @returns false nếu bị guard "không thể chấm lại trận đấu này" chặn
   */
  async declareWin(winColor: 'red' | 'blue'): Promise<boolean> {
    if (!this.match || !this.combatObj || this.matchNoCurrent === undefined) {
      throw new Error(`[${this.opts.label}] chưa sẵn sàng để xác nhận thắng`);
    }
    if (!canRescoreMatch(this.combatObj, this.matchNoCurrent)) {
      this.note(`bị chặn: không thể chấm lại trận ${this.matchNoCurrent}`);
      return false;
    }

    const target = replaceFighter(
      this.ctx,
      this.combatObj,
      this.matchNoCurrent,
      this.match,
      winColor
    );
    this.note(
      `trận ${this.matchNoCurrent}: ${winColor} thắng` +
      (target >= 0 ? ` → điền vào trận ${target + 1}` : ' (không có trận kế tiếp để điền)')
    );

    if (this.opts.winCommitDelayMs > 0) await delay(this.opts.winCommitDelayMs);
    this.match.match.win = winColor;
    saveMatchWin(this.ctx, this.matchNoCurrentIndex!, winColor);
    return true;
  }

  /** Chỉ chạy replaceFighter, không ghi match.win — để test điều khiển interleaving */
  replaceFighterOnly(winColor: 'red' | 'blue'): number {
    if (!this.match || !this.combatObj || this.matchNoCurrent === undefined) {
      throw new Error(`[${this.opts.label}] chưa sẵn sàng`);
    }
    const target = replaceFighter(this.ctx, this.combatObj, this.matchNoCurrent, this.match, winColor);
    this.note(`replaceFighter(${winColor}) trận ${this.matchNoCurrent} → trận ${target + 1}`);
    return target;
  }

  /** Cộng/trừ điểm tay, caution, đòn chân — đều đi qua saveMatch() của app */
  addCaution(color: 'red' | 'blue', kind: 'remind' | 'warning' | 'medical' | 'fall' | 'bound'): void {
    if (!this.match || this.matchNoCurrentIndex === undefined) throw new Error('chưa có trận');
    const f = color === 'red' ? this.match.fighters.redFighter : this.match.fighters.blueFighter;
    f.caution[kind]++;
    saveMatchData(this.ctx, this.matchNoCurrentIndex, this.match);
    this.note(`${color} +1 ${kind} ở trận ${this.matchNoCurrent}`);
  }

  addScore(color: 'red' | 'blue', n = 1): void {
    if (!this.match || this.matchNoCurrentIndex === undefined) throw new Error('chưa có trận');
    const f = color === 'red' ? this.match.fighters.redFighter : this.match.fighters.blueFighter;
    f.score += n;
    saveMatchData(this.ctx, this.matchNoCurrentIndex, this.match);
    this.note(`${color} +${n} điểm tay ở trận ${this.matchNoCurrent}`);
  }

  toggleLegStrike(color: 'red' | 'blue'): void {
    if (!this.match || this.matchNoCurrentIndex === undefined) throw new Error('chưa có trận');
    const f = color === 'red' ? this.match.fighters.redFighter : this.match.fighters.blueFighter;
    f.legStrike = !f.legStrike;
    saveMatchData(this.ctx, this.matchNoCurrentIndex, this.match);
    this.note(`${color} đòn chân = ${f.legStrike} ở trận ${this.matchNoCurrent}`);
  }
}
