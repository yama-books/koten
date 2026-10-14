/* Separate preview only. Canvas does not automatically fetch a webfont merely
 * because ctx.font names it. Verify that the requested Hentaigana face is loaded
 * before drawing any character, including the initial reverse-mode frame.
 */
(function(root){
  "use strict";
  const FAMILY='"Noto Serif Hentaigana"';
  const FACE='600 115px '+FAMILY;
  const SAMPLE="𛀂";
  const TIMEOUT_MS=15000;
  function ensure(doc){
    if(!doc||!doc.fonts||typeof doc.fonts.load!=="function")
      return Promise.reject(new Error("FontFaceSet unavailable"));
    const timeout=new Promise((_,reject)=>{
      const timer=setTimeout(()=>reject(new Error("font loading timed out")),TIMEOUT_MS);
      // Timer is also cleared by Promise.finally below (including failures).
      pendingTimers.set(timeout,timer);
    });
    const ready=Promise.resolve(doc.fonts.ready)
      .then(()=>doc.fonts.load(FACE,SAMPLE))
      .then(faces=>{
        if(!faces||!faces.length||!faces.some(face=>face.status==="loaded"))
          throw new Error("Noto Serif Hentaigana face not loaded");
        return true;
      });
    // No user content or font bytes leave the page: the font is fetched
    // through the matching Google Fonts CSS stylesheet on this page.
    return Promise.race([ready,timeout]).finally(()=>{
      clearTimeout(pendingTimers.get(timeout));
      pendingTimers.delete(timeout);
    });
  }
  const pendingTimers=new Map();
  root.VintageKanaPreviewFont=Object.freeze({ensure,FAMILY,FACE,SAMPLE});
})(typeof window!=="undefined"?window:globalThis);
