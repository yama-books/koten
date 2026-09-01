import type { Event } from '../event.ts';
import {
  INCORRECT_DECREMENT,
  isRecallMethod,
  MASTERY_RULES,
  MASTERY_RULES_VERSION,
} from './rules.v1.ts';

export type MasteryComputation = Readonly<{
  scores: Readonly<Record<string, number>>;
  unsupportedEvents: readonly Event[];
}>;

type ItemState = { score: number; ninetyReachedOn?: string };

/** Recomputes item scores from compatible event history without storage or clock access. */
export function computeMastery(events: readonly Event[]): MasteryComputation {
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
    applyEvent(state, event, event.sameSessionRepeat || repeatedByHistory);
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
  const increment = isRepeat ? Math.floor(rule.increment / 2) : rule.increment;
  const mayExceedNinety = state.score >= 90
    && state.ninetyReachedOn !== undefined
    && event.localDate !== state.ninetyReachedOn
    && event.outcome === 'correct'
    && isRecallMethod(method);
  const cap = mayExceedNinety ? 100 : rule.cap;
  state.score = clamp(state.score + Math.min(increment, Math.max(0, cap - state.score)));
  if (state.score >= 90 && state.ninetyReachedOn === undefined) state.ninetyReachedOn = event.localDate;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
