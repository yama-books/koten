/* Hentaigana shared quiz motion; visual effects do not affect grading or storage. */
(function(root){
 "use strict";
 const reduced=()=>!!root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 const keyframesIn=(type)=>type==="glyph"
   ?[{opacity:0,transform:"translateY(32px) rotateX(-58deg) scale(.83)",filter:"blur(2.1px)"},{opacity:1,transform:"translateY(0) rotateX(0) scale(1)",filter:"blur(0)"}]
   :[{opacity:0,transform:"translateY(19px) scale(.95)"},{opacity:1,transform:"translateY(0) scale(1)"}];
 const play=(node,frames,options)=>{
   if(reduced()||!node||!node.isConnected||typeof node.animate!=="function")return null;
   try{return node.animate(frames,{fill:"both",...options})}catch{return null}
 };
 function splitGlyphs(text){
   const units=[];
   for(const ch of [...text]) {
     if(/[\u3099\u309A\u309B\u309C\uFE00-\uFE0F]/u.test(ch)&&units.length)units[units.length-1]+=ch;
     else units.push(ch);
   }
   return units;
 }
 function appearGlyphs(element){
   if(!element||element.hidden)return;
   const value=element.textContent||"";
   if(!value.trim())return;
   const frag=document.createDocumentFragment();
   const chars=splitGlyphs(value);
   element.setAttribute("aria-label",value);
   chars.forEach((ch,i)=>{
     const span=document.createElement("span");
     span.className="vkm-character";
     span.textContent=ch;span.setAttribute("aria-hidden","true");
     frag.append(span);
   });
   element.replaceChildren(frag);
   [...element.children].forEach((node,i)=>play(node,keyframesIn("glyph"),
     {duration:720,delay:Math.min(i*62,500),easing:"cubic-bezier(.18,.69,.21,1)"}));
 }
 function appearButtons(container){
   if(!container||container.hidden)return;
   [...container.querySelectorAll(".choice")].forEach((node,i)=>play(node,keyframesIn("button"),
     {duration:520,delay:i*74,easing:"cubic-bezier(.19,.70,.2,1)"}));
 }
 function answer(element,correct){
   if(!element||element.hidden)return;
   if(correct){
     play(element,[
       {transform:"translateY(0) scale(1)",textShadow:"0 0 0px transparent",filter:"brightness(1)"},
       {transform:"translateY(-6px) scale(1.035)",textShadow:"0 0 23px rgba(215,175,100,.48)",filter:"brightness(1.1)"},
       {transform:"translateY(0) scale(1)",textShadow:"0 0 0px transparent",filter:"brightness(1)"}
     ],{duration:650,easing:"ease-in-out"});
   }else{
     play(element,[
       {transform:"translateX(0)"},{transform:"translateX(-5px)"},
       {transform:"translateX(4px)"},{transform:"translateX(-3px)"},
       {transform:"translateX(2px)"},{transform:"translateX(0)"}
     ],{duration:300,easing:"ease-out"});
   }
 }
 function wave(container){
   if(!container||reduced())return;
   const visible=[...container.children].filter(n=>!n.hidden);
   const gridCols=Math.max(1,Math.round(container.clientWidth/Math.max(1,visible[0]?.getBoundingClientRect().width||90)));
   visible.forEach((node,i)=>play(node,keyframesIn("button"),{
     duration:530,delay:Math.min((Math.floor(i/gridCols)+(i%gridCols))*58,700),
     easing:"cubic-bezier(.2,.8,.2,1)"
   }));
 }
 // FLIP: animate *existing* buttons from their previous screen coordinates,
 // preserving click targets and identities. No scoring state is mutated.
 function reflow(grid,predicate){
   if(!grid)return;
   const nodes=[...grid.children];
   const old=new Map(nodes.filter(n=>!n.hidden).map(n=>[n,n.getBoundingClientRect()]));
   for(const node of nodes)node.hidden=!predicate(node);
   if(reduced())return;
   const visible=nodes.filter(n=>!n.hidden);
   visible.forEach((node,i)=>{
     const now=node.getBoundingClientRect(),prev=old.get(node);
     if(prev)play(node,[
       {transform:"translate("+(prev.left-now.left)+"px,"+(prev.top-now.top)+"px)",opacity:1},
       {transform:"translate(0,0)",opacity:1}
     ],{duration:460,easing:"cubic-bezier(.2,.78,.17,1)"});
     else play(node,[{opacity:0,transform:"translateY(12px) scale(.95)"},{opacity:1,transform:"none"}],
       {duration:340,delay:Math.min(i*28,220),easing:"ease-out"});
   });
 }
 root.VintageKanaQuizMotion=Object.freeze({reduced,splitGlyphs,appearGlyphs,appearButtons,answer,wave,reflow});
})(globalThis);
