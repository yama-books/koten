import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../vintage-kana/index.html", import.meta.url), "utf8");
const glyphMaster = JSON.parse(readFileSync(new URL("../../vintage-kana/data/ui-glyph-master.json", import.meta.url), "utf8"));

test("vintage-kana RC25 staged quiz thresholds stay fixed", () => {
  assert.match(html, /const QUIZ_SET_SIZE=5;/);
  assert.match(html, /const QUIZ_CORRECT_POINTS=10;/);
  assert.match(html, /const QUIZ_ATTEMPT_POINTS=1;/);
  assert.match(html, /const CHOICE_MASTERY_INCREMENT=5;/);
  assert.match(html, /const CHOICE_MASTERY_CAP=65;/);
  assert.match(html, /const FREE_INPUT_MASTERY_INCREMENT=9;/);
  assert.match(html, /const FREE_INPUT_MASTERY_CAP=90;/);
  assert.match(html, /const OVER_NINETY_MASTERY_INCREMENT=2;/);
  assert.match(html, /const DAILY_MASTERY_GAIN_CAP=20;/);
  assert.match(html, /const CHOICE_INCORRECT_DECREMENT=3;/);
  assert.match(html, /const FREE_INPUT_INCORRECT_DECREMENT=5;/);
  assert.match(html, /const JIBO_REVERSE_MASTERY_THRESHOLD=65;/);
  assert.match(html, /return mastery>=CHOICE_MASTERY_CAP\?"free-input":"choice"/);
  assert.match(html, /mastery>=30\?focusedReadingPool\(quizEntry\)/);
  assert.match(html, /mastery>=30\?focusedJiboPool\(quizEntry\)/);
  assert.match(html, /masteryMethod==="free-input"\|\|e\.masteryMethod==="jibo-reverse"/);
});

test("vintage-kana keeps the mobile answer grid as a 2x2 bento", () => {
  assert.match(
    html,
    /@media\(max-width:720px\)\{[\s\S]*?\.choices\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:8px\}/,
  );
  assert.match(html, /\.choice\{[^}]*font-size:30px;[^}]*min-height:84px;/);
});

test("vintage-kana narrow navigation remains tappable without wrapping the three primary tabs", () => {
  assert.match(html, /\.tab\{[^}]*min-height:44px;/);
  assert.match(html, /@media\(max-width:720px\)\{button\{min-height:44px\}/);
  assert.match(html, /<button id="openHelp" class="learnHelpBtn" type="button" aria-label="変体仮名とは？">/);
  assert.match(html, /\.quizModeBtn\{min-height:44px;/);
  assert.match(html, /\.quizScreenBtn\{min-height:44px;/);
  assert.match(
    html,
    /@media\(max-width:380px\)\{\.learnHelpBtn\{width:44px;[^}]*\}\.learnHelpBtn>span:last-child\{display:none\}\.utilityTabs\{flex:1;justify-content:flex-end\}/,
  );
});

test("vintage-kana points stay hidden until the five-question result screen", () => {
  assert.match(html, /<div id="quizResult" class="quizStage setResult" hidden>/);
  assert.match(html, /<strong id="setPoints">\+0<\/strong><span>ポイント<\/span>/);
  assert.doesNotMatch(
    html.match(/<div id="quizPractice" class="quizStage">[\s\S]*?<\/div>\s*<div id="quizResult"/)?.[0] ?? "",
    /id="setPoints"/,
  );
});


test("vintage-kana record mastery uses glyph-first ring cards with 3-to-2 responsive columns", () => {
  assert.match(html, /\.rowGlyphMastery\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html, /\.glyphMasteryCard\{[^}]*aspect-ratio:1\/1\.12;/);
  assert.match(html, /\.glyphMasteryCore\{[^}]*transform:translate\(5px,8px\)/);
  assert.match(html, /\.glyphMasteryGlyph\{[^}]*font-family:"Noto Serif Hentaigana"/);
  assert.match(html, /@media\(max-width:360px\)\{\.rowGlyphMastery\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}\}/);
  assert.match(html, /@media\(orientation:landscape\) and \(min-width:721px\)\{\.rowGlyphMastery\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)\}\}/);
  assert.match(html, /class="glyphMasteryRing"[^>]*role="meter"/);
  assert.match(html, /class="glyphMasteryReading">/);
  assert.match(html, /class="glyphMasteryJibo">'\+escapeHtml\(g\.jibo\)/);
  assert.doesNotMatch(html, /class="glyphMasteryJibo">字母 /);
  assert.match(html, /class="glyphMasteryPercent">/);
  assert.match(html, /id="glyphInfoDialog"/);
  assert.match(html, /data-glyph-info/);
  assert.doesNotMatch(html, /class="masteryBar"/);
});

test("vintage-kana choice questions use larger labels without the redundant 4-choice hint", () => {
  assert.match(html, /\.choice\{[^}]*font-size:30px;/);
  assert.match(html, /\.choices\.glyphChoices \.choice\{[^}]*font-size:48px/);
  assert.doesNotMatch(html, /"4択"/);
});

test("vintage-kana advanced jibo questions show exactly one correct glyph choice per jibo prompt", () => {
  assert.match(html, /if\(mode==="jibo" && mastery>=JIBO_REVERSE_MASTERY_THRESHOLD\)return "jibo-reverse"/);
  assert.match(html, /return "jibo-reverse"/);
  assert.match(html, /function reverseJiboChoices\(entry\)/);
  assert.match(html, /const same=shuffle\(valid\.filter\(f=>row\.includes\(f\.kana\)\)\)/);
  assert.match(html, /const other=shuffle\(valid\.filter\(f=>!row\.includes\(f\.kana\)\)\)/);
  assert.match(html, /const standard=shuffle\(valid\.filter\(f=>f\.isStandard\)\)/);
  assert.match(html, /const valid=allKanaForms\(\)\.filter\(f=>f\.character!==entry\.character && f\.jibo!==entry\.jibo\)/);
  assert.match(html, /この字母からできた平仮名はどれ？/);
  assert.match(html, /id="jiboAnswerReading"/);
  assert.match(html, /jiboAnswerReading\.textContent=quizEntry\.kana/);
});


test("vintage-kana help is modal and browse navigation uses the compact row menu", () => {
  assert.match(html, /h1\{font-family:var\(--font-ui\)/);
  assert.match(html, /data-view="browse">一覧<\/button>/);
  assert.match(html, /id="helpDialog" class="helpDialog"/);
  assert.match(html, /className="kanaFilterRow"/);
  assert.match(html, /className="kanaFilterRow__buttons"/);
});

test("vintage-kana keeps U+1B11C mapped to を / 遠 in the current glyph master", () => {
  const item = glyphMaster.glyphs.find((g: { glyph_id: string }) => g.glyph_id === "U+1B11C");
  assert.ok(item);
  assert.equal(item.kana, "を");
  assert.equal(item.jibo, "遠");
  assert.equal(item.character, "𛄜");
  assert.equal(glyphMaster.glyphs.some((g: { glyph_id: string; kana: string }) => g.glyph_id === "U+1B11C" && g.kana === "せ"), false);
});
