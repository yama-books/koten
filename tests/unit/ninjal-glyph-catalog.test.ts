import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// @ts-expect-error -- 監査ツールは素のESM。型定義は持たせていない。
import { diff, selfCheck } from "../../tools/ninjal-catalog/index.mjs";

type Glyph = {
  ninjal_id: string;
  kana: string;
  jibo: string;
  unicode: string | null;
  code_point: number | null;
  character: string | null;
  mj_glyph_name: string | null;
  notes: string | null;
  renderability: "unicode-text" | "non-unicode";
};

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../vintage-kana/data/${name}`, import.meta.url), "utf8"));

const catalog = read("ninjal-glyph-catalog.json") as { counts: Record<string, number>; glyphs: Glyph[] };
const uiMaster = read("ui-glyph-master.json") as { glyphs: { kana: string; glyph_id: string; character: string; jibo: string }[] };

test("公式カタログは自己整合している（ID重複・符号位置重複・符号位置と文字の食い違いが無い）", () => {
  assert.deepEqual(selfCheck(catalog), []);
});

test("counts はカタログ本体と一致する", () => {
  const withUnicode = catalog.glyphs.filter((g) => g.unicode !== null);
  assert.equal(catalog.counts.total, catalog.glyphs.length);
  assert.equal(catalog.counts.withUnicode, withUnicode.length);
  assert.equal(catalog.counts.withoutUnicode, catalog.glyphs.length - withUnicode.length);
  assert.equal(catalog.counts.total, catalog.counts.withUnicode + catalog.counts.withoutUnicode);
});

test("ninjal_id は全件ユニーク", () => {
  assert.equal(new Set(catalog.glyphs.map((g) => g.ninjal_id)).size, catalog.glyphs.length);
});

test("Unicodeが付いた字体は符号位置も文字も重複しない", () => {
  const withUnicode = catalog.glyphs.filter((g) => g.unicode !== null);
  assert.equal(new Set(withUnicode.map((g) => g.unicode)).size, withUnicode.length);
  assert.equal(new Set(withUnicode.map((g) => g.character)).size, withUnicode.length);
});

test("Unicode表記・code_point・characterの三者が一致する", () => {
  for (const g of catalog.glyphs) {
    if (g.unicode === null) continue;
    assert.equal(g.character, String.fromCodePoint(g.code_point as number), `${g.ninjal_id}`);
    assert.equal(g.unicode, `U+${(g.code_point as number).toString(16).toUpperCase().padStart(5, "0")}`, `${g.ninjal_id}`);
    assert.equal(g.renderability, "unicode-text", `${g.ninjal_id}`);
  }
});

test("Unicode未付与の字体を文字として捏造していない", () => {
  const nonUnicode = catalog.glyphs.filter((g) => g.renderability === "non-unicode");
  assert.ok(nonUnicode.length > 0, "Unicode未付与の行が落ちている");
  for (const g of nonUnicode) {
    assert.equal(g.unicode, null, `${g.ninjal_id}`);
    assert.equal(g.code_point, null, `${g.ninjal_id}`);
    assert.equal(g.character, null, `${g.ninjal_id}`);
    // 公式ページ側にもMJ文字図形名が無いので、こちらで補わない。
    assert.equal(g.mj_glyph_name, null, `${g.ninjal_id}`);
  }
});

test("U+1B11C は 𛄜 / を / 遠 であり、「せ」ではない", () => {
  const wo = catalog.glyphs.find((g) => g.unicode === "U+1B11C");
  assert.ok(wo, "U+1B11C が公式カタログに無い");
  assert.equal(wo.character, "𛄜");
  assert.equal(wo.character, String.fromCodePoint(0x1b11c));
  assert.equal(wo.kana, "を");
  assert.equal(wo.jibo, "遠");
  assert.equal(wo.ninjal_id, "470050020");
  assert.equal(wo.mj_glyph_name, "MJ090297");
});

test("「せ」と「を」の符号位置集合は交わらない", () => {
  const cps = (kana: string) =>
    new Set(catalog.glyphs.filter((g) => g.kana === kana && g.code_point !== null).map((g) => g.code_point));
  const se = cps("せ");
  const wo = cps("を");
  assert.ok(se.size > 0 && wo.size > 0);
  assert.deepEqual([...se].filter((c) => wo.has(c)), []);
  assert.ok(wo.has(0x1b11c), "U+1B11C は「を」側に属する");
  assert.ok(!se.has(0x1b11c), "U+1B11C が「せ」側に混ざっている");
});

test("現行UIキャッシュ側でも「せ」と「を」に同じ符号位置は割り当たっていない", () => {
  const ids = (kana: string) => new Set(uiMaster.glyphs.filter((g) => g.kana === kana).map((g) => g.glyph_id));
  const se = ids("せ");
  assert.deepEqual([...ids("を")].filter((id) => se.has(id)), []);
  for (const g of uiMaster.glyphs) {
    const cp = Number.parseInt(g.glyph_id.slice(2), 16);
    assert.equal(g.character, String.fromCodePoint(cp), `${g.glyph_id} の character が符号位置と食い違う`);
  }
});

test("公式カタログの全行が、差分分類のいずれかに必ず入る", () => {
  const d = diff(catalog, uiMaster);
  const classified = new Set<string>();
  for (const id of d.exactMatch) classified.add(id);
  for (const r of [...d.kanaMismatch, ...d.jiboMismatch, ...d.characterMismatch]) classified.add(r.glyph_id);
  for (const g of d.officialMissingFromCache) classified.add(g.unicode ?? g.ninjal_id);
  for (const g of catalog.glyphs) {
    assert.ok(classified.has(g.unicode ?? g.ninjal_id), `未分類の公式行: ${g.ninjal_id} ${g.kana}/${g.jibo}`);
  }
  // 現行138字も、一致・不一致・現行のみ のどれかに全部入る。
  const uiClassified = new Set<string>([
    ...d.exactMatch,
    ...[...d.kanaMismatch, ...d.jiboMismatch, ...d.characterMismatch].map((r) => r.glyph_id),
    ...d.currentCacheOnly.map((g) => g.glyph_id),
  ]);
  for (const g of uiMaster.glyphs) assert.ok(uiClassified.has(g.glyph_id), `未分類のUI行: ${g.glyph_id}`);
});

test("監査時点で判明している不一致が、直らないまま増えていない", () => {
  const d = diff(catalog, uiMaster);
  // 2026-09-20 の監査で記録した既知の3件。UI側を直したらこの期待値も一緒に更新する。
  assert.deepEqual(d.kanaMismatch, [{ glyph_id: "U+1B0D8", ui: "る", official: "も" }]);
  assert.deepEqual(d.jiboMismatch, [
    { glyph_id: "U+1B0E6", ui: "由", official: "遊" },
    { glyph_id: "U+1B0D8", ui: "留", official: "毛" },
  ]);
  assert.deepEqual(d.characterMismatch, []);
  assert.deepEqual(d.currentCacheOnly.map((g) => g.glyph_id), ["U+1B10C"]);
});
