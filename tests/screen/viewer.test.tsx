import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';

let root: HTMLDivElement | undefined;
function poem(cardNo: number) {
  return { cardNo, ku: [`k${cardNo}-1`, `k${cardNo}-2`, `k${cardNo}-3`, `k${cardNo}-4`, `k${cardNo}-5`], author: { canonical: `作者${cardNo}` }, reading: { status: 'confirmed', historical: { ku: ['a', 'b', 'c', 'd', 'e'], author: 'さくしゃ' }, modern: { ku: ['a', 'b', 'c', 'd', 'e'], author: 'さくしゃ' } } };
}
const poems = [poem(10), poem(11), poem(12)] as never[];
const port = () => ({ ...createMemoryPort(), saveLocalReport: async () => true });
async function mount() { root = document.createElement('div'); document.body.append(root); await act(() => { render(<Home port={port()} poems={poems} questions={[]} onPickEntry={() => {}} />, root!); }); return root; }
async function enterViewer(view: HTMLDivElement) {
  await act(async () => { Array.from(view.querySelectorAll('button')).find((item) => item.textContent === '歌を確認する')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
}
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

test('viewer: entering view mode shows the first poem in range', async () => {
  const view = await mount();
  await enterViewer(view);
  expect(view.textContent).toContain('k10-1');
});

test('viewer: author recall hides the name until revealed and hides it again for the next poem', async () => {
  const view = await mount();
  const click = async (label: string) => act(async () => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === label)!.click(); await Promise.resolve(); });
  await click('学習方法を選ぶ');
  await click('作者名を確認する');
  expect(view.textContent).toContain('k10-1');
  expect(view.textContent).not.toContain('作者10');
  await click('作者名を見る');
  expect(view.textContent).toContain('作者10');
  await click('次の歌');
  expect(view.textContent).toContain('k11-1');
  expect(view.textContent).not.toContain('作者11');
  await click('作者名を見る');
  expect(view.textContent).toContain('作者11');
});

test('viewer: next poem button moves forward', async () => {
  const view = await mount();
  await enterViewer(view);
  await act(() => { Array.from(view.querySelectorAll('button')).find((item) => item.textContent === '次の歌')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  expect(view.textContent).toContain('k11-1');
  expect(view.textContent).not.toContain('k10-1');
});

test('viewer: previous poem button moves back after advancing', async () => {
  const view = await mount();
  await enterViewer(view);
  await act(() => { Array.from(view.querySelectorAll('button')).find((item) => item.textContent === '次の歌')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await act(() => { Array.from(view.querySelectorAll('button')).find((item) => item.textContent === '前の歌')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  expect(view.textContent).toContain('k10-1');
});

// --- 2026-10-02・依頼者：歌を出す時、句を順にふわっと浮かべる（煩わしくない程度に） ---
test('viewer: 句は読む順に遅れを付け、作者名は句の後に出す。歌を移ると作り直して動きを付け直す', async () => {
  const view = await mount();
  await enterViewer(view);
  const sheet = view.querySelector<HTMLElement>('.poem-sheet')!;
  expect(sheet.classList.contains('poem-sheet--enter')).toBe(true);
  expect(Array.from(sheet.querySelectorAll<HTMLElement>('.poem__half > span')).map((line) => line.style.getPropertyValue('--k'))).toEqual(['0', '1', '2', '3', '4']);
  expect(sheet.querySelector<HTMLElement>('.author')!.style.getPropertyValue('--k')).toBe('5');
  await act(() => { Array.from(view.querySelectorAll('button')).find((item) => item.textContent === '次の歌')!.click(); });
  expect(view.querySelector('.poem-sheet')).not.toBe(sheet);
});

test('viewer: 作者名を確認する時は、「作者名を見る」を押してすぐ作者名を出す（遅れを付けない）', async () => {
  const view = await mount();
  const click = async (label: string) => act(async () => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === label)!.click(); await Promise.resolve(); });
  await click('学習方法を選ぶ');
  await click('作者名を確認する');
  expect(view.querySelector<HTMLElement>('.author')!.style.getPropertyValue('--k')).toBe('0');
});

test('viewer: 動きを減らす設定では句の動きを止める', async () => {
  const css = readFileSync(join(process.cwd(), 'packages/hyakunin/src/styles.css'), 'utf8');
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.poem-sheet--enter \.poem__half > span,\s*\.poem-sheet--enter \.author > \* \{ animation: none !important; \}/);
});
