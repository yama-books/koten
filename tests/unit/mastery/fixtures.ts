import type { Event, EventMethod, EventOutcome } from '../../../packages/shared/src/domain/event.ts';

export function event(overrides: Partial<Event> = {}): Event {
  return {
    eventId: 'event-001', product: 'hyakunin', poemId: 'p001', questionId: 'q1', sessionId: 'session-1', itemKey: 'p001:text',
    kind: 'answer', method: 'free-input', outcome: 'correct', hintUsed: false, effectiveMethod: 'free-input',
    delta: 9, localDate: '2026-08-31', sameSessionRepeat: false, appVersion: '0.1.0', dataVersion: 1, masteryRulesVersion: 1,
    ...overrides,
  };
}

export function outcomeFor(method: EventMethod): EventOutcome {
  return method === 'view' || method.startsWith('self-') ? 'viewed' : 'correct';
}

export function numberedEvents(method: EventMethod, count: number, itemKey = 'p001:text', localDate = '2026-08-31'): Event[] {
  return Array.from({ length: count }, (_, index) => event({
    eventId: `event-${String(index + 1).padStart(3, '0')}`,
    itemKey,
    questionId: `${itemKey}-q${index + 1}`,
    method,
    effectiveMethod: method,
    outcome: outcomeFor(method),
    localDate,
  }));
}
