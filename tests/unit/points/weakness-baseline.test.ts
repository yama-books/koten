import test from 'node:test';
import assert from 'node:assert/strict';
import { computePoints } from '../../../packages/shared/src/domain/points/compute.ts';
import type { Event } from '../../../packages/shared/src/domain/event.ts';

/**
 * 2026-09-15・依頼者。**易しい段で回すほうが得、という逆転を消す。**
 *
 * 弱点倍率は「解く前の習熟度」で決まる（習熟度0で2.0・100で1.0）。
 * **点が入る段で解くと、その回の途中で習熟度が上がり、倍率がその場で下がる。**
 * 一方、天井で止まっている易しい段では倍率が高いまま維持される
 * ——**同じ10問で、易しい段 170 点・難しい段 152 点**（2026-09-15 実測）。
 *
 * > 復習に罰を与えるのはこの教材では逆効果である（`MAX_WEAKNESS_MULTIPLIER` の注記）。
 *
 * **倍率はその回の初めの習熟度で決める。** 回の途中で伸びたぶんを、その回の点から差し引かない。
 */
const day = (index: number) => new Date(Date.UTC(2026, 5, 1 + index)).toISOString().slice(0, 10);
const answer = (index: number, extra: Partial<Event> = {}): Event => ({
  eventId: `e${String(index).padStart(4, '0')}`, product: 'hyakunin', poemId: 'p001', questionId: `q${index}`,
  sessionId: 'now', itemKey: 'p001:text', kind: 'answer', method: 'free-input', outcome: 'correct',
  hintUsed: false, effectiveMethod: 'free-input', delta: 9, localDate: day(index), sameSessionRepeat: false,
  appVersion: 'x', dataVersion: 1, masteryRulesVersion: 1, ...extra,
});
/** 段が入る前の記録で本文 81 まで積んだ学習者（報告された状態）。 */
const past = Array.from({ length: 9 }, (_, index) => answer(index, { sessionId: `past-${index}` }));
const session = (rung: number) => computePoints([...past, ...Array.from({ length: 10 }, (_, index) => answer(100 + index, { rung }))]).bySession['now']!;

test('弱点倍率: 天井で止まる易しい段のほうが得、という逆転が無い', () => {
  const easy = session(3); // 天井 55。習熟度は 81 のまま動かない
  const hard = session(6); // 天井 90。この回で 81 → 90 まで伸びる
  assert.ok(hard >= easy, `難しい段のほうが少ない（易しい ${easy} 点 / 難しい ${hard} 点）`);
});

test('弱点倍率: 同じ回の中では、途中で習熟度が伸びても倍率が変わらない', () => {
  // 1 問ごとに点が違うと、**先に解いた問題ほど得**になり、解く順で総取得点が変わる。
  const events = [...past, ...Array.from({ length: 10 }, (_, index) => answer(100 + index, { rung: 6 }))];
  const total = computePoints(events).bySession['now']!;
  assert.equal(total % 10, 0, `1 問あたりが揃っていない（合計 ${total} 点）`);
});

test('弱点倍率: 回をまたげば、上がった習熟度が次の回の倍率に効く', () => {
  // **固定するのはその回の中だけである。** ずっと固定すると、強くなった歌がいつまでも高倍率になる。
  const climbed = [...past, ...Array.from({ length: 10 }, (_, index) => answer(100 + index, { rung: 6 }))];
  const first = computePoints(climbed).bySession['now']!;
  const later = computePoints([...climbed, ...Array.from({ length: 10 }, (_, index) => answer(200 + index, { rung: 6, sessionId: 'later' }))]).bySession['later']!;
  assert.ok(later < first, `習熟度が上がったのに倍率が下がっていない（${first} → ${later}）`);
});
