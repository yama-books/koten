import test from 'node:test';
import assert from 'node:assert/strict';
import { BUTTON_KEYS, isStatsPayload, STATS_KEYS } from '../../../packages/shared/src/telemetry/registry.ts';
import { payload, telemetrySources } from './fixtures.ts';

// 種別: 弁別的
test('W-1 registry: 送信キーはちょうど 17 個である', () => {
  assert.equal(STATS_KEYS.length, 17);
});

// 種別: 弁別的
test('W-2 registry: 余分なキーが 1 つでもあれば弾く', () => {
  assert.equal(isStatsPayload({ ...payload(), poemId: 'p001' }), false);
});

// 種別: 弁別的
test('W-3 registry: キーが欠けていれば弾く', () => {
  const { grade: _grade, ...missing } = payload();
  assert.equal(isStatsPayload(missing), false);
});

// 種別: 弁別的
test('W-4 registry: 正しい payload は通る', () => {
  assert.equal(isStatsPayload(payload()), true);
});

// 種別: 弁別的
test('W-5 registry: buttonCounts に一覧外のキーがあれば弾く', () => {
  assert.equal(isStatsPayload({ ...payload(), buttonCounts: { ...payload().buttonCounts, custom: 0 } }), false);
  for (const key of BUTTON_KEYS) {
    const candidate = payload();
    candidate.buttonCounts[key] = 1;
    assert.equal(isStatsPayload(candidate), true);
  }
});

// 種別: 弁別的
test('W-6 registry: localDate が時刻を含むと弾く', () => {
  assert.equal(isStatsPayload({ ...payload(), localDate: '2026-09-03T10:00:00Z' }), false);
});

// 種別: 弁別的
test('W-7 registry: 習熟度分布は長さ 5 に固定されている', () => {
  assert.equal(isStatsPayload({ ...payload(), masteryDistribution: [0, 0, 0, 0] }), false);
});

// 種別: 弁別的
test('W-8 registry: 個別履歴を指すキーが allowlist に無い', () => {
  for (const key of ['poemId', 'questionId', 'sessionId', 'eventId']) assert.equal(STATS_KEYS.includes(key as never), false);
});

// 種別: 固定ピン
test('W-9 registry: 学年区分の具体値を持たない', () => {
  const registry = telemetrySources().find(({ file }) => file === 'registry.ts')?.text ?? '';
  for (const value of ['中一', '中二', '中三', '小学生', '高一', '高二', '高三', '大人']) assert.equal(registry.includes(value), false);
});

// 種別: 弁別的
test('X-3 registry: 負の計数を弾く', () => {
  const candidates = [
    { ...payload(), pageViews: -1 },
    { ...payload(), attemptCount: -1 },
    { ...payload(), buttonCounts: { ...payload().buttonCounts, start: -1 } },
    { ...payload(), masteryDistribution: [4, 3, 2, 1, -1] },
    { ...payload(), dataVersion: -1 },
  ];
  for (const candidate of candidates) assert.equal(isStatsPayload(candidate), false);
});

// 種別: 弁別的
test('X-4 registry: 整数でない計数を弾く', () => {
  const candidates = [
    { ...payload(), pageViews: 0.5 },
    { ...payload(), attemptCount: 1.5 },
    { ...payload(), buttonCounts: { ...payload().buttonCounts, start: 2.5 } },
    { ...payload(), masteryDistribution: [4, 3, 2, 1, 0.5] },
  ];
  for (const candidate of candidates) assert.equal(isStatsPayload(candidate), false);
});

// 種別: 弁別的
test('X-5 registry: 習熟度は 0 以上 100 以下である', () => {
  const baseline = { ...payload(), masteryAvg: 50, masteryMax: 50 };
  for (const key of ['masteryAvg', 'masteryMax'] as const) {
    assert.equal(isStatsPayload({ ...baseline, [key]: 100 }), true);
    assert.equal(isStatsPayload({ ...baseline, [key]: 0 }), true);
    assert.equal(isStatsPayload({ ...baseline, [key]: 101 }), false);
    assert.equal(isStatsPayload({ ...baseline, [key]: -1 }), false);
  }
});

// 種別: 固定ピン
test('X-6 registry: 習熟度の平均は整数でなくてよい', () => {
  assert.equal(isStatsPayload({ ...payload(), masteryAvg: 62.5 }), true);
});

// 種別: 固定ピン
test('X-7 fixtures: 標準 payload は境界と非整数を含んでいる', () => {
  const standard = payload();
  assert.equal(standard.masteryMax, 100);
  assert.equal(Number.isInteger(standard.masteryAvg), false);
  assert.equal(new Set(standard.masteryDistribution).size, 5);
});

// 種別: 弁別的
test('Y-1 registry: 利用番号の形が違う payload を弾く', () => {
  const candidates = [
    '',
    'a'.repeat(19),
    'a'.repeat(21),
    'A'.repeat(20),
    `${'a'.repeat(19)}-`,
  ];
  for (const clientNumber of candidates) assert.equal(isStatsPayload({ ...payload(), clientNumber }), false);
});

// 種別: 弁別的
test('Y-2 registry: expiresAt が日付書式でなければ弾く', () => {
  const candidates = ['', '2027-10-08T00:00:00Z', '2027-10-8', '2027/10/08'];
  for (const expiresAt of candidates) assert.equal(isStatsPayload({ ...payload(), expiresAt }), false);
});

// 種別: 弁別的
test('Z-1 registry: entryCounts に一覧外のキーがあれば弾く', () => {
  assert.equal(isStatsPayload({ ...payload(), entryCounts: { ...payload().entryCounts, custom: 0 } }), false);
});

// 種別: 弁別的
test('Z-2 registry: entryCounts の計数が負または非整数なら弾く', () => {
  for (const quick of [-1, 0.5]) assert.equal(isStatsPayload({ ...payload(), entryCounts: { ...payload().entryCounts, quick } }), false);
});

// 種別: 弁別的
test('Z-3 registry: questionTypeCounts に一覧外のキーがあれば弾く', () => {
  assert.equal(isStatsPayload({ ...payload(), questionTypeCounts: { ...payload().questionTypeCounts, custom: 0 } }), false);
});

// 種別: 弁別的
test('Z-4 registry: questionTypeCounts の計数が負または非整数なら弾く', () => {
  for (const blank of [-1, 0.5]) assert.equal(isStatsPayload({ ...payload(), questionTypeCounts: { ...payload().questionTypeCounts, blank } }), false);
});

// 種別: 弁別的
test('Z-5 registry: masteryRulesVersion が負または非整数なら弾く', () => {
  for (const masteryRulesVersion of [-1, 0.5]) assert.equal(isStatsPayload({ ...payload(), masteryRulesVersion }), false);
});

// 種別: 弁別的
test('Z-6 registry: product が定められた 2 値でなければ弾く', () => {
  for (const product of ['', 'HYAKUNIN', 'hyakunin ', 'other', 1, null]) assert.equal(isStatsPayload({ ...payload(), product }), false);
});

// 種別: 弁別的
test('Z-7 registry: isOfficial が真偽値でなければ弾く', () => {
  for (const isOfficial of ['true', 1, 0, null]) assert.equal(isStatsPayload({ ...payload(), isOfficial }), false);
});

// 種別: 弁別的
test('Z-8 registry: appVersion が文字列でなければ弾く', () => {
  for (const appVersion of [1, null, true]) assert.equal(isStatsPayload({ ...payload(), appVersion }), false);
});

// 種別: 弁別的
test('Z-9 registry: grade が文字列でなければ弾く', () => {
  for (const grade of [1, null, true]) assert.equal(isStatsPayload({ ...payload(), grade }), false);
});

// 種別: 弁別的
test('Z-10 registry: masteryAvg が数値でなければ弾く', () => {
  for (const masteryAvg of ['50', null, true]) assert.equal(isStatsPayload({ ...payload(), masteryAvg }), false);
});

// 種別: 弁別的
test('Z-11 registry: masteryMax が数値でなければ弾く', () => {
  for (const masteryMax of ['50', null, true]) assert.equal(isStatsPayload({ ...payload(), masteryMax }), false);
});

// 種別: 弁別的
test('Z-12 registry: masteryDistribution が配列でなければ弾く', () => {
  for (const masteryDistribution of [null, '43125', { length: 5 }]) assert.equal(isStatsPayload({ ...payload(), masteryDistribution }), false);
});
