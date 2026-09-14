import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestions } from '../../tools/build-data/questions.ts';

/**
 * 2026-09-15・工程3。**段1・2 の 2 つの門を、合成した台帳で直に試す。**
 *
 * 実データでは門が働く入力が 1 件も無いので、**実データを壊しても門は一度も働かない**
 * （破壊試験で実測。置換は当たっていたが結果が変わらなかった）。
 * **門が効くことは、門が働く入力を作って見るしかない。**
 */
const poem = {
  poemId: 'p001', cardNo: 1, sourceRef: 'fixture',
  ku: ['夏来にけらし', 'あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと'],
  reading: {
    historical: { ku: ['なつきにけらし', 'あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと'], author: 'さくしゃ' },
    modern: { ku: ['なつきにけらし', 'あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと'], author: 'さくしゃ' },
  },
  author: { canonical: '作者', aliases: [] }, acceptedTextForms: [[], [], [], [], []],
} as never;
// **台帳の承認行が要る。** 生成器は `human-confirmed` だけを出すので、
// これが無いと候補ありでも 0 問になり、**門を試す前に検査が空振りする。**
const review = { authors: [], blanks: [{ cardNo: 1, ku: 1, status: 'approved', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null }] };
const chunksOf = (candidate: boolean[]) => [{
  cardNo: 1, ku: 1, text: '夏来にけらし',
  // `夏来` は 1 つの漢字のかたまりだが、**語としては 夏 と 来 である。**
  // 読みの割り付けは `夏来=なつき` の 1 通りしかないので、ここは一意である。
  chunks: ['夏来にけらし'], readings: ['なつきにけらし'], candidate,
}];

const rungsOf = (candidate: boolean[]) => {
  const generated = generateQuestions([poem], review, undefined, chunksOf(candidate));
  return generated.questionsBlank.filter((q: { rung: number | null }) => q.rung === 1 || q.rung === 2);
};

test('段2: 候補と印の付いていないかたまりは出さない', () => {
  // 資料が `[ ]` を付けたものだけが空欄になる。**印を無視すると助詞まで空欄になる。**
  assert.equal(rungsOf([true]).length > 0, true, '候補ありで1問も出ないのでは検査にならない');
  assert.deepEqual(rungsOf([false]), [], '候補でないかたまりから問題を作っている');
});

test('段1: 漢字のかたまりが語の全部なら作らない（段2と同じ形になる）', () => {
  const all = generateQuestions([poem], review, undefined, [{
    cardNo: 1, ku: 1, text: '夏来にけらし', chunks: ['夏来', 'にけらし'], readings: ['なつき', 'にけらし'], candidate: [true, false],
  }]).questionsBlank.filter((q: { rung: number | null }) => q.rung === 1);
  assert.deepEqual(all, [], '全部漢字の語から段1を作っている');
});

test('段1: 読みが割り付けられないかたまりからは作らない（D-22）', () => {
  /*
   * **漢字のかたまりが 1 つなら、割り付けは構造的に必ず一意である**——
   * 周りのかなが字どおり決まるので、漢字が食う範囲は 1 通りしかない。
   * だから「一意でない」は段1 では起こらず、**門が弾くのは「1 通りも無い」場合だけ**である。
   * （実データを壊しても結果が変わらなかったのはこのためだった。2026-09-15 の破壊試験で判明。）
   *
   * 踊り字のように**表記と読みが字として食い違う**とここに来る。
   */
  const unalignable = generateQuestions([poem], review, undefined, [{
    cardNo: 1, ku: 1, text: '夏来にけらし', chunks: ['夏来にけらし'], readings: ['まったくちがうよみ'], candidate: [true],
  }]).questionsBlank.filter((q: { rung: number | null }) => q.rung === 1);
  assert.deepEqual(unalignable, [], '読みが合わないのに段1を作っている');
});
