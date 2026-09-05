import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestions } from '../../tools/build-data/questions.ts';
import { judge } from '../../packages/hyakunin/src/domain/question.ts';
import blankQuestions from '../../packages/hyakunin/src/data/generated/questions.blank.json' with { type: 'json' };
import authorQuestions from '../../packages/hyakunin/src/data/generated/questions.author.json' with { type: 'json' };
import poems from '../../packages/hyakunin/src/data/generated/poems.json' with { type: 'json' };

/** 生成器へ渡す最小の首。正本そのものは使わない——資料の正当な更新でこの試験が赤くならないように。 */
const poem = {
  cardNo: 1, poemId: 'p001', sourceRef: 'fixture',
  ku: ['いちの句', 'にの句', 'さんの句', 'よんの句', 'ごの句'],
  text: 'いちの句にの句さんの句よんの句ごの句',
  author: { canonical: '作者', aliases: [], confirmed: true },
  reading: {
    // 歴史的と現代を必ず違う文字列にする。同じにすると現代読みが acceptedAnswers に吸収され、
    // partialAnswers が空になって、この試験は alsoPartial の有無を見分けられなくなる。
    historical: { ku: ['いちのく', 'にのくほ', 'さんのく', 'よんのく', 'ごのく'], author: 'さくしや' },
    modern: { ku: ['いちのく', 'にのくお', 'さんのく', 'よんのく', 'ごのく'], author: 'さくしゃ' },
    status: 'confirmed',
  },
};
const approved = { status: 'approved', confirmationMode: 'individual', batchEvidenceRef: null, proposedBy: 'human', confirmedBy: 'tester', confirmedOn: '2026-09-05', note: null };
const blankFor = (entries: unknown[]) => generateQuestions([structuredClone(poem)], { authors: [], blanks: entries } as never)
  .questionsBlank.find((question) => question.questionId === 'p001-blank-ku2')!;

test('台帳の alsoPartial は現代仮名遣いの別形として増える', () => {
  const withExtra = blankFor([{ cardNo: 1, ku: 2, ...approved, alsoPartial: 'べつのよみ' }]);
  assert.deepEqual(withExtra.partialAnswers, ['にのくお', 'べつのよみ']);
  // 歴史的仮名遣い側は増やさない。
  assert.deepEqual(withExtra.acceptedAnswers, ['にの句', 'にのくほ']);
});

test('alsoPartial が無い問題は現代読み1つのままである', () => {
  const plain = blankFor([{ cardNo: 1, ku: 2, ...approved }]);
  assert.deepEqual(plain.partialAnswers, ['にのくお']);
});

test('alsoPartial は読点で複数書ける', () => {
  const many = blankFor([{ cardNo: 1, ku: 2, ...approved, alsoPartial: 'あ、い' }]);
  assert.deepEqual(many.partialAnswers, ['にのくお', 'あ', 'い']);
});

// 現行の公開データに対する確認。掛詞「かりほ」は刈穂と仮庵の両義で、
// 現代仮名遣いは「かりほ」「かりお」どちらでもよい（依頼者裁定・2026-09-05）。
test('1番の句2は、かりほ／かりお のどちらの現代仮名遣いも部分正解にする', () => {
  const published = (blankQuestions as { questionId: string }[]).find((question) => question.questionId === 'p001-blank-ku2') as never as {
    questionId: string; answer: string; acceptedAnswers: string[]; partialAnswers: string[]; normalization: 'kana';
  };
  assert.ok(published, '1番の句2が公開データに無い');
  const question = { questionId: published.questionId, answer: published.answer, acceptedAnswers: published.acceptedAnswers, partialAnswers: published.partialAnswers, normalization: published.normalization };
  const of = (input: string) => judge(question, input, { readingStatus: 'confirmed' });

  assert.equal(of('かりほの庵の'), 'correct');
  assert.equal(of('かりほのいほの'), 'correct');
  assert.equal(of('かりほのいおの'), 'partial');
  assert.equal(of('かりおのいおの'), 'partial');
  // 庵の歴史的仮名遣いは必ず「いほ」。現代の「かりお」と混ぜた形は採らない。
  assert.equal(of('かりおのいほの'), 'incorrect');
});

test('現代仮名遣いを2つ持つ穴埋めは1番の句2だけである', () => {
  const many = (blankQuestions as { questionId: string; partialAnswers: string[] }[]).filter((question) => question.partialAnswers.length > 1);
  assert.deepEqual(many.map((question) => question.questionId), ['p001-blank-ku2']);
});

test('台帳の learnerNote は問題の note として運ばれる', () => {
  const withNote = blankFor([{ cardNo: 1, ku: 2, ...approved, learnerNote: '掛詞の説明' }]);
  assert.equal(withNote.note, '掛詞の説明');
  assert.equal(blankFor([{ cardNo: 1, ku: 2, ...approved }]).note, null);
  // 監査用の note とは別の欄である。混ざると裁定の記録が学習者へ出てしまう。
  assert.equal(blankFor([{ cardNo: 1, ku: 2, ...approved, note: '内部の記録' }]).note, null);
});

test('1番の句2だけが学習者向けの一言を持つ', () => {
  const noted = (blankQuestions as { questionId: string; note: string | null }[]).filter((question) => question.note);
  assert.deepEqual(noted.map((question) => question.questionId), ['p001-blank-ku2']);
  assert.match(noted[0].note!, /掛詞/);
});

// 89番の作者は「しょくし」「しきし」どちらでも読ませたい。表示は主読み、正解は両方（依頼者裁定・2026-09-05）。
const authorOf = (questionId: string) => {
  const found = (authorQuestions as { questionId: string }[]).find((question) => question.questionId === questionId) as never as {
    questionId: string; answer: string; acceptedAnswers: string[]; partialAnswers: string[]; normalization: 'kana' | 'exact';
  };
  assert.ok(found, `${questionId} が公開データに無い`);
  return { questionId: found.questionId, answer: found.answer, acceptedAnswers: found.acceptedAnswers, partialAnswers: found.partialAnswers, normalization: found.normalization };
};

test('89番の読み確認は主読み「しょくし」を表示する', () => {
  const poem = (poems as { cardNo: number; reading: { historical: { author: string }; modern: { author: string } } }[]).find((item) => item.cardNo === 89)!;
  assert.equal(poem.reading.modern.author, 'しょくしないしんのう');
  assert.equal(poem.reading.historical.author, 'しよくしないしんわう');
  // 異読は表示側へ混ぜない。括弧書きを欄へ入れると V-06 で落ちる。
  assert.doesNotMatch(poem.reading.modern.author, /しきし|異読|（/);
});

test('89番の作者テストは「しきし」でも正解にする', () => {
  for (const questionId of ['p089-author-kana', 'p089-author-free']) {
    const question = authorOf(questionId);
    assert.equal(judge(question, 'しきしないしんのう', { readingStatus: 'confirmed' }), 'correct', questionId);
    assert.equal(judge(question, 'しきしないしんわう', { readingStatus: 'confirmed' }), 'correct', questionId);
    assert.equal(judge(question, 'しよくしないしんわう', { readingStatus: 'confirmed' }), 'correct', questionId);
  }
});

test('異読を足していない首の作者は別の読みを正解にしない', () => {
  const question = authorOf('p001-author-kana');
  assert.equal(judge(question, 'てんぢてんわう', { readingStatus: 'confirmed' }), 'correct');
  assert.equal(judge(question, 'しきしないしんのう', { readingStatus: 'confirmed' }), 'incorrect');
});

test('作者名の訂正が公開データへ届いている', () => {
  const byCard = (cardNo: number) => (poems as { cardNo: number; author: { canonical: string }; reading: { historical: { author: string }; modern: { author: string } } }[]).find((item) => item.cardNo === cardNo)!;
  assert.equal(byCard(1).reading.historical.author, 'てんぢてんわう');
  assert.equal(byCard(49).author.canonical, '大中臣能宣');
  assert.equal(byCard(49).reading.modern.author, 'おおなかとみのよしのぶ');
  assert.equal(byCard(51).author.canonical, '藤原実方朝臣');
  assert.equal(byCard(73).author.canonical, '前中納言匡房');
  assert.equal(byCard(73).reading.modern.author, 'さきのちゅうなごんまさふさ');
});

// 表示はPDF準拠のまま、別称だけを正解として受ける（依頼者裁定・2026-09-05）。
// 「〜のみ可」と指定された首は、別称を足さないことをここで押さえる。
const AUTHOR_RULES: readonly [string, readonly string[], readonly string[]][] = [
  ['p003-author-free', ['柿本人麻呂', '柿本人麿'], ['柿本人丸']],
  ['p005-author-free', ['猿丸大夫', '猿丸太夫'], []],
  // 百人一首では「安倍仲麿」が正式。歴史表記の「阿倍仲麻呂」だけを別称として認め、
  // 安/阿 と 麿/麻呂 を組み替えた形は認めない（依頼者裁定・2026-09-06）。
  ['p007-author-free', ['安倍仲麿', '阿倍仲麻呂'], ['安倍仲麻呂', '阿倍仲麿', '阿部仲麿', '阿部仲麻呂']],
  ['p028-author-free', ['源宗于朝臣'], ['源宗行朝臣', '源宗干朝臣']],
  ['p046-author-free', ['曾禰好忠', '曽禰好忠'], ['曽根好忠']],
  ['p066-author-free', ['前大僧正行尊'], ['大僧正行尊']],
  ['p073-author-free', ['前中納言匡房', '権中納言匡房'], []],
];

test('作者の別称は認めた分だけを正解にする', () => {
  for (const [questionId, accepted, rejected] of AUTHOR_RULES) {
    const question = authorOf(questionId);
    for (const input of accepted) assert.equal(judge(question, input, { readingStatus: 'confirmed' }), 'correct', `${questionId} / ${input}`);
    for (const input of rejected) assert.equal(judge(question, input, { readingStatus: 'confirmed' }), 'incorrect', `${questionId} / ${input}`);
  }
});

test('穴埋めの別表記は認めた分だけを正解にする', () => {
  const blankOf = (questionId: string) => {
    const found = (blankQuestions as { questionId: string }[]).find((question) => question.questionId === questionId) as never as {
      questionId: string; answer: string; acceptedAnswers: string[]; partialAnswers: string[]; normalization: 'kana';
    };
    assert.ok(found, `${questionId} が公開データに無い`);
    return { questionId: found.questionId, answer: found.answer, acceptedAnswers: found.acceptedAnswers, partialAnswers: found.partialAnswers, normalization: found.normalization };
  };
  const of = (questionId: string, input: string) => judge(blankOf(questionId), input, { readingStatus: 'confirmed' });

  assert.equal(of('p013-blank-ku1', '筑波嶺の'), 'correct');
  assert.equal(of('p032-blank-ku1', '山がはに'), 'correct');
  // 「やま川」は不可。漢字と仮名を混ぜた形まで広げない。
  assert.equal(of('p032-blank-ku1', 'やま川に'), 'incorrect');
  // 70番は「いづこ」のみ正解。異本文の「いづく」へ広げない。
  assert.equal(of('p070-blank-ku4', 'いづくも同じ'), 'incorrect');
});

test('表示はPDF準拠のまま（別称を正本へ混ぜない）', () => {
  const canonical = (cardNo: number) => (poems as { cardNo: number; author: { canonical: string } }[]).find((item) => item.cardNo === cardNo)!.author.canonical;
  assert.equal(canonical(3), '柿本人麻呂');
  assert.equal(canonical(5), '猿丸大夫');
  assert.equal(canonical(7), '安倍仲麿');
  assert.equal(canonical(46), '曾禰好忠');
  assert.equal(canonical(73), '前中納言匡房');
});
