type Poem = any;
type Review = { authors: any[]; blanks: any[] };

function unique(values: string[]) {
  return [...new Set(values)];
}

function answerSet(answer: string, historical: string, modern: string, aliases: string[] = [], alsoPartial: string[] = []) {
  const acceptedAnswers = unique([answer, ...aliases, historical]);
  return { acceptedAnswers, partialAnswers: unique([modern, ...alsoPartial]).filter((value) => !acceptedAnswers.includes(value)) };
}

/**
 * 台帳が足す現代仮名遣いの別形。掛詞のように、正本の現代読み 1 つでは書き方を尽くせない語のための、
 * 人が確認した例外である。歴史的仮名遣い側（acceptedAnswers）は増やさない。
 * 複数書くときは読点で区切る。
 */
function extraPartials(entry: any | undefined): string[] {
  return typeof entry?.alsoPartial === 'string' ? entry.alsoPartial.split('、').map((value: string) => value.trim()).filter(Boolean) : [];
}

/**
 * 台帳が足す正解表記。作者名の異読のように、正本の読み 1 つでは正解を尽くせない場合に使う。
 * 表示（`poems.json` の読み）は主読みのままで、正解として受ける幅だけを広げる。複数書くときは読点で区切る。
 */
function extraAccepted(entry: any | undefined): string[] {
  return typeof entry?.alsoAccepted === 'string' ? entry.alsoAccepted.split('、').map((value: string) => value.trim()).filter(Boolean) : [];
}

/**
 * **別名義の読み。自由記述だけで受ける。**
 *
 * 依頼者裁定（2026-09-13）——**完全自由記述では ○。選択肢から読みをひらがなで答える問では、
 * 選択肢の漢字に対応しない読みは不可。**
 *
 * `alsoAccepted` の読みは**表示される漢字の異読**（`伊勢大輔` に対する `いせのおほすけ`）なので、
 * 選択肢に対応しており読みの問でも ○ である。**ここへ書くのは、別の漢字名義に属する読みだけ**——
 * 73番は選択肢に `前中納言匡房` が出るのに、`ごんちゆうなごんまさふさ` は `権中納言匡房` の読みである。
 *
 * **値のセルに注記を埋めて区別しないこと。** 欄を分ける理由がこれである
 * （作者訂正版v2 が `しよくしないしんわう（異読：…）` と書いて読みに丸括弧を持ち込んだ例がある）。
 */
function extraAcceptedFreeOnly(entry: any | undefined): string[] {
  return typeof entry?.alsoAcceptedFreeOnly === 'string' ? entry.alsoAcceptedFreeOnly.split('、').map((value: string) => value.trim()).filter(Boolean) : [];
}

/**
 * **読みを書かせる問（`-author-kana`）へ渡す分から漢字を落とす。**
 *
 * `alsoAccepted` は1つの欄に漢字も読みも混ぜて書けるため、そのまま流すと読みの問に漢字が入る。
 * 正本側は `answerSet()` が「漢字は漢字の問へ、読みは読みの問へ」と既に振り分けており、
 * **台帳から来た値だけがその振り分けを通っていなかった**（依頼者確認・2026-09-13）。
 * 実データでは5首が該当し、**正本の漢字は受理しないのに許容名称の漢字だけ受理する**状態だった。
 *
 * 釘は `tests/data/also-accepted-routing.test.ts`。
 */
function readingsOnly(values: string[]): string[] {
  return values.filter((value) => !/\p{Script_Extensions=Han}/u.test(value));
}

/** 学習者へ見せる一言。台帳の `learnerNote` だけが出所で、監査用の `note` とは別にする。 */
function learnerNote(entry: any | undefined): string | null {
  return typeof entry?.learnerNote === 'string' && entry.learnerNote.trim() !== '' ? entry.learnerNote.trim() : null;
}

function metadata(entry: any | undefined) {
  return {
    reviewStatus: entry?.status === 'approved' ? 'human-confirmed' : entry?.status === 'rejected' ? 'rejected' : 'review',
    confirmationMode: entry?.confirmationMode ?? 'individual',
    confirmedBy: entry?.confirmedBy ?? null,
    confirmedOn: entry?.confirmedOn ?? null,
    proposedBy: entry?.proposedBy ?? 'human',
    batchEvidenceRef: entry?.batchEvidenceRef ?? null,
  };
}

function distractors(poems: Poem[], poem: Poem) {
  return poems
    .filter((candidate) => candidate.author.canonical !== poem.author.canonical)
    .sort((left, right) => Math.abs(left.cardNo - poem.cardNo) - Math.abs(right.cardNo - poem.cardNo) || left.cardNo - right.cardNo)
    .map((candidate) => candidate.author.canonical)
    .filter((candidate, index, values) => values.indexOf(candidate) === index)
    .slice(0, 4);
}

export function generateQuestions(poems: Poem[], review: Review) {
  const blanks = poems.flatMap((poem) => poem.ku.map((answer: string, index: number) => {
    const entry = review.blanks.find((item) => item.cardNo === poem.cardNo && item.ku === index + 1);
    const acceptedTextForms = poem.acceptedTextForms?.[index] ?? [];
    return {
      questionId: `${poem.poemId}-blank-ku${index + 1}`, poemId: poem.poemId, skill: 'text', type: 'blank', blankUnit: 'ku',
      prompt: poem.ku.map((value: string, kuIndex: number) => kuIndex === index ? '＿＿＿' : value).join(''), answer,
      answerHistorical: poem.reading.historical.ku[index], answerModern: poem.reading.modern.ku[index],
      ...answerSet(answer, poem.reading.historical.ku[index], poem.reading.modern.ku[index], [...acceptedTextForms, ...extraAccepted(entry)], extraPartials(entry)),
      candidates: [], normalization: 'kana', sourceRef: poem.sourceRef, note: learnerNote(entry), ...metadata(entry),
    };
  }));
  const authors = poems.flatMap((poem) => {
    const entry = review.authors.find((item) => item.cardNo === poem.cardNo);
    const base = { poemId: poem.poemId, skill: 'author', type: 'author', blankUnit: null, prompt: poem.text, answerHistorical: poem.reading.historical.author, answerModern: poem.reading.modern.author, sourceRef: poem.sourceRef, note: learnerNote(entry), ...metadata(entry) };
    const wrong = distractors(poems, poem);
    const candidates = [poem.author.canonical, ...wrong].sort((left, right) => poems.find((candidate) => candidate.author.canonical === left)!.cardNo - poems.find((candidate) => candidate.author.canonical === right)!.cardNo);
    /*
     * 発注082（依頼者裁定・2026-09-10）: **作者の自由記述は、現代仮名遣いでも歴史的仮名遣いでも ○。**
     * 本文（blank）は D-26 のまま現代を △ に置く——変えるのは作者の自由記述だけである。
     *
     * **混在（取り混ぜた綴り）は自動的に不可になる。** 受理するのはそれぞれの綴りそのものであり、
     * `normalizeAnswer` の kana は NFC・空白・長音・カタカナだけを均して **ぢ/じ も は/わ も潰さない**。
     * したがって「てんじてんわう」はどちらとも一致せず不正解になる。
     * 正規化がこの2つを潰すように変わったら、`tests/data/mixed-kana-orthography.test.ts` が赤くなる。
     */
    const freeAccepted = unique([poem.author.canonical, ...poem.author.aliases, ...extraAccepted(entry), ...extraAcceptedFreeOnly(entry), poem.reading.historical.author, poem.reading.modern.author]);
    const free = { ...base, questionId: `${poem.poemId}-author-free`, answer: poem.author.canonical, acceptedAnswers: freeAccepted, partialAnswers: unique(extraPartials(entry)).filter((value) => !freeAccepted.includes(value)), candidates: [], normalization: 'kana' };
    if (wrong.length < 4) return [free];
    return [
      { ...base, questionId: `${poem.poemId}-author-choice`, answer: poem.author.canonical, acceptedAnswers: [poem.author.canonical], partialAnswers: [], candidates, normalization: 'exact' },
      { ...base, questionId: `${poem.poemId}-author-kana`, answer: poem.reading.historical.author, ...answerSet(poem.reading.historical.author, poem.reading.historical.author, poem.reading.modern.author, readingsOnly(extraAccepted(entry))), candidates, normalization: 'kana' },
      free,
    ];
  });
  return { blankCandidates: blanks.length, authorCandidates: authors.length, questionsBlank: blanks.filter((question) => question.reviewStatus === 'human-confirmed'), questionsAuthor: authors.filter((question) => question.reviewStatus === 'human-confirmed') };
}
