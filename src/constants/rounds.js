/**
 * Các hằng số liên quan đến hiệp đấu
 */

export const ROUNDS = {
  FIRST: "Hiệp 1",
  BREAK: "Nghỉ giữa hiệp",
  SECOND: "Hiệp 2",
  BREAK_EXTRA: "Nghỉ hiệp phụ",
  EXTRA: "Hiệp phụ"
};

export const { FIRST, BREAK, SECOND, BREAK_EXTRA, EXTRA } = ROUNDS;

/**
 * Cài đặt thời gian mặc định (giây)
 */
export const DEFAULT_TIME_SETTINGS = {
  TIME_ROUND: 120,      // 2 phút mỗi hiệp
  TIME_BREAK: 60,       // 1 phút nghỉ giữa hiệp
  TIME_EXTRA: 120,      // 2 phút hiệp phụ
  TIME_EXTRA_BREAK: 60  // 1 phút nghỉ hiệp phụ
};

/**
 * Số giám định
 */
export const REFEREE_COUNT = {
  DEFAULT: 3,
  EXTENDED: 5
};

/**
 * Thời gian cho phép chấm điểm từ giám định đầu tới cuối (giây)
 */
export const SCORE_TIME_LIMIT = 2;

export default ROUNDS;
