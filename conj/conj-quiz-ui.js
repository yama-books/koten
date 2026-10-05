// Thin bridge to the classic index.html state, renderer and record storage.
let quizEngine=null, quizAdapter=null, quizState=null, quizRecords=[], quizMaster=[], quizChoices=[];
let quizLoadFailed=false, quizRowChoices=[], quizPreviousMode='table', quizExamplePreference=true;
let quizMasterPractice={form:[],type:[]}, quizAutoScrolled=false, quizResolveItemId=null;
const quizSettings={choiceScope:'auto',supportLevel:0,rowMode:'auto'};
function isIdentificationMode(){return document.getElementById('quizMode').value!=='table';}

async function initQuizUI(){
  try{
    [quizEngine,quizAdapter]=await Promise.all([import('./conj-quiz-engine.mjs?v=20261006-19'),import('./conj-quiz-adapter.mjs?v=20261006-19')]);
    stats.quiz=quizAdapter.normalizeHistory(stats.quiz);
    quizMaster=quizAdapter.masterFromItems(items);
    const optionalRecords=async url=>{try{const response=await fetch(url);return response.ok?(await response.json()).records||[]:[];}catch(_error){return[];}};
    const [publicAdjvRecords,auxExampleRecords]=await Promise.all([
      optionalRecords('./data/adjectival-noun-public-examples.json'),
      optionalRecords('./data/aux-examples.json')
    ]);
    renderSourceCredits([...sourceCreditArgs.publicRecords,...publicAdjvRecords],sourceCreditArgs.chj);
    quizMasterPractice=quizAdapter.buildMasterPractice(items,{publicAdjvRecords,auxExampleRecords});
    quizRecords=await quizAdapter.loadQuizRecords(items);
    if(quizRecords.length) refreshSourceCredits();
    // Name each example's drill item, then move old answers into the running totals once.
    const itemIds=new Map([...quizMasterPractice.form,...quizMasterPractice.type,...quizRecords].map(e=>[e.exampleId,e.itemId]));
    quizResolveItemId=exampleId=>itemIds.get(exampleId)??null;
    const pending=!stats.quiz?.totals;
    stats.quiz=quizAdapter.normalizeHistory(stats.quiz,{resolveItemId:quizResolveItemId});
    if(pending){try{localStorage.setItem(RECORD_STORAGE_KEY,JSON.stringify(stats));}catch(_error){}}
    updateScore();
    try{
      const saved=JSON.parse(localStorage.getItem('conjQuizPreferences')||'{}');
      if(['auto','near','part_of_speech','cross_pos','all'].includes(saved.choiceScope)) quizSettings.choiceScope=saved.choiceScope==='near'?'auto':saved.choiceScope;
      if([0,1,2].includes(saved.supportLevel)) quizSettings.supportLevel=saved.supportLevel===2?2:0;
      if(['auto','omitted','select','input'].includes(saved.rowMode)) quizSettings.rowMode=saved.rowMode;
    }catch(_error){}
  }catch(_error){quizLoadFailed=true;}
  for(const [id,value] of Object.entries(quizSettings)) document.getElementById(id).value=value;
  document.getElementById('quizMode').disabled=false;
  document.getElementById('closeQuizTable').addEventListener('click',()=>document.getElementById('quizTableDialog').close());
  const shortcut=document.getElementById('openQuizModes');shortcut.hidden=false;
  shortcut.addEventListener('click',()=>{
    const dialog=document.getElementById('settingsDialog');window.activateSettingsTab?.('difficulty');dialog.showModal();document.getElementById('quizMode').focus();
  });
  document.querySelectorAll('[data-quiz-mode]').forEach(button=>{
    button.disabled=false;
    button.addEventListener('click',()=>{
      const select=document.getElementById('quizMode');
      if(select.value===button.dataset.quizMode)return;
      select.value=button.dataset.quizMode;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    });
  });
  document.getElementById('quizMode').addEventListener('change',()=>{
    const mode=document.getElementById('quizMode').value;
    shortcut.textContent={table:'活用表 ▾',form:'活用形 ▾',type:'活用種類 ▾'}[mode];
    document.querySelectorAll('[data-quiz-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.quizMode===mode)));
    if(quizPreviousMode==='table')quizExamplePreference=document.getElementById('showExample').checked;
    if(mode==='table')document.getElementById('showExample').checked=quizExamplePreference;
    quizPreviousMode=mode;closeEditor(false);
    const dialog=document.getElementById('settingsDialog');if(dialog.open)dialog.close();
    nextQuestion();
  });
  for(const id of ['choiceScope','supportLevel','rowMode']) document.getElementById(id).addEventListener('change',()=>{
    quizSettings[id]=id==='supportLevel'?Number(document.getElementById(id).value):document.getElementById(id).value;
    try{localStorage.setItem('conjQuizPreferences',JSON.stringify(quizSettings));}catch(_error){}
    if(isIdentificationMode()) nextQuestion(); else updateQuizStageUI();
  });
  document.getElementById('openQuizStageHelp').addEventListener('click',()=>{
    updateQuizStageUI();
    const dialog=document.getElementById('quizStageDialog');if(!dialog.open)dialog.showModal();
  });
  document.getElementById('closeQuizStage').addEventListener('click',()=>document.getElementById('quizStageDialog').close());
  document.getElementById('quizStageDialog').addEventListener('click',event=>{if(event.target===event.currentTarget)event.currentTarget.close();});
}

function nextQuizQuestion(){
  const mode=document.getElementById('quizMode').value;
  const pos=document.getElementById('pos').value;
  const labels={verb:'動詞',adj:'形容詞',adjv:'形容動詞',aux:'助動詞'};
  const eligible=quizRecords.filter(e=>quizEngine?.isPublicQuizEligible(e,mode) && (pos==='all'||e.partOfSpeech===labels[pos]));
  const previous=quizState?.example;
  const ex=eligible.length
    ? quizEngine.pickQuestion(eligible,{quizMode:mode,attentionWeight:.65,lastExampleId:previous?.exampleId})
    : quizAdapter?.pickMasterPractice(quizMasterPractice[mode].filter(e=>pos==='all'||e.partOfSpeech===labels[pos]),previous?.origin==='master'?previous.itemId:null);
  if(!ex){
    current=null;quizState=null;answered=false;answers={};blankSlots=new Set();
    renderQuizUI();return;
  }
  current={...ex.tableItem};answers={};selected=null;answered=false;blankSlots=new Set();
  const masteryStage=quizEngine.quizMasteryStage?.(stats.quiz,ex.partOfSpeech,mode)??0;
  const resolvedScope=quizSettings.choiceScope==='auto'
    ? (quizEngine.scopeForMasteryStage?.(masteryStage)??['near','part_of_speech','cross_pos','all'][Math.min(3,masteryStage)])
    : quizSettings.choiceScope;
  const resolvedRowMode=quizEngine.rowModeForMasteryStage?.(masteryStage,quizSettings.rowMode)
    ?? (quizSettings.rowMode==='auto'?(masteryStage>=2?'select':'omitted'):quizSettings.rowMode);
  quizState=quizEngine.createQuizState({example:ex,quizMode:mode,...quizSettings,choiceScope:resolvedScope,rowMode:resolvedRowMode});
  quizState.rowSetting=quizSettings.rowMode;
  quizState.shortLabels=mode==='type' && (quizEngine.shouldUseShortTypeLabels?.(stats.quiz,ex.partOfSpeech)??false);
  quizState.masteryStage=masteryStage;
  quizRowChoices=[];
  const tableDialog=document.getElementById('quizTableDialog');if(tableDialog.open)tableDialog.close();
  document.getElementById('quizChoices').scrollTop=0;
  if(quizAutoScrolled){quizAutoScrolled=false;window.scrollTo({top:0});}
  quizChoices=mode==='form'?quizEngine.buildFormChoices():quizEngine.buildTypeChoices({example:ex,masterEntries:quizMaster,scope:quizState.choiceScope});
  quizRowChoices=mode==='type'?quizEngine.buildRowChoicesForTypes(quizMaster,quizChoices):[];
  render();
}

function quizDifficultyIsAutomatic(mode=document.getElementById('quizMode').value){
  if(mode==='table')return true;
  if(Number(quizSettings.supportLevel)!==0)return false;
  if(mode==='form')return true;
  return quizSettings.choiceScope==='auto'&&quizSettings.rowMode==='auto';
}
function updateQuizStageUI(){
  const status=document.getElementById('quizStageStatus');
  if(!status)return;
  const mode=document.getElementById('quizMode').value;
  const active=mode!=='table'&&!!quizState;
  status.hidden=!active;
  if(!active)return;
  const manual=!quizDifficultyIsAutomatic(mode);
  const stage=quizEngine?.quizMasteryStage?.(stats.quiz,quizState.example.partOfSpeech,mode)??quizState.masteryStage??0;
  const badge=document.getElementById('quizStageBadge');
  badge.textContent=manual?'手動':`段階 ${stage+1}/4`;
  badge.dataset.manual=String(manual);
  document.getElementById('quizStageCurrent').textContent=manual
    ? '現在は設定した難しさで出題しています。'
    : `現在は段階 ${stage+1}/4 です。学習段階に応じた難易度で出題されます。`;
  const next=[
    '次の段階：直近8問のうち5問以上に取り組み、ヒントなし正解3問以上・誤答1問以下。',
    '次の段階：直近12問のうち10問以上に取り組み、ヒントなし正解9問以上・誤答1問以下。',
    '次の段階：直近20問のうち18問以上に取り組み、ヒントなし正解16問以上・誤答2問以下。',
    '最高段階です。'
  ][stage]||'';
  document.getElementById('quizStageNext').textContent=manual
    ? '「難しさ」で学習に合わせる設定へ戻すと、段階に応じた自動調整を再開します。'
    : next;
}

function applyQuizTableMask(){
  const panel=document.getElementById('tablePanel');
  if(!quizState || !isIdentificationMode()){
    delete panel.dataset.support;
    panel.querySelectorAll('.quiz-masked,.quiz-answer').forEach(e=>e.classList.remove('quiz-masked','quiz-answer'));
    panel.querySelectorAll('[aria-hidden]').forEach(e=>{if(e.matches('td>*'))e.removeAttribute('aria-hidden');});
    return;
  }
  const level=quizState.answered?2:quizState.hintLevel;
  panel.dataset.support=quizState.answered?'answered':['hidden','partial','full'][level];
  const mask=quizEngine.buildHintMask({quizMode:quizState.quizMode,hintLevel:level,example:quizState.example,tableRows:current.forms.map(display),masteryStage:quizState.masteryStage});
  document.querySelectorAll('#formBody > tr').forEach((tr,i)=>{
    const hidden=!mask.visibleIndexes.includes(i);
    tr.classList.toggle('quiz-masked',hidden);
    tr.classList.toggle('quiz-answer',quizState.answered && names[i]===quizState.example.form);
    tr.querySelectorAll('td>*').forEach(e=>hidden?e.setAttribute('aria-hidden','true'):e.removeAttribute('aria-hidden'));
  });
  // Table title/column headings are never the answer type, and the correct row is
  // only highlighted after grading. Preserve this DOM across hint transitions.
  document.getElementById('trackHeads').setAttribute('aria-hidden','true');
}

function renderQuizUI(){
  const active=isIdentificationMode();
  const card=document.querySelector('main.card');
  card.classList.toggle('is-quiz',active);
  // Every identification question (table practice or a quoted example) shows its sentence in the
  // centred, wrapped panel while the table is hidden; the drill's narrow column cannot hold prose.
  card.classList.toggle('quiz-example-layout',active && !!quizState);
  document.getElementById('levelMeters').hidden=active;
  const formMode=document.getElementById('quizMode').value==='form';
  document.getElementById('choiceScope').disabled=formMode;
  document.getElementById('rowMode').disabled=formMode;
  for(const id of ['choiceScope','rowMode'])document.getElementById(id).closest('label').hidden=formMode;
  document.getElementById('showExample').closest('.example-toggle').hidden=active;
  updateQuizStageUI();
  document.getElementById('quizPrompt').hidden=!active || !quizState;
  document.getElementById('quizAnswerPanel').hidden=!active || !quizState;
  document.getElementById('quizEmpty').hidden=!active || !!quizState;
  card.querySelector('.study-layout').style.display=active&&!quizState?'none':'';
  for(const id of ['lemma','lemmaAid','kind','posTag']) document.getElementById(id).style.display=active&&!quizState?'none':'';
  placeQuizTable();
  if(!active){
    document.getElementById('showExample').disabled=false;
    document.getElementById('showExample').closest('.example-toggle').hidden=false;
    document.getElementById('reveal').textContent='答えを見る';
    document.getElementById('check').textContent='採点';document.getElementById('check').disabled=false;
    applyQuizTableMask();return;
  }
  document.getElementById('showExample').disabled=true;
  if(!quizState){
    document.getElementById('quizEmpty').textContent=quizLoadFailed?'問題を読み込めませんでした。活用表ドリルをご利用ください。':'この範囲の判別問題は準備中です。活用表ドリルで練習できます。';
    document.getElementById('feedback').textContent='';
    document.getElementById('perfectResult').classList.remove('show','is-placed');
    for(const id of ['check','reveal','next']) document.getElementById(id).style.display='none';
    return;
  }
  document.getElementById('quizPrompt').textContent=quizState.quizMode==='form'?'例文で強調した部分は何形？':'例文で強調した部分の活用の種類は？';
  if(!quizState.answered){
    // Remove the hidden answer text from accessibility APIs as well as sight.
    document.getElementById('kind').textContent='';
  }
  applyQuizTableMask();
  renderQuizChoices();renderQuizRowAnswer();
  if(quizTableInDialog()){
    // 表はダイアログで見せるので、ヒントを使い切ったあとや回答後も「表を見る」で開き直せる。
    document.getElementById('reveal').textContent=quizState.hintLevel===0&&!quizState.answered?'ヒントを見る':'表を見る';
    document.getElementById('reveal').style.display='inline-block';
  }else{
    document.getElementById('reveal').textContent=quizState.hintLevel===0?'ヒントを見る':'表全体を見る';
    document.getElementById('reveal').style.display=quizState.answered||quizState.hintLevel===2?'none':'inline-block';
  }
  document.getElementById('check').style.display='none';
  document.getElementById('next').style.display=quizState.answered?'inline-block':'none';
  requestAnimationFrame(()=>{syncQuizFormChoiceHeight();syncStudyHeights();});
}
// スマホで表を隠している間に、活用形の6段のせいでカードが画面の下へはみ出すときは、
// 表の行と同じ変数（--mobile-form-row-h）を詰めて、操作ボタンを画面内に残す。押しやすさのため 48px より低くしない。
function fitQuizFormChoices(){
  const card=document.querySelector('main.card');
  if(window.innerWidth>700||!quizState||quizState.quizMode!=='form'||document.getElementById('tablePanel').dataset.support!=='hidden')return;
  const button=document.querySelector('#quizChoices .quiz-choice');
  if(!button)return;
  const over=card.getBoundingClientRect().bottom+window.scrollY-(window.innerHeight-4);
  if(over<=0.5)return;
  const row=button.getBoundingClientRect().height+4;
  card.style.setProperty('--mobile-form-row-h',Math.max(48,Math.floor((row-over/6)*4)/4)+'px');
  syncStudyHeightsAtCurrentZoom();
}
// 活用形の選択肢は表の1行と同じ高さにする。スマホは表の行の高さ（--mobile-form-row-h）をそのまま使い、
// 広い画面では表の行を実測する。表を隠している間は直前に測った高さを保つ。
function syncQuizFormChoiceHeight(){
  const card=document.querySelector('main.card');
  if(window.innerWidth<=700){card.style.removeProperty('--quiz-form-h');return;}
  const row=document.querySelector('#formBody > tr');
  const h=row?row.offsetHeight:0;
  if(h>0)card.style.setProperty('--quiz-form-h',h+'px');
}

// 列数・段数。用言は正式名でも略称でも、右から正格活用・変格活用・形容詞と形容動詞の列に分ける（ない列は詰める）。
function quizChoicePlacement(choices,short,mode){
  if(mode==='form')return {columns:1,rows:choices.length,cells:null};
  const group=c=>c.partOfSpeech==='動詞'?(/変$/.test(c.family||'')?1:0):c.partOfSpeech==='助動詞'?-1:2;
  if(choices.every(c=>group(c)>=0)){
    // 列ごとの個数が違っても列の高さを揃える：段数を個数の最小公倍数にし、各ボタンに均等に割り付ける
    // （正格5つ・変格4つなら20段を、4段ずつと5段ずつに分ける）。
    const present=[...new Set(choices.map(group))].sort();
    const sizes=new Map();choices.forEach(c=>sizes.set(group(c),(sizes.get(group(c))||0)+1));
    const gcd=(a,b)=>b?gcd(b,a%b):a;
    const rows=[...sizes.values()].reduce((a,b)=>a*b/gcd(a,b),1);
    const seen=new Map();
    const cells=choices.map(c=>{const g=group(c);const i=seen.get(g)||0;seen.set(g,i+1);const span=rows/sizes.get(g);
      return {column:present.indexOf(g)+1,row:`${i*span+1} / span ${span}`};});
    return {columns:present.length,rows,cells,grouped:true};
  }
  const columns=choices.length<=4?2:3;
  return {columns,rows:Math.ceil(choices.length/columns),cells:null};
}
function renderQuizChoices(){
  const box=document.getElementById('quizChoices');const scrollTop=box.scrollTop;box.replaceChildren();
  box.dataset.count=String(quizChoices.length);
  box.dataset.mode=quizState.quizMode;
  // 縦書きの文書と同じ順：右の列の上から下へ、次に左の列へ。4つまでは2列、それより多ければ3列。
  // 3×3を超えるときは略称にする。用言は正格活用・変格活用・形容詞と形容動詞の列に分ける。
  // 行も答えるときは種類を略称にする（行の欄と並べても横幅に収めるため）。
  const asksRow=quizState.quizMode==='type'&&quizState.rowMode!=='omitted'&&quizChoices.some(c=>c.rowRequired);
  const short=quizState.shortLabels||quizChoices.length>9||asksRow;
  const placement=quizChoicePlacement(quizChoices,short,quizState.quizMode);
  box.dataset.columns=String(placement.columns);
  box.toggleAttribute('data-grouped',!!placement.grouped);
  box.style.gridTemplateRows=placement.grouped?`repeat(${placement.rows},minmax(0,1fr))`:`repeat(${placement.rows},auto)`;
  box.style.gridAutoFlow='column';
  quizChoices.forEach((choice,index)=>{
    const button=document.createElement('button');button.type='button';button.className='quiz-choice';
    const cell=placement.cells?.[index];
    if(cell){button.style.gridColumn=String(cell.column);button.style.gridRow=cell.row;}
    button.dataset.canonical=choice.canonical;
    button.setAttribute('aria-pressed',String(quizState.selectedAnswer===choice.canonical));
    const visibleLabel=short?choice.label:(choice.formalLabel||choice.label);
    button.setAttribute('aria-label',visibleLabel);
    const label=document.createElement('span');label.className='quiz-choice-label';label.textContent=visibleLabel;
    button.append(label);
    if(choice.displayLabel!==choice.label){const pos=document.createElement('small');pos.className='quiz-choice-pos';pos.textContent=choice.partOfSpeech;button.append(pos);}
    if(quizState.answered){
      const correct=quizState.quizMode==='form'?choice.canonical===quizState.example.form:choice.canonicals.includes(quizState.example.conjugationType);
      button.classList.toggle('is-correct',correct);
      button.classList.toggle('is-wrong',!correct&&quizState.selectedAnswer===choice.canonical);
      if(correct){
        button.setAttribute('aria-label',visibleLabel+'・正答');
        const mark=document.createElement('img');mark.className='quiz-correct-mark';mark.src='./img/result-ok.png';mark.alt='';mark.setAttribute('aria-hidden','true');button.append(mark);
      }
    }
    button.disabled=quizState.answered;
    // 行と活用の種類は、どちらを先に答えてもよい。両方そろった時点で採点する。
    button.addEventListener('click',()=>{
      if(quizState.answered)return;
      quizState.selectedAnswer=choice.canonical;
      if(quizState.quizMode==='type' && quizState.rowMode!=='omitted' && choice.rowRequired && !String(quizState.selectedRow||'').trim()){
        renderQuizUI();
        (document.getElementById('quizRowInput')||document.querySelector('#quizRowAnswer button'))?.focus({preventScroll:true});
      }else gradeQuiz();
    });
    box.append(button);
  });
  box.scrollTop=scrollTop;
}

// 行の欄は、動詞の問題で行も答える設定のとき、活用の種類の右に先に置く（縦書きの読む順で行→種類）。
// 候補は並んでいる種類に実在する行で、7つずつの縦の列にする。
function renderQuizRowAnswer(){
  const box=document.getElementById('quizRowAnswer');box.replaceChildren();
  box.hidden=quizState.quizMode!=='type'||quizState.rowMode==='omitted'||!quizChoices.some(c=>c.rowRequired);
  if(box.hidden)return;
  const head=document.createElement('label');head.className='quiz-row-head';head.textContent='行';box.append(head);
  const tryGrade=()=>{if(quizState.selectedAnswer)gradeQuiz();};
  if(quizState.rowMode==='input'){
    const input=document.createElement('input');input.className='quiz-row-input';input.id='quizRowInput';input.maxLength=3;
    input.setAttribute('aria-label','動詞の行');input.placeholder='カ';input.value=quizState.selectedRow||'';input.disabled=quizState.answered;
    head.htmlFor=input.id;
    input.addEventListener('input',()=>{quizState.selectedRow=input.value;});
    input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();tryGrade();}});
    input.addEventListener('change',tryGrade);
    box.append(input);return;
  }
  const grid=document.createElement('div');grid.className='quiz-row-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label','動詞の行');
  grid.style.gridTemplateRows=`repeat(${Math.min(7,Math.max(1,quizRowChoices.length))},auto)`;
  const answerRow=quizState.answered?quizEngine.rowForType(quizState.example.conjugationType):null;
  quizRowChoices.forEach(row=>{
    const button=document.createElement('button');button.type='button';button.className='quiz-row-choice';button.textContent=row.label;button.dataset.row=row.canonical;
    button.setAttribute('aria-label',row.label+'行');
    button.setAttribute('aria-pressed',String(quizState.selectedRow===row.canonical));button.disabled=quizState.answered;
    if(quizState.answered && answerRow){
      button.classList.toggle('is-correct',row.canonical===answerRow);
      button.classList.toggle('is-wrong',row.canonical!==answerRow&&quizState.selectedRow===row.canonical);
    }
    button.addEventListener('click',()=>{
      if(quizState.answered)return;
      quizState.selectedRow=row.canonical;
      if(quizState.selectedAnswer)gradeQuiz();else renderQuizUI();
    });
    grid.append(button);
  });
  box.append(grid);
}

function gradeQuiz(){
  if(!quizState || quizState.answered)return;
  const choice=quizChoices.find(c=>c.canonical===quizState.selectedAnswer);
  if(!choice || (quizState.quizMode==='type' && quizState.rowMode!=='omitted' && choice.rowRequired && !String(quizState.selectedRow||'').trim()))return;
  const evaluation=quizEngine.evaluateAnswer({quizMode:quizState.quizMode,example:quizState.example,selectedForm:quizState.selectedAnswer,selectedType:quizState.selectedAnswer,selectedRow:quizState.selectedRow,rowMode:quizState.rowMode});
  const event=quizEngine.buildLearningEvent({...quizState,evaluation,responseTimeMs:Math.round(performance.now()-quizState.startedAt)});
  // Answer feedback shows the full table without raising maxHintLevel or hintCount.
  quizState.evaluation=evaluation;quizState.answered=true;answered=true;
  const itemId=quizState.example.itemId??quizResolveItemId?.(quizState.example.exampleId)??null;
  // Identification answers count toward points and the recent accuracy like one table cell.
  const before=stats.quiz?.totals?.byItem?.[itemId]||{c:0,n:0};
  stats.points+=pointsForCell(evaluation.correct,3,{c:before.c,w:before.n-before.c});
  stats.recent=(stats.recent+(evaluation.correct?'1':'0')).slice(-RECENT_WINDOW);
  stats.quiz=quizAdapter.recordLearningEvent(stats.quiz,{...event,itemId},{resolveItemId:quizResolveItemId});
  try{localStorage.setItem(RECORD_STORAGE_KEY,JSON.stringify(stats));}catch(_error){setSettingsRecordStatus('記録を保存できませんでした。書き出して保管してください。');}
  updateScore();
  document.querySelector('main.card').classList.add('is-answered');
  renderKindText(document.getElementById('kind'),current);
  document.getElementById('kind').classList.add('kind-answer-badge');
  applyLemmaReading(document.getElementById('lemma'),current,true);
  renderQuizUI();
  const answerType=quizState.example.partOfSpeech==='助動詞'?quizEngine.auxTypeFamily(quizState.example.conjugationType):quizState.example.conjugationType;
  const detail=quizState.quizMode==='type'?'正答：'+answerType:'正答：'+quizState.example.form;
  document.getElementById('feedback').textContent=(evaluation.correct?'正解。':evaluation.typeCorrect?'型は正解。行の正答を確認しましょう。':'不正解。')+' '+detail;
  document.getElementById('next').focus({preventScroll:true});
  revealQuizActions();
}
function hintQuiz(){
  if(!quizState)return;
  if(quizTableInDialog()){
    if(!quizState.answered&&quizState.hintLevel<2){quizState=quizEngine.requestNextHint(quizState);renderQuizUI();}
    const dialog=document.getElementById('quizTableDialog');
    if(!dialog.open)dialog.showModal();
    return;
  }
  quizState=quizEngine.requestNextHint(quizState);renderQuizUI();revealQuizActions();
}
// 行も答える問題では、スマホ幅だと 例文｜行｜種類｜表 が入りきらず例文が読めない大きさまで縮む。
// そのときだけ活用表をダイアログへ移して見せる（6段表の DOM はそのまま移し、作り直さない）。
function quizTableInDialog(){
  return isIdentificationMode()&&!!quizState&&window.innerWidth<=700&&quizState.quizMode==='type'
    &&quizState.rowMode!=='omitted'&&quizChoices.some(c=>c.rowRequired);
}
function placeQuizTable(){
  const panel=document.getElementById('tablePanel');
  const body=document.getElementById('quizTableDialogBody');
  const inDialog=quizTableInDialog();
  document.querySelector('main.card').classList.toggle('quiz-table-dialog-mode',inDialog);
  if(inDialog&&panel.parentElement!==body)body.append(panel);
  if(!inDialog&&panel.parentElement===body){
    const dialog=document.getElementById('quizTableDialog');if(dialog.open)dialog.close();
    document.getElementById('quizAnswerPanel').before(panel);
  }
}
// Hints and grading add the table and the answer, which can push the buttons
// below a short screen. Scroll just enough to keep them reachable, and return
// to the top when the next question starts.
function revealQuizActions(){
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const actions=document.querySelector('main.card .actions');
    const over=actions?actions.getBoundingClientRect().bottom+12-window.innerHeight:0;
    if(over<=0)return;
    quizAutoScrolled=true;
    window.scrollBy({top:over,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  }));
}
