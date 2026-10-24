import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source=readFileSync(new URL('../../conj/record-transfer.js',import.meta.url),'utf8');
const KEY='katsuyoProtoV37';
const empty=()=>({correct:0,total:0,slots:{},correctCells:0,gradedCells:0,points:0,recent:'',quiz:null,byForm:{},byPos:{}});
function setup(seed=empty()){
  const values=new Map<string,string>();
  const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,String(v)),removeItem:(k:string)=>values.delete(k)};
  const context={crypto:globalThis.crypto,TextEncoder,Event, navigator:{}};
  runInNewContext(source,context);
  const api=(context as any).ConjRecordTransfer;
  api.initialize(storage,seed);return {api,storage,values};
}
const answer=(s:any)=>({...s,total:s.total+1,correct:s.correct+1,correctCells:s.correctCells+1,gradedCells:s.gradedCells+1,points:s.points+14,recent:s.recent+'1',slots:{...s.slots,'verb:0:0':{c:(s.slots['verb:0:0']?.c||0)+1,w:0}}});
test('conj: retains legacy counters, appends an answer, and reimport is idempotent',async()=>{
  const {api,storage}=setup({...empty(),total:10,points:100});
  const before=api.project(api.read(storage));await api.recordAnswer(storage,before,answer(before));
  assert.equal(api.read(storage).events.length,1);assert.equal(api.project(api.read(storage)).points,114);
  const exported=api.exportRecord(storage);
  await api.commitImport(storage,await api.previewImport(storage,exported));
  await api.commitImport(storage,await api.previewImport(storage,exported));
  assert.equal(api.project(api.read(storage)).points,114);assert.equal(api.read(storage).events.length,1);
});
test('conj: parallel devices merge only identified increments and converge',async()=>{
  const a=setup({...empty(),points:80,total:4}),b=setup();
  await b.api.commitImport(b.storage,await b.api.previewImport(b.storage,a.api.exportRecord(a.storage)));
  for(const device of [a,b]){const before=device.api.project(device.api.read(device.storage));await device.api.recordAnswer(device.storage,before,answer(before));}
  const ax=a.api.exportRecord(a.storage),bx=b.api.exportRecord(b.storage);
  await a.api.commitImport(a.storage,await a.api.previewImport(a.storage,bx));
  await b.api.commitImport(b.storage,await b.api.previewImport(b.storage,ax));
  assert.equal(a.api.project(a.api.read(a.storage)).points,108);
  assert.equal(b.api.project(b.api.read(b.storage)).points,108);
  assert.equal(a.api.read(a.storage).events.length,2);
});
test('conj: independent legacy totals are backed up and never added',async()=>{
  const a=setup({...empty(),points:100,total:8}),b=setup({...empty(),points:200,total:12});
  const archive=b.api.exportRecord(b.storage);
  for(let i=0;i<2;i++)await a.api.commitImport(a.storage,await a.api.previewImport(a.storage,archive));
  const l=a.api.read(a.storage);assert.equal(a.api.project(l).points,100);assert.equal(l.backups.length,1);assert.equal(l.backups[0].stats.points,200);
});
test('conj: v1 and raw legacy backups remain readable without destructive integration',async()=>{
  const a=setup({...empty(),points:10});
  for(const text of [JSON.stringify({...empty(),points:22}),JSON.stringify({stats:{...empty(),points:22}}),JSON.stringify({app:'conj-katsuyo-record',exportVersion:1,stats:{...empty(),points:22}})])await a.api.commitImport(a.storage,await a.api.previewImport(a.storage,text));
  assert.equal(a.api.read(a.storage).backups.length,1);assert.equal(a.api.project(a.api.read(a.storage)).points,10);
});
test('conj: wrong app, unsupported version, invalid counters and ID conflicts reject without writes',async()=>{
  const a=setup(),before=a.storage.getItem(KEY);
  for(const text of ['{',JSON.stringify({app:'vintage-kana-record',exportVersion:1}),JSON.stringify({app:'conj-katsuyo-record',exportVersion:9,stats:empty()}),JSON.stringify({...empty(),points:-1})])await assert.rejects(a.api.previewImport(a.storage,text));
  assert.equal(a.storage.getItem(KEY),before);
  const s=a.api.project(a.api.read(a.storage));await a.api.recordAnswer(a.storage,s,answer(s));
  const bad=JSON.parse(a.api.exportRecord(a.storage));bad.ledger.events[0].delta.points++;
  await assert.rejects(a.api.previewImport(a.storage,JSON.stringify(bad)),/ID/);
});
test('conj: an answer saved after preview survives import; a failed write retains canonical stats',async()=>{
  const a=setup(),b=setup();const plan=await a.api.previewImport(a.storage,b.api.exportRecord(b.storage));
  const before=a.api.project(a.api.read(a.storage));await a.api.recordAnswer(a.storage,before,answer(before));
  await a.api.commitImport(a.storage,plan);assert.equal(a.api.project(a.api.read(a.storage)).points,14);
  const saved=a.storage.getItem(KEY),broken={...a.storage,setItem(){throw Error('quota');}};
  const s=a.api.project(a.api.read(a.storage));await assert.rejects(a.api.recordAnswer(broken,s,answer(s)));
  assert.equal(a.storage.getItem(KEY),saved);
});
