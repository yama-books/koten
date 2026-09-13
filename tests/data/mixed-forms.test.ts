import test from 'node:test';
import assert from 'node:assert/strict';
import { alignments, chunks, mixedForms } from '../../tools/build-data/mixed-forms.ts';

test('中間形: 漢字のかたまりとかなに切り分ける', () => {
  assert.deepEqual(chunks('門田の稲葉'), [
    { text: '門田', kanji: true }, { text: 'の', kanji: false }, { text: '稲葉', kanji: true },
  ]);
  assert.deepEqual(chunks('ふれるしらゆき'), [{ text: 'ふれるしらゆき', kanji: false }]);
});

test('中間形: 読みをかたまりへ割り付ける', () => {
  assert.deepEqual(alignments('門田の稲葉', 'かどたのいなば'), [['かどた', 'いなば']]);
});

test('中間形: 貪欲一致では割り付けられない句を割り付ける', () => {
  // `野` の読み `の` の直後に、かなの `の` が続く。前から順に取ると崩れる——後戻りが要る。
  assert.deepEqual(alignments('いく野の道の', 'いくののみちの'), [['の', 'みち']]);
  // `軒端` の読みが `の` で始まる。かなの `の` を先に食うと割り付け不能になる。
  assert.deepEqual(alignments('ふるき軒端の', 'ふるきのきばの'), [['のきば']]);
});

test('中間形: 一意に決まらない割り付けは、すべて返して呼び手に判断させる', () => {
  // どちらも「の」を1つ挟み「に」で終わり、7文字を余さず使う。**機械には区別がつかない。**
  //
  // **並び順は契約ではない**ので、集合として見る。順序を固定すると、意味の無い違いで赤くなる。
  const sorted = (value: string[][]) => value.map((item) => item.join('｜')).sort();
  assert.deepEqual(sorted(alignments('吉野の里に', 'よしののさとに')), sorted([['よしの', 'さと'], ['よし', 'のさと']]));
  // ひと｜いのち と ひとのい｜ち。
  assert.equal(alignments('人の命の', 'ひとのいのちの').length, 2);
  // を｜のしのはら、をの｜しのはら、をののし｜はら の **3 通り**。予想の 2 は誤りだった（実測）。
  assert.equal(alignments('小野の篠原', 'をののしのはら').length, 3);
});

test('中間形: かたまりに空の読みを割り当てない', () => {
  // 空を許すと「漢字を読み 0 文字で読む」形が通り、割り付けが無数に増える。
  assert.deepEqual(alignments('み吉野の', 'みよしのの'), [['よしの']]);
});

test('中間形: 読みと表記が食い違えば 1 つも返さない', () => {
  assert.deepEqual(alignments('門田の稲葉', 'まったくちがう'), []);
});

test('中間形: かたまりごとに漢字かかなかを選んだ全組み合わせを出す', () => {
  assert.deepEqual(mixedForms('門田の稲葉', ['かどた', 'いなば']), [
    '門田の稲葉', '門田のいなば', 'かどたの稲葉', 'かどたのいなば',
  ]);
});

test('中間形: 漢字が無い句は、それ自身 1 本だけ', () => {
  assert.deepEqual(mixedForms('ふれるしらゆき', []), ['ふれるしらゆき']);
});

test('中間形: 漢字が 1 つの句には、両端の外に形が無い', () => {
  // `夕されば` / `ゆふされば` は既に両方 ○ である。ここに穴は無い。
  assert.deepEqual(mixedForms('夕されば', ['ゆふ']), ['夕されば', 'ゆふされば']);
});
