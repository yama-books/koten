import type { Event } from '../event.ts';
import { masteryDisplay, type MasteryColor } from '../mastery/color.ts';
import { poemMastery } from '../mastery/poem.ts';
import { isRecallMethod, isViewOnly } from '../mastery/rules.v1.ts';
import { HIGH_ERROR_MIN_ATTEMPTS, HIGH_ERROR_RATE, RECENT_TROUBLE_DAYS, REVIEW_INTERVAL_DAYS } from './rules.v1.ts';

/**
 * 段1〜5 は APP_SPEC §8.2 の段と対応する。**番号を振り直さない。**
 * 2026-09-22 に足した「解いているのに、まちがいが多い」は、先に見るので段0 とした。
 */
export type RecommendTier = 0 | 1 | 2 | 3 | 4 | 5;

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
  /** 思い出す方式で解いた回数。△ も 1 回と数える。 */
  attempts: number;
  /** そのうち外した割合。解いた回数が 0 なら 0。 */
  errorRate: number;
}>;

const REASONS: Readonly<Record<RecommendTier, string>> = {
  0: '何度か解いていますが、まちがいが多い歌です',
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
    // **まず「解いているのに外している歌」を見る**（依頼者・2026-09-22）。
    // 期限切れより先に出す——期限は「そろそろ忘れる頃」の見込みだが、
    // こちらは**実際に外している**という観測である。
    [0, (status) => status.attempts >= HIGH_ERROR_MIN_ATTEMPTS && status.errorRate >= HIGH_ERROR_RATE],
    [1, (status) => status.overdueDays > 0 && !status.hasDifferentDayRecall],
    [2, (status) => status.hasRecentTrouble],
    [3, (status) => status.hasEvents && !status.hasDifferentDayRecall],
    [4, (status) => !status.hasEvents],
    [5, (status) => status.overdueDays > 0],
  ];

  for (const [tier, matches] of tiers) {
    // 段0 だけは「まちがいの多い順」に見る。ほかの段は期限と習熟度の順のままにする。
    const compare = tier === 0 ? compareByErrorRate : compareStatuses;
    const chosen = statuses.filter(matches).sort(compare)[0];
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

  // **「解いた」は view 以外の解答すべてである。** `isRecallMethod` は free-input と
  // paper-handwriting しか通さないので、それで絞ると「わからない(×)」が分母からも
  // 分子からも落ち、**外した歌ほど率が下がる**という逆の結果になる。
  // 外したのは「誤答」と「わからない(×)」。△ は分母に入れるが、外したとは数えない。
  const answers = events.filter((event) => event.kind === 'answer' && !isViewOnly(event.method));
  const missed = answers.filter((event) => event.outcome === 'incorrect' || event.effectiveMethod === 'self-x');

  return {
    poemId,
    index,
    percent,
    attempts: answers.length,
    errorRate: answers.length === 0 ? 0 : missed.length / answers.length,
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

function compareByErrorRate(left: PoemStatus, right: PoemStatus): number {
  return right.errorRate - left.errorRate || right.attempts - left.attempts || left.percent - right.percent || left.index - right.index;
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
