import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test, vi } from 'vitest';
import type { SessionResult } from '../../packages/hyakunin/src/domain/result.ts';
import { Result } from '../../packages/hyakunin/src/ui/screens/Result.tsx';

/**
 * 2026-10-02・依頼者。**結果画面を出した時の動き**（活用ノートの記録画面と同じ数え上げ・記録画面と同じ滑り込み）。
 * 動きは見せ方だけ。**数字は画面が書いた最終値へ戻り**、動きを減らす設定では何もしない。
 */
const result: SessionResult = {
  range: { from: 1, to: 10 }, questionCount: 8,
  breakdown: { viewed: 1, correct: 4, partial: 1, needsReview: 0, incorrect: 2 },
  allCorrect: false,
  changes: [],
  poems: [{ poemId: 'p002', cardNo: 2, kind: 'incorrect', percent: 18, color: 'red', untouched: false, authorUnconfirmed: false, authorPercent: 40 }],
  retryCardNumbers: [2], retryQuestionIds: ['p002-ku1'],
  recommendation: undefined,
  points: 1234,
};

let root: HTMLDivElement | undefined;
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const media = (reduce: boolean) => vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduced-motion') ? reduce : false }));
/** Web Animations の代わり。呼ばれた要素と指定を控える。 */
function stubAnimate() {
  const calls: { el: Element; options: KeyframeAnimationOptions }[] = [];
  Object.defineProperty(HTMLElement.prototype, 'animate', {
    configurable: true,
    value(this: Element, _frames: Keyframe[], options: KeyframeAnimationOptions) {
      calls.push({ el: this, options });
      return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
    },
  });
  return calls;
}
const counts = () => Array.from(root!.querySelectorAll('[data-result-count]')).map((node) => node.textContent);
function mount() {
  root = document.createElement('div');
  document.body.append(root);
  act(() => { render(<Result result={result} onRetryWeak={() => {}} onRetrySame={() => {}} onHome={() => {}} />, root!); });
}

test('動き: 動きを減らす設定では、数字は最初から最終の値で、何も動かさない', () => {
  media(true);
  const calls = stubAnimate();
  mount();
  expect(counts()).toEqual(['1234', '4', '1', '2', '1']);
  expect(calls).toHaveLength(0);
  delete (HTMLElement.prototype as { animate?: unknown }).animate;
});

test('動き: 数字は 0 から数え始め、画面を閉じれば最終の値へ戻る。まとまりは上から順に滑り込む', () => {
  media(false);
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const calls = stubAnimate();
  vi.spyOn(performance, 'now').mockReturnValue(0);
  mount();
  // 待機中は 0。**元の文字ノードの中身だけを書き換える**（textContent で入れ替えない）。
  expect(counts()).toEqual(['0', '0', '0', '0', '0']);
  const blocks = calls.filter((call) => call.el.hasAttribute('data-result-enter'));
  expect(blocks.map((call) => call.el.className.split(' ')[0])).toEqual(['result-summary', 'result-actions', 'result-section', 'result-details']);
  expect(blocks.map((call) => call.options.delay)).toEqual([0, 70, 140, 210]);
  // 色帯は数え上げと同じ 780ms で左から現れる。次に確認する歌の行は、まとまりが入ってから。
  expect(calls.find((call) => call.el.hasAttribute('data-result-stack'))?.options.duration).toBe(780);
  expect(calls.some((call) => call.el.closest('[data-result-rows]') && call.el.tagName === 'LI')).toBe(true);
  // 数え終えた時刻のフレームを流すと、最終フレームは描画済みの文字列そのもの。
  for (const frame of frames.splice(0)) frame(5000);
  expect(counts()).toEqual(['1234', '4', '1', '2', '1']);
  delete (HTMLElement.prototype as { animate?: unknown }).animate;
});

test('動き: 数え上げの途中で画面を閉じても、数字は最終の値に戻る', () => {
  media(false);
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  stubAnimate();
  mount();
  const value = root!.querySelector('[data-result-count]')!;
  expect(value.textContent).toBe('0');
  act(() => { render(null, root!); });
  expect(value.textContent).toBe('1234');
  delete (HTMLElement.prototype as { animate?: unknown }).animate;
});
