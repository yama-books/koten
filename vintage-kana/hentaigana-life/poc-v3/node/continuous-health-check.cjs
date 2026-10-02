"use strict";
// Continuous observer check. The central property: a continuous run that is stopped, crashed, hard-killed,
// torn mid-tick and restarted by the supervisor produces exactly the events and world of one batch run
// with the same seed and tick count (timestamps excepted).
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawn,spawnSync}=require("node:child_process");
const {createPacer}=require("./pacer.cjs");
const {readValidEvents,readManifest,listChunkFiles,eventsDir}=require("./event-chunks.cjs");
const {stableEvent}=require("./run-store.cjs");

const base=fs.mkdtempSync(path.join(os.tmpdir(),"hklife-continuous-health-"));
const runner=path.join(__dirname,"runner.cjs"),observer=path.join(__dirname,"observer.cjs"),supervisor=path.join(__dirname,"observer-supervisor.cjs");
const seed="20261004",N=1500;
function node(script,args,env={}){return spawnSync(process.execPath,[script,...args],{encoding:"utf8",env:{...process.env,...env}});}
function must(r,label){if(r.status!==0)throw new Error(`${label} failed (${r.status})\n${r.stdout}\n${r.stderr}`);return r;}
function lastJson(stdout){return JSON.parse(stdout.slice(stdout.indexOf("{")));}
function readJsonIfPresent(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(pred,timeoutMs,label){const end=Date.now()+timeoutMs;while(Date.now()<end){if(pred())return;await sleep(25);}throw new Error(`timed out waiting for ${label}`);}
function exitOf(child){return new Promise(r=>child.on("exit",(c,s)=>r(c===null?`signal ${s}`:c)));}
function stripTimes(x){if(Array.isArray(x))return x.map(stripTimes);if(x&&typeof x==="object"){const out={};for(const [k,v]of Object.entries(x))if(k!=="at"&&k!=="timestamp"&&k!=="capturedAt")out[k]=stripTimes(v);return out;}return x;}
function snapshotAt(run,tick,label){const dir=path.join(run,"snapshots"),n=fs.readdirSync(dir).find(x=>x.startsWith(String(tick).padStart(12,"0"))&&x.includes(`-${label}-`));if(!n)throw new Error(`${label} snapshot at ${tick} missing`);return JSON.parse(fs.readFileSync(path.join(dir,n),"utf8"));}
function segments(run){const d=path.join(run,"segments");return fs.readdirSync(d).filter(n=>/^segment-\d{4}\.json$/.test(n)).sort().map(n=>JSON.parse(fs.readFileSync(path.join(d,n),"utf8")));}

(async()=>{try{
  const checks={},details={};
  // 1. Pacer: steady interval; after a long stall it resumes from now without a burst of catch-up ticks.
  {let t=0;const p=createPacer(100,()=>t);const d1=p.delay();t=100;const d2=p.delay();t=10200;const d3=p.delay();const d4=p.delay();
   checks.pacerSteady=d1===100&&d2===100;checks.pacerNoCatchUp=d3===0&&d4===100&&p.stats().resets===1;}

  // 2. Real-time pacing on a real process: 20 ticks at 50 ms take at least ~950 ms.
  {must(node(observer,["--create","--output",base,"--run-id","pace","--seed","1"]),"create pace");const t0=Date.now();
   must(node(observer,["--run",path.join(base,"pace"),"--state-dir",path.join(base,"state-pace"),"--tick-ms","50","--stop-at-tick","20"]),"pace run");
   details.pacedRunMs=Date.now()-t0;checks.realTimePacing=details.pacedRunMs>=950&&segments(path.join(base,"pace"))[0].endTick===20;}

  // 3. Reference batch run.
  must(node(runner,["--ticks",String(N),"--seed",seed,"--snapshot-every","500","--output",base,"--run-id","batch"]),"batch");
  const batchEvents=fs.readFileSync(path.join(base,"batch","events.jsonl"),"utf8").split("\n").filter(Boolean).map(JSON.parse);
  const batchFinal=snapshotAt(path.join(base,"batch"),N,"final");

  // 4. The same seed as a continuous run, through every kind of interruption.
  must(node(observer,["--create","--output",base,"--run-id","cont","--seed",seed]),"create cont");
  const run=path.join(base,"cont"),state=path.join(base,"state");
  const opts=["--tick-ms","0","--checkpoint-every-ticks","100","--rotate-every-ticks","250","--keep-checkpoints","2"],common=["--run",run,"--state-dir",state,...opts];
  must(node(observer,[...common,"--stop-at-tick","400"]),"segment 1 (graceful stop at 400)");
  const crashed=node(observer,[...common,"--stop-at-tick","1000"],{HKLIFE_TEST_CRASH_AT_TICK:"680",HKLIFE_TEST_CRASH_ONCE_FILE:path.join(base,"crash-680")});
  checks.crashHookExited=crashed.status===97;
  // Simulate power loss on top of the crash: drop the last 3 complete lines (partial tick) and leave a torn line.
  {const chunk=path.join(eventsDir(run),listChunkFiles(run).at(-1)),lines=fs.readFileSync(chunk,"utf8").split("\n").filter(Boolean);fs.writeFileSync(chunk,lines.slice(0,-3).join("\n")+"\n{\"torn\":");}
  const seg3=lastJson(must(node(observer,[...common,"--stop-at-tick","1000"]),"segment 3 (recovery)").stdout);
  details.tornRecovery=seg3.recovery;
  checks.tornTailRecovered=seg3.recovery.replayedTicks>0&&seg3.recovery.tornTailBytes>0&&seg3.endTick===1000;
  // Hard kill (no signal handling possible), plus the single-instance check while it runs.
  {const child=spawn(process.execPath,[observer,...common.map(x=>x==="0"?"2":x)],{stdio:"ignore"}),hb=path.join(state,"heartbeat.json");
   await waitFor(()=>{const h=readJsonIfPresent(hb);return h&&h.pid===child.pid&&h.tick>=1050;},60000,"observer to reach tick 1050");
   const second=node(observer,[...common,"--stop-at-tick","2000"]);checks.secondObserverRefusedBusy=second.status===5;
   await waitFor(()=>{const h=readJsonIfPresent(hb);return h&&h.tick>=1100;},60000,"observer to reach tick 1100");
   child.kill("SIGKILL");details.hardKillExit=await exitOf(child);}
  // Supervisor: recovers the killed segment, restarts after an injected crash at 1300, stops at N.
  const sup=node(supervisor,["--run",run,"--state-dir",state,"--backoff-ms","100","--",...opts,"--stop-at-tick",String(N)],{HKLIFE_TEST_CRASH_AT_TICK:"1300",HKLIFE_TEST_CRASH_ONCE_FILE:path.join(base,"crash-1300")});
  const supLog=fs.readFileSync(path.join(state,"supervisor.log"),"utf8");
  checks.supervisorRestartedAfterCrash=sup.status===0&&/observer exited with 97/.test(supLog)&&/crash; restarting/.test(supLog)&&/observer exited with 0/.test(supLog);
  checks.supervisorLockReleased=!fs.existsSync(path.join(state,"supervisor.lock"));

  const contEvents=readValidEvents(run),contFinal=snapshotAt(run,N,"stop");
  checks.eventsEqualBatch=contEvents.length===batchEvents.length&&contEvents.every((e,i)=>stableEvent(e)===stableEvent(batchEvents[i]));
  checks.sequenceContinuous=contEvents.every((e,i)=>e.sequence===i+1);
  checks.worldEqualBatch=JSON.stringify(stripTimes(contFinal.world))===JSON.stringify(stripTimes(batchFinal.world))&&contFinal.rngState===batchFinal.rngState;
  const segs=segments(run),manifest=readManifest(run);
  details.segmentStatuses=segs.map(s=>`${s.segment}:${s.status}:${s.startTick}-${s.endTick}`);
  details.chunkCloseReasons=manifest.map(m=>m.closeReason);
  checks.crashedSegmentsRecorded=segs.filter(s=>s.status==="crashed").length>=3&&segs.at(-1).status==="stopped"&&!fs.readdirSync(path.join(run,"segments")).some(n=>n.endsWith(".running.json"));
  checks.chunksSealedAndRotated=manifest.length===listChunkFiles(run).length&&manifest.some(m=>m.closeReason==="rotate")&&manifest.filter(m=>m.closeReason==="sealed-after-crash").length>=3;
  checks.checkpointRetention=fs.readdirSync(path.join(run,"checkpoints")).filter(n=>n.endsWith(".json")).length<=2;

  // 5. STOP file: graceful stop of a real-time observer; afterwards the supervisor refuses to start.
  {must(node(observer,["--create","--output",base,"--run-id","stop","--seed","2"]),"create stop");const r2=path.join(base,"stop"),s2=path.join(base,"state-stop"),hb=path.join(s2,"heartbeat.json");
   const child=spawn(process.execPath,[observer,"--run",r2,"--state-dir",s2,"--tick-ms","20"],{stdio:"ignore"});
   await waitFor(()=>{const h=readJsonIfPresent(hb);return h&&h.pid===child.pid&&h.tick>=5;},60000,"stop observer to tick");
   const t0=Date.now();fs.writeFileSync(path.join(s2,"STOP"),"");const code=await exitOf(child);details.stopLatencyMs=Date.now()-t0;
   const seg=segments(r2).at(-1);checks.stopFileGraceful=code===0&&seg.status==="stopped"&&seg.stopReason==="stop-file"&&details.stopLatencyMs<5000;
   const s=node(supervisor,["--run",r2,"--state-dir",s2]);checks.supervisorHonorsStop=s.status===0&&/STOP present/.test(s.stdout)&&segments(r2).length===1;}

  // 6. Refusal is final: a fingerprint mismatch exits 3 and the supervisor raises ALERT.json instead of retrying.
  {const r3=path.join(base,"refuse"),s3=path.join(base,"state-refuse");fs.cpSync(path.join(base,"stop"),r3,{recursive:true});
   const metaFile=path.join(r3,"run-meta.json"),m=JSON.parse(fs.readFileSync(metaFile,"utf8"));m.runId="refuse";m.compatibility.fingerprint="0".repeat(64);fs.writeFileSync(metaFile,JSON.stringify(m));
   const o=node(observer,["--run",r3,"--state-dir",s3]);const s=node(supervisor,["--run",r3,"--state-dir",s3]);
   checks.incompatibleRefused=o.status===3&&s.status===3&&fs.existsSync(path.join(s3,"ALERT.json"));}

  // 7. Analyzer reads chunked runs and honors superseded events.
  {const out=path.join(base,"analysis"),a=node(path.join(__dirname,"analyze-run.cjs"),["--run",run,"--out",out]);const sum=a.status===0?JSON.parse(fs.readFileSync(path.join(out,"analysis-summary.json"),"utf8")):{};
   checks.analyzerReadsChunks=sum.totalEvents===batchEvents.length&&sum.totalTicks===N&&sum.integrity?.invalidOrMissingEvents===0;}

  const ok=Object.values(checks).every(Boolean);
  console.log(JSON.stringify({ok,seed:Number(seed),ticks:N,events:contEvents.length,checks,details},null,2));if(!ok)process.exitCode=1;
}finally{fs.rmSync(base,{recursive:true,force:true});}})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
