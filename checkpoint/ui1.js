function shadowDebugEnabled(){
  try{
    const params=new URLSearchParams(window.location.search||"");
    return params.get("debug")==="shadow" || window.location.hash==="#shadow-debug";
  }catch(_err){
    return false;
  }
}

function shadowDebugCountBy(items, keyFn){
  const out={};
  for(const item of items||[]){
    const key=keyFn(item)||"unknown";
    out[key]=(out[key]||0)+1;
  }
  return out;
}

function renderShadowDebugPanel(text, legacyHits, audit){
  const panel=document.getElementById("shadowDebugPanel");
  const summary=document.getElementById("shadowDebugSummary");
  const details=document.getElementById("shadowDebugDetails");
  if(!panel || !summary || !details) return;

  const enabled=shadowDebugEnabled();
  panel.hidden=!enabled;
  if(!enabled) return;

  if(!text || typeof resolveDbShadowHits!=="function"){
    summary.textContent="本文を入力するとshadow監査を表示します。";
    details.textContent="";
    return;
  }

  const state=resolveDbShadowHits(text);
  window.CHECKPOINT_LAST_SHADOW_STATE=state;

  const legacyComparable=(legacyHits||[]).filter(h=>h.type==="grammar" || h.type==="identify");
  const legacyUnique=new Set(legacyComparable.map(h=>`${h.start}:${h.end}:${h.pattern||h.surface}`)).size;
  const benchmark=state.suppressed.filter(h=>h.suppressedReason==="context-intentional-ambiguity-benchmark");
  const primary=state.suppressed.filter(h=>h.suppressedReason==="context-primary-source-hold");
  const unclassified=state.suppressed.filter(h=>
    h.suppressedReason==="context-required-not-yet-resolved" ||
    h.suppressedReason==="context-supported-but-not-unique"
  );

  summary.textContent =
    `legacy unique ${legacyUnique} / DB raw ${state.raw.length} / resolved ${state.resolved.length} / strict ${audit?.strictResolvedHitCount??"?"} / ambiguous ${audit?.ambiguousResolvedHitCount??"?"} / suppressed ${state.suppressed.length} / `+
    `hold benchmark ${benchmark.length} / primary ${primary.length} / unclassified ${unclassified.length} / DB only ${audit?.dbOnly?.length??"?"}`;

  const resolvedReasons=shadowDebugCountBy(state.resolved,h=>
    h.contextResolution?.status || h.analysisConfidence || "plain"
  );
  const suppressedReasons=shadowDebugCountBy(state.suppressed,h=>h.suppressedReason||"unknown");
  const holdLines=[...benchmark,...primary].map(h=>
    `  [${h.holdPolicy?.holdType||"hold"}] ${h.surface}@${h.start}: ${h.holdPolicy?.issue||h.holdPolicy?.reason||""}`
  );
  const unclassifiedLines=unclassified.map(h=>
    `  [unclassified] ${h.surface}@${h.start}: ${h.contextResolution?.status||h.suppressedReason}`
  );
  const dbOnlyLines=(audit?.dbOnly||[]).map(h=>`  ${h.surface}@${h.start}-${h.end} ${h.analysisConfidence||""}`);

  details.textContent=[
    "resolved reasons",
    ...Object.entries(resolvedReasons).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`  ${k}: ${v}`),
    "",
    "suppressed reasons",
    ...Object.entries(suppressedReasons).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`  ${k}: ${v}`),
    "",
    "holds",
    ...(holdLines.length?holdLines:["  none"]),
    "",
    "unclassified context",
    ...(unclassifiedLines.length?unclassifiedLines:["  none"]),
    "",
    "DB only",
    ...(dbOnlyLines.length?dbOnlyLines:["  none"])
  ].join("\n");
}


function knownPointContext(text,h){
  const left=Math.max(0,h.start-8);
  const right=Math.min(text.length,h.end+8);
  const before=text.slice(left,h.start);
  const focus=text.slice(h.start,h.end) || h.pattern || "";
  const after=text.slice(h.end,right);
  return `${left>0?"…":""}${before}【${focus}】${after}${right<text.length?"…":""}`;
}

function uniqueKnownHits(detectedHits){
  const out=[];
  const seen=new Set();
  for(const h of detectedHits||[]){
    const key=hitKey(h);
    if(!dismissedKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out.sort((a,b)=>a.start-b.start || a.end-b.end || String(a.type).localeCompare(String(b.type)));
}

function renderKnownHistory(text,detectedHits){
  const box=document.getElementById("knownHistory");
  const status=document.getElementById("knownHistoryStatus");
  const list=document.getElementById("knownList");
  if(!box || !status || !list) return;

  const known=uniqueKnownHits(detectedHits);
  window.__knownHits=known;
  box.hidden=known.length===0;
  if(!known.length){
    status.textContent="";
    list.innerHTML="";
    return;
  }

  status.textContent=`${known.length}件。本文中から隠したポイントです。必要なら個別に戻せます。`;
  list.innerHTML=known.map((h,idx)=>`
    <div class="known-item">
      <div class="known-item-main">
        <div class="known-item-title">
          <span class="word">${escapeHtml(h.pattern)}</span>
          <span class="pill">${escapeHtml(drawerPointLabel(h))}</span>
        </div>
        <div class="known-context">${escapeHtml(knownPointContext(text,h))}</div>
      </div>
      <button class="ghost known-restore-one" type="button" data-known-index="${idx}" aria-label="${escapeHtml(h.pattern)}を予習ポイントに戻す">戻す</button>
    </div>
  `).join("");
}

function render(){
  const text=document.getElementById("input").value.trim();
  if(text!==dismissedTextSnapshot){
    dismissedKeys.clear();
    dismissedTextSnapshot=text;
  }
  const reading=document.getElementById("reading");
  const checklist=document.getElementById("checklist");
  const summary=document.getElementById("summary");
  const filterStatus=document.getElementById("filterStatus");

  if(!text){
    reading.innerHTML='<div class="empty">本文を貼り付けてください。</div>';
    checklist.innerHTML='<div class="empty">まだ予習ポイントはありません。</div>';
    summary.innerHTML='';
    filterStatus.textContent='';
    renderKnownHistory("",[]);
    renderShadowDebugPanel("",[],null);
    return;
  }

  const level=document.getElementById("checkLevel").value;
  const limit=LEVEL_LIMIT[level];
  const detected=detect(text, level);
  let shadowAudit=null;
  if(shadowDebugEnabled() && typeof shadowAuditLegacyVsDb==="function" && window.CHECKPOINT_DATA?.surfaceIndex){
    shadowAudit=shadowAuditLegacyVsDb(text, detected.hits);
  }
  renderShadowDebugPanel(text,detected.hits,shadowAudit);

  const notDismissed=detected.hits.filter(h=>!dismissedKeys.has(hitKey(h)));
  const hits=notDismissed.filter(h=>h.tier<=limit);

  const levelSuppressed=notDismissed.length-hits.length;
  const knownSuppressed=detected.hits.length-notDismissed.length;
  renderKnownHistory(text,detected.hits);

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
