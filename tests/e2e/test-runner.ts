#!/usr/bin/env npx tsx
/**
 * E2E Test Runner — Cóc Vương Combat System
 * 
 * Chạy: npx tsx test-runner.ts [--scenario=<name>]
 * 
 * Scenarios:
 *   score      — Test chấm điểm 3 & 5 giám định
 *   replace    — Test replaceFighter + caution reset
 *   arena      — Test xung đột 2 sân
 *   race       — Test race condition
 *   sync       — Test lastMatch sync
 *   full-small — Giải nhỏ: 45kg nữ (4 VĐV, 3 trận)
 *   full-large — Giải lớn: 64kg nam (13 VĐV, 12 trận)
 *   full-multi — Giải đa hạng: 4 hạng cân (~22 trận)
 *   parallel   — 2 giải chạy song song
 *   edge       — Edge cases: 5 GĐ, caution, legStrike
 *   (empty)    — Chạy tất cả
 */

import {
  initFirebase,
  cleanupTestTournament,
  logSummary,
  delay,
} from './setup';

import {
  scenario1_ThreeRefereeScoring,
  scenario2_FiveRefereeScoring,
  scenario3_ReplaceFighterAndCautionReset,
  scenario4_TwoArenaConflict,
  scenario5_RaceCondition,
  scenario6_LastMatchSync,
} from './test-scenarios';

import {
  scenario7_SmallCategory,
  scenario8_LargeCategory,
  scenario9_MultiCategory,
  scenario10_ParallelTournaments,
  scenario11_EdgeCases,
} from './full-tournament';

interface ScenarioEntry {
  name: string;
  key: string;
  fn: () => Promise<boolean>;
}

const ALL_SCENARIOS: ScenarioEntry[] = [
  // Original scenarios (1-6)
  { name: '3 Giám Định chấm điểm', key: 'score', fn: scenario1_ThreeRefereeScoring },
  { name: '5 Giám Định chấm điểm', key: 'score', fn: scenario2_FiveRefereeScoring },
  { name: 'replaceFighter + caution reset', key: 'replace', fn: scenario3_ReplaceFighterAndCautionReset },
  { name: 'Xung đột 2 sân', key: 'arena', fn: scenario4_TwoArenaConflict },
  { name: 'Race condition', key: 'race', fn: scenario5_RaceCondition },
  { name: 'lastMatch sync', key: 'sync', fn: scenario6_LastMatchSync },
  // Full tournament scenarios (7-11)
  { name: 'Giải nhỏ — 45kg nữ (4 VĐV)', key: 'full-small', fn: scenario7_SmallCategory },
  { name: 'Giải lớn — 64kg nam (13 VĐV)', key: 'full-large', fn: scenario8_LargeCategory },
  { name: 'Giải đa hạng — 4 hạng cân', key: 'full-multi', fn: scenario9_MultiCategory },
  { name: '2 giải chạy song song', key: 'parallel', fn: scenario10_ParallelTournaments },
  { name: 'Edge cases — 5 GĐ, caution, legStrike', key: 'edge', fn: scenario11_EdgeCases },
];

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  const filterKeys: string[] = [];

  for (const arg of args) {
    const match = arg.match(/^--scenario=(.+)$/);
    if (match) {
      filterKeys.push(match[1]);
    }
  }

  // Initialize Firebase
  console.log('\n🔥 Initializing Firebase (dev)...');
  initFirebase();
  console.log('✅ Firebase connected\n');

  // Select scenarios
  let scenarios = ALL_SCENARIOS;
  if (filterKeys.length > 0) {
    scenarios = ALL_SCENARIOS.filter(s => filterKeys.includes(s.key));
    if (scenarios.length === 0) {
      console.error(`❌ Unknown scenario(s): "${filterKeys.join(', ')}"`);
      console.error(`   Available: ${[...new Set(ALL_SCENARIOS.map(s => s.key))].join(', ')}`);
      process.exit(1);
    }
    console.log(`🎯 Running filtered scenarios: ${filterKeys.join(', ')}\n`);
  } else {
    console.log(`🏃 Running all ${scenarios.length} scenarios\n`);
  }

  // Run scenarios
  let passed = 0;
  let failed = 0;
  const results: { name: string; pass: boolean }[] = [];

  for (const scenario of scenarios) {
    try {
      const result = await scenario.fn();
      results.push({ name: scenario.name, pass: result });
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (err: any) {
      console.error(`  💥 Unhandled error in "${scenario.name}": ${err.message}`);
      results.push({ name: scenario.name, pass: false });
      failed++;
    }

    // Small delay between scenarios
    await delay(300);
  }

  // Cleanup (only for original scenarios that use tournament index 99)
  if (filterKeys.length === 0 || filterKeys.some(k => ['score', 'replace', 'arena', 'race', 'sync'].includes(k))) {
    console.log('\n🧹 Cleaning up test data (tournament 99)...');
    try {
      await cleanupTestTournament();
      console.log('✅ Test data cleaned up');
    } catch (err: any) {
      console.error(`⚠️  Cleanup failed: ${err.message}`);
    }
  }

  // Summary
  logSummary(passed, failed);

  // Detailed results
  console.log('\n  Detailed results:');
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    console.log(`    ${icon} ${r.name}`);
  }
  console.log('');

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
