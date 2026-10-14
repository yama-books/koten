import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium,webkit} from "playwright";
const repo=resolve(fileURLToPath(new URL("../",import.meta.url)));
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".woff2":"font/woff2"};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost");
  let p=resolve(repo,"."+decodeURIComponent(url.pathname));
  if(!(p===repo||p.startsWith(repo+sep))){res.writeHead(403).end();return}
  if(p.endsWith(sep))p+="index.html";
  if(!(await stat(p)).isFile()){res.writeHead(404).end();return}
  res.writeHead(200,{"content-type":mime[extname(p)]||"application/octet-stream"});
  res.end(await readFile(p));
 }catch(err){res.writeHead(404).end()}
});
await new Promise(done=>server.listen(0,"127.0.0.1",done));
const root="http://127.0.0.1:"+server.address().port+"/vintage-kana/video-preview/";
async function check(type){
 const browser=await type.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(root);
  assert.match(await page.locator("h1").innerText(),/動画保存お試し/);
  assert.equal(await page.locator("a[href='./dom-mirror.html']").count(),1);
  const support=await page.evaluate(()=>VintageKanaVideoProbe.detect(document.querySelector("#movie"),MediaRecorder).supported).catch(()=>false);
  if(support){
   await page.locator("#record").click();
   await page.locator("#download").waitFor({state:"visible",timeout:18000});
   const filename=await page.locator("#download").getAttribute("download");
   assert.match(filename,/\.(?:mp4|webm)$/);
   const download=page.waitForEvent("download");
   await page.locator("#download").click();
   assert.equal((await download).suggestedFilename(),filename);
  }else{
   assert.equal(await page.locator("#record").isDisabled(),true);
  }
  await page.goto(root+"dom-mirror.html");
  assert.match(await page.locator("h1").innerText(),/実際の変換演出/);
  const appLoaded=await page.frameLocator("#source").locator("#stage").count();
  assert.equal(appLoaded,1,"iframe should open production app in preview");
  await page.locator("#start").click();
  await page.waitForFunction(()=>window.VK02MirrorStats?.().frames>15,null,{timeout:15000});
  await page.waitForFunction(()=>!document.querySelector("#start").disabled,null,{timeout:15000});
  const stats=await page.evaluate(()=>window.VK02MirrorStats());
  assert.ok(stats.maxGlyphs>0,"actual glyphs should be mirrored");
  assert.deepEqual(errors,[]);
  console.log("PREVIEW_OK",JSON.stringify({browser:type.name(),supported:support,mirrorFrames:stats.frames,maxGlyphs:stats.maxGlyphs}));
 }finally{await browser.close()}
}
try{for(const engine of [chromium,webkit])await check(engine)}
finally{await new Promise(done=>server.close(done))}
