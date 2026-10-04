"use strict";
// Keeps one continuous observer running for a run: restarts it after a crash or hang, never after a refusal.
// node node/observer-supervisor.cjs --run DIR --state-dir DIR [options] [-- observer options]
// Single instance per state directory (supervisor.lock). Does nothing while <state-dir>/STOP or ALERT.json exists.
const fs=require("node:fs");
const path=require("node:path");
const {fork}=require("node:child_process");
const store=require("./run-store.cjs");

const EXIT={ok:0,refused:3,tooManyRestarts:4};
function usage(){console.log(`Hentaigana Life observer supervisor

node node/observer-supervisor.cjs --run DIR --state-dir DIR [options] [-- observer options]
  --log-file FILE              append log (default <state-dir>/supervisor.log)
  --max-restarts-per-hour N    crash restarts allowed per rolling hour (default 5)
  --backoff-ms MS              first restart delay, doubled per consecutive crash (default 2000)
  --max-backoff-ms MS          restart delay cap (default 60000)
  --hang-timeout-ms MS         kill the observer when its heartbeat is older than this (default max(120000, 50 ticks))
  --startup-grace-ms MS        time allowed for crash recovery before the first heartbeat (default 600000)
  --clear-alert                remove a previous ALERT.json and start
Stops when the observer exits 0 (STOP file, tick limit or signal). Exit codes: 0 stopped or already running,
3 observer refused to resume (ALERT.json written), 4 too many crashes (ALERT.json written).`);}
function parseArgs(argv){
  const out={run:null,stateDir:null,logFile:null,maxRestartsPerHour:5,backoffMs:2000,maxBackoffMs:60000,hangTimeoutMs:null,startupGraceMs:600000,clearAlert:false,observerArgs:[]};
  const num={"--max-restarts-per-hour":"maxRestartsPerHour","--backoff-ms":"backoffMs","--max-backoff-ms":"maxBackoffMs","--hang-timeout-ms":"hangTimeoutMs","--startup-grace-ms":"startupGraceMs"};
  for(let i=0;i<argv.length;i++){
    const a=argv[i],v=argv[i+1];
    if(a==="--"){out.observerArgs=argv.slice(i+1);break;}
    if(a==="--help"||a==="-h")out.help=true; else if(a==="--clear-alert")out.clearAlert=true;
    else if(a==="--run"){out.run=path.resolve(v);i++;} else if(a==="--state-dir"){out.stateDir=path.resolve(v);i++;} else if(a==="--log-file"){out.logFile=path.resolve(v);i++;}
    else if(num[a]){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error(`${a} must be a number >= 0`);out[num[a]]=n;i++;}
    else throw new Error(`Unknown argument: ${a}`);
  }
  if(!out.help&&(!out.run||!out.stateDir))throw new Error("--run and --state-dir are required");
  return out;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function readJsonIfPresent(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}

(async()=>{
  const args=parseArgs(process.argv.slice(2));if(args.help){usage();return;}
  fs.mkdirSync(args.stateDir,{recursive:true});
  const logFile=args.logFile||path.join(args.stateDir,"supervisor.log"),lockFile=path.join(args.stateDir,"supervisor.lock"),stopFile=path.join(args.stateDir,"STOP"),alertFile=path.join(args.stateDir,"ALERT.json"),heartbeatFile=path.join(args.stateDir,"heartbeat.json");
  const log=msg=>{const line=`[${new Date().toISOString()}] supervisor ${process.pid}: ${msg}\n`;fs.appendFileSync(logFile,line);process.stdout.write(line);};
  const alert=(reason,detail)=>{store.writeJsonAtomic(alertFile,{at:new Date().toISOString(),run:args.run,reason,...detail});log(`ALERT: ${reason}`);};
  // Single instance: a lock held by a live pid means another supervisor is already in charge.
  try{store.writeJsonExclusive(lockFile,{pid:process.pid,startedAt:new Date().toISOString(),run:args.run});}
  catch(e){if(e.code!=="EEXIST")throw e;const held=readJsonIfPresent(lockFile);if(held&&store.pidAlive(held.pid)){log(`another supervisor (pid ${held.pid}) holds ${lockFile}; exiting`);return;}fs.rmSync(lockFile,{force:true});store.writeJsonExclusive(lockFile,{pid:process.pid,startedAt:new Date().toISOString(),run:args.run});log(`removed stale lock of pid ${held?.pid}`);}
  process.on("exit",()=>{const held=readJsonIfPresent(lockFile);if(held&&held.pid===process.pid)fs.rmSync(lockFile,{force:true});});
  if(fs.existsSync(stopFile)){log(`STOP present at ${stopFile}; not starting (delete it to start)`);return;}
  if(fs.existsSync(alertFile)){if(!args.clearAlert){log(`ALERT.json present; not starting (inspect it, then rerun with --clear-alert)`);process.exitCode=EXIT.refused;return;}fs.rmSync(alertFile);log("cleared previous ALERT.json");}
  const meta=store.readJson(path.join(args.run,"run-meta.json"),"run-meta.json");
  const hangTimeoutMs=args.hangTimeoutMs??Math.max(120000,(meta.tickMs||1300)*50);
  let stopping=false,child=null,crashes=[],consecutive=0;
  const stopChild=sig=>{if(stopping)return;stopping=true;log(`${sig} received; asking the observer to stop`);if(child&&child.connected)child.send({type:"stop"});};
  for(const sig of ["SIGINT","SIGTERM","SIGBREAK","SIGHUP"])process.on(sig,()=>stopChild(sig));
  log(`started for ${args.run} (hang timeout ${hangTimeoutMs} ms)`);
  while(!stopping){
    if(fs.existsSync(stopFile)){log("STOP present; not restarting");break;}
    const startedAt=Date.now(),out=fs.openSync(logFile,"a");
    child=fork(path.join(__dirname,"observer.cjs"),["--run",args.run,"--state-dir",args.stateDir,...args.observerArgs],{stdio:["ignore",out,out,"ipc"]});
    fs.closeSync(out);
    log(`observer pid ${child.pid} started`);
    let hung=false;
    const watch=setInterval(()=>{
      const hb=readJsonIfPresent(heartbeatFile),own=hb&&hb.pid===child.pid;
      const age=own?Date.now()-hb.wallTimeMs:Date.now()-startedAt,limit=own&&hb.status==="running"?hangTimeoutMs:args.startupGraceMs;
      if(age>limit&&!hung){hung=true;log(`observer pid ${child.pid} heartbeat is ${age} ms old (limit ${limit}); killing it`);child.kill("SIGKILL");}
    },Math.min(5000,Math.max(200,Math.floor(hangTimeoutMs/4))));
    const code=await new Promise(r=>child.on("exit",(c,s)=>r(c===null?`signal ${s}`:c)));
    clearInterval(watch);child=null;
    log(`observer exited with ${code}${hung?" (killed as hung)":""}`);
    if(code===0)break;
    if(code===3){const hb=readJsonIfPresent(heartbeatFile);alert("observer refused to resume; human review needed (see supervisor.log)",{exitCode:code,heartbeat:hb});process.exitCode=EXIT.refused;return;}
    if(stopping)break;
    if(Date.now()-startedAt>10*60*1000)consecutive=0;
    consecutive++;crashes=crashes.filter(t=>Date.now()-t<3600000);crashes.push(Date.now());
    if(code!==5&&crashes.length>args.maxRestartsPerHour){alert(`observer crashed ${crashes.length} times within an hour`,{exitCode:code});process.exitCode=EXIT.tooManyRestarts;return;}
    const delay=Math.min(args.maxBackoffMs,args.backoffMs*2**(consecutive-1));
    log(`${code===5?"another observer is running this run":"crash"}; restarting in ${delay} ms`);
    await sleep(delay);
  }
  log("stopped");
})().catch(err=>{console.error(err&&err.stack||err);process.exitCode=1;});
