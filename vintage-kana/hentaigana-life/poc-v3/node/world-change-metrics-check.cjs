"use strict";
const {loadSimulation}=require("./load-simulation.cjs");
const {createRng,pinDeterminism,stepWorld}=require("./sim-core.cjs");

(async()=>{
  const originalRandom=Math.random,originalNow=Date.now;
  try{
    const HKLife=loadSimulation(),rng=createRng(20261004);pinDeterminism(rng);
    const world=HKLife.WorldState.create();
    const changedTicks=new Set(),byKind={},eventTypes={};
    let observationEvents=0,stateChangeEvents=0;
    const record=entry=>{
      const changes=Array.isArray(entry.stateChanges)?entry.stateChanges:[];
      if(changes.length){
        changedTicks.add(entry.tick);
        stateChangeEvents++;
        for(const c of changes){const k=c.kind||c.type||"unknown";byKind[k]=(byKind[k]||0)+1}
      }
    };
    const offO=HKLife.Bus.on("observation",entry=>{observationEvents++;eventTypes[entry.type]=(eventTypes[entry.type]||0)+1;record(entry)});
    const offI=HKLife.Bus.on("internal",record);
    const ticks=10000;
    for(let i=0;i<ticks;i++)await stepWorld(HKLife,world);
    offO();offI();
    const changedTickRatePercent=Number((100*changedTicks.size/ticks).toFixed(2));
    const observationEventsPerTick=Number((observationEvents/ticks).toFixed(4));
    if(observationEventsPerTick>1)throw new Error("observation event density exceeded 1.0/tick");
    console.log(JSON.stringify({
      ok:true,seed:20261004,ticks,changedTicks:changedTicks.size,changedTickRatePercent,
      stateChangeEvents,observationEvents,observationEventsPerTick,byKind,eventTypes,
      final:{presentActors:HKLife.WorldState.presentActors(world).length,punctuation:world.punctuation.length,
        paths:world.area.modifications.filter(m=>m.kind==="path").length,
        periodCaches:world.area.modifications.filter(m=>m.kind==="period-cache").length,
        sprouts:world.area.modifications.filter(m=>m.kind==="sprout").length}
    },null,2));
  }finally{Math.random=originalRandom;Date.now=originalNow}
})().catch(e=>{console.error(e&&e.stack||e);process.exitCode=1});
