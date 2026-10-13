import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {test} from "node:test";
const source=readFileSync(new URL("../../tools/vintage-kana-video-poc/dom-mirror.js",import.meta.url),"utf8");
function api(){
  const c:{window:{VintageKanaDomMirror?:any}}={window:{}};
  runInNewContext(source,c);
  return c.window.VintageKanaDomMirror;
}
test("VK-02 isolated mirror reads actual DOM bounding pose and transformed text",()=>{
  const glyph={
    textContent:"𛀂",offsetHeight:80,style:{transform:"translate3d(90px,50px,0px) scale(1.1) rotateZ(15deg) rotateX(8deg) rotateY(0deg)"},
    getBoundingClientRect(){return {left:180,right:260,top:60,bottom:150}}
  };
  const room={};
  const window={
    getComputedStyle(el:any){
      if(el===room)return {opacity:".65"};
      return {opacity:".8",fontSize:"75px",fontFamily:"serif",color:"rgb(40, 30, 20)"};
    }
  };
  const stage={
    ownerDocument:{defaultView:window},
    getBoundingClientRect(){return {left:100,right:700,top:30,bottom:330,width:600,height:300}},
    querySelector(selector:string){return selector==="#whiteRoom"?room:null},
    querySelectorAll(selector:string){return selector===".glyph"?[glyph]:[]}
  };
  const s=api().snapshot(stage,768,432);
  assert.equal(s.width,768);
  assert.equal(s.height,432);
  assert.equal(s.whiteOpacity,.65);
  assert.equal(s.glyphs.length,1);
  assert.equal(s.glyphs[0].text,"𛀂");
  assert.ok(Math.abs(s.glyphs[0].x-153.6)<.001);
  assert.ok(Math.abs(s.glyphs[0].y-108)<.001);
  assert.equal(s.glyphs[0].rotation,15);
  assert.equal(s.glyphs[0].opacity,.8);
});
test("VK-02 experimental canvas renderer draws glyphs but does not claim 3D fidelity",()=>{
  const calls:string[]=[];
  const alphaStack:number[]=[];
  const ctx:any={
    globalAlpha:1,fillStyle:"",font:"",textAlign:"",textBaseline:"",
    clearRect(){calls.push("clear")},
    fillRect(){calls.push("fillRect")},
    createRadialGradient(){return {addColorStop(){}}},
    save(){calls.push("save");alphaStack.push(this.globalAlpha)},restore(){calls.push("restore");this.globalAlpha=alphaStack.pop()??1},
    translate(){calls.push("translate")},rotate(){calls.push("rotate")},
    scale(){calls.push("scale")},fillText(text:string){calls.push("text:"+text)}
  };
  const canvas={getContext(){return ctx}};
  const scene={width:768,height:432,whiteOpacity:.3,glyphs:[{
    x:100,y:200,scale:1,rotation:0,opacity:.9,text:"あ",color:"#222",fontSize:60,fontFamily:"serif"
  }]};
  const out=api().draw(canvas,scene);
  assert.equal(out.glyphsDrawn,1);
  assert.ok(calls.includes("text:あ"));
  assert.ok(calls.includes("fillRect"));
  assert.equal(ctx.globalAlpha,1);
  assert.match(source,/does NOT claim/);
});
