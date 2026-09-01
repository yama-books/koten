import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildData, assertCardAlignment } from '../../tools/build-data/index.ts';
import { parseYaml } from '../../tools/build-data/parse-yaml.ts';
import { validateData } from '../../tools/build-data/validate.ts';

test('review ledgers are parseable skeletons and generated review output stays pending', () => {
  const data = buildData();
  assert.deepEqual(data.layoutHints, []);
  assert.deepEqual(data.manifest.reviewCounts, {
    authors: { pending: 100, approved: 0, rejected: 0, hold: 0 },
    readings: { pending: 100, approved: 0, rejected: 0, hold: 0 },
    kugire: { pending: 100, approved: 0, rejected: 0, hold: 0 },
    layout: { pending: 100, approved: 0, rejected: 0, hold: 0 },
    blanks: { pending: 0, approved: 0, rejected: 0, hold: 0 },
  });
  for (const [name, entries] of Object.entries(data.review)) assert.equal(entries.length, name === 'blanks' ? 0 : 100);
});

test('V-08, V-09, V-10, V-15 and V-16 reject broken review fixtures', () => {
  const data = buildData();
  const layout = structuredClone(data); layout.layoutHints = [{ cardNo: 1, breaks: [], confirmedBy: null, confirmedOn: null, device: null }]; assert.throws(() => validateData(layout), /V-08: layout cardNo 1/);
  const kugire = structuredClone(data); kugire.review.kugire[0].displayConvenienceOnly = false; assert.throws(() => validateData(kugire), /V-09: kugire cardNo 1/);
  const alias = structuredClone(data); alias.poems[0].author.aliases = ['未確認別名']; assert.throws(() => validateData(alias), /V-10: authors cardNo 1/);
  const batch = structuredClone(data); batch.review.readings[0].confirmationMode = 'batch'; assert.throws(() => validateData(batch), /V-15: readings cardNo 1/);
  const ai = structuredClone(data); ai.review.blanks.push({ cardNo: 1, status: 'approved', confirmationMode: 'individual', batchEvidenceRef: null, proposedBy: 'ai', confirmedBy: null, confirmedOn: null, note: null }); assert.throws(() => validateData(ai), /V-16: blanks cardNo 1/);
});

test('V-03 rejects a missing reading row fixture', () => {
  const source = Array.from({ length: 100 }, (_, index) => ({ cardNo: index + 1 }));
  assert.throws(() => assertCardAlignment(source, { historical: source.slice(0, -1), modern: source }), /V-03/);
});

test('limited YAML parser rejects unsupported syntax with source line numbers', () => {
  for (const input of ['value: &anchor thing', 'value: [one, two]', '\tvalue: true', 'value: |\n  multiline']) assert.throws(() => parseYaml(input), /line 1:/);
});

test('primary-source readers stay read-only', () => {
  for (const file of ['parse-poems.ts', 'parse-readings.ts', 'parse-variants.ts']) {
    const source = readFileSync(new URL(`../../tools/build-data/${file}`, import.meta.url), 'utf8');
    assert.match(source, /readFileSync/);
    assert.doesNotMatch(source, /writeFileSync|appendFileSync|createWriteStream|openSync/);
  }
});
