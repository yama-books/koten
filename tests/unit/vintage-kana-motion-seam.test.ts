import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
const code=readFileSync(new URL("../../vintage-kana/motion-seam.js",import.meta.url),"utf8");
function setup(){
 const win={} as {VintageKanaMotionSeam:any};
 runInNewContext(code,{window:win});
 const el={style:{transform:"",opacity:"1"}};
 const draw=(elem:any,x:number,y:number,scale:number,rot:number,rx:number,ry:number,z:number)=>{
   elem.style.transform=`translate3d(${x}px,${y}px,${z}px) scale(${scale}) rotateZ(${rot}deg) rotateX(${rx}deg) rotateY(${ry}deg)`;
 };
 const pose=(x:number,opacity=1)=>{draw(el,x,-x/2,.7,3,4,5,6);el.style.opacity=String(opacity)};
 const x=()=>Number(el.style.transform.match(/translate3d\(([^p]+)px/)?.[1]);
 return {api:win.VintageKanaMotionSeam,el,draw,pose,x};
}
test("phase bridge has no position/opacity jump at the boundary",()=>{
 const {api,el,draw,pose,x}=setup();
 const trail=api.collect([el],1000);
 pose(96,.90);trail.sample(984);
 pose(100,.96);trail.sample(1000);
 const bridge=trail.bridge(400,draw);
 pose(-100,.30);bridge.apply(0);
 assert.equal(x(),100);
 assert.equal(Number(el.style.opacity),.96);
 pose(-100,.30);bridge.apply(400);
 assert.equal(x(),-100);
});
test("phase bridge carries the outgoing velocity and joins the new trajectory",()=>{
 const {api,el,draw,pose,x}=setup();
 const trail=api.collect([el],1000);
 pose(80);trail.sample(980);
 pose(100);trail.sample(1000); // outgoing +1px/ms
 const bridge=trail.bridge(400,draw);
 pose(-120);bridge.apply(1);
 assert.ok(Math.abs(x()-101)<.03, "C1 velocity across seam "+x());
 pose(-120);bridge.apply(200);
 assert.ok(x()>-120&&Number.isFinite(x()),"finite midway pose "+x());
 pose(-120);bridge.apply(399);
 const before=x();
 assert.ok(Math.abs(before-(-120))<.02,"end seam converges "+before);
});
test("ten front-mode characters can safely bridge as a batch",()=>{
 const {api,draw}=setup();
 const glyphs=Array.from({length:10},()=>({style:{transform:"",opacity:"1"}}));
 const trail=api.collect(glyphs,1000);
 for(const [ms,bias] of [[980,0],[1000,1]]){
  glyphs.forEach((el,i)=>{draw(el,i*21+bias*5,i*3,.58+i*.04,5+i,2,3,i*.5);el.style.opacity=String(.55+i*.04)});
  trail.sample(ms);
 }
 const bridge=trail.bridge(340,draw);
 glyphs.forEach((el,i)=>{draw(el,-i*37,-i*.5,1.2,89,18,6,2);el.style.opacity=".8"});
 bridge.apply(0);
 glyphs.forEach((el,i)=>assert.ok(el.style.transform.startsWith(`translate3d(${i*21+5}px`)));
});
test("violent pre-flash velocities keep C1 but do not launch the next phase",()=>{
 const {api,el,draw,pose,x}=setup();
 const trail=api.collect([el],1000);
 pose(-50);trail.sample(980);
 pose(-110);trail.sample(1000); // outgoing speed -3px/ms
 const bridge=trail.bridge(340,draw);
 pose(100);bridge.apply(1);
 assert.ok(Math.abs(x()-(-113))<.12,"initial speed preserved "+x());
 pose(100);bridge.apply(64);
 assert.ok(Math.abs(x()-(-110))<130,"no ballistic leap in 64ms "+x());
 pose(100);bridge.apply(340);
 assert.equal(x(),100);
});
test("1280px side-random regression: 64ms travel is bounded with the real large pose gap",()=>{
 const {api,el,draw,pose,x}=setup();
 const trail=api.collect([el],1000);
 pose(508.306);trail.sample(980);
 pose(444.306);trail.sample(1000); // outgoing -3.2px/ms, worst allowed drift
 const bridge=trail.bridge(460,draw);
 pose(-361.944);bridge.apply(0);
 assert.equal(x(),444.306,"C0 position continuity");
 pose(-361.944);bridge.apply(1);
 assert.ok(Math.abs(x()-(444.306-3.2))<.1,"C1 outgoing velocity "+x());
 for(const ms of [64,79]){
  pose(-361.944);bridge.apply(ms);
  assert.ok(Math.abs(x()-444.306)<130,"first 80ms travel, t="+ms+", x="+x());
 }
 pose(-361.944);bridge.apply(459);
 assert.ok(Math.abs(x()+361.944)<.01,"converges on new choreography");
});

test("missing tail samples or invalid transform is a safe no-op",()=>{
 const {api,el,draw,pose,x}=setup();
 const trail=api.collect([el],1000);
 pose(12);trail.sample(850);
 let br=trail.bridge(400,draw);pose(88);br.apply(0);assert.equal(x(),88);
 el.style.transform="none";trail.sample(1000);
 br=trail.bridge(400,draw);pose(88);br.apply(0);assert.equal(x(),88);
});
test("approved production and prototype call the bridge at both visible seams",()=>{
 for(const path of ["../../vintage-kana/index.html","../../vintage-kana/prototypes/cinematic-motion-v1/index.html"]){
  const html=readFileSync(new URL(path,import.meta.url),"utf8");
  assert.match(html,/VintageKanaMotionSeam\.collect\(g,phase12Duration\)/);
  assert.match(html,/phase12Trail\.sample\(elapsed\)/);
  assert.match(html,/phase4Entry\.apply\(elapsed\)/);
  assert.match(html,/phase4Trail\.sample\(elapsed\)/);
  assert.match(html,/phase5Entry\.apply\(elapsed\)/);
 }
 const prod=readFileSync(new URL("../../vintage-kana/index.html",import.meta.url),"utf8");
 assert.match(prod,/if\(p>\.88&&!el\.dataset\.converted\)/);
 assert.match(prod,/await ensureMotionTargetFont\(mode,motionOut\)/);
});
