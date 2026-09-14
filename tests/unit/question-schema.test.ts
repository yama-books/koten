import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestions, toQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';

const valid = { questionId: 'p001-blank-ku1', poemId: 'p001', skill: 'text', type: 'blank', blankUnit: 'ku', blankedKu: [1], rung: 3, prompt: '＿', answer: '漢字', answerHistorical: 'れきしてき', answerModern: 'げんだい', acceptedAnswers: ['漢字', 'れきしてき'], partialAnswers: ['げんだい'], candidates: [], normalization: 'kana', note: null, sourceRef: 'source', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'reviewer', confirmedOn: '2026-09-01', proposedBy: 'human', batchEvidenceRef: null };

test('question-schema: 空の台帳を受け入れる', () => assert.deepEqual(parseQuestions([]), []));
test('question-schema: 確認済みの出題を受け入れる', () => assert.equal(parseQuestions([valid]).length, 1));
test('question-schema: review の出題を拒否する', () => assert.throws(() => parseQuestions([{ ...valid, reviewStatus: 'review' }]), TypeError));
test('question-schema: rejected の出題を拒否する', () => assert.throws(() => parseQuestions([{ ...valid, reviewStatus: 'rejected' }]), TypeError));
test('question-schema: 配列以外を拒否する', () => assert.throws(() => parseQuestions({}), TypeError));
test('question-schema: blankUnit word を受け入れる', () => assert.equal(parseQuestions([{ ...valid, blankUnit: 'word' }])[0].blankUnit, 'word'));
test('question-schema: blankUnit bunsetsu を受け入れる', () => assert.equal(parseQuestions([{ ...valid, blankUnit: 'bunsetsu' }])[0].blankUnit, 'bunsetsu'));
test('question-schema: blankUnit ku を受け入れる', () => assert.equal(parseQuestions([valid])[0].blankUnit, 'ku'));
test('question-schema: 作者問の blankUnit null を受け入れる', () => assert.equal(parseQuestions([{ ...valid, skill: 'author', type: 'author', blankUnit: null }])[0].blankUnit, null));
test('question-schema: 不正な blankUnit を拒否する', () => assert.throws(() => parseQuestions([{ ...valid, blankUnit: 'line' }]), TypeError));
test('question-schema: 候補が文字列配列でなければ拒否する', () => assert.throws(() => parseQuestions([{ ...valid, candidates: [1] }]), TypeError));
test('question-schema: 正規化方式が不正なら拒否する', () => assert.throws(() => parseQuestions([{ ...valid, normalization: 'loose' }]), TypeError));
test('question-schema: domain Question に必要な面へ落とす', () => assert.deepEqual(toQuestion(parseQuestions([valid])[0]), { questionId: valid.questionId, answer: valid.answer, acceptedAnswers: valid.acceptedAnswers, partialAnswers: valid.partialAnswers, normalization: valid.normalization }));
test('question-schema: 学習者向けの一言を受け入れる', () => assert.equal(parseQuestions([{ ...valid, note: '掛詞の説明' }])[0].note, '掛詞の説明'));
test('question-schema: 一言が文字列でもnullでもなければ拒否する', () => assert.throws(() => parseQuestions([{ ...valid, note: 1 }]), TypeError));
test('question-schema: 一言の欄が無ければ拒否する', () => { const { note: _dropped, ...withoutNote } = valid; assert.throws(() => parseQuestions([withoutNote]), TypeError); });

/**
 * 2026-09-15・発注084。**どの句を隠すかを ID の文字列から推測しない。**
 * `questionKuIndex` は `/ku([1-5])$/` で ID の末尾を見ており、接尾辞が付くと句番号を捨てて
 * 「答えを含む最初の行」へ落ちていた（実測）。段4〜7 は複数行を隠すので、データに持たせる。
 */
test('question-schema: 隠す句を受け入れ、複数指定できる', () => {
  assert.deepEqual(parseQuestions([{ ...valid, blankedKu: [1, 2, 3], rung: 4 }])[0].blankedKu, [1, 2, 3]);
});
test('question-schema: 隠す句の欄が無ければ拒否する', () => {
  const { blankedKu: _dropped, ...without } = valid;
  assert.throws(() => parseQuestions([without]), TypeError);
});
test('question-schema: 隠す句が範囲外なら拒否する', () => {
  for (const bad of [[0], [6], [1.5], ['1']]) assert.throws(() => parseQuestions([{ ...valid, blankedKu: bad }]), TypeError, `拒否できていない: ${JSON.stringify(bad)}`);
});
test('question-schema: 隠す句は昇順で重複しないこと', () => {
  // 並びが乱れていると、表示側が「まとめて 1 つの空欄」を作れない。
  assert.throws(() => parseQuestions([{ ...valid, blankedKu: [2, 1] }]), TypeError);
  assert.throws(() => parseQuestions([{ ...valid, blankedKu: [1, 1] }]), TypeError);
});
test('question-schema: 作者問は隠す句を持たず、段も持たない', () => {
  const author = parseQuestions([{ ...valid, skill: 'author', type: 'author', blankUnit: null, blankedKu: [], rung: null }])[0];
  assert.deepEqual(author.blankedKu, []);
  assert.equal(author.rung, null);
});
test('question-schema: 段が範囲外なら拒否する', () => {
  for (const bad of [2, 9, 3.5, '3']) assert.throws(() => parseQuestions([{ ...valid, rung: bad }]), TypeError, `拒否できていない: ${JSON.stringify(bad)}`);
});
test('question-schema: 段の欄が無ければ拒否する', () => {
  const { rung: _dropped, ...without } = valid;
  assert.throws(() => parseQuestions([without]), TypeError);
});
