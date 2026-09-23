import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../vintage-kana/index.html", import.meta.url), "utf8");
const master = JSON.parse(readFileSync(new URL("../../vintage-kana/data/ui-glyph-master.json", import.meta.url), "utf8"));
const index = JSON.parse(readFileSync(new URL("../../vintage-kana/data/glyph-distribution-index.json", import.meta.url), "utf8"));
const part1 = JSON.parse(readFileSync(new URL("../../vintage-kana/data/glyph-distribution.json", import.meta.url), "utf8"));
const part2 = JSON.parse(readFileSync(new URL("../../vintage-kana/data/glyph-distribution-part2.json", import.meta.url), "utf8"));

const compareGlyphBrowseOrder = (a: any, b: any) =>
  (b.totalObserved || 0) - (a.totalObserved || 0)
  || (b.witnessCount || 0) - (a.witnessCount || 0)
  || a.glyph_id.localeCompare(b.glyph_id);

test("vintage-kana raw distribution parts stay disjoint and match the index", () => {
  assert.equal(part1.distributions.length, index.parts[0].nonzeroRecordCount);
  assert.equal(part2.distributions.length, index.parts[1].nonzeroRecordCount);
  assert.equal(part1.distributions.length, 1691);
  assert.equal(part2.distributions.length, 355);

  const rows = [...part1.distributions, ...part2.distributions];
  assert.equal(rows.length, index.totals.nonzeroRecordCount);
  assert.equal(rows.length, 2046);
  assert.equal(new Set(rows.map((row: any) => row.distribution_id)).size, rows.length);
});

test("vintage-kana UI frequency values equal the 15-witness raw observations", () => {
  const rows = [...part1.distributions, ...part2.distributions]
    .filter((row: any) => row.diacritic === "none" && /^U\+1B/.test(row.glyph_id));
  const byGlyph = new Map<string, { total: number; witnesses: Set<string> }>();
  rows.forEach((row: any) => {
    const current = byGlyph.get(row.glyph_id) || { total: 0, witnesses: new Set<string>() };
    current.total += row.count;
    current.witnesses.add(row.source_witness);
    byGlyph.set(row.glyph_id, current);
  });

  master.glyphs.forEach((glyph: any) => {
    const raw = byGlyph.get(glyph.glyph_id);
    assert.equal(glyph.totalObserved, raw?.total || 0, glyph.glyph_id + " totalObserved");
    assert.equal(glyph.witnessCount, raw?.witnesses.size || 0, glyph.glyph_id + " witnessCount");
  });

  assert.equal(master.glyphs.find((g: any) => g.glyph_id === "U+1B0F0")?.totalObserved, 865);
  assert.equal(master.glyphs.find((g: any) => g.glyph_id === "U+1B0F6")?.totalObserved, 775);
});

test("vintage-kana browse ordering is frequency-first but isolated from the canonical GLYPHS order", () => {
  assert.match(html, /function compareGlyphBrowseOrder\(a,b\)\{/);
  assert.match(html, /const totalDiff=\(b\.totalObserved\|\|0\)-\(a\.totalObserved\|\|0\);/);
  assert.match(html, /const witnessDiff=\(b\.witnessCount\|\|0\)-\(a\.witnessCount\|\|0\);/);
  assert.match(html, /return a\.glyph_id\.localeCompare\(b\.glyph_id\);/);

  // loadData の GLYPHS 自体は従来どおり kana + glyph_id 順。クイズ等の共有母集団を並べ替えない。
  assert.match(html, /GLYPHS=\(glyphData\.glyphs\|\|\[\]\)\s*\.sort\(\(a,b\)=>KANA_ORDER\.indexOf\(a\.kana\)-KANA_ORDER\.indexOf\(b\.kana\)\|\|a\.glyph_id\.localeCompare\(b\.glyph_id\)\);/);

  const renderStart = html.indexOf("function renderCards(){");
  const standardPush = html.indexOf("rows.push({isStandard:true", renderStart);
  const variantPush = html.indexOf("GLYPHS.filter(x=>x.kana===k).sort(compareGlyphBrowseOrder).forEach", renderStart);
  assert.ok(renderStart >= 0 && standardPush > renderStart && variantPush > standardPush);
});

test("vintage-kana browse order is stable, keeps zero-observed glyphs last, and preserves all 266 glyphs", () => {
  assert.equal(master.glyphs.length, 266);
  assert.equal(new Set(master.glyphs.map((g: any) => g.kana)).size, 47);

  for (const kana of new Set(master.glyphs.map((g: any) => g.kana))) {
    const sorted = master.glyphs.filter((g: any) => g.kana === kana).sort(compareGlyphBrowseOrder);
    let zeroStarted = false;
    for (let i = 0; i < sorted.length; i++) {
      const glyph = sorted[i];
      if (glyph.totalObserved === 0) zeroStarted = true;
      else assert.equal(zeroStarted, false, kana + " has a non-zero glyph after zero-observed glyphs");

      if (i === 0) continue;
      const prev = sorted[i - 1];
      assert.ok(prev.totalObserved >= glyph.totalObserved);
      if (prev.totalObserved === glyph.totalObserved) {
        assert.ok(prev.witnessCount >= glyph.witnessCount);
        if (prev.witnessCount === glyph.witnessCount) {
          assert.ok(prev.glyph_id.localeCompare(glyph.glyph_id) <= 0);
        }
      }
    }
  }
});

test("vintage-kana fallback remains byte-equivalent as data to the UI glyph master", () => {
  const match = html.match(/const FALLBACK_GLYPHS=(\[[^\n]+\]);/);
  assert.ok(match, "FALLBACK_GLYPHS not found");
  assert.deepEqual(JSON.parse(match[1]), master.glyphs);
});
