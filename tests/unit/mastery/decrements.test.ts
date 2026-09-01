import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import { event, numberedEvents } from './fixtures.ts';

test('decrements: 選択式・漢字候補・自由入力/紙手書きで3/4/5を引く', () => {
  const cases = [
    { method: 'choice' as const, expected: 2 },
    { method: 'kanji-to-kana' as const, expected: 3 },
    { method: 'free-input' as const, expected: 4 },
    { method: 'paper-handwriting' as const, expected: 4 },
  ];
  for (const { method, expected } of cases) {
    const positive = numberedEvents(method, 1, method);
    const wrong = event({ eventId: 'event-999', itemKey: method, questionId: 'wrong', method, effectiveMethod: method, outcome: 'incorrect' });
    assert.equal(computeMastery([...positive, wrong]).scores[method], expected);
  }
});

test('decrements: 0未満にしない', () => {
  assert.equal(computeMastery([event({ outcome: 'incorrect' })]).scores['p001:text'], 0);
});
