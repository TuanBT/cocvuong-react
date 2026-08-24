/**
 * Scenario 04 — Soak: 2 sân chạy tự do, thời điểm ngẫu nhiên nhưng CÓ SEED
 *
 * Ba case trên bắt những lỗi đã biết. Case này để bắt những lỗi CHƯA nghĩ ra:
 * cho 2 sân giành nhau với độ trễ ngẫu nhiên, rồi kiểm tra các bất biến mà
 * hệ thống phải giữ trong MỌI trường hợp.
 *
 * Seed cố định → chạy lại ra đúng cùng một chuỗi thao tác, nên khi đỏ là có
 * thể tái hiện. Đổi seed bằng --seed=<số>.
 */
import { ArenaClient } from '../harness/arenaClient';
import { RefereePanel } from '../harness/refereeClient';
import { playMatch } from '../harness/matchRunner';
import { seedTournamentFromExcel, readCombats } from '../harness/seed';
import { tournamentIndexFor, wipeTournament, delay } from '../harness/env';
import {
  assertEqual, assertTrue, logStep, logPass, logInfo, logWarn, type TestCase,
} from '../harness/report';

import { combatExcel, pickCategories } from '../harness/dataset';

const EXCEL = () => combatExcel();

/** PRNG có seed (mulberry32) — cùng seed cho ra cùng kịch bản */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getSeed(): number {
  const arg = process.argv.find((a) => a.startsWith('--seed='));
  return arg ? Number(arg.slice(7)) : 20260823;
}

export const cases: TestCase[] = [
  {
    name: 'Soak — 2 sân giành nhau với độ trễ ngẫu nhiên, kiểm tra bất biến',
    group: 'soak',
    fn: async () => {
      const seed = getSeed();
      const rand = rng(seed);
      logInfo(`seed = ${seed} (chạy lại cùng seed sẽ ra đúng kịch bản này)`);

      const T = tournamentIndexFor(0);
      let A: ArenaClient | null = null;
      let B: ArenaClient | null = null;
      try {
        const seeded = await seedTournamentFromExcel(EXCEL(), {
          tournamentIndex: T, tournamentName: 'E2E — soak', numReferee: 3,
          categories: [pickCategories().largest],
        });
        const total = seeded.combats.length;
        logInfo(`${total} trận, 2 sân tranh nhau chạy`);

        A = new ArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee: 3, winCommitDelayMs: 20, label: 'Sân A' });
        B = new ArenaClient({ tournamentIndex: T, arenaIndex: 1, numReferee: 3, winCommitDelayMs: 20, label: 'Sân B' });
        await A.connect();
        await B.connect();
        const panelA = new RefereePanel(T, 0, 3);
        const panelB = new RefereePanel(T, 1, 3);

        // Hàng đợi chung: sân nào rảnh thì lấy trận tiếp theo — giống thực tế
        const queue = seeded.combats.map((c) => c.match.no);
        let cursor = 0;
        let errorsA = 0, errorsB = 0;

        const worker = async (arena: ArenaClient, panel: RefereePanel, counter: 'A' | 'B') => {
          while (true) {
            const i = cursor++;
            if (i >= queue.length) break;
            const no = queue[i];
            await delay(Math.floor(rand() * 60));
            try {
                  await playMatch(arena, panel, no, {
                rounds: 1,
                redShare: rand() > 0.5 ? 1 : 0,
                gapMs: 5 + Math.floor(rand() * 15),
              });
            } catch (err: any) {
              if (counter === 'A') errorsA++; else errorsB++;
              logWarn(`[${arena.opts.label}] trận ${no}: ${err.message}`);
            }
            await delay(Math.floor(rand() * 40));
          }
        };

        logStep('Chạy 2 sân đồng thời trên cùng hàng đợi trận');
        await Promise.all([worker(A, panelA, 'A'), worker(B, panelB, 'B')]);
        await delay(500);

        // ===== Bất biến: cấu trúc dữ liệu không được hỏng =====
        logStep('Bất biến 1 — cấu trúc dữ liệu còn nguyên vẹn');
        const final = await readCombats(T);
        assertEqual(final.length, total, 'Số trận không được thay đổi trong lúc chạy');
        for (let i = 0; i < final.length; i++) {
          const c = final[i];
          assertTrue(!!c.match, `Trận ${i + 1} phải còn node match`);
          assertTrue(!!c.fighters?.redFighter && !!c.fighters?.blueFighter, `Trận ${i + 1} phải còn đủ 2 VĐV`);
          assertEqual(c.match.no, i + 1, `Số trận ${i + 1} không được đổi`);
          for (const side of ['redFighter', 'blueFighter'] as const) {
            const f = c.fighters[side];
            assertTrue(typeof f.name === 'string', `Trận ${i + 1} ${side}.name phải là chuỗi`);
            assertTrue(typeof f.score === 'number' && f.score >= 0, `Trận ${i + 1} ${side}.score phải là số không âm, thực tế ${f.score}`);
            assertTrue(!!f.caution, `Trận ${i + 1} ${side} phải còn node caution`);
          }
        }
        logPass('Không có trận nào bị mất node hay sai kiểu dữ liệu');

        logStep('Bất biến 2 — không có ngoại lệ trong lúc chạy');
        assertEqual(errorsA + errorsB, 0, `Có ${errorsA + errorsB} lỗi khi chạy (sân A: ${errorsA}, sân B: ${errorsB})`);
        logPass('2 sân chạy hết hàng đợi không ném lỗi');

        logStep('Bất biến 3 — bảng giám định của mỗi sân đúng cấu trúc');
        for (const a of [0, 1]) {
          const { readArena } = await import('../harness/seed');
          const arena = await readArena(T, a);
          assertTrue(!!arena, `Sân ${a} phải tồn tại`);
          assertTrue(Array.isArray(arena!.referee), `Bảng giám định sân ${a} phải là mảng`);
          for (const r of arena!.referee) {
            assertTrue(typeof r.redScore === 'number' && typeof r.blueScore === 'number',
              `Ô giám định sân ${a} phải có redScore/blueScore là số`);
          }
        }
        logPass('Bảng giám định 2 sân đúng cấu trúc');

        // ===== Báo cáo (không làm đỏ test) =====
        const placeholders: string[] = [];
        let noWin = 0;
        for (let i = 0; i < final.length; i++) {
          const c = final[i];
          for (const side of ['redFighter', 'blueFighter'] as const) {
            if (/^[WL]\.\d+$/.test(String(c.fighters[side].name))) {
              placeholders.push(`trận ${i + 1}/${side === 'redFighter' ? 'đỏ' : 'xanh'}`);
            }
          }
          if (c.match.win !== 'red' && c.match.win !== 'blue') noWin++;
        }
        logInfo('─── Báo cáo chất lượng (không tính pass/fail) ───');
        logInfo(`Ô VĐV chưa được điền : ${placeholders.length}${placeholders.length ? ' → ' + placeholders.slice(0, 6).join(', ') : ''}`);
        logInfo(`Trận chưa có kết quả  : ${noWin}/${total}`);
        if (placeholders.length > 0) {
          logWarn(`${placeholders.length} ô bị bỏ trống do 2 sân ghi đè nhau (bug replace-fighter-lost-update)`);
        }
      } finally {
        if (A) await A.disconnect();
        if (B) await B.disconnect();
        await wipeTournament(T);
      }
    },
  },
];
