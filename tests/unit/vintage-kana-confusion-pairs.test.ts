import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

type Glyph = {
  kana: string;
  glyph_id: string;
  jibo: string;
};

type Pair = {
  a: string;
  b: string;
  kind: "hentaigana-standard" | "hentaigana-hentaigana";
  evidence: "audit" | "render" | "render-unreviewed";
  score: number | null;
  note: string;
};

type ConfusionData = {
  schemaVersion: number;
  generatedAt: string;
  method: string;
  universe: {
    hentaigana: number;
    standardHiragana: number;
  };
  pairs: Pair[];
};

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../vintage-kana/data/${name}`, import.meta.url), "utf8"));

const confusion = read("glyph-confusion-pairs.json") as ConfusionData;
const uiMaster = read("ui-glyph-master.json") as { glyphCount: number; glyphs: Glyph[] };

const KANA_ORDER = [..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわゐゑをん"];
const STANDARD_HIRAGANA_JIBO: Record<string, string> = {
  "あ": "安", "い": "以", "う": "宇", "え": "衣", "お": "於",
  "か": "加", "き": "幾", "く": "久", "け": "計", "こ": "己",
  "さ": "左", "し": "之", "す": "寸", "せ": "世", "そ": "曾",
  "た": "太", "ち": "知", "つ": "川", "て": "天", "と": "止",
  "な": "奈", "に": "仁", "ぬ": "奴", "ね": "禰", "の": "乃",
  "は": "波", "ひ": "比", "ふ": "不", "へ": "部", "ほ": "保",
  "ま": "末", "み": "美", "む": "武", "め": "女", "も": "毛",
  "や": "也", "ゆ": "由", "よ": "與",
  "ら": "良", "り": "利", "る": "留", "れ": "禮", "ろ": "呂",
  "わ": "和", "ゐ": "爲", "ゑ": "惠", "を": "遠", "ん": "无",
};

const glyphById = new Map(uiMaster.glyphs.map((g) => [g.glyph_id, g]));
const standardIds = new Set(KANA_ORDER.map((kana) => `std:${kana}`));
const canonicalKey = (a: string, b: string) => [a, b].sort().join("\u0000");
const isStandard = (id: string) => id.startsWith("std:");

function meta(id: string): { kana: string; jibo: string } {
  if (isStandard(id)) {
    const kana = id.slice(4);
    const jibo = STANDARD_HIRAGANA_JIBO[kana];
    assert.ok(jibo, `標準ひらがなの字母が未定義: ${id}`);
    return { kana, jibo };
  }
  const glyph = glyphById.get(id);
  assert.ok(glyph, `ui-glyph-master.json に存在しない glyph_id: ${id}`);
  return glyph;
}

test("全識別子はUI字体266件か標準ひらがな48字に属する", () => {
  for (const pair of confusion.pairs) {
    for (const id of [pair.a, pair.b]) {
      assert.ok(glyphById.has(id) || standardIds.has(id), `未知の識別子: ${id}`);
    }
  }
});

test("自己ペアと重複ペアが無い（順序違いも重複扱い）", () => {
  const seen = new Set<string>();
  for (const pair of confusion.pairs) {
    assert.notEqual(pair.a, pair.b, `自己ペア: ${pair.a}`);
    const key = canonicalKey(pair.a, pair.b);
    assert.ok(!seen.has(key), `重複ペア: ${pair.a} / ${pair.b}`);
    seen.add(key);
  }
});

test("全ペアが a < b の正規化順序を守る", () => {
  for (const pair of confusion.pairs) {
    assert.ok(pair.a < pair.b, `順序違反: ${pair.a} / ${pair.b}`);
  }
});

test("同じkanaどうし・同じjiboどうしの組が無い", () => {
  for (const pair of confusion.pairs) {
    const a = meta(pair.a);
    const b = meta(pair.b);
    assert.notEqual(a.kana, b.kana, `同じ kana: ${pair.a} / ${pair.b}`);
    assert.notEqual(a.jibo, b.jibo, `同じ jibo: ${pair.a} / ${pair.b}`);
  }
});

test("kind が識別子の種類と一致する", () => {
  for (const pair of confusion.pairs) {
    const standardCount = Number(isStandard(pair.a)) + Number(isStandard(pair.b));
    assert.notEqual(standardCount, 2, `標準ひらがな同士のペアは不可: ${pair.a} / ${pair.b}`);
    const expected = standardCount === 1 ? "hentaigana-standard" : "hentaigana-hentaigana";
    assert.equal(pair.kind, expected, `${pair.a} / ${pair.b}`);
  }
});

test("evidence と score が許可された値だけを使う", () => {
  const evidence = new Set(["audit", "render", "render-unreviewed"]);
  for (const pair of confusion.pairs) {
    assert.ok(evidence.has(pair.evidence), `未知の evidence: ${pair.evidence}`);
    assert.ok(
      pair.score === null || (Number.isFinite(pair.score) && pair.score >= 0 && pair.score <= 1),
      `不正な score: ${pair.a} / ${pair.b}`,
    );
  }
});

test("監査で確定している3組を audit として保持する", () => {
  const pairs = new Map(confusion.pairs.map((pair) => [canonicalKey(pair.a, pair.b), pair]));
  for (const [a, b] of [
    ["U+1B052", "std:を"],
    ["U+1B052", "U+1B11B"],
    ["U+1B11A", "std:せ"],
  ]) {
    const pair = pairs.get(canonicalKey(a, b));
    assert.ok(pair, `監査確定ペアが欠落: ${a} / ${b}`);
    assert.equal(pair.evidence, "audit", `${a} / ${b}`);
  }
});

test("universe はUI字体の実件数と標準ひらがな48字に一致する", () => {
  assert.equal(uiMaster.glyphCount, uiMaster.glyphs.length);
  assert.equal(confusion.universe.hentaigana, uiMaster.glyphs.length);
  assert.equal(KANA_ORDER.length, 48);
  assert.equal(new Set(KANA_ORDER).size, 48);
  assert.equal(Object.keys(STANDARD_HIRAGANA_JIBO).length, 48);
  assert.equal(confusion.universe.standardHiragana, 48);
});

test("index.html の FALLBACK_CONFUSION_PAIRS は glyph-confusion-pairs.json の pairs と同値", () => {
  const html = readFileSync(new URL("../../vintage-kana/index.html", import.meta.url), "utf8");
  const match = html.match(/const FALLBACK_CONFUSION_PAIRS=(\[.*?\]);/s);
  assert.ok(match, "FALLBACK_CONFUSION_PAIRS が index.html に見つからない");
  const fallback = JSON.parse(match[1]) as { a: string; b: string }[];

  const fallbackKeys = new Set(fallback.map((pair) => canonicalKey(pair.a, pair.b)));
  const jsonKeys = new Set(confusion.pairs.map((pair) => canonicalKey(pair.a, pair.b)));
  assert.equal(fallback.length, confusion.pairs.length);
  assert.deepEqual(fallbackKeys, jsonKeys);
});
