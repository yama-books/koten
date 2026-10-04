"use strict";
const assert=require("node:assert/strict");
const {loadSimulation}=require("./load-simulation.cjs");
const {createRng,pinDeterminism}=require("./sim-core.cjs");

const originalRandom=Math.random,originalNow=Date.now;
try{
  const HKLife=loadSimulation(),rng=createRng(20261004);pinDeterminism(rng);
  const world=HKLife.WorldState.create();
  const actor=HKLife.WorldState.presentActors(world)[0];
  const token=world.punctuation[0];

  assert.equal(HKLife.POC_CAST.filter(a=>a.residence==="fluid").length,6);
  assert.equal(HKLife.PUNCTUATION_CATALOG.pocInterpretations.dakuten.length,4);
  assert.equal(HKLife.PUNCTUATION_CATALOG.pocInterpretations.handakuten.length,4);

  let changes=HKLife.Punctuation.pick(world,actor,token);
  assert.ok(changes.length&&actor.carrying===token.id&&token.state==="held");
  actor.x=35;actor.y=62;token.interpretations[actor.id]="seed";
  changes=HKLife.Punctuation.place(world,actor,token);
  assert.ok(changes.length&&actor.carrying===null&&token.state==="resting"&&token.planted);

  world.ticks=token.sproutDueTick;
  HKLife.Background.process(world);
  assert.ok(world.area.modifications.some(m=>m.kind==="sprout"&&m.sourceTokenId===token.id));

  const oldPath=HKLife.WORLD_CONFIG.usage.pathThreshold;
  HKLife.WORLD_CONFIG.usage.pathThreshold=1;
  actor.x=50;actor.y=65;
  HKLife.Background.recordMovement(world,actor);
  assert.ok(world.area.modifications.some(m=>m.kind==="path"));
  HKLife.WORLD_CONFIG.usage.pathThreshold=oldPath;

  const oldCache=HKLife.WORLD_CONFIG.usage.periodCacheThreshold;
  HKLife.WORLD_CONFIG.usage.periodCacheThreshold=1;
  token.kind="period";token.glyph="。";token.state="resting";token.x=55;token.y=70;
  HKLife.Background.recordPlacement(world,token,actor,"stone");
  assert.ok(world.area.modifications.some(m=>m.kind==="period-cache"));
  HKLife.WORLD_CONFIG.usage.periodCacheThreshold=oldCache;

  const oldWet=HKLife.WORLD_CONFIG.transforms.wetPeriodToHandakutenChance;
  const oldDry=HKLife.WORLD_CONFIG.transforms.dryHandakutenToPeriodChance;
  HKLife.WORLD_CONFIG.transforms.wetPeriodToHandakutenChance=1;
  HKLife.WORLD_CONFIG.transforms.dryHandakutenToPeriodChance=1;
  world.punctuation=[token];token.x=20;token.y=70;token.kind="period";token.glyph="。";
  HKLife.Punctuation.processEnvironment(world);
  assert.equal(token.kind,"handakuten");
  token.x=55;token.y=45;
  HKLife.Punctuation.processEnvironment(world);
  assert.equal(token.kind,"period");
  HKLife.WORLD_CONFIG.transforms.wetPeriodToHandakutenChance=oldWet;
  HKLife.WORLD_CONFIG.transforms.dryHandakutenToPeriodChance=oldDry;

  const fluid=world.actors.find(a=>a.source==="土");
  assert.equal(fluid.presence.state,"away");
  HKLife.Population.arrive(world,fluid);assert.equal(fluid.presence.state,"present");
  HKLife.Population.depart(world,fluid);assert.equal(fluid.presence.state,"away");

  const changed=world.observationLog.flatMap(e=>e.stateChanges||[]);
  assert.ok(changed.some(c=>c.kind==="punctuation-kind"));
  assert.ok(changed.some(c=>c.kind==="actor-presence"));
  assert.ok(changed.some(c=>c.kind==="persistent-modification"));

  console.log(JSON.stringify({ok:true,fluidCandidates:6,dakutenInterpretations:4,handakutenInterpretations:4,modifications:[...new Set(world.area.modifications.map(m=>m.kind))],stateChangeKinds:[...new Set(changed.map(c=>c.kind))]},null,2));
}finally{Math.random=originalRandom;Date.now=originalNow}
