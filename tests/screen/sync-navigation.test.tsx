import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test, vi } from 'vitest';
import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';
import { History } from '../../packages/hyakunin/src/ui/screens/History.tsx';
import type { HistorySummary } from '../../packages/hyakunin/src/domain/history.ts';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { initialSettings } from '../../packages/hyakunin/src/ui/settings.ts';

let root: HTMLDivElement | null = null;
afterEach(() => {
  if (root) { render(null, root); root.remove(); root = null; }
  try {
    window.sessionStorage.removeItem('hyakunin:sync-intro-session-dismissed');
    window.localStorage.removeItem('hyakunin:sync-intro-forever-dismissed');
  } catch { /* 保存領域が使えない試験環境でも画面状態は検証する。 */ }
});

function mount(view: Parameters<typeof render>[0]) {
  root = document.createElement('div');
  document.body.append(root);
  render(view, root);
  return root;
}

function button(label: string) {
  return Array.from(root!.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent === label);
}

test('ホームの短い案内から同期設定へ進み、OK で案内を閉じる', async () => {
  let opened = 0;
  const port = { ...createMemoryPort(), loadSettings: async () => ({ ...initialSettings, noticeConfirmed: true, grade: '中一' }) };
  const view = mount(<Home port={port} poems={[]} questions={[]} onOpenSync={() => { opened += 1; }} />);
  await vi.waitFor(() => expect(view.textContent).toContain('端末間で記録を自動同期する機能を追加しました。'));
  act(() => { button('試してみる')!.click(); });
  expect(opened).toBe(1);
  act(() => { view.querySelector<HTMLButtonElement>('.sync-intro__actions button:nth-child(2)')!.click(); });
  expect(view.textContent).not.toContain('端末間で記録を自動同期する機能を追加しました。');
});

test('ホーム末尾にはデータ管理を重複して出さない', () => {
  mount(<Home poems={[]} questions={[]} />);
  expect(button('これまでの記録')).toBeTruthy();
  expect(button('データ管理')).toBeUndefined();
});

test('記録が空でもデータ管理から端末間同期を開ける', () => {
  let opened = false;
  const empty: HistorySummary = { isEmpty: true, points: 0, touchedCount: 0, entries: [], groups: [], needsReview: [] };
  const view = mount(<History summary={empty} onHome={() => {}} initialTab="データ管理" onOpenSync={() => { opened = true; }} />);
  expect(view.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('データ管理');
  expect(view.textContent).toContain('自分のスマホとタブレットをつなぐ');
  act(() => { button('同期を設定する')!.click(); });
  expect(opened).toBe(true);
});
