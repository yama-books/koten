import { render } from 'preact';
import { act } from 'preact/test-utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { History } from '../../packages/hyakunin/src/ui/screens/History.tsx';
import { summarizeHistory } from '../../packages/hyakunin/src/domain/history.ts';
import { playHistoryMotion } from '../../packages/hyakunin/src/ui/history-motion.ts';
import type { Event } from '../../packages/shared/src/domain/event.ts';

/**
 * 2026-10-01・依頼者。**記録画面に全体のバーと、開いた時の登場の動きを入れる**
 * （活用ノートの記録画面と同じ規則。比較モックで裁定）。
 *
 * - 全体の習熟度は全首の平均を 1 本のバーと％で出す。言葉の評価は付けない。
 * - 未着手のまとまりは破線の空の輪に「未」。0% と見分ける。
 * - 動きは見せ方だけ。**数字・割合は最終値のまま**で、動きを減らす設定では何もしない。
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
// 1〜10番を解き（各 72%）、11番だけをまちがえる（0%・着手済み）。21番以降は未着手。
const summary = summarizeHistory({
  events: [...poemIds.slice(0, 10).flatMap((poemId) => Array.from({ length: 10 }, (_, index) => correct(poemId, index))), wrong('p011')],
  poemIds,
});

let root: HTMLDivElement | undefined;
function mount() {
  root = document.createElement('div');
  document.body.append(root);
  act(() => { render(<History summary={summary} onHome={() => {}} />, root!); });
  return root;
}
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } vi.unstubAllGlobals(); });
const group = (label: string) => Array.from(root!.querySelectorAll<HTMLButtonElement>('.history-group')).find((item) => item.textContent?.startsWith(label))!;
/** 動きを減らす設定かどうかと、PC・iPad 幅かどうかを差し替える。 */
const media = (reduce: boolean, wide = true) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduced-motion') ? reduce : wide }));

test('記録: 全体の習熟度は全首の平均を 1 本のバーと％で出す', () => {
  const view = mount();
  const bar = view.querySelector('.history-overall[role="meter"]')!;
  expect(bar.getAttribute('aria-label')).toBe('全体の習熟度');
  expect(bar.getAttribute('aria-valuenow')).toBe('7');
  expect(bar.textContent).toBe('全体の習熟度7%');
  // 5 色の境目どおり（7% は赤）。新しい色を作らない。
  expect(bar.classList.contains('history-overall--red')).toBe(true);
  expect(view.querySelector<HTMLElement>('.history-overall__fill')!.style.getPropertyValue('--p')).toBe('7');
  // **タブの外に置く。** ポイントと同じく、どの面でも見える。
  expect(view.querySelector('.history-panel .history-overall')).toBeNull();
});

test('記録: 未着手のまとまりは「未」、着手して 0% のまとまりは 0% と出す', () => {
  const view = mount();
  const untouched = group('21〜30番').querySelector('[role="meter"]')!;
  expect(untouched.classList.contains('ring-meter--untouched')).toBe(true);
  expect(untouched.textContent).toBe('未');
  expect(untouched.getAttribute('aria-valuetext')).toBe('未着手');
  const zero = group('11〜20番').querySelector('[role="meter"]')!;
  expect(zero.classList.contains('ring-meter--untouched')).toBe(false);
  expect(zero.textContent).toBe('0%');
  expect(group('1〜10番').querySelector('[role="meter"]')!.textContent).toBe('72%');
});

test('記録: 輪の実線の長さを CSS へも渡す（属性は完成形のまま）', () => {
  const view = mount();
  const fill = group('1〜10番').querySelector<SVGCircleElement>('.ring-meter__fill')!;
  const length = (2 * Math.PI * 16 * 72) / 100;
  expect(fill.getAttribute('stroke-dasharray')).toBe(`${length} ${2 * Math.PI * 16}`);
  expect(fill.style.getPropertyValue('--ring-len')).toBe(length.toFixed(2));
});

test('動き: 動きを減らす設定では何もせず、最終の見た目のまま', () => {
  media(true);
  const view = mount();
  expect(view.querySelectorAll('.is-waiting, .is-in')).toHaveLength(0);
  expect(view.querySelector('.history-points__value')!.textContent).toBe(String(summary.points).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
});

test('動き: 開いた時は待機の見た目から始め、上から順に流し込む', () => {
  media(false);
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  root = document.createElement('div');
  document.body.append(root);
  // 画面の効果（`useEffect`）は描いた後に走る。`act` で流し切る。
  act(() => { render(<History summary={summary} onHome={() => {}} />, root!); });
  // 10 個の箱とバーが待機に入り、数字は 0 から数える。
  expect(root.querySelectorAll('.history-group-item.is-waiting')).toHaveLength(10);
  expect(root.querySelector('.history-overall')!.classList.contains('is-waiting')).toBe(true);
  expect(root.querySelector('.history-overall__value')!.textContent).toBe('0%');
  expect(root.querySelector('.history-touched')!.textContent).toBe('着手した歌: 0首');
  // 2 フレーム後に流し込む。上から下・左から右に 70ms 刻み。
  frames.shift()!(0);
  frames.shift()!(0);
  const items = Array.from(root.querySelectorAll<HTMLElement>('.history-group-item'));
  expect(items.every((item) => item.classList.contains('is-in'))).toBe(true);
  expect(items.map((item) => item.style.getPropertyValue('--history-glide-delay')).slice(0, 3)).toEqual(['0ms', '70ms', '140ms']);
});

test('動き: 片付けで数字を最終値へ戻し、印を外す', () => {
  media(false);
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const host = document.createElement('main');
  host.innerHTML = '<strong data-history-count>1,248</strong><span data-history-count>—</span><li data-history-glide></li>';
  const stop = playHistoryMotion(host);
  expect(host.querySelector('strong')!.textContent).toBe('0');
  // 数字でないもの（「—」）は数えない。
  expect(host.querySelector('span')!.textContent).toBe('—');
  expect(host.querySelector('li')!.classList.contains('is-waiting')).toBe(true);
  stop();
  expect(host.querySelector('strong')!.textContent).toBe('1,248');
  expect(host.querySelector('li')!.className).toBe('');
});

test('動き: CSS は既定で完成形を描き、動きを減らす設定では止める', () => {
  const styles = readFileSync(join(process.cwd(), 'packages/hyakunin/src/styles.css'), 'utf8');
  // 既定値 1 = 完成形。`@property` を持たない環境でも輪は最後まで描かれる。
  expect(styles).toContain('@property --history-draw { syntax: "<number>"; inherits: true; initial-value: 1; }');
  expect(styles).toMatch(/\.ring-meter__fill \{ stroke-dasharray: calc\(var\(--ring-len, 0\) \* var\(--history-draw, 1\) \* 1px\) 200px; \}/);
  // 動かすのは transform と opacity（と輪の長さ）だけ。
  const glide = styles.match(/@keyframes history-glide \{([\s\S]*?)\n\}/)?.[1] ?? '';
  expect(glide.match(/[a-z-]+(?=:)/g)?.filter((name) => !['opacity', 'transform'].includes(name))).toEqual([]);
  expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\n  \.history-group-item\.is-waiting \{ --history-draw: 1; opacity: 1; \}/);
});
