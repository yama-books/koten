"use strict";
const {loadSimulation}=require("./load-simulation.cjs");
const {createRng,pinDeterminism}=require("./sim-core.cjs");

function assert(ok,msg){if(!ok)throw new Error(msg);}
const rng=createRng(20261004);pinDeterminism(rng);
const HKLife=loadSimulation();

const world=HKLife.WorldState.create();
assert(world.version===3,"world version must be 3");
assert(world.actors.length===12,"expected 8 baseline actors plus 4 fluid candidates");
assert(world.actors.filter(a=>a.presence!=="away").length===8,"initial visible population must remain 8");
assert(world.actors.filter(a=>a.presence==="away").length===4,"four candidates should begin away");

// B1: a punctuation token can be picked, carried and placed while preserving identity.
const actor=world.actors.find(a=>a.residence==="resident");
const token=world.punctuation[0];
const tokenId=token.id;
assert(HKLife.Punctuation.pick(world,actor,token).length>0,"pick must produce state changes");
actor.x+=5;actor.y+=2;HKLife.Punctuation.followHolder(world,actor,"health-carry");
const placed=HKLife.Punctuation.place(world,actor,rng.next,"health-place");
assert(placed.token?.id===tokenId&&!actor.carrying&&placed.token.holder===null,"place must preserve token id and release holder");

// B2: fluid capacity remains two, and vacancies can be filled from the candidate pool.
HKLife.Population.ensure(world,rng.next);
const fluidPresent=world.actors.filter(a=>a.residence==="fluid"&&a.presence==="present");
fluidPresent[0].presence="away";fluidPresent[0].visit.leaveAtTick=null;
world.population.nextCheckTick=world.ticks;
HKLife.Population.step(world,rng.next);
assert(world.actors.filter(a=>a.residence==="fluid"&&a.presence==="present").length===2,"fluid vacancy should be filled");
const leaver=world.actors.find(a=>a.residence==="fluid"&&a.presence==="present");
leaver.visit.leaveAtTick=world.ticks;world.population.nextCheckTick=world.ticks+999;
HKLife.Population.step(world,rng.next);
assert(leaver.presence==="away","due fluid actor should leave");

// B3: water raises the probability of period -> handakuten, while dry space allows the reverse.
for(const t of world.punctuation)t.state="merged";
const wet=HKLife.WorldState.makePunctuation("period",10,70);world.punctuation.push(wet);
HKLife.Punctuation.tickTransforms(world,()=>0);
assert(wet.kind==="handakuten"&&wet.id,"wet period should be able to hollow into handakuten without changing id");
wet.x=50;wet.y=70;
HKLife.Punctuation.tickTransforms(world,()=>0);
assert(wet.kind==="period","dry handakuten should be able to return to period");

// B3: comma pair merging keeps the original ids and reversible lineage.
wet.state="merged";
const c1=HKLife.WorldState.makePunctuation("comma",45,70),c2=HKLife.WorldState.makePunctuation("comma",46,70);
world.punctuation.push(c1,c2);
HKLife.Punctuation.tickTransforms(world,()=>0);
const dakuten=world.punctuation.find(t=>t.kind==="dakuten"&&t.state!=="merged");
assert(dakuten&&dakuten.parts.includes(c1.id)&&dakuten.parts.includes(c2.id),"nearby commas should be able to merge into a traced dakuten");
HKLife.Punctuation.tickTransforms(world,()=>0);
assert(c1.state==="resting"&&c2.state==="resting"&&dakuten.state==="merged","dakuten should be able to split back to the original comma ids");

// C1: repeated use creates visible place meaning.
const cfg=HKLife.WORLD_CONFIG.placeMeaning;
for(let i=0;i<cfg.pathWalkThreshold;i++)HKLife.Background.recordUsage(world,55,75,"walk",actor.id);
assert(world.area.modifications.some(m=>m.kind==="path"),"repeated walking should create a path");
for(let i=0;i<cfg.periodCacheThreshold;i++)HKLife.Background.recordUsage(world,60,75,"period-place",actor.id);
assert(world.area.modifications.some(m=>m.kind==="period-cache"),"repeated period placement should create a period cache");

// C1: a planted seed interpretation can become a sprout.
const seed=HKLife.WorldState.makePunctuation("period",10,72);
seed.growth={state:"planted",plantedAtTick:0,sproutAtTick:0,plantedBy:actor.id};
world.punctuation.push(seed);
HKLife.Background.tickGrowth(world,()=>0);
assert(seed.growth.state==="sprouted"&&world.area.modifications.some(m=>m.kind==="sprout"&&m.sourceTokenId===seed.id),"planted seed should be able to sprout");

console.log(JSON.stringify({
  ok:true,
  actors:world.actors.length,
  present:world.actors.filter(a=>a.presence!=="away").length,
  paths:world.area.modifications.filter(m=>m.kind==="path").length,
  periodCaches:world.area.modifications.filter(m=>m.kind==="period-cache").length,
  sprouts:world.area.modifications.filter(m=>m.kind==="sprout").length
},null,2));
