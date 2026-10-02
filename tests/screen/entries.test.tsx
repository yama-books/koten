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
test('entries: practice choices stay hidden until requested', async () => { const view = await mount(); expect(view.textContent).not.toContain('読みを隠して穴埋め'); });
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
  await act(() => { Array.from(view.querySelectorAll('button')).find((item) => item.textContent === '学習方法を選ぶ')!.click(); });
  expect(view.textContent).toContain('歌本文');
  expect(view.textContent).toContain('作者');
  expect(view.textContent).toContain('本番');
  expect(view.textContent).toContain('穴埋めで確認');
  expect(view.textContent).toContain('試験のように解いて採点');
});
// 2026-10-02・依頼者：押せることが分かるよう、結果画面の「学習記録の詳細」と同じ枠のボタンにする。
// ▼ と予告は飾り（CSS の `data-hint`）で、ボタンの文字は「学習方法を選ぶ」のまま。
test('entries: 学習方法を選ぶは中身の予告を持ち、開閉の状態を伝える', async () => {
  const view = await mountWithQuestions();
  const toggle = Array.from(view.querySelectorAll('button')).find((item) => item.textContent === '学習方法を選ぶ')!;
  expect(toggle.dataset.hint).toBe('穴埋め・作者・試験から選ぶ');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  await act(() => { toggle.click(); });
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
});
