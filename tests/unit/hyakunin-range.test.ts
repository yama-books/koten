import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkProgress, nextChunkIndex, normalizeRange, parseRange, splitIntoChunks } from '../../packages/hyakunin/src/domain/range.ts';

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

test('20首は一つのまとまりにする', () => {
  assert.deepEqual(splitIntoChunks({ from: 1, to: 20 }), [Array.from({ length: 20 }, (_, index) => index + 1)]);
});

test('21首は20首と1首に分割する', () => {
  assert.deepEqual(splitIntoChunks({ from: 1, to: 21 }), [Array.from({ length: 20 }, (_, index) => index + 1), [21]]);
});

test('100首は20首ずつ五つのまとまりに分割する', () => {
  assert.deepEqual(splitIntoChunks({ from: 1, to: 100 }).map((chunk) => chunk.length), [20, 20, 20, 20, 20]);
});

test('1首は一つのまとまりにする', () => {
  assert.deepEqual(splitIntoChunks({ from: 42, to: 42 }), [[42]]);
});

test('まとまりの進捗は範囲全体の未確認数とまとまり情報を返す', () => {
  assert.deepEqual(chunkProgress({ from: 1, to: 20 }, 0, new Set([1, 2])), {
    remainingInRange: 18,
    chunkIndex: 0,
    chunkCount: 1,
  });
});

test('次回は未確認の番が最も多いまとまりを優先する', () => {
  assert.equal(nextChunkIndex({ from: 1, to: 40 }, new Set(Array.from({ length: 20 }, (_, index) => index + 1))), 1);
});

test('未確認数が同数または全確認なら先頭のまとまりを選ぶ', () => {
  assert.equal(nextChunkIndex({ from: 1, to: 40 }, new Set()), 0);
  assert.equal(nextChunkIndex({ from: 1, to: 40 }, new Set(Array.from({ length: 40 }, (_, index) => index + 1))), 0);
});
