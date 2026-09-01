import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, resolveActiveRange } from '../../packages/hyakunin/src/domain/session.ts';

const input = {
  sessionId: 'session-1',
  range: { from: 10, to: 20 },
  entry: 'learn' as const,
  order: 'random' as const,
  seed: 'seed-1',
  startedOn: '2026-09-01',
  questionCount: 11,
};

test('回は呼び出し側から渡された識別子・seed・開始日を保存する', () => {
  assert.deepEqual(createSession(input), {
    sessionId: 'session-1', product: 'hyakunin', from: 10, to: 20, entry: 'learn', order: 'random', seed: 'seed-1',
    startedOn: '2026-09-01', completed: false, questionCount: 11,
  });
});

test('R-11: 学習中にURLだけを変えても現在の回の範囲を維持する', () => {
  const session = createSession(input);
  assert.deepEqual(resolveActiveRange(session, { from: 1, to: 100 }), { from: 10, to: 20 });
});

test('完了した回ではURLの範囲を使う', () => {
  assert.deepEqual(resolveActiveRange({ ...createSession(input), completed: true }, { from: 1, to: 100 }), { from: 1, to: 100 });
});

test('回が無いときはURLの範囲を使う', () => {
  assert.deepEqual(resolveActiveRange(null, { from: 1, to: 100 }), { from: 1, to: 100 });
});
