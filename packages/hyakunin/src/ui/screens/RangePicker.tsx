import { ENTRY_LABELS, ENTRY_RULES, canEase, canHarden, effectiveRung, type EntryId, type RungAdjust } from "../../domain/entry.ts";
import { FLAG_RUNG } from "@koten/shared/domain/mastery/rungs";
import { canChangeOrder, type OrderMode } from "../../domain/order.ts";
import { normalizeRange } from "../../domain/range.ts";
import { useState } from "preact/hooks";

export type AnswerMode = "screen" | "paper";
type Props = {
  entry: EntryId;
  range: { from: number; to: number };
  order: OrderMode;
  /**
   * その範囲の自動の位置（発注086）。**読み込みが済むまで渡さない**——
   * 既定値で描くと、記録を読む前に「いまは段3」と言ってしまい、それが嘘になる。
   */
  autoRung?: number;
  onStart: (
    range: { from: number; to: number },
    order: OrderMode,
    answerMode: AnswerMode,
    includeAuthors: boolean,
    rungAdjust: RungAdjust,
  ) => void;
  onBack: () => void;
};

export function RangePicker({ entry, range, order, autoRung, onStart, onBack }: Props) {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [selectedOrder, setSelectedOrder] = useState(order);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("screen");
  const [includeAuthors, setIncludeAuthors] = useState(true);
  const [rangeOpen, setRangeOpen] = useState(false);
  /**
   * **その回かぎりの難度の調整**（発注086・§4.2）。**保存しない。**
   * この画面を離れれば消え、次に始めるときは自動の位置に戻る。
   * 下げたままにすると、天井に達した段を延々と練習することになる（加算が 0 のまま）。
   */
  const [rungAdjust, setRungAdjust] = useState<RungAdjust>(0);
  const normalized = normalizeRange(from, to);
  const served = autoRung === undefined ? undefined : effectiveRung(autoRung, rungAdjust);
  /*
   * **作者の入口は本文の段を使わない**（依頼者・2026-09-15）。作者は選択式と自由入力の
   * 2 通りしかないので、向きが決まればそれ以上は動かない。本文の段で決めると、
   * **一番下の段に居る学習者が作者をやさしくできない**——段と関係が無いのに。
   */
  const authorOnly = entry === "author";
  const mayEase = authorOnly ? rungAdjust <= 0 : autoRung !== undefined && canEase(autoRung, rungAdjust);
  const mayHarden = authorOnly ? rungAdjust >= 0 : autoRung !== undefined && canHarden(autoRung, rungAdjust);
  return (
    <main class="range-picker">
      <header class="nav-edge">
        <span class="wordmark">開始前の確認</span>
        <button type="button" onClick={onBack}>
          戻る
        </button>
      </header>
      <h1>{ENTRY_LABELS[entry]}</h1>
      <p>{entry === "exam" ? "試験のように解いて採点" : "一問一答で確認"}</p>
      {/* 問数は設定面の冒頭に置く。「答え方」の見出しの下だと、真下のボタンの説明に見える（発注074 工程5・㉞）。 */}
      {entry === "exam" && <p class="exam-question-count">この範囲では {ENTRY_RULES.exam.questionCount}問 出題します。</p>}
      <h2 class="range-confirm-title">範囲を確認する</h2>
      <p class="range-summary" aria-live="polite">
        {normalized.from}番〜{normalized.to}番
      </p>
      <button type="button" onClick={() => setRangeOpen((open) => !open)}>{rangeOpen ? "変更を閉じる" : "変更する"}</button>
      {rangeOpen && <div class="range-fields">
        <label>
          <input
            aria-label="最初の番"
            type="number"
            min="1"
            max="100"
            value={from}
            onInput={(event) => setFrom(Number(event.currentTarget.value))}
          />
          <span aria-hidden="true">番</span>
        </label>
        <span aria-hidden="true">〜</span>
        <label>
          <input
            aria-label="最後の番"
            type="number"
            min="1"
            max="100"
            value={to}
            onInput={(event) => setTo(Number(event.currentTarget.value))}
          />
          <span aria-hidden="true">番</span>
        </label>
      </div>}
      <section class="answer-mode" aria-labelledby="order-heading">
        <h2 id="order-heading">歌の順番</h2><div>
          <button type="button" aria-pressed={selectedOrder === "number"} disabled={!canChangeOrder({ questionIndexInChunk: 0 })} onClick={() => setSelectedOrder("number")}>番号順</button>
          <button type="button" aria-pressed={selectedOrder === "random"} disabled={!canChangeOrder({ questionIndexInChunk: 0 })} onClick={() => setSelectedOrder("random")}>ランダム</button>
        </div>
      </section>
      {entry === "exam" && (
        <section class="answer-mode" aria-labelledby="answer-mode-heading">
          <h2 id="answer-mode-heading">答え方</h2>
          <div class="answer-mode__choices">
            <div class="practice-choice">
            <button
              type="button"
              aria-pressed={answerMode === "screen"}
              onClick={() => setAnswerMode("screen")}
            >
              画面で答える
            </button>
            {answerMode === "screen" && <p>範囲を解き終えたあとに、まとめて自動採点します。</p>}
            </div>
            <div class="practice-choice">
            <button
              type="button"
              aria-pressed={answerMode === "paper"}
              onClick={() => setAnswerMode("paper")}
            >
              紙に書く
            </button>
            {answerMode === "paper" && <p>範囲を解き終えたあとに、正答を見て自己採点します。</p>}
            </div>
          </div>
        </section>
      )}
      {entry === "exam" && (
        <section class="answer-mode" aria-labelledby="author-mode-heading">
          <h2 id="author-mode-heading">作者問題</h2><div>
            <button type="button" aria-pressed={includeAuthors} onClick={() => setIncludeAuthors(true)}>あり</button>
            <button type="button" aria-pressed={!includeAuthors} onClick={() => setIncludeAuthors(false)}>なし</button>
          </div>
        </section>
      )}
      {autoRung !== undefined && served !== undefined && (
        <section class="rung-adjust" aria-labelledby="rung-heading">
          {/*
            **段の番号も名前も出さない**（依頼者・2026-09-15）。
            段は歌ごとに決まるので、範囲に対して 1 つの段を名乗ると実際の出題と食い違う。
            **習熟度と二重の指標**になって、どちらを見ればよいのか分からなくなる。
            出せるのは「いまどちら向きに動かしたか」だけである。
          */}
          {/*
            **何段動かしたかを符号つきで出す**（依頼者・2026-09-16）。2 回目以降も押せるので、
            これが無いとどれだけ動かしたのか分からない。
            **出すのは相対の数だけ**である——段の番号や名前は歌ごとに違うので名乗れない。
            **符号は学習者から見た向き**にする。`rungAdjust` は ＋が易しい側なので、ここで反転する。
          */}
          <h2 id="rung-heading">難しさ{rungAdjust !== 0 && <span class="rung-shift">{rungAdjust > 0 ? '−' : '+'}{Math.abs(rungAdjust)}</span>}</h2>
          <p class="rung-note">習熟度が上がると、より難度の高い問題を選べるようになります。</p>
          {/* **離れていることが分かる表示**。戻す手がかりが無いと迷子になる（§4.5）。 */}
          {rungAdjust !== 0 && (
            <p class="rung-away">
              いつもより{rungAdjust > 0 ? "やさしく" : "むずかしく"}します。「おまかせ」で戻ります。
              この回だけの調整で、次に始めるときは元に戻ります。
            </p>
          )}
          {/* いちばん難しい段だけは点ではなく「完全制覇」の印である。下げている間は印が立たない。 */}
          {autoRung === FLAG_RUNG && served < FLAG_RUNG && (
            <p class="rung-flag-note">やさしくしている間は、完全制覇の印は立ちません。「おまかせ」で戻ります。</p>
          )}
          <div>
            <button type="button" disabled={!mayEase} onClick={() => setRungAdjust((value) => value + 1)}>やさしくする</button>
            <button type="button" disabled={!mayHarden} onClick={() => setRungAdjust((value) => value - 1)}>むずかしくする</button>
            {/* 自動へ戻す 1 手。無いと、どこまで戻せば元なのか分からなくなる（依頼者）。 */}
            <button type="button" disabled={rungAdjust === 0} onClick={() => setRungAdjust(0)}>おまかせ</button>
          </div>
        </section>
      )}
      <button
        class="primary"
        type="button"
        onClick={() => onStart(normalized, selectedOrder, answerMode, includeAuthors, rungAdjust)}
      >
        この範囲で始める
      </button>
    </main>
  );
}
