import assert from "node:assert/strict";
import {chromium,webkit} from "playwright";

const htmlUrl=new URL("./index.html",import.meta.url).href;

async function check(browserType){
  const browser=await browserType.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  try{
    await page.goto(htmlUrl);
    const report=await page.evaluate(()=>{
      const canvas=document.getElementById("movie");
      const cap=window.VintageKanaVideoProbe.detect(canvas,window.MediaRecorder);
      return {supported:cap.supported,mime:cap.format?.mimeType||null,reason:cap.reason||null};
    });
    console.log(browserType.name(),JSON.stringify(report));
    if(!report.supported){
      assert.match(await page.locator("#status").innerText(),/非対応/);
      return {browser:browserType.name(),supported:false};
    }
    for(const mode of ["forward","reverse"]){
      await page.locator("#direction").selectOption(mode);
      await page.locator("#record").click();
      await page.locator("#download").waitFor({state:"visible",timeout:20000});
      const file=await page.locator("#download").getAttribute("download");
      const meta=await page.evaluate(async()=>{
        const video=document.getElementById("preview");
        const blob=await fetch(video.src).then(r=>r.blob());
        const loaded=video.readyState>=1;
        return {bytes:blob.size,type:blob.type,videoHidden:video.hidden,loaded,
          width:video.videoWidth,height:video.videoHeight};
      });
      assert.ok(file?.includes("-"+mode+"."),"direction stored in filename");
      assert.ok(meta.bytes>1000,"recorded video is not empty");
      assert.ok(/^video\/(mp4|webm)/.test(meta.type),"supported video container");
      assert.equal(meta.videoHidden,false);
      console.log(browserType.name(),mode,JSON.stringify(meta));
    }
    await page.locator("#record").click();
    await page.locator("#cancel").click();
    await page.waitForFunction(()=>document.querySelector("#status").textContent.includes("取り消し"),null,{timeout:5000});
    assert.equal(await page.locator("#download").isVisible(),false);
    assert.equal(await page.locator("#cancel").isDisabled(),true);
    assert.equal(await page.locator("#record").isEnabled(),true);
    assert.deepEqual(errors,[]);
    console.log(browserType.name(),"cancel PASS");
    return {browser:browserType.name(),supported:true};
  }finally{await browser.close()}
}
const results=[];
for(const type of [chromium,webkit]){
  results.push(await check(type));
}
console.log("VK-02 PoC browser summary",JSON.stringify(results));
