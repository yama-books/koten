import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { App } from '../../packages/hyakunin/src/main.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';

/**
 * 2026-09-15・発注086。**画面から出題までの配線。**
 *
 * 部品（`planQuestions`・`rungRecordFor`）の単体試験は、それぞれが正しいことしか言わない。
 * **画面で押したことが、配られる問題と保存される記録に届いているか**をここで見る。
 */
const poems = readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/poems.json'), 'utf8');
const blanks = [1, 2, 3, 4, 5, 6].flatMap((cardNo) => [1, 2, 3, 4, 5, 6, 7, 8].map((rung) => ({
  questionId: `p${String(cardNo).padStart(3, '0')}-blank-r${rung}`, poemId: `p${String(cardNo).padStart(3, '0')}`, skill: 'text' as const, type: 'blank' as const,
  // **段ごとに隠す句を変える。** 画面は問題文ではなく歌の本文を出すので、
  // 隠れている句が違わないと、配られた段の違いを画面から見分けられない。
  blankUnit: 'ku' as const, blankedKu: [Math.min(rung, 5)], rung, prompt: `段${rung}の問題`, answer: '白妙の', answerHistorical: 'しろたへの', answerModern: 'しろたえの',
  acceptedAnswers: ['白妙の', 'しろたへの'], partialAnswers: [], candidates: [], normalization: 'kana' as const, note: null, sourceRef: 'fixture',
  reviewStatus: 'human-confirmed' as const, confirmationMode: 'individual' as const, confirmedBy: 'tester', confirmedOn: '2026-09-01', proposedBy: 'tester', batchEvidenceRef: null,
})));
const originalFetch = globalThis.fetch;
let root: HTMLDivElement | undefined;

afterEach(() => {
  if (root) { render(null, root); root.remove(); root = undefined; }
  (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
  window.history.replaceState(null, '', '/');
});

/** 段が入る前の記録（`rung` 欄なし）。**首ごとの本文を 81 まで積む。** */
const legacyEvents = (poemId: string) => Array.from({ length: 9 }, (_, index) => ({
  eventId: `${poemId}-legacy-${index}`, product: 'hyakunin' as const, poemId, questionId: `${poemId}-legacy-${index}`,
  sessionId: `old-${index}`, itemKey: `${poemId}:text`, kind: 'answer' as const, method: 'free-input' as const,
  outcome: 'correct' as const, hintUsed: false, effectiveMethod: 'free-input' as const, delta: 9,
  localDate: new Date(Date.UTC(2026, 7, 1 + index)).toISOString().slice(0, 10), sameSessionRepeat: false,
  appVersion: 'x', dataVersion: 1, masteryRulesVersion: 1,
}));

async function openPicker(seeded: ReturnType<typeof legacyEvents> = []) {
  window.history.replaceState(null, '', '/?from=1&to=6');
  (globalThis as unknown as { fetch: typeof fetch }).fetch = async (url) => {
    const name = String(url).split('/').pop()!;
    const bodies: Record<string, string> = { 'poems.json': poems, 'questions.blank.json': JSON.stringify(blanks), 'questions.author.json': '[]' };
    return { ok: true, status: 200, json: async () => JSON.parse(bodies[name] ?? '[]') } as Response;
  };
  const base = createMemoryPort();
  for (const event of seeded) await base.appendEvent(event);
  const port = { ...base, saveLocalReport: async () => true };
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => { render(<App port={port} />, root!); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '学習方法を選ぶ')!.click(); });
  await act(async () => { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === '歌本文')!.click(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  return port;
}

const button = (label: string) => Array.from(root!.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent === label)!;

test('086配線: 範囲選択に難しさの操作が出る', async () => {
  await openPicker();
  expect(root!.textContent, '難しさの操作が出ていない').toContain('難しさ');
  expect(root!.querySelector('.rung-level'), '段の番号を出している').toBeNull();
});

test('086配線: むずかしくすると、配られる問題がその段になる', async () => {
  await openPicker();
  await act(async () => { button('むずかしくする').click(); });

  await act(async () => { button('この範囲で始める').click(); await Promise.resolve(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  // p001 の句は 秋の田の／かりほの庵の／苫をあらみ／…。段2 なら**第2句**に空欄が立つ。
  const blanked = root!.querySelector('.blank-slot')?.parentElement?.textContent;
  expect(blanked, '空欄が第2句に無い（段2 が配られていない）').toContain('かりほの庵の');
  expect(blanked, '空欄が第1句のままである（段1 が配られている）').not.toContain('秋の田の');
});

test('086配線: 上げて解いた記録には印が付き、天井は自動の位置の段で残る', async () => {
  const port = await openPicker();
  await act(async () => { button('むずかしくする').click(); });
  await act(async () => { button('この範囲で始める').click(); await Promise.resolve(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = '白妙の'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '白妙の', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  const events = await port.listEvents();
  expect(events).toHaveLength(1);
  expect(events[0]?.raised, '手で上げた印が記録に届いていない').toBe(true);
  expect(events[0]?.rung, '上げた先の段の天井が開いている').toBe(1);
});

test('086配線: 自動の位置のままなら印を付けない', async () => {
  const port = await openPicker();
  await act(async () => { button('この範囲で始める').click(); await Promise.resolve(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = '白妙の'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '白妙の', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  const blanked = root!.querySelector('.blank-slot')?.parentElement?.textContent;
  expect(blanked, '自動の位置は段1 なので第1句に空欄が立つ').toContain('秋の田の');
  const events = await port.listEvents();
  expect(events[0]?.rung).toBe(1);
  expect(events[0]?.raised, '既定値を保存に書き込んでいる').toBeUndefined();
});

test('086配線: 手動の調整は保存に残らない', async () => {
  // **その回かぎりである**（§4.2）。保存に残すと、下げた先で加算が 0 のまま行き止まりになる。
  const port = await openPicker();
  await act(async () => { button('やさしくする').click(); });
  await act(async () => { button('むずかしくする').click(); });
  await act(async () => { button('むずかしくする').click(); });
  await act(async () => { button('この範囲で始める').click(); await Promise.resolve(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const saved = await port.loadSettings();
  expect(JSON.stringify(saved ?? {})).not.toMatch(/rung|adjust|raised/i);
});

/**
 * 2026-09-15・**頭打ちの行き止まり**（利用者からの報告）。
 *
 * 段の梯子が入る前に本文 81 まで積んだ学習者に段3（天井55）を配ると、
 * **何問正解しても 1 点も入らない。** 自動は「点が入る一番下の段」を配る（依頼者裁定）。
 */
test('086配線: 天井を超えている歌には、点が入る段が配られる', async () => {
  // **範囲の全首に積む。** 1 首だけだと、再開の計画がその首を飛ばして別の首を出し、
  // 何を測っているのか分からなくなる（2026-09-15 に実際に p002 を測っていた）。
  const port = await openPicker(['p001', 'p002', 'p003', 'p004', 'p005', 'p006'].flatMap(legacyEvents));
  await act(async () => { button('この範囲で始める').click(); await Promise.resolve(); });
  for (let index = 0; index < 3; index += 1) await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const input = root!.querySelector('input[placeholder]') as HTMLInputElement;
  await act(() => { input.value = '白妙の'; input.dispatchEvent(new InputEvent('input', { bubbles: true, data: '白妙の', inputType: 'insertText' })); });
  await act(async () => { root!.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  const saved = (await port.listEvents()).filter((event) => event.sessionId.startsWith('old-') === false);
  expect(saved).toHaveLength(1);
  expect(saved[0]?.rung, '天井が習熟度以下の段を配っている（行き止まり）').toBe(6);
  expect(saved[0]?.raised, '自動で配った段に手動の印が付いている').toBeUndefined();
});
