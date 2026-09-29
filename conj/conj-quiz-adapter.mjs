import { FORMS, isPublicQuizEligible, buildTypeCatalog } from './conj-quiz-engine.mjs';

const POS = { verb:'動詞', adj:'形容詞', adjv:'形容動詞', aux:'助動詞' };
const POS_KEYS = { verb:'verb', adjective:'adj', adjectivalVerb:'adjv', adjectival_noun:'adjv', auxiliary:'aux', ...Object.fromEntries(Object.entries(POS).map(([k,v])=>[v,k])), adj:'adj', adjv:'adjv', aux:'aux' };
export function masterFromItems(items) {
  return buildTypeCatalog(items.map(item=>({conjugationType:item.kind,partOfSpeech:POS[item.pos]})))
    .map(entry=>({...entry,conjugationType:entry.canonical}));
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
    const candidates = items.filter(item=>item.pos === pos && item.kind === record.conjugationType &&
      (text.itemId ? item.id === text.itemId : item.lemma === record.lemma));
    if (candidates.length !== 1) continue;
    const item = candidates[0];
    if (!Array.isArray(item.forms) || item.forms.length !== 6 || !FORMS.includes(record.form)) continue;
    const excerpt = text.quotationExcerpt;
    const target = text.originalTarget;
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
    result.push({...normalized, partOfSpeech:POS[pos], quotationExcerpt:excerpt, originalTarget:target,
      targetOccurrence:occurrence, source:typeof text.source === 'string' ? text.source : '',
      tableItem:{...item,example:excerpt,target,occurrence,poem:text.poem ?? null,source:text.source ?? '',exampleAvailable:true},
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
export function normalizeHistory(raw) {
  const history = raw && typeof raw === 'object' ? raw : {};
  const events = (Array.isArray(history.events) ? history.events : []).filter(e=>e && ['form','type'].includes(e.quizMode) && typeof e.exampleId === 'string').slice(-1000).map(e=>({
    exampleId:boundedText(e.exampleId),quizMode:e.quizMode,partOfSpeech:boundedText(e.partOfSpeech),
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
  return {version:1,events,byMode};
}
export function recordLearningEvent(history,event) {
  const result=normalizeHistory(history);
  const entry=normalizeHistory({events:[event]}).events[0];
  if (!entry) return result;
  const count=result.byMode[entry.quizMode];
  count.total++; if(entry.correct) count.correct++;
  if(entry.correct && entry.maxHintLevel === 0) count.independent++;
  if(entry.hintCount > 0) count.hintUsed++;
  result.events=[...result.events,entry].slice(-1000);
  return result;
}
