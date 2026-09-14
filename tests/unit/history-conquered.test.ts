import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeHistory } from '../../packages/hyakunin/src/domain/history.ts';
import { event } from './mastery/fixtures.ts';

/**
 * 2026-09-15・発注084。**完全制覇は点ではなく印である**（依頼者裁定）。
 * `clamp` を 100 で止めたまま、段8（番号だけ見て全部書く）を制覇した歌に印を立てる。
 */
const catalogue = [
  { questionId: 'p001-blank-ku1', poemId: 'p001', rung: 3 },
  { questionId: 'p001-blank-number', poemId: 'p001', rung: 8 },
];
const answered = (ids: string[]) => ids.map((questionId, index) => event({ eventId: `e${index}`, questionId, poemId: 'p001', itemKey: 'p001:text', outcome: 'correct' }));
const entryOf = (ids: string[]) => summarizeHistory({ events: answered(ids), poemIds: ['p001'], questions: catalogue }).entries[0]!;

test('完全制覇: 段8を制覇すると印が立つ', () => {
  assert.equal(entryOf(['p001-blank-ku1', 'p001-blank-number']).conquered, true);
});

test('完全制覇: 段8が残っていれば立たない', () => {
  assert.equal(entryOf(['p001-blank-ku1']).conquered, false);
});

test('完全制覇: 点は 100 を超えない', () => {
  // 印で表すのは `clamp` を触らないためである。触ると 5 色の表示とメーターへ波及する。
  assert.ok(entryOf(['p001-blank-ku1', 'p001-blank-number']).percent <= 100);
});

test('完全制覇: 目録を渡さなければ立たない（段が分からない）', () => {
  const summary = summarizeHistory({ events: answered(['p001-blank-ku1', 'p001-blank-number']), poemIds: ['p001'] });
  assert.equal(summary.entries[0]!.conquered, false);
});
