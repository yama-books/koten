import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {test} from "node:test";

const html=readFileSync(new URL("../../vintage-kana/detail.html",import.meta.url),"utf8");
const index=readFileSync(new URL("../../vintage-kana/index.html",import.meta.url),"utf8");
const engine=readFileSync(new URL("../../vintage-kana/decipher-engine.js",import.meta.url),"utf8");
const phraseData=JSON.parse(readFileSync(new URL("../../vintage-kana/data/decipher-phrases.json",import.meta.url),"utf8"));
const wakaData=JSON.parse(readFileSync(new URL("../../vintage-kana/data/hyakunin-lower-verses.json",import.meta.url),"utf8"));
const wakaSource=readFileSync(new URL("../../百人一首_読み_歴史的仮名遣い_作者訂正版_v2.md",import.meta.url),"utf8");
const master=JSON.parse(readFileSync(new URL("../../vintage-kana/data/ui-glyph-master.json",import.meta.url),"utf8"));
const context=runInNewContext("globalThis", {Math,Set,Map,JSON,String,Number,Boolean,Array,Object,RegExp});
runInNewContext(engine,context);
const d=context.VintageKanaDecipher;
const phrases=phraseData.phrases;

test("367 approved modern phrases retain exact categories and unique readings",()=>{
 assert.equal(phrases.length,367);
 assert.equal(new Set(phrases.map((x:any)=>x.id)).size,367);
 assert.equal(new Set(phrases.map((x:any)=>x.reading)).size,367);
 assert.ok(phrases.every((x:any)=>d.validPhrase(x)));
 const counts=Object.fromEntries([...new Set(phrases.map((x:any)=>x.category))].map(k=>[k,phrases.filter((x:any)=>x.category===k).length]));
 assert.deepEqual(Object.values(counts).sort((a:any,b:any)=>a-b),[19,20,25,29,33,40,40,50,50,61]);
 for(const x of ["なんとかなる","だめよだめだめ","むげんのかなたへ","ひとのゆめはおわらねえ","むだむだむだ"])assert.ok(!phrases.some((p:any)=>p.reading===x));
 for(const x of ["きみのなは","となりのととろ","あきらめたらしあいおわり","すきすぎてめつ"])assert.ok(phrases.some((p:any)=>p.reading===x));
});
test("initial composition and quiz sources remain independent",()=>{
 const requested=["つきがきれいですね","ねこにこばん","ぶたにしんじゆ","うまのみみにねんぶつ","にわのわに"];
 for(const reading of requested)assert.equal(phrases.filter((p:any)=>p.reading===reading).length,1);
 assert.equal(d.pickInitialPhrase(phrases,()=>0).reading,phrases[0].reading);
 assert.equal(d.pickInitialPhrase(phrases,()=>.999999).reading,phrases.at(-1).reading);
 assert.equal(d.pickInitialPhrase([],()=>0),null);
 assert.equal(d.pickInitialPhrase([{id:"invalid",reading:"ABC"},phrases[0]],()=>0).reading,phrases[0].reading);
 assert.match(index,/VintageKanaDecipher\.pickComposerPhrase\(modern,historical,"simple"\)/);
 assert.match(html,/VintageKanaDecipher\.pickComposerPhrase\(decipherPhrases,historicalPhrases,"detail"\)/);
 assert.match(index,/hyakunin-lower-verses\.json/);
 assert.match(html,/hyakunin-lower-verses\.json/);
 assert.match(index,/!initialPhraseEdited&&!running/);
 assert.match(html,/source\.dataset\.userEdited!=="true"/);
});
test("curated phrases use full-sized kana; removed phrases stay absent",()=>{
 const removed=["ねこがなく","さんぽみち","ぶたにしんじゅ"];
 const added=["こんなんはぶんかつせよ","めろすはげきどした",
   "せきたんをばはやつみはてつ","なまえはまだない","わがはいはねこである"];
 for(const reading of removed)assert.equal(phrases.filter((p:any)=>p.reading===reading).length,0);
 for(const reading of added)assert.equal(phrases.filter((p:any)=>p.reading===reading).length,1);
 assert.ok(phrases.every((p:any)=>!/[ぁぃぅぇぉゃゅょっゎ]/u.test(p.reading)));
 const phrase=phrases.find((p:any)=>p.id==="dc-0373");
 assert.equal(phrase?.reading,"ぶたにしんじゆ");
 assert.equal(d.validPhrase(phrase),true);
 const tokens=d.generateTokens(phrase,master.glyphs,5);
 const yu=tokens.find((t:any)=>t.kana==="ゆ");
 assert.equal(yu?.base,"ゆ");
 assert.ok(yu?.character,"ゆ is converted to a hentaigana glyph");
 assert.ok(d.uniqueGlyphTokens(tokens).some((t:any)=>t.kana==="ゆ"));
});
test("ten flat sentences removed, but seasonal phrases retained",()=>{
 const removed=["とりがなく","あめがふる","ゆきがふる","かぜがふく",
  "ねこがねる","ねこがのびる","いぬがはしる","くまがねむる",
  "うみがひかる","ほしがきえる"];
 for(const reading of removed)assert.ok(!phrases.some((p:any)=>p.reading===reading));
 for(const reading of ["やまがわらう","はるがきた"])assert.ok(phrases.some((p:any)=>p.reading===reading));
});
test("100 waka lower verses match the canonical historical-kana five-phrase source",()=>{
 const rows=[...wakaSource.matchAll(/^\|\s*(\d{1,3})\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/gm)];
 const waka=wakaData.phrases;
 assert.equal(rows.length,100);
 assert.equal(waka.length,100);
 assert.equal(new Set(waka.map((p:any)=>p.id)).size,100);
 assert.equal(new Set(waka.map((p:any)=>p.reading)).size,100);
 waka.forEach((p:any,i:number)=>{
   assert.equal(p.number,i+1);
   assert.equal(p.id,"hy-"+String(i+1).padStart(4,"0"));
   assert.equal(p.fourth,rows[i][6].trim());
   assert.equal(p.fifth,rows[i][7].trim());
   assert.equal(p.reading,p.fourth+p.fifth);
   assert.equal(p.orthography,"historical");
   assert.ok(d.validPhrase(p));
 });
 assert.equal(waka[0].reading,"わがころもではつゆにぬれつつ");
 assert.equal(waka[99].reading,"なほあまりあるむかしなりけり");
});
test("initial sampling separates modern and historical phrase frequencies",()=>{
 const waka=wakaData.phrases;
 const short={id:"short",reading:"そら"};
 const long={id:"long",reading:"やまがわらう"};
 assert.equal(d.pickComposerPhrase([short,long],waka,"simple",()=>.9).reading,long.reading);
 assert.equal(d.pickComposerPhrase([short,long],waka,"detail",()=>.9).reading,long.reading);
 const useFirstModern=(()=>{const draws=[.9,0];return ()=>draws.shift()})();
 assert.equal(d.pickComposerPhrase([short,long],waka,"detail",useFirstModern).reading,short.reading);
 assert.equal(d.pickComposerPhrase([short],waka,"simple",()=>.9).category,"百人一首・下の句");
 assert.equal(d.pickComposerPhrase([],[], "simple",()=>0),null);
 // Deterministic fractions: 1/7 in simple, 1/10 in detail.
 const categoryPick=(variant:string,value:number)=>d.pickComposerPhrase([long],waka,variant,()=>value).category;
 assert.equal(categoryPick("simple",.14),"百人一首・下の句");
 assert.equal(categoryPick("simple",.15),long.category);
 assert.equal(categoryPick("detail",.09),"百人一首・下の句");
 assert.equal(categoryPick("detail",.11),long.category);
 for(const variant of ["simple","detail"]){
   const chance=variant==="simple"?1/7:1/10;
   const n=7000;
   const classical=Array.from({length:n},(_,i)=>categoryPick(variant,(i+.5)/n))
     .filter(c=>c==="百人一首・下の句").length;
   assert.ok(Math.abs(classical/n-chance)<.001);
 }
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

test("review collects unique glyphs across wrong and correct phrases without changing grading",()=>{
 const qs=[
  {correct:true,glyphs:[{character:"𛁷",glyphId:"x",base:"と",kana:"と",jibo:"止"},{character:"𛁷",glyphId:"x",base:"と",kana:"と",jibo:"止"}]},
  {correct:false,glyphs:[{character:"𛁷",glyphId:"x",base:"と",kana:"と",jibo:"止"},{character:"𛀚",glyphId:"y",base:"か",kana:"が",jibo:"可"}]},
  {correct:true,glyphs:[{character:"𛀚",glyphId:"y",base:"か",kana:"か",jibo:"可"}]},
 ];
 const list=d.collectSetGlyphs(qs);
 assert.equal(list.length,2);
 const g=list.find((x:any)=>x.glyphId==="y");
 assert.deepEqual(Array.from(g.readings),["が","か"]);
 assert.equal(g.inWrongPhrase,true);
 assert.equal(g.inCorrectPhrase,true);
 const events=d.glyphEvents(qs.map((q:any,i:number)=>({...q,id:"example"+i})));
 assert.equal(events.length,2);
});
test("decipher uses a visible untruncated input instruction with small placeholder",()=>{
 assert.doesNotMatch(html,/id="decipherInputLabel"/);
 assert.match(html,/form\.classList\.add\("isDecipherAnswer"\)/);
 assert.match(html,/document\.getElementById\("quizFreeAnswer"\)\.classList\.remove\("isDecipherAnswer"\)/);
 assert.match(html,/input\.placeholder="ひらがなで入力"/);
 assert.match(html,/\.quizFreeAnswer\.isDecipherAnswer\{display:grid;/);
});
test("both outcomes reveal glyph and jibo cards; five-question result includes all distinct shapes",()=>{
 assert.match(html,/renderDecipherBreakdown\(tokens,correct\)/);
 assert.match(html,/quizSet\.decipherResults\.push\(\{reading:phrase\.reading,correct,glyphs:/);
 assert.match(html,/VintageKanaDecipher\.collectSetGlyphs\(questions\)/);
 assert.match(html,/今回出会った字形/);
 assert.match(html,/decipherGlyphCardHtml\(t\.character,t\.base,t\.readings\.join\("・"\),t\.jibo\)/);
 assert.match(html,/bindGlyphInfoCards\(root\)/);
});

test("motion hooks do not change the one-word scoring rules or existing events",()=>{
 assert.match(html,/VintageKanaQuizMotion\.appearGlyphs\(glyph\)/);
 assert.match(html,/VintageKanaQuizMotion\.appearButtons\(root\)/);
 assert.match(html,/VintageKanaQuizMotion\.answer\(glyph,correct\)/);
 assert.match(html,/VintageKanaQuizMotion\.wave\(grid\)/);
 assert.match(html,/VintageKanaQuizMotion\.reflow\(grid,/);
 assert.match(html,/data-filter=/);
 assert.match(html,/読めなかった字/);
 assert.match(html,/ひらがなで入力/);
 assert.doesNotMatch(html,/誤答時も字形を復習できます。/);
 assert.match(html,/function recordLearningAttempt\(mode,correct,masteryMethod,questionType\)/);
});
test("visual motion module is syntactically valid and splits voiced combining marks correctly",()=>{
 const motion=readFileSync(new URL("../../vintage-kana/quiz-motion.js",import.meta.url),"utf8");
 const ctx:any={matchMedia:()=>({matches:true})};
 runInNewContext(motion,{globalThis:ctx,Math});
 assert.equal(ctx.VintageKanaQuizMotion.reduced(),true);
 assert.deepEqual(Array.from(ctx.VintageKanaQuizMotion.splitGlyphs("𛀚\u3099𛁷")),["𛀚\u3099","𛁷"]);
});
test("startup rings are indeterminate and have no invented progress percentage",()=>{
 assert.match(html,/id="vkmBoot"/);
 assert.match(index,/id="vkmStartup"/);
 assert.doesNotMatch(html,/変体仮名を準備しています/);
});
