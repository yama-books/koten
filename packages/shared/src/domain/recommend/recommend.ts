import type { Event } from '../event.ts';
import { masteryDisplay, type MasteryColor } from '../mastery/color.ts';
import { poemMastery } from '../mastery/poem.ts';
import { isRecallMethod, isViewOnly } from '../mastery/rules.v1.ts';
import { RECENT_TROUBLE_DAYS, REVIEW_INTERVAL_DAYS } from './rules.v1.ts';

export type RecommendTier = 1 | 2 | 3 | 4 | 5;

export type Recommendation = Readonly<{
  poemId: string;
  tier: RecommendTier;
  reason: string;
  percent: number;
}>;

export type RecommendInput = Readonly<{
  today: string;
  poemIds: readonly string[];
  events: readonly Event[];
  scores: Readonly<Record<string, number>>;
}>;

type PoemStatus = Readonly<{
  poemId: string;
  index: number;
  percent: number;
  hasEvents: boolean;
  hasDifferentDayRecall: boolean;
  hasRecentTrouble: boolean;
  overdueDays: number;
}>;

const REASONS: Readonly<Record<RecommendTier, string>> = {
  1: '前回から間隔が空いたため',
  2: 'もう一度思い出してみましょう',
  3: '別の日にも思い出せるか確かめましょう',
  4: 'まだ確認していない歌です',
  5: '前回から間隔が空いたため',
};

/** Selects a single, stable next review without reading clocks, storage, or random state. */
export function recommendNext(input: RecommendInput): Recommendation | undefined {
  const statuses = input.poemIds.map((poemId, index) => poemStatus(poemId, index, input));
  const tiers: readonly [RecommendTier, (status: PoemStatus) => boolean][] = [
    [1, (status) => status.overdueDays > 0 && !status.hasDifferentDayRecall],
    [2, (status) => status.hasRecentTrouble],
    [3, (status) => status.hasEvents && !status.hasDifferentDayRecall],
    [4, (status) => !status.hasEvents],
    [5, (status) => status.overdueDays > 0],
  ];

  for (const [tier, matches] of tiers) {
    const chosen = statuses.filter(matches).sort(compareStatuses)[0];
    if (chosen !== undefined) {
      return { poemId: chosen.poemId, tier, reason: REASONS[tier], percent: chosen.percent };
    }
  }
  return undefined;
}

function poemStatus(poemId: string, index: number, input: RecommendInput): PoemStatus {
  const events = input.events.filter((event) => event.poemId === poemId);
  const mastery = poemMastery(poemId, input.events, input.scores);
  const hasEvents = !mastery.untouched;
  const percent = masteryDisplay(mastery.score).percent;
  const lastLearnedOn = events.filter((event) => !isViewOnly(event.method)).reduce<string | undefined>((latest, event) =>
    latest === undefined || event.localDate > latest ? event.localDate : latest, undefined);
  const recallDates = new Set(events
    .filter((event) => event.outcome === 'correct' && isRecallMethod(event.effectiveMethod))
    .map((event) => event.localDate));
  const hasRecentTrouble = events.some((event) =>
    (event.outcome === 'incorrect' || event.effectiveMethod === 'self-x' || event.effectiveMethod === 'self-tri')
    && daysBetween(event.localDate, input.today) >= 0
    && daysBetween(event.localDate, input.today) <= RECENT_TROUBLE_DAYS);
  const color = reviewColor(percent, hasEvents);
  const interval = color === 'gray' ? undefined : REVIEW_INTERVAL_DAYS[color];
  const sinceLastLearning = lastLearnedOn === undefined ? 0 : daysBetween(lastLearnedOn, input.today);

  return {
    poemId,
    index,
    percent,
    hasEvents,
    hasDifferentDayRecall: recallDates.size >= 2,
    hasRecentTrouble,
    overdueDays: interval === undefined || sinceLastLearning < interval ? 0 : sinceLastLearning - interval + 1,
  };
}

function reviewColor(percent: number, hasEvents: boolean): MasteryColor {
  const color = masteryDisplay(percent).color;
  return color === 'gray' && hasEvents ? 'red' : color;
}

function compareStatuses(left: PoemStatus, right: PoemStatus): number {
  return right.overdueDays - left.overdueDays || left.percent - right.percent || left.index - right.index;
}

function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

function dayNumber(value: string): number {
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const monthOffsets = isLeapYear(year)
    ? [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335]
    : [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const completedYears = year - 1;
  return completedYears * 365 + Math.floor(completedYears / 4) - Math.floor(completedYears / 100)
    + Math.floor(completedYears / 400) + monthOffsets[month - 1] + day;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
