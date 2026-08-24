/**
 * Scenario 03 — HAI SÂN CHẠY SONG SONG (trọng tâm của bộ test)
 *
 * Bối cảnh: `tournament/{t}/combat` là DÙNG CHUNG cho cả 2 sân; chỉ
 * `combatArena/{0|1}/{lastMatch,referee}` là riêng. Mỗi Giám Sát giữ một bản
 * mirror đầy đủ của danh sách trận rồi ghi đè NGUYÊN NODE `fighters` — nên
 * hai sân có thể xoá kết quả của nhau.
 *
 * Các case ở đây dùng freezeMirror() để race trở thành TẤT ĐỊNH: tái hiện
 * 100% mỗi lần chạy, thay vì "thỉnh thoảng mới lỗi".
 */
import { ArenaClient } from '../harness/arenaClient';
import { RefereePanel } from '../harness/refereeClient';
import { playMatch } from '../harness/matchRunner';
import {
  seedTournamentFromExcel, readCombats, readCombat, readArena, findCrossFedMatch,
} from '../harness/seed';
import { tournamentIndexFor, wipeTournament, delay } from '../harness/env';
import {
  assertEqual, assertTrue, assertNotNull, assertNoPlaceholder,
  logStep, logPass, logInfo, logWarn, type TestCase,
} from '../harness/report';
import { CombatMatch } from '../../../src/types';

import { combatExcel, pickCategories } from '../harness/dataset';

const EXCEL = () => combatExcel();

// ==================== Tiện ích ====================

interface TwoArenaSetup {
  T: number;
  A: ArenaClient;
  B: ArenaClient;
  panelA: RefereePanel;
  panelB: RefereePanel;
  combats: CombatMatch[];
}

async function setupTwoArenas(
  slot: number,
  categories: string[],
  numReferee: 3 | 5 = 3,
  winCommitDelayMs = 50
): Promise<TwoArenaSetup> {
  const T = tournamentIndexFor(slot);
  const seeded = await seedTournamentFromExcel(EXCEL(), {
    tournamentIndex: T,
    tournamentName: 'E2E — 2 sân song song',
    numReferee,
    categories,
  });
  const A = new ArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee, winCommitDelayMs, label: 'Sân A' });
  const B = new ArenaClient({ tournamentIndex: T, arenaIndex: 1, numReferee, winCommitDelayMs, label: 'Sân B' });
  await A.connect();
  await B.connect();
  return {
    T, A, B,
    panelA: new RefereePanel(T, 0, numReferee),
    panelB: new RefereePanel(T, 1, numReferee),
    combats: seeded.combats,
  };
}

async function teardown(s: TwoArenaSetup | null): Promise<void> {
  if (!s) return;
  await s.A.disconnect();
  await s.B.disconnect();
  await wipeTournament(s.T);
}

/** Tìm cặp (trận nuôi đỏ, trận nuôi xanh, trận đích) — điểm nóng của chạy song song */
function findFeederPair(combats: CombatMatch[]): { red: number; blue: number; target: number } {
  const idx = findCrossFedMatch(combats);
  if (idx < 0) throw new Error('Giải này không có trận nào nhận VĐV từ 2 trận khác nhau');
  const red = Number(String(combats[idx].fighters.redFighter.result).split('.')[1]);
  const blue = Number(String(combats[idx].fighters.blueFighter.result).split('.')[1]);
  return { red, blue, target: idx + 1 };
}

// ==================== Cases ====================

export const cases: TestCase[] = [

  // ---------- Những thứ PHẢI đúng ----------

  {
    name: 'Cách ly bảng giám định: sân A chấm không đụng sân B',
    group: 'song-song',
    fn: async () => {
      let s: TwoArenaSetup | null = null;
      try {
        s = await setupTwoArenas(0, [pickCategories().smallestCrossFed]);
        await s.A.goToMatch(1);
        await s.B.goToMatch(2);

        logStep('Sân A: 2/3 giám định chấm đỏ +1');
        await s.panelA.voteMajority('red', 1);
        await delay(400);

        logStep('Kiểm tra bảng giám định sân B');
        const arenaB = await readArena(s.T, 1);
        assertNotNull(arenaB, 'Sân B phải tồn tại');
        assertTrue(
          arenaB.referee.every((r) => r.redScore === 0 && r.blueScore === 0),
          'Bảng điểm giám định sân B phải vẫn bằng 0 khi sân A chấm'
        );
        logPass('Sân A chấm điểm → sân B không bị ảnh hưởng');

        logStep('Sân B: 2/3 giám định chấm xanh +2, kiểm tra sân A giữ nguyên');
        await s.panelB.voteMajority('blue', 2);
        await delay(400);
        const arenaA = await readArena(s.T, 0);
        assertNotNull(arenaA, 'Sân A phải tồn tại');
        assertEqual(arenaA.lastMatch.no, 1, 'lastMatch sân A vẫn là trận 1');
        const arenaB2 = await readArena(s.T, 1);
        assertNotNull(arenaB2, 'Sân B phải tồn tại');
        assertEqual(arenaB2.lastMatch.no, 2, 'lastMatch sân B vẫn là trận 2');
        logPass('lastMatch của 2 sân độc lập');
      } finally {
        await teardown(s);
      }
    },
  },

  {
    name: '2 sân chia theo HẠNG CÂN — chạy hết giải, bracket toàn vẹn',
    group: 'song-song',
    fn: async () => {
      let s: TwoArenaSetup | null = null;
      try {
        s = await setupTwoArenas(0, pickCategories().twoSmall);
        const [catA, catB] = pickCategories().twoSmall;
        const noA = s.combats.filter((c) => c.match.category === catA).map((c) => c.match.no);
        const noB = s.combats.filter((c) => c.match.category === catB).map((c) => c.match.no);
        logInfo(`Sân A giữ ${catA}: trận ${noA.join(', ')}`);
        logInfo(`Sân B giữ ${catB}: trận ${noB.join(', ')}`);

        const runArena = async (arena: ArenaClient, panel: RefereePanel, nos: number[]) => {
          for (const no of nos) {
            await playMatch(arena, panel, no, { rounds: 1, redShare: 1, gapMs: 15 });
            await delay(80);
          }
        };

        logStep('Chạy 2 sân ĐỒNG THỜI (Promise.all)');
        await Promise.all([
          runArena(s.A, s.panelA, noA),
          runArena(s.B, s.panelB, noB),
        ]);

        logStep('Kiểm tra toàn bộ giải');
        const final = await readCombats(s.T);
        for (let i = 0; i < final.length; i++) {
          const c = final[i];
          assertNoPlaceholder(c.fighters.redFighter.name, `Trận ${i + 1} giáp đỏ`);
          assertNoPlaceholder(c.fighters.blueFighter.name, `Trận ${i + 1} giáp xanh`);
          assertTrue(
            c.match.win === 'red' || c.match.win === 'blue',
            `Trận ${i + 1} (${c.match.category}) phải có kết quả`
          );
        }
        logPass(`${final.length} trận chạy song song trên 2 sân, không có ô nào bị bỏ trống`);
      } finally {
        await teardown(s);
      }
    },
  },

  // ---------- Những bug chạy song song ----------

  {
    name: '2 bán kết ở 2 sân cùng nuôi 1 chung kết — kết quả sân sau đè sân trước',
    group: 'song-song',
    knownBug: 'replace-fighter-lost-update',
    fn: async () => {
      let s: TwoArenaSetup | null = null;
      try {
        s = await setupTwoArenas(0, [pickCategories().smallestCrossFed]);
        const { red: feedRed, blue: feedBlue, target } = findFeederPair(s.combats);
        logInfo(`Trận ${target} (Chung Kết) nhận VĐV từ trận ${feedRed} (ô đỏ) và trận ${feedBlue} (ô xanh)`);
        logInfo(`Sân A chạy trận ${feedRed}, Sân B chạy trận ${feedBlue} — đúng cách dùng 2 sân bình thường`);

        await s.A.goToMatch(feedRed);
        await s.B.goToMatch(feedBlue);
        await s.A.waitFor(() => s!.A.match != null, 5000, `trận ${feedRed}`);
        await s.B.waitFor(() => s!.B.match != null, 5000, `trận ${feedBlue}`);

        const nameA = s.A.match!.fighters.redFighter.name;
        const nameB = s.B.match!.fighters.redFighter.name;
        logInfo(`Dự kiến vào Chung Kết: "${nameA}" (từ trận ${feedRed}) và "${nameB}" (từ trận ${feedBlue})`);

        logStep('Cả 2 sân kết thúc gần như đồng thời — mirror chưa kịp đồng bộ');
        s.A.freezeMirror();
        s.B.freezeMirror();

        logStep(`Sân B xác nhận thắng trận ${feedBlue} trước`);
        s.B.replaceFighterOnly('red');
        await delay(200);

        const afterB = await readCombat(s.T, target - 1);
        assertNotNull(afterB, 'Chung Kết phải tồn tại');
        logInfo(`Sau sân B: đỏ="${afterB.fighters.redFighter.name}", xanh="${afterB.fighters.blueFighter.name}"`);

        logStep(`Sân A xác nhận thắng trận ${feedRed} ngay sau đó`);
        s.A.replaceFighterOnly('red');
        await delay(300);

        const afterA = await readCombat(s.T, target - 1);
        assertNotNull(afterA, 'Chung Kết phải tồn tại');
        logInfo(`Sau sân A: đỏ="${afterA.fighters.redFighter.name}", xanh="${afterA.fighters.blueFighter.name}"`);

        assertNoPlaceholder(
          afterA.fighters.redFighter.name,
          `Chung Kết (trận ${target}) ô đỏ — VĐV thắng trận ${feedRed}`
        );
        assertNoPlaceholder(
          afterA.fighters.blueFighter.name,
          `Chung Kết (trận ${target}) ô xanh — VĐV thắng trận ${feedBlue} bị sân A ghi đè mất`
        );
      } finally {
        await teardown(s);
      }
    },
  },

  {
    name: 'Sân A chốt điểm chung kết trong lúc sân B điền VĐV vào chính trận đó',
    group: 'song-song',
    knownBug: 'score-commit-lost-update',
    fn: async () => {
      let s: TwoArenaSetup | null = null;
      try {
        s = await setupTwoArenas(0, [pickCategories().smallestCrossFed]);
        const { red: feedRed, blue: feedBlue, target } = findFeederPair(s.combats);

        logStep(`Sân A chạy xong trận ${feedRed} — ô đỏ Chung Kết đã có VĐV`);
        await playMatch(s.A, s.panelA, feedRed, { rounds: 1, redShare: 1, gapMs: 15 });
        await delay(200);

        logStep(`Sân A nhảy tới Chung Kết (trận ${target}) và bắt đầu chấm, dù ô xanh còn trống`);
        await s.A.goToMatch(target);
        await s.A.waitFor(() => s!.A.match != null, 5000, `trận ${target}`);
        logInfo(`Sân A thấy: đỏ="${s.A.match!.fighters.redFighter.name}", xanh="${s.A.match!.fighters.blueFighter.name}"`);

        logStep('Mirror sân A đóng băng (mạng trễ)');
        s.A.freezeMirror();

        logStep(`Sân B chạy xong trận ${feedBlue} → điền VĐV vào ô xanh Chung Kết`);
        await playMatch(s.B, s.panelB, feedBlue, { rounds: 1, redShare: 1, gapMs: 15 });
        await delay(200);

        const mid = await readCombat(s.T, target - 1);
        assertNotNull(mid, 'Chung Kết phải tồn tại');
        logInfo(`Trên Firebase lúc này: xanh="${mid.fighters.blueFighter.name}"`);
        assertNoPlaceholder(mid.fighters.blueFighter.name, 'Sân B vừa điền ô xanh Chung Kết');

        logStep('Giám định sân A chấm điểm → makeScoreTimer ghi cả node fighters từ mirror cũ');
        await s.panelA.voteMajority('red', 1);
        await delay(500);

        const after = await readCombat(s.T, target - 1);
        assertNotNull(after, 'Chung Kết phải tồn tại');
        logInfo(`Sau khi sân A chốt điểm: đỏ="${after.fighters.redFighter.name}", xanh="${after.fighters.blueFighter.name}"`);

        assertNoPlaceholder(
          after.fighters.blueFighter.name,
          `Chung Kết ô xanh — VĐV sân B vừa điền bị lệnh chốt điểm của sân A xoá mất`
        );
      } finally {
        await teardown(s);
      }
    },
  },

  {
    name: 'Sân A bấm cảnh cáo trong lúc sân B điền VĐV vào cùng trận',
    group: 'song-song',
    knownBug: 'save-match-lost-update',
    fn: async () => {
      let s: TwoArenaSetup | null = null;
      try {
        s = await setupTwoArenas(0, [pickCategories().smallestCrossFed]);
        const { red: feedRed, blue: feedBlue, target } = findFeederPair(s.combats);

        await playMatch(s.A, s.panelA, feedRed, { rounds: 1, redShare: 1, gapMs: 15 });
        await delay(200);

        await s.A.goToMatch(target);
        await s.A.waitFor(() => s!.A.match != null, 5000, `trận ${target}`);
        s.A.freezeMirror();

        logStep(`Sân B chạy xong trận ${feedBlue} → điền ô xanh Chung Kết`);
        await playMatch(s.B, s.panelB, feedBlue, { rounds: 1, redShare: 1, gapMs: 15 });
        await delay(200);

        logStep('Sân A bấm +1 cảnh cáo cho giáp đỏ → saveMatch() ghi cả trận từ mirror cũ');
        s.A.addCaution('red', 'warning');
        await delay(400);

        const after = await readCombat(s.T, target - 1);
        assertNotNull(after, 'Chung Kết phải tồn tại');
        logInfo(`Sau khi bấm cảnh cáo: đỏ="${after.fighters.redFighter.name}", xanh="${after.fighters.blueFighter.name}"`);
        assertNoPlaceholder(
          after.fighters.blueFighter.name,
          'Chung Kết ô xanh — một cú bấm cảnh cáo ở sân A xoá mất VĐV sân B vừa điền'
        );
      } finally {
        await teardown(s);
      }
    },
  },

  {
    name: '2 sân cùng mở 1 trận — điểm bị nuốt, không có khoá trận',
    group: 'song-song',
    knownBug: 'no-match-lock-across-arenas',
    fn: async () => {
      let s: TwoArenaSetup | null = null;
      try {
        s = await setupTwoArenas(0, [pickCategories().smallestCrossFed]);

        logStep('Cả 2 sân cùng mở trận 1 (thao tác nhầm — hệ thống không ngăn)');
        await s.A.goToMatch(1);
        await s.B.goToMatch(1);
        await s.A.waitFor(() => s!.A.match != null, 5000, 'trận 1 ở sân A');
        await s.B.waitFor(() => s!.B.match != null, 5000, 'trận 1 ở sân B');

        s.A.freezeMirror();
        s.B.freezeMirror();

        logStep('Tổ giám định sân A chấm đỏ +1');
        await s.panelA.voteMajority('red', 1);
        await delay(400);

        logStep('Tổ giám định sân B cũng chấm đỏ +1 cho cùng trận đó');
        await s.panelB.voteMajority('red', 1);
        await delay(400);

        const after = await readCombat(s.T, 0);
        assertNotNull(after, 'Trận 1 phải tồn tại');
        logInfo(`Điểm giáp đỏ trên Firebase: ${after.fighters.redFighter.score}`);
        assertEqual(
          after.fighters.redFighter.score, 2,
          'Hai tổ giám định cùng chấm +1 thì phải ra 2 điểm — nếu ra 1 nghĩa là một lần chấm bị nuốt'
        );
      } finally {
        await teardown(s);
      }
    },
  },

  {
    name: '2 sân chia theo TRẬN trong cùng hạng cân — đo mức hỏng thực tế',
    group: 'song-song',
    fn: async () => {
      let s: TwoArenaSetup | null = null;
      try {
        s = await setupTwoArenas(0, [pickCategories().largest]);
        const total = s.combats.length;
        logInfo(`${total} trận, chia lẻ/chẵn cho 2 sân — cách chia tự nhiên khi muốn chạy nhanh`);
        logInfo('Case này KHÔNG dựng race thủ công: 2 sân chạy tự nhiên, đo xem thực tế hỏng bao nhiêu.');

        const oddNos = s.combats.map((c) => c.match.no).filter((n) => n % 2 === 1);
        const evenNos = s.combats.map((c) => c.match.no).filter((n) => n % 2 === 0);

        const maxLen = Math.max(oddNos.length, evenNos.length);
        for (let i = 0; i < maxLen; i++) {
          const jobs: Promise<any>[] = [];
          if (oddNos[i] !== undefined) {
            jobs.push(playMatch(s.A, s.panelA, oddNos[i], { rounds: 1, redShare: 1, gapMs: 10 }));
          }
          if (evenNos[i] !== undefined) {
            jobs.push(playMatch(s.B, s.panelB, evenNos[i], { rounds: 1, redShare: 1, gapMs: 10 }));
          }
          await Promise.all(jobs);
          await delay(60);
        }
        await delay(400);

        logStep('Bất biến — cấu trúc dữ liệu phải còn nguyên vẹn dù 2 sân giành nhau');
        const final = await readCombats(s.T);
        assertEqual(final.length, total, 'Số trận không được đổi');
        for (let i = 0; i < final.length; i++) {
          const c = final[i];
          assertEqual(c.match.no, i + 1, `Số hiệu trận ${i + 1} không được đổi`);
          assertTrue(!!c.fighters?.redFighter && !!c.fighters?.blueFighter, `Trận ${i + 1} phải còn đủ 2 VĐV`);
          for (const side of ['redFighter', 'blueFighter'] as const) {
            assertTrue(typeof c.fighters[side].score === 'number', `Trận ${i + 1} ${side}.score phải là số`);
            assertTrue(!!c.fighters[side].caution, `Trận ${i + 1} ${side} phải còn node caution`);
          }
        }
        logPass('Không trận nào bị mất node hay sai kiểu dữ liệu');

        logStep('Đo mức hỏng (chỉ báo cáo, không tính pass/fail vì phụ thuộc thời điểm)');
        const holes: string[] = [];
        let noWin = 0;
        for (let i = 0; i < final.length; i++) {
          const c = final[i];
          for (const side of ['redFighter', 'blueFighter'] as const) {
            if (/^[WL]\.\d+$/.test(String(c.fighters[side].name))) {
              holes.push(`trận ${i + 1}/${side === 'redFighter' ? 'đỏ' : 'xanh'}="${c.fighters[side].name}"`);
            }
          }
          if (c.match.win !== 'red' && c.match.win !== 'blue') noWin++;
        }
        logInfo(`Ô VĐV chưa được điền: ${holes.length}${holes.length ? ' → ' + holes.slice(0, 6).join(', ') : ''}`);
        logInfo(`Trận chưa có kết quả : ${noWin}/${total}`);
        if (holes.length > 0) {
          logWarn(`${holes.length} ô bị bỏ trống — hậu quả của bug replace-fighter-lost-update`);
          logWarn('Bằng chứng tất định của bug này nằm ở case "2 bán kết ở 2 sân cùng nuôi 1 chung kết".');
        } else {
          logInfo('Lần chạy này không dính race — bug vẫn còn, chỉ là chưa trúng thời điểm.');
        }
      } finally {
        await teardown(s);
      }
    },
  },

  {
    name: 'Guard "không thể chấm lại" dùng index thay vì số trận',
    group: 'song-song',
    knownBug: 'rescore-guard-off-by-one',
    fn: async () => {
      const { canRescoreMatch } = await import('../../../src/services/combatWriteService');

      // Dựng bracket tối thiểu: trận 1 và 2 là bán kết, trận 3 chung kết (W.1 vs W.2)
      const mk = (no: number, redRes: string, redName: string, blueRes: string, blueName: string): any => ({
        match: { no, type: '', category: '', win: '' },
        fighters: {
          redFighter: { result: redRes, name: redName, code: '', country: '', caution: {}, legStrike: false, score: 0 },
          blueFighter: { result: blueRes, name: blueName, code: '', country: '', caution: {}, legStrike: false, score: 0 },
        },
      });

      logStep('Trận 3 đã có VĐV thắng trận 1 điền vào (kết quả trận 1 ĐÃ ĐƯỢC DÙNG)');
      const used = [
        mk(1, '', 'VĐV A', '', 'VĐV B'),
        mk(2, '', 'VĐV C', '', 'VĐV D'),
        mk(3, 'W.1', 'VĐV A', 'W.2', 'W.2'),
      ];
      const allowed = canRescoreMatch(used, 1);
      logInfo(`canRescoreMatch(trận 1) = ${allowed}`);
      assertEqual(
        allowed, false,
        'Kết quả trận 1 đã được dùng ở trận 3 nên PHẢI chặn chấm lại. ' +
        'Guard so sánh "W."+j với j là index mảng (0,1,2) thay vì số trận (1,2,3) nên nhận nhầm.'
      );
    },
  },
];
