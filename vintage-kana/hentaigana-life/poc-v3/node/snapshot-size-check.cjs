"use strict";
// Snapshot growth check: runs the shared simulation in memory and measures the snapshot as runner.cjs writes it.
// node node/snapshot-size-check.cjs [--ticks 100000] [--every 5000] [--seed 20261002]
const {loadSimulation}=require("./load-simulation.cjs");
const {createRng,pinDeterminism,stepWorld,snapshotEnvelope}=require("./sim-core.cjs");

function arg(name,fallback){const i=process.argv.indexOf(name);return i>=0?Number(process.argv[i+1]):fallback;}
(async()=>{
  const ticks=arg("--ticks",100000),every=arg("--every",5000),seed=arg("--seed",20261002)>>>0;
  const HKLife=loadSimulation(),originalRandom=Math.random,originalDateNow=Date.now,rng=createRng(seed);
  const meta={runId:"snapshot-size-check",...HKLife.VERSION_INFO,sourceCommit:null,seed};
  let recorded=0;const record=HKLife.Punctuation.recordHistory;HKLife.Punctuation.recordHistory=function(...a){recorded++;return record.apply(this,a);};
  pinDeterminism(rng);const world=HKLife.WorldState.create(),limit=HKLife.WORLD_CONFIG.punctuationHistory.recentLimit,rows=[];
  const measure=()=>{const bytes=Buffer.byteLength(JSON.stringify(snapshotEnvelope(world,meta,rng,0),null,2)+"\n");rows.push({tick:world.ticks,bytes,historyLengths:world.punctuation.map(p=>p.history.length),historyBytes:world.punctuation.reduce((s,p)=>s+JSON.stringify(p.history).length,0),summaryBytes:world.punctuation.reduce((s,p)=>s+JSON.stringify(p.historySummary).length,0)});};
  measure();
  try{for(let i=0;i<ticks;i++){await stepWorld(HKLife,world);if(world.ticks%every===0)measure();}}
  finally{Math.random=originalRandom;Date.now=originalDateNow;}
  const mid=rows.find(r=>r.tick>=ticks/2),last=rows.at(-1),max=Math.max(...rows.map(r=>r.bytes));
  const summaryTotal=world.punctuation.reduce((s,p)=>s+p.historySummary.total,0),summaryDropped=world.punctuation.reduce((s,p)=>s+p.historySummary.dropped,0);
  const byInterpretationTotal=world.punctuation.reduce((s,p)=>s+Object.values(p.historySummary.byInterpretation).reduce((a,b)=>a+b,0),0);
  const byActorTotal=world.punctuation.reduce((s,p)=>s+Object.values(p.historySummary.byActor).reduce((a,o)=>a+Object.values(o).reduce((x,y)=>x+y,0),0),0);
  const checks={
    historyCapped:rows.every(r=>r.historyLengths.every(n=>n<=limit)),
    // Growth over the second half stays within 10% (unbounded history grew ~2x here before the cap).
    secondHalfGrowthPercent:Number((100*(last.bytes-mid.bytes)/mid.bytes).toFixed(2)),
    summaryCountsAll:summaryTotal===recorded&&byInterpretationTotal===recorded&&byActorTotal===recorded,
    summaryDroppedConsistent:summaryDropped===recorded-world.punctuation.reduce((s,p)=>s+p.history.length,0)
  };
  const ok=checks.historyCapped&&checks.secondHalfGrowthPercent<=10&&checks.summaryCountsAll&&checks.summaryDroppedConsistent;
  console.log(JSON.stringify({ok,ticks,seed,recentLimit:limit,worldSchemaVersion:HKLife.VERSION_INFO.worldSchemaVersion,maxSnapshotBytes:max,finalSnapshotBytes:last.bytes,interpretationsRecorded:recorded,checks,sizes:rows.map(r=>({tick:r.tick,bytes:r.bytes,historyBytes:r.historyBytes,summaryBytes:r.summaryBytes}))},null,2));
  if(!ok)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
