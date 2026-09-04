import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildData } from '../../tools/build-data/index.ts';
import { readReviewLedgers } from '../../tools/build-data/apply-review.ts';
import { parseYaml } from '../../tools/build-data/parse-yaml.ts';
import { validateData } from '../../tools/build-data/validate.ts';
import { emitLedger, emitScalar, type LedgerEntry } from '../../tools/review-approve/emit-yaml.ts';
import { validateBeforeWrite } from '../../tools/review-approve/index.ts';
import { planSeed, planSet, type BlankCandidate } from '../../tools/review-approve/plan.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reviewRoot = path.join(root, 'review');
const cli = path.join(root, 'tools', 'review-approve', 'index.ts');
const names = ['authors', 'readings', 'kugire', 'layout', 'blanks'];

function fixture() { const directory = mkdtempSync(path.join(os.tmpdir(), 'koten-review-approve-test-')); cpSync(reviewRoot, directory, { recursive: true }); return directory; }
function dispose(directory: string) { rmSync(directory, { recursive: true, force: true }); }
function candidates(directory: string): BlankCandidate[] { return buildData(directory).poems.flatMap((poem: any) => poem.ku.map((_: string, index: number) => ({ cardNo: poem.cardNo, ku: index + 1 }))); }
function invoke(directory: string, args: string[]) { return spawnSync(process.execPath, ['--experimental-strip-types', cli, ...args, '--dir', directory], { encoding: 'utf8' }); }
function blankHash(directory: string) { return readFileSync(path.join(directory, 'blanks.yaml'), 'utf8'); }
/** The tool tests must not depend on how much of the live ledger happens to be approved. */
function emptyBlanks(directory: string) { writeFileSync(path.join(directory, 'blanks.yaml'), emitLedger('blanks', [])); return directory; }
function seed(directory: string) { return planSeed('blanks', candidates(directory), readReviewLedgers(directory).blanks); }
function approvedFields() { return ['--status', 'approved', '--mode', 'individual', '--proposed-by', 'human', '--confirmed-by', 'reviewer', '--confirmed-on', '2026-09-01']; }

test('emitScalar leaves parser-safe strings unquoted', () => { assert.equal(emitScalar('pending'), 'pending'); assert.equal(emitScalar(7), '7'); assert.equal(emitScalar(null), 'null'); });

test('emitScalar quotes bracket and colon strings for the limited parser', () => {
  for (const value of ['[bracket]', 'has: colon']) assert.equal(parseYaml(`value: ${emitScalar(value)}\n`).value, value);
  assert.throws(() => emitScalar('has # marker'), /cannot safely quote/);
});

test('emitLedger emits an empty entries list that parses back', () => { assert.deepEqual(parseYaml(emitLedger('blanks', [])), { version: 1, entries: [] }); });

test('all five emitted ledgers round-trip through parseYaml', () => {
  const directory = fixture();
  try { for (const name of names) { const entries = readReviewLedgers(directory)[name as keyof ReturnType<typeof readReviewLedgers>]; assert.deepEqual(parseYaml(emitLedger(name, entries)), { version: 1, entries }); } } finally { dispose(directory); }
});

test('seed adds every generated candidate as pending without opening public questions', () => {
  const directory = emptyBlanks(fixture());
  try {
    const plan = seed(directory); assert.equal(plan.entries.length, candidates(directory).length, '台帳が空では検査にならない');
    assert.equal(plan.entries.filter((entry) => entry.status !== 'pending').length, 0);
    writeFileSync(path.join(directory, 'blanks.yaml'), emitLedger('blanks', plan.entries));
    const data = buildData(directory); assert.equal(data.questionsBlank.length, 0);
    assert.deepEqual(data.manifest.reviewCounts.blanks, { pending: plan.entries.length, approved: 0, rejected: 0, hold: 0 });
  } finally { dispose(directory); }
});

test('seed preserves an existing blank row unchanged', () => {
  const directory = fixture();
  try { const existing: LedgerEntry = { cardNo: 1, ku: 1, status: 'hold', confirmationMode: 'individual', batchEvidenceRef: null, proposedBy: 'human', confirmedBy: 'reviewer', confirmedOn: '2026-09-01', note: null }; const plan = planSeed('blanks', candidates(directory), [existing]); assert.deepEqual(plan.entries.find((entry) => entry.cardNo === 1 && entry.ku === 1), existing); assert.equal(plan.added.length, candidates(directory).length - 1); } finally { dispose(directory); }
});

test('a second seed has no additions or changes', () => {
  const directory = fixture();
  try { const first = seed(directory); writeFileSync(path.join(directory, 'blanks.yaml'), emitLedger('blanks', first.entries)); const second = seed(directory); assert.equal(second.added.length, 0); assert.equal(second.changed.length, 0); } finally { dispose(directory); }
});

test('a second equivalent set has no changes', () => {
  const directory = fixture();
  try { const first = seed(directory); const fields = { status: 'approved', confirmationMode: 'individual', proposedBy: 'human', confirmedBy: 'reviewer', confirmedOn: '2026-09-01', batchEvidenceRef: null }; const changed = planSet('blanks', { cards: [1] }, fields, first.entries); assert.ok(!('missing' in changed)); const second = planSet('blanks', { cards: [1] }, fields, changed.entries); assert.ok(!('missing' in second)); assert.equal(second.added.length, 0); assert.equal(second.changed.length, 0); } finally { dispose(directory); }
});

test('planSet rejects an invalid status', () => { const result = planSet('blanks', { cards: [1] }, { status: 'unsafe', confirmationMode: 'individual', proposedBy: 'human', confirmedBy: 'reviewer', confirmedOn: '2026-09-01', batchEvidenceRef: null }, []); assert.deepEqual(result, { missing: ['status'] }); });

test('planSet rejects a missing confirmation date independently', () => { const result = planSet('blanks', { cards: [1] }, { status: 'approved', confirmationMode: 'individual', proposedBy: 'human', confirmedBy: 'reviewer', confirmedOn: null, batchEvidenceRef: null }, []); assert.deepEqual(result, { missing: ['confirmedOn'] }); });

test('planSet accepts pending rows with null confirmation values', () => { const result = planSet('blanks', { cards: [1] }, { status: 'pending', confirmationMode: 'individual', proposedBy: 'human', confirmedBy: null, confirmedOn: null, batchEvidenceRef: null }, []); assert.ok(!('missing' in result)); });

test('dry-run does not write the ledger', () => {
  const directory = fixture();
  try { const before = blankHash(directory); const result = invoke(directory, ['seed', '--ledger', 'blanks']); assert.equal(result.status, 0, result.stderr); assert.equal(blankHash(directory), before); } finally { dispose(directory); }
});

test('CLI rejects missing confirmer without writing', () => {
  const directory = fixture();
  try { invoke(directory, ['seed', '--ledger', 'blanks', '--write']); const before = blankHash(directory); const result = invoke(directory, ['set', '--ledger', 'blanks', '--cards', '1', '--status', 'approved', '--mode', 'individual', '--proposed-by', 'human', '--confirmed-on', '2026-09-01', '--write']); assert.equal(result.status, 1); assert.match(result.stderr, /confirmedBy/); assert.equal(blankHash(directory), before); } finally { dispose(directory); }
});

test('CLI rejects missing confirmation date without writing', () => {
  const directory = fixture();
  try { invoke(directory, ['seed', '--ledger', 'blanks', '--write']); const before = blankHash(directory); const result = invoke(directory, ['set', '--ledger', 'blanks', '--cards', '1', '--status', 'approved', '--mode', 'individual', '--proposed-by', 'human', '--confirmed-by', 'reviewer', '--write']); assert.equal(result.status, 1); assert.match(result.stderr, /confirmedOn/); assert.equal(blankHash(directory), before); } finally { dispose(directory); }
});

test('CLI rejects a batch without evidence before V-15-invalid YAML is written', () => {
  const directory = emptyBlanks(fixture());
  try { invoke(directory, ['seed', '--ledger', 'blanks', '--write']); const before = blankHash(directory); const result = invoke(directory, ['set', '--ledger', 'blanks', '--cards', '1', '--status', 'approved', '--mode', 'batch', '--proposed-by', 'human', '--confirmed-by', 'reviewer', '--confirmed-on', '2026-09-01', '--write']); assert.equal(result.status, 1); assert.match(result.stderr, /不足: batchEvidenceRef/); assert.equal(blankHash(directory), before); const broken = buildData(directory); broken.review.blanks[0].confirmationMode = 'batch'; assert.throws(() => validateData(broken), /V-15/); } finally { dispose(directory); }
});

test('approved rows open the question gate and become human-confirmed', () => {
  const directory = fixture();
  try { assert.equal(invoke(directory, ['seed', '--ledger', 'blanks', '--write']).status, 0); const result = invoke(directory, ['set', '--ledger', 'blanks', '--cards', '1', ...approvedFields(), '--write']); assert.equal(result.status, 0, result.stderr); const data = buildData(directory); assert.equal(data.review.blanks.filter((entry: any) => entry.cardNo === 1 && entry.status === 'approved').length, 5); assert.ok(data.questionsBlank.length > 0); assert.ok(data.questionsBlank.every((question: any) => question.reviewStatus === 'human-confirmed')); } finally { dispose(directory); }
});

test('batch approval with evidence passes validation and records its evidence', () => {
  const directory = fixture();
  try { invoke(directory, ['seed', '--ledger', 'blanks', '--write']); const result = invoke(directory, ['set', '--ledger', 'blanks', '--cards', '2', '--status', 'approved', '--mode', 'batch', '--proposed-by', 'human', '--confirmed-by', 'reviewer', '--confirmed-on', '2026-09-01', '--evidence', 'record-1', '--write']); assert.equal(result.status, 0, result.stderr); const data = buildData(directory); assert.equal(data.review.blanks.filter((entry: any) => entry.cardNo === 2 && entry.batchEvidenceRef === 'record-1').length, 5); } finally { dispose(directory); }
});

test('set rows are ordered by card number then ku regardless of input order', () => {
  const existing = [{ cardNo: 2, ku: 2, status: 'pending' }, { cardNo: 1, ku: 5, status: 'pending' }, { cardNo: 1, ku: 1, status: 'pending' }]; const result = planSet('blanks', { cards: [2, 1] }, { status: 'pending', confirmationMode: 'individual', proposedBy: 'human', confirmedBy: null, confirmedOn: null, batchEvidenceRef: null }, existing); assert.ok(!('missing' in result)); assert.deepEqual(result.entries.map((entry) => [entry.cardNo, entry.ku]), [[1, 1], [1, 5], [2, 2]]);
});

test('an emitted ledger that does not round-trip to the planned structure is rejected before writing', () => {
  const directory = fixture();
  try { const before = blankHash(directory); assert.throws(() => validateBeforeWrite(directory, 'blanks', seed(directory).entries, () => 'version: 1\nentries: []\n'), /did not round-trip/); assert.equal(blankHash(directory), before); } finally { dispose(directory); }
});

test('seed follows the supplied candidate list rather than a fixed candidate count', () => {
  const candidates = [{ cardNo: 9, ku: 5 }, { cardNo: 2, ku: 3 }]; const plan = planSeed('blanks', candidates, []); assert.deepEqual(plan.entries.map((entry) => [entry.cardNo, entry.ku]), [[2, 3], [9, 5]]);
});
