import type { HistoryGroup, HistorySummary } from '../../domain/history.ts';
import { MasteryMeter } from '@koten/shared/mastery-meter';
import { RingMeter } from '../components/RingMeter.tsx';
import { RecordTransfer, canTransferRecords } from '../components/RecordTransfer.tsx';
import { CatMascot } from '../components/CatMascot.tsx';
import type { ApplicationPort } from '../adapters/indexeddb-port.ts';
import { useState } from 'preact/hooks';

/** タブの並び（依頼者・2026-09-16）。**一覧が既定である。** */
const TABS = ['一覧', '要確認', 'データ管理'] as const;
type Tab = typeof TABS[number];
type Props = { summary: HistorySummary; onHome: () => void; port?: ApplicationPort; onChanged?: () => void; initialTab?: Tab; onOpenSync?: () => void; syncEnabled?: boolean };

/**
 * 出すタブ。**持ち出しの口が無いポートでは、そのタブごと出さない**
 * ——押しても何も無い面へ連れて行くことになる。判定は `canTransferRecords` 1 か所から引く。
 */
function tabsFor(port?: ApplicationPort, onOpenSync?: () => void): readonly Tab[] {
  return canTransferRecords(port) || onOpenSync ? TABS : TABS.filter((name) => name !== 'データ管理');
}

/** 要確認の基準。**空のときも出す**ので、文言を 1 か所に置く（069 M-12）。 */
const REVIEW_CRITERION = '最後に解いたとき、まちがえたか「わからない」を選んだ歌です。';

function Entry({ entry }: { entry: HistorySummary['entries'][number] }) {
  // 作者の記録が無く 80% なら、本文は満点で作者分だけが残っている。
  const authorCapReached = entry.authorUnconfirmed && entry.percent === 80;
  // 初句は番号のすぐ後ろに置く。**メーターの読み上げ名にも入れる**——
  // 画面を見ない利用者にも「何番の何の歌か」が同じ手がかりで届く。
  const name = entry.firstKu === null ? `${entry.cardNo}番` : `${entry.cardNo}番「${entry.firstKu}」`;
  return <li class={`history-entry${authorCapReached ? ' history-entry--author-cap' : ''}${entry.untouched ? ' history-entry--untouched' : ''}`}>
    <strong>{entry.cardNo}番</strong>
    {/*
      画面では鉤括弧を出さない（依頼者・2026-09-21）。**2文字分の幅が 1 行に収まるかを分ける**——
      5文字の初句（「あしびきの」など）は鉤括弧ごとだと 390px で折り返す。
      色を落としてあるので、括弧が無くても UI の文言と混ざらない。
      **読み上げ名には残す**——音だけでは歌の切れ目が分からない。
    */}
    {entry.firstKu !== null && <span class="history-entry__ku">{entry.firstKu}</span>}
    {/*
      **未着手もバーで示す**（依頼者・2026-09-21）。「未着手」の文字は横幅を食い、
      1 行に収まらなくなる。0% と見分けがつかなくならないよう、**数字の代わりに「—」**を出し、
      溝を破線にする。読み上げ名では「未着手」と言い切る。
    */}
    <MasteryMeter
      label={name}
      percent={entry.untouched ? 0 : entry.percent}
      color={entry.untouched ? 'gray' : entry.color}
      text={entry.untouched ? '—' : `${entry.percent}%`}
      meterLabel={entry.untouched ? `${name}は未着手` : `${name}の習熟度`}
    />
    {/*
      作者の未確認は「作者」＋小さな（未）の印にする（依頼者・2026-09-21）。
      見える文字を 5 から 3 へ落として 1 行の幅を作る。意味は読み上げ名で言い切る。
    */}
    {/*
      **行ごとに「作者」と書かない**（依頼者・2026-09-21）。帯を伸ばす幅がここから出る。
      印だけでは意味が分からないので、一覧の頭に凡例を 1 行置いてある。
      印が無い首にも空の升を置く——**列を揃えるため**で、行によって帯の位置がずれない。
    */}
    {entry.authorUnconfirmed
      ? <span
          class={`history-entry__author${authorCapReached ? ' history-entry__author--next' : ''}`}
          role="img"
          aria-label={authorCapReached ? '作者も確認しましょう' : '作者は未確認'}
        >未</span>
      : <span class="history-entry__author" aria-hidden="true" />}
    {entry.conquered && <span class="history-conquered">完全制覇</span>}
  </li>;
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

export function History({ summary, onHome, port, onChanged, initialTab = '一覧', onOpenSync, syncEnabled = false }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return (
    <main class="history-screen">
      <header class="nav-edge">
        <span class="wordmark">これまでの記録</span>
        <button type="button" onClick={onHome}>ホームへ戻る</button>
      </header>
      {/* **ポイントとネコはタブの外に置く。** どの面に居ても、ためたものは見えていてよい。 */}
      {!summary.isEmpty && <><p class="history-points"><span class="history-points__label">これまでに ためたポイント</span><strong class="history-points__value">{formatPoints(summary.points)}</strong><CatMascot size="md" /></p><p>着手した歌: {summary.touchedCount}首</p></>}
      <nav class="history-tabs" role="tablist" aria-label="記録の見かた">
        {tabsFor(port, onOpenSync).map((name) => (
          <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => setTab(name)}>{name}</button>
        ))}
      </nav>
      {/*
        **取り返しのつかない操作を一覧と同じ面に出さない**（依頼者・2026-09-16）。
        100 行の一覧の下に「記録を消す」が並んでいた。
      */}
      <section class="history-panel" role="tabpanel" aria-label={tab}>
        {tab === '一覧' && (summary.isEmpty
          ? <div class="history-empty"><p>まだ記録がありません</p><button type="button" onClick={onHome}>始める</button></div>
          : <>
              <p class="history-legend"><span class="history-entry__author" aria-hidden="true">未</span>は作者をまだ確認していない歌です。</p>
              <ul class="history-groups">{summary.groups.map((group) => <Group key={group.from} group={group} />)}</ul>
            </>)}
        {tab === '要確認' && <>
          <h1 class="history-review-heading">要確認の歌</h1>
          <p>{REVIEW_CRITERION}</p>
          {summary.needsReview.length === 0 ? <p>要確認の歌はありません</p> : <ul class="history-list">{summary.needsReview.map((entry) => <Entry key={entry.poemId} entry={entry} />)}</ul>}
        </>}
        {tab === 'データ管理' && <div class="data-management">
          {onOpenSync && <section class="sync-management-card" aria-labelledby="sync-management-heading">
            <span class="sync-management-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M3.5 12h17m-4.5-4.5 4.5 4.5-4.5 4.5M8 7.5 3.5 12 8 16.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            <div><h1 id="sync-management-heading">端末間同期</h1><p>{syncEnabled ? '端末間同期が有効です' : '自分のスマホとタブレットをつなぐ'}</p></div>
            <button type="button" onClick={onOpenSync}>{syncEnabled ? '同期の設定を見る' : '同期を設定する'}</button>
          </section>}
          {port && canTransferRecords(port) && <RecordTransfer port={port} onChanged={onChanged} />}
        </div>}
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
