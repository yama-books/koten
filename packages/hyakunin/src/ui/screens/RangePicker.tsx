import type { EntryId } from '../../domain/entry.ts';
import { canChangeOrder, type OrderMode } from '../../domain/order.ts';
import { normalizeRange } from '../../domain/range.ts';

type Props = { entry: EntryId; range: { from: number; to: number }; order: OrderMode; onStart: (range: { from: number; to: number }, order: OrderMode) => void; onBack: () => void };
const labels: Record<EntryId, string> = { quick: 'とりあえず始める', view: '見るだけ', learn: 'おぼえる', review: '全体確認', exam: '試験前の確認' };

export function RangePicker({ entry, range, order, onStart, onBack }: Props) {
  let from = range.from; let to = range.to; let selectedOrder = order;
  return <main class="range-picker"><header class="nav-edge"><span class="wordmark">開始前の確認</span><button type="button" onClick={onBack}>戻る</button></header>
    <h1>{labels[entry]}</h1><p>範囲と順序を確認してから始めます。</p>
    <div class="range-fields"><label>最初の番<input type="number" min="1" max="100" value={from} onInput={(event) => { from = Number(event.currentTarget.value); }} /></label><span aria-hidden="true">〜</span><label>最後の番<input type="number" min="1" max="100" value={to} onInput={(event) => { to = Number(event.currentTarget.value); }} /></label></div>
    <fieldset><legend>順序</legend><label><input type="radio" name="order" checked={selectedOrder === 'number'} disabled={!canChangeOrder({ questionIndexInChunk: 0 })} onChange={() => { selectedOrder = 'number'; }} /> 番号順</label><label><input type="radio" name="order" checked={selectedOrder === 'random'} disabled={!canChangeOrder({ questionIndexInChunk: 0 })} onChange={() => { selectedOrder = 'random'; }} /> ランダム</label></fieldset>
    <button class="primary" type="button" onClick={() => onStart(normalizeRange(from, to), selectedOrder)}>この範囲で始める</button>
  </main>;
}
