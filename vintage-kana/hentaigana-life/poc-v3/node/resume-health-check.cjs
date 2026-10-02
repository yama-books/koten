"use strict";
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync,execFileSync}=require("node:child_process");
const base=fs.mkdtempSync(path.join(os.tmpdir(),"hklife-resume-health-"));
const runner=path.join(__dirname,"runner.cjs");
const sourceRoot=path.resolve(__dirname,"../../../..");
const commit=execFileSync("git",["rev-parse","HEAD"],{cwd:sourceRoot,encoding:"utf8"}).trim();
const seed="20261002";
function run(args){const r=spawnSync(process.execPath,[runner,...args],{encoding:"utf8"});if(r.status!==0)throw new Error(`runner failed (${r.status})\n${r.stdout}\n${r.stderr}`);return JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));}
function invoke(args){return spawnSync(process.execPath,[runner,...args],{encoding:"utf8"});}
function latestAtTick(dir,tick){const files=fs.readdirSync(path.join(dir,"snapshots")).filter(n=>n.endsWith(".json")).map(n=>path.join(dir,"snapshots",n));for(const file of files){const x=JSON.parse(fs.readFileSync(file,"utf8"));if(x.tick===tick)return file;}throw new Error(`snapshot at tick ${tick} missing`);}
function stripTimes(x){if(Array.isArray(x))return x.map(stripTimes);if(x&&typeof x==="object"){const out={};for(const [k,v]of Object.entries(x))if(k!=="at"&&k!=="timestamp"&&k!=="capturedAt")out[k]=stripTimes(v);return out;}return x;}
function events(dir){return fs.readFileSync(path.join(dir,"events.jsonl"),"utf8").trim().split(/\r?\n/).filter(Boolean).map(x=>{const e=JSON.parse(x);delete e.timestamp;delete e.runId;if(e.payload)delete e.payload.at;return e;});}
(async()=>{try{
  const a=path.join(base,"continuous"),b=path.join(base,"resumed");
  const continuous=run(["--ticks","2000","--seed",seed,"--snapshot-every","1000","--output",base,"--run-id","continuous","--source-commit",commit]);
  run(["--ticks","1000","--seed",seed,"--snapshot-every","1000","--output",base,"--run-id","resumed","--source-commit",commit,"--pause-after-segment"]);
  const resumeFrom=latestAtTick(b,1000);
  const prefix=fs.readFileSync(path.join(b,"events.jsonl"),"utf8"),snapshotsBefore=fs.readdirSync(path.join(b,"snapshots"));
  const resumed=run(["--ticks","1000","--snapshot-every","1000","--resume-run",b,"--resume-from",resumeFrom]);
  const appendOnly=fs.readFileSync(path.join(b,"events.jsonl"),"utf8").startsWith(prefix);
  const snapshotsPreserved=snapshotsBefore.every(n=>fs.existsSync(path.join(b,"snapshots",n)))&&fs.readdirSync(path.join(b,"snapshots")).length>snapshotsBefore.length;
  const snapA=JSON.parse(fs.readFileSync(latestAtTick(a,2000),"utf8"));
  const snapB=JSON.parse(fs.readFileSync(latestAtTick(b,2000),"utf8"));
  const worldEquivalent=JSON.stringify(stripTimes(snapA.world))===JSON.stringify(stripTimes(snapB.world));
  const eventEquivalent=JSON.stringify(events(a))===JSON.stringify(events(b));
  const completedReject=invoke(["--ticks","1","--resume-run",b]);
  const tampered=path.join(base,"tampered");fs.cpSync(b,tampered,{recursive:true});const badSnap=latestAtTick(tampered,2000),badData=JSON.parse(fs.readFileSync(badSnap,"utf8"));badData.seed++;fs.writeFileSync(badSnap,JSON.stringify(badData));
  const versionReject=invoke(["--ticks","1","--resume-run",tampered,"--resume-from",badSnap]);
  const corrupt=path.join(base,"corrupt");run(["--ticks","10","--seed",seed,"--snapshot-every","10","--output",base,"--run-id","corrupt-source","--source-commit",commit,"--pause-after-segment"]);fs.cpSync(path.join(base,"corrupt-source"),corrupt,{recursive:true});fs.appendFileSync(path.join(corrupt,"events.jsonl"),"{truncated");
  const corruptReject=invoke(["--ticks","1","--resume-run",corrupt]);
  const analyzer=spawnSync(process.execPath,[path.join(__dirname,"analyze-run.cjs"),"--run",a],{encoding:"utf8"});if(analyzer.status!==0)throw new Error(`analyzer failed\n${analyzer.stdout}\n${analyzer.stderr}`);const analysis=JSON.parse(fs.readFileSync(path.join(a,"analysis-summary.json"),"utf8"));
  const analyzerOk=analysis.totalTicks===2000&&analysis.totalEvents===events(a).length&&analysis.integrity.invalidOrMissingEvents===0&&fs.existsSync(path.join(a,"analysis-summary.md"));
  const summary={ok:worldEquivalent&&eventEquivalent&&appendOnly&&snapshotsPreserved&&completedReject.status!==0&&completedReject.stderr.includes("completed run cannot be resumed")&&versionReject.status!==0&&versionReject.stderr.includes("seed mismatch")&&corruptReject.status!==0&&corruptReject.stderr.includes("末尾eventが不完全")&&analyzerOk&&continuous.ticksCompleted===2000&&resumed.ticksCompleted===2000,continuousTicks:continuous.ticksCompleted,resumedTicks:resumed.ticksCompleted,worldEquivalent,eventEquivalent,appendOnly,snapshotsPreserved,completedRunRejected:completedReject.status!==0,versionMismatchRejected:versionReject.status!==0,incompleteTailRejected:corruptReject.status!==0,analyzerOk,continuousEvents:events(a).length,resumedEvents:events(b).length};
  console.log(JSON.stringify(summary,null,2));if(!summary.ok)process.exitCode=1;
}finally{fs.rmSync(base,{recursive:true,force:true});}})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
