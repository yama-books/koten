import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { App } from '../../packages/hyakunin/src/main.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import type { Event } from '../../packages/shared/src/domain/event.ts';

/*
 * 発注081: **保存した記録が出題方式に届くところまでを見る。**
 *
 * planQuestions の単体試験と出題画面の試験は、それぞれの部品が正しいことしか言わない。
 * その2つをつなぐ `main.tsx` の受け渡しを空にしても、両方とも緑のままだった
 * （破壊試験・2026-09-09）。だからここは App ごと動かし、記録から画面までを1本で通す。
 */

const poems = readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/poems.json'), 'utf8');

const blank = [{ questionId: 'p001-blank-ku1', poemId: 'p001', skill: 'text', type: 'blank', blankUnit: 'ku', prompt: '＿', answer: 'あきのたの', answerHistorical: 'あきのたの', answerModern: 'あきのたの', acceptedAnswers: ['あきのたの'], partialAnswers: [], candidates: [], normalization: 'kana', note: null, sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null }];

const authorBase = { poemId: 'p001', skill: 'author', type: 'author', blankUnit: null, prompt: '秋の田のかりほの庵の苫をあらみ', answerHistorical: 'てんぢてんわう', answerModern: 'てんじてんのう', partialAnswers: [], note: null, sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null };
// **両方を配る。** 片方しか無い台帳では、選び分けが働かなくても正しく見えてしまう。
const authors = [
  { ...authorBase, questionId: 'p001-author-choice', answer: '天智天皇', acceptedAnswers: ['天智天皇'], candidates: ['天智天皇', '持統天皇', '柿本人麻呂', '山部赤人'], normalization: 'exact' },
  { ...authorBase, questionId: 'p001-author-free', answer: '天智天皇', acceptedAnswers: ['天智天皇', 'てんぢてんわう'], candidates: [], normalization: 'kana' },
];

const originalFetch = globalThis.fetch;
let root: HTMLDivElement | undefined;

function installFetch() {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = async (url) => {
    const name = String(url).split('/').pop()!;
    const bodies: Record<string, string> = { 'poems.json': poems, 'questions.blank.json': JSON.stringify(blank), 'questions.author.json': JSON.stringify(authors) };
    return { ok: true, status: 200, json: async () => JSON.parse(bodies[name] ?? '[]') } as Response;
  };
}

/** 選択式で正答し続けて上限 65 に達した学習者の記録。**方式は書かず、記録だけを置く。** */
function choiceHistory(count: number): Event[] {
  return Array.from({ length: count }, (_, index) => ({
    eventId: `seed-${index}`, product: 'hyakunin' as const, poemId: 'p001', questionId: 'p001-author-choice',
    sessionId: `seed-session-${index}`, itemKey: 'p001:author', kind: 'answer' as const, method: 'choice' as const,
    outcome: 'correct' as const, hintUsed: false, effectiveMethod: 'choice' as const, delta: 5,
    localDate: '2026-09-01', sameSessionRepeat: false, appVersion: '0.1.0', dataVersion: 1, masteryRulesVersion: 1,
  }));
}

async function mountWithHistory(seeded: Event[]) {
  const port = { ...createMemoryPort(), saveLocalReport: async () => true };
  for (const item of seeded) await port.appendEvent(item);
  window.history.replaceState(null, '', '/?from=1&to=1');
  installFetch();
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => { render(<App port={port} />, root!); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === 'とりあえず始める')!.click(); await Promise.resolve(); });
  // 1首なので穴埋めが 1 問だけ出る。答えて次へ進むと作者問題が出る。
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = 'あきのたの'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'あ', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  return root!;
}

afterEach(() => {
  if (root) { render(null, root); root.remove(); root = undefined; }
  (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  window.history.replaceState(null, '', '/');
});

test('配線: 記録の無い学習者には選択式の作者問題が出る', async () => {
  const view = await mountWithHistory([]);
  expect(view.querySelector('h1')?.textContent).toBe('作者問題');
  expect(view.querySelector('.answer-choices')).not.toBeNull();
});

test('配線: 選択式で上限に達した学習者には自由入力の作者問題が出る', async () => {
  const view = await mountWithHistory(choiceHistory(13));
  expect(view.querySelector('h1')?.textContent).toBe('作者問題');
  expect(view.querySelector('.answer-choices')).toBeNull();
  expect(view.querySelector('input[placeholder]')).not.toBeNull();
});
