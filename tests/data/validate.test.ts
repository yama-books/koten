import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCardAlignment, buildData } from '../../tools/build-data/index.ts';
import { validateData } from '../../tools/build-data/validate.ts';

test('V-01 rejects a poem count other than 100', () => {
  const data = buildData();
  const badCount = structuredClone(data); badCount.poems = badCount.poems.slice(0, -1);
  assert.throws(() => validateData(badCount), /V-01: expected 100 poems/);
});

test('V-01 rejects duplicated or out-of-order card numbers', () => {
  const data = buildData();
  const duplicate = structuredClone(data); duplicate.poems[1].cardNo = duplicate.poems[0].cardNo;
  assert.throws(() => validateData(duplicate), /V-01/);
  const outOfOrder = structuredClone(data); [outOfOrder.poems[0].cardNo, outOfOrder.poems[1].cardNo] = [outOfOrder.poems[1].cardNo, outOfOrder.poems[0].cardNo];
  assert.throws(() => validateData(outOfOrder), /V-01/);
});

test('V-02 rejects a poem with a missing or short ku', () => {
  const data = buildData();
  const shortKu = structuredClone(data); shortKu.poems[0].ku = shortKu.poems[0].ku.slice(0, 4);
  assert.throws(() => validateData(shortKu), /V-02/);
  const missingKu = structuredClone(data); missingKu.poems[0].ku[0] = '';
  assert.throws(() => validateData(missingKu), /V-02/);
});

test('V-05 rejects text that does not match its ku', () => {
  const data = buildData();
  const badText = structuredClone(data); badText.poems[0].text = 'broken'; assert.throws(() => validateData(badText), /V-05/);
});

test('V-06 rejects a reading containing non-kana', () => {
  const data = buildData();
  const badKana = structuredClone(data); badKana.poems[0].reading.modern.ku[0] = '漢字'; assert.throws(() => validateData(badKana), /V-06/);
});

test('V-12 rejects a source hash mismatch', () => {
  const data = buildData();
  const badHash = structuredClone(data); badHash.manifest.sourceHashes[Object.keys(badHash.manifest.sourceHashes)[0]] = '0'.repeat(64); assert.throws(() => validateData(badHash), /V-12/);
});
test('V-03 rejects a broken cross-table card reference', () => {
  const source = Array.from({ length: 100 }, (_, index) => ({ cardNo: index + 1 }));
  const readings = { historical: structuredClone(source), modern: structuredClone(source) };
  readings.modern[50].cardNo = 99;
  assert.throws(() => assertCardAlignment(source, readings), /V-03/);
});
