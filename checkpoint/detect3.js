const HONORIFIC_GUIDES = {
  "給ふ":[
    {name:"尊敬語「給ふ」（本動詞・四段）", desc:"それ自体で「お与えになる・くださる」などの動作と敬意を表す。", ex:"帝、袴を給ふ", check:"目的語を直接取って、「与える」に相当する動作を表しているか。", freq:"よく出る"},
    {name:"尊敬語「給ふ」（補助動詞・四段）", desc:"他の動詞の連用形について、その動作主への尊敬を添える。「お～になる・～なさる」。", ex:"泣き給ふ", check:"直前に別の動詞の連用形があり、「給ふ」自体の動作的意味が薄れているか。", freq:"最頻出"},
    {name:"謙譲語「給ふ」（補助動詞・下二段）", desc:"主に会話文・手紙文などで用いられる特殊な謙譲用法。四段の尊敬用法とは活用も異なる。", ex:"思ひ給ふ", check:"下二段活用になっていないか。話し手側の動作に付く特殊な用法か。", freq:"まれ・要注意"}
  ],
  "参る":[
    {name:"謙譲語「参る」（本動詞）", desc:"「行く・来」の謙譲表現など。動作主を低め、行き先・相手側を高める。", ex:"御前に参る", check:"誰が、誰のもとへ移動するのか。", freq:"よく出る"},
    {name:"尊敬語「参る」（本動詞）", desc:"文脈によって「召し上がる」などの尊敬用法になる。", ex:"文脈で確認", check:"移動ではなく、高位者の飲食などの動作を表していないか。", freq:"やや少ない・要注意"}
  ],
  "奉る":[
    {name:"謙譲語「奉る」（本動詞）", desc:"「差し上げる」など、それ自体で動作と謙譲の敬意を表す。", ex:"仏に花を奉る", check:"物などを相手へ差し上げる動作そのものか。", freq:"よく出る"},
    {name:"謙譲語「奉る」（補助動詞）", desc:"動詞の連用形について、その行為の受け手への敬意を添える。「お～申し上げる」。", ex:"皇子に会ひ奉る", check:"直前に別の動詞があり、「奉る」自体の動作的意味が薄いか。", freq:"よく出る"},
    {name:"尊敬語「奉る」（本動詞）", desc:"文脈によって「お召しになる・お乗りになる」などの尊敬用法になる。", ex:"文脈で確認", check:"高位者の着用・乗車・飲食などを表していないか。", freq:"やや少ない・要注意"}
  ],
  "申す":[
    {name:"謙譲語「申す」（本動詞）", desc:"「言ふ」の謙譲語。「申し上げる」。", ex:"君に申す", check:"誰が誰に発言しているか。", freq:"頻出"},
    {name:"謙譲語「申す」（補助動詞）", desc:"他の動詞の連用形について謙譲を添える。「お～申し上げる」。", ex:"読み申す", check:"直前に別の動詞があり、「申す」自体が「言う」を表していないか。", freq:"よく出る"}
  ],
  "候ふ":[
    {name:"謙譲語「候ふ」（本動詞）", desc:"「お仕えする・控える」などの動作を表し、相手を高める。", ex:"御前に候ふ", check:"仕える相手・場所が示されているか。", freq:"要注意"},
    {name:"丁寧語「候ふ」（本動詞）", desc:"「あります・おります」など、存在を丁寧に述べる。", ex:"ここに候ふ", check:"「ある・いる」という存在の意味が残っているか。", freq:"よく出る"},
    {name:"丁寧語「候ふ」（補助動詞）", desc:"他の語について「～ます・～ございます」のような丁寧さを添える。", ex:"申し候ふ", check:"直前に別の動詞があり、聞き手への丁寧さを添えているか。", freq:"頻出"}
  ],
  "侍り":[
    {name:"謙譲語「侍り」（本動詞）", desc:"「お仕えする・控える」などの動作を表す。", ex:"御前に侍り", check:"仕える対象があるか。", freq:"要注意"},
    {name:"丁寧語「侍り」（本動詞）", desc:"「あります・おります」のように存在を丁寧に述べる。", ex:"仏像なども侍り", check:"存在そのものを表しているか。", freq:"よく出る"},
    {name:"丁寧語「侍り」（補助動詞）", desc:"他の動詞について「～ます」のような丁寧さを添える。", ex:"行き侍り", check:"直前に別の動詞があり、「侍り」自体の動作的意味が失われているか。", freq:"頻出"}
  ],
  "召す":[{name:"尊敬語「召す」（本動詞）", desc:"高位者の「呼ぶ・着る・食べる・飲む・乗る」などを表す。", ex:"人を召す／御衣を召す", check:"目的語から普通語に直したときの意味を考える。", freq:"頻出"}],
  "のたまふ":[{name:"尊敬語「のたまふ」（本動詞）", desc:"「言ふ」の尊敬語。「おっしゃる」。", ex:"帝のたまふ", check:"誰が発言しているか。主語判定の手掛かりにもなる。", freq:"頻出"}],
  "おはす":[
    {name:"尊敬語「おはす」（本動詞）", desc:"「あり・居り・行く・来」などを尊敬表現にしたもの。", ex:"御前におはす", check:"「いらっしゃる」等の独立した動作・存在を表すか。", freq:"頻出"},
    {name:"尊敬語「おはす」（補助動詞）", desc:"動詞の連用形について、その動作主への尊敬を添える。", ex:"帰りおはす", check:"直前の動詞が主な動作を表しているか。", freq:"よく出る"}
  ],
  "おはします":[
    {name:"尊敬語「おはします」（本動詞）", desc:"「いらっしゃる」など、強い尊敬を含む本動詞として働く。", ex:"御所におはします", check:"独立した動作・存在の意味があるか。", freq:"よく出る"},
    {name:"尊敬語「おはします」（補助動詞）", desc:"動詞の連用形について、強い尊敬を添える。", ex:"～しおはします", check:"直前の動詞が主な動作を表しているか。", freq:"よく出る"}
  ],
  "聞こゆ":[
    {name:"謙譲語「聞こゆ」（本動詞）", desc:"「申し上げる」などの謙譲表現として使う。", ex:"君に聞こゆ", check:"発話・伝達の相手が高められているか。", freq:"よく出る"},
    {name:"謙譲語「聞こゆ」（補助動詞）", desc:"他の動詞について謙譲を添える。", ex:"～聞こゆ", check:"前の動詞が主な動作を表しているか。", freq:"よく出る"},
    {name:"一般動詞「聞こゆ」", desc:"敬語ではなく「聞こえる」の意味で使う場合。", ex:"声聞こゆ", check:"敬意の方向を考える必要のない普通の知覚表現か。", freq:"よく出る"}
  ],
  "聞こえさす":[
    {name:"謙譲語「聞こえさす」（本動詞）", desc:"「申し上げる」など、強い謙譲表現として独立して働く。", ex:"御消息聞こえさす", check:"発話・伝達そのものを表しているか。", freq:"やや少ない"},
    {name:"謙譲語「聞こえさす」（補助動詞）", desc:"他の動詞について謙譲を添える。", ex:"～聞こえさす", check:"前の動詞が主な動作を表しているか。", freq:"やや少ない"}
  ],
  "参らす":[
    {name:"謙譲語「参らす」（本動詞）", desc:"「差し上げる」などの謙譲表現。", ex:"文を参らす", check:"物を相手へ差し上げる動作そのものか。", freq:"よく出る"},
    {name:"謙譲語「参らす」（補助動詞）", desc:"他の動詞について「お～申し上げる」のような謙譲を添える。", ex:"～し参らす", check:"前の動詞が主な動作を表しているか。", freq:"よく出る"}
  ]
};

function candidateGuideFor(h){ return CANDIDATE_GUIDES[h.pattern] || HONORIFIC_GUIDES[h.lemma] || null; }

function buildSegments(text, hits){
  const boundaries=new Set([0,text.length]);
  hits.forEach(h=>{boundaries.add(h.start);boundaries.add(h.end);});
  const pts=[...boundaries].sort((a,b)=>a-b);
  const segments=[];
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i], b=pts[i+1]; if(a===b) continue;
    const active=hits.filter(h=>h.start<=a && h.end>=b);
    segments.push({start:a,end:b,text:text.slice(a,b),active});
  }
  return segments;
}

function dominantHit(active){
  if(!active.length) return null;
  const catPriority={honorific:8,identify:7,grammar:6,vocab:5,structure:4,orthography:3};
  return [...active].sort((a,b)=>a.tier-b.tier || (catPriority[b.type]||0)-(catPriority[a.type]||0) || (b.end-b.start)-(a.end-a.start))[0];
}

function displayPointSignature(active){
  const pts=normalizeDrawerPoints(active);
  return pts.map(h=>[h.type,h.pattern,h.start,h.end].join(":")).sort().join("||");
}

function mergeDisplaySegments(segments){
  const out=[];
  for(const seg of segments){
    const sig=displayPointSignature(seg.active); const prev=out[out.length-1];
    if(prev && prev.end===seg.start && sig && prev.displaySig===sig){
      prev.end=seg.end; prev.text+=seg.text;
      const seen=new Set(prev.active.map(h=>[h.type,h.pattern,h.start,h.end,h.lemma||""].join("|")));
      seg.active.forEach(h=>{ const k=[h.type,h.pattern,h.start,h.end,h.lemma||""].join("|"); if(!seen.has(k)){prev.active.push(h);seen.add(k);} });
      continue;
    }
    out.push({...seg,displaySig:sig});
  }
  return out;
}
