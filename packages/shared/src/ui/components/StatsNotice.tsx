import type { JSX } from 'preact';

type Props = { onConfirm: () => void; disabled?: boolean };

export const STATS_NOTICE_TEXT: string = '利用状況を一部集計します。集計には無作為な番号を使用するため、個人が特定されることはありません。';

export function StatsNotice({ onConfirm, disabled = false }: Props): JSX.Element {
  return <section class="stats-notice" aria-labelledby="stats-notice-title"><h2 id="stats-notice-title">はじめに</h2><p>{STATS_NOTICE_TEXT}</p>{disabled && <p id="stats-notice-grade-help" class="stats-notice__help">学年を選ぶと確認できます。</p>}<button class="stats-notice__confirm" type="button" disabled={disabled} aria-describedby={disabled ? 'stats-notice-grade-help' : undefined} onClick={onConfirm}>確認する</button></section>;
}
