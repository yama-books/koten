import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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

function rewriteManifest(directory: string, update: (manifest: Record<string, any>) => void) {
  const file = path.join(directory, 'manifest.json');
  const manifest = JSON.parse(readFileSync(file, 'utf8')) as Record<string, any>;
  update(manifest);
  writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

test('V-14 ignores only a changed manifest generatedOn date', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'koten-data-'));
  const data = buildData(); emit(directory, data);
  rewriteManifest(directory, (manifest) => { manifest.generatedOn = '1999-01-01'; });
  assert.doesNotThrow(() => assertGeneratedCurrent(data, directory));
});

test('V-14 detects a manifest counts change', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'koten-data-'));
  const data = buildData(); emit(directory, data);
  rewriteManifest(directory, (manifest) => { manifest.counts.poems = 99; });
  assert.throws(() => assertGeneratedCurrent(data, directory), /field differs: counts/);
});

test('V-14 requires manifest generatedOn', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'koten-data-'));
  const data = buildData(); emit(directory, data);
  rewriteManifest(directory, (manifest) => { delete manifest.generatedOn; });
  assert.throws(() => assertGeneratedCurrent(data, directory), /generatedOn is missing/);
});

test('V-14 keeps poems.json as a full-content comparison', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'koten-data-'));
  const data = buildData(); emit(directory, data);
  const file = path.join(directory, 'poems.json');
  const content = readFileSync(file, 'utf8');
  writeFileSync(file, `${content.slice(0, -2)}X}\n`);
  assert.throws(() => assertGeneratedCurrent(data, directory), /poems\.json \(content differs\)/);
});

test('V-14 detects a missing generated file', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'koten-data-'));
  const data = buildData(); emit(directory, data);
  const missingFile = path.join(directory, 'poems.json');
  const missingFileName = path.basename(missingFile);
  // Leave the temporary fixture incomplete to exercise the missing-file branch.
  unlinkSync(missingFile);
  assert.throws(() => assertGeneratedCurrent(data, directory), new RegExp(`V-14: stale generated file ${missingFileName} \\(file is missing\\)`));
});
