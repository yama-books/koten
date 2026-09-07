import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { parseQuestions, type PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { Session } from '../../packages/hyakunin/src/ui/screens/Session.tsx';

const settings = { key: 'user' as const, reading: 'no-ruby' as const, writing: 'vertical' as const, order: 'number' as const, soundEnabled: false, noticeConfirmed: true };
const poem = { cardNo: 10, ku: ['春すぎて', '夏来にけらし', '白妙の', '衣ほすてふ', '天の香具山'], author: { canonical: '持統天皇' }, reading: { status: 'confirmed', historical: { ku: ['はるすぎて', 'なつきにけらし', 'しろたへの', 'ころもほすてふ', 'あまのかぐやま'], author: 'ぢとうてんわう' }, modern: { ku: ['はるすぎて', 'なつきにけらし', 'しろたえの', 'ころもほすちょう', 'あまのかぐやま'], author: 'じとうてんのう' } } } as never;
const meta = { skill: 'text' as const, blankUnit: 'word' as const, normalization: 'kana' as const, note: null, sourceRef: 'fixture', reviewStatus: 'human-confirmed' as const, confirmationMode: 'individual' as const, confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null };
const blank = parseQuestions([{ ...meta, questionId: 'p010-ku3', poemId: 'p010', type: 'blank', prompt: '春すぎて夏来にけらし＿＿＿衣ほすてふ天の香具山', answer: '白妙の', answerHistorical: 'しろたへの', answerModern: 'しろたえの', acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: ['しろたえの'], candidates: [] }] as PublishedQuestion[]);
// 作者の読みは歴史的と現代で違う。**同じなら、重複する2行がそもそも描かれない。**
const author = parseQuestions([{ ...meta, skill: 'author', questionId: 'p010-author', poemId: 'p010', type: 'author', blankUnit: null, prompt: '春すぎて夏来にけらし白妙の衣ほすてふ天の香具山の作者は？', answer: '持統天皇', answerHistorical: 'ぢとうてんわう', answerModern: 'じとうてんのう', acceptedAnswers: ['持統天皇', 'ぢとうてんわう'], partialAnswers: ['じとうてんのう'], candidates: ['天智天皇', '持統天皇', '柿本人麻呂', '山部赤人'] }] as PublishedQuestion[]);

let root: HTMLDivElement | undefined;
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

async function mount(props: Partial<Parameters<typeof Session>[0]>) {
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => { render(<Session questions={blank} poems={[poem]} sessionId="s" port={{ ...createMemoryPort(), saveLocalReport: async () => true } as never} settings={settings} onSettings={() => {}} onComplete={() => {}} {...props} />, root!); });
  return root!;
}
const button = (label: string) => Array.from(root!.querySelectorAll('button')).find((node) => node.textContent === label);
/** `sr-only` を除いた、目で見える文字だけを読む。読み上げ専用の見出しを数えない。 */
function visibleText(view: HTMLElement): string {
  const clone = view.cloneNode(true) as HTMLElement;
  for (const hidden of clone.querySelectorAll('.sr-only')) hidden.remove();
  return clone.textContent ?? '';
}

// --- 工程9：本番の紙モードで、作者問題だと分かる ---
const paperExam = { entry: 'exam' as const, answerMode: 'paper' as const };

test('074-9a: 本番・紙・作者問題は、何を答えるかを目に見える形で出す', async () => {
  const view = await mount({ ...paperExam, questions: author });
  expect(view.querySelector('.question-poem--author'), '作者問題が出ていなければ、以下は何も測っていない').not.toBeNull();
  expect(visibleText(view)).toContain('作者名を書いてください。');
});

test('074-9b: 同じ条件の穴埋めでは、その文言を出さない', async () => {
  const view = await mount({ ...paperExam, questions: blank });
  expect(view.querySelector('.blank-slot'), '穴埋めが出ていなければ、以下の0件は何も示さない').not.toBeNull();
  expect(visibleText(view)).not.toContain('作者名を書いてください。');
});

test('074-9c: 読み上げ専用の見出しは残っている', async () => {
  const view = await mount({ ...paperExam, questions: author });
  const heading = view.querySelector('h1.sr-only');
  expect(heading?.textContent).toBe('作者問題');
});

test('074-9d: 画面で答える本番の作者問題は、見え方を変えない', async () => {
  const view = await mount({ entry: 'exam', answerMode: 'screen', questions: author });
  expect(view.querySelector('.answer-choices')).not.toBeNull();
  expect(visibleText(view)).not.toContain('作者名を書いてください。');
});

// --- 工程7：歌番号は1か所だけ ---
test('074-7: 出題画面は歌番号を1か所だけに出す', async () => {
  const view = await mount({});
  const header = view.querySelector('.session .nav-edge .progress');
  expect(header?.textContent, 'ヘッダに歌番号が無ければ、以下の0件は何も示さない').toBe('10番');
  expect(view.querySelectorAll('.question-text .question-number')).toHaveLength(0);
  // 「10」という数が本文の器の中に重ねて出ていないこと。歌の文字は数字を含まない。
  expect(view.querySelector('.question-text')!.textContent).not.toMatch(/\d/);
});

// --- 工程11：ホームへ戻る導線 ---
test('074-11: 出題画面の戻る操作は、行き先を文言で伝える', async () => {
  const view = await mount({});
  const back = view.querySelector<HTMLButtonElement>('.session .nav-edge .back-link');
  expect(back).not.toBeNull();
  const name = `${back!.textContent ?? ''}${back!.getAttribute('aria-label') ?? ''}`;
  expect(name).toContain('ホーム');
  // 印だけにしない。文言そのものが残っていること。
  expect(back!.textContent!.trim().length).toBeGreaterThan(1);
});

// --- 工程12：自己採点で作者の正解が2回出ない ---
async function paperGradeList(questions: readonly PublishedQuestion[]) {
  const view = await mount({ ...paperExam, questions });
  for (let index = 0; index < questions.length; index += 1) {
    await act(() => { button('次へ')!.click(); });
  }
  return Array.from(view.querySelectorAll('.grade-list > li'));
}

test('074-12a: 紙の自己採点で、作者問題の行に「正解：」が1回だけ出る', async () => {
  const rows = await paperGradeList(author);
  expect(rows, '作者問題の行が無ければ、1回という数は何も示さない').toHaveLength(1);
  expect(rows[0].textContent).toContain('正解：持統天皇');
  expect(rows[0].textContent!.split('正解：').length - 1).toBe(1);
  expect(rows[0].textContent!.split('（歴史的仮名遣い：').length - 1).toBe(1);
});

test('074-12b: 穴埋めの行では、従来どおり2つの枠の中身が出る', async () => {
  const rows = await paperGradeList(blank);
  expect(rows).toHaveLength(1);
  // 押す前から対照が出ている（057・065）。正答の枠と仮名遣いの補足は中身が違う。
  expect(rows[0].textContent).toContain('正答: ');
  expect(rows[0].textContent).toContain('正解：白妙の（しろたへの）');
  expect(rows[0].textContent).toContain('△しろたえの（現代仮名遣い）');
});

test('074-12c: 画面で答える本番の採点一覧でも、作者の正解は1回だけ', async () => {
  const view = await mount({ entry: 'exam', answerMode: 'screen', questions: author });
  const choice = Array.from(view.querySelectorAll('.answer-choices button')).find((node) => node.textContent === '持統天皇');
  expect(choice, '選択肢が出ていない').toBeDefined();
  await act(async () => { choice!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  const rows = Array.from(view.querySelectorAll('.grade-list > li'));
  expect(rows, '採点一覧に行が無ければ、1回という数は何も示さない').toHaveLength(1);
  expect(rows[0].textContent!.split('正解：').length - 1).toBe(1);
});

// --- 工程14：本番は起きることを言う ---
test('074-14a: 本番の答えるボタンは「答え合わせ」と言わない', async () => {
  const view = await mount({ entry: 'exam', answerMode: 'screen', questions: blank });
  expect(view.querySelector('button.primary')?.textContent).toBe('記録して次へ');
  expect(view.textContent).not.toContain('答え合わせ');
});

test('074-14b: 練習では「答え合わせ」のままである', async () => {
  const view = await mount({ entry: 'learn', answerMode: 'screen', questions: blank });
  expect(view.querySelector('button.primary')?.textContent).toBe('答え合わせ');
});

test('074-14c: 紙に書く本番の「次へ」は変わらない', async () => {
  const view = await mount({ ...paperExam, questions: blank });
  expect(button('次へ')).toBeDefined();
  expect(view.textContent).not.toContain('記録して次へ');
});
