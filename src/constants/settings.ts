/**
 * Các cài đặt mặc định cho ứng dụng
 */

// Types/Interfaces
export interface CombatSettings {
  isShowArenaB: boolean;
  isShowCautionBox: boolean;
  isShowCountryFlag: boolean;
  isShowFiveReferee: boolean;
  isPrioritizeUnitName?: boolean;
  timeBreak: number;
  timeExtra: number;
  timeExtraBreak: number;
  timeRound: number;
}

export interface MartialSettings {
  isShowArenaB: boolean;
  isShowCountryFlag: boolean;
  isShowFiveReferee: boolean;
}

export interface TournamentSetting {
  setting: {
    combat: CombatSettings;
    martial: MartialSettings;
    tournamentName: string;
    /**
     * Ngay giai dien ra, dang `YYYY-MM-DD`.
     *
     * Vang o moi giai cu — dung de phan biet hai giai trung ten qua cac nam, nen
     * khong bao gio duoc doan bua mot ngay khi truong nay thieu.
     */
    eventDate?: string;
  };
}

export interface CommonSetting {
  passwordSetting: number;
  passwordGiamSat: number;
  passwordGiamDinh: number;
}

export interface RefereeScore {
  redScore: number;
  blueScore: number;
}

export interface CombatConst {
  lastMatch: { no: number };
  referee: RefereeScore[];
  combat: unknown[];
}

export interface Caution {
  remind: number;
  warning: number;
  medical: number;
  fall: number;
  bound: number;
}

export interface Fighter {
  result: string;
  name: string;
  code: string;
  country: string;
  caution: Caution;
  legStrike: boolean;
  score: number;
}

export interface MatchInfo {
  no: number;
  type: string;
  category: string;
  win: string;
}

export interface MatchObj {
  match: MatchInfo;
  fighters: {
    redFighter: Fighter;
    blueFighter: Fighter;
  };
}

export interface CombatArena {
  combatArenaName: string;
  lastMatch: { no: number };
  referee: RefereeScore[];
}

export interface LastMatchMartial {
  matchMartialNo: number;
  teamMartialNo: number;
}

export interface MartialArena {
  martialArenaName: string;
  lastMatchMartial: LastMatchMartial;
}

export interface MartialConst {
  martialArena: MartialArena[];
  martial: unknown[];
}

export interface MartialMatchObj {
  match: { name: string };
  team: unknown[];
}

export interface RefereeMartialScore {
  score: number;
}

export interface MartialFighterObj {
  fighters: unknown[];
  no: number;
  finalScore: number;
  refereeMartial: RefereeMartialScore[];
}

// Cài đặt trận đấu mặc định
export const DEFAULT_COMBAT_SETTINGS: CombatSettings = {
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
export const DEFAULT_MARTIAL_SETTINGS: MartialSettings = {
  isShowArenaB: true,
  isShowCountryFlag: true,
  isShowFiveReferee: false
};

// Cài đặt giải đấu mặc định
export const DEFAULT_TOURNAMENT_SETTING: TournamentSetting = {
  setting: {
    combat: DEFAULT_COMBAT_SETTINGS,
    martial: DEFAULT_MARTIAL_SETTINGS,
    tournamentName: "Cóc Vương"
  }
};

// Alias for backward compatibility
export const DEFAULT_SETTING = DEFAULT_TOURNAMENT_SETTING;

// Cài đặt mật khẩu mặc định
export const DEFAULT_COMMON_SETTING: CommonSetting = {
  passwordSetting: 1,
  passwordGiamSat: 1,
  passwordGiamDinh: 1
};

// Cấu trúc trận đấu mặc định
export const DEFAULT_COMBAT_CONST: CombatConst = {
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
export const DEFAULT_MATCH_OBJ: MatchObj = {
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
export const DEFAULT_COMBAT_ARENA: CombatArena = {
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
export const DEFAULT_MARTIAL_CONST: MartialConst = {
  martialArena: [
    { martialArenaName: "Sân A", lastMatchMartial: { matchMartialNo: 1, teamMartialNo: 1 } },
    { martialArenaName: "Sân B", lastMatchMartial: { matchMartialNo: 1, teamMartialNo: 1 } }
  ],
  martial: []
};

// Template đội thi quyền
export const DEFAULT_MARTIAL_MATCH_OBJ: MartialMatchObj = {
  match: { name: "" },
  team: []
};

export const DEFAULT_MARTIAL_FIGHTER_OBJ: MartialFighterObj = {
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
