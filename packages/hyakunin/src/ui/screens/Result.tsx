import type { MasteryChange, MasteryNote, OutcomeKind, PoemOutcome, SessionResult } from '../../domain/result.ts';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Poem } from '../../data/schema.ts';
import { PoemOverlay, PoemRows, type PoemRowData } from '../components/PoemRows.tsx';
import { PerfectMark } from '../components/FeedbackMark.tsx';
import { CatMascot } from '../components/CatMascot.tsx';
import { slideRowsIn } from '../list-motion.ts';
import { playResultMotion } from '../result-motion.ts';
import { MasteryMeter } from '@koten/shared/mastery-meter';
import { masteryDisplay } from '@koten/shared/domain/mastery/color';

type Props = {
  result: SessionResult;
  /**
   * 歌の本文（2026-09-16）。**「次に確認する」に初句を出すために渡す。**
   * 番号だけでは、どの歌なのか思い出せない。**番号から本文を推測しない。**
   */
  poems?: readonly Poem[];
  onRetryWeak: (questionIds: readonly string[]) => void;
  onRetrySame: () => void;
  onHome: () => void;
};

/**
 * 発注075：**今回の結果 → 次の操作 → 次に確認する → 学習記録の詳細** の順に置く。
 *
 * 2026-10-02（依頼者・比較モックの A＋C）：今回の結果は中央にまとめる——上にネコとポイント、
 * その下に内訳の色帯、幅いっぱいの操作へと広がる形（おにぎり）。数字は 0 から数え上げ、
 * まとまりは上から順に滑り込む。「次に確認する」は今回まちがえた・答えを見た歌の一覧にする。
 *
 * 対象範囲の歌一覧は範囲全体を並べるので、範囲1番〜100番なら今回8問でも100首が
 * 再練習ボタンの上に積まれていた。記録は削るのではなく、一段の `details` の中へ移す。
 * DOM 順と視覚順は一致させる（`order` で並べ替えない）。
 */
export function Result({ result, poems = [], onRetryWeak, onRetrySame, onHome }: Props) {
  const recommendedFirstKu = poems.find((poem) => poem.poemId === result.recommendation?.poemId)?.ku[0];
  // 歌を番号から引けるようにしておく。一覧の初句と、押したときの本文に使う。
  const poemOf = new Map(poems.map((poem) => [poem.poemId, poem]));
  const retryCards = new Set(result.retryCardNumbers);
  const retryPoems = result.poems.filter((outcome) => retryCards.has(outcome.cardNo) && outcome.kind !== null && outcome.kind !== 'correct');
  const root = useRef<HTMLElement>(null);
  // 出した時に 1 回だけ動かす。動きを減らす設定では何もしない。
  useEffect(() => playResultMotion(root.current), []);
  return <main class="result-screen" ref={root}>
    <header class="nav-edge"><span class="wordmark">結果</span><button type="button" onClick={onHome}>ホームへ戻る</button></header>
    <section class="result-summary" aria-labelledby="result-heading" data-result-enter>
      <h1 id="result-heading" class="sr-only">今回の結果</h1>
      <p class="result-meta">{result.range.from}番〜{result.range.to}番・{result.questionCount}問</p>
      {/* 得点規則は非開示（依頼者裁定・2026-09-09）。獲得点だけを出し、内訳も式も画面に書かない。 */}
      <p class="result-points"><CatMascot /><span class="result-points__label">今回の<br />ポイント</span><strong class="result-points__value">+<span data-result-count>{result.points}</span></strong></p>
      {result.allCorrect && <p class="result-hanamaru"><PerfectMark /></p>}
      <Breakdown breakdown={result.breakdown} />
    </section>
    <section class="result-actions practice-choices" aria-label="次の操作" data-result-enter>
      {result.retryQuestionIds.length > 0 && <div class="practice-choice"><button type="button" onClick={() => onRetryWeak(result.retryQuestionIds)}>まちがえた歌だけをもう一度</button><p>答えを見た問題・正答にならなかった問題を、同じ出題内容で{result.retryQuestionIds.length}問くりかえし練習します。</p></div>}
      {/* 「同じ範囲をもう一度」は範囲から出題し直す操作で、同じ問題が出る保証はない。名前を変えない。 */}
      <div class="practice-choice"><button class="primary" type="button" onClick={onRetrySame}>同じ範囲をもう一度</button><p>同じ範囲でもう一度出題します。</p></div>
    </section>
    {/*
      1首だけでは訴えるものがない（依頼者・2026-10-02）。**今回まちがえた・答えを見た歌を一覧にする。**
      その歌が無い回（全問正答など）だけ、従来のおすすめ一首を出す。推薦の計算は変えない。
    */}
    {retryPoems.length > 0
      ? <section class="result-section result-next" aria-labelledby="recommend-heading" data-result-enter>
        <h2 id="recommend-heading">次に確認する歌<small>{retryPoems.length}首</small></h2>
        <RetryRows rows={retryPoems.map((outcome) => ({ ...outcome, poem: poemOf.get(outcome.poemId) ?? null }))} />
      </section>
      : result.recommendation && <section class="result-section result-recommend" aria-labelledby="recommend-heading" data-result-enter><h2 id="recommend-heading">次に確認する</h2><p>{Number(result.recommendation.poemId.slice(1))}番{recommendedFirstKu && <span class="result-recommend__ku">{recommendedFirstKu}…</span>}</p><p>{result.recommendation.reason}</p></section>}
    {/*
      開けることが分かるよう、見出しを枠のボタンの形にする（依頼者・2026-10-02）。▼ と中身の予告は飾り（CSS）で、
      見出しの文字は「学習記録の詳細」のまま。詳細を開いた時、変化の行と歌の行を上から順に出し、帯を伸ばす（2026-10-01）。
    */}
    <details class="result-details" data-result-enter onToggle={(event) => { const details = event.currentTarget as HTMLDetailsElement; if (!details.open) return; details.querySelectorAll('.result-changes, .history-list').forEach((list) => slideRowsIn(list)); lightChanges(details.querySelector('.result-changes')); }}>
      <summary data-hint={`${result.changes.length === 0 ? '習熟度の変化なし' : `習熟度の変化 ${result.changes.length}首`}・歌ごとの状態 ${result.poems.length}首`}>学習記録の詳細</summary>
      <p class="result-details__note">習熟度は、これまでの学習記録をもとにした目安です。今回の正答率ではありません。</p>
      <section class="result-section" aria-labelledby="changes-heading">
        <h2 id="changes-heading">習熟度の変化</h2>
        {result.changes.length === 0 ? <p>変化はありません</p> : <ul class="result-changes">{result.changes.map((change, index) => <ChangeRow key={change.poemId} change={change} index={index} />)}</ul>}
      </section>
      <section class="result-section" aria-labelledby="poems-heading">
        <h2 id="poems-heading">歌ごとの状態</h2>
        {/* 記録一覧と同じ並べ方・同じ段階・同じ開き方を使う（依頼者・2026-09-22）。
            二度書くと片方だけ直る。 */}
        <PoemRows rows={result.poems.map((outcome) => ({ ...outcome, poem: poemOf.get(outcome.poemId) ?? null }))} />
      </section>
    </details>
  </main>;
}

/**
 * 内訳（依頼者・2026-10-02、比較モックの C の色帯）。**帯は飾り**で、数は凡例の文字が持つ。
 * 色は習熟度の 5 色を借りる（新しい色を作らない）。閲覧 0 件の行は出さない（2026-09-06）。
 * 「要確認」（読み未確認）は内部の区分で、表示しない（2026-09-05）——帯の割合も表示する区分だけで取る。
 */
const BREAKDOWN_ROWS: readonly Readonly<{ key: 'correct' | 'partial' | 'incorrect' | 'viewed'; label: string; color: string }>[] = [
  { key: 'correct', label: '正答', color: 'green' },
  { key: 'partial', label: '△ 仮名遣い確認', color: 'yellow' },
  { key: 'incorrect', label: '誤答', color: 'red' },
  // **表記は「わからない」にする**（依頼者・2026-09-16）。保存する事象は閲覧（`viewed`）のままだが、
  // 学習者が押したのは「わからない！」であって、閲覧モードで眺めたのではない。
  { key: 'viewed', label: 'わからない', color: 'gray' },
];

function Breakdown({ breakdown }: { breakdown: SessionResult['breakdown'] }) {
  const rows = BREAKDOWN_ROWS.filter((row) => row.key !== 'viewed' || breakdown.viewed > 0);
  const total = rows.reduce((sum, row) => sum + breakdown[row.key], 0);
  return <>
    <h2 id="breakdown-heading" class="sr-only">内訳</h2>
    {total > 0 && <span class="result-stack" aria-hidden="true" data-result-stack>
      {rows.filter((row) => breakdown[row.key] > 0).map((row) => <span key={row.key} class={`result-stack__part mastery-meter--${row.color}`} style={{ flexGrow: breakdown[row.key] }} />)}
    </span>}
    <dl class="result-breakdown" aria-labelledby="breakdown-heading">
      {rows.map((row) => <div key={row.key} class={`mastery-meter--${row.color}${breakdown[row.key] === 0 ? ' is-zero' : ''}`}>
        <dt>{row.label}</dt><dd><span data-result-count>{breakdown[row.key]}</span>問</dd>
      </div>)}
    </dl>
  </>;
}

/** 今回の結果の札。**「要確認」の語は使わない**——学習者には誤答の意味に読まれる（2026-09-05）。 */
const KIND_TAGS: Readonly<Record<Exclude<OutcomeKind, 'correct'>, string>> = {
  viewed: 'わからない',
  partial: '△ 仮名遣い',
  'needs-review': '見直し',
  incorrect: '誤答',
};

/**
 * 次に確認する歌（依頼者・2026-10-02）。記録一覧と同じ升（番号・うた・習熟度）の 4 つ目に、
 * 今回の結果を置く。歌のある行は押すと歌と作者を開く（記録一覧と同じ暗転）。
 */
function RetryRows({ rows }: { rows: readonly (PoemOutcome & { poem: PoemRowData['poem'] })[] }) {
  const [open, setOpen] = useState<PoemRowData | null>(null);
  return <>
    <ul class="history-list result-next__list" data-result-rows>
      <li class="history-entry history-head" aria-hidden="true"><span>番号</span><span>うた</span><span class="history-head__meter">習熟度</span><span>今回</span></li>
      {rows.map((row) => {
        const firstKu = row.poem?.ku[0] ?? null;
        const name = firstKu === null ? `${row.cardNo}番` : `${row.cardNo}番「${firstKu}」`;
        const tag = KIND_TAGS[row.kind as Exclude<OutcomeKind, 'correct'>];
        const cells = <>
          <strong class="history-entry__no">{row.cardNo}</strong>
          <span class="history-entry__ku">{firstKu}</span>
          <MasteryMeter label={name} percent={row.untouched ? 0 : row.percent} color={row.untouched ? 'gray' : row.color} text={row.untouched ? '—' : `${row.percent}%`} meterLabel={row.untouched ? `${name}は未着手` : `${name}の習熟度`} />
          <span class={`result-next__tag result-next__tag--${row.kind}`}><span class="sr-only">今回 </span>{tag}</span>
        </>;
        const className = `history-entry${row.untouched ? ' history-entry--untouched' : ''}`;
        return row.poem
          ? <li key={row.poemId} class={`${className} history-entry--openable`}><button type="button" class="history-entry__open" aria-label={`${name}、今回は${tag}、を開く`} onClick={() => setOpen(row)}>{cells}</button></li>
          : <li key={row.poemId} class={className}>{cells}</li>;
      })}
    </ul>
    {open && <PoemOverlay row={open} onClose={() => setOpen(null)} />}
  </>;
}

function formatPercent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}

/**
 * 習熟度の変化を帯で見せる（依頼者・2026-10-01、比較モックの案1）。
 *
 * 帯は一覧の帯と同じ形・同じ 5 色（**後の値の色**）。前の分を淡く、増えた分を濃く塗る。
 * 減った分は赤の斜線で、失った幅として見せる。**数値も必ず添える**——▲＋9 と「12% → 21%」。
 * 色だけでは、色の見え方が違う人に増減が伝わらない。
 */
/**
 * 補足のバッジ（依頼者・2026-10-01）。**標題と説明は依頼者の文言そのまま。**
 * バッジは押せる。押すとその行の下に説明が開く（比較モックの案A）。
 */
const NOTES: Readonly<Record<MasteryNote, Readonly<{ badge: string; text: string }>>> = {
  'daily-cap': { badge: '当日上限', text: '本日の上限に達しました。この先は別の日に取り組むことで上げられます。' },
  author: { badge: '要作者', text: '作者を答える問題にも取り組みましょう。' },
};

/**
 * 増えた分・減った分を光らせる（依頼者・2026-10-01、比較モックの G1）。帯が伸び終わった後に一度だけ。
 * 印を付け直すので、詳細を開くたびに一度光る。動きを減らす設定では CSS が止める。
 */
function lightChanges(list: Element | null): void {
  if (!list) return;
  list.classList.remove('is-lit');
  void (list as HTMLElement).offsetWidth;
  list.classList.add('is-lit');
}

function ChangeRow({ change, index }: { change: MasteryChange; index: number }) {
  const [openNote, setOpenNote] = useState<MasteryNote | null>(null);
  const no = Number(change.poemId.slice(1));
  const delta = change.after - change.before;
  const rounded = Number(Math.abs(delta).toFixed(1));
  const direction = rounded === 0 ? 'same' : delta > 0 ? 'up' : 'down';
  const sign = direction === 'same' ? '±' : direction === 'up' ? '+' : '−';
  const mark = direction === 'same' ? '' : direction === 'up' ? '▲ ' : '▼ ';
  const low = clampPercent(Math.min(change.before, change.after));
  const high = clampPercent(Math.max(change.before, change.after));
  const words = direction === 'same' ? '変わらず' : `${rounded}${direction === 'up' ? '増えました' : '減りました'}`;
  const notes = change.notes ?? [];
  const noteId = (note: MasteryNote) => `${change.poemId}-${note}`;
  return <li class={`result-change mastery-meter--${masteryDisplay(change.after).color}`} style={{ '--i': index }}>
    <span class="result-change__summary sr-only">{`${no}番 ${formatPercent(change.before)}から${formatPercent(change.after)}、${words}`}</span>
    <span class="result-change__no" aria-hidden="true">{no}</span>
    <span class="result-change__bar" aria-hidden="true">
      <span class="result-change__before" data-list-bar style={{ width: `${low}%` }} />
      {direction !== 'same' && <span class={`result-change__${direction === 'up' ? 'gain' : 'loss'}`} data-list-bar style={{ left: `${low}%`, width: `${high - low}%` }} />}
    </span>
    <span class="result-change__nums" aria-hidden="true">
      <strong class={`result-change__delta result-change__delta--${direction}`}>{mark}{sign}{rounded}</strong>
      <small><span class="result-change__from">{formatPercent(change.before)}</span> → <span class="result-change__to">{formatPercent(change.after)}</span></small>
    </span>
    {notes.length > 0 && <span class="result-change__badges">{notes.map((note) => (
      <button key={note} type="button" class={`result-note-badge result-note-badge--${note}`} aria-expanded={openNote === note} aria-controls={noteId(note)} onClick={() => setOpenNote((current) => current === note ? null : note)}>
        {NOTES[note].badge}<span aria-hidden="true"> ›</span>
      </button>
    ))}</span>}
    {notes.map((note) => <p key={note} id={noteId(note)} class="result-change__note" hidden={openNote !== note}>{NOTES[note].text}</p>)}
  </li>;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}
