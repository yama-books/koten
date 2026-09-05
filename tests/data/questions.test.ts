import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildData } from '../../tools/build-data/index.ts';
import { validateData } from '../../tools/build-data/validate.ts';
import { emit } from '../../tools/build-data/emit.ts';
import { assertGeneratedCurrent } from '../../tools/build-data/validate.ts';

function ledger(entries: string) { return `version: 1\nentries:${entries ? `\n${entries}` : ' []'}\n`; }
function entry(cardNo: number, status: string, extra = '') { return `  - cardNo: ${cardNo}\n    status: ${status}\n    confirmationMode: individual\n    batchEvidenceRef: null\n    proposedBy: human\n    confirmedBy: null\n    confirmedOn: null${extra}`; }
function fixture(approved = true) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'koten-review-'));
  for (const name of ['readings', 'kugire', 'layout']) writeFileSync(path.join(directory, `${name}.yaml`), ledger(''));
  writeFileSync(path.join(directory, 'authors.yaml'), ledger([1, 50].map((cardNo) => entry(cardNo, approved ? 'approved' : 'pending', '\n    aliases: []')).join('\n')));
  writeFileSync(path.join(directory, 'blanks.yaml'), ledger([1, 3].flatMap((cardNo) => [1, 2, 3, 4, 5].map((ku) => `${entry(cardNo, approved ? 'approved' : 'pending', `\n    ku: ${ku}`)}`)).join('\n')));
  return directory;
}

test('approved fixture produces reviewed blank and author questions with D-26 answer separation', () => {
  const data = buildData(fixture());
  assert.ok(data.questionsBlank.length >= 5); assert.ok(data.questionsAuthor.length >= 3);
  const blank = data.questionsBlank.find((question: any) => question.answerHistorical !== question.answerModern); const free = data.questionsAuthor.find((question: any) => question.questionId.endsWith('-author-free'));
  const kana = data.questionsAuthor.find((question: any) => question.questionId.endsWith('-author-kana'));
  assert.ok(blank.partialAnswers.length > 0); assert.deepEqual(blank.partialAnswers, [blank.answerModern]); assert.ok(!blank.acceptedAnswers.includes(blank.answerModern));
  assert.ok(free.partialAnswers.length > 0); assert.deepEqual(free.partialAnswers, [free.answerModern]); assert.ok(!free.acceptedAnswers.includes(free.answerModern));
  assert.equal(kana.answer, kana.answerHistorical);
});

test('real ledgers emit only human-confirmed questions', () => {
  const data = buildData();
  // A count of zero would satisfy the loop below without proving anything.
  assert.ok(data.questionsBlank.length > 0, '公開出題が 0 件では検査にならない');
  assert.ok(data.questionsAuthor.length > 0, '公開出題が 0 件では検査にならない');
  for (const question of [...data.questionsBlank, ...data.questionsAuthor]) assert.equal(question.reviewStatus, 'human-confirmed', question.questionId);
  assert.equal(data.questionsBlank.length, data.manifest.reviewCounts.blanks.approved);
});

test('missing blank ledger candidates count as pending', () => {
  const directory = fixture(false);
  writeFileSync(path.join(directory, 'blanks.yaml'), ledger(''));
  assert.deepEqual(buildData(directory).manifest.reviewCounts.blanks, { pending: 500, approved: 0, rejected: 0, hold: 0 });
});

test('V-07 rejects a pending question, and the real non-empty output passes the same gate', () => {
  const positive = buildData(fixture()); const pending = structuredClone(positive); pending.questionsBlank[0].reviewStatus = 'review';
  assert.throws(() => validateData(pending), /V-07: questions\.blank\.json/);
  assert.doesNotThrow(() => validateData(buildData()));
});

test('V-13 rejects a duplicate correct candidate', () => {
  const data = buildData(fixture()); const broken = structuredClone(data); const question = broken.questionsAuthor.find((item: any) => item.candidates.length); question.candidates[1] = question.answer;
  assert.throws(() => validateData(broken), /V-13: .*duplicate candidates/);
});

test('V-13 rejects fewer than four distractors', () => {
  const data = buildData(fixture()); const broken = structuredClone(data); const question = broken.questionsAuthor.find((item: any) => item.candidates.length); question.candidates = question.candidates.slice(0, 4);
  assert.throws(() => validateData(broken), /V-13: .*has 3 distractors/);
});

test('author distractors use card distance with a fixed expected order', () => {
  const question = buildData(fixture()).questionsAuthor.find((item: any) => item.questionId === 'p050-author-choice');
  // 49番の名義を「大中臣能宣朝臣」→「大中臣能宣」へ訂正（依頼者提供の訂正版・2026-09-05）。並びの規則は変えていない。
  assert.deepEqual(question.candidates, ['源重之', '大中臣能宣', '藤原義孝', '藤原実方朝臣', '藤原道信朝臣']);
});

test('V-14 tracks generated blank question output', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'koten-questions-')); const data = buildData(); emit(directory, data);
  unlinkSync(path.join(directory, 'questions.blank.json'));
  assert.throws(() => assertGeneratedCurrent(data, directory), /V-14: stale generated file questions\.blank\.json \(file is missing\)/);
});
