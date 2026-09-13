import { ENTRY_LABELS } from '../../packages/hyakunin/src/domain/entry.ts';
import { BUTTON_KEYS, ENTRY_KEYS, QUESTION_TYPE_KEYS } from '../../packages/shared/src/telemetry/registry.ts';
import type { Summary, Totals } from './aggregate.ts';

/**
 * ボタンの日本語。**画面の文言をそのまま使う**——勝手に名付けると、報告と画面が食い違う。
 * `start`・`answer`・`hint` は画面に語を持たない（押した結果として数えている）。
 *
 * 入口は `ENTRY_LABELS` を **import する。** 複製すると片方だけ古くなる。
 */
export const BUTTON_LABELS: Record<string, string> = {
  start: '学習の開始',
  answer: '解答',
  hint: 'ヒントを使った解答',
  reveal: '答えを確認する',
  history: 'これまでの記録',
  report: '問題を報告',
};

const QUESTION_TYPE_LABELS: Record<string, string> = { blank: '穴埋め', author: '作者' };

/** 受け取った文字列を組み立てに使わせない。項目名は届いたものであって、こちらが書いたものではない。 */
function escape(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

const STYLE = `body{font-family:system-ui,sans-serif;margin:2rem auto;max-width:60rem;padding:0 1rem;line-height:1.7}
h1{font-size:1.4rem}h2{font-size:1.1rem;margin-top:2.5rem;border-bottom:1px solid #ccc;padding-bottom:.3rem}
table{border-collapse:collapse;width:100%;margin:.5rem 0}th,td{border:1px solid #ccc;padding:.3rem .6rem;text-align:right}
th:first-child,td:first-child{text-align:left}thead th{background:#f2f2f2}
.meta{color:#444}.warn{background:#fff4e5;border-left:4px solid #e08a00;padding:.6rem 1rem;margin:.6rem 0}
.note{color:#555;font-size:.9rem}.empty{background:#eef2ff;border-left:4px solid #4557c4;padding:.8rem 1rem;font-weight:bold}
.scroll{overflow-x:auto}
.scroll table{width:auto;min-width:100%}.scroll th,.scroll td{white-space:nowrap}`;

function row(label: string, value: number): string {
  return `<tr><td>${escape(label)}</td><td>${value}</td></tr>`;
}

function countTable(title: string, entries: Array<[string, string, number]>): string {
  const body = entries.map(([, label, value]) => row(label, value)).join('');
  return `<h2>${escape(title)}</h2><table><thead><tr><th>項目</th><th>回数</th></tr></thead><tbody>${body}</tbody></table>`;
}

function labelled(totals: Totals): { buttons: Array<[string, string, number]>; entries: Array<[string, string, number]>; types: Array<[string, string, number]> } {
  return {
    buttons: BUTTON_KEYS.map((key) => [key, BUTTON_LABELS[key] ?? key, totals.buttonCounts[key] ?? 0]),
    entries: ENTRY_KEYS.map((key) => [key, ENTRY_LABELS[key] ?? key, totals.entryCounts[key] ?? 0]),
    types: QUESTION_TYPE_KEYS.map((key) => [key, QUESTION_TYPE_LABELS[key] ?? key, totals.questionTypeCounts[key] ?? 0]),
  };
}

function dailyTable(summary: Summary): string {
  const columns = [
    ...BUTTON_KEYS.map((key) => ({ head: BUTTON_LABELS[key] ?? key, pick: (row: Totals) => row.buttonCounts[key] ?? 0 })),
    ...ENTRY_KEYS.map((key) => ({ head: ENTRY_LABELS[key] ?? key, pick: (row: Totals) => row.entryCounts[key] ?? 0 })),
    ...QUESTION_TYPE_KEYS.map((key) => ({ head: QUESTION_TYPE_LABELS[key] ?? key, pick: (row: Totals) => row.questionTypeCounts[key] ?? 0 })),
  ];
  const head = ['日付', '端末数', '閲覧', ...columns.map((column) => column.head)]
    .map((text) => `<th>${escape(text)}</th>`).join('');
  const body = summary.daily.map((day) => {
    const cells = [day.deviceCount, day.pageViews, ...columns.map((column) => column.pick(day))];
    return `<tr><td>${escape(day.localDate)}</td>${cells.map((value) => `<td>${value}</td>`).join('')}</tr>`;
  }).join('');
  return `<h2>日別</h2><div class="scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function renderReport(input: { summary: Summary; fetchedAt: string }): string {
  const { summary, fetchedAt } = input;
  const period = summary.period === null ? '—' : `${summary.period.from} 〜 ${summary.period.to}`;
  const warnings = summary.warnings.map((text) => `<p class="warn">${escape(text)}</p>`).join('');

  // **0 件を空の表にしない。** 空の表は「使われていない」と読めるが、鍵の権限不足かもしれない。
  const empty = summary.documentCount === 0
    ? '<p class="empty">統計は 0 件でした。これは「使われていない」とは限りません——鍵の権限や取得先のコレクションを確かめてください。</p>'
    : '';

  const totals = labelled(summary.totals);
  const body = summary.documentCount === 0 ? '' : [
    countTable('ボタン（合計）', totals.buttons),
    `<p class="note">「解答」は解答数 ${summary.totals.attemptCount} と同じ数です。別の数ではありません。</p>`,
    countTable('入口（合計）', totals.entries),
    countTable('出題形式（合計）', totals.types),
    `<h2>その他（合計）</h2><table><tbody>${row('閲覧', summary.totals.pageViews)}${row('解答', summary.totals.attemptCount)}</tbody></table>`,
    dailyTable(summary),
  ].join('');

  return `<title>統計報告</title><style>${STYLE}</style>
<h1>統計報告</h1>
<p class="meta">取得: ${escape(fetchedAt)}／期間: ${escape(period)}／文書 ${summary.documentCount} 件／端末 ${summary.deviceCount} 台／取得先: ${escape(summary.collections.join('、') || '—')}</p>
<p class="note">習熟度は出していません。端末ごとの平均を足して割ると平均の平均になり、利用量の違う端末が混ざると実態からずれるためです。</p>
${warnings}${empty}${body}
`;
}
