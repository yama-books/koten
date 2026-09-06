const imageUrls = {
  correct: new URL('../../../../../assets/feedback/correct-maru.webp', import.meta.url).href,
  incorrect: new URL('../../../../../assets/feedback/needs-review-check.webp', import.meta.url).href,
  perfect: new URL('../../../../../assets/feedback/perfect-hanamaru.webp', import.meta.url).href,
} as const;

export function FeedbackMark({ kind, label, visualOnly = false }: { kind: 'correct' | 'incorrect'; label: string; visualOnly?: boolean }) {
  return <span class={`feedback-mark feedback-mark--${kind}`} aria-label={visualOnly ? label : undefined}>
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
