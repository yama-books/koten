import type { Event } from '@koten/shared/domain/event';
import { masteryDisplay, type MasteryColor } from '@koten/shared/domain/mastery/color';
import { computeMastery } from '@koten/shared/domain/mastery/compute';
import { poemMastery } from '@koten/shared/domain/mastery/poem';
import { recommendNext, type Recommendation } from '@koten/shared/domain/recommend/recommend';
import { reviewQuestionIds } from './review.ts';

export type OutcomeKind = 'viewed' | 'correct' | 'partial' | 'needs-review' | 'incorrect';

export type Breakdown = Readonly<{
  viewed: number;
  correct: number;
  partial: number;
  needsReview: number;
  incorrect: number;
}>;

export type MasteryChange = Readonly<{ poemId: string; before: number; after: number }>;

export type PoemOutcome = Readonly<{
  poemId: string;
  cardNo: number;
  kind: OutcomeKind | null;
  percent: number;
  color: MasteryColor;
  untouched: boolean;
  authorUnconfirmed: boolean;
}>;

export type SummarizeInput = Readonly<{
  sessionId: string;
  range: Readonly<{ from: number; to: number }>;
  outcomes: readonly Readonly<{ questionId: string; poemId: string; kind: Exclude<OutcomeKind, 'viewed'> }>[];
  allEvents: readonly Event[];
  poemIds: readonly string[];
  today: string;
}>;

export type SessionResult = Readonly<{
  range: Readonly<{ from: number; to: number }>;
  questionCount: number;
  breakdown: Breakdown;
  allCorrect: boolean;
  changes: readonly MasteryChange[];
  poems: readonly PoemOutcome[];
  retryCardNumbers: readonly number[];
  retryQuestionIds: readonly string[];
  recommendation: Recommendation | undefined;
}>;

const weakness: Readonly<Record<OutcomeKind, number>> = {
  correct: 4,
  partial: 3,
  'needs-review': 2,
  incorrect: 1,
  viewed: 0,
};

/** Summarizes one session from its explicit judgements and persisted event history. */
export function summarizeSession(input: SummarizeInput): SessionResult {
  const sessionEvents = input.allEvents.filter((event) => event.sessionId === input.sessionId);
  const viewed = sessionEvents
    .filter((event) => event.outcome === 'viewed')
    .map((event) => ({ poemId: event.poemId, kind: 'viewed' as const }));
  /**
   * 「わからない！」で答えを見た問も再確認へ回す（依頼者裁定・2026-09-07）。
   *
   * **答えを見たということは、解けなかったということである。** 誤答と同じく、次に出し直す。
   * 発注057 は閲覧を再確認から外していたが、**学習者から見ると、いちばん出し直してほしい問**が
   * 落ちていた。全問「わからない！」で終えると、結果に「まちがえた歌だけをもう一度」が出なかった。
   */
  const viewedQuestionIds = sessionEvents
    .filter((event) => event.outcome === 'viewed' && typeof event.questionId === 'string' && event.questionId.length > 0)
    .map((event) => event.questionId as string);
  const answers = input.outcomes;
  const attempts = [...answers, ...viewed];
  const breakdown = countBreakdown(attempts);
  const before = computeMastery(input.allEvents.filter((event) => event.sessionId !== input.sessionId));
  const after = computeMastery(input.allEvents);
  const poems = input.poemIds.map((poemId) => poemOutcome(poemId, attempts, input.allEvents, after.scores));
  const changes = input.poemIds
    .map((poemId) => ({
      poemId,
      before: poemMastery(poemId, input.allEvents.filter((event) => event.sessionId !== input.sessionId), before.scores).score,
      after: poemMastery(poemId, input.allEvents, after.scores).score,
    }))
    .filter((change) => change.before !== change.after);
  const retryCardNumbers = [...new Set(attempts
    .filter((attempt) => attempt.kind === 'viewed' || attempt.kind === 'partial' || attempt.kind === 'needs-review' || attempt.kind === 'incorrect')
    .map((attempt) => cardNo(attempt.poemId)))]
    .sort((left, right) => left - right);

  return {
    range: input.range,
    questionCount: attempts.length,
    breakdown,
    allCorrect: answers.length > 0 && viewed.length === 0 && answers.every((attempt) => attempt.kind === 'correct'),
    changes,
    poems,
    retryCardNumbers,
    retryQuestionIds: [...new Set([...reviewQuestionIds(answers), ...viewedQuestionIds])],
    recommendation: recommendNext({ today: input.today, poemIds: input.poemIds, events: input.allEvents, scores: after.scores }),
  };
}

function countBreakdown(attempts: readonly Readonly<{ kind: OutcomeKind }>[]): Breakdown {
  const result = { viewed: 0, correct: 0, partial: 0, needsReview: 0, incorrect: 0 };
  for (const attempt of attempts) {
    if (attempt.kind === 'needs-review') result.needsReview += 1;
    else result[attempt.kind] += 1;
  }
  return result;
}

function poemOutcome(poemId: string, attempts: readonly Readonly<{ poemId: string; kind: OutcomeKind }>[], events: readonly Event[], scores: Readonly<Record<string, number>>): PoemOutcome {
  const kinds = attempts.filter((attempt) => attempt.poemId === poemId).map((attempt) => attempt.kind);
  const mastery = poemMastery(poemId, events, scores);
  const display = masteryDisplay(mastery.score);
  return {
    poemId,
    cardNo: cardNo(poemId),
    kind: kinds.length === 0 ? null : kinds.reduce(weaker),
    percent: display.percent,
    color: display.color,
    untouched: mastery.untouched,
    authorUnconfirmed: mastery.authorUnconfirmed,
  };
}

function weaker(left: OutcomeKind, right: OutcomeKind): OutcomeKind {
  return weakness[left] <= weakness[right] ? left : right;
}

function cardNo(poemId: string): number {
  return Number(poemId.replace(/^\D+/, ''));
}
