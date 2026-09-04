import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTRY_RULES, ENTRY_RULES_VERSION, isEntryAvailable, planQuestions } from '../../packages/hyakunin/src/domain/entry.ts';
import type { PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';

function question(cardNo: number, type: 'blank' | 'author' = 'blank'): PublishedQuestion {
  return {
    questionId: `p${String(cardNo).padStart(3, '0')}-${type}`, poemId: `p${String(cardNo).padStart(3, '0')}`, skill: type === 'blank' ? 'text' : 'author', type,
    blankUnit: type === 'blank' ? 'ku' : null, prompt: '問題', answer: '漢字', answerHistorical: 'れきしてき', answerModern: 'げんだい', acceptedAnswers: ['れきしてき'], partialAnswers: ['げんだい'], candidates: [], normalization: 'kana', sourceRef: 'source', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'reviewer', confirmedOn: '2026-09-01', proposedBy: 'human', batchEvidenceRef: null,
  };
}
const available = [question(2), question(1), question(3, 'author'), question(2, 'author')];

test('entry: 規則の版は1である', () => assert.equal(ENTRY_RULES_VERSION, 1));
test('entry: quick は8問と穴埋め3対作者1の係数を持つ', () => assert.deepEqual(ENTRY_RULES.quick, { questionCount: 8, blankWeight: 3, authorWeight: 1 }));
test('entry: view は問が空でも利用できる', () => assert.equal(isEntryAvailable('view', 0), true));
test('entry: quick は問が空なら利用できない', () => assert.equal(isEntryAvailable('quick', 0), false));
test('entry: learn は問が空なら利用できない', () => assert.equal(isEntryAvailable('learn', 0), false));
test('entry: review は問が空なら利用できない', () => assert.equal(isEntryAvailable('review', 0), false));
test('entry: exam は問が空なら利用できない', () => assert.equal(isEntryAvailable('exam', 0), false));
test('entry: 出題があれば回答入口を利用できる', () => assert.equal(isEntryAvailable('exam', available.length), true));
test('entry: 空の台帳を計画しても例外にせず空配列を返す', () => assert.deepEqual(planQuestions('quick', [], [1, 2], 'seed'), []));
test('entry: review は番号順を orderCardNumbers 経由で返す', () => assert.deepEqual(planQuestions('review', available, [3, 2, 1], 'seed').map((item) => item.poemId), ['p001', 'p002', 'p002', 'p003']));
test('entry: learn は穴埋めだけを選ぶ', () => {
  const plan = planQuestions('learn', available, [1, 2, 3], 'seed');
  assert.ok(plan.length > 0, 'fixture が空では検査にならない');
  assert.ok(plan.every((item) => item.type === 'blank'));
});
test('entry: quick は両形式を含む台帳から両方を選ぶ', () => {
  const plan = planQuestions('quick', available, [1, 2, 3], 'seed');
  assert.ok(plan.length > 0, 'fixture が空では検査にならない');
  assert.ok(plan.some((item) => item.type === 'blank'));
  assert.ok(plan.some((item) => item.type === 'author'));
});

// 発注030 検収（2026-09-01・親担当）で追加。
// planQuestions が 'number' を直書きしており、ランダム順へ到達できなかった。
test('entry: review はランダム順で番号順と異なる並びを返す', () => {
  const many = Array.from({ length: 12 }, (_, index) => question(index + 1));
  const cards = many.map((_, index) => index + 1);
  const numbered = planQuestions('review', many, cards, 'seed-a', 'number').map((question) => question.questionId);
  const random = planQuestions('review', many, cards, 'seed-a', 'random').map((question) => question.questionId);
  assert.equal(numbered.length, random.length);
  assert.ok(numbered.length > 0, 'fixture が空では検査にならない');
  assert.notDeepEqual(random, numbered);
  assert.deepEqual([...random].sort(), [...numbered].sort());
});

test('entry: 同じ seed のランダム順は再現する', () => {
  const many = Array.from({ length: 12 }, (_, index) => question(index + 1));
  const cards = many.map((_, index) => index + 1);
  const first = planQuestions('review', many, cards, 'seed-b', 'random').map((question) => question.questionId);
  const second = planQuestions('review', many, cards, 'seed-b', 'random').map((question) => question.questionId);
  assert.ok(first.length > 0, 'fixture が空では検査にならない');
  assert.deepEqual(first, second);
});
