/* Experimental 2D scene mirror of an actual DOM stage.
 * Reads the app's rendered glyph positions; deliberately does NOT claim
 * CSS3D, blur, mask, shadows, perspective, or WAAPI pixel equivalence.
 * No production page imports this module.
 */
(function(root){
"use strict";
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
function snapshot(stage,width,height){
  if(!stage||!stage.ownerDocument)throw new Error("stage element required");
  const win=stage.ownerDocument.defaultView;
  const box=stage.getBoundingClientRect();
  if(box.width<=0||box.height<=0)throw new Error("stage is not laid out");
  const sx=width/box.width,sy=height/box.height;
  const room=stage.querySelector("#whiteRoom");
  const whiteOpacity=room?clamp(Number(win.getComputedStyle(room).opacity)):0;
  const visible=Array.from(stage.querySelectorAll(".glyph")).map(el=>{
    const rect=el.getBoundingClientRect(),s=win.getComputedStyle(el);
    const raw=el.style.transform;
    const rot=/rotateZ\((-?[\d.]+)deg\)/.exec(raw);
    const baseHeight=el.offsetHeight||parseFloat(s.fontSize)||60;
    const scale=clamp(rect.height/baseHeight,.03,6);
    return {
      text:el.textContent||"",
      x:finite(((rect.left+rect.right)/2-box.left)*sx),
      y:finite(((rect.top+rect.bottom)/2-box.top)*sy),
      scale:finite(scale),
      rotation:rot?finite(Number(rot[1])):0,
      opacity:clamp(Number(s.opacity)),
      fontSize:clamp(parseFloat(s.fontSize)||60,1,250),
      fontFamily:s.fontFamily||"serif",
      color:s.color||"#1d1a17"
    };
  }).filter(item=>item.text);
  return {width,height,whiteOpacity,glyphs:visible};
}
function draw(canvas,scene){
  if(!canvas||!scene)throw new Error("canvas and scene required");
  const ctx=canvas.getContext("2d");
  if(!ctx)throw new Error("Canvas 2D unavailable");
  const {width,height}=scene;
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle="#f4f0ea";
  ctx.fillRect(0,0,width,height);
  const gradient=ctx.createRadialGradient(width*.5,height*.45,1,width*.5,height*.5,Math.max(width,height)*.7);
  gradient.addColorStop(0,"#ffffff");
  gradient.addColorStop(1,"#ebe5dc");
  ctx.globalAlpha=scene.whiteOpacity;
  ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  ctx.globalAlpha=1;
  for(const glyph of scene.glyphs){
    ctx.save();
    ctx.translate(glyph.x,glyph.y);
    ctx.rotate(glyph.rotation*Math.PI/180);
    ctx.scale(glyph.scale,glyph.scale);
    ctx.globalAlpha=glyph.opacity;
    ctx.fillStyle=glyph.color;
    ctx.font="600 "+glyph.fontSize+"px "+glyph.fontFamily;
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(glyph.text,0,0);
    ctx.restore();
  }
  return {glyphsDrawn:scene.glyphs.length};
}
root.VintageKanaDomMirror=Object.freeze({snapshot,draw});
})(typeof window!=="undefined"?window:globalThis);
