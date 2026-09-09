const catUrl = new URL('../../../../../assets/mascot/cat-mascot.webp', import.meta.url).href;

/**
 * アプリアイコンと同じネコ。**装飾であり、情報を持たない。**
 *
 * 読み上げから外すのは、隣にある数字がすでに意味を全部持っているためである
 * （発注076 §3「判定通知は1回にする」と同じ考え）。ネコに名前を付けると、
 * 「1248 ポイント ネコ」と読み上げられる。
 */
export function CatMascot({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return <img class={`cat-mascot cat-mascot--${size}`} src={catUrl} alt="" aria-hidden="true" />;
}
