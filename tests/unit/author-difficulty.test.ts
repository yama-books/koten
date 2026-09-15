import test from 'node:test';
import assert from 'node:assert/strict';
import { planQuestions } from '../../packages/hyakunin/src/domain/entry.ts';
import { MASTERY_RULES } from '../../packages/shared/src/domain/mastery/rules.v1.ts';
import type { PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';

/**
 * 2026-09-15・依頼者。**作者問題にも「やさしくする／むずかしくする」を効かせる。**
 *
 * これまでは習熟度で選択式→自由入力へ自動で切り替わるだけで、**手動の操作が効かなかった**
 * （本文の段にしか効いていなかった）。同じボタンで、選択式と自由入力を選べるようにする。
 *
 * **漢字候補→ひらがな（`-author-kana`）はまだ入れない。** データはあるが、出題画面に
 * その方式で記録する経路が無く、出しても自由入力として記録される（`authorQuestionIdFor` の注記）。
 */
function author(variant: 'choice' | 'kana' | 'free'): PublishedQuestion {
  return {
    questionId: `p001-author-${variant}`, poemId: 'p001', skill: 'author', type: 'author',
    blankUnit: null, blankedKu: [], rung: null, prompt: '歌', answer: 'てんぢてんわう', answerHistorical: 'てんぢてんわう', answerModern: 'てんじてんのう',
    acceptedAnswers: ['てんぢてんわう'], partialAnswers: ['てんじてんのう'], candidates: variant === 'free' ? [] : ['作者A', '作者B', '作者C', '作者D'],
    normalization: variant === 'choice' ? 'exact' : 'kana', sourceRef: 'source', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'reviewer', confirmedOn: '2026-09-01', proposedBy: 'human', batchEvidenceRef: null,
  };
}
const variants = [author('choice'), author('kana'), author('free')];
const asked = (score: number, adjust = 0) =>
  planQuestions('author', variants, [1], 'seed', 'number', true, { 'p001:author': score }, new Map(), adjust)[0]?.questionId;

test('作者: おまかせでは、これまでどおり習熟度で決まる', () => {
  assert.equal(asked(0), 'p001-author-choice');
  assert.equal(asked(MASTERY_RULES.choice.cap), 'p001-author-free', '選択式の上限に達したら自由入力へ上がる');
  assert.equal(asked(MASTERY_RULES.choice.cap - 1), 'p001-author-choice');
});

test('作者: むずかしくすると、習熟度が 0 でも自由入力になる', () => {
  assert.equal(asked(0, -1), 'p001-author-free');
});

test('作者: やさしくすると、上限に達していても選択式に戻せる', () => {
  assert.equal(asked(MASTERY_RULES.choice.cap, 1), 'p001-author-choice');
});

test('作者: 調整しても作者問題が消えない', () => {
  for (const adjust of [-2, -1, 0, 1, 2, 7]) {
    assert.ok(asked(30, adjust), `adjust=${adjust} で作者問題が 1 問も出ない`);
  }
});

test('作者: 漢字候補→ひらがなの段はまだ出さない', () => {
  // **出せば自由入力として記録され、方式の天井が食い違う。** 出題画面の改修が要る。
  for (const adjust of [-7, -2, -1, 0, 1, 2, 7]) {
    assert.notEqual(asked(60, adjust), 'p001-author-kana');
  }
});
