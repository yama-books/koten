import type { Event } from '@koten/shared/domain/event';
import { chunkProgress, nextChunkIndex, splitIntoChunks, type CardRange } from './range.ts';

/** 裁定 1（D-51）。確認済み＝その首のイベントが 1 件以上ある。 */
export function confirmedCardNumbers(events: readonly Event[]): Set<number> {
  return new Set(events.flatMap((event) => {
    if (event.product !== 'hyakunin' || !/^p\d{3}$/.test(event.poemId)) return [];
    return [Number(event.poemId.slice(1))];
  }));
}

export type ResumePlan = Readonly<{
  /** 裁定 3。nextChunkIndex の戻り値をそのまま入れる。 */
  chunkIndex: number;
  chunkCount: number;
  /** 裁定 2。planQuestions へ渡す首番号。空配列にしてはならない。 */
  cardNumbers: readonly number[];
  /** 裁定 4。範囲全体の未確認数。「あと○首」。 */
  remainingInRange: number;
  /** そのまとまりが全首確認済みだったか。呼び出し側の文言に使う。 */
  chunkFullyConfirmed: boolean;
}>;

/** 中断した学習の再開で、次に出す首を台帳から決める。保存された集合は使わない。 */
export function planResume(
  range: Pick<CardRange, 'from' | 'to'>,
  events: readonly Event[],
): ResumePlan {
  const confirmed = confirmedCardNumbers(events);
  const chunkIndex = nextChunkIndex(range, confirmed);
  const chunk = splitIntoChunks(range)[chunkIndex];
  const unconfirmed = chunk.filter((cardNo) => !confirmed.has(cardNo));
  const progress = chunkProgress(range, chunkIndex, confirmed);

  return {
    chunkIndex,
    chunkCount: progress.chunkCount,
    cardNumbers: unconfirmed.length > 0 ? unconfirmed : chunk,
    remainingInRange: progress.remainingInRange,
    chunkFullyConfirmed: unconfirmed.length === 0,
  };
}
