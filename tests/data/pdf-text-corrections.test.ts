import test from 'node:test';
import assert from 'node:assert/strict';
import { buildData } from '../../tools/build-data/index.ts';
import { parseTextCorrections } from '../../tools/build-data/parse-text-corrections.ts';
import { paths } from '../../tools/build-data/paths.ts';
import { judge } from '../../packages/hyakunin/src/domain/question.ts';

test('PDF原本表記127件を表示に使い、従来MD表記も完全正解として残す', () => {
  const corrections = parseTextCorrections(paths.sources.textCorrections);
  assert.equal(corrections.length, 127, '校正一覧の行が欠けていない');
  assert.equal(new Set(corrections.map((entry) => entry.cardNo)).size, 75, '差分歌数が変わっていない');

  const data = buildData();
  for (const correction of corrections) {
    const poem = data.poems[correction.cardNo - 1]!;
    assert.equal(poem.ku[correction.ku - 1], correction.originalForm, `${correction.cardNo}-${correction.ku} はPDF原本表記を表示する`);
    assert.deepEqual(poem.acceptedTextForms[correction.ku - 1], [correction.acceptedAnswer]);
    const question = data.questionsBlank.find((item: any) => item.questionId === `p${String(correction.cardNo).padStart(3, '0')}-blank-ku${correction.ku}`)!;
    assert.ok(question.acceptedAnswers.includes(correction.acceptedAnswer), `${correction.cardNo}-${correction.ku} の従来表記を許容する`);
    assert.equal(judge(question, correction.acceptedAnswer, { readingStatus: 'confirmed' }), 'correct');
  }
});
