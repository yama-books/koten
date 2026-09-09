import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { judge, type Question } from '../../packages/hyakunin/src/domain/question.ts';

/*
 * 発注082（依頼者裁定・2026-09-10）: **仮名遣いが混在している答えは不可。**
 *
 * 作者の自由記述は歴史的でも現代でも ○ にするが、両方を取り混ぜた綴りは不正解にする。
 * 本文（穴埋め）は現代を △ に置く D-26 のままだが、**混在が通っていないかはここで見る。**
 *
 * この試験は「受理表に混在が載っていないこと」ではなく、**judge を通して不正解になること**を見る。
 * 表の形だけを見ると、正規化が ぢ/じ を潰したときに気づけない——潰せば混在は ○ になる。
 */

const generated = (name: string) => JSON.parse(readFileSync(path.join(process.cwd(), 'packages/hyakunin/src/data/generated', name), 'utf8'));

type Published = Question & { poemId: string; answerHistorical: string; answerModern: string };

function asQuestion(item: Published): Question {
  return { questionId: item.questionId, answer: item.answer, acceptedAnswers: item.acceptedAnswers, partialAnswers: item.partialAnswers, normalization: item.normalization };
}

/**
 * 歴史的と現代を1文字ずつ取り混ぜた綴りを作る。**両者が同じ長さで2箇所以上ちがう語だけが対象**である。
 * 1箇所しかちがわない語では、取り混ぜてもどちらか一方にしかならない——混在という状態が存在しない。
 */
function hybrid(historical: string, modern: string): string | null {
  if (historical.length !== modern.length) return null;
  const differing = [...historical].map((_, index) => index).filter((index) => historical[index] !== modern[index]);
  if (differing.length < 2) return null;
  // 先頭の相違だけ歴史的、残りは現代。どちらの綴りとも一致しない。
  return [...modern].map((character, index) => index === differing[0] ? historical[index]! : character).join('');
}

function scanMixed(items: readonly Published[], label: string) {
  let tested = 0;
  for (const item of items) {
    const mixed = hybrid(item.answerHistorical, item.answerModern);
    if (mixed === null) continue;
    // 台帳が人手で足した異読とたまたま同じになった場合は、混在ではなく正規の答えである。
    if ([...item.acceptedAnswers, ...item.partialAnswers, item.answer].includes(mixed)) continue;
    tested += 1;
    assert.equal(
      judge(asQuestion(item), mixed, { readingStatus: 'confirmed' }),
      'incorrect',
      `${label} ${item.questionId}: 混在「${mixed}」（歴史的 ${item.answerHistorical} / 現代 ${item.answerModern}）が不正解になっていない`,
    );
  }
  // **走査対象が空なら、この試験は実装ゼロでも緑になる。** 件数そのものを釘付けにする。
  assert.ok(tested > 0, `${label}: 混在を作れる語が 1 件も無い。走査が空である`);
  return tested;
}

test('混在: 作者の自由記述は歴史的と現代を取り混ぜた綴りを不正解にする', () => {
  const authors: Published[] = generated('questions.author.json');
  const free = authors.filter((item) => item.questionId.endsWith('-author-free'));
  assert.equal(free.length, 100);
  const tested = scanMixed(free, '作者');
  assert.ok(tested >= 20, `混在を作れた作者が ${tested} 件しかない`);
});

test('混在: 本文の穴埋めも歴史的と現代を取り混ぜた綴りを不正解にする', () => {
  const blanks: Published[] = generated('questions.blank.json');
  assert.ok(blanks.length > 0);
  scanMixed(blanks, '本文');
});

test('混在: 歴史的と現代はそれぞれ単独では正解として通る（作者）', () => {
  const authors: Published[] = generated('questions.author.json');
  for (const item of authors.filter((entry) => entry.questionId.endsWith('-author-free'))) {
    assert.equal(judge(asQuestion(item), item.answerHistorical, { readingStatus: 'confirmed' }), 'correct', `${item.questionId} 歴史的が ○ でない`);
    assert.equal(judge(asQuestion(item), item.answerModern, { readingStatus: 'confirmed' }), 'correct', `${item.questionId} 現代が ○ でない`);
  }
});

test('混在: 本文は現代仮名遣いを △ のまま置く（D-26・今回変えない側）', () => {
  const blanks: Published[] = generated('questions.blank.json');
  const differing = blanks.filter((item) => item.answerHistorical !== item.answerModern && !item.acceptedAnswers.includes(item.answerModern));
  assert.ok(differing.length > 0, '現代読みが別綴りの穴埋めが 1 件も無い');
  for (const item of differing) {
    assert.equal(judge(asQuestion(item), item.answerModern, { readingStatus: 'confirmed' }), 'partial', `${item.questionId} 本文の現代仮名遣いが △ でない`);
  }
});
