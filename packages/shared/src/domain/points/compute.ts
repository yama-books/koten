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
  /*
   * **倍率はその回の初めの習熟度で決める**（依頼者・2026-09-15）。
   *
   * 弱点倍率は「解く前の習熟度」で決まるので、**点が入る段で解くとその回の途中で倍率が下がる。**
   * 天井で止まっている易しい段では下がらないため、**同じ 10 問で易しい段 170 点・難しい段 152 点**
   * という逆転が起きていた（実測）。伸びたぶんをその回の点から差し引かない。
   *
   * **固定するのはその回の中だけである。** ずっと固定すると、強くなった歌がいつまでも高倍率になる。
   */
  const sessionBaseline = new Map<string, Map<string, number>>();
  computeMastery(events, (event, scoreBefore, isRepeat) => {
    // **回ごと・項目ごとに 1 つ。** 連結した文字列を鍵にしない（区切り文字が本文に混ざる）。
    const forSession = sessionBaseline.get(event.sessionId) ?? new Map<string, number>();
    const baseline = forSession.get(event.itemKey) ?? scoreBefore;
    forSession.set(event.itemKey, baseline);
    sessionBaseline.set(event.sessionId, forSession);
    const earned = pointsFor(event, baseline, isRepeat);
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
