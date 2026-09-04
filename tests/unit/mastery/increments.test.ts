import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import type { EventMethod } from '../../../packages/shared/src/domain/event.ts';
import { event, outcomeFor } from './fixtures.ts';

test('increments: APP_SPEC §8.1 の各方式を一回ずつ加点する', () => {
  const cases: readonly [EventMethod, number][] = [
    ['view', 1], ['self-x', 1], ['self-tri', 2], ['self-o', 3],
    ['choice', 5], ['kanji-to-kana', 7], ['free-input', 9], ['paper-handwriting', 9],
  ];
  const events = cases.map(([method], index) => event({
    eventId: `event-${index}`, itemKey: `p${index}:skill`, questionId: `q${index}`,
    method, effectiveMethod: method, outcome: outcomeFor(method),
  }));
  const { scores } = computeMastery(events);
  cases.forEach(([, expected], index) => assert.equal(scores[`p${index}:skill`], expected));
});
