"use strict";
const fs=require("node:fs");
const path=require("node:path");
const os=require("node:os");
const {loadSimulation}=require("./load-simulation.cjs");
const {EventWriter}=require("./event-writer.cjs");
const {createRng,pinDeterminism,stepWorld}=require("./sim-core.cjs");
const {computeCompatibility}=require("./compat.cjs");
const store=require("./run-store.cjs");
const {writeJsonExclusive,readJson,saveSnapshot,stableEvent}=store;

function parseArgs(argv){
  const out={ticks:10000,seed:(Date.now()>>>0),output:path.resolve(process.cwd(),"runs"),snapshotEvery:1000,eventLevel:"all",tickDelayMs:0,sourceCommit:process.env.HKLIFE_SOURCE_COMMIT||null,runId:null,resumeRun:null,resumeFrom:null};
  for(let i=0;i<argv.length;i++){
    const a=argv[i],v=argv[i+1];
    if(a==="--ticks"){out.ticks=Number(v);i++;} else if(a==="--seed"){out.seed=Number(v)>>>0;i++;}
    else if(a==="--output"){out.output=path.resolve(v);i++;} else if(a==="--snapshot-every"){out.snapshotEvery=Number(v);i++;}
    else if(a==="--event-level"){out.eventLevel=v;i++;} else if(a==="--tick-delay-ms"){out.tickDelayMs=Number(v);i++;}
    else if(a==="--source-commit"){out.sourceCommit=v;i++;} else if(a==="--run-id"){out.runId=v;i++;}
    else if(a==="--resume-run"){out.resumeRun=path.resolve(v);i++;} else if(a==="--resume-from"){out.resumeFrom=path.resolve(v);i++;} else if(a==="--pause-after-segment")out.pauseAfterSegment=true;
    else if(a==="--help"||a==="-h")out.help=true; else throw new Error(`Unknown argument: ${a}`);
  }
  if(out.help)return out;
  if(!Number.isInteger(out.ticks)||out.ticks<1)throw new Error("--ticks must be an integer >= 1");
  if(!Number.isInteger(out.snapshotEvery)||out.snapshotEvery<1)throw new Error("--snapshot-every must be an integer >= 1");
  if(!Number.isFinite(out.tickDelayMs)||out.tickDelayMs<0)throw new Error("--tick-delay-ms must be >= 0");
  if(!["all","observation"].includes(out.eventLevel))throw new Error("--event-level must be all or observation");
  if(out.runId&&!/^[A-Za-z0-9._-]+$/.test(out.runId))throw new Error("--run-id may contain only A-Z a-z 0-9 . _ -");
  if(out.resumeFrom&&!out.resumeRun)throw new Error("--resume-from requires --resume-run");
  if(out.resumeRun&&(out.runId||out.seed!==undefined&&argv.includes("--seed")||out.sourceCommit&&argv.includes("--source-commit")))throw new Error("resume inherits run-id, seed and sourceCommit from run metadata");
  return out;
}
function makeRunId(seed){return `${store.safeStamp()}_seed-${seed}`;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function usage(){console.log(`Hentaigana Life PoC v3 headless runner\n\nnode node/runner.cjs [options]\n  --ticks N               ticks to run in this segment\n  --seed N                deterministic uint32 seed (new run only)\n  --output DIR            parent directory for runs/\n  --run-id ID             explicit new run id\n  --snapshot-every N      snapshot interval in ticks\n  --event-level LEVEL     all | observation\n  --tick-delay-ms N       optional real delay per tick\n  --source-commit SHA     source identifier (new run only; must equal HEAD)\n  --resume-run DIR        resume a prior run directory\n  --resume-from FILE      select a specific snapshot inside --resume-run\n`);}
function latestSnapshot(dir){const files=fs.readdirSync(path.join(dir,"snapshots")).filter(n=>n.endsWith(".json")).map(n=>path.join(dir,"snapshots",n));if(!files.length)throw new Error("no valid snapshot available");const entries=files.map(file=>({file,data:readJson(file,"snapshot")}));entries.sort((a,b)=>(b.data.tick||0)-(a.data.tick||0));return entries[0];}
function inspectEventTail(file){if(!fs.existsSync(file))throw new Error("events.jsonl is missing");const data=fs.readFileSync(file);if(data.length&&!([10,13].includes(data[data.length-1])))throw new Error("末尾eventが不完全: events.jsonl does not end with a newline");const lines=data.toString("utf8").split(/\r?\n/).filter(Boolean),events=[];let seq=0;for(let i=0;i<lines.length;i++){let event;try{event=JSON.parse(lines[i]);}catch(e){throw new Error(`末尾eventが不完全: invalid JSON at line ${i+1}`);}if(!Number.isInteger(event.sequence)||event.sequence!==seq+1)throw new Error(`events.jsonl sequence discontinuity at line ${i+1}`);seq=event.sequence;events.push(event);}return{sequence:seq,events};}
function checkResume(dir,snapshot,meta,HKLife,tail){store.checkCompatibility(meta,snapshot,HKLife);store.checkSnapshotShape(snapshot,meta);if(tail<snapshot.lastSequence)throw new Error(`events.jsonl sequence ${tail} precedes snapshot lastSequence ${snapshot.lastSequence}`);store.checkLastStatus(dir,["interrupted","terminated"]);return snapshot;}
async function reconcileUncheckpointedEvents(HKLife,world,meta,rng,snapshot,tailEvents,dir){if(tailEvents.length===snapshot.lastSequence)return{world,rng,sequence:snapshot.lastSequence};if(meta.eventLevel!=="all")throw new Error("snapshot/event mismatch cannot be replayed safely when eventLevel is not all");const expected=tailEvents.slice(snapshot.lastSequence),tmp=fs.mkdtempSync(path.join(os.tmpdir(),"hklife-replay-")),file=path.join(tmp,"events.jsonl"),writer=new EventWriter({file,world,runMeta:meta,eventLevel:meta.eventLevel,startSequence:snapshot.lastSequence});writer.bind(HKLife.Bus);pinDeterminism(rng);let matched=false,replayed=[];try{const max=meta.snapshotEveryTicks||10000;for(let i=0;i<max;i++){await stepWorld(HKLife,world);if(writer.sequence>tailEvents.at(-1).sequence)break;if(writer.sequence===tailEvents.at(-1).sequence){matched=true;break;}}writer.close();if(matched)replayed=fs.readFileSync(file,"utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);}finally{try{writer.close();}catch{}fs.rmSync(tmp,{recursive:true,force:true});}if(!matched)throw new Error("events beyond the last snapshot do not end at a replayable tick boundary; refusing resume");if(replayed.length!==expected.length||replayed.some((event,i)=>stableEvent(event)!==stableEvent(expected[i])))throw new Error("events beyond the last snapshot do not match deterministic replay; refusing resume");const sequence=tailEvents.at(-1).sequence;saveSnapshot(path.join(dir,"snapshots"),world,meta,rng,sequence,"recovered",store.currentSourceCommit());return{world,rng,sequence};}

(async()=>{
  const args=parseArgs(process.argv.slice(2));if(args.help){usage();return;}
  const HKLife=loadSimulation(),originalRandom=Math.random,originalDateNow=Date.now;
  let meta,world,runId,runDir,snapshotsDir,rng,sequence=0,resumeSnapshot=null;
  const audit=store.sourceAudit();
  if(args.resumeRun){
    runDir=args.resumeRun;runId=path.basename(runDir);snapshotsDir=path.join(runDir,"snapshots");meta=readJson(path.join(runDir,"run-meta.json"),"run-meta.json");
    const selected=args.resumeFrom?{file:args.resumeFrom,data:readJson(args.resumeFrom,"snapshot")}:latestSnapshot(runDir);const rel=path.relative(runDir,selected.file);if(rel.startsWith("..")||path.isAbsolute(rel))throw new Error("resume snapshot must be inside the run directory");
    const tail=inspectEventTail(path.join(runDir,"events.jsonl"));sequence=tail.sequence;resumeSnapshot=checkResume(runDir,selected.data,meta,HKLife,sequence);world=resumeSnapshot.world;rng=createRng(meta.seed,resumeSnapshot.rngState);const recovered=await reconcileUncheckpointedEvents(HKLife,world,meta,rng,resumeSnapshot,tail.events,runDir);world=recovered.world;rng=recovered.rng;sequence=recovered.sequence;
    const n=store.nextSegment(runDir);args.segmentNo=n;args.snapshotSource=selected.file;
  }else{
    runId=args.runId||makeRunId(args.seed);runDir=path.join(args.output,runId);snapshotsDir=path.join(runDir,"snapshots");
    if(args.sourceCommit&&args.sourceCommit!==audit.sourceCommit)throw new Error(`--source-commit ${args.sourceCommit} does not match current HEAD ${audit.sourceCommit}`);
    if(fs.existsSync(runDir))throw new Error(`Run directory already exists; refusing to overwrite: ${runDir}`);
    fs.mkdirSync(snapshotsDir,{recursive:true});rng=createRng(args.seed);
    meta={runId,mode:"batch",engineVersion:HKLife.VERSION_INFO.engineVersion,worldSchemaVersion:HKLife.VERSION_INFO.worldSchemaVersion,characterDataVersion:HKLife.VERSION_INFO.characterDataVersion,sourceCommit:args.sourceCommit||audit.sourceCommit,sourceDirty:audit.sourceDirty,compatibility:computeCompatibility(),seed:args.seed,createdAt:new Date().toISOString(),eventLevel:args.eventLevel,snapshotEveryTicks:args.snapshotEvery,runner:"node/runner.cjs"};
    pinDeterminism(rng);writeJsonExclusive(path.join(runDir,"run-meta.json"),meta);world=HKLife.WorldState.create();saveSnapshot(snapshotsDir,world,meta,rng,sequence,"initial",audit.sourceCommit);args.segmentNo=store.nextSegment(runDir);args.snapshotSource=null;
  }
  pinDeterminism(rng);
  const segStem=store.segmentStem(args.segmentNo),runningFile=path.join(runDir,"segments",`${segStem}.running.json`),segFile=path.join(runDir,"segments",`${segStem}.json`);if(fs.existsSync(segFile)||fs.existsSync(runningFile))throw new Error(`segment already exists: ${segStem}`);
  const segment={runId,segment:args.segmentNo,resumeSourceSnapshot:args.snapshotSource,startTick:world.ticks,endTick:null,startSequence:sequence,endSequence:null,startedAt:new Date().toISOString(),finishedAt:null,sourceCommit:audit.sourceCommit,sourceDirty:audit.sourceDirty,compatibilityFingerprint:meta.compatibility?.fingerprint??null,engineVersion:meta.engineVersion,worldSchemaVersion:meta.worldSchemaVersion,characterDataVersion:meta.characterDataVersion,seed:meta.seed,status:"running",stopReason:null};writeJsonExclusive(runningFile,segment);
  const eventFile=path.join(runDir,"events.jsonl");const writer=new EventWriter({file:eventFile,world,runMeta:meta,eventLevel:args.resumeRun?meta.eventLevel:args.eventLevel,append:!!args.resumeRun,startSequence:sequence});
  writer.bind(HKLife.Bus);let stopRequested=null;const requestStop=s=>{stopRequested=stopRequested||s;};process.on("SIGINT",()=>requestStop("SIGINT"));process.on("SIGTERM",()=>requestStop("SIGTERM"));
  let status="completed",error=null;const started=originalDateNow();
  try{for(let i=0;i<args.ticks;i++){if(stopRequested){status="interrupted";break;}await stepWorld(HKLife,world);if(world.ticks%args.snapshotEvery===0)saveSnapshot(snapshotsDir,world,meta,rng,writer.sequence,undefined,audit.sourceCommit);if(args.tickDelayMs>0)await sleep(args.tickDelayMs);}if(args.pauseAfterSegment&&!stopRequested){status="interrupted";stopRequested="segment-limit";}}
  catch(err){status="failed";error=String(err&&err.stack||err);}
  finally{
    try{saveSnapshot(snapshotsDir,world,meta,rng,writer.sequence,status==="completed"?"final":"checkpoint",audit.sourceCommit);}catch(err){if(!error)error=String(err&&err.stack||err);status="failed";}
    writer.close();Math.random=originalRandom;Date.now=originalDateNow;
  }
  segment.endTick=world.ticks;segment.endSequence=writer.sequence;segment.finishedAt=new Date().toISOString();segment.status=status;segment.stopReason=stopRequested||error||"requested-ticks-complete";writeJsonExclusive(segFile,segment);fs.unlinkSync(runningFile);
  const result={runId,status,error,segment:args.segmentNo,finishedAt:segment.finishedAt,durationMs:originalDateNow()-started,ticksCompleted:world.ticks,worldTime:{minutes:world.clockMinutes,display:HKLife.Utils.formatClock(world.clockMinutes),phase:HKLife.Utils.timePhase(world.clockMinutes)},counts:{actors:world.actors.length,punctuation:world.punctuation.length,observationLogInSnapshot:world.observationLog.length,internalLogInSnapshot:world.internalLog.length,holes:world.area.modifications.filter(x=>x.kind==="hole").length,soilPiles:world.area.modifications.filter(x=>x.kind==="soil-pile").length}};
  const resultPath=args.resumeRun?path.join(runDir,"segments",`${segStem}-result.json`):path.join(runDir,"run-result.json");writeJsonExclusive(resultPath,result);console.log(JSON.stringify({runDir,...result},null,2));if(status==="failed")process.exitCode=1;else if(status==="interrupted"&&stopRequested!=="segment-limit")process.exitCode=130;
})().catch(err=>{console.error(err&&err.stack||err);process.exitCode=1;});
