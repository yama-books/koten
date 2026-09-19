(function(global){
  "use strict";

  const DEFAULT_BASE="./data/";

  async function fetchJson(url){
    const res=await fetch(url,{cache:"no-store"});
    if(!res.ok) throw new Error("Failed to load "+url+": "+res.status);
    return res.json();
  }

  async function fetchJsonOptional(url,fallback){
    try{
      return await fetchJson(url);
    }catch(error){
      console.warn("Optional runtime data unavailable:",url,error);
      return fallback;
    }
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

  function validatePublicExamples(publicExamples,examples,lemmaPool){
    const errors=[];
    if(!publicExamples || !Array.isArray(publicExamples.records)) return errors;

    const exampleIds=new Set((examples?.records||[]).map(r=>r.id));
    const lemmaIds=new Set((lemmaPool?.lemmas||[]).map(r=>r.id));
    const seen=new Set();

    for(const record of publicExamples.records){
      if(!record || !record.id){
        errors.push("public example without id");
        continue;
      }
      if(seen.has(record.id)) errors.push("duplicate public example "+record.id);
      seen.add(record.id);

      if(!exampleIds.has(record.sourceExampleId)){
        errors.push("unknown source example "+record.sourceExampleId);
      }
      if(!lemmaIds.has(record.lemmaId)){
        errors.push("unknown lemma "+record.lemmaId);
      }
      if(record.exampleEnabledPublic!==true ||
         record.rightsVerified!==true ||
         record.targetVerified!==true ||
         record.excerptReviewed!==true){
        errors.push("public example gates not passed "+record.id);
      }
      if(!record.example || !record.publicTarget || !record.example.includes(record.publicTarget)){
        errors.push("public target missing from excerpt "+record.id);
      }
      if(!record.sourceUrl || !record.sourceLabel || !record.sourceLicense){
        errors.push("public attribution incomplete "+record.id);
      }
    }
    return errors;
  }

  function validateRuntime(runtime){
    const errors=[];
    const {paradigms,lemmaPool,examples,audit,publicExamples}=runtime;

    if(!paradigms || !Array.isArray(paradigms.paradigms)) errors.push("paradigms missing");
    if(!lemmaPool || !Array.isArray(lemmaPool.lemmas)) errors.push("lemma pool missing");
    if(!examples || !Array.isArray(examples.records)) errors.push("example index missing");
    if(!audit || audit.status!=="passed") errors.push("integration audit is not passed");

    const pMap=new Map((paradigms?.paradigms||[]).map(p=>[p.id,p]));
    for(const lemma of lemmaPool?.lemmas||[]){
      if(!pMap.has(lemma.paradigmId)) errors.push("unknown paradigm for lemma "+lemma.id);
    }

    if((examples?.records||[]).length!==120) errors.push("example record count != 120");
    if((audit?.checks?.unmapped??1)!==0) errors.push("audit unmapped != 0");
    if((audit?.checks?.disabledCellReferences??1)!==0) errors.push("disabled cell referenced");
    if((audit?.checks?.targetAuditPassed??0)!==120) errors.push("target audit != 120");

    errors.push(...validatePublicExamples(publicExamples,examples,lemmaPool));

    return {ok:errors.length===0,errors};
  }

  function publicExampleByLemma(runtime){
    const map=new Map();
    for(const record of runtime.publicExamples?.records||[]){
      if(record.exampleEnabledPublic!==true) continue;
      if(!map.has(record.lemmaId)) map.set(record.lemmaId,record);
    }
    return map;
  }

  function buildTableItems(runtime){
    const pMap=new Map(runtime.paradigms.paradigms.map(p=>[p.id,p]));
    const publicByLemma=publicExampleByLemma(runtime);

    return runtime.lemmaPool.lemmas.map(lemma=>{
      const paradigm=pMap.get(lemma.paradigmId);
      if(!paradigm) throw new Error("Unknown paradigm: "+lemma.paradigmId);
      const {forms,forms2}=formArrays(paradigm);
      const publicExample=publicByLemma.get(lemma.id)||null;

      return {
        id:lemma.id,
        pos:"adjv",
        label:"形容動詞",
        lemma:lemma.lemma,
        kind:lemma.series,
        adjv:true,
        twoTrack:true,
        forms,
        forms2,
        paradigmId:lemma.paradigmId,
        sourceExampleIds:lemma.exampleIds.slice(),

        exampleAvailable:Boolean(publicExample),
        example:publicExample?.example||"",
        target:publicExample?.publicTarget||"",
        source:publicExample?.sourceLabel||"活用表ドリル",
        sourceUrl:publicExample?.sourceUrl||"",
        sourceLicense:publicExample?.sourceLicense||"",
        publicExampleId:publicExample?.id||null,
        sourceExampleId:publicExample?.sourceExampleId||null
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
    const [paradigms,lemmaPool,examples,audit,publicExamples]=await Promise.all([
      fetchJson(base+"adjectival-noun-paradigms.json"),
      fetchJson(base+"adjectival-noun-lemma-pool.json"),
      fetchJson(base+"adjectival-noun-example-index-120.json"),
      fetchJson(base+"adjectival-noun-integration-audit.json"),
      fetchJsonOptional(
        base+"adjectival-noun-public-examples.json",
        {updated:null,status:"optional-public-examples-unavailable",records:[]}
      )
    ]);
    const runtime={paradigms,lemmaPool,examples,audit,publicExamples};
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
    validatePublicExamples,
    buildTableItems,
    buildExampleRefs
  };
})(window);
