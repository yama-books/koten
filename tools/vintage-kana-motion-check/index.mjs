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
const inputs=[
 "あいうえお","あ","あいうえお\nかきくけこ","あいうえおかきくけこさしすせそたちつてと","𛀂𛀆𛀊𛀏𛀔"
];
let passed=0;
try{
 for(let i=0;i<modes.length;i++){
  const [preset,expectedFront]=modes[i];
  const width=[320,390,768,1280][i%4];
  const source=inputs[i%inputs.length];
  const reverse=i%inputs.length===4;
  const page=await browser.newPage({viewport:{width,height:Math.max(640,Math.round(width*1.3))},reducedMotion:"reduce"});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
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
   for(const seam of [1,2]){
    const entries=stats.filter(row=>row.seam===seam);
    assert.ok(entries.length>0,"seam "+seam+" sampled for "+preset);
    for(const e of entries){
     assert.ok(Number.isFinite(e.dx)&&Number.isFinite(e.dy),"finite phase pose "+JSON.stringify(e));
     assert.ok(e.dx<130&&e.dy<130,"excessive first 80ms travel "+JSON.stringify({preset,width,reverse,...e}));
    }
   }
   assert.deepEqual(errors,[],"page script errors "+preset);
   passed++;
   console.log("motion QA "+engine+" "+preset+" "+width+"px "+(reverse?"reverse":"forward")+" PASS");
  }finally{await page.close()}
 }
 console.log("motion QA "+engine+": "+passed+"/"+modes.length+" modes PASS");
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
