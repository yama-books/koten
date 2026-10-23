import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const code = readFileSync(new URL('../../vintage-kana/record-transfer.js', import.meta.url), 'utf8');
function transfer() {
  const context: Record<string, unknown> = {};
  runInNewContext(code, context);
  return context.VintageKanaRecordTransfer as {
    exportRecord(s: Storage): string;
    previewImport(s: Storage, v: string): {
      addedLearning: number; addedDecipher: number;
      after: { learningEvents: unknown[]; decipherHistory: unknown[]; decipherLevel: number };
    };
    commitImport(s: Storage, v: unknown): void;
  };
}
function storage(seed: Record<string,string> = {}): Storage {
  const items = new Map(Object.entries(seed));
  return {
    getItem(k: string) { return items.get(k) ?? null; },
    setItem(k: string, v: string) { items.set(k, String(v)); },
    removeItem(k: string) { items.delete(k); },
    clear() { items.clear(); },
    key(i: number) { return [...items.keys()][i] ?? null; },
    get length() { return items.size; },
  } as Storage;
}
const learning=(id:string)=>({id,at:'2026-10-23T00:00:00Z',mode:'reading',outcome:'correct'});
const decipher=(id:string)=>({id,phraseId:'test',reading:'あ',correct:true,glyphs:[]});

test('export format includes both modes and decipher level',()=>{
  const api=transfer();const s=storage({
    'vintage-kana:learning-events:v1':JSON.stringify([learning('a')]),
    'vintage-kana:decipher-history:v1':JSON.stringify([decipher('d')]),
    'vintage-kana:decipher-level:v1':'3',
  });
  const data=JSON.parse(api.exportRecord(s));
  assert.equal(data.app,'vintage-kana-record');
  assert.equal(data.exportVersion,1);
  assert.equal(data.learningEvents.length,1);
  assert.equal(data.decipherHistory.length,1);
  assert.equal(data.decipherLevel,3);
});

test('import adds only unseen ids and retains local level and records',()=>{
  const api=transfer(); const s=storage({
    'vintage-kana:learning-events:v1':JSON.stringify([learning('a')]),
    'vintage-kana:decipher-history:v1':JSON.stringify([decipher('d')]),
    'vintage-kana:decipher-level:v1':'4',
  });
  const input=JSON.stringify({app:'vintage-kana-record',exportVersion:1,
    learningEvents:[learning('a'),learning('b')],decipherHistory:[decipher('d'),decipher('e')],decipherLevel:2});
  const plan=api.previewImport(s,input);
  assert.equal(plan.addedLearning,1);assert.equal(plan.addedDecipher,1);
  assert.equal(plan.after.decipherLevel,4);
  api.commitImport(s,plan);
  const final=JSON.parse(api.exportRecord(s));
  assert.deepEqual(final.learningEvents.map((x:{id:string})=>x.id),['a','b']);
  assert.deepEqual(final.decipherHistory.map((x:{id:string})=>x.id),['d','e']);
  // Reimport must never double-count.
  const replay=api.previewImport(s,input);
  assert.equal(replay.addedLearning,0);assert.equal(replay.addedDecipher,0);
});

test('wrong app, invalid events and duplicate IDs reject without writing',()=>{
  const api=transfer();const s=storage();
  for(const bad of [
    JSON.stringify({app:'other',exportVersion:1,learningEvents:[],decipherHistory:[],decipherLevel:1}),
    JSON.stringify({app:'vintage-kana-record',exportVersion:1,learningEvents:[{id:'x'}],decipherHistory:[],decipherLevel:1}),
    JSON.stringify({app:'vintage-kana-record',exportVersion:1,learningEvents:[learning('x'),learning('x')],decipherHistory:[],decipherLevel:1}),
  ]) assert.throws(()=>api.previewImport(s,bad));
  assert.equal(s.length,0);
});

test('empty and invalid storage values are not silently discarded',()=>{
  const api=transfer();const s=storage({'vintage-kana:learning-events:v1':'{"broken":1}'});
  assert.throws(()=>api.exportRecord(s));
  assert.equal(s.getItem('vintage-kana:learning-events:v1'),'{"broken":1}');
});

test('oversized merged decipher history rejects instead of truncating',()=>{
  const api=transfer();const s=storage({
    'vintage-kana:decipher-history:v1':JSON.stringify(Array.from({length:2000},(_,i)=>decipher('d'+i))),
  });
  const incoming=JSON.stringify({app:'vintage-kana-record',exportVersion:1,
    learningEvents:[],decipherHistory:[decipher('extra')],decipherLevel:1});
  assert.throws(()=>api.previewImport(s,incoming),/2000/);
});
