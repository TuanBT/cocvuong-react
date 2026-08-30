// Re-export all constants
export { BOOTSTRAP_ADMIN_EMAIL } from './admin';

export { COLORS } from './colors';
export type { ColorPalette } from './colors';

export { 
  ROUNDS, 
  DEFAULT_TIME_SETTINGS, 
  REFEREE_COUNT,
  TIME_SCORE
} from './rounds';
export type { 
  TimeSettingItem, 
  DefaultTimeSettings, 
  RoundType, 
  RefereeCountConfig 
} from './rounds';

export {
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
} from './settings';
export type {
  CombatSettings,
  MartialSettings,
  TournamentSetting,
  CommonSetting,
  RefereeScore,
  CombatConst,
  Caution,
  Fighter,
  MatchInfo,
  MatchObj,
  CombatArena,
  LastMatchMartial,
  MartialArena,
  MartialConst,
  MartialMatchObj,
  RefereeMartialScore,
  MartialFighterObj
} from './settings';

export { 
  BRACKET_SCHEMAS, 
  SCHEMA_2, 
  SCHEMA_3, 
  SCHEMA_4, 
  getBracketSchema 
} from './bracketSchemas';
export type { 
  FighterData, 
  MatchData 
} from './bracketSchemas';
