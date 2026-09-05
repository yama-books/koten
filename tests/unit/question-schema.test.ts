import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestions, toQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';

const valid = { questionId: 'p001-blank-ku1', poemId: 'p001', skill: 'text', type: 'blank', blankUnit: 'ku', prompt: '＿', answer: '漢字', answerHistorical: 'れきしてき', answerModern: 'げんだい', acceptedAnswers: ['漢字', 'れきしてき'], partialAnswers: ['げんだい'], candidates: [], normalization: 'kana', note: null, sourceRef: 'source', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'reviewer', confirmedOn: '2026-09-01', proposedBy: 'human', batchEvidenceRef: null };

test('question-schema: 空の台帳を受け入れる', () => assert.deepEqual(parseQuestions([]), []));
test('question-schema: 確認済みの出題を受け入れる', () => assert.equal(parseQuestions([valid]).length, 1));
test('question-schema: review の出題を拒否する', () => assert.throws(() => parseQuestions([{ ...valid, reviewStatus: 'review' }]), TypeError));
test('question-schema: rejected の出題を拒否する', () => assert.throws(() => parseQuestions([{ ...valid, reviewStatus: 'rejected' }]), TypeError));
test('question-schema: 配列以外を拒否する', () => assert.throws(() => parseQuestions({}), TypeError));
test('question-schema: blankUnit word を受け入れる', () => assert.equal(parseQuestions([{ ...valid, blankUnit: 'word' }])[0].blankUnit, 'word'));
test('question-schema: blankUnit phrase を受け入れる', () => assert.equal(parseQuestions([{ ...valid, blankUnit: 'phrase' }])[0].blankUnit, 'phrase'));
test('question-schema: blankUnit ku を受け入れる', () => assert.equal(parseQuestions([valid])[0].blankUnit, 'ku'));
test('question-schema: 作者問の blankUnit null を受け入れる', () => assert.equal(parseQuestions([{ ...valid, skill: 'author', type: 'author', blankUnit: null }])[0].blankUnit, null));
test('question-schema: 不正な blankUnit を拒否する', () => assert.throws(() => parseQuestions([{ ...valid, blankUnit: 'line' }]), TypeError));
test('question-schema: 候補が文字列配列でなければ拒否する', () => assert.throws(() => parseQuestions([{ ...valid, candidates: [1] }]), TypeError));
test('question-schema: 正規化方式が不正なら拒否する', () => assert.throws(() => parseQuestions([{ ...valid, normalization: 'loose' }]), TypeError));
test('question-schema: domain Question に必要な面へ落とす', () => assert.deepEqual(toQuestion(parseQuestions([valid])[0]), { questionId: valid.questionId, answer: valid.answer, acceptedAnswers: valid.acceptedAnswers, partialAnswers: valid.partialAnswers, normalization: valid.normalization }));
test('question-schema: 学習者向けの一言を受け入れる', () => assert.equal(parseQuestions([{ ...valid, note: '掛詞の説明' }])[0].note, '掛詞の説明'));
test('question-schema: 一言が文字列でもnullでもなければ拒否する', () => assert.throws(() => parseQuestions([{ ...valid, note: 1 }]), TypeError));
test('question-schema: 一言の欄が無ければ拒否する', () => { const { note: _dropped, ...withoutNote } = valid; assert.throws(() => parseQuestions([withoutNote]), TypeError); });
