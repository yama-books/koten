import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestions } from '../../tools/build-data/questions.ts';

/**
 * 台帳の `alsoAccepted` は1つの欄に**漢字も読みも混ぜて書ける**。
 * 正本側は `answerSet()` が「漢字は漢字の問へ、読みは読みの問へ」と振り分けているのに、
 * **台帳から来た値だけがその振り分けを通らず、読みを書かせる問（`-author-kana`）へ漢字が入っていた。**
 * 実データで5首（3・5・7・46・73）が該当し、**正本の漢字は受理しないのに許容名称の漢字だけ受理する**
 * という取り違えになっていた（依頼者確認・2026-09-13）。
 *
 * **fixture は正本を使わない。** 資料の正当な更新でこの試験が赤くならないようにするため。
 */
const approved = { status: 'approved', confirmationMode: 'individual', batchEvidenceRef: null, proposedBy: 'human', confirmedBy: 'tester', confirmedOn: '2026-09-13', note: null };

/** `-author-kana` は錯乱肢が4つ要る。5首そろえる。 */
const poems = Array.from({ length: 5 }, (_, index) => ({
  cardNo: index + 1, poemId: `p00${index + 1}`, sourceRef: 'fixture',
  ku: ['いちの句', 'にの句', 'さんの句', 'よんの句', 'ごの句'],
  text: 'いちの句にの句さんの句よんの句ごの句',
  author: { canonical: `作者${index + 1}`, aliases: [], confirmed: true },
  reading: {
    ku: undefined as never,
    // 歴史的と現代を違う文字列にする。同じにすると現代読みが acceptedAnswers へ吸収され、
    // 「漢字だけを外したのか、台帳の値を全部落としたのか」を見分けられなくなる。
    historical: { ku: ['いちのく', 'にのく', 'さんのく', 'よんのく', 'ごのく'], author: `さくしや${index + 1}` },
    modern: { ku: ['いちのく', 'にのく', 'さんのく', 'よんのく', 'ごのく'], author: `さくしゃ${index + 1}` },
    status: 'confirmed',
  },
}));

function authorQuestions(alsoAccepted: string) {
  const entries = [{ cardNo: 1, ...approved, alsoAccepted }];
  const built = generateQuestions(structuredClone(poems) as never, { authors: entries, blanks: [] } as never).questionsAuthor;
  return (id: string) => built.find((question) => question.questionId === `p001-${id}`)!;
}

test('台帳の alsoAccepted の漢字は、読みを書かせる問へ入らない', () => {
  // 漢字と読みを**両方**書く。片方だけだと「全部落とした」実装でも緑になる。
  const q = authorQuestions('別作者、べつのさくしや');

  const kana = q('author-kana');
  assert.ok(!kana.acceptedAnswers.includes('別作者'), `読みの問に漢字が入っている: ${JSON.stringify(kana.acceptedAnswers)}`);
  assert.ok(kana.acceptedAnswers.includes('べつのさくしや'), '台帳の読みまで落としている');

  // 自由記述は漢字も読みも受ける（発注082）。ここを巻き添えにしない。
  const free = q('author-free');
  assert.ok(free.acceptedAnswers.includes('別作者'), '自由記述から漢字が消えた');
  assert.ok(free.acceptedAnswers.includes('べつのさくしや'), '自由記述から読みが消えた');
});

test('正本の漢字は、読みを書かせる問にもともと入らない（振り分けの基準線）', () => {
  const kana = authorQuestions('べつのさくしや')('author-kana');
  assert.ok(!kana.acceptedAnswers.includes('作者1'), '正本の漢字が読みの問に入っている');
});
