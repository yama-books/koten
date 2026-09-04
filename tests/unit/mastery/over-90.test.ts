import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import { numberedEvents } from './fixtures.ts';

test('over-90: 同一日の想起では90を超えない', () => {
  const events = [
    ...numberedEvents('free-input', 10),
    ...numberedEvents('free-input', 1, 'p001:text').map((item) => ({ ...item, eventId: 'event-999', sessionId: 'session-2' })),
  ];
  assert.equal(computeMastery(events).scores['p001:text'], 90);
});

test('over-90: 別日の自由入力または紙手書き正答だけが100まで上げられる', () => {
  const reachedNinety = numberedEvents('free-input', 10);
  const nextDay = numberedEvents('free-input', 1, 'p001:text', '2026-09-01').map((item) => ({ ...item, sessionId: 'session-2' }));
  const paperDay = numberedEvents('paper-handwriting', 1, 'p001:text', '2026-09-02').map((item) => ({ ...item, sessionId: 'session-3' }));
  assert.equal(computeMastery([...reachedNinety, ...nextDay]).scores['p001:text'], 99);
  assert.equal(computeMastery([...reachedNinety, ...nextDay, ...paperDay]).scores['p001:text'], 100);
});

test('over-90: ヒント後・選択式・同日紙手書きでは90を超えない', () => {
  const reachedNinety = numberedEvents('free-input', 10);
  const hintedNextDay = numberedEvents('free-input', 1, 'p001:text', '2026-09-01').map((item) => ({
    ...item,
    sessionId: 'session-2',
    hintUsed: true,
    effectiveMethod: 'kanji-to-kana' as const,
  }));
  const choiceNextDay = numberedEvents('choice', 1, 'p001:text', '2026-09-01').map((item) => ({
    ...item,
    sessionId: 'session-3',
  }));
  const paperSameDay = numberedEvents('paper-handwriting', 1).map((item) => ({
    ...item,
    sessionId: 'session-4',
  }));

  assert.equal(computeMastery([...reachedNinety, ...hintedNextDay]).scores['p001:text'], 90);
  assert.equal(computeMastery([...reachedNinety, ...choiceNextDay]).scores['p001:text'], 90);
  assert.equal(computeMastery([...reachedNinety, ...paperSameDay]).scores['p001:text'], 90);
});
