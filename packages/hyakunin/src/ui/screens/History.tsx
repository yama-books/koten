import { overallMastery, type HistoryGroup, type HistorySummary } from '../../domain/history.ts';
import { PoemRowHead, PoemRow, PoemOverlay, type PoemRowData } from '../components/PoemRows.tsx';
import { RingMeter } from '../components/RingMeter.tsx';
import { RecordTransfer, canTransferRecords } from '../components/RecordTransfer.tsx';
import { CatMascot } from '../components/CatMascot.tsx';
import type { ApplicationPort } from '../adapters/indexeddb-port.ts';
import { playHistoryMotion } from '../history-motion.ts';
import { useEffect, useRef, useState } from 'preact/hooks';

/** タブの並び（依頼者・2026-09-16）。**一覧が既定である。** */
const TABS = ['一覧', '要確認', 'データ管理'] as const;
type Tab = typeof TABS[number];
type Props = { summary: HistorySummary; onHome: () => void; port?: ApplicationPort; onChanged?: () => void; initialTab?: Tab; onOpenSync?: () => void; syncEnabled?: boolean; onDeleteRemote?: () => Promise<boolean>; onStopSync?: () => Promise<boolean>; onPauseSync?: () => void; onResumeSync?: () => void };

/**
 * 出すタブ。**持ち出しの口が無いポートでは、そのタブごと出さない**
 * ——押しても何も無い面へ連れて行くことになる。判定は `canTransferRecords` 1 か所から引く。
 */
function tabsFor(port?: ApplicationPort, onOpenSync?: () => void): readonly Tab[] {
  return canTransferRecords(port) || onOpenSync ? TABS : TABS.filter((name) => name !== 'データ管理');
}

/** 要確認の基準。**空のときも出す**ので、文言を 1 か所に置く（069 M-12）。 */
const REVIEW_CRITERION = '最後に解いたとき、まちがえたか「わからない」を選んだ歌です。';

/**
 * 10 首ごとのまとまり。**閉じた状態で 10 個並ぶ。**
 *
 * 100 行をいちどに出すと、どこを練習したのかが読み取れない。
 * **開くのはひとつずつでなくてよい**——複数を開いたまま見比べる使い方を妨げない。
 */
function Group({ group, onOpen }: { group: HistoryGroup; onOpen?: (row: PoemRowData) => void }) {
  const [open, setOpen] = useState(false);
  const label = `${group.from}〜${group.to}番`;
  // 開いた時の動き（`playHistoryMotion`）で、箱が滑り込み、輪が時計回りに伸びる。
  return (
    <li class="history-group-item" data-history-glide>
      <button class="history-group" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span class="history-group__label">{label}</span>
        <RingMeter percent={group.percent} color={group.color} label={label} untouched={group.entries.every((entry) => entry.untouched)} />
      </button>
      {open && <ul class="history-list"><PoemRowHead />{group.entries.map((entry) => <PoemRow key={entry.poemId} row={entry} onOpen={onOpen} />)}</ul>}
    </li>
  );
}

export function History({ summary, onHome, port, onChanged, initialTab = '一覧', onOpenSync, syncEnabled = false, onDeleteRemote, onStopSync, onPauseSync, onResumeSync }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  // 押した歌を暗転の上に出す（依頼者・2026-09-22）。null なら閉じている。
  const [openPoem, setOpenPoem] = useState<PoemRowData | null>(null);
  // **開いた時だけ動かす**（依頼者・2026-10-01）。タブを戻した時・まとまりを開いた時は動かさない。
  const screen = useRef<HTMLElement>(null);
  useEffect(() => screen.current ? playHistoryMotion(screen.current) : undefined, []);
  const overall = overallMastery(summary.entries);
  return (
    <main class="history-screen" ref={screen}>
      <header class="nav-edge">
        <span class="wordmark">これまでの記録</span>
        <button type="button" onClick={onHome}>ホームへ戻る</button>
      </header>
      {/* **ポイントとネコはタブの外に置く。** どの面に居ても、ためたものは見えていてよい。 */}
      {!summary.isEmpty && <>
        <p class="history-points"><span class="history-points__label">これまでに ためたポイント</span><strong class="history-points__value" data-history-count>{formatPoints(summary.points)}</strong><CatMascot size="md" /></p>
        {/*
          **全体の習熟度は 1 本のバーと％だけ。言葉の評価は付けない**（依頼者・2026-10-01）。
          帯（1 首）・輪（10 首）と取り違えないよう、全幅・太め・4 分の 1 の目盛りつきにする。
        */}
        <section class={`history-overall history-overall--${overall.color}`} role="meter" aria-label="全体の習熟度" aria-valuenow={overall.percent} aria-valuemin={0} aria-valuemax={100} data-history-draw>
          <span class="history-overall__head" aria-hidden="true"><span class="history-overall__label">全体の習熟度</span><strong class="history-overall__value"><span data-history-count>{overall.percent}</span><small>%</small></strong></span>
          <span class="history-overall__track" aria-hidden="true"><span class="history-overall__fill" style={{ '--p': overall.percent }} /></span>
        </section>
        <p class="history-touched">着手した歌: <span data-history-count>{summary.touchedCount}</span>首</p>
      </>}
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
              <ul class="history-groups">{summary.groups.map((group) => <Group key={group.from} group={group} onOpen={setOpenPoem} />)}</ul>
            </>)}
        {tab === '要確認' && <>
          <h1 class="history-review-heading">要確認の歌</h1>
          <p>{REVIEW_CRITERION}</p>
          {summary.needsReview.length === 0 ? <p>要確認の歌はありません</p> : <ul class="history-list"><PoemRowHead />{summary.needsReview.map((entry) => <PoemRow key={entry.poemId} row={entry} onOpen={setOpenPoem} />)}</ul>}
        </>}
        {tab === 'データ管理' && <div class="data-management">
          {onOpenSync && <section class="sync-management-card" aria-labelledby="sync-management-heading">
            <span class="sync-management-card__icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M3.5 12h17m-4.5-4.5 4.5 4.5-4.5 4.5M8 7.5 3.5 12 8 16.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            <div><h1 id="sync-management-heading">端末間同期</h1><p>{syncEnabled ? '端末間同期が有効です' : '自分のスマホとタブレットをつなぐ'}</p></div>
            <button type="button" onClick={onOpenSync}>{syncEnabled ? '同期の設定を見る' : '同期を設定する'}</button>
          </section>}
          {port && canTransferRecords(port) && <RecordTransfer port={port} onChanged={onChanged} syncEnabled={syncEnabled} onDeleteRemote={onDeleteRemote} onStopSync={onStopSync} onPauseSync={onPauseSync} onResumeSync={onResumeSync} />}
        </div>}
      </section>
      {openPoem && <PoemOverlay row={openPoem} onClose={() => setOpenPoem(null)} />}
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
