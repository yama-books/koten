import test from 'node:test';
import assert from 'node:assert/strict';
import type { OutboxItem } from '../../../packages/shared/src/domain/event.ts';
import { OUTBOX_RETENTION_DAYS, selectOutbox, statsDocumentId } from '../../../packages/shared/src/telemetry/queue.ts';
import { sanitizeStats } from '../../../packages/shared/src/telemetry/sanitize.ts';
import { payload } from './fixtures.ts';

const today = '2026-09-03';

function item(createdOn: string): OutboxItem {
  return { outboxId: createdOn, kind: 'stats', payload: {}, createdOn };
}

// 種別: 弁別的
test('W-20 queue: 29 日前は送る', () => {
  assert.deepEqual(selectOutbox([item('2026-08-05')], today).send, [item('2026-08-05')]);
});

// 種別: 弁別的
test('W-21 queue: ちょうど 30 日前は送る', () => {
  assert.deepEqual(selectOutbox([item('2026-08-04')], today).send, [item('2026-08-04')]);
});

// 種別: 弁別的
test('W-22 queue: 31 日前は捨てる', () => {
  assert.deepEqual(selectOutbox([item('2026-08-03')], today).drop, [item('2026-08-03')]);
});

// 種別: 固定ピン
test('W-23 queue: send と drop は入力の分割になっている', () => {
  const items = [item('2026-08-04'), item('2026-08-03'), item('2026-08-02')];
  const selected = selectOutbox(items, today);
  assert.equal(selected.send.length + selected.drop.length, items.length);
  assert.equal(new Set([...selected.send, ...selected.drop]).size, items.length);
});

// 種別: 弁別的
test('W-24 queue: 保持期間は 30 日である', () => {
  assert.equal(OUTBOX_RETENTION_DAYS, 30);
});

// 種別: 弁別的
test('W-25 queue: 文書 ID は同じ日の 2 製品を区別する', () => {
  const hyakunin = payload();
  const kanazukai = { ...payload(), product: 'kanazukai' as const };
  assert.notEqual(statsDocumentId(hyakunin), statsDocumentId(kanazukai));
});

// 種別: 弁別的
test('W-26 sanitize: strict なら allowlist 外で例外を投げる', () => {
  assert.throws(() => sanitizeStats({ ...payload(), poemId: 'p001' }, { strict: true }));
});

// 種別: 弁別的
test('W-27 sanitize: strict でなければ null を返して投げない', () => {
  assert.equal(sanitizeStats({ ...payload(), poemId: 'p001' }, { strict: false }), null);
});

// 種別: 弁別的
test('W-28 sanitize: 通った payload は 17 キーだけを持つ新しい物になる', () => {
  const original = payload();
  const sanitized = sanitizeStats(original, { strict: true });
  assert.notEqual(sanitized, original);
  assert.deepEqual(Object.keys(sanitized ?? {}), [
    'clientNumber', 'localDate', 'product', 'grade', 'pageViews', 'buttonCounts', 'entryCounts',
    'questionTypeCounts', 'attemptCount', 'masteryAvg', 'masteryMax', 'masteryDistribution',
    'isOfficial', 'appVersion', 'dataVersion', 'masteryRulesVersion', 'expiresAt',
  ]);
});

// 種別: 弁別的
test('AA-1 queue: 文書 ID は端末番号が違えば異なる', () => {
  const first = payload();
  const second = { ...payload(), clientNumber: 'b'.repeat(20) };
  assert.notEqual(statsDocumentId(first), statsDocumentId(second));
});

// 種別: 弁別的
test('AA-2 queue: 文書 ID は日付が違えば異なる', () => {
  const first = payload();
  const second = { ...payload(), localDate: '2026-09-04' };
  assert.notEqual(statsDocumentId(first), statsDocumentId(second));
});

// 種別: 弁別的
test('AA-3 sanitize: 通った payload の値をそのまま写す', () => {
  const original = payload();
  assert.deepEqual(sanitizeStats(original, { strict: true }), original);
});

// 種別: 弁別的
test('AA-4 sanitize: strict でなくても有効な payload を返す', () => {
  const original = payload();
  assert.deepEqual(sanitizeStats(original, { strict: false }), original);
});
