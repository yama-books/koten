import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildData } from '../build-data/index.ts';
import { readReviewLedgers } from '../build-data/apply-review.ts';
import { parseYaml } from '../build-data/parse-yaml.ts';
import { paths } from '../build-data/paths.ts';
import { validateData } from '../build-data/validate.ts';
import { emitLedger, type LedgerEntry } from './emit-yaml.ts';
import { describePlan, planSeed, planSet, type BlankCandidate, type Plan, type SetFields } from './plan.ts';

const ledgerNames = ['authors', 'readings', 'kugire', 'layout', 'blanks'] as const;
type LedgerName = typeof ledgerNames[number];

function option(args: string[], name: string) { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; }
function parseCards(value: string | undefined) {
  if (!value) return [];
  return value.split(',').flatMap((part) => { const match = /^(\d+)(?:-(\d+))?$/.exec(part); if (!match) throw new Error(`invalid --cards value: ${part}`); const first = Number(match[1]), last = Number(match[2] ?? match[1]); if (last < first) throw new Error(`invalid --cards range: ${part}`); return Array.from({ length: last - first + 1 }, (_, index) => first + index); });
}
function deepEqual(left: unknown, right: unknown) { return JSON.stringify(left) === JSON.stringify(right); }
function isPlan(value: Plan | { missing: string[] }): value is Plan { return !('missing' in value); }

export function validateBeforeWrite(directory: string, name: LedgerName, entries: LedgerEntry[], emit: (name: string, entries: LedgerEntry[]) => string = emitLedger) {
  const text = emit(name, entries);
  const parsed = parseYaml(text);
  if (!deepEqual(parsed, { version: 1, entries })) throw new Error('emitted YAML did not round-trip through parseYaml');
  const files = new Map(ledgerNames.map((ledger) => [ledger, ledger === name ? text : readFileSync(paths.reviewFile(directory, ledger), 'utf8')]));
  const temporary = mkdtempSync(path.join(os.tmpdir(), 'koten-review-approve-'));
  try {
    for (const ledger of ledgerNames) writeFileSync(path.join(temporary, `${ledger}.yaml`), files.get(ledger)!);
    const data = buildData(temporary); validateData(data);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
  return text;
}

export function run(args: string[], output: (line: string) => void = console.log) {
  const command = args[0]; const directory = option(args, '--dir'); const name = option(args, '--ledger') as LedgerName | undefined;
  if ((command !== 'seed' && command !== 'set') || !directory || !name || !ledgerNames.includes(name)) throw new Error('usage: seed|set --ledger <name> --dir <directory> [--write]');
  const ledgers = readReviewLedgers(directory); let plan: Plan | { missing: string[] };
  if (command === 'seed') {
    const current = buildData(directory);
    const candidates: BlankCandidate[] = current.poems.flatMap((poem: any) => poem.ku.map((_: string, index: number) => ({ cardNo: poem.cardNo, ku: index + 1 })));
    if (candidates.length !== current.manifest.counts.blankCandidates) throw new Error('blank candidates do not match generateQuestions');
    plan = planSeed(name, candidates, ledgers[name]);
  } else {
    const fields: SetFields = { status: option(args, '--status'), confirmationMode: option(args, '--mode'), confirmedBy: option(args, '--confirmed-by') ?? null, confirmedOn: option(args, '--confirmed-on') ?? null, batchEvidenceRef: option(args, '--evidence') ?? null, proposedBy: option(args, '--proposed-by') };
    plan = planSet(name, { cards: parseCards(option(args, '--cards')) }, fields, ledgers[name]);
  }
  if (!isPlan(plan)) throw new Error(`不足: ${plan.missing.join(', ')}`);
  output(describePlan(plan));
  if (!args.includes('--write')) return plan;
  const text = validateBeforeWrite(directory, name, plan.entries);
  writeFileSync(paths.reviewFile(directory, name), text, 'utf8');
  return plan;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { run(process.argv.slice(2)); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
