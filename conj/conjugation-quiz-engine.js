// Conjugation identification quiz: pure choice-generation helpers.
// Data/publication gates live outside this module. Candidate sets are deterministic;
// the UI should shuffle only at render time.

export const FORM_CHOICES = Object.freeze(["未然形","連用形","終止形","連体形","已然形","命令形"]);

const unique = (values) => [...new Set(values.filter(Boolean))];

function parseVerbType(type){
  const m=String(type||"").match(/^(.行)(四段|上二段|下二段|上一段|下一段|変格)活用$/);
  return m ? {row:m[1],kind:m[2]} : null;
}
function verbFamily(kind){
  if(kind==="上二段"||kind==="上一段") return "upper";
  if(kind==="下二段"||kind==="下一段") return "lower";
  if(kind==="四段") return "four";
  if(kind==="変格") return "irregular";
  return "other";
}
function auxiliaryFamily(type){
  const t=String(type||"");
  if(t.startsWith("形容詞（")) return "adjective";
  if(t.startsWith("形容動詞（")) return "adjectival";
  if(/^(下二段|四段|サ変|ナ変|ラ変)型/.test(t)) return "verb-style";
  if(t==="特殊型"||t==="無変化型") return "special";
  return "other";
}
function rankVerb(correct,candidate){
  const a=parseVerbType(correct), b=parseVerbType(candidate);
  if(!a||!b) return 9;
  const af=verbFamily(a.kind), bf=verbFamily(b.kind);
  if(af==="irregular"){
    if(bf==="irregular") return 0;
    if(a.row===b.row) return 1;
    return 3;
  }
  if(a.row===b.row && bf!=="irregular") return 0;
  if(af===bf) return 1;
  if(a.row===b.row) return 2;
  return 3;
}
function rankAuxiliary(correct,candidate){
  const a=auxiliaryFamily(correct), b=auxiliaryFamily(candidate);
  if(a===b) return 0;
  if((a==="adjective"&&b==="adjectival")||(a==="adjectival"&&b==="adjective")) return 1;
  if((a==="special"&&b==="verb-style")||(a==="verb-style"&&b==="special")) return 1;
  if(a==="adjective"&&b==="special") return 2;
  if(a==="special"&&b==="adjective") return 2;
  return 3;
}
function rankedDistractors(correct,pool,ranker){
  return unique(pool)
    .filter((x)=>x!==correct)
    .map((value,index)=>({value,index,rank:ranker(correct,value)}))
    .sort((a,b)=>a.rank-b.rank||a.index-b.index)
    .map((x)=>x.value);
}

export function formChoices(){
  return [...FORM_CHOICES];
}

export function buildTypeChoices(record,config){
  const policy=config?.typeChoices?.[record?.partOfSpeech];
  if(!policy) throw new Error(`unknown partOfSpeech: ${record?.partOfSpeech}`);
  const correct=record?.conjugationType;
  const pool=unique(policy.pool||[]);
  if(!correct || !pool.includes(correct)) throw new Error(`answer is not in configured pool: ${correct}`);
  if(record.partOfSpeech==="adjective"||record.partOfSpeech==="adjectivalVerb") return [...pool];
  const ranker=record.partOfSpeech==="verb" ? rankVerb : rankAuxiliary;
  const distractors=rankedDistractors(correct,pool,ranker);
  const needed=Math.max(0,Number(policy.count||1)-1);
  if(distractors.length<needed) throw new Error(`not enough distractors for ${correct}`);
  return [correct,...distractors.slice(0,needed)];
}

export function shuffleChoices(choices,rng=Math.random){
  const out=[...choices];
  for(let i=out.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}
