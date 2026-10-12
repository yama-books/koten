import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {test} from "node:test";

const html=readFileSync(new URL("../../vintage-kana/detail.html",import.meta.url),"utf8");
const index=readFileSync(new URL("../../vintage-kana/index.html",import.meta.url),"utf8");
const engine=readFileSync(new URL("../../vintage-kana/decipher-engine.js",import.meta.url),"utf8");
const phraseData=JSON.parse(readFileSync(new URL("../../vintage-kana/data/decipher-phrases.json",import.meta.url),"utf8"));
const master=JSON.parse(readFileSync(new URL("../../vintage-kana/data/ui-glyph-master.json",import.meta.url),"utf8"));
const context=runInNewContext("globalThis", {Math,Set,Map,JSON,String,Number,Boolean,Array,Object,RegExp});
runInNewContext(engine,context);
const d=context.VintageKanaDecipher;
const phrases=phraseData.phrases;

test("371 approved phrases retain exact categories, no duplicates or small kana",()=>{
 assert.equal(phrases.length,371);
 assert.equal(new Set(phrases.map((x:any)=>x.id)).size,371);
 assert.equal(new Set(phrases.map((x:any)=>x.reading)).size,371);
 assert.ok(phrases.every((x:any)=>d.validPhrase(x)));
 const counts=Object.fromEntries([...new Set(phrases.map((x:any)=>x.category))].map(k=>[k,phrases.filter((x:any)=>x.category===k).length]));
 assert.deepEqual(Object.values(counts).sort((a:any,b:any)=>a-b),[19,20,25,30,33,40,40,45,59,60]);
 for(const x of ["なんとかなる","だめよだめだめ","むげんのかなたへ","ひとのゆめはおわらねえ","むだむだむだ"])assert.ok(!phrases.some((p:any)=>p.reading===x));
 for(const x of ["きみのなは","となりのととろ","あきらめたらしあいおわり","すきすぎてめつ"])assert.ok(phrases.some((p:any)=>p.reading===x));
});
test("five levels have words and glyph candidates conform to the master",()=>{
 for(const l of d.LEVELS){
   const p=d.pickPhrase(phrases,[],l.level,[],()=>.31);
   assert.ok(p);
   assert.ok(p.reading.length>=l.min&&p.reading.length<=l.max);
   const tokens=d.generateTokens(p,master.glyphs,l.level,()=>0,()=>.4);
   assert.equal(tokens.length,p.reading.length);
   tokens.forEach((t:any,i:number)=>{
     assert.equal(t.position,i);
     if(!t.character){assert.equal(t.kana,"ん");return}
     assert.ok(master.glyphs.some((g:any)=>g.glyph_id===t.glyphId&&g.kana===t.base&&g.character===t.character));
   });
 }
});
test("same kana at different positions draws independently and voiced marks use base glyph",()=>{
 const p={id:"synthetic",reading:"ととと"};
 const forms=[{kana:"と",character:"𛁷",glyph_id:"g1",jibo:"止",totalObserved:100,witnessCount:5},
 {kana:"と",character:"𛁻",glyph_id:"g2",jibo:"登",totalObserved:80,witnessCount:4}];
 const seq=[0,.9999,0];
 const a=d.generateTokens(p,forms,5,()=>0,()=>seq.shift());
 assert.notEqual(a[0].character,a[1].character);
 assert.equal(a[0].character,a[2].character);
 const voiced=d.generateTokens({id:"voiced",reading:"がが"},[{kana:"か",character:"𛀚",glyph_id:"g3",jibo:"可"}],5);
 assert.equal(voiced[0].base,"か");
 assert.ok(voiced[0].display.endsWith("\u3099"));
});
test("phrase correctness grants per-glyph events only on correct, once per shape",()=>{
 const glyphs=[{glyphId:"a",character:"𛁷",base:"と",jibo:"止"},
 {glyphId:"a",character:"𛁷",base:"と",jibo:"止"},
 {glyphId:"b",character:"𛃄",base:"ま",jibo:"万"}];
 const right={id:"answer1",at:"2026-10-13T00:00:00Z",localDate:"2026-10-13",correct:true,glyphs};
 const wrong={id:"answer2",at:"2026-10-13T00:00:00Z",localDate:"2026-10-13",correct:false,glyphs};
 const events=d.glyphEvents([right,wrong]);
 assert.equal(events.length,2);
 assert.ok(events.every((e:any)=>e.mode==="decipher"&&e.outcome==="correct"&&e.masteryMethod==="free-input"));
 assert.equal(d.isCorrectAnswer("トマト","とまと"),true);
 assert.equal(d.isCorrectAnswer("とま","とまと"),false);
});
test("level promotion is evidence gated and setback is gradual",()=>{
 const history=Array.from({length:10},(_,i)=>({phraseId:"p"+i,level:2,correct:i<8,glyphs:[{glyphId:"g"+i}]}));
 assert.equal(d.nextLevel(history,2),3);
 const poor=Array.from({length:8},(_,i)=>({phraseId:"p"+i,level:4,correct:i<4,glyphs:[]}));
 assert.equal(d.nextLevel(poor,4),3);
 assert.equal(d.nextLevel([],1),1);
});
test("UI exposes three modes; cinematic ring and old record remain compatible",()=>{
 assert.match(html,/data-quiz-mode="reading">読み<\/button>/);
 assert.match(html,/data-quiz-mode="jibo">字母<\/button>/);
 assert.match(html,/data-quiz-mode="decipher">解読<\/button>/);
 assert.match(html,/id="decipherLevel"/);
 assert.match(html,/id="decipherNote"/);
 assert.match(html,/function newDecipherQuiz\(\)/);
 assert.match(html,/function allMasteryEvents\(\)/);
 assert.match(html,/recordLearningAttempt\(quizMode,correct,quizQuestionMethod,currentQuestionType\)/);
 assert.match(index,/VintageKanaMastery\.readMasteryEvents\(\)/);
 assert.match(index,/VintageKanaMastery\.overallMasteryPercent\(masteryGlyphs,events\)/);
});
