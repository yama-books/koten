import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTION_RULES_VERSION, judge, normalizeAnswer, type Question } from '../../packages/hyakunin/src/domain/question.ts';

const question: Question = {
  questionId: 'p001-author',
  answer: '在原業平朝臣',
  acceptedAnswers: ['ありはらのなりひら', '業平'],
  partialAnswers: ['ありはらのなりひらー'],
  normalization: 'kana',
};

test('正規化は NFC にする', () => {
  assert.equal(normalizeAnswer('が', 'exact'), 'が');
});

test('正規化は全角空白を半角空白にする', () => {
  assert.equal(normalizeAnswer('あ　い', 'kana'), 'あい');
});

test('正規化は前後の空白を落とす', () => {
  assert.equal(normalizeAnswer('  あい  ', 'exact'), 'あい');
});

test('kana 正規化はすべての空白を落とす', () => {
  assert.equal(normalizeAnswer('あ い　う', 'kana'), 'あいう');
});

test('kana 正規化は長音記号を統一する', () => {
  assert.equal(normalizeAnswer('あｰいー', 'kana'), 'あーいー');
});

test('kana 正規化はカタカナをひらがなへ畳み込む', () => {
  assert.equal(normalizeAnswer('カタカナ', 'kana'), 'かたかな');
});

test('exact 正規化は kana の畳み込みをしない', () => {
  assert.equal(normalizeAnswer('カタカナ', 'exact'), 'カタカナ');
});

test('問題規則の版は 1 である', () => {
  assert.equal(QUESTION_RULES_VERSION, 1);
});

test('空文字の入力は不正解にする', () => {
  assert.equal(judge({ ...question, acceptedAnswers: [''], partialAnswers: [''] }, '　 ', { readingStatus: 'confirmed' }), 'incorrect');
});

test('代表の答えは読みの状態によらず完全正解にする', () => {
  assert.equal(judge(question, '在原業平朝臣', { readingStatus: 'review' }), 'correct');
});

test('確認済みの完全正解候補は完全正解にする', () => {
  assert.equal(judge(question, 'ありはらのなりひら', { readingStatus: 'confirmed' }), 'correct');
});

test('未確認の完全正解候補は要確認にする', () => {
  assert.equal(judge(question, 'ありはらのなりひら', { readingStatus: 'review' }), 'needs-review');
});

test('確認済みの部分正解候補は部分正解にする', () => {
  assert.equal(judge(question, 'ありはらのなりひらー', { readingStatus: 'confirmed' }), 'partial');
});

test('未確認の部分正解候補は要確認にする', () => {
  assert.equal(judge(question, 'ありはらのなりひらー', { readingStatus: 'review' }), 'needs-review');
});

test('一致しない入力は不正解にする', () => {
  assert.equal(judge(question, '別人', { readingStatus: 'confirmed' }), 'incorrect');
});

test('完全正解候補は部分正解候補より優先する', () => {
  const overlapping: Question = {
    ...question,
    acceptedAnswers: ['重複'],
    partialAnswers: ['重複'],
  };
  assert.equal(judge(overlapping, '重複', { readingStatus: 'confirmed' }), 'correct');
});
