function openDrawer(hitOrHits, surfaceText){
  const rawHits=Array.isArray(hitOrHits)?hitOrHits:[hitOrHits];
  const normalized=normalizeDrawerPoints(rawHits);
  const h=dominantHit(normalized);
  if(!h) return;
  const displaySurface=(surfaceText && surfaceText.length>=(h.end-h.start)) ? surfaceText : h.pattern;
  currentSurfaceText=displaySurface;
  currentDrawerHits=orderDrawerPoints(normalized,displaySurface);
  currentCompletedPointKeys=new Set();
  drawerNeedsRender=false;
  currentPointIndex=0;
  currentDrawerHit=currentPoint();
  document.getElementById("drawerWord").textContent="「"+displaySurface+"」";
  document.getElementById("drawerCategory").textContent="";
  renderCurrentFocus();
  const d=document.getElementById("drawer");
  d.classList.add("open");
  d.setAttribute("aria-hidden","false");
  document.body.classList.add("drawer-open");
}

function closeDrawer(){
  const d=document.getElementById("drawer");
  d.classList.remove("open");
  d.setAttribute("aria-hidden","true");
  document.body.classList.remove("drawer-open");
  if(drawerNeedsRender){ drawerNeedsRender=false; render(); }
}

function goNextPoint(){
  if(currentPointIndex < currentDrawerHits.length-1){
    currentPointIndex++;
    currentDrawerHit=currentPoint();
    renderCurrentFocus();
  }
}

function markCurrentPointKnown(){
  const h=currentPoint(); if(!h) return;
  const key=hitKey(h);
  dismissedKeys.add(key);
  currentCompletedPointKeys.add(key);
  drawerNeedsRender=true;
  const nextIndex=currentDrawerHits.findIndex((x,i)=>i>currentPointIndex && !currentCompletedPointKeys.has(hitKey(x)));
  const anyIndex=nextIndex>=0 ? nextIndex : currentDrawerHits.findIndex(x=>!currentCompletedPointKeys.has(hitKey(x)));
  if(anyIndex<0){ closeDrawer(); return; }
  currentPointIndex=anyIndex;
  currentDrawerHit=currentPoint();
  renderCurrentFocus();
}

document.getElementById("analyze").addEventListener("click",render);
document.getElementById("checkLevel").addEventListener("change",render);
document.getElementById("sample1").addEventListener("click",()=>{
  document.getElementById("input").value="春はあけぼの。やうやう白くなりゆく山ぎは、すこしあかりて、紫だちたる雲のほそくたなびきたる。";
  dismissedKeys.clear(); render();
});
document.getElementById("sample2").addEventListener("click",()=>{
  document.getElementById("input").value="花の色はうつりにけりないたづらにわが身世にふるながめせしまに";
  dismissedKeys.clear(); render();
});
document.getElementById("sample3").addEventListener("click",()=>{
  document.getElementById("input").value="花咲きぬ。知らぬ人の来なむを待つ。都にて会はばやと思ひけれど、いかならむ。";
  dismissedKeys.clear(); render();
});
document.getElementById("sample4").addEventListener("click",()=>{
  document.getElementById("input").value="今は昔、御堂関白殿、法成寺を建立し給ひて後は、日ごとに御堂へ参らせ給ひけるに、白き犬を愛してなむ飼はせ給ひければ、いつも御身を離れず御供しけり。ある日例のごとく御供しけるが、門を入らむとし給へば、この犬御さきに塞がるやうにまはりて、内へ入れ奉らじとしければ、「なでふ。」とて、車より降りて入らむとし給へば、御衣の裾をくひて、引きとどめ申さむとしければ、「いかさま、やうある事ならむ。」とて、榻を召し寄せて御尻を掛けて、晴明に、「きと参れ。」と召しに遣はしたりければ、晴明則ち参りたり。\n\n「かかることのあるはいかが。」と尋ね給ひければ、晴明しばし占ひて申しけるは、「これは君を呪詛し奉りて候ふ物を道に埋みて候ふ。御越しあらましかば、悪しく候ふべき。犬は通力のものにて、告げ申して候ふなり。」と申せば、「さてそれはいづくにか埋みたる。あらはせ。」とのたまへば、「やすく候ふ。」と申して、しばし占ひて、「ここにて候ふ。」と申す所を、掘らせて見給ふに、土五尺ばかり掘りたりければ、案のごとく物ありけり。土器を二つうち合せて、黄なる紙捻にて十文字にからげたり。開いて見れば、中には物もなし。朱砂にて、一文字を、土器の底に書きたるばかりなり。\n\n「晴明が外には知りたる者候はず。もし道摩法師や仕りたるらむ。糺して見候はむ。」とて、懐より紙を取り出だし、鳥の姿に引き結びて、呪を誦じかけて、空へ投げ上げたれば、たちまちに白鷺になりて、南をさして飛び行きけり。「この鳥の落ちつかむ所を見て参れ。」とて、下部を走らするに、六条坊門万里小路辺に、古りたる家の諸折戸の中へ落ち入りにけり。則ち家主、老法師にてありける、からめ取りて参りたり。\n\n呪詛の故を問はるるに、「堀河左大臣顕光公のかたりを得て仕りたり。」とぞ申しける。「この上は流罪すべけれども、道摩が科にはあらず。」とて、「向後、かかるわざすべからず。」とて、本国播磨へ追ひ下されにけり。\n\nこの顕光公は死後に怨霊となりて、御堂殿辺へは崇りをなされけり。悪霊左府と名づく云々。犬はいよいよ不便にせさせ給ひけるとなむ。";
  dismissedKeys.clear(); render();
});
document.getElementById("clear").addEventListener("click",()=>{document.getElementById("input").value=""; dismissedKeys.clear(); render();});
document.getElementById("closeDrawer").addEventListener("click",closeDrawer);
document.getElementById("focusMainAction").addEventListener("click",openPrimaryGuidance);
document.getElementById("focusOverview").addEventListener("click",(e)=>{
  const btn=e.target.closest("[data-point-index]"); if(!btn || btn.disabled) return;
  currentPointIndex=Number(btn.dataset.pointIndex);
  currentDrawerHit=currentPoint();
  renderCurrentFocus();
});
document.getElementById("nextPoint").addEventListener("click",goNextPoint);
document.getElementById("markPointKnown").addEventListener("click",markCurrentPointKnown);
document.getElementById("restoreAllKnown").addEventListener("click",()=>{
  dismissedKeys.clear();
  render();
});
document.getElementById("knownList").addEventListener("click",(e)=>{
  const btn=e.target.closest("[data-known-index]");
  if(!btn) return;
  const h=window.__knownHits?.[Number(btn.dataset.knownIndex)];
  if(!h) return;
  dismissedKeys.delete(hitKey(h));
  render();
});
document.getElementById("focusTools").addEventListener("click",(e)=>{
  const btn=e.target.closest("[data-focus-tool]"); if(!btn) return; openFocusExtra(btn.dataset.focusTool);
});
document.getElementById("focusExtra").addEventListener("click",(e)=>{
  const mini=e.target.closest(".mini-toggle");
  if(mini){
    const detail=document.getElementById(mini.dataset.target);
    if(detail){ const open=detail.classList.toggle("open"); mini.textContent=open ? "− 閉じる" : "＋ ミニ解説"; }
    return;
  }
  const answer=e.target.closest("#focusRevealAnswer");
  if(answer){
    const result=document.getElementById("focusAnswerResult");
    if(result){ const open=result.classList.toggle("open"); answer.textContent=open ? "− 隠す" : "＋ 表示する"; }
  }
});
document.getElementById("drawer").addEventListener("click",(e)=>{ if(e.target.id==="drawer") closeDrawer(); });
render();
loadCheckpointData().then(()=>render());