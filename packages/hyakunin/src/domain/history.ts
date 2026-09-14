import type { Event } from '@koten/shared/domain/event';
import { masteryDisplay, type MasteryColor } from '@koten/shared/domain/mastery/color';
import { computeMastery } from '@koten/shared/domain/mastery/compute';
import { poemMastery } from '@koten/shared/domain/mastery/poem';
import { computePoints } from '@koten/shared/domain/points/compute';
import { isViewOnly } from '@koten/shared/domain/mastery/rules.v1';
import { rungProgress, type RungCatalogueEntry } from '@koten/shared/domain/mastery/rungs';

export type HistoryEntry = Readonly<{ poemId: string; cardNo: number; percent: number; color: MasteryColor; untouched: boolean; authorUnconfirmed: boolean; needsReview: boolean; conquered: boolean }>;
export type HistorySummary = Readonly<{ entries: readonly HistoryEntry[]; needsReview: readonly HistoryEntry[]; touchedCount: number; isEmpty: boolean; points: number }>;

/**
 * **完全制覇は点ではなく印である**（依頼者裁定・2026-09-15）。
 * `clamp` を 100 で止めたまま、段8（番号だけ見て全部書く）を制覇した歌に印を立てる。
 * 点の計算・5色の表示・メーターに一切触らない。
 */
export function summarizeHistory(input: Readonly<{ events: readonly Event[]; poemIds: readonly string[]; questions?: readonly RungCatalogueEntry[] }>): HistorySummary {
  const scores = computeMastery(input.events).scores;
  const progress = rungProgress(
    input.events.filter((event) => event.questionId !== undefined).map((event) => ({ questionId: event.questionId!, outcome: event.outcome })),
    input.questions ?? [],
  );
  const entries = input.poemIds.map((poemId) => {
    const mastery = poemMastery(poemId, input.events, scores);
    const display = masteryDisplay(mastery.score);
    return {
      poemId, cardNo: Number(poemId.replace(/^\D+/, '')), percent: display.percent, color: display.color,
      untouched: mastery.untouched, authorUnconfirmed: mastery.authorUnconfirmed,
      needsReview: needsReview(poemId, input.events),
      conquered: progress.get(poemId)?.conquered ?? false,
    };
  });
  return { entries, needsReview: entries.filter((entry) => entry.needsReview), touchedCount: entries.filter((entry) => !entry.untouched).length, isEmpty: input.events.length === 0, points: computePoints(input.events).total };
}

function needsReview(poemId: string, events: readonly Event[]): boolean {
  const latest = events
    .filter((event) => event.poemId === poemId && !isViewOnly(event.method))
    .slice()
    .sort((left, right) => left.localDate.localeCompare(right.localDate))
    .at(-1);
  return latest?.outcome === 'incorrect' || latest?.outcome === 'skipped';
}
