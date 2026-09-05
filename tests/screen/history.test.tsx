import { render } from 'preact';
import { act } from 'preact/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { History } from '../../packages/hyakunin/src/ui/screens/History.tsx';
import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';
import { App } from '../../packages/hyakunin/src/main.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import type { HistorySummary } from '../../packages/hyakunin/src/domain/history.ts';

let root: HTMLDivElement | undefined;
const summary: HistorySummary = { isEmpty: false, touchedCount: 2, entries: [
  { poemId: 'p012', cardNo: 12, percent: 90, color: 'green', untouched: false, authorUnconfirmed: false, needsReview: true },
  { poemId: 'p045', cardNo: 45, percent: 0, color: 'gray', untouched: false, authorUnconfirmed: true, needsReview: true },
  { poemId: 'p099', cardNo: 99, percent: 0, color: 'gray', untouched: true, authorUnconfirmed: true, needsReview: false },
], needsReview: [] };
summary.needsReview = summary.entries.slice(0, 2);
function mount(value = summary, onHome = () => {}) { root = document.createElement('div'); document.body.append(root); render(<History summary={value} onHome={onHome} />, root); return root; }
afterEach(() => { root?.remove(); root = undefined; });
test('history: 全首の記録を表示する', () => { const view = mount(); expect(view.textContent).toContain('全100首'); for (const card of ['12番', '45番', '99番']) expect(view.querySelectorAll('.history-list')[1]?.textContent).toContain(card); });
test('history: メーターと数値を表示する', () => { const view = mount(); expect(view.querySelectorAll('[role="meter"]')).toHaveLength(4); expect(view.textContent).toContain('習熟度 90%'); });
test('history: 未着手にはメーターを出さない', () => { const item = Array.from(mount().querySelectorAll('li')).find((node) => node.textContent?.includes('99番'))!; expect(item.textContent).toContain('未着手'); expect(item.querySelector('[role="meter"]')).toBeNull(); });
// 初回公開では作者を出題しないため、外しようのない印を出さない（依頼者裁定・2026-09-05）。
test('history: 作者未確認を併記しない', () => { expect(mount().textContent).not.toContain('作者 未確認'); expect(summary.entries.some((entry) => entry.authorUnconfirmed)).toBe(true); });
test('history: 要確認を番号順で表示する', () => { const text = mount().querySelector('.history-list')!.textContent!; expect(text.indexOf('12番')).toBeLessThan(text.indexOf('45番')); });
test('history: 要確認なしの文言を表示する', () => expect(mount({ ...summary, needsReview: [] }).textContent).toContain('要確認の歌はありません'));
test('history: 空状態に始める導線がある', () => { const view = mount({ ...summary, isEmpty: true, entries: [], needsReview: [], touchedCount: 0 }); expect(view.textContent).toContain('まだ記録がありません'); expect(view.textContent).toContain('始める'); });
test('history: Home の記録導線はコールバックを呼ぶ', () => { let opened = false; root = document.createElement('div'); document.body.append(root); render(<Home poems={[] as never[]} questions={[]} onOpenHistory={() => { opened = true; }} />, root); Array.from(root.querySelectorAll('button')).find((button) => button.textContent === 'これまでの記録')!.click(); expect(opened).toBe(true); });
test('history: 記録を開く間はloadingを表示する', async () => {
  const source = readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/poems.json'), 'utf8');
  const previousFetch = globalThis.fetch;
  (globalThis as unknown as { fetch: typeof fetch }).fetch = async (url) => ({ ok: true, status: 200, json: async () => JSON.parse(String(url).endsWith('poems.json') ? source : '[]') } as Response);
  const base = createMemoryPort(); let gate = false; let release: (() => void) | undefined;
  const port = { ...base, listEvents: async () => !gate ? [] : new Promise<readonly []>((resolve) => { release = () => resolve([]); }), saveLocalReport: async () => true };
  root = document.createElement('div'); document.body.append(root);
  await act(async () => { render(<App port={port} />, root!); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const button = Array.from(root.querySelectorAll('button')).find((candidate) => candidate.textContent === 'これまでの記録');
  expect(button).toBeTruthy(); gate = true;
  await act(async () => { button!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(root.textContent).toContain('記録を読み込んでいます。');
  await act(async () => { release!(); await Promise.resolve(); });
  expect(root.textContent).toContain('まだ記録がありません');
  (globalThis as unknown as { fetch: typeof fetch }).fetch = previousFetch;
});
