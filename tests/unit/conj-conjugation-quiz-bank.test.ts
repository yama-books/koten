import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildTypeChoices, formChoices, shuffleChoices } from '../../conj/conjugation-quiz-engine.js';

const readJson = (name: string) => JSON.parse(readFileSync(new URL(`../../conj/data/${name}`, import.meta.url), 'utf8'));
const bank = readJson('conjugation-quiz-bank-127.meta.json');
const config = readJson('conjugation-quiz-config.json');
const records = bank.records as Array<Record<string, unknown>>;

test('conj identification bank: representative 127 metadata is complete and source-balanced', () => {
  assert.equal(bank.schemaVersion, '1.0');
  assert.equal(bank.status, 'internal-qa-metadata');
  assert.equal(records.length, 127);
  assert.deepEqual(bank.counts.partOfSpeech, {
    adjectivalVerb: 18,
    adjective: 21,
    auxiliary: 29,
    verb: 59,
  });
  assert.deepEqual(bank.counts.classification, { standard: 89, attention: 38 });
  assert.equal(new Set(records.map((r) => r.exampleId)).size, 127);
});

test('conj identification bank: answer keys and gates are explicit without publishing held quotations', () => {
  const forms = new Set(formChoices());
  assert.deepEqual([...forms], ['未然形','連用形','終止形','連体形','已然形','命令形']);
  for (const r of records) {
    assert.ok(['verb','adjective','adjectivalVerb','auxiliary'].includes(String(r.partOfSpeech)), String(r.exampleId));
    assert.ok(forms.has(String(r.form)), String(r.exampleId));
    assert.ok(String(r.lemma), String(r.exampleId));
    assert.ok(String(r.conjugationType), String(r.exampleId));
    assert.equal(r.formQuizEligible, true, String(r.exampleId));
    assert.equal(r.typeQuizEligible, true, String(r.exampleId));
    assert.equal(r.reviewStatus, 'ai-audited', String(r.exampleId));
    assert.equal(r.humanApprovalStatus, 'approved', String(r.exampleId));
    assert.equal(r.publicEnabled, false, String(r.exampleId));
    assert.equal(bank.publicationBoundary.humanApprovalSatisfied, true);
    for (const held of ['quotationExcerpt','originalTarget','anchor','attentionNote']) {
      assert.ok(!(held in r), `${r.exampleId}: held field leaked: ${held}`);
    }
  }
});

test('conj identification bank: reviewed duplicate-target positions stay explicit', () => {
  const byId = new Map(records.map((r) => [String(r.exampleId), r]));
  for (const id of ['aux-012','aux-013','aux-054','aux-055','aux-124','aux-150']) {
    assert.equal(byId.get(id)?.positionStrategy, 'anchor', id);
    assert.equal(byId.get(id)?.targetOccurrence, null, id);
  }
  assert.equal(byId.get('verb-091')?.positionStrategy, 'occurrence');
  assert.equal(byId.get('verb-091')?.targetOccurrence, 3);
  assert.equal(bank.publicationBoundary.targetOccurrenceBase, 0);
});

test('conj identification bank: current GitHub auxiliary kinds are the type-quiz answers', () => {
  const expected: Record<string,string> = {
    'ず':'特殊型',
    'たし':'形容詞（ク活用）型',
    'べし':'形容詞（ク活用）型',
    'まじ':'形容詞（シク活用）型',
    'まほし':'形容詞（シク活用）型',
  };
  for (const [lemma,kind] of Object.entries(expected)) {
    const rows=records.filter((r)=>r.partOfSpeech==='auxiliary' && r.lemma===lemma);
    assert.ok(rows.length>0, lemma);
    assert.deepEqual(new Set(rows.map((r)=>r.conjugationType)), new Set([kind]), lemma);
  }
});

test('conj identification choices: every eligible record gets the required unique choice count', () => {
  for (const r of records) {
    const choices=buildTypeChoices(r,config);
    const expected=r.partOfSpeech==='adjective'||r.partOfSpeech==='adjectivalVerb' ? 2 : 4;
    assert.equal(choices.length, expected, String(r.exampleId));
    assert.equal(new Set(choices).size, choices.length, String(r.exampleId));
    assert.ok(choices.includes(String(r.conjugationType)), String(r.exampleId));
  }
});

test('conj identification choices: verb near-misses prefer the same row when available', () => {
  const row=records.find((r)=>r.partOfSpeech==='verb' && r.conjugationType==='カ行上二段活用');
  assert.ok(row);
  const choices=buildTypeChoices(row,config);
  assert.deepEqual(new Set(choices), new Set([
    'カ行上二段活用',
    'カ行四段活用',
    'カ行下二段活用',
    'カ行上一段活用',
  ]));
});

test('conj identification choices: adjective-like auxiliaries keep the paired adjective type nearby', () => {
  const beshi=records.find((r)=>r.partOfSpeech==='auxiliary' && r.lemma==='べし');
  assert.ok(beshi);
  const choices=buildTypeChoices(beshi,config);
  assert.equal(choices[0], '形容詞（ク活用）型');
  assert.ok(choices.includes('形容詞（シク活用）型'));
});

test('conj identification choices: render-time shuffle preserves the candidate set', () => {
  const source=['A','B','C','D'];
  let i=0;
  const seq=[0.1,0.9,0.2];
  const shuffled=shuffleChoices(source,()=>seq[i++] ?? 0);
  assert.deepEqual(new Set(shuffled),new Set(source));
  assert.notDeepEqual(shuffled,source);
});
