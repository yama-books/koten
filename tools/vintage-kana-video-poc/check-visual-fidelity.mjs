/* VK-02 quantitative visual evidence: two different renderers at one frozen
 * moment. This is characterization, NOT a pixel-equivalence acceptance test. */
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium,webkit} from "playwright";

const root=resolve(fileURLToPath(new URL("../../",import.meta.url)));
const evidence=resolve(root,"vk02-fidelity-evidence");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json",".css":"text/css",".woff2":"font/woff2",".woff":"font/woff"};
const server=createServer(async(req,res)=>{
  try{
    const uri=new URL(req.url,"http://localhost");
    let path=resolve(root,"."+decodeURIComponent(uri.pathname));
    if(!path.startsWith(root+sep)){res.writeHead(403).end();return}
    if(path.endsWith(sep))path+="index.html";
    if(!(await stat(path)).isFile()){res.writeHead(404).end();return}
    res.writeHead(200,{"content-type":mime[extname(path)]||"application/octet-stream"});
    res.end(await readFile(path));
  }catch(_err){res.writeHead(404).end()}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
await mkdir(evidence,{recursive:true});
const url="http://127.0.0.1:"+server.address().port+"/tools/vintage-kana-video-poc/dom-mirror.html";
async function capture(browserType,phaseName,elapsedMs){
  const browser=await browserType.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1260,height:900},deviceScaleFactor:1});
  try{
    await page.goto(url,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>{
      const iframe=document.querySelector("#source");
      return iframe?.contentDocument?.readyState==="complete"&&
        typeof iframe?.contentWindow?.play==="function";
    },null,{timeout:12000});
    await page.evaluate(()=>{
      const win=document.querySelector("#source").contentWindow;
      const doc=win.document;
      doc.getElementById("input").value="あ";
      doc.querySelector('input[name="conversionMode"][value="forward"]').checked=true;
      win.eval('nextPreset="front-orbit"');
      win.play();
    });
    await page.waitForFunction(()=>document.querySelector("#source").contentDocument.querySelectorAll("#stage .glyph").length>0,null,{timeout:14000});
    await page.waitForTimeout(elapsedMs);
    const scene=await page.evaluate(()=>{
      const child=document.querySelector("#source").contentWindow,stage=child.document.querySelector("#stage");
      // The production player uses requestAnimationFrame for the glyph transforms.
      // Prevent further updates before sampling both rendering paths.
      child.requestAnimationFrame=()=>0;
      child.document.getAnimations().forEach(animation=>{try{animation.pause()}catch(_){}});
      // Playback's transparent stage normally reveals the underlying composer.
      // A saved movie must have no input fields or controls, so exclude the app
      // beneath the active stage in addition to stage-owned control buttons.
      for(const selector of ["#app","#skip",".result-actions"]){
        const element=child.document.querySelector(selector);
        if(element)element.style.setProperty("visibility","hidden","important");
      }
      return window.VintageKanaDomMirror.snapshot(stage,768,432);
    });
    await page.waitForTimeout(120);
    // Ensure the mirror paints the same frozen DOM state used by the native screenshot.
    const pose=await page.evaluate(()=>{
      const child=document.querySelector("#source").contentWindow;
      const scene=window.VintageKanaDomMirror.snapshot(child.document.querySelector("#stage"),768,432);
      window.VintageKanaDomMirror.draw(document.querySelector("#mirror"),scene);
      return {glyphs:scene.glyphs.length,whiteOpacity:scene.whiteOpacity};
    });
    assert.ok(pose.glyphs>0,"the original renderer must have visible glyph elements");
    const original=await page.frameLocator("#source").locator("#stage").screenshot({scale:"css"});
    const mirror=await page.locator("#mirror").screenshot({scale:"css"});
    const prefix=browserType.name()+"-"+phaseName;
    await writeFile(resolve(evidence,prefix+"-dom.png"),original);
    await writeFile(resolve(evidence,prefix+"-canvas.png"),mirror);
    // Decode both screenshots in browser to avoid adding a PNG decoder dependency.
    const metrics=await page.evaluate(async({a,b})=>{
      async function decode(base64){
        const img=new Image();
        img.src="data:image/png;base64,"+base64;
        await img.decode();
        const c=document.createElement("canvas");
        // iframe/canvas CSS borders alter element screenshots by ~1-2px.
        // Normalize only for comparison, while preserving exact raw screenshots.
        c.width=768;c.height=432;
        const ctx=c.getContext("2d",{willReadFrequently:true});
        ctx.drawImage(img,0,0,c.width,c.height);
        return {width:c.width,height:c.height,rawWidth:img.naturalWidth,rawHeight:img.naturalHeight,
          bytes:ctx.getImageData(0,0,c.width,c.height).data};
      }
      const d=await decode(a),m=await decode(b);
      let total=0,diff25=0,inkD=0,inkM=0,inkBoth=0,inkUnion=0,sumXD=0,sumYD=0,sumXM=0,sumYM=0;
      const n=d.width*d.height;
      for(let i=0;i<n;i++){
        const off=i*4;
        const ar=d.bytes[off],ag=d.bytes[off+1],ab=d.bytes[off+2];
        const br=m.bytes[off],bg=m.bytes[off+1],bb=m.bytes[off+2];
        const delta=(Math.abs(ar-br)+Math.abs(ag-bg)+Math.abs(ab-bb))/3;
        total+=delta;if(delta>25)diff25++;
        const aInk=(ar+ag+ab)/3<125,bInk=(br+bg+bb)/3<125;
        if(aInk){inkD++;sumXD+=i%d.width;sumYD+=Math.floor(i/d.width)}
        if(bInk){inkM++;sumXM+=i%d.width;sumYM+=Math.floor(i/d.width)}
        if(aInk&&bInk)inkBoth++;
        if(aInk||bInk)inkUnion++;
      }
      return {width:d.width,height:d.height,
        rawDomSize:[d.rawWidth,d.rawHeight],rawCanvasSize:[m.rawWidth,m.rawHeight],
        meanAbsRGB:Math.round(100*total/n)/100,
        pixelDiffOver25Percent:Math.round(10000*diff25/n)/100,
        darkInkIoU:inkUnion?Math.round(1000*inkBoth/inkUnion)/1000:null,
        domDarkPixels:inkD,canvasDarkPixels:inkM,
        inkCenterDistancePx:inkD&&inkM?Math.round(100*Math.hypot(sumXD/inkD-sumXM/inkM,sumYD/inkD-sumYM/inkM))/100:null};
    },{a:original.toString("base64"),b:mirror.toString("base64")});
    assert.equal(metrics.width,768);
    assert.equal(metrics.height,432);
    assert.ok(metrics.meanAbsRGB>=0&&metrics.meanAbsRGB<=255);
    console.log("VK02_VISUAL_FIDELITY",JSON.stringify({engine:browserType.name(),phase:phaseName,afterMs:elapsedMs,...pose,...metrics}));
    return {engine:browserType.name(),phase:phaseName,...pose,...metrics};
  }finally{await browser.close()}
}
try{
  const results=[];
  for(const engine of [chromium,webkit]){
    results.push(await capture(engine,"early",900));
    results.push(await capture(engine,"white-transition",5500));
  }
  await writeFile(resolve(evidence,"results.json"),JSON.stringify(results,null,2));
  console.log("VK02_VISUAL_FIDELITY_RESULTS",JSON.stringify(results));
}finally{await new Promise(r=>server.close(r))}
