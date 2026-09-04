import test from 'node:test';
import assert from 'node:assert/strict';
import { canChangeOrder, createSeed, orderCardNumbers } from '../../packages/hyakunin/src/domain/order.ts';

test('seedは呼び出し側の乱数源から決定的に作る', () => {
  const randomSource = (() => {
    const values = [0.25, 0.5];
    return () => values.shift() ?? 0;
  })();
  assert.equal(createSeed(randomSource), 'hra0hs-zik0zk');
});

test('番号順は入力順に関係なく昇順にする', () => {
  assert.deepEqual(orderCardNumbers([3, 1, 2], 'number', 'seed-a'), [1, 2, 3]);
});

test('同一seedのランダム順は再現する', () => {
  const cardNumbers = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(orderCardNumbers(cardNumbers, 'random', 'seed-a'), orderCardNumbers(cardNumbers, 'random', 'seed-a'));
});

test('別seedのランダム順は変わる', () => {
  const cardNumbers = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.notDeepEqual(orderCardNumbers(cardNumbers, 'random', 'seed-a'), orderCardNumbers(cardNumbers, 'random', 'seed-b'));
});

test('ランダム順は入力の要素を過不足なく並べ替える', () => {
  const cardNumbers = [4, 1, 3, 2];
  const ordered = orderCardNumbers(cardNumbers, 'random', 'seed-a');
  assert.deepEqual([...ordered].sort((left, right) => left - right), [1, 2, 3, 4]);
  assert.deepEqual(cardNumbers, [4, 1, 3, 2]);
});

test('区切りでは順序を切り替えられる', () => {
  assert.equal(canChangeOrder({ questionIndexInChunk: 0 }), true);
});

test('まとまりの途中では順序を切り替えられない', () => {
  assert.equal(canChangeOrder({ questionIndexInChunk: 1 }), false);
});
