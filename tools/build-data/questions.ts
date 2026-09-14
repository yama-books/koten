import { alignments, chunks, mixedForms } from './mixed-forms.ts';

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

/**
 * 読みの割り付けが一意に決まらない句の裁定（**D-10・2026-09-14・依頼者**）。
 *
 * **`review/` には置かない。** あちらは「生成候補を人が承認する」ための台帳で、
 * 試験は日常的に合成台帳で `buildData` を呼ぶ。**正誤判定の正本をあちらへ置くと、
 * 合成台帳のたびに正本が消える。** ここは一次資料と同じく、どの台帳でも変わらない。
 *
 * **増やすときは依頼者の裁定を取ること。** 機械に選ばせると誤った形が ○ になる——
 * `吉野＝よし` と割ると `よしの里に`（「の」が 1 つ足りない）が正解として配られる。
 */
export type Allocations = Readonly<Record<string, Readonly<Record<string, string>>>>;

export const READING_ALLOCATIONS: Allocations = {
  'p031-blank-ku4': { 吉野: 'よしの', 里: 'さと' },
  'p038-blank-ku4': { 人: 'ひと', 命: 'いのち' },
  'p039-blank-ku2': { 小野: 'をの', 篠原: 'しのはら' },
};

/**
 * 漢字とかなを途中まで混ぜた形（中間形）を書き出す。裁定 D-8——
 * **歴史的仮名遣いで統一されていれば ○。漢字とかなの混ぜ方は自由。**
 *
 * **漢字が 0 個の表記は飛ばす。** 混ぜる先が無い。踊り字の `かさゝぎの` は
 * 表記と読み（`かささぎの`）が字として食い違うため、割り付けを求めると必ず失敗する。
 *
 * **一意に決まらないときは台帳を見る。決して機械に選ばせない**——
 * `吉野＝よし` と割ると `よしの里に`（「の」が 1 つ足りない）が ○ になる（D-10）。
 *
 * **台帳が無いときは、ここでは投げず `problems` へ積む。** 止めるのは `buildData` である——
 * この関数は実データ以外の台帳でも呼ばれる（試験の fixture）。ここで投げると、
 * **一次資料と関係のない試験まで巻き添えで赤くなる。** 実データで止める責任は経路の側にある。
 */
function intermediateForms(forms: string[], reading: string, questionId: string, problems: string[], allocations: Allocations): string[] {
  const result: string[] = [];
  for (const form of forms) {
    const kanjiChunks = chunks(form).filter((chunk) => chunk.kanji);
    if (kanjiChunks.length === 0) continue;

    const found = alignments(form, reading);
    let picked: string[] | undefined = found.length === 1 ? found[0] : undefined;
    if (picked === undefined) {
      const adjudicated = allocations[questionId] ?? {};
      const fromTable = kanjiChunks.map((chunk) => adjudicated[chunk.text]);
      if (fromTable.every((value): value is string => typeof value === 'string')) picked = fromTable;
    }
    if (picked === undefined) {
      problems.push(`${questionId}: 読みの割り付けが決まらない（${form} / ${reading}・候補 ${found.length} 通り）。READING_ALLOCATIONS へ、依頼者の裁定を取ってから書くこと`);
      continue;
    }
    // **台帳を信じきらない。** 書き間違いをそのまま通すと、誤った形が正解として配られる。
    const rebuilt = mixedForms(form, picked).at(-1);
    if (rebuilt !== reading) {
      problems.push(`${questionId}: READING_ALLOCATIONS が読みを組み立て直せない（${picked.join('、')} → ${rebuilt} ≠ ${reading}）`);
      continue;
    }
    result.push(...mixedForms(form, picked));
  }
  return result;
}

function distractors(poems: Poem[], poem: Poem) {
  return poems
    .filter((candidate) => candidate.author.canonical !== poem.author.canonical)
    .sort((left, right) => Math.abs(left.cardNo - poem.cardNo) - Math.abs(right.cardNo - poem.cardNo) || left.cardNo - right.cardNo)
    .map((candidate) => candidate.author.canonical)
    .filter((candidate, index, values) => values.indexOf(candidate) === index)
    .slice(0, 4);
}

/**
 * 一句より長い段（発注084・D-12）。**隠すのはいつも句のまとまり**なので `blankUnit` は `'ku'` のまま。
 * 段の識別は `rung` が持つ。
 *
 * 段8 は段7と**同じ範囲を隠す。** 違いは手がかり（作者を見せるか、番号だけか）であって
 * 範囲ではない。点は動かさず「完全制覇」の印に使う。
 */
const RUNG_SPECS: ReadonlyArray<{ rung: number; suffix: string; ku: readonly number[] }> = [
  { rung: 4, suffix: 'kami', ku: [1, 2, 3] },
  { rung: 4, suffix: 'shimo', ku: [4, 5] },
  { rung: 5, suffix: 'naka', ku: [2, 3, 4] },
  { rung: 6, suffix: 'tail', ku: [2, 3, 4, 5] },
  { rung: 6, suffix: 'head', ku: [1, 2, 3, 4] },
  { rung: 7, suffix: 'whole', ku: [1, 2, 3, 4, 5] },
  { rung: 8, suffix: 'number', ku: [1, 2, 3, 4, 5] },
];

/**
 * 句ごとの受理集合を掛け合わせる。**「各句が受理できるなら、つないだ形も受理できる」**が定義である。
 *
 * **中間形を span で計算し直さない。** 句ごとの割り付けは段3 で解決済みで、
 * 許容表記も中間形もその受理集合に入っている。組み直すと、
 * **同じ句が段3 では ○ なのに段4 では ×** という食い違いが生まれる。
 */
function joinAcross(perKu: readonly (readonly string[])[]): string[] {
  return perKu.reduce<string[]>((carried, forms) => carried.flatMap((prefix) => forms.map((form) => prefix + form)), ['']);
}

export function generateQuestions(poems: Poem[], review: Review, allocations: Allocations = READING_ALLOCATIONS) {
  /** 読みの割り付けが決まらなかった句。**実データで空でなければ `buildData` が止める。** */
  const allocationProblems: string[] = [];
  const blanksByPoem = poems.map((poem) => poem.ku.map((answer: string, index: number) => {
    const entry = review.blanks.find((item) => item.cardNo === poem.cardNo && item.ku === index + 1);
    const acceptedTextForms = poem.acceptedTextForms?.[index] ?? [];
    return {
      questionId: `${poem.poemId}-blank-ku${index + 1}`, poemId: poem.poemId, skill: 'text', type: 'blank', blankUnit: 'ku',
      // **隠す句はデータに持たせる。** ID の文字列から推測させない（発注084・`question-schema.ts`）。
      blankedKu: [index + 1], rung: 3,
      prompt: poem.ku.map((value: string, kuIndex: number) => kuIndex === index ? '＿＿＿' : value).join(''), answer,
      answerHistorical: poem.reading.historical.ku[index], answerModern: poem.reading.modern.ku[index],
      ...answerSet(
        answer, poem.reading.historical.ku[index], poem.reading.modern.ku[index],
        [
          ...acceptedTextForms, ...extraAccepted(entry),
          ...intermediateForms(unique([answer, ...acceptedTextForms, ...extraAccepted(entry)]), poem.reading.historical.ku[index], `${poem.poemId}-blank-ku${index + 1}`, allocationProblems, allocations),
        ],
        extraPartials(entry),
      ),
      candidates: [], normalization: 'kana', sourceRef: poem.sourceRef, note: learnerNote(entry), ...metadata(entry),
    };
  }));

  const spans = poems.flatMap((poem, poemIndex) => {
    const perKu = blanksByPoem[poemIndex]!;
    return RUNG_SPECS.map((spec) => {
      const pick = <T,>(values: readonly T[]): T[] => spec.ku.map((ku) => values[ku - 1]!);
      const answer = pick(poem.ku).join('');
      const historical = pick(poem.reading.historical.ku).join('');
      const modern = pick(poem.reading.modern.ku).join('');
      const accepted = unique(joinAcross(pick(perKu).map((question) => question.acceptedAnswers)));
      const first = perKu[spec.ku[0]! - 1]!;
      return {
        questionId: `${poem.poemId}-blank-${spec.suffix}`, poemId: poem.poemId, skill: 'text', type: 'blank', blankUnit: 'ku',
        blankedKu: [...spec.ku], rung: spec.rung,
        prompt: poem.ku.map((value: string, kuIndex: number) => spec.ku.includes(kuIndex + 1) ? '＿＿＿' : value).join(''),
        answer, answerHistorical: historical, answerModern: modern,
        acceptedAnswers: accepted,
        // 現代仮名遣いでそろえた形は △（D-8）。段3 と同じ扱いにする。
        partialAnswers: accepted.includes(modern) ? [] : [modern],
        candidates: [], normalization: 'kana', sourceRef: poem.sourceRef, note: null,
        reviewStatus: first.reviewStatus, confirmationMode: first.confirmationMode,
        confirmedBy: first.confirmedBy, confirmedOn: first.confirmedOn,
        proposedBy: first.proposedBy, batchEvidenceRef: first.batchEvidenceRef,
      };
    });
  });
  const blanks = [...blanksByPoem.flat(), ...spans];
  const authors = poems.flatMap((poem) => {
    const entry = review.authors.find((item) => item.cardNo === poem.cardNo);
    const base = { poemId: poem.poemId, skill: 'author', type: 'author', blankUnit: null, blankedKu: [], rung: null, prompt: poem.text, answerHistorical: poem.reading.historical.author, answerModern: poem.reading.modern.author, sourceRef: poem.sourceRef, note: learnerNote(entry), ...metadata(entry) };
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
    /*
     * 依頼者裁定（2026-09-13）: **本文は歴史的仮名遣い。作者は現代仮名遣いでもよい。**
     * 作者名を歴史的仮名遣いで覚えるのは負担が重い、という理由である。**非対称は承知のうえ。**
     * よって読みを書かせる問も、自由記述（発注082）と同じく現代仮名遣いを ○ で受ける。
     * **本文（blank）は D-26 のまま △ に据え置く**——`answerSet` の既定のふるまいがそれである。
     *
     * 受理するのは**それぞれの綴りそのもの**なので、取り混ぜた綴りは自動的に不可のままになる。
     */
    const kanaAccepted = unique([poem.reading.historical.author, poem.reading.modern.author, ...readingsOnly(extraAccepted(entry))]);
    return [
      { ...base, questionId: `${poem.poemId}-author-choice`, answer: poem.author.canonical, acceptedAnswers: [poem.author.canonical], partialAnswers: [], candidates, normalization: 'exact' },
      { ...base, questionId: `${poem.poemId}-author-kana`, answer: poem.reading.historical.author, acceptedAnswers: kanaAccepted, partialAnswers: unique(extraPartials(entry)).filter((value) => !kanaAccepted.includes(value)), candidates, normalization: 'kana' },
      free,
    ];
  });
  // **台帳の行に対応するのは段3 だけである。** 段4〜8 はそこから導いた問であり、
  // 台帳に行を持たない（`review-approve` がこの数と台帳を突き合わせる）。
  const ledgerBackedBlanks = blanksByPoem.flat();
  return { allocationProblems, blankCandidates: ledgerBackedBlanks.length, authorCandidates: authors.length, questionsBlank: blanks.filter((question) => question.reviewStatus === 'human-confirmed'), questionsAuthor: authors.filter((question) => question.reviewStatus === 'human-confirmed') };
}
