import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { History } from '../../packages/hyakunin/src/ui/screens/History.tsx';
import { createIndexedDbPort, IMPORT_RECORD_LIMIT } from '../../packages/hyakunin/src/ui/adapters/indexeddb-port.ts';
import type { ApplicationPort } from '../../packages/hyakunin/src/ui/adapters/indexeddb-port.ts';
import type { HistorySummary } from '../../packages/hyakunin/src/domain/history.ts';

let root: HTMLDivElement | undefined;
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

const summary: HistorySummary = { isEmpty: false, touchedCount: 1, needsReview: [], entries: [] } as never;
const plan = { document: {} as never, preview: { schemaVersion: 1 as const, counts: { sessions: 2, events: 7, reports: 0 }, products: ['hyakunin'] } };

function stub(overrides: Partial<ApplicationPort> = {}): ApplicationPort {
  return {
    async appendEvent() { return { reason: 'write-failed' } as never; },
    async listEvents() { return []; },
    async saveSession() { return { reason: 'write-failed' } as never; },
    async loadLastSession() { return null; },
    async saveSettings() { return { reason: 'write-failed' } as never; },
    async loadSettings() { return null; },
    async saveLocalReport() { return true; },
    async exportRecords() { return { text: '{}', summary: { counts: { sessions: 2, events: 7, reports: 0 }, characters: 2 } }; },
    async previewImport() { return { ok: true, plan } as never; },
    async commitImport() { return { sessions: { added: 1, duplicates: 1 }, events: { added: 5, duplicates: 2 }, reports: { added: 0, duplicates: 0 } }; },
    ...overrides,
  } as ApplicationPort;
}

function mount(port?: ApplicationPort, given: HistorySummary = summary) {
  root = document.createElement('div');
  document.body.append(root);
  render(<History summary={given} onHome={() => {}} port={port} />, root);
  return root;
}
const button = (text: string) => Array.from(root!.querySelectorAll('button')).find((item) => item.textContent === text);

/**
 * 転送の口は `Partial` で任意にしてある。本番のポートから落ちても型は通り、
 * 画面は黙って機能ごと消える。**ここが唯一それを止める釘である。**
 */
test('transfer: 本番のポートは転送の3つの口をすべて持つ', () => {
  const port = createIndexedDbPort();
  for (const name of ['exportRecords', 'previewImport', 'commitImport'] as const) {
    expect(typeof port[name], `${name} が本番のポートに無い`).toBe('function');
  }
});

test('transfer: 取り込みには上限がある', () => {
  expect(IMPORT_RECORD_LIMIT).toBeGreaterThan(0);
});

test('transfer: 記録の画面に書き出しと読み込みを出す', () => {
  const view = mount(stub());
  expect(view.textContent).toContain('記録の持ち出し');
  expect(button('記録を書き出す')).toBeTruthy();
  expect(view.querySelector('input[type="file"]')).toBeTruthy();
});

test('transfer: 記録が空でも取り込みの入口を出す', () => {
  // 別の端末から持ち込む人にとって、ここが唯一の入口である。
  const view = mount(stub(), { ...summary, isEmpty: true, touchedCount: 0 });
  expect(view.textContent).toContain('記録の持ち出し');
});

test('transfer: 口を持たないポートでは出さない', () => {
  const view = mount(stub({ exportRecords: undefined, previewImport: undefined, commitImport: undefined }));
  expect(view.textContent).not.toContain('記録の持ち出し');
});

test('transfer: port を渡さなければ出さない', () => {
  expect(mount(undefined).textContent).not.toContain('記録の持ち出し');
});

test('transfer: 読み込みは件数を見せてから、押されて初めて書く', async () => {
  let committed = 0;
  const view = mount(stub({ async commitImport() { committed += 1; return { sessions: { added: 1, duplicates: 0 }, events: { added: 5, duplicates: 2 }, reports: { added: 0, duplicates: 0 } }; } }));
  const input = view.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [{ text: async () => '{}' }], configurable: true });

  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
  expect(view.textContent).toContain('回 2 件・解答 7 件');
  // 下見の段階では 1 件も書いていないこと。ここが §9 の「確認してから」である。
  expect(committed).toBe(0);

  await act(async () => { button('この内容で読み込む')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(committed).toBe(1);
  expect(view.textContent).toContain('6件を追加し、2件は同じ記録なので重ねませんでした');
});

test('transfer: やめると書かずに戻る', async () => {
  let committed = 0;
  const view = mount(stub({ async commitImport() { committed += 1; return null; } }));
  const input = view.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [{ text: async () => '{}' }], configurable: true });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
  await act(async () => { button('やめる')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(committed).toBe(0);
  expect(view.textContent).not.toContain('この内容で読み込む');
});

test('transfer: 読めないファイルは理由を出し、書かない', async () => {
  let committed = 0;
  const view = mount(stub({
    async previewImport() { return { ok: false, message: 'このアプリの書き出し形式ではありません。' }; },
    async commitImport() { committed += 1; return null; },
  }));
  const input = view.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [{ text: async () => 'x' }], configurable: true });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
  expect(view.querySelector('[role="alert"]')?.textContent).toContain('このアプリの書き出し形式ではありません。');
  expect(committed).toBe(0);
});
