import type { Event } from '../event.ts';

export type PoemMastery = Readonly<{
  /** 素点。丸めない。呼び出し側が masteryDisplay() へ渡す。 */
  score: number;
  /** 裁定 2。その首のイベントが 1 件も無い。 */
  untouched: boolean;
  /**
   * 裁定 2。その首の作者イベントが 1 件も無い。
   * 初回公開では作者を出題しないため常に true になる。画面には出さない（依頼者裁定・2026-09-05）。
   */
  authorUnconfirmed: boolean;
}>;

/**
 * 初回公開では作者問題を出題しない（依頼者裁定・2026-09-05）。
 * 出題されない項目に配点を残すと、作者の素点が上がりようがないぶん、
 * どの首も 80% 止まりで緑（85% 以上）へ到達できない。配点は本文だけで 100% とする。
 * 作者問題を出題へ戻すときは、この 2 値を 0.8 / 0.2 へ戻す。
 */
const TEXT_WEIGHT = 1;
const AUTHOR_WEIGHT = 0;

export function poemMastery(
  poemId: string,
  events: readonly Event[],
  scores: Readonly<Record<string, number>>,
): PoemMastery {
  const poemEvents = events.filter((event) => event.poemId === poemId);

  return {
    score: (scores[`${poemId}:text`] ?? 0) * TEXT_WEIGHT + (scores[`${poemId}:author`] ?? 0) * AUTHOR_WEIGHT,
    untouched: poemEvents.length === 0,
    authorUnconfirmed: !poemEvents.some((event) => event.itemKey === `${poemId}:author`),
  };
}
