"use strict";
const fs=require("node:fs");
const path=require("node:path");
const {loadSimulation}=require("./load-simulation.cjs");
const {EventWriter}=require("./event-writer.cjs");

function parseArgs(argv){
  const out={ticks:10000,seed:(Date.now()>>>0),output:path.resolve(process.cwd(),"runs"),snapshotEvery:1000,eventLevel:"all",tickDelayMs:0,sourceCommit:process.env.HKLIFE_SOURCE_COMMIT||null,runId:null};
  for(let i=0;i<argv.length;i++){
    const a=argv[i],v=argv[i+1];
    if(a==="--ticks"){out.ticks=Number(v);i++;}
    else if(a==="--seed"){out.seed=Number(v)>>>0;i++;}
    else if(a==="--output"){out.output=path.resolve(v);i++;}
    else if(a==="--snapshot-every"){out.snapshotEvery=Number(v);i++;}
    else if(a==="--event-level"){out.eventLevel=v;i++;}
    else if(a==="--tick-delay-ms"){out.tickDelayMs=Number(v);i++;}
    else if(a==="--source-commit"){out.sourceCommit=v;i++;}
    else if(a==="--run-id"){out.runId=v;i++;}
    else if(a==="--help"||a==="-h") out.help=true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if(out.help)return out;
  if(!Number.isInteger(out.ticks)||out.ticks<1)throw new Error("--ticks must be an integer >= 1");
  if(!Number.isInteger(out.snapshotEvery)||out.snapshotEvery<1)throw new Error("--snapshot-every must be an integer >= 1");
  if(!Number.isFinite(out.tickDelayMs)||out.tickDelayMs<0)throw new Error("--tick-delay-ms must be >= 0");
  if(!["all","observation"].includes(out.eventLevel))throw new Error("--event-level must be all or observation");
  if(out.runId&&!/^[A-Za-z0-9._-]+$/.test(out.runId))throw new Error("--run-id may contain only A-Z a-z 0-9 . _ -");
  return out;
}
function safeStamp(){return new Date().toISOString().replace(/[:.]/g,"-");}
function makeRunId(seed){return `${safeStamp()}_seed-${seed}`;}
function mulberry32(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function writeJsonExclusive(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n",{encoding:"utf8",flag:"wx"});}
function snapshotEnvelope(HKLife,world,meta){return{runId:meta.runId,engineVersion:meta.engineVersion,worldSchemaVersion:meta.worldSchemaVersion,characterDataVersion:meta.characterDataVersion,sourceCommit:meta.sourceCommit,seed:meta.seed,capturedAt:new Date().toISOString(),tick:world.ticks,world};}
function snapshotPath(dir,tick,label="tick"){return path.join(dir,`${String(tick).padStart(12,"0")}-${label}-${safeStamp()}.json`);}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function usage(){console.log(`Hentaigana Life PoC v3 headless runner\n\nnode node/runner.cjs [options]\n\n  --ticks N               simulation ticks (default 10000)\n  --seed N                deterministic uint32 seed\n  --output DIR            parent directory for runs/\n  --run-id ID             explicit new run id (existing directory is refused)\n  --snapshot-every N      snapshot interval in ticks (default 1000)\n  --event-level LEVEL     all | observation (default all)\n  --tick-delay-ms N       optional real delay per tick (default 0)\n  --source-commit SHA     commit/tag identifier recorded in run metadata\n`);}

(async()=>{
  const args=parseArgs(process.argv.slice(2));
  if(args.help){usage();return;}
  const HKLife=loadSimulation();
  const originalRandom=Math.random;
  Math.random=mulberry32(args.seed);
  const runId=args.runId||makeRunId(args.seed);
  const runDir=path.join(args.output,runId);
  const snapshotsDir=path.join(runDir,"snapshots");
  if(fs.existsSync(runDir))throw new Error(`Run directory already exists; refusing to overwrite: ${runDir}`);
  fs.mkdirSync(snapshotsDir,{recursive:true});
  const runMeta={
    runId,
    engineVersion:HKLife.VERSION_INFO.engineVersion,
    worldSchemaVersion:HKLife.VERSION_INFO.worldSchemaVersion,
    characterDataVersion:HKLife.VERSION_INFO.characterDataVersion,
    sourceCommit:args.sourceCommit,
    seed:args.seed,
    createdAt:new Date().toISOString(),
    requestedTicks:args.ticks,
    snapshotEveryTicks:args.snapshotEvery,
    eventLevel:args.eventLevel,
    runner:"node/runner.cjs"
  };
  writeJsonExclusive(path.join(runDir,"run-meta.json"),runMeta);
  const world=HKLife.WorldState.create();
  writeJsonExclusive(snapshotPath(snapshotsDir,world.ticks,"initial"),snapshotEnvelope(HKLife,world,runMeta));
  const writer=new EventWriter({file:path.join(runDir,"events.jsonl"),world,runMeta,eventLevel:args.eventLevel});
  writer.bind(HKLife.Bus);
  let stopRequested=false;
  process.on("SIGINT",()=>{stopRequested=true;});
  process.on("SIGTERM",()=>{stopRequested=true;});
  let status="completed",error=null;
  const started=Date.now();
  try{
    for(let i=0;i<args.ticks;i++){
      if(stopRequested){status="interrupted";break;}
      await HKLife.Simulation.step(world,{wait:async()=>{},rng:Math.random});
      if(world.ticks%args.snapshotEvery===0){
        writeJsonExclusive(snapshotPath(snapshotsDir,world.ticks),snapshotEnvelope(HKLife,world,runMeta));
      }
      if(args.tickDelayMs>0)await sleep(args.tickDelayMs);
    }
  }catch(err){status="failed";error=String(err&&err.stack||err);}
  finally{
    try{writeJsonExclusive(snapshotPath(snapshotsDir,world.ticks,"final"),snapshotEnvelope(HKLife,world,runMeta));}catch(err){if(!error)error=String(err&&err.stack||err);status="failed";}
    writer.close();Math.random=originalRandom;
  }
  const result={runId,status,error,finishedAt:new Date().toISOString(),durationMs:Date.now()-started,ticksCompleted:world.ticks,worldTime:{minutes:world.clockMinutes,display:HKLife.Utils.formatClock(world.clockMinutes),phase:HKLife.Utils.timePhase(world.clockMinutes)},counts:{actors:world.actors.length,punctuation:world.punctuation.length,observationLogInSnapshot:world.observationLog.length,internalLogInSnapshot:world.internalLog.length,holes:world.area.modifications.filter(x=>x.kind==="hole").length,soilPiles:world.area.modifications.filter(x=>x.kind==="soil-pile").length}};
  writeJsonExclusive(path.join(runDir,"run-result.json"),result);
  console.log(JSON.stringify({runDir,...result},null,2));
  if(status==="failed")process.exitCode=1;else if(status==="interrupted")process.exitCode=130;
})().catch(err=>{console.error(err&&err.stack||err);process.exitCode=1;});
