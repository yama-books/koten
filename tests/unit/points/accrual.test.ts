import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import { computePoints } from '../../../packages/shared/src/domain/points/compute.ts';
import { event, numberedEvents } from '../mastery/fixtures.ts';

/**
 * ポイント機能の存在理由そのもの（依頼者裁定・2026-09-09）。
 * 「やっても全然増えない」を作らないために入れた値なので、**習熟度が頭打ちでも増える**
 * ことを確かめる。これが緑でなくなったら、機能の目的が失われている。
 */
test('accrual: 習熟度が上限で止まってもポイントは増え続ける', () => {
  const twenty = numberedEvents('free-input', 20);
  const forty = numberedEvents('free-input', 40);
  assert.equal(computeMastery(twenty).scores['p001:text'], 90, '20件で既に上限へ達していること');
  assert.equal(computeMastery(forty).scores['p001:text'], 90, '40件でも習熟度は変わらないこと');
  assert.ok(computePoints(forty).total > computePoints(twenty).total, 'ポイントは増え続けること');
});

/**
 * 同じ日に何度もやった場合の手当て（依頼者裁定・2026-09-09）。
 * ポイントは必ずつき、習熟度も上限までは上がる。
 */
test('accrual: 同じ日に繰り返してもポイントがつき、習熟度も上がる', () => {
  const once = numberedEvents('free-input', 1, 'p001:text', '2026-09-01');
  const thrice = numberedEvents('free-input', 3, 'p001:text', '2026-09-01');
  assert.equal(computeMastery(once).scores['p001:text'], 9);
  assert.equal(computeMastery(thrice).scores['p001:text'], 27, '同日でも習熟度は上がること');
  assert.ok(computePoints(thrice).total > computePoints(once).total, '同日でもポイントがつくこと');
});

test('accrual: セッションごとに獲得点を分けて数える', () => {
  const events = [
    event({ eventId: 'e1', sessionId: 's1', questionId: 'q1', effectiveMethod: 'choice' }),
    event({ eventId: 'e2', sessionId: 's2', questionId: 'q2', effectiveMethod: 'choice' }),
    event({ eventId: 'e3', sessionId: 's2', questionId: 'q3', effectiveMethod: 'choice' }),
  ];
  const { total, bySession } = computePoints(events);
  assert.ok((bySession.s1 ?? 0) > 0, 'そのセッションぶんが入っていること');
  assert.ok((bySession.s2 ?? 0) > (bySession.s1 ?? 0), '2問答えた側が多いこと');
  assert.equal(total, bySession.s1 + bySession.s2, '累計はセッションの合計と一致すること');
});

/** 習熟度の走査に相乗りしているので、対応版の絞り込みも自動で共有されるはず。 */
test('accrual: 規則の版が違うイベントはポイントにならない', () => {
  const events = [event({ eventId: 'e1', masteryRulesVersion: 2 })];
  assert.deepEqual(computePoints(events), { total: 0, bySession: {} });
});
