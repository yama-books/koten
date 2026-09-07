import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildData } from '../../tools/build-data/index.ts';
import { serialize } from '../../tools/build-data/emit.ts';
import { readReviewLedgers } from '../../tools/build-data/apply-review.ts';
import { emitLedger, type LedgerEntry } from '../../tools/review-approve/emit-yaml.ts';

/**
 * 台帳は試験の中で組み立て、一時ディレクトリへ書く（発注071 §7.5.2 の裁定）。
 * `review/` の実ファイルは1行も読まない——読むと、`tools/review-approve` で1件承認するという
 * 正規の運用が、正しい実装のまま3本を赤にする。
 * 組み立てた台帳は本番の emitLedger・parse-yaml・validate.ts を必ず通るので、台帳の形が変われば
 * ここが赤くなって露見する。
 */
const CARDS = 100;
const KU_PER_CARD = 5;
/** layout だけは approved と pending を両方入れる。片方だけだと、絞り込みを入れ替えても釘3が赤くならない。 */
const layoutApproved = (cardNo: number) => cardNo % 2 === 1;
const cards = Array.from({ length: CARDS }, (_, index) => index + 1);
const confirmed = { confirmedBy: 'test-reviewer', confirmedOn: '2026-09-07' };

function entry(cardNo: number, approved: boolean, extra: LedgerEntry = {}): LedgerEntry {
  return { cardNo, status: approved ? 'approved' : 'pending', confirmationMode: 'individual', batchEvidenceRef: null,
    proposedBy: 'human', confirmedBy: approved ? confirmed.confirmedBy : null, confirmedOn: approved ? confirmed.confirmedOn : null, note: null, ...extra };
}

function buildLedgers(): Map<string, LedgerEntry[]> {
  return new Map([
    ['authors', cards.map((cardNo) => ({ ...entry(cardNo, true), aliases: [] }))],
    ['readings', cards.map((cardNo) => entry(cardNo, false))],
    ['kugire', cards.map((cardNo) => entry(cardNo, false, { breaks: [], displayConvenienceOnly: true }))],
    // layout の pending 行にも確認欄を持たせる。null のままだと、絞り込みを pending へ入れ替えたとき
    // V-08（hint に confirmedBy が無い）が先に落ちて buildData ごと死に、3本とも赤くなる——
    // それでは「approved を選んでいること」を釘3が単独で押さえているか測れない。
    ['layout', cards.map((cardNo) => ({ ...entry(cardNo, layoutApproved(cardNo), { breaks: [], device: null }), ...confirmed }))],
    ['blanks', cards.flatMap((cardNo) => Array.from({ length: KU_PER_CARD }, (_, index) => ({ ...entry(cardNo, true), ku: index + 1 })))],
  ]);
}

function writeLedgers(directory: string, ledgers: Map<string, LedgerEntry[]>) {
  for (const [name, entries] of ledgers) writeFileSync(path.join(directory, `${name}.yaml`), emitLedger(name, entries), 'utf8');
}

function withLedgers(run: (directory: string, rewrite: (change: (ledgers: Map<string, LedgerEntry[]>) => void) => void) => void) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'koten-review-ledger-contract-'));
  try {
    writeLedgers(directory, buildLedgers());
    const parsed = readReviewLedgers(directory);
    assert.equal(parsed.authors.length, CARDS, 'authors ledger must be built for 100 cards');
    assert.equal(parsed.readings.length, CARDS, 'readings ledger must be built for 100 cards');
    assert.equal(parsed.kugire.length, CARDS, 'kugire ledger must be built for 100 cards');
    assert.equal(parsed.layout.length, CARDS, 'layout ledger must be built for 100 cards');
    assert.equal(parsed.blanks.length, CARDS * KU_PER_CARD, 'blanks ledger must be built for 500 candidates');
    const approved = parsed.layout.filter((item) => item.status === 'approved').length;
    assert.ok(approved > 0 && approved < CARDS, 'layout ledger must hold both approved and pending rows, or the approved filter cannot be nailed');
    run(directory, (change) => { const ledgers = buildLedgers(); change(ledgers); writeLedgers(directory, ledgers); });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function approveAll(ledgers: Map<string, LedgerEntry[]>, name: 'readings' | 'kugire') {
  const entries = ledgers.get(name)!;
  assert.equal(entries.filter((item) => item.status === 'pending').length, CARDS, `${name} ledger must start out fully pending`);
  ledgers.set(name, entries.map((item) => ({ ...item, status: 'approved', ...confirmed })));
}

test('読み台帳を全件承認しても reading.status を含む poems.json は変わらない', () => {
  withLedgers((directory, rewrite) => {
    const baseline = buildData(directory);
    rewrite((ledgers) => approveAll(ledgers, 'readings'));
    assert.equal(serialize(buildData(directory).poems), serialize(baseline.poems));
  });
});

test('句切れ台帳を全件承認しても出力データには届かない', () => {
  withLedgers((directory, rewrite) => {
    const baseline = buildData(directory);
    assert.ok(baseline.questionsBlank.length > 0 && baseline.questionsAuthor.length > 0, 'question fixtures must not be empty, or these comparisons prove nothing');
    assert.ok(baseline.layoutHints.length > 0, 'layout hints must not be empty, or this comparison proves nothing');
    rewrite((ledgers) => approveAll(ledgers, 'kugire'));
    const changed = buildData(directory);
    assert.equal(serialize(changed.poems), serialize(baseline.poems));
    assert.equal(serialize(changed.questionsBlank), serialize(baseline.questionsBlank));
    assert.equal(serialize(changed.questionsAuthor), serialize(baseline.questionsAuthor));
    assert.equal(serialize(changed.layoutHints), serialize(baseline.layoutHints));
  });
});

test('layout 台帳は approved の行だけが layout-hints.json へ出る', () => {
  const pending = cards.filter((cardNo) => !layoutApproved(cardNo));
  withLedgers((directory, rewrite) => {
    const baseline = buildData(directory);
    assert.deepEqual(baseline.layoutHints.map((hint: { cardNo: number }) => hint.cardNo), cards.filter(layoutApproved));
    rewrite((ledgers) => {
      const entries = ledgers.get('layout')!;
      const target = entries.find((item) => item.cardNo === pending[0])!;
      assert.equal(target.status, 'pending', 'the row approved by this test must start out pending');
      Object.assign(target, { status: 'approved', ...confirmed });
    });
    const changed = buildData(directory);
    assert.notEqual(serialize(changed.layoutHints), serialize(baseline.layoutHints));
    assert.deepEqual(changed.layoutHints.map((hint: { cardNo: number }) => hint.cardNo), [...cards.filter(layoutApproved), pending[0]].sort((left, right) => left - right));
  });
});
