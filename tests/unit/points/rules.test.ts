import test from 'node:test';
import assert from 'node:assert/strict';
import { pointsFor, weaknessMultiplier, EARNED_POINTS, ATTEMPT_POINTS } from '../../../packages/shared/src/domain/points/compute.ts';
import { event } from '../mastery/fixtures.ts';

/**
 * 得点規則は生徒に開示しない（依頼者裁定・2026-09-09）。開示しないからこそ、
 * ここで数値を釘付けにしておかないと、誰も気付かないまま規則が変わる。
 */
test('points: 方式ごとの基礎点を固定する', () => {
  const expected = {
    view: 3, 'self-x': 3, 'self-tri': 6, 'self-o': 8,
    choice: 10, 'kanji-to-kana': 12, 'free-input': 14, 'paper-handwriting': 14,
  };
  assert.deepEqual({ ...EARNED_POINTS }, expected);
  assert.equal(ATTEMPT_POINTS, 3);
});

test('points: 誤答でも取り組んだぶんの点が入り、skippedは0', () => {
  const wrong = event({ outcome: 'incorrect', effectiveMethod: 'free-input' });
  assert.equal(pointsFor(wrong, 100, false), ATTEMPT_POINTS, '方式によらず一律であること');
  assert.ok(pointsFor(wrong, 0, false) > 0, '習熟度によらず必ず点が入ること');
  assert.ok(pointsFor(wrong, 0, false) < pointsFor(event({ outcome: 'correct', effectiveMethod: 'choice' }), 0, false) / 3 * 1.01, '選択式正答の1/3以下に抑えること');
  assert.equal(pointsFor(event({ outcome: 'skipped' }), 0, false), 0);
});

/**
 * 倍率を `pointsFor` の比で調べると、基礎点の**偶奇**で丸めがずれ、基礎点を1動かした
 * だけでこの試験まで赤くなる。倍率そのものを直接見て、基礎点の釘と絡ませない。
 */
test('points: 弱点倍率は習熟度0で2倍・100で1倍・50で1.5倍', () => {
  assert.equal(weaknessMultiplier(0), 2);
  assert.equal(weaknessMultiplier(50), 1.5);
  assert.equal(weaknessMultiplier(100), 1);
  assert.equal(weaknessMultiplier(-10), 2, '範囲外は丸め込むこと');
  assert.equal(weaknessMultiplier(150), 1, '範囲外は丸め込むこと');
});

test('points: 同一セッションの繰り返しは半分にする', () => {
  // 丸めを挟まずに比べるため、基礎点が偶数の方式を使う。前提が崩れたらここで気付く。
  assert.equal(EARNED_POINTS['free-input'] % 2, 0, '前提: この試験は偶数の基礎点を使う');
  const answer = event({ outcome: 'correct', effectiveMethod: 'free-input' });
  assert.equal(pointsFor(answer, 100, true), pointsFor(answer, 100, false) / 2);
  assert.equal(pointsFor(answer, 0, true), pointsFor(answer, 0, false) / 2);
});
