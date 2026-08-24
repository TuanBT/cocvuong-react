#!/usr/bin/env npx tsx
/**
 * Dọn dữ liệu test còn sót trên Firebase.
 *
 *   npx tsx tests/e2e/clean.ts          # emulator
 *   npx tsx tests/e2e/clean.ts --live   # DB dev thật
 *
 * CHỈ xoá những giải có tên bắt đầu bằng "E2E" — giải thật không bị đụng tới.
 * Dùng sau khi chạy test với --keep và đã kiểm tra tay xong.
 */
import './harness/browserShim';

import { ref, get, remove } from 'firebase/database';
import { initTestDb, getTestDb, closeTestDb } from './harness/env';

const PREFIX = 'E2E';

async function main() {
  const live = process.argv.includes('--live');
  const dryRun = process.argv.includes('--dry-run');

  console.log(`\n🧹 Dọn dữ liệu test — ${live ? 'DB dev thật' : 'emulator'}${dryRun ? ' (chỉ xem, không xoá)' : ''}`);
  initTestDb(live ? 'live' : 'emulator');

  const snap = await get(ref(getTestDb(), 'tournament'));
  const val = snap.val();
  if (!val) {
    console.log('   Không có giải nào trên DB.\n');
    await closeTestDb();
    return;
  }

  const keys = Object.keys(val).sort((a, b) => Number(a) - Number(b));
  let removed = 0;

  for (const k of keys) {
    const name = String(val[k]?.setting?.tournamentName ?? '(không tên)');
    const flat = name.replace(/\n/g, ' ');
    if (name.startsWith(PREFIX)) {
      if (dryRun) {
        console.log(`   [sẽ xoá] tournament/${k} — "${flat}"`);
      } else {
        await remove(ref(getTestDb(), `tournament/${k}`));
        console.log(`   ✗ đã xoá tournament/${k} — "${flat}"`);
      }
      removed++;
    } else {
      console.log(`   · giữ    tournament/${k} — "${flat}"`);
    }
  }

  console.log(
    removed === 0
      ? '\n   Không có giải test nào cần xoá.\n'
      : `\n   ${dryRun ? 'Sẽ xoá' : 'Đã xoá'} ${removed} giải test.\n`
  );
  await closeTestDb();
}

main().catch(async (err) => {
  console.error('\n💥 Lỗi:', err?.message ?? err);
  try { await closeTestDb(); } catch { /* ignore */ }
  process.exit(1);
});
