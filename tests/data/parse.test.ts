import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePipeTable, assertCardNumbers } from '../../tools/build-data/parse-table.ts';

test('V-02 rejects wrong column count and empty cells', () => {
  assert.throws(() => parsePipeTable('| # | A |\n|---|---|\n| 1 | |', 2), /empty/);
  assert.throws(() => parsePipeTable('| # | A |\n|---|---|\n| 1 | x | y |', 2), /expected 2/);
});
test('V-01 rejects a missing card number', () => assert.throws(() => assertCardNumbers(Array.from({ length: 99 }, (_, i) => [String(i + 1)]), 'fixture'), /V-01/));
test('parser crosses a blank-line continuation block', () => {
  const table = parsePipeTable('| # | A |\n|---|---|\n| 1 | a |\n\n| 2 | b |', 2);
  assert.equal(table.rows.length, 2);
});
