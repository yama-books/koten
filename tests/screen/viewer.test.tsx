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
  await act(async () => { Array.from(view.querySelectorAll('button')).find((item) => item.textContent === '見るだけ')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
}
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

test('viewer: entering view mode shows the first poem in range', async () => {
  const view = await mount();
  await enterViewer(view);
  expect(view.textContent).toContain('k10-1');
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
