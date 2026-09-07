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
const authorChoice = parseQuestions([
  { questionId: 'q10-author-choice', poemId: 'p010', skill: 'author', type: 'author', blankUnit: null, prompt: '春すぎて夏来にけらし白妙の衣ほすてふ天の香具山', answer: '持統天皇', answerHistorical: '持統天皇', answerModern: '持統天皇', acceptedAnswers: ['持統天皇'], partialAnswers: [], candidates: ['天智天皇', '持統天皇', '柿本人麻呂', '山部赤人'], normalization: 'exact', note: null, sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null },
] as PublishedQuestion[]);
function port() { return { ...createMemoryPort(), saveLocalReport: async () => true }; }
async function mount(customPort = port()) { root = document.createElement('div'); document.body.append(root); await act(async () => { render(<Session questions={fixture} sessionId="s" port={customPort} settings={settings} onSettings={() => {}} onComplete={() => {}} />, root!); }); return root; }
async function answer(value: string) { const input = root!.querySelector('input[placeholder]') as HTMLInputElement; await act(() => { input.value = value; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' })); }); await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); }); }
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

test('session: fixture reaches the first question in the narrow range', async () => { const view = await mount(); expect(view.querySelector('.progress')?.textContent).toBe('10番'); expect(view.textContent).not.toContain('p010'); });
test('session: answer is revealed after saving', async () => { await mount(); await answer('白妙の'); expect(root!.textContent).toContain('正解'); });
test('session: next button advances to the second question', async () => { await mount(); await answer('白妙の'); await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(root!.textContent).toContain('衣ほすてふ'); });
test('session: Enter advances after reveal', async () => { await mount(); await answer('白妙の'); await act(() => { root!.querySelector('main')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); expect(root!.textContent).toContain('衣ほすてふ'); });
test('session: Enter while answering does not advance', async () => { await mount(); await act(() => { root!.querySelector('main')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); expect(root!.textContent).toContain('白妙の'); });
// 2026-09-06: 正解を「漢字（歴史的仮名遣い）」、△の行を「現代仮名遣い」で対照する形へ（依頼者指示）。
test('session: 開示は正解を漢字と歴史的仮名遣いで示し、△に現代仮名遣いを対照する', async () => {
  await mount();
  await answer('しろたえの');
  expect(root!.textContent).toContain('正解：白妙の（しろたへの）');
  expect(root!.textContent).toContain('△しろたえの（現代仮名遣い）');
});
test('session: partial feedback does not expose a mastery increment', async () => { await mount(); await answer('しろたえの'); expect(root!.textContent).not.toContain('習熟度は一段軽く加算されます'); });
test('session: the saved event carries the versions from app-config, not a literal', async () => {
  const p = port(); await mount(p); await answer('白妙の');
  expect(p.events[0].appVersion).toBe(appConfig.appVersion);
  expect(p.events[0].dataVersion).toBe(appConfig.dataVersion);
  // A placeholder version silently breaks the mastery recompute and the export migration.
  expect(p.events[0].appVersion).not.toBe('0');
});
test('session: reading toggle records hint use', async () => { const p = port(); await mount(p); await act(() => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '読みを確認する')!.click(); }); await answer('白妙の'); expect(p.events[0].hintUsed).toBe(true); });
test('session: saving failure does not reveal', async () => { const failing = { ...port(), appendEvent: async () => ({ reason: 'write-failed' as const }) }; await mount(failing); await answer('白妙の'); expect(root!.textContent).toContain('保存失敗'); expect(root!.textContent).not.toContain('正解'); });
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
test('session: header shows only the card number', async () => { const view = await mount(); const header = view.querySelector('.session .nav-edge')!; expect(header.textContent).toContain('10番'); expect(header.textContent).not.toMatch(/\d+問目|\/\d+/); });
test('session: all four entries show question progress only in the meter', async () => {
  for (const entry of ['learn', 'author', 'exam', 'review'] as const) {
    if (root) { render(null, root); root.remove(); root = undefined; }
    const questions = entry === 'author' ? authorChoice : fixture;
    const view = await mountWith({ entry, questions });
    const meter = view.querySelector('[role="meter"]');
    expect(meter?.getAttribute('aria-label')).toBe('セッションの進捗');
    expect(meter?.getAttribute('aria-valuenow')).toBe('0');
    expect(view.textContent).toContain(`0問/${questions.length}問`);
    const header = view.querySelector('.session .nav-edge')!;
    const progress = view.querySelector('.session-progress')!;
    const controls = view.querySelector('.session-controls')!;
    expect(header.nextElementSibling).toBe(progress);
    expect(progress.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
});
test('session: completing the last question shows 100 percent progress', async () => {
  await mount();
  await answer('白妙の');
  await act(() => { root!.querySelector('button.primary')!.click(); });
  await answer('衣干す');
  await act(() => { root!.querySelector('button.primary')!.click(); });
  const meter = root!.querySelector('[role="meter"]');
  expect(meter?.getAttribute('aria-valuenow')).toBe('100');
  expect(root!.textContent).toContain('2問/2問');
});
test('session: writing setting is saved', async () => { const p = port(); await mount(p); await act(() => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '横書きにする')!.click(); }); expect((await p.loadSettings())?.writing).toBe('horizontal'); });
test('session: local-only report action stays hidden', async () => { await mount(); await answer('白妙の'); expect(root!.textContent).not.toContain('問題を報告'); });
test('session: completing the last question shows completion', async () => { await mount(); await answer('白妙の'); await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await answer('衣干す'); await act(() => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(root!.textContent).toContain('今回の範囲を確認しました'); });
test('session: feedback waits for an explicit action', async () => { await mount(); expect(root!.textContent).not.toContain('正解'); });
test('session: answer field has a label and example', async () => { await mount(); expect(root!.textContent).toContain('答え'); expect(root!.textContent).toContain('歴史的仮名遣いまたは漢字で回答してください。'); });

test('session: 作者問題は固定順の候補を選び、choice と author の記録で即時答え合わせする', async () => {
  const p = port(); await mountWith({ questions: authorChoice, port: p, poems: [] });
  expect(Array.from(root!.querySelectorAll('.answer-choices button')).map((button) => button.textContent)).toEqual(['天智天皇', '持統天皇', '柿本人麻呂', '山部赤人']);
  expect(root!.querySelectorAll('.question-poem--author .question-line')).toHaveLength(1);
  expect(root!.querySelector('.question-poem--author')?.textContent).toContain('春すぎて夏来にけらし白妙の衣ほすてふ天の香具山');
  expect(root!.querySelector('input[placeholder]')).toBeNull();
  await act(async () => { Array.from(root!.querySelectorAll('.answer-choices button')).find((button) => button.textContent === '持統天皇')!.click(); await Promise.resolve(); });
  expect(root!.textContent).toContain('正解');
  expect(p.events[0]).toMatchObject({ itemKey: 'p010:author', method: 'choice', outcome: 'correct' });
});

test('session: 作者問題は歌を五つの縦書き列の器へ載せ、候補を主要操作にしない', async () => {
  const poem = [{ cardNo: 10, ku: ['春すぎて', '夏来にけらし', '白妙の', '衣ほすてふ', '天の香具山'], reading: { historical: { ku: ['春すぎて', '夏来にけらし', '白妙の', '衣ほすてふ', '天の香具山'] }, modern: { ku: ['春すぎて', '夏来にけらし', '白妙の', '衣ほすてふ', '天の香具山'] } } }] as never[];
  await mountWith({ questions: authorChoice, poems: poem });
  expect(root!.querySelectorAll('.question-poem--author .question-line')).toHaveLength(5);
  expect(root!.querySelectorAll('.answer-choices button.primary')).toHaveLength(0);
  expect(root!.textContent).toContain('わからない！');
});

test('session: 本番の作者選択は途中で正誤を出さない', async () => {
  await mountWith({ entry: 'exam', questions: [...authorChoice, { ...authorChoice[0], questionId: 'q11-author-choice', poemId: 'p011' }] });
  await act(async () => { Array.from(root!.querySelectorAll('.answer-choices button')).find((button) => button.textContent === '持統天皇')!.click(); await Promise.resolve(); });
  expect(root!.textContent).not.toContain('正解');
  expect(root!.querySelector('.answer-feedback')).toBeNull();
  expect(root!.querySelector('.answer-choices')).not.toBeNull();
});

test('session: 開示では正誤画像を自分の答えにだけ一つ重ね、文言は残す', async () => {
  await mount(); await answer('白妙の');
  const feedback = root!.querySelector('.answer-feedback')!;
  const answerField = root!.querySelector('.answer-retained')!;
  expect(feedback.compareDocumentPosition(answerField) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  expect(feedback.textContent).toContain('正解');
  expect(feedback.querySelectorAll('img')).toHaveLength(0);
  expect(answerField.querySelectorAll('img[src*="correct-maru"]')).toHaveLength(1);
  expect(root!.querySelectorAll('img[src*="correct-maru"], img[src*="needs-review-check"]')).toHaveLength(1);
});

test('session: 空欄の「わからない」は誤答でなく閲覧として保存して答えを開く', async () => {
  const p = port(); await mount(p);
  await act(async () => {
    Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === 'わからない！')!.click();
    await Promise.resolve();
  });
  expect(root!.textContent).toContain('答えを確認しました');
  expect(root!.textContent).not.toContain('自分の答え');
  expect(p.events).toHaveLength(1);
  expect(p.events[0].outcome).toBe('viewed');
  expect(p.events[0].questionId).toBe('q10a');
});

test('session: 「わからない」の保存失敗時は答えを開かない', async () => {
  const failing = { ...port(), appendEvent: async () => ({ reason: 'write-failed' as const }) };
  await mount(failing);
  await act(async () => {
    Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === 'わからない！')!.click();
    await Promise.resolve();
  });
  expect(root!.textContent).toContain('保存に失敗しました');
  expect(root!.textContent).not.toContain('答えを確認しました');
});

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

test('session: 不正解の「要確認」は画面に1回だけ出す', async () => {
  await mount(); await answer('まったくちがう');
  expect(root!.textContent).toContain('要確認！');
  expect(countOf('要確認！')).toBe(1);
  expect(root!.querySelector('img[src*="needs-review-check"]')).not.toBeNull();
  expect(retained()!.value).toBe('まったくちがう');
});

test('session: 読みが表記と同じなら括弧を重ねない', async () => {
  // 仮名だけの句では「ゆふぐれ（ゆふぐれ）」のように同じ文字列を二度並べない。
  await mountWith({ questions: kanaOnly });
  await answer('ゆうぐれ');
  expect(root!.textContent).toContain('△ 仮名遣い確認');
  expect(root!.textContent).toContain('正解：ゆふぐれ');
  expect(root!.textContent).not.toContain('ゆふぐれ（ゆふぐれ）');
  // 現代仮名遣いは歴史的と違うので対照が出る。
  expect(root!.textContent).toContain('△ゆうぐれ（現代仮名遣い）');
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

// 100% の端は入口ごとに別の画面で出る。練習は「確認しました」、本番は「採点する」である。
test('session: 本番も最後の問を終えたところで100%になる', async () => {
  await finishExamOnScreen('白妙の', '衣干す');
  const meter = root!.querySelector('[role="meter"]');
  expect(meter?.getAttribute('aria-valuenow')).toBe('100');
  expect(root!.textContent).toContain('2問/2問');
});

test('session: 本番の採点一覧は△の行に仮名遣いの補足を出す', async () => {
  const rows = await finishExamOnScreen('しろたえの', '衣干す');
  expect(rows).toHaveLength(2);
  expect(rows[0].querySelector('.grade-mark')?.getAttribute('aria-label')).toBe('△');
  expect(rows[0].textContent).toContain('仮名遣い確認');
  expect(rows[0].textContent).toContain('正解：白妙の（しろたへの）');
  expect(rows[0].textContent).toContain('△しろたえの（現代仮名遣い）');
  expect(rows[1].textContent).not.toContain('仮名遣い確認');
  expect(rows[1].textContent).not.toContain('現代仮名遣い）');
});

test('session: 本番の採点一覧は正答の行に補足を出さない', async () => {
  const rows = await finishExamOnScreen('白妙の', '衣干す');
  expect(rows[0].querySelector('.grade-mark')?.getAttribute('aria-label')).toBe('正解');
  expect(rows[0].querySelector('img[src*="correct-maru"]')).not.toBeNull();
  expect(root!.textContent).not.toContain('歴史的仮名遣い：');
});

test('session: 本番の「わからない」は途中開示せず採点一覧と結果で閲覧になる', async () => {
  const p = port();
  await mountWith({ entry: 'exam', port: p });
  await act(() => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === 'わからない！')!.click(); });
  expect(root!.textContent).not.toContain('答えを確認しました');
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = '衣干す'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '衣干す', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.click(); await Promise.resolve(); });
  const rows = Array.from(root!.querySelectorAll('.grade-list > li'));
  expect(rows[0].querySelector('.grade-mark')?.getAttribute('aria-label')).toBe('閲覧');
  expect(rows[0].textContent).toContain('答えを確認');
  await act(async () => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '結果へ')!.click(); await Promise.resolve(); });
  expect(p.events.map((event) => event.outcome)).toEqual(['viewed', 'correct']);
});

// 2026-09-06: 自己採点は△を押す前から対照を出す（依頼者指示）。
// 何を基準に○△×を選ぶのかが分からないと、そもそも自己採点ができない。
test('session: 紙の採点は△の意味を一度添え、押す前から正解と現代仮名遣いを対照する', async () => {
  await mountWith({ entry: 'exam', answerMode: 'paper' });
  for (let index = 0; index < 2; index += 1) await act(() => { Array.from(root!.querySelectorAll('button')).find((node) => node.textContent === '次へ')!.click(); });
  expect(countOf('△は現代仮名遣いで書けた場合です。')).toBe(1);
  const rows = Array.from(root!.querySelectorAll('.grade-list > li'));
  // 押す前に出ていること。ここが今回の変更の要点である。
  expect(rows[0].textContent).toContain('正解：白妙の（しろたへの）');
  expect(rows[0].textContent).toContain('△しろたえの（現代仮名遣い）');
  await act(() => { Array.from(rows[0].querySelectorAll('button')).find((node) => node.textContent === '△')!.click(); });
  const updated = Array.from(root!.querySelectorAll('.grade-list > li'));
  expect(updated[0].textContent).toContain('正解：白妙の（しろたへの）');
  expect(countOf('△は現代仮名遣いで書けた場合です。')).toBe(1);
});

test('session: 紙の採点は歴史的・現代表記が同じ語に△を出さない', async () => {
  await mountWith({ entry: 'exam', answerMode: 'paper', questions: [fixture[1]] });
  await act(() => { Array.from(root!.querySelectorAll('button')).find((node) => node.textContent === '次へ')!.click(); });
  const row = root!.querySelector('.grade-list > li')!;
  expect(Array.from(row.querySelectorAll('button')).map((node) => node.textContent)).toEqual(['○', '×']);
  expect(root!.textContent).not.toContain('△は現代仮名遣いで書けた場合です。');
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
  expect(root!.textContent).toContain('正解');
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
