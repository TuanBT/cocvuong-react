/**
 * Scenario 05 — THI QUYỀN
 *
 * Khác đối kháng ở chỗ: điểm tổng (finalScore) do CHÍNH client Giám Định tính —
 * ghi điểm mình xong thì đọc lại cả bảng, tính rồi ghi đè. Đây là đọc-rồi-ghi
 * trên nhiều client, nên là điểm nóng khi 2 sân / nhiều giám định chạy song song.
 */
import { MartialArenaClient, MartialRefereePanel } from '../harness/martialClient';
import {
  seedMartialFromExcel, seedMartialFromRaw, readMartial, readMartialTeam, readMartialArena,
} from '../harness/seed';
import { computeFinalScore, rankTeams } from '../../../src/services/martialWriteService';
import { buildMartialContents } from '../../../src/utils/martialBuilder';
import { tournamentIndexFor, wipeTournament, delay, readUntil } from '../harness/env';
import {
  assertEqual, assertTrue, assertNotNull,
  logStep, logPass, logInfo, logWarn, type TestCase,
} from '../harness/report';

import { martialExcel, pickContents } from '../harness/dataset';

const EXCEL_TQ = () => martialExcel();

interface TqSetup {
  T: number;
  A: MartialArenaClient;
  B: MartialArenaClient;
  panelA: MartialRefereePanel;
  panelB: MartialRefereePanel;
  martial: any[];
}

async function setupTwoMartialArenas(numReferee: 3 | 5 = 3, contents?: string[]): Promise<TqSetup> {
  const T = tournamentIndexFor(0);
  const seeded = await seedMartialFromExcel(EXCEL_TQ(), {
    tournamentIndex: T, tournamentName: 'E2E — Thi Quyền', numReferee, contents,
  });
  const A = new MartialArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee, label: 'Sân A' });
  const B = new MartialArenaClient({ tournamentIndex: T, arenaIndex: 1, numReferee, label: 'Sân B' });
  await A.connect();
  await B.connect();
  return {
    T, A, B,
    panelA: new MartialRefereePanel(T, 0, numReferee),
    panelB: new MartialRefereePanel(T, 1, numReferee),
    martial: seeded.martial,
  };
}

async function teardownTq(s: TqSetup | null): Promise<void> {
  if (!s) return;
  await s.A.disconnect();
  await s.B.disconnect();
  await wipeTournament(s.T);
}

export const cases: TestCase[] = [

  {
    name: 'Thi Quyền — tạo giải từ Excel, gom đội đồng diễn đúng',
    group: 'thi-quyen',
    fn: async () => {
      logStep('Gom đội từ dữ liệu thô: dòng liên tiếp cùng STT + nội dung = 1 đội');
      const raw = [
        [1, 'ĐỒNG DIỄN NỮ', 'A1', 'C1', 'VN'],
        [1, 'ĐỒNG DIỄN NỮ', 'A2', 'C1', 'VN'],
        [1, 'ĐỒNG DIỄN NỮ', 'A3', 'C1', 'VN'],
        [2, 'ĐỒNG DIỄN NỮ', 'B1', 'C2', 'VN'],
        [2, 'ĐỒNG DIỄN NỮ', 'B2', 'C2', 'VN'],
        [1, 'KHỞI QUYỀN NAM', 'D1', 'C3', 'VN'],
        [2, 'KHỞI QUYỀN NAM', 'D2', 'C4', 'VN'],
      ];
      const contents = buildMartialContents(raw);

      assertEqual(contents.length, 2, 'Phải có 2 nội dung');
      assertEqual(contents[0].match.name, 'ĐỒNG DIỄN NỮ', 'Nội dung 1');
      assertEqual(contents[0].team.length, 2, 'ĐỒNG DIỄN NỮ phải có 2 đội');
      assertEqual(contents[0].team[0].fighters.length, 3, 'Đội 1 phải có 3 VĐV');
      assertEqual(contents[0].team[1].fighters.length, 2, 'Đội 2 phải có 2 VĐV');
      assertEqual(contents[0].team[0].no, 1, 'Đội 1 mang số lượt 1');
      assertEqual(contents[0].team[1].no, 2, 'Đội 2 mang số lượt 2');
      assertEqual(contents[1].team.length, 2, 'KHỞI QUYỀN NAM phải có 2 lượt thi cá nhân');
      assertEqual(contents[1].team[0].fighters.length, 1, 'Thi cá nhân: 1 VĐV/lượt');
      logPass('Đội đồng diễn 3 người / 2 người và lượt cá nhân đều gom đúng');

      logStep('Bảng điểm giám định khởi tạo');
      for (const c of contents) {
        for (const t of c.team) {
          assertEqual(t.finalScore, 0, 'Điểm tổng ban đầu phải là 0');
          assertTrue(
            t.refereeMartial.every((r) => r.score === 0),
            'Bảng điểm giám định ban đầu phải bằng 0'
          );
        }
      }
      logPass('Mọi đội bắt đầu với điểm 0');
    },
  },

  {
    name: 'Thi Quyền — 3 giám định cộng cả 3, 5 giám định bỏ min & max',
    group: 'thi-quyen',
    fn: async () => {
      logStep('3 giám định: cộng cả 3 điểm');
      const r3 = [{ score: 8 }, { score: 9 }, { score: 7 }, { score: 0 }, { score: 0 }];
      assertEqual(computeFinalScore(r3, 3), 24, '8+9+7 = 24');
      logPass('3 giám định (8, 9, 7) → 24');

      logStep('5 giám định: bỏ điểm thấp nhất và cao nhất');
      const r5 = [{ score: 8 }, { score: 9 }, { score: 7 }, { score: 10 }, { score: 6 }];
      assertEqual(computeFinalScore(r5, 5), 24, '6+7+8+9+10 = 40, bỏ 6 và 10 → 24');
      logPass('5 giám định (8, 9, 7, 10, 6) → bỏ 6 và 10 → 24');

      logStep('5 giám định chấm bằng nhau');
      const same = [{ score: 8 }, { score: 8 }, { score: 8 }, { score: 8 }, { score: 8 }];
      assertEqual(computeFinalScore(same, 5), 24, '40 - (8+8) = 24');
      logPass('5 giám định đều 8 → 24');

      logStep('5 giám định nhưng mới có 3 người chấm — 2 ô còn 0');
      const partial = [{ score: 8 }, { score: 9 }, { score: 7 }, { score: 0 }, { score: 0 }];
      assertEqual(computeFinalScore(partial, 5), 15, '24 - (0 + 9) = 15 — điểm tạm thời khi chưa đủ giám định');
      logPass('Chưa đủ giám định → điểm tạm 15 (đúng công thức, sẽ đúng khi đủ người)');
    },
  },

  {
    name: 'Thi Quyền — chấm điểm và xếp hạng một nội dung trọn vẹn',
    group: 'thi-quyen',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let A: MartialArenaClient | null = null;
      try {
        const raw = [
          [1, 'LÃO MAI QUYỀN', 'VĐV Một', 'DV1', 'VN'],
          [2, 'LÃO MAI QUYỀN', 'VĐV Hai', 'DV2', 'VN'],
          [3, 'LÃO MAI QUYỀN', 'VĐV Ba', 'DV3', 'VN'],
          [4, 'LÃO MAI QUYỀN', 'VĐV Bốn', 'DV4', 'VN'],
        ];
        await seedMartialFromRaw(raw, {
          tournamentIndex: T, tournamentName: 'E2E — xếp hạng', numReferee: 3,
        });
        A = new MartialArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee: 3 });
        await A.connect();
        const panel = new MartialRefereePanel(T, 0, 3);

        const plan: { turn: number; scores: number[]; expect: number }[] = [
          { turn: 1, scores: [8, 8, 9], expect: 25 },
          { turn: 2, scores: [9, 9, 9], expect: 27 },
          { turn: 3, scores: [7, 8, 7], expect: 22 },
          { turn: 4, scores: [9, 9, 9], expect: 27 },
        ];

        for (const p of plan) {
          await A.goTo(1, p.turn);
          const t = A.currentTurn();
          assertNotNull(t, `Phải đọc được lượt thi ${p.turn}`);
          await panel.scoreAllSequential(t.matchIdx, t.teamIdx, p.scores, 15);
          await delay(150);

          const team = await readMartialTeam(T, 0, p.turn - 1);
          assertEqual(
            team.finalScore, p.expect,
            `Lượt ${p.turn} (${t.fighters[0]}): ${p.scores.join('+')} = ${p.expect}`
          );
          logPass(`Lượt ${p.turn} — ${t.fighters[0]}: ${p.scores.join(', ')} → ${team.finalScore}`);
        }

        logStep('Xếp hạng — đồng điểm phải đồng hạng');
        const martial = await readMartial(T);
        const { ranked, pending } = rankTeams(martial[0]);
        assertEqual(pending.length, 0, 'Cả 4 lượt đã thi nên không còn ai chờ');
        assertEqual(ranked.length, 4, 'Phải xếp hạng đủ 4 lượt');
        assertEqual(ranked[0].rank, 1, 'Hạng nhất');
        assertEqual(ranked[1].rank, 1, 'Đồng 27 điểm → đồng hạng nhất');
        assertEqual(ranked[0].finalScore, 27, 'Điểm cao nhất là 27');
        assertEqual(ranked[2].finalScore, 25, 'Kế tiếp là 25');
        assertEqual(ranked[2].rank, 3, 'Sau 2 người đồng hạng 1 là hạng 3');
        assertEqual(ranked[3].finalScore, 22, 'Thấp nhất 22');
        for (const r of ranked) logInfo(`  hạng ${r.rank}: lượt ${r.no} — ${r.fighters.join(', ')} — ${r.finalScore} điểm`);
        logPass('Xếp hạng đúng, đồng điểm đồng hạng, hạng kế nhảy đúng bậc');
      } finally {
        if (A) await A.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Thi Quyền — lượt thi của 2 sân độc lập nhau',
    group: 'thi-quyen',
    fn: async () => {
      let s: TqSetup | null = null;
      try {
        s = await setupTwoMartialArenas(3);
        logInfo(`${s.martial.length} nội dung, tổng ${s.A.totalTurns()} lượt thi`);

        logStep('Sân A vào nội dung 1 lượt 2, Sân B vào nội dung 2 lượt 1');
        await s.A.goTo(1, 2);
        await s.B.goTo(2, 1);

        const arenaA = await readUntil(
          () => readMartialArena(s!.T, 0),
          (v) => v?.lastMatchMartial?.matchMartialNo === 1 && v?.lastMatchMartial?.teamMartialNo === 2
        );
        const arenaB = await readUntil(
          () => readMartialArena(s!.T, 1),
          (v) => v?.lastMatchMartial?.matchMartialNo === 2 && v?.lastMatchMartial?.teamMartialNo === 1
        );
        assertEqual(arenaA.lastMatchMartial.matchMartialNo, 1, 'Sân A ở nội dung 1');
        assertEqual(arenaA.lastMatchMartial.teamMartialNo, 2, 'Sân A ở lượt 2');
        assertEqual(arenaB.lastMatchMartial.matchMartialNo, 2, 'Sân B ở nội dung 2');
        assertEqual(arenaB.lastMatchMartial.teamMartialNo, 1, 'Sân B ở lượt 1');
        logPass('Hai sân giữ lượt thi riêng, không đá nhau');

        logStep('Sân A chấm điểm — lượt thi sân B không đổi');
        const tA = s.A.currentTurn()!;
        await s.panelA.scoreAllSequential(tA.matchIdx, tA.teamIdx, [8, 8, 8], 15);
        await delay(250);
        const arenaB2 = await readMartialArena(s.T, 1);
        assertEqual(arenaB2.lastMatchMartial.matchMartialNo, 2, 'Sân B vẫn ở nội dung 2');
        assertEqual(arenaB2.lastMatchMartial.teamMartialNo, 1, 'Sân B vẫn ở lượt 1');

        const tB = s.B.currentTurn()!;
        const teamB = await readMartialTeam(s.T, tB.matchIdx, tB.teamIdx);
        assertEqual(teamB.finalScore, 0, 'Đội đang thi ở sân B chưa có điểm');
        logPass('Sân A chấm điểm không ảnh hưởng sân B');
      } finally {
        await teardownTq(s);
      }
    },
  },

  {
    name: 'Thi Quyền — 2 sân chấm 2 nội dung khác nhau cùng lúc',
    group: 'thi-quyen',
    fn: async () => {
      let s: TqSetup | null = null;
      try {
        // Chỉ lấy 2 nội dung ít lượt nhất — chạy hết cả giải là việc của nhóm het-data
        const picked = pickContents();
        s = await setupTwoMartialArenas(5, picked.all.slice(0, 2));
        const contents = s.martial;
        const half = Math.ceil(contents.length / 2);
        const forA = contents.slice(0, half);
        const forB = contents.slice(half);
        logInfo(`Sân A: ${forA.length} nội dung | Sân B: ${forB.length} nội dung | 5 giám định`);

        const runArena = async (
          arena: MartialArenaClient,
          panel: MartialRefereePanel,
          offset: number,
          list: any[]
        ) => {
          for (let ci = 0; ci < list.length; ci++) {
            const matchNo = offset + ci + 1;
            for (let ti = 1; ti <= list[ci].team.length; ti++) {
              await arena.goTo(matchNo, ti);
              const t = arena.currentTurn()!;
              const base = 6 + ((matchNo * 7 + ti * 3) % 4);
              await panel.scoreAllSequential(
                t.matchIdx, t.teamIdx,
                [base, base + 1, base + 2, base + 1, base],
                8
              );
              await delay(40);
            }
          }
        };

        logStep('Chạy 2 sân ĐỒNG THỜI');
        await Promise.all([
          runArena(s.A, s.panelA, 0, forA),
          runArena(s.B, s.panelB, half, forB),
        ]);
        await delay(400);

        logStep('Kiểm tra: mọi lượt thi đều có điểm và điểm đúng công thức 5 giám định');
        const final = await readMartial(s.T);
        let turns = 0;
        for (let ci = 0; ci < final.length; ci++) {
          for (let ti = 0; ti < final[ci].team.length; ti++) {
            const team: any = final[ci].team[ti];
            turns++;
            assertTrue(
              team.finalScore > 0,
              `Nội dung ${ci + 1} lượt ${ti + 1} phải có điểm, thực tế ${team.finalScore}`
            );
            assertEqual(
              team.finalScore,
              computeFinalScore(team.refereeMartial, 5),
              `Nội dung ${ci + 1} lượt ${ti + 1}: điểm tổng phải khớp bảng điểm giám định`
            );
          }
        }
        logPass(`${turns} lượt thi trên 2 sân đều có điểm khớp công thức`);

        logStep('Xếp hạng từng nội dung');
        for (let ci = 0; ci < final.length; ci++) {
          const { ranked, pending } = rankTeams(final[ci]);
          assertEqual(pending.length, 0, `Nội dung "${final[ci].match.name}" không được còn lượt chưa thi`);
          assertTrue(ranked.length > 0, `Nội dung "${final[ci].match.name}" phải xếp được hạng`);
          logInfo(`  ${final[ci].match.name}: nhất = lượt ${ranked[0].no} (${ranked[0].finalScore} điểm)`);
        }
        logPass('Mọi nội dung đều xếp được hạng');
      } finally {
        await teardownTq(s);
      }
    },
  },

  {
    name: 'Thi Quyền — cả tổ giám định bấm cùng lúc, điểm tổng vẫn đúng',
    group: 'thi-quyen',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let A: MartialArenaClient | null = null;
      try {
        const raw = [[1, 'TỨ LINH ĐAO', 'VĐV Một', 'DV1', 'VN']];
        await seedMartialFromRaw(raw, {
          tournamentIndex: T, tournamentName: 'E2E — bấm cùng lúc', numReferee: 3,
        });
        A = new MartialArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee: 3 });
        await A.connect();
        const panel = new MartialRefereePanel(T, 0, 3);
        await A.goTo(1, 1);
        const t = A.currentTurn()!;

        logInfo('Trên sân thật, 3 giám định bấm "Gửi" gần như cùng lúc — không ai chờ ai.');
        logInfo('Mỗi máy sau khi ghi điểm mình lại ĐỌC cả bảng rồi tự tính điểm tổng,');
        logInfo('nên đây là chỗ dễ mất dữ liệu nhất. Case này canh đúng chỗ đó.');

        logStep('3 giám định chấm 8, 9, 7 CÙNG LÚC (kỳ vọng tổng = 24)');
        await panel.scoreAllConcurrent(t.matchIdx, t.teamIdx, [8, 9, 7]);
        await delay(600);

        const team = await readMartialTeam(T, 0, 0);
        const scores = team.refereeMartial.slice(0, 3).map((r: any) => r.score);
        logInfo(`Bảng điểm giám định trên Firebase: ${scores.join(', ')}`);
        logInfo(`Điểm tổng đã ghi: ${team.finalScore}  |  tính lại từ bảng: ${computeFinalScore(team.refereeMartial, 3)}`);

        assertEqual(
          team.finalScore, 24,
          'Điểm tổng phải là 8+9+7 = 24.\n' +
          '      Mỗi giám định tự đọc-rồi-ghi finalScore trên máy riêng, nên nếu người bấm\n' +
          '      sau đọc phải ảnh chụp chưa có điểm của người khác thì sẽ ghi đè bằng con số\n' +
          '      thiếu. Case này canh đúng tình huống đó — đỏ nghĩa là đã xuất hiện lỗi.'
        );
      } finally {
        if (A) await A.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Thi Quyền — điểm tổng luôn khớp với bảng điểm giám định',
    group: 'thi-quyen',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let A: MartialArenaClient | null = null;
      try {
        const raw = Array.from({ length: 6 }, (_, i) => [i + 1, 'THẢO BỘ PHÁP', `VĐV ${i + 1}`, `DV${i + 1}`, 'VN']);
        await seedMartialFromRaw(raw, {
          tournamentIndex: T, tournamentName: 'E2E — khớp bảng điểm', numReferee: 5,
        });
        A = new MartialArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee: 5 });
        await A.connect();
        const panel = new MartialRefereePanel(T, 0, 5);

        logStep('6 lượt thi, mỗi lượt 5 giám định bấm cùng lúc');
        for (let turn = 1; turn <= 6; turn++) {
          await A.goTo(1, turn);
          const t = A.currentTurn()!;
          await panel.scoreAllConcurrent(t.matchIdx, t.teamIdx, [7, 8, 9, 8, 7]);
          await delay(300);
        }

        logStep('Đối chiếu điểm tổng với bảng điểm giám định của từng lượt');
        const martial = await readMartial(T);
        const wrong: string[] = [];
        for (let ti = 0; ti < martial[0].team.length; ti++) {
          const team: any = martial[0].team[ti];
          const expect = computeFinalScore(team.refereeMartial, 5);
          if (team.finalScore !== expect) {
            wrong.push(
              `lượt ${ti + 1}: đã ghi ${team.finalScore}, đúng ra phải là ${expect} ` +
              `(bảng: ${team.refereeMartial.slice(0, 5).map((r: any) => r.score).join(',')})`
            );
          }
        }
        for (const w of wrong) logInfo(w);
        assertEqual(
          wrong.length, 0,
          `${wrong.length}/6 lượt có điểm tổng KHÔNG khớp bảng điểm giám định hiển thị trên màn hình.\n` +
          '      Đây là kiểu sai nguy hiểm nhất: bảng điểm nhìn thì đúng, điểm tổng lại sai,\n' +
          '      nên trọng tài rất khó phát hiện tại chỗ. Giữ case này để canh hồi quy\n' +
          '      mỗi khi đụng vào submitMartialRefereeScore().'
        );
      } finally {
        if (A) await A.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Thi Quyền — Giám Sát ghi đè điểm tổng, giám định bấm sau xoá mất',
    group: 'thi-quyen',
    knownBug: 'martial-override-overwritten',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let A: MartialArenaClient | null = null;
      try {
        const raw = [[1, 'ĐỒNG DIỄN', 'Đội Một', 'DV1', 'VN']];
        await seedMartialFromRaw(raw, {
          tournamentIndex: T, tournamentName: 'E2E — ghi đè điểm', numReferee: 3,
        });
        A = new MartialArenaClient({ tournamentIndex: T, arenaIndex: 0, numReferee: 3 });
        await A.connect();
        const panel = new MartialRefereePanel(T, 0, 3);
        await A.goTo(1, 1);
        const t = A.currentTurn()!;

        logStep('2 giám định chấm 8 và 9');
        await panel.scoreAllSequential(t.matchIdx, t.teamIdx, [8, 9], 30);
        await delay(200);

        logStep('Giám Sát dùng "Lấy điểm chính" ghi đè điểm tổng = 26');
        A.overrideFinalScore(26);
        await delay(300);
        let team = await readMartialTeam(T, 0, 0);
        assertEqual(team.finalScore, 26, 'Ghi đè phải có hiệu lực ngay');
        logPass('Điểm tổng = 26, bảng giám định đã được reset về 0');

        logStep('Giám định thứ 3 bấm gửi ngay sau đó (chưa biết Giám Sát vừa ghi đè)');
        await panel.score(t.matchIdx, t.teamIdx, 2, 7);
        await delay(300);

        team = await readMartialTeam(T, 0, 0);
        logInfo(`Điểm tổng sau đó: ${team.finalScore}`);
        assertEqual(
          team.finalScore, 26,
          'Điểm Giám Sát ghi đè bằng tay phải được giữ.\n' +
          '      Thực tế: giám định bấm sau đọc bảng đã bị reset về 0, tính lại rồi ghi đè,\n' +
          '      xoá mất quyết định của Giám Sát mà không cảnh báo gì.'
        );
      } finally {
        if (A) await A.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Thi Quyền — 2 sân cùng chấm một lượt thi',
    group: 'thi-quyen',
    knownBug: 'martial-no-turn-lock-across-arenas',
    fn: async () => {
      let s: TqSetup | null = null;
      try {
        s = await setupTwoMartialArenas(3);

        logStep('Cả 2 sân cùng mở nội dung 1 lượt 1 (thao tác nhầm — hệ thống không ngăn)');
        await s.A.goTo(1, 1);
        await s.B.goTo(1, 1);
        const t = s.A.currentTurn()!;

        logStep('Tổ giám định sân A chấm 8, 8, 8 → tổng 24');
        await s.panelA.scoreAllSequential(t.matchIdx, t.teamIdx, [8, 8, 8], 20);
        await delay(250);
        let team = await readMartialTeam(s.T, t.matchIdx, t.teamIdx);
        assertEqual(team.finalScore, 24, 'Sân A chấm xong phải ra 24');

        logStep('Tổ giám định sân B cũng chấm cùng lượt đó: 5, 5, 5');
        await s.panelB.scoreAllSequential(t.matchIdx, t.teamIdx, [5, 5, 5], 20);
        await delay(250);
        team = await readMartialTeam(s.T, t.matchIdx, t.teamIdx);
        logInfo(`Điểm tổng cuối cùng: ${team.finalScore}`);

        assertTrue(
          false,
          'Hai sân chấm cùng một lượt thi ghi đè lên nhau, không có khoá và không có cảnh báo.\n' +
          `      Điểm cuối cùng là ${team.finalScore} (của sân bấm sau), điểm sân kia mất hẳn.\n` +
          '      Cần khoá lượt thi theo sân, hoặc ít nhất cảnh báo khi sân khác đang chấm.'
        );
      } finally {
        await teardownTq(s);
      }
    },
  },
];
