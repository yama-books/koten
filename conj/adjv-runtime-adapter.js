(function(global){
  "use strict";

  const BRAND_TITLE="古典文法活用ノート";
  const DEFAULT_BASE="./data/";

  function applyBranding(){
    document.title=BRAND_TITLE;

    const title=document.querySelector(".wrap > header h1");
    if(title) title.textContent=BRAND_TITLE;

    if(!document.querySelector('link[data-conj-branding="true"]')){
      const link=document.createElement("link");
      link.rel="stylesheet";
      link.href="./branding.css";
      link.dataset.conjBranding="true";
      document.head.appendChild(link);
    }
  }

  function absolutizeFontUrls(css,stylesheetUrl,appBase){
    return css.replace(/url\((['"]?)([^'")]+)\1\)/g,(whole,_quote,raw)=>{
      if(raw.startsWith("data:")||raw.startsWith("#")) return whole;
      try{
        const absolute=raw.startsWith("/fonts/")
          ? new URL(raw.slice(1),appBase)
          : new URL(raw,stylesheetUrl);
        return 'url("'+absolute.href+'")';
      }catch(_error){
        return whole;
      }
    });
  }

  async function importHyakuninFonts(){
    if(document.getElementById("conj-hyakunin-font-faces")) return;

    try{
      const appBase=new URL("../100/",window.location.href);
      const indexResponse=await fetch(new URL("index.html",appBase),{cache:"force-cache"});
      if(!indexResponse.ok) throw new Error("hyakunin index: "+indexResponse.status);

      const parsed=new DOMParser().parseFromString(await indexResponse.text(),"text/html");
      const stylesheetUrls=[...parsed.querySelectorAll('link[rel="stylesheet"]')]
        .map(node=>node.getAttribute("href"))
        .filter(Boolean)
        .map(href=>new URL(href,appBase));

      const fontFaces=[];
      for(const stylesheetUrl of stylesheetUrls){
        const response=await fetch(stylesheetUrl,{cache:"force-cache"});
        if(!response.ok) continue;
        const css=absolutizeFontUrls(await response.text(),stylesheetUrl,appBase);
        const faces=css.match(/@font-face\s*\{[^}]*\}/g)||[];
        fontFaces.push(...faces.filter(face=>
          /font-family:\s*['"]?(?:Klee One|Zen Maru Gothic)/.test(face)
        ));
      }

      if(!fontFaces.length) return;
      const style=document.createElement("style");
      style.id="conj-hyakunin-font-faces";
      style.textContent=fontFaces.join("\n");
      document.head.appendChild(style);
    }catch(error){
      console.warn("conj: shared web fonts unavailable; using local fallbacks.",error);
    }
  }

  applyBranding();
  void importHyakuninFonts();
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",applyBranding,{once:true});
  }

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

  // Only records that passed all four public-text gates may be shown.
  function publicExampleMap(publicExamples){
    const map=new Map();
    for(const r of publicExamples?.records||[]){
      if(r.exampleEnabledPublic!==true || r.rightsVerified!==true
        || r.targetVerified!==true || r.excerptReviewed!==true) continue;
      if(!r.example || !r.publicTarget || !r.example.includes(r.publicTarget)) continue;
      if(!map.has(r.lemmaId)) map.set(r.lemmaId,r);
    }
    return map;
  }

  async function loadPublicExamples(options={}){
    const base=options.base||DEFAULT_BASE;
    return publicExampleMap(await fetchJson(base+"adjectival-noun-public-examples.json"));
  }

  // CHJ excerpts quoted for lemmas that have no openly licensed text.
  async function loadChjQuotations(options={}){
    const base=options.base||DEFAULT_BASE;
    const data=await fetchJson(base+"adjectival-noun-chj-quotations.json");
    const map=new Map();
    for(const r of data?.records||[]){
      if(!r.excerpt || !r.target || !r.excerpt.includes(r.target)) continue;
      if(!map.has(r.lemmaId)) map.set(r.lemmaId,r);
    }
    return {source:data.source,map};
  }

  // 語釈（DESIGN_GLOSS_LAYOUT_2026-09-28 §6）。用例単位の基本義・用例補足と、見出しの現代仮名遣い。
  // 検証に通らないファイルは丸ごと使わない（語釈が出ないだけで、出題は続けられる）。
  function glossDisplayText(record){
    return record.basicGloss+(record.contextNote ? "（この用例では"+record.contextNote+"）" : "");
  }

  function validateGlosses(data){
    const errors=[];
    const records=data?.records;
    if(!Array.isArray(records)) return {ok:false,errors:["gloss records missing"]};
    if(records.length!==120) errors.push("gloss record count != 120");
    const seen=new Set();
    for(const r of records){
      if(!r || typeof r.id!=="string"){ errors.push("gloss record without id"); continue; }
      if(seen.has(r.id)) errors.push("duplicate gloss record "+r.id);
      seen.add(r.id);
      if(!r.work || !r.basicGloss) errors.push("gloss record incomplete "+r.id);
      if(glossDisplayText(r)!==r.displayGloss) errors.push("displayGloss mismatch "+r.id);
    }
    const readingIds=new Set();
    for(const x of data?.lemmaReadings||[]){
      if(readingIds.has(x.itemId)) errors.push("duplicate lemma reading "+x.itemId);
      readingIds.add(x.itemId);
      const ruby=Array.isArray(x.ruby) ? x.ruby : [];
      if(ruby.map(s=>s[0]).join("")!==x.heading) errors.push("ruby base mismatch "+x.itemId);
      if(ruby.map(s=>s[s.length-1]).join("")!==x.modernKana) errors.push("ruby reading mismatch "+x.itemId);
      if(ruby.some(s=>s.length===2)!==(x.heading!==x.modernKana)) errors.push("ruby presence mismatch "+x.itemId);
    }
    for(const g of data?.itemGlosses||[]){
      if(!g.itemId || !g.basicGloss) errors.push("item gloss incomplete");
    }
    return {ok:errors.length===0,errors};
  }

  async function loadGlosses(options={}){
    const base=options.base||DEFAULT_BASE;
    const data=await fetchJson(base+"adjectival-noun-glosses.json");
    const validation=validateGlosses(data);
    if(!validation.ok) throw new Error("Adjv gloss validation failed: "+validation.errors.join("; "));
    return {
      records:new Map(data.records.map(r=>[r.id,r])),
      readings:new Map((data.lemmaReadings||[]).map(r=>[r.itemId,r])),
      itemGlosses:new Map((data.itemGlosses||[]).map(g=>[g.itemId,g])),
      validation
    };
  }

  // 表示中の用例（exampleId）に結び付いた語釈だけを返す。作品が一致しなければ出さない（fail closed）。
  function glossForExample(glosses,exampleId,work){
    const r=glosses?.records?.get(exampleId);
    if(!r) return null;
    if(r.work!==work){
      console.warn("conj: gloss "+exampleId+" is for "+r.work+", but the example shown is from "+work+"; gloss hidden.");
      return null;
    }
    return {exampleId,basicGloss:r.basicGloss,contextNote:r.contextNote||null};
  }

  // 助動詞の用例ごとの意味（§6.5）。形の検証だけを行い、問題データとの照合は index.html 側で行う。
  async function loadAuxExampleMeanings(options={}){
    const base=options.base||DEFAULT_BASE;
    const data=await fetchJson(base+"aux-example-meanings.json");
    if(!Array.isArray(data?.records)) throw new Error("aux example meanings missing");
    return data.records.filter(r=>r && typeof r.id==="string"
      && Array.isArray(r.exampleMeanings) && r.exampleMeanings.length>0 && r.exampleMeanings.every(m=>typeof m==="string" && m)
      && typeof r.target==="string" && Number.isInteger(r.occurrence) && typeof r.status==="string");
  }

  global.ConjAdjvRuntime={
    load,
    loadPublicExamples,
    loadChjQuotations,
    loadGlosses,
    validateGlosses,
    glossForExample,
    loadAuxExampleMeanings,
    publicExampleMap,
    validateRuntime,
    buildTableItems,
    buildExampleRefs,
    stableField,
    lemmaLexical
  };
})(window);
