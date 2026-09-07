import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { App } from '../../packages/hyakunin/src/main.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';

/**
 * 発注074 工程1。**設定の真実は保存領域ひとつである。**
 *
 * 公開版 `438248c` では `main.tsx` が保存領域を一度も読まない既定値を持ち、
 * `Session` の設定操作がその既定値ごと保存領域へ書き戻していた。
 * **出題中に「読みを確認する」を1度押すだけで、学年と「確認済み」の印が消える。**
 *
 * 「保存した直後に残っている」だけを見ても、この欠陥は再現しない。
 * **学年を選ぶ → 出題へ入る → 設定を触る → ホームへ戻る**の順で見ること。
 */
const poemsJson = readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/poems.json'), 'utf8');
const poems = JSON.parse(poemsJson) as readonly { cardNo: number; ku: string[]; reading: { historical: { ku: string[] }; modern: { ku: string[] } } }[];
const meta = {
  skill: 'text' as const, blankUnit: 'word' as const, type: 'blank' as const, candidates: [] as string[],
  normalization: 'kana' as const, note: null, sourceRef: 'fixture', reviewStatus: 'human-confirmed' as const,
  confirmationMode: 'individual' as const, confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null,
};
/**
 * 学年を選ぶと範囲が動く（中一は 1〜20番）。**出題は選ばれた範囲の先頭の首から取る**ので、
 * 10番だけの fixture では 1 問も出ず、この経路そのものが再現しない。
 */
const blanks = poems.filter((poem) => poem.cardNo <= 100).map((poem) => ({
  ...meta,
  questionId: `p${String(poem.cardNo).padStart(3, '0')}-ku1`,
  poemId: `p${String(poem.cardNo).padStart(3, '0')}`,
  prompt: ['＿＿＿', ...poem.ku.slice(1)].join(''),
  answer: poem.ku[0],
  answerHistorical: poem.reading.historical.ku[0],
  answerModern: poem.reading.modern.ku[0],
  acceptedAnswers: [poem.ku[0], poem.reading.historical.ku[0]],
  partialAnswers: [poem.reading.modern.ku[0]],
}));

const originalFetch = globalThis.fetch;
let root: HTMLDivElement | undefined;

async function mount(port: ReturnType<typeof createMemoryPort>) {
  window.history.replaceState(null, '', '/?from=10&to=10');
  (globalThis as unknown as { fetch: typeof fetch }).fetch = async (url) => {
    const name = String(url).split('/').pop()!;
    const bodies: Record<string, string> = { 'poems.json': poemsJson, 'questions.blank.json': JSON.stringify(blanks), 'questions.author.json': '[]' };
    return { ok: true, status: 200, json: async () => JSON.parse(bodies[name] ?? '[]') } as Response;
  };
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => { render(<App port={{ ...port, saveLocalReport: async () => true } as never} />, root!); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  return root!;
}

afterEach(() => {
  if (root) { render(null, root); root.remove(); root = undefined; }
  (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  window.history.replaceState(null, '', '/');
});

const button = (label: string) => Array.from(root!.querySelectorAll('button')).find((node) => node.textContent === label);
async function settle() {
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}
async function click(label: string) {
  const target = button(label);
  expect(target, `ボタン「${label}」が見つからない`).toBeDefined();
  await act(async () => { target!.click(); await Promise.resolve(); await Promise.resolve(); });
  await settle();
}

/** 「はじめに」で学年を選んで OK を押す。ここが依頼者の経路の出発点である。 */
async function confirmNotice(grade = '中一') {
  expect(root!.querySelector('.onboarding__dialog'), '初回設定が出ていない状態では、この経路を測れない').not.toBeNull();
  await click(grade);
  await click('OK');
  expect(root!.querySelector('.onboarding__dialog')).toBeNull();
}

/**
 * ホームへ戻る。出題中は中断確認を経る。
 * **文言ではなく器で探す。** ここで見ているのは設定の残り方であって、戻る導線の文言ではない
 * （文言は 074-11 が見る）。名前で探すと、文言を変えた破壊試験がこの4本まで赤くする。
 */
async function goHome() {
  const back = root!.querySelector<HTMLButtonElement>('.session .nav-edge .back-link');
  expect(back, '出題画面の戻る操作が見つからない').not.toBeNull();
  await act(async () => { back!.click(); await Promise.resolve(); await Promise.resolve(); });
  await settle();
  await click('トップへ戻る');
}

test('074-1a: 学年を選んだあと出題画面で読みを変えても、ホームで「はじめに」が出ない', async () => {
  const port = createMemoryPort();
  await mount(port);
  await confirmNotice();
  await click('とりあえず始める');
  expect(root!.querySelector('input[placeholder]'), `出題画面に入っていない: ${root!.textContent?.slice(0, 300)}`).not.toBeNull();
  await click('読みを確認する');
  await goHome();
  expect(root!.querySelector('.onboarding__dialog')).toBeNull();
  expect(root!.textContent).not.toContain('OK');
});

test('074-1b: 同じ経路で学年が保存領域に残る', async () => {
  const port = createMemoryPort();
  await mount(port);
  await confirmNotice('中二');
  await click('とりあえず始める');
  await click('読みを確認する');
  await goHome();
  const saved = await port.loadSettings();
  // 実害は学年である。`noticeConfirmed` だけを見ると、統計の学年区分が空になる欠陥を見落とす。
  expect(saved?.grade).toBe('中二');
  expect(saved?.noticeConfirmed).toBe(true);
});

test('074-1c: 「横書きにする」でも学年と確認済みが消えない', async () => {
  const port = createMemoryPort();
  await mount(port);
  await confirmNotice('中三');
  await click('とりあえず始める');
  await click('横書きにする');
  const saved = await port.loadSettings();
  expect(saved?.writing).toBe('horizontal');
  expect(saved?.grade).toBe('中三');
  expect(saved?.noticeConfirmed).toBe(true);
  await goHome();
  expect(root!.querySelector('.onboarding__dialog')).toBeNull();
});

test('074-1d: Home から書いても Session から書いても、互いの項目が消えない', async () => {
  const port = createMemoryPort();
  await mount(port);
  await confirmNotice();
  // Home 側の設定操作（歌を確認する画面）で縦横書きを変える。
  await click('歌を確認する');
  await click('横書きにする');
  expect((await port.loadSettings())?.writing).toBe('horizontal');
  await click('範囲を選び直す');
  // Session 側の設定操作で読みを変える。ここで Home の縦横書きが消えてはならない。
  await click('とりあえず始める');
  await click('読みを確認する');
  const afterSession = await port.loadSettings();
  expect(afterSession?.writing).toBe('horizontal');
  expect(afterSession?.reading).toBe('historical');
  expect(afterSession?.grade).toBe('中一');
  expect(afterSession?.noticeConfirmed).toBe(true);
});
