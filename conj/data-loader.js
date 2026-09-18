/* conj data loader: shadow-load only. Public UI selection remains on the legacy embedded dataset. */
(function(){
  "use strict";
  const state={
    adjectivalNouns:null,
    status:"loading",
    error:null
  };

  function validParadigm(p, primary, secondary){
    if(!p || !Array.isArray(p.forms) || p.forms.length!==6) return false;
    if(!Array.isArray(p.forms2) || p.forms2.length!==6) return false;
    return JSON.stringify(p.forms)===JSON.stringify(primary)
      && JSON.stringify(p.forms2)===JSON.stringify(secondary);
  }

  function validate(data){
    if(!data || data.status!=="app-staging-metadata-ready / quotation-text-private"){
      throw new Error("unexpected adjectival-noun staging status");
    }
    if(!Array.isArray(data.examples) || data.examples.length!==120){
      throw new Error("adjectival-noun staging must contain 120 examples");
    }
    const nariOk=validParadigm(
      data.paradigms && data.paradigms.nari,
      [["なら"],["なり"],["なり"],["なる"],["なれ"],["なれ"]],
      [null,["に"],null,null,null,null]
    );
    const tariOk=validParadigm(
      data.paradigms && data.paradigms.tari,
      [["たら"],["たり"],["たり"],["たる"],["たれ"],["たれ"]],
      [null,["と"],null,null,null,null]
    );
    if(!nariOk || !tariOk) throw new Error("adjectival-noun paradigm mismatch");
    if(data.examples.some(x=>x.exampleEnabled!==false || x.exampleText!==null)){
      throw new Error("private quotation text must not be enabled in public staging data");
    }
    return data;
  }

  async function load(){
    try{
      const res=await fetch("./data/adjectival-noun-app-staging-120.json",{cache:"no-store"});
      if(!res.ok) throw new Error("HTTP "+res.status);
      state.adjectivalNouns=validate(await res.json());
      state.status="ready-shadow";
    }catch(err){
      state.status="unavailable";
      state.error=String(err && err.message ? err.message : err);
      console.warn("[conj] staging data shadow-load failed:",state.error);
    }
    return state;
  }

  window.ConjDataLayer={state,ready:load()};
})();
