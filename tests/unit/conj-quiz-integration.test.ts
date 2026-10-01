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
  const existing=new Set(items.filter((e:any)=>e.pos==='adjv').map((e:any)=>e.lemma));
  const runtimeItems=[...items,...adjvItems.filter((e:any)=>!existing.has(e.lemma))];
  const practice=buildMasterPractice(runtimeItems,{publicAdjvRecords,auxExampleRecords});
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
  assert.ok(practice.form.some((q:any)=>q.exampleId==='master:form:public-adjv:public-adjv-019' && q.itemId==='itadura' && q.form==='已然形'));
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
test('quiz: all publication gates must be explicit; the 125 audited records resolve and 未確認 stays held',async()=>{
  const bank=data('conjugation-quiz-bank-127.meta.json');
  const quotations=data('conjugation-quiz-examples.json');
  assert.equal(bank.records.length,127);
  const eligible=bank.records.filter((record:any)=>engine.isPublicQuizEligible({...record,bucket:record.classification},'form'));
  assert.equal(eligible.length,125);
  for(const id of ['aux-289','aux-290']) assert.ok(!eligible.some((record:any)=>record.exampleId===id),id);
  for(const key of Object.keys(gates)) assert.equal(engine.isPublicQuizEligible({...ex,[key]:undefined},'form'),false,key);
  assert.equal(engine.isPublicQuizEligible({...ex,bucket:'hold'},'type'),false);
  // The runtime merges adjectival-noun items before the quiz loads; タリ活用 examples need them.
  const runtimeItems=[...items,...adjvItems];
  const urls:string[]=[];
  const loaded=await loadQuizRecords(runtimeItems,async(url:string)=>{urls.push(url);return {ok:true,json:async()=>url.endsWith('-examples.json')?quotations:bank} as any;});
  assert.deepEqual(urls,['./data/conjugation-quiz-bank-127.meta.json','./data/conjugation-quiz-examples.json']);
  assert.deepEqual(loaded.map((record:any)=>record.exampleId),eligible.map((record:any)=>record.exampleId));
  // Repeated targets resolve to the reviewed occurrence, not the first match.
  const byId=new Map(loaded.map((record:any)=>[record.exampleId,record]));
  assert.equal(byId.get('aux-012').targetOccurrence,0);
  assert.equal(byId.get('aux-013').targetOccurrence,1);
  assert.equal(byId.get('aux-055').targetOccurrence,1);
  // A quotation payload cannot open a held record by itself.
  const held=bank.records.find((record:any)=>record.exampleId==='aux-289');
  assert.equal(resolveQuizRecords({records:[held]},{records:[{...gates,exampleId:'aux-289',quotationExcerpt:'検証用：たし',originalTarget:'たし'}]},runtimeItems).length,0);
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
test('quiz: running totals count every answer by item, cell, form and part of speech, beyond the 1000-event log',()=>{
  let history:any;
  for(let i=0;i<1005;i++) history=recordLearningEvent(history,{...ex,itemId:'nu_verb',partOfSpeech:'動詞',quizMode:'form',form:'連体形',correct:i%5!==0,maxHintLevel:0,hintCount:0});
  history=recordLearningEvent(history,{...ex,itemId:'zu',partOfSpeech:'助動詞',quizMode:'type',form:null,correct:true,maxHintLevel:0,hintCount:0});
  assert.equal(history.events.length,1000);
  const totals=history.totals;
  assert.equal(totals.total,1006);assert.equal(totals.correct,805);
  assert.deepEqual(totals.byPos,{verb:1005,adj:0,adjv:0,aux:1});
  assert.deepEqual(totals.byForm['連体形'],{c:804,n:1005});
  // a type question grades the item, not a form or a cell
  assert.deepEqual(totals.byItem.zu,{c:1,n:1});assert.equal(totals.byCell['zu:3'],undefined);
  assert.deepEqual(totals.byCell['nu_verb:3'],{c:804,n:1005});
  // export/import is a JSON roundtrip of stats, and the totals survive it
  assert.deepEqual(normalizeHistory(JSON.parse(JSON.stringify(history))),history);
});
test('quiz: old records move their remaining events into totals once, only when examples can be named',()=>{
  const old={version:1,byMode:{form:{total:40,correct:30}},events:[
    {exampleId:'master:form:hyakunin:nu_verb',quizMode:'form',partOfSpeech:'動詞',form:'連用形',correct:true,maxHintLevel:0,hintCount:0},
    {exampleId:'master:type:aux-zu-001',quizMode:'type',partOfSpeech:'助動詞',form:null,correct:false,maxHintLevel:1,hintCount:1},
  ]};
  // before the practice pool loads there is no resolver: keep the log and wait
  assert.equal(normalizeHistory(old).totals,null);
  assert.equal(normalizeHistory(JSON.parse(JSON.stringify(normalizeHistory(old)))).totals,null);
  const ids:Record<string,string>={'master:form:hyakunin:nu_verb':'nu_verb','master:type:aux-zu-001':'zu'};
  const migrated=normalizeHistory(old,{resolveItemId:(id:string)=>ids[id]});
  assert.equal(migrated.totals.total,2);assert.equal(migrated.totals.correct,1);
  assert.deepEqual(migrated.totals.byItem,{nu_verb:{c:1,n:1},zu:{c:0,n:1}});
  assert.deepEqual(migrated.totals.byCell,{'nu_verb:1':{c:1,n:1}});
  assert.equal(migrated.byMode.form.total,40);
  // once totals exist they are never rebuilt from the log again
  const again=normalizeHistory({...migrated,events:[...migrated.events,...migrated.events]},{resolveItemId:(id:string)=>ids[id]});
  assert.equal(again.totals.total,2);
  // an empty history needs no resolver
  assert.deepEqual(normalizeHistory(undefined).totals.byPos,{verb:0,adj:0,adjv:0,aux:0});
});
test('quiz: imported totals are clamped to sane counts',()=>{
  const history=normalizeHistory({events:[],totals:{total:3,correct:9,byPos:{verb:-2,aux:'x'},byForm:{'未然形':{c:5,n:2}},
    byItem:{a:{c:1,n:1},b:{c:0,n:0}},byCell:{'a:2':{c:1,n:1},'a:9':{c:1,n:1},bad:{c:1,n:1}}}});
  assert.equal(history.totals.correct,3);
  assert.deepEqual(history.totals.byPos,{verb:0,adj:0,adjv:0,aux:0});
  assert.deepEqual(history.totals.byForm['未然形'],{c:2,n:2});
  assert.deepEqual(history.totals.byItem,{a:{c:1,n:1}});
  assert.deepEqual(history.totals.byCell,{'a:2':{c:1,n:1}});
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
