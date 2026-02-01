// Type definitions for Cóc Vương application

// Firebase types
export interface Tournament {
  setting: TournamentSetting;
  combat: CombatMatch[];
  combatArena: CombatArena[];
  martial?: MartialMatch[];
  martialArena?: MartialArena[];
}

export interface TournamentSetting {
  tournamentName: string;
  combat: CombatSettings;
  martial: MartialSettings;
}

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

export interface Fighter {
  result: string;
  name: string;
  code: string;
  country: string;
  caution: Caution;
  legStrike: boolean;
  score: number;
}

export interface Caution {
  remind: number;
  warning: number;
  medical: number;
  fall: number;
  bound: number;
}

export interface CombatMatch {
  match: MatchInfo;
  fighters: {
    redFighter: Fighter;
    blueFighter: Fighter;
  };
}

export interface MatchInfo {
  no: number;
  type: string;
  category: string;
  win: string;
}

export interface CombatArena {
  combatArenaName: string;
  lastMatch: { no: number };
  referee: RefereeScore[];
}

export interface RefereeScore {
  redScore: number;
  blueScore: number;
}

export interface MartialMatch {
  match: MartialMatchInfo;
  teams: MartialTeam[];
}

export interface MartialMatchInfo {
  no: number;
  type: string;
  category: string;
}

export interface MartialTeam {
  teamNo: number;
  teamName: string;
  teamCode: string;
  fighters: MartialFighter[];
  score: MartialScore;
}

export interface MartialFighter {
  name: string;
  code: string;
}

export interface MartialScore {
  total: number;
  referee: number[];
}

export interface MartialArena {
  martialArenaName: string;
  lastMatchMartial: {
    matchMartialNo: number;
    teamMartialNo: number;
  };
}

export interface CommonSetting {
  passwordSetting: string | number;
  passwordGiamSat: string | number;
  passwordGiamDinh: string | number;
}

// Component Props types
export interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (password: string) => void;
  title?: string;
}

export interface NumpadInputProps {
  onInput: (value: string) => void;
}

export interface TournamentSelectorProps {
  tournaments: Array<{ index: number; name: string }>;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export interface ArenaSelectorProps {
  arenas: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

// State types
export interface GiamSatDoiKhangState {
  data: any[];
  isShowFiveReferee?: boolean;
}

export interface SettingState {
  data: any[];
}

// Bracket schema type
export interface BracketSchema {
  fighterCount: number;
  matchCount: number;
  matches: BracketMatch[];
}

export interface BracketMatch {
  matchNo: number;
  redFighter: string;
  blueFighter: string;
  type: string;
  category: string;
}
