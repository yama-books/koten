// VK-01: deterministic ten-mode motion boundary audit in a real browser.
// Advance the app's animation clock without removing any choreography frames.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium,webkit } from "playwright";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../");
const appDir=path.join(root,"vintage-kana");
const mime={".html":"text/html",".js":"text/javascript",".json":"application/json",".woff2":"font/woff2",".webp":"image/webp",".png":"image/png",".css":"text/css"};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||"/","http://localhost");
  if(req.method!=="GET"||!url.pathname.startsWith("/vintage-kana/")){res.writeHead(404).end();return}
  let file=path.resolve(appDir,decodeURIComponent(url.pathname.slice("/vintage-kana/".length)));
  if(file!==appDir&&!file.startsWith(appDir+path.sep)){res.writeHead(403).end();return}
  if((await stat(file)).isDirectory())file=path.join(file,"index.html");
  res.setHeader("content-type",(mime[path.extname(file)]||"application/octet-stream")+";charset=utf-8");
  res.end(await readFile(file));
 }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const url="http://127.0.0.1:"+server.address().port+"/vintage-kana/index.html";
const engine=process.argv.includes("--webkit")?"webkit":"chromium";
const browser=await (engine==="webkit"?webkit:chromium).launch({headless:true});
const modes=[
 ["front-orbit","orbit"],["front-formation","formation"],["front-chick","chick"],
 ["front-column","chick-column-sync"],["front-column-random","chick-column-random"],
 ["front-pinball","float-pinball"],["front-side-sync","side-shake-sync"],
 ["front-side-random","side-shake-random"],["front-diagonal-sync","diagonal-sync"],
 ["front-diagonal-random","diagonal-random"]
];
// Run every front-mode with a width, length, newline and direction matrix.
// Each case has a reproducible seed. The different seeds still exercise
// the randomized choreography without making CI results unreproducible.
const scenarios=[
 {label:"1-char",width:320,source:"あ",reverse:false},
 {label:"5-char-reverse",width:390,source:"𛀂𛀆𛀊𛀏𛀔",reverse:true},
 {label:"10-char-multiline",width:768,source:"あいうえお\nかきくけこ",reverse:false},
 {label:"20-char",width:1280,source:"あいうえおかきくけこさしすせそたちつてと",reverse:false},
 {label:"10-char-multiline-reverse",width:1280,source:"𛀂𛀆𛀊𛀏𛀔\n𛀂𛀆𛀊𛀏𛀔",reverse:true}
];
let passed=0;
try{
 for(let i=0;i<modes.length;i++){
  const [preset,expectedFront]=modes[i];
  for(const [caseIdx,{label,width,source,reverse}] of scenarios.entries()){
   const seed=1009+i*101+caseIdx*10007;
   const page=await browser.newPage({viewport:{width,height:Math.max(640,Math.round(width*1.3))},reducedMotion:"reduce"});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
   await page.addInitScript(({seed})=>{
    let s=seed>>>0;
    Math.random=()=>{
     s=(s+0x6D2B79F5)>>>0;
     let t=Math.imul(s^(s>>>15),1|s);
     t=(t+Math.imul(t^(t>>>7),61|t))^t;
     return ((t^(t>>>14))>>>0)/4294967296;
    };
   },{seed});
   await page.clock.install({time:new Date("2026-10-13T10:00:00Z")});
   await page.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
   await page.goto(url);
   await page.evaluate(({source,reverse})=>{
    const original=window.VintageKanaMotionSeam;
    const stats=window.__motionSeamStats=[];
    let collectIndex=0;
    window.VintageKanaMotionSeam={
     collect(elements,duration){
      collectIndex++;
      const id=collectIndex,tracked=original.collect(elements,duration);
      let last=null;
      function pose(){
       const el=elements[0],m=/translate3d\(([^)]+)\)/.exec(el.style.transform);
       const nums=m?m[1].split(",").map(v=>Number.parseFloat(v)):[NaN,NaN,NaN];
       return {x:nums[0],y:nums[1],z:nums[2],opacity:Number(el.style.opacity)};
      }
      return {
       sample(elapsed){
        tracked.sample(elapsed);
        if(elapsed>=duration-100)last=pose();
       },
       bridge(ms,draw){
        const entry=tracked.bridge(ms,draw);
        return {apply(elapsed){
         const target=pose();
         entry.apply(elapsed);
         if(elapsed<80){
          const actual=pose();
          stats.push({seam:id,elapsed,last,target,actual,dx:Math.abs(actual.x-last?.x),dy:Math.abs(actual.y-last?.y)});
         }
        }};
       }
      };
     }
    };
    if(reverse){
     document.querySelector('input[name="conversionMode"][value="reverse"]').checked=true;
     window.eval("updateConversionUi()");
    }
    document.getElementById("input").value=source;
   },{source,reverse});
   await page.evaluate(preset=>{window.eval("nextPreset="+JSON.stringify(preset));void window.play()},preset);
   await page.waitForFunction(()=>Boolean(document.getElementById("stage")?.dataset.motionPlan));
   const plan=await page.locator("#stage").getAttribute("data-motion-plan");
   assert.equal(JSON.parse(plan).frontMode,expectedFront,"mode selection "+preset);
   await page.clock.runFor(14800);
   const stats=await page.evaluate(()=>window.__motionSeamStats);
   let maxDx=0,maxDy=0;
   for(const seam of [1,2]){
    const entries=stats.filter(row=>row.seam===seam);
    assert.ok(entries.length>0,"seam "+seam+" sampled for "+preset);
    for(const e of entries){
     assert.ok(Number.isFinite(e.dx)&&Number.isFinite(e.dy),"finite phase pose "+JSON.stringify(e));
     maxDx=Math.max(maxDx,e.dx);maxDy=Math.max(maxDy,e.dy);
     assert.ok(e.dx<130&&e.dy<130,"excessive first 80ms travel "+JSON.stringify({preset,label,width,reverse,seed,...e}));
    }
   }
   assert.deepEqual(errors,[],"page script errors "+preset);
   passed++;
   console.log("motion QA "+engine+" "+preset+" "+label+" "+width+"px "+(reverse?"reverse":"forward")+" seed="+seed+" PASS dx="+maxDx.toFixed(2)+" dy="+maxDy.toFixed(2));
  }finally{await page.close()}
  }
 }
 console.log("motion QA "+engine+": "+passed+"/"+(modes.length*scenarios.length)+" scenarios / "+modes.length+" modes PASS");
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
