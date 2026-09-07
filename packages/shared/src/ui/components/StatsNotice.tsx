import type { JSX } from 'preact';

export const STATS_NOTICE_TEXT: string = '利用状況を一部集計します。集計には無作為な番号を使用するため、個人が特定されることはありません。';

export function StatsNotice(): JSX.Element {
  return <section class="stats-notice" aria-labelledby="stats-notice-title"><h2 id="stats-notice-title">はじめに ― 学年を選択してください</h2><p class="stats-notice__help">{STATS_NOTICE_TEXT}</p></section>;
}
