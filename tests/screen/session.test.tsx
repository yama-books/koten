import { render } from 'preact';
import { useState } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { parseQuestions, type PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { appConfig } from '../../packages/shared/src/app-config.ts';
import { Session } from '../../packages/hyakunin/src/ui/screens/Session.tsx';

let root: HTMLDivElement | undefined;
const settings = { key: 'user' as const, reading: 'no-ruby' as const, writing: 'vertical' as const, order: 'number' as const, soundEnabled: false, noticeConfirmed: false };
const fixture = parseQuestions([
  { questionId: 'q10a', poemId: 'p010', skill: 'text', type: 'blank', blankUnit: 'word', prompt: '白妙の', answer: '白妙の', answerHistorical: 'しろたへの', answerModern: 'しろたえの', acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: ['しろたえの'], candidates: [], normalization: 'kana', sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null },
  { questionId: 'q10b', poemId: 'p010', skill: 'text', type: 'blank', blankUnit: 'word', prompt: '衣ほすてふ', answer: '衣干す', answerHistorical: 'ころもほす', answerModern: 'ころもほす', acceptedAnswers: ['衣干す', 'ころもほす'], partialAnswers: [], candidates: [], normalization: 'kana', sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null },
] as PublishedQuestion[]);
function port() { return { ...createMemoryPort(), saveLocalReport: async () => true }; }
async function mount(customPort = port()) { root = document.createElement('div'); document.body.append(root); await act(async () => { render(<Session questions={fixture} sessionId="s" port={customPort} settings={settings} onSettings={() => {}} onComplete={() => {}} />, root!); }); return root; }
async function answer(value: string) { const input = root!.querySelector('input[placeholder]') as HTMLInputElement; await act(() => { input.value = value; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' })); }); await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); }); }
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

test('session: fixture reaches the first question in the narrow range', async () => { const view = await mount(); expect(view.textContent).toContain('p010'); });
test('session: answer is revealed after saving', async () => { await mount(); await answer('白妙の'); expect(root!.textContent).toContain('○ 正解'); });
test('session: next button advances to the second question', async () => { await mount(); await answer('白妙の'); await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(root!.textContent).toContain('衣ほすてふ'); });
test('session: Enter advances after reveal', async () => { await mount(); await answer('白妙の'); await act(() => { root!.querySelector('main')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); expect(root!.textContent).toContain('衣ほすてふ'); });
test('session: Enter while answering does not advance', async () => { await mount(); await act(() => { root!.querySelector('main')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); expect(root!.textContent).toContain('白妙の'); });
test('session: partial feedback contains different historical and kanji forms', async () => { await mount(); await answer('しろたえの'); expect(root!.textContent).toContain('歴史的仮名遣い: しろたへの'); expect(root!.textContent).toContain('漢字: 白妙の'); });
test('session: the saved event carries the versions from app-config, not a literal', async () => {
  const p = port(); await mount(p); await answer('白妙の');
  expect(p.events[0].appVersion).toBe(appConfig.appVersion);
  expect(p.events[0].dataVersion).toBe(appConfig.dataVersion);
  // A placeholder version silently breaks the mastery recompute and the export migration.
  expect(p.events[0].appVersion).not.toBe('0');
});
test('session: reading toggle records hint use', async () => { const p = port(); await mount(p); await act(() => { const radio = root!.querySelectorAll('input[type="radio"]')[1]; radio.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await answer('白妙の'); expect(p.events[0].hintUsed).toBe(true); });
test('session: saving failure does not reveal', async () => { const failing = { ...port(), appendEvent: async () => ({ reason: 'write-failed' as const }) }; await mount(failing); await answer('白妙の'); expect(root!.textContent).toContain('保存失敗'); expect(root!.textContent).not.toContain('○ 正解'); });
test('session: saving failure keeps the input', async () => { const failing = { ...port(), appendEvent: async () => ({ reason: 'write-failed' as const }) }; await mount(failing); await answer('白妙の'); expect((root!.querySelector('input[placeholder]') as HTMLInputElement).value).toBe('白妙の'); });
function StatefulSession({ port: customPort, initialReading }: { port: ReturnType<typeof port>; initialReading: 'no-ruby' | 'historical' | 'modern' }) {
  const [live, setLive] = useState({ ...settings, reading: initialReading });
  return <Session questions={fixture} sessionId="s" port={customPort} settings={live} onSettings={setLive} onComplete={() => {}} />;
}
test('session: reading toggle does not change the judgement', async () => {
  const baseline = document.createElement('div'); document.body.append(baseline);
  await act(async () => { render(<StatefulSession port={port()} initialReading="no-ruby" />, baseline); });
  await (async () => { const input = baseline.querySelector('input[placeholder]') as HTMLInputElement; await act(() => { input.value = 'しろたえの'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'しろたえの', inputType: 'insertText' })); }); await act(async () => { baseline.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); }); })();
  const baselineMark = baseline.querySelector('.answer-feedback p')!.textContent;
  render(null, baseline);
  baseline.remove();

  const toggled = document.createElement('div'); document.body.append(toggled);
  await act(async () => { render(<StatefulSession port={port()} initialReading="no-ruby" />, toggled); });
  await act(() => { toggled.querySelectorAll('input[type="radio"]')[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  await (async () => { const input = toggled.querySelector('input[placeholder]') as HTMLInputElement; await act(() => { input.value = 'しろたえの'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'しろたえの', inputType: 'insertText' })); }); await act(async () => { toggled.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); }); })();
  const toggledMark = toggled.querySelector('.answer-feedback p')!.textContent;
  render(null, toggled);
  toggled.remove();

  expect(toggledMark).toBe(baselineMark);
});
test('session: progress distinguishes card and question', async () => { const view = await mount(); expect(view.textContent).toContain('10番・1問目/2'); });
test('session: writing setting is saved', async () => { const p = port(); await mount(p); await act(() => { root!.querySelectorAll('input[type="radio"]')[4].dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect((await p.loadSettings())?.writing).toBe('horizontal'); });
test('session: local report button uses the port', async () => { let reported = false; const p = { ...port(), saveLocalReport: async () => (reported = true) }; await mount(p); await act(async () => { Array.from(root!.querySelectorAll('button')).find((item) => item.textContent === '問題を報告')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); }); expect(reported).toBe(true); });
test('session: completing the last question shows completion', async () => { await mount(); await answer('白妙の'); await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await answer('衣干す'); await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(root!.textContent).toContain('今回の範囲を確認しました'); });
test('session: feedback waits for an explicit action', async () => { await mount(); expect(root!.textContent).not.toContain('○ 正解'); });
test('session: answer field has a label and example', async () => { await mount(); expect(root!.textContent).toContain('答え'); expect(root!.textContent).toContain('歴史的仮名遣いまたは漢字で入力します。'); });
test('session: report confirmation is announced', async () => { await mount(); await act(async () => { Array.from(root!.querySelectorAll('button')).find((item) => item.textContent === '問題を報告')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); }); expect(root!.textContent).toContain('この端末に保存しました'); });
