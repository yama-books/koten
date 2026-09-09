import type { HistorySummary } from '../../domain/history.ts';
import { MasteryMeter } from '@koten/shared/mastery-meter';
import { RecordTransfer } from '../components/RecordTransfer.tsx';
import { CatMascot } from '../components/CatMascot.tsx';
import type { ApplicationPort } from '../adapters/indexeddb-port.ts';

type Props = { summary: HistorySummary; onHome: () => void; port?: ApplicationPort; onChanged?: () => void };

function Entry({ entry }: { entry: HistorySummary['entries'][number] }) {
  return <li class="history-entry"><strong>{entry.cardNo}番</strong>{entry.untouched ? <span>未着手</span> : <MasteryMeter label={`${entry.cardNo}番`} percent={entry.percent} color={entry.color} />}{entry.authorUnconfirmed && <span>作者 未確認</span>}</li>;
}

export function History({ summary, onHome, port, onChanged }: Props) {
  if (summary.isEmpty) return <main class="history-screen"><header class="nav-edge"><span class="wordmark">これまでの記録</span></header><p>まだ記録がありません</p><section aria-labelledby="review-heading"><h1 id="review-heading">要確認の歌</h1><p>最後に解いたとき、まちがえたか「わからない」を選んだ歌です。</p><p>要確認の歌はありません</p></section><button type="button" onClick={onHome}>始める</button>{port && <RecordTransfer port={port} onChanged={onChanged} />}</main>;
  return <main class="history-screen"><header class="nav-edge"><span class="wordmark">これまでの記録</span><button type="button" onClick={onHome}>ホームへ戻る</button></header><p class="history-points"><span class="history-points__label">これまでに ためたポイント</span><strong class="history-points__value">{formatPoints(summary.points)}</strong><CatMascot size="md" /></p><p>着手した歌: {summary.touchedCount}首</p>{port && <RecordTransfer port={port} onChanged={onChanged} />}<section aria-labelledby="review-heading"><h1 id="review-heading">要確認の歌</h1><p>最後に解いたとき、まちがえたか「わからない」を選んだ歌です。</p>{summary.needsReview.length === 0 ? <p>要確認の歌はありません</p> : <ul class="history-list">{summary.needsReview.map((entry) => <Entry key={entry.poemId} entry={entry} />)}</ul>}</section><section aria-labelledby="all-heading"><h2 id="all-heading">全100首</h2><ul class="history-list">{summary.entries.map((entry) => <Entry key={entry.poemId} entry={entry} />)}</ul></section></main>;
}

/**
 * 3桁ごとに区切る。`toLocaleString` を使わないのは、**実行環境のロケール設定で
 * 区切り文字が変わる**ため。試験機と利用者の端末で表示がずれるのは避ける。
 */
function formatPoints(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
