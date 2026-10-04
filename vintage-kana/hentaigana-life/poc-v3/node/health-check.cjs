"use strict";
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const base=fs.mkdtempSync(path.join(os.tmpdir(),"hklife-health-"));
try{
  const runId="health-check";
  const r=spawnSync(process.execPath,[path.join(__dirname,"runner.cjs"),"--ticks","40","--seed","314159","--snapshot-every","20","--event-level","all","--output",base,"--run-id",runId],{encoding:"utf8"});
  if(r.status!==0)throw new Error(`runner failed (${r.status})\n${r.stdout}\n${r.stderr}`);
  const dir=path.join(base,runId);
  for(const rel of ["run-meta.json","events.jsonl","run-result.json","snapshots"]){if(!fs.existsSync(path.join(dir,rel)))throw new Error(`missing ${rel}`);}
  const result=JSON.parse(fs.readFileSync(path.join(dir,"run-result.json"),"utf8"));
  if(result.status!=="completed"||result.ticksCompleted!==40)throw new Error("unexpected run-result");
  const lines=fs.readFileSync(path.join(dir,"events.jsonl"),"utf8").trim().split(/\r?\n/).filter(Boolean);
  if(lines.length===0)throw new Error("events.jsonl is empty");
  const event=JSON.parse(lines[0]);
  for(const key of ["runId","engineVersion","worldSchemaVersion","characterDataVersion","timestamp","worldTime","eventType","actorIds","objectIds","area","seed"]){if(!(key in event))throw new Error(`event missing ${key}`);}
  const parity=spawnSync(process.execPath,[path.join(__dirname,"parity-health-check.cjs")],{encoding:"utf8"});if(parity.status!==0)throw new Error(`parity check failed (${parity.status})\n${parity.stdout}\n${parity.stderr}`);
  console.log(JSON.stringify({ok:true,ticks:result.ticksCompleted,events:lines.length,snapshots:fs.readdirSync(path.join(dir,"snapshots")).length,parity:true},null,2));
}finally{fs.rmSync(base,{recursive:true,force:true});}
