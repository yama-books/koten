"use strict";
// Resume compatibility check: edits outside the fingerprint keep a run resumable, simulation edits do not.
// Each case copies poc-v3 to a temp directory, creates a paused run there, edits the copy, then resumes.
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const {computeCompatibility,compatibilityFiles}=require("./compat.cjs");
const pocRoot=path.resolve(__dirname,"..");
const base=fs.mkdtempSync(path.join(os.tmpdir(),"hklife-compat-health-"));

function copySource(name){const dst=path.join(base,name,"poc-v3");for(const d of ["js","node","docs","schema"])fs.cpSync(path.join(pocRoot,d),path.join(dst,d),{recursive:true});fs.copyFileSync(path.join(pocRoot,"README.md"),path.join(dst,"README.md"));return dst;}
function runner(root,args){return spawnSync(process.execPath,[path.join(root,"node","runner.cjs"),...args],{encoding:"utf8"});}
function edit(file,fn){fs.writeFileSync(file,fn(fs.readFileSync(file,"utf8")));}
function prepare(name){
  const root=copySource(name),out=path.join(base,name,"runs");
  const r=runner(root,["--ticks","200","--seed","20261003","--snapshot-every","100","--output",out,"--run-id","paused","--pause-after-segment"]);
  if(r.status!==0)throw new Error(`${name}: create failed\n${r.stderr}`);
  return{root,run:path.join(out,"paused")};
}
function resume(c){return runner(c.root,["--ticks","50","--snapshot-every","100","--resume-run",c.run]);}
const cases=[
  {id:"A-analyzer-only",expect:"resume",mutate:r=>edit(path.join(r,"node","analyze-run.cjs"),s=>s+"\n// analyzer-only change\n")},
  {id:"B-readme-docs-only",expect:"resume",mutate:r=>{edit(path.join(r,"README.md"),s=>s+"\nREADME change\n");edit(path.join(r,"docs","NODE_RUNNER_DESIGN.md"),s=>s+"\ndocs change\n");}},
  {id:"C-simulation-scoring",expect:"refuse",match:"changed js/sim/scoring.js",mutate:r=>edit(path.join(r,"js","sim","scoring.js"),s=>s+"\nHKLife.Scoring.compatProbe=1;\n")},
  {id:"D1-prng",expect:"refuse",match:"changed node/sim-core.cjs",mutate:r=>edit(path.join(r,"node","sim-core.cjs"),s=>{if(!s.includes("0x6D2B79F5"))throw new Error("PRNG constant not found");return s.replace("0x6D2B79F5","0x6D2B79F7");})},
  {id:"D2-state-schema",expect:"refuse",match:"changed js/core/world-state.js",mutate:r=>edit(path.join(r,"js","core","world-state.js"),s=>s.replace("creatures:[],","creatures:[],compatProbe:[],"))},
  {id:"D3-event-record-format",expect:"refuse",match:"changed node/event-writer.cjs",mutate:r=>edit(path.join(r,"node","event-writer.cjs"),s=>s+"\n// event record format change\n")},
  // Legacy runs (no run-meta.compatibility) keep the strict source-commit rule.
  {id:"L-legacy-run-without-fingerprint",expect:"refuse",match:"source commit",mutate:(r,run)=>{const metaFile=path.join(run,"run-meta.json"),meta=JSON.parse(fs.readFileSync(metaFile,"utf8"));delete meta.compatibility;meta.sourceCommit="0".repeat(40);fs.writeFileSync(metaFile,JSON.stringify(meta));for(const n of fs.readdirSync(path.join(run,"snapshots"))){const f=path.join(run,"snapshots",n),s=JSON.parse(fs.readFileSync(f,"utf8"));s.sourceCommit=meta.sourceCommit;delete s.compatibilityFingerprint;fs.writeFileSync(f,JSON.stringify(s));}}}
];
try{
  const results=[];
  for(const c of cases){
    const prepared=prepare(c.id);c.mutate(prepared.root,prepared.run);const r=resume(prepared);
    const resumed=r.status===0,ok=c.expect==="resume"?resumed:(!resumed&&(!c.match||r.stderr.includes(c.match)));
    results.push({case:c.id,expect:c.expect,ok,exitCode:r.status,reason:resumed?null:r.stderr.trim().split("\n")[0].slice(0,240)});
  }
  // Metadata written by the real tree still records the audit fields alongside the fingerprint.
  const metaRun=path.join(base,"meta-run"),m=spawnSync(process.execPath,[path.join(__dirname,"runner.cjs"),"--ticks","2","--seed","1","--output",base,"--run-id","meta-run"],{encoding:"utf8"});
  const meta=m.status===0?JSON.parse(fs.readFileSync(path.join(metaRun,"run-meta.json"),"utf8")):{};
  const current=computeCompatibility();
  const metaOk=/^[0-9a-f]{40}$/.test(meta.sourceCommit||"")&&typeof meta.sourceDirty==="boolean"&&!!meta.engineVersion&&!!meta.worldSchemaVersion&&!!meta.characterDataVersion&&meta.compatibility?.fingerprint===current.fingerprint;
  const summary={ok:results.every(r=>r.ok)&&metaOk,fingerprint:current.fingerprint,scheme:current.scheme,files:compatibilityFiles(),metaRecordsAuditFields:metaOk,cases:results};
  console.log(JSON.stringify(summary,null,2));if(!summary.ok)process.exitCode=1;
}finally{fs.rmSync(base,{recursive:true,force:true});}
