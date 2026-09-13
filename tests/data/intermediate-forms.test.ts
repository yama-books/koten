import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateQuestions, READING_ALLOCATIONS, type Allocations } from '../../tools/build-data/questions.ts';

/**
 * 裁定 D-8（2026-09-13）——**歴史的仮名遣いで統一されていれば ○。漢字とかなの混ぜ方は自由。**
 * いままでは「全部漢字」と「全部ひらがな」の両端しか受理せず、途中で混ぜた形は `incorrect` だった。
 *
 * 前半は **fixture** で生成器のふるまいを見る（正本を使わない——資料の正当な更新で赤くしないため）。
 * 後半は **実データ**への言明である。裁定 D-10 の 3 件は、実際の句そのものが対象なので、
 * ここだけは生成物を読む。
 */

const approved = { status: 'approved', confirmationMode: 'individual', batchEvidenceRef: null, proposedBy: 'human', confirmedBy: 'tester', confirmedOn: '2026-09-14', note: null };

/** 漢字 2 かたまりの句。読みは歴史的と現代で違える——現代が ○ へ吸い込まれたことに気づくため。 */
function poem(overrides: Record<string, unknown> = {}) {
  return {
    cardNo: 1, poemId: 'p001', sourceRef: 'fixture',
    ku: ['門田の稲葉', 'にの句', 'さんの句', 'よんの句', 'ごの句'],
    text: '門田の稲葉にの句さんの句よんの句ごの句', acceptedTextForms: [[], [], [], [], []],
    author: { canonical: '作者1', aliases: [], confirmed: true },
    reading: {
      historical: { ku: ['かどたのいなば', 'にのく', 'さんのく', 'よんのく', 'ごのく'], author: 'さくしやいち' },
      modern: { ku: ['かどたのいなば', 'にのく', 'さんのく', 'よんのく', 'ごのく'], author: 'さくしゃいち' },
    },
    ...overrides,
  };
}

/**
 * `generateQuestions` は **human-confirmed の問だけ**を返す。台帳の項目を添えないと 1 件も出てこない。
 * 既定で 5 句ぶんの承認済み項目を置き、`entries` で上書きする。
 */
function accepted(questionId: string, entries: Array<Record<string, unknown>> = [], poems = [poem()]): string[] {
  const base = [1, 2, 3, 4, 5].map((ku) => ({ cardNo: 1, ku, ...approved }));
  const blanks = base.map((item) => ({ ...item, ...(entries.find((entry) => entry.cardNo === item.cardNo && entry.ku === item.ku) ?? {}) }));
  const generated = generateQuestions(poems, { authors: [], blanks });
  const found = generated.questionsBlank.find((item: any) => item.questionId === questionId);
  assert.ok(found, `${questionId} が生成されていない（台帳の項目が足りない可能性）`);
  return found.acceptedAnswers;
}

const ledger = () => [1, 2, 3, 4, 5].map((ku) => ({ cardNo: 1, ku, ...approved }));

/** 割り付けの不成立は投げずに積まれる。**止めるのは `buildData` である。** */
function problems(poems: ReturnType<typeof poem>[], allocations: Allocations = {}): string[] {
  return generateQuestions(poems, { authors: [], blanks: ledger() }, allocations).allocationProblems;
}

function acceptedWith(questionId: string, poems: ReturnType<typeof poem>[], allocations: Allocations): string[] {
  const generated = generateQuestions(poems, { authors: [], blanks: ledger() }, allocations);
  const found = generated.questionsBlank.find((item: any) => item.questionId === questionId);
  assert.ok(found, `${questionId} が生成されていない`);
  return found.acceptedAnswers;
}

test('中間形: 漢字 2 かたまりの句は、混ぜ方 4 通りすべてを受理する', () => {
  assert.deepEqual(accepted('p001-blank-ku1').sort(), ['かどたのいなば', 'かどたの稲葉', '門田のいなば', '門田の稲葉'].sort());
});

test('中間形: 割り付けが一意に決まらないとき、裁定の表に無ければ不成立として報告する', () => {
  // **黙って 1 つ選ばせない。** 選ばせると誤った形が正解として配られる（D-10）。
  const ambiguous = [poem({ ku: ['吉野の里に', 'にの句', 'さんの句', 'よんの句', 'ごの句'], reading: {
    historical: { ku: ['よしののさとに', 'にのく', 'さんのく', 'よんのく', 'ごのく'], author: 'さくしやいち' },
    modern: { ku: ['よしののさとに', 'にのく', 'さんのく', 'よんのく', 'ごのく'], author: 'さくしゃいち' },
  } })];
  assert.match(problems(ambiguous).join(' '), /割り付けが決まらない/);

  // 表に書けば通り、**その割り付けどおりの形だけ**が出る。
  const table = { 'p001-blank-ku1': { 吉野: 'よしの', 里: 'さと' } };
  assert.deepEqual(acceptedWith('p001-blank-ku1', ambiguous, table).sort(), ['よしのの里に', 'よしののさとに', '吉野のさとに', '吉野の里に'].sort());
  assert.equal(acceptedWith('p001-blank-ku1', ambiguous, table).includes('よしの里に'), false, '「の」が1つ足りない形が入った');
});

test('中間形: 裁定の表が読みを組み立て直せなければ不成立として報告する', () => {
  // **表を信じきらない。** 書き間違いを通すと、誤った形が正解として配られる。
  const ambiguous = [poem({ ku: ['吉野の里に', 'にの句', 'さんの句', 'よんの句', 'ごの句'], reading: {
    historical: { ku: ['よしののさとに', 'にのく', 'さんのく', 'よんのく', 'ごのく'], author: 'さくしやいち' },
    modern: { ku: ['よしののさとに', 'にのく', 'さんのく', 'よんのく', 'ごのく'], author: 'さくしゃいち' },
  } })];
  assert.match(problems(ambiguous, { 'p001-blank-ku1': { 吉野: 'よしの', 里: 'さとう' } }).join(' '), /組み立て直せない/);
});

test('中間形: 漢字を含まない句は、生成を止めずに素通りする', () => {
  // `かさゝぎの` は踊り字のため、表記と読み（`かささぎの`）が字として食い違う。
  // 割り付けを求めると必ず失敗するが、**混ぜる漢字が無いので求める必要がない。**
  const odoriji = [poem({ ku: ['かさゝぎの', 'にの句', 'さんの句', 'よんの句', 'ごの句'], reading: {
    historical: { ku: ['かささぎの', 'にのく', 'さんのく', 'よんのく', 'ごのく'], author: 'さくしやいち' },
    modern: { ku: ['かささぎの', 'にのく', 'さんのく', 'よんのく', 'ごのく'], author: 'さくしゃいち' },
  } })];
  assert.deepEqual(accepted('p001-blank-ku1', [], odoriji).sort(), ['かさゝぎの', 'かささぎの'].sort());
});

// ---- ここから実データへの言明（裁定 D-10・2026-09-14） ----

const generated = JSON.parse(readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/questions.blank.json'), 'utf8')) as Array<{ questionId: string; acceptedAnswers: string[]; partialAnswers: string[] }>;
const find = (questionId: string) => generated.find((item) => item.questionId === questionId)!;

test('中間形: 依頼者の例が両方とも ○ になる', () => {
  const question = find('p071-blank-ku2');
  for (const form of ['門田の稲葉', 'かどたのいなば', '門田のいなば', 'かどたの稲葉']) {
    assert.ok(question.acceptedAnswers.includes(form), `${form} が ○ になっていない`);
  }
});

test('中間形: 現代仮名遣いで統一した形は △ のままである（変えない側）', () => {
  // D-8 の軸は仮名遣いだけである。混ぜ方を自由にしたことで、現代統一まで ○ にしてはならない。
  const question = find('p071-blank-ku1');
  assert.ok(question.partialAnswers.includes('ゆうされば'), '現代統一が △ でなくなっている');
  assert.equal(question.acceptedAnswers.includes('ゆうされば'), false, '現代統一が ○ に入った');
});

test('中間形: 割り付けを誤ると入る形が、1 つも入っていない（D-10）', () => {
  const forbidden = [
    { questionId: 'p031-blank-ku4', form: 'よしの里に' },
    { questionId: 'p038-blank-ku4', form: 'ひとのいの命の' },
    { questionId: 'p039-blank-ku2', form: 'をの篠原' },
  ];
  for (const { questionId, form } of forbidden) {
    const question = find(questionId);
    // **走査対象が空でないことを先に見る。** 受理集合が 0 件でも「入っていない」は緑になる。
    assert.ok(question.acceptedAnswers.length >= 4, `${questionId} の受理集合が ${question.acceptedAnswers.length} 件では検査にならない`);
    assert.equal(question.acceptedAnswers.includes(form), false, `${questionId} に ${form} が入っている`);
  }
});

test('中間形: 漢字 3 かたまりの句は 8 通りすべてを持つ', () => {
  // 正本表記で漢字が 3 つある唯一の句。組み合わせの取りこぼしがここに出る。
  const question = find('p084-blank-ku4');
  assert.ok(question.acceptedAnswers.length >= 8, `${question.acceptedAnswers.length} 件しかない: ${question.acceptedAnswers.join('／')}`);
});

test('中間形: 裁定の表は、一意に決まらない 3 句だけを持つ', () => {
  // 増やすときは依頼者の裁定が要る（D-10）。**黙って増やせないよう、ここに写しを置く。**
  assert.deepEqual(READING_ALLOCATIONS, {
    'p031-blank-ku4': { 吉野: 'よしの', 里: 'さと' },
    'p038-blank-ku4': { 人: 'ひと', 命: 'いのち' },
    'p039-blank-ku2': { 小野: 'をの', 篠原: 'しのはら' },
  });
});
