import type { SessionResult } from '../../domain/result.ts';
import { MasteryMeter } from '@koten/shared/mastery-meter';
import { PerfectMark } from '../components/FeedbackMark.tsx';

type Props = {
  result: SessionResult;
  onRetryWeak: (questionIds: readonly string[]) => void;
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
      {result.allCorrect && <p class="result-hanamaru"><PerfectMark /></p>}
    </section>
    <section class="result-section" aria-labelledby="breakdown-heading">
      <h2 id="breakdown-heading">内訳</h2>
      <dl class="result-breakdown">
        <div><dt>閲覧</dt><dd>{result.breakdown.viewed}問</dd></div>
        <div><dt>正答</dt><dd>{result.breakdown.correct}問</dd></div>
        <div><dt>△ 仮名遣い確認</dt><dd>{result.breakdown.partial}問</dd></div>
        <div><dt>誤答</dt><dd>{result.breakdown.incorrect}問</dd></div>
      </dl>
    </section>
    <section class="result-section" aria-labelledby="changes-heading">
      <h2 id="changes-heading">習熟度の変化</h2>
      {result.changes.length === 0 ? <p>変化はありません</p> : <table><thead><tr><th scope="col">歌</th><th scope="col">前</th><th scope="col">後</th></tr></thead><tbody>{result.changes.map((change) => <tr key={change.poemId}><th scope="row">{Number(change.poemId.slice(1))}</th><td>{formatPercent(change.before)}</td><td>{formatPercent(change.after)}</td></tr>)}</tbody></table>}
    </section>
    {result.recommendation && <section class="result-section" aria-labelledby="recommend-heading"><h2 id="recommend-heading">次に確認する</h2><p>{Number(result.recommendation.poemId.slice(1))}（習熟度 {result.recommendation.percent}%）</p><p>{result.recommendation.reason}</p></section>}
    <section class="result-section" aria-labelledby="poems-heading">
      <h2 id="poems-heading">歌ごとの状態</h2>
      <ul class="result-poems">{result.poems.map((poem) => <li key={poem.poemId} class={`result-poem result-poem--${poem.color}`}><strong>{poem.cardNo}番</strong>{poem.untouched ? <span>未着手</span> : <MasteryMeter label={`${poem.cardNo}番`} percent={poem.percent} color={poem.color} />}</li>)}</ul>
    </section>
    <section class="result-actions" aria-label="次の操作">
      {result.retryQuestionIds.length > 0 && <><button type="button" onClick={() => onRetryWeak(result.retryQuestionIds)}>まちがえた歌だけをもう一度</button><p>まちがえた箇所を確認します。</p></>}
      <button class="primary" type="button" onClick={onRetrySame}>同じ範囲をもう一度</button>
    </section>
  </main>;
}

function formatPercent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}
