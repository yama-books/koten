import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import type { EventMethod } from '../../../packages/shared/src/domain/event.ts';
import { numberedEvents } from './fixtures.ts';

test('caps: 各方式の上限と閲覧100回の20上限を適用する', () => {
  const cases: readonly [EventMethod, number][] = [
    ['view', 20], ['self-x', 20], ['self-tri', 30], ['self-o', 35],
    ['choice', 65], ['kanji-to-kana', 80], ['free-input', 90], ['paper-handwriting', 90],
  ];
  const events = cases.flatMap(([method], index) => numberedEvents(method, method === 'view' ? 100 : 40, `p${index}:skill`));
  const { scores } = computeMastery(events);
  cases.forEach(([, expected], index) => assert.equal(scores[`p${index}:skill`], expected));
});

test('caps: 低い上限の正答は既に高い値を下げない', () => {
  const events = [...numberedEvents('free-input', 10), ...numberedEvents('view', 1, 'p001:text', '2026-09-01')];
  assert.equal(computeMastery(events).scores['p001:text'], 90);
});
