/**
 * Full Tournament E2E Scenarios (7-11)
 * 
 * Giả lập giải đấu thực tế từ file Excel data_doikhang_tho.xlsx
 * Chạy từng trận, verify replaceFighter chain, score, caution reset
 */

import {
  initFirebase,
  getDb,
  readCombat,
  writeCombat,
  writeRefereeScore,
  readRefereeScores,
  resetRefereeScores,
  writeLastMatch,
  updateCombatField,
  // Assertions
  assertEqual,
  assertTrue,
  assertNotNull,
  // Logging
  logScenario,
  logStep,
  logPass,
  logFail,
  logInfo,
  // Utils
  delay,
  getModes,
  defaultCaution,
  // Types
  type CombatMatch,
  type Fighter,
  type RefereeScore,
} from './setup';

import { ref, remove, get } from 'firebase/database';

import { parseExcelFile, arrangeCombat, toCombatMatches, getCategories, type MatchSchema } from './excel-parser';
import { TournamentEngine, type MatchResult } from './tournament-engine';

const EXCEL_FILE = 'data_doikhang_tho.xlsx';

// ==================== Helper ====================

async function readAllCombats(tournamentIndex: number, count: number): Promise<CombatMatch[]> {
  const combats: CombatMatch[] = [];
  for (let i = 0; i < count; i++) {
    const c = await readCombat(i, tournamentIndex);
    if (c) combats.push(c);
  }
  return combats;
}

async function cleanupTournament(tournamentIndex: number): Promise<void> {
  await remove(ref(getDb(), `tournament/${tournamentIndex}`));
}

// ==================== Scenario 7: 1 hạng cân nhỏ (4 VĐV, 3 trận) ====================

export async function scenario7_SmallCategory(): Promise<boolean> {
  logScenario('Giải nhỏ — 45kg nữ (4 VĐV → 3 trận: 2 BK + 1 CK)');

  const TIDX = 97;
  const engine = new TournamentEngine({
    tournamentIndex: TIDX,
    fiveReferee: false,
    scoreDelay: 30,
    matchDelay: 50,
    scoringRounds: 2,
    winnerStrategy: 'red-always',
  });

  try {
    // 1. Parse Excel & sinh bracket
    logStep('Parse Excel → sinh bracket cho 45kg nữ');
    const rawData = parseExcelFile(EXCEL_FILE);
    assertNotNull(rawData, 'Raw data should exist');
    assertTrue(rawData.length > 0, 'Raw data should not be empty');

    const matches = arrangeCombat(rawData, ['45kg nữ']);
    logInfo(`Sinh được ${matches.length} trận cho 45kg nữ`);
    assertEqual(matches.length, 3, '45kg nữ (4 VĐV) should produce 3 matches');

    // Verify bracket structure
    const types = matches.map(m => m.type);
    assertTrue(types.filter(t => t === 'Bán Kết').length === 2, 'Should have 2 Bán Kết');
    assertTrue(types.filter(t => t === 'Chung Kết').length === 1, 'Should have 1 Chung Kết');
    logPass('Bracket structure đúng: 2 BK + 1 CK ✓');

    // Verify VĐV tên đúng
    const allNames = new Set<string>();
    matches.forEach(m => {
      if (!String(m.redFighter.name).startsWith('W.')) allNames.add(m.redFighter.name);
      if (!String(m.blueFighter.name).startsWith('W.')) allNames.add(m.blueFighter.name);
    });
    assertTrue(allNames.size === 4, `Should have 4 unique fighters, got ${allNames.size}`);
    logPass(`4 VĐV tên đúng: ${[...allNames].join(', ')} ✓`);

    // 2. Setup tournament & ghi combats
    logStep('Setup tournament trên Firebase');
    await engine.setupTournament();
    const combats = toCombatMatches(matches);
    await engine.writeCombats(combats);

    // Verify data đã ghi
    const c0 = await readCombat(0, TIDX);
    assertNotNull(c0, 'Combat 0 should exist on Firebase');
    logPass('Tournament setup OK ✓');

    // 3. Chạy từng trận
    logStep('Chạy trận 1 (Bán Kết): đỏ vs xanh');
    const r1 = await engine.simulateMatch(0, 0, combats.length);
    assertEqual(r1.winColor, 'red', 'Red should win match 1');
    logPass(`Trận 1: ${r1.winnerName} thắng (${r1.redScore}-${r1.blueScore}) ✓`);

    // Verify replaceFighter đã điền VĐV vào chung kết
    logStep('Verify VĐV thắng trận 1 được điền vào Chung Kết');
    const ck = await readCombat(2, TIDX);
    assertNotNull(ck, 'Chung Kết combat should exist');
    // VĐV thắng trận 1 phải ở slot W.1 của chung kết
    let foundWinner1 = false;
    if (ck.fighters.redFighter.result === `W.${r1.matchNo}`) {
      assertEqual(ck.fighters.redFighter.name, r1.winnerName, 'Winner from match 1 name should match');
      assertEqual(ck.fighters.redFighter.score, 0, 'Score should be reset');
      assertEqual(ck.fighters.redFighter.caution, defaultCaution(), 'Caution should be reset');
      foundWinner1 = true;
    } else if (ck.fighters.blueFighter.result === `W.${r1.matchNo}`) {
      assertEqual(ck.fighters.blueFighter.name, r1.winnerName, 'Winner from match 1 name should match');
      assertEqual(ck.fighters.blueFighter.score, 0, 'Score should be reset');
      assertEqual(ck.fighters.blueFighter.caution, defaultCaution(), 'Caution should be reset');
      foundWinner1 = true;
    }
    assertTrue(foundWinner1, 'Winner from match 1 should be placed in Chung Kết');
    logPass('VĐV thắng trận 1 → Chung Kết + score/caution reset ✓');

    // Trận 2
    logStep('Chạy trận 2 (Bán Kết)');
    const r2 = await engine.simulateMatch(1, 0, combats.length);
    assertEqual(r2.winColor, 'red', 'Red should win match 2');
    logPass(`Trận 2: ${r2.winnerName} thắng (${r2.redScore}-${r2.blueScore}) ✓`);

    // Trận 3 (Chung Kết)
    logStep('Chạy trận 3 (Chung Kết)');
    const r3 = await engine.simulateMatch(2, 0, combats.length);
    logPass(`Chung Kết: ${r3.winnerName} vô địch 45kg nữ (${r3.redScore}-${r3.blueScore}) ✓`);

    // Final verification: tất cả trận đều có kết quả
    logStep('Verify tất cả 3 trận đều có match.win');
    for (let i = 0; i < 3; i++) {
      const c = await readCombat(i, TIDX);
      assertNotNull(c, `Combat ${i} should exist`);
      assertTrue(c.match.win === 'red' || c.match.win === 'blue', `Combat ${i} should have win result`);
    }
    logPass('Tất cả 3 trận đều có kết quả ✓');

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  } finally {
    await cleanupTournament(TIDX);
  }
}

// ==================== Scenario 8: 1 hạng cân lớn (13 VĐV) ====================

export async function scenario8_LargeCategory(): Promise<boolean> {
  logScenario('Giải lớn — 64kg nam (13 VĐV → 12 trận: VL1→VL2→BK→CK)');

  const TIDX = 96;
  const engine = new TournamentEngine({
    tournamentIndex: TIDX,
    fiveReferee: false,
    scoreDelay: 20,
    matchDelay: 30,
    scoringRounds: 2,
    winnerStrategy: 'red-always',
  });

  try {
    logStep('Parse Excel → sinh bracket cho 64kg nam');
    const rawData = parseExcelFile(EXCEL_FILE);
    const matches = arrangeCombat(rawData, ['64kg nam']);
    logInfo(`Sinh được ${matches.length} trận cho 64kg nam (13 VĐV)`);
    assertEqual(matches.length, 12, '64kg nam (13 VĐV) should produce 12 matches');

    // Verify có nhiều vòng loại
    const typeCounts: Record<string, number> = {};
    matches.forEach(m => {
      const t = m.type;
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    logInfo(`Match types: ${JSON.stringify(typeCounts)}`);
    assertTrue((typeCounts['Vòng loại'] || 0) + (typeCounts['Vòng loại-1'] || 0) + (typeCounts['Vòng loại-2'] || 0) > 0, 'Should have qualification rounds');
    assertTrue(typeCounts['Chung Kết'] === 1, 'Should have exactly 1 Chung Kết');
    logPass('Bracket đa vòng loại ✓');

    // Setup & run
    logStep('Setup tournament & ghi combats');
    await engine.setupTournament();
    const combats = toCombatMatches(matches);
    await engine.writeCombats(combats);

    logStep('Chạy toàn bộ 12 trận theo thứ tự');
    const results = await engine.runAllMatches(combats.length);
    assertEqual(results.length, 12, 'Should have 12 results');

    // Verify mỗi trận
    for (const r of results) {
      logInfo(`  Trận ${r.matchNo} (${r.type} ${r.category}): ${r.winnerName} thắng ${r.redScore}-${r.blueScore}`);
    }

    // Verify trận chung kết
    logStep('Verify trận Chung Kết');
    const finalResult = results.find(r => r.type === 'Chung Kết');
    assertNotNull(finalResult, 'Final match result should exist');
    logPass(`Chung Kết 64kg nam: ${finalResult!.winnerName} vô địch ✓`);

    // Verify trận chung kết trên Firebase
    const finalIdx = combats.length - 1;
    const finalCombat = await readCombat(finalIdx, TIDX);
    assertNotNull(finalCombat, 'Final combat should exist on Firebase');
    
    // Cả 2 VĐV đều phải là tên thật (không còn W.x)
    assertTrue(
      !String(finalCombat.fighters.redFighter.name).startsWith('W.'),
      `Final red fighter "${finalCombat.fighters.redFighter.name}" should not be placeholder`
    );
    assertTrue(
      !String(finalCombat.fighters.blueFighter.name).startsWith('W.'),
      `Final blue fighter "${finalCombat.fighters.blueFighter.name}" should not be placeholder`
    );
    logPass('Chung Kết có 2 VĐV thật (không placeholder) ✓');

    // Verify tất cả trận đều có win
    logStep('Verify tất cả 12 trận đều có match.win');
    for (let i = 0; i < combats.length; i++) {
      const c = await readCombat(i, TIDX);
      assertNotNull(c, `Combat ${i} should exist`);
      assertTrue(
        c.match.win === 'red' || c.match.win === 'blue',
        `Combat ${i} (match ${c.match.no}) should have win, got "${c.match.win}"`
      );
    }
    logPass('Tất cả 12 trận đều có kết quả ✓');

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  } finally {
    await cleanupTournament(TIDX);
  }
}

// ==================== Scenario 9: Nhiều hạng cân (giải đa hạng) ====================

export async function scenario9_MultiCategory(): Promise<boolean> {
  logScenario('Giải đa hạng — 4 hạng cân: 45kg nữ(4), 57kg nam(5), 60kg nam(7), 73kg nam(10)');

  const TIDX = 95;
  const CATEGORIES = ['45kg nữ', '57kg nam', '60kg nam', '73kg nam'];
  const engine = new TournamentEngine({
    tournamentIndex: TIDX,
    fiveReferee: false,
    scoreDelay: 15,
    matchDelay: 25,
    scoringRounds: 1, // 1 lượt cho nhanh
    winnerStrategy: 'alternate', // Xen kẽ đỏ-xanh cho đa dạng
  });

  try {
    logStep('Parse Excel → sinh bracket cho 4 hạng cân');
    const rawData = parseExcelFile(EXCEL_FILE);
    const matches = arrangeCombat(rawData, CATEGORIES);
    logInfo(`Tổng: ${matches.length} trận cho 4 hạng cân`);

    // Kiểm tra có đủ trận theo lý thuyết
    // 45kg: 4 VĐV → 3 trận, 57kg: 5 → 4, 60kg: 7 → 6, 73kg: 10 → 9 = 22 trận
    const expectedTotal = 3 + 4 + 6 + 9; // = 22
    assertEqual(matches.length, expectedTotal, `Total matches should be ${expectedTotal}`);
    logPass(`${matches.length} trận đúng kỳ vọng ✓`);

    // Verify match numbering liên tục
    logStep('Verify match numbering liên tục 1→N');
    const matchNos = matches.map(m => m.match).sort((a, b) => a - b);
    for (let i = 0; i < matchNos.length; i++) {
      assertEqual(matchNos[i], i + 1, `Match number should be ${i + 1}, got ${matchNos[i]}`);
    }
    logPass('Match numbering liên tục ✓');

    // Setup & run
    logStep('Setup tournament & ghi combats');
    await engine.setupTournament();
    const combats = toCombatMatches(matches);
    await engine.writeCombats(combats);

    logStep(`Chạy toàn bộ ${combats.length} trận`);
    const results = await engine.runAllMatches(combats.length);
    assertEqual(results.length, combats.length, `Should have ${combats.length} results`);

    // Verify mỗi hạng cân có vô địch
    logStep('Verify mỗi hạng cân đều có trận Chung Kết');
    for (const cat of CATEGORIES) {
      const catResults = results.filter(r => r.category === cat);
      assertTrue(catResults.length > 0, `Category ${cat} should have results`);
      const finalResult = catResults.find(r => r.type === 'Chung Kết');
      assertNotNull(finalResult, `${cat} should have a Chung Kết`);
      logPass(`  ${cat}: ${finalResult!.winnerName} vô địch ✓`);
    }

    // Verify tất cả trận có kết quả
    logStep('Verify tất cả trận có kết quả');
    for (let i = 0; i < combats.length; i++) {
      const c = await readCombat(i, TIDX);
      assertNotNull(c, `Combat ${i} should exist`);
      assertTrue(c.match.win !== '' && c.match.win !== undefined, `Combat ${i} should have win`);
    }
    logPass(`Tất cả ${combats.length} trận đều xong ✓`);

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  } finally {
    await cleanupTournament(TIDX);
  }
}

// ==================== Scenario 10: 2 giải chạy song song ====================

export async function scenario10_ParallelTournaments(): Promise<boolean> {
  logScenario('2 giải chạy song song — Tournament 93 (45kg nữ) vs Tournament 94 (57kg nam)');

  const TIDX_A = 93;
  const TIDX_B = 94;

  const engineA = new TournamentEngine({
    tournamentIndex: TIDX_A,
    fiveReferee: false,
    scoreDelay: 20,
    matchDelay: 30,
    scoringRounds: 1,
    winnerStrategy: 'red-always',
  });

  const engineB = new TournamentEngine({
    tournamentIndex: TIDX_B,
    fiveReferee: true, // 5 giám định
    scoreDelay: 20,
    matchDelay: 30,
    scoringRounds: 1,
    winnerStrategy: 'alternate',
  });

  try {
    const rawData = parseExcelFile(EXCEL_FILE);

    // Setup 2 giải
    logStep('Setup 2 giải đấu song song');
    const matchesA = arrangeCombat(rawData, ['45kg nữ']);
    const matchesB = arrangeCombat(rawData, ['57kg nam']);
    logInfo(`Giải A: ${matchesA.length} trận (45kg nữ, 3 GĐ)`);
    logInfo(`Giải B: ${matchesB.length} trận (57kg nam, 5 GĐ)`);

    await engineA.setupTournament();
    await engineB.setupTournament();

    const combatsA = toCombatMatches(matchesA);
    const combatsB = toCombatMatches(matchesB);
    await engineA.writeCombats(combatsA);
    await engineB.writeCombats(combatsB);

    // Chạy song song
    logStep('Chạy 2 giải ĐỒNG THỜI (Promise.all)');
    const [resultsA, resultsB] = await Promise.all([
      engineA.runAllMatches(combatsA.length, 0),
      engineB.runAllMatches(combatsB.length, 1), // Sân B
    ]);

    logInfo(`Giải A xong: ${resultsA.length} trận`);
    logInfo(`Giải B xong: ${resultsB.length} trận`);

    assertEqual(resultsA.length, combatsA.length, 'Giải A should complete all matches');
    assertEqual(resultsB.length, combatsB.length, 'Giải B should complete all matches');
    logPass('Cả 2 giải đều hoàn thành ✓');

    // Verify data isolation
    logStep('Verify data isolation — giải A không bị ảnh hưởng bởi giải B');

    // Giải A: tất cả trận phải có category = "45kg nữ"
    for (let i = 0; i < combatsA.length; i++) {
      const c = await readCombat(i, TIDX_A);
      assertNotNull(c, `Giải A combat ${i} should exist`);
      assertEqual(c.match.category, '45kg nữ', `Giải A combat ${i} should be 45kg nữ`);
      assertTrue(c.match.win === 'red' || c.match.win === 'blue', `Giải A combat ${i} should have win`);
    }

    // Giải B: tất cả trận phải có category = "57kg nam"
    for (let i = 0; i < combatsB.length; i++) {
      const c = await readCombat(i, TIDX_B);
      assertNotNull(c, `Giải B combat ${i} should exist`);
      assertEqual(c.match.category, '57kg nam', `Giải B combat ${i} should be 57kg nam`);
      assertTrue(c.match.win === 'red' || c.match.win === 'blue', `Giải B combat ${i} should have win`);
    }
    logPass('Data isolation OK — 2 giải không cross-write ✓');

    // Verify Chung Kết cả 2 giải
    logStep('Verify Chung Kết');
    const finalA = resultsA.find(r => r.type === 'Chung Kết');
    const finalB = resultsB.find(r => r.type === 'Chung Kết');
    assertNotNull(finalA, 'Giải A should have Chung Kết');
    assertNotNull(finalB, 'Giải B should have Chung Kết');
    logPass(`Giải A: ${finalA!.winnerName} vô địch 45kg nữ ✓`);
    logPass(`Giải B: ${finalB!.winnerName} vô địch 57kg nam ✓`);

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  } finally {
    await Promise.all([
      cleanupTournament(TIDX_A),
      cleanupTournament(TIDX_B),
    ]);
  }
}

// ==================== Scenario 11: Edge cases giám định ====================

export async function scenario11_EdgeCases(): Promise<boolean> {
  logScenario('Edge cases — 5 GĐ, caution tích lũy, legStrike');

  const TIDX = 92;
  const engine = new TournamentEngine({
    tournamentIndex: TIDX,
    fiveReferee: true,
    scoreDelay: 20,
    matchDelay: 30,
    scoringRounds: 3, // 3 lượt chấm điểm
    winnerStrategy: 'red-always',
  });

  try {
    // Setup 1 hạng cân nhỏ (48kg nữ — 4 VĐV)
    logStep('Setup 48kg nữ với 5 giám định');
    const rawData = parseExcelFile(EXCEL_FILE);
    const matches = arrangeCombat(rawData, ['48kg nữ']);
    assertEqual(matches.length, 3, '48kg nữ should have 3 matches');

    await engine.setupTournament();
    const combats = toCombatMatches(matches);
    await engine.writeCombats(combats);

    // --- Test 11a: 5 GĐ chấm điểm, verify quorum ---
    logStep('Test 11a: 5 GĐ — cần 3/5 cho quorum');
    
    // Chạy trận 1 qua engine
    const r1 = await engine.simulateMatch(0, 0, combats.length);
    assertTrue(r1.redScore > 0, 'Red score should be > 0 after 3 rounds');
    logPass(`5 GĐ chấm điểm OK — score ${r1.redScore}-${r1.blueScore} ✓`);

    // --- Test 11b: Caution tích lũy trong trận ---
    logStep('Test 11b: Gây caution cho VĐV rồi verify reset khi chuyển trận');
    
    // Trước khi chạy trận 2, gây caution cho VĐV đỏ trận 2
    const combat1 = await readCombat(1, TIDX);
    assertNotNull(combat1, 'Combat 1 should exist');
    
    combat1.fighters.redFighter.caution = { remind: 2, warning: 1, medical: 0, fall: 3, bound: 1 };
    combat1.fighters.redFighter.legStrike = true;
    await writeCombat(1, combat1, TIDX);
    
    // Verify caution đã ghi
    const combat1Check = await readCombat(1, TIDX);
    assertNotNull(combat1Check, 'Combat 1 should exist');
    assertEqual(combat1Check.fighters.redFighter.caution.remind, 2, 'Remind should be 2');
    assertEqual(combat1Check.fighters.redFighter.caution.fall, 3, 'Fall should be 3');
    assertEqual(combat1Check.fighters.redFighter.legStrike, true, 'legStrike should be true');
    logPass('Caution + legStrike ghi đúng ✓');

    // Chạy trận 2
    const r2 = await engine.simulateMatch(1, 0, combats.length);
    logInfo(`Trận 2: ${r2.winnerName} thắng`);

    // Verify VĐV thắng trận 2 vào Chung Kết với caution RESET
    logStep('Verify caution/legStrike/score reset khi VĐV vào Chung Kết');
    const ck = await readCombat(2, TIDX);
    assertNotNull(ck, 'Chung Kết should exist');

    // Tìm VĐV thắng trận 2 trong Chung Kết
    let winnerInFinal: Fighter | null = null;
    if (ck.fighters.redFighter.result === `W.${r2.matchNo}`) {
      winnerInFinal = ck.fighters.redFighter;
    } else if (ck.fighters.blueFighter.result === `W.${r2.matchNo}`) {
      winnerInFinal = ck.fighters.blueFighter;
    }
    assertNotNull(winnerInFinal, 'Winner from match 2 should be in Chung Kết');
    assertEqual(winnerInFinal!.score, 0, 'Score should be reset to 0');
    assertEqual(winnerInFinal!.legStrike, false, 'legStrike should be reset to false');
    assertEqual(winnerInFinal!.caution, defaultCaution(), 'Caution should be reset to all zeros');
    logPass('Caution/legStrike/score reset khi chuyển trận ✓');

    // --- Test 11c: Chạy Chung Kết với 3 lượt chấm điểm ---
    logStep('Test 11c: Chung Kết với 3 lượt chấm điểm');
    const r3 = await engine.simulateMatch(2, 0, combats.length);
    // 3 lượt, mỗi lượt đỏ +1 → total red = 3
    assertTrue(r3.redScore >= 3, `Red score after 3 rounds should be >= 3, got ${r3.redScore}`);
    logPass(`Chung Kết: ${r3.winnerName} vô địch (score ${r3.redScore}-${r3.blueScore}) ✓`);

    // --- Test 11d: Verify toàn bộ giải xong ---
    logStep('Test 11d: Verify toàn bộ 3 trận đều complete');
    for (let i = 0; i < 3; i++) {
      const c = await readCombat(i, TIDX);
      assertNotNull(c, `Combat ${i} should exist`);
      assertTrue(c.match.win === 'red' || c.match.win === 'blue', `Combat ${i} should have winner`);
      // Verify VĐV thật (không placeholder)
      assertTrue(
        !String(c.fighters.redFighter.name).startsWith('W.'),
        `Combat ${i} red should not be placeholder`
      );
      assertTrue(
        !String(c.fighters.blueFighter.name).startsWith('W.'),
        `Combat ${i} blue should not be placeholder`
      );
    }
    logPass('Toàn bộ giải complete, không còn placeholder ✓');

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  } finally {
    await cleanupTournament(TIDX);
  }
}
