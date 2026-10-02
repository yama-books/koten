"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const os=require("node:os");
const {loadSimulation}=require("./load-simulation.cjs");
const {EventWriter}=require("./event-writer.cjs");

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
function safeStamp(){return new Date().toISOString().replace(/[:.]/g,"-");}
function makeRunId(seed){return `${safeStamp()}_seed-${seed}`;}
function createRng(seed,state){let a=state===undefined?(seed>>>0):(state>>>0);return{next(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;},getState(){return a>>>0;},setState(n){if(!Number.isInteger(n)||n<0||n>0xffffffff)throw new Error("invalid rngState");a=n>>>0;}};}
function writeJsonExclusive(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n",{encoding:"utf8",flag:"wx"});}
function writeJsonAtomic(file,value){const tmp=`${file}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;const fd=fs.openSync(tmp,"wx");try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+"\n");fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,file);}
function snapshotEnvelope(HKLife,world,meta,rng,lastSequence){return{runId:meta.runId,engineVersion:meta.engineVersion,worldSchemaVersion:meta.worldSchemaVersion,characterDataVersion:meta.characterDataVersion,sourceCommit:meta.sourceCommit,seed:meta.seed,rngState:rng.getState(),lastSequence,capturedAt:new Date().toISOString(),tick:world.ticks,world};}
function snapshotPath(dir,tick,label="tick"){return path.join(dir,`${String(tick).padStart(12,"0")}-${label}-${safeStamp()}-${crypto.randomBytes(3).toString("hex")}.json`);}
function saveSnapshot(dir,HKLife,world,meta,rng,sequence,label){const file=snapshotPath(dir,world.ticks,label);writeJsonAtomic(file,snapshotEnvelope(HKLife,world,meta,rng,sequence));return file;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function usage(){console.log(`Hentaigana Life PoC v3 headless runner\n\nnode node/runner.cjs [options]\n  --ticks N               ticks to run in this segment\n  --seed N                deterministic uint32 seed (new run only)\n  --output DIR            parent directory for runs/\n  --run-id ID             explicit new run id\n  --snapshot-every N      snapshot interval in ticks\n  --event-level LEVEL     all | observation\n  --tick-delay-ms N       optional real delay per tick\n  --source-commit SHA     source identifier (new run only)\n  --resume-run DIR        resume a prior run directory\n  --resume-from FILE      select a specific snapshot inside --resume-run\n`);}
function readJson(file,label){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch(e){throw new Error(`${label} is invalid JSON: ${e.message}`);}}
function latestSnapshot(dir){const files=fs.readdirSync(path.join(dir,"snapshots")).filter(n=>n.endsWith(".json")).map(n=>path.join(dir,"snapshots",n));if(!files.length)throw new Error("no valid snapshot available");const entries=files.map(file=>({file,data:readJson(file,"snapshot")}));entries.sort((a,b)=>(b.data.tick||0)-(a.data.tick||0));return entries[0];}
function inspectEventTail(file){if(!fs.existsSync(file))throw new Error("events.jsonl is missing");const data=fs.readFileSync(file);if(data.length&&!([10,13].includes(data[data.length-1])))throw new Error("末尾eventが不完全: events.jsonl does not end with a newline");const lines=data.toString("utf8").split(/\r?\n/).filter(Boolean),events=[];let seq=0;for(let i=0;i<lines.length;i++){let event;try{event=JSON.parse(lines[i]);}catch(e){throw new Error(`末尾eventが不完全: invalid JSON at line ${i+1}`);}if(!Number.isInteger(event.sequence)||event.sequence!==seq+1)throw new Error(`events.jsonl sequence discontinuity at line ${i+1}`);seq=event.sequence;events.push(event);}return{sequence:seq,events};}
function currentSourceCommit(){const {execFileSync}=require("node:child_process"),root=path.resolve(__dirname,"../../../..");try{return execFileSync("git",["-c",`safe.directory=${root}`,"rev-parse","HEAD"],{cwd:root,encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();}catch{return null;}}
function checkResume(dir,snapshot,meta,HKLife,tail){const checks={sourceCommit:[meta.sourceCommit,snapshot.sourceCommit],engineVersion:[HKLife.VERSION_INFO.engineVersion,snapshot.engineVersion],worldSchemaVersion:[HKLife.VERSION_INFO.worldSchemaVersion,snapshot.worldSchemaVersion],characterDataVersion:[HKLife.VERSION_INFO.characterDataVersion,snapshot.characterDataVersion],seed:[meta.seed,snapshot.seed]};for(const [k,[expected,actual]] of Object.entries(checks))if(expected!==actual)throw new Error(`resume ${k} mismatch: run-meta=${expected}, snapshot=${actual}`);const current=currentSourceCommit();if(!current)throw new Error("cannot verify current source commit; refusing resume");if(current!==meta.sourceCommit)throw new Error(`current sourceCommit ${current} does not match run-meta ${meta.sourceCommit}`);if(snapshot.runId!==meta.runId)throw new Error("resume runId mismatch");if(!Number.isInteger(snapshot.tick)||snapshot.world?.ticks!==snapshot.tick)throw new Error("snapshot tick/world state mismatch");if(!Number.isInteger(snapshot.rngState)||!Number.isInteger(snapshot.lastSequence))throw new Error("snapshot is missing rngState or lastSequence");if(tail<snapshot.lastSequence)throw new Error(`events.jsonl sequence ${tail} precedes snapshot lastSequence ${snapshot.lastSequence}`);const segDir=path.join(dir,"segments");if(fs.existsSync(segDir)){const done=fs.readdirSync(segDir).filter(n=>/^segment-\d{4}\.json$/.test(n)).sort();if(done.length){const last=readJson(path.join(segDir,done.at(-1)),"last segment");if(last.status==="completed")throw new Error("completed run cannot be resumed");if(!["interrupted","terminated"].includes(last.status))throw new Error(`run status '${last.status}' is not safely resumable`);}}const resultFile=path.join(dir,"run-result.json");if(fs.existsSync(resultFile)){const result=readJson(resultFile,"run-result.json");if(result.status==="completed")throw new Error("completed run cannot be resumed");if(!["interrupted","terminated"].includes(result.status))throw new Error(`run status '${result.status}' is not safely resumable`);}return snapshot;}
function stableEvent(event){const copy={...event};delete copy.timestamp;delete copy.runId;if(copy.payload){copy.payload={...copy.payload};delete copy.payload.at;}return JSON.stringify(copy);}
async function reconcileUncheckpointedEvents(HKLife,world,meta,rng,snapshot,tailEvents,dir){if(tailEvents.length===snapshot.lastSequence)return{world,rng,sequence:snapshot.lastSequence};if(meta.eventLevel!=="all")throw new Error("snapshot/event mismatch cannot be replayed safely when eventLevel is not all");const expected=tailEvents.slice(snapshot.lastSequence),tmp=fs.mkdtempSync(path.join(os.tmpdir(),"hklife-replay-")),file=path.join(tmp,"events.jsonl"),writer=new EventWriter({file,world,runMeta:meta,eventLevel:meta.eventLevel,startSequence:snapshot.lastSequence});writer.bind(HKLife.Bus);Math.random=rng.next;Date.now=()=>0;let matched=false,replayed=[];try{const max=meta.snapshotEveryTicks||10000;for(let i=0;i<max;i++){await HKLife.Simulation.step(world,{wait:async()=>{},rng:Math.random});if(writer.sequence>tailEvents.at(-1).sequence)break;if(writer.sequence===tailEvents.at(-1).sequence){matched=true;break;}}writer.close();if(matched)replayed=fs.readFileSync(file,"utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);}finally{try{writer.close();}catch{}fs.rmSync(tmp,{recursive:true,force:true});}if(!matched)throw new Error("events beyond the last snapshot do not end at a replayable tick boundary; refusing resume");if(replayed.length!==expected.length||replayed.some((event,i)=>stableEvent(event)!==stableEvent(expected[i])))throw new Error("events beyond the last snapshot do not match deterministic replay; refusing resume");const sequence=tailEvents.at(-1).sequence;saveSnapshot(path.join(dir,"snapshots"),HKLife,world,meta,rng,sequence,"recovered");return{world,rng,sequence};}
function nextSegment(dir){const d=path.join(dir,"segments");fs.mkdirSync(d,{recursive:true});return fs.readdirSync(d).filter(n=>/^segment-\d{4}(\.json|\.running\.json)$/.test(n)).length+1;}

(async()=>{
  const args=parseArgs(process.argv.slice(2));if(args.help){usage();return;}
  const HKLife=loadSimulation(),originalRandom=Math.random,originalDateNow=Date.now;
  let meta,world,runId,runDir,snapshotsDir,rng,sequence=0,resumeSnapshot=null;
  if(args.resumeRun){
    runDir=args.resumeRun;runId=path.basename(runDir);snapshotsDir=path.join(runDir,"snapshots");meta=readJson(path.join(runDir,"run-meta.json"),"run-meta.json");
    const selected=args.resumeFrom?{file:args.resumeFrom,data:readJson(args.resumeFrom,"snapshot")}:latestSnapshot(runDir);const rel=path.relative(runDir,selected.file);if(rel.startsWith("..")||path.isAbsolute(rel))throw new Error("resume snapshot must be inside the run directory");
    const tail=inspectEventTail(path.join(runDir,"events.jsonl"));sequence=tail.sequence;resumeSnapshot=checkResume(runDir,selected.data,meta,HKLife,sequence);world=resumeSnapshot.world;rng=createRng(meta.seed,resumeSnapshot.rngState);const recovered=await reconcileUncheckpointedEvents(HKLife,world,meta,rng,resumeSnapshot,tail.events,runDir);world=recovered.world;rng=recovered.rng;sequence=recovered.sequence;
    const n=nextSegment(runDir);args.segmentNo=n;args.snapshotSource=selected.file;
  }else{
    runId=args.runId||makeRunId(args.seed);runDir=path.join(args.output,runId);snapshotsDir=path.join(runDir,"snapshots");
    if(fs.existsSync(runDir))throw new Error(`Run directory already exists; refusing to overwrite: ${runDir}`);
    fs.mkdirSync(snapshotsDir,{recursive:true});rng=createRng(args.seed);Math.random=rng.next;
    meta={runId,engineVersion:HKLife.VERSION_INFO.engineVersion,worldSchemaVersion:HKLife.VERSION_INFO.worldSchemaVersion,characterDataVersion:HKLife.VERSION_INFO.characterDataVersion,sourceCommit:args.sourceCommit,seed:args.seed,createdAt:new Date().toISOString(),eventLevel:args.eventLevel,snapshotEveryTicks:args.snapshotEvery,runner:"node/runner.cjs"};
    if(meta.sourceCommit){const current=currentSourceCommit();if(current!==meta.sourceCommit)throw new Error(`--source-commit ${meta.sourceCommit} does not match current HEAD ${current}`);}
    Date.now=()=>0;writeJsonExclusive(path.join(runDir,"run-meta.json"),meta);world=HKLife.WorldState.create();saveSnapshot(snapshotsDir,HKLife,world,meta,rng,sequence,"initial");args.segmentNo=nextSegment(runDir);args.snapshotSource=null;
  }
  // Utils.uid() uses Date.now(); pin it so IDs replay across resume and identical seeded runs.
  Math.random=rng.next;Date.now=()=>0;
  const segStem=`segment-${String(args.segmentNo).padStart(4,"0")}`,runningFile=path.join(runDir,"segments",`${segStem}.running.json`),segFile=path.join(runDir,"segments",`${segStem}.json`);if(fs.existsSync(segFile)||fs.existsSync(runningFile))throw new Error(`segment already exists: ${segStem}`);
  const segment={runId,segment:args.segmentNo,resumeSourceSnapshot:args.snapshotSource,startTick:world.ticks,endTick:null,startSequence:sequence,endSequence:null,startedAt:new Date().toISOString(),finishedAt:null,sourceCommit:meta.sourceCommit,engineVersion:meta.engineVersion,worldSchemaVersion:meta.worldSchemaVersion,characterDataVersion:meta.characterDataVersion,seed:meta.seed,status:"running",stopReason:null};writeJsonExclusive(runningFile,segment);
  const eventFile=path.join(runDir,"events.jsonl");const writer=new EventWriter({file:eventFile,world,runMeta:meta,eventLevel:args.resumeRun?meta.eventLevel:args.eventLevel,append:!!args.resumeRun,startSequence:sequence});
  writer.bind(HKLife.Bus);let stopRequested=null;const requestStop=s=>{stopRequested=stopRequested||s;};process.on("SIGINT",()=>requestStop("SIGINT"));process.on("SIGTERM",()=>requestStop("SIGTERM"));
  let status="completed",error=null;const started=originalDateNow();
  try{for(let i=0;i<args.ticks;i++){if(stopRequested){status="interrupted";break;}await HKLife.Simulation.step(world,{wait:async()=>{},rng:Math.random});if(world.ticks%args.snapshotEvery===0)saveSnapshot(snapshotsDir,HKLife,world,meta,rng,writer.sequence);if(args.tickDelayMs>0)await sleep(args.tickDelayMs);}if(args.pauseAfterSegment&&!stopRequested){status="interrupted";stopRequested="segment-limit";}}
  catch(err){status="failed";error=String(err&&err.stack||err);}
  finally{
    try{saveSnapshot(snapshotsDir,HKLife,world,meta,rng,writer.sequence,status==="completed"?"final":"checkpoint");}catch(err){if(!error)error=String(err&&err.stack||err);status="failed";}
    writer.close();Math.random=originalRandom;Date.now=originalDateNow;
  }
  segment.endTick=world.ticks;segment.endSequence=writer.sequence;segment.finishedAt=new Date().toISOString();segment.status=status;segment.stopReason=stopRequested||error||"requested-ticks-complete";writeJsonExclusive(segFile,segment);fs.unlinkSync(runningFile);
  const result={runId,status,error,segment:args.segmentNo,finishedAt:segment.finishedAt,durationMs:originalDateNow()-started,ticksCompleted:world.ticks,worldTime:{minutes:world.clockMinutes,display:HKLife.Utils.formatClock(world.clockMinutes),phase:HKLife.Utils.timePhase(world.clockMinutes)},counts:{actors:world.actors.length,punctuation:world.punctuation.length,observationLogInSnapshot:world.observationLog.length,internalLogInSnapshot:world.internalLog.length,holes:world.area.modifications.filter(x=>x.kind==="hole").length,soilPiles:world.area.modifications.filter(x=>x.kind==="soil-pile").length}};
  const resultFile=path.join(runDir,args.resumeRun?"segments":"");const resultPath=args.resumeRun?path.join(resultFile,`segment-${String(args.segmentNo).padStart(4,"0")}-result.json`):path.join(runDir,"run-result.json");writeJsonExclusive(resultPath,result);console.log(JSON.stringify({runDir,...result},null,2));if(status==="failed")process.exitCode=1;else if(status==="interrupted"&&stopRequested!=="segment-limit")process.exitCode=130;
})().catch(err=>{console.error(err&&err.stack||err);process.exitCode=1;});
