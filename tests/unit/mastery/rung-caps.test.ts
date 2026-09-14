import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import { event, numberedEvents } from './fixtures.ts';

/**
 * 2026-09-15・発注084。**段の天井を採点へつなぐ。**
 *
 * 段は**これから記録されるイベントにだけ効く。** 過去に積んだ点を遡って下げない
 * ——古い保存には作者問の記録も混ざっており、それを段3 の天井（55）へ巻き込むと
 * **作者の習熟度が 100 へ届かなくなる。**
 */
const withRung = (rung: number | null, count: number, itemKey = 'p001:text') =>
  numberedEvents('free-input', count, itemKey).map((item) => ({ ...item, rung }));

test('段の天井: 段3の自由入力は 55 で止まる（方式の天井 90 より低い）', () => {
  assert.equal(computeMastery(withRung(3, 40)).scores['p001:text'], 55);
});

test('段の天井: 段が上がるほど高くまで行ける', () => {
  assert.equal(computeMastery(withRung(4, 40)).scores['p001:text'], 70);
  assert.equal(computeMastery(withRung(5, 40)).scores['p001:text'], 80);
  assert.equal(computeMastery(withRung(6, 40)).scores['p001:text'], 90);
});

test('段の天井: 段8は点を動かさない', () => {
  // 点ではなく「完全制覇」の印で表す（依頼者裁定——`clamp` を触らない）。
  assert.equal(computeMastery(withRung(8, 40)).scores['p001:text'] ?? 0, 0);
});

test('段の天井: 易しい方式では段の天井まで行けない', () => {
  // **抜け道を塞ぐ。** 選択式で一首まるまるを当てた人を 100 にしない。
  const choice = numberedEvents('choice', 40).map((item) => ({ ...item, rung: 7 }));
  assert.equal(computeMastery(choice).scores['p001:text'], 65, '方式の天井 65 を超えている');
});

test('段の天井: 段7の自由入力なら、別の日に 100 へ届く', () => {
  const day1 = withRung(7, 12);
  const day2 = Array.from({ length: 6 }, (_, index) => ({
    ...event({ eventId: `later-${index}`, questionId: `later-q${index}`, localDate: '2026-09-02' }), rung: 7,
  }));
  assert.equal(computeMastery([...day1, ...day2]).scores['p001:text'], 100);
});

test('段の天井: 段を持たないイベントは従来どおり（過去の点を遡って下げない）', () => {
  // 欄の無い古い保存。**段3 とみなすと、作者問まで 55 に巻き込まれる。**
  assert.equal(computeMastery(numberedEvents('free-input', 40)).scores['p001:text'], 90);
  const author = numberedEvents('free-input', 40, 'p001:author');
  assert.equal(computeMastery(author).scores['p001:author'], 90);
});

test('段の天井: 作者問（段 null）は本文の段に巻き込まれない', () => {
  assert.equal(computeMastery(withRung(null, 40, 'p001:author')).scores['p001:author'], 90);
});

test('段の天井: 段6で 90 に達しても、その先へは行かせない', () => {
  /*
   * **この 1 本が「90 の先の上限」を押さえている。**
   * 段7 で測ると、その段の天井（100）と 90 超えの定数（100）が同じ値になり、
   * **上限を常に 100 にする破壊を捕まえられない**（2026-09-15 の破壊試験で実測）。
   * 天井が 90 の段で測って初めて割れる。
   */
  const day1 = withRung(6, 12);
  const day2 = Array.from({ length: 6 }, (_, index) => ({
    ...event({ eventId: `later-${index}`, questionId: `later-q${index}`, localDate: '2026-09-02' }), rung: 6,
  }));
  assert.equal(computeMastery([...day1, ...day2]).scores['p001:text'], 90, '段6の天井を越えている');
});
