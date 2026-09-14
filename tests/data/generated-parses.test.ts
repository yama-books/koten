import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseQuestions } from '../../packages/hyakunin/src/data/question-schema.ts';

/**
 * 2026-09-15・発注084 の途中で見つけた穴。
 *
 * **配る JSON がスキーマを通ることを、誰も確かめていなかった。**
 * `data:check` は生成器の出力と手元のファイルを比べるだけなので、
 * **生成器とスキーマが同時にずれれば両方が緑のまま通る。**
 * 実際、`blankedKu` を必須にした直後は `data:check` が exit 0 のままで、
 * **アプリは起動時に落ちる状態だった。**
 *
 * 判定は `parseQuestions`（アプリが起動時に通すのと同じ関数）で行う。
 * 写した検証を書くと、本物が変わったときに追随しない。
 */
const root = process.cwd();
const read = (name: string): unknown => JSON.parse(readFileSync(join(root, 'packages/hyakunin/src/data/generated', name), 'utf8'));

for (const name of ['questions.blank.json', 'questions.author.json']) {
  test(`生成物: ${name} はアプリが通すのと同じ検証を通る`, () => {
    const parsed = parseQuestions(read(name));
    // 0 件では何も示さない。走査対象が実在することを先に見る。
    assert.ok(parsed.length > 100, `${name} が ${parsed.length} 件では検査にならない`);
  });
}

test('生成物: 穴埋めは隠す句を 1 つ以上持ち、ID の句番号と一致する', () => {
  const blanks = parseQuestions(read('questions.blank.json'));
  const mismatched = blanks.filter((question) => {
    const named = question.questionId.match(/-ku([1-5])$/)?.[1];
    // 段3 の間は ID と一致する。段4 以降は ID に句番号を持たないので、ここは通さない。
    return named !== undefined && (question.blankedKu.length !== 1 || question.blankedKu[0] !== Number(named));
  });
  assert.deepEqual(mismatched.map((question) => question.questionId), []);
  assert.ok(blanks.every((question) => question.blankedKu.length > 0), '隠す句を持たない穴埋めがある');
});

test('生成物: 作者問は隠す句も段も持たない', () => {
  const authors = parseQuestions(read('questions.author.json'));
  assert.ok(authors.every((question) => question.blankedKu.length === 0 && question.rung === null));
});
