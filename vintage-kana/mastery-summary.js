/* vintage-kana: one canonical calculation for cinematic and detailed mastery rings. */
(function(root){
 "use strict";
 const recordKey="vintage-kana:learning-events:v1";
 function filterLearningEvents(input){
   return Array.isArray(input)?input.filter(e=>e&&(e.mode==="reading"||e.mode==="jibo"||e.mode==="decipher")&&(e.outcome==="correct"||e.outcome==="incorrect")):[];
 }
 function readLearningEvents(){
   try{return filterLearningEvents(JSON.parse(root.localStorage.getItem(recordKey)||"[]"))}
   catch(e){console.warn("learning record load failed",e);return []}
 }
 // 解読の記録は一問ごとに保存し、習熟度集計時だけ正解字形へ展開する。
 // 既存の一字問題の件数・セット数へ混ぜない。
 function readMasteryEvents(){
   const events=readLearningEvents();
   try{
     const records=JSON.parse(root.localStorage.getItem("vintage-kana:decipher-history:v1")||"[]");
     if(!Array.isArray(records))return events;
     for(const record of records){
       if(!record||record.correct!==true||!Array.isArray(record.glyphs))continue;
       const seen=new Set();
       record.glyphs.forEach((glyph,i)=>{
         if(!glyph||!glyph.character||!glyph.glyphId||seen.has(glyph.character))return;
         seen.add(glyph.character);
         events.push({
           id:String(record.id)+":glyph:"+i,at:record.at,localDate:record.localDate,
           setId:String(record.id),mode:"decipher",masteryMethod:"free-input",
           outcome:"correct",glyph:glyph.character,glyphId:glyph.glyphId,kana:glyph.base,jibo:glyph.jibo
         });
       });
     }
   }catch(e){console.warn("decipher history load failed",e)}
   return events;
 }
 // Same formula as the detailed page: per-glyph last-five accuracy multiplied by
 // answered-glyph coverage. Unattempted glyphs remain in the denominator.
 function overallMasteryPercent(glyphs,events){
   if(!Array.isArray(glyphs)||!glyphs.length)return 0;
   const known=new Set(glyphs.map(g=>g.character)),byGlyph=new Map();
   filterLearningEvents(events).forEach(e=>{
     if(!known.has(e.glyph))return;
     if(!byGlyph.has(e.glyph))byGlyph.set(e.glyph,[]);
     byGlyph.get(e.glyph).push(e);
   });
   let sum=0;
   byGlyph.forEach(events=>{
     const recent=events.slice().sort((a,b)=>String(a.at||"").localeCompare(String(b.at||""))||String(a.id||"").localeCompare(String(b.id||""))).slice(-5);
     sum+=recent.filter(e=>e.outcome==="correct").length*(60/recent.length);
   });
   return Math.floor(sum*100/(60*glyphs.length));
 }
 root.VintageKanaMastery=Object.freeze({recordKey,filterLearningEvents,readLearningEvents,readMasteryEvents,overallMasteryPercent});
})(window);
