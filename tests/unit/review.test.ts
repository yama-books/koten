import test from 'node:test';
import assert from 'node:assert/strict';
import { planReviewQuestions, reviewQuestionIds } from '../../packages/hyakunin/src/domain/review.ts';

const blank = (id: string, poemId = 'p001') => ({ questionId: id, poemId, type: 'blank', prompt: '＿', answer: '答え' }) as never;

test('再確認は直前の回で弱かった問題IDだけを元順で返す', () => {
  assert.deepEqual(reviewQuestionIds([
    { questionId: 'a', poemId: 'p001', kind: 'incorrect' },
    { questionId: 'b', poemId: 'p001', kind: 'correct' },
    { questionId: 'a', poemId: 'p001', kind: 'correct' },
    { questionId: 'c', poemId: 'p002', kind: 'partial' },
  ]), ['c']);
});

test('再確認は指定された穴埋めだけを残し、作者問や壊れた問題を拒否する', () => {
  assert.deepEqual(planReviewQuestions([blank('ku1'), blank('ku2')], ['ku2']), [blank('ku2')]);
  assert.equal(planReviewQuestions([blank('ku1'), { ...blank('author'), type: 'author' }], ['author']), null);
  assert.equal(planReviewQuestions([blank('ku1')], ['missing']), null);
});
