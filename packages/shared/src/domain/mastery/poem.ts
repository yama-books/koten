import type { Event } from '../event.ts';

export type PoemMastery = Readonly<{
  /** 素点。丸めない。呼び出し側が masteryDisplay() へ渡す。 */
  score: number;
  /** 裁定 2。その首のイベントが 1 件も無い。 */
  untouched: boolean;
  /** 裁定 2。その首の作者イベントが 1 件も無い。 */
  authorUnconfirmed: boolean;
}>;

// 20pt は §8.1 の閲覧・自己評価×の上限として既にある定数である。
const TEXT_WEIGHT = 0.8;
const AUTHOR_WEIGHT = 0.2;

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
