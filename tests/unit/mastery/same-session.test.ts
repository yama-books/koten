import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import { event } from './fixtures.ts';

test('same-session: 同じ(sessionId, questionId)の二回目以降を切り捨て半分にする', () => {
  const events = [
    event({ eventId: 'event-1', method: 'choice', effectiveMethod: 'choice' }),
    event({ eventId: 'event-2', method: 'choice', effectiveMethod: 'choice' }),
    event({ eventId: 'event-3', questionId: 'q2', method: 'choice', effectiveMethod: 'choice' }),
  ];
  assert.equal(computeMastery(events).scores['p001:text'], 12);
});

test('same-session: 明示trueを優先し、減点は半分にしない', () => {
  const events = [
    event({ eventId: 'event-1', method: 'choice', effectiveMethod: 'choice' }),
    event({ eventId: 'event-2', questionId: 'q2', method: 'choice', effectiveMethod: 'choice', sameSessionRepeat: true }),
    event({ eventId: 'event-3', questionId: 'q3', method: 'choice', effectiveMethod: 'choice', outcome: 'incorrect', sameSessionRepeat: true }),
  ];
  assert.equal(computeMastery(events).scores['p001:text'], 4);
});

test('same-session: questionIdなしでは繰り返しを推測しない', () => {
  const events = [
    event({ eventId: 'event-1', questionId: undefined, method: 'choice', effectiveMethod: 'choice' }),
    event({ eventId: 'event-2', questionId: undefined, method: 'choice', effectiveMethod: 'choice' }),
  ];
  assert.equal(computeMastery(events).scores['p001:text'], 10);
});
