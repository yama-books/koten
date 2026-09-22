import { useEffect, useState } from 'preact/hooks';
import { MasteryMeter } from '@koten/shared/mastery-meter';
import type { MasteryColor } from '@koten/shared/domain/mastery/color';
import { authorStage, type AuthorStage, type HistoryPoem } from '../../domain/history.ts';

/**
 * 一覧の 1 行が要るもの。**記録一覧と結果画面が同じ形を共有する**——
 * 揃え方と段階の出し方を二度書くと、片方だけ直る。
 */
export type PoemRowData = Readonly<{
  poemId: string;
  cardNo: number;
  percent: number;
  color: MasteryColor;
  untouched: boolean;
  authorUnconfirmed: boolean;
  authorPercent: number | null;
  poem: HistoryPoem | null;
  conquered?: boolean;
}>;

/** 作者の段階の見た目。**記号と言葉は 1 か所に置く**——画面ごとに 食い違わせない。 */
const AUTHOR_MARKS = { none: '未', low: '△', mid: '○', full: '◎' } as const;
const AUTHOR_WORDS = { none: 'まだ確認していません', low: 'もう少し', mid: 'よくできています', full: '覚えました' } as const;

function AuthorStageMark({ stage, next }: { stage: AuthorStage; next?: boolean }) {
  // `next` は「本文は満点で、残るのは作者だけ」の首。**次にやることとして強調する。**
  const words = next ? '作者も確認しましょう' : `作者: ${AUTHOR_WORDS[stage]}`;
  // 凡例の行は畳んだ（依頼者・2026-09-22）。**意味は印そのものが持つ**——
  // 読み上げ名と `title`（長押し・ホバー）から読める。
  return <span class={`author-stage author-stage--${stage}${next ? ' author-stage--next' : ''}`} role="img" aria-label={words} title={words}>{AUTHOR_MARKS[stage]}</span>;
}

/** 升の見出し。**意味は各行の読み上げ名が持つ**ので、ここは目で見るためだけに置く。 */
export function PoemRowHead() {
  return <li class="history-entry history-head" aria-hidden="true">
    <span>番号</span><span>うた</span><span class="history-head__meter">習熟度</span><span>作者</span>
  </li>;
}

export function PoemRow({ row, onOpen }: { row: PoemRowData; onOpen?: (row: PoemRowData) => void }) {
  // 作者の記録が無く 80% なら、本文は満点で作者分だけが残っている。
  const authorCapReached = row.authorUnconfirmed && row.percent === 80;
  const firstKu = row.poem?.ku[0] ?? null;
  // 初句は番号のすぐ後ろに置く。**メーターの読み上げ名にも入れる**——
  // 画面を見ない利用者にも「何番の何の歌か」が同じ手がかりで届く。
  const name = firstKu === null ? `${row.cardNo}番` : `${row.cardNo}番「${firstKu}」`;
  // 歌が無ければ開いても見せるものが無い。**押せる見た目にもしない。**
  const openable = onOpen !== undefined && row.poem !== null;
  const cells = <>
    {/* 「番」は見出しが持つ。**その2文字分が帯の長さに回る。** */}
    <strong class="history-entry__no">{row.cardNo}</strong>
    {/*
      画面では鉤括弧を出さない（依頼者・2026-09-21）。**2文字分の幅が 1 行に収まるかを分ける**——
      5文字の初句（「あしびきの」など）は鉤括弧ごとだと 390px で折り返す。
      **読み上げ名には残す**——音だけでは歌の切れ目が分からない。
    */}
    <span class="history-entry__ku">{firstKu}</span>
    {/*
      **未着手も帯で示す**（依頼者・2026-09-21）。「未着手」の文字は横幅を食い、
      1 行に収まらなくなる。0% と見分けがつかなくならないよう、**数字の代わりに「—」**を出し、
      溝を破線にする。読み上げ名では「未着手」と言い切る。
    */}
    <MasteryMeter
      label={name}
      percent={row.untouched ? 0 : row.percent}
      color={row.untouched ? 'gray' : row.color}
      text={row.untouched ? '—' : `${row.percent}%`}
      meterLabel={row.untouched ? `${name}は未着手` : `${name}の習熟度`}
    />
    <AuthorStageMark stage={authorStage(row.authorPercent)} next={authorCapReached} />
  </>;
  const className = `history-entry${authorCapReached ? ' history-entry--author-cap' : ''}${row.untouched ? ' history-entry--untouched' : ''}`;
  // **押せる行はボタンにする。** `li` に onClick を付けるとキーボードから届かない。
  return openable
    ? <li class={`${className} history-entry--openable`}><button type="button" class="history-entry__open" aria-label={`${name} を開く`} onClick={() => onOpen!(row)}>{cells}</button></li>
    : <li class={className}>{cells}</li>;
}

/**
 * 押した歌を暗転の上に見せる（依頼者・2026-09-22）。
 * 見た目は「歌を確認する」と同じ `poem-sheet` を借りる——**同じものを二度作らない。**
 * 閉じ方を 3 つ用意する（閉じる・背景・Esc）。暗転だけ出して戻れない面を作らない。
 */
export function PoemOverlay({ row, onClose }: { row: PoemRowData; onClose: () => void }) {
  const poem = row.poem!;
  const ku = poem.ku;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div class="poem-overlay" role="dialog" aria-modal="true" aria-labelledby="poem-overlay-title" onClick={onClose}>
      {/* 中身を押しても閉じない。閉じたいのは「外を押したとき」である。 */}
      <article class="poem-overlay__sheet poem-sheet poem-sheet--vertical" onClick={(event) => event.stopPropagation()}>
        <h2 id="poem-overlay-title" class="poem-overlay__no">{row.cardNo}番</h2>
        <div class="poem" lang="ja">
          <div class="poem__half" aria-label={`上の句 ${ku.slice(0, 3).join(' ')}`}>{ku.slice(0, 3).map((line) => <span key={line}>{line}</span>)}</div>
          <div class="poem__half" aria-label={`下の句 ${ku.slice(3).join(' ')}`}>{ku.slice(3).map((line) => <span key={line}>{line}</span>)}</div>
        </div>
        {poem.author && <div class="author"><strong>{poem.author.canonical}</strong></div>}
        <button class="poem-overlay__close" type="button" onClick={onClose}>閉じる</button>
      </article>
    </div>
  );
}

/**
 * 見出しつきの一覧と、押したときの暗転をまとめて持つ。
 * **記録一覧と結果画面はこれを呼ぶだけにする。**
 */
export function PoemRows({ rows }: { rows: readonly PoemRowData[] }) {
  const [open, setOpen] = useState<PoemRowData | null>(null);
  return <>
    <ul class="history-list"><PoemRowHead />{rows.map((row) => <PoemRow key={row.poemId} row={row} onOpen={setOpen} />)}</ul>
    {open && <PoemOverlay row={open} onClose={() => setOpen(null)} />}
  </>;
}
