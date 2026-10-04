"use strict";
// Run directory I/O and resume checks shared by runner.cjs (batch) and observer.cjs (continuous).
// Not part of the compatibility fingerprint: nothing here changes simulation results.
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {execFileSync}=require("node:child_process");
const {snapshotEnvelope}=require("./sim-core.cjs");
const {computeCompatibility,diffCompatibility}=require("./compat.cjs");

// Raised when resuming would be unsafe; observer exits with code 3 so the supervisor does not retry.
class RefusalError extends Error{constructor(message){super(message);this.name="RefusalError";}}
const sourceRoot=path.resolve(__dirname,"../../../..");
const pocRoot=path.resolve(__dirname,"..");

function safeStamp(){return new Date().toISOString().replace(/[:.]/g,"-");}
function writeJsonExclusive(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n",{encoding:"utf8",flag:"wx"});}
function writeJsonAtomic(file,value){const tmp=`${file}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`;const fd=fs.openSync(tmp,"wx");try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+"\n");fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,file);}
function readJson(file,label){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch(e){throw new Error(`${label} is invalid JSON: ${e.message}`);}}
function snapshotPath(dir,tick,label="tick"){return path.join(dir,`${String(tick).padStart(12,"0")}-${label}-${safeStamp()}-${crypto.randomBytes(3).toString("hex")}.json`);}
function saveSnapshot(dir,world,meta,rng,sequence,label,sourceCommit){const file=snapshotPath(dir,world.ticks,label);writeJsonAtomic(file,snapshotEnvelope(world,meta,rng,sequence,sourceCommit));return file;}
function git(args){try{return execFileSync("git",["-c",`safe.directory=${sourceRoot}`,...args],{cwd:pocRoot,encoding:"utf8",stdio:["ignore","pipe","ignore"]});}catch{return null;}}
function currentSourceCommit(){return git(["rev-parse","HEAD"])?.trim()||null;}
function currentSourceDirty(){const out=git(["status","--porcelain","--","."]);return out===null?null:out.trim().length>0;}
function sourceAudit(){return{sourceCommit:currentSourceCommit(),sourceDirty:currentSourceDirty()};}
function stableEvent(event){const copy={...event};delete copy.timestamp;delete copy.runId;if(copy.payload){copy.payload={...copy.payload};delete copy.payload.at;}return JSON.stringify(copy);}
function pidAlive(pid){if(!Number.isInteger(pid)||pid<=0)return false;try{process.kill(pid,0);return true;}catch(e){return e.code==="EPERM";}}

// Version/seed checks plus the compatibility rule:
// runs with run-meta.compatibility resume when the current fingerprint matches (git SHA is audit only);
// legacy runs without it keep the original rule (current HEAD must equal run-meta.sourceCommit).
function checkCompatibility(meta,snapshot,HKLife,root){
  const v=HKLife.VERSION_INFO;
  const checks={};
  if(!meta.compatibility)checks.sourceCommit=[meta.sourceCommit,snapshot.sourceCommit];
  Object.assign(checks,{engineVersion:[v.engineVersion,snapshot.engineVersion],worldSchemaVersion:[v.worldSchemaVersion,snapshot.worldSchemaVersion],characterDataVersion:[v.characterDataVersion,snapshot.characterDataVersion],seed:[meta.seed,snapshot.seed]});
  for(const [k,[expected,actual]] of Object.entries(checks))if(expected!==actual)throw new RefusalError(`resume ${k} mismatch: run-meta=${expected}, snapshot=${actual}`);
  for(const k of ["engineVersion","worldSchemaVersion","characterDataVersion"])if(meta[k]!==v[k])throw new RefusalError(`resume ${k} mismatch: run-meta=${meta[k]}, current=${v[k]}`);
  if(meta.compatibility){
    if(snapshot.compatibilityFingerprint!==meta.compatibility.fingerprint)throw new RefusalError(`snapshot compatibilityFingerprint ${snapshot.compatibilityFingerprint} does not match run-meta ${meta.compatibility.fingerprint}`);
    const current=computeCompatibility(root);
    if(current.fingerprint!==meta.compatibility.fingerprint)throw new RefusalError(`simulation compatibility fingerprint mismatch (${diffCompatibility(meta.compatibility,current).join("; ")}); refusing resume`);
    return current;
  }
  const current=currentSourceCommit();
  if(!current)throw new RefusalError("cannot verify current source commit; refusing resume");
  if(current!==meta.sourceCommit)throw new RefusalError(`current sourceCommit ${current} does not match run-meta ${meta.sourceCommit}`);
  return null;
}
function checkSnapshotShape(snapshot,meta){
  if(snapshot.runId!==meta.runId)throw new RefusalError("resume runId mismatch");
  if(!Number.isInteger(snapshot.tick)||snapshot.world?.ticks!==snapshot.tick)throw new RefusalError("snapshot tick/world state mismatch");
  if(!Number.isInteger(snapshot.rngState)||!Number.isInteger(snapshot.lastSequence))throw new RefusalError("snapshot is missing rngState or lastSequence");
}
function finishedSegments(dir){const d=path.join(dir,"segments");if(!fs.existsSync(d))return[];return fs.readdirSync(d).filter(n=>/^segment-\d{4}\.json$/.test(n)).sort().map(n=>readJson(path.join(d,n),n));}
function checkLastStatus(dir,resumable){
  const last=finishedSegments(dir).at(-1);
  if(last){if(last.status==="completed")throw new RefusalError("completed run cannot be resumed");if(!resumable.includes(last.status))throw new RefusalError(`run status '${last.status}' is not safely resumable`);}
  const resultFile=path.join(dir,"run-result.json");
  if(fs.existsSync(resultFile)){const result=readJson(resultFile,"run-result.json");if(result.status==="completed")throw new RefusalError("completed run cannot be resumed");if(!resumable.includes(result.status))throw new RefusalError(`run status '${result.status}' is not safely resumable`);}
}
function nextSegment(dir){const d=path.join(dir,"segments");fs.mkdirSync(d,{recursive:true});return fs.readdirSync(d).filter(n=>/^segment-\d{4}(\.json|\.running\.json)$/.test(n)).length+1;}
function segmentStem(n){return `segment-${String(n).padStart(4,"0")}`;}

module.exports={RefusalError,safeStamp,writeJsonExclusive,writeJsonAtomic,readJson,snapshotPath,saveSnapshot,currentSourceCommit,currentSourceDirty,sourceAudit,stableEvent,pidAlive,checkCompatibility,checkSnapshotShape,finishedSegments,checkLastStatus,nextSegment,segmentStem};
