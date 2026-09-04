import type { SessionResult } from '../../domain/result.ts';
import { MasteryMeter } from '@koten/shared/mastery-meter';

type Props = {
  result: SessionResult;
  onRetryWeak: (cardNumbers: readonly number[]) => void;
  onRetrySame: () => void;
  onHome: () => void;
};

export function Result({ result, onRetryWeak, onRetrySame, onHome }: Props) {
  return <main class="result-screen">
    <header class="nav-edge"><span class="wordmark">結果</span><button type="button" onClick={onHome}>ホームへ戻る</button></header>
    <section class="result-summary">
      <h1>今回の結果</h1>
      <p>対象範囲: {result.range.from}番〜{result.range.to}番</p>
      <p>問題数: {result.questionCount}問</p>
      {result.allCorrect && <p class="result-hanamaru">全問花丸</p>}
    </section>
    <section class="result-section" aria-labelledby="breakdown-heading">
      <h2 id="breakdown-heading">内訳</h2>
      <dl class="result-breakdown">
        <div><dt>閲覧</dt><dd>{result.breakdown.viewed}問</dd></div>
        <div><dt>正答</dt><dd>{result.breakdown.correct}問</dd></div>
        <div><dt>部分正解</dt><dd>{result.breakdown.partial}問</dd></div>
        <div><dt>要確認</dt><dd>{result.breakdown.needsReview}問</dd></div>
        <div><dt>誤答</dt><dd>{result.breakdown.incorrect}問</dd></div>
      </dl>
    </section>
    <section class="result-section" aria-labelledby="changes-heading">
      <h2 id="changes-heading">習熟度の変化</h2>
      {result.changes.length === 0 ? <p>変化はありません</p> : <table><thead><tr><th scope="col">首</th><th scope="col">前</th><th scope="col">後</th></tr></thead><tbody>{result.changes.map((change) => <tr key={change.poemId}><th scope="row">{change.poemId}</th><td>{change.before}%</td><td>{change.after}%</td></tr>)}</tbody></table>}
    </section>
    {result.recommendation && <section class="result-section" aria-labelledby="recommend-heading"><h2 id="recommend-heading">次に確認する</h2><p>{result.recommendation.poemId}（習熟度 {result.recommendation.percent}%）</p><p>{result.recommendation.reason}</p></section>}
    <section class="result-section" aria-labelledby="poems-heading">
      <h2 id="poems-heading">首ごとの状態</h2>
      <ul class="result-poems">{result.poems.map((poem) => <li key={poem.poemId} class={`result-poem result-poem--${poem.color}`}><strong>{poem.cardNo}番</strong>{poem.untouched ? <span>未着手</span> : <MasteryMeter label={`${poem.cardNo}番`} percent={poem.percent} color={poem.color} />}{poem.authorUnconfirmed && <span>作者 未確認</span>}</li>)}</ul>
    </section>
    <section class="result-actions" aria-label="次の操作">
      {result.retryCardNumbers.length > 0 && <button type="button" onClick={() => onRetryWeak(result.retryCardNumbers)}>まちがえた歌だけをもう一度</button>}
      <button class="primary" type="button" onClick={onRetrySame}>同じ範囲をもう一度</button>
    </section>
  </main>;
}
