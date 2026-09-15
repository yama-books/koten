import test from 'node:test';
import assert from 'node:assert/strict';
import { RUNG_RAISE_LIMIT, rangeAutoRung, canEase, canHarden, effectiveRung, planQuestions, rungRecordFor } from '../../packages/hyakunin/src/domain/entry.ts';
import { FLAG_RUNG, LOWEST_RUNG, rungProgress } from '../../packages/shared/src/domain/mastery/rungs.ts';
import { computeMastery } from '../../packages/shared/src/domain/mastery/compute.ts';
import { buildEvent } from '../../packages/hyakunin/src/domain/record.ts';
import type { PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';

/**
 * 2026-09-15・発注086。**難度の手動調整。**
 *
 * > 手動が勝つ。自動は提案するだけで、勝手に動かさない（D-16・依頼者裁定）。
 * > 挑戦は自由。天井は制覇で開く（D-17・依頼者裁定）。
 *
 * **＋が易しく、−が難しい。** 実効の段 = `clamp(openRung - adjust, 一番下, min(openRung + 2, 一番上))`。
 */
function question(cardNo: number, rung: number | null = 3): PublishedQuestion {
  return {
    questionId: `p${String(cardNo).padStart(3, '0')}-blank-r${rung}`, poemId: `p${String(cardNo).padStart(3, '0')}`, skill: 'text', type: 'blank',
    blankUnit: 'ku', blankedKu: [1], rung, prompt: '問題', answer: '漢字', answerHistorical: 'れきしてき', answerModern: 'げんだい', acceptedAnswers: ['れきしてき'], partialAnswers: ['げんだい'], candidates: [], normalization: 'kana', sourceRef: 'source', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'reviewer', confirmedOn: '2026-09-01', proposedBy: 'human', batchEvidenceRef: null,
  };
}

test('調整: 上げられるのは自動の位置の 2 段上までである', () => assert.equal(RUNG_RAISE_LIMIT, 2));

// **§4.4 の検算表をそのまま釘にする**（2026-09-15・親担当が上限の抜けを見つけた表である）。
for (const [openRung, adjust, expected, why] of [
  [1, 1, 1, '一番下より下へ行けない'],
  [1, 99, 1, 'いくつ下げても一番下で止まる'],
  [1, -5, 3, 'いくつ上げても ＋2 で止まる'],
  [3, 1, 2, '1 段易しくなる'],
  [3, -2, 5, '＋2 までは上げられる'],
  [3, -5, 5, 'いくつ上げても ＋2 で止まる'],
  [8, 3, 5, '一番上からでも下げられる'],
  [8, -1, 8, '**一番上で止まる**。存在しない段9 を出さない'],
] as const) {
  test(`調整: openRung=${openRung} で adjust=${adjust} なら実効は ${expected}（${why}）`, () => {
    assert.equal(effectiveRung(openRung, adjust), expected);
  });
}

test('調整: 一番下の段に居るとき「やさしくする」は押せない', () => {
  assert.equal(canEase(3, 0), true);
  assert.equal(canEase(3, 2), false, '実効が一番下なのに、まだ下げられる');
  assert.equal(canEase(LOWEST_RUNG, 0), false);
});

test('調整: ＋2 に居るとき「むずかしくする」は押せない', () => {
  // **自動の位置では押せる。** 押せなければ「挑戦は自由」（D-17）が画面から消える。
  assert.equal(canHarden(3, 0), true);
  assert.equal(canHarden(3, -2), false, '＋2 を超えて上げられる');
  assert.equal(canHarden(FLAG_RUNG, 0), false, '一番上から上げられる');
});

/**
 * 段1〜4 を持つ歌。自動の位置は段1（何も解いていない）。
 * **段4 を置く。** 置かないと段4 以上が空になって通り抜け、段1〜3 を制覇した学習者の
 * 自動の位置が段8 になる——上げの釘が、実装に関わらず緑になってしまう。
 */
const ladder = [question(1, 1), question(1, 2), question(1, 3), question(1, 4)];
const progressOf = (ids: string[]) => rungProgress(ids.map((questionId) => ({ questionId, outcome: 'correct' })), ladder.map((item) => ({ questionId: item.questionId, poemId: item.poemId, rung: item.rung })));
const servedRungs = (adjust: number, cleared: string[] = []) => [...new Set(planQuestions('learn', ladder, [1], 'seed', 'number', true, {}, progressOf(cleared), adjust).map((item) => item.rung))];

test('出題: 1 段下げると、配られる段が 1 つ下がる', () => {
  assert.deepEqual(servedRungs(0, ['p001-blank-r1']), [2], '前提が崩れている（自動の位置が段2 でない）');
  assert.deepEqual(servedRungs(1, ['p001-blank-r1']), [1]);
});

test('出題: いくつ下げても一番下の段より下へは行かない', () => {
  assert.deepEqual(servedRungs(99, ['p001-blank-r1']), [LOWEST_RUNG]);
});

test('出題: いくつ上げても自動の位置の 2 段上を超えない', () => {
  assert.deepEqual(servedRungs(-1), [2]);
  assert.deepEqual(servedRungs(-2), [3]);
  assert.deepEqual(servedRungs(-99), [3], '＋2 を超えた段が配られている');
});

test('出題: 調整を渡さなければ自動の位置のままである', () => {
  assert.deepEqual(servedRungs(0), [LOWEST_RUNG]);
  assert.deepEqual([...new Set(planQuestions('learn', ladder, [1], 'seed', 'number', true, {}, progressOf([])).map((item) => item.rung))], [LOWEST_RUNG]);
});

/**
 * **手で上げて挑んだ記録には印を付け、天井は自動の位置のものを使う**（§4.1・§4.3）。
 * 開けてしまうと、段1・2・3 を 1 問も制覇せずに段5 で 80 まで行ける。
 */
test('記録: 上げて挑んだ問題には印が付き、天井は自動の位置の段になる', () => {
  const record = rungRecordFor(question(1, 5), progressOf(['p001-blank-r1', 'p001-blank-r2', 'p001-blank-r3']));
  assert.equal(record.raised, true, '上げて挑んだ印が付いていない');
  assert.equal(record.rung, 4, '天井が上げた先の段になっている');
});

test('記録: 自動の位置の問題には印を付けない', () => {
  const record = rungRecordFor(question(1, 1), progressOf([]));
  assert.equal(record.raised, undefined, '既定値を保存に書き込んでいる');
  assert.equal(record.rung, 1);
});

test('記録: 下げて解いた問題には印を付けず、段はその問題のものになる', () => {
  const record = rungRecordFor(question(1, 1), progressOf(['p001-blank-r1']));
  assert.equal(record.raised, undefined);
  assert.equal(record.rung, 1, '下げた先より高い段で記録している');
});

test('記録: 作者問は段を持たない', () => {
  assert.equal(rungRecordFor(question(1, null), progressOf([])).rung, null);
});

test('記録: 上げて挑んで正解しても、天井は自動の位置の段で止まる', () => {
  // 段3 の学習者が段5 で正解しても、習熟度は 55 で止まる（受入条件 5d）。
  const atRungThree = progressOf(['p001-blank-r1', 'p001-blank-r2']);
  assert.equal(atRungThree.get('p001')?.openRung, 3, '前提が崩れている（自動の位置が段3 でない）');
  const events = Array.from({ length: 40 }, (_, index) => buildEvent({
    ...rungRecordFor(question(1, 5), atRungThree),
    eventId: `event-${index}`, product: 'hyakunin', poemId: 'p001', questionId: `p001-blank-r5-${index}`, sessionId: 'session-1',
    itemKey: 'p001:text', kind: 'answer', method: 'free-input', hintUsed: false, judgement: 'correct', currentScore: 0,
    sameSessionRepeat: false, localDate: '2026-09-15', appVersion: '0.1.0', dataVersion: 1,
  }));
  assert.equal(events[0]?.raised, true, '印がイベントへ載っていない');
  // 満額で伸びるのは 55 まで。そこから先は微増（+0.2／問）だけで、段5 の天井 80 には遠い。
  assert.ok(computeMastery(events).scores['p001:text']! < 62, '上げて挑んだ段の天井が開いている');
  assert.equal(computeMastery(events.slice(0, 7)).scores['p001:text'], 55, '満額の止まり位置が動いている');
});

test('境界: 範囲の自動の位置は、その中で一番低い段である', () => {
  // **画面には出さない**（依頼者・2026-09-15）。ボタンを押せるかどうかの判定にだけ使う。
  // 高いほうを採ると、いちばん易しい歌がまだ下げられるのに「やさしくする」が押せなくなる。
  const mixed = new Map([
    ['p001', { cleared: [1, 2], openRung: 3, conquered: false }],
    ['p002', { cleared: [1], openRung: 2, conquered: false }],
  ]);
  assert.equal(rangeAutoRung({ from: 1, to: 2 }, mixed), 2);
  assert.equal(rangeAutoRung({ from: 1, to: 1 }, mixed), 3);
  assert.equal(rangeAutoRung({ from: 1, to: 3 }, mixed), LOWEST_RUNG, '記録の無い歌が混ざれば一番下である');
});
