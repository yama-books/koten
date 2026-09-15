import type { HistoryGroup, HistorySummary } from '../../domain/history.ts';
import { MasteryMeter } from '@koten/shared/mastery-meter';
import { RingMeter } from '../components/RingMeter.tsx';
import { RecordTransfer, canTransferRecords } from '../components/RecordTransfer.tsx';
import { CatMascot } from '../components/CatMascot.tsx';
import type { ApplicationPort } from '../adapters/indexeddb-port.ts';
import { useState } from 'preact/hooks';

type Props = { summary: HistorySummary; onHome: () => void; port?: ApplicationPort; onChanged?: () => void };

/** タブの並び（依頼者・2026-09-16）。**一覧が既定である。** */
const TABS = ['一覧', '要確認', 'データ管理'] as const;
type Tab = typeof TABS[number];

/**
 * 出すタブ。**持ち出しの口が無いポートでは、そのタブごと出さない**
 * ——押しても何も無い面へ連れて行くことになる。判定は `canTransferRecords` 1 か所から引く。
 */
function tabsFor(port?: ApplicationPort): readonly Tab[] {
  return canTransferRecords(port) ? TABS : TABS.filter((name) => name !== 'データ管理');
}

/** 要確認の基準。**空のときも出す**ので、文言を 1 か所に置く（069 M-12）。 */
const REVIEW_CRITERION = '最後に解いたとき、まちがえたか「わからない」を選んだ歌です。';

function Entry({ entry }: { entry: HistorySummary['entries'][number] }) {
  return <li class="history-entry"><strong>{entry.cardNo}番</strong>{entry.untouched ? <span>未着手</span> : <MasteryMeter label={`${entry.cardNo}番`} percent={entry.percent} color={entry.color} />}{entry.authorUnconfirmed && <span>作者 未確認</span>}{entry.conquered && <span class="history-conquered">完全制覇</span>}</li>;
}

/**
 * 10 首ごとのまとまり。**閉じた状態で 10 個並ぶ。**
 *
 * 100 行をいちどに出すと、どこを練習したのかが読み取れない。
 * **開くのはひとつずつでなくてよい**——複数を開いたまま見比べる使い方を妨げない。
 */
function Group({ group }: { group: HistoryGroup }) {
  const [open, setOpen] = useState(false);
  const label = `${group.from}〜${group.to}番`;
  return (
    <li class="history-group-item">
      <button class="history-group" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span class="history-group__label">{label}</span>
        <RingMeter percent={group.percent} color={group.color} label={label} />
      </button>
      {open && <ul class="history-list">{group.entries.map((entry) => <Entry key={entry.poemId} entry={entry} />)}</ul>}
    </li>
  );
}

export function History({ summary, onHome, port, onChanged }: Props) {
  const [tab, setTab] = useState<Tab>('一覧');
  if (summary.isEmpty) return <main class="history-screen"><header class="nav-edge"><span class="wordmark">これまでの記録</span></header><p>まだ記録がありません</p><section aria-labelledby="review-heading"><h1 id="review-heading">要確認の歌</h1><p>{REVIEW_CRITERION}</p><p>要確認の歌はありません</p></section><button type="button" onClick={onHome}>始める</button>{port && <RecordTransfer port={port} onChanged={onChanged} />}</main>;
  return (
    <main class="history-screen">
      <header class="nav-edge">
        <span class="wordmark">これまでの記録</span>
        <button type="button" onClick={onHome}>ホームへ戻る</button>
      </header>
      {/* **ポイントとネコはタブの外に置く。** どの面に居ても、ためたものは見えていてよい。 */}
      <p class="history-points"><span class="history-points__label">これまでに ためたポイント</span><strong class="history-points__value">{formatPoints(summary.points)}</strong><CatMascot size="md" /></p>
      <p>着手した歌: {summary.touchedCount}首</p>
      <nav class="history-tabs" role="tablist" aria-label="記録の見かた">
        {tabsFor(port).map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>
        ))}
      </nav>
      {/*
        **取り返しのつかない操作を一覧と同じ面に出さない**（依頼者・2026-09-16）。
        100 行の一覧の下に「記録を消す」が並んでいた。
      */}
      <section class="history-panel" role="tabpanel" aria-label={tab}>
        {tab === '一覧' && <ul class="history-groups">{summary.groups.map((group) => <Group key={group.from} group={group} />)}</ul>}
        {tab === '要確認' && <>
          <h1 class="history-review-heading">要確認の歌</h1>
          <p>{REVIEW_CRITERION}</p>
          {summary.needsReview.length === 0 ? <p>要確認の歌はありません</p> : <ul class="history-list">{summary.needsReview.map((entry) => <Entry key={entry.poemId} entry={entry} />)}</ul>}
        </>}
        {tab === 'データ管理' && port && <RecordTransfer port={port} onChanged={onChanged} />}
      </section>
    </main>
  );
}

/**
 * 3桁ごとに区切る。`toLocaleString` を使わないのは、**実行環境のロケール設定で
 * 区切り文字が変わる**ため。試験機と利用者の端末で表示がずれるのは避ける。
 */
function formatPoints(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
