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

/**
 * 2026-09-15・工程3。**段1（送り仮名を残して漢字だけ）と段2（句未満）。**
 * 語の境目は `review/blank-chunks.yaml` が持つ——**機械で推測しない**（D-22）。
 */
test('段: 段1・段2 が全首ぶんそろっている', () => {
  // 段2 は資料が空欄候補と印を付けたかたまり、段1 はそのうち送り仮名を持つ語の漢字だけ。
  assert.ok(countByRung(2) > 400, `段2 が ${countByRung(2)} 問では足りない`);
  assert.ok(countByRung(1) > 250, `段1 が ${countByRung(1)} 問では足りない`);
  const poemsWithRung2 = new Set(blanks.filter((q) => q.rung === 2).map((q) => q.poemId));
  assert.equal(poemsWithRung2.size, 100, '段2 が 1 問も無い歌がある');
});

test('段: 段2 は句の中の 1 語だけを隠す', () => {
  // 台帳は助詞を語へ付けて区切る（`門田の` / `稲葉`）。**こちらで切り直さない**（D-22）。
  const question = of('p071-blank-ku2-c1');
  assert.deepEqual(question.blankedKu, [2]);
  assert.equal(question.rung, 2);
  assert.equal(question.answer, '門田の');
  assert.equal(question.answerHistorical, 'かどたの');
  assert.ok(question.prompt.includes('＿'), '空欄の印が無い');
  assert.ok(question.prompt.includes('稲葉'), '隠していない部分まで消えている');
});

test('段: 段1 は送り仮名を残して漢字だけを隠す', () => {
  // 「朝ぼらけ」なら「朝」だけ。**送り仮名が手がかりとして残るので段2 より易しい。**
  const question = blanks.find((q) => q.rung === 1 && q.poemId === 'p031');
  assert.ok(question, '31番に段1 が無い');
  assert.ok(question.answer.length < 4, `段1 の答えが長すぎる: ${question.answer}`);
});

test('段: 段1 は送り仮名と助詞を残し、漢字だけを問う', () => {
  // 段2 が `門田の` を隠すのに対し、段1 は `門田` だけ。**「の」が手がかりとして残る。**
  const word = of('p071-blank-ku2-c1');
  const kanji = of('p071-blank-ku2-k1');
  assert.equal(kanji.rung, 1);
  assert.equal(kanji.answer, '門田');
  assert.equal(kanji.answerHistorical, 'かどた');
  assert.ok([...kanji.answer].length < [...word.answer].length, '段1 が段2 より短くない');
  assert.deepEqual(kanji.acceptedAnswers, ['門田', 'かどた'], '漢字とかなの両方を受けていない');
});

test('段: 段1・2 は裁定した割り付けを守る（誤形を作らない）', () => {
  // D-14 の誤形が受理集合に入っていないこと。**走査対象が空では何も示さない。**
  const rung12 = blanks.filter((q) => q.rung === 1 || q.rung === 2);
  assert.ok(rung12.length > 500, `段1・2 が ${rung12.length} 問では検査にならない`);
  const forms = new Set(rung12.flatMap((q) => q.acceptedAnswers));
  for (const wrong of ['な', 'よしの', 'をの', 'ひとのいの', 'ものお', 'き', 'つ', 'いく', 'けふこ']) {
    const owner = rung12.find((q) => q.acceptedAnswers.includes(wrong) && q.answerHistorical !== wrong);
    assert.equal(owner, undefined, `誤った読みが受理集合にある: ${wrong}（${owner?.questionId}）`);
  }
  assert.ok(forms.size > 0);
});
