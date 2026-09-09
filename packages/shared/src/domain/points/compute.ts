import type { Event } from '../event.ts';
import { computeMastery } from '../mastery/compute.ts';
import {
  ATTEMPT_POINTS,
  EARNED_POINTS,
  MAX_WEAKNESS_MULTIPLIER,
  REPEAT_FACTOR,
} from './rules.v1.ts';

export { ATTEMPT_POINTS, EARNED_POINTS };

export type PointsComputation = Readonly<{
  /** 全履歴の累計。青天井。 */
  total: number;
  /** セッションごとの獲得点。結果画面の「今回のポイント」がこれを読む。 */
  bySession: Readonly<Record<string, number>>;
}>;

/**
 * 履歴からポイントを積算する。保存形式は増やさない——習熟度と同じく、毎回導出する。
 *
 * 習熟度の走査に相乗りするのは、**倍率がイベント当時の習熟度に依るため**である。
 * あとから計算し直すと、強くなった今の習熟度で過去のポイントが目減りしてしまう。
 */
export function computePoints(events: readonly Event[]): PointsComputation {
  let total = 0;
  const bySession: Record<string, number> = {};
  computeMastery(events, (event, scoreBefore, isRepeat) => {
    const earned = pointsFor(event, scoreBefore, isRepeat);
    total += earned;
    bySession[event.sessionId] = (bySession[event.sessionId] ?? 0) + earned;
  });
  return { total, bySession };
}

/** 1件ぶんの獲得点。`scoreBefore` はそのイベントを適用する**前**の項目習熟度。 */
export function pointsFor(event: Event, scoreBefore: number, isRepeat: boolean): number {
  if (event.outcome === 'skipped') return 0;
  const base = event.outcome === 'incorrect' ? ATTEMPT_POINTS : EARNED_POINTS[event.effectiveMethod];
  const earned = base * weaknessMultiplier(scoreBefore) * (isRepeat ? REPEAT_FACTOR : 1);
  return Math.round(earned);
}

/** 弱点倍率だけを取り出す。基礎点の丸めに巻き込まれずに試験できるよう公開する。 */
export function weaknessMultiplier(scoreBefore: number): number {
  const score = Math.max(0, Math.min(100, scoreBefore));
  return 1 + (MAX_WEAKNESS_MULTIPLIER - 1) * ((100 - score) / 100);
}
