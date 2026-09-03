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
