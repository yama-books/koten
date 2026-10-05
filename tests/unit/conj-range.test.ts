import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../../conj/conj-range.js';

const range=(globalThis as any).ConjRange;
const html=readFileSync(new URL('../../conj/index.html',import.meta.url),'utf8');
const items=new Function(html.match(/const F=a=>a;[\s\S]*?\n\];/)![0]+';return items;')();

function memoryStorage(initial:string|null=null){
  let value=initial;
  return {
    getItem:(key:string)=>key===range.STORAGE_KEY?value:null,
    setItem:(key:string,next:string)=>{ if(key===range.STORAGE_KEY)value=next; },
    value:()=>value
  };
}

test('range: preset all expands to every family and current auxiliary item id',()=>{
  const selection=range.normalize({version:1,preset:'all'},items);
  assert.equal(selection.version,1);
  assert.equal(selection.preset,'all');
  assert.deepEqual(selection.verbFamilies,range.VERB_FAMILIES);
  assert.deepEqual(selection.adjectiveFamilies,range.ADJECTIVE_FAMILIES);
  assert.deepEqual(
    new Set(selection.auxiliaryItemIds),
    new Set(items.filter((item:any)=>item.pos==='aux').map((item:any)=>item.id))
  );
});

test('range: preset all has no unclassified current drill item',()=>{
  const selection=range.normalize({version:1,preset:'all'},items);
  assert.deepEqual(range.diagnostics(selection,items).unmatchedItems,[]);
  assert.equal(range.filterItems(selection,items).length,items.length);
  for(const item of items.filter((entry:any)=>entry.pos==='verb')){
    assert.ok(range.VERB_FAMILIES.includes(range.verbFamily(item)),item.kind);
  }
});

test('range: verb and adjective family classification follows the canonical §42 families',()=>{
  const byId=new Map(items.map((item:any)=>[item.id,item]));
  assert.equal(range.verbFamily(byId.get('naku')),'yodan');
  assert.equal(range.verbFamily(byId.get('miru')),'kami_ichidan');
  assert.equal(range.verbFamily(byId.get('kohu')),'kami_nidan');
  assert.equal(range.verbFamily(byId.get('nu_verb')),'shimo_nidan');
  assert.equal(range.verbFamily(byId.get('ku')),'ka_hen');
  assert.equal(range.verbFamily(byId.get('su_verb')),'sa_hen');

  assert.equal(range.adjectiveFamily(byId.get('usi')),'ku');
  assert.equal(range.adjectiveFamily(byId.get('kanasi')),'shiku');
  assert.equal(range.adjectiveFamily(byId.get('itadura')),'nari');
  assert.equal(range.adjectiveFamily({id:'runtime-tari',pos:'adjv',kind:'タリ活用'}),'tari');
});

test('range: custom selection filters all modes by the same item contract',()=>{
  const selection=range.normalize({
    version:1,
    preset:'custom',
    verbFamilies:['yodan'],
    adjectiveFamilies:['shiku','tari'],
    auxiliaryItemIds:['nari_hearsay_aux','tari_assert_aux']
  },items);
  const filtered=range.filterItems(selection,[
    {id:'v1',pos:'verb',kind:'カ行四段活用'},
    {id:'v2',pos:'verb',kind:'マ行上一段活用'},
    {id:'a1',pos:'adj',kind:'シク活用'},
    {id:'a2',pos:'adj',kind:'ク活用'},
    {id:'j1',pos:'adjv',kind:'タリ活用'},
    {id:'nari_hearsay_aux',pos:'aux',kind:'ラ変型'},
    {id:'nari_assert_aux',pos:'aux',kind:'形容動詞（ナリ活用）型'},
    {id:'tari_assert_aux',pos:'aux',kind:'形容動詞（タリ活用）型'}
  ]);
  assert.deepEqual(filtered.map((item:any)=>item.id),['v1','a1','j1','nari_hearsay_aux','tari_assert_aux']);
});

test('range: auxiliary selection is keyed by item id so same spellings stay distinct',()=>{
  const selection=range.normalize({
    version:1,preset:'custom',verbFamilies:[],adjectiveFamilies:[],
    auxiliaryItemIds:['nari_hearsay_aux','tari_comp_aux']
  },items);
  const byId=new Map(items.map((item:any)=>[item.id,item]));
  assert.equal(range.matchesItem(selection,byId.get('nari_hearsay_aux')),true);
  assert.equal(range.matchesItem(selection,byId.get('nari_assert_aux')),false);
  assert.equal(range.matchesItem(selection,byId.get('tari_comp_aux')),true);
  assert.equal(range.matchesItem(selection,byId.get('tari_assert_aux')),false);
});

test('range: load/save normalizes malformed data and preserves unknown custom auxiliary ids for diagnostics',()=>{
  const storage=memoryStorage(JSON.stringify({
    version:99,
    preset:'custom',
    verbFamilies:['yodan','not-a-family','yodan'],
    adjectiveFamilies:['nari','bad'],
    auxiliaryItemIds:['future_aux','future_aux','nari_assert_aux',12]
  }));
  const loaded=range.load(storage,items);
  assert.deepEqual(loaded.verbFamilies,['yodan']);
  assert.deepEqual(loaded.adjectiveFamilies,['nari']);
  assert.deepEqual(loaded.auxiliaryItemIds,['future_aux','nari_assert_aux']);
  assert.deepEqual(range.diagnostics(loaded,items).unknownAuxiliaryItemIds,['future_aux']);

  const saved=range.save(storage,loaded,items);
  assert.deepEqual(JSON.parse(storage.value()!),saved);
  assert.equal(saved.version,1);
});

test('range: legacy pos bridge writes range state without making the old select the filter source',()=>{
  const adj=range.fromLegacyPos('adj',items);
  assert.equal(adj.preset,'custom');
  assert.deepEqual(adj.adjectiveFamilies,['ku','shiku']);
  assert.deepEqual(adj.verbFamilies,[]);
  assert.deepEqual(adj.auxiliaryItemIds,[]);

  const adjv=range.fromLegacyPos('adjv',items);
  assert.deepEqual(adjv.adjectiveFamilies,['nari','tari']);
  assert.equal(range.legacyPosForSelection(range.normalize({preset:'adjective'},items)),'all');
  assert.equal(range.legacyPosForSelection(range.normalize({preset:'verb'},items)),'verb');
  assert.equal(range.legacyPosForSelection(range.normalize({preset:'aux'},items)),'aux');
});

test('range: autoTableLevel follows the §42-4 mastery thresholds',()=>{
  const keys=Array.from({length:30},(_,i)=>`x:main:${i}`);
  assert.equal(range.autoTableLevel({},keys),1);
  assert.equal(range.autoTableLevel({'x:main:0':{c:1,w:0}},[]),1);
  const all=Object.fromEntries(keys.slice(0,24).map(key=>[key,{c:2,w:0}]));
  assert.equal(range.autoTableLevel(all,keys),7);
  // 12/24 distinct, all correct: coverage .5 -> mastery .5 -> Lv4
  const half=Object.fromEntries(keys.slice(0,12).map(key=>[key,{c:1,w:0}]));
  assert.equal(range.autoTableLevel(half,keys),4);
  // slots outside the selection are ignored
  assert.equal(range.autoTableLevel({'y:main:0':{c:5,w:0}},keys),1);
});
