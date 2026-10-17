/* VK-02 feasibility only: detects canvas-to-video capability, not DOM capture. */
(function(root){
  "use strict";
  const candidates=Object.freeze([
    Object.freeze({mimeType:"video/mp4;codecs=avc1.42E01E",extension:"mp4",label:"MP4 / H.264"}),
    Object.freeze({mimeType:"video/mp4",extension:"mp4",label:"MP4"}),
    Object.freeze({mimeType:"video/webm;codecs=vp9",extension:"webm",label:"WebM / VP9"}),
    Object.freeze({mimeType:"video/webm;codecs=vp8",extension:"webm",label:"WebM / VP8"}),
    Object.freeze({mimeType:"video/webm",extension:"webm",label:"WebM"})
  ]);
  function detect(canvas,Recorder){
    if(!canvas||typeof canvas.captureStream!=="function"){
      return {supported:false,reason:"canvas-capture-unavailable",format:null};
    }
    if(typeof Recorder!=="function"||typeof Recorder.isTypeSupported!=="function"){
      return {supported:false,reason:"media-recorder-unavailable",format:null};
    }
    for(const entry of candidates){
      try{
        if(Recorder.isTypeSupported(entry.mimeType)){
          return {supported:true,reason:null,format:entry};
        }
      }catch(_err){/* unsupported MIME or API implementation: try next */}
    }
    return {supported:false,reason:"no-compatible-video-format",format:null};
  }
  function filename(mode,extension){
    const direction=mode==="reverse"?"reverse":"forward";
    const ext=extension==="mp4"?"mp4":"webm";
    return "vintage-kana-"+direction+"."+ext;
  }
  root.VintageKanaVideoProbe=Object.freeze({candidates,detect,filename});
})(typeof window!=="undefined"?window:globalThis);
