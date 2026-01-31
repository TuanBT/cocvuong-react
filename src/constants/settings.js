/**
 * Các cài đặt mặc định cho ứng dụng
 */

// Cài đặt trận đấu mặc định
export const DEFAULT_COMBAT_SETTINGS = {
  isShowArenaB: true,
  isShowCautionBox: true,
  isShowCountryFlag: true,
  isShowFiveReferee: false,
  timeBreak: 60,
  timeExtra: 120,
  timeExtraBreak: 60,
  timeRound: 120
};

// Cài đặt thi quyền mặc định
export const DEFAULT_MARTIAL_SETTINGS = {
  isShowArenaB: true,
  isShowCountryFlag: true,
  isShowFiveReferee: false
};

// Cài đặt giải đấu mặc định
export const DEFAULT_TOURNAMENT_SETTING = {
  setting: {
    combat: DEFAULT_COMBAT_SETTINGS,
    martial: DEFAULT_MARTIAL_SETTINGS,
    tournamentName: "Cóc Vương"
  }
};

// Alias for backward compatibility
export const DEFAULT_SETTING = DEFAULT_TOURNAMENT_SETTING;

// Cài đặt mật khẩu mặc định
export const DEFAULT_COMMON_SETTING = {
  passwordSetting: 1,
  passwordGiamSat: 1,
  passwordGiamDinh: 1
};

// Cấu trúc trận đấu mặc định
export const DEFAULT_COMBAT_CONST = {
  lastMatch: { no: 1 },
  referee: [
    { redScore: 0, blueScore: 0 },
    { redScore: 0, blueScore: 0 },
    { redScore: 0, blueScore: 0 },
    { redScore: 0, blueScore: 0 },
    { redScore: 0, blueScore: 0 }
  ],
  combat: []
};

// Template vận động viên mặc định
export const DEFAULT_MATCH_OBJ = {
  match: { no: 1, type: "", category: "", win: "" },
  fighters: {
    redFighter: {
      result: "",
      name: "Đỏ",
      code: "",
      country: "",
      caution: { remind: 0, warning: 0, medical: 0, fall: 0, bound: 0 },
      legStrike: false,
      score: 0
    },
    blueFighter: {
      result: "",
      name: "Xanh",
      code: "",
      country: "",
      caution: { remind: 0, warning: 0, medical: 0, fall: 0, bound: 0 },
      legStrike: false,
      score: 0
    }
  }
};

// Cấu trúc sân thi đấu
export const DEFAULT_COMBAT_ARENA = {
  combatArenaName: "Sân A",
  lastMatch: { no: 1 },
  referee: [
    { blueScore: 0, redScore: 0 },
    { blueScore: 0, redScore: 0 },
    { blueScore: 0, redScore: 0 },
    { blueScore: 0, redScore: 0 },
    { blueScore: 0, redScore: 0 }
  ]
};

// Cấu trúc thi quyền mặc định
export const DEFAULT_MARTIAL_CONST = {
  martialArena: [
    { martialArenaName: "Sân A", lastMatchMartial: { matchMartialNo: 1, teamMartialNo: 1 } },
    { martialArenaName: "Sân B", lastMatchMartial: { matchMartialNo: 1, teamMartialNo: 1 } }
  ],
  martial: []
};

// Template đội thi quyền
export const DEFAULT_MARTIAL_MATCH_OBJ = {
  match: { name: "" },
  team: []
};

export const DEFAULT_MARTIAL_FIGHTER_OBJ = {
  fighters: [],
  no: 0,
  finalScore: 0,
  refereeMartial: [
    { score: 0 },
    { score: 0 },
    { score: 0 },
    { score: 0 },
    { score: 0 }
  ]
};

export default {
  DEFAULT_COMBAT_SETTINGS,
  DEFAULT_MARTIAL_SETTINGS,
  DEFAULT_TOURNAMENT_SETTING,
  DEFAULT_SETTING,
  DEFAULT_COMMON_SETTING,
  DEFAULT_COMBAT_CONST,
  DEFAULT_MATCH_OBJ,
  DEFAULT_COMBAT_ARENA,
  DEFAULT_MARTIAL_CONST,
  DEFAULT_MARTIAL_MATCH_OBJ,
  DEFAULT_MARTIAL_FIGHTER_OBJ
};
