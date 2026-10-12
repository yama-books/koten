/* Continuity bridge between the cinematic phases.
 * Samples only the final ~100ms of the outgoing phase; no per-frame DOM reads
 * during the rest of the animation. A Hermite-like velocity carry makes both
 * position and first derivative continuous while preserving the new choreography.
 */
(function(root){
 "use strict";
 const keys=["x","y","z","scale","rot","rx","ry"];
 const parse=(el)=>{
   const str=el.style.transform||"";
   const m=/^translate3d\(([^)]+)\) scale\(([^)]+)\) rotateZ\(([^)]+)deg\) rotateX\(([^)]+)deg\) rotateY\(([^)]+)deg\)$/.exec(str);
   if(!m)return null;
   const a=m[1].split(",").map(s=>Number.parseFloat(s));
   const nums=[a[0],a[1],a[2],Number(m[2]),Number(m[3]),Number(m[4]),Number(m[5]),Number(el.style.opacity||"1")];
   if(nums.some(v=>!Number.isFinite(v)))return null;
   return {x:nums[0],y:nums[1],z:nums[2],scale:nums[3],rot:nums[4],rx:nums[5],ry:nums[6],opacity:nums[7]};
 };
 const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
 const smooth=t=>t*t*(3-2*t);
 const collect=(elements,duration)=>{
   let prev=null,last=null;
   function sample(elapsed){
     if(elapsed<duration-100)return;
     const values=elements.map(parse);
     if(values.some(p=>p===null))return;
     prev=last;last={elapsed,values};
   }
   function bridge(durationMs,setPose){
     if(!last||!Number.isFinite(durationMs)||durationMs<=0)return {apply(){}};
     const from=last.values,dt=prev?Math.max(1,last.elapsed-prev.elapsed):Infinity;
     const velocity=from.map((p,i)=>{
       const v={};
       for(const key of [...keys,"opacity"]){
         let speed=prev?(p[key]-prev.values[i][key])/dt:0;
         // The frame clock can drop/lag on phones. Limit extrapolation to
         // physically reasonable rates rather than magnifying a lone spike.
         const max=key==="scale"?.008:key==="opacity"?.006:key==="rot"||key==="rx"||key==="ry"?2.4:3.2;
         v[key]=clamp(speed,-max,max);
       }
       return v;
     });
     const mix=(start,target,speed,elapsed,t)=>{
       const projected=start+speed*elapsed;
       return projected+(target-projected)*smooth(t);
     };
     function apply(elapsed){
       if(elapsed>=durationMs)return;
       const t=clamp(elapsed/durationMs,0,1);
       elements.forEach((el,i)=>{
         const target=parse(el),start=from[i],speed=velocity[i];
         if(!target)return;
         const out={};
         for(const key of keys)out[key]=mix(start[key],target[key],speed[key],elapsed,t);
         setPose(el,out.x,out.y,Math.max(.001,out.scale),out.rot,out.rx,out.ry,out.z);
         el.style.opacity=String(clamp(mix(start.opacity,target.opacity,speed.opacity,elapsed,t),0,1));
       });
     }
     return {apply};
   }
   return {sample,bridge};
 };
 root.VintageKanaMotionSeam=Object.freeze({collect});
})(window);
