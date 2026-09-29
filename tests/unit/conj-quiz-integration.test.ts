import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as engine from '../../conj/conj-quiz-engine.mjs';
import { masterFromItems,resolveQuizRecords,loadQuizRecords,normalizeHistory,recordLearningEvent } from '../../conj/conj-quiz-adapter.mjs';

const html=readFileSync(new URL('../../conj/index.html',import.meta.url),'utf8');
const items=new Function(html.match(/const F=a=>a;[\s\S]*?\n\];/)![0]+';return items;')();
const master=masterFromItems(items);
const gates={publicEnabled:true,humanApprovalStatus:'approved',quotationStatus:'approved',finalComplianceStatus:'approved',releaseQaStatus:'approved'};
const ex={...gates,exampleId:'test-only',partOfSpeech:'動詞',conjugationType:'カ行四段活用',form:'終止形',bucket:'standard',classification:'standard',formQuizEligible:true,typeQuizEligible:true};

test('quiz: master is derived from the actual item kinds, with no guessed canonical entries',()=>{
  assert.deepEqual(new Set(master.map(e=>e.conjugationType)),new Set(items.map((e:any)=>e.kind)));
  assert.ok(master.length>40);
});
test('quiz: scopes expand type families and ALL covers every official master value',()=>{
  for(const item of items){
    const example={...ex,conjugationType:item.kind,partOfSpeech:item.label};
    const sets=['near','part_of_speech','cross_pos','all'].map(scope=>engine.buildTypeChoices({example,masterEntries:master,scope,rng:()=>.5}));
    assert.ok(sets[0].length<=sets[1].length && sets[1].length<sets[2].length && sets[2].length<sets[3].length,item.kind);
    for(const choices of sets){
      assert.equal(new Set(choices.map((c:any)=>c.displayLabel)).size,choices.length);
      assert.ok(choices.some((c:any)=>c.canonicals.includes(item.kind)));
    }
    assert.deepEqual(new Set(sets[3].flatMap((c:any)=>c.canonicals)),new Set(master.map(e=>e.conjugationType)));
  }
});
test('quiz: row errors do not turn a correct verb type into a type error; input accepts kana and 行',()=>{
  assert.equal(engine.rowForType('ア行下二段活用'),'ア');
  assert.equal(engine.shortTypeLabel('ア行下二段活用'),'下二');
  assert.equal(engine.requiresRow('四段型'),false,'auxiliary verb-style types have no row question');
  for(const rowMode of ['omitted','select','input']){
    const evaluation=engine.evaluateAnswer({quizMode:'type',example:ex,selectedType:'ガ行四段活用',selectedRow:'ガ',rowMode});
    assert.equal(evaluation.typeCorrect,true);
    assert.equal(evaluation.rowCorrect,rowMode==='omitted'?null:false);
  }
  for(const selectedRow of ['カ','か','ｶ','カ行']) assert.equal(engine.evaluateAnswer({quizMode:'type',example:ex,selectedType:ex.conjugationType,selectedRow,rowMode:'input'}).correct,true);
  assert.equal(engine.evaluateAnswer({quizMode:'type',example:ex,selectedType:'カ行上二段活用',selectedRow:'カ',rowMode:'select'}).rowCorrect,true);
});
test('quiz: all publication gates must be explicit, and the actual 127 bank stays held',async()=>{
  const bank=JSON.parse(readFileSync(new URL('../../conj/data/conjugation-quiz-bank-127.meta.json',import.meta.url),'utf8'));
  assert.equal(bank.records.length,127);
  for(const record of bank.records) assert.equal(engine.isPublicQuizEligible({...record,bucket:record.classification},'form'),false);
  for(const key of Object.keys(gates)) assert.equal(engine.isPublicQuizEligible({...ex,[key]:undefined},'form'),false,key);
  assert.equal(engine.isPublicQuizEligible({...ex,bucket:'hold'},'type'),false);
  let fetches=0;
  assert.deepEqual(await loadQuizRecords(items,async()=>{fetches++;return {ok:true,json:async()=>bank} as any;}),[]);
  assert.equal(fetches,1,'held records must not trigger a quotation download');
});
test('quiz: adapter validates explicit renderer linkage, gates, target occurrence and HTML boundary',()=>{
  const metadata={records:[{...ex,partOfSpeech:'verb'}]};
  const payload={...gates,exampleId:ex.exampleId,itemId:'naku',quotationExcerpt:'検証用：鳴く。',originalTarget:'鳴く'};
  const resolve=(value:any)=>resolveQuizRecords(metadata,{records:[value]},items);
  assert.equal(resolve(payload).length,1);
  assert.equal(resolve({...payload,itemId:'miru'}).length,0);
  assert.equal(resolve({...payload,quotationStatus:'pending'}).length,0);
  assert.equal(resolve({...payload,originalTarget:'なし'}).length,0);
  assert.equal(resolve({...payload,quotationExcerpt:'鳴く、鳴く'}).length,0);
  assert.equal(resolve({...payload,quotationExcerpt:'鳴く、鳴く',targetOccurrence:1})[0].targetOccurrence,1);
  assert.equal(resolve({...payload,quotationExcerpt:'<b>鳴く</b>'}).length,0);
  assert.equal(resolveQuizRecords({records:[{...metadata.records[0],publicEnabled:false}]},{records:[payload]},items).length,0);
});
test('quiz: hints preserve the six-row renderer and record only pre-answer support',()=>{
  let state=engine.createQuizState({example:ex,quizMode:'form',supportLevel:0});
  state=engine.requestNextHint(state);assert.equal(state.hintLevel,1);
  state=engine.requestNextHint(state);assert.equal(state.hintLevel,2);assert.equal(state.hintCount,2);
  assert.equal(engine.requestNextHint(state),state);
  assert.equal(engine.requestNextHint({...state,answered:true}).hintCount,2);
  const rows=['a','b','c','d','e','f'];
  const masks=engine.FORMS.map(form=>engine.buildHintMask({quizMode:'form',hintLevel:1,example:{...ex,form},tableRows:rows}));
  masks.forEach(mask=>assert.deepEqual(mask,masks[0],'hint mask must not reveal the answer through its row pattern'));
  const event=engine.buildLearningEvent({...state,maxHintLevel:0,hintCount:0,evaluation:{correct:true},responseTimeMs:1});
  assert.equal(event.masteryEvidenceWeight,1);assert.equal(event.fullTableViewed,false);
});
test('quiz: history migration/export roundtrip preserves type/row accuracy and independent support dimensions',()=>{
  assert.equal(normalizeHistory(undefined).events.length,0);
  const event=engine.buildLearningEvent({example:ex,quizMode:'type',choiceScope:'all',rowMode:'select',initialSupportLevel:0,maxHintLevel:1,hintCount:1,selectedAnswer:ex.conjugationType,selectedRow:'ガ',evaluation:{correct:false,typeCorrect:true,rowCorrect:false},responseTimeMs:20});
  const history=recordLearningEvent(undefined,event);
  assert.deepEqual(normalizeHistory(JSON.parse(JSON.stringify(history))),history);
  assert.equal(history.events[0].typeCorrect,true);assert.equal(history.events[0].rowCorrect,false);
  assert.equal(history.byMode.type.total,1);assert.equal(history.byMode.type.hintUsed,1);
  assert.equal(history.events[0].choiceScope,'all');assert.equal(history.events[0].supportLevel,0);
});
test('quiz: bounded detailed history keeps cumulative counts and removes arbitrary imported content',()=>{
  let history:any;
  for(let i=0;i<1005;i++) history=recordLearningEvent(history,{...ex,quizMode:'form',correct:true,maxHintLevel:0,hintCount:0,quotationExcerpt:'never store quotation text'});
  assert.equal(history.events.length,1000);assert.equal(history.byMode.form.total,1005);
  assert.equal(history.byMode.form.independent,1005);assert.ok(!JSON.stringify(history).includes('never store'));
});
test('quiz: weighted draw preserves attention proportion while avoiding repeats within a bucket',()=>{
  const pool=[{...ex,exampleId:'s1'},{...ex,exampleId:'s2'},{...ex,exampleId:'a1',bucket:'attention'},{...ex,exampleId:'a2',bucket:'attention'}];
  let attention=0;
  for(let i=0;i<10000;i++){
    const result=engine.pickQuestion(pool,{quizMode:'form',lastExampleId:'a1',rng:()=>i/10000});
    if(result.bucket==='attention')attention++;
    assert.notEqual(result.exampleId,'a1');
  }
  assert.ok(Math.abs(attention/10000-1.3/3.3)<.001);
});
