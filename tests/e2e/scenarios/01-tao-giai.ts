/**
 * Scenario 01 — Tạo giải từ file Excel thô, chạy qua đúng code của app
 *
 * Kiểm tra khâu đầu tiên: file .xlsx → sắp lịch → ghi Firebase → xuất file chuẩn.
 * Nếu khâu này sai thì mọi test phía sau đều vô nghĩa.
 */
import {
  seedTournamentFromExcel,
  readRawExcel,
  readCombats,
  readArena,
  writeStandardExcel,
  categoryCounts,
  filterCategories,
  findCrossFedMatch,
} from '../harness/seed';
import { buildCombatSchedule, toStandardRows } from '../../../src/utils/scheduleBuilder';
import { tournamentIndexFor, wipeTournament } from '../harness/env';
import {
  assertEqual, assertDeepEqual, assertTrue, assertNotNull, assertNoPlaceholder,
  logStep, logPass, logInfo, type TestCase,
} from '../harness/report';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { combatExcel } from '../harness/dataset';

const EXCEL = () => combatExcel();
const OUT_DIR = 'tests/e2e/.out';

/** Mọi tham chiếu W.x / L.x phải trỏ về một trận có thật và ĐỨNG TRƯỚC trận hiện tại */
function assertBracketConsistent(matchs: any[]): void {
  const numbers = matchs.map((m) => m.match);
  for (let i = 0; i < matchs.length; i++) {
    assertEqual(numbers[i], i + 1, `Trận thứ ${i} phải mang số ${i + 1} (số trận phải liên tục 1..N)`);
  }
  for (const m of matchs) {
    for (const side of ['redFighter', 'blueFighter'] as const) {
      const res = String(m[side].result);
      const mt = res.match(/^([WL])\.(\d+)$/);
      if (mt) {
        const feeder = Number(mt[2]);
        assertTrue(
          feeder >= 1 && feeder <= matchs.length,
          `Trận ${m.match} tham chiếu ${res} nhưng giải chỉ có ${matchs.length} trận`
        );
        assertTrue(
          feeder < m.match,
          `Trận ${m.match} tham chiếu ${res} — trận nguồn phải diễn ra TRƯỚC (nếu không sẽ kẹt vĩnh viễn)`
        );
      }
    }
  }
}

/**
 * Mỗi VĐV chỉ được xuất hiện ở đúng 1 trận vòng đầu.
 * Khoá theo tên+code vì có VĐV TRÙNG TÊN ở hạng cân khác nhau (dữ liệu thật).
 */
function assertEachFighterSeededOnce(raw: any[][], matchs: any[]): void {
  const key = (name: string, code: string) => `${name}|${code}`;
  const seeded = new Map<string, number>();
  for (const m of matchs) {
    for (const side of ['redFighter', 'blueFighter'] as const) {
      const name = String(m[side].name);
      if (/^[WL]\.\d+$/.test(name)) continue;
      const k = key(name, String(m[side].code));
      seeded.set(k, (seeded.get(k) ?? 0) + 1);
    }
  }
  for (const row of raw) {
    const k = key(String(row[2]), String(row[3]));
    const n = seeded.get(k) ?? 0;
    assertEqual(n, 1, `VĐV "${row[2]}" (${row[3]}) phải xuất hiện đúng 1 lần ở vòng đầu, thực tế ${n}`);
  }
  assertEqual(seeded.size, raw.length, `Số VĐV được xếp lịch (${seeded.size}) phải bằng số VĐV trong file (${raw.length})`);
}

export const cases: TestCase[] = [
  {
    name: 'Sắp lịch từ file Excel thô — cấu trúc nhánh đấu hợp lệ',
    group: 'tao-giai',
    fn: async () => {
      logStep(`Đọc ${EXCEL()}`);
      const raw = readRawExcel(EXCEL());
      assertTrue(raw.length > 0, 'File Excel phải có dữ liệu VĐV');

      const counts = categoryCounts(raw);
      logInfo(`${raw.length} VĐV / ${counts.size} hạng cân: ` +
        [...counts.entries()].map(([k, v]) => `${k}(${v})`).join(', '));

      logStep('Sắp lịch bằng src/utils/scheduleBuilder.ts (code app đang dùng)');
      const matchs = buildCombatSchedule(JSON.parse(JSON.stringify(raw)));
      logInfo(`Sinh ra ${matchs.length} trận`);

      assertBracketConsistent(matchs);
      logPass('Số trận liên tục 1..N, mọi W.x/L.x trỏ về trận đứng trước');

      assertEachFighterSeededOnce(raw, matchs);
      logPass(`Cả ${raw.length} VĐV đều được xếp đúng 1 lần ở vòng đầu`);

      // Mỗi hạng cân phải có đúng 1 Chung Kết
      const finalsByCat = new Map<string, number>();
      for (const m of matchs) {
        if (m.type === 'Chung Kết') {
          finalsByCat.set(String(m.weight), (finalsByCat.get(String(m.weight)) ?? 0) + 1);
        }
      }
      for (const [cat] of counts) {
        assertEqual(finalsByCat.get(cat) ?? 0, 1, `Hạng cân "${cat}" phải có đúng 1 trận Chung Kết`);
      }
      logPass(`Cả ${counts.size} hạng cân đều có đúng 1 Chung Kết`);
    },
  },


  {
    name: 'Tham chiếu W.x/L.x phải trỏ đúng trận trong CÙNG hạng cân',
    group: 'tao-giai',
    fn: async () => {
      logStep('Sắp lịch cả 12 hạng cân từ file Excel');
      const raw = readRawExcel(EXCEL());
      const matchs = buildCombatSchedule(JSON.parse(JSON.stringify(raw)));
      const byNo = new Map(matchs.map((m) => [m.match, m]));

      logStep('Đối chiếu `name` và `result` của từng ô placeholder');
      logInfo('replaceFighter() dò theo `result`, còn màn hình hiển thị `name` — hai giá trị này phải luôn khớp.');

      const mismatched: string[] = [];
      const crossCategory: string[] = [];

      for (const m of matchs) {
        for (const side of ['redFighter', 'blueFighter'] as const) {
          const name = String(m[side].name);
          const result = String(m[side].result);
          const isPh = /^[WL]\.\d+$/.test(name) || /^[WL]\.\d+$/.test(result);
          if (!isPh) continue;

          const label = `trận ${m.match} [${m.weight}/${m.type}] ô ${side === 'redFighter' ? 'đỏ' : 'xanh'}`;
          if (name !== result) {
            mismatched.push(`${label}: name="${name}" nhưng result="${result}"`);
          }
          const mt = result.match(/^[WL]\.(\d+)$/);
          if (mt) {
            const feeder = byNo.get(Number(mt[1]));
            if (feeder && String(feeder.weight) !== String(m.weight)) {
              crossCategory.push(`${label}: result="${result}" → trận ${mt[1]} thuộc hạng cân "${feeder.weight}"`);
            }
          }
        }
      }

      for (const x of [...crossCategory, ...mismatched].slice(0, 6)) logInfo(x);

      assertEqual(
        crossCategory.length, 0,
        'Không ô nào được tham chiếu sang hạng cân khác.\n' +
        '      Nếu đỏ: changeMatchNumber() trong scheduleBuilder lại quên dịch `result` cùng với `name`.\n' +
        '      Hậu quả khi thi đấu: VĐV thắng bị điền vào chung kết của hạng cân KHÁC,\n' +
        '      còn chung kết đúng thì không bao giờ nhận được VĐV và giải không chạy hết được.'
      );

      assertEqual(mismatched.length, 0, '`name` và `result` của mỗi ô placeholder phải luôn khớp nhau');
      logPass(`Cả ${matchs.length} trận: mọi tham chiếu W.x/L.x đều trỏ đúng trận trong cùng hạng cân`);
    },
  },

  {
    name: 'Tạo giải lên Firebase — đọc lại khớp 100%',
    group: 'tao-giai',
    fn: async () => {
      const T = tournamentIndexFor(0);
      try {
        logStep(`Ghi giải vào tournament/${T}`);
        const seeded = await seedTournamentFromExcel(EXCEL(), {
          tournamentIndex: T,
          tournamentName: 'E2E — Tạo giải',
          numReferee: 3,
        });
        logInfo(`${seeded.combats.length} trận, 3 giám định, 2 sân`);

        logStep('Đọc lại từ Firebase và đối chiếu');
        const back = await readCombats(T);
        assertEqual(back.length, seeded.combats.length, 'Số trận đọc lại phải khớp');
        assertDeepEqual(
          back,
          seeded.combats,
          'Dữ liệu trận đọc lại phải giống hệt lúc ghi (không bị Firebase đổi kiểu)'
        );
        logPass('Toàn bộ danh sách trận khớp byte-for-byte');

        logStep('Kiểm tra 2 sân đã được tạo');
        for (const [i, name] of [[0, 'Sân A'], [1, 'Sân B']] as const) {
          const arena = await readArena(T, i as number);
          assertNotNull(arena, `Sân index ${i} phải tồn tại`);
          assertEqual(arena.combatArenaName, name, `Tên sân ${i}`);
          assertEqual(arena.lastMatch.no, 1, `Sân ${name} phải bắt đầu ở trận 1`);
          assertEqual(arena.referee.length, 3, `Sân ${name} phải có 3 ô giám định`);
          assertTrue(
            arena.referee.every((r) => r.redScore === 0 && r.blueScore === 0),
            `Bảng điểm giám định sân ${name} phải bằng 0`
          );
        }
        logPass('Sân A và Sân B khởi tạo đúng, độc lập nhau');

        logStep('Kiểm tra có trận được "nuôi" bởi 2 trận khác nhau (điểm nóng chạy song song)');
        const cross = findCrossFedMatch(seeded.combats);
        assertTrue(cross >= 0, 'Giải phải có ít nhất 1 trận nhận VĐV từ 2 trận khác nhau');
        const cm = seeded.combats[cross];
        logPass(
          `Trận ${cm.match.no} (${cm.match.category} — ${cm.match.type}): ` +
          `đỏ=${cm.fighters.redFighter.result}, xanh=${cm.fighters.blueFighter.result}`
        );
      } finally {
        await wipeTournament(T);
      }
    },
  },

  {
    name: 'Xuất file chuẩn rồi đọc lại — không mất dữ liệu',
    group: 'tao-giai',
    fn: async () => {
      const raw = readRawExcel(EXCEL());
      const matchs = buildCombatSchedule(JSON.parse(JSON.stringify(raw)));
      const rows = toStandardRows(matchs);

      logStep('Xuất ra file .xlsx chuẩn');
      const out = path.join(OUT_DIR, 'lich-thi-dau.xlsx');
      writeStandardExcel(matchs, out);
      assertTrue(fs.existsSync(out), `Phải tạo được file ${out}`);
      logInfo(`Đã ghi ${out} (${fs.statSync(out).size} bytes)`);

      logStep('Đọc lại file vừa xuất');
      const wb = XLSX.readFile(out);
      const back = XLSX.utils.sheet_to_json(wb.Sheets['data'], { header: 1 }) as any[][];

      assertEqual(back.length - 1, rows.length, 'Số dòng dữ liệu đọc lại phải bằng số trận');
      for (let i = 0; i < rows.length; i++) {
        const expected = rows[i].map((v) => String(v));
        const actual = (back[i + 1] ?? []).map((v) => String(v ?? ''));
        assertEqual(actual.join('|'), expected.join('|'), `Dòng trận ${i + 1} phải khớp sau khi xuất/nhập`);
      }
      logPass(`${rows.length} trận đi qua xuất → nhập không mất dữ liệu`);

      fs.rmSync(OUT_DIR, { recursive: true, force: true });
    },
  },
];
