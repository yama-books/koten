import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildData } from '../../tools/build-data/index.ts';
import { emit } from '../../tools/build-data/emit.ts';
import { assertGeneratedCurrent } from '../../tools/build-data/validate.ts';

test('V-11 emits byte-identical output and V-14 detects hand edits', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'koten-data-'));
  const data = buildData(); emit(directory, data);
  const first = readFileSync(path.join(directory, 'poems.json'), 'utf8'); emit(directory, data);
  assert.equal(readFileSync(path.join(directory, 'poems.json'), 'utf8'), first);
  writeFileSync(path.join(directory, 'poems.json'), '{}');
  assert.throws(() => assertGeneratedCurrent(data, directory), /V-14/);
});
