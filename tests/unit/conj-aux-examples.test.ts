import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auxExamplesExpected } from '../../tools/conj-layout-check/held-data.ts';

// HANDOFF §30: 助動詞の用例の増補。活用表の各セルに実在の用例（実例がないセルは unattested）。
const html = readFileSync(new URL('../../conj/index.html', import.meta.url), 'utf8');
const adapterSrc = readFileSync(new URL('../../conj/adjv-runtime-adapter.js', import.meta.url), 'utf8');
const read = (name: string) => JSON.parse(readFileSync(new URL(`../../conj/data/${name}`, import.meta.url), 'utf8'));

type Item = { id: string; pos: string; lemma: string; meaning?: string; forms: string[][]; forms2?: (string[] | null)[] | null; example?: string };
type Example = {
  id: string; itemId: string; track: 'main' | 'sub'; formIndex: number; form: string; normalizedKey: string;
  target: string; occurrence: number; example: string; work: string; source: string | null; poem: number | null;
  origin: 'builtin' | 'chj' | 'public-text'; provenance: Record<string, unknown>;
  publicSource?: { sourceLabel: string; sourceUrl: string; sourceLicense: string }; note?: string;
};
type Cell = { itemId: string; track: 'main' | 'sub'; formIndex: number; form: string; surface: string; status: string; exampleIds: string[]; note?: string };

function embeddedItems(): Item[] {
  const start = html.indexOf('const items=[') + 'const items=['.length - 1;
  let depth = 0, i = start, quote = '';
  for (; i < html.length; i++) {
    const c = html[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    else if (c === ']' && --depth === 0) { i++; break; }
  }
  return new Function(`const F=a=>a; return ${html.slice(start, i)};`)() as Item[];
}
function fn<T>(name: string, deps: string[] = [], prelude = ''): T {
  const src = (n: string) => {
    const m = html.match(new RegExp(`function ${n}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`));
    assert.ok(m, n);
    return m[0];
  };
  return new Function(`${prelude}\n${deps.map(src).join('\n')}\n${src(name)}; return ${name};`)() as T;
}
const FORMS = ['未然形', '連用形', '終止形', '連体形', '已然形', '命令形'];
const aux = embeddedItems().filter((x) => x.pos === 'aux');
const auxById = new Map(aux.map((x) => [x.id, x]));
// aux-examples.json は内部扱いのデータ（CHJ の引用と書誌データ）で、公開ツリーには無い（tools/conj-layout-check/held-data.ts）。
// 作業リポジトリでは必ず検査する。
const haveAux = auxExamplesExpected();
const dataTest = haveAux ? test : test.skip;
const data = haveAux ? read('aux-examples.json') : { schemaVersion: '1.0', records: [], cells: [], counts: {}, sources: {} };
const records = data.records as Example[];
const cells = data.cells as Cell[];
const byId = new Map(records.map((r) => [r.id, r]));
const count = (text: string, target: string) => {
  let n = 0, from = 0;
  for (;;) { const p = text.indexOf(target, from); if (p < 0) return n; n++; from = p + target.length; }
};

test('aux examples: the 28 embedded aux items keep their tables but no longer carry an example', () => {
  assert.equal(aux.length, 28);
  for (const it of aux) {
    assert.ok(!('example' in it) && !('target' in it) && !('poem' in it) && !('source' in it), it.id);
    assert.ok(it.meaning, it.id);
  }
});

dataTest('aux examples: every record sits in a real table cell, and its target is found in the example', () => {
  assert.equal(data.schemaVersion, '1.0');
  assert.equal(new Set(records.map((r) => r.id)).size, records.length, 'ids are unique');
  for (const r of records) {
    const item = auxById.get(r.itemId);
    assert.ok(item, `${r.id}: unknown item`);
    assert.match(r.id, /^aux-[a-z-]+-\d{3}$/);
    const forms = r.track === 'sub' ? item.forms2 : item.forms;
    assert.ok(forms && forms[r.formIndex]?.includes(r.normalizedKey), `${r.id}: ${r.normalizedKey} is not ${r.track} ${FORMS[r.formIndex]}`);
    assert.equal(r.form, FORMS[r.formIndex], r.id);
    assert.ok(r.example && r.target, r.id);
    assert.ok(count(r.example, r.target) > r.occurrence, `${r.id}: target ${r.target} #${r.occurrence} not in example`);
    assert.ok(!r.example.includes('#'), `${r.id}: CHJ sentence marks must not be shown`);
    assert.ok(r.work, r.id);
    assert.ok(['builtin', 'chj', 'public-text'].includes(r.origin), r.id);
    if (r.origin === 'chj') {
      // CHJ quotations: the foot shows the work name only (sources are listed once in the popup)
      assert.equal(r.source, r.work, r.id);
      assert.ok(typeof r.provenance.sampleId === 'string' && Number.isInteger(r.provenance.start), `${r.id}: CHJ position`);
    }
    if (r.origin === 'public-text') assert.ok(r.publicSource?.sourceLabel && r.publicSource.sourceUrl && r.publicSource.sourceLicense, r.id);
    if (r.poem !== null) assert.ok(Number.isInteger(r.poem) && r.poem >= 1 && r.poem <= 100, r.id);
  }
});

dataTest('aux examples: the displayed target keeps the text spelling; differences from the table form are deliberate', () => {
  // 原文 target と正規化キーの分離（HANDOFF §4）: 撥音便・「ん」表記
  const diffs = records.filter((r) => r.target !== r.normalizedKey).map((r) => `${r.normalizedKey}→${r.target}`).sort();
  assert.deepEqual(diffs, ['まじかる→まじかん', 'むずれ→んずれ']);
  const onbin = records.find((r) => r.normalizedKey === 'まじかる')!;
  assert.match(onbin.note ?? '', /撥音便/);
});

dataTest('aux examples: 校訂表記 (2026-09-28 audit) only adds dakuten/commas or spells out 踊り字, and keeps the source spelling', () => {
  const base = (t: string) => {
    const out: string[] = [];
    for (const ch of t.normalize('NFD')) {
      if ('゙゚、，'.includes(ch)) continue;
      out.push('ゝゞ'.includes(ch) && out.length ? out[out.length - 1] : ch);
    }
    return out.join('');
  };
  const corrected = records.filter((r) => (r as Example & { orthography?: string }).orthography);
  assert.deepEqual(corrected.map((r) => r.id).sort(),
    ['aux-ki-004', 'aux-mashi-004', 'aux-rashi-002', 'aux-rashi-003', 'aux-tari-assert-001', 'aux-tari-comp-001', 'aux-zu-001', 'aux-zu-004']);
  for (const r of corrected) {
    const src = r.provenance.sourceOrthography as { example: string; target: string };
    assert.ok(src, r.id);
    assert.equal(base(r.example), base(src.example), r.id);
    assert.equal(base(r.target), base(src.target), r.id);
  }
  assert.equal(byId.get('aux-zu-001')!.example, 'いかばかり人のつらさをうらみましうき身のとがと思ひなさずは');
  assert.equal(byId.get('aux-tari-assert-001')!.example.slice(0, 6), '君、君たらず');
});

dataTest('aux examples: every cell of every aux table is accounted for, and all attested cells have an example', () => {
  const key = (c: { itemId: string; track: string; formIndex: number; surface: string }) => `${c.itemId}|${c.track}|${c.formIndex}|${c.surface}`;
  const expected = new Set<string>();
  for (const it of aux) {
    for (const [track, forms] of [['main', it.forms], ['sub', it.forms2]] as const) {
      (forms ?? []).forEach((fs, fi) => (fs ?? []).forEach((s) => expected.add(key({ itemId: it.id, track, formIndex: fi, surface: s }))));
    }
  }
  assert.deepEqual(new Set(cells.map(key)), expected);
  assert.equal(cells.length, expected.size);
  const exampleCells = cells.filter((c) => c.status === 'example');
  for (const c of exampleCells) {
    assert.ok(c.exampleIds.length > 0, key(c));
    for (const id of c.exampleIds) {
      const r = byId.get(id);
      assert.ok(r, `${key(c)}: ${id}`);
      assert.equal(key({ itemId: r.itemId, track: r.track, formIndex: r.formIndex, surface: r.normalizedKey }), key(c));
    }
  }
  assert.equal(exampleCells.reduce((n, c) => n + c.exampleIds.length, 0), records.length, 'every record belongs to one cell');
  // 実例未確認（活用表ドリルのみ。人工例で埋めない）
  const unattested = cells.filter((c) => c.status === 'unattested').map((c) => `${auxById.get(c.itemId)!.lemma}:${c.form}:${c.surface}`).sort();
  assert.deepEqual(unattested, ['けり:未然形:けら', 'じ:已然形:じ', 'たし:連体形:たかる', 'たり:命令形:たれ', 'たり:已然形:たれ', 'たり:連用形:と', 'なり:命令形:なれ'].sort());
  // 断定「たり」連用形「と」は例文を立てない（監査で取り下げ）。その id は欠番にして再利用しない
  const to = cells.find((c) => c.itemId === 'tari_assert_aux' && c.surface === 'と')! as Cell & { retiredExampleId?: string };
  assert.equal(to.retiredExampleId, 'aux-tari-assert-003');
  assert.ok(!byId.has('aux-tari-assert-003'));
  for (const c of cells.filter((x) => x.status !== 'example')) assert.ok(c.note && c.exampleIds.length === 0, key(c));
  assert.deepEqual([...new Set(cells.map((c) => c.status))].sort(), ['example', 'unattested']);
  assert.equal(data.counts.records, records.length);
});

test('aux tables: 補助活用命令形 of べし・まじ・まほし・たし is ○, as in the primary source (HANDOFF §2: no たかれ)', () => {
  for (const id of ['beshi_aux', 'maji_aux', 'mahoshi_aux', 'tashi_aux']) {
    const it = auxById.get(id)!;
    assert.deepEqual(it.forms2![5], [], `${id}: 補助活用命令形 must be empty (answer ○)`);
    assert.deepEqual(it.forms[5], [], `${id}: 本活用命令形 is ○ too`);
  }
  assert.doesNotMatch(html, /"(べかれ|まじかれ|まほしかれ|たかれ)"/);
  // an empty cell accepts ○ as the answer
  const cellCorrect = fn<(v: string, accepted: string[]) => boolean>('cellCorrect', ['norm', 'parts']);
  assert.equal(cellCorrect('○', []), true);
  assert.equal(cellCorrect('べかれ', []), false);
});

dataTest('aux examples: the former built-in examples are kept verbatim', () => {
  const snap = JSON.parse(readFileSync(new URL('../../conj/audit/aux_examples/builtin-items-bdaa05e.json', import.meta.url), 'utf8'));
  const builtin = records.filter((r) => r.origin === 'builtin');
  assert.equal(builtin.length, 28);
  for (const s of snap.items as { id: string; example: string; target: string; occurrence: number; poem: number | null; source: string | null }[]) {
    const r = builtin.find((x) => x.itemId === s.id)!;
    assert.ok(r, s.id);
    assert.equal(r.example, s.example, s.id);
    assert.equal(r.target, s.target, s.id);
    assert.equal(r.occurrence, s.occurrence, s.id);
    assert.equal(r.poem, s.poem, s.id);
    if (!s.poem) assert.equal(r.source, s.source, s.id);
  }
});

dataTest('aux examples: the adapter rejects malformed records and the app checks each record against the table', () => {
  const ctx: Record<string, any> = {};
  const documentStub = {
    readyState: 'complete', title: '', addEventListener() {}, head: { appendChild() {} },
    querySelector: () => null, getElementById: () => ({}), createElement: () => ({ dataset: {}, style: {} }),
  };
  new Function('window', 'document', adapterSrc)(ctx, documentStub);
  const { validateAuxExamples } = ctx.ConjAdjvRuntime;
  const good = records[0];
  const res = validateAuxExamples({ records: [good, { ...good, id: 'x-1', target: '無い' }, { ...good }, { ...good, id: 'x-2', occurrence: 9 }] });
  assert.equal(res.ok, false);
  assert.deepEqual(res.records.map((r: Example) => r.id), [good.id]);
  assert.equal(validateAuxExamples({ records }).ok, true);

  const cellProblem = fn<(e: unknown, item: unknown) => string>('auxExampleCellProblem');
  const beshi = auxById.get('beshi_aux')!;
  assert.equal(cellProblem({ track: 'sub', formIndex: 3, normalizedKey: 'べかる' }, beshi), '');
  assert.equal(cellProblem({ track: 'main', formIndex: 3, normalizedKey: 'べかる' }, beshi), 'not a cell of the table');
  assert.equal(cellProblem({ track: 'sub', formIndex: 2, normalizedKey: 'べし' }, beshi), 'not a cell of the table');
});

dataTest('aux examples: each question shows one example, favouring unseen ones and never repeating the previous one', () => {
  const assign = fn<(item: any) => void>('assignAuxExample', [], 'const auxExampleShown=new Map();');
  const item: any = { id: 'ru_aux', auxExamples: records.filter((r) => r.itemId === 'ru_aux').map((r) => ({ ...r, exampleMeanings: null })) };
  assert.equal(item.auxExamples.length, 6);
  const seen = new Set<string>();
  let prev = '';
  for (let i = 0; i < 60; i++) {
    assign(item);
    assert.notEqual(item.exampleId, prev);
    prev = item.exampleId;
    seen.add(item.exampleId);
    const r = byId.get(item.exampleId)!;
    assert.equal(item.example, r.example);
    assert.equal(item.target, r.target);
    assert.equal(item.occurrence, r.occurrence);
    assert.equal(item.exampleAvailable, true);
  }
  assert.equal(seen.size, 6);
  const none: any = { id: 'x' };
  assign(none);
  assert.equal(none.exampleAvailable, false);
  assert.equal(none.source, '活用表ドリル');
  // wiring: chosen on every question and before opening a review of an item not yet shown
  assert.match(html, /current=pickWeightedQuestion\(q\);\s*if\(current\.pos==="aux"\) assignAuxExample\(current\);/);
  assert.match(html, /if\(item\.pos==="aux" && !item\.exampleId\) assignAuxExample\(item\);/);
  assert.match(html, /await Promise\.all\(\[loadAdjvRuntimeItems\(\),loadAuxExamples\(\)\]\);/);
});

dataTest('aux examples: sources are listed once in the credits popup, including the aux works', () => {
  assert.match(html, /const staticItems=items\.filter\(i=>i\.example && !i\.sourceExampleIds && i\.pos!=="aux"\);/);
  assert.match(html, /aux\.filter\(r=>r\.origin==="chj"\)\.map\(r=>r\.work\)/);
  assert.match(html, /aux\.filter\(r=>r\.publicSource\)\.map\(r=>r\.publicSource\)/);
  assert.ok(data.sources.chj.name && data.sources.chj.url);
});

dataTest('aux examples: 備考 (pattern) notes from the audit are attached to their examples', () => {
  const withPattern = records.filter((r) => (r as Example & { pattern?: unknown }).pattern).map((r) => r.id).sort();
  assert.deepEqual(withPattern, ['aux-nari-assert-003', 'aux-tari-assert-002']);
  const p = (byId.get('aux-nari-assert-003') as Example & { pattern: { label: string; text: string } }).pattern;
  assert.equal(p.label, '定型「にあり」');
  assert.match(p.text, /にや（あらむ）/);
  // 画面のふきだしには短い文を出す（解説が過剰にならないように）
  for (const id of ['aux-nari-assert-003', 'aux-tari-assert-002']) {
    const q = (byId.get(id) as Example & { pattern: { short: string; text: string } }).pattern;
    assert.ok(q.short && q.short.length <= 50 && q.short.length < q.text.length, id);
  }
  // らる連用形は監査で十訓抄・大江山に差し替え（本文は CHJ 第三・一）
  const raru = byId.get('aux-raru-002')!;
  assert.equal(raru.work, '十訓抄');
  assert.equal(raru.provenance.volume, '第三・一');
  assert.match(raru.example, /局の前を過ぎられけるを/);
});

dataTest('aux examples: the app itself accepts all 145 records with their audited meanings (no record is dropped at load time)', () => {
  // index.html の読み込み時の検査（表のセル・意味と用例の照合）に、実データをそのまま通す。
  const cellProblem = fn<(e: unknown, item: unknown) => string>('auxExampleCellProblem');
  const meaningProblem = fn<(record: unknown, item: unknown) => string>('auxExampleMeaningProblem');
  const emphasized = fn<(item: unknown) => string[]>('emphasizedAuxMeanings');
  const alt = fn<(item: unknown) => string[]>('altAuxMeanings', ['emphasizedAuxMeanings']);
  const meanings = new Map((read('aux-example-meanings.json').records as
    { id: string; itemId: string; target: string; occurrence: number; exampleMeanings: string[]; altMeanings: string[]; status: string }[]).map((m) => [m.id, m]));
  let withAlt = 0;
  for (const r of records) {
    const item = auxById.get(r.itemId)!;
    assert.equal(cellProblem(r, item), '', r.id);
    const m = meanings.get(r.id)!;
    assert.ok(m && m.itemId === r.itemId, r.id);
    assert.equal(meaningProblem(m, { ...r, meaning: item.meaning }), '', r.id);
    // 画面での強調：意味が2つ以上の語だけ主を強調し、別解は主と重ならない
    const shown = { meaning: item.meaning, exampleMeanings: { meanings: m.exampleMeanings, alt: m.altMeanings, status: m.status } };
    const list = item.meaning!.split('・');
    assert.deepEqual(emphasized(shown), list.length >= 2 ? m.exampleMeanings : [], r.id);
    assert.deepEqual(alt(shown), list.length >= 2 ? m.altMeanings : [], r.id);
    if (m.altMeanings.length) withAlt++;
  }
  assert.equal(withAlt, 11);
});
