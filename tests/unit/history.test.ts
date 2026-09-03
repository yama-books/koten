import test from 'node:test';
import assert from 'node:assert/strict';
import type { Event } from '../../packages/shared/src/domain/event.ts';
import { summarizeHistory } from '../../packages/hyakunin/src/domain/history.ts';

function event(overrides: Partial<Event> = {}): Event {
  return { eventId: 'e', product: 'hyakunin', poemId: 'p012', sessionId: 's', itemKey: 'p012:text', kind: 'answer', method: 'free-input', outcome: 'correct', hintUsed: false, effectiveMethod: 'free-input', delta: 9, localDate: '2026-09-01', sameSessionRepeat: false, appVersion: 'test', dataVersion: 1, masteryRulesVersion: 1, ...overrides };
}

test('history: 全首を番号順で返す', () => assert.deepEqual(summarizeHistory({ events: [], poemIds: ['p012', 'p045'] }).entries.map((entry) => entry.cardNo), [12, 45]));
test('history: イベントなしは空状態である', () => assert.equal(summarizeHistory({ events: [], poemIds: ['p012'] }).isEmpty, true));
test('history: 未着手と測定済み0%を区別する', () => {
  const summary = summarizeHistory({ events: [event({ poemId: 'p045', itemKey: 'p045:text', outcome: 'incorrect', effectiveMethod: 'free-input' })], poemIds: ['p012', 'p045'] });
  assert.equal(summary.entries[0].untouched, true); assert.equal(summary.entries[1].untouched, false); assert.equal(summary.entries[1].percent, 0);
});
test('history: 要確認は誤答を含み番号順で返す', () => {
  const summary = summarizeHistory({ events: [event({ poemId: 'p045', eventId: 'low', itemKey: 'p045:text', outcome: 'incorrect' }), event({ poemId: 'p012', eventId: 'high', itemKey: 'p012:text', delta: 100, outcome: 'incorrect' })], poemIds: ['p012', 'p045'] });
  assert.deepEqual(summary.needsReview.map((entry) => entry.cardNo), [12, 45]);
});
test('history: 最新の正答があれば過去の誤答を要確認に残さない', () => {
  const summary = summarizeHistory({ events: [event({ eventId: 'incorrect', outcome: 'incorrect', localDate: '2026-09-01' }), event({ eventId: 'correct-1', localDate: '2026-09-02' }), event({ eventId: 'correct-2', localDate: '2026-09-03' })], poemIds: ['p012'] });
  assert.deepEqual(summary.needsReview, []);
});

test('history: 同日の追記順はUUID文字列の順に左右されない', () => {
  const needsReviewFor = (incorrectId: string, correctId: string) => summarizeHistory({
    events: [
      event({ eventId: incorrectId, outcome: 'incorrect', localDate: '2026-09-03' }),
      event({ eventId: correctId, outcome: 'correct', localDate: '2026-09-03' }),
    ],
    poemIds: ['p012'],
  }).needsReview;

  assert.deepEqual(needsReviewFor('00000000-0000-4000-8000-000000000000', 'ffffffff-ffff-4fff-8fff-ffffffffffff'), []);
  assert.deepEqual(needsReviewFor('ffffffff-ffff-4fff-8fff-ffffffffffff', '00000000-0000-4000-8000-000000000000'), []);
});
test('history: 作者イベントがなければ未確認である', () => assert.equal(summarizeHistory({ events: [event()], poemIds: ['p012'] }).entries[0].authorUnconfirmed, true));
test('history: 作者イベントがあれば確認済みである', () => assert.equal(summarizeHistory({ events: [event({ itemKey: 'p012:author' })], poemIds: ['p012'] }).entries[0].authorUnconfirmed, false));

test('V-1: 誤答した歌を翌日閲覧しても要確認に残す', () => {
  const summary = summarizeHistory({
    events: [
      event({ eventId: 'incorrect', outcome: 'incorrect', localDate: '2026-09-01' }),
      event({ eventId: 'viewed', kind: 'view', method: 'view', effectiveMethod: 'view', outcome: 'viewed', localDate: '2026-09-02' }),
    ],
    poemIds: ['p012'],
  });
  assert.deepEqual(summary.needsReview.map((entry) => entry.cardNo), [12]);
});

test('V-2: 閲覧しかしていない歌は要確認に入らない', () => {
  const summary = summarizeHistory({
    events: [event({ kind: 'view', method: 'view', effectiveMethod: 'view', outcome: 'viewed' })],
    poemIds: ['p012'],
  });
  assert.deepEqual(summary.needsReview, []);
});

test('V-3: ヒント後の自己評価△は判定材料から外れない', () => {
  const summary = summarizeHistory({
    events: [event({ kind: 'self-rate', method: 'self-tri', effectiveMethod: 'view', hintUsed: true, outcome: 'incorrect' })],
    poemIds: ['p012'],
  });
  assert.deepEqual(summary.needsReview.map((entry) => entry.cardNo), [12]);
});

test('V-4: 最新の正答があれば、そのあと閲覧しても要確認に戻らない', () => {
  const summary = summarizeHistory({
    events: [
      event({ eventId: 'incorrect', outcome: 'incorrect', localDate: '2026-09-01' }),
      event({ eventId: 'correct', localDate: '2026-09-02' }),
      event({ eventId: 'viewed', kind: 'view', method: 'view', effectiveMethod: 'view', outcome: 'viewed', localDate: '2026-09-03' }),
    ],
    poemIds: ['p012'],
  });
  assert.deepEqual(summary.needsReview, []);
});
