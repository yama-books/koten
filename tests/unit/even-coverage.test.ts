import test from 'node:test';
import assert from 'node:assert/strict';
import { planQuestions } from '../../packages/hyakunin/src/domain/entry.ts';
import type { PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';

/**
 * 2026-09-15・依頼者。**指定の難しさの中で、まんべんなく出す。**
 *
 * 段の移行は「制覇」——その段の問題を全部一度は正解すること——で起きる。
 * **同じ句ばかり出ると、何回解いても制覇が進まず、段が上がらない。**
 * まだ正解していない問題を先に出す。
 *
 * **正解済みを捨てるのではない。** その段を全部正解し終えた歌では、これまでどおり出す
 * ——捨てると、制覇済みの段に居る歌が 1 問も出なくなる。
 */
function ku(index: number, poemId = 'p001'): PublishedQuestion {
  return {
    questionId: `${poemId}-blank-ku${index}`, poemId, skill: 'text', type: 'blank',
    blankUnit: 'ku', blankedKu: [index], rung: 3, prompt: '問題', answer: '漢字', answerHistorical: 'れきしてき', answerModern: 'げんだい', acceptedAnswers: ['れきしてき'], partialAnswers: ['げんだい'], candidates: [], normalization: 'kana', sourceRef: 'source', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'reviewer', confirmedOn: '2026-09-01', proposedBy: 'human', batchEvidenceRef: null,
  };
}
const fiveKu = [1, 2, 3, 4, 5].map((index) => ku(index));
/** 段3 を配るだけの進み具合（段1・2 の問題を持たない歌は通り抜ける）。 */
const plan = (answered: string[], seed = 'seed') =>
  planQuestions('learn', fiveKu, [1], seed, 'number', true, {}, new Map(), 0, new Set(answered));

test('まんべんなく: 前提——同じ種で同じ問題が選ばれる（選び方は種で決まる）', () => {
  assert.equal(plan([])[0]?.questionId, plan([])[0]?.questionId);
  assert.ok(plan([]).length > 0, '1 問も出ていないのでは検査にならない');
});

test('まんべんなく: まだ正解していない問題を先に出す', () => {
  // **同じ種のまま**正解済みを増やして、選ばれる問題が正解済みを外れることを見る。
  const first = plan([])[0]!.questionId;
  const second = plan([first])[0]!.questionId;
  assert.notEqual(second, first, '正解済みの問題をまた出している');
  const third = plan([first, second])[0]!.questionId;
  assert.ok(![first, second].includes(third), '正解済みの問題をまた出している');
});

test('まんべんなく: 4 問正解済みなら、残りの 1 問が出る', () => {
  const answered = fiveKu.slice(0, 4).map((question) => question.questionId);
  assert.equal(plan(answered)[0]?.questionId, fiveKu[4]!.questionId);
});

test('まんべんなく: 全部正解済みでも、これまでどおり出す', () => {
  // 捨てると、制覇済みの段に居る歌が 1 問も出なくなる。
  const answered = fiveKu.map((question) => question.questionId);
  assert.ok(plan(answered).length > 0, '正解済みばかりの歌が出題から消えている');
});

test('まんべんなく: 渡さなければこれまでどおり選ぶ', () => {
  assert.equal(planQuestions('learn', fiveKu, [1], 'seed')[0]?.questionId, plan([])[0]?.questionId);
});
