/**
 * 記録画面を開いた時の登場の動き（依頼者・2026-10-01、活用ノートの記録画面と同じ規則）。
 *
 * **見せ方だけを変える。** 数字・割合・輪の長さは画面が書いた最終値のままで、ここでは
 * 待機の見た目から最終値へ動かすだけである。動きを減らす設定の端末や、`matchMedia` を
 * 持たない環境（試験の jsdom など）では何もしない——最初から最終の見た目になる。
 *
 * - まとまりの箱（`[data-history-glide]`）：右の遠くから滑って止まり、中の輪が時計回りに伸びる。
 *   PC・iPad（768px 以上）は開いた時点で上から下・左から右へ 70ms 刻み。
 *   スマホは画面に入ったものだけを一度、75ms 刻みで。待機中は opacity だけを 0 にして定位置に置く。
 * - 全体のバー（`[data-history-draw]`）：左から伸びる。スマホは見えた時に一度。
 * - 数字（`[data-history-count]`）：0 から ease-out(quart) 780ms、180ms＋28ms×i の遅延。
 *   最終フレームは描画済みの文字列そのもの。数字でないもの（「—」など）は数えない。
 *
 * 開いた時だけ動かす（タブを戻した時・まとまりを開いた時は動かさない）ので、
 * 呼ぶのは画面を出した時の 1 回だけにする。戻り値で後片付けする。
 */
export function playHistoryMotion(root: HTMLElement): () => void {
  if (typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const frames: number[] = [];
  const observers: IntersectionObserver[] = [];
  const counters: Counter[] = [];
  let stopped = false;

  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-history-glide]'));
  const draws = Array.from(root.querySelectorAll<HTMLElement>('[data-history-draw]'));
  for (const el of [...cards, ...draws]) el.classList.add('is-waiting');
  for (const el of root.querySelectorAll<HTMLElement>('[data-history-count]')) {
    const counter = prepareCounter(el);
    if (counter) counters.push(counter);
  }

  const startCounting = () => counters.forEach((counter, index) => {
    const startTime = performance.now() + 180 + index * 28;
    const tick = (now: number) => {
      if (stopped || counter.node.data !== counter.written) return;
      const progress = Math.max(0, Math.min(1, (now - startTime) / 780));
      counter.written = progress < 1 ? counter.format(Math.round(counter.target * (1 - (1 - progress) ** 4))) : counter.text;
      counter.node.data = counter.written;
      if (progress < 1) frames.push(requestAnimationFrame(tick));
    };
    frames.push(requestAnimationFrame(tick));
  });

  if (window.matchMedia('(min-width: 768px)').matches || typeof IntersectionObserver !== 'function') {
    // 待機の見た目を 1 フレーム確実に描いてから、全部を上から順に流し込む。
    frames.push(requestAnimationFrame(() => frames.push(requestAnimationFrame(() => {
      if (stopped) return;
      stagger(cards, 70);
      draws.forEach(start);
      startCounting();
    }))));
  } else {
    const options: IntersectionObserverInit = { threshold: 0.05, rootMargin: '0px 0px -3% 0px' };
    const cardObserver = new IntersectionObserver((entries, observer) => {
      const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement);
      visible.forEach((el) => observer.unobserve(el));
      stagger(visible, 75);
    }, options);
    cards.forEach((el) => cardObserver.observe(el));
    const drawObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        start(entry.target as HTMLElement);
      }
    }, options);
    draws.forEach((el) => drawObserver.observe(el));
    observers.push(cardObserver, drawObserver);
    // ポイントと割合は画面の上端にあり、開いた時点で見えている。
    startCounting();
  }

  return () => {
    stopped = true;
    observers.forEach((observer) => observer.disconnect());
    frames.forEach((frame) => cancelAnimationFrame(frame));
    for (const counter of counters) if (counter.node.data === counter.written) counter.node.data = counter.text;
    for (const el of [...cards, ...draws]) finish(el);
  };
}

type Counter = { node: Text; text: string; target: number; format: (value: number) => string; written: string };

/**
 * **文字は既存の文字ノードの中身だけを書き換える。** `textContent` で入れ替えると、
 * Preact が持っている文字ノードが外れ、その後の記録の更新が画面に出なくなる。
 * 途中で画面が書き直したら（同期で記録が届いた時など）、その値を優先して止める。
 */
function prepareCounter(el: HTMLElement): Counter | null {
  const node = el.firstChild;
  if (!(node instanceof Text) || node.nextSibling) return null;
  const text = node.data;
  if (!/^[\d,]+$/.test(text)) return null;
  const grouped = text.includes(',');
  const format = (value: number) => grouped ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(value);
  const counter = { node, text, target: Number(text.replace(/,/g, '')), format, written: format(0) };
  node.data = counter.written;
  return counter;
}

/** 上から下へ、同じ高さなら左から右へ並べて、短い時間差を付ける。 */
function stagger(targets: readonly HTMLElement[], step: number): void {
  const rects = new Map(targets.map((el) => [el, el.getBoundingClientRect()]));
  targets.slice().sort((a, b) => {
    const ar = rects.get(a)!;
    const br = rects.get(b)!;
    return Math.abs(ar.top - br.top) > 3 ? ar.top - br.top : ar.left - br.left;
  }).forEach((el, index) => {
    el.style.setProperty('--history-glide-delay', `${index * step}ms`);
    start(el);
  });
}

/**
 * 待機を解いて動かす。**動き終えたら印を外す**——残すと、押した時の沈み込み（`:active`）を
 * アニメーションの最終値が上書きし続ける。描画（`history-draw`）が最後に終わるので、それを待つ。
 */
function start(el: HTMLElement): void {
  el.classList.remove('is-waiting');
  el.classList.add('is-in');
  const last = el.hasAttribute('data-history-glide') ? 'history-draw' : 'history-bar-grow';
  const done = (event: AnimationEvent) => {
    if (event.animationName !== last) return;
    el.removeEventListener('animationend', done);
    finish(el);
  };
  el.addEventListener('animationend', done);
}

function finish(el: HTMLElement): void {
  el.classList.remove('is-waiting', 'is-in');
  el.style.removeProperty('--history-glide-delay');
}
