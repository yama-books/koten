"use strict";
// Node-side code that can change simulation results, PRNG output or snapshot/resume state.
// This file is part of the compatibility fingerprint (compat.cjs): any edit makes older runs non-resumable.

function createRng(seed,state){let a=state===undefined?(seed>>>0):(state>>>0);return{next(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;},getState(){return a>>>0;},setState(n){if(!Number.isInteger(n)||n<0||n>0xffffffff)throw new Error("invalid rngState");a=n>>>0;}};}
// Utils.uid() uses Date.now(); pin it so IDs replay across resume and identical seeded runs.
function pinDeterminism(rng){Math.random=rng.next;Date.now=()=>0;}
function stepWorld(HKLife,world){return HKLife.Simulation.step(world,{wait:async()=>{},rng:Math.random});}
function snapshotEnvelope(world,meta,rng,lastSequence,sourceCommit){
  const envelope={runId:meta.runId,engineVersion:meta.engineVersion,worldSchemaVersion:meta.worldSchemaVersion,characterDataVersion:meta.characterDataVersion,sourceCommit:sourceCommit===undefined?meta.sourceCommit:sourceCommit,seed:meta.seed,rngState:rng.getState(),lastSequence,capturedAt:new Date().toISOString(),tick:world.ticks,world};
  if(meta.compatibility)envelope.compatibilityFingerprint=meta.compatibility.fingerprint;
  return envelope;
}

module.exports={createRng,pinDeterminism,stepWorld,snapshotEnvelope};
