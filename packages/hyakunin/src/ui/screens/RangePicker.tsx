import type { EntryId } from '../../domain/entry.ts';
import { canChangeOrder, type OrderMode } from '../../domain/order.ts';
import { normalizeRange } from '../../domain/range.ts';
import { useState } from 'preact/hooks';

export type AnswerMode = 'screen' | 'paper';
type Props = { entry: EntryId; range: { from: number; to: number }; order: OrderMode; onStart: (range: { from: number; to: number }, order: OrderMode, answerMode: AnswerMode) => void; onBack: () => void };
const labels: Record<EntryId, string> = { quick: 'すぐに始める', view: '歌を確認する', learn: '練習する', review: 'もう一度確認する', exam: '本番のように解く' };

export function RangePicker({ entry, range, order, onStart, onBack }: Props) {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [selectedOrder, setSelectedOrder] = useState(order);
  const [answerMode, setAnswerMode] = useState<AnswerMode>('screen');
  const normalized = normalizeRange(from, to);
  return <main class="range-picker"><header class="nav-edge"><span class="wordmark">開始前の確認</span><button type="button" onClick={onBack}>戻る</button></header>
    <h1>{labels[entry]}</h1><p>{entry === 'exam' ? '歌番号と読みを隠し、画面入力か紙での自己採点を選べます。' : '読みを確認でき、1問ずつその場で答え合わせします。'}</p>
    <h2 class="range-confirm-title">範囲を確認する</h2><p class="range-summary" aria-live="polite">{normalized.from}番〜{normalized.to}番</p>
    <div class="range-fields"><label>最初の番<input type="number" min="1" max="100" value={from} onInput={(event) => setFrom(Number(event.currentTarget.value))} /></label><span aria-hidden="true">〜</span><label>最後の番<input type="number" min="1" max="100" value={to} onInput={(event) => setTo(Number(event.currentTarget.value))} /></label></div>
    <fieldset><legend>歌の順番</legend><label><input type="radio" name="order" checked={selectedOrder === 'number'} disabled={!canChangeOrder({ questionIndexInChunk: 0 })} onChange={() => setSelectedOrder('number')} /> 番号順</label><label><input type="radio" name="order" checked={selectedOrder === 'random'} disabled={!canChangeOrder({ questionIndexInChunk: 0 })} onChange={() => setSelectedOrder('random')} /> ランダム</label></fieldset>
    {entry === 'exam' && <section class="answer-mode" aria-labelledby="answer-mode-heading"><h2 id="answer-mode-heading">答え方</h2><div><button type="button" aria-pressed={answerMode === 'screen'} onClick={() => setAnswerMode('screen')}>画面で答える</button><button type="button" aria-pressed={answerMode === 'paper'} onClick={() => setAnswerMode('paper')}>紙に書く</button></div>{answerMode === 'paper' && <p>1問ずつ答えを開き、自分で採点します。</p>}</section>}
    <button class="primary" type="button" onClick={() => onStart(normalized, selectedOrder, answerMode)}>この範囲で始める</button>
  </main>;
}
