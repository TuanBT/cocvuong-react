/**
 * Score Sync Utility
 * 
 * Utility để đồng bộ điểm giữa Giám Định và Giám Sát qua Firebase
 */

import { ref, update, onValue, off } from 'firebase/database';
import type { TournamentId } from '../types';

export interface ScoreSyncConfig {
  db: any; // Firebase Database
  tournamentNoIndex: TournamentId;
  combatArenaNoIndex: number;
  refereeIndex: number;
  arena: string;
}

export interface ScoreSubscribeConfig {
  db: any; // Firebase Database
  tournamentNoIndex: TournamentId;
  combatArenaNoIndex: number;
  arena?: string;
}

/**
 * Gửi điểm từ Giám Định lên Firebase
 */
export function sendScoreFromGiamDinh(
  config: ScoreSyncConfig,
  color: 'red' | 'blue',
  score: number
): void {
  const { db, tournamentNoIndex, combatArenaNoIndex, refereeIndex } = config;
  const path = `tournament/${tournamentNoIndex}/combatArena/${combatArenaNoIndex}/referee/${refereeIndex}`;

  const updateData = color === 'red' ? { redScore: score } : { blueScore: score };
  update(ref(db, path), updateData)
    .then(() => {
    })
    .catch((err) => {
    });
}

/**
 * Đăng ký nhận điểm cho Giám Sát từ Firebase
 * 
 * @param onScoreUpdate callback nhận (refereeIndex, redScore, blueScore)
 *   Firebase luôn trả về cả 2 giá trị nên callback ghi đè cả 2 (bao gồm reset về 0)
 */
export function subscribeScoreForGiamSat(
  config: ScoreSubscribeConfig,
  numReferee: number,
  onScoreUpdate: (refereeIndex: number, redScore: number, blueScore: number) => void
): () => void {
  const { db, tournamentNoIndex, combatArenaNoIndex } = config;

  const refereePath = `tournament/${tournamentNoIndex}/combatArena/${combatArenaNoIndex}/referee`;
  const refereeRef = ref(db, refereePath);

  onValue(refereeRef, (snapshot) => {
    const refereeData = snapshot.val();
    if (refereeData && Array.isArray(refereeData)) {
      refereeData.forEach((referee: any, index: number) => {
        if (referee && (referee.redScore !== undefined || referee.blueScore !== undefined)) {
          onScoreUpdate(index, referee.redScore || 0, referee.blueScore || 0);
        }
      });
    }
  });

  // Return cleanup function
  return () => off(refereeRef);
}
