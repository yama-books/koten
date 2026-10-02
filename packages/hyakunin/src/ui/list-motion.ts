/**
 * 一覧の行の出し入れ（依頼者・2026-10-01）。**見せ方だけを変える。**
 *
 * - 行は上から順に、右から少し滑り込みながら出る（35ms 刻み）。各歌の帯は左から「びよーん」と伸びる。
 * - しまう時は逆。下の行から順に右へ抜けてから閉じる。
 * - まとまりを開け閉めして並びの段が変わる時は、ほかの箱を元の位置から新しい位置へ滑らせる。
 *
 * Web Animations（`element.animate`）を持たない環境（試験の jsdom など）と、
 * 動きを減らす設定の端末では何もしない——その場で最終の見た目になる。
 * 時間待ちは使わない。終わりはアニメーションの `finished` で知る。
 */
const ROW_STEP = 35;
const SLIDE = 'cubic-bezier(0.16, 0.82, 0.2, 1)';

export function motionAllowed(el: Element | null | undefined): el is HTMLElement {
  return el instanceof HTMLElement && typeof el.animate === 'function'
    && typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 棒を「びよーん」と伸ばす（依頼者・2026-10-01）。0 から伸びて終点を少し行き過ぎ、バネのように揺れて止まる。
 *
 * **行き過ぎの量は溝の幅で決める。** 棒自身の幅の割合で決めると、7% の棒は 0.5% しか行き過ぎず、
 * 揺れが見えない。溝の 4% 分（棒自身の 6〜35%）を行き過ぎる。幅は `offsetWidth`
 * （変形を無視した幅）で測る——待機中の `scaleX(0)` に引きずられない。
 */
export function springGrow(bar: Element, delay = 0): Animation | null {
  if (!motionAllowed(bar)) return null;
  const own = bar.offsetWidth;
  const track = bar.parentElement?.clientWidth ?? own;
  if (own <= 0) return null;
  const over = Math.min(0.35, Math.max(0.06, (0.04 * track) / own));
  return bar.animate([
    { transform: 'scaleX(0)', easing: 'cubic-bezier(0.3, 0.9, 0.4, 1)' },
    { transform: `scaleX(${1 + over})`, offset: 0.5, easing: 'ease-in-out' },
    { transform: `scaleX(${1 - over * 0.4})`, offset: 0.72, easing: 'ease-in-out' },
    { transform: `scaleX(${1 + over * 0.15})`, offset: 0.88, easing: 'ease-in-out' },
    { transform: 'none' },
  ], { duration: 900, delay, fill: 'backwards' });
}

/**
 * 増えた分だけを「びよーん」と伸ばす（依頼者・2026-10-01、出題中の進み具合の帯）。
 * 前の幅から新しい幅へ、少し行き過ぎてから戻る。**減った時と同じ時は動かさない。**
 */
export function springIncrease(bar: Element | null | undefined, from: number, to: number): void {
  if (!motionAllowed(bar) || to <= from) return;
  const over = Math.max(1.5, (to - from) * 0.25);
  const at = (value: number) => `${Math.max(0, Math.min(100, value))}%`;
  bar.animate([
    { width: at(from), easing: 'cubic-bezier(0.3, 0.9, 0.4, 1)' },
    { width: at(to + over), offset: 0.5, easing: 'ease-in-out' },
    { width: at(to - over * 0.4), offset: 0.72, easing: 'ease-in-out' },
    { width: at(to + over * 0.15), offset: 0.88, easing: 'ease-in-out' },
    { width: at(to) },
  ], { duration: 800 });
}

/**
 * 行を上から順に出す。中の帯（`.mastery-meter__fill` と `[data-list-bar]`）は左から伸ばす。
 * `after` は最初の行が動き出すまでの間（結果画面で、まとまりの登場を待ってから行を出す時に使う）。
 */
export function slideRowsIn(list: Element | null | undefined, after = 0): void {
  if (!motionAllowed(list)) return;
  Array.from(list.children).forEach((row, index) => {
    const delay = after + index * ROW_STEP;
    row.animate([{ opacity: 0, transform: 'translate3d(2.5rem, 0, 0)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay, easing: SLIDE, fill: 'backwards' });
    for (const bar of row.querySelectorAll('.mastery-meter__fill, [data-list-bar]')) springGrow(bar, delay + 120);
  });
}

/**
 * 行を下から順に抜く。**動かせない環境では `null`** を返す——呼ぶ側はその場で閉じる。
 * 抜き終えた行は見えないまま残す（`fill: forwards`）。閉じれば行ごと消える。
 */
export function slideRowsOut(list: Element | null | undefined): Promise<void> | null {
  if (!motionAllowed(list)) return null;
  const rows = Array.from(list.children);
  const step = Math.max(12, Math.min(ROW_STEP, 360 / Math.max(1, rows.length)));
  const animations = rows.map((row, index) => row.animate(
    [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translate3d(2.5rem, 0, 0)' }],
    { duration: 240, delay: (rows.length - 1 - index) * step, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fill: 'forwards' },
  ));
  return Promise.all(animations.map((animation) => animation.finished)).then(() => undefined, () => undefined);
}

/** 並びの箱の位置を控える。段が変わった後に `slideToNewPlaces` へ渡す。 */
export function measurePlaces(container: Element | null | undefined): Map<Element, DOMRect> | null {
  if (!motionAllowed(container)) return null;
  return new Map(Array.from(container.children).map((child) => [child, child.getBoundingClientRect()]));
}

/** 控えた位置から新しい位置へ滑らせる（FLIP）。位置の変わらない箱は動かさない。 */
export function slideToNewPlaces(places: Map<Element, DOMRect> | null): void {
  if (!places) return;
  for (const [child, before] of places) {
    if (!child.isConnected) continue;
    const after = child.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    child.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 420, easing: SLIDE });
  }
}
