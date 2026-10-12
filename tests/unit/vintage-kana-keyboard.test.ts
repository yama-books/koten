import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {test} from "node:test";

const simple=readFileSync(new URL("../../vintage-kana/index.html",import.meta.url),"utf8");
const detail=readFileSync(new URL("../../vintage-kana/detail.html",import.meta.url),"utf8");
const first=simple.indexOf("async function settleKeyboard(){");
const last=simple.indexOf("\nasync function ensureMotionTargetFont(",first);
assert.ok(first>0&&last>first);
const functionSource=simple.slice(first,last);

function scenario({focused=false,pointer=false,height=844,restoreAfter=0}:{
 focused?:boolean;pointer?:boolean;height?:number;restoreAfter?:number;
}={}){
 let frame=0,blurred=0,scrolled=0;
 const input={blur(){blurred++;context.document.activeElement={}}};
 const vv={height,offsetTop:0};
 const context:any={
   input,convertPointerFromInput:pointer,lastInputBlurAt:-Infinity,innerHeight:844,
   window:{visualViewport:vv,scrollY:0,scrollTo(){scrolled++}},
   document:{activeElement:focused?input:{}},
   performance:{now:()=>frame*16},
   requestAnimationFrame:(cb:()=>void)=>{
     frame++;
     if(restoreAfter>0&&frame>=restoreAfter)vv.height=844;
     cb();
   },
   Math,Promise,
 };
 const fn=runInNewContext(functionSource+"; settleKeyboard",context);
 return {run:()=>fn(),state:()=>({frame,blurred,scrolled,pointer:context.convertPointerFromInput})};
}
test("detailed page label is restored without changing the simple page link",()=>{
 assert.match(detail,/class="modeLink" href="\.\/">シンプル？版<\/a>/);
 assert.match(simple,/class="detail-link" href="\.\/detail\.html">詳しい版<\/a>/);
});
test("tap after focus has moved: wait for keyboard to close before measuring glyph origins",async()=>{
 const s=scenario({pointer:true,height:518,restoreAfter:15});
 assert.equal(await s.run(),true);
 assert.ok(s.state().frame>=15);
 assert.ok(s.state().scrolled>=1);
 assert.equal(s.state().pointer,false);
});
test("focused textarea blurs and waits for the full viewport",async()=>{
 const s=scenario({focused:true,height:510,restoreAfter:20});
 assert.equal(await s.run(),true);
 assert.equal(s.state().blurred,1);
 assert.ok(s.state().frame>=20);
});
test("if keyboard does not close, abort the animation instead of using bad coordinates",async()=>{
 const s=scenario({pointer:true,height:510});
 assert.equal(await s.run(),false);
 assert.equal(s.state().scrolled,0);
 assert.ok(s.state().frame>=110);
 assert.match(simple,/if\(!\(await settleKeyboard\(\)\)\)\{/);
 assert.match(simple,/keyboardNotice.hidden=false;\s*return;/);
});
test("desktop with no keyboard does not wait for the 1900ms timeout",async()=>{
 const s=scenario();
 assert.equal(await s.run(),true);
 assert.ok(s.state().frame<20);
});
