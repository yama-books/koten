import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium,webkit} from "playwright";
const root=resolve(fileURLToPath(new URL("../../",import.meta.url)));
const mimes={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8",".woff2":"font/woff2",".woff":"font/woff"};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,"http://localhost");
    let path=resolve(root,"."+decodeURIComponent(url.pathname));
    if(!path.startsWith(root+sep)&&path!==root){res.writeHead(403).end();return}
    if(path.endsWith(sep))path+="index.html";
    const st=await stat(path);
    if(!st.isFile()){res.writeHead(404).end();return}
    res.writeHead(200,{"content-type":mimes[extname(path)]||"application/octet-stream","cache-control":"no-store"});
    res.end(await readFile(path));
  }catch(err){res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base="http://127.0.0.1:"+server.address().port;
async function check(type){
  const browser=await type.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  try{
    await page.goto(base+"/tools/vintage-kana-video-poc/dom-mirror.html",{waitUntil:"domcontentloaded"});
    await page.locator("#source").evaluate(async iframe=>{
      if(!iframe.contentDocument||iframe.contentDocument.readyState!=="complete")
        await new Promise(resolve=>iframe.addEventListener("load",resolve,{once:true}));
    });
    const hasApp=await page.locator("#source").evaluate(frame=>Boolean(frame.contentDocument?.querySelector("#stage")));
    assert.equal(hasApp,true,"real production source must be loaded in same-origin iframe");
    await page.locator("#start").click();
    await page.waitForFunction(()=>window.VK02MirrorStats?.().frames>10,{timeout:25000});
    await page.locator("#start").waitFor({state:"visible"});
    await page.waitForFunction(()=>!document.querySelector("#start").disabled,null,{timeout:14000});
    const meta=await page.evaluate(()=>{
      const s=window.VK02MirrorStats();
      const canvas=document.querySelector("#mirror"),pix=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
      return {...s,samplePixels:Array.from(pix.slice(0,12)),status:document.querySelector("#status").textContent,downloadVisible:!document.querySelector("#download").hidden};
    });
    assert.ok(meta.frames>40,"must sample many actual animation frames");
    assert.ok(meta.maxGlyphs>0,"must include actual DOM glyphs");
    assert.ok(meta.renderMs/meta.frames<80,"mirror must draw on a reasonable CPU budget");
    assert.ok(meta.samplePixels[3]===255,"canvas must contain an opaque visible image");
    const recordSupport=await page.evaluate(()=>window.VintageKanaVideoProbe.detect(document.querySelector("#mirror"),window.MediaRecorder).supported);
    if(recordSupport){
      await page.locator("#download").waitFor({state:"visible",timeout:5000});
      assert.equal(meta.downloadVisible||await page.locator("#download").isVisible(),true);
      assert.match(await page.locator("#download").getAttribute("download"),/\.mp4$|\.webm$/);
    }else assert.match(meta.status,/非対応/);
    console.log(type.name(),"DOM/CANVAS mirror",JSON.stringify(meta),"recording",recordSupport);
  }finally{await browser.close()}
}
try{for(const type of [chromium,webkit])await check(type)}
finally{await new Promise(resolve=>server.close(resolve))}
