import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const simple = readFileSync(new URL("../../vintage-kana/index.html", import.meta.url), "utf8");
const detail = readFileSync(new URL("../../vintage-kana/detail.html", import.meta.url), "utf8");

test("vintage-kana: cinematic entry exposes a direct learning record link", () => {
  assert.match(
    simple,
    /<a class="record-quick-link" href="\.\/detail\.html#record" aria-label="学習記録を見る">記録を見る<\/a>/,
  );
  assert.match(simple, /\.record-quick-link\s*\{/);
});

test("vintage-kana: detailed record route waits for glyph data and activates the quiz view", () => {
  assert.match(detail, /function openRecordFromUrl\(\)/);
  assert.match(detail, /window\.location\.hash\s*!==\s*"#record"/);
  assert.match(detail, /document\.querySelector\('\[data-view="quiz"\]'\)/);
  assert.match(detail, /openQuizRecord\(\);/);
  assert.match(detail, /loadData\(\)\.then\(\(\)\s*=>\s*\{/);
  assert.match(detail, /recordRouteReady=true;\s*openRecordFromUrl\(\);/);
  assert.match(detail, /window\.addEventListener\("hashchange"/);
});

test("vintage-kana: existing reverse conversion and flash glyph safeguards remain present", () => {
  assert.match(simple, /name="conversionMode" value="reverse"/);
  assert.match(simple, /function transformText\(text,mode=getConversionMode\(\)\)/);
  assert.match(simple, /if\(p>\.88&&!el\.dataset\.converted\)/);
  assert.match(simple, /await ensureMotionTargetFont\(mode,motionOut\);/);
});
