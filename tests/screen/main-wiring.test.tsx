import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { App } from '../../packages/hyakunin/src/main.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { planQuestions } from '../../packages/hyakunin/src/domain/entry.ts';

const poems = readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/poems.json'), 'utf8');
const question = ['p001', 'p010', 'p011', 'p012', 'p021', 'p100'].map((poemId) => ({ questionId: `q${poemId.slice(1)}`, poemId, skill: 'text' as const, type: 'blank' as const, blankUnit: 'word' as const, prompt: poemId === 'p010' ? '白妙の' : poemId, answer: '白妙の', answerHistorical: 'しろたへの', answerModern: 'しろたえの', acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: [], candidates: [], normalization: 'kana' as const, sourceRef: 'fixture', reviewStatus: 'human-confirmed' as const, confirmationMode: 'individual' as const, confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null }));
const originalFetch = globalThis.fetch;
let root: HTMLDivElement | undefined;

beforeEach(() => {
  expect(question.length).toBeGreaterThan(0);
});

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
  await act(() => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '穴埋めに取り組む')!.click(); });
  await act(() => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '練習する')!.click(); });
  await act(async () => { root!.querySelector('button.primary')!.click(); await Promise.resolve(); });
}

const currentNumber = () => root!.querySelector('.question-number')?.textContent;

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
  expect(currentNumber()).toBe('10');
});

test('main-wiring: the range in the URL is not widened to the whole set', async () => {
  const { view } = await mount('?from=10&to=20');
  await start();
  expect(currentNumber()).not.toBe('1');
  expect(currentNumber()).not.toBe('100');
});

test('main-wiring: 21首の新規開始は最初の20首だけを出す', async () => {
  const events = Array.from({ length: 20 }, (_, index) => ({ eventId: `e${index + 1}`, product: 'hyakunin' as const, poemId: `p${String(index + 1).padStart(3, '0')}`, sessionId: 'old', itemKey: 'x', kind: 'answer' as const, method: 'choice' as const, outcome: 'correct' as const, hintUsed: false, effectiveMethod: 'choice' as const, delta: 1, localDate: '2026-09-01', sameSessionRepeat: false, appVersion: 'x', dataVersion: 1, masteryRulesVersion: 1 }));
  const base = createMemoryPort();
  const { view } = await mount('?from=1&to=21', { ...base, listEvents: async () => events, saveLocalReport: async () => true });
  await start();
  expect(currentNumber()).toBe('21');
  expect(currentNumber()).not.toBe('1');
});

test('main-wiring: 復元は保存済みの回を新規保存せず再開する', async () => {
  const base = createMemoryPort();
  const saved = { sessionId: 'resume-session', product: 'hyakunin' as const, from: 10, to: 10, entry: 'quick' as const, order: 'number' as const, seed: 'resume-seed', startedOn: '2026-09-01', completed: false, questionCount: 1 };
  await base.saveSession(saved);
  const savedIds: string[] = [];
  const port = { ...base, saveSession: async (session: typeof saved) => { savedIds.push(session.sessionId); return base.saveSession(session); }, saveLocalReport: async () => true };
  const { view } = await mount('?from=1&to=1', port);
  await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === '復元する')!.click(); });
  expect(currentNumber()).toBe('10');
  expect(savedIds).toEqual([]);
});

test('main-wiring: 復元は保存済みseedのランダム順を再現する', async () => {
  const base = createMemoryPort();
  const saved = { sessionId: 'random-resume', product: 'hyakunin' as const, from: 1, to: 21, entry: 'review' as const, order: 'random' as const, seed: 'fixed-resume-seed', startedOn: '2026-09-01', completed: false, questionCount: 5 };
  await base.saveSession(saved);
  const { view } = await mount('?from=50&to=60', { ...base, saveLocalReport: async () => true });
  await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === '復元する')!.click(); });
  const expected = planQuestions('review', question, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], saved.seed, 'random')[0]!;
  expect(currentNumber()).toBe(String(Number(expected.poemId.slice(1))));
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
    Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '読みを確認する')!.click();
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

test('main: 再確認はまちがえた歌だけを出す', async () => {
  await mount('?from=10&to=12');
  await start();
  for (let index = 0; index < 3; index += 1) {
    const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
    const answer = index === 0 ? 'ちがう答え' : '白妙の';
    await act(() => { input.value = answer; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: answer, inputType: 'insertText' })); });
    await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  }
  await act(async () => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '結果を見る')!.click(); await Promise.resolve(); await Promise.resolve(); });
  await act(() => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === 'まちがえた歌だけをもう一度')!.click(); });
  expect(currentNumber()).toBe('10');
  expect(root!.textContent).toContain('1問目/1');
});

test('main: 保存失敗でも結果と失敗の一行を表示する', async () => {
  const base = createMemoryPort();
  const port = { ...base, saveSession: async () => ({ reason: 'write-failed' as const }), saveLocalReport: async () => true };
  await mount('?from=10&to=10', port);
  await start();
  await finish();
  expect(root!.textContent).toContain('今回の結果');
  expect(root!.textContent).toContain('保存に失敗しました。結果は表示しています。');
});

test('main: 結果の読み込み中は完了前に文言を表示する', async () => {
  const base = createMemoryPort();
  let gate = false;
  let resolveEvents: ((events: readonly []) => void) | undefined;
  const port = { ...base, listEvents: async () => !gate ? [] : new Promise<readonly []>((resolve) => { resolveEvents = resolve; }), saveLocalReport: async () => true };
  await mount('?from=10&to=10', port);
  await start();
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = '白妙の'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '白妙の', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  gate = true;
  await act(async () => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '結果を見る')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(root!.textContent).toContain('結果を読み込んでいます。');
  await act(async () => { resolveEvents!([]); await Promise.resolve(); });
  expect(root!.textContent).toContain('今回の結果');
});
