import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildData, assertCardAlignment } from '../../tools/build-data/index.ts';
import { parseYaml } from '../../tools/build-data/parse-yaml.ts';
import { validateData } from '../../tools/build-data/validate.ts';

/**
 * Nails what must hold whatever the ledgers currently say, so a legitimate approval
 * (H-04) cannot turn a correct implementation red. The counts themselves move; the
 * relations between the ledger, the tally and the confirmation fields do not.
 */
test('review tallies match the ledgers and every approved row carries its confirmation', () => {
  const data = buildData();
  const candidates = { authors: 100, readings: 100, kugire: 100, layout: 100, blanks: 500 } as const;
  assert.equal(data.layoutHints.length, data.manifest.reviewCounts.layout.approved);
  let approvedSeen = 0;
  for (const name of Object.keys(candidates) as (keyof typeof candidates)[]) {
    const entries = data.review[name] as any[];
    const counts = data.manifest.reviewCounts[name];
    assert.equal(counts.pending + counts.approved + counts.rejected + counts.hold, candidates[name], `${name}: 集計が候補数と合わない`);
    for (const status of ['approved', 'rejected', 'hold'] as const) {
      assert.equal(counts[status], entries.filter((entry) => entry.status === status).length, `${name}: ${status} の数が台帳と合わない`);
    }
    for (const entry of entries.filter((item) => item.status === 'approved')) {
      approvedSeen += 1;
      assert.ok(entry.confirmedBy, `${name} cardNo ${entry.cardNo}: confirmedBy が無い`);
      assert.ok(entry.confirmedOn, `${name} cardNo ${entry.cardNo}: confirmedOn が無い`);
      if (entry.confirmationMode === 'batch') assert.ok(entry.batchEvidenceRef, `${name} cardNo ${entry.cardNo}: batchEvidenceRef が無い`);
    }
  }
  // Without an approved row the confirmation loop above never runs.
  assert.ok(approvedSeen > 0, '承認済みが 0 件では検査にならない');
});

test('V-08 rejects an unconfirmed layout hint', () => {
  const data = buildData();
  const layout = structuredClone(data); layout.layoutHints = [{ cardNo: 1, breaks: [], confirmedBy: null, confirmedOn: null, device: null }]; assert.throws(() => validateData(layout), /V-08: layout cardNo 1/);
});

test('V-09 rejects a kugire entry without displayConvenienceOnly', () => {
  const data = buildData();
  const kugire = structuredClone(data); kugire.review.kugire[0].displayConvenienceOnly = false; assert.throws(() => validateData(kugire), /V-09: kugire cardNo 1/);
});

test('V-10 rejects an alias without an approved author record', () => {
  const data = buildData();
  const alias = structuredClone(data); alias.poems[0].author.aliases = ['未確認別名']; assert.throws(() => validateData(alias), /V-10: authors cardNo 1/);
});

test('V-15 rejects a batch confirmation without evidence', () => {
  const data = buildData();
  const batch = structuredClone(data); batch.review.readings[0].confirmationMode = 'batch'; assert.throws(() => validateData(batch), /V-15: readings cardNo 1/);
});

test('V-16 rejects an AI proposal approved without a confirmer', () => {
  const data = buildData();
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
