import type { Event } from '@koten/shared/domain/event';
import { masteryDisplay, type MasteryColor } from '@koten/shared/domain/mastery/color';
import { computeMastery } from '@koten/shared/domain/mastery/compute';
import { poemMastery } from '@koten/shared/domain/mastery/poem';
import { isViewOnly } from '@koten/shared/domain/mastery/rules.v1';

export type HistoryEntry = Readonly<{ poemId: string; cardNo: number; percent: number; color: MasteryColor; untouched: boolean; authorUnconfirmed: boolean; needsReview: boolean }>;
export type HistorySummary = Readonly<{ entries: readonly HistoryEntry[]; needsReview: readonly HistoryEntry[]; touchedCount: number; isEmpty: boolean }>;

export function summarizeHistory(input: Readonly<{ events: readonly Event[]; poemIds: readonly string[] }>): HistorySummary {
  const scores = computeMastery(input.events).scores;
  const entries = input.poemIds.map((poemId) => {
    const mastery = poemMastery(poemId, input.events, scores);
    const display = masteryDisplay(mastery.score);
    return {
      poemId, cardNo: Number(poemId.replace(/^\D+/, '')), percent: display.percent, color: display.color,
      untouched: mastery.untouched, authorUnconfirmed: mastery.authorUnconfirmed,
      needsReview: needsReview(poemId, input.events),
    };
  });
  return { entries, needsReview: entries.filter((entry) => entry.needsReview), touchedCount: entries.filter((entry) => !entry.untouched).length, isEmpty: input.events.length === 0 };
}

function needsReview(poemId: string, events: readonly Event[]): boolean {
  const latest = events
    .filter((event) => event.poemId === poemId && !isViewOnly(event.method))
    .slice()
    .sort((left, right) => left.localDate.localeCompare(right.localDate))
    .at(-1);
  return latest?.outcome === 'incorrect' || latest?.outcome === 'skipped';
}
