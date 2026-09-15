import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { App } from '../../packages/hyakunin/src/main.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';

/**
 * 2026-09-15・依頼者。**指定の難しさの中でまんべんなく出す。**
 *
 * 部品（`planQuestions`）に正解済みを渡せば違う問題を選ぶ、という単体試験だけでは、
 * **画面が記録を渡していなくても全部緑になる。** ここは画面から 2 回始めて確かめる。
 */
const poems = readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/poems.json'), 'utf8');
const blanks = [1, 2, 3, 4, 5].map((ku) => ({
  questionId: `p001-blank-ku${ku}`, poemId: 'p001', skill: 'text' as const, type: 'blank' as const,
  blankUnit: 'ku' as const, blankedKu: [ku], rung: 1, prompt: `第${ku}句`, answer: '白妙の', answerHistorical: 'しろたへの', answerModern: 'しろたえの',
  acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: [], candidates: [], normalization: 'kana' as const, note: null, sourceRef: 'fixture',
  reviewStatus: 'human-confirmed' as const, confirmationMode: 'individual' as const, confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null,
}));
const originalFetch = globalThis.fetch;
const originalRandom = Math.random;
let root: HTMLDivElement | undefined;

afterEach(() => {
  if (root) { render(null, root); root.remove(); root = undefined; }
  (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  Math.random = originalRandom;
  window.history.replaceState(null, '', '/');
});

const settle = async () => { for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); };
const button = (label: string) => Array.from(root!.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent === label)!;
/** いま空欄が立っている句。**出題画面は歌の本文を出す**ので、句の位置で問題を見分ける。 */
const blankedLine = () => root!.querySelector('.blank-slot')?.parentElement?.textContent;

async function start(port: ReturnType<typeof createMemoryPort>) {
  await act(async () => { Array.from(root!.querySelectorAll('button')).find((item) => item.textContent === '学習方法を選ぶ')!.click(); });
  await act(async () => { button('歌本文').click(); });
  await settle();
  await act(async () => { button('この範囲で始める').click(); await Promise.resolve(); });
  await settle();
  return port;
}

test('まんべんなく配線: 前に正解した句は、次に始めたときに出ない', async () => {
  window.history.replaceState(null, '', '/?from=1&to=1');
  (globalThis as unknown as { fetch: typeof fetch }).fetch = async (url) => {
    const name = String(url).split('/').pop()!;
    const bodies: Record<string, string> = { 'poems.json': poems, 'questions.blank.json': JSON.stringify(blanks), 'questions.author.json': '[]' };
    return { ok: true, status: 200, json: async () => JSON.parse(bodies[name] ?? '[]') } as Response;
  };
  /*
   * **種を固定する。** 回ごとの種は `Math.random` から作られるので、そのままだと
   * 2 回目が偶然ちがう問題を選び、**正解済みを避ける仕掛けを壊しても緑になる**
   * （2026-09-15 の破壊試験で実際に緑だった）。同じ種なら、避けない実装は同じ問題を出す。
   */
  Math.random = () => 0.4242;
  const port = { ...createMemoryPort(), saveLocalReport: async () => true };
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => { render(<App port={port} />, root!); });
  await settle();

  await start(port);
  const first = blankedLine();
  expect(first, '1 問目が出ていない').toBeTruthy();
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = '白妙の'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '白妙の', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  await settle();
  expect((await port.listEvents()).filter((event) => event.outcome === 'correct')).toHaveLength(1);

  // **中断の確認をはさむ。** ここを飛ばすと出題画面のままで、2 回目を始めたつもりになる。
  await act(async () => { button('ホームへ戻る').click(); });
  await act(async () => { button('トップへ戻る').click(); });
  await settle();
  expect(root!.textContent, 'ホームへ戻れていない').toContain('学習方法を選ぶ');
  await start(port);
  expect(blankedLine(), '正解済みの句をまた 1 問目に出している').not.toBe(first);
});
