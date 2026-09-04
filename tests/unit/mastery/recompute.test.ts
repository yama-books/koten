import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import { event } from './fixtures.ts';

test('recompute: 記録済みの数値を変えてもイベント列からの結果は変わらない', () => {
  const events = [event({ method: 'choice', effectiveMethod: 'choice' }), event({ eventId: 'event-2' })];
  const rewritten = events.map((item) => ({ ...item, delta: 9999 }));
  assert.deepEqual(computeMastery(rewritten).scores, computeMastery(events).scores);
});

test('recompute: 未対応の規則版イベントは失わず明示的に返し、計算に混ぜない', () => {
  const current = event({ method: 'choice', effectiveMethod: 'choice' });
  const future = event({ eventId: 'future-event', masteryRulesVersion: 2 });
  const result = computeMastery([current, future]);
  assert.deepEqual(result.scores, { 'p001:text': 5 });
  assert.deepEqual(result.unsupportedEvents, [future]);
});
