import type { Event, EventMethod, EventOutcome } from '@koten/shared/domain/event';
import { INCORRECT_DECREMENT, MASTERY_RULES, MASTERY_RULES_VERSION, downgradeForHint } from '@koten/shared/domain/mastery/rules.v1';
import type { Judgement } from './question.ts';

export function effectiveMethodFor(method: EventMethod, hintUsed: boolean, judgement: Judgement): EventMethod {
  if (!hintUsed && judgement !== 'partial') return method;
  return downgradeForHint(method) ?? method;
}

export function deltaFor(method: EventMethod, outcome: EventOutcome, currentScore: number, isRepeat: boolean): number {
  if (outcome === 'skipped') return 0;
  if (outcome === 'incorrect') return -INCORRECT_DECREMENT[method];
  if (outcome === 'viewed') return MASTERY_RULES[method].increment;
  const rule = MASTERY_RULES[method];
  const increment = isRepeat ? Math.floor(rule.increment / 2) : rule.increment;
  return Math.min(increment, Math.max(0, rule.cap - currentScore));
}

export function outcomeFor(judgement: Judgement): EventOutcome {
  if (judgement === 'correct' || judgement === 'partial') return 'correct';
  if (judgement === 'incorrect') return 'incorrect';
  return 'skipped';
}

export type BuildEventInput = Omit<Event, 'effectiveMethod' | 'delta' | 'outcome' | 'masteryRulesVersion'> & Readonly<{
  judgement: Judgement;
  currentScore: number;
}>;

export function buildEvent(input: BuildEventInput): Event {
  const outcome = outcomeFor(input.judgement);
  const effectiveMethod = effectiveMethodFor(input.method, input.hintUsed, input.judgement);
  return {
    ...input,
    outcome,
    effectiveMethod,
    delta: deltaFor(effectiveMethod, outcome, input.currentScore, input.sameSessionRepeat),
    masteryRulesVersion: MASTERY_RULES_VERSION,
  };
}

export type BuildViewEventInput = Omit<Event, 'effectiveMethod' | 'delta' | 'outcome' | 'masteryRulesVersion' | 'method'>;

export function buildViewEvent(input: BuildViewEventInput): Event {
  return {
    ...input,
    method: 'view',
    outcome: 'viewed',
    effectiveMethod: 'view',
    delta: deltaFor('view', 'viewed', 0, input.sameSessionRepeat),
    masteryRulesVersion: MASTERY_RULES_VERSION,
  };
}
