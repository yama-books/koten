import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAG_RUNG, LOWEST_RUNG, RUNG_CAPS, capFor, rungProgress } from '../../../packages/shared/src/domain/mastery/rungs.ts';

/**
 * 2026-09-15・発注084。**段の梯子**（D-12）。
 *
 * > 段内は無段階、段の移行は「制覇」で離散。
 * > その歌について、その段の問題を全部正解したら、次の段の天井が開く。
 *
 * **イベントに段を持たせない。** 保存の形を変えると `MASTERY_RULES_VERSION` を上げたくなり、
 * 上げると `computeMastery` が過去のイベントを全部捨てて**全員の習熟度が 0 に戻る。**
 * 段は問題目録から引く。
 */
const catalogue = [
  { questionId: 'p001-blank-ku1', poemId: 'p001', rung: 3 },
  { questionId: 'p001-blank-ku2', poemId: 'p001', rung: 3 },
  { questionId: 'p001-blank-kami', poemId: 'p001', rung: 4 },
  { questionId: 'p001-blank-shimo', poemId: 'p001', rung: 4 },
  { questionId: 'p001-blank-naka', poemId: 'p001', rung: 5 },
  { questionId: 'p001-author-choice', poemId: 'p001', rung: null },
];
const correct = (questionId: string) => ({ questionId, poemId: questionId.slice(0, 4), outcome: 'correct' as const });
const wrong = (questionId: string) => ({ questionId, poemId: questionId.slice(0, 4), outcome: 'incorrect' as const });

test('天井: 段ごとの天井は上がっていく', () => {
  assert.deepEqual(RUNG_CAPS, { 1: 25, 2: 40, 3: 55, 4: 70, 5: 80, 6: 90, 7: 100 });
  assert.equal(LOWEST_RUNG, 1);
  assert.equal(FLAG_RUNG, 8);
});

test('天井: 実効の天井は「方式の天井」と「段の天井」の低いほう', () => {
  // 易しい方式で段の天井を稼ぐ抜け道を塞ぐ（D-12）。
  assert.equal(capFor('free-input', 3), 55, '自由入力90 と 段3の55 なら 55');
  assert.equal(capFor('choice', 7), 65, '選択式65 と 段7の100 なら 65');
  assert.equal(capFor('free-input', 7), 90, '自由入力90 と 段7の100 なら 90');
  assert.equal(capFor('view', 7), 20);
});

test('天井: 段8は点を動かさないので天井を持たない', () => {
  assert.equal(capFor('free-input', FLAG_RUNG), 0, '段8で点が入ってはいけない');
});

test('進み: 段1・2 の問題を持たない歌は、通り抜けて段3から始まる', () => {
  // 目録に段1・2 が無ければ、その段は空なので制覇済みとして通り抜ける。
  const progress = rungProgress([], catalogue);
  assert.equal(progress.get('p001')?.openRung, 3);
  assert.deepEqual(progress.get('p001')?.cleared, [1, 2]);
});

test('進み: その段を全部正解すると次の段が開く', () => {
  const progress = rungProgress([correct('p001-blank-ku1'), correct('p001-blank-ku2')], catalogue);
  assert.deepEqual(progress.get('p001')?.cleared, [1, 2, 3]);
  assert.equal(progress.get('p001')?.openRung, 4);
});

test('進み: 1問でも残っていれば開かない', () => {
  const progress = rungProgress([correct('p001-blank-ku1')], catalogue);
  assert.deepEqual(progress.get('p001')?.cleared, [1, 2], '段3を制覇していないのに開いている');
  assert.equal(progress.get('p001')?.openRung, 3);
});

test('進み: 間違えても、後で正解すれば制覇になる', () => {
  // **日をまたいでよい。間違えても後で正解すればよい**（依頼者裁定・2026-09-15）。
  // 厳しくすると段2は最大7問なので事実上進めなくなる。
  const progress = rungProgress([wrong('p001-blank-ku1'), correct('p001-blank-ku2'), correct('p001-blank-ku1')], catalogue);
  assert.deepEqual(progress.get('p001')?.cleared, [1, 2, 3]);
});

test('進み: 段を飛ばせない', () => {
  // 段4を解いても、段3が残っていれば段5は開かない。
  // 段4 を解いた記録があるので「引き戻さない」で段4 のままだが、**段5 は開かない。**
  const progress = rungProgress([correct('p001-blank-kami'), correct('p001-blank-shimo')], catalogue);
  assert.equal(progress.get('p001')?.openRung, 4, '段3を飛ばして段5が開いている');
  assert.equal(progress.get('p001')?.cleared.includes(3), false, '段3を制覇していないのに数えている');
});

test('進み: 作者問は段を進めない', () => {
  // 作者は別の梯子（選択式・読み・記述）を持つ。本文の段には効かない。
  //
  // **作者問だけの歌で見る。** 本文の問と混ぜると、作者問を段3扱いにする破壊を入れても
  // 「他の本文の問が未正解だから cleared は空」で緑のまま通ってしまう
  // ——**別の節に助けられて、名乗っている理由では通らない**（2026-09-15 の破壊試験で実測）。
  const authorOnly = [{ questionId: 'p009-author-choice', poemId: 'p009', rung: null }];
  const progress = rungProgress([correct('p009-author-choice')], authorOnly);
  assert.equal(progress.get('p009'), undefined, '作者問だけの歌が本文の段を持っている');
  assert.equal(progress.size, 0);
});

test('進み: その歌に問題が無い段は、通り抜ける', () => {
  // **黙って通さない。** 空の条件は常に成立するので、そうなっていることを名指しで確かめる。
  const sparse = [
    { questionId: 'p002-blank-ku1', poemId: 'p002', rung: 3 },
    { questionId: 'p002-blank-naka', poemId: 'p002', rung: 5 },
  ];
  const progress = rungProgress([correct('p002-blank-ku1')], sparse);
  assert.deepEqual(progress.get('p002')?.cleared, [1, 2, 3, 4], '問題の無い段を通り抜けていない');
  assert.equal(progress.get('p002')?.openRung, 5);
});

test('進み: 段8まで制覇すると完全制覇になる', () => {
  const fullLadder = [
    { questionId: 'p003-blank-ku1', poemId: 'p003', rung: 3 },
    { questionId: 'p003-blank-number', poemId: 'p003', rung: 8 },
  ];
  const before = rungProgress([correct('p003-blank-ku1')], fullLadder);
  assert.equal(before.get('p003')?.conquered, false);
  const after = rungProgress([correct('p003-blank-ku1'), correct('p003-blank-number')], fullLadder);
  assert.equal(after.get('p003')?.conquered, true);
});

/**
 * 2026-09-15・工程3。**段1・2 を足しても、いる場所より下へ引き戻さない。**
 *
 * `LOWEST_RUNG` を 1 へ下げると、**段3 を解いている最中の生徒が段1 へ戻される。**
 * 授業の途中で「下げられた」と感じさせない——**上の段を解けた人は、下の段もできる。**
 */
const full = [
  { questionId: 'p010-blank-kanji', poemId: 'p010', rung: 1 },
  { questionId: 'p010-blank-chunk', poemId: 'p010', rung: 2 },
  { questionId: 'p010-blank-ku1', poemId: 'p010', rung: 3 },
];

test('進み: 記録の無い学習者は一番下の段から始まる', () => {
  assert.equal(rungProgress([], full).get('p010')?.openRung, 1);
});

test('進み: 上の段を解いた学習者を、下の段へ引き戻さない', () => {
  // 段1・2 を一度も解いていないが、段3 に正解がある（段1・2 を足す前からの学習者）。
  const progress = rungProgress([correct('p010-blank-ku1')], full);
  assert.equal(progress.get('p010')?.openRung, 3, '段1へ引き戻されている');
});

test('進み: 引き戻さないだけで、飛ばした段を制覇済みにしない', () => {
  // **「解けた」と「制覇した」は別である。** 一度も解いていない段1・2 を数えない。
  //
  // **段3 は数える**（発注086 §4.1 で `cleared` を「制覇した段の集合」へ変えた）。
  // 全問正解したのだから制覇である。**それでも `openRung` は下から順にしか開かない。**
  const progress = rungProgress([correct('p010-blank-ku1')], full);
  assert.deepEqual(progress.get('p010')?.cleared, [3]);
  assert.equal(progress.get('p010')?.cleared.includes(1), false, '解いていない段1を制覇済みにしている');
  assert.equal(progress.get('p010')?.cleared.includes(2), false, '解いていない段2を制覇済みにしている');
});
