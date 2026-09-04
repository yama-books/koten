import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, beginQuestion, buildFeedback, failSave, progressLabel, reveal, submitAnswer, useHint, type FlowState } from '../../packages/hyakunin/src/domain/flow.ts';
import { createMemoryPort, type SaveFailure } from '../../packages/hyakunin/src/domain/ports.ts';
import type { Question } from '../../packages/hyakunin/src/domain/question.ts';

// 生成器（tools/build-data/questions.ts）が実際に作る形に合わせる。
// acceptedAnswers は unique([answer, ...aliases, historical]) なので **先頭は漢字表記** である。
const question: Question = { questionId: 'q', answer: '白妙の', acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: ['しろたえの'], normalization: 'kana' };
const forms = { historical: 'しろたへの', kanji: '白妙の' } as const;
const initial: FlowState = { phase: 'prompt', questionIndex: 2, questionCount: 8, cardNo: 12, cardIndex: 1, cardCount: 2, hintUsed: false, submitted: null, judgement: null, saveFailure: null };
const failure: SaveFailure = { reason: 'write-failed' };

test('flow: 開始時から歴史的読みならヒント利用にする', () => assert.equal(beginQuestion(initial, question, 'historical').hintUsed, true));
test('flow: ルビなしで開始してもヒント利用にしない', () => assert.equal(beginQuestion(initial, question, 'no-ruby').hintUsed, false));
test('flow: ヒントは一度立つと立ったまま', () => assert.equal(useHint(useHint(initial)).hintUsed, true));
test('flow: 回答は判定しても開示しない', () => assert.equal(submitAnswer(initial, question, '漢字', { readingStatus: 'confirmed' }).phase, 'answered'));
test('flow: 回答は入力を保存失敗時にも保持する', () => {
  const state = failSave(submitAnswer(initial, question, '漢字', { readingStatus: 'confirmed' }), failure);
  assert.equal(state.submitted?.input, '漢字');
});
test('flow: 保存失敗は保存失敗状態になる', () => assert.equal(failSave(submitAnswer(initial, question, '漢字', { readingStatus: 'confirmed' }), failure).phase, 'save-failed'));
test('flow: 保存済み領収書があれば開示できる', async () => {
  const port = createMemoryPort();
  const receipt = await port.appendEvent({ eventId: 'e', product: 'hyakunin', poemId: 'p001', sessionId: 's', itemKey: 'p001:text', kind: 'answer', method: 'choice', outcome: 'correct', hintUsed: false, effectiveMethod: 'choice', delta: 5, localDate: '2026-09-01', sameSessionRepeat: false, appVersion: 'x', dataVersion: 1, masteryRulesVersion: 1 });
  if ('reason' in receipt) throw new Error('save failed');
  assert.equal(reveal(submitAnswer(initial, question, '漢字', { readingStatus: 'confirmed' }), receipt).phase, 'revealed');
});
test('flow: 開示前には次問へ進まない', () => assert.equal(advance(initial).questionIndex, initial.questionIndex));
test('flow: 開示後は次問へ進む', async () => {
  const port = createMemoryPort(); const receipt = await port.appendEvent({ eventId: 'e', product: 'hyakunin', poemId: 'p001', sessionId: 's', itemKey: 'p001:text', kind: 'answer', method: 'choice', outcome: 'correct', hintUsed: false, effectiveMethod: 'choice', delta: 5, localDate: '2026-09-01', sameSessionRepeat: false, appVersion: 'x', dataVersion: 1, masteryRulesVersion: 1 });
  if ('reason' in receipt) throw new Error('save failed');
  assert.equal(advance(reveal(submitAnswer(initial, question, '漢字', { readingStatus: 'confirmed' }), receipt)).questionIndex, 3);
});
test('flow: 最後の開示後は完了になる', () => assert.equal(advance({ ...initial, phase: 'revealed', questionIndex: 7 }).phase, 'complete'));
test('flow: 進捗は番と問を区別する', () => assert.equal(progressLabel(initial), '12番・3問目/8'));
test('flow: 部分正解は歴史的仮名遣いを返す', () => assert.match(buildFeedback(forms, 'partial').historical, /しろたへの/));
test('flow: 部分正解は漢字を返す', () => assert.match(buildFeedback(forms, 'partial').kanji, /白妙の/));
test('flow: 部分正解の2表記は互いに異なる', () => {
  const feedback = buildFeedback(forms, 'partial');
  assert.notEqual(feedback.historical.replace('歴史的仮名遣い: ', ''), feedback.kanji.replace('漢字: ', ''));
});
test('flow: 部分正解の歴史的仮名遣いは漢字表記を混ぜない', () => assert.doesNotMatch(buildFeedback(forms, 'partial').historical, /白妙/));
test('flow: 部分正解は記号なしにする', () => assert.equal(buildFeedback(forms, 'partial').mark, 'none'));
test('flow: 正解は丸印にする', () => assert.equal(buildFeedback(forms, 'correct').mark, 'maru'));
