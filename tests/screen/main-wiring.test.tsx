import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { App } from '../../packages/hyakunin/src/main.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';

const poems = readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/poems.json'), 'utf8');
const question = ['p001', 'p010', 'p100'].map((poemId) => ({ questionId: `q${poemId.slice(1)}`, poemId, skill: 'text' as const, type: 'blank' as const, blankUnit: 'word' as const, prompt: poemId === 'p010' ? '白妙の' : poemId, answer: '白妙の', answerHistorical: 'しろたへの', answerModern: 'しろたえの', acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: [], candidates: [], normalization: 'kana' as const, sourceRef: 'fixture', reviewStatus: 'human-confirmed' as const, confirmationMode: 'individual' as const, confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null }));
const originalFetch = globalThis.fetch;
let root: HTMLDivElement | undefined;

function installFetch() {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = async (url) => {
    const name = String(url).split('/').pop()!;
    const bodies: Record<string, string> = { 'poems.json': poems, 'questions.blank.json': JSON.stringify(question), 'questions.author.json': '[]' };
    return { ok: true, status: 200, json: async () => JSON.parse(bodies[name] ?? '[]') } as Response;
  };
}

async function mount(search: string, customPort = { ...createMemoryPort(), saveLocalReport: async () => true }) {
  window.history.replaceState(null, '', `/${search}`);
  installFetch();
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => {
    render(<App port={customPort} />, root!);
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  return { view: root, port: customPort };
}

async function start() {
  await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

afterEach(() => {
  if (root) {
    render(null, root);
    root.remove();
    root = undefined;
  }
  (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  window.history.replaceState(null, '', '/');
});

test('main-wiring: importing the entry does not require an app mount', async () => {
  expect(document.getElementById('app')).toBeNull();
  await expect(import('../../packages/hyakunin/src/main.tsx?without-mount')).resolves.toHaveProperty('App');
});

test('main-wiring: the range in the URL reaches the first question', async () => {
  const { view } = await mount('?from=10&to=20');
  await start();
  expect(view.textContent).toContain('対象: p010');
});

test('main-wiring: the range in the URL is not widened to the whole set', async () => {
  const { view } = await mount('?from=10&to=20');
  await start();
  expect(view.textContent).not.toContain('対象: p001');
  expect(view.textContent).not.toContain('対象: p100');
});

test('main-wiring: an invalid range falls back to the whole set and says so', async () => {
  const { view } = await mount('?from=abc&to=zzz');
  expect(view.textContent).toContain('範囲を読み込めなかったため、全範囲を表示しています。');
  expect((view.querySelectorAll('input[type="number"]')[0] as HTMLInputElement).value).toBe('1');
  expect((view.querySelectorAll('input[type="number"]')[1] as HTMLInputElement).value).toBe('100');
});

test('main-wiring: the session id does not change when settings change mid-session', async () => {
  const base = createMemoryPort();
  const sessions: string[] = [];
  const port = { ...base, saveSession: async (session: Parameters<typeof base.saveSession>[0]) => { sessions.push(session.sessionId); return base.saveSession(session); }, saveLocalReport: async () => true };
  await mount('?from=10&to=20', port);
  await start();
  await act(async () => {
    (root!.querySelectorAll('input[name="reading"]')[1] as HTMLInputElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
  expect(sessions).toHaveLength(1);
  expect(sessions[0]).toBe((await base.loadLastSession())?.sessionId);
});

async function finish() {
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = '白妙の'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '白妙の', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await act(async () => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '結果を見る')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
}

test('main: 学習を終えると completed: true で保存される', async () => {
  const base = createMemoryPort();
  await mount('?from=10&to=10', { ...base, saveLocalReport: async () => true });
  await start();
  await finish();
  expect((await base.loadLastSession())?.completed).toBe(true);
});

test('main: セッションの判定が結果の内訳へ渡る', async () => {
  await mount('?from=10&to=10');
  await start();
  await finish();
  expect(root!.textContent).toContain('正答1問');
});

test('main: 保存されたイベントから習熟度の変化を表示する', async () => {
  await mount('?from=10&to=10');
  await start();
  await finish();
  expect(root!.textContent).toContain('0%7.2%');
});
