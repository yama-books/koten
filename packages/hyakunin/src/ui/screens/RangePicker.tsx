import { ENTRY_LABELS, type EntryId } from "../../domain/entry.ts";
import { canChangeOrder, type OrderMode } from "../../domain/order.ts";
import { normalizeRange } from "../../domain/range.ts";
import { useState } from "preact/hooks";

export type AnswerMode = "screen" | "paper";
type Props = {
  entry: EntryId;
  range: { from: number; to: number };
  order: OrderMode;
  onStart: (
    range: { from: number; to: number },
    order: OrderMode,
    answerMode: AnswerMode,
    includeAuthors: boolean,
  ) => void;
  onBack: () => void;
};

export function RangePicker({ entry, range, order, onStart, onBack }: Props) {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [selectedOrder, setSelectedOrder] = useState(order);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("screen");
  const [includeAuthors, setIncludeAuthors] = useState(true);
  const [rangeOpen, setRangeOpen] = useState(false);
  const normalized = normalizeRange(from, to);
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
          <div>
            <button
              type="button"
              aria-pressed={answerMode === "screen"}
              onClick={() => setAnswerMode("screen")}
            >
              画面で答える
            </button>
            <button
              type="button"
              aria-pressed={answerMode === "paper"}
              onClick={() => setAnswerMode("paper")}
            >
              紙に書く
            </button>
          </div>
          <p>
            {answerMode === "paper"
              ? "範囲を解き終えたあとに、正答を見て自分で採点します。"
              : "範囲を解き終えたあとに、まとめて自動採点します。"}
          </p>
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
      <button
        class="primary"
        type="button"
        onClick={() => onStart(normalized, selectedOrder, answerMode, includeAuthors)}
      >
        この範囲で始める
      </button>
    </main>
  );
}
