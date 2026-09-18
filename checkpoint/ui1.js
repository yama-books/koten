function render(){
  const text=document.getElementById("input").value.trim();
  const reading=document.getElementById("reading");
  const checklist=document.getElementById("checklist");
  const summary=document.getElementById("summary");
  const filterStatus=document.getElementById("filterStatus");

  if(!text){
    reading.innerHTML='<div class="empty">本文を貼り付けてください。</div>';
    checklist.innerHTML='<div class="empty">まだ予習ポイントはありません。</div>';
    summary.innerHTML='';
    filterStatus.textContent='';
    return;
  }

  const level=document.getElementById("checkLevel").value;
  const limit=LEVEL_LIMIT[level];
  const detected=detect(text, level);
  if(typeof shadowAuditLegacyVsDb==="function" && window.CHECKPOINT_DATA?.surfaceIndex){
    shadowAuditLegacyVsDb(text, detected.hits);
  }

  const notDismissed=detected.hits.filter(h=>!dismissedKeys.has(hitKey(h)));
  const hits=notDismissed.filter(h=>h.tier<=limit);

  const levelSuppressed=notDismissed.length-hits.length;
  const knownSuppressed=detected.hits.length-notDismissed.length;

  const segments=mergeDisplaySegments(buildSegments(text,hits));
  reading.innerHTML=segments.map((seg,idx)=>{
    if(!seg.active.length) return escapeHtml(seg.text);
    const points=normalizeDrawerPoints(seg.active);
    const dom=dominantHit(points.length?points:seg.active);
    const multi=points.length>1;
    const title=multi
      ? `確認ポイント：${points.map(h=>drawerPointLabel(h)+":"+h.pattern).join(" / ")}`
      : `${drawerPointLabel(dom)}・レベル${dom.tier}`;
    const badge=multi?`<span class="candidate-badge">${points.length}観点</span>`:"";
    return `<span class="mark ${dom.type}${multi?" multi":""}" data-seg="${idx}" title="${escapeHtml(title)}">${escapeHtml(seg.text)}${badge}</span>`;
  }).join("");

  const counts={grammar:0,identify:0,vocab:0,orthography:0,structure:0,honorific:0};
  hits.forEach(h=>counts[h.type]=(counts[h.type]||0)+1);
  summary.innerHTML = Object.keys(counts).map(k=>`
    <div class="metric"><strong>${counts[k]}</strong><small>${categoryLabels[k]}</small></div>
  `).join("");

  const levelName={"1":"重要ポイントだけ","2":"標準の予習","3":"文法を詳しく","4":"語彙まで細かく","5":"すべての候補"}[level];
  const overlapSegments=segments.filter(seg=>normalizeDrawerPoints(seg.active).length>1).length;
  filterStatus.textContent =
    `確認範囲 ${level}「${levelName}」：表示候補 ${hits.length}件 ／ 複数候補区間 ${overlapSegments}件 ／ レベル判定で省略 ${levelSuppressed}件 ／ 基礎語彙フィルタで省略 ${detected.basicSuppressed}件 ／ 「ここはわかる」で省略 ${knownSuppressed}件`;

  if(!hits.length){
    checklist.innerHTML='<div class="empty">この確認レベルでは表示する予習ポイントがありません。数字を上げると確認箇所が増えます。</div>';
  }else{
    checklist.innerHTML=hits.map((h,idx)=>`
      <div class="item clickable" data-check="${idx}" tabindex="0" role="button" aria-label="${escapeHtml(h.pattern)}のヒントを開く">
        <div class="item-top">
          <div class="word">${escapeHtml(h.pattern)}</div>
          <div class="pill">${categoryLabels[h.type]}</div>
        </div>
        <div class="hint">${escapeHtml(h.hint1)}</div>
      </div>
    `).join("");
  }

  window.__hits = hits;
  window.__segments = segments;

  document.querySelectorAll(".mark[data-seg]").forEach(el=>{
    el.addEventListener("click",()=>{
      const seg=segments[Number(el.dataset.seg)];
      openDrawer(seg.active, seg.text);
    });
  });

  document.querySelectorAll(".item[data-check]").forEach(el=>{
    const openFromChecklist=()=>{
      const h=hits[Number(el.dataset.check)];
      openDrawer(h, h.pattern);
    };
    el.addEventListener("click",openFromChecklist);
    el.addEventListener("keydown",(e)=>{
      if(e.key==="Enter" || e.key===" "){
        e.preventDefault();
        openFromChecklist();
      }
    });
  });
}

function drawerPointLabel(h){
  return h.type==="orthography" ? "仮名遣い" : (categoryLabels[h.type] || h.type);
}

function normalizeDrawerPoints(rawHits){
  const dedup=[];
  const seen=new Set();
  for(const h of rawHits){
    const k=[h.type,h.pattern,h.start,h.end].join("|");
    if(seen.has(k)) continue;
    seen.add(k);
    dedup.push(h);
  }
  if(!dedup.length) return dedup;

  const maxLen=Math.max(...dedup.map(h=>h.end-h.start));
  let points=dedup.filter(h=>(h.end-h.start)===maxLen);

  const identifyKeys=new Set(
    points.filter(h=>h.type==="identify")
      .map(h=>[h.start,h.end,h.pattern].join("|"))
  );
  points=points.filter(h=>{
    if(h.type!=="grammar") return true;
    const k=[h.start,h.end,h.pattern].join("|");
    return !identifyKeys.has(k);
  });

  return points;
}

function orderDrawerPoints(points, surface){
  const special = {"なでふ": {orthography:1, vocab:2}};
  const base = {identify:1,honorific:2,grammar:3,orthography:4,vocab:5,structure:6};
  const spec=special[surface] || null;
  return [...points].sort((a,b)=>{
    const pa=spec?.[a.type] ?? base[a.type] ?? 99;
    const pb=spec?.[b.type] ?? base[b.type] ?? 99;
    return pa-pb || a.tier-b.tier;
  });
}

function currentPoint(){ return currentDrawerHits[currentPointIndex] || null; }

function focusLabelForHit(h){
  if(h.type==="orthography") return "仮名遣い";
  if(h.type==="vocab") return "意味";
  if(h.type==="honorific"){
    if(h.lemma && h.pattern!==h.lemma) return "見出し語";
    return "敬語";
  }
  if(h.type==="identify"){
    const p=h.pattern;
    if(["らむ","なむ","しか","けれ","にて","ばや","して","とも"].includes(p)) return "区切り";
    if(["に","ぬ","ね","ば","て","し","せ","る","む"].includes(p)) return "接続";
    return "見分け";
  }
  if(h.type==="grammar") return "接続";
  if(h.type==="structure") return "文のつながり";
  return drawerPointLabel(h);
}

function focusQuestionForHit(h){
  const p=h.pattern;
  if(h.type==="orthography"){
    if(h.kanaFocus) return `「${h.kanaFocus} → ？」を考える。`;
    return `「${p}」の仮名遣いを確認する。`;
  }
  if(h.type==="identify"){
    const special={
      "らむ":"「らむ」で一語か、「ら」＋「む」か？",
      "なむ":"「なむ」で一語か、「な」＋「む」か？",
      "しか":"「しか」で一語か、「し」＋「か」か？",
      "けれ":"「けれ」だけで一語か、前後とつながる形か？",
      "にて":"「にて」で一語か、「に」＋「て」か？",
      "ばや":"「ばや」で一語か、「ば」＋「や」か？",
      "して":"「して」で一語か、「し」＋「て」か？",
      "とも":"「とも」で一語か、「と」＋「も」か？",
      "に":"この「に」は、前の語とどのようにつながっているか？",
      "ぬ":"この「ぬ」は、直前の活用形からどちらに絞れるか？",
      "ね":"この「ね」は、前後の形からどちらに絞れるか？",
      "ば":"「ば」の直前は未然形か、已然形か？"
    };
    if(special[p]) return special[p];
    return h.hint1 || `「${p}」の見分け方を考える。`;
  }
  if(h.type==="honorific"){
    if(h.lemma && h.pattern!==h.lemma) return `「${h.pattern}」の見出し語は？`;
    if(h.lemma==="給ふ") return "「給ふ」だけで意味があるか、前の動詞とセットか？";
    return "誰の動作で、誰への敬意か？";
  }
  if(h.type==="grammar") return `「${p}」の直前は、どの活用形になっているか？`;
  if(h.type==="vocab") return `「${p}」は、現代語の感覚だけで意味を決められるか？`;
  return h.hint1 || `「${p}」について確認する。`;
}

function mainActionLabelForHit(h){ return actionNounForHit(h); }

function buildCandidateHtml(h){
  const guides=candidateGuideFor(h);
  if(guides && guides.length){
    return '<div class="candidate-list">'+guides.map((g,i)=>`
      <div class="candidate-card">
        <div class="candidate-row">
          <div class="candidate-name">${i+1}. ${escapeHtml(g.name)}</div>
          <button class="mini-toggle" type="button" data-target="focus-mini-${i}">＋ ミニ解説</button>
        </div>
        <div class="mini-detail" id="focus-mini-${i}">
          ${g.freq?`<div class="freq-badge">${escapeHtml(g.freq)}</div>`:""}
          <div class="mini-line">${escapeHtml(g.desc)}</div>
          ${g.ex?`<div class="mini-line"><span class="mini-label">例：</span>${escapeHtml(g.ex)}</div>`:""}
          ${g.check?`<div class="mini-line"><span class="mini-label">見るポイント：</span>${escapeHtml(g.check)}</div>`:""}
          ${g.kakari?`<div class="kakari-note">${escapeHtml(g.kakari)}</div>`:""}
        </div>
      </div>
    `).join('')+'</div>';
  }
  const cs=(h.candidates||[]).map((x,i)=>`<div class="candidate-card"><div class="candidate-name">${i+1}. ${escapeHtml(x)}</div></div>`).join('');
  return cs?'<div class="candidate-list">'+cs+'</div>':'候補は準備中です。';
}
