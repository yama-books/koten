import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const checks=[
  {cwd:path.join(root,'tests/rules'),args:['--test','--test-concurrency=1','stats.test.mjs','sync.test.mjs','app-sync.test.mjs']},
  {cwd:root,args:['tools/app-sync-check.mjs']},
  {cwd:root,args:['tools/app-sync-check.mjs','--webkit']},
];
if(!process.env.FIRESTORE_EMULATOR_HOST){
  const code=await new Promise(resolve=>{
    const child=spawn(process.execPath,['tests/rules/node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec','--only','firestore,auth','--project','demo-koten-rules','--config','firebase/firebase.app007.json','node tools/app-sync-validation.mjs'],{cwd:root,stdio:'inherit',windowsHide:true});
    child.on('error',()=>resolve(1));child.on('exit',code=>resolve(code??1));
  });
  process.exitCode=code;
}else for(const check of checks){
  const code=await new Promise(resolve=>{
    const child=spawn(process.execPath,check.args,{cwd:check.cwd,stdio:'inherit',windowsHide:true});
    child.on('error',()=>resolve(1));child.on('exit',code=>resolve(code??1));
  });
  if(code!==0){process.exitCode=1;break;}
}
