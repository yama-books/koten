// Thin bridge to the classic index.html state, renderer and record storage.
let quizEngine=null, quizAdapter=null, quizState=null, quizRecords=[], quizMaster=[], quizChoices=[];
let quizLoadFailed=false, quizRowChoices=[], quizPreviousMode='table', quizExamplePreference=true;
const quizSettings={choiceScope:'near',supportLevel:0,rowMode:'omitted'};
function isIdentificationMode(){return document.getElementById('quizMode').value!=='table';}

async function initQuizUI(){
  try{
    [quizEngine,quizAdapter]=await Promise.all([import('./conj-quiz-engine.mjs'),import('./conj-quiz-adapter.mjs')]);
    stats.quiz=quizAdapter.normalizeHistory(stats.quiz);
    quizMaster=quizAdapter.masterFromItems(items);
    quizRecords=await quizAdapter.loadQuizRecords(items);
    try{
      const saved=JSON.parse(localStorage.getItem('conjQuizPreferences')||'{}');
      if(['near','part_of_speech','cross_pos','all'].includes(saved.choiceScope)) quizSettings.choiceScope=saved.choiceScope;
      if([0,1,2].includes(saved.supportLevel)) quizSettings.supportLevel=saved.supportLevel;
      if(['omitted','select','input'].includes(saved.rowMode)) quizSettings.rowMode=saved.rowMode;
    }catch(_error){}
  }catch(_error){quizLoadFailed=true;}
  for(const [id,value] of Object.entries(quizSettings)) document.getElementById(id).value=value;
  document.getElementById('quizMode').disabled=false;
  document.getElementById('quizMode').addEventListener('change',()=>{
    const mode=document.getElementById('quizMode').value;
    if(quizPreviousMode==='table')quizExamplePreference=document.getElementById('showExample').checked;
    if(mode==='table')document.getElementById('showExample').checked=quizExamplePreference;
    quizPreviousMode=mode;closeEditor(false);document.getElementById('settingsDialog').close();nextQuestion();
  });
  for(const id of ['choiceScope','supportLevel','rowMode']) document.getElementById(id).addEventListener('change',()=>{
    quizSettings[id]=id==='supportLevel'?Number(document.getElementById(id).value):document.getElementById(id).value;
    try{localStorage.setItem('conjQuizPreferences',JSON.stringify(quizSettings));}catch(_error){}
    if(isIdentificationMode()) nextQuestion();
  });
}

function nextQuizQuestion(){
  const mode=document.getElementById('quizMode').value;
  const pos=document.getElementById('pos').value;
  const labels={verb:'動詞',adj:'形容詞',adjv:'形容動詞',aux:'助動詞'};
  const eligible=quizRecords.filter(e=>quizEngine?.isPublicQuizEligible(e,mode) && (pos==='all'||e.partOfSpeech===labels[pos]));
  const ex=quizEngine?.pickQuestion(eligible,{quizMode:mode,attentionWeight:.65,lastExampleId:quizState?.example.exampleId});
  if(!ex){
    current=null;quizState=null;answered=false;answers={};blankSlots=new Set();
    renderQuizUI();return;
  }
  current={...ex.tableItem};answers={};selected=null;answered=false;blankSlots=new Set();
  quizState=quizEngine.createQuizState({example:ex,quizMode:mode,...quizSettings});
  quizRowChoices=[];
  document.getElementById('quizChoices').scrollTop=0;
  quizChoices=mode==='form'?quizEngine.buildFormChoices():quizEngine.buildTypeChoices({example:ex,masterEntries:quizMaster,scope:quizSettings.choiceScope});
  render();
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
  const mask=quizEngine.buildHintMask({quizMode:quizState.quizMode,hintLevel:level,example:quizState.example,tableRows:current.forms.map(display)});
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
  document.getElementById('levelMeters').hidden=active;
  document.getElementById('quizControls').hidden=!active;
  document.getElementById('choiceScope').disabled=document.getElementById('quizMode').value==='form';
  document.getElementById('rowMode').disabled=document.getElementById('quizMode').value==='form';
  for(const id of ['choiceScope','rowMode'])document.getElementById(id).closest('label').hidden=document.getElementById('quizMode').value==='form';
  document.getElementById('quizPrompt').hidden=!active || !quizState;
  document.getElementById('quizAnswerPanel').hidden=!active || !quizState;
  document.getElementById('quizEmpty').hidden=!active || !!quizState;
  card.querySelector('.study-layout').style.display=active&&!quizState?'none':'';
  for(const id of ['lemma','lemmaAid','kind','posTag']) document.getElementById(id).style.display=active&&!quizState?'none':'';
  if(!active){
    document.getElementById('showExample').disabled=false;
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
  document.getElementById('quizPrompt').textContent=quizState.quizMode==='form'?'強調した語は何形？':'強調した語の活用の種類は？';
  if(!quizState.answered){
    // Remove the hidden answer text from accessibility APIs as well as sight.
    document.getElementById('kind').textContent='';
  }
  applyQuizTableMask();
  renderQuizChoices();renderQuizRowAnswer();
  document.getElementById('reveal').textContent=quizState.hintLevel===0?'部分表のヒント':'全表のヒント';
  document.getElementById('reveal').style.display=quizState.answered||quizState.hintLevel===2?'none':'inline-block';
  document.getElementById('check').textContent='答え合わせ';
  document.getElementById('check').style.display=quizState.answered?'none':'inline-block';
  const choice=quizChoices.find(c=>c.canonical===quizState.selectedAnswer);
  document.getElementById('check').disabled=!choice || (quizState.quizMode==='type' && quizState.rowMode!=='omitted' && choice.rowRequired && !String(quizState.selectedRow||'').trim());
  document.getElementById('next').style.display=quizState.answered?'inline-block':'none';
  requestAnimationFrame(syncStudyHeights);
}

function renderQuizChoices(){
  const box=document.getElementById('quizChoices');const scrollTop=box.scrollTop;box.replaceChildren();
  box.dataset.count=String(quizChoices.length);
  quizChoices.forEach(choice=>{
    const button=document.createElement('button');button.type='button';button.className='quiz-choice';
    button.dataset.canonical=choice.canonical;
    button.setAttribute('aria-pressed',String(quizState.selectedAnswer===choice.canonical));
    button.setAttribute('aria-label',choice.displayLabel);
    const label=document.createElement('span');label.className='quiz-choice-label';label.textContent=choice.label;
    button.append(label);
    if(choice.displayLabel!==choice.label){const pos=document.createElement('small');pos.className='quiz-choice-pos';pos.textContent=choice.partOfSpeech;button.append(pos);}
    if(quizState.answered){
      const correct=quizState.quizMode==='form'?choice.canonical===quizState.example.form:choice.canonicals.includes(quizState.example.conjugationType);
      button.classList.toggle('is-correct',correct);
      button.classList.toggle('is-wrong',!correct&&quizState.selectedAnswer===choice.canonical);
      if(correct) button.setAttribute('aria-label',choice.displayLabel+'・正答');
    }
    button.disabled=quizState.answered;
    button.addEventListener('click',()=>{
      if(quizState.answered)return;
      if(quizState.selectedAnswer!==choice.canonical){quizState.selectedRow=null;quizRowChoices=quizEngine.buildRowChoices(quizMaster,choice);}
      quizState.selectedAnswer=choice.canonical;renderQuizUI();
      [...box.children].find(b=>b.dataset.canonical===choice.canonical)?.focus({preventScroll:true});
    });
    box.append(button);
  });
  box.scrollTop=scrollTop;
}

function renderQuizRowAnswer(){
  const box=document.getElementById('quizRowAnswer');box.replaceChildren();
  const choice=quizChoices.find(c=>c.canonical===quizState.selectedAnswer);
  box.hidden=quizState.quizMode!=='type'||quizState.rowMode==='omitted'||!choice?.rowRequired;
  if(box.hidden)return;
  const label=document.createElement('label');label.textContent='行も答える';box.append(label);
  if(quizState.rowMode==='input'){
    const input=document.createElement('input');input.className='quiz-row-input';input.id='quizRowInput';input.maxLength=3;
    input.setAttribute('aria-label','動詞の行');input.placeholder='例：カ';input.value=quizState.selectedRow||'';input.disabled=quizState.answered;
    label.htmlFor=input.id;
    input.addEventListener('input',()=>{quizState.selectedRow=input.value;document.getElementById('check').disabled=!input.value.trim();});
    box.append(input);return;
  }
  quizRowChoices.forEach(row=>{
    const button=document.createElement('button');button.type='button';button.className='quiz-row-choice';button.textContent=row.label+'行';button.dataset.row=row.canonical;
    button.setAttribute('aria-pressed',String(quizState.selectedRow===row.canonical));button.disabled=quizState.answered;
    button.addEventListener('click',()=>{quizState.selectedRow=row.canonical;renderQuizUI();box.querySelector('[data-row="'+row.canonical+'"]')?.focus({preventScroll:true});});box.append(button);
  });
}

function gradeQuiz(){
  if(!quizState || quizState.answered || document.getElementById('check').disabled)return;
  const evaluation=quizEngine.evaluateAnswer({quizMode:quizState.quizMode,example:quizState.example,selectedForm:quizState.selectedAnswer,selectedType:quizState.selectedAnswer,selectedRow:quizState.selectedRow,rowMode:quizState.rowMode});
  const event=quizEngine.buildLearningEvent({...quizState,evaluation,responseTimeMs:Math.round(performance.now()-quizState.startedAt)});
  // Answer feedback shows the full table without raising maxHintLevel or hintCount.
  quizState.evaluation=evaluation;quizState.answered=true;answered=true;
  stats.quiz=quizAdapter.recordLearningEvent(stats.quiz,event);
  try{localStorage.setItem(RECORD_STORAGE_KEY,JSON.stringify(stats));}catch(_error){setSettingsRecordStatus('記録を保存できませんでした。書き出して保管してください。');}
  document.querySelector('main.card').classList.add('is-answered');
  renderKindText(document.getElementById('kind'),current);
  document.getElementById('kind').classList.add('kind-answer-badge');
  applyLemmaReading(document.getElementById('lemma'),current,true);
  renderQuizUI();
  const detail=quizState.quizMode==='type'?'正答：'+quizState.example.conjugationType:'正答：'+quizState.example.form;
  document.getElementById('feedback').textContent=(evaluation.correct?'正解。':evaluation.typeCorrect?'型は正解。行を表で確認しよう。':'表で確かめよう。')+' '+detail;
  document.getElementById('next').focus({preventScroll:true});
}
function hintQuiz(){
  if(!quizState)return;
  quizState=quizEngine.requestNextHint(quizState);renderQuizUI();
}
function renderQuizRecord(){
  const box=document.getElementById('quizRecordSummary');box.replaceChildren();
  const history=quizAdapter?.normalizeHistory(stats.quiz);
  for(const mode of ['form','type']){
    const count=history?.byMode[mode] || {total:0,correct:0,independent:0,hintUsed:0};
    const p=document.createElement('p');
    p.textContent=(mode==='form'?'活用形':'活用の種類')+'：正解 '+count.correct+' / '+count.total+'問 ・表なし正解 '+count.independent+'問 ・ヒント使用 '+count.hintUsed+'問';box.append(p);
  }
  const last=history?.events.at(-1);
  if(last){
    const p=document.createElement('p');
    p.textContent='直近：'+(last.correct?'正解':'要確認')+' / '+['表なし','部分表','全表'][last.maxHintLevel]+(last.typeCorrect!==null?' / 型 '+(last.typeCorrect?'正解':'要確認'):'')+(last.rowCorrect!==null?' / 行 '+(last.rowCorrect?'正解':'要確認'):'');box.append(p);
  }
}
