import type { SessionResult } from '../../domain/result.ts';
import type { Poem } from '../../data/schema.ts';
import { PoemRows } from '../components/PoemRows.tsx';
import { PerfectMark } from '../components/FeedbackMark.tsx';
import { CatMascot } from '../components/CatMascot.tsx';

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
 * 発注075：**今回の結果 → 次の操作 → 学習記録の詳細** の順に置く。
 *
 * 対象範囲の歌一覧は範囲全体を並べるので、範囲1番〜100番なら今回8問でも100首が
 * 再練習ボタンの上に積まれていた。記録は削るのではなく、一段の `details` の中へ移す。
 * DOM 順と視覚順は一致させる（`order` で並べ替えない）。
 */
export function Result({ result, poems = [], onRetryWeak, onRetrySame, onHome }: Props) {
  const recommendedFirstKu = poems.find((poem) => poem.poemId === result.recommendation?.poemId)?.ku[0];
  // 歌を番号から引けるようにしておく。一覧の初句と、押したときの本文に使う。
  const poemOf = new Map(poems.map((poem) => [poem.poemId, poem]));
  return <main class="result-screen">
    <header class="nav-edge"><span class="wordmark">結果</span><button type="button" onClick={onHome}>ホームへ戻る</button></header>
    <section class="result-summary" aria-labelledby="result-heading">
      <h1 id="result-heading">今回の結果</h1>
      <p>対象範囲: {result.range.from}番〜{result.range.to}番</p>
      <p>問題数: {result.questionCount}問</p>
      {/* 得点規則は非開示（依頼者裁定・2026-09-09）。獲得点だけを出し、内訳も式も画面に書かない。 */}
      <p class="result-points"><span class="result-points__label">今回のポイント</span><strong class="result-points__value">+{result.points}</strong><CatMascot /></p>
      {result.allCorrect && <p class="result-hanamaru"><PerfectMark /></p>}
      <h2 id="breakdown-heading" class="result-subheading">内訳</h2>
      <dl class="result-breakdown" aria-labelledby="breakdown-heading">
        {/* 本番では 0 にしかならない。0 の行は読み手に何も伝えない（依頼者指示・2026-09-06）。 */}
        {/*
          **表記は「わからない」にする**（依頼者・2026-09-16）。保存する事象は閲覧（`viewed`）のままだが、
          学習者が押したのは「わからない！」であって、閲覧モードで眺めたのではない。
        */}
        {result.breakdown.viewed > 0 && <div><dt>わからない</dt><dd>{result.breakdown.viewed}問</dd></div>}
        <div><dt>正答</dt><dd>{result.breakdown.correct}問</dd></div>
        <div><dt>△ 仮名遣い確認</dt><dd>{result.breakdown.partial}問</dd></div>
        <div><dt>誤答</dt><dd>{result.breakdown.incorrect}問</dd></div>
      </dl>
    </section>
    <section class="result-actions practice-choices" aria-label="次の操作">
      {result.retryQuestionIds.length > 0 && <div class="practice-choice"><button type="button" onClick={() => onRetryWeak(result.retryQuestionIds)}>まちがえた歌だけをもう一度</button><p>答えを見た問題・正答にならなかった問題を、同じ出題内容で{result.retryQuestionIds.length}問くりかえし練習します。</p></div>}
      {/* 「同じ範囲をもう一度」は範囲から出題し直す操作で、同じ問題が出る保証はない。名前を変えない。 */}
      <div class="practice-choice"><button class="primary" type="button" onClick={onRetrySame}>同じ範囲をもう一度</button><p>同じ範囲でもう一度出題します。</p></div>
    </section>
    {result.recommendation && <section class="result-section result-recommend" aria-labelledby="recommend-heading"><h2 id="recommend-heading">次に確認する</h2><p>{Number(result.recommendation.poemId.slice(1))}番{recommendedFirstKu && <span class="result-recommend__ku">{recommendedFirstKu}…</span>}</p><p>{result.recommendation.reason}</p></section>}
    <details class="result-details">
      <summary>学習記録の詳細</summary>
      <p class="result-details__note">習熟度は、これまでの学習記録をもとにした目安です。今回の正答率ではありません。</p>
      <section class="result-section" aria-labelledby="changes-heading">
        <h2 id="changes-heading">習熟度の変化</h2>
        {result.changes.length === 0 ? <p>変化はありません</p> : <table><thead><tr><th scope="col">歌</th><th scope="col">前</th><th scope="col">後</th></tr></thead><tbody>{result.changes.map((change) => <tr key={change.poemId}><th scope="row">{Number(change.poemId.slice(1))}</th><td>{formatPercent(change.before)}</td><td>{formatPercent(change.after)}</td></tr>)}</tbody></table>}
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

function formatPercent(value: number): string {
  return `${Number(value.toFixed(1))}%`;
}
