import test from 'node:test';
import assert from 'node:assert/strict';
import { buildData } from '../../tools/build-data/index.ts';
import { FIXTURE_VALUES, validateData } from '../../tools/build-data/validate.ts';

test('V-04 includes all ten fixed primary-data values', () => {
  assert.equal(FIXTURE_VALUES.length, 10);
  const bad = structuredClone(buildData()); bad.poems[73].ku[2] = 'broken'; bad.poems[73].text = bad.poems[73].ku.join('');
  assert.throws(() => validateData(bad), /V-04/);
});
