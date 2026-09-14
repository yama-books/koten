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
export const LOWEST_RUNG = 3;
/** 点を動かさない段。制覇すると「完全制覇」の印が立つ（依頼者裁定——`clamp` を触らない）。 */
export const FLAG_RUNG = 8;

/**
 * 段ごとの天井。刻みは 25/15/15/15/10/10/10——**前を広く、上を細かく。**
 * 段1（漢字だけ・25）と段2（句未満・40）は台帳の区切りが要るので未着手（工程3）。
 */
export const RUNG_CAPS: Readonly<Record<number, number>> = { 3: 55, 4: 70, 5: 80, 6: 90, 7: 100 };

/**
 * 実効の天井。**方式の天井と段の天井の低いほう。**
 * 易しい方式で段の天井を稼ぐ抜け道を塞ぐ——選択式で一首まるまるを「当てた」人を 100 にしない。
 */
export function capFor(method: EventMethod, rung: number): number {
  // 段8 は点を動かさない。印を立てるだけである。
  return Math.min(MASTERY_RULES[method].cap, RUNG_CAPS[rung] ?? 0);
}

export type RungCatalogueEntry = Readonly<{ questionId: string; poemId: string; rung: number | null }>;
export type RungOutcome = Readonly<{ questionId: string; outcome: string }>;
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
  const answered = new Set(outcomes.filter((item) => item.outcome === 'correct').map((item) => item.questionId));
  const byPoem = new Map<string, Map<number, string[]>>();
  for (const entry of catalogue) {
    if (entry.rung === null) continue; // 作者問は本文の段を進めない。別の梯子を持つ。
    const rungs = byPoem.get(entry.poemId) ?? new Map<number, string[]>();
    rungs.set(entry.rung, [...(rungs.get(entry.rung) ?? []), entry.questionId]);
    byPoem.set(entry.poemId, rungs);
  }

  const progress = new Map<string, RungState>();
  for (const [poemId, rungs] of byPoem) {
    const cleared: number[] = [];
    let openRung = LOWEST_RUNG;
    for (let rung = LOWEST_RUNG; rung <= FLAG_RUNG; rung += 1) {
      const questions = rungs.get(rung) ?? [];
      // 問題が 1 つも無い段は通り抜ける。止めると、その歌だけ梯子が途切れる。
      if (!questions.every((questionId) => answered.has(questionId))) break;
      cleared.push(rung);
      openRung = Math.min(rung + 1, FLAG_RUNG);
    }
    progress.set(poemId, { cleared, openRung, conquered: cleared.includes(FLAG_RUNG) });
  }
  return progress;
}
