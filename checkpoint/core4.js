const KANA_WHOLE_WORD_LEXICON = [
  {surface:"にほひ", modernKana:"におい", ruleIds:["H1"], sourceKind:"primary-example"},
  {surface:"笑ふ", modernKana:"わらう", ruleIds:["H1"], sourceKind:"primary-example"},
  {surface:"ゐる", modernKana:"いる", ruleIds:["W1"], sourceKind:"primary-example"},
  {surface:"こゑ", modernKana:"こえ", ruleIds:["W1"], sourceKind:"primary-example"},
  {surface:"をとこ", modernKana:"おとこ", ruleIds:["W2"], sourceKind:"primary-example"},
  {surface:"とを", modernKana:"とお", ruleIds:["W2"], sourceKind:"primary-example"},
  {surface:"もみぢ", modernKana:"もみじ", ruleIds:["D1"], sourceKind:"primary-example"},
  {surface:"みづ", modernKana:"みず", ruleIds:["D1"], sourceKind:"primary-example"},
  {surface:"ぐわん", modernKana:"がん", ruleIds:["K1"], sourceKind:"primary-example"},
  {surface:"らむ", modernKana:"らん", ruleIds:["N1"], sourceKind:"primary-example"},
  {surface:"ねむ", modernKana:"ねん", ruleIds:["N1"], sourceKind:"primary-example"},
  {surface:"かうし", modernKana:"こうし", ruleIds:["L1"], sourceKind:"primary-example"},
  {surface:"あふぎ", modernKana:"おうぎ", ruleIds:["L1"], sourceKind:"primary-example"},
  {surface:"いうげん", modernKana:"ゆうげん", ruleIds:["L2"], sourceKind:"primary-example"},
  {surface:"きう", modernKana:"きゅう", ruleIds:["L2"], sourceKind:"primary-example"},
  {surface:"せうと", modernKana:"しょうと", ruleIds:["L3"], sourceKind:"primary-example"},
  {surface:"けふ", modernKana:"きょう", ruleIds:["L3"], sourceKind:"primary-example"},
  {surface:"しやう", modernKana:"しょう", ruleIds:["S1"], sourceKind:"primary-example"},
  {surface:"きつと", modernKana:"きっと", ruleIds:["S1"], sourceKind:"primary-example"},
  {surface:"なでふ", modernKana:null, focus:"でふ", ruleIds:["H1","L3"], sourceKind:"supplemental-lexicon"}
];

const YODAN_ENDINGS = {
  "ア": {hist:["あ","い","う","う","え","え"], modern:["あ","い","う","う","え","え"]},
  "カ": {hist:["か","き","く","く","け","け"], modern:["か","き","く","く","け","け"]},
  "ガ": {hist:["が","ぎ","ぐ","ぐ","げ","げ"], modern:["が","ぎ","ぐ","ぐ","げ","げ"]},
  "サ": {hist:["さ","し","す","す","せ","せ"], modern:["さ","し","す","す","せ","せ"]},
  "タ": {hist:["た","ち","つ","つ","て","て"], modern:["た","ち","つ","つ","て","て"]},
  "ナ": {hist:["な","に","ぬ","ぬ","ね","ね"], modern:["な","に","ぬ","ぬ","ね","ね"]},
  "ハ": {hist:["は","ひ","ふ","ふ","へ","へ"], modern:["わ","い","う","う","え","え"]},
  "バ": {hist:["ば","び","ぶ","ぶ","べ","べ"], modern:["ば","び","ぶ","ぶ","べ","べ"]},
  "マ": {hist:["ま","み","む","む","め","め"], modern:["ま","み","む","む","め","め"]},
  "ラ": {hist:["ら","り","る","る","れ","れ"], modern:["ら","り","る","る","れ","れ"]}
};

const KANA_INFLECTING_LEMMAS = [
  {lemma:"遣はす", histStem:"遣は", modernStem:"つかわ", row:"サ", ruleIds:["H1"], tier:2}
];

function generateYodanForms(entry){
  const row=YODAN_ENDINGS[entry.row];
  if(!row) return [];
  const labels=["未然形","連用形","終止形","連体形","已然形","命令形"];
  const out=[]; const seen=new Set();
  row.hist.forEach((ending,i)=>{
    const surface=entry.histStem+ending;
    const modernKana=entry.modernStem+row.modern[i];
    const key=surface+"|"+modernKana;
    if(seen.has(key)) return;
    seen.add(key);
    out.push({surface,modernKana,lemma:entry.lemma,formLabels:[labels[i]],ruleIds:entry.ruleIds||[],tier:entry.tier||2});
  });
  return out.map(f=>{
    const labels2=[];
    row.hist.forEach((ending,i)=>{ if(entry.histStem+ending===f.surface) labels2.push(labels[i]); });
    return {...f,formLabels:[...new Set(labels2)]};
  }).filter((f,i,a)=>a.findIndex(x=>x.surface===f.surface)===i);
}

const KANA_GENERATED_FORMS = KANA_INFLECTING_LEMMAS.flatMap(generateYodanForms);

function lexicalKanaHit(entry,start,kind="lexicon"){
  const rules=(entry.ruleIds||[]).map(id=>kanaRule(id)).filter(Boolean);
  const focus=entry.focus || entry.surface;
  const examples=[`【ここを見る】${focus} → ？`,...rules.map(r=>`【法則】${r.brief}`)];
  if(entry.lemma) examples.push(`【見出し語】${entry.lemma}`);
  return {
    type:"orthography", pattern:entry.surface, start, end:start+entry.surface.length,
    tier:entry.tier || 2, tierOverride:entry.tier || 2, lemma:entry.lemma || entry.surface,
    kanaLexical:true, kanaLayer:kind, kanaRuleIds:entry.ruleIds||[], modernKana:entry.modernKana || null,
    kanaFocus:focus, formLabels:entry.formLabels||[], hint1:`${focus} → ？`,
    hint2:rules.map(r=>r.brief).join(" "), examples,
    candidates:[...(rules.length ? rules.map(r=>`法則：${r.chip}`) : ["仮名遣い"])], ref:"仮名遣い"
  };
}

function detectLexicalKanaCandidates(text){
  const out=[];
  KANA_WHOLE_WORD_LEXICON.forEach(entry=>{
    let pos=0; while(true){ const i=text.indexOf(entry.surface,pos); if(i<0) break; out.push(lexicalKanaHit({...entry,tier:entry.tier||2},i,"lexicon")); pos=i+Math.max(1,entry.surface.length); }
  });
  KANA_GENERATED_FORMS.forEach(entry=>{
    let pos=0; while(true){ const i=text.indexOf(entry.surface,pos); if(i<0) break; out.push(lexicalKanaHit(entry,i,"inflection")); pos=i+Math.max(1,entry.surface.length); }
  });
  const seen=new Set();
  return out.filter(h=>{ const k=`${h.start}:${h.end}:${h.pattern}:${h.modernKana}`; if(seen.has(k)) return false; seen.add(k); return true; });
}

function kanaRule(id){ return KANA_RULE_DEFS.find(r=>r.id===id); }

function kanaHit(ruleId, surface, start){
  const r=kanaRule(ruleId);
  const linked=KANA_RULE_DEFS.filter(x=>x.parent===ruleId);
  const cautionText=linked.length ? "例外も確認：" + linked.map(x=>x.chip).join("／") : "";
  const lawExamples=[`【法則】${r.brief}`,...(linked.length ? [`【例外】${linked.map(x=>x.chip).join("／")}`] : [])];
  return {
    type:"orthography", pattern:surface, start, end:start+surface.length, tier:r.tier, tierOverride:r.tier,
    lemma:surface, kanaRuleId:ruleId, hint1:`仮名遣い要確認：${r.chip ? r.chip : "表記を確認"}`,
    hint2:r.brief + (cautionText ? " " + cautionText : ""), examples:lawExamples,
    candidates:[`仮名遣い要確認：${r.chip || r.brief}`,...(linked.map(x=>`例外も確認：${x.chip}`))],
    ref:"仮名遣い要確認", kanaPending:true
  };
}

function pushKanaMatches(out,text,ruleId,regex){ for(const m of text.matchAll(regex)) out.push(kanaHit(ruleId,m[0],m.index)); }

function detectKanaCandidates(text, level){
  const strong=detectLexicalKanaCandidates(text); const fallback=[];
  pushKanaMatches(fallback,text,"W1",/[ゐゑ]/g);
  pushKanaMatches(fallback,text,"D1",/[ぢづ]/g);
  pushKanaMatches(fallback,text,"K1",/(?:くわ|ぐわ)/g);
  pushKanaMatches(fallback,text,"N1",/(?:らむ|けむ|むず|なむ|む)/g);
  pushKanaMatches(fallback,text,"L1",/(?:[あかさたなはまやらわ]う|[あかさたなはまやらわ]ふ)/g);
  pushKanaMatches(fallback,text,"L2",/[いきしちにひみり]う/g);
  pushKanaMatches(fallback,text,"L3",/(?:[えけげせぜてでねへべぺめれ]う|[えけげせぜてでねへべぺめれ]ふ)/g);
  pushKanaMatches(fallback,text,"S1",/(?:[きぎしじちぢにひびぴみり][やゆよ]|きつと)/g);
  if(String(level)==="5"){
    pushKanaMatches(fallback,text,"W2",/を/g);
    for(let i=0;i<text.length;i++){
      const ch=text[i]; if(!"はひふへほ".includes(ch)) continue;
      const prev=i>0 ? text[i-1] : ""; if(i===0 || /[\s、。！？「」『』（）\n]/.test(prev)) continue;
      const h=kanaHit("H1",ch,i); h.tier=5; h.tierOverride=5;
      h.hint1="歴史的仮名遣いの拾い漏れ確認候補です。語頭・複合語・助詞かどうかを先に確認しましょう。"; fallback.push(h);
    }
  }
  const filteredFallback=fallback.filter(f=>!strong.some(s=>f.start>=s.start && f.end<=s.end && !(f.start===s.start && f.end===s.end && f.pattern===s.pattern)));
  return [...strong,...filteredFallback];
}

const ALL_RULES = [...RULES, ...AUX_RULES, ...VOCAB_RULES, ...HONORIFIC_RULES];

function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }

const CHECKPOINT_DATA_PATHS = {
  manifest:"./data/manifest.json", auxiliaries:"./data/auxiliary_master.json", inflectingWords:"./data/inflecting_words.json",
  lexicon:"./data/basic_lexicon.json", discrimination:"./data/discrimination_rules.json", corpusEvidence:"./data/corpus_evidence.json",
  surfaceIndex:"./data/surface_index.json", kanaRules:"./data/kana_rules.json",
  discriminationSource:"./data/discrimination_source_usb3212.json", auxiliaryEvidenceUsb3212:"./data/auxiliary_evidence_usb3212.json",
  auxiliaryCorpusEvidence:"./data/auxiliary_corpus_evidence_20260918.json", auxiliaryVerificationQueue:"./data/auxiliary_verification_queue.json",
  kakariMusubiEvidence:"./data/kakari_musubi_evidence.json", kakariMusubiRoutes:"./data/kakari_musubi_routes.json",
  adjectiveSurfaceCollisionEvidence:"./data/adjective_surface_collision_evidence.json", surfaceMatchPolicy:"./data/surface_match_policy.json",
  auditedInflectedFormIndex:"./data/audited_inflected_form_index_500.json", contextResolverRules:"./data/context_resolver_rules.json",
  knownTokenBoundaryIndex:"./data/known_token_boundary_index.json"
};

async function loadCheckpointData(){
  const loaded={};
  for(const [key,path] of Object.entries(CHECKPOINT_DATA_PATHS)){
    try{ const res=await fetch(path,{cache:"no-store"}); if(!res.ok) throw new Error(`${res.status}`); loaded[key]=await res.json(); }
    catch(err){ loaded[key]=null; }
  }
  window.CHECKPOINT_DATA=loaded;
  document.documentElement.dataset.externalData=loaded.manifest ? "loaded" : "fallback";
}
