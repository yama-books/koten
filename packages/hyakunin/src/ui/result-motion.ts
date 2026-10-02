import { countUp, prepareCounter, settleCounters, type Counter } from './history-motion.ts';
import { motionAllowed, slideRowsIn } from './list-motion.ts';

/**
 * 結果画面を出した時の登場の動き（依頼者・2026-10-02）。**見せ方だけを変える。**
 *
 * - まとまり（`[data-result-enter]`）：上から順に、右から少し滑り込む（70ms 刻み）。記録画面と同じ動き。
 * - 数字（`[data-result-count]`）：活用ノートの記録画面と同じ規則で 0 から数え上げる（`countUp`）。
 * - 内訳の色帯（`[data-result-stack]`）：左から順に現れる。数え上げと同じ 780ms・ease-out(quart)。
 * - 次に確認する歌（`[data-result-rows]`）：まとまりが入ってから、行を上から順に出して帯を伸ばす。
 *
 * 動きを減らす設定の端末や、Web Animations を持たない環境（試験の jsdom など）では何もしない——
 * 最初から最終の見た目になる。時間待ちは使わない（遅れは `animate` の `delay` と rAF で取る）。
 * 呼ぶのは画面を出した時の 1 回だけ。戻り値で後片付けする。
 */
export function playResultMotion(root: HTMLElement | null): () => void {
  if (!motionAllowed(root)) return () => {};
  const frames: number[] = [];
  const animations: Animation[] = [];
  let stopped = false;
  const counters: Counter[] = [];
  for (const el of root.querySelectorAll<HTMLElement>('[data-result-count]')) {
    const counter = prepareCounter(el);
    if (counter) counters.push(counter);
  }
  const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-result-enter]'));
  blocks.forEach((block, index) => {
    animations.push(block.animate(
      [{ opacity: 0, transform: 'translate3d(2.5rem, 0, 0)' }, { opacity: 1, transform: 'none' }],
      { duration: 420, delay: index * 70, easing: 'cubic-bezier(0.16, 0.82, 0.2, 1)', fill: 'backwards' },
    ));
    if (block.querySelector('[data-result-rows]')) slideRowsIn(block.querySelector('[data-result-rows]'), index * 70 + 160);
  });
  const stack = root.querySelector<HTMLElement>('[data-result-stack]');
  if (stack) {
    animations.push(stack.animate(
      [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      { duration: 780, delay: 180, easing: 'cubic-bezier(0.25, 1, 0.5, 1)', fill: 'backwards' },
    ));
  }
  countUp(counters, frames, () => stopped);
  return () => {
    stopped = true;
    frames.forEach((frame) => cancelAnimationFrame(frame));
    settleCounters(counters);
    animations.forEach((animation) => animation.cancel());
  };
}
