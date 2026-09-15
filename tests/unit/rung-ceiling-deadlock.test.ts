import test from 'node:test';
import assert from 'node:assert/strict';
import { autoRungFor, planQuestions, rungRecordFor } from '../../packages/hyakunin/src/domain/entry.ts';
import { FLAG_RUNG, rungProgress } from '../../packages/shared/src/domain/mastery/rungs.ts';
import { computeMastery } from '../../packages/shared/src/domain/mastery/compute.ts';
import { buildEvent } from '../../packages/hyakunin/src/domain/record.ts';
import type { PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';

/**
 * 2026-09-15・**頭打ちの行き止まり**（利用者からの報告・実測で再現）。
 *
 * 段の梯子を後から入れたので、**すでに段の天井より上にいる学習者は加算が 0 になる。**
 * 本文 81 の学習者に段3（天井55）・段4（70）・段5（80）を配ると、20 問正解しても 81 のままである。
 * `openRung` は「制覇」でしか上がらないので、**点も段も動かない。**
 *
 * > 自動は「点が入る一番下の段」を配る（依頼者裁定・2026-09-15）。
 * > 段は歌ごとに決まる。範囲の平均では決めない。
 *
 * **易しい段を捨てるのではない。** 自動が黙って配らないだけで、
 * 「やさしくする」で自分から取りに行ける（点は入らないが制覇は進む）。
 */
function question(rung: number | null, poemId = 'p001'): PublishedQuestion {
  return {
    questionId: `${poemId}-blank-r${rung}`, poemId, skill: 'text', type: 'blank',
    blankUnit: 'ku', blankedKu: [1], rung, prompt: '問題', answer: '漢字', answerHistorical: 'れきしてき', answerModern: 'げんだい', acceptedAnswers: ['れきしてき'], partialAnswers: ['げんだい'], candidates: [], normalization: 'kana', sourceRef: 'source', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'reviewer', confirmedOn: '2026-09-01', proposedBy: 'human', batchEvidenceRef: null,
  };
}
/** 段1〜8 を持つ歌。段3 を制覇していない＝自動の位置は段3。 */
const ladder = [1, 2, 3, 4, 5, 6, 7, 8].map((rung) => question(rung));
const catalogue = ladder.map((item) => ({ questionId: item.questionId, poemId: item.poemId, rung: item.rung }));
const atRungThree = rungProgress([
  { questionId: 'p001-blank-r1', outcome: 'correct' }, { questionId: 'p001-blank-r2', outcome: 'correct' },
], catalogue);

test('行き止まり: 前提——制覇していない一番下の段は段3である', () => {
  assert.equal(atRungThree.get('p001')?.openRung, 3);
});

test('行き止まり: 天井が習熟度以下の段は自動では配らない', () => {
  // 段3(55)・段4(70)・段5(80) はどれも 81 では 1 点も入らない。段6(90) から配る。
  assert.equal(autoRungFor('p001', atRungThree, { 'p001:text': 81 }), 6);
});

test('行き止まり: 習熟度が低ければ、これまでどおり一番下の段から配る', () => {
  assert.equal(autoRungFor('p001', atRungThree, { 'p001:text': 0 }), 3);
  assert.equal(autoRungFor('p001', atRungThree, {}), 3, '得点を渡さない呼び出しの意味を変えない');
  assert.equal(autoRungFor('p001', atRungThree, { 'p001:text': 54 }), 3, '天井 55 にまだ余地がある');
});

test('行き止まり: 天井に届いた段は次へ送る', () => {
  assert.equal(autoRungFor('p001', atRungThree, { 'p001:text': 55 }), 4, '天井ちょうどでは加算が 0 である');
});

test('行き止まり: 一番上の段より先へは送らない', () => {
  // 段8 は点を動かさない段なので、天井では測れない。ここで打ち止めにする。
  assert.equal(autoRungFor('p001', atRungThree, { 'p001:text': 100 }), FLAG_RUNG);
});

test('行き止まり: 作者の得点では段を送らない', () => {
  assert.equal(autoRungFor('p001', atRungThree, { 'p001:author': 100 }), 3);
});

test('行き止まり: 出題も送った段になる', () => {
  const plan = planQuestions('learn', ladder, [1], 'seed', 'number', true, { 'p001:text': 81 }, atRungThree);
  assert.deepEqual([...new Set(plan.map((item) => item.rung))], [6], '点の入らない段を配っている');
});

test('行き止まり: やさしくすれば、点が入らない下の段も練習できる', () => {
  const plan = planQuestions('learn', ladder, [1], 'seed', 'number', true, { 'p001:text': 81 }, atRungThree, 1);
  assert.deepEqual([...new Set(plan.map((item) => item.rung))], [5], '下げても送った段のままである');
});

test('行き止まり: 自動で送った段には手動の印を付けない', () => {
  // 印を付けると記録の段が自動の位置へ落ち、**天井が開かないまま**になる。
  const record = rungRecordFor(question(6), atRungThree, { 'p001:text': 81 });
  assert.equal(record.raised, undefined, '自動で配った段に手動の印が付いている');
  assert.equal(record.rung, 6, '天井が開かない段で記録している');
});

test('行き止まり: 送った段のさらに 2 段上までは手動で挑める', () => {
  const record = rungRecordFor(question(8), atRungThree, { 'p001:text': 81 });
  assert.equal(record.raised, true);
  assert.equal(record.rung, 6, '上げて挑んだ段の天井が開いている');
});

test('行き止まり: 直したあとは、20 問正解すれば習熟度が動く', () => {
  // **点が動くことを、採点まで通して確かめる。** 段を選ぶところだけ見ても、報告は再現しない。
  const served = autoRungFor('p001', atRungThree, { 'p001:text': 81 });
  const day = (index: number) => new Date(Date.UTC(2026, 8, 16 + index)).toISOString().slice(0, 10);
  const events = Array.from({ length: 20 }, (_, index) => buildEvent({
    ...rungRecordFor(question(served), atRungThree, { 'p001:text': 81 }),
    eventId: `e${index}`, product: 'hyakunin', poemId: 'p001', questionId: `p001-blank-r${served}-${index}`,
    sessionId: `s${index}`, itemKey: 'p001:text', kind: 'answer', method: 'free-input', hintUsed: false,
    judgement: 'correct', currentScore: 0, sameSessionRepeat: false, localDate: day(index), appVersion: 'x', dataVersion: 1,
  }));
  assert.ok(computeMastery(events).scores['p001:text']! > 81, '配った段でも点が入らない');
});

test('行き止まり: 送った段の問題がその歌に無ければ、あるうちで一番近い下の段を出す', () => {
  // **歌を出題から消さない。** 目録がそろっていない歌（試験用の目録・将来の追加途中）で、
  // 送り先の段が無いと `planQuestions` の絞り込みが空になり、その歌だけ 1 問も出なくなる。
  const sparse = [question(1), question(2)];
  const sparseProgress = rungProgress([], sparse.map((item) => ({ questionId: item.questionId, poemId: item.poemId, rung: item.rung })));
  const plan = planQuestions('learn', sparse, [1], 'seed', 'number', true, { 'p001:text': 81 }, sparseProgress);
  assert.ok(plan.length > 0, 'その歌が出題から消えている');
  assert.deepEqual([...new Set(plan.map((item) => item.rung))], [2], 'あるうちで一番高い段を出していない');
});
