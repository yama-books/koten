const imageUrls = {
  correct: new URL('../../../../../assets/feedback/correct-maru.webp', import.meta.url).href,
  incorrect: new URL('../../../../../assets/feedback/needs-review-check.webp', import.meta.url).href,
  perfect: new URL('../../../../../assets/feedback/perfect-hanamaru.webp', import.meta.url).href,
} as const;

/**
 * `silent` は**読み上げから外す**印。判定の文言は隣の判定欄が持っており、印にも名前を付けると
 * 同じ判定を二度読み上げることになる（発注076 §3「判定通知は1回にする」）。
 */
export function FeedbackMark({ kind, label, visualOnly = false, silent = false }: { kind: 'correct' | 'incorrect'; label: string; visualOnly?: boolean; silent?: boolean }) {
  return <span class={`feedback-mark feedback-mark--${kind}`} aria-hidden={silent ? 'true' : undefined} aria-label={silent ? undefined : visualOnly ? label : undefined}>
    <img src={imageUrls[kind]} alt="" aria-hidden="true" />
    {!visualOnly && <span>{label}</span>}
  </span>;
}

export function PerfectMark() {
  return <span class="perfect-mark">
    <img src={imageUrls.perfect} alt="" aria-hidden="true" />
    <span>全問花丸</span>
  </span>;
}
