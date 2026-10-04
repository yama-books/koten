"use strict";
// Simulation compatibility fingerprint: decides whether a run may be resumed by the current source tree.
// Only files that can change simulation results, PRNG output or snapshot/resume state are hashed.
// Git SHA is recorded for audit only. See docs/NODE_RUNNER_DESIGN.md for the specification.
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {SIMULATION_FILES}=require("./load-simulation.cjs");

const SCHEME="hklife-sim-compat-1";
const NODE_FILES=Object.freeze(["node/load-simulation.cjs","node/sim-core.cjs","node/event-writer.cjs"]);
const sha256=text=>crypto.createHash("sha256").update(text,"utf8").digest("hex");

function compatibilityFiles(){return [...SIMULATION_FILES,...NODE_FILES].sort();}
// Line endings and BOM are normalized so a CRLF checkout fingerprints the same as an LF one.
function hashFile(root,rel){return sha256(fs.readFileSync(path.join(root,rel),"utf8").replace(/^﻿/,"").replace(/\r\n/g,"\n"));}
function computeCompatibility(root=path.resolve(__dirname,"..")){
  const files=compatibilityFiles().map(p=>({path:p,sha256:hashFile(root,p)}));
  const fingerprint=sha256(`${SCHEME}\n${files.map(f=>`${f.sha256}  ${f.path}`).join("\n")}\n`);
  return{scheme:SCHEME,fingerprint,files};
}
function diffCompatibility(recorded,current){
  const before=new Map((recorded.files||[]).map(f=>[f.path,f.sha256])),after=new Map(current.files.map(f=>[f.path,f.sha256])),out=[];
  for(const [p,h] of after){if(!before.has(p))out.push(`added ${p}`);else if(before.get(p)!==h)out.push(`changed ${p}`);}
  for(const p of before.keys())if(!after.has(p))out.push(`removed ${p}`);
  if(recorded.scheme!==current.scheme)out.push(`scheme ${recorded.scheme} -> ${current.scheme}`);
  return out;
}

module.exports={SCHEME,NODE_FILES,compatibilityFiles,computeCompatibility,diffCompatibility};
