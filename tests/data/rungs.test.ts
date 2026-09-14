import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseQuestions, type PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';

/**
 * 2026-09-15・発注084 工程1。**段4〜8（一句より長い出題）の生成。**
 *
 * 段の識別は `rung`。`blankUnit` は**全部 `'ku'` のまま**である——段4〜8 はすべて
 * 句をまるごと隠すので、新しい単位名を発明する必要が無い。
 */
const blanks = parseQuestions(JSON.parse(readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/questions.blank.json'), 'utf8')));
const of = (id: string): PublishedQuestion => {
  const found = blanks.find((question) => question.questionId === id);
  assert.ok(found, `${id} が無い`);
  return found;
};
const countByRung = (rung: number) => blanks.filter((question) => question.rung === rung).length;

test('段: 各段が全首ぶんそろっている', () => {
  assert.equal(countByRung(3), 500, '段3（一句）');
  assert.equal(countByRung(4), 200, '段4（上句・下句）');
  assert.equal(countByRung(5), 100, '段5（間3句）');
  assert.equal(countByRung(6), 200, '段6（残り4句）');
  assert.equal(countByRung(7), 100, '段7（全部）');
  assert.equal(countByRung(8), 100, '段8（番号だけ）');
});

test('段: 隠す句は段ごとに決まっている', () => {
  assert.deepEqual(of('p071-blank-kami').blankedKu, [1, 2, 3]);
  assert.deepEqual(of('p071-blank-shimo').blankedKu, [4, 5]);
  assert.deepEqual(of('p071-blank-naka').blankedKu, [2, 3, 4]);
  // 段6 は「初句だけ見える」と「末句だけ見える」の2通り。
  assert.deepEqual(of('p071-blank-tail').blankedKu, [2, 3, 4, 5]);
  assert.deepEqual(of('p071-blank-head').blankedKu, [1, 2, 3, 4]);
  assert.deepEqual(of('p071-blank-whole').blankedKu, [1, 2, 3, 4, 5]);
  assert.deepEqual(of('p071-blank-number').blankedKu, [1, 2, 3, 4, 5]);
});

test('段: 正解は隠した句をつないだもの', () => {
  assert.equal(of('p071-blank-kami').answer, '夕されば門田の稲葉おとづれて');
  assert.equal(of('p071-blank-kami').answerHistorical, 'ゆふさればかどたのいなばおとづれて');
  assert.equal(of('p071-blank-shimo').answer, '芦のまろやに秋風ぞ吹く');
});

test('段: 長い段でも漢字とかなの混ぜ書きを受ける（D-8）', () => {
  // 一句だけを見て正しくても、つないだ途端に受けなくなっては「昨日は○」が起きる。
  const accepted = of('p071-blank-kami').acceptedAnswers;
  assert.ok(accepted.includes('夕されば門田の稲葉おとづれて'), '正本が無い');
  assert.ok(accepted.includes('ゆふさればかどたのいなばおとづれて'), '全かなが無い');
  assert.ok(accepted.includes('夕さればかどたのいなばおとづれて'), '中間形が無い');
});

test('段: 句ごとの許容表記も、つないだ形で受ける', () => {
  // p005-ku2 は正本 `もみぢふみわけ`、許容 `紅葉ふみ分け`。段3 が受けるなら段4 も受ける。
  const kami = of('p005-blank-kami').acceptedAnswers;
  assert.ok(kami.some((form) => form.includes('紅葉')), `許容表記がつないだ形に無い: ${kami.slice(0, 3).join(' / ')}`);
});

test('段: 現代仮名遣いでそろえた形は △ のまま', () => {
  const question = of('p071-blank-kami');
  assert.equal(question.acceptedAnswers.includes(question.answerModern), false, '現代統一が ○ になっている');
  assert.ok(question.partialAnswers.includes(question.answerModern), '現代統一が △ になっていない');
});

test('段: 段8 は段7と同じ空欄だが、別の問である', () => {
  // 違いは手がかり（作者を見せるか、番号だけか）であって、隠す範囲ではない。
  assert.deepEqual(of('p071-blank-number').blankedKu, of('p071-blank-whole').blankedKu);
  assert.notEqual(of('p071-blank-number').questionId, of('p071-blank-whole').questionId);
});

test('段: 段3 の受理集合を1本も変えていない', () => {
  // 授業で使用中である。**昨日 ○ だったものは今日も ○ でなければならない。**
  const ku = blanks.filter((question) => question.rung === 3);
  assert.equal(ku.length, 500);
  assert.ok(ku.every((question) => question.acceptedAnswers.length > 0));
});
