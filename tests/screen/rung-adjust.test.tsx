import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { App } from '../../packages/hyakunin/src/main.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';

/**
 * 2026-09-15・発注086。**画面から出題までの配線。**
 *
 * 部品（`planQuestions`・`rungRecordFor`）の単体試験は、それぞれが正しいことしか言わない。
 * **画面で押したことが、配られる問題と保存される記録に届いているか**をここで見る。
 */
const poems = readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/poems.json'), 'utf8');
const blanks = [1, 2, 3, 4, 5, 6].flatMap((cardNo) => [1, 2, 3].map((rung) => ({
  questionId: `p${String(cardNo).padStart(3, '0')}-blank-r${rung}`, poemId: `p${String(cardNo).padStart(3, '0')}`, skill: 'text' as const, type: 'blank' as const,
  // **段ごとに隠す句を変える。** 画面は問題文ではなく歌の本文を出すので、
  // 隠れている句が違わないと、配られた段の違いを画面から見分けられない。
  blankUnit: 'ku' as const, blankedKu: [rung], rung, prompt: `段${rung}の問題`, answer: '白妙の', answerHistorical: 'しろたへの', answerModern: 'しろたえの',
  acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: [], candidates: [], normalization: 'kana' as const, note: null, sourceRef: 'fixture',
  reviewStatus: 'human-confirmed' as const, confirmationMode: 'individual' as const, confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null,
})));
const originalFetch = globalThis.fetch;
let root: HTMLDivElement | undefined;

afterEach(() => {
  if (root) { render(null, root); root.remove(); root = undefined; }
  (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  window.history.replaceState(null, '', '/');
});

async function openPicker() {
  window.history.replaceState(null, '', '/?from=1&to=6');
  (globalThis as unknown as { fetch: typeof fetch }).fetch = async (url) => {
    const name = String(url).split('/').pop()!;
    const bodies: Record<string, string> = { 'poems.json': poems, 'questions.blank.json': JSON.stringify(blanks), 'questions.author.json': '[]' };
    return { ok: true, status: 200, json: async () => JSON.parse(bodies[name] ?? '[]') } as Response;
  };
  const port = { ...createMemoryPort(), saveLocalReport: async () => true };
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => { render(<App port={port} />, root!); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '学習方法を選ぶ')!.click(); });
  await act(async () => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '歌本文')!.click(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  return port;
}

const button = (label: string) => Array.from(root!.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent === label)!;

test('086配線: 記録の無い学習者には一番下の段を出し、そう伝える', async () => {
  await openPicker();
  expect(root!.textContent).toContain('いまは語をひとつ書く段です。');
});

test('086配線: むずかしくすると、配られる問題がその段になる', async () => {
  await openPicker();
  await act(async () => { button('むずかしくする').click(); });
  expect(root!.textContent).toContain('いまは文節を書く段です。');
  await act(async () => { button('この範囲で始める').click(); await Promise.resolve(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  // p001 の句は 秋の田の／かりほの庵の／苫をあらみ／…。段2 なら**第2句**に空欄が立つ。
  const blanked = root!.querySelector('.blank-slot')?.parentElement?.textContent;
  expect(blanked, '空欄が第2句に無い（段2 が配られていない）').toContain('かりほの庵の');
  expect(blanked, '空欄が第1句のままである（段1 が配られている）').not.toContain('秋の田の');
});

test('086配線: 上げて解いた記録には印が付き、天井は自動の位置の段で残る', async () => {
  const port = await openPicker();
  await act(async () => { button('むずかしくする').click(); });
  await act(async () => { button('この範囲で始める').click(); await Promise.resolve(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = '白妙の'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '白妙の', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  const events = await port.listEvents();
  expect(events).toHaveLength(1);
  expect(events[0]?.raised, '手で上げた印が記録に届いていない').toBe(true);
  expect(events[0]?.rung, '上げた先の段の天井が開いている').toBe(1);
});

test('086配線: 自動の位置のままなら印を付けない', async () => {
  const port = await openPicker();
  await act(async () => { button('この範囲で始める').click(); await Promise.resolve(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = '白妙の'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '白妙の', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  const blanked = root!.querySelector('.blank-slot')?.parentElement?.textContent;
  expect(blanked, '自動の位置は段1 なので第1句に空欄が立つ').toContain('秋の田の');
  const events = await port.listEvents();
  expect(events[0]?.rung).toBe(1);
  expect(events[0]?.raised, '既定値を保存に書き込んでいる').toBeUndefined();
});

test('086配線: 手動の調整は保存に残らない', async () => {
  // **その回かぎりである**（§4.2）。保存に残すと、下げた先で加算が 0 のまま行き止まりになる。
  const port = await openPicker();
  await act(async () => { button('やさしくする').click(); });
  await act(async () => { button('むずかしくする').click(); });
  await act(async () => { button('むずかしくする').click(); });
  await act(async () => { button('この範囲で始める').click(); await Promise.resolve(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const saved = await port.loadSettings();
  expect(JSON.stringify(saved ?? {})).not.toMatch(/rung|adjust|raised/i);
});
