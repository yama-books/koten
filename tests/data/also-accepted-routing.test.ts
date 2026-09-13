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

/**
 * 依頼者裁定（2026-09-13）——**完全自由記述では ○。選択肢から読みをひらがなで答える問では、
 * 選択肢の漢字に対応しない読みは不可。**
 *
 * `alsoAccepted` の読みは**表示される漢字の異読**（`伊勢大輔` に対する `いせのおほすけ`）なので
 * 選択肢に対応しており、読みの問でも ○ である。**対応しないのは別名義の読みだけ**——
 * 73番は選択肢に `前中納言匡房` が出るのに、`権中納言匡房` の読みは別の名義の読みである。
 * 受け口を分ける。
 */
test('別名義の読み（alsoAcceptedFreeOnly）は自由記述だけで受ける', () => {
  const entries = [{ cardNo: 1, ...approved, alsoAccepted: '別作者', alsoAcceptedFreeOnly: 'べつめいぎのよみ' }];
  const built = generateQuestions(structuredClone(poems) as never, { authors: entries, blanks: [] } as never).questionsAuthor;
  const q = (id: string) => built.find((question) => question.questionId === `p001-${id}`)!;

  assert.ok(q('author-free').acceptedAnswers.includes('べつめいぎのよみ'), '自由記述で受けていない');
  assert.ok(!q('author-kana').acceptedAnswers.includes('べつめいぎのよみ'), '読みの問に別名義の読みが入っている');
  assert.ok(!q('author-kana').partialAnswers.includes('べつめいぎのよみ'), '読みの問で△になっている（不可のはず）');
});

test('選択肢の漢字に対応する異読は、読みの問でも受ける（基準線）', () => {
  const entries = [{ cardNo: 1, ...approved, alsoAccepted: 'いどくのよみ' }];
  const built = generateQuestions(structuredClone(poems) as never, { authors: entries, blanks: [] } as never).questionsAuthor;
  const kana = built.find((question) => question.questionId === 'p001-author-kana')!;
  assert.ok(kana.acceptedAnswers.includes('いどくのよみ'), '異読まで落としている');
});
