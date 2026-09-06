import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStatsPayload, STATS_IS_OFFICIAL, type StatsFacts, type StatsMeta } from '../../../packages/shared/src/telemetry/aggregate.ts';
import { emptyCounters } from '../../../packages/shared/src/telemetry/counters.ts';
import { isStatsPayload, MASTERY_BUCKET_COUNT } from '../../../packages/shared/src/telemetry/registry.ts';

const TODAY = '2026-09-06';

const meta = (overrides: Partial<StatsMeta> = {}): StatsMeta => ({
  clientNumber: 'abcdefghij0123456789', localDate: TODAY, product: 'hyakunin', grade: '中二',
  counters: emptyCounters(TODAY), appVersion: 'test', dataVersion: 1, expiresAt: '2026-12-31', ...overrides,
});
const facts = (overrides: Partial<StatsFacts> = {}): StatsFacts => ({
  attemptCount: 0, starts: 0, answers: 0, hints: 0, reports: 0,
  entryCounts: { quick: 0, view: 0, learn: 0, review: 0, exam: 0, author: 0 },
  questionTypeCounts: { blank: 0, author: 0 }, masteryPercents: [], ...overrides,
});

test('集計: 送信できる形になっている', () => {
  assert.equal(isStatsPayload(buildStatsPayload(meta(), facts())), true);
});

test('集計: 送り先はテスト側に固定されている', () => {
  // 裁定4。切り替えられる作りにしないこと自体が受入条件である。
  assert.equal(STATS_IS_OFFICIAL, false);
  assert.equal(buildStatsPayload(meta(), facts()).isOfficial, false);
});

test('集計: 台帳から来た数をそのまま置く', () => {
  const payload = buildStatsPayload(meta(), facts({
    attemptCount: 15, starts: 3, answers: 15, hints: 4, reports: 1,
    entryCounts: { quick: 0, view: 1, learn: 2, review: 0, exam: 1, author: 3 },
    questionTypeCounts: { blank: 12, author: 3 },
  }));
  assert.equal(payload.attemptCount, 15);
  assert.deepEqual(payload.buttonCounts, { start: 3, answer: 15, hint: 4, reveal: 0, history: 0, report: 1 });
  assert.deepEqual(payload.entryCounts, { quick: 0, view: 1, learn: 2, review: 0, exam: 1, author: 3 });
  assert.deepEqual(payload.questionTypeCounts, { blank: 12, author: 3 });
});

test('集計: 導けない3つだけをカウンタから採る', () => {
  const payload = buildStatsPayload(meta({ counters: { localDate: TODAY, pageViews: 5, reveal: 2, history: 3 } }), facts());
  assert.equal(payload.pageViews, 5);
  assert.equal(payload.buttonCounts.reveal, 2);
  assert.equal(payload.buttonCounts.history, 3);
});

test('集計: 帯の境目は表示と同じ 0 / 30 / 60 / 85', () => {
  const payload = buildStatsPayload(meta(), facts({ masteryPercents: [0, 29, 30, 59, 60, 84, 85, 100] }));
  // 灰1・赤2(0除く: 29)・… を1本ずつ確かめる。
  assert.deepEqual(payload.masteryDistribution, [1, 1, 2, 2, 2]);
  assert.equal(payload.masteryDistribution.length, MASTERY_BUCKET_COUNT);
});

test('集計: 分布の合計は母数と一致する', () => {
  const percents = [0, 0, 12, 45, 70, 90, 100];
  const payload = buildStatsPayload(meta(), facts({ masteryPercents: percents }));
  assert.equal(payload.masteryDistribution.reduce((total, value) => total + value, 0), percents.length);
});

test('集計: 平均は小数第1位までに整える', () => {
  const payload = buildStatsPayload(meta(), facts({ masteryPercents: [10, 20, 25] }));
  assert.equal(payload.masteryAvg, 18.3);
  assert.equal(payload.masteryMax, 25);
});

test('集計: 母数が空でも壊れない', () => {
  const payload = buildStatsPayload(meta(), facts({ masteryPercents: [] }));
  assert.equal(payload.masteryAvg, 0);
  assert.equal(payload.masteryMax, 0);
  assert.deepEqual(payload.masteryDistribution, [0, 0, 0, 0, 0]);
  assert.equal(isStatsPayload(payload), true);
});
