import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHistory } from '../../packages/hyakunin/src/domain/history.ts';
import type { Event } from '../../packages/shared/src/domain/event.ts';

/**
 * 2026-09-16・依頼者。**記録の一覧を 10 首ごとのまとまりで見せる。**
 *
 * 100 行の平坦な一覧は、どこを練習したのかが読み取れない。
 * **まとまりの平均をひとつの輪で出す**ので、集計は画面ではなくここで作る
 * ——画面で足し算を書くと、試験が「表示されている数字」しか見なくなる。
 */
const poemIds = Array.from({ length: 100 }, (_, index) => `p${String(index + 1).padStart(3, '0')}`);
const correct = (poemId: string, index: number): Event => ({
  eventId: `e${poemId}-${index}`, product: 'hyakunin', poemId, questionId: `${poemId}-q${index}`,
  sessionId: `s${poemId}-${index}`, itemKey: `${poemId}:text`, kind: 'answer', method: 'free-input',
  outcome: 'correct', hintUsed: false, effectiveMethod: 'free-input', delta: 9, rung: 6,
  localDate: new Date(Date.UTC(2026, 6, 1 + index)).toISOString().slice(0, 10), sameSessionRepeat: false,
  appVersion: 'x', dataVersion: 1, masteryRulesVersion: 1,
});

test('まとまり: 100 首を 10 首ずつ 10 個に分ける', () => {
  const summary = summarizeHistory({ events: [], poemIds });
  assert.equal(summary.groups.length, 10);
  assert.deepEqual(summary.groups.map((group) => [group.from, group.to]).slice(0, 2), [[1, 10], [11, 20]]);
  assert.deepEqual(summary.groups.at(-1)?.entries.map((entry) => entry.cardNo).slice(0, 2), [91, 92]);
});

test('まとまり: 輪の割合は、その 10 首の習熟度の平均である', () => {
  // 1番だけを解く。**1 首ぶんの伸びが 10 首のまとまりを埋め尽くしてはいけない。**
  const events = Array.from({ length: 10 }, (_, index) => correct('p001', index));
  const summary = summarizeHistory({ events, poemIds });
  const first = summary.groups[0]!;
  assert.equal(first.entries[0]?.percent, 72, '1番の習熟度（本文90×0.8）が変わっている');
  assert.equal(first.percent, 7, '10 首の平均になっていない');
  assert.equal(summary.groups[1]?.percent, 0);
});

test('まとまり: 輪の色は平均から決める', () => {
  const events = poemIds.slice(0, 10).flatMap((poemId) => Array.from({ length: 10 }, (_, index) => correct(poemId, index)));
  const summary = summarizeHistory({ events, poemIds });
  assert.equal(summary.groups[0]?.percent, 72);
  assert.equal(summary.groups[0]?.color, 'blue', '72% は青である');
  assert.equal(summary.groups[1]?.color, 'gray', '0% は灰である');
});

test('まとまり: 首数が 10 で割り切れなくても、余りを落とさない', () => {
  const summary = summarizeHistory({ events: [], poemIds: poemIds.slice(0, 25) });
  assert.deepEqual(summary.groups.map((group) => group.entries.length), [10, 10, 5]);
  assert.deepEqual(summary.groups.at(-1)?.entries.map((entry) => entry.cardNo), [21, 22, 23, 24, 25]);
});
