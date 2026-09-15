import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import { CAPPED_PRACTICE_STEPS, MASTERY_RULES } from '../../../packages/shared/src/domain/mastery/rules.v1.ts';
import { RUNG_CAPS } from '../../../packages/shared/src/domain/mastery/rungs.ts';
import type { Event } from '../../../packages/shared/src/domain/event.ts';

/**
 * 2026-09-15・依頼者裁定。**天井で止まっている段を練習しても、わずかには伸びる。**
 *
 * > 中くらいまでの段階なら 1 回（10問）で 1〜2%。段階が上がるにつれて圧縮され、
 * > 90% を超えるとかなり上がりにくくなる。
 *
 * **通常の伸び（自由入力 +9／問）とは一桁違う。** 易しい段で稼ぐ道にはしない
 * ——段1 だけで 90% に届くには約 600 問（60 回）かかる。
 *
 * **上限は方式の天井**（自由入力90・選択式65）。段の天井は超えるが、方式の天井は超えない。
 */
const day = (index: number) => new Date(Date.UTC(2026, 5, 1 + index)).toISOString().slice(0, 10);
const answer = (index: number, extra: Partial<Event> = {}): Event => ({
  eventId: `e${String(index).padStart(4, '0')}`, product: 'hyakunin', poemId: 'p001', questionId: `q${index}`,
  sessionId: `s${index}`, itemKey: 'p001:text', kind: 'answer', method: 'free-input', outcome: 'correct',
  hintUsed: false, effectiveMethod: 'free-input', delta: 9, localDate: day(index), sameSessionRepeat: false,
  appVersion: 'x', dataVersion: 1, masteryRulesVersion: 1, ...extra,
});
/**
 * 段の天井**ちょうど**まで積んでから、その段を練習し続ける。
 *
 * **下地を多めに積んではいけない。** 余った分がそのまま微増を始めてしまい、
 * 「何問で何%」を測っているつもりが別のものを測ることになる（2026-09-15 に実際に踏んだ）。
 */
const practise = (rung: number, count: number, extra: Partial<Event> = {}) => {
  const method = extra.effectiveMethod ?? 'free-input';
  const ceiling = Math.min(MASTERY_RULES[method].cap, RUNG_CAPS[rung] ?? 0);
  const fill = Array.from({ length: Math.ceil(ceiling / MASTERY_RULES[method].increment) }, (_, index) => answer(index, { rung, ...extra }));
  const more = Array.from({ length: count }, (_, index) => answer(100 + index, { rung, ...extra }));
  return computeMastery([...fill, ...more]).scores['p001:text'] ?? 0;
};

test('微増: 刻みは 3 段階で、上へ行くほど小さい', () => {
  assert.deepEqual(CAPPED_PRACTICE_STEPS.map((row) => row.step), [0.2, 0.1, 0.05]);
  assert.deepEqual(CAPPED_PRACTICE_STEPS.map((row) => row.below), [60, 80, 90]);
});

test('微増: 段2（天井40）で止まったあと、1 回（10問）で 2% 伸びる', () => {
  // 40% の帯は +0.2／問。**表示は切り捨てなので、1 回で 2% 動く。**
  assert.equal(Math.trunc(practise(2, 0)), 40, '前提が崩れている（段2 の天井は 40）');
  assert.equal(Math.trunc(practise(2, 10)), 42);
});

test('微増: 段3（天井55）で止まったあと、1 回で 2%・その先は 1% に圧縮される', () => {
  assert.equal(Math.trunc(practise(3, 0)), 55);
  assert.equal(Math.trunc(practise(3, 10)), 57, '60 未満は +0.2／問');
  // 55 から 60 までは +0.2（25問）。そこから +0.1 へ落ちるので、30 問では 60.5 にしかならない。
  assert.equal(Math.trunc(practise(3, 30)), 60, '60 を超えると +0.1／問へ落ちる');
  assert.equal(Math.trunc(practise(3, 50)), 62, '圧縮後は 1 回で 1%');
});

test('微増: 90 に届いたら、易しい段の練習では 1 も動かない', () => {
  // **90 を超えられるのは「日をまたいで完成方式で解き続ける」既存の経路だけ**である。
  // 易しい段の練習でそこを越えさせると、自由入力の天井 90 そのものが崩れる。
  assert.equal(Math.trunc(practise(6, 0)), 90);
  assert.equal(practise(6, 400), 90, '易しい段の練習で 90 を超えている');
});

test('微増: 方式の天井は超えない', () => {
  // 段1（天井25）を延々と解いても、自由入力の天井 90 で止まる。
  assert.equal(practise(1, 2000), MASTERY_RULES['free-input'].cap);
});

test('微増: 選択式は選択式の天井で止まる', () => {
  const choice = { method: 'choice' as const, effectiveMethod: 'choice' as const };
  assert.equal(practise(7, 2000, choice), MASTERY_RULES.choice.cap, '選択式で 65 を超えている');
});

test('微増: 易しい段だけで 90% に届くには 575 問（約58回）かかる', () => {
  // **稼ぐ道にしない。** 通常は段6 を 1 問解けば 81→90 である。
  // 25→60 が 175 問（+0.2）、60→80 が 200 問（+0.1）、80→90 が 200 問（+0.05）。
  assert.ok(Math.trunc(practise(1, 574)) < 90, '574 問で届いてしまう');
  assert.equal(Math.trunc(practise(1, 575)), 90);
});

test('微増: 誤答では増えない', () => {
  assert.ok(practise(3, 10, { outcome: 'incorrect' }) < 55);
});

test('微増: 天井に余地がある段では、これまでどおり満額で伸びる', () => {
  // **混ぜない。** 段の天井に届いていない間は微増の出番が無い。
  const events = Array.from({ length: 2 }, (_, index) => answer(index, { rung: 6 }));
  assert.equal(computeMastery(events).scores['p001:text'], 18, '満額（+9／問）で伸びていない');
});

test('微増: 同じ回の繰り返しは半分にする', () => {
  const repeated = Array.from({ length: 10 }, (_, index) => answer(100 + index, { rung: 3, sessionId: 'one', sameSessionRepeat: true }));
  const fill = Array.from({ length: Math.ceil(55 / 9) }, (_, index) => answer(index, { rung: 3 }));
  const score = computeMastery([...fill, ...repeated]).scores['p001:text'] ?? 0;
  assert.ok(score > 55 && score < 57, `半分になっていない（${score}）`);
});

test('微増: 段8（点を動かさない段）には微増も入れない', () => {
  // 天井を持たない段である。**微増を入れると、番号だけの段を回すだけで点が入る。**
  const events = Array.from({ length: 40 }, (_, index) => answer(index, { rung: 8 }));
  assert.equal(computeMastery(events).scores['p001:text'] ?? 0, 0);
});

test('微増: 小数を積んでも端数が溜まらない', () => {
  // **90 の境目で効く。** 89.99999999 で止まると「90 に届いた」判定が外れ、
  // その先の経路（`OVER_NINETY_INCREMENT`）が開かない。
  const fill = Array.from({ length: Math.ceil(70 / 9) }, (_, index) => answer(index, { rung: 4 }));
  const more = Array.from({ length: 100 }, (_, index) => answer(100 + index, { rung: 4 }));
  const score = computeMastery([...fill, ...more]).scores['p001:text'];
  assert.equal(score, 80, `端数が溜まっている（${score}）`);
});
