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

test("approved slide-in runs on Browse and manual glyph picker, not record cards",()=>{
  assert.match(main,/@keyframes vkhSlowSlideIn\{/);
  assert.match(main,/translate3d\(35px,0,0\)/);
  assert.match(main,/#browse\.view\.active,#composeRows:not\(\.autoHidden\)\{\s*animation:vkhSlowSlideIn 1100ms/);
  assert.match(main,/#browse,#compose\{overflow-x:clip\}/);
  assert.match(main,/#browse\.view\.active,#composeRows:not\(\.autoHidden\)\{animation:none\}/);
  assert.match(main,/rows\.classList\.toggle\("autoHidden",composeMode==="auto"\)/);
  assert.match(main,/document\.getElementById\(b\.dataset\.view\)\.classList\.add\("active"\)/);
  assert.match(main,/\.recordGlide\.isIn\{animation:recordGlide \.86s/);
  assert.match(main,/staggerRecordGlide\(cards,70\)/);
  assert.match(main,/staggerRecordGlide\(visible,75\)/);
  assert.match(main,/\(now-startTime\)\/780/);
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
