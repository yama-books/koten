import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { Session } from '../../packages/hyakunin/src/ui/screens/Session.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { parseQuestions, type PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';

const settings = { key: 'user' as const, reading: 'no-ruby' as const, writing: 'vertical' as const, order: 'number' as const, soundEnabled: false, noticeConfirmed: false };
const fixture = parseQuestions([
  { questionId: 'q10a', poemId: 'p010', skill: 'text', type: 'blank', blankUnit: 'word', blankedKu: [1], rung: 3, prompt: '白妙の', answer: '白妙の', answerHistorical: 'しろたへの', answerModern: 'しろたえの', acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: ['しろたえの'], candidates: [], normalization: 'kana', note: null, sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null },
] as PublishedQuestion[]);

/**
 * 2026-09-14 の調査。**公開版で「答えを確認する」が 1152 解答に対して 0 件**だった。
 * 依頼者は紙モードを使ったと証言している。
 *
 * **根本原因: この計数は本番では起きず、本番以外では紙モードを選べない。**
 *
 * - `RangePicker.tsx:76` — 「答え方（紙に書く）」の節は `entry === "exam"` の中にある。
 *   **紙モードを選べるのは本番だけである。**
 * - `Session.tsx:836` — `reveal` を数えるのは `answerMode === "paper"` かつ **`!isExam`** のとき。
 *   本番では「次へ」になり `nextExam` へ行く。**数えない。**
 *
 * したがって `answerMode === "paper"` ⟹ `entry === "exam"` ⟹ `isExam` となり、
 * **計数の枝は公開版から到達できない。** 壊れた書き込みではなく、**到達しない枝**である。
 * 公開版の画面でも確認済み（本番にだけ「答え方」が出る）。
 *
 * 下の 2 本は**現状を写したもの**で、直し方の裁定はまだ取っていない。
 *
 * `createMemoryPort()` は `countUi` を持たず、`port.countUi?.()` は試験では**常に無反応**である。
 * 記録するポートを噛ませないと、押しても押さなくても緑になる。
 */
let root: HTMLDivElement | undefined;
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

function spyPort() {
  const counted: Array<{ key: string; localDate: string }> = [];
  return { port: { ...createMemoryPort(), saveLocalReport: async () => true, countUi: (key: string, localDate: string) => { counted.push({ key, localDate }); } }, counted };
}

async function mountPaper(entry: string) {
  const { port, counted } = spyPort();
  root = document.createElement('div'); document.body.append(root);
  await act(async () => {
    render(<Session questions={fixture} sessionId="s" entry={entry as never} answerMode="paper" port={port as never} settings={settings} onSettings={() => {}} onComplete={() => {}} />, root!);
  });
  return counted;
}

const button = (label: string) => Array.from(root!.querySelectorAll('button')).find((node) => node.textContent === label);

test('紙モード（本番以外）で「答えを確認する」を押すと reveal を数える', async () => {
  const counted = await mountPaper('learn');
  const reveal = button('答えを確認する');
  expect(reveal, `「答えを確認する」が出ていない。出ているボタン: ${Array.from(root!.querySelectorAll('button')).map((node) => node.textContent).join('／')}`).toBeTruthy();
  await act(() => { reveal!.click(); });
  expect(counted.map((item) => item.key)).toContain('reveal');
});

test('本番の紙モードでは「次へ」であり、reveal を数えない（現状の仕様）', async () => {
  // 本番は答え合わせを最後にまとめて行うので、ここで開示は起きない。
  const counted = await mountPaper('exam');
  expect(button('答えを確認する')).toBeFalsy();
  expect(button('次へ')).toBeTruthy();
  await act(() => { button('次へ')!.click(); });
  expect(counted.map((item) => item.key)).not.toContain('reveal');
});
