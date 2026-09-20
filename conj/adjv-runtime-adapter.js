(function(global){
  "use strict";

  const DEFAULT_BASE="./data/";

  async function fetchJson(url){
    const res=await fetch(url,{cache:"no-store"});
    if(!res.ok) throw new Error("Failed to load "+url+": "+res.status);
    return res.json();
  }

  function formArrays(paradigm){
    const forms=paradigm.forms
      .slice()
      .sort((a,b)=>a.formIndex-b.formIndex)
      .map(x=>Array.isArray(x.main)?x.main.slice():[]);
    const forms2=paradigm.forms
      .slice()
      .sort((a,b)=>a.formIndex-b.formIndex)
      .map(x=>(Array.isArray(x.sub)&&x.sub.length)?x.sub.slice():null);
    return {forms,forms2};
  }

  function annotationMap(lexical){
    return new Map((lexical?.annotations||[]).map(a=>[a.id,a]));
  }

  function stableField(exampleIds,aMap,field){
    if(!Array.isArray(exampleIds)||!exampleIds.length) return null;
    const values=[];
    for(const id of exampleIds){
      const annotation=aMap.get(id);
      if(!annotation || annotation[field]===undefined || annotation[field]===null || annotation[field]===""){
        return null;
      }
      values.push(annotation[field]);
    }
    return values.every(value=>value===values[0]) ? values[0] : null;
  }

  function lemmaLexical(lemma,aMap){
    const ids=lemma.exampleIds||[];
    const displayStem=stableField(ids,aMap,"displayLemma");
    const suffix=lemma.paradigmId==="adjv-tari" ? "たり" : "なり";
    const questionFrequency=stableField(ids,aMap,"questionFrequency")||"standard";
    return {
      displayLemma:displayStem ? displayStem+suffix : lemma.lemma,
      kanjiAid:stableField(ids,aMap,"kanjiAid"),
      targetReading:stableField(ids,aMap,"targetReading"),
      questionFrequency,
      questionWeight:questionFrequency==="lower" ? 0.6 : 1
    };
  }

  function validateRuntime(runtime){
    const errors=[];
    const {paradigms,lemmaPool,examples,audit,lexical}=runtime;

    if(!paradigms || !Array.isArray(paradigms.paradigms)) errors.push("paradigms missing");
    if(!lemmaPool || !Array.isArray(lemmaPool.lemmas)) errors.push("lemma pool missing");
    if(!examples || !Array.isArray(examples.records)) errors.push("example index missing");
    if(!audit || audit.status!=="passed") errors.push("integration audit is not passed");
    if(!lexical || !Array.isArray(lexical.annotations)) errors.push("lexical annotations missing");

    const pMap=new Map((paradigms?.paradigms||[]).map(p=>[p.id,p]));
    for(const lemma of lemmaPool?.lemmas||[]){
      if(!pMap.has(lemma.paradigmId)) errors.push("unknown paradigm for lemma "+lemma.id);
    }

    if((examples?.records||[]).length!==120) errors.push("example record count != 120");
    if((audit?.checks?.unmapped??1)!==0) errors.push("audit unmapped != 0");
    if((audit?.checks?.disabledCellReferences??1)!==0) errors.push("disabled cell referenced");
    if((audit?.checks?.targetAuditPassed??0)!==120) errors.push("target audit != 120");

    const exampleIds=new Set((examples?.records||[]).map(r=>r.id));
    const seen=new Set();
    for(const annotation of lexical?.annotations||[]){
      if(seen.has(annotation.id)) errors.push("duplicate lexical annotation "+annotation.id);
      seen.add(annotation.id);
      if(!exampleIds.has(annotation.id)) errors.push("unknown lexical example "+annotation.id);
      if(Object.prototype.hasOwnProperty.call(annotation,"learnerGloss")){
        errors.push("context gloss must not be in lemma-level lexical data: "+annotation.id);
      }
    }

    return {ok:errors.length===0,errors};
  }

  function buildTableItems(runtime){
    const pMap=new Map(runtime.paradigms.paradigms.map(p=>[p.id,p]));
    const aMap=annotationMap(runtime.lexical);
    return runtime.lemmaPool.lemmas.map(lemma=>{
      const paradigm=pMap.get(lemma.paradigmId);
      if(!paradigm) throw new Error("Unknown paradigm: "+lemma.paradigmId);
      const {forms,forms2}=formArrays(paradigm);
      const lexical=lemmaLexical(lemma,aMap);
      return {
        id:lemma.id,
        pos:"adjv",
        label:"形容動詞",
        lemma:lexical.displayLemma,
        canonicalLemma:lemma.lemma,
        kanjiAid:lexical.kanjiAid,
        targetReading:lexical.targetReading,
        questionFrequency:lexical.questionFrequency,
        questionWeight:lexical.questionWeight,
        kind:lemma.series,
        adjv:true,
        twoTrack:true,
        forms,
        forms2,
        paradigmId:lemma.paradigmId,
        exampleAvailable:false,
        sourceExampleIds:lemma.exampleIds.slice()
      };
    });
  }

  function buildExampleRefs(runtime){
    return runtime.examples.records
      .filter(r=>r.exampleEnabled!==false)
      .map(r=>({...r}));
  }

  async function load(options={}){
    const base=options.base||DEFAULT_BASE;
    const [paradigms,lemmaPool,examples,audit,lexical]=await Promise.all([
      fetchJson(base+"adjectival-noun-paradigms.json"),
      fetchJson(base+"adjectival-noun-lemma-pool.json"),
      fetchJson(base+"adjectival-noun-example-index-120.json"),
      fetchJson(base+"adjectival-noun-integration-audit.json"),
      fetchJson(base+"adjectival-noun-lexical-annotations.json")
    ]);
    const runtime={paradigms,lemmaPool,examples,audit,lexical};
    const validation=validateRuntime(runtime);
    if(!validation.ok) throw new Error("Adjv runtime validation failed: "+validation.errors.join("; "));
    return {
      ...runtime,
      tableItems:buildTableItems(runtime),
      exampleRefs:buildExampleRefs(runtime),
      validation
    };
  }

  global.ConjAdjvRuntime={
    load,
    validateRuntime,
    buildTableItems,
    buildExampleRefs,
    stableField,
    lemmaLexical
  };
})(window);
