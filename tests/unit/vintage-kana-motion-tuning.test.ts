import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {runInNewContext} from "node:vm";

const main = readFileSync(new URL("../../vintage-kana/detail.html", import.meta.url),"utf8");
const motion = readFileSync(new URL("../../vintage-kana/quiz-motion.js", import.meta.url),"utf8");

test("the approved help placement remains outside the menu",()=>{
  const header=main.match(/<header class="pageHeader">([\s\S]*?)<\/header>/)?.[1]||"";
  const nav=main.match(/<nav class="utilityTabs"[\s\S]*?<\/nav>/)?.[0]||"";
  assert.match(header,/id="openHelp"/);
  assert.doesNotMatch(nav,/id="openHelp"/);
  assert.match(nav,/data-view="compose"/);
  assert.match(nav,/data-view="browse"/);
  assert.match(nav,/data-view="quiz"/);
});

test("record cards glide slowly and progress drawing remains coordinated",()=>{
  assert.match(main,/\.recordGlide\.isIn\{animation:recordGlide 1\.16s/);
  assert.match(main,/\.recordRowGroup\.isDrawing \.ringMeter\{animation:recordDraw 1\.03s/);
  assert.match(main,/\.recordMastery\.isDrawing \.recordMastery__fill\{animation:recordBarGrow 1\.03s/);
  assert.match(main,/staggerRecordGlide\(cards,85\)/);
  assert.match(main,/staggerRecordGlide\(visible,90\)/);
  assert.match(main,/\(now-startTime\)\/990/);
  assert.match(main,/@media\(prefers-reduced-motion:reduce\)/);
});

test("question glyphs and choice buttons now enter slower with discernible movement",()=>{
  assert.match(motion,/translateY\(32px\) rotateX\(-58deg\) scale\(\.83\)/);
  assert.match(motion,/duration:720,delay:Math\.min\(i\*62,500\)/);
  assert.match(motion,/translateY\(19px\) scale\(\.95\)/);
  assert.match(motion,/duration:520,delay:i\*74/);
  assert.match(main,/VintageKanaQuizMotion\.appearGlyphs\(glyph\)/);
  assert.match(main,/VintageKanaQuizMotion\.appearButtons\(root\)/);
});

test("motion module still exposes reduced motion bypass and preserves voiced units",()=>{
  const root:any={matchMedia:()=>({matches:true})};
  runInNewContext(motion,{globalThis:root,Math});
  assert.equal(root.VintageKanaQuizMotion.reduced(),true);
  assert.deepEqual(Array.from(root.VintageKanaQuizMotion.splitGlyphs("𛀚\u3099𛁷")),["𛀚\u3099","𛁷"]);
  assert.match(motion,/if\(reduced\(\)\|\|!node\|\|!node\.isConnected/);
});
