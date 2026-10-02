"use strict";
const fs=require("node:fs");

function uniq(values){return [...new Set(values.filter(Boolean))];}

class EventWriter{
  // sink: optional function receiving each record instead of a file (used by deterministic replay).
  constructor({file,world,runMeta,eventLevel="all",append=false,startSequence=0,sink=null}){
    this.sink=sink;
    this.fd=sink?null:fs.openSync(file,append?"a":"ax");
    this.world=world;
    this.runMeta=runMeta;
    this.eventLevel=eventLevel;
    this.sequence=startSequence;
    this.bytes=0;
  }
  bind(bus){
    this.offObservation=bus.on("observation",entry=>this.write("observation",entry));
    if(this.eventLevel==="all") this.offInternal=bus.on("internal",entry=>this.write("internal",entry));
  }
  write(stream,entry){
    const actorIds=uniq([entry.actorId,entry.targetId]);
    const objectIds=uniq([entry.tokenId,entry.modificationId]);
    let environmentChanges=null;
    if(entry.modificationId) environmentChanges=[{type:"persistent-modification",id:entry.modificationId}];
    else if(entry.type==="touch-punctuation"&&entry.tokenId) environmentChanges=[{type:"punctuation-position-updated",id:entry.tokenId}];
    const record={
      runId:this.runMeta.runId,
      engineVersion:this.runMeta.engineVersion,
      worldSchemaVersion:this.runMeta.worldSchemaVersion,
      characterDataVersion:this.runMeta.characterDataVersion,
      timestamp:entry.at||new Date().toISOString(),
      worldTime:{minutes:entry.worldMinute,display:globalThis.HKLife.Utils.formatClock(entry.worldMinute)},
      eventType:entry.type,
      stream,
      actorIds,
      objectIds,
      area:this.world.area?.id||null,
      action:entry.action||null,
      interpretation:entry.interpretation||null,
      environmentChanges,
      seed:this.runMeta.seed,
      sequence:++this.sequence,
      payload:entry
    };
    if(this.sink){this.sink(record);return;}
    const line=JSON.stringify(record)+"\n";
    fs.writeSync(this.fd,line);
    this.bytes+=Buffer.byteLength(line);
  }
  sync(){if(this.fd!==null)fs.fsyncSync(this.fd);}
  close(){
    this.offObservation?.();this.offInternal?.();this.offObservation=this.offInternal=null;
    if(this.fd!==null){fs.closeSync(this.fd);this.fd=null;}
  }
}

module.exports={EventWriter};
