import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chjQuotationsExpected } from '../../tools/conj-layout-check/held-data.ts';

// DESIGN_GLOSS_LAYOUT_2026-09-28 §8: data criteria 1–6, 10, 11 and the static CSS/markup contract.
const html = readFileSync(new URL('../../conj/index.html', import.meta.url), 'utf8');
const adapter = readFileSync(new URL('../../conj/adjv-runtime-adapter.js', import.meta.url), 'utf8');
const read = (name: string) => JSON.parse(readFileSync(new URL(`../../conj/data/${name}`, import.meta.url), 'utf8'));

type GlossRecord = { id: string; work: string; modernKana: string; basicGloss: string; contextNote: string | null; displayGloss: string };
type Reading = { itemId: string; lemmaId: string; heading: string; modernKana: string; ruby: string[][]; readingFrom: string };
const glosses = read('adjectival-noun-glosses.json');
const records = glosses.records as GlossRecord[];
const byId = new Map(records.map((r) => [r.id, r]));
const readings = glosses.lemmaReadings as Reading[];

function fn<T>(name: string, deps: string[] = []): T {
  const src = (n: string) => {
    const m = html.match(new RegExp(`function ${n}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`));
    assert.ok(m, n);
    return m[0];
  };
  return new Function(`${deps.map(src).join('\n')}\n${src(name)}; return ${name};`)() as T;
}

test('gloss §8-1: all 120 v0.6 runtime records, in order, without gaps or duplicates', () => {
  assert.equal(glosses.schemaVersion, '1.0');
  assert.match(glosses.source, /v0\.6_adjv001-120\.xlsx#runtime候補$/);
  assert.deepEqual(records.map((r) => r.id), Array.from({ length: 120 }, (_, i) => `adjv-${String(i + 1).padStart(3, '0')}`));
  for (const r of records) {
    assert.ok(r.work && r.basicGloss && r.modernKana, r.id);
    assert.ok(!('contextGloss' in r), `${r.id}: the audit-only contextGloss column must not be exported`);
  }
});

test('gloss §8-2: the example each runtime heading shows comes from the same work as its v0.6 record', () => {
  // mirrors conj/adjv-runtime-adapter.js: reviewed public text first, else the first CHJ quotation
  const shown = new Map<string, { id: string; work: string }>();
  for (const r of read('adjectival-noun-public-examples.json').records) {
    if (r.exampleEnabledPublic !== true || r.rightsVerified !== true || r.targetVerified !== true || r.excerptReviewed !== true) continue;
    if (!r.example || !r.publicTarget || !r.example.includes(r.publicTarget)) continue;
    if (!shown.has(r.lemmaId)) shown.set(r.lemmaId, { id: r.sourceExampleId, work: r.work });
  }
  // CHJ の引用は公開ツリーに無い（許可リストで保留。tools/conj-layout-check/held-data.ts）。
  // 作業リポジトリでは必ず読み、115 語すべてに用例があることを確かめる。公開ツリーでは公開本文の語だけを見る。
  const chjExpected = chjQuotationsExpected();
  const chj = new Map<string, { id: string; work: string }>();
  for (const r of chjExpected ? read('adjectival-noun-chj-quotations.json').records : []) {
    if (!r.excerpt || !r.target || !r.excerpt.includes(r.target)) continue;
    if (!chj.has(r.lemmaId)) chj.set(r.lemmaId, { id: r.id, work: r.work });
  }
  const runtimeReadings = readings.filter((r) => r.itemId !== 'itadura');
  assert.equal(runtimeReadings.length, 115);
  let checked = 0;
  for (const reading of runtimeReadings) {
    const ex = shown.get(reading.lemmaId) ?? chj.get(reading.lemmaId);
    if (!ex && !chjExpected) continue;
    assert.ok(ex, reading.lemmaId);
    checked += 1;
    const record = byId.get(ex.id);
    assert.ok(record, `${reading.lemmaId}: ${ex.id} has no gloss record`);
    assert.equal(record.work, ex.work, `${reading.lemmaId}: ${ex.id}`);
  }
  assert.equal(checked, chjExpected ? 115 : runtimeReadings.filter((r) => shown.has(r.lemmaId)).length);
  assert.ok(checked > 0);
  // the app wires exampleId from the shown example and refuses a gloss whose work differs (fail closed)
  assert.match(html, /exampleId:ex\.sourceExampleId,/);
  assert.match(html, /exampleId:quote\.id,/);
  assert.match(adapter, /function glossForExample\(glosses,exampleId,work\)\{[\s\S]*?if\(r\.work!==work\)\{[\s\S]*?return null;/);
  assert.match(html, /window\.ConjAdjvRuntime\.glossForExample\(glosses,item\.exampleId,item\.source\)/);
});

test('gloss §8-3: displayGloss is exactly basicGloss (+（この用例では contextNote）)', () => {
  for (const r of records) {
    assert.equal(r.contextNote ? `${r.basicGloss}（この用例では${r.contextNote}）` : r.basicGloss, r.displayGloss, r.id);
  }
  // 028・029 carry an audit contextGloss that the display deliberately drops
  assert.equal(byId.get('adjv-028')!.contextNote, null);
  assert.equal(byId.get('adjv-029')!.contextNote, null);
  assert.equal(byId.get('adjv-036')!.contextNote, '打消で「平穏でない」');
});

test('gloss §8-4: no 「この用例では」 row without a note or while the example is hidden', () => {
  type Row = { label: string; context?: boolean };
  const glossRows = fn<(item: unknown, showContext: boolean) => Row[]>('glossRows', ['emphasizedAuxMeanings']);
  const withNote = { pos: 'adjv', gloss: { basicGloss: '静かだ・平穏だ', contextNote: '打消で「平穏でない」' } };
  assert.deepEqual(glossRows(withNote, true).map((r) => r.label), ['意味', 'この用例では']);
  assert.deepEqual(glossRows(withNote, false).map((r) => r.label), ['意味']);
  assert.deepEqual(glossRows({ pos: 'adjv', gloss: { basicGloss: '無駄だ・むなしい', contextNote: null } }, true).map((r) => r.label), ['意味']);
  assert.deepEqual(glossRows({ pos: 'adjv' }, true), []);
  assert.deepEqual(glossRows({ pos: 'verb' }, true), []);
  // the context row follows the 用例 checkbox
  assert.match(html, /function currentExampleShowing\(\)\{[\s\S]*?document\.getElementById\("showExample"\)\.checked/);
  assert.match(html, /function applyExampleVisibility\(\)\{[\s\S]*?renderCurrentGloss\(\);/);
});

test('gloss §8-5: ruby rebuilds heading and modern kana, and appears only where they differ (33 words)', () => {
  assert.equal(readings.length, 116);
  assert.equal(new Set(readings.map((r) => r.itemId)).size, 116);
  for (const r of readings) {
    assert.equal(r.ruby.map((s) => s[0]).join(''), r.heading, r.itemId);
    assert.equal(r.ruby.map((s) => s[s.length - 1]).join(''), r.modernKana, r.itemId);
    assert.equal(r.ruby.some((s) => s.length === 2), r.heading !== r.modernKana, r.itemId);
    assert.ok(r.ruby.every((s) => s.length === 1 || s[0] !== s[1]), r.itemId);
  }
  const notation = (r: Reading) => r.ruby.map((s) => (s.length === 2 ? `[${s[0]}→${s[1]}]` : s[0])).join('').replace(/(なり|たり)$/, '');
  const diff = readings.filter((r) => r.heading !== r.modernKana);
  assert.equal(diff.length, 38);
  // §6.4 (rule units, not minimal character diffs: やう→よう, not や→よ)
  assert.deepEqual(new Set(diff.map(notation)), new Set([
    'あら[は→わ]', 'ありが[ほ→お]', 'か[やう→よう]', 'きび[は→わ]', '[けう→きょう]ら', 'し[づ→ず]か', 'な[ほ→お]ざり',
    'に[は→わ]か', 'ね[む→ん]ごろ', '[まう→もう]', 'まちど[ほ→お]', 'め[づ→ず]らか', 'や[は→わ]らか', 'わ[づ→ず]か',
    '[ゐ→い]ややか', '[を→お]んびん', 'おも[は→わ]ず', 'しん[べう→びょう]', 'さ[やう→よう]', 'お[ほ→お]き',
    'どう[やう→よう]', 'み[めう→みょう]', 'た[ひ→い]ら', 'た[へ→え]', '[ばう→ぼう]ぜん', '[くわう→こう][くわう→こう]',
    '[べう→びょう][べう→びょう]', '[べう→びょう][ばう→ぼう]', '[くわう→こう][やう→よう]', '[ばう→ぼう][ばう→ぼう]',
    'さ[つ→っ]さつ', '[じやう→じょう][じやう→じょう]', 'いた[づ→ず]ら',
  ]));
  assert.deepEqual(readings.find((r) => r.itemId === 'adjv-lemma-030')!.ruby, [['し'], ['づ', 'ず'], ['かなり']]);
  assert.deepEqual(readings.find((r) => r.itemId === 'adjv-lemma-107')!.ruby, [['くわう', 'こう'], ['くわう', 'こう'], ['たり']]);
});

test('gloss §8-6: タリ活用 097–120 modern kana are the audited v0.6 values', () => {
  const tari = Object.fromEntries(records.slice(96).map((r) => [r.id, r.modernKana]));
  assert.deepEqual(tari, {
    'adjv-097': 'さっさつたり', 'adjv-098': 'ぼうぜんたり', 'adjv-099': 'じょうじょうたり', 'adjv-100': 'こうこうたり',
    'adjv-101': 'へんぺんたり', 'adjv-102': 'こうようたり', 'adjv-103': 'いんりんたり', 'adjv-104': 'ぼうぼうたり',
    'adjv-105': 'りんりんと', 'adjv-106': 'あつあつと', 'adjv-107': 'ささと', 'adjv-108': 'びょうぼうと',
    'adjv-109': 'びょうびょうと', 'adjv-110': 'せいぜいと', 'adjv-111': 'しんしんと', 'adjv-112': 'らんかんと',
    'adjv-113': 'まんまんたる', 'adjv-114': 'まんまんたる', 'adjv-115': 'びょうぼうたる', 'adjv-116': 'ががたる',
    'adjv-117': 'けんけんたる', 'adjv-118': 'ばくばくたる', 'adjv-119': 'せいせいたる', 'adjv-120': 'びょうびょうたる',
  });
});

test('gloss §8-10: 百人一首 itadura shows only the basic gloss and いた[づ→ず]ら', () => {
  const g = (glosses.itemGlosses as { itemId: string; basicGloss: string; contextNote: string | null; work: string }[])
    .find((x) => x.itemId === 'itadura');
  assert.ok(g);
  assert.equal(g.basicGloss, '無駄だ・むなしい');
  assert.equal(g.contextNote, null);
  assert.equal(g.work, '小倉百人一首');
  const r = readings.find((x) => x.itemId === 'itadura')!;
  assert.equal(r.heading, 'いたづらなり');
  assert.equal(r.modernKana, 'いたずらなり');
  assert.deepEqual(r.ruby, [['いた'], ['づ', 'ず'], ['らなり']]);
  assert.match(html, /\{id:"itadura",pos:"adjv",label:"形容動詞",lemma:"いたづらなり",[\s\S]*?poem:9,/);
});

test('gloss §8-11: aux example meanings match the items; only audited multi-meaning records are emphasised', () => {
  const data = read('aux-example-meanings.json');
  const recs = data.records as { id: string; target: string; occurrence: number; exampleMeanings: string[]; status: string }[];
  const aux = new Map<string, { meaning: string; target: string; occurrence: number }>();
  for (const m of html.matchAll(/\{id:"([^"]+)",pos:"aux"[\s\S]*?meaning:"([^"]*)"[\s\S]*?target:"([^"]*)"(?:,occurrence:(\d+))?/g)) {
    aux.set(m[1], { meaning: m[2], target: m[3], occurrence: Number(m[4] ?? 0) });
  }
  assert.equal(aux.size, 28);
  assert.equal(recs.length, 28);
  assert.deepEqual(new Set(recs.map((r) => r.id)), new Set(aux.keys()));
  for (const r of recs) {
    const item = aux.get(r.id)!;
    assert.ok(!('exampleMeaning' in r), `${r.id}: use the exampleMeanings array`);
    assert.ok(Array.isArray(r.exampleMeanings) && r.exampleMeanings.length > 0, r.id);
    assert.equal(new Set(r.exampleMeanings).size, r.exampleMeanings.length, r.id);
    for (const m of r.exampleMeanings) assert.ok(item.meaning.split('・').includes(m), `${r.id}: ${m}`);
    assert.equal(r.target, item.target, r.id);
    assert.equal(r.occurrence, item.occurrence, r.id);
    assert.ok(['candidate', 'audited'].includes(r.status), r.id);
  }
  // user audit 2026-09-28: all 28 records audited
  assert.equal(recs.filter((r) => r.status === 'audited').length, 28);
  const byId = Object.fromEntries(recs.map((r) => [r.id, r.exampleMeanings]));
  assert.deepEqual(byId.muzu_aux, ['意志']);
  assert.deepEqual(byId.beshi_aux, ['当然', '推量']);
  assert.deepEqual(byId.kemu_aux, ['過去推量']);
  assert.deepEqual(byId.meri_aux, ['推定']);
  assert.deepEqual(byId.mu_aux, ['推量', '意志']);
  assert.deepEqual(byId.ramu_aux, ['現在推量']);

  const emphasized = fn<(item: unknown) => string[]>('emphasizedAuxMeanings');
  const meri = { meaning: '推定・婉曲', exampleMeanings: { meanings: ['推定'], status: 'audited' } };
  assert.deepEqual(emphasized(meri), ['推定']);
  assert.deepEqual(emphasized({ ...meri, exampleMeanings: { meanings: ['推定'], status: 'candidate' } }), []);
  assert.deepEqual(emphasized({ meaning: '打消', exampleMeanings: { meanings: ['打消'], status: 'audited' } }), []);
  assert.deepEqual(emphasized({ meaning: '推定・婉曲' }), []);
  assert.deepEqual(emphasized({ meaning: '推定・婉曲', exampleMeanings: { meanings: ['推定', '伝聞'], status: 'audited' } }), []);
  const beshi = { pos: 'aux', meaning: '推量・意志・可能・当然・命令・適当', connection: '終止形', connectionShort: '終止形',
    exampleMeanings: { meanings: ['当然', '推量'], status: 'audited' } };
  assert.deepEqual(emphasized(beshi), ['当然', '推量']);
  const glossRows = fn<(item: unknown, showContext: boolean) => { label: string; emphasis?: string[]; text: string }[]>('glossRows', ['emphasizedAuxMeanings']);
  assert.deepEqual(glossRows(beshi, true)[0].emphasis, ['当然', '推量']);
  // 接続 row only when the full connection differs from the short one
  assert.deepEqual(glossRows({ pos: 'aux', meaning: '受身・尊敬・自発・可能', connection: '四段・ナ変・ラ変の未然形', connectionShort: '未然形' }, true)
    .map((r) => r.label), ['意味', '接続']);
  assert.deepEqual(glossRows({ pos: 'aux', meaning: '比況・例示', connection: '体言＋の・連体形', connectionShort: '体言＋の・連体形' }, true)
    .map((r) => r.label), ['意味']);
  // the app validates every listed meaning against the item and marks each of them
  assert.match(html, /if\(!record\.exampleMeanings\.every\(m=>list\.includes\(m\)\)\) return "meaning not in list";/);
  assert.match(html, /if\(emphasis\.includes\(word\)\)\{/);
});

test('gloss: aux kind line carries the connection and follows hideKind; Lv5–7 labels say 接続なし', () => {
  assert.match(html, /function renderKindText\(el,item\)\{[\s\S]*?conn\.textContent=item\.connectionShort\+"接続";/);
  assert.match(html, /function renderKindInitial\(\)\{[\s\S]*?if\(hideKindAtStart\(\)\)\{\s*renderKindText\(el,current\);\s*el\.classList\.add\("kind-hidden"\);/);
  for (const n of [5, 6, 7]) assert.match(html, new RegExp(`${n}:\\{ratio:[^}]*hideKind:true,\\s*label:"[^"]*・活用型・接続なし"\\}`));
  assert.doesNotMatch(html, /id="auxInfo"/);
});

test('gloss: v53 CSS keeps reserved space, reveals after answering, and keeps the hanamaru contract', () => {
  const v53 = html.match(/\/\* ===== v53:[\s\S]*?<\/style>/);
  assert.ok(v53);
  const css = v53[0];
  assert.ok(html.indexOf('/* ===== v52:') < html.indexOf('/* ===== v53:'));
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'tokens only');
  assert.match(css, /#lemma,#reviewModalWord\{padding-top:12px;margin-top:2px\}/);
  assert.match(css, /@media\(min-width:701px\)\{\s*#lemma,#reviewModalWord\{padding-top:17px;margin-top:4px\}\s*#lemma rt,#reviewModalWord rt\{font-size:15px\}/);
  assert.match(css, /#lemma rt,#reviewModalWord rt\{[^}]*color:var\(--accent-strong\);visibility:hidden\}/);
  assert.match(css, /\.card\.is-answered #lemma rt/);
  // the strip keeps its box from the start: hidden by visibility, never display:none
  assert.match(css, /\.gloss\{[^}]*visibility:hidden;opacity:0;/);
  assert.doesNotMatch(css.match(/\.gloss\{[^}]*\}/)![0], /display:none/);
  assert.match(css, /grid-template-columns:6\.2em minmax\(0,1fr\)/);
  assert.match(css, /width:min\(calc\(100% - 32px\),300px\)/);
  assert.match(css, /grid-template-areas:"example table gloss"/);
  assert.match(css, /\.gloss dt\{[^}]*color:var\(--tag-ink\)/);
  assert.match(css, /\.gloss \.gloss-mark,\.gloss \.gloss-em\{background:linear-gradient\([^}]*var\(--example-mark-bg\)/);
  // hanamaru: top layer, multiply, anchored by JS; existing assertions of conj-record-screen stay true
  assert.match(css, /\.perfect-result\{z-index:20;mix-blend-mode:multiply\}/);
  assert.match(html, /\.perfect-result\{[\s\S]*?position:absolute;[\s\S]*?pointer-events:none;/);
  assert.match(html, /\.perfect-result\.show\{\s*display:block;/);
  assert.match(css, /\.card:has\(\.perfect-result\.show\) #lemmaAid\{color:var\(--ink\)\}/);
  assert.match(html, /const size=Math\.round\(Math\.min\(156,Math\.max\(96,fs\*4\.35\)\)\);/);
  assert.match(html, /if\(perfectAll\) placePerfectStamp\(\);/);
  // markup: the strip lives in the study grid and announces itself on reveal
  assert.match(html, /<dl class="gloss" id="gloss" aria-live="polite" hidden><\/dl>\s*<\/div>/);
  assert.match(html, /<dl class="gloss gloss-review" id="reviewGloss" hidden><\/dl>/);
  // the review modal opens in the answered state with the shared renderers
  assert.match(html, /applyLemmaReading\(document\.getElementById\("reviewModalWord"\),item,true\);/);
  assert.match(html, /renderGloss\(document\.getElementById\("reviewGloss"\),item,/);
});

test('gloss v54: short phones fit the table rows (≥44px) and iPad narrows only a width-bound side gloss', () => {
  const v54 = html.match(/\/\* ===== v54:[\s\S]*?<\/style>/);
  assert.ok(v54);
  const css = v54[0];
  assert.ok(html.indexOf('/* ===== v53:') < html.indexOf('/* ===== v54:'));
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(/, 'tokens only');
  // short phones: labels can shrink to 44px rows; the strip keeps its box (only its margins shrink)
  const short = css.match(/@media\(max-width:700px\) and \(max-height:700px\)\{[\s\S]*?\n\}/);
  assert.ok(short);
  assert.match(short[0], /\.katsuyo th\.label \.label-text\{line-height:1\.02\}/);
  assert.match(short[0], /> \.gloss\{margin-top:6px;padding-top:6px;padding-bottom:6px;row-gap:4px\}/);
  assert.doesNotMatch(short[0], /\.gloss\{[^}]*(display|visibility)/);
  // fixed 3–5 character forms follow the row height instead of overflowing the cell
  assert.match(css, /\.display\.fit-5\{font-size:min\(11\.5px,calc\(\(var\(--mobile-form-row-h\) - 4px\)\/5\.15\)\)\}/);
  // JS: rows are fitted at question time (the strip is already reserved), never below 44px
  assert.match(html, /const MOBILE_ROW_MIN=44;/);
  assert.match(html, /function fitMobileRows\(card\)\{[\s\S]*?Math\.max\(MOBILE_ROW_MIN,[\s\S]*?card\.style\.setProperty\("--mobile-form-row-h",next\+"px"\);/);
  assert.match(html, /if\(window\.innerWidth<STUDY_ZOOM_MIN_WIDTH\)\{\s*if\(card\) fitMobileRows\(card\);\s*return;\s*\}/);
  // iPad/PC: the side gloss is narrowed (not moved under the table) only when it limits the zoom, with a floor
  assert.match(html, /const GLOSS_SIDE_MIN_EM=8;/);
  assert.match(html, /if\(gloss && m\.byWidth<target-0\.005 && target>1\.02\)\{[\s\S]*?gloss\.style\.maxWidth=Math\.max\(minWidth,allowed\)\+"px";/);
  assert.match(html, /grid-template-areas:"example table gloss"/);
});

test('gloss §4 / audit §1.2-6: small text tokens reach WCAG AA 4.5:1 on card and background in all 5 themes', () => {
  const style = html.match(/<style>([\s\S]*?)<\/style>/)![1];
  const blocks: Record<string, string> = { coffee: style.match(/:root\{([\s\S]*?)\}/)![1] };
  for (const name of ['matcha', 'indigo', 'sumi', 'sakura']) {
    blocks[name] = style.match(new RegExp(`:root\\[data-theme="${name}"\\]\\{([\\s\\S]*?)\\}`))![1];
  }
  const lum = (hex: string) => {
    const c = hex.replace('#', '').match(/../g)!.map((h) => parseInt(h, 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  for (const [name, body] of Object.entries(blocks)) {
    const vars = new Map([...body.matchAll(/--([a-z0-9-]+):(#[0-9a-fA-F]{6});/g)].map((m) => [m[1], m[2]]));
    for (const token of ['ink', 'muted', 'tag-ink', 'accent-strong']) {
      for (const surface of ['card', 'bg']) {
        const r = ratio(vars.get(token)!, vars.get(surface)!);
        assert.ok(r >= 4.5, `${name}: --${token} on --${surface} is ${r.toFixed(2)}:1`);
      }
    }
  }
});
