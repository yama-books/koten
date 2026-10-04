"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {loadSimulation,SIMULATION_FILES}=require("./load-simulation.cjs");
const {createRng,pinDeterminism,stepWorld}=require("./sim-core.cjs");
function normalize(value){
  if(Array.isArray(value))return value.map(normalize);
  if(value&&typeof value==="object"){
    const out={};for(const [k,v] of Object.entries(value)){if(["at","createdAt","savedAt","lastRealTime"].includes(k))continue;out[k]=normalize(v)}return out;
  }
  return value;
}
async function run(seed,ticks){
  const HKLife=loadSimulation(),rng=createRng(seed);pinDeterminism(rng);const world=HKLife.WorldState.create();
  for(let i=0;i<ticks;i++)await stepWorld(HKLife,world);
  return JSON.stringify(normalize(world));
}
(async()=>{
  const originalRandom=Math.random,originalNow=Date.now;
  try{
    const html=fs.readFileSync(path.resolve(__dirname,"../index.html"),"utf8");
    const browser=[...html.matchAll(/<script defer src="([^"]+)"/g)].map(m=>m[1]).filter(x=>SIMULATION_FILES.includes(x));
    if(JSON.stringify(browser)!==JSON.stringify(SIMULATION_FILES))throw new Error("browser/Node simulation file order differs");
    const a=await run(20261004,1200),b=await run(20261004,1200);
    if(a!==b)throw new Error("same seed did not produce the same normalized world");
    console.log(JSON.stringify({ok:true,seed:20261004,ticks:1200,simulationFiles:SIMULATION_FILES.length},null,2));
  }finally{Math.random=originalRandom;Date.now=originalNow}
})().catch(e=>{console.error(e&&e.stack||e);process.exitCode=1});
