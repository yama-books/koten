import { FORMS, isPublicQuizEligible, buildTypeCatalog } from './conj-quiz-engine.mjs?v=20261006-18';

const POS = { verb:'動詞', adj:'形容詞', adjv:'形容動詞', aux:'助動詞' };
const POS_KEYS = { verb:'verb', adjective:'adj', adjectivalVerb:'adjv', adjectival_noun:'adjv', auxiliary:'aux', ...Object.fromEntries(Object.entries(POS).map(([k,v])=>[v,k])), adj:'adj', adjv:'adjv', aux:'aux' };
// The representative audit includes thirteen regular school-grammar kinds
// without a heading in today's drill master. These suffix tables let those
// examples use the same six-row renderer without adding unrelated drill cards.
const QUIZ_TABLE_TEMPLATES = {
  'ア行下二段活用':['え','え','う','うる','うれ','えよ'],
  'カ行上一段活用':['き','き','きる','きる','きれ','きよ'],
  'カ行上二段活用':['き','き','く','くる','くれ','きよ'],
  'カ行下一段活用':['け','け','ける','ける','けれ','けよ'],
  'サ行下二段活用':['せ','せ','す','する','すれ','せよ'],
  'タ行下二段活用':['て','て','つ','つる','つれ','てよ'],
  'ナ行上一段活用':['に','に','にる','にる','にれ','によ'],
  'バ行四段活用':['ば','び','ぶ','ぶ','べ','べ'],
  'ヤ行上一段活用':['い','い','いる','いる','いれ','いよ'],
  'ヤ行上二段活用':['い','い','ゆ','ゆる','ゆれ','いよ'],
  'ラ行上二段活用':['り','り','る','るる','るれ','りよ'],
  'ワ行上一段活用':['ゐ','ゐ','ゐる','ゐる','ゐれ','ゐよ'],
  'ワ行下二段活用':['ゑ','ゑ','う','うる','うれ','ゑよ'],
};
export function masterFromItems(items) {
  return buildTypeCatalog([...items.map(item=>({conjugationType:item.kind,partOfSpeech:POS[item.pos]})),
    ...Object.keys(QUIZ_TABLE_TEMPLATES).map(kind=>({conjugationType:kind,partOfSpeech:'動詞'}))])
    .map(entry=>({...entry,conjugationType:entry.canonical}));
}

// The practice pool uses texts already present in the published drill or
// individually cleared public-text records. Never synthesize a sentence.
export function buildMasterPractice(items,{publicAdjvRecords=[],auxExampleRecords=[]}={}) {
  const result={form:[],type:[]};
  const byId=new Map(items.map(item=>[item.id,item]));
  const rows=item=>item.forms.map((main,i)=>[
    ...(Array.isArray(main)?main:[]),...(Array.isArray(item.forms2?.[i])?item.forms2[i]:[])
  ]);
  const validItem=item=>item?.id && item.kind && POS[item.pos] && Array.isArray(item.forms) && item.forms.length===6;
  const validText=(example,target,occurrence)=>{
    if(typeof example!=='string' || typeof target!=='string' || !target || /[<>【】]/u.test(example+target))return false;
    const count=example.split(target).length-1;
    return count>0 && Number.isInteger(occurrence) && occurrence>=0 && occurrence<count;
  };
  const add=(item,record,{formIndex=null,tableValue=null}={})=>{
    if(!validItem(item) || !validText(record.example,record.target,record.occurrence))return;
    const tableItem={...item,example:record.example,target:record.target,occurrence:record.occurrence,
      poem:record.poem??null,source:record.work,sourceLabel:record.sourceLabel,
      sourceUrl:record.sourceUrl??null,sourceLicense:record.sourceLicense,exampleAvailable:true};
    const base={origin:'master',itemId:item.id,partOfSpeech:POS[item.pos],lemma:item.lemma,
      conjugationType:item.kind,bucket:'standard',work:record.work,sourceLabel:record.sourceLabel,
      sourceUrl:record.sourceUrl??null,sourceLicense:record.sourceLicense,tableItem};
    result.type.push({...base,exampleId:'master:type:'+record.id,form:null});
    if(Number.isInteger(formIndex) && formIndex>=0 && formIndex<6 && tableValue)
      result.form.push({...base,exampleId:'master:form:'+record.id,form:FORMS[formIndex],tableValue});
  };
  for(const item of items){
    if(!validItem(item) || !Number.isInteger(item.poem) || item.poem<1 || item.poem>100)continue;
    // Existing 百人一首 headings have no audited formIndex. Only a suffix
    // belonging to exactly one row can support a form question.
    const target=item.target;
    const matching=typeof target==='string' ? rows(item).flatMap((row,i)=>row
      .filter(value=>typeof value==='string' && value && target.endsWith(value))
      .map(value=>({formIndex:i,tableValue:value}))) : [];
    const distinctRows=new Set(matching.map(x=>x.formIndex));
    const form=distinctRows.size===1 ? matching.sort((a,b)=>b.tableValue.length-a.tableValue.length)[0] : null;
    add(item,{id:'hyakunin:'+item.id,example:item.example,target,occurrence:item.occurrence??0,
      poem:item.poem,work:'小倉百人一首',sourceLabel:'『小倉百人一首』第'+item.poem+'首',
      sourceUrl:null,sourceLicense:'public domain'},form??{});
  }
  for(const record of publicAdjvRecords){
    if(record?.exampleEnabledPublic!==true || record.rightsVerified!==true || record.targetVerified!==true || record.excerptReviewed!==true)continue;
    if(!record.sourceExampleId || !record.sourceLabel || !record.sourceUrl || !record.sourceLicense || !record.work)continue;
    // The existing drill already owns a few lemma headings, so the runtime
    // intentionally skips duplicate lemma IDs. Match that heading by its
    // unique lemma when the audited runtime ID was not added.
    const sameLemma=items.filter(candidate=>candidate.pos==='adjv' && candidate.lemma===record.lemma);
    const item=byId.get(record.lemmaId)??(sameLemma.length===1?sameLemma[0]:null);
    if(item?.pos!=='adjv' || (item.sourceExampleIds
      ? !item.sourceExampleIds.includes(record.sourceExampleId)
      : item.lemma!==record.lemma))continue;
    const formIndex=FORMS.indexOf(record.form);
    const values=rows(item)[formIndex]||[];
    const tableValue=values.filter(value=>record.publicTarget?.endsWith(value)).sort((a,b)=>b.length-a.length)[0];
    if(!tableValue)continue;
    add(item,{id:'public-adjv:'+record.id,example:record.example,target:record.publicTarget,occurrence:0,
      poem:null,work:record.work,sourceLabel:record.sourceLabel,
      sourceUrl:record.sourceUrl,sourceLicense:record.sourceLicense},{formIndex,tableValue});
  }
  for(const record of auxExampleRecords){
    if(record?.origin!=='builtin' || record.work!=='小倉百人一首' || !Number.isInteger(record.poem) || record.poem<1 || record.poem>100)continue;
    const item=byId.get(record.itemId);
    if(item?.pos!=='aux' || record.form!==FORMS[record.formIndex])continue;
    const values=rows(item)[record.formIndex]||[];
    if(!values.includes(record.normalizedKey))continue;
    add(item,{id:record.id,example:record.example,target:record.target,occurrence:record.occurrence,
      poem:record.poem,work:record.work,sourceLabel:'『小倉百人一首』第'+record.poem+'首',
      sourceUrl:null,sourceLicense:'public domain'},
      {formIndex:record.formIndex,tableValue:record.normalizedKey});
  }
  return result;
}

export function pickMasterPractice(records,lastItemId=null,rng=Math.random) {
  if(!records.length)return null;
  const ids=[...new Set(records.map(record=>record.itemId))];
  const choices=ids.length>1?ids.filter(id=>id!==lastItemId):ids;
  const itemId=choices[Math.min(choices.length-1,Math.floor(rng()*choices.length))];
  const forms=records.filter(record=>record.itemId===itemId);
  return forms[Math.min(forms.length-1,Math.floor(rng()*forms.length))];
}

// Metadata owns the public gates. A quotation payload cannot promote a held record.
// New runtime records need an explicit itemId when lemma + official type is not unique.
export function resolveQuizRecords(metadata, quotations, items) {
  const texts = new Map((quotations?.records || []).map(record=>[record.exampleId,record]));
  const result = [];
  for (const record of metadata?.records || []) {
    const normalized = {...record, bucket:record.classification ?? record.bucket};
    if (!isPublicQuizEligible(normalized,'form') && !isPublicQuizEligible(normalized,'type')) continue;
    const text = texts.get(record.exampleId);
    if (!text || ['quotationStatus','finalComplianceStatus','releaseQaStatus'].some(g=>text[g] !== 'approved')) continue;
    const pos = POS_KEYS[record.partOfSpeech];
    const kindItems = items.filter(item=>item.pos === pos && item.kind === record.conjugationType);
    const candidates = kindItems.filter(item=>text.itemId ? item.id === text.itemId : item.lemma === record.lemma);
    // A representative table of the exact same part of speech and conjugation
    // type supplies the six suffix rows when the quoted lemma is not a drill
    // heading. An explicit itemId must still resolve exactly.
    const supplemental = !text.itemId && pos === 'verb' && QUIZ_TABLE_TEMPLATES[record.conjugationType]
      ? {id:'quiz-template:'+record.conjugationType,pos:'verb',label:'動詞',kind:record.conjugationType,
          lemma:record.lemma,forms:QUIZ_TABLE_TEMPLATES[record.conjugationType].map(value=>[value])} : null;
    const item = candidates.length === 1 ? candidates[0] : !text.itemId && candidates.length === 0 ? kindItems[0] ?? supplemental : null;
    if(!item)continue;
    if (!Array.isArray(item.forms) || item.forms.length !== 6 || !FORMS.includes(record.form)) continue;
    // A reviewed revised orthography (dakuten, historical kana) is what learners see;
    // the CHJ wording stays in quotationExcerpt / originalTarget.
    const shown = text.display && typeof text.display === 'object' ? text.display : null;
    const excerpt = shown ? shown.excerpt : text.quotationExcerpt;
    const target = shown ? shown.target : text.originalTarget;
    if (typeof excerpt !== 'string' || typeof target !== 'string' || !target || /[<>【】]/u.test(excerpt+target)) continue;
    // Match the same whitespace-compacted text the existing renderer highlights.
    const compact = excerpt.replace(/[　 ]+/g,'');
    const compactTarget = target.replace(/[　 ]+/g,'');
    const positions = []; let from = 0;
    while (compactTarget && compact.indexOf(compactTarget,from) >= 0) {
      const at=compact.indexOf(compactTarget,from); positions.push(at); from=at+compactTarget.length;
    }
    const occurrence = record.targetOccurrence ?? text.targetOccurrence ?? (positions.length === 1 ? 0 : null);
    if (!Number.isInteger(occurrence) || occurrence < 0 || occurrence >= positions.length) continue;
    result.push({...normalized, itemId:item.id, partOfSpeech:POS[pos], quotationExcerpt:excerpt, originalTarget:target,
      targetOccurrence:occurrence, source:typeof text.source === 'string' ? text.source : '',
      tableItem:{...item,id:'quiz:'+record.exampleId,lemma:record.lemma,example:excerpt,target,occurrence,poem:text.poem ?? null,source:text.source ?? '',exampleAvailable:true},
    });
  }
  return result;
}

export async function loadQuizRecords(items, fetcher = fetch) {
  const response = await fetcher('./data/conjugation-quiz-bank-127.meta.json');
  if (!response.ok) throw new Error('quiz metadata unavailable');
  const metadata = await response.json();
  // No text fetch for the current all-held bank; never use other examples as a fallback.
  if (!(metadata.records || []).some(r=>isPublicQuizEligible({...r,bucket:r.classification},'form') || isPublicQuizEligible({...r,bucket:r.classification},'type'))) return [];
  const texts = await fetcher('./data/conjugation-quiz-examples.json');
  if (!texts.ok) throw new Error('quiz quotations unavailable');
  return resolveQuizRecords(metadata,await texts.json(),items);
}

const number = value => Number.isFinite(Number(value)) ? Math.max(0,Number(value)) : 0;
const bool = value => typeof value === 'boolean' ? value : null;
const boundedText = value => typeof value === 'string' ? value.slice(0,200) : null;
// Running totals are kept apart from the capped event log so that the record
// screen can count every answer ever given. Cells are itemId:formIndex, the
// same cell the table drill records as itemId:row:formIndex.
const POS_FROM_LABEL = Object.fromEntries(Object.entries(POS).map(([k,v])=>[v,k]));
const emptyTotals = () => ({correct:0,total:0,byPos:{verb:0,adj:0,adjv:0,aux:0},
  byForm:Object.fromEntries(FORMS.map(form=>[form,{c:0,n:0}])),byItem:{},byCell:{}});
const countPair = value => {
  const n=number(value?.n);
  return {c:Math.min(n,number(value?.c)),n};
};
const boundedMap = (source,validKey) => Object.fromEntries(Object.entries(source && typeof source === 'object' ? source : {})
  .filter(([key])=>typeof key === 'string' && key.length <= 200 && validKey(key)).map(([key,value])=>[key,countPair(value)]).filter(([,value])=>value.n>0));
function normalizeTotals(raw) {
  const totals=emptyTotals();
  totals.total=number(raw.total);
  totals.correct=Math.min(totals.total,number(raw.correct));
  for(const pos of Object.keys(totals.byPos))totals.byPos[pos]=number(raw.byPos?.[pos]);
  for(const form of FORMS)totals.byForm[form]=countPair(raw.byForm?.[form]);
  totals.byItem=boundedMap(raw.byItem,()=>true);
  totals.byCell=boundedMap(raw.byCell,key=>/^.+:[0-5]$/.test(key));
  return totals;
}
function addToTotals(totals,entry) {
  const add=(map,key)=>{const pair=map[key]||(map[key]={c:0,n:0});pair.n++;if(entry.correct)pair.c++;};
  totals.total++; if(entry.correct) totals.correct++;
  const pos=POS_FROM_LABEL[entry.partOfSpeech];
  if(pos) totals.byPos[pos]++;
  const formIndex=FORMS.indexOf(entry.form);
  // Only a form question grades the form; a type question with a known form
  // still marks that cell as tried.
  if(entry.quizMode === 'form' && formIndex >= 0) add(totals.byForm,entry.form);
  if(entry.itemId){
    add(totals.byItem,entry.itemId);
    if(formIndex >= 0) add(totals.byCell,entry.itemId+':'+formIndex);
  }
}
// Old records hold only the event log. Their totals are rebuilt once, from the
// events that remain, when a resolver can name each example's drill item.
// Until then totals stay null so that the migration is not done without items.
export function normalizeHistory(raw,{resolveItemId=null}={}) {
  const history = raw && typeof raw === 'object' ? raw : {};
  const events = (Array.isArray(history.events) ? history.events : []).filter(e=>e && ['form','type'].includes(e.quizMode) && typeof e.exampleId === 'string').slice(-1000).map(e=>({
    exampleId:boundedText(e.exampleId),itemId:boundedText(e.itemId),quizMode:e.quizMode,partOfSpeech:boundedText(e.partOfSpeech),
    conjugationType:boundedText(e.conjugationType),form:boundedText(e.form),
    choiceScope:['near','part_of_speech','cross_pos','all'].includes(e.choiceScope) ? e.choiceScope : 'near',
    rowMode:['omitted','select','input'].includes(e.rowMode) ? e.rowMode : 'omitted',
    initialSupportLevel:Math.min(2,number(e.initialSupportLevel)),supportLevel:Math.min(2,number(e.initialSupportLevel)),
    maxHintLevel:Math.min(2,number(e.maxHintLevel)),hintCount:number(e.hintCount),
    selectedAnswer:boundedText(e.selectedAnswer),selectedRow:boundedText(e.selectedRow),
    correct:e.correct === true,formCorrect:bool(e.formCorrect),typeCorrect:bool(e.typeCorrect),rowCorrect:bool(e.rowCorrect),
    partialTableViewed:e.partialTableViewed === true,fullTableViewed:e.fullTableViewed === true,
    questionDifficulty:boundedText(e.questionDifficulty) ?? (typeof e.questionDifficulty === 'number' ? number(e.questionDifficulty) : null),
    responseTimeMs:number(e.responseTimeMs),masteryEvidenceWeight:Math.min(1,number(e.masteryEvidenceWeight)),
    standardOrAttention:e.standardOrAttention === 'attention' ? 'attention' : 'standard',answeredAt:boundedText(e.answeredAt),
  }));
  const byMode = Object.fromEntries(['form','type'].map(mode=>{
    const source=history.byMode?.[mode] || {};
    const count = key => Math.max(number(source[key]),events.filter(e=>e.quizMode === mode && (key === 'total' || (key === 'correct' ? e.correct : key === 'independent' ? e.correct && e.maxHintLevel === 0 : e.hintCount > 0))).length);
    const total = count('total');
    return [mode,{total,correct:Math.min(total,count('correct')),independent:Math.min(total,count('independent')),hintUsed:Math.min(total,count('hintUsed'))}];
  }));
  let totals = history.totals && typeof history.totals === 'object' ? normalizeTotals(history.totals) : null;
  if (!totals && (!events.length || typeof resolveItemId === 'function')) {
    totals = emptyTotals();
    for (const e of events) addToTotals(totals,{...e,itemId:e.itemId ?? boundedText(resolveItemId?.(e.exampleId) ?? null)});
  }
  return {version:1,events,byMode,totals};
}
export function recordLearningEvent(history,event,{resolveItemId=null}={}) {
  const result=normalizeHistory(history,{resolveItemId:resolveItemId ?? (()=>null)});
  const entry=normalizeHistory({events:[event]}).events[0];
  if (!entry) return result;
  const count=result.byMode[entry.quizMode];
  count.total++; if(entry.correct) count.correct++;
  if(entry.correct && entry.maxHintLevel === 0) count.independent++;
  if(entry.hintCount > 0) count.hintUsed++;
  addToTotals(result.totals,entry);
  result.events=[...result.events,entry].slice(-1000);
  return result;
}
