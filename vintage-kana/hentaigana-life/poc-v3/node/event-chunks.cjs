"use strict";
// Chunked event layout for continuous runs ("chunked-v1"):
//   events/seg0001-c000001.jsonl ...  each chunk is written by one process and never reopened.
//   events/chunks.jsonl               append-only manifest; one entry per sealed chunk.
// A chunk sealed after a crash may hold events past validThroughSequence. Those are superseded by the
// next chunk (deterministic replay re-emits them), and readers must ignore them.
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");

const LAYOUT="chunked-v1";
const MANIFEST="chunks.jsonl";
function eventsDir(runDir){return path.join(runDir,"events");}
function chunkName(segment,chunk){return `seg${String(segment).padStart(4,"0")}-c${String(chunk).padStart(6,"0")}.jsonl`;}
function listChunkFiles(runDir){const d=eventsDir(runDir);if(!fs.existsSync(d))return[];return fs.readdirSync(d).filter(n=>/^seg\d{4}-c\d{6}\.jsonl$/.test(n)).sort();}
function readManifest(runDir){
  const file=path.join(eventsDir(runDir),MANIFEST);if(!fs.existsSync(file))return[];
  const text=fs.readFileSync(file,"utf8");if(text.length&&!text.endsWith("\n"))throw new Error("events/chunks.jsonl ends with an incomplete entry");
  return text.split("\n").filter(Boolean).map((l,i)=>{try{return JSON.parse(l);}catch{throw new Error(`events/chunks.jsonl line ${i+1} is invalid JSON`);}});
}
function appendManifest(runDir,entry){const fd=fs.openSync(path.join(eventsDir(runDir),MANIFEST),"a");try{fs.writeSync(fd,JSON.stringify(entry)+"\n");fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function fileSha256(file){const h=crypto.createHash("sha256"),fd=fs.openSync(file,"r"),buf=Buffer.alloc(1<<20);try{let n;while((n=fs.readSync(fd,buf,0,buf.length,null))>0)h.update(buf.subarray(0,n));}finally{fs.closeSync(fd);}return h.digest("hex");}
// Complete lines only; bytes after the last newline are a torn tail (crash or power loss mid-write).
function parseChunk(file){
  const data=fs.readFileSync(file),end=data.lastIndexOf(10)+1,events=[];
  const lines=data.subarray(0,end).toString("utf8").split("\n").filter(Boolean);
  for(let i=0;i<lines.length;i++){let e;try{e=JSON.parse(lines[i]);}catch{throw new Error(`${path.basename(file)} line ${i+1} is invalid JSON (not at the tail)`);}events.push(e);}
  return{events,tornTailBytes:data.length-end,bytes:data.length};
}
// All valid events of a run in sequence order, honoring validThroughSequence of sealed chunks.
function readValidEvents(runDir){
  const manifest=new Map(readManifest(runDir).map(e=>[e.file,e])),files=listChunkFiles(runDir),out=[];
  let expected=1;
  files.forEach((name,i)=>{
    const entry=manifest.get(name);
    if(!entry&&i!==files.length-1)throw new Error(`unsealed chunk ${name} is not the last chunk`);
    const {events}=parseChunk(path.join(eventsDir(runDir),name)),limit=entry?entry.validThroughSequence:Infinity;
    for(const e of events){if(e.sequence>limit)break;if(e.sequence!==expected)throw new Error(`event sequence discontinuity in ${name}: expected ${expected}, found ${e.sequence}`);expected++;out.push(e);}
  });
  return out;
}

module.exports={LAYOUT,MANIFEST,eventsDir,chunkName,listChunkFiles,readManifest,appendManifest,fileSha256,parseChunk,readValidEvents};
