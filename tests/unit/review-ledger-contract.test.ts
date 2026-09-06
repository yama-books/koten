import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildData } from '../../tools/build-data/index.ts';
import { serialize } from '../../tools/build-data/emit.ts';
import { readReviewLedgers } from '../../tools/build-data/apply-review.ts';
import { paths } from '../../tools/build-data/paths.ts';

const ledgerNames = ['authors', 'readings', 'kugire', 'layout', 'blanks'] as const;

function withReviewDirectory(run: (directory: string) => void) {
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'koten-review-ledger-contract-'));
  try {
    const files = new Map(ledgerNames.map((name) => [name, readFileSync(paths.reviewFile(paths.review, name), 'utf8')]));
    const layout = files.get('layout')!;
    assert.equal((layout.match(/^    confirmedBy: null$/gm) ?? []).length, 100, 'layout fixture must have 100 rows');
    assert.equal((layout.match(/^    confirmedOn: null$/gm) ?? []).length, 100, 'layout fixture must have 100 rows');
    files.set('layout', layout.replace(/^    confirmedBy: null$/gm, '    confirmedBy: test-reviewer').replace(/^    confirmedOn: null$/gm, '    confirmedOn: 2026-09-07'));
    for (const name of ledgerNames) writeFileSync(paths.reviewFile(temporary, name), files.get(name)!);
    run(temporary);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function changeLedgers(directory: string, change: (files: Map<string, string>) => void) {
  const files = new Map(ledgerNames.map((name) => [name, readFileSync(paths.reviewFile(directory, name), 'utf8')]));
  change(files);
  for (const name of ledgerNames) writeFileSync(paths.reviewFile(directory, name), files.get(name)!);
}

function approveAll(files: Map<string, string>, name: 'readings' | 'kugire') {
  const original = files.get(name)!;
  const replacements = (original.match(/^    status: pending$/gm) ?? []).length;
  assert.equal(replacements, 100, `${name} ledger must have 100 pending entries before this contract can run`);
  let approved = original.replace(/^    status: pending$/gm, '    status: approved');
  if (name === 'kugire') approved = approved.replace(/^    confirmedBy: null$/gm, '    confirmedBy: test-reviewer').replace(/^    confirmedOn: null$/gm, '    confirmedOn: 2026-09-07');
  files.set(name, approved);
}

test('読み台帳を全件承認しても reading.status を含む poems.json は変わらない', () => {
  withReviewDirectory((directory) => {
    assert.equal(readReviewLedgers(directory).readings.length, 100, 'readings ledger must not be empty');
    const baseline = buildData(directory);
    changeLedgers(directory, (files) => approveAll(files, 'readings'));
    assert.equal(serialize(buildData(directory).poems), serialize(baseline.poems));
  });
});

test('句切れ台帳を全件承認しても出力データには届かない', () => {
  withReviewDirectory((directory) => {
    assert.equal(readReviewLedgers(directory).kugire.length, 100, 'kugire ledger must not be empty');
    const baseline = buildData(directory);
    changeLedgers(directory, (files) => approveAll(files, 'kugire'));
    const changed = buildData(directory);
    assert.equal(serialize(changed.poems), serialize(baseline.poems));
    assert.equal(serialize(changed.questionsBlank), serialize(baseline.questionsBlank));
    assert.equal(serialize(changed.questionsAuthor), serialize(baseline.questionsAuthor));
    assert.equal(serialize(changed.layoutHints), serialize(baseline.layoutHints));
  });
});

test('layout 台帳を1件承認すると layout-hints.json は変わる', () => {
  withReviewDirectory((directory) => {
    assert.equal(readReviewLedgers(directory).layout.length, 100, 'layout ledger must not be empty');
    const baseline = buildData(directory);
    changeLedgers(directory, (files) => {
      const original = files.get('layout')!;
      assert.equal((original.match(/^    status: pending$/gm) ?? []).length, 100, 'layout ledger must have 100 pending entries before this contract can run');
      files.set('layout', original.replace(/^    status: pending$/m, '    status: approved'));
    });
    const changed = buildData(directory);
    assert.notEqual(serialize(changed.layoutHints), serialize(baseline.layoutHints));
  });
});
