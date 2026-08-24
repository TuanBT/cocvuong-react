/**
 * Scenario 06 — CHẠY HẾT BỘ DATA
 *
 * Đưa file Excel VĐV vào → tạo giải → 2 sân chạy hết mọi trận / mọi lượt thi →
 * in ra bảng kết quả (vô địch từng hạng cân, xếp hạng từng nội dung).
 *
 * Đây là case dùng khi muốn "test lại từ đầu" với một bộ dữ liệu mới:
 *   npx tsx tests/e2e/run.ts --live --only=het-data --file=vdv.xlsx
 */
import { ArenaClient } from '../harness/arenaClient';
import { RefereePanel } from '../harness/refereeClient';
import { playMatch } from '../harness/matchRunner';
import { MartialArenaClient, MartialRefereePanel } from '../harness/martialClient';
import {
  seedTournamentFromExcel, readCombats,
  seedMartialFromExcel, readMartial,
} from '../harness/seed';
import { combatExcel, martialExcel } from '../harness/dataset';
import { rankTeams, computeFinalScore } from '../../../src/services/martialWriteService';
import { tournamentIndexFor, wipeTournament, delay } from '../harness/env';
import {
  assertEqual, assertTrue, assertNoPlaceholder,
  logStep, logPass, logInfo, logWarn, type TestCase,
} from '../harness/report';
import { CombatMatch } from '../../../src/types';

// ==================== In bảng ====================

function table(headers: string[], rows: string[][]): string[] {
  const all = [headers, ...rows];
  const w = headers.map((_, i) => Math.max(...all.map((r) => [...(r[i] ?? '')].length)));
  const line = (r: string[]) =>
    '  ' + r.map((c, i) => (c ?? '').padEnd(w[i] + ([...(c ?? '')].length - (c ?? '').length ? 0 : 0))).join('  ');
  const sep = '  ' + w.map((n) => '─'.repeat(n)).join('  ');
  return [line(headers), sep, ...rows.map(line)];
}

// ==================== Đối Kháng ====================

export const cases: TestCase[] = [
  {
    name: 'ĐỐI KHÁNG — chạy hết bộ data trên 2 sân, ra kết quả từng hạng cân',
    group: 'het-data',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let A: ArenaClient | null = null;
      let B: ArenaClient | null = null;
      try {
        logStep(`Tạo giải từ ${combatExcel()}`);
        const seeded = await seedTournamentFromExcel(combatExcel(), {
          tournamentIndex: T, tournamentName: 'E2E — chạy hết data (đối kháng)', numReferee: 3,
        });
        const combats = seeded.combats;
        const cats = [...new Set(combats.map((c) => c.match.category))];
        logInfo(`${combats.length} trận / ${cats.length} hạng cân`);

        A = new ArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee: 3, winCommitDelayMs: 15, label: 'Sân A' });
        B = new ArenaClient({ tournamentIndex: T, arenaIndex: 1, numReferee: 3, winCommitDelayMs: 15, label: 'Sân B' });
        await A.connect();
        await B.connect();
        const panelA = new RefereePanel(T, 0, 3);
        const panelB = new RefereePanel(T, 1, 3);

        // Chia theo HẠNG CÂN — cách chia an toàn: mỗi hạng cân chỉ một sân đụng vào,
        // nên không có 2 sân cùng nuôi một trận.
        const catsA = cats.filter((_, i) => i % 2 === 0);
        const catsB = cats.filter((_, i) => i % 2 === 1);
        logInfo(`Sân A: ${catsA.length} hạng cân | Sân B: ${catsB.length} hạng cân`);

        const runArena = async (arena: ArenaClient, panel: RefereePanel, myCats: string[]) => {
          const nos = combats.filter((c) => myCats.includes(c.match.category)).map((c) => c.match.no);
          for (const no of nos) {
            await playMatch(arena, panel, no, { rounds: 1, redShare: 1, gapMs: 8 });
            await delay(25);
          }
        };

        logStep('2 sân chạy ĐỒNG THỜI hết toàn bộ giải');
        const t0 = Date.now();
        await Promise.all([runArena(A, panelA, catsA), runArena(B, panelB, catsB)]);
        await delay(500);
        logInfo(`Xong ${combats.length} trận trong ${((Date.now() - t0) / 1000).toFixed(1)}s`);

        const final = await readCombats(T);
        assertEqual(final.length, combats.length, 'Số trận không được đổi');

        // In bảng kết quả TRƯỚC khi kiểm tra, để dù có hạng cân bị kẹt thì vẫn
        // lấy được kết quả của những hạng cân chạy xong.
        logStep('KẾT QUẢ — vô địch từng hạng cân');
        const isPh = (n: any) => /^[WL]\.\d+$/.test(String(n));
        const rows: string[][] = [];
        const stuck: string[] = [];
        for (const cat of cats) {
          const inCat = final.filter((c) => c.match.category === cat);
          const ck = inCat.find((c) => c.match.type === 'Chung Kết');
          if (!ck) { rows.push([cat, String(inCat.length), '(không có chung kết)', '']); continue; }
          const champ = ck.match.win === 'red' ? ck.fighters.redFighter : ck.fighters.blueFighter;
          const runner = ck.match.win === 'red' ? ck.fighters.blueFighter : ck.fighters.redFighter;
          if (isPh(champ.name) || isPh(runner.name) || !ck.match.win) {
            stuck.push(cat);
            rows.push([cat, String(inCat.length), '⚠ KẸT — chung kết chưa có VĐV', '']);
          } else {
            rows.push([cat, String(inCat.length), champ.name, runner.name]);
          }
        }
        for (const l of table(['HẠNG CÂN', 'SỐ TRẬN', 'VÔ ĐỊCH', 'Á QUÂN'], rows)) console.log(l);
        logInfo(`Ra được kết quả cho ${cats.length - stuck.length}/${cats.length} hạng cân`);

        logStep('Kiểm tra toàn giải');
        const holes: string[] = [];
        let noWin = 0;
        for (let i = 0; i < final.length; i++) {
          const c = final[i];
          for (const side of ['redFighter', 'blueFighter'] as const) {
            if (isPh(c.fighters[side].name)) {
              holes.push(
                `trận ${i + 1} (${c.match.category}/${c.match.type}) ô ` +
                `${side === 'redFighter' ? 'đỏ' : 'xanh'} = "${c.fighters[side].name}" ` +
                `nhưng result = "${c.fighters[side].result}"`
              );
            }
          }
          if (c.match.win !== 'red' && c.match.win !== 'blue') noWin++;
        }
        for (const h of holes) logWarn(h);
        assertEqual(
          holes.length, 0,
          `Còn ${holes.length} ô VĐV chưa được điền → ${stuck.length} hạng cân không ra được kết quả.\n` +
          '      Nếu đỏ ở đúng trận Chung Kết: kiểm tra changeMatchNumber() trong scheduleBuilder\n' +
          '      có còn dịch `result` cùng với `name` không — quên dịch là chung kết kẹt vĩnh viễn.'
        );
        assertEqual(noWin, 0, `Còn ${noWin} trận chưa có kết quả thắng`);
        logPass(`Cả ${final.length} trận đều có kết quả, không ô nào bị bỏ trống`);
      } finally {
        if (A) await A.disconnect();
        if (B) await B.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'THI QUYỀN — chạy hết bộ data trên 2 sân, ra xếp hạng từng nội dung',
    group: 'het-data',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let A: MartialArenaClient | null = null;
      let B: MartialArenaClient | null = null;
      try {
        logStep(`Tạo giải từ ${martialExcel()}`);
        const seeded = await seedMartialFromExcel(martialExcel(), {
          tournamentIndex: T, tournamentName: 'E2E — chạy hết data (thi quyền)', numReferee: 5,
        });
        logInfo(`${seeded.martial.length} nội dung / ${seeded.totalTurns} lượt thi / 5 giám định`);

        A = new MartialArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee: 5, label: 'Sân A' });
        B = new MartialArenaClient({ tournamentIndex: T, arenaIndex: 1, numReferee: 5, label: 'Sân B' });
        await A.connect();
        await B.connect();
        const panelA = new MartialRefereePanel(T, 0, 5);
        const panelB = new MartialRefereePanel(T, 1, 5);

        // Chia theo NỘI DUNG — mỗi nội dung chỉ một sân chấm
        const idxA = seeded.martial.map((_, i) => i).filter((i) => i % 2 === 0);
        const idxB = seeded.martial.map((_, i) => i).filter((i) => i % 2 === 1);
        logInfo(`Sân A: ${idxA.length} nội dung | Sân B: ${idxB.length} nội dung`);

        const runArena = async (
          arena: MartialArenaClient, panel: MartialRefereePanel, contentIdx: number[]
        ) => {
          for (const ci of contentIdx) {
            const teams = seeded.martial[ci].team.length;
            for (let ti = 1; ti <= teams; ti++) {
              await arena.goTo(ci + 1, ti);
              const t = arena.currentTurn()!;
              // điểm ổn định theo lượt để kết quả tái lập được
              const base = 6 + ((ci * 5 + ti * 3) % 4);
              // Cả tổ bấm cùng lúc — đúng thực tế trên sân, và nhanh hơn nhiều
              // so với chờ từng người. Case "bấm cùng lúc, điểm tổng vẫn đúng"
              // ở nhóm thi-quyen đã canh riêng tính đúng đắn của luồng này.
              await panel.scoreAllConcurrent(t.matchIdx, t.teamIdx, [base, base + 1, base + 2, base + 1, base]);
              await delay(15);
            }
          }
        };

        logStep('2 sân chấm ĐỒNG THỜI hết toàn bộ lượt thi');
        const t0 = Date.now();
        await Promise.all([runArena(A, panelA, idxA), runArena(B, panelB, idxB)]);
        await delay(500);
        logInfo(`Xong ${seeded.totalTurns} lượt thi trong ${((Date.now() - t0) / 1000).toFixed(1)}s`);

        logStep('Kiểm tra: mọi lượt đều có điểm, điểm tổng khớp bảng điểm giám định');
        const final = await readMartial(T);
        let turns = 0;
        const mismatched: string[] = [];
        for (let ci = 0; ci < final.length; ci++) {
          for (let ti = 0; ti < final[ci].team.length; ti++) {
            const team: any = final[ci].team[ti];
            turns++;
            assertTrue(team.finalScore > 0, `"${final[ci].match.name}" lượt ${ti + 1} chưa có điểm`);
            const expect = computeFinalScore(team.refereeMartial, 5);
            if (team.finalScore !== expect) {
              mismatched.push(`"${final[ci].match.name}" lượt ${ti + 1}: ghi ${team.finalScore}, đúng ra ${expect}`);
            }
          }
        }
        assertEqual(turns, seeded.totalTurns, 'Số lượt thi không được đổi');
        assertEqual(
          mismatched.length, 0,
          `${mismatched.length} lượt có điểm tổng lệch bảng điểm: ${mismatched.slice(0, 5).join(' | ')}`
        );
        logPass(`Cả ${turns} lượt thi đều có điểm khớp công thức 5 giám định`);

        logStep('KẾT QUẢ — xếp hạng từng nội dung');
        const rows: string[][] = [];
        for (const content of final) {
          const { ranked, pending } = rankTeams(content);
          assertEqual(pending.length, 0, `"${content.match.name}" còn ${pending.length} lượt chưa thi`);
          const top3 = ranked.slice(0, 3);
          rows.push([
            content.match.name,
            String(content.team.length),
            top3[0] ? `${top3[0].fighters.join(', ')} (${top3[0].finalScore})` : '',
            top3[1] ? `${top3[1].fighters.join(', ')} (${top3[1].finalScore})` : '',
            top3[2] ? `${top3[2].fighters.join(', ')} (${top3[2].finalScore})` : '',
          ]);
        }
        for (const l of table(['NỘI DUNG', 'LƯỢT', 'NHẤT', 'NHÌ', 'BA'], rows)) console.log(l);
        logPass(`Xếp hạng đủ ${final.length} nội dung`);
      } finally {
        if (A) await A.disconnect();
        if (B) await B.disconnect();
        await wipeTournament(T);
      }
    },
  },
];
