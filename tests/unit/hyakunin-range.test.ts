import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRange, parseRange } from '../../packages/hyakunin/src/domain/range.ts';

test('範囲URLは両端を含み、逆順を正規化する', () => {
  assert.deepEqual(parseRange('?from=20&to=10'), { from: 10, to: 20, hadInvalidQuery: false });
  assert.deepEqual(parseRange('?from=12'), { from: 12, to: 12, hadInvalidQuery: false });
  assert.deepEqual(parseRange('?to=8'), { from: 1, to: 8, hadInvalidQuery: false });
});

test('不正な範囲URLは1〜100へ安全に戻る', () => {
  assert.deepEqual(parseRange('?from=0&to=101'), { from: 1, to: 100, hadInvalidQuery: true });
  assert.deepEqual(parseRange('?from=abc'), { from: 1, to: 100, hadInvalidQuery: true });
});

test('画面入力の逆順と範囲外を正規化する', () => {
  assert.deepEqual(normalizeRange(30, 10), { from: 10, to: 30 });
  assert.deepEqual(normalizeRange(0, 101), { from: 1, to: 100 });
});
