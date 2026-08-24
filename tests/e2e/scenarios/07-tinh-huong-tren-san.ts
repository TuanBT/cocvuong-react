/**
 * Scenario 07 — TÌNH HUỐNG TRÊN SÂN
 *
 * Những chuyện xảy ra thật trong một buổi thi đấu: cảnh cáo, đòn chân, cộng
 * trừ điểm tay, nhảy tới lui giữa các trận, chấm lại, 5 giám định, mất mạng
 * giữa trận, VĐV trùng tên.
 */
import { ArenaClient } from '../harness/arenaClient';
import { RefereePanel } from '../harness/refereeClient';
import { playMatch } from '../harness/matchRunner';
import { seedTournamentFromExcel, seedTournamentFromRaw, readCombat, readCombats, readArena } from '../harness/seed';
import { combatExcel, pickCategories } from '../harness/dataset';
import { tournamentIndexFor, wipeTournament, delay, getTestDb, readUntil } from '../harness/env';
import { setOnline, clearBrowserState } from '../harness/browserShim';
import { syncPendingWrites, getPendingWritesCount } from '../../../src/services/offlineService';
import {
  assertEqual, assertTrue, assertNotNull, assertNoPlaceholder,
  logStep, logPass, logInfo, logWarn, type TestCase,
} from '../harness/report';

const EXCEL = () => combatExcel();

/** Bảng đấu 4 VĐV dựng tay — dùng cho case cần kiểm soát chính xác tên VĐV */
function raw4(cat = '60kg nam'): any[][] {
  return [
    [1, cat, 'Nguyễn Văn A', 'DV1', 'VN'],
    [2, cat, 'Trần Văn B', 'DV2', 'VN'],
    [3, cat, 'Lê Văn C', 'DV3', 'VN'],
    [4, cat, 'Phạm Văn D', 'DV4', 'VN'],
  ];
}

async function oneArena(
  T: number, raw: any[][], numReferee: 3 | 5 = 3, name = 'E2E — tình huống'
): Promise<{ arena: ArenaClient; panel: RefereePanel; combats: any[] }> {
  const seeded = await seedTournamentFromRaw(raw, {
    tournamentIndex: T, tournamentName: name, numReferee,
  });
  const arena = new ArenaClient({
    tournamentIndex: T, arenaIndex: 0, numReferee, winCommitDelayMs: 30,
  });
  await arena.connect();
  return { arena, panel: new RefereePanel(T, 0, numReferee), combats: seeded.combats };
}

export const cases: TestCase[] = [

  {
    name: 'Cảnh cáo, nhắc nhở, y tế, ngã, ra biên — ghi nhận và reset khi lên trận sau',
    group: 'tinh-huong',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        const s = await oneArena(T, raw4());
        arena = s.arena;
        await arena.goToMatch(1);
        await arena.waitFor(() => arena!.match != null, 5000, 'trận 1');

        logStep('Trọng tài bấm đủ 5 loại lỗi cho giáp đỏ');
        arena.addCaution('red', 'remind');
        await delay(80);
        arena.addCaution('red', 'warning');
        await delay(80);
        arena.addCaution('red', 'medical');
        await delay(80);
        arena.addCaution('red', 'fall');
        await delay(80);
        arena.addCaution('red', 'fall');
        await delay(80);
        arena.addCaution('red', 'bound');
        await delay(250);

        let c = await readCombat(T, 0);
        assertNotNull(c, 'Trận 1 phải tồn tại');
        const cau = c.fighters.redFighter.caution;
        assertEqual(cau.remind, 1, 'Nhắc nhở = 1');
        assertEqual(cau.warning, 1, 'Cảnh cáo = 1');
        assertEqual(cau.medical, 1, 'Y tế = 1');
        assertEqual(cau.fall, 2, 'Ngã = 2 (bấm 2 lần)');
        assertEqual(cau.bound, 1, 'Ra biên = 1');
        logPass('Cả 5 loại lỗi ghi nhận đúng, bấm 2 lần thì cộng dồn');

        logStep('Đòn chân — bấm bật, bấm lại tắt');
        arena.toggleLegStrike('red');
        await delay(200);
        c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.legStrike, true, 'Bấm lần 1 → bật');
        arena.toggleLegStrike('red');
        await delay(200);
        c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.legStrike, false, 'Bấm lần 2 → tắt');
        arena.toggleLegStrike('red');
        await delay(200);
        logPass('Đòn chân bật/tắt đúng');

        logStep('Giáp đỏ thắng → lên chung kết, mọi lỗi phải được xoá sạch');
        await arena.declareWin('red');
        await delay(300);

        const ck = await readCombat(T, 2);
        assertNotNull(ck, 'Chung kết phải tồn tại');
        const winner =
          ck.fighters.redFighter.result === 'W.1' ? ck.fighters.redFighter : ck.fighters.blueFighter;
        assertEqual(winner.name, 'Nguyễn Văn A', 'VĐV thắng trận 1 vào chung kết');
        assertEqual(winner.caution.remind, 0, 'Nhắc nhở phải reset');
        assertEqual(winner.caution.warning, 0, 'Cảnh cáo phải reset');
        assertEqual(winner.caution.medical, 0, 'Y tế phải reset');
        assertEqual(winner.caution.fall, 0, 'Ngã phải reset');
        assertEqual(winner.caution.bound, 0, 'Ra biên phải reset');
        assertEqual(winner.legStrike, false, 'Đòn chân phải reset');
        assertEqual(winner.score, 0, 'Điểm phải reset');
        logPass('VĐV vào trận mới với lý lịch sạch');

        logStep('Trận cũ vẫn giữ nguyên lỗi để tra cứu sau');
        c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.caution.fall, 2, 'Trận 1 vẫn lưu ngã = 2');
        assertEqual(c!.fighters.redFighter.legStrike, true, 'Trận 1 vẫn lưu đòn chân');
        logPass('Biên bản trận cũ không bị xoá');
      } finally {
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Cộng / trừ điểm bằng tay, kể cả về âm',
    group: 'tinh-huong',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        const s = await oneArena(T, raw4());
        arena = s.arena;
        await arena.goToMatch(1);
        await arena.waitFor(() => arena!.match != null, 5000, 'trận 1');

        logStep('Giám sát cộng tay 3 điểm cho đỏ, 1 điểm cho xanh');
        arena.addScore('red', 1); await delay(60);
        arena.addScore('red', 1); await delay(60);
        arena.addScore('red', 1); await delay(60);
        arena.addScore('blue', 1); await delay(250);

        let c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.score, 3, 'Đỏ = 3');
        assertEqual(c!.fighters.blueFighter.score, 1, 'Xanh = 1');
        logPass('Cộng điểm tay đúng');

        logStep('Trừ điểm phạt: đỏ -1');
        arena.addScore('red', -1);
        await delay(250);
        c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.score, 2, 'Đỏ còn 2 sau khi bị trừ 1');
        logPass('Trừ điểm đúng');

        logStep('Trừ quá đà: xanh -3 từ mốc 1 → về âm');
        arena.addScore('blue', -3);
        await delay(250);
        c = await readCombat(T, 0);
        assertEqual(
          c!.fighters.blueFighter.score, -2,
          'Điểm âm được cho phép (dữ liệu giải thật cũng có trận điểm âm)'
        );
        logPass('Điểm âm ghi nhận đúng — đúng với hành vi app đang chạy');
      } finally {
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Giám sát nhảy tới / lui giữa các trận',
    group: 'tinh-huong',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        const s = await oneArena(T, raw4());
        arena = s.arena;

        logStep('Đi tuần tự 1 → 2 → 3');
        for (const no of [1, 2, 3]) {
          await arena.goToMatch(no);
          assertEqual(arena.matchNoCurrent, no, `Đang ở trận ${no}`);
          const a = await readUntil(() => readArena(T, 0), (v) => v?.lastMatch?.no === no);
          assertEqual(a!.lastMatch.no, no, `lastMatch trên Firebase = ${no}`);
        }
        logPass('Chuyển trận tới, lastMatch đồng bộ');

        logStep('Quay lui 3 → 2 → 1');
        for (const no of [2, 1]) {
          await arena.goToMatch(no);
          assertEqual(arena.matchNoCurrent, no, `Quay về trận ${no}`);
        }
        logPass('Quay lui được, không mất dữ liệu');

        logStep('Mỗi lần chuyển trận phải xoá bảng điểm giám định');
        await arena.goToMatch(2);
        s.panel.referees[0].score('red', 1);
        await delay(300);
        await arena.goToMatch(3);
        await delay(300);
        const a = await readUntil(
          () => readArena(T, 0),
          (v) => (v?.referee ?? []).every((r: any) => r?.redScore === 0 && r?.blueScore === 0)
        );
        const board = (a!.referee ?? []).map((r: any) => `${r?.redScore ?? '?'}/${r?.blueScore ?? '?'}`);
        assertEqual(
          board.filter((x) => x !== '0/0').length, 0,
          `Sang trận mới thì bảng điểm giám định phải sạch, thực tế: [${board.join(' ')}]`
        );
        logPass(`Bảng giám định được xoá khi sang trận mới (${board.length} ô, tất cả 0/0)`);

        logStep('Nhảy thẳng tới trận cuối rồi về trận đầu');
        await arena.goToMatch(s.combats.length);
        assertEqual(arena.matchNoCurrent, s.combats.length, 'Ở trận cuối');
        await arena.goToMatch(1);
        assertEqual(arena.matchNoCurrent, 1, 'Về trận 1');
        const c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.name, 'Nguyễn Văn A', 'Dữ liệu trận 1 còn nguyên');
        logPass('Nhảy trận tuỳ ý không làm hỏng dữ liệu');
      } finally {
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: '5 giám định — dưới quá bán thì không lên điểm',
    group: 'tinh-huong',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        const s = await oneArena(T, raw4(), 5, 'E2E — 5 giám định');
        arena = s.arena;
        await arena.goToMatch(1);
        await arena.waitFor(() => arena!.match != null, 5000, 'trận 1');

        logStep('1/5 giám định chấm');
        s.panel.referees[0].score('red', 1);
        await delay(700);
        let c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.score, 0, '1/5 chưa đủ quá bán nên không lên điểm');

        logStep('2/5 giám định chấm');
        await s.panel.clearAll();
        await delay(300);
        s.panel.referees[0].score('red', 1);
        s.panel.referees[1].score('red', 1);
        await delay(700);
        c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.score, 0, '2/5 chưa đủ quá bán nên không lên điểm');
        logPass('Dưới quá bán (1/5 và 2/5) đều không lên điểm — đúng luật');
      } finally {
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: '5 giám định — quá bán (3 người) bấm cùng nhịp phải lên điểm',
    group: 'tinh-huong',
    knownBug: 'five-referee-never-scores',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let a3: ArenaClient | null = null;
      let a5: ArenaClient | null = null;
      try {
        logInfo('Thiết đặt cho phép chọn 3 hoặc 5 giám định. So sánh hai cấu hình cùng một kịch bản.');

        logStep('Đối chứng — 3 giám định: quá bán là 2 người, bấm cùng nhịp +1');
        const s3 = await oneArena(T, raw4(), 3, 'E2E — 3 GĐ');
        a3 = s3.arena;
        await a3.goToMatch(1);
        await a3.waitFor(() => a3!.match != null, 5000, 'trận 1');
        await s3.panel.voteTogether('red', 1);
        await delay(1000);
        const c3 = await readCombat(T, 0);
        logInfo(`3 giám định → điểm đỏ = ${c3!.fighters.redFighter.score}`);
        assertEqual(c3!.fighters.redFighter.score, 1, 'Cấu hình 3 giám định phải lên điểm');
        logPass('3 giám định: quá bán bấm cùng nhịp → lên 1 điểm');
        await a3.disconnect(); a3 = null;
        await wipeTournament(T);

        logStep('5 giám định: quá bán là 3 người, bấm cùng nhịp +1');
        const s5 = await oneArena(T, raw4(), 5, 'E2E — 5 GĐ');
        a5 = s5.arena;
        await a5.goToMatch(1);
        await a5.waitFor(() => a5!.match != null, 5000, 'trận 1');
        await s5.panel.voteTogether('red', 1);
        await delay(1000);
        const c5 = await readCombat(T, 0);
        logInfo(`5 giám định → điểm đỏ = ${c5!.fighters.redFighter.score}`);
        logInfo(`nhật ký chốt điểm: ${a5.log.filter((l) => l.includes('chốt')).join(' | ') || '(không chốt lần nào)'}`);

        assertEqual(
          c5!.fighters.redFighter.score, 1,
          'Cấu hình 5 giám định cũng phải lên điểm khi 3 người chấm — nhưng thực tế KHÔNG.\n' +
          '      Cơ chế: makeScoreTimer() trừ scoreTimerCount MỘT LẦN CHO MỖI giám định đang có điểm,\n' +
          '      và subscribeScoreForGiamSat() lại gọi makeScoreTimer một lần cho mỗi giám định\n' +
          '      trên mỗi snapshot. Với 5 giám định, tới lượt gọi thứ 2 thì TIME_SCORE = 3 đã bị\n' +
          '      trừ hết → chốt non với getModes([1,1,0,0,0]) = 0 (số 0 chiếm đa số) rồi XOÁ bảng,\n' +
          '      nên điểm của người thứ 3 rơi vào bảng đã trắng.\n' +
          '      Với 3 giám định thì quorum (2 > 1.5) kịp đạt trước khi bộ đếm về 0 nên vẫn chạy.\n' +
          '      Hệ quả: chế độ 5 giám định gần như không ghi được điểm nào.'
        );
      } finally {
        if (a3) await a3.disconnect();
        if (a5) await a5.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Mất mạng giữa trận — thao tác vào hàng đợi, có mạng lại thì đồng bộ',
    group: 'tinh-huong',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        clearBrowserState();
        const s = await oneArena(T, raw4());
        arena = s.arena;
        await arena.goToMatch(1);
        await arena.waitFor(() => arena!.match != null, 5000, 'trận 1');

        logStep('Đang thi thì rớt mạng');
        setOnline(false);
        const before = getPendingWritesCount();

        arena.addScore('red', 1);
        arena.addCaution('blue', 'warning');
        arena.toggleLegStrike('red');
        await delay(200);

        const queued = getPendingWritesCount() - before;
        logInfo(`${queued} thao tác được xếp vào hàng đợi offline`);
        assertTrue(queued >= 3, `Khi mất mạng, thao tác phải vào hàng đợi (thực tế ${queued})`);

        const cOffline = await readCombat(T, 0);
        assertEqual(cOffline!.fighters.redFighter.score, 0, 'Firebase chưa nhận gì khi đang mất mạng');
        logPass('Mất mạng: thao tác không mất, xếp hàng chờ');

        logStep('Có mạng lại → đồng bộ hàng đợi');
        setOnline(true);
        const { success, failed } = await syncPendingWrites(getTestDb());
        await delay(400);
        logInfo(`Đồng bộ: ${success} thành công, ${failed} thất bại`);
        assertEqual(failed, 0, 'Không được có thao tác nào đồng bộ thất bại');

        const cOnline = await readCombat(T, 0);
        assertEqual(cOnline!.fighters.redFighter.score, 1, 'Điểm cộng lúc offline đã lên Firebase');
        assertEqual(cOnline!.fighters.blueFighter.caution.warning, 1, 'Cảnh cáo lúc offline đã lên Firebase');
        assertEqual(cOnline!.fighters.redFighter.legStrike, true, 'Đòn chân lúc offline đã lên Firebase');
        assertEqual(getPendingWritesCount(), 0, 'Hàng đợi phải rỗng sau khi đồng bộ');
        logPass('Có mạng lại: mọi thao tác được ghi đủ, không mất gì');
      } finally {
        setOnline(true);
        clearBrowserState();
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'VĐV trùng tên ở hạng cân khác nhau vẫn phân biệt được',
    group: 'tinh-huong',
    fn: async () => {
      const T = tournamentIndexFor(0);
      try {
        const raw = [
          [1, '48kg nữ', 'Nguyễn Thị Anh Thư', 'SS190379', 'VN'],
          [2, '48kg nữ', 'Trần Thị B', 'SS190380', 'VN'],
          [1, '51kg nữ', 'Nguyễn Thị Anh Thư', 'SE210202', 'VN'],
          [2, '51kg nữ', 'Lê Thị C', 'SE210203', 'VN'],
        ];
        const seeded = await seedTournamentFromRaw(raw, {
          tournamentIndex: T, tournamentName: 'E2E — trùng tên', numReferee: 3,
        });
        logInfo('Hai VĐV khác nhau, cùng tên "Nguyễn Thị Anh Thư", khác hạng cân và khác mã');

        assertEqual(seeded.combats.length, 2, '2 hạng cân × 2 VĐV → 2 trận chung kết');

        const byCat = new Map(seeded.combats.map((c) => [c.match.category, c]));
        const m48 = byCat.get('48kg nữ');
        const m51 = byCat.get('51kg nữ');
        assertNotNull(m48, 'Phải có trận 48kg nữ');
        assertNotNull(m51, 'Phải có trận 51kg nữ');

        const find = (m: any, name: string) =>
          [m.fighters.redFighter, m.fighters.blueFighter].find((f: any) => f.name === name);
        const a = find(m48, 'Nguyễn Thị Anh Thư');
        const b = find(m51, 'Nguyễn Thị Anh Thư');
        assertNotNull(a, 'VĐV trùng tên phải có ở 48kg nữ');
        assertNotNull(b, 'VĐV trùng tên phải có ở 51kg nữ');
        assertEqual(a.code, 'SS190379', 'Mã VĐV 48kg nữ phải đúng');
        assertEqual(b.code, 'SE210202', 'Mã VĐV 51kg nữ phải đúng');
        assertTrue(a.code !== b.code, 'Hai người trùng tên phải giữ được mã riêng');
        logPass('Trùng tên vẫn phân biệt được nhờ mã đơn vị');
      } finally {
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Chấm lại một trận đã dùng kết quả — bị chặn',
    group: 'tinh-huong',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        const s = await oneArena(T, raw4());
        arena = s.arena;

        logStep('Chạy trận 1 và trận 2 — chung kết đã có đủ 2 VĐV');
        await playMatch(arena, s.panel, 1, { rounds: 1, redShare: 1, gapMs: 15 });
        await delay(150);
        await playMatch(arena, s.panel, 2, { rounds: 1, redShare: 1, gapMs: 15 });
        await delay(250);

        const ck = await readCombat(T, 2);
        assertNoPlaceholder(ck!.fighters.redFighter.name, 'Chung kết ô đỏ');
        assertNoPlaceholder(ck!.fighters.blueFighter.name, 'Chung kết ô xanh');
        logPass('Chung kết đã có đủ VĐV — kết quả trận 1 và 2 ĐÃ ĐƯỢC DÙNG');

        logStep('Quay lại trận 1 và đổi kết quả sang giáp xanh thắng');
        await arena.goToMatch(1);
        await arena.waitFor(() => arena!.match != null, 5000, 'trận 1');
        const ok = await arena.declareWin('blue');
        await delay(300);

        assertEqual(
          ok, false,
          'Phải hiện "Bạn không thể chấm lại trận đấu này!" vì kết quả trận 1 đã được dùng ở chung kết.'
        );
        logPass('Guard chặn đúng với bảng 4 VĐV');
        logInfo('Lưu ý: ở bảng 4 VĐV guard chặn đúng chỉ do TRÙNG HỢP số học —');
        logInfo('nó so "W."+j với j là INDEX mảng thay vì SỐ TRẬN. Bằng chứng của lỗi này');
        logInfo('nằm ở case "Guard \"không thể chấm lại\" dùng index thay vì số trận" (nhóm song-song).');
      } finally {
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Trận xử thắng ngay (bỏ cuộc / chấn thương) — 0-0 vẫn đi tiếp được',
    group: 'tinh-huong',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        const s = await oneArena(T, raw4());
        arena = s.arena;

        logStep('VĐV xanh bỏ cuộc — giám sát xử đỏ thắng, không ai ghi điểm');
        await arena.goToMatch(1);
        await arena.waitFor(() => arena!.match != null, 5000, 'trận 1');
        const ok = await arena.declareWin('red');
        await delay(300);
        assertTrue(ok, 'Xử thắng phải thành công');

        const c = await readCombat(T, 0);
        assertEqual(c!.match.win, 'red', 'Trận 1 kết quả đỏ thắng');
        assertEqual(c!.fighters.redFighter.score, 0, 'Điểm vẫn 0-0');
        assertEqual(c!.fighters.blueFighter.score, 0, 'Điểm vẫn 0-0');

        const ck = await readCombat(T, 2);
        const w = ck!.fighters.redFighter.result === 'W.1' ? ck!.fighters.redFighter : ck!.fighters.blueFighter;
        assertEqual(w.name, 'Nguyễn Văn A', 'VĐV được xử thắng vẫn vào chung kết');
        logPass('Xử thắng 0-0 vẫn đẩy VĐV lên trận sau bình thường');
      } finally {
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Giám định đổi ý — chấm lại giá trị khác trước khi chốt',
    group: 'tinh-huong',
    fn: async () => {
      const T = tournamentIndexFor(0);
      let arena: ArenaClient | null = null;
      try {
        const s = await oneArena(T, raw4());
        arena = s.arena;
        await arena.goToMatch(1);
        await arena.waitFor(() => arena!.match != null, 5000, 'trận 1');

        logStep('Giám định 0 bấm +1 rồi đổi thành +2 — không được cộng dồn thành 3');
        s.panel.referees[0].score('red', 1);
        await delay(150);
        s.panel.referees[0].score('red', 2);
        await delay(400);
        let c0 = await readCombat(T, 0);
        assertEqual(
          c0!.fighters.redFighter.score, 0,
          'Một giám định bấm một mình, dù đổi ý, cũng không được lên điểm'
        );
        logPass('Đổi ý khi chưa quá bán → không lên điểm, không cộng dồn');
        logInfo('Không kiểm tra ô điểm trên Firebase ở bước này: bug score-window-collapsed');
        logInfo('làm bảng giám định bị xoá ngay sau mỗi lần bấm, nên giá trị trung gian không ổn định.');

        logStep('Cả tổ chấm +2 cùng nhịp → cộng đúng 2 điểm');
        await s.panel.clearAll();
        await delay(300);
        await s.panel.voteTogether('red', 2);
        await delay(900);
        const c = await readCombat(T, 0);
        assertEqual(c!.fighters.redFighter.score, 2, 'Điểm cộng đúng mức 2, không phải 1 hay 3');
        logPass('Mức điểm được lấy theo số đông (getModes), không cộng dồn nhầm');
      } finally {
        if (arena) await arena.disconnect();
        await wipeTournament(T);
      }
    },
  },
];
