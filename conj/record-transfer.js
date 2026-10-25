/* The existing stats key remains readable by older versions. The ledger is the
 * canonical record; the surrounding counters are its materialized projection. */
(function(root){
  'use strict';
  const KEY='katsuyoProtoV37', APP='conj-katsuyo-record', LIMIT=8*1024*1024;
  const COUNTERS=['correct','total','slots','correctCells','gradedCells','points','byForm','byPos'];
  const copy=v=>JSON.parse(JSON.stringify(v));
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const uid=()=>root.crypto.randomUUID();
  function canonical(v){
    if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
    if(object(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
    return JSON.stringify(v);
  }
  function numericTree(v,depth=0){
    if(depth>8)throw Error('記録の階層が深すぎます。');
    if(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0)return;
    if(!object(v))throw Error('記録の集計形式が不正です。');
    for(const [k,n] of Object.entries(v)){
      if(!k||k.length>220||['__proto__','constructor','prototype'].includes(k))throw Error('記録のキーが不正です。');
      numericTree(n,depth+1);
    }
  }
  function validateStats(v){
    if(!object(v)||!('slots' in v)||!('points' in v)||!('total' in v))throw Error('活用表の集計記録ではありません。');
    for(const k of COUNTERS)if(k in v)numericTree(v[k]);
    if(v.recent!==undefined&&(typeof v.recent!=='string'||!/^[01]{0,100}$/.test(v.recent)))throw Error('直近記録が不正です。');
    if(v.quiz!=null){
      if(!object(v.quiz)||!Array.isArray(v.quiz.events)||v.quiz.events.some(e=>!object(e)||!['form','type','lemma'].includes(e.quizMode)))throw Error('判別記録が不正です。');
      if(v.quiz.totals!=null)numericTree(v.quiz.totals);
      if(v.quiz.byMode!=null)numericTree(v.quiz.byMode);
    }
    return v;
  }
  function counters(stats){
    const result={};
    for(const k of COUNTERS)if(k in stats)result[k]=copy(stats[k]);
    if(stats.quiz)result.quiz={totals:copy(stats.quiz.totals||{}),byMode:copy(stats.quiz.byMode||{})};
    return result;
  }
  function difference(before,after){
    if(typeof after==='number'){
      const delta=after-(typeof before==='number'?before:0);
      if(delta<0)throw Error('累計値が減少しました。既存記録を保全して停止しました。');
      return delta;
    }
    const result={};
    for(const [k,v] of Object.entries(after)){
      const d=difference(before?.[k],v);
      if(typeof d==='number'?d!==0:Object.keys(d).length>0)result[k]=d;
    }
    return result;
  }
  function add(target,delta){
    for(const [k,v] of Object.entries(delta)){
      if(typeof v==='number'){
        const n=(Number(target[k])||0)+v;
        if(!Number.isSafeInteger(n))throw Error('集計値が上限を超えました。');
        target[k]=n;
      }else{if(!object(target[k]))target[k]={};add(target[k],v);}
    }
  }
  function validId(id){return typeof id==='string'&&/^[a-zA-Z0-9:_-]{1,160}$/.test(id);}
  function validateLedger(v){
    if(!object(v)||v.version!==1||!validId(v.baselineId)||!Array.isArray(v.events)||!Array.isArray(v.backups)||v.events.length>50000)throw Error('対応していない記録台帳です。');
    validateStats(v.baseline);
    const ids=new Set();
    for(const e of v.events){
      if(!object(e)||!validId(e.id)||ids.has(e.id)||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at))||!object(e.delta)||typeof e.recent!=='string'||!/^[01]{0,100}$/.test(e.recent)||!Array.isArray(e.quizEvents))throw Error('解答イベントが不正です。');
      if(Object.keys(e.delta).some(k=>![...COUNTERS,'quiz'].includes(k)))throw Error('集計項目が不正です。');
      numericTree(e.delta);ids.add(e.id);
    }
    for(const b of v.backups){if(!object(b)||!validId(b.id))throw Error('バックアップが不正です。');validateStats(b.stats);}
    return v;
  }
  function project(ledger){
    const out=copy(ledger.baseline);
    for(const e of [...ledger.events].sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id))){
      add(out,e.delta);out.recent=((out.recent||'')+e.recent).slice(-100);
      if(e.quizEvents.length){
        if(!out.quiz)out.quiz={version:1,events:[],totals:{},byMode:{}};
        out.quiz.events=[...(out.quiz.events||[]),...e.quizEvents].slice(-1000);
      }
    }
    return out;
  }
  function read(storage,normalized){
    const raw=JSON.parse(storage.getItem(KEY)||'null');
    if(raw?.recordLedger)return validateLedger(raw.recordLedger);
    const baseline=copy(normalized||raw||{correct:0,total:0,slots:{},correctCells:0,gradedCells:0,points:0,recent:'',byForm:{},byPos:{},quiz:null});
    delete baseline.recordLedger;validateStats(baseline);
    return {version:1,baselineId:uid(),baseline,events:[],backups:[]};
  }
  function write(storage,ledger){
    validateLedger(ledger);const stats=project(ledger);
    const text=JSON.stringify({...stats,recordLedger:ledger});
    if(new TextEncoder().encode(text).length>LIMIT)throw Error('記録容量が上限です。書き出して保管してください。');
    storage.setItem(KEY,text);return stats;
  }
  function initialize(storage,normalized){const ledger=read(storage,normalized);return write(storage,ledger);}
  function locked(fn){return root.navigator?.locks?root.navigator.locks.request('koten:conj-record',fn):Promise.resolve().then(fn);}
  async function recordAnswer(storage,before,after){
    const delta=difference(counters(before),counters(after));numericTree(delta);
    const count=(after.gradedCells||0)-(before.gradedCells||0)+(after.quiz?.totals?.total||0)-(before.quiz?.totals?.total||0);
    if(count<=0)throw Error('解答件数がありません。');
    const event={id:uid(),at:new Date().toISOString(),delta,recent:(after.recent||'').slice(-Math.min(count,100)),quizEvents:(after.quiz?.events||[]).slice(-Math.max(0,(after.quiz?.totals?.total||0)-(before.quiz?.totals?.total||0)))};
    if(!((after.quiz?.totals?.total||0)>(before.quiz?.totals?.total||0)))event.quizEvents=[];
    root.ConjRecordSaving=true;
    try{
      const result=await locked(()=>{const ledger=read(storage,before);ledger.events.push(event);return write(storage,ledger);});
      root.dispatchEvent?.(new Event('koten:record-saved'));return result;
    }finally{root.ConjRecordSaving=false;}
  }
  function union(local,incoming){
    const byId=new Map(local.map(e=>[e.id,e]));
    for(const e of incoming){
      const old=byId.get(e.id);
      if(old&&canonical(old)!==canonical(e))throw Error('同じIDの内容が異なります。既存記録を保全して停止しました。');
      if(!old)byId.set(e.id,copy(e));
    }
    return [...byId.values()];
  }
  function merge(local,incoming){
    validateLedger(local);validateLedger(incoming);const out=copy(local);
    if(out.baselineId===incoming.baselineId){
      if(canonical(out.baseline)!==canonical(incoming.baseline))throw Error('移行基準値が一致しません。');
    }else if(!out.events.length&&!out.baseline.total&&!out.baseline.gradedCells&&!out.baseline.quiz?.totals?.total&&!out.baseline.points){
      out.baselineId=incoming.baselineId;out.baseline=copy(incoming.baseline);
    }else if(hasCounts(incoming.baseline))out.backups=union(out.backups,[{id:incoming.baselineId,stats:incoming.baseline}]);
    out.events=union(out.events,incoming.events);out.backups=union(out.backups,incoming.backups);
    out.backups=out.backups.filter(b=>b.id!==out.baselineId);
    validateLedger(out);return out;
  }
  function hasCounts(stats){const visit=v=>typeof v==='number'?v>0:Object.values(v||{}).some(visit);return visit(counters(stats));}
  async function fingerprint(stats){
    const bytes=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(stats)));
    return 'legacy-'+Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
  }
  async function decode(text){
    if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMIT)throw Error('ファイルが大きすぎます。');
    const data=JSON.parse(text);
    if(data?.app===APP){
      if(data.exportVersion===2)return validateLedger(data.ledger);
      if(data.exportVersion!==1)throw Error('この記録ファイルの版には対応していません。');
    }else if(data?.app||data?.exportVersion||data?.schemaVersion)throw Error('活用表の記録ファイルではありません。');
    const stats=copy(validateStats(data?.stats&&object(data.stats)?data.stats:data));delete stats.recordLedger;
    return {version:1,baselineId:await fingerprint(stats),baseline:stats,events:[],backups:[]};
  }
  function exportRecord(storage){const ledger=read(storage);return JSON.stringify({app:APP,exportVersion:2,exportedAt:new Date().toISOString(),stats:project(ledger),ledger},null,2);}
  async function previewImport(storage,text){
    const incoming=await decode(text),before=read(storage),after=merge(before,incoming);
    return {incoming,added:after.events.length-before.events.length,backups:after.backups.length-before.backups.length,total:incoming.events.length,baselineAnswers:(incoming.baseline.gradedCells||0)+(incoming.baseline.quiz?.totals?.total||0),baselinePoints:incoming.baseline.points||0};
  }
  async function commitImport(storage,plan,active=()=>true){
    return locked(()=>active()?write(storage,merge(read(storage),plan.incoming)):null);
  }
  root.ConjRecordTransfer=Object.freeze({KEY,initialize,read,project,merge,recordAnswer,exportRecord,previewImport,commitImport,validateLedger});
})(typeof window==='undefined'?globalThis:window);
