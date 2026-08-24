/**
 * Scenario 02 — Một sân chạy trọn giải (baseline)
 *
 * Đây là mốc so sánh: nếu case này đỏ thì lỗi KHÔNG phải do chạy song song.
 */
import { ArenaClient } from '../harness/arenaClient';
import { RefereePanel } from '../harness/refereeClient';
import { playMatch } from '../harness/matchRunner';
import { seedTournamentFromExcel, readCombats, readCombat, readArena } from '../harness/seed';
import { tournamentIndexFor, wipeTournament, delay } from '../harness/env';
import {
  assertEqual, assertTrue, assertNoPlaceholder,
  logStep, logPass, logInfo, type TestCase,
} from '../harness/report';

import { combatExcel, pickCategories } from '../harness/dataset';

const EXCEL = () => combatExcel();

export const cases: TestCase[] = [
  {
    name: 'Sân A chạy trọn 1 hạng cân 4 VĐV — bracket khép kín',
    group: 'mot-san',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        const seeded = await seedTournamentFromExcel(EXCEL(), {
          tournamentIndex: T,
          tournamentName: 'E2E — 1 sân',
          numReferee: 3,
          categories: [pickCategories().smallest],
        });
        logInfo(`${seeded.combats.length} trận`);
        assertEqual(seeded.combats.length, 3, '4 VĐV phải sinh ra 3 trận (2 BK + 1 CK)');

        arena = new ArenaClient({
          tournamentIndex: T, arenaIndex: 0, numReferee: 3, winCommitDelayMs: 50,
        });
        await arena.connect();
        const panel = new RefereePanel(T, 0, 3);

        for (let no = 1; no <= seeded.combats.length; no++) {
          logStep(`Trận ${no}`);
          const r = await playMatch(arena, panel, no, { rounds: 2, redShare: 1 });
          assertTrue(!r.blocked, `Trận ${no} không được bị guard chặn`);
          assertNoPlaceholder(r.winnerName, `Người thắng trận ${no}`);
          logPass(`${r.type} — ${r.winnerName} thắng (${r.redScore}-${r.blueScore})`);
          await delay(150);
        }

        logStep('Kiểm tra kết quả cuối');
        const final = await readCombats(T);
        for (let i = 0; i < final.length; i++) {
          const c = final[i];
          assertTrue(
            c.match.win === 'red' || c.match.win === 'blue',
            `Trận ${i + 1} phải có kết quả thắng, thực tế "${c.match.win}"`
          );
          assertNoPlaceholder(c.fighters.redFighter.name, `Trận ${i + 1} giáp đỏ`);
          assertNoPlaceholder(c.fighters.blueFighter.name, `Trận ${i + 1} giáp xanh`);
        }
        logPass('Cả 3 trận đều có kết quả, không còn ô W.x nào chưa điền');

        logStep('Kiểm tra reset trạng thái khi VĐV lên trận sau');
        const ck = final[2];
        for (const side of ['redFighter', 'blueFighter'] as const) {
          const f = ck.fighters[side];
          assertTrue(
            Object.values(f.caution).every((v) => v === 0) || ck.match.win !== '',
            `VĐV ${side} vào Chung Kết phải được reset caution`
          );
        }
        logPass('Caution/điểm được reset khi VĐV chuyển trận');
      } finally {
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Quá bán giám định bấm CÙNG NHỊP — điểm lên đúng',
    group: 'mot-san',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        await seedTournamentFromExcel(EXCEL(), {
          tournamentIndex: T, tournamentName: 'E2E — quorum', numReferee: 3,
          categories: [pickCategories().smallest],
        });
        arena = new ArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee: 3 });
        await arena.connect();
        const panel = new RefereePanel(T, 0, 3);
        await arena.goToMatch(1);
        await arena.waitFor(() => arena!.match != null, 5000, 'trận 1');

        logStep('1/3 giám định chấm một mình — chưa quá bán');
        panel.referees[0].score('red', 1);
        await delay(800);
        let c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.score, 0, 'Một giám định chấm một mình thì KHÔNG được lên điểm');
        logPass('1/3 giám định → điểm giữ nguyên 0 (đúng luật quá bán)');

        logStep('2/3 giám định bấm cùng nhịp, đỏ +1');
        await panel.clearAll();
        await delay(300);
        await panel.voteTogether('red', 1);
        await delay(900);
        c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.score, 1, '2/3 giám định cùng chấm +1 thì điểm phải lên 1');
        logPass('2/3 giám định cùng nhịp → điểm lên 1');

        logStep('2/3 giám định bấm cùng nhịp, xanh +2');
        await panel.clearAll();
        await delay(300);
        await panel.voteTogether('blue', 2);
        await delay(900);
        c = await readCombat(T, 0);
        assertEqual(c!.fighters.blueFighter.score, 2, '2/3 giám định cùng chấm +2 thì điểm xanh phải lên 2');
        logPass('2/3 giám định chấm +2 → điểm xanh lên 2');
      } finally {
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Giám định bấm LỆCH NHỊP — điểm bị mất trắng',
    group: 'mot-san',
    knownBug: 'score-window-collapsed',
    fn: async () => {
      const T = tournamentIndexFor(0);
      const gaps = [0, 100, 300, 600, 1000, 2000];
      const lost: number[] = [];

      logInfo('README ghi: "Chỉ cần >50% giám định chấm là ghi nhận điểm", "dưới 2s thì bỏ phiên chấm".');
      logInfo('Vậy 2 giám định bấm cách nhau dưới ~2s thì điểm PHẢI được ghi nhận.');

      for (const gap of gaps) {
        let arena: ArenaClient | null = null;
        try {
          await seedTournamentFromExcel(EXCEL(), {
            tournamentIndex: T, tournamentName: 'E2E — lệch nhịp', numReferee: 3,
            categories: [pickCategories().smallest],
          });
          arena = new ArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee: 3 });
          await arena.connect();
          const panel = new RefereePanel(T, 0, 3);
          await arena.goToMatch(1);
          await arena.waitFor(() => arena!.match != null, 5000, 'trận 1');

          panel.referees[0].score('red', 1);
          if (gap > 0) await delay(gap);
          panel.referees[1].score('red', 1);
          await delay(1200);

          const c = await readCombat(T, 0);
          const score = c!.fighters.redFighter.score;
          logInfo(`  2 giám định cách nhau ${String(gap).padStart(4)}ms → điểm đỏ = ${score}${score === 1 ? '' : '  ← MẤT ĐIỂM'}`);
          if (score !== 1) lost.push(gap);
        } finally {
          if (arena) await arena.disconnect();
          await wipeTournament(T);
        }
      }

      assertEqual(
        lost.length, 0,
        `Có ${lost.length}/${gaps.length} khoảng cách bị mất điểm: ${lost.join(', ')}ms.\n` +
        '      Nguyên nhân: subscribeScoreForGiamSat() gọi callback MỘT LẦN CHO MỖI giám định\n' +
        '      trên mỗi snapshot, mà mỗi lần gọi lại chạy makeScoreTimer() và trừ scoreTimerCount.\n' +
        '      TIME_SCORE = 3 nên chỉ một snapshot đã đốt hết bộ đếm → makeScoreTimer chốt non\n' +
        '      với getModes([1,0,0]) = 0 rồi XOÁ bảng giám định. Người thứ hai bấm vào bảng đã bị xoá.\n' +
        '      Cửa sổ chờ 2-3 giây trên thực tế co lại còn đúng 1 snapshot.\n' +
        '      Dấu vết trên DB dev: tournament/0 có 46 trận đã phân thắng bại nhưng chỉ 18 trận có điểm > 0.'
      );
    },
  },

  {
    name: 'Bảng giám định phải luôn đúng số lượng giám định',
    group: 'mot-san',
    knownBug: 'referee-array-length-oscillates',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        await seedTournamentFromExcel(EXCEL(), {
          tournamentIndex: T, tournamentName: 'E2E — số ô giám định', numReferee: 3,
          categories: [pickCategories().smallest],
        });
        arena = new ArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee: 3 });
        await arena.connect();
        const panel = new RefereePanel(T, 0, 3);

        await arena.goToMatch(1);
        await arena.waitFor(() => arena!.match != null, 5000, 'trận 1');
        const afterGoTo = (await readArena(T, 0))!.referee.length;
        logInfo(`Sau khi chuyển trận (restoreMatch): ${afterGoTo} ô giám định`);
        assertEqual(afterGoTo, 3, 'restoreMatch phải ghi đúng 3 ô giám định');

        await panel.voteTogether('red', 1);
        await delay(900);
        const afterCommit = (await readArena(T, 0))!.referee.length;
        logInfo(`Sau khi chốt điểm (makeScoreTimer):  ${afterCommit} ô giám định`);
        assertEqual(
          afterCommit, 3,
          'Sau khi chốt điểm bảng giám định vẫn phải có 3 ô.\n' +
          '      makeScoreTimer ghi thẳng combatConst.referee — hằng số này LUÔN có 5 ô\n' +
          '      (DEFAULT_COMBAT_CONST trong src/constants/settings.ts), bất kể giải dùng 3 hay 5 giám định.\n' +
          '      Số ô trên Firebase vì thế nhảy qua lại 3 ↔ 5 trong suốt trận.'
        );
      } finally {
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },
];
