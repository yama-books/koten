import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCardAlignment, buildData } from '../../tools/build-data/index.ts';
import { validateData } from '../../tools/build-data/validate.ts';

test('V-05, V-06 and V-12 reject broken generated fixtures', () => {
  const data = buildData();
  const badText = structuredClone(data); badText.poems[0].text = 'broken'; assert.throws(() => validateData(badText), /V-05/);
  const badKana = structuredClone(data); badKana.poems[0].reading.modern.ku[0] = '漢字'; assert.throws(() => validateData(badKana), /V-06/);
  const badHash = structuredClone(data); badHash.manifest.sourceHashes[Object.keys(badHash.manifest.sourceHashes)[0]] = '0'.repeat(64); assert.throws(() => validateData(badHash), /V-12/);
});
test('V-03 rejects a broken cross-table card reference', () => {
  const source = Array.from({ length: 100 }, (_, index) => ({ cardNo: index + 1 }));
  const readings = { historical: structuredClone(source), modern: structuredClone(source) };
  readings.modern[50].cardNo = 99;
  assert.throws(() => assertCardAlignment(source, readings), /V-03/);
});
