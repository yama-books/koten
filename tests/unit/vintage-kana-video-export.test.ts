import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

const code=readFileSync(new URL("../../tools/vintage-kana-video-poc/video-capability.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../../tools/vintage-kana-video-poc/index.html",import.meta.url),"utf8");
function probe(){
  const context:{window:{VintageKanaVideoProbe?:any}}={window:{}};
  runInNewContext(code,context);
  return context.window.VintageKanaVideoProbe;
}
const canvas={captureStream(){return {getTracks(){return []}}}};
function ctor(mimes:string[]){
  function Recorder(){}
  (Recorder as any).isTypeSupported=(mime:string)=>mimes.includes(mime);
  return Recorder;
}
test("VK-02 probe checks canvas capture and actual recorder support",()=>{
  const api=probe();
  assert.equal(api.detect({},ctor(["video/mp4"])).reason,"canvas-capture-unavailable");
  assert.equal(api.detect(canvas,undefined).reason,"media-recorder-unavailable");
  assert.equal(api.detect(canvas,ctor([])).reason,"no-compatible-video-format");
});
test("VK-02 chooses H264 MP4 when available and WebM otherwise",()=>{
  const api=probe();
  const mp4=api.detect(canvas,ctor(["video/mp4;codecs=avc1.42E01E","video/webm"]));
  assert.equal(mp4.supported,true);
  assert.equal(mp4.format.extension,"mp4");
  const webm=api.detect(canvas,ctor(["video/webm;codecs=vp8"]));
  assert.equal(webm.supported,true);
  assert.equal(webm.format.extension,"webm");
  assert.equal(webm.format.mimeType,"video/webm;codecs=vp8");
});
test("VK-02 handles a throwing MIME query and tries the next format",()=>{
  const api=probe();
  function Recorder(){}
  (Recorder as any).isTypeSupported=(mime:string)=>{
    if(mime.startsWith("video/mp4"))throw new Error("codec unknown");
    return mime==="video/webm";
  };
  assert.equal(api.detect(canvas,Recorder).format.extension,"webm");
});
test("VK-02 export naming records conversion direction and actual container",()=>{
  const api=probe();
  assert.equal(api.filename("forward","webm"),"vintage-kana-forward.webm");
  assert.equal(api.filename("reverse","mp4"),"vintage-kana-reverse.mp4");
  assert.equal(api.filename("unexpected","unknown"),"vintage-kana-forward.webm");
});
test("VK-02 PoC remains isolated, cancellable, and does not pretend to capture DOM",()=>{
  assert.match(html,/Canvas → MediaRecorder/);
  assert.match(html,/本番の3D文字演出は録画していません/);
  assert.match(html,/s\.stream\?\.getTracks\(\)/);
  assert.match(html,/s\.cancelled=true;stop\(s\)/);
  assert.match(html,/new MediaRecorder\(stream,/);
  assert.match(html,/preview\.src=oldUrl/);
  assert.doesNotMatch(html,/getDisplayMedia\(/);
  assert.doesNotMatch(html,/fetch\(/);
  assert.doesNotMatch(html,/analytics|upload/i);
});
