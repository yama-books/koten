(function(global){
  "use strict";

  const STORAGE_KEY="conjRangePreferences";
  const VERSION=1;
  const PRESETS=["all","verb","adjective","aux","custom"];
  const VERB_FAMILIES=[
    "yodan",
    "kami_ichidan",
    "kami_nidan",
    "shimo_ichidan",
    "shimo_nidan",
    "ka_hen",
    "sa_hen",
    "na_hen",
    "ra_hen"
  ];
  const ADJECTIVE_FAMILIES=["ku","shiku","nari","tari"];

  function uniqueStrings(value){
    if(!Array.isArray(value)) return [];
    const seen=new Set();
    const result=[];
    for(const entry of value){
      if(typeof entry!=="string" || !entry || seen.has(entry)) continue;
      seen.add(entry);
      result.push(entry);
    }
    return result;
  }

  function verbFamily(item){
    if(!item || item.pos!=="verb") return null;
    const kind=String(item.kind||"");
    if(kind.includes("上一段活用")) return "kami_ichidan";
    if(kind.includes("上二段活用")) return "kami_nidan";
    if(kind.includes("下一段活用")) return "shimo_ichidan";
    if(kind.includes("下二段活用")) return "shimo_nidan";
    if(kind.includes("四段活用")) return "yodan";
    if(kind.includes("カ行変格活用") || kind==="カ変") return "ka_hen";
    if(kind.includes("サ行変格活用") || kind==="サ変") return "sa_hen";
    if(kind.includes("ナ行変格活用") || kind==="ナ変") return "na_hen";
    if(kind.includes("ラ行変格活用") || kind==="ラ変") return "ra_hen";
    return null;
  }

  function adjectiveFamily(item){
    if(!item) return null;
    const kind=String(item.kind||"");
    if(item.pos==="adj"){
      if(kind.includes("シク活用")) return "shiku";
      if(kind.includes("ク活用")) return "ku";
      return null;
    }
    if(item.pos==="adjv"){
      if(kind.includes("タリ活用")) return "tari";
      if(kind.includes("ナリ活用")) return "nari";
    }
    return null;
  }

  function auxiliaryIds(items){
    return uniqueStrings((items||[]).filter(item=>item?.pos==="aux").map(item=>String(item.id||"")));
  }

  function expandPreset(preset,items){
    switch(preset){
      case "verb":
        return {verbFamilies:[...VERB_FAMILIES],adjectiveFamilies:[],auxiliaryItemIds:[]};
      case "adjective":
        return {verbFamilies:[],adjectiveFamilies:[...ADJECTIVE_FAMILIES],auxiliaryItemIds:[]};
      case "aux":
        return {verbFamilies:[],adjectiveFamilies:[],auxiliaryItemIds:auxiliaryIds(items)};
      case "all":
        return {
          verbFamilies:[...VERB_FAMILIES],
          adjectiveFamilies:[...ADJECTIVE_FAMILIES],
          auxiliaryItemIds:auxiliaryIds(items)
        };
      default:
        return null;
    }
  }

  function normalize(raw,items=[]){
    const safe=raw && typeof raw==="object" ? raw : {};
    const preset=PRESETS.includes(safe.preset) ? safe.preset : "all";
    const expanded=expandPreset(preset,items);
    if(expanded){
      return {version:VERSION,preset,...expanded};
    }
    return {
      version:VERSION,
      preset:"custom",
      verbFamilies:uniqueStrings(safe.verbFamilies).filter(value=>VERB_FAMILIES.includes(value)),
      adjectiveFamilies:uniqueStrings(safe.adjectiveFamilies).filter(value=>ADJECTIVE_FAMILIES.includes(value)),
      // Keep syntactically valid IDs even when the current catalog does not know them.
      // That lets later UI/code surface stale or future IDs instead of silently erasing them.
      auxiliaryItemIds:uniqueStrings(safe.auxiliaryItemIds)
    };
  }

  function load(storage,items=[]){
    try{
      const raw=JSON.parse(storage?.getItem?.(STORAGE_KEY)||"{}");
      return normalize(raw,items);
    }catch(_error){
      return normalize({},items);
    }
  }

  function save(storage,selection,items=[]){
    const normalized=normalize(selection,items);
    try{ storage?.setItem?.(STORAGE_KEY,JSON.stringify(normalized)); }catch(_error){}
    return normalized;
  }

  function matchesItem(selection,item){
    if(!item) return false;
    const normalized=selection && selection.version===VERSION ? selection : normalize(selection,[]);
    if(item.pos==="verb"){
      const family=verbFamily(item);
      return !!family && normalized.verbFamilies.includes(family);
    }
    if(item.pos==="adj" || item.pos==="adjv"){
      const family=adjectiveFamily(item);
      return !!family && normalized.adjectiveFamilies.includes(family);
    }
    if(item.pos==="aux"){
      return normalized.auxiliaryItemIds.includes(String(item.id||""));
    }
    return false;
  }

  function filterItems(selection,items){
    return (items||[]).filter(item=>matchesItem(selection,item));
  }

  function fromLegacyPos(value,items=[]){
    if(value==="verb") return normalize({preset:"verb"},items);
    if(value==="aux") return normalize({preset:"aux"},items);
    if(value==="adj"){
      return normalize({preset:"custom",verbFamilies:[],adjectiveFamilies:["ku","shiku"],auxiliaryItemIds:[]},items);
    }
    if(value==="adjv"){
      return normalize({preset:"custom",verbFamilies:[],adjectiveFamilies:["nari","tari"],auxiliaryItemIds:[]},items);
    }
    return normalize({preset:"all"},items);
  }

  function legacyPosForSelection(selection){
    const preset=selection?.preset;
    if(preset==="verb") return "verb";
    if(preset==="aux") return "aux";
    // The old select cannot represent adjective (adj + adjv) or arbitrary custom ranges.
    return "all";
  }

  function diagnostics(selection,items=[]){
    const knownAux=new Set(auxiliaryIds(items));
    const normalized=normalize(selection,items);
    return {
      unknownAuxiliaryItemIds:normalized.auxiliaryItemIds.filter(id=>!knownAux.has(id)),
      unmatchedItems:(items||[]).filter(item=>
        item?.pos==="verb" ? !verbFamily(item) :
        (item?.pos==="adj"||item?.pos==="adjv") ? !adjectiveFamily(item) :
        false
      ).map(item=>String(item.id||""))
    };
  }

  global.ConjRange={
    STORAGE_KEY,
    VERSION,
    PRESETS:[...PRESETS],
    VERB_FAMILIES:[...VERB_FAMILIES],
    ADJECTIVE_FAMILIES:[...ADJECTIVE_FAMILIES],
    normalize,
    load,
    save,
    verbFamily,
    adjectiveFamily,
    matchesItem,
    filterItems,
    fromLegacyPos,
    legacyPosForSelection,
    diagnostics
  };
})(typeof window!=="undefined" ? window : globalThis);
