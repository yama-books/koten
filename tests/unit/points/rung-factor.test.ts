import test from 'node:test';
import assert from 'node:assert/strict';
import { pointsFor, rungPointFactor, RUNG_POINT_FACTOR, ATTEMPT_POINTS } from '../../../packages/shared/src/domain/points/compute.ts';
import { FLAG_RUNG, LOWEST_RUNG } from '../../../packages/shared/src/domain/mastery/rungs.ts';
import { event } from '../mastery/fixtures.ts';

/**
 * 2026-09-15・依頼者。**難しい段ほど、ポイントが少し高くつく。**
 *
 * これまで基礎点は方式（自由入力14・選択式10…）だけで決まり、**段を見ていなかった**
 * ——一句を書くのも一首まるごと書くのも同じ14点だった。
 *
 * **分量の比そのままにはしない。** 段7 は段3 の5倍を書くが、係数は 2.2 に圧縮する
 * ——弱点倍率を 2 倍で止めたのと同じ理由で、開きすぎると易しい復習が「損」に感じられる。
 *
 * **易しい段が罰にならないことも確かめる。** 段1 を解くのはたいてい習熟度の低い学習者で、
 * そちらは弱点倍率（最大2.0）が効く。
 */
const earned = (rung: number | null, score = 81) => pointsFor(event({ method: 'free-input', effectiveMethod: 'free-input', outcome: 'correct', rung }), score, false);

test('段の係数: 段3 を基準の 1.0 として、上へ行くほど大きい', () => {
  assert.equal(RUNG_POINT_FACTOR[3], 1);
  for (let rung = LOWEST_RUNG; rung < FLAG_RUNG; rung += 1) {
    assert.ok(RUNG_POINT_FACTOR[rung]! < RUNG_POINT_FACTOR[rung + 1]!, `段${rung} と段${rung + 1} が逆転している`);
  }
  assert.equal(Object.keys(RUNG_POINT_FACTOR).length, FLAG_RUNG, '段が欠けている');
});

test('段の係数: 開きは 2.5 倍までに収める', () => {
  const values = Object.values(RUNG_POINT_FACTOR);
  assert.ok(Math.max(...values) / Math.min(...values) <= 4, '易しい段が罰になるほど開いている');
  assert.ok(Math.max(...values) <= 2.5);
});

test('段の係数: 難しい段のほうが高くつく', () => {
  assert.ok(earned(7) > earned(3), '一首まるごとが一句と同じかそれ以下である');
  assert.ok(earned(3) > earned(1));
});

test('段の係数: 段8（習熟度が動かない段）が一番高い', () => {
  // **ポイントだけが報酬になる段である。** ここを低くすると、完全制覇へ挑む理由が無くなる。
  assert.equal(rungPointFactor(FLAG_RUNG), Math.max(...Object.values(RUNG_POINT_FACTOR)));
});

test('段の係数: 作者問（段を持たない）はこれまでどおり', () => {
  assert.equal(rungPointFactor(null), 1);
  assert.equal(rungPointFactor(undefined), 1, '段を持たない古いイベントの点を動かさない');
});

test('段の係数: 易しい段でも、習熟度が低ければ損しない', () => {
  // 弱点倍率（最大2.0）のほうが強い。**初学者の易しい段が、上級者の易しい段より安くならない。**
  assert.ok(earned(1, 0) > earned(1, 81));
  assert.ok(earned(1, 0) > earned(3, 81), '初学者が段1 を解くと、上級者の段3 より安い');
});

test('段の係数: 誤答の点には掛けない', () => {
  // **当てずっぽうが得にならないようにする。** 難しい段で外しても 3 点のままである。
  const wrong = (rung: number) => pointsFor(event({ method: 'free-input', effectiveMethod: 'free-input', outcome: 'incorrect', rung }), 0, false);
  assert.equal(wrong(8), wrong(3));
  assert.equal(wrong(8), Math.round(ATTEMPT_POINTS * 2), '弱点倍率までは効いてよい');
});
