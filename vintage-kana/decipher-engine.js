/* vintage-kana 解読モード: 現代語句の出題と字形抽選。歴史的表記の再現ではない。 */
(function(root){
 "use strict";
 const HISTORY_KEY="vintage-kana:decipher-history:v1";
 const LEVEL_KEY="vintage-kana:decipher-level:v1";
 const LEVELS=Object.freeze([
   {level:1,min:2,max:3,jibo:1},
   {level:2,min:3,max:4,jibo:1},
   {level:3,min:4,max:6,jibo:2},
   {level:4,min:5,max:8,jibo:3},
   {level:5,min:7,max:20,jibo:Infinity}
 ]);
 const VOICED={};
 for(const [kana,base] of [
   ["が","か"],["ぎ","き"],["ぐ","く"],["げ","け"],["ご","こ"],
   ["ざ","さ"],["じ","し"],["ず","す"],["ぜ","せ"],["ぞ","そ"],
   ["だ","た"],["ぢ","ち"],["づ","つ"],["で","て"],["ど","と"],
   ["ば","は"],["び","ひ"],["ぶ","ふ"],["べ","へ"],["ぼ","ほ"],
   ["ぱ","は"],["ぴ","ひ"],["ぷ","ふ"],["ぺ","へ"],["ぽ","ほ"],["ゔ","う"]
 ])VOICED[kana]=base;
 const HANDMARK=new Set(["ぱ","ぴ","ぷ","ぺ","ぽ"]);
 function kanaInfo(kana){
   return {base:VOICED[kana]||kana,mark:HANDMARK.has(kana)?"\u309A":VOICED[kana]?"\u3099":""};
 }
 function baseKana(kana){
   if(kana==="ん")return null; // 「ん」はU+1B***字体習熟の分母外
   return kanaInfo(kana).base;
 }
 function levelConfig(level){return LEVELS[Math.max(1,Math.min(5,Number(level)||1))-1]}
 function lengthOf(phrase){return [...phrase.reading].length}
 function validPhrase(p){
   return p&&typeof p.id==="string"&&typeof p.reading==="string"
     &&/^[ぁ-ゖゐゑ]+$/u.test(p.reading)
     &&!/[ぁぃぅぇぉゃゅょっゎ]/u.test(p.reading)&&lengthOf(p)>=2;
 }
 // Initial composition samples uniformly from the approved quiz corpus.
 // Do not use the quiz level or learning history for the initial sentence.
 function pickInitialPhrase(phrases,rng=Math.random){
   const pool=Array.isArray(phrases)?phrases.filter(validPhrase):[];
   if(!pool.length)return null;
   const value=Number(rng());
   const fraction=Number.isFinite(value)?Math.max(0,Math.min(.999999999999,value)):0;
   return pool[Math.floor(fraction*pool.length)];
 }
 function countKana(history){
   const result=new Map();
   // 累積偏差ではなく最近の出題を評価。中断・再開を繰り返しても硬直しない。
   for(const attempt of history.slice(-500)){
     if(!attempt||typeof attempt.reading!=="string")continue;
     for(const char of attempt.reading){
       const kana=baseKana(char);
       if(kana)result.set(kana,(result.get(kana)||0)+1);
     }
   }
   return result;
 }
 function pickWeighted(items,weight,rng=Math.random){
   if(!items.length)return null;
   const weights=items.map(item=>Math.max(.00001,Number(weight(item))||0));
   const total=weights.reduce((sum,n)=>sum+n,0);
   let target=Math.max(0,Math.min(.999999999999,Number(rng())||0))*total;
   for(let i=0;i<items.length;i++){target-=weights[i];if(target<0)return items[i]}
   return items[items.length-1];
 }
 function pickPhrase(phrases,history,level,excludeIds=[],rng=Math.random){
   const spec=levelConfig(level),valid=phrases.filter(validPhrase);
   let eligible=valid.filter(p=>lengthOf(p)>=spec.min&&lengthOf(p)<=spec.max);
   if(!eligible.length)eligible=valid;
   const excluded=new Set(excludeIds);
   const recent=new Set(history.slice(-6).map(a=>a.phraseId));
   let pool=eligible.filter(p=>!excluded.has(p.id)&&!recent.has(p.id));
   if(!pool.length)pool=eligible.filter(p=>!excluded.has(p.id));
   if(!pool.length)pool=eligible;
   const counts=countKana(history);
   return pickWeighted(pool,p=>{
     const distinct=[...new Set([...p.reading].map(baseKana).filter(Boolean))];
     if(!distinct.length)return .01;
     const rare=distinct.reduce((sum,k)=>sum+1/Math.sqrt(2+(counts.get(k)||0)),0)/distinct.length;
     const same=history.slice(-20).filter(h=>h.phraseId===p.id).length;
     return rare/(1+same*2);
   },rng);
 }
 function compareGlyph(a,b){
   return (Number(b.totalObserved)||0)-(Number(a.totalObserved)||0)
     ||(Number(b.witnessCount)||0)-(Number(a.witnessCount)||0)
     ||String(a.glyph_id).localeCompare(String(b.glyph_id));
 }
 function candidatesFor(kana,glyphs,level){
   const forms=glyphs.filter(g=>g.kana===kana).slice().sort(compareGlyph);
   const count=levelConfig(level).jibo;
   if(!forms.length)return [];
   if(count===Infinity)return forms;
   const selected=[],seen=new Set();
   for(const form of forms){
     if(seen.has(form.jibo))continue;
     seen.add(form.jibo);selected.push(form);
     if(selected.length>=count)return selected;
   }
   // 同字母の字体しかない仮名も、上級では別字形を使えるようにする。
   for(const form of forms)if(!selected.includes(form)&&selected.length<count)selected.push(form);
   return selected;
 }
 function generateTokens(phrase,glyphs,level,mastery=()=>0,rng=Math.random){
   if(!validPhrase(phrase))throw Error("invalid decipher phrase");
   const tokens=[];
   for(const [position,kana] of [...phrase.reading].entries()){
     const info=kanaInfo(kana),candidates=candidatesFor(info.base,glyphs,level);
     const chosen=pickWeighted(candidates,g=>{
       const skill=Math.max(0,Math.min(100,Number(mastery(g.character))||0));
       // 字形頻度は候補の順位のみに使い、歴史的一般頻度とは呼ばない。
       return .75+(100-skill)/100*1.5;
     },rng);
     tokens.push(chosen
       ?{position,kana,base:info.base,mark:info.mark,character:chosen.character,glyphId:chosen.glyph_id,jibo:chosen.jibo,display:chosen.character+info.mark}
       :{position,kana,base:info.base,mark:"",character:"",glyphId:"",jibo:"",display:kana});
   }
   return tokens;
 }
 function uniqueGlyphTokens(tokens){
   const seen=new Set();
   return tokens.filter(t=>t.character&&!seen.has(t.character)&&seen.add(t.character));
 }
 // Pure review aggregation: shown glyphs do not imply the answer was correct.
 function collectSetGlyphs(questions){
   const shapes=new Map();
   for(const q of questions||[]){
     if(!Array.isArray(q?.glyphs))continue;
     for(const g of q.glyphs){
       if(!g?.character||!g?.glyphId)continue;
       let item=shapes.get(g.character);
       if(!item){
         item={character:g.character,glyphId:g.glyphId,base:g.base||"",jibo:g.jibo||"",
           readings:[],inCorrectPhrase:false,inWrongPhrase:false};
         shapes.set(g.character,item);
       }
       const kana=g.kana||g.base;
       if(kana&&!item.readings.includes(kana))item.readings.push(kana);
       if(q.correct)item.inCorrectPhrase=true;else item.inWrongPhrase=true;
     }
   }
   return [...shapes.values()];
 }
 function normalizedReading(text){
   return String(text||"").normalize("NFC").trim().replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-96));
 }
 function isCorrectAnswer(input,expected){return normalizedReading(input)===normalizedReading(expected)}
 function glyphEvents(history){
   const events=[];
   for(const q of history){
     if(!q||q.correct!==true||!Array.isArray(q.glyphs))continue;
     const seen=new Set();
     q.glyphs.forEach((g,i)=>{
       if(!g||!g.character||!g.glyphId||seen.has(g.character))return;
       seen.add(g.character);
       events.push({
         id:String(q.id)+":glyph:"+i,at:q.at,localDate:q.localDate,
         setId:String(q.id),mode:"decipher",masteryMethod:"free-input",
         outcome:"correct",glyph:g.character,glyphId:g.glyphId,kana:g.base,jibo:g.jibo
       });
     });
   }
   return events;
 }
 function nextLevel(history,current){
   const level=levelConfig(current).level;
   const atLevel=history.filter(e=>e&&e.level===level).slice(-10);
   if(atLevel.length>=10){
     const last=atLevel.slice(-10);
     const correct=last.filter(x=>x.correct).length;
     const distinct=new Set(last.map(x=>x.phraseId)).size;
     const glyphs=new Set(last.flatMap(x=>(x.glyphs||[]).map(g=>g.glyphId).filter(Boolean))).size;
     if(correct>=8&&distinct>=6&&glyphs>=7)return Math.min(5,level+1);
   }
   if(atLevel.length>=8&&atLevel.slice(-8).filter(x=>!x.correct).length>=4)return Math.max(1,level-1);
   return level;
 }
 function safeHistory(raw){
   return Array.isArray(raw)?raw.filter(q=>q&&typeof q.id==="string"&&typeof q.phraseId==="string"
     &&typeof q.reading==="string"&&typeof q.correct==="boolean"&&Array.isArray(q.glyphs)).slice(-2000):[];
 }
 function readHistory(){
   try{return safeHistory(JSON.parse(root.localStorage.getItem(HISTORY_KEY)||"[]"))}
   catch(e){return []}
 }
 function storeHistory(history){
   try{root.localStorage.setItem(HISTORY_KEY,JSON.stringify(safeHistory(history)));return true}
   catch(e){console.warn("decipher history save failed",e);return false}
 }
 function readLevel(){
   try{return levelConfig(JSON.parse(root.localStorage.getItem(LEVEL_KEY)||"1")).level}
   catch(e){return 1}
 }
 function storeLevel(level){
   try{root.localStorage.setItem(LEVEL_KEY,String(levelConfig(level).level))}catch(e){}
 }
 root.VintageKanaDecipher=Object.freeze({
   HISTORY_KEY,LEVEL_KEY,LEVELS,kanaInfo,baseKana,validPhrase,pickInitialPhrase,countKana,
   pickPhrase,candidatesFor,generateTokens,uniqueGlyphTokens,collectSetGlyphs,normalizedReading,
   isCorrectAnswer,glyphEvents,nextLevel,safeHistory,readHistory,storeHistory,readLevel,storeLevel
 });
})(globalThis);
