#!/usr/bin/env npx tsx
/**
 * E2E Runner — Cóc Vương
 *
 *   npx tsx tests/e2e/run.ts                     # emulator (mặc định)
 *   npx tsx tests/e2e/run.ts --live              # DB dev thật
 *   npx tsx tests/e2e/run.ts --only=song-song    # chỉ chạy 1 nhóm
 *   npx tsx tests/e2e/run.ts --seed=12345        # đổi seed cho soak
 *
 *   --keep     giữ lại giải trên Firebase sau khi chạy, để mở app xem tận mắt
 *              (xoá sau bằng `npm run test:e2e:clean`)
 *
 * Dữ liệu đầu vào (không truyền thì dùng file mẫu trong tests/e2e/):
 *   --file=vdv.xlsx        tự nhận biết Đối Kháng hay Thi Quyền
 *   --dk=doikhang.xlsx     chỉ định riêng file Đối Kháng
 *   --tq=thiquyen.xlsx     chỉ định riêng file Thi Quyền
 *
 * Nhóm: tao-giai | mot-san | song-song | soak | thi-quyen | het-data | tinh-huong
 */
import './harness/browserShim';

import {
  initTestDb, allocateSlots, closeTestDb, wipeAllSlots, getMode,
  setKeepData, isKeepData, getKeptSlots,
  EMULATOR_HOST, EMULATOR_PORT, SLOT_COUNT,
} from './harness/env';
import { runCase, printSummary, logSuite, logInfo, logWarn, type TestCase, type CaseResult } from './harness/report';

import { resolveDataset, describeDataset } from './harness/dataset';

import { cases as taoGiai } from './scenarios/01-tao-giai';
import { cases as motSan } from './scenarios/02-mot-san';
import { cases as songSong } from './scenarios/03-hai-san-song-song';
import { cases as soak } from './scenarios/04-soak';
import { cases as thiQuyen } from './scenarios/05-thi-quyen';
import { cases as hetData } from './scenarios/06-chay-het-data';
import { cases as tinhHuong } from './scenarios/07-tinh-huong-tren-san';

const SUITES: { title: string; cases: TestCase[] }[] = [
  { title: '01 · Tạo giải từ file Excel', cases: taoGiai },
  { title: '02 · Đối kháng — một sân (baseline)', cases: motSan },
  { title: '03 · ĐỐI KHÁNG — HAI SÂN SONG SONG', cases: songSong },
  { title: '04 · Soak — 2 sân giành nhau', cases: soak },
  { title: '05 · THI QUYỀN', cases: thiQuyen },
  { title: '06 · Chạy hết bộ data', cases: hetData },
  { title: '07 · Tình huống trên sân', cases: tinhHuong },
];

async function main() {
  const argv = process.argv.slice(2);
  const live = argv.includes('--live');
  const keep = argv.includes('--keep');
  const only = argv.filter((a) => a.startsWith('--only=')).map((a) => a.slice(7));
  const mode = live ? 'live' : 'emulator';
  setKeepData(keep);

  console.log(`\n🥋 Cóc Vương — E2E`);
  console.log(`   chế độ: ${mode}${live ? ' (Firebase dev thật)' : ` (emulator ${EMULATOR_HOST}:${EMULATOR_PORT})`}`);

  try {
    resolveDataset();
    for (const l of describeDataset()) console.log(`   ${l}`);
  } catch (err: any) {
    console.error(`\n❌ ${err.message}\n`);
    process.exit(1);
  }

  initTestDb(mode);

  try {
    const { base, existing } = await allocateSlots();
    if (live) {
      console.log(`   giải đang có trên DB dev:`);
      for (const e of existing) console.log(`      ${e}`);
      console.log(
        `   test sẽ dùng slot ${base}..${base + SLOT_COUNT - 1}` +
        (keep ? ' và GIỮ LẠI dữ liệu (--keep)' : ' rồi xoá sạch sau khi chạy')
      );
    }
  } catch (err: any) {
    console.error(`\n❌ ${err.message}\n`);
    await closeTestDb();
    process.exit(1);
  }

  const results: CaseResult[] = [];
  for (const suite of SUITES) {
    const picked = only.length ? suite.cases.filter((c) => only.includes(c.group)) : suite.cases;
    if (!picked.length) continue;
    logSuite(suite.title);
    for (const tc of picked) {
      results.push(await runCase(tc));
    }
  }

  if (!results.length) {
    console.error(`\n❌ Không có test nào khớp --only=${only.join(',')}`);
    console.error(`   Nhóm hợp lệ: ${[...new Set(SUITES.flatMap((s) => s.cases.map((c) => c.group)))].join(', ')}\n`);
    await closeTestDb();
    process.exit(1);
  }

  if (isKeepData()) {
    const kept = getKeptSlots();
    if (kept.length) {
      console.log(`\n📌 Giữ lại dữ liệu để kiểm tra tay: ${kept.map((i) => `tournament/${i}`).join(', ')}`);
      console.log(`   Mở app, chọn giải tương ứng để xem. Xoá khi xong bằng:`);
      console.log(`   npm run test:e2e:clean${live ? ':live' : ''}`);
    }
  } else {
    // Dọn dẹp phòng khi có case thoát giữa chừng
    try {
      await wipeAllSlots();
    } catch (err: any) {
      logWarn(`Dọn dẹp không trọn vẹn: ${err.message}`);
    }
  }

  const code = printSummary(results, getMode());
  await closeTestDb();
  process.exit(code);
}

main().catch(async (err) => {
  console.error('\n💥 Lỗi không bắt được:', err);
  try { await closeTestDb(); } catch {}
  process.exit(1);
});
