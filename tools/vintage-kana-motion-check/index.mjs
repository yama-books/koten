// End-to-end smoke check for the first two visible motion seams.
// Uses Playwright's virtual clock to exercise full animation time without waiting in real time.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium,webkit } from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../');
const appDir=path.join(root,'vintage-kana');
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||'/','http://localhost');
  if(!url.pathname.startsWith('/vintage-kana/')||req.method!=='GET'){res.writeHead(404).end();return}
  let file=path.resolve(appDir,decodeURIComponent(url.pathname.slice('/vintage-kana/'.length)));
  if(!file.startsWith(appDir+path.sep)){res.writeHead(403).end();return}
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.css':'text/css'};
  res.setHeader('content-type',(mime[path.extname(file)]||'application/octet-stream')+';charset=utf-8');
  res.end(await readFile(file));
 }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port+'/vintage-kana/';
const engine=process.argv.includes('--webkit')?'webkit':'chromium';
const preset=engine==='webkit'?'front-diagonal-sync':'front-side-sync';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.clock.install({time:new Date('2026-10-13T10:00:00Z')});
 await page.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
 await page.goto(url);
 await page.evaluate(()=>{
  const original=window.VintageKanaMotionSeam;
  const stats=window.__motionSeamStats=[];
  let index=0;
  window.VintageKanaMotionSeam={
   collect(elements,duration){
    index++;
    const seamId=index;
    const tracked=original.collect(elements,duration);
    let lastX=null;
    function readX(){
      const m=/translate3d\(([-\d.eE+]+)px/.exec(elements[0].style.transform);
      return m?Number(m[1]):null;
    }
    return {
     sample(elapsed){
       tracked.sample(elapsed);
       if(elapsed>=duration-100)lastX=readX();
     },
     bridge(durationMs,setPose){
       const bridge=tracked.bridge(durationMs,setPose);
       return {
        apply(elapsed){
          const targetX=readX();
          bridge.apply(elapsed);
          if(elapsed<75){
           const actualX=readX();
           stats.push({seam:seamId,elapsed,lastX,targetX,actualX,drift:Math.abs(actualX-lastX)});
          }
        }
       };
     }
    };
   }
  };
  input.value='あいうえお';
 });
 await page.evaluate(mode=>{nextPreset=mode;void play()},preset);
 await page.waitForFunction(()=>Boolean(document.getElementById('stage')?.dataset.motionPlan));
 await page.clock.runFor(14800);
 const stats=await page.evaluate(()=>window.__motionSeamStats);
 const seam4=stats.filter(e=>e.seam===1);
 const seam5=stats.filter(e=>e.seam===2);
 assert.ok(seam4.length>0,'no phase12->phase4 samples');
 assert.ok(seam5.length>0,'no phase4->phase5 samples');
 for(const [name,items] of [['phase4',seam4],['phase5',seam5]]){
   for(const e of items){
     assert.ok(e.lastX!==null&&Number.isFinite(e.actualX),'valid seam positions '+JSON.stringify(e));
     assert.ok(e.drift<130,name+' first-frame jump: '+JSON.stringify(e));
   }
 }
 assert.deepEqual(errors,[],'no runtime errors during motion');
 console.log('motion seam '+engine+' '+preset+' PASS '+JSON.stringify({seam4:seam4.slice(0,2),seam5:seam5.slice(0,2)}));
}finally{await page.close();await browser.close();await new Promise(resolve=>server.close(resolve))}
