import type { Event } from '../event.ts';

export type PoemMastery = Readonly<{
  /** 素点。丸めない。呼び出し側が masteryDisplay() へ渡す。 */
  score: number;
  /** 裁定 2。その首のイベントが 1 件も無い。 */
  untouched: boolean;
  /**
   * 裁定 2。その首の作者イベントが 1 件も無い。
   * 作者問題にまだ答えていない首を、画面で区別する。
   */
  authorUnconfirmed: boolean;
}>;

/**
 * 本文と作者をともに学ぶので、配点は 80% / 20% である。
 * 出題画面と同じ変更で戻す。どちらかだけだと本文を満点にしても 80% 止まりになる。
 */
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
