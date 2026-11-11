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
      assert.equal(await page.locator("#record").isDisabled(),true);
      assert.equal(await page.locator("#download").isVisible(),false);
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
        if(video.readyState<1)await new Promise((resolve,reject)=>{
          video.addEventListener("loadedmetadata",resolve,{once:true});
          video.addEventListener("error",()=>reject(video.error||new Error("metadata decode failed")),{once:true});
        });
        const cx=document.createElement("canvas");
        cx.width=video.videoWidth;cx.height=video.videoHeight;
        const ctx=cx.getContext("2d",{willReadFrequently:true});
        async function frameAt(seconds){
          const seeked=new Promise(resolve=>video.addEventListener("seeked",resolve,{once:true}));
          video.currentTime=Math.min(seconds,video.duration-.05);
          await seeked;
          ctx.drawImage(video,0,0,cx.width,cx.height);
          const rgba=ctx.getImageData(0,0,cx.width,cx.height).data;
          const samples=[];
          for(let y=0;y<cx.height;y+=16)for(let x=0;x<cx.width;x+=16){
            const i=(y*cx.width+x)*4;
            samples.push(rgba[i],rgba[i+1],rgba[i+2]);
          }
          return samples;
        }
        const early=await frameAt(.20),late=await frameAt(Math.max(.3,video.duration-.25));
        let altered=0;
        for(let i=0;i<early.length;i+=3){
          if(Math.abs(early[i]-late[i])+Math.abs(early[i+1]-late[i+1])+Math.abs(early[i+2]-late[i+2])>35)altered++;
        }
        return {bytes:blob.size,type:blob.type,videoHidden:video.hidden,loaded:video.readyState>=1,
          width:video.videoWidth,height:video.videoHeight,duration:video.duration,changedSamplePoints:altered};
      });
      assert.ok(file?.includes("-"+mode+"."),"direction stored in filename");
      assert.ok(meta.bytes>1000,"recorded video is not empty");
      assert.ok(/^video\/(mp4|webm)/.test(meta.type),"supported video container");
      assert.equal(meta.videoHidden,false);
      assert.equal(meta.loaded,true,"video must decode");
      assert.equal(meta.width,768,"video must preserve exact width");
      assert.equal(meta.height,432,"video must preserve exact height");
      assert.ok(meta.duration>1.8&&meta.duration<5,"video should contain complete 2.8s timeline");
      assert.ok(meta.changedSamplePoints>15,"early and late frames must contain different images");
      const downloaded=page.waitForEvent("download");
      await page.locator("#download").click();
      const payload=await downloaded;
      assert.equal(payload.suggestedFilename(),file);
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
