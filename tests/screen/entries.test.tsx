import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';

let root: HTMLDivElement | undefined;
const poems = [{ cardNo: 10, ku: ['a', 'b', 'c', 'd', 'e'], author: { canonical: '作者' }, reading: { status: 'confirmed', historical: { ku: ['a', 'b', 'c', 'd', 'e'], author: 'さくしゃ' }, modern: { ku: ['a', 'b', 'c', 'd', 'e'], author: 'さくしゃ' } } }] as never[];
const port = () => ({ ...createMemoryPort(), saveLocalReport: async () => true });
async function mount() { root = document.createElement('div'); document.body.append(root); await act(() => { render(<Home port={port()} poems={poems} questions={[]} onPickEntry={() => {}} />, root!); }); return root; }
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });
test('entries: view is enabled with real empty questions', async () => { const view = await mount(); expect(Array.from(view.querySelectorAll('button')).find((item) => item.textContent === '歌を確認する')?.disabled).toBe(false); });
test('entries: practice is disabled with real empty questions', async () => { const view = await mount(); expect(Array.from(view.querySelectorAll('button')).find((item) => item.textContent === 'とりあえず始める')?.disabled).toBe(true); });
test('entries: old five-way choices are not shown', async () => { const view = await mount(); expect(view.textContent).not.toMatch(/おぼえる|全体確認|試験前の確認/); });
test('entries: practice choices stay hidden until requested', async () => { const view = await mount(); expect(view.textContent).not.toContain('本番のように解く'); });
test('entries: preparation message is honest and not an error', async () => { const view = await mount(); expect(view.textContent).toContain('問題はまだ準備中です。いまは「歌を確認する」を使えます。'); expect(view.textContent).not.toMatch(/エラー|失敗/); });

// 出題が入った 2026-09-04 以降、実際に効くのはこちらの向きである。
// 空配列の側だけを見ていると、isEntryAvailable が常に false を返しても全部緑になる。
async function mountWithQuestions() {
  root = document.createElement('div'); document.body.append(root);
  const questions = [{ questionId: 'q1', poemId: 'p010', skill: 'text', type: 'blank' }] as never[];
  await act(() => { render(<Home port={port()} poems={poems} questions={questions} onPickEntry={() => {}} />, root!); });
  return root;
}
test('entries: practice is enabled once questions exist', async () => {
  const view = await mountWithQuestions();
  expect(Array.from(view.querySelectorAll('button')).find((item) => item.textContent === 'とりあえず始める')?.disabled).toBe(false);
});
test('entries: practice expands to practice and exam choices', async () => {
  const view = await mountWithQuestions();
  await act(() => { Array.from(view.querySelectorAll('button')).find((item) => item.textContent === 'とりあえず始める')!.click(); });
  expect(view.textContent).toContain('練習する');
  expect(view.textContent).toContain('本番のように解く');
  expect(view.textContent).toContain('1問ずつ答え合わせ');
  expect(view.textContent).toContain('歌番号・読みなし');
});
