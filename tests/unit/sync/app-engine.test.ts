import test from 'node:test';
import assert from 'node:assert/strict';
import { syncApp, type AppRecord, type AppAdapter } from '../../../packages/shared/src/sync/app-engine.ts';
import { makePairingCode } from '../../../packages/shared/src/sync/crypto.ts';
import { groupCapability } from '../../../packages/shared/src/sync/group-client.ts';
import { savedGroup, saveGroup } from '../../../packages/shared/src/sync/group-store.ts';
const adapter=(records:AppRecord[])=>({records,async read(){return this.records;},async merge(incoming:AppRecord[]){for(const r of incoming)if(!this.records.some(v=>v.id===r.id))this.records.push(r);}} satisfies AppAdapter&{records:AppRecord[]});
const server=()=>{const data=new Map<string,string>();return {data,async list(){return [...data].map(([id,enc])=>({id,enc}));},async put(id:string,enc:string){data.set(id,enc);}};};
test('app sync: offline answers retry and concurrent devices converge without double counting',async()=>{
  const code=makePairingCode(),remote=server();
  const a=adapter([{id:'a',type:'answer',value:{points:14}}]),b=adapter([{id:'b',type:'answer',value:{points:7}}]);
  await assert.rejects(syncApp('conj',code,a,{...remote,async put(){throw Error('offline');}}));assert.equal(a.records.length,1);
  await Promise.all([syncApp('conj',code,a,remote),syncApp('conj',code,b,remote)]);
  await syncApp('conj',code,a,remote);await syncApp('conj',code,b,remote);await syncApp('conj',code,a,remote);
  assert.equal(remote.data.size,2);assert.deepEqual(a.records.map(r=>r.id).sort(),['a','b']);assert.equal(b.records.length,2);
});
test('app sync: authenticated ciphertext rejects a different app or group',async()=>{
  const code=makePairingCode(),remote=server();await syncApp('conj',code,adapter([{id:'a',type:'answer',value:{}}]),remote);
  await assert.rejects(syncApp('vintage-kana',code,adapter([]),remote));
  await assert.rejects(syncApp('conj',makePairingCode(),adapter([]),remote));
});
test('app sync: cancelled generation does not apply or upload records',async()=>{
  const remote=server(),a=adapter([{id:'a',type:'answer',value:{}}]);
  await syncApp('conj',makePairingCode(),a,remote,()=>false);assert.equal(remote.data.size,0);
});
test('shared group: the same code yields the same capability; stale selection cannot overwrite',async()=>{
  const code=makePairingCode();assert.equal(await groupCapability(code),await groupCapability(code));
  const values=new Map<string,string>(),storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)};
  assert.equal(savedGroup(storage),null);saveGroup(storage,code,null);
  assert.throws(()=>saveGroup(storage,makePairingCode(),null));assert.equal(savedGroup(storage),code);
});
