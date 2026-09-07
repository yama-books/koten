import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test, vi } from 'vitest';
import { appConfig } from '@koten/shared/app-config';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import type { Session } from '@koten/shared/domain/event';

const homeJsdom = (globalThis as typeof globalThis & { jsdom?: { window: Window } }).jsdom;
if (homeJsdom) Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: homeJsdom.window.localStorage });

vi.mock('@koten/shared/data/load', () => ({
  loadJson: vi.fn().mockResolvedValue([]),
}));

import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';

let container: HTMLDivElement | undefined;

afterEach(() => {
  if (container) {
    render(null, container);
    container.remove();
    container = undefined;
  }
  window.localStorage.clear();
});

async function renderHome() {
  const port = { ...createMemoryPort(), saveLocalReport: async () => true };
  await port.saveSettings({ key: 'user', reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false, noticeConfirmed: true });
  container = document.createElement('div');
  document.body.append(container);
  await act(async () => {
    render(<Home port={port} />, container!);
    await Promise.resolve();
  });
  return container;
}

test('home: renders the product display name', async () => {
  const root = await renderHome();
  expect(root.textContent).toContain(appConfig.products.hyakunin.displayName);
});

test('home: shows the range inputs', async () => {
  const root = await renderHome();
  expect(root.querySelectorAll('input[type="number"]')).toHaveLength(2);
});

async function renderRestorableHome(to: number, confirmed = 0) {
  const port = { ...createMemoryPort(), saveLocalReport: async () => true };
  const session: Session = { sessionId: 'resume', product: 'hyakunin', from: 1, to, entry: 'learn', order: 'number', startedOn: '2026-09-06', completed: false, questionCount: 10 };
  port.loadLastSession = async () => session;
  port.listEvents = async () => Array.from(
    { length: confirmed },
    (_, index) => ({ product: 'hyakunin', poemId: `p${String(index + 1).padStart(3, '0')}` }) as never,
  );
  const poems = Array.from({ length: to }, (_, index) => ({ cardNo: index + 1 }));
  container = document.createElement('div');
  document.body.append(container);
  await act(async () => {
    render(<Home port={port} poems={poems as never} />, container!);
    await Promise.resolve();
    await Promise.resolve();
  });
  return container;
}

test('home: a one-chunk restore does not explain splitting and shows completed-card progress', async () => {
  const root = await renderRestorableHome(20);
  const restore = root.querySelector('.restore-offer')!;
  expect(restore.textContent).toContain('範囲 1番〜20番・あと20首');
  expect(restore.textContent).not.toContain('20首ずつ');
  expect(restore.textContent).not.toContain('1回目');
  expect(restore.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('0');
  expect(restore.textContent).toContain('0首/20首');
});

test('home: a multi-chunk restore explains splitting only once when remaining counts agree', async () => {
  const root = await renderRestorableHome(21, 20);
  const restore = root.querySelector('.restore-offer')!;
  expect(restore.textContent).toContain('20首ずつ・全2まとまり');
  expect(restore.textContent).toContain('次は 21番〜21番（1首）');
  expect(restore.textContent).toContain('20首/21首');
  expect(restore.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('95');
});

test('home: closing the install notice persists a quiet returning hint', async () => {
  const root = await renderHome();
  const heading = root.querySelector('h1')!;
  const notice = root.querySelector('.install-guide--first')!;
  expect(heading.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  await act(() => { Array.from(notice.querySelectorAll('button')).find((button) => button.textContent === '閉じる')!.click(); });
  expect(window.localStorage.getItem('hyakunin:install-notice-dismissed')).toBe('true');
  expect(root.querySelector('.install-guide--first')).toBeNull();
  expect(root.querySelector('.install-guide--returning')?.textContent).toContain('ホーム画面に追加する');
});

// 閉じたことを覚えているのは、書き込みではなく**次のマウントでの読み出し**である。
// 同じ描画の中だけを見ると、読み出しを落としても全緑になる。
test('home: a reload after closing the install notice keeps it closed', async () => {
  const first = await renderHome();
  await act(() => { Array.from(first.querySelectorAll('.install-guide--first button')).find((button) => button.textContent === '閉じる')!.click(); });
  render(null, first);
  first.remove();
  container = undefined;
  const reloaded = await renderHome();
  expect(reloaded.querySelector('.install-guide--first')).toBeNull();
  expect(reloaded.querySelector('.install-guide--returning')).not.toBeNull();
});

test('home: standalone launch does not show an install notice', async () => {
  const original = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockReturnValue({ matches: true }) });
  const root = await renderHome();
  expect(root.querySelector('.install-guide')).toBeNull();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: original });
});
