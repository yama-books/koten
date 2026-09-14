import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { Session } from '../../packages/hyakunin/src/ui/screens/Session.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { parseQuestions, type PublishedQuestion } from '../../packages/hyakunin/src/data/question-schema.ts';
import type { Poem } from '../../packages/hyakunin/src/data/schema.ts';

const settings = { key: 'user' as const, reading: 'no-ruby' as const, writing: 'vertical' as const, order: 'number' as const, soundEnabled: false, noticeConfirmed: false };
const ku = ['夕されば', '門田の稲葉', 'おとづれて', '芦のまろやに', '秋風ぞ吹く'];
const reading = ['ゆふされば', 'かどたのいなば', 'おとづれて', 'あしのまろやに', 'あきかぜぞふく'];
const poem = {
  poemId: 'p071', cardNo: 71, ku, author: { canonical: '大納言経信' }, sourceRef: 'fixture',
  reading: { historical: { ku: reading, author: 'だいなごんつねのぶ' }, modern: { ku: reading, author: 'だいなごんつねのぶ' } },
  acceptedTextForms: [[], [], [], [], []],
} as unknown as Poem;

function question(blankedKu: number[], rung: number): PublishedQuestion {
  const answer = blankedKu.map((n) => ku[n - 1]).join('');
  return parseQuestions([{
    questionId: `p071-blank-r${rung}`, poemId: 'p071', skill: 'text', type: 'blank', blankUnit: 'ku',
    blankedKu, rung,
    prompt: ku.map((line, i) => (blankedKu.includes(i + 1) ? '＿＿＿' : line)).join(''),
    answer, answerHistorical: blankedKu.map((n) => reading[n - 1]).join(''), answerModern: blankedKu.map((n) => reading[n - 1]).join(''),
    acceptedAnswers: [answer], partialAnswers: [], candidates: [], normalization: 'kana', note: null,
    sourceRef: 'fixture', reviewStatus: 'human-confirmed', confirmationMode: 'individual',
    confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null,
  }] as PublishedQuestion[])[0]!;
}

let root: HTMLDivElement | undefined;
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

async function mount(blankedKu: number[], rung: number) {
  root = document.createElement('div'); document.body.append(root);
  await act(async () => {
    render(<Session questions={[question(blankedKu, rung)]} poems={[poem]} entry="learn" sessionId="s" port={createMemoryPort() as never} settings={settings} onSettings={() => {}} onComplete={() => {}} />, root!);
  });
  return root!;
}
const slots = () => Array.from(root!.querySelectorAll('.blank-slot'));
const lines = () => Array.from(root!.querySelectorAll('.question-line')).map((n) => n.textContent);

test('段3（一句）は空欄 1 つ、見える行は 4 つ', async () => {
  await mount([2], 3);
  expect(slots().length).toBe(1);
  expect(lines()).toEqual(['夕されば', '空欄', 'おとづれて', '芦のまろやに', '秋風ぞ吹く']);
});

test('段4（上句）は続いた 3 句をまとめて 1 つの空欄にする', async () => {
  // **行ごとに枠を並べない**（依頼者指示 2026-09-15）。枠だらけになって読めない。
  await mount([1, 2, 3], 4);
  expect(slots().length).toBe(1);
  expect(slots()[0]!.className).toContain('blank-slot--span');
  expect(lines()).toEqual(['空欄（3句）', '芦のまろやに', '秋風ぞ吹く']);
});

test('まとめた空欄は句数を持ち、寸法の計算に渡す', async () => {
  await mount([1, 2, 3], 4);
  const span = root!.querySelector('.question-line--span') as HTMLElement;
  expect(span.style.getPropertyValue('--blank-span')).toBe('3');
});

test('段6（残り 4 句）でも見える 1 句は残る', async () => {
  await mount([2, 3, 4, 5], 6);
  expect(slots().length).toBe(1);
  expect(lines()).toEqual(['夕されば', '空欄（4句）']);
});

test('段7（全部）は空欄 1 つだけで、見える本文が残らない', async () => {
  await mount([1, 2, 3, 4, 5], 7);
  expect(slots().length).toBe(1);
  expect(lines()).toEqual(['空欄（5句）']);
});
