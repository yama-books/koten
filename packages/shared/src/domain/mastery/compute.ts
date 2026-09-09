import type { Event } from '../event.ts';
import {
  INCORRECT_DECREMENT,
  isMasteryCompletionMethod,
  MASTERY_RULES,
  MASTERY_RULES_VERSION,
  OVER_NINETY_INCREMENT,
} from './rules.v1.ts';

export type MasteryComputation = Readonly<{
  scores: Readonly<Record<string, number>>;
  unsupportedEvents: readonly Event[];
}>;

type ItemState = { score: number; ninetyReachedOn?: string };

/**
 * 走査中の各イベントを、**適用する前の**項目習熟度と繰り返し判定つきで受け取る。
 *
 * ポイント積算がこれに相乗りする。習熟度の走査を二重に書くと、順序・繰り返し判定・
 * 対応版の絞り込みが片方だけ直されて静かにずれる。判定は一箇所に置く。
 */
export type MasteryObserver = (event: Event, scoreBefore: number, isRepeat: boolean) => void;

/** Recomputes item scores from compatible event history without storage or clock access. */
export function computeMastery(events: readonly Event[], observe?: MasteryObserver): MasteryComputation {
  const unsupportedEvents = events.filter((event) => event.masteryRulesVersion !== MASTERY_RULES_VERSION);
  const supportedEvents = events
    .filter((event) => event.masteryRulesVersion === MASTERY_RULES_VERSION)
    .slice()
    .sort((left, right) => left.localDate.localeCompare(right.localDate) || left.eventId.localeCompare(right.eventId));
  const states = new Map<string, ItemState>();
  const seenQuestions = new Set<string>();

  for (const event of supportedEvents) {
    const state = states.get(event.itemKey) ?? { score: 0 };
    const repeatedByHistory = event.questionId === undefined
      ? false
      : seenQuestions.has(`${event.sessionId}\u0000${event.questionId}`);
    if (event.questionId !== undefined) seenQuestions.add(`${event.sessionId}\u0000${event.questionId}`);
    const isRepeat = event.sameSessionRepeat || repeatedByHistory;
    observe?.(event, state.score, isRepeat);
    applyEvent(state, event, isRepeat);
    states.set(event.itemKey, state);
  }

  return {
    scores: Object.fromEntries([...states.entries()].map(([itemKey, state]) => [itemKey, state.score])),
    unsupportedEvents,
  };
}

function applyEvent(state: ItemState, event: Event, isRepeat: boolean): void {
  const method = event.effectiveMethod;
  if (event.outcome === 'incorrect') {
    state.score = clamp(state.score - INCORRECT_DECREMENT[method]);
    return;
  }
  if (event.outcome === 'skipped') return;

  const rule = MASTERY_RULES[method];
  const mayExceedNinety = state.score >= 90
    && state.ninetyReachedOn !== undefined
    && event.localDate !== state.ninetyReachedOn
    && event.outcome === 'correct'
    && isMasteryCompletionMethod(method);
  // 90 の先だけ歩幅を変える。89 以下はこれまでどおりで、既存の記録の意味を動かさない。
  const base = mayExceedNinety ? OVER_NINETY_INCREMENT : rule.increment;
  const increment = isRepeat ? Math.floor(base / 2) : base;
  const cap = mayExceedNinety ? 100 : rule.cap;
  state.score = clamp(state.score + Math.min(increment, Math.max(0, cap - state.score)));
  if (state.score >= 90 && state.ninetyReachedOn === undefined) state.ninetyReachedOn = event.localDate;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
