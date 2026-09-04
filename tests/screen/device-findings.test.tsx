import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { parseQuestions, type PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';
import { planQuestions } from '../../packages/hyakunin/src/domain/entry.ts';
import { advance, type FlowState } from '../../packages/hyakunin/src/domain/flow.ts';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { ReadingToggle } from '../../packages/hyakunin/src/ui/components/ReadingToggle.tsx';
import { WritingModeToggle } from '../../packages/hyakunin/src/ui/components/WritingModeToggle.tsx';
import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';
import { RangePicker } from '../../packages/hyakunin/src/ui/screens/RangePicker.tsx';
import { Result } from '../../packages/hyakunin/src/ui/screens/Result.tsx';
import { Session } from '../../packages/hyakunin/src/ui/screens/Session.tsx';

let root: HTMLDivElement | undefined;
const settings = { key: 'user' as const, reading: 'no-ruby' as const, writing: 'vertical' as const, order: 'number' as const, soundEnabled: false, noticeConfirmed: true };
const poem = { cardNo: 10, ku: ['春すぎて', '夏来にけらし', '白妙の', '衣ほすてふ', '天の香具山'], author: { canonical: '持統天皇' }, reading: { status: 'confirmed', historical: { ku: ['はるすぎて', 'なつきにけらし', 'しろたへの', 'ころもほすてふ', 'あまのかぐやま'], author: 'ぢとうてんわう' }, modern: { ku: ['はるすぎて', 'なつきにけらし', 'しろたえの', 'ころもほすちょう', 'あまのかぐやま'], author: 'じとうてんのう' } } } as never;
const questions = parseQuestions([{ questionId: 'p010-ku3', poemId: 'p010', skill: 'text', type: 'blank', blankUnit: 'word', prompt: '春すぎて夏来にけらし＿＿＿衣ほすてふ天の香具山', answer: '白妙の', answerHistorical: 'しろたへの', answerModern: 'しろたえの', acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: ['しろたえの'], candidates: [], normalization: 'kana', sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null }] as PublishedQuestion[]);
const makePort = () => ({ ...createMemoryPort(), saveLocalReport: async () => true });

function container() { root = document.createElement('div'); document.body.append(root); return root; }
async function mountSession(props: Partial<Parameters<typeof Session>[0]> = {}) {
  const view = container();
  await act(() => { render(<Session questions={questions} poems={[poem]} sessionId="s" port={makePort()} settings={settings} onSettings={() => {}} onComplete={() => {}} {...props} />, view); });
  return view;
}
async function enterAnswer(view: HTMLElement) {
  const input = view.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = '白妙の'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '白妙の', inputType: 'insertText' })); });
  await act(async () => { (view.querySelector('button.primary') as HTMLButtonElement).click(); await Promise.resolve(); });
}
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

test('R-1: 範囲の10歌を一巡してから同じ歌を再出題する', () => {
  const many = Array.from({ length: 10 }, (_, index) => [0, 1].map((suffix) => ({ ...questions[0], questionId: `q${index + 1}-${suffix}`, poemId: `p${String(index + 1).padStart(3, '0')}` }))).flat();
  expect(planQuestions('learn', many, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'seed').map((item) => item.poemId)).toEqual(['p001', 'p002', 'p003', 'p004', 'p005', 'p006', 'p007', 'p008', 'p009', 'p010']);
});

test('R-2: 練習は穴埋めだけを選び未入力では採点できない', async () => {
  const author = { ...questions[0], questionId: 'author', type: 'author' as const };
  expect(planQuestions('learn', [author, questions[0]], [10], 'seed').every((item) => item.type === 'blank')).toBe(true);
  expect(planQuestions('exam', [author, questions[0]], [10], 'seed').every((item) => item.type === 'blank')).toBe(true);
  const view = await mountSession();
  expect(view.querySelector('button.primary')?.textContent).toBe('答え合わせ');
  expect((view.querySelector('button.primary') as HTMLButtonElement).disabled).toBe(true);
});

test('R-3: 丸角空欄と五つの句を保ち開示時に正解を空欄へ入れる', async () => {
  const view = await mountSession();
  expect(view.querySelector('.blank-slot')).not.toBeNull();
  expect(view.querySelector('.question-poem')?.children).toHaveLength(5);
  await enterAnswer(view);
  expect(view.querySelector('.blank-slot--filled')?.textContent).toBe('白妙の');
});

test('R-4: 問題報告は開示後だけ補助操作として現れ次問へ残らない', async () => {
  const two = [...questions, { ...questions[0], questionId: 'p010-ku4', answer: '衣ほすてふ' }];
  const view = await mountSession({ questions: two });
  expect(view.textContent).not.toContain('問題を報告');
  await enterAnswer(view);
  expect(view.querySelector('button.report-link')).not.toBeNull();
  await act(async () => { (view.querySelector('button.report-link') as HTMLButtonElement).click(); await Promise.resolve(); });
  expect(view.textContent).toContain('この端末に保存しました');
  await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === '次へ')!.click(); });
  expect(view.textContent).not.toContain('この端末に保存しました');
});

test('R-5: 歌の確認画面は表示した歌の閲覧イベントを保存する', async () => {
  const port = makePort();
  const view = container();
  await act(async () => { render(<Home port={port} poems={[poem]} questions={[]} />, view); await Promise.resolve(); });
  await act(async () => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === '歌を確認する')!.click(); await Promise.resolve(); });
  expect(port.events).toHaveLength(1);
  expect(port.events[0]).toMatchObject({ poemId: 'p010', kind: 'view', outcome: 'viewed' });
});

test('R-6: 読みと向きは単一ボタンで巡回し次問はヒント未使用に戻る', async () => {
  const view = container(); let reading = 'no-ruby'; let writing = 'vertical';
  await act(() => { render(<><ReadingToggle value="no-ruby" onChange={(value) => { reading = value; }} /><WritingModeToggle value="vertical" onChange={(value) => { writing = value; }} /></>, view); });
  await act(() => { (view.querySelector('.reading-toggle') as HTMLButtonElement).click(); (view.querySelector('.writing-toggle') as HTMLButtonElement).click(); });
  expect({ reading, writing }).toEqual({ reading: 'historical', writing: 'horizontal' });
  const state = { phase: 'revealed', questionIndex: 0, questionCount: 2, cardNo: 1, cardIndex: 0, cardCount: 2, hintUsed: true, submitted: null, judgement: 'correct', saveFailure: null } as FlowState;
  expect(advance(state).hintUsed).toBe(false);
});

test('R-7: トップは二入口で穴埋め内に練習と本番の短い説明を出す', async () => {
  const view = container();
  await act(() => { render(<Home port={makePort()} poems={[poem]} questions={questions} />, view); });
  expect(['歌を確認する', '穴埋めに取り組む'].every((label) => Array.from(view.querySelectorAll('button')).some((button) => button.textContent === label))).toBe(true);
  await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === '穴埋めに取り組む')!.click(); });
  expect(view.textContent).toContain('読みを確かめ、1問ずつ答え合わせします。');
  expect(view.textContent).toContain('歌番号と読みを隠して解きます。');
});

test('R-8: 本番だけ紙回答を選べ紙では開示後に自己採点する', async () => {
  const picker = container(); let answerMode = '';
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 10 }} order="number" onBack={() => {}} onStart={(_range, _order, mode) => { answerMode = mode; }} />, picker); });
  await act(() => { Array.from(picker.querySelectorAll('button')).find((button) => button.textContent === '紙に書く')!.click(); });
  await act(() => { (picker.querySelector('button.primary') as HTMLButtonElement).click(); });
  expect(answerMode).toBe('paper');
  render(null, picker);
  await act(() => { render(<Session questions={questions} poems={[poem]} entry="exam" answerMode="paper" sessionId="s" port={makePort()} settings={settings} onSettings={() => {}} onComplete={() => {}} />, picker); });
  expect(picker.querySelector('input[placeholder]')).toBeNull();
  await act(() => { Array.from(picker.querySelectorAll('button')).find((button) => button.textContent === '答えを確認する')!.click(); });
  expect(picker.querySelector('[aria-label="自己採点"]')).not.toBeNull();
});

test('R-9: 公開表示は通常数字と歌表記を使い本番では番号を隠す', async () => {
  const view = await mountSession({ entry: 'exam' });
  expect(view.textContent).not.toMatch(/p010|対象:/);
  expect(view.querySelector('.question-number')).toBeNull();
  render(<Result result={{ range: { from: 10, to: 10 }, questionCount: 1, breakdown: { viewed: 0, correct: 1, partial: 0, needsReview: 0, incorrect: 0 }, allCorrect: true, changes: [{ poemId: 'p010', before: 0, after: 1 }], poems: [], retryCardNumbers: [] }} onRetryWeak={() => {}} onRetrySame={() => {}} onHome={() => {}} />, view);
  expect(view.textContent).toContain('歌ごとの状態');
  expect(view.textContent).not.toContain('p010');
});

test('R-10: 戻る操作は中断確認を経て続行かトップ復帰を選べる', async () => {
  let backed = false; const view = await mountSession({ onBack: () => { backed = true; } });
  await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === '戻る')!.click(); });
  expect(view.querySelector('[role="dialog"]')).not.toBeNull();
  await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === '練習を続ける')!.click(); });
  expect(view.querySelector('[role="dialog"]')).toBeNull();
  await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === '戻る')!.click(); });
  await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === 'トップへ戻る')!.click(); });
  expect(backed).toBe(true);
});
