/**
 * E2E Test Scenarios — Giả lập trận đấu đối kháng thực tế
 * 
 * Mỗi scenario test 1 flow cụ thể, chạy trực tiếp với Firebase dev DB.
 */

import {
  initFirebase,
  getDb,
  TEST_TOURNAMENT_INDEX,
  // Data factories
  createFighter,
  createCombatMatch,
  createRefereeScores,
  createArena,
  createTestSetting,
  defaultCaution,
  // CRUD
  readCombat,
  writeCombat,
  writeCombatList,
  writeArena,
  writeSetting,
  writeRefereeScore,
  readRefereeScores,
  resetRefereeScores,
  readArena,
  writeLastMatch,
  readLastMatch,
  updateCombatField,
  // Simulation
  getModes,
  simulateReplaceFighter,
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
  setupTestTournament,
  waitForValue,
  // Types
  type CombatMatch,
  type RefereeScore,
  type Fighter,
} from './setup';

// ==================== Scenario 1: 3 Giám Định chấm điểm ====================

export async function scenario1_ThreeRefereeScoring(): Promise<boolean> {
  logScenario('3 Giám Định chấm điểm — majority vote');

  try {
    // Setup: 3 referees, arena A, match 1
    await setupTestTournament(false);
    await writeLastMatch(0, 1);

    // --- Test 1a: 2/3 giám định cùng chấm đỏ +1 → score phải nhảy ---
    logStep('Test 1a: 2/3 giám định chấm +1 đỏ');

    // Giám định 1 chấm đỏ +1
    await writeRefereeScore(0, 0, { redScore: 1, blueScore: 0 });
    await delay(100);
    // Giám định 2 chấm đỏ +1
    await writeRefereeScore(0, 1, { redScore: 1, blueScore: 0 });
    await delay(100);

    // Kiểm tra: 2/3 > 50% → đủ quorum
    const scores = await readRefereeScores(0);
    assertNotNull(scores, 'Referee scores should exist');

    let redCount = 0;
    for (const s of scores) {
      if (s.redScore !== 0) redCount++;
    }
    assertTrue(redCount > scores.length / 2, `Red score count ${redCount} should be > ${scores.length / 2}`);

    // Verify getModes logic
    const redScores = scores.map((s: RefereeScore) => s.redScore);
    const resultRed = getModes(redScores); // [1, 1, 0] → mode=1
    assertEqual(resultRed, 1, 'getModes([1, 1, 0]) should return 1');
    logPass('2/3 giám định chấm đỏ +1 → getModes = 1 ✓');

    // --- Test 1b: Chỉ 1/3 giám định chấm → chưa đủ quorum ---
    logStep('Test 1b: 1/3 giám định chấm — chưa đủ quorum');
    await resetRefereeScores(0, 3);
    await delay(100);

    await writeRefereeScore(0, 0, { redScore: 2, blueScore: 0 });
    const scoresAfter = await readRefereeScores(0);
    assertNotNull(scoresAfter, 'Referee scores should exist');

    let redCountSingle = 0;
    for (const s of scoresAfter) {
      if (s.redScore !== 0) redCountSingle++;
    }
    assertTrue(
      redCountSingle <= scoresAfter.length / 2,
      `Only 1 referee scored, count ${redCountSingle} should be <= ${scoresAfter.length / 2}`
    );
    logPass('1/3 giám định chấm → chưa đủ quorum ✓');

    // --- Test 1c: 3/3 giám định chấm khác nhau → hòa → 0 ---
    logStep('Test 1c: 3/3 giám định chấm khác nhau (1, 2, 0) → getModes = 0');
    await resetRefereeScores(0, 3);
    await delay(100);

    await writeRefereeScore(0, 0, { redScore: 1, blueScore: 0 });
    await writeRefereeScore(0, 1, { redScore: 2, blueScore: 0 });
    await writeRefereeScore(0, 2, { redScore: 0, blueScore: 0 });

    const mixedScores = await readRefereeScores(0);
    assertNotNull(mixedScores, 'Scores should exist');
    const mixedResult = getModes(mixedScores.map((s: RefereeScore) => s.redScore));
    assertEqual(mixedResult, 0, 'getModes([1, 2, 0]) should return 0 (no majority)');
    logPass('3 giám định chấm khác nhau → getModes = 0 (hòa) ✓');

    // --- Test 1d: 2/3 giám định chấm xanh +2, 1 chấm +1 → mode = 2 ---
    logStep('Test 1d: 2/3 chấm xanh +2, 1 chấm +1 → getModes = 2');
    await resetRefereeScores(0, 3);
    await delay(100);

    await writeRefereeScore(0, 0, { redScore: 0, blueScore: 2 });
    await writeRefereeScore(0, 1, { redScore: 0, blueScore: 2 });
    await writeRefereeScore(0, 2, { redScore: 0, blueScore: 1 });

    const blueScoresArr = (await readRefereeScores(0))!.map((s: RefereeScore) => s.blueScore);
    const blueResult = getModes(blueScoresArr); // [2, 2, 1] → mode=2
    assertEqual(blueResult, 2, 'getModes([2, 2, 1]) should return 2');
    logPass('2/3 chấm xanh +2 → getModes = 2 ✓');

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  }
}

// ==================== Scenario 2: 5 Giám Định chấm điểm ====================

export async function scenario2_FiveRefereeScoring(): Promise<boolean> {
  logScenario('5 Giám Định chấm điểm — majority vote');

  try {
    // Setup: 5 referees
    await setupTestTournament(true);
    await writeLastMatch(0, 1);

    // --- Test 2a: 2/5 chấm → chưa đủ quorum ---
    logStep('Test 2a: 2/5 giám định chấm — chưa đủ quorum');
    await writeRefereeScore(0, 0, { redScore: 1, blueScore: 0 });
    await writeRefereeScore(0, 1, { redScore: 1, blueScore: 0 });
    await delay(100);

    const scores2 = await readRefereeScores(0);
    assertNotNull(scores2, 'Scores should exist');
    let count2 = scores2.filter((s: RefereeScore) => s.redScore !== 0).length;
    assertTrue(count2 <= scores2.length / 2, `2/5 = ${count2} should be <= ${scores2.length / 2}`);
    logPass('2/5 giám định → chưa đủ quorum ✓');

    // --- Test 2b: 3/5 chấm → đủ quorum ---
    logStep('Test 2b: 3/5 giám định chấm — đủ quorum');
    await writeRefereeScore(0, 2, { redScore: 1, blueScore: 0 });
    await delay(100);

    const scores3 = await readRefereeScores(0);
    assertNotNull(scores3, 'Scores should exist');
    let count3 = scores3.filter((s: RefereeScore) => s.redScore !== 0).length;
    assertTrue(count3 > scores3.length / 2, `3/5 = ${count3} should be > ${scores3.length / 2}`);

    const mode3 = getModes(scores3.map((s: RefereeScore) => s.redScore)); // [1,1,1,0,0] → mode=0? No, mode=1 (freq 3) vs 0 (freq 2)
    // Actually: freq of 1 = 3, freq of 0 = 2. maxFreq = 3. Only "1" has freq 3. → mode = 1
    assertEqual(mode3, 1, 'getModes([1,1,1,0,0]) should return 1');
    logPass('3/5 giám định chấm đỏ +1 → getModes = 1 ✓');

    // --- Test 2c: 5/5 giám định, 3 chấm +2, 2 chấm +1 → mode=2 ---
    logStep('Test 2c: 3/5 chấm +2, 2/5 chấm +1 → getModes = 2');
    await resetRefereeScores(0, 5);
    await delay(100);

    await writeRefereeScore(0, 0, { redScore: 2, blueScore: 0 });
    await writeRefereeScore(0, 1, { redScore: 2, blueScore: 0 });
    await writeRefereeScore(0, 2, { redScore: 2, blueScore: 0 });
    await writeRefereeScore(0, 3, { redScore: 1, blueScore: 0 });
    await writeRefereeScore(0, 4, { redScore: 1, blueScore: 0 });

    const scores5 = await readRefereeScores(0);
    assertNotNull(scores5, 'Scores should exist');
    const mode5 = getModes(scores5.map((s: RefereeScore) => s.redScore)); // [2,2,2,1,1] → mode=2
    assertEqual(mode5, 2, 'getModes([2,2,2,1,1]) should return 2');
    logPass('3/5 chấm +2, 2/5 chấm +1 → getModes = 2 ✓');

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  }
}

// ==================== Scenario 3: replaceFighter + caution reset ====================

export async function scenario3_ReplaceFighterAndCautionReset(): Promise<boolean> {
  logScenario('replaceFighter + caution/legStrike reset khi chuyển trận');

  try {
    await setupTestTournament(false);

    // Gây caution cho VĐV đỏ trận 1
    logStep('Thêm caution cho VĐV đỏ trận 1 (fall=2, remind=1, legStrike=true)');
    const combat0 = await readCombat(0);
    assertNotNull(combat0, 'Combat 0 should exist');

    combat0.fighters.redFighter.caution = { remind: 1, warning: 0, medical: 0, fall: 2, bound: 0 };
    combat0.fighters.redFighter.legStrike = true;
    combat0.fighters.redFighter.score = 5;
    combat0.fighters.blueFighter.score = 3;
    await writeCombat(0, combat0);

    // Xác nhận VĐV đỏ thắng trận 1
    logStep('Xác nhận VĐV đỏ (Nguyễn Văn A) thắng trận 1');
    await updateCombatField(0, 'match/win', 'red');

    // Giả lập replaceFighter
    const allCombats: CombatMatch[] = [];
    for (let i = 0; i < 6; i++) {
      const c = await readCombat(i);
      assertNotNull(c, `Combat ${i} should exist`);
      allCombats.push(c);
    }

    const updatedIndex = await simulateReplaceFighter(allCombats, 1, 'red');
    assertTrue(updatedIndex >= 0, `replaceFighter should find target match, got index ${updatedIndex}`);
    logInfo(`replaceFighter updated combat index ${updatedIndex}`);

    // Verify trận chung kết có VĐV đã được điền
    logStep('Verify trận chung kết 60kg có tên VĐV thắng');
    const finalMatch = await readCombat(4); // index 4 = Chung kết 60kg
    assertNotNull(finalMatch, 'Final match (index 4) should exist');

    // Tìm VĐV thắng ở trận chung kết (red hoặc blue có result=W.1)
    let winnerInFinal: Fighter | null = null;
    if (finalMatch.fighters.redFighter.result === 'W.1') {
      winnerInFinal = finalMatch.fighters.redFighter;
    } else if (finalMatch.fighters.blueFighter.result === 'W.1') {
      winnerInFinal = finalMatch.fighters.blueFighter;
    }
    assertNotNull(winnerInFinal, 'Winner from match 1 should be placed in final');

    // Verify tên đúng
    assertEqual(winnerInFinal!.name, 'Nguyễn Văn A', 'Winner name should be Nguyễn Văn A');
    assertEqual(winnerInFinal!.code, 'TEST001', 'Winner code should be TEST001');
    logPass('Tên VĐV thắng được điền đúng ✓');

    // Verify caution reset
    logStep('Verify caution + legStrike + score reset về 0');
    assertEqual(winnerInFinal!.score, 0, 'Score should be reset to 0');
    assertEqual(winnerInFinal!.legStrike, false, 'legStrike should be reset to false');
    assertEqual(winnerInFinal!.caution, defaultCaution(), 'Caution should be reset to all 0');
    logPass('score=0, legStrike=false, caution=all zeros ✓');

    // --- Test thêm: VĐV xanh thắng trận 2 ---
    logStep('VĐV xanh (Phạm Văn D) thắng trận 2');
    const combat1 = await readCombat(1);
    assertNotNull(combat1, 'Combat 1 should exist');
    combat1.fighters.blueFighter.caution = { remind: 0, warning: 1, medical: 0, fall: 1, bound: 1 };
    combat1.fighters.blueFighter.score = 7;
    combat1.fighters.redFighter.score = 2;
    await writeCombat(1, combat1);
    await updateCombatField(1, 'match/win', 'blue');

    // Re-read all combats (có combat 4 đã được update bởi replaceFighter trước đó)
    const allCombats2: CombatMatch[] = [];
    for (let i = 0; i < 6; i++) {
      const c = await readCombat(i);
      assertNotNull(c, `Combat ${i} should exist`);
      allCombats2.push(c);
    }

    const updatedIndex2 = await simulateReplaceFighter(allCombats2, 2, 'blue');
    assertTrue(updatedIndex2 >= 0, `replaceFighter for match 2 should work`);

    const finalMatch2 = await readCombat(4);
    assertNotNull(finalMatch2, 'Final match should exist after both semis');

    // VĐV blue thắng trận 2 phải vào slot W.2
    let loserInFinal: Fighter | null = null;
    if (finalMatch2.fighters.redFighter.result === 'W.2') {
      loserInFinal = finalMatch2.fighters.redFighter;
    } else if (finalMatch2.fighters.blueFighter.result === 'W.2') {
      loserInFinal = finalMatch2.fighters.blueFighter;
    }
    assertNotNull(loserInFinal, 'Winner from match 2 should be placed in final (W.2 slot)');
    assertEqual(loserInFinal!.name, 'Phạm Văn D', 'Match 2 winner should be Phạm Văn D');
    assertEqual(loserInFinal!.caution, defaultCaution(), 'Caution of match 2 winner should be reset');
    logPass('VĐV trận 2 điền đúng + caution reset ✓');

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  }
}

// ==================== Scenario 4: Xung đột 2 sân ====================

export async function scenario4_TwoArenaConflict(): Promise<boolean> {
  logScenario('Xung đột 2 sân — data isolation');

  try {
    await setupTestTournament(false);

    // Sân A: lastMatch = 1, Sân B: lastMatch = 3
    await writeLastMatch(0, 1);
    await writeLastMatch(1, 3);

    // --- Test 4a: Referee scores isolated giữa 2 sân ---
    logStep('Test 4a: Giám định sân A chấm điểm — sân B không bị ảnh hưởng');

    // Sân A: Giám định 0 chấm đỏ +1
    await writeRefereeScore(0, 0, { redScore: 1, blueScore: 0 });
    await delay(200);

    // Sân B: Verify vẫn là 0
    const scoresB = await readRefereeScores(1);
    assertNotNull(scoresB, 'Arena B scores should exist');
    assertTrue(
      scoresB.every((s: RefereeScore) => s.redScore === 0 && s.blueScore === 0),
      'Arena B scores should all be 0'
    );
    logPass('Sân A chấm điểm → sân B không bị ảnh hưởng ✓');

    // --- Test 4b: Sân B chấm điểm riêng ---
    logStep('Test 4b: Sân B chấm xanh +2 — sân A giữ nguyên');
    await writeRefereeScore(1, 0, { redScore: 0, blueScore: 2 });
    await delay(200);

    // Verify sân A vẫn giữ giá trị cũ
    const scoresA = await readRefereeScores(0);
    assertNotNull(scoresA, 'Arena A scores should exist');
    assertEqual(scoresA[0].redScore, 1, 'Arena A referee 0 red score should still be 1');
    assertEqual(scoresA[0].blueScore, 0, 'Arena A referee 0 blue score should still be 0');
    logPass('Sân B chấm xanh +2 → sân A giữ nguyên ✓');

    // --- Test 4c: Reset sân A không ảnh hưởng sân B ---
    logStep('Test 4c: Reset referee sân A — sân B giữ nguyên');
    await resetRefereeScores(0, 3);
    await delay(200);

    const scoresBAfter = await readRefereeScores(1);
    assertNotNull(scoresBAfter, 'Arena B scores should still exist');
    assertEqual(scoresBAfter[0].blueScore, 2, 'Arena B referee 0 blue score should still be 2');
    logPass('Reset sân A → sân B giữ nguyên ✓');

    // --- Test 4d: lastMatch isolated ---
    logStep('Test 4d: lastMatch sân A và sân B độc lập');
    const lastA = await readLastMatch(0);
    const lastB = await readLastMatch(1);
    assertEqual(lastA, 1, 'Arena A lastMatch should be 1');
    assertEqual(lastB, 3, 'Arena B lastMatch should be 3');

    // Update sân A lastMatch
    await writeLastMatch(0, 2);
    const lastA2 = await readLastMatch(0);
    const lastB2 = await readLastMatch(1);
    assertEqual(lastA2, 2, 'Arena A lastMatch should be updated to 2');
    assertEqual(lastB2, 3, 'Arena B lastMatch should still be 3');
    logPass('lastMatch 2 sân độc lập ✓');

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  }
}

// ==================== Scenario 5: Race condition ====================

export async function scenario5_RaceCondition(): Promise<boolean> {
  logScenario('Race condition — Giám định gửi điểm nhanh liên tục');

  try {
    await setupTestTournament(false);
    await writeLastMatch(0, 1);

    // --- Test 5a: 3 giám định gửi cùng lúc (Promise.all) ---
    logStep('Test 5a: 3 giám định gửi điểm đồng thời (Promise.all)');

    await Promise.all([
      writeRefereeScore(0, 0, { redScore: 1, blueScore: 0 }),
      writeRefereeScore(0, 1, { redScore: 1, blueScore: 0 }),
      writeRefereeScore(0, 2, { redScore: 0, blueScore: 1 }),
    ]);
    await delay(300);

    const scores = await readRefereeScores(0);
    assertNotNull(scores, 'Scores should exist');
    assertEqual(scores[0].redScore, 1, 'Referee 0 red should be 1');
    assertEqual(scores[1].redScore, 1, 'Referee 1 red should be 1');
    assertEqual(scores[2].blueScore, 1, 'Referee 2 blue should be 1');
    logPass('3 giám định gửi đồng thời → tất cả ghi đúng ✓');

    // --- Test 5b: Cùng 1 giám định gửi liên tục 5 lần ---
    logStep('Test 5b: Giám định 0 gửi liên tục 5 lần (overwrite)');
    await resetRefereeScores(0, 3);
    await delay(100);

    // Gửi 5 lần, mỗi lần giá trị khác
    for (let i = 1; i <= 5; i++) {
      await writeRefereeScore(0, 0, { redScore: i, blueScore: 0 });
    }
    await delay(300);

    const finalScore = await readRefereeScores(0);
    assertNotNull(finalScore, 'Scores should exist');
    assertEqual(finalScore[0].redScore, 5, 'Last write wins — red score should be 5');
    logPass('Gửi liên tục 5 lần → giá trị cuối cùng ghi đúng (5) ✓');

    // --- Test 5c: 2 sân gửi đồng thời ---
    logStep('Test 5c: 2 sân gửi điểm đồng thời');
    await resetRefereeScores(0, 3);
    await resetRefereeScores(1, 3);
    await delay(100);

    await Promise.all([
      writeRefereeScore(0, 0, { redScore: 1, blueScore: 0 }),
      writeRefereeScore(1, 0, { redScore: 0, blueScore: 2 }),
    ]);
    await delay(300);

    const scoresA = await readRefereeScores(0);
    const scoresB = await readRefereeScores(1);
    assertNotNull(scoresA, 'Arena A scores should exist');
    assertNotNull(scoresB, 'Arena B scores should exist');
    assertEqual(scoresA[0].redScore, 1, 'Arena A: ref 0 red = 1');
    assertEqual(scoresB[0].blueScore, 2, 'Arena B: ref 0 blue = 2');
    logPass('2 sân gửi đồng thời → data không bị cross-write ✓');

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  }
}

// ==================== Scenario 6: lastMatch sync ====================

export async function scenario6_LastMatchSync(): Promise<boolean> {
  logScenario('lastMatch sync — đồng bộ giữa các tab');

  try {
    await setupTestTournament(false);

    // --- Test 6a: Set lastMatch rồi đọc lại ---
    logStep('Test 6a: Set lastMatch = 3 → đọc lại');
    await writeLastMatch(0, 3);
    await delay(200);

    const val1 = await readLastMatch(0);
    assertEqual(val1, 3, 'lastMatch should be 3');
    logPass('lastMatch ghi/đọc đúng ✓');

    // --- Test 6b: Realtime listener nhận update ---
    logStep('Test 6b: Realtime listener nhận update lastMatch');

    const updatePromise = waitForValue<number>(
      `tournament/${TEST_TOURNAMENT_INDEX}/combatArena/0/lastMatch/no`,
      (val) => val === 5,
      3000
    );

    // Sau 500ms set lastMatch = 5
    setTimeout(async () => {
      await writeLastMatch(0, 5);
    }, 500);

    const received = await updatePromise;
    assertEqual(received, 5, 'Listener should receive lastMatch = 5');
    logPass('Realtime listener nhận update lastMatch = 5 ✓');

    // --- Test 6c: Ghi liên tục nhiều lần → giá trị cuối đúng ---
    logStep('Test 6c: Set lastMatch liên tục 1→2→3→4→5');
    for (let i = 1; i <= 5; i++) {
      await writeLastMatch(0, i);
    }
    await delay(300);

    const finalVal = await readLastMatch(0);
    assertEqual(finalVal, 5, 'lastMatch should be 5 after sequential writes');
    logPass('Ghi liên tục → giá trị cuối cùng đúng (5) ✓');

    return true;
  } catch (err: any) {
    logFail(err.message);
    return false;
  }
}
