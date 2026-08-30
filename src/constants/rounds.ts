/**
 * Round and time settings constants
 */

export interface TimeSettingItem {
  label: string;
  value: number;
}

export interface DefaultTimeSettings {
  roundTime: TimeSettingItem[];
  breakTime: TimeSettingItem[];
  doctorTime: TimeSettingItem[];
  injuryTime: TimeSettingItem[];
}

export interface RefereeCountConfig {
  DEFAULT: number;
  THREE: number;
  FIVE: number;
  SEVEN: number;
}

// Round types
export const ROUNDS = {
  FIRST: 1,
  FIRST_ROUND: 1,
  SECOND: 2,
  SECOND_ROUND: 2,
  THIRD: 3,
  THIRD_ROUND: 3,
  BREAK: 'break',
  BREAK_TIME: 'break',
  BREAK_EXTRA: 'break_extra',
  EXTRA: 'extra',
  DOCTOR_TIME: 'doctor',
  INJURY_TIME: 'injury'
} as const;

export type RoundType = typeof ROUNDS[keyof typeof ROUNDS];

// Default time settings for dropdowns
export const DEFAULT_TIME_SETTINGS: DefaultTimeSettings = {
  roundTime: [
    { label: '1:00', value: 60 },
    { label: '1:30', value: 90 },
    { label: '2:00', value: 120 },
    { label: '2:30', value: 150 },
    { label: '3:00', value: 180 }
  ],
  breakTime: [
    { label: '0:30', value: 30 },
    { label: '1:00', value: 60 },
    { label: '1:30', value: 90 }
  ],
  doctorTime: [
    { label: '0:30', value: 30 },
    { label: '1:00', value: 60 },
    { label: '1:30', value: 90 },
    { label: '2:00', value: 120 }
  ],
  injuryTime: [
    { label: '1:00', value: 60 },
    { label: '2:00', value: 120 },
    { label: '3:00', value: 180 },
    { label: '5:00', value: 300 }
  ]
};

// Default referee count options
export const REFEREE_COUNT: RefereeCountConfig = {
  DEFAULT: 3,
  THREE: 3,
  FIVE: 5,
  SEVEN: 7
};

/**
 * Cửa sổ chấm điểm đối kháng, tính bằng GIÂY.
 *
 * Từ lúc giám định đầu tiên bấm, các giám định còn lại có ngần này giây để
 * bấm cùng phiên; hết giờ mà chưa đủ >50% thì bỏ phiên. Trận đối kháng đổi
 * đòn rất nhanh — để dài thì cú sau đè lên phiên của cú trước.
 */
export const TIME_SCORE = 2;

export default ROUNDS;
