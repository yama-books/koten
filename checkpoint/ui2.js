const KANA_RULE_SHORT = {
  "H1":"語中・語尾：は・ひ・ふ・へ・ほ → わ・い・う・え・お",
  "H1-a":"語頭のハ行：変えない",
  "H1-b":"複合語の後部要素の語頭：変えない",
  "H1-c":"助詞「は」「へ」：変えない",
  "W1":"ゐ → い ／ ゑ → え",
  "W2":"助詞以外の「を」→ お",
  "W2-a":"助詞「を」：変えない",
  "D1":"原則：ぢ → じ ／ づ → ず",
  "D1-a":"同音のくり返し・二語の組合せ：ぢ・づのまま",
  "K1":"くわ → か ／ ぐわ → が",
  "N1":"指定された文法形の「む」→ ん",
  "L1":"ア段＋う → オ段＋う",
  "L2":"イ段＋う → ゅ＋う",
  "L3":"エ段＋う → ょ＋う",
  "L4":"オ段＋う：表記は変えない",
  "S1":"拗音のや・ゆ・よ／促音のつ：小さく書く"
};

function compactSentence(text){
  return (text||"").trim().replace(/[。]+$/,"").replace(/確認してみましょう$/,"確認").replace(/確認しましょう$/,"確認").replace(/見比べましょう$/,"見比べる").replace(/考えてみましょう$/,"考える").replace(/手がかりにしましょう$/,"手がかり").replace(/見てみましょう$/,"見る");
}

function guidanceItemsForHit(h){
  if(h.type==="orthography"){
    const ids=(h.kanaRuleIds&&h.kanaRuleIds.length) ? h.kanaRuleIds : (h.kanaRuleId?[h.kanaRuleId]:[]);
    const items=[];
    ids.forEach(id=>{ if(KANA_RULE_SHORT[id]) items.push(KANA_RULE_SHORT[id]); });
    if(h.lemma && h.lemma!==h.pattern) items.unshift(`見出し語：${h.lemma}`);
    if(h.formLabels && h.formLabels.length) items.unshift(`活用：${h.formLabels.join("・")}`);
    return [...new Set(items.length?items:["語全体で仮名遣いを確認"])];
  }
  if(h.type==="vocab"){
    const heads=(h.headwordCandidates||[]).filter(Boolean); const items=[];
    if(heads.length){ const label=h.headwordVerified ? "見出し語" : "見出し語候補"; items.push(`${label}：${heads.join("／")}`); }
    items.push("文脈に合う語義を確認");
    return items;
  }
  if(h.type==="honorific"){
    if(h.lemma && h.pattern!==h.lemma) return ["活用した形から見出し語を考える", "敬語としての働き"];
    if(h.lemma==="給ふ") return ["単独で意味があるか", "前の動詞とセットか", "活用形"];
    return ["誰の動作か", "誰への敬意か", "本動詞か補助動詞か"];
  }
  const parts=(h.hint2||h.hint1||"").split("。").map(compactSentence).filter(Boolean);
  return parts.slice(0,3);
}

function actionNounForHit(_h){
  return "ヒント";
}

function renderOverview(){
  const box=document.getElementById("focusOverview");
  if(currentDrawerHits.length<=1){ box.style.display="none"; box.innerHTML=""; return; }
  box.style.display="";
  box.innerHTML='<div class="focus-overview-row">'+currentDrawerHits.map((h,i)=>{
    const cls=["focus-overview-item",i===currentPointIndex?"current":""].filter(Boolean).join(" ");
    return `<button type="button" class="${cls}" data-point-index="${i}">${escapeHtml(drawerPointLabel(h))}</button>`;
  }).join('')+'</div>';
}

function renderCurrentFocus(){
  const h=currentPoint(); if(!h) return;
  renderOverview();
  document.getElementById("focusMeta").textContent="";
  document.getElementById("focusMeta").style.display="none";
  document.getElementById("focusQuestion").innerHTML=`<span class="focus-label">${escapeHtml(focusLabelForHit(h))}</span>${escapeHtml(focusQuestionForHit(h))}`;
  const action=document.getElementById("focusMainAction");
  action.textContent=mainActionLabelForHit(h); action.dataset.open="false";
  document.getElementById("focusGuidance").classList.remove("open");
  document.getElementById("focusTools").classList.remove("open");
  document.getElementById("focusExtra").classList.remove("open");
  document.getElementById("focusExtra").innerHTML="";
  document.getElementById("focusExtra").dataset.kind="";
  document.querySelector(".drawer").scrollTop=0;
}

function guidanceHtmlForHit(h){
  const items=guidanceItemsForHit(h);
  let html='<ul class="compact-bullets">'+items.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul>';
  if(h.type==="orthography" && kanaExceptionsForHit(h).length) html+='<div class="flow-note">※ 一部例外あり</div>';
  return html;
}

function kanaExceptionsForHit(h){
  if(h.type!=="orthography") return [];
  const ids=(h.kanaRuleIds&&h.kanaRuleIds.length) ? h.kanaRuleIds : (h.kanaRuleId?[h.kanaRuleId]:[]);
  const out=[];
  ids.forEach(id=>{ KANA_RULE_DEFS.filter(x=>x.parent===id).forEach(x=>{ const text=KANA_RULE_SHORT[x.id] || x.brief; if(text) out.push(text); }); });
  return [...new Set(out)];
}

function honorificGuidance(h){
  return ["誰の動作か","誰への敬意か","本動詞か補助動詞か","普通の言い方に直すと何をしているか"];
}
