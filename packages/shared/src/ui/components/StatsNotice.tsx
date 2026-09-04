import type { JSX } from 'preact';

type Props = { onConfirm: () => void };

export const STATS_NOTICE_TEXT: string = '利用状況を一部集計します。集計には無作為な番号を使用するため、個人が特定されることはありません。';

export function StatsNotice({ onConfirm }: Props): JSX.Element {
  return <section class="stats-notice" aria-labelledby="stats-notice-title"><h1 id="stats-notice-title">はじめに</h1><p>{STATS_NOTICE_TEXT}</p><button class="stats-notice__confirm" type="button" onClick={onConfirm}>確認する</button></section>;
}
