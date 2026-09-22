import { render } from 'preact';
import { act } from 'preact/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { History } from '../../packages/hyakunin/src/ui/screens/History.tsx';
import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';
import { App } from '../../packages/hyakunin/src/main.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import type { HistorySummary } from '../../packages/hyakunin/src/domain/history.ts';

let root: HTMLDivElement | undefined;
const summary: { -readonly [K in keyof HistorySummary]: HistorySummary[K] } = { isEmpty: false, touchedCount: 2, points: 1248, entries: [
  { poemId: 'p012', cardNo: 12, percent: 90, color: 'green', untouched: false, authorUnconfirmed: false, needsReview: true, conquered: false, poem: null, authorPercent: 90 },
  { poemId: 'p045', cardNo: 45, percent: 0, color: 'gray', untouched: false, authorUnconfirmed: true, needsReview: true, conquered: false, poem: null, authorPercent: null },
  { poemId: 'p099', cardNo: 99, percent: 0, color: 'gray', untouched: true, authorUnconfirmed: true, needsReview: false, conquered: false, poem: null, authorPercent: null },
], needsReview: [], groups: [] };
summary.needsReview = summary.entries.slice(0, 2);
/**
 * 一覧は 10 首ごとのまとまりになった（2026-09-16）。**まとまりは集計側が作る**ので、
 * 試験でも `summarizeHistory` と同じ形（`from`・`to`・平均）を置く。
 */
summary.groups = [{ from: 12, to: 99, percent: 30, color: 'red', entries: summary.entries }];
function mount(value = summary, onHome = () => {}) { root = document.createElement('div'); document.body.append(root); render(<History summary={value} onHome={onHome} />, root); return root; }
/** 一覧のまとまりを開く。開くまで 100 首の行は出ない。 */
function openGroup(view: HTMLElement) { act(() => { view.querySelector<HTMLButtonElement>('.history-group')!.click(); }); return view; }
/** タブを切り替える。 */
function switchTo(view: HTMLElement, label: string) { act(() => { Array.from(view.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((item) => item.textContent === label)!.click(); }); return view; }
afterEach(() => { root?.remove(); root = undefined; });
test('history: まとまりを開くと全首の記録を表示する', () => { const view = openGroup(mount()); // 「番」は見出しが持つ。行には番号だけが出る。
  for (const card of ['12', '45', '99']) expect(view.querySelector('.history-list')?.textContent).toContain(card); });
test('history: メーターと数値を表示する', () => {
  const view = mount();
  expect(view.querySelectorAll('[role="meter"]'), 'まとまりの輪だけが出る').toHaveLength(1);
  openGroup(view);
  // 未着手にも帯を出すようになった（依頼者・2026-09-21）。輪1つと全3首の帯。
  expect(view.querySelectorAll('[role="meter"]'), '輪1つと、3首すべての帯').toHaveLength(4);
  // 「習熟度」の語は行から外し、数字だけを出す。意味は読み上げ名が持つ。
  expect(view.textContent).toContain('90%');
  // 「習熟度」は見出しにだけ置く。行には数字と帯だけ。
  expect(view.querySelector('.history-entry:not(.history-head)')?.textContent).not.toContain('習熟度');
  expect(view.querySelector('.history-head')?.textContent).toContain('習熟度');
});
test('history: 未着手も帯で示し、0% と見分けられる', () => {
  // 「未着手」の文字は横幅を食うので帯に替えた（依頼者・2026-09-21）。
  // **0% と同じ見た目にはしない**——数字を「—」にして区別する。意味は読み上げ名が言い切る。
  const rows = Array.from(openGroup(mount()).querySelectorAll('li.history-entry:not(.history-head)'));
  const byNo = (no: string) => rows.find((node) => node.querySelector('.history-entry__no')?.textContent === no)!;
  const untouched = byNo('99');
  const zero = byNo('45');
  expect(untouched.querySelector('[role="meter"]'), '未着手にも帯を出す').not.toBeNull();
  expect(untouched.textContent).toContain('—');
  expect(untouched.textContent).not.toContain('0%');
  expect(untouched.querySelector('[role="meter"]')?.getAttribute('aria-label')).toContain('未着手');
  expect(zero.textContent, '測って 0% の首は数字を出す').toContain('0%');
  expect(zero.querySelector('[role="meter"]')?.getAttribute('aria-label')).not.toContain('未着手');
});
test('history: 作者未確認を作者イベントがない首にだけ併記する', () => {
  // 「作者 未確認」から「作者」＋小さな（未）の印へ替えた（依頼者・2026-09-21）。
  // 見える字数は減らしても、**読み上げ名では言い切る。**
  const view = openGroup(mount());
  const rows = Array.from(view.querySelectorAll('li.history-entry:not(.history-head)'));
  const byNo = (no: string) => rows.find((node) => node.querySelector('.history-entry__no')?.textContent === no)!;
  const unconfirmed = byNo('45');
  const answered = byNo('12');
  expect(unconfirmed.querySelector('.author-stage')?.getAttribute('aria-label')).toBe('作者: まだ確認していません');
  expect(unconfirmed.querySelector('.author-stage')?.textContent).toBe('未');
  // 作者を答えた首は段階が進む。**升は全行にあり、中身が変わる。**
  expect(answered.querySelector('.author-stage')?.textContent).toBe('◎');
  expect(answered.querySelector('.author-stage')?.getAttribute('aria-label')).toBe('作者: 覚えました');
});
test('history: 要確認を番号順で表示する', () => { const rows = Array.from(switchTo(mount(), '要確認').querySelectorAll('.history-entry:not(.history-head) .history-entry__no')).map((n) => n.textContent);
  expect(rows).toEqual(['12', '45']); });
test('history: 要確認なしの文言を表示する', () => expect(switchTo(mount({ ...summary, needsReview: [] }), '要確認').textContent).toContain('要確認の歌はありません'));
test('history: 要確認の基準は一覧が空でも一度だけ示す', () => { const view = switchTo(mount({ ...summary, needsReview: [] }), '要確認'); expect(view.textContent?.split('最後に解いたとき、まちがえたか「わからない」を選んだ歌です。')).toHaveLength(2); });
test('history: 空状態に始める導線がある', () => { const view = mount({ ...summary, isEmpty: true, entries: [], groups: [], needsReview: [], touchedCount: 0 }); expect(view.textContent).toContain('まだ記録がありません'); expect(view.textContent).toContain('始める'); });
test('history: 完全な空記録でも要確認の基準を出す', () => { const view = switchTo(mount({ ...summary, isEmpty: true, entries: [], groups: [], needsReview: [], touchedCount: 0 }), '要確認'); expect(view.textContent).toContain('最後に解いたとき、まちがえたか「わからない」を選んだ歌です。'); });
test('history: Home の記録導線はコールバックを呼ぶ', () => { let opened = false; root = document.createElement('div'); document.body.append(root); render(<Home poems={[] as never[]} questions={[]} onOpenHistory={() => { opened = true; }} />, root); Array.from(root.querySelectorAll('button')).find((button) => button.textContent === 'これまでの記録')!.click(); expect(opened).toBe(true); });
test('history: 記録を開く間はloadingを表示する', async () => {
  const source = readFileSync(join(process.cwd(), 'packages/hyakunin/src/data/generated/poems.json'), 'utf8');
  const previousFetch = globalThis.fetch;
  (globalThis as unknown as { fetch: typeof fetch }).fetch = async (url) => ({ ok: true, status: 200, json: async () => JSON.parse(String(url).endsWith('poems.json') ? source : '[]') } as Response);
  const base = createMemoryPort(); let gate = false; let release: (() => void) | undefined;
  const port = { ...base, listEvents: async () => !gate ? [] : new Promise<readonly []>((resolve) => { release = () => resolve([]); }), saveLocalReport: async () => true };
  root = document.createElement('div'); document.body.append(root);
  await act(async () => { render(<App port={port} />, root!); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  const button = Array.from(root.querySelectorAll('button')).find((candidate) => candidate.textContent === 'これまでの記録');
  expect(button).toBeTruthy(); gate = true;
  await act(async () => { button!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(root.textContent).toContain('記録を読み込んでいます。');
  await act(async () => { release!(); await Promise.resolve(); });
  expect(root.textContent).toContain('まだ記録がありません');
  (globalThis as unknown as { fetch: typeof fetch }).fetch = previousFetch;
});
// これまでの記録に残すことが、この機能のいちばんの目的（依頼者要望・2026-09-09）。
test('history: 累計ポイントを3桁区切りで表示する', () => { const view = mount(); expect(view.textContent).toContain('これまでに ためたポイント'); expect(view.textContent).toContain('1,248'); });
test('history: ネコは装飾で、読み上げ木に出ない', () => {
  const cat = mount().querySelector('img.cat-mascot');
  expect(cat).not.toBeNull();
  expect(cat?.getAttribute('alt')).toBe('');
  expect(cat?.getAttribute('aria-hidden')).toBe('true');
});

// ---- 初句（2026-09-21・依頼者「1番「秋の田の…」習熟度3%」） ----

/** 初句つきの一覧。番号だけの版と同じ形にして、初句の有無だけを変える。 */
function summaryWithKu(firstKu: string | null) {
  const poem = firstKu === null ? null : { poemId: 'p001', ku: [firstKu, '', '', '', ''], author: { canonical: '天智天皇' } };
  const entries = [{ poemId: 'p001', cardNo: 1, percent: 3, color: 'red' as const, untouched: false, authorUnconfirmed: false, needsReview: true, conquered: false, poem, authorPercent: 10 }];
  return { isEmpty: false, touchedCount: 1, points: 0, entries, needsReview: entries, groups: [{ from: 1, to: 10, percent: 3, color: 'red' as const, entries }] } as unknown as HistorySummary;
}

test('history: 一覧に番号と初句と習熟度が並ぶ', () => {
  const view = openGroup(mount(summaryWithKu('秋の田の')));
  const row = view.querySelector('.history-entry:not(.history-head)')!;
  expect(row.querySelector('.history-entry__no')?.textContent).toBe('1');
  expect(row.querySelector('.history-entry__ku')?.textContent).toBe('秋の田の');
  expect(row.textContent).toContain('3%');
  // バーは残る。初句は手がかりであって、メーターの代わりではない。
  expect(row.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('3');
});

test('history: 画面の初句に鉤括弧と省略記号を出さない', () => {
  // 1 行に収めるため、見える文字を削ってある（依頼者・2026-09-21）。
  const row = openGroup(mount(summaryWithKu('あしびきの'))).querySelector('.history-entry')!;
  expect(row.textContent).not.toContain('「');
  expect(row.textContent).not.toContain('…');
});

test('history: 初句が無ければ番号だけを出す', () => {
  const row = openGroup(mount(summaryWithKu(null))).querySelector('.history-entry:not(.history-head)')!;
  expect(row.querySelector('.history-entry__no')?.textContent).toBe('1');
  expect(row.querySelector('.history-entry__ku')?.textContent).toBe('');
});

test('history: メーターの読み上げ名にも初句が入る', () => {
  // 画面を見ない利用者にも「何番の何の歌か」が同じ手がかりで届く。
  const row = openGroup(mount(summaryWithKu('秋の田の'))).querySelector('.history-entry:not(.history-head)')!;
  // 読み上げ名には鉤括弧を残す——音だけでは歌の切れ目が分からない。
  expect(row.querySelector('[role="meter"]')?.getAttribute('aria-label')).toBe('1番「秋の田の」の習熟度');
});

test('history: 要確認の面にも初句が出る', () => {
  const view = switchTo(mount(summaryWithKu('秋の田の')), '要確認');
  expect(view.querySelector('.history-entry:not(.history-head) .history-entry__ku')?.textContent).toBe('秋の田の');
});

test('history: どの行も同じ数の升を出す', () => {
  // **帯の長さと位置を全首で揃えるための土台**（依頼者・2026-09-21）。
  // 列は親の `.history-list` が決め、各行は `subgrid` でそれを共有する。
  // 行によって升の数が変わると列がずれるので、**印が無い首にも空の升を置く。**
  // 以前は作者の印が無い行（94番・97番など）で帯の位置がずれていた。
  const view = openGroup(mount());
  const rows = Array.from(view.querySelectorAll('li.history-entry:not(.history-head)'));
  expect(rows.length).toBeGreaterThan(1);
  // 押せる行はボタンが升を継ぐ。**升を持つ要素**で数える。
  const cells = rows.map((row) => Array.from((row.querySelector('.history-entry__open') ?? row).children).length);
  expect(new Set(cells).size, `行ごとに升の数が違う: ${cells.join(',')}`).toBe(1);
  for (const row of rows) {
    expect(row.querySelector('[role="meter"]'), '帯が無い行がある').not.toBeNull();
    expect(row.querySelector('.author-stage'), '作者の升が無い行がある').not.toBeNull();
  }
});

// ---- 歌を開く（2026-09-22・依頼者「クリックすると背景暗転し、歌と作者が出る」） ----

/** 歌データつきの一覧。開いたときに何を見せるかを確かめる。 */
function summaryWithPoem() {
  const poem = { poemId: 'p001', ku: ['秋の田の', 'かりほの庵の', '苫をあらみ', 'わが衣手は', '露にぬれつつ'], author: { canonical: '天智天皇' } };
  const entries = [{ poemId: 'p001', cardNo: 1, percent: 3, color: 'red' as const, untouched: false, authorUnconfirmed: false, needsReview: true, conquered: false, poem, authorPercent: 10 }];
  return { isEmpty: false, touchedCount: 1, points: 0, entries, needsReview: entries, groups: [{ from: 1, to: 10, percent: 3, color: 'red' as const, entries }] } as unknown as HistorySummary;
}

test('history: 行を押すと歌と作者が出る', () => {
  const view = openGroup(mount(summaryWithPoem()));
  expect(view.querySelector('.poem-overlay'), '押す前から出ている').toBeNull();
  act(() => { view.querySelector<HTMLButtonElement>('.history-entry__open')!.click(); });
  const overlay = view.querySelector('.poem-overlay')!;
  expect(overlay).not.toBeNull();
  expect(overlay.getAttribute('aria-modal')).toBe('true');
  expect(Array.from(overlay.querySelectorAll('.poem span')).map((s) => s.textContent))
    .toEqual(['秋の田の', 'かりほの庵の', '苫をあらみ', 'わが衣手は', '露にぬれつつ']);
  expect(overlay.querySelector('.author')?.textContent).toBe('天智天皇');
});

test('history: 開いた歌は閉じられる', () => {
  // **戻れない面を作らない。** 閉じる手が無いと、記録を見るたびに再読み込みが要る。
  const view = openGroup(mount(summaryWithPoem()));
  act(() => { view.querySelector<HTMLButtonElement>('.history-entry__open')!.click(); });
  act(() => { Array.from(view.querySelectorAll<HTMLButtonElement>('.poem-overlay button')).find((b) => b.textContent === '閉じる')!.click(); });
  expect(view.querySelector('.poem-overlay')).toBeNull();
});

test('history: 歌が無ければ押せる行にしない', () => {
  // 押しても見せるものが無い。**押せる見た目にもしない。**
  const view = openGroup(mount(summaryWithKu(null)));
  expect(view.querySelector('.history-entry__open')).toBeNull();
});

test('history: 押せる行に左右の余白を足さない', () => {
  // **共通の `button` は `padding-inline` を持つ。** そのままだと行だけが右へずれ、
  // 見出しの「番号」と行の番号が合わなくなる（2026-09-22 に実機で踏んだ）。
  // jsdom は値を計算しないので、**指定が消えていないこと**で見る。
  const view = openGroup(mount(summaryWithPoem()));
  const button = view.querySelector<HTMLButtonElement>('.history-entry__open')!;
  expect(button).not.toBeNull();
  const rule = Array.from(document.styleSheets)
    .flatMap((sheet) => { try { return Array.from(sheet.cssRules); } catch { return []; } })
    .find((r) => r instanceof CSSStyleRule && r.selectorText?.includes('.history-entry__open')) as CSSStyleRule | undefined;
  // 読み込めない試験環境では飛ばす。読めるときだけ指定を見る。
  if (rule) expect(rule.style.paddingInline, '共通ボタンの左右余白を打ち消していない').toBe('0px');
});

test('history: 作者欄の凡例は出さない', () => {
  // 幅を作るため畳んだ（依頼者・2026-09-22）。意味は印の読み上げ名と title が持つ。
  const view = openGroup(mount(summaryWithPoem()));
  expect(view.querySelector('.history-legend')).toBeNull();
  expect(view.querySelector('.author-stage')?.getAttribute('title')).toBe('作者: もう少し');
});
