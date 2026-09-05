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
  { questionId: 'q10a', poemId: 'p010', skill: 'text', type: 'blank', blankUnit: 'word', prompt: '白妙の', answer: '白妙の', answerHistorical: 'しろたへの', answerModern: 'しろたえの', acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: ['しろたえの'], candidates: [], normalization: 'kana', note: null, sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null },
  { questionId: 'q10b', poemId: 'p010', skill: 'text', type: 'blank', blankUnit: 'word', prompt: '衣ほすてふ', answer: '衣干す', answerHistorical: 'ころもほす', answerModern: 'ころもほす', acceptedAnswers: ['衣干す', 'ころもほす'], partialAnswers: [], candidates: [], normalization: 'kana', note: null, sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null },
] as PublishedQuestion[]);
function port() { return { ...createMemoryPort(), saveLocalReport: async () => true }; }
async function mount(customPort = port()) { root = document.createElement('div'); document.body.append(root); await act(async () => { render(<Session questions={fixture} sessionId="s" port={customPort} settings={settings} onSettings={() => {}} onComplete={() => {}} />, root!); }); return root; }
async function answer(value: string) { const input = root!.querySelector('input[placeholder]') as HTMLInputElement; await act(() => { input.value = value; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' })); }); await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); }); }
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

test('session: fixture reaches the first question in the narrow range', async () => { const view = await mount(); expect(view.querySelector('.question-number')?.textContent).toBe('10'); expect(view.textContent).not.toContain('p010'); });
test('session: answer is revealed after saving', async () => { await mount(); await answer('白妙の'); expect(root!.textContent).toContain('○ 正解'); });
test('session: next button advances to the second question', async () => { await mount(); await answer('白妙の'); await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(root!.textContent).toContain('衣ほすてふ'); });
test('session: Enter advances after reveal', async () => { await mount(); await answer('白妙の'); await act(() => { root!.querySelector('main')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); expect(root!.textContent).toContain('衣ほすてふ'); });
test('session: Enter while answering does not advance', async () => { await mount(); await act(() => { root!.querySelector('main')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); expect(root!.textContent).toContain('白妙の'); });
test('session: partial feedback contains historical and original forms', async () => { await mount(); await answer('しろたえの'); expect(root!.textContent).toContain('歴史的仮名遣い：しろたへの'); expect(root!.textContent).toContain('（白妙の）'); });
test('session: partial feedback does not expose a mastery increment', async () => { await mount(); await answer('しろたえの'); expect(root!.textContent).not.toContain('習熟度は一段軽く加算されます'); });
test('session: the saved event carries the versions from app-config, not a literal', async () => {
  const p = port(); await mount(p); await answer('白妙の');
  expect(p.events[0].appVersion).toBe(appConfig.appVersion);
  expect(p.events[0].dataVersion).toBe(appConfig.dataVersion);
  // A placeholder version silently breaks the mastery recompute and the export migration.
  expect(p.events[0].appVersion).not.toBe('0');
});
test('session: reading toggle records hint use', async () => { const p = port(); await mount(p); await act(() => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '読みを確認する')!.click(); }); await answer('白妙の'); expect(p.events[0].hintUsed).toBe(true); });
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
  await act(() => { Array.from(toggled.querySelectorAll('button')).find((button) => button.textContent === '読みを確認する')!.click(); });
  await (async () => { const input = toggled.querySelector('input[placeholder]') as HTMLInputElement; await act(() => { input.value = 'しろたえの'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'しろたえの', inputType: 'insertText' })); }); await act(async () => { toggled.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); }); })();
  const toggledMark = toggled.querySelector('.answer-feedback p')!.textContent;
  render(null, toggled);
  toggled.remove();

  expect(toggledMark).toBe(baselineMark);
});
test('session: progress distinguishes card and question', async () => { const view = await mount(); expect(view.textContent).toContain('10番・1問目/2'); });
test('session: writing setting is saved', async () => { const p = port(); await mount(p); await act(() => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '横書きにする')!.click(); }); expect((await p.loadSettings())?.writing).toBe('horizontal'); });
test('session: local-only report action stays hidden', async () => { await mount(); await answer('白妙の'); expect(root!.textContent).not.toContain('問題を報告'); });
test('session: completing the last question shows completion', async () => { await mount(); await answer('白妙の'); await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await answer('衣干す'); await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(root!.textContent).toContain('今回の範囲を確認しました'); });
test('session: feedback waits for an explicit action', async () => { await mount(); expect(root!.textContent).not.toContain('○ 正解'); });
test('session: answer field has a label and example', async () => { await mount(); expect(root!.textContent).toContain('答え'); expect(root!.textContent).toContain('歴史的仮名遣いまたは漢字で入力します。'); });

// --- 発注057 R3/R4：開示後の入力保持と仮名遣い補足 ---
const kanaOnly = parseQuestions([
  { questionId: 'q99', poemId: 'p099', skill: 'text', type: 'blank', blankUnit: 'word', prompt: '＿＿＿', answer: 'ゆふぐれ', answerHistorical: 'ゆふぐれ', answerModern: 'ゆうぐれ', acceptedAnswers: ['ゆふぐれ'], partialAnswers: ['ゆうぐれ'], candidates: [], normalization: 'kana', note: null, sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null },
] as PublishedQuestion[]);

async function mountWith(props: Partial<Parameters<typeof Session>[0]>) {
  root = document.createElement('div'); document.body.append(root);
  await act(async () => { render(<Session questions={fixture} sessionId="s" port={port()} settings={settings} onSettings={() => {}} onComplete={() => {}} {...props} />, root!); });
  return root;
}
const retained = () => root!.querySelector('.answer-retained input') as HTMLInputElement | null;
const countOf = (needle: string) => root!.textContent!.split(needle).length - 1;

test('session: 開示後も送信した入力がそのまま readOnly で残る', async () => {
  await mount(); await answer('しろたえの');
  expect(retained()).not.toBeNull();
  expect(retained()!.value).toBe('しろたえの');
  expect(retained()!.readOnly).toBe(true);
  expect(retained()!.value).not.toBe('白妙の');
});

test('session: 不正解の「もう一度」は画面に1回だけ出す', async () => {
  await mount(); await answer('まったくちがう');
  expect(root!.textContent).toContain('✓ もう一度！');
  expect(countOf('もう一度！')).toBe(1);
  expect(root!.textContent).not.toContain('要確認');
  expect(retained()!.value).toBe('まったくちがう');
});

test('session: 漢字のない原文では括弧行を出さない', async () => {
  await mountWith({ questions: kanaOnly });
  await answer('ゆうぐれ');
  expect(root!.textContent).toContain('△ 仮名遣い確認');
  expect(root!.textContent).toContain('歴史的仮名遣い：ゆふぐれ');
  expect(root!.textContent).not.toContain('（');
});

test('session: 再確認では中断ダイアログを開かなくても注意書きが出ている', async () => {
  await mountWith({ entry: 'review' });
  expect(root!.querySelector('.interrupt-dialog')).toBeNull();
  expect(root!.textContent).toContain('途中で終了すると、この再確認の続きは再開できません。（答え合わせ済みの記録は残ります）');
});

test('session: 練習では再確認の注意書きを出さない', async () => {
  await mount();
  expect(root!.textContent).not.toContain('この再確認の続きは再開できません');
});

async function finishExamOnScreen(first: string, second: string) {
  await mountWith({ entry: 'exam' });
  for (const value of [first, second]) {
    const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
    await act(() => { input.value = value; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' })); });
    await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  }
  return Array.from(root!.querySelectorAll('.grade-list > li'));
}

test('session: 本番の採点一覧は△の行に仮名遣いの補足を出す', async () => {
  const rows = await finishExamOnScreen('しろたえの', '衣干す');
  expect(rows).toHaveLength(2);
  expect(rows[0].querySelector('[aria-label]')?.getAttribute('aria-label')).toBe('△');
  expect(rows[0].textContent).toContain('仮名遣い確認');
  expect(rows[0].textContent).toContain('歴史的仮名遣い：しろたへの');
  expect(rows[0].textContent).toContain('（白妙の）');
  expect(rows[1].textContent).not.toContain('仮名遣い確認');
  expect(rows[1].textContent).not.toContain('歴史的仮名遣い：');
});

test('session: 本番の採点一覧は正答の行に補足を出さない', async () => {
  const rows = await finishExamOnScreen('白妙の', '衣干す');
  expect(rows[0].querySelector('[aria-label]')?.getAttribute('aria-label')).toBe('○');
  expect(root!.textContent).not.toContain('歴史的仮名遣い：');
});

test('session: 紙の採点は△の意味を一度添え、選んだ行だけに補足を出す', async () => {
  await mountWith({ entry: 'exam', answerMode: 'paper' });
  for (let index = 0; index < 2; index += 1) await act(() => { Array.from(root!.querySelectorAll('button')).find((node) => node.textContent === '次へ')!.click(); });
  expect(countOf('△は現代仮名遣いで書けた場合です。')).toBe(1);
  expect(root!.textContent).not.toContain('歴史的仮名遣い：しろたへの');
  const rows = Array.from(root!.querySelectorAll('.grade-list > li'));
  await act(() => { Array.from(rows[0].querySelectorAll('button')).find((node) => node.textContent === '△')!.click(); });
  const updated = Array.from(root!.querySelectorAll('.grade-list > li'));
  expect(updated[0].textContent).toContain('歴史的仮名遣い：しろたへの');
  expect(updated[0].textContent).toContain('（白妙の）');
  expect(updated[1].textContent).not.toContain('歴史的仮名遣い：');
  expect(countOf('△は現代仮名遣いで書けた場合です。')).toBe(1);
});

// --- 掛詞など、正誤だけでは伝わらない事情の一言（台帳の learnerNote 由来） ---
const withNote = parseQuestions([
  { ...kanaOnly[0], questionId: 'q98', poemId: 'p098', note: '「かりほ」は「刈穂」と「仮庵」の掛詞です。' },
] as PublishedQuestion[]);

test('session: 一言を持つ問題は答え合わせのあとにそれを出す', async () => {
  await mountWith({ questions: withNote });
  expect(root!.textContent).not.toContain('掛詞');
  await answer('ゆうぐれ');
  expect(root!.textContent).toContain('「かりほ」は「刈穂」と「仮庵」の掛詞です。');
});

test('session: 一言は正解でも出す', async () => {
  await mountWith({ questions: withNote });
  await answer('ゆふぐれ');
  expect(root!.textContent).toContain('○ 正解');
  expect(root!.textContent).toContain('掛詞');
});

test('session: 一言を持たない問題では出さない', async () => {
  await mount();
  await answer('しろたえの');
  expect(root!.querySelector('.question-note')).toBeNull();
});

test('session: 本番の採点一覧にも該当行の一言を出す', async () => {
  await mountWith({ entry: 'exam', questions: withNote });
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = 'ゆうぐれ'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'ゆうぐれ', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  const rows = Array.from(root!.querySelectorAll('.grade-list > li'));
  expect(rows).toHaveLength(1);
  expect(rows[0].textContent).toContain('掛詞');
});
