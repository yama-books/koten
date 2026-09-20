function toolButtonsForHit(h){
  const buttons=[];
  if((h.examples||[]).length || examplesForHit(h).length){
    buttons.push('<button class="secondary" type="button" data-focus-tool="examples">＋ 類例</button>');
  }
  const guides=candidateGuideFor(h);
  if((guides && guides.length) || (h.candidates||[]).length){
    if(h.type!=="vocab") buttons.push('<button class="secondary" type="button" data-focus-tool="candidates">＋ 候補</button>');
  }
  if(h.type==="orthography"){
    const exceptions=kanaExceptionsForHit(h);
    if(exceptions.length) buttons.push('<button class="secondary" type="button" data-focus-tool="exceptions">＋ 例外</button>');
    if(h.modernKana) buttons.push('<button class="ghost" type="button" data-focus-tool="answer">＋ 答え</button>');
  }
  if(h.type==="honorific" && h.lemma && h.pattern!==h.lemma){
    buttons.push('<button class="secondary" type="button" data-focus-tool="honorific">＋ 敬語</button>');
  }
  return buttons.join("");
}

function openPrimaryGuidance(){
  const h=currentPoint(); if(!h) return;
  const guidance=document.getElementById("focusGuidance");
  const tools=document.getElementById("focusTools");
  const action=document.getElementById("focusMainAction");
  const isOpen=guidance.classList.contains("open");

  if(isOpen){
    guidance.classList.remove("open");
    tools.classList.remove("open");
    document.getElementById("focusExtra").classList.remove("open");
    action.textContent=mainActionLabelForHit(h);
    action.dataset.open="false";
    return;
  }

  guidance.innerHTML=guidanceHtmlForHit(h);
  guidance.classList.add("open");
  const toolHtml=toolButtonsForHit(h);
  tools.innerHTML=toolHtml;
  if(toolHtml) tools.classList.add("open");
  setFocusToolButtonStates("");
  action.textContent="− "+actionNounForHit(h);
  action.dataset.open="true";
}

function setFocusToolButtonStates(openKind=""){
  document.querySelectorAll("#focusTools [data-focus-tool]").forEach(btn=>{
    const kind=btn.dataset.focusTool;
    const labels={examples:"類例",candidates:"候補",exceptions:"例外",honorific:"敬語",answer:"答え"};
    btn.textContent=(kind===openKind?"− ":"＋ ")+(labels[kind]||kind);
  });
}

function openFocusExtra(kind){
  const h=currentPoint(); if(!h) return;
  const extra=document.getElementById("focusExtra");
  if(extra.classList.contains("open") && extra.dataset.kind===kind){
    extra.classList.remove("open"); extra.dataset.kind=""; setFocusToolButtonStates(""); return;
  }
  if(kind==="examples"){
    const ex=examplesForHit(h);
    extra.innerHTML='<div class="focus-extra-title">類例</div>'+(ex.length?'<ul>'+ex.map(x=>'<li>'+formatExample(x)+'</li>').join('')+'</ul>':'');
  }else if(kind==="candidates"){
    extra.innerHTML='<div class="focus-extra-title">候補</div>'+buildCandidateHtml(h);
  }else if(kind==="exceptions"){
    const ex=kanaExceptionsForHit(h);
    extra.innerHTML='<div class="focus-extra-title">例外</div>'+'<ul class="compact-bullets">'+ex.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul>';
  }else if(kind==="honorific"){
    extra.innerHTML='<div class="focus-extra-title">敬語</div>'+'<ul class="compact-bullets">'+honorificNextGuidance(h).map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul>';
  }else if(kind==="answer"){
    extra.innerHTML=`<div class="focus-extra-title">現代仮名遣い</div>
       <button class="ghost" id="focusRevealAnswer" type="button">表示</button>
       <div class="focus-answer-result" id="focusAnswerResult">${escapeHtml(h.pattern)} → ${escapeHtml(h.modernKana||"")}</div>`;
  }
  extra.dataset.kind=kind;
  extra.classList.add("open");
  setFocusToolButtonStates(kind);
}
