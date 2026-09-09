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

test('over-90: 別日の自由入力または紙手書き正答だけが90を超えられる', () => {
  const reachedNinety = numberedEvents('free-input', 10);
  const nextDay = numberedEvents('free-input', 1, 'p001:text', '2026-09-01').map((item) => ({ ...item, sessionId: 'session-2' }));
  const paperDay = numberedEvents('paper-handwriting', 1, 'p001:text', '2026-09-02').map((item) => ({ ...item, sessionId: 'session-3' }));
  assert.equal(computeMastery([...reachedNinety, ...nextDay]).scores['p001:text'], 92);
  assert.equal(computeMastery([...reachedNinety, ...nextDay, ...paperDay]).scores['p001:text'], 94);
});

/**
 * 90 の先の歩幅（依頼者裁定・2026-09-09）。**一気に増やさないが、必ず動く。**
 *
 * 前は 90→99→100 と2日で終わっていた。これを「あと5回」と数えられる長さにする。
 * 漸近させてはいけない——100 に届かない設計は、進捗が見えないこと自体が離脱要因になる。
 */
test('over-90: 90から100までは別々の日に5回かかり、毎回必ず動く', () => {
  const events = [...numberedEvents('free-input', 10)];
  const seen: number[] = [];
  for (let day = 1; day <= 6; day += 1) {
    const date = `2026-09-${String(day).padStart(2, '0')}`;
    events.push(...numberedEvents('free-input', 1, 'p001:text', date).map((item) => ({
      ...item, eventId: `over90-${day}`, questionId: `over90-q${day}`, sessionId: `over90-s${day}`,
    })));
    seen.push(computeMastery(events).scores['p001:text']!);
  }
  assert.deepEqual(seen, [92, 94, 96, 98, 100, 100], '2ずつ上がり、5回目で100に届くこと');
  assert.ok(seen.slice(0, 5).every((value, index) => index === 0 || value > seen[index - 1]!), '途中で止まる回が無いこと');
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
