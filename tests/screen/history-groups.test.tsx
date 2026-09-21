import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { History } from '../../packages/hyakunin/src/ui/screens/History.tsx';
import { summarizeHistory } from '../../packages/hyakunin/src/domain/history.ts';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import type { ApplicationPort } from '../../packages/hyakunin/src/ui/adapters/indexeddb-port.ts';
import type { Event } from '../../packages/shared/src/domain/event.ts';

/**
 * 2026-09-16・依頼者。**記録画面を 3 つのタブに分け、一覧を 10 首ごとのまとまりにする。**
 *
 * 100 行の平坦な一覧の下に「記録を消す」が置かれていた。**取り返しのつかない操作を
 * 一覧から引き離す**のがタブ分けの主目的である。
 */
const poemIds = Array.from({ length: 100 }, (_, index) => `p${String(index + 1).padStart(3, '0')}`);
const correct = (poemId: string, index: number): Event => ({
  eventId: `e${poemId}-${index}`, product: 'hyakunin', poemId, questionId: `${poemId}-q${index}`,
  sessionId: `s${poemId}-${index}`, itemKey: `${poemId}:text`, kind: 'answer', method: 'free-input',
  outcome: 'correct', hintUsed: false, effectiveMethod: 'free-input', delta: 9, rung: 6,
  localDate: new Date(Date.UTC(2026, 6, 1 + index)).toISOString().slice(0, 10), sameSessionRepeat: false,
  appVersion: 'x', dataVersion: 1, masteryRulesVersion: 1,
});
const wrong = (poemId: string): Event => ({ ...correct(poemId, 99), eventId: `w-${poemId}`, outcome: 'incorrect' });
const summary = summarizeHistory({
  events: [...Array.from({ length: 10 }, (_, index) => correct('p001', index)), correct('p045', 0), wrong('p045')],
  poemIds,
});

/**
 * 持ち出しの口を持つポート。**`RecordTransfer` は口が無いと機能ごと出さない**ので、
 * 簡易ポートのままでは「消す」が出ず、タブ分けの釘が緑にならない。
 */
const transferPort = (): ApplicationPort => ({
  ...createMemoryPort(),
  async saveLocalReport() { return true; },
  async exportRecords() { return { text: '{}', summary: { counts: { sessions: 0, events: 0, reports: 0 }, characters: 2 } }; },
  async previewImport() { return { ok: true, plan: {} } as never; },
  async commitImport() { return { sessions: { added: 0, duplicates: 0 }, events: { added: 0, duplicates: 0 }, reports: { added: 0, duplicates: 0 } }; },
  async previewDelete() { return { sessions: 1, events: 12, reports: 0, outbox: 0 }; },
  async commitDelete(counts) { return counts; },
} as ApplicationPort);

let root: HTMLDivElement | undefined;
function mount(port?: ApplicationPort, shown = summary) {
  root = document.createElement('div');
  document.body.append(root);
  render(<History summary={shown} onHome={() => {}} port={port} />, root);
  return root;
}
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });
const tab = (label: string) => Array.from(root!.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((item) => item.textContent === label)!;
const group = (label: string) => Array.from(root!.querySelectorAll<HTMLButtonElement>('.history-group')).find((item) => item.textContent?.startsWith(label))!;

test('記録: タブは一覧・要確認・データ管理の 3 つで、既定は一覧', () => {
  const view = mount(transferPort());
  expect(Array.from(view.querySelectorAll('[role="tab"]')).map((item) => item.textContent)).toEqual(['一覧', '要確認', 'データ管理']);
  expect(tab('一覧').getAttribute('aria-selected')).toBe('true');
  expect(view.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
});

test('記録: 一覧は 10 首ごとのまとまり 10 個である', () => {
  const view = mount();
  const labels = Array.from(view.querySelectorAll('.history-group')).map((item) => item.textContent);
  expect(labels).toHaveLength(10);
  expect(labels[0]).toContain('1〜10番');
  expect(labels[9]).toContain('91〜100番');
});

test('記録: まとまりの輪は、その 10 首の平均を出す', () => {
  const view = mount();
  // 1番だけを段6 まで解いた状態。1番は 72%、10 首の平均は 7%。
  const meter = group('1〜10番').querySelector('[role="meter"]')!;
  expect(meter.getAttribute('aria-valuenow')).toBe('7');
  expect(meter.getAttribute('aria-label')).toContain('1〜10番');
  expect(group('1〜10番').textContent).toContain('7%');
});

test('記録: まとまりを開くまで、100 首の行は出さない', () => {
  const view = mount();
  expect(view.querySelectorAll('.history-entry')).toHaveLength(0);
  expect(group('1〜10番').getAttribute('aria-expanded')).toBe('false');
});

test('記録: まとまりを開くと、その 10 首だけが出る', async () => {
  const view = mount();
  await act(() => { group('1〜10番').click(); });
  expect(group('1〜10番').getAttribute('aria-expanded')).toBe('true');
  const cards = Array.from(view.querySelectorAll('.history-entry')).map((item) => item.textContent);
  expect(cards).toHaveLength(10);
  expect(cards[0]).toContain('1番');
  expect(view.textContent).not.toContain('45番');
});

test('記録: 作者未確認で80%に達した歌だけ次の確認先を強調する', async () => {
  const first = summary.groups[0]!;
  const entries = first.entries.map((entry, index) => index === 0
    ? { ...entry, percent: 80, color: 'blue' as const, authorUnconfirmed: true }
    : entry);
  const view = mount(undefined, { ...summary, groups: [{ ...first, entries }, ...summary.groups.slice(1)] });
  await act(() => { group('1〜10番').click(); });
  const row = view.querySelector('.history-entry')!;
  // 「作者も確認」の文言は小さな（未）の印に替えた（依頼者・2026-09-21）。
  // **強調は残す**——ここが「次にやること」を指している。
  expect(row.querySelector('.history-entry__author')?.getAttribute('aria-label')).toBe('作者も確認しましょう');
  expect(row.querySelector('.history-entry__author--next')).not.toBeNull();
  expect(row.classList.contains('history-entry--author-cap')).toBe(true);
});

test('記録: 要確認のタブに切り替えると、要確認だけが出る', async () => {
  const view = mount();
  await act(() => { tab('要確認').click(); });
  expect(view.textContent).toContain('最後に解いたとき、まちがえたか「わからない」を選んだ歌です。');
  expect(view.querySelectorAll('.history-group')).toHaveLength(0);
  expect(Array.from(view.querySelectorAll('.history-entry')).map((item) => item.textContent)).toHaveLength(1);
  expect(view.textContent).toContain('45番');
});

test('記録: 取り返しのつかない操作は、一覧と同じ面に出さない', async () => {
  // **これがタブ分けの主目的である。** 100 行の一覧の下に「記録を消す」が並んでいた。
  const view = mount(transferPort());
  expect(view.textContent).not.toContain('記録を消す');
  await act(() => { tab('データ管理').click(); });
  expect(view.textContent).toContain('記録を書き出す');
  expect(view.textContent).toContain('記録を消す');
  expect(view.querySelectorAll('.history-group')).toHaveLength(0);
});

test('記録: ポイントとネコはタブの外にあり、どのタブでも見える', async () => {
  const view = mount(transferPort());
  for (const label of ['一覧', '要確認', 'データ管理']) {
    await act(() => { tab(label).click(); });
    expect(view.textContent, `${label} でポイントが消えている`).toContain('これまでに ためたポイント');
    expect(view.querySelector('img.cat-mascot'), `${label} でネコが消えている`).not.toBeNull();
  }
});
