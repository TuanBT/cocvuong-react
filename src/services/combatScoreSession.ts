/**
 * Combat Score Session — cửa sổ chấm điểm của MỘT phiên
 *
 * Trước đây luật cửa sổ chấm nằm rải trong giamSatDoiKhang.container.tsx, còn
 * bộ test e2e giữ một bản chép tay riêng trong tests/e2e/harness/arenaClient.ts.
 * Hai bản lệch nhau nên test vừa báo lỗi ma (bug đã sửa trong app vẫn XFAIL)
 * vừa che lỗi thật. Giờ cả hai gọi CHUNG lớp này.
 *
 * Luật:
 *   · Cú bấm ĐẦU TIÊN của phiên mở cửa sổ dài `windowSec` giây.
 *   · Đủ quá bán giám định là chốt ngay, không chờ hết giờ.
 *   · Hết giờ mà chưa đủ quá bán thì bỏ phiên (mode của bảng gần như luôn 0).
 *
 * ⚠️ Tuyệt đối không rút ngắn cửa sổ trong callback nhận điểm: `onValue` của
 * node `referee` bắn ra MỘT callback cho MỖI ô giám định, nên một người bấm là
 * callback chạy 3–5 lần trong cùng một nhịp mạng. Bản cũ đếm ngược ngay trong
 * callback nên đốt sạch cửa sổ trong đúng nhịp đó: phiên đóng trước khi người
 * thứ hai kịp bấm, và điểm trận không bao giờ nhảy.
 */
import { hasAnyRefereeScored, hasScoreQuorum } from './combatWriteService';
import type { RefereeScore } from '../types';

/** Nhịp kiểm tra cửa sổ — mịn hơn 1 giây để phiên đóng sát mốc deadline */
export const SCORE_TICK_MS = 200;

export class CombatScoreSession {
  /** 0 = không có phiên nào đang mở */
  private deadline = 0;

  constructor(private windowSec: number) {}

  get isOpen(): boolean {
    return this.deadline !== 0;
  }

  /** Mốc đóng phiên (ms epoch), 0 nếu không có phiên nào mở — để hiển thị */
  get deadlineAt(): number {
    return this.deadline;
  }

  setWindow(windowSec: number): void {
    this.windowSec = windowSec;
  }

  /** Đóng phiên mà không chốt điểm (chuyển trận, xoá bảng) */
  reset(): void {
    this.deadline = 0;
  }

  /**
   * Một giám định vừa gửi điểm lên.
   * @returns true nếu đã đủ quá bán → gọi chốt phiên ngay.
   */
  onRefereeScored(
    referees: RefereeScore[] | null | undefined,
    numReferee: number,
    now: number = Date.now()
  ): boolean {
    if (!referees) return false;
    if (!hasAnyRefereeScored(referees, numReferee)) return false;

    // Cửa sổ đếm từ cú bấm ĐẦU TIÊN của phiên, không phải từ nhịp kiểm tra
    if (!this.deadline) this.deadline = now + this.windowSec * 1000;

    return hasScoreQuorum(referees, numReferee);
  }

  /**
   * Nhịp đồng hồ.
   * @returns true nếu phải chốt phiên (hết giờ, hoặc đã đủ quá bán).
   */
  tick(
    referees: RefereeScore[] | null | undefined,
    numReferee: number,
    now: number = Date.now()
  ): boolean {
    if (!this.deadline) return false;
    if (!referees) return false;

    // Bảng đã bị xoá bởi đường khác (chuyển trận, xoá điểm) — bỏ mốc cũ,
    // đừng để nó treo lại rồi chốt oan vào cú bấm của phiên sau
    if (!hasAnyRefereeScored(referees, numReferee)) {
      this.deadline = 0;
      return false;
    }

    return now >= this.deadline || hasScoreQuorum(referees, numReferee);
  }
}
