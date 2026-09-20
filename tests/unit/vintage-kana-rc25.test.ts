import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../vintage-kana/index.html", import.meta.url), "utf8");

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
  assert.match(html, /computeGlyphMastery\(character\)>=CHOICE_MASTERY_CAP\?"free-input":"choice"/);
  assert.match(html, /mastery>=30\?focusedReadingPool\(quizEntry\)/);
  assert.match(html, /mastery>=30\?focusedJiboPool\(quizEntry\)/);
});

test("vintage-kana keeps the mobile answer grid as a 2x2 bento", () => {
  assert.match(
    html,
    /@media\(max-width:720px\)\{[\s\S]*?\.choices\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:8px\}/,
  );
  assert.match(html, /\.choice\{[^}]*min-height:78px;/);
});

test("vintage-kana narrow navigation remains tappable without wrapping the three primary tabs", () => {
  assert.match(html, /\.tab\{[^}]*min-height:44px;/);
  assert.match(html, /\.quizModeBtn\{min-height:40px;/);
  assert.match(html, /\.quizScreenBtn\{min-height:40px;/);
  assert.match(
    html,
    /@media\(max-width:380px\)\{\.learnHelp summary\{width:44px;[^}]*\}\.learnHelp summary>span:last-child\{display:none\}\.utilityTabs\{flex:1;justify-content:flex-end\}/,
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
