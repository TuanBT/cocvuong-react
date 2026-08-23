/**
 * Tournament Engine — Giả lập toàn bộ giải đấu end-to-end
 * 
 * Chạy trận đấu: referee chấm điểm → quorum → tích lũy score → winner → replaceFighter
 * Hỗ trợ: 2 sân, 3/5 giám định, caution/legStrike
 */

import {
  initFirebase,
  getDb,
  // CRUD
  writeCombat,
  writeCombatList,
  writeArena,
  writeSetting,
  writeRefereeScore,
  readRefereeScores,
  resetRefereeScores,
  readCombat,
  writeLastMatch,
  updateCombatField,
  cleanupTestTournament,
  // Factories
  createArena,
  createTestSetting,
  // Utils
  delay,
  getModes,
  defaultCaution,
  // Types
  type CombatMatch,
  type Fighter,
  type RefereeScore,
} from './setup';

import { ref, set, remove } from 'firebase/database';

// ==================== Types ====================

export interface MatchResult {
  matchIndex: number;
  matchNo: number;
  category: string;
  type: string;
  winColor: 'red' | 'blue';
  winnerName: string;
  winnerCode: string;
  redScore: number;
  blueScore: number;
}

export interface TournamentConfig {
  tournamentIndex: number;
  fiveReferee: boolean;
  /** Delay (ms) giữa các lần giám định chấm điểm */
  scoreDelay: number;
  /** Delay (ms) giữa các trận */
  matchDelay: number;
  /** Số lượt chấm điểm mỗi trận (giả lập nhiều hiệp) */
  scoringRounds: number;
  /** 
   * Xác định ai thắng: 
   * - 'red-always': đỏ luôn thắng
   * - 'alternate': xen kẽ đỏ-xanh
   * - 'random': random
   * - MatchResult[]: kết quả predefined
   */
  winnerStrategy: 'red-always' | 'alternate' | 'random' | MatchResult[];
}

const DEFAULT_CONFIG: TournamentConfig = {
  tournamentIndex: 99,
  fiveReferee: false,
  scoreDelay: 50,
  matchDelay: 100,
  scoringRounds: 2,
  winnerStrategy: 'red-always',
};

// ==================== Tournament Engine ====================

export class TournamentEngine {
  private config: TournamentConfig;
  private results: MatchResult[] = [];
  private matchCounter = 0;

  constructor(config: Partial<TournamentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getResults(): MatchResult[] {
    return this.results;
  }

  /**
   * Setup giải đấu: setting + arenas
   */
  async setupTournament(): Promise<void> {
    const numReferees = this.config.fiveReferee ? 5 : 3;
    
    // Setting
    await writeSetting(createTestSetting(this.config.fiveReferee), this.config.tournamentIndex);
    
    // 2 Arenas
    await writeArena(0, createArena('Sân A', 1, numReferees), this.config.tournamentIndex);
    await writeArena(1, createArena('Sân B', 1, numReferees), this.config.tournamentIndex);
  }

  /**
   * Ghi combat list lên Firebase
   */
  async writeCombats(combats: any[]): Promise<void> {
    await set(
      ref(getDb(), `tournament/${this.config.tournamentIndex}/combat`),
      combats
    );
  }

  /**
   * Cleanup test data
   */
  async cleanup(): Promise<void> {
    await remove(ref(getDb(), `tournament/${this.config.tournamentIndex}`));
  }

  /**
   * Giả lập 1 trận đấu hoàn chỉnh
   * 
   * @param combatIndex Index trong combat array
   * @param arenaIndex Sân thi đấu (0 hoặc 1)
   * @param totalCombats Tổng số trận (để replaceFighter duyệt)
   */
  async simulateMatch(
    combatIndex: number,
    arenaIndex: number = 0,
    totalCombats: number,
  ): Promise<MatchResult> {
    const numReferees = this.config.fiveReferee ? 5 : 3;
    const tIdx = this.config.tournamentIndex;

    // Đọc trận hiện tại
    const combat = await readCombat(combatIndex, tIdx);
    if (!combat) throw new Error(`Combat ${combatIndex} not found`);

    const matchNo = combat.match.no;

    // Skip nếu trận đã có kết quả
    if (combat.match.win) {
      return {
        matchIndex: combatIndex,
        matchNo,
        category: combat.match.category,
        type: combat.match.type,
        winColor: combat.match.win as 'red' | 'blue',
        winnerName: combat.match.win === 'red' ? combat.fighters.redFighter.name : combat.fighters.blueFighter.name,
        winnerCode: combat.match.win === 'red' ? combat.fighters.redFighter.code : combat.fighters.blueFighter.code,
        redScore: combat.fighters.redFighter.score,
        blueScore: combat.fighters.blueFighter.score,
      };
    }

    // Skip nếu chưa có VĐV thật (placeholder W.x)
    const redIsPlaceholder = String(combat.fighters.redFighter.name).startsWith('W.') ||
                             String(combat.fighters.redFighter.name).startsWith('L.');
    const blueIsPlaceholder = String(combat.fighters.blueFighter.name).startsWith('W.') ||
                              String(combat.fighters.blueFighter.name).startsWith('L.');
    if (redIsPlaceholder || blueIsPlaceholder) {
      throw new Error(`Match ${matchNo} still has placeholders: red="${combat.fighters.redFighter.name}", blue="${combat.fighters.blueFighter.name}"`);
    }

    // Set lastMatch
    await writeLastMatch(arenaIndex, matchNo, tIdx);

    // Reset referee scores
    await resetRefereeScores(arenaIndex, numReferees, tIdx);
    await delay(this.config.scoreDelay);

    // Giả lập nhiều lượt chấm điểm
    let totalRedScore = 0;
    let totalBlueScore = 0;

    for (let round = 0; round < this.config.scoringRounds; round++) {
      // Determine winner for this scoring round  
      const winColor = this._getWinColor();
      
      // Giám định chấm điểm
      const quorumNeeded = Math.floor(numReferees / 2) + 1;
      
      for (let ref = 0; ref < numReferees; ref++) {
        if (ref < quorumNeeded) {
          // Quorum referees chấm cho bên thắng
          if (winColor === 'red') {
            await writeRefereeScore(arenaIndex, ref, { redScore: 1, blueScore: 0 }, tIdx);
          } else {
            await writeRefereeScore(arenaIndex, ref, { redScore: 0, blueScore: 1 }, tIdx);
          }
        } else {
          // Referees còn lại chấm 0 hoặc ngược lại
          await writeRefereeScore(arenaIndex, ref, { redScore: 0, blueScore: 0 }, tIdx);
        }
      }
      await delay(this.config.scoreDelay);

      // Tính getModes giống app thật
      const scores = await readRefereeScores(arenaIndex, tIdx);
      if (scores) {
        const redScores = scores.map((s: RefereeScore) => s.redScore);
        const blueScores = scores.map((s: RefereeScore) => s.blueScore);
        totalRedScore += getModes(redScores);
        totalBlueScore += getModes(blueScores);
      }

      // Reset referee cho lượt kế
      await resetRefereeScores(arenaIndex, numReferees, tIdx);
      await delay(this.config.scoreDelay);
    }

    // Ghi score lên combat
    await updateCombatField(combatIndex, 'fighters/redFighter/score', totalRedScore, tIdx);
    await updateCombatField(combatIndex, 'fighters/blueFighter/score', totalBlueScore, tIdx);

    // Xác định người thắng
    const matchWinColor: 'red' | 'blue' = totalRedScore >= totalBlueScore ? 'red' : 'blue';
    const winner = matchWinColor === 'red' ? combat.fighters.redFighter : combat.fighters.blueFighter;

    // replaceFighter — điền VĐV thắng vào trận kế
    await this._replaceFighter(combatIndex, matchNo, matchWinColor, totalCombats);

    // Ghi match.win
    await updateCombatField(combatIndex, 'match/win', matchWinColor, tIdx);

    await delay(this.config.matchDelay);

    const result: MatchResult = {
      matchIndex: combatIndex,
      matchNo,
      category: combat.match.category,
      type: combat.match.type,
      winColor: matchWinColor,
      winnerName: winner.name,
      winnerCode: winner.code,
      redScore: totalRedScore,
      blueScore: totalBlueScore,
    };
    this.results.push(result);
    return result;
  }

  /**
   * Chạy tất cả trận theo thứ tự
   * 
   * @param totalCombats Tổng số trận
   * @param arenaIndex Sân thi đấu (0 mặc định)
   * @param startIndex Index bắt đầu (0 mặc định)
   */
  async runAllMatches(
    totalCombats: number,
    arenaIndex: number = 0,
    startIndex: number = 0,
  ): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    for (let i = startIndex; i < totalCombats; i++) {
      try {
        const result = await this.simulateMatch(i, arenaIndex, totalCombats);
        results.push(result);
      } catch (err: any) {
        // Placeholder matches will be handled after their feeder matches complete
        if (err.message.includes('placeholders')) {
          // Re-read to check if it's been filled by a previous match's replaceFighter
          const combat = await readCombat(i, this.config.tournamentIndex);
          if (combat) {
            const redOk = !String(combat.fighters.redFighter.name).startsWith('W.');
            const blueOk = !String(combat.fighters.blueFighter.name).startsWith('W.');
            if (redOk && blueOk) {
              // Retry now that it's filled
              const result = await this.simulateMatch(i, arenaIndex, totalCombats);
              results.push(result);
              continue;
            }
          }
          // If still placeholder, it means feeder matches haven't been played yet
          // This shouldn't happen if matches are played in correct order
          throw new Error(`Match ${i} still has unresolved placeholders after all feeder matches should have completed`);
        }
        throw err;
      }
    }

    return results;
  }

  /**
   * Chạy trọn 1 hạng cân
   * Tìm tất cả trận thuộc hạng cân này và chạy theo thứ tự
   */
  async runCategory(
    combats: any[],
    categoryName: string,
    arenaIndex: number = 0,
  ): Promise<MatchResult[]> {
    // Tìm các index thuộc hạng cân này
    const indices: number[] = [];
    for (let i = 0; i < combats.length; i++) {
      if (combats[i].match.category === categoryName) {
        indices.push(i);
      }
    }

    if (indices.length === 0) {
      throw new Error(`No matches found for category "${categoryName}"`);
    }

    const results: MatchResult[] = [];
    for (const idx of indices) {
      const result = await this.simulateMatch(idx, arenaIndex, combats.length);
      results.push(result);
    }

    return results;
  }

  // ==================== Private ====================

  private _getWinColor(): 'red' | 'blue' {
    this.matchCounter++;

    if (this.config.winnerStrategy === 'red-always') {
      return 'red';
    } else if (this.config.winnerStrategy === 'alternate') {
      return this.matchCounter % 2 === 0 ? 'blue' : 'red';
    } else if (this.config.winnerStrategy === 'random') {
      return Math.random() > 0.5 ? 'red' : 'blue';
    }
    // Predefined — always red as fallback
    return 'red';
  }

  /**
   * Port logic replaceFighter từ giamSatDoiKhang.container.tsx
   */
  private async _replaceFighter(
    combatIndex: number,
    matchNoCurrent: number,
    winColor: 'red' | 'blue',
    totalCombats: number,
  ): Promise<void> {
    const tIdx = this.config.tournamentIndex;
    const combat = await readCombat(combatIndex, tIdx);
    if (!combat) return;

    const matchWin = 'W.' + matchNoCurrent;
    const matchLose = 'L.' + matchNoCurrent;
    const winFighter = winColor === 'red' ? combat.fighters.redFighter : combat.fighters.blueFighter;
    const loseFighter = winColor === 'red' ? combat.fighters.blueFighter : combat.fighters.redFighter;

    const resetFighterState = (fighter: Fighter): void => {
      fighter.score = 0;
      fighter.legStrike = false;
      fighter.caution = { bound: 0, fall: 0, medical: 0, remind: 0, warning: 0 };
    };

    for (let i = matchNoCurrent; i < totalCombats; i++) {
      const targetCombat = await readCombat(i, tIdx);
      if (!targetCombat) continue;

      const fightersTemp = targetCombat.fighters;

      // Check red side
      if (fightersTemp.redFighter.result === matchWin) {
        fightersTemp.redFighter = JSON.parse(JSON.stringify(winFighter));
        fightersTemp.redFighter.result = matchWin;
        resetFighterState(fightersTemp.redFighter);
        await set(ref(getDb(), `tournament/${tIdx}/combat/${i}/fighters`), fightersTemp);
        break;
      }
      if (fightersTemp.redFighter.result === matchLose) {
        fightersTemp.redFighter = JSON.parse(JSON.stringify(loseFighter));
        fightersTemp.redFighter.result = matchLose;
        resetFighterState(fightersTemp.redFighter);
        await set(ref(getDb(), `tournament/${tIdx}/combat/${i}/fighters`), fightersTemp);
        break;
      }

      // Check blue side
      if (fightersTemp.blueFighter.result === matchWin) {
        fightersTemp.blueFighter = JSON.parse(JSON.stringify(winFighter));
        fightersTemp.blueFighter.result = matchWin;
        resetFighterState(fightersTemp.blueFighter);
        await set(ref(getDb(), `tournament/${tIdx}/combat/${i}/fighters`), fightersTemp);
        break;
      }
      if (fightersTemp.blueFighter.result === matchLose) {
        fightersTemp.blueFighter = JSON.parse(JSON.stringify(loseFighter));
        fightersTemp.blueFighter.result = matchLose;
        resetFighterState(fightersTemp.blueFighter);
        await set(ref(getDb(), `tournament/${tIdx}/combat/${i}/fighters`), fightersTemp);
        break;
      }
    }
  }
}
