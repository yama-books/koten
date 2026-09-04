import test from 'node:test';
import assert from 'node:assert/strict';
import type { Event } from '../../packages/shared/src/domain/event.ts';
import { summarizeSession } from '../../packages/hyakunin/src/domain/result.ts';

function event(overrides: Partial<Event> = {}): Event {
  return {
    eventId: 'event-a', product: 'hyakunin', poemId: 'p010', questionId: 'q-a', sessionId: 'session-a',
    itemKey: 'p010:text', kind: 'answer', method: 'free-input', outcome: 'correct', hintUsed: false,
    effectiveMethod: 'free-input', delta: 9, localDate: '2026-09-01', sameSessionRepeat: false,
    appVersion: 'test', dataVersion: 1, masteryRulesVersion: 1, ...overrides,
  };
}

function input(overrides: Partial<Parameters<typeof summarizeSession>[0]> = {}) {
  return {
    sessionId: 'session-a', range: { from: 10, to: 12 }, outcomes: [], allEvents: [],
    poemIds: ['p010', 'p011', 'p012'], today: '2026-09-02', ...overrides,
  };
}

test('0問の回に花丸が出ない', () => {
  assert.equal(summarizeSession(input()).allCorrect, false);
});

test('閲覧だけの回に花丸が出ない', () => {
  assert.equal(summarizeSession(input({ allEvents: [event({ outcome: 'viewed', kind: 'view', questionId: undefined })] })).allCorrect, false);
});

test('全問正解の回に花丸が出る', () => {
  assert.equal(summarizeSession(input({ outcomes: [{ poemId: 'p010', kind: 'correct' }] })).allCorrect, true);
});

test('部分正解を含む回に花丸が出ない', () => {
  assert.equal(summarizeSession(input({ outcomes: [{ poemId: 'p010', kind: 'correct' }, { poemId: 'p011', kind: 'partial' }] })).allCorrect, false);
});

test('閲覧記録があっても回答した全問が正答なら花丸が出る', () => {
  const result = summarizeSession(input({
    outcomes: [{ poemId: 'p010', kind: 'correct' }],
    allEvents: [event({ outcome: 'viewed', kind: 'view', questionId: undefined })],
  }));
  assert.equal(result.allCorrect, true);
});

test('5区分の内訳とquestionCountが一致する', () => {
  const result = summarizeSession(input({
    outcomes: [{ poemId: 'p010', kind: 'correct' }, { poemId: 'p011', kind: 'partial' }, { poemId: 'p012', kind: 'needs-review' }, { poemId: 'p012', kind: 'incorrect' }],
    allEvents: [event({ outcome: 'viewed', kind: 'view', questionId: undefined, itemKey: 'p010:view' })],
  }));
  assert.deepEqual(result.breakdown, { viewed: 1, correct: 1, partial: 1, needsReview: 1, incorrect: 1 });
  assert.equal(result.questionCount, result.breakdown.viewed + result.breakdown.correct + result.breakdown.partial + result.breakdown.needsReview + result.breakdown.incorrect);
});

test('閲覧イベントを閲覧の内訳へ入れる', () => {
  assert.equal(summarizeSession(input({ allEvents: [event({ outcome: 'viewed', kind: 'view', questionId: undefined })] })).breakdown.viewed, 1);
});

test('習熟度が回の前後で変化する首だけを返す', () => {
  const result = summarizeSession(input({ allEvents: [event()] }));
  assert.deepEqual(result.changes, [{ poemId: 'p010', before: 0, after: 7.2 }]);
});

test('同じ回以外のイベントは習熟度の前の値に含める', () => {
  const result = summarizeSession(input({ allEvents: [event({ eventId: 'before', sessionId: 'before' }), event()] }));
  assert.deepEqual(result.changes, [{ poemId: 'p010', before: 7.2, after: 14.4 }]);
});

test('複数項目を持つ首の習熟度は本文80pt・作者20ptで配分する', () => {
  const result = summarizeSession(input({ allEvents: [event(), event({ eventId: 'author', questionId: 'q-author', itemKey: 'p010:author', method: 'choice', effectiveMethod: 'choice', delta: 5 })] }));
  assert.equal(result.poems[0].percent, 8);
});

test('作者の問だけを解いた回でも習熟度の変化が出る', () => {
  const result = summarizeSession(input({ allEvents: [event({ itemKey: 'p010:author', method: 'choice', effectiveMethod: 'choice', delta: 5 })] }));
  assert.deepEqual(result.changes, [{ poemId: 'p010', before: 0, after: 1 }]);
});

test('未着手と作者未確認を首の状態へ返す', () => {
  const result = summarizeSession(input({ allEvents: [event()] }));
  assert.deepEqual(
    result.poems.map(({ poemId, untouched, authorUnconfirmed }) => ({ poemId, untouched, authorUnconfirmed })),
    [
      { poemId: 'p010', untouched: false, authorUnconfirmed: true },
      { poemId: 'p011', untouched: true, authorUnconfirmed: true },
      { poemId: 'p012', untouched: true, authorUnconfirmed: true },
    ],
  );
});

test('回に出なかった首の状態はnullになる', () => {
  const result = summarizeSession(input({ outcomes: [{ poemId: 'p010', kind: 'correct' }] }));
  assert.equal(result.poems[1].kind, null);
});

test('首の状態は複数の判定のうち最も弱いものになる', () => {
  const result = summarizeSession(input({ outcomes: [{ poemId: 'p010', kind: 'correct' }, { poemId: 'p010', kind: 'partial' }, { poemId: 'p010', kind: 'needs-review' }] }));
  assert.equal(result.poems[0].kind, 'needs-review');
});

test('再確認には部分正解を含める', () => {
  assert.deepEqual(summarizeSession(input({ outcomes: [{ poemId: 'p011', kind: 'partial' }] })).retryCardNumbers, [11]);
});

test('再確認には正答と閲覧を含めない', () => {
  assert.deepEqual(summarizeSession(input({ outcomes: [{ poemId: 'p010', kind: 'correct' }], allEvents: [event({ outcome: 'viewed', kind: 'view' })] })).retryCardNumbers, []);
});

test('再確認の番号は昇順かつ重複なしになる', () => {
  const result = summarizeSession(input({ outcomes: [{ poemId: 'p012', kind: 'incorrect' }, { poemId: 'p011', kind: 'needs-review' }, { poemId: 'p012', kind: 'partial' }] }));
  assert.deepEqual(result.retryCardNumbers, [11, 12]);
});

test('推薦は検証済みのrecommendNextの結果を返す', () => {
  assert.deepEqual(summarizeSession(input()).recommendation, { poemId: 'p010', tier: 4, reason: 'まだ確認していない歌です', percent: 0 });
});

test('範囲と首の番を保持する', () => {
  const result = summarizeSession(input());
  assert.deepEqual(result.range, { from: 10, to: 12 });
  assert.deepEqual(result.poems.map((poem) => poem.cardNo), [10, 11, 12]);
});
