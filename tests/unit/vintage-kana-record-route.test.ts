import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const simple=readFileSync(new URL("../../vintage-kana/index.html",import.meta.url),"utf8");
const detail=readFileSync(new URL("../../vintage-kana/detail.html",import.meta.url),"utf8");

test("simple: A-style mastery circle replaces the old record label",()=>{
 assert.match(simple,/id="masteryShortcut" href="\.\/detail\.html#record"/);
 assert.match(simple,/id="masteryShortcutRing"/);
 assert.match(simple,/<span>習熟度<\/span>/);
 assert.doesNotMatch(simple,/>記録を見る<\/a>/);
 assert.match(simple,/VintageKanaMastery\.overallMasteryPercent\(masteryGlyphs,events\)/);
});
test("detailed view: mastery ring is inside the quiz pill with separate actions",()=>{
 assert.match(detail,/class="quizTabCluster" id="quizTabCluster"/);
 assert.match(detail,/<button class="tab" data-view="quiz">習得する<\/button>/);
 assert.match(detail,/class="masteryRingAction" type="button" id="masteryRingAction"/);
 assert.match(detail,/addEventListener\("click",showRecordFromNavigation\)/);
 assert.match(detail,/function showRecordFromNavigation\(\)/);
 assert.match(detail,/syncQuizTabCluster\(\)/);
});
test("mastery formula is shared and learning-record deep link still resolves after load",()=>{
 for(const html of [simple,detail])assert.match(html,/<script src="\.\/mastery-summary\.js"><\/script>/);
 assert.match(detail,/return VintageKanaMastery\.overallMasteryPercent\(GLYPHS,allMasteryEvents\(\)\)/);
 assert.match(detail,/function openRecordFromUrl\(\)/);
 assert.match(detail,/window\.location\.hash==="#record"/);
 assert.match(detail,/loadData\(\)\.then\(\(\)\s*=>\s*\{/);
 assert.match(detail,/recordRouteReady=true;/);
 assert.match(detail,/window\.addEventListener\("hashchange"/);
});
test("reverse conversion and flash safeguards are preserved",()=>{
 assert.match(simple,/name="conversionMode" value="reverse"/);
 assert.match(simple,/function transformText\(text,mode=getConversionMode\(\)\)/);
 assert.match(simple,/if\(p>\.88&&!el\.dataset\.converted\)/);
 assert.match(simple,/await ensureMotionTargetFont\(mode,motionOut\);/);
});
