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

// 種別: 弁別的
test('X-1 client-number: 長さが 20 でない文字列を弾く', () => {
  for (const value of ['', 'a'.repeat(19), 'a'.repeat(21)]) assert.equal(isClientNumber(value), false);
});

// 種別: 弁別的
test('X-2 client-number: [a-z0-9] 以外を含む値と文字列でない値を弾く', () => {
  for (const value of ['A'.repeat(20), `${'a'.repeat(19)}-`, undefined, null, 20, [], { length: 20 }]) {
    assert.equal(isClientNumber(value), false);
  }
});

// 種別: 弁別的
test('AA-5 client-number: 受理範囲内の境界バイト 251 を採用する', () => {
  let calls = 0;
  const random = (length: number) => {
    calls += 1;
    return calls === 1 ? new Uint8Array(length).fill(251) : new Uint8Array(length).fill(7);
  };
  assert.equal(createClientNumber(random), '9'.repeat(CLIENT_NUMBER_LENGTH));
});

// 種別: 弁別的
test('AA-6 client-number: 受理範囲外の境界バイト 252 を捨てる', () => {
  let calls = 0;
  const random = (length: number) => {
    calls += 1;
    return calls === 1 ? new Uint8Array(length).fill(252) : new Uint8Array(length).fill(7);
  };
  assert.equal(createClientNumber(random), 'h'.repeat(CLIENT_NUMBER_LENGTH));
});
