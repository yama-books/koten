import test from 'node:test';
import assert from 'node:assert/strict';
import { CLIENT_NUMBER_LENGTH, createClientNumber, isClientNumber } from '../../../packages/shared/src/telemetry/client-number.ts';

function bytes(value: number): (length: number) => Uint8Array {
  return (length) => new Uint8Array(length).fill(value);
}

// 種別: 弁別的
test('W-15 client-number: 異なるバイト列からは異なる番号が出る', () => {
  assert.notEqual(createClientNumber(bytes(0)), createClientNumber(bytes(1)));
});

// 種別: 固定ピン
test('W-16 client-number: 同じバイト列からは同じ番号が出る', () => {
  assert.equal(createClientNumber(bytes(7)), createClientNumber(bytes(7)));
});

// 種別: 固定ピン
test('W-17 client-number: 20 文字の [a-z0-9] である', () => {
  const number = createClientNumber(bytes(35));
  assert.equal(number.length, CLIENT_NUMBER_LENGTH);
  assert.equal(isClientNumber(number), true);
});

// 種別: 弁別的
test('W-18 client-number: 範囲外のバイトは捨てられ、出力に現れない', () => {
  let calls = 0;
  const random = (length: number) => {
    calls += 1;
    return calls === 1 ? new Uint8Array(length).fill(255) : new Uint8Array(length).fill(7);
  };
  assert.equal(createClientNumber(random), 'h'.repeat(CLIENT_NUMBER_LENGTH));
});

// 種別: 固定ピン
test('W-19 client-number: 同じ乱数なら時間が経っても同じ番号になる', () => {
  const first = createClientNumber(bytes(12));
  const second = createClientNumber(bytes(12));
  assert.equal(first, second);
});
