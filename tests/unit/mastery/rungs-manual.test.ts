import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAG_RUNG, rungProgress } from '../../../packages/shared/src/domain/mastery/rungs.ts';

/**
 * 2026-09-15・発注086。**手で難度を上げて挑んだ記録の扱い。**
 *
 * > 挑戦は自由。天井は制覇で開く（D-17・依頼者裁定）。
 *
 * **イベントからは「自動で配られた段」と「手で上げて挑んだ段」を区別できない。**
 * 印（`raised`）を 1 つ足し、**次回の自動の位置（`openRung`）には数えない。**
 * **制覇（`cleared`）には数える**——正解は正解であり、捨てない。
 */
const ladder = [
  { questionId: 'p020-blank-r1', poemId: 'p020', rung: 1 },
  { questionId: 'p020-blank-r2', poemId: 'p020', rung: 2 },
  { questionId: 'p020-blank-r3a', poemId: 'p020', rung: 3 },
  { questionId: 'p020-blank-r3b', poemId: 'p020', rung: 3 },
  // **段4 を置く。** 置かないと段4 以上が空になり、通り抜けて段8 まで制覇済みになる
  // ——「一気に開く」の釘が、実装に関わらず緑になってしまう。
  { questionId: 'p020-blank-r4', poemId: 'p020', rung: 4 },
];
const auto = (questionId: string) => ({ questionId, outcome: 'correct' as const });
const raised = (questionId: string) => ({ questionId, outcome: 'correct' as const, raised: true });

test('手動: 手で上げて解いたイベントは、次回の自動の位置を動かさない', () => {
  // 一度試しただけの段が定位置になると、**段を飛ばせてしまう。**
  const progress = rungProgress([raised('p020-blank-r3a')], ladder);
  assert.equal(progress.get('p020')?.openRung, 1, '上げて挑んだ段が定位置になっている');
});

test('手動: 印を持たない古いイベントは、これまでどおり位置を保つ', () => {
  // **移行の保護を外さない。** 外すと、段3 を制覇していない大多数の学習者が段1 へ落ちる。
  const progress = rungProgress([auto('p020-blank-r3a')], ladder);
  assert.equal(progress.get('p020')?.openRung, 3, '引き戻さない規則が壊れている');
});

test('手動: 上げて挑んだ段を全問正解すると制覇に数える', () => {
  // 正解は正解である。**ただし下が残っているので開かない。**
  const progress = rungProgress([raised('p020-blank-r3a'), raised('p020-blank-r3b')], ladder);
  assert.equal(progress.get('p020')?.cleared.includes(3), true, '飛ばして制覇した段を数えていない');
  assert.equal(progress.get('p020')?.openRung, 1, '段を飛ばして開いている');
});

test('手動: 下を埋めた瞬間に、飛ばして制覇した段まで一気に開く', () => {
  // **早めの挑戦が報われる。** 埋め直しを求めない。
  const progress = rungProgress([
    raised('p020-blank-r3a'), raised('p020-blank-r3b'), auto('p020-blank-r1'), auto('p020-blank-r2'),
  ], ladder);
  assert.deepEqual(progress.get('p020')?.cleared, [1, 2, 3]);
  assert.equal(progress.get('p020')?.openRung, 4, '制覇済みの段でもう一度止まっている');
});

test('手動: 下げて解き直しても、制覇の記録は消えない', () => {
  const cleared = [auto('p020-blank-r1'), auto('p020-blank-r2'), auto('p020-blank-r3a'), auto('p020-blank-r3b')];
  const before = rungProgress(cleared, ladder);
  const after = rungProgress([...cleared, auto('p020-blank-r1')], ladder);
  assert.deepEqual(after.get('p020')?.cleared, before.get('p020')?.cleared);
  assert.equal(after.get('p020')?.openRung, before.get('p020')?.openRung);
});

test('手動: 飛ばして段8を制覇しても、完全制覇の印は立たない', () => {
  // **完全制覇は梯子を下から埋めた印である。** 段8 だけ当てて立ててはいけない。
  const withFlag = [...ladder, { questionId: 'p020-blank-number', poemId: 'p020', rung: FLAG_RUNG }];
  const progress = rungProgress([raised('p020-blank-number')], withFlag);
  assert.equal(progress.get('p020')?.cleared.includes(FLAG_RUNG), true, '制覇として数えていない');
  assert.equal(progress.get('p020')?.conquered, false, '下を埋めていないのに完全制覇になっている');
});
