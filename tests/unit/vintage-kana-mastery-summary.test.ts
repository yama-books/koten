import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
const source=readFileSync(new URL("../../vintage-kana/mastery-summary.js",import.meta.url),"utf8");
function getModule(raw="[]"){
 const storage=new Map([["vintage-kana:learning-events:v1",raw]]);
 const win={localStorage:{getItem:(key:string)=>storage.get(key)??null}} as any;
 runInNewContext(source,{window:win,console});
 return win.VintageKanaMastery as {readLearningEvents:()=>any[],overallMasteryPercent:(glyphs:any[],events:any[])=>number};
}
test("untouched glyphs remain in denominator with floor rounding",()=>{
 const f=getModule(),glyphs=[{character:"A"},{character:"B"},{character:"C"}];
 const records=[{glyph:"A",mode:"reading",outcome:"correct",at:"2026-10-01"},...["incorrect","correct","incorrect"].map((outcome,i)=>({glyph:"B",mode:"jibo",outcome,at:"2026-10-0"+(i+1)}))];
 assert.equal(f.overallMasteryPercent(glyphs,records),44);
});
test("only last five attempts per glyph contribute",()=>{
 const f=getModule();
 const records=[...Array.from({length:5},(_,i)=>({glyph:"A",mode:"reading",outcome:"correct",at:"2026-10-0"+(i+1)})),{glyph:"A",mode:"reading",outcome:"incorrect",at:"2026-10-06"}];
 assert.equal(f.overallMasteryPercent([{character:"A"}],records),80);
});
test("valid learning events only and corrupt localStorage is safe",()=>{
 const records=[{glyph:"A",mode:"reading",outcome:"correct"},{glyph:"A",mode:"test",outcome:"correct"},{glyph:"A",mode:"reading",outcome:"skip"}];
 const f=getModule(JSON.stringify(records));
 assert.equal(f.readLearningEvents().length,1);
 assert.equal(f.overallMasteryPercent([{character:"A"}],f.readLearningEvents()),100);
 assert.equal(getModule("{bad-json").readLearningEvents().length,0);
});
