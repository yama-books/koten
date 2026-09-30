import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as engine from '../../conj/conj-quiz-engine.mjs';
import { masterFromItems,buildMasterPractice,pickMasterPractice,resolveQuizRecords,loadQuizRecords,normalizeHistory,recordLearningEvent } from '../../conj/conj-quiz-adapter.mjs';

const html=readFileSync(new URL('../../conj/index.html',import.meta.url),'utf8');
const items=new Function(html.match(/const F=a=>a;[\s\S]*?\n\];/)![0]+';return items;')();
const data=(name:string)=>JSON.parse(readFileSync(new URL('../../conj/data/'+name,import.meta.url),'utf8'));
const publicAdjvRecords=data('adjectival-noun-public-examples.json').records;
const auxExampleRecords=data('aux-examples.json').records;
const paradigms=data('adjectival-noun-paradigms.json').paradigms;
const adjvItems=data('adjectival-noun-lemma-pool.json').lemmas.map((lemma:any)=>{
  const paradigm=paradigms.find((p:any)=>p.id===lemma.paradigmId);
  return {id:lemma.id,pos:'adjv',label:'形容動詞',lemma:lemma.lemma,kind:lemma.series,
    forms:paradigm.forms.map((f:any)=>f.main),forms2:paradigm.forms.map((f:any)=>f.sub),
    sourceExampleIds:lemma.exampleIds};
});
const master=masterFromItems(items);
const gates={publicEnabled:true,humanApprovalStatus:'approved',quotationStatus:'approved',finalComplianceStatus:'approved',releaseQaStatus:'approved'};
const ex={...gates,exampleId:'test-only',partOfSpeech:'動詞',conjugationType:'カ行四段活用',form:'終止形',bucket:'standard',classification:'standard',formQuizEligible:true,typeQuizEligible:true};

test('quiz: master includes current drill kinds and audited representative type templates',()=>{
  for(const kind of new Set(items.map((e:any)=>e.kind)))assert.ok(master.some(e=>e.conjugationType===kind),kind);
  assert.ok(master.some(e=>e.conjugationType==='カ行下一段活用'));
  assert.ok(master.length>40);
});
test('quiz: only published classical texts become practice, with source and verified form',()=>{
  const practice=buildMasterPractice([...items,...adjvItems],{publicAdjvRecords,auxExampleRecords});
  assert.equal(practice.type.length,180); // 102 anthology headings + 64 cleared public texts + 14 anthology auxiliaries
  assert.equal(practice.form.length,124); // 46 unambiguous headings + 64 explicitly audited + 14 audited auxiliaries
  for(const mode of ['type','form'] as const){
    for(const pos of ['動詞','形容詞','形容動詞','助動詞'])
      assert.ok(practice[mode].some((e:any)=>e.partOfSpeech===pos),mode+':'+pos);
    for(const question of practice[mode]){
      assert.equal(question.origin,'master');
      assert.ok(question.tableItem.example.includes(question.tableItem.target));
      assert.ok(question.tableItem.exampleAvailable);
      assert.ok(question.work && question.sourceLabel && question.sourceLicense);
      assert.equal(question.quotationExcerpt,undefined);
      assert.notEqual(question.tableItem.source,'練習用の短文');
      if(question.exampleId.includes('public-adjv:')){
        const source=publicAdjvRecords.find((r:any)=>question.exampleId.endsWith(r.id));
        assert.ok(source);
        assert.equal(question.sourceUrl,source.sourceUrl);
        assert.equal(question.sourceLicense,source.sourceLicense);
      }else{
        assert.equal(question.work,'小倉百人一首');
      }
    }
  }
  const prior=pickMasterPractice(practice.type,null,()=>0);
  assert.notEqual(pickMasterPractice(practice.type,prior.itemId,()=>0).itemId,prior.itemId);
  assert.ok(!practice.form.some((q:any)=>q.itemId==='naku'),'鳴く is ambiguous between 終止 and 連体');
  assert.ok(practice.form.some((q:any)=>q.itemId==='inoru' && q.form==='未然形'));
  const blocked=buildMasterPractice(items,{
    publicAdjvRecords:[{...publicAdjvRecords[0],exampleEnabledPublic:false}],
    auxExampleRecords:[auxExampleRecords.find((r:any)=>r.provenance?.corpus==='CHJ')]
  });
  assert.ok(!blocked.type.some((q:any)=>q.exampleId.includes('public-adjv:')));
  assert.ok(!blocked.type.some((q:any)=>q.partOfSpeech==='助動詞'));
  assert.ok(!JSON.stringify(blocked).includes('練習用の短文'));
});
test('quiz: type choices stay inside predicate or auxiliary lists across all scopes',()=>{
  for(const item of items){
    const example={...ex,conjugationType:item.kind,partOfSpeech:item.label};
    const sets=['near','part_of_speech','cross_pos','all'].map(scope=>engine.buildTypeChoices({example,masterEntries:master,scope,rng:()=>.5}));
    assert.ok(sets[0].length>=2,item.kind+' must have a real choice');
    assert.ok(sets[0].length<=sets[1].length && sets[1].length<=sets[2].length && sets[2].length<=sets[3].length,item.kind);
    for(const choices of sets){
      assert.equal(new Set(choices.map((c:any)=>c.displayLabel)).size,choices.length);
      assert.ok(choices.some((c:any)=>c.canonicals.includes(item.kind)));
      assert.ok(choices.every((c:any)=>(c.partOfSpeech==='助動詞')===(item.pos==='aux')));
      assert.ok(choices.every((c:any)=>typeof c.formalLabel==='string' && c.formalLabel.length>0));
    }
    assert.deepEqual(new Set(sets[3].flatMap((c:any)=>c.canonicals)),new Set(master.filter(e=>(e.partOfSpeech==='助動詞')===(item.pos==='aux')).map(e=>e.conjugationType)));
  }
});
test('quiz: formal labels fade only after independent practice within the same domain',()=>{
  const event=(partOfSpeech:string,correct=true,maxHintLevel=0)=>({quizMode:'type',partOfSpeech,correct,maxHintLevel});
  const history={events:Array.from({length:10},()=>event('動詞'))};
  assert.equal(engine.quizMasteryStage(history,'動詞'),2);
  assert.equal(engine.shouldUseShortTypeLabels(history,'形容詞'),true);
  assert.equal(engine.shouldUseShortTypeLabels(history,'助動詞'),false);
  assert.equal(engine.scopeForMasteryStage(engine.quizMasteryStage(history,'動詞')),'cross_pos');
  assert.equal(engine.quizMasteryStage({events:Array.from({length:20},()=>event('動詞'))},'動詞'),3);
  assert.equal(engine.scopeForMasteryStage(3),'all');
  assert.equal(engine.quizMasteryStage({events:[...history.events.slice(0,5),...Array.from({length:5},()=>event('動詞',true,1))]},'動詞'),1);
  assert.equal(engine.formalTypeLabel({partOfSpeech:'動詞',rowRequired:true,family:'上二',canonical:'カ行上二段活用'}),'上二段活用');
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
  const supplemental=resolveQuizRecords({records:[{...metadata.records[0],exampleId:'test-supplemental',lemma:'蹴る',conjugationType:'カ行下一段活用',form:'命令形'}]},
    {records:[{...payload,exampleId:'test-supplemental',itemId:undefined,quotationExcerpt:'球を蹴よ。',originalTarget:'蹴よ'}]},items);
  assert.equal(supplemental.length,1);
  assert.deepEqual(supplemental[0].tableItem.forms.map((row:any)=>row[0]),['け','け','ける','ける','けれ','けよ']);
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
  assert.ok(engine.buildHintMask({quizMode:'form',hintLevel:1,example:ex,tableRows:rows,masteryStage:0}).visibleIndexes.length>
    engine.buildHintMask({quizMode:'form',hintLevel:1,example:ex,tableRows:rows,masteryStage:2}).visibleIndexes.length);
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
