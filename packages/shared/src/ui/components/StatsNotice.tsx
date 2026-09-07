import type { JSX } from 'preact';

export const STATS_NOTICE_TEXT: string = '利用状況を一部集計します。集計には無作為な番号を使用するため、個人が特定されることはありません。';

export function StatsNotice(): JSX.Element {
  // 見出しは持たない。**問いかけは学年の見出しが1つだけ担う**（依頼者指示・2026-09-07）。
  // ここに「はじめに ― 学年を選択してください」を重ねると、同じことを2度言うことになる。
  return <section class="stats-notice"><p class="stats-notice__help">{STATS_NOTICE_TEXT}</p></section>;
}
