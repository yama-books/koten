"use strict";
// Continuous observer: runs the shared simulation step at real-time pace until asked to stop.
// node node/observer.cjs --create --output DIR --run-id ID --seed N [--tick-ms 1300]
// node node/observer.cjs --run DIR --state-dir DIR [options]   (always resumes from the latest snapshot)
// Wall-clock waiting stays outside the simulation, so N ticks here equal N ticks of a batch run with the same seed.
const fs=require("node:fs");
const path=require("node:path");
const {performance}=require("node:perf_hooks");
const {loadSimulation}=require("./load-simulation.cjs");
const {EventWriter}=require("./event-writer.cjs");
const {createRng,pinDeterminism,stepWorld}=require("./sim-core.cjs");
const {computeCompatibility}=require("./compat.cjs");
const {createPacer}=require("./pacer.cjs");
const store=require("./run-store.cjs");
const chunks=require("./event-chunks.cjs");
const {RefusalError,readJson,writeJsonExclusive,writeJsonAtomic,saveSnapshot,stableEvent}=store;

// Exit codes read by observer-supervisor.cjs.
const EXIT={ok:0,failed:1,refused:3,busy:5};
const RESUMABLE=["stopped","crashed"];
const DEFAULTS={checkpointEveryTicks:230,checkpointEveryMs:300000,keepCheckpoints:10,rotateEveryTicks:66000,rotateMaxBytes:256*1024*1024,heartbeatEveryMs:1000,staleHeartbeatMs:120000};

class BusyError extends Error{}
function usage(){console.log(`Hentaigana Life continuous observer

Create a run (no ticks are run):
  node node/observer.cjs --create --output DIR --run-id ID --seed N [--tick-ms MS]
Run or resume it (normally started by observer-supervisor.cjs):
  node node/observer.cjs --run DIR --state-dir DIR [options]

Options:
  --tick-ms MS                 real-time interval per tick (default: run-meta.tickMs, 1300 at creation)
  --checkpoint-every-ticks N   rolling checkpoint interval in ticks (default ${DEFAULTS.checkpointEveryTicks})
  --checkpoint-every-ms MS     rolling checkpoint interval in wall time (default ${DEFAULTS.checkpointEveryMs})
  --keep-checkpoints N         rolling checkpoints to keep (default ${DEFAULTS.keepCheckpoints})
  --rotate-every-ticks N       start a new event chunk after N ticks (default ${DEFAULTS.rotateEveryTicks})
  --rotate-max-bytes N         or after N bytes (default ${DEFAULTS.rotateMaxBytes})
  --stop-at-tick N             stop gracefully when the world reaches tick N
  --heartbeat-every-ms MS      heartbeat interval (default ${DEFAULTS.heartbeatEveryMs})
Stop: create <state-dir>/STOP, send SIGINT/SIGTERM, or an IPC {type:"stop"} message.
Exit codes: 0 stopped, 1 failed, 3 refused (incompatible or unsafe), 5 another observer is running.`);}
function parseArgs(argv){
  const out={...DEFAULTS,create:false,output:null,runId:null,seed:null,run:null,stateDir:null,tickMs:null,stopAtTick:null};
  const num={"--tick-ms":"tickMs","--checkpoint-every-ticks":"checkpointEveryTicks","--checkpoint-every-ms":"checkpointEveryMs","--keep-checkpoints":"keepCheckpoints","--rotate-every-ticks":"rotateEveryTicks","--rotate-max-bytes":"rotateMaxBytes","--stop-at-tick":"stopAtTick","--heartbeat-every-ms":"heartbeatEveryMs","--seed":"seed"};
  for(let i=0;i<argv.length;i++){
    const a=argv[i],v=argv[i+1];
    if(a==="--help"||a==="-h")out.help=true; else if(a==="--create")out.create=true;
    else if(num[a]){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error(`${a} must be a number >= 0`);out[num[a]]=n;i++;}
    else if(a==="--output"){out.output=path.resolve(v);i++;} else if(a==="--run-id"){out.runId=v;i++;}
    else if(a==="--run"){out.run=path.resolve(v);i++;} else if(a==="--state-dir"){out.stateDir=path.resolve(v);i++;}
    else throw new Error(`Unknown argument: ${a}`);
  }
  if(out.help)return out;
  if(out.create){
    if(!out.output||!out.runId||out.seed===null)throw new Error("--create requires --output, --run-id and --seed");
    if(!/^[A-Za-z0-9._-]+$/.test(out.runId))throw new Error("--run-id may contain only A-Z a-z 0-9 . _ -");
    out.seed=out.seed>>>0;
  }else if(!out.run||!out.stateDir)throw new Error("--run and --state-dir are required (or use --create)");
  for(const k of ["checkpointEveryTicks","keepCheckpoints","rotateEveryTicks"])if(!Number.isInteger(out[k])||out[k]<1)throw new Error(`${k} must be an integer >= 1`);
  return out;
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function yieldToEventLoop(){return new Promise(r=>setImmediate(r));}
function readJsonIfPresent(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}

function createRun(args,HKLife,wall){
  const runDir=path.join(args.output,args.runId);
  if(fs.existsSync(runDir))throw new Error(`Run directory already exists; refusing to overwrite: ${runDir}`);
  const audit=store.sourceAudit();
  for(const d of ["snapshots","checkpoints","events","segments"])fs.mkdirSync(path.join(runDir,d),{recursive:true});
  const rng=createRng(args.seed);
  const meta={runId:args.runId,mode:"continuous",engineVersion:HKLife.VERSION_INFO.engineVersion,worldSchemaVersion:HKLife.VERSION_INFO.worldSchemaVersion,characterDataVersion:HKLife.VERSION_INFO.characterDataVersion,sourceCommit:audit.sourceCommit,sourceDirty:audit.sourceDirty,compatibility:computeCompatibility(),seed:args.seed,createdAt:new Date(wall()).toISOString(),eventLevel:"all",eventLayout:chunks.LAYOUT,tickMs:args.tickMs??HKLife.WORLD_CONFIG.engine.tickMs,runner:"node/observer.cjs"};
  pinDeterminism(rng);writeJsonExclusive(path.join(runDir,"run-meta.json"),meta);
  const world=HKLife.WorldState.create(),snapshot=saveSnapshot(path.join(runDir,"snapshots"),world,meta,rng,0,"initial",audit.sourceCommit);
  return{ok:true,runDir,runId:meta.runId,seed:meta.seed,tickMs:meta.tickMs,compatibilityFingerprint:meta.compatibility.fingerprint,sourceCommit:meta.sourceCommit,initialSnapshot:snapshot};
}

// Latest resume point across permanent snapshots and rolling checkpoints (file names start with the tick).
function latestResumeSnapshot(runDir){
  const candidates=[];
  for(const d of ["snapshots","checkpoints"]){const dir=path.join(runDir,d);if(!fs.existsSync(dir))continue;for(const n of fs.readdirSync(dir))if(/^\d{12}-.*\.json$/.test(n))candidates.push({tick:Number(n.slice(0,12)),file:path.join(dir,n)});}
  if(!candidates.length)throw new RefusalError("no snapshot available");
  const maxTick=Math.max(...candidates.map(c=>c.tick));
  const best=candidates.filter(c=>c.tick===maxTick).map(c=>({file:c.file,data:readJson(c.file,"snapshot")})).sort((a,b)=>b.data.lastSequence-a.data.lastSequence)[0];
  return best;
}

// Replays from a snapshot on a private copy of the world. onTick receives each tick's records; return false to stop.
async function replayFrom(HKLife,meta,snap,maxTicks,onTick){
  const world=JSON.parse(JSON.stringify(snap.world)),rng=createRng(meta.seed,snap.rngState);pinDeterminism(rng);
  let tickRecords=[];const writer=new EventWriter({sink:r=>tickRecords.push(r),world,runMeta:meta,eventLevel:meta.eventLevel,startSequence:snap.lastSequence});writer.bind(HKLife.Bus);
  try{for(let i=0;i<maxTicks;i++){tickRecords=[];await stepWorld(HKLife,world);if(onTick(tickRecords)===false)break;}}finally{writer.close();}
  return{world,rng,sequence:writer.sequence};
}

// Brings the event chunks in line with the latest snapshot after a stop or crash.
// Events written after the snapshot are kept up to the last tick that deterministic replay reproduces exactly;
// a partial last tick and a torn final line are left in the sealed chunk and marked superseded via validThroughSequence.
async function recoverEvents(HKLife,runDir,meta,snapFile,snap){
  const files=chunks.listChunkFiles(runDir),manifest=new Map(chunks.readManifest(runDir).map(e=>[e.file,e]));
  const unsealed=files.filter(f=>!manifest.has(f));
  if(unsealed.length>1||(unsealed.length===1&&unsealed[0]!==files.at(-1)))throw new RefusalError(`more than one unsealed event chunk or an unsealed chunk before a sealed one: ${unsealed.join(", ")}`);
  let prevValid=0;
  for(const f of files){const e=manifest.get(f);if(!e)continue;if(e.firstSequence!==prevValid+1)throw new RefusalError(`event chunk ${f} starts at ${e.firstSequence}, expected ${prevValid+1}`);prevValid=e.validThroughSequence;}
  let open=null;
  if(unsealed.length){
    const parsed=chunks.parseChunk(path.join(chunks.eventsDir(runDir),unsealed[0]));let expected=prevValid+1;
    for(const e of parsed.events){if(e.sequence!==expected)throw new RefusalError(`event sequence discontinuity in ${unsealed[0]}: expected ${expected}, found ${e.sequence}`);expected++;}
    open={file:unsealed[0],firstSequence:prevValid+1,events:parsed.events,tornTailBytes:parsed.tornTailBytes,lastCompleteSequence:expected-1};
  }
  const lastValid=open?open.lastCompleteSequence:prevValid;
  if(snap.lastSequence>lastValid)throw new RefusalError(`snapshot lastSequence ${snap.lastSequence} is ahead of the event log (${lastValid})`);
  if(open&&snap.lastSequence<open.firstSequence-1)throw new RefusalError("events after the latest snapshot extend into a sealed chunk; refusing resume");
  const expectedEvents=open?open.events.filter(e=>e.sequence>snap.lastSequence):[];
  let matched=0,boundaryTicks=0,boundaryMatched=0;
  if(expectedEvents.length){
    await replayFrom(HKLife,meta,snap,expectedEvents.length+1,records=>{
      for(const r of records){if(matched>=expectedEvents.length)return false;if(stableEvent(r)!==stableEvent(expectedEvents[matched]))throw new RefusalError(`deterministic replay does not match event ${expectedEvents[matched].sequence}; refusing resume`);matched++;}
      boundaryTicks++;boundaryMatched=matched;return matched<expectedEvents.length;
    });
  }
  // Events matched by complete ticks only; the rest belongs to a partial tick and is superseded.
  let world,rng,sequence;
  if(boundaryTicks>0){
    let counted=0;
    ({world,rng,sequence}=await replayFrom(HKLife,meta,snap,boundaryTicks,records=>{counted+=records.length;return true;}));
    if(counted!==boundaryMatched||sequence!==snap.lastSequence+boundaryMatched)throw new Error("replay sequence check failed");
  }else{world=JSON.parse(JSON.stringify(snap.world));rng=createRng(meta.seed,snap.rngState);sequence=snap.lastSequence;}
  const recovery={resumeSnapshot:path.relative(runDir,snapFile),snapshotTick:snap.tick,replayedTicks:boundaryTicks,validThroughSequence:sequence,supersededEvents:open?open.lastCompleteSequence-sequence:0,tornTailBytes:open?open.tornTailBytes:0,sealedChunk:open?open.file:null,recoveredSnapshot:null};
  if(open){
    const full=path.join(chunks.eventsDir(runDir),open.file),m=/^seg(\d{4})-c(\d{6})/.exec(open.file);
    chunks.appendManifest(runDir,{file:open.file,segment:Number(m[1]),chunk:Number(m[2]),firstSequence:open.firstSequence,lastCompleteSequence:open.lastCompleteSequence,validThroughSequence:sequence,supersededEvents:recovery.supersededEvents,tornTailBytes:open.tornTailBytes,bytes:fs.statSync(full).size,sha256:chunks.fileSha256(full),closeReason:"sealed-after-crash",sealedAt:new Date().toISOString()});
  }
  if(boundaryTicks>0)recovery.recoveredSnapshot=path.relative(runDir,saveSnapshot(path.join(runDir,"snapshots"),world,meta,rng,sequence,"recovered",store.currentSourceCommit()));
  return{world,rng,sequence,recovery};
}

async function runObserver(args,HKLife,wall){
  const runDir=args.run,stateDir=args.stateDir;fs.mkdirSync(stateDir,{recursive:true});
  const meta=readJson(path.join(runDir,"run-meta.json"),"run-meta.json");
  if(meta.mode!=="continuous"||meta.eventLayout!==chunks.LAYOUT)throw new RefusalError("observer.cjs only runs continuous runs created with --create");
  const tickMs=args.tickMs??meta.tickMs,stopFile=path.join(stateDir,"STOP"),heartbeatFile=path.join(stateDir,"heartbeat.json"),segDir=path.join(runDir,"segments");
  // Another live observer on this run? A running-segment file with a live pid and a fresh heartbeat means yes.
  const stale=[];
  for(const n of fs.readdirSync(segDir).filter(n=>/^segment-\d{4}\.running\.json$/.test(n)).sort()){
    const data=readJson(path.join(segDir,n),n),hb=readJsonIfPresent(data.heartbeatFile||heartbeatFile);
    if(store.pidAlive(data.pid)&&hb&&hb.pid===data.pid&&hb.runId===meta.runId&&wall()-hb.wallTimeMs<args.staleHeartbeatMs)throw new BusyError(`observer pid ${data.pid} is already running this run`);
    stale.push({name:n,data});
  }
  if(!stale.length)store.checkLastStatus(runDir,RESUMABLE);
  const audit=store.sourceAudit();
  const writeHeartbeat=(status,extra={})=>{try{writeJsonAtomic(heartbeatFile,{runId:meta.runId,pid:process.pid,status,tickMs,wallTime:new Date(wall()).toISOString(),wallTimeMs:wall(),...extra});}catch{}};
  writeHeartbeat("recovering");
  const selected=latestResumeSnapshot(runDir);
  store.checkCompatibility(meta,selected.data,HKLife);store.checkSnapshotShape(selected.data,meta);
  let {world,rng,sequence,recovery}=await recoverEvents(HKLife,runDir,meta,selected.file,selected.data);
  for(const s of stale){
    const final={...s.data,status:"crashed",endTick:world.ticks,endSequence:sequence,finishedAt:null,recoveredAt:new Date(wall()).toISOString(),stopReason:"process ended without finalizing (crash or forced termination)",recovery};
    writeJsonExclusive(path.join(segDir,s.name.replace(".running","")),final);fs.unlinkSync(path.join(segDir,s.name));
  }
  const n=store.nextSegment(runDir),stem=store.segmentStem(n),runningFile=path.join(segDir,`${stem}.running.json`),segFile=path.join(segDir,`${stem}.json`);
  const segment={runId:meta.runId,segment:n,mode:"continuous",pid:process.pid,heartbeatFile,resumeSourceSnapshot:recovery.recoveredSnapshot||recovery.resumeSnapshot,recovery,startTick:world.ticks,endTick:null,startSequence:sequence,endSequence:null,startedAt:new Date(wall()).toISOString(),finishedAt:null,sourceCommit:audit.sourceCommit,sourceDirty:audit.sourceDirty,compatibilityFingerprint:meta.compatibility.fingerprint,engineVersion:meta.engineVersion,worldSchemaVersion:meta.worldSchemaVersion,characterDataVersion:meta.characterDataVersion,seed:meta.seed,tickMs,status:"running",stopReason:null};
  writeJsonExclusive(runningFile,segment);

  const snapshotsDir=path.join(runDir,"snapshots"),checkpointsDir=path.join(runDir,"checkpoints");
  let chunkNo=0,writer=null,chunkFirst=0,chunkStartTick=0,chunksSealed=0;
  const openChunk=()=>{chunkNo++;writer=new EventWriter({file:path.join(chunks.eventsDir(runDir),chunks.chunkName(n,chunkNo)),world,runMeta:meta,eventLevel:meta.eventLevel,startSequence:sequence});writer.bind(HKLife.Bus);chunkFirst=sequence+1;chunkStartTick=world.ticks;};
  const sealChunk=reason=>{const file=chunks.chunkName(n,chunkNo),full=path.join(chunks.eventsDir(runDir),file);writer.close();chunks.appendManifest(runDir,{file,segment:n,chunk:chunkNo,firstSequence:chunkFirst,lastCompleteSequence:writer.sequence,validThroughSequence:writer.sequence,supersededEvents:0,tornTailBytes:0,bytes:fs.statSync(full).size,sha256:chunks.fileSha256(full),closeReason:reason,sealedAt:new Date(wall()).toISOString()});chunksSealed++;};
  const pruneCheckpoints=()=>{const names=fs.readdirSync(checkpointsDir).filter(x=>/^\d{12}-checkpoint-.*\.json$/.test(x)).sort();for(const x of names.slice(0,Math.max(0,names.length-args.keepCheckpoints)))fs.unlinkSync(path.join(checkpointsDir,x));};
  openChunk();pinDeterminism(rng);

  let stopRequested=null;const requestStop=s=>{stopRequested=stopRequested||s;};
  for(const sig of ["SIGINT","SIGTERM","SIGBREAK","SIGHUP"])process.on(sig,()=>requestStop(sig));
  if(process.send){process.on("message",m=>{if(m&&m.type==="stop")requestStop("supervisor-stop");});process.on("disconnect",()=>requestStop("supervisor-gone"));}
  const crashAtTick=Number(process.env.HKLIFE_TEST_CRASH_AT_TICK||0),crashOnceFile=process.env.HKLIFE_TEST_CRASH_ONCE_FILE||null;
  const pacer=createPacer(tickMs,()=>performance.now());
  let lastCheckpointTick=world.ticks,lastCheckpointWall=wall(),lastHeartbeat=0,checkpoints=0,status="stopped",stopReason=null,error=null;
  const beat=force=>{if(force||wall()-lastHeartbeat>=args.heartbeatEveryMs){lastHeartbeat=wall();writeHeartbeat("running",{segment:n,tick:world.ticks,sequence:writer.sequence,lastCheckpointTick});}};
  beat(true);
  try{
    for(;;){
      stopReason=stopRequested||(args.stopAtTick!==null&&world.ticks>=args.stopAtTick?"tick-limit":null)||(fs.existsSync(stopFile)?"stop-file":null);
      if(stopReason)break;
      await stepWorld(HKLife,world);
      if(crashAtTick&&world.ticks===crashAtTick&&crashOnceFile&&!fs.existsSync(crashOnceFile)){fs.writeFileSync(crashOnceFile,"crashed\n");process.exit(97);}
      if(world.ticks-chunkStartTick>=args.rotateEveryTicks||writer.bytes>=args.rotateMaxBytes){
        writer.sync();saveSnapshot(snapshotsDir,world,meta,rng,writer.sequence,"rotate",audit.sourceCommit);sealChunk("rotate");sequence=writer.sequence;openChunk();
        lastCheckpointTick=world.ticks;lastCheckpointWall=wall();
      }else if(world.ticks-lastCheckpointTick>=args.checkpointEveryTicks||wall()-lastCheckpointWall>=args.checkpointEveryMs){
        writer.sync();saveSnapshot(checkpointsDir,world,meta,rng,writer.sequence,"checkpoint",audit.sourceCommit);pruneCheckpoints();checkpoints++;
        lastCheckpointTick=world.ticks;lastCheckpointWall=wall();beat(true);
      }
      beat(false);
      const d=pacer.delay();if(d>0)await sleep(d);else await yieldToEventLoop();
    }
    writer.sync();saveSnapshot(snapshotsDir,world,meta,rng,writer.sequence,"stop",audit.sourceCommit);sealChunk("segment-end");
  }catch(err){
    // World state may be mid-tick: no snapshot. The chunk stays unsealed and resume is refused for a failed segment.
    status="failed";error=String(err&&err.stack||err);stopReason="error";try{writer.close();}catch{}
  }
  const final={...segment,endTick:world.ticks,endSequence:writer.sequence,finishedAt:new Date(wall()).toISOString(),status,stopReason,error,checkpointsWritten:checkpoints,chunksSealed,pacing:pacer.stats()};
  writeJsonExclusive(segFile,final);fs.unlinkSync(runningFile);
  writeHeartbeat(status,{segment:n,tick:world.ticks,sequence:writer.sequence,stopReason});
  return{ok:status==="stopped",runDir,runId:meta.runId,segment:n,status,stopReason,error,startTick:segment.startTick,endTick:world.ticks,endSequence:writer.sequence,recovery,pacing:pacer.stats()};
}

(async()=>{
  const args=parseArgs(process.argv.slice(2));if(args.help){usage();return;}
  const HKLife=loadSimulation(),originalRandom=Math.random,originalDateNow=Date.now,wall=()=>originalDateNow.call(Date);
  try{
    const result=args.create?createRun(args,HKLife,wall):await runObserver(args,HKLife,wall);
    console.log(JSON.stringify(result,null,2));process.exitCode=result.ok?EXIT.ok:EXIT.failed;
  }finally{Math.random=originalRandom;Date.now=originalDateNow;}
})().catch(err=>{console.error(err&&err.stack||err);process.exitCode=err instanceof BusyError?EXIT.busy:err instanceof RefusalError?EXIT.refused:EXIT.failed;})
  // An open IPC channel to the supervisor would keep this process alive after the run is finished.
  .finally(()=>{if(process.connected)process.disconnect();});
