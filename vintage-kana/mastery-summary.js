/* vintage-kana: one canonical calculation for cinematic and detailed mastery rings. */
(function(root){
 "use strict";
 const recordKey="vintage-kana:learning-events:v1";
 function filterLearningEvents(input){
   return Array.isArray(input)?input.filter(e=>e&&(e.mode==="reading"||e.mode==="jibo")&&(e.outcome==="correct"||e.outcome==="incorrect")):[];
 }
 function readLearningEvents(){
   try{return filterLearningEvents(JSON.parse(root.localStorage.getItem(recordKey)||"[]"))}
   catch(e){console.warn("learning record load failed",e);return []}
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
 root.VintageKanaMastery=Object.freeze({recordKey,filterLearningEvents,readLearningEvents,overallMasteryPercent});
})(window);
