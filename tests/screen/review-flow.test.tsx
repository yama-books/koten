import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { App } from '../../packages/hyakunin/src/main.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';

/**
 * 発注057 R1/R2 の受入。生成器と同じ形——1首に5句の穴埋め＋作者問題1件——で組む。
 * 穴埋めだけの fixture では、再確認が作者問題を巻き込む欠陥そのものが再現しない。
 */
const poemsJson = readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/poems.json'), 'utf8');
const poems = JSON.parse(poemsJson) as readonly { cardNo: number; ku: string[]; author: { canonical: string }; reading: { historical: { ku: string[]; author: string }; modern: { ku: string[]; author: string } } }[];
const meta = { skill: 'text' as const, blankUnit: 'word' as const, candidates: [] as string[], normalization: 'kana' as const, note: null, sourceRef: 'fixture', reviewStatus: 'human-confirmed' as const, confirmationMode: 'individual' as const, confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null };
const cards = [10, 11];
const poemOf = (cardNo: number) => poems.find((poem) => poem.cardNo === cardNo)!;
const poemId = (cardNo: number) => `p${String(cardNo).padStart(3, '0')}`;

const blanks = cards.flatMap((cardNo) => {
  const poem = poemOf(cardNo);
  return poem.ku.map((line, index) => ({
    ...meta,
    questionId: `${poemId(cardNo)}-ku${index + 1}`,
    poemId: poemId(cardNo),
    type: 'blank' as const,
    prompt: poem.ku.map((other, position) => (position === index ? '＿＿＿' : other)).join(''),
    answer: line,
    answerHistorical: poem.reading.historical.ku[index],
    answerModern: poem.reading.modern.ku[index],
    acceptedAnswers: [line, poem.reading.historical.ku[index]],
    partialAnswers: [poem.reading.modern.ku[index]],
  }));
});
const authors = cards.map((cardNo) => {
  const poem = poemOf(cardNo);
  return { ...meta, skill: 'author' as const, questionId: `${poemId(cardNo)}-author`, poemId: poemId(cardNo), type: 'author' as const, blankUnit: null, prompt: `${poem.ku.join('')}の作者は？`, answer: poem.author.canonical, answerHistorical: poem.reading.historical.author, answerModern: poem.reading.modern.author, acceptedAnswers: [poem.author.canonical, poem.reading.historical.author], partialAnswers: [poem.reading.modern.author] };
});

/** 空欄を作れない穴埋め。R2 の「出口を出す」経路を実データ側から起こすために置く。 */
const brokenBlank = { ...meta, questionId: 'p012-ku1', poemId: 'p012', type: 'blank' as const, prompt: poemOf(12).ku.join(''), answer: poemOf(12).ku[0], answerHistorical: poemOf(12).reading.historical.ku[0], answerModern: poemOf(12).reading.modern.ku[0], acceptedAnswers: [poemOf(12).ku[0]], partialAnswers: [] };

const originalFetch = globalThis.fetch;
let root: HTMLDivElement | undefined;

function installFetch() {
  (globalThis as unknown as { fetch: typeof fetch }).fetch = async (url) => {
    const name = String(url).split('/').pop()!;
    const bodies: Record<string, string> = { 'poems.json': poemsJson, 'questions.blank.json': JSON.stringify([...blanks, brokenBlank]), 'questions.author.json': JSON.stringify(authors) };
    return { ok: true, status: 200, json: async () => JSON.parse(bodies[name] ?? '[]') } as Response;
  };
}

async function settle() {
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

async function mountWith(search: string, port: ReturnType<typeof createMemoryPort>) {
  window.history.replaceState(null, '', `/${search}`);
  installFetch();
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => { render(<App port={port} />, root!); });
  await settle();
  return root!;
}

const mount = (search: string) => mountWith(search, { ...createMemoryPort(), saveLocalReport: async () => true });

afterEach(() => {
  if (root) { render(null, root); root.remove(); root = undefined; }
  (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  window.history.replaceState(null, '', '/');
});

const button = (text: string) => Array.from(root!.querySelectorAll('button')).find((node) => node.textContent === text);
const progress = () => root!.querySelector('.progress')?.textContent ?? '';
const answerField = () => root!.querySelector('input[placeholder]') as HTMLInputElement | null;

async function click(text: string) {
  const target = button(text);
  expect(target, `ボタン「${text}」が見つからない`).toBeDefined();
  await act(async () => { target!.click(); await Promise.resolve(); await Promise.resolve(); });
}

/** 画面から今の問題IDを読む。首番号と空欄の位置だけで一意に決まる。 */
function shownQuestion(): string {
  const cardNo = Number(root!.querySelector('.question-number')?.textContent);
  const lines = Array.from(root!.querySelectorAll('.question-poem .question-line'));
  const index = lines.findIndex((line) => line.querySelector('.blank-slot'));
  if (index < 0) return `${poemId(cardNo)}-author`;
  return `${poemId(cardNo)}-ku${index + 1}`;
}

const answerFor = (questionId: string) => [...blanks, ...authors].find((question) => question.questionId === questionId)!.answer;

/** 1問だけ答えて「次へ」まで進める。 */
async function answerOnce(text: string) {
  const field = answerField();
  expect(field, `入力欄のない画面で解答しようとした: ${root!.textContent?.slice(0, 120)}`).not.toBeNull();
  await act(() => { field!.value = text; field!.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
}

/** 出題された全問を答える。`wrongAt` 問目だけ誤答にし、出題数と誤答した問題IDを返す。 */
async function playRound(wrongAt: number): Promise<{ count: number; wrongId: string }> {
  let count = 0;
  let wrongId = '';
  while (answerField()) {
    const shown = shownQuestion();
    if (count === wrongAt) wrongId = shown;
    await answerOnce(count === wrongAt ? 'まったくちがう答え' : answerFor(shown));
    count += 1;
    if (count > 20) throw new Error('出題が終わらない');
  }
  expect(wrongId).not.toBe('');
  return { count, wrongId };
}

test('review: 1首5句と作者問題の回から、誤答した1問だけを再出題して完了する', async () => {
  await mount('?from=10&to=10');
  await click('とりあえず始める');
  const round = await playRound(0);
  // 出題は穴埋め5句。作者問題は同じ首の出題可能な問題として読み込まれている。
  expect(round.count).toBe(5);
  expect(authors.some((question) => question.poemId === 'p010')).toBe(true);
  await click('結果を見る');
  await settle();
  await click('まちがえた歌だけをもう一度');
  expect(progress()).toMatch(/^10番$/);
  expect(shownQuestion()).toBe(round.wrongId);
  expect(shownQuestion()).toMatch(/-ku[1-5]$/);
  expect(answerField()).not.toBeNull();
  await answerOnce(answerFor(round.wrongId));
  expect(root!.textContent).toContain('今回の範囲を確認しました');
  await click('結果を見る');
  await settle();
  expect(root!.textContent).toContain('今回の結果');
  expect(root!.textContent).toContain('問題数: 1問');
});

test('review: 再確認を繰り返すと、その回で残った問題だけになる', async () => {
  await mount('?from=10&to=10');
  await click('とりあえず始める');
  const round = await playRound(0);
  expect(round.count).toBeGreaterThan(2);
  await click('結果を見る');
  await settle();
  await click('まちがえた歌だけをもう一度');
  expect(progress()).toMatch(/^10番$/);
  await answerOnce('またちがう答え');
  await click('結果を見る');
  await settle();
  await click('まちがえた歌だけをもう一度');
  expect(progress()).toMatch(/^10番$/);
  expect(shownQuestion()).toBe(round.wrongId);
});

test('review: 再確認画面は中断ダイアログを開く前から続きを再開できないと伝える', async () => {
  await mount('?from=10&to=10');
  await click('とりあえず始める');
  await playRound(0);
  await click('結果を見る');
  await settle();
  await click('まちがえた歌だけをもう一度');
  expect(root!.querySelector('.interrupt-dialog')).toBeNull();
  expect(root!.textContent).toContain('途中で終了すると、この再確認の続きは再開できません。（答え合わせ済みの記録は残ります）');
  await click('戻る');
  expect(root!.querySelector('.interrupt-dialog')!.textContent).toContain('この再確認の続きは再開できません');
});

test('review: 再確認の途中では復元用のセッションを保存しない', async () => {
  const base = createMemoryPort();
  const saved: { entry: string; completed: boolean }[] = [];
  const port = { ...base, saveSession: async (session: Parameters<typeof base.saveSession>[0]) => { saved.push({ entry: session.entry, completed: session.completed }); return base.saveSession(session); }, saveLocalReport: async () => true };
  await mountWith('?from=10&to=10', port);
  await click('とりあえず始める');
  await playRound(0);
  await click('結果を見る');
  await settle();
  const before = saved.length;
  await click('まちがえた歌だけをもう一度');
  expect(saved.slice(before)).toEqual([]);
  expect(saved.some((session) => session.entry === 'review' && !session.completed)).toBe(false);
});

test('review: 再確認の結果から「同じ範囲をもう一度」は元の入口の出題に戻る', async () => {
  await mount('?from=10&to=11');
  await click('とりあえず始める');
  const first = await playRound(0);
  expect(first.count).toBe(6);
  await click('結果を見る');
  await settle();
  await click('まちがえた歌だけをもう一度');
  expect(progress()).toMatch(/^10番$/);
  await answerOnce(answerFor(first.wrongId));
  await click('結果を見る');
  await settle();
  await click('同じ範囲をもう一度');
  await settle();
  // 1首の6問（5句＋作者）へ戻り、再確認の対象だけへ縮まないことが本題。
  expect(progress()).toMatch(/^10番$/);
  expect(answerField()).not.toBeNull();
});

test('review: 空欄を作れない問題しか残らない回は、入力不能な画面ではなく出口を出す', async () => {
  await mount('?from=12&to=12');
  await click('とりあえず始める');
  const round = await playRound(0);
  expect(round.count).toBe(1);
  await click('結果を見る');
  await settle();
  await click('まちがえた歌だけをもう一度');
  expect(root!.querySelector('input[placeholder]')).toBeNull();
  expect(root!.textContent).toContain('この問題は表示できません。ホームに戻ってやり直してください。');
  expect(button('ホームへ戻る')).toBeDefined();
});
