import type { EventMethod } from '../event.ts';
import { MASTERY_RULES } from './rules.v1.ts';

/**
 * 難度の段（D-12・2026-09-15 依頼者裁定）。
 *
 * > **段内は無段階、段の移行は「制覇」で離散。**
 * > その歌について、その段の問題を全部正解したら、次の段の天井が開く。
 *
 * **これが「網羅と難度のどちらが寄与するか」という問いを消す。** 段は順序づいているので
 * `一句×5問正解 = 段3制覇` と `上下句×2問正解 = 段4制覇` を比べる必要がない。
 * **網羅そのものが昇段条件**である。
 *
 * **段をイベントへ持たせない。** 保存の形を変えると `MASTERY_RULES_VERSION` を上げたくなり、
 * 上げると `computeMastery` が過去のイベントを全部捨てて**全員の習熟度が 0 に戻る**
 * （`compute.ts` の絞り込み）。段は問題目録から引く。
 */
export const LOWEST_RUNG = 1;
/** 点を動かさない段。制覇すると「完全制覇」の印が立つ（依頼者裁定——`clamp` を触らない）。 */
export const FLAG_RUNG = 8;

/**
 * 段ごとの天井。刻みは 25/15/15/15/10/10/10——**前を広く、上を細かく。**
 * 最初の 25 は 3 回の正解で届く。実測で生徒の最高習熟度は中央値 21・最大 79 であり、
 * **従来の最初の到達点（90）には誰も届いていなかった。**
 */
export const RUNG_CAPS: Readonly<Record<number, number>> = { 1: 25, 2: 40, 3: 55, 4: 70, 5: 80, 6: 90, 7: 100 };

/**
 * 実効の天井。**方式の天井と段の天井の低いほう。**
 * 易しい方式で段の天井を稼ぐ抜け道を塞ぐ——選択式で一首まるまるを「当てた」人を 100 にしない。
 */
export function capFor(method: EventMethod, rung: number): number {
  // 段8 は点を動かさない。印を立てるだけである。
  return Math.min(MASTERY_RULES[method].cap, RUNG_CAPS[rung] ?? 0);
}

export type RungCatalogueEntry = Readonly<{ questionId: string; poemId: string; rung: number | null }>;
/**
 * 記録 1 件。`raised` は**手で難度を上げて挑んだ印**（発注086・D-17）。
 *
 * **省略可である。** 2026-09-15 より前の記録はこの印を持たない＝自動で配られたものである。
 * 必須にすると古いイベントを弾き、**授業中の生徒の履歴が消える。**
 */
export type RungOutcome = Readonly<{ questionId: string; outcome: string; raised?: boolean }>;
export type RungState = Readonly<{ cleared: number[]; openRung: number; conquered: boolean }>;

/**
 * 歌ごとに、どの段まで制覇したかを出す。
 *
 * **制覇＝その段の全問を、それぞれ一度は正解している**（依頼者裁定）。
 * 間違えても後で正解すればよく、日をまたいでよい。厳しくすると段2 は最大 7 問なので
 * 事実上進めなくなる。
 *
 * **段は飛ばせない。** 下が残っていれば上は開かない——`一句がまだなのに一首まるまる`を
 * 出しても学習にならない。
 *
 * **その歌に問題が無い段は通り抜ける。** 空の条件は常に成立するので、
 * そうなっていることを試験で名指しして確かめる（実装ゼロで緑になる形を残さない）。
 */
export function rungProgress(
  outcomes: readonly RungOutcome[],
  catalogue: readonly RungCatalogueEntry[],
): Map<string, RungState> {
  const correct = outcomes.filter((item) => item.outcome === 'correct');
  const answered = new Set(correct.map((item) => item.questionId));
  /*
   * **自動で配られた段の正解だけ**（発注086）。手で上げて挑んだ正解をここへ入れると、
   * **一度試しただけの段が次回からの定位置になり、段を飛ばせてしまう。**
   * 同じ問題を自動でも解いていれば、そちらが数えられる。
   */
  const answeredAuto = new Set(correct.filter((item) => item.raised !== true).map((item) => item.questionId));
  const byPoem = new Map<string, Map<number, string[]>>();
  for (const entry of catalogue) {
    if (entry.rung === null) continue; // 作者問は本文の段を進めない。別の梯子を持つ。
    const rungs = byPoem.get(entry.poemId) ?? new Map<number, string[]>();
    rungs.set(entry.rung, [...(rungs.get(entry.rung) ?? []), entry.questionId]);
    byPoem.set(entry.poemId, rungs);
  }

  // **正解したことのある一番上の段。** 下の段を足しても、ここより下へ引き戻さない。
  const highestAnswered = new Map<string, number>();
  for (const entry of catalogue) {
    if (entry.rung === null || !answeredAuto.has(entry.questionId)) continue;
    highestAnswered.set(entry.poemId, Math.max(highestAnswered.get(entry.poemId) ?? LOWEST_RUNG, entry.rung));
  }

  const progress = new Map<string, RungState>();
  for (const [poemId, rungs] of byPoem) {
    const cleared = new Set<number>();
    let openRung = LOWEST_RUNG;
    let reachedFlag = false;
    for (let rung = LOWEST_RUNG; rung <= FLAG_RUNG; rung += 1) {
      const questions = rungs.get(rung) ?? [];
      // 問題が 1 つも無い段は通り抜ける。止めると、その歌だけ梯子が途切れる。
      if (!questions.every((questionId) => answered.has(questionId))) break;
      cleared.add(rung);
      reachedFlag = rung === FLAG_RUNG;
      openRung = Math.min(rung + 1, FLAG_RUNG);
    }
    /*
     * **飛ばして挑んだ段の制覇も数える**（発注086・§4.1）。正解は正解であり、捨てない。
     * 下を埋めた瞬間に、上のループがここまで一気に通る——**早めの挑戦が報われる。**
     *
     * **問題の無い段はここでは数えない。** 空の条件は常に成立するので、数えると
     * 段4 以上を持たない歌が、下を埋めないまま「段8 まで制覇」になる。
     */
    for (let rung = openRung; rung <= FLAG_RUNG; rung += 1) {
      const questions = rungs.get(rung) ?? [];
      if (questions.length > 0 && questions.every((questionId) => answered.has(questionId))) cleared.add(rung);
    }
    /*
     * **いる場所より下へ引き戻さない**（工程3・2026-09-15）。
     * 段1・2 を足すと、段3 を解いている最中の生徒が段1 へ戻される。
     * **上の段を解けた人は、下の段もできる。** 授業の途中で「下げられた」と感じさせない。
     *
     * **制覇の記録は作らない。**「解けた」と「制覇した」は別である——
     * 飛ばした段を制覇済みに数えると、あとで数えた本数が合わなくなる。
     */
    openRung = Math.max(openRung, highestAnswered.get(poemId) ?? LOWEST_RUNG);
    /*
     * **完全制覇は梯子を下から埋めた印である**（発注086）。飛ばして段8 だけ当てても立てない
     * ——`cleared` には数えるが、下が残っている間は印にしない。
     */
    progress.set(poemId, { cleared: [...cleared].sort((left, right) => left - right), openRung, conquered: reachedFlag });
  }
  return progress;
}
