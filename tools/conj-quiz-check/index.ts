// Real-browser integration checks. Synthetic quotations exist ONLY in this test server.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile,stat,mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium,webkit } from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const html=readFileSync(path.join(root,'conj/index.html'),'utf8');
const items=new Function(html.match(/const F=a=>a;[\s\S]*?\n\];/)![0]+';return items;')();
const ids=['naku','kanasi','itadura','beshi_aux'];
const gates={publicEnabled:true,humanApprovalStatus:'approved',quotationStatus:'approved',finalComplianceStatus:'approved',releaseQaStatus:'approved'};
const metadata={records:ids.map(id=>{
  const item=items.find((e:any)=>e.id===id);assert.ok(item,id);
  return {...gates,exampleId:'test-only-'+id,partOfSpeech:item.label,lemma:item.lemma,conjugationType:item.kind,form:'終止形',classification:'standard',formQuizEligible:true,typeQuizEligible:true};
})};
const quotations={records:ids.map(id=>{
  const item=items.find((e:any)=>e.id===id);
  return {...gates,exampleId:'test-only-'+id,itemId:id,quotationExcerpt:'操作検証：'+item.lemma+'。',originalTarget:item.lemma,source:'テスト専用（教材ではありません）'};
})};
const privatePreview=process.argv.includes('--private-preview');
let privatePreviewMetadata:any=null,privatePreviewQuotations:any=null;
if(privatePreview){
  const privatePath=process.env.CONJ_PRIVATE_BANK_PATH;
  assert.ok(privatePath,'CONJ_PRIVATE_BANK_PATH is required for private preview');
  assert.ok(!path.resolve(privatePath).startsWith(root+path.sep),'private preview corpus must stay outside the repository');
  const bank=JSON.parse(readFileSync(path.join(root,'conj/data/conjugation-quiz-bank-127.meta.json'),'utf8'));
  const held=JSON.parse(readFileSync(privatePath,'utf8'));
  assert.equal(bank.records?.length,127);assert.equal(held.records?.length,127);
  const localOnly={publicEnabled:true,quotationStatus:'approved',finalComplianceStatus:'approved',releaseQaStatus:'approved'};
  privatePreviewMetadata={records:bank.records.map((record:any)=>({...record,...localOnly}))};
  privatePreviewQuotations={records:held.records.map((record:any)=>({...record,...localOnly}))};
}
let fixtures=false;
const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/','http://localhost');
    if(privatePreview && url.pathname.endsWith('/conjugation-quiz-bank-127.meta.json')){res.setHeader('cache-control','no-store');res.setHeader('content-type','application/json');res.end(JSON.stringify(privatePreviewMetadata));return;}
    if(privatePreview && url.pathname.endsWith('/conjugation-quiz-examples.json')){res.setHeader('cache-control','no-store');res.setHeader('content-type','application/json');res.end(JSON.stringify(privatePreviewQuotations));return;}
    if(fixtures && url.pathname.endsWith('/conjugation-quiz-bank-127.meta.json')){res.setHeader('content-type','application/json');res.end(JSON.stringify(metadata));return;}
    if(fixtures && url.pathname.endsWith('/conjugation-quiz-examples.json')){res.setHeader('content-type','application/json');res.end(JSON.stringify(quotations));return;}
    const mount=url.pathname.startsWith('/conj/')?'conj':url.pathname.startsWith('/100/')?'packages/hyakunin/dist':null;
    if(!mount || req.method!=='GET'){res.writeHead(404).end();return;}
    const base=path.join(root,mount);
    let file=path.resolve(base,'.'+decodeURIComponent(url.pathname.slice(url.pathname.startsWith('/conj/')?5:4)));
    if(!file.startsWith(base+path.sep) && file!==base){res.writeHead(404).end();return;}
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    res.setHeader('content-type',(types[path.extname(file)]||'application/octet-stream')+'; charset=utf-8');
    res.end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=(server.address() as any).port;
if(privatePreview){
  console.log(`Private local preview: http://127.0.0.1:${port}/conj/ (127 approved examples; press Ctrl+C to stop)`);
  await new Promise<void>(resolve=>process.once('SIGINT',resolve));
  await new Promise<void>(resolve=>server.close(()=>resolve()));
  process.exit(0);
}
const browser=await (process.argv.includes('--webkit')?webkit:chromium).launch({headless:true});
if(process.argv.includes('--internal-127-qa')){
  const privatePath=process.env.CONJ_PRIVATE_BANK_PATH;
  assert.ok(privatePath,'CONJ_PRIVATE_BANK_PATH is required for internal quotation QA');
  const held=JSON.parse(readFileSync(privatePath,'utf8'));
  const bank=JSON.parse(readFileSync(path.join(root,'conj/data/conjugation-quiz-bank-127.meta.json'),'utf8'));
  const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/conj/`);
  await page.waitForFunction("!document.getElementById('quizMode').disabled");
  const result=await page.evaluate(({bank,held})=>{
    const gate={quotationStatus:'approved',finalComplianceStatus:'approved',releaseQaStatus:'approved'};
    const prepared={...bank,records:bank.records.map((record:any)=>({...record,...gate,publicEnabled:true}))};
    const payload={records:held.records.map((record:any)=>({...record,...gate}))};
    const resolved=quizAdapter.resolveQuizRecords(prepared,payload,items);
    const seen=new Set(resolved.map((record:any)=>record.exampleId));
    let rendered=0;const renderErrors:string[]=[];
    for(const record of resolved)for(const mode of ['form','type']){
      try{
        document.getElementById('quizMode').value=mode;
        current={...record.tableItem};answered=false;answers={};blankSlots=new Set();
        quizState=quizEngine.createQuizState({example:record,quizMode:mode,choiceScope:'all',supportLevel:0,rowMode:'omitted'});
        quizChoices=mode==='form'?quizEngine.buildFormChoices():quizEngine.buildTypeChoices({example:record,masterEntries:quizMaster,scope:'all'});
        render();
        if(document.querySelectorAll('#exampleText mark').length!==1 || document.querySelectorAll('#formBody > tr').length!==6 || quizChoices.length<2)throw Error('missing marker, row, or choice');
        rendered++;
      }catch(error){renderErrors.push(record.exampleId+':'+mode+':'+String(error));}
    }
    return {items:items.length,resolved:resolved.length,missing:bank.records.filter((record:any)=>!seen.has(record.exampleId)).map((record:any)=>record.exampleId),
      rendered,renderErrors,byPos:Object.fromEntries(['動詞','形容詞','形容動詞','助動詞'].map(pos=>[pos,resolved.filter((record:any)=>record.partOfSpeech===pos).length]))};
  },{bank,held});
  console.log(JSON.stringify(result));
  await page.close();await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));
  assert.equal(result.resolved,127,'all human-approved records must link to the current renderer in internal QA');
  assert.equal(result.rendered,254,'all 127 records must render in both modes');
  process.exit(0);
}
const viewports=[{width:360,height:640},{width:375,height:667},{width:375,height:812},{width:390,height:664},{width:768,height:1024},{width:820,height:1180},{width:1180,height:820},{width:1440,height:900}];
const themes=['coffee','matcha','indigo','sumi','sakura'];
const selectedViewports=process.argv.includes('--smoke')?viewports.slice(0,1):viewports;
const expectedCases=selectedViewports.length*themes.length*2*4;
const failures:string[]=[];let cases=0,masterCases=0;
// Windows WebKit's full-page capture can stall; geometry/interaction checks still run.
const output=process.argv.includes('--webkit')?undefined:process.env.CONJ_QUIZ_ARTIFACT_DIR;
async function chooseMode(page:any,mode:string){
  if(await page.locator('#quizMode').inputValue()===mode)return;
  if(await page.locator('.quiz-mode-tabs').isVisible())await page.locator(`[data-quiz-mode="${mode}"]`).click();
  else{
    await page.locator('#openQuizModes').click();
    await page.selectOption('#quizMode',mode);
  }
  assert.equal(await page.locator(`[data-quiz-mode="${mode}"]`).getAttribute('aria-pressed'),'true');
  if(await page.locator('#openQuizModes').isVisible())assert.match(await page.locator('#openQuizModes').innerText(),{table:/活用表/,form:/活用形/,type:/活用種類/}[mode]);
}
async function setAdvanced(page:any,id:string,value:string){
  const details=page.locator('.quiz-advanced');
  if(!await details.evaluate((node:HTMLDetailsElement)=>node.open))await details.locator('summary').click();
  await page.selectOption('#'+id,value);
  await details.locator('summary').click();
}
try{
  // Real quotations are held; the public table still supplies usable practice.
  const empty=await browser.newPage({viewport:{width:375,height:812}});await empty.goto(`http://127.0.0.1:${port}/conj/`);
  await empty.waitForFunction("!document.getElementById('quizMode').disabled");
  assert.deepEqual(await empty.evaluate('({form:quizMasterPractice.form.length,type:quizMasterPractice.type.length})'),
    {form:124,type:180},'the actual runtime must include every cleared source example');
  assert.equal(await empty.locator('.quiz-mode-tabs button').count(),3,'all modes exist in the main card');
  assert.ok(await empty.locator('.quiz-mode-tabs').isVisible() || await empty.locator('#openQuizModes').isVisible(),'mode entry is visible on the main screen');
  await empty.locator('#showExample').uncheck();
  await chooseMode(empty,'form');await empty.locator('#quizPrompt').waitFor({state:'visible'});
  assert.equal(await empty.locator('#quizEmpty').isHidden(),true);
  assert.equal(await empty.locator('#quizChoices button').count(),6);
  assert.equal(await empty.evaluate('quizRecords.length'),0,'held quotations remain unavailable');
  assert.equal(await empty.evaluate('quizState.example.origin'),'master');
  assert.match(await empty.locator('#quizPrompt').innerText(),/例文で強調した部分は何形/);
  assert.equal(await empty.locator('#examplePanel').isVisible(),true,'original sentence is visible '+JSON.stringify(await empty.evaluate('({example:current.example,target:current.target,display:document.getElementById("examplePanel").style.display,rect:document.getElementById("examplePanel").getBoundingClientRect().toJSON()})')));
  assert.equal(await empty.locator('#exampleText mark').count(),1,'one marked target');
  assert.equal(await empty.locator('#tablePanel').isVisible(),false,'table begins hidden without leaving a blank frame');
  if(output){await mkdir(output,{recursive:true});await empty.screenshot({path:path.join(output,'master-form-mobile.png'),fullPage:true,timeout:15000});}
  const formAnswer=await empty.evaluate('quizState.example.form');
  await empty.locator('#quizChoices button').evaluateAll((buttons,value)=>{(buttons.find(b=>(b as HTMLElement).dataset.canonical===value) as HTMLButtonElement).click();},formAnswer);
  assert.match(await empty.locator('#feedback').innerText(),/^正解/);
  assert.equal(await empty.locator('#quizChoices .is-correct').count(),1);
  assert.match(await empty.evaluate('stats.quiz.events.at(-1).exampleId'),/^master:form:/);
  await empty.locator('#next').click();
  await empty.locator('#reveal').click();
  assert.equal(await empty.locator('#tablePanel').getAttribute('data-support'),'partial');
  assert.equal(await empty.locator('#tablePanel').isVisible(),true);
  await empty.locator('#reveal').click();
  assert.equal(await empty.locator('#tablePanel').getAttribute('data-support'),'full');
  await chooseMode(empty,'type');
  assert.equal(await empty.evaluate('quizState.example.origin'),'master');
  assert.ok(await empty.locator('#quizChoices button').count()>=2);
  assert.equal(await empty.evaluate('quizState.choiceScope'),'near');
  assert.equal(await empty.evaluate('quizState.shortLabels'),false);
  assert.equal(await empty.evaluate('document.querySelector("#quizChoices .quiz-choice-label").textContent===quizChoices[0].formalLabel'),true);
  assert.equal(await empty.locator('#examplePanel').isVisible(),true);
  assert.equal(await empty.locator('#exampleText mark').count(),1);
  const typeAnswer=await empty.evaluate('quizChoices.find(c=>c.canonicals.includes(quizState.example.conjugationType)).canonical');
  await empty.locator('#quizChoices button').evaluateAll((buttons,value)=>{(buttons.find(b=>(b as HTMLElement).dataset.canonical===value) as HTMLButtonElement).click();},typeAnswer);
  assert.match(await empty.locator('#feedback').innerText(),/^正解/);
  assert.match(await empty.evaluate('stats.quiz.events.at(-1).exampleId'),/^master:type:/);
  if(output)await empty.screenshot({path:path.join(output,'master-type-mobile.png'),fullPage:true,timeout:15000});
  for(const pos of ['verb','adj','adjv','aux']){
    await empty.selectOption('#pos',pos);
    for(const mode of ['form','type']){
      await chooseMode(empty,mode);
      assert.equal(await empty.locator('#quizEmpty').isHidden(),true,`master ${mode} ${pos}`);
      assert.equal(await empty.evaluate('quizState.example.origin'),'master');
      assert.ok(await empty.locator('#quizChoices button').count()>=2,`master choices ${mode} ${pos}`);
    }
  }
  await empty.selectOption('#pos','verb');
  await chooseMode(empty,'table');assert.ok(await empty.locator('#formBody > tr').count()===6);
  await empty.locator('#openSettings').click();await empty.selectOption('#quizMode','type');
  assert.equal(await empty.locator('[data-quiz-mode="type"]').getAttribute('aria-pressed'),'true','settings mode stays in sync');
  assert.equal(await empty.locator('#quizEmpty').isHidden(),true);
  await chooseMode(empty,'table');
  assert.equal(await empty.locator('#showExample').isChecked(),false,'drill example preference is preserved');
  assert.equal(await empty.locator('#showExample').isEnabled(),true,'drill example control is restored');
  await empty.locator('#showExample').check();
  assert.equal(await empty.locator('#examplePanel').isVisible(),true,'drill example control still works');
  await chooseMode(empty,'type');await empty.selectOption('#pos','verb');
  await empty.evaluate(()=>{stats.quiz.events=Array.from({length:20},(_,i)=>({exampleId:'mastery-'+i,quizMode:'type',partOfSpeech:'動詞',correct:true,maxHintLevel:0}));nextQuestion();});
  assert.equal(await empty.evaluate('quizState.choiceScope'),'all');
  assert.equal(await empty.evaluate('quizState.shortLabels'),true);
  assert.equal(await empty.evaluate('document.querySelector("#quizChoices .quiz-choice-label").textContent===quizChoices[0].label'),true);
  await empty.close();
  for(const viewport of selectedViewports){
    const context=await browser.newContext({viewport,isMobile:viewport.width<701,hasTouch:viewport.width<701});
    const page=await context.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('conjInstallNoticeDismissed','true'));
    await page.goto(`http://127.0.0.1:${port}/conj/`);
    await page.waitForFunction("!document.getElementById('quizMode').disabled");
    await page.evaluate('document.fonts.ready');
    for(const theme of themes){
      await page.evaluate(`applyConjTheme('${theme}')`);
      for(const mode of ['form','type']){
        await chooseMode(page,mode);
        assert.equal(await page.evaluate('quizState.example.origin'),'master',`${viewport.width} ${theme} ${mode}`);
        assert.equal(await page.locator('#quizEmpty').isHidden(),true);
        assert.equal(await page.locator('#exampleText mark').count(),1);
        assert.equal(await page.locator('#tablePanel').isVisible(),false);
        assert.ok(await page.locator('#quizChoices button').count()>=2);
        assert.equal(await page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),false,'master horizontal overflow');
        const action=await page.locator('#reveal').boundingBox();
        assert.ok(action && action.y+action.height<=viewport.height+1,'master action stays in view');
        masterCases++;
      }
    }
    // Real 百人一首 sentences never run under the answer buttons, the buttons
    // stay reachable after a hint or an answer, and choices keep a fixed order.
    const sweep=await page.evaluate(async()=>{
      const w=window as any;
      const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      // Smooth scrolling needs a moment; wait until the button is on screen or give up.
      const onScreen=async(id:string)=>{for(let t=0;t<30;t++){if(document.getElementById(id)!.getBoundingClientRect().bottom<=innerHeight+1)return true;await new Promise(resolve=>setTimeout(resolve,50));}return false;};
      const overlap=(a:DOMRect,b:DOMRect)=>a.left<b.right-1&&b.left<a.right-1&&a.top<b.bottom-1&&b.top<a.bottom-1;
      const problems:string[]=[];let checked=0;
      for(const mode of ['form','type']){
        const select=document.getElementById('quizMode') as HTMLSelectElement;
        select.value=mode;select.dispatchEvent(new Event('change'));
        for(let i=0;i<12;i++){
          w.nextQuestion();await frames();
          const text=document.getElementById('exampleText')!;
          const tag=mode+' '+text.textContent!.slice(0,8);
          const range=document.createRange();range.selectNodeContents(text);
          const box=text.getBoundingClientRect();
          const buttons=[...document.querySelectorAll('#quizAnswerPanel button,.card .actions button')]
            .filter(e=>(e as HTMLElement).offsetParent).map(e=>e.getBoundingClientRect());
          for(const r of [...range.getClientRects()].filter(r=>r.width&&r.height)){
            if(buttons.some(b=>overlap(r,b)))problems.push(tag+': sentence under a button');
            if(r.top<box.top-2||r.bottom>box.bottom+2)problems.push(tag+': sentence outside its box');
          }
          if(mode==='form' && (0,eval)('quizChoices').map((c:any)=>c.canonical).join()!=='未然形,連用形,終止形,連体形,已然形,命令形')problems.push(tag+': form choices out of order');
          w.hintQuiz();
          if(!await onScreen('reveal'))problems.push(tag+': hint button below the screen');
          (document.querySelector('#quizChoices .quiz-choice') as HTMLButtonElement).click();
          if(!await onScreen('next'))problems.push(tag+': next button below the screen');
          if(document.querySelector('.card .study-layout')!.getBoundingClientRect().top<0)problems.push(tag+': sentence scrolled away');
          checked++;
        }
      }
      return {problems:[...new Set(problems)],checked};
    });
    assert.deepEqual(sweep.problems,[],`${viewport.width}x${viewport.height} master sentence/action sweep`);
    assert.equal(sweep.checked,24);
    assert.deepEqual(errors,[],`${viewport.width} master page errors`);await context.close();
  }
  fixtures=true;
  for(const viewport of selectedViewports){
    const context=await browser.newContext({viewport,isMobile:viewport.width<701,hasTouch:viewport.width<701});
    const page=await context.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('conjInstallNoticeDismissed','true'));
    await page.goto(`http://127.0.0.1:${port}/conj/`);
    await page.waitForFunction("!document.getElementById('quizMode').disabled");
    if(viewport.height>700 || viewport.width>700){
      assert.deepEqual(await page.locator('.quiz-mode-tabs button:visible').allTextContents(),['活用表','活用形を判別','活用の種類を判別']);
    }else assert.equal(await page.locator('#openQuizModes').isVisible(),true);
    if(output && viewport.width===375 && viewport.height===812){
      await mkdir(output,{recursive:true});await page.screenshot({path:path.join(output,'mode-entry-mobile.png'),fullPage:true,timeout:15000});
    }
    await page.waitForFunction("!!document.getElementById('conj-hyakunin-font-faces')");
    await page.evaluate('document.fonts.ready');
    assert.equal(await page.evaluate('quizRecords.length'),4,'all fixtures must resolve to the actual renderer');
    for(const theme of themes){
      await page.evaluate(`applyConjTheme('${theme}')`);
      for(const mode of ['form','type'])for(const pos of ['verb','adj','adjv','aux']){
        const tag=`${viewport.width}x${viewport.height} ${theme} ${mode} ${pos}`;
        try{
          await chooseMode(page,mode);await page.selectOption('#pos',pos);
          await page.selectOption('#supportLevel','0');if(mode==='type') {await setAdvanced(page,'rowMode','omitted');await setAdvanced(page,'choiceScope','near');}
          await page.waitForTimeout(60);
          assert.equal(await page.locator('#formBody > tr').count(),6,tag);
          assert.equal(await page.locator('.editable-answer').count(),0,tag);
          assert.equal(await page.locator('#tablePanel').getAttribute('data-support'),'hidden',tag);
          assert.equal(await page.locator('#kind').innerText(),'',tag+' answer leak');
          assert.equal(await page.locator('#check').isHidden(),true,tag);
          assert.equal(await page.locator('#levelMeters').isVisible(),false,tag);
          if(output && theme==='coffee' && mode==='form' && pos==='verb' && viewport.width===375 && viewport.height===812){
            await mkdir(output,{recursive:true});await page.screenshot({path:path.join(output,'quiz-before-hint.png'),fullPage:true,timeout:15000});
          }
          assert.equal(await page.locator('#quizChoices button').count(),mode==='form'?6:pos==='adj'||pos==='adjv'?2:4,tag);
          if(viewport.width>=701){
            const choicesFit=await page.locator('#quizChoices').evaluate(element=>element.scrollHeight<=element.clientHeight+1 && getComputedStyle(element).overflowY!=='scroll');
            assert.equal(choicesFit,true,tag+' desktop/iPad choices must fit without inner scrolling');
          }
          await page.evaluate('window.__quizTableBefore=document.querySelector("#formBody > tr")');
          await page.locator('#reveal').click();
          assert.equal(await page.locator('#tablePanel').getAttribute('data-support'),'partial',tag);
          assert.ok(await page.locator('#formBody > tr.quiz-masked').count()>0,tag);
          await page.locator('#reveal').click();
          assert.equal(await page.locator('#tablePanel').getAttribute('data-support'),'full',tag);
          assert.equal(await page.evaluate('window.__quizTableBefore===document.querySelector("#formBody > tr")'),true,tag+' renderer replaced');
          const correct=await page.evaluate('quizState.example.'+(mode==='form'?'form':'conjugationType'));
          await page.locator('#quizChoices button').evaluateAll((buttons,value)=>{(buttons.find(b=>(b as HTMLElement).dataset.canonical===value) as HTMLButtonElement).click();},correct);
          await page.waitForTimeout(50);
          assert.match(await page.locator('#feedback').innerText(),/^正解/,tag);
          assert.equal(await page.locator('#quizChoices .is-correct').count(),1,tag);
          await page.waitForFunction(()=>{const image=document.querySelector('#quizChoices .is-correct .quiz-correct-mark') as HTMLImageElement|null;return image?.complete && image.naturalWidth>0;});
          assert.equal(await page.locator('#quizChoices .is-correct .quiz-correct-mark').getAttribute('src'),'./img/result-ok.png',tag+' existing correct mark image');
          assert.equal(await page.locator('#tablePanel').getAttribute('data-support'),'answered',tag);
          assert.equal(await page.locator('#formBody .quiz-masked').count(),0,tag);
          assert.equal(await page.locator('#formBody .quiz-answer').count(),1,tag);
          assert.equal(await page.evaluate('stats.quiz.events.at(-1).maxHintLevel'),2,tag);
          assert.equal(await page.evaluate('stats.quiz.events.at(-1).hintCount'),2,tag);
          const geometry=await page.evaluate(`(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,
            rowMin:Math.min(...[...document.querySelectorAll('#formBody > tr')].map(r=>r.getBoundingClientRect().height)),
            choiceMin:Math.min(...[...document.querySelectorAll('#quizChoices button')].map(r=>r.getBoundingClientRect().width)),
            transform:document.querySelector('.card .study-layout').style.transform}))()`);
          assert.equal(geometry.overflow,false,tag+' horizontal overflow');assert.ok(geometry.rowMin>=43.5,tag+' row height');assert.ok(geometry.choiceMin>=43.5,tag+' choice width');
          await page.locator('#next').scrollIntoViewIfNeeded();const next=await page.locator('#next').boundingBox();assert.ok(next && next.y>=0 && next.y+next.height<=viewport.height+1,tag+' next action');
          if(output && theme==='coffee' && mode==='form' && pos==='verb' && [375,820,1440].includes(viewport.width)){
            await mkdir(output,{recursive:true});await page.screenshot({path:path.join(output,`quiz-${viewport.width}-${viewport.height}.png`),fullPage:true,timeout:15000});
          }
          cases++;
        }catch(error){const message=tag+': '+String(error);failures.push(message);console.error(message);throw error;}
      }
    }
    // Independent response does not count the answer-feedback table as a hint.
    await chooseMode(page,'form');await page.selectOption('#pos','verb');await page.selectOption('#supportLevel','0');
    await page.locator('#quizChoices button').evaluateAll((buttons)=>{(buttons.find(b=>(b as HTMLElement).dataset.canonical==='終止形') as HTMLButtonElement).click();});
    assert.equal(await page.evaluate('stats.quiz.events.at(-1).maxHintLevel'),0);
    // Type/row correctness, text input and stable row-button order.
    await chooseMode(page,'type');await setAdvanced(page,'rowMode','select');
    await page.locator('#quizChoices button').evaluateAll((buttons)=>{(buttons.find(b=>(b as HTMLElement).dataset.canonical==='カ行四段活用') as HTMLButtonElement).click();});
    const order=await page.locator('#quizRowAnswer button').allTextContents();
    await page.locator('#quizRowAnswer button').filter({hasText:'ガ行'}).click();assert.deepEqual(await page.locator('#quizRowAnswer button').allTextContents(),order);
    assert.equal(await page.evaluate('stats.quiz.events.at(-1).typeCorrect'),true);assert.equal(await page.evaluate('stats.quiz.events.at(-1).rowCorrect'),false);
    await setAdvanced(page,'rowMode','input');
    await page.locator('#quizChoices button').evaluateAll((buttons)=>{(buttons.find(b=>(b as HTMLElement).dataset.canonical==='カ行四段活用') as HTMLButtonElement).click();});
    await page.fill('#quizRowInput','か');await page.press('#quizRowInput','Enter');assert.equal(await page.evaluate('stats.quiz.events.at(-1).correct'),true);
    const counts=[];
    for(const scope of ['near','part_of_speech','cross_pos','all']){await setAdvanced(page,'choiceScope',scope);counts.push(await page.locator('#quizChoices button').count());}
    assert.ok(counts[0]<=counts[1] && counts[1]<=counts[2] && counts[2]<=counts[3]);
    await page.selectOption('#pos','aux');
    assert.ok(await page.locator('#quizChoices button').evaluateAll(buttons=>buttons.every(button=>button.textContent?.includes('助動詞') || !button.querySelector('small'))));
    // Saved old data and new event fields survive importing/exporting the existing envelope.
    const saved=await page.evaluate('JSON.stringify(stats)');
    await page.evaluate(`importRecordFromText(${JSON.stringify(JSON.stringify({stats:JSON.parse(saved)}))})`);
    assert.equal(await page.evaluate('JSON.stringify(stats)'),saved);
    await page.reload();await page.waitForFunction("!document.getElementById('quizMode').disabled");assert.equal(await page.evaluate('JSON.stringify(stats)'),saved);
    await chooseMode(page,'table');assert.equal(await page.locator('#quizAnswerPanel').isHidden(),true);
    // Identification answers are counted in the record screen (running totals, not the 1000-event log).
    const record=await page.evaluate(`({events:stats.quiz.events.length,totals:stats.quiz.totals.total,correct:stats.correctCells+stats.quiz.totals.correct,
      donut:["verb","adj","adjv","aux"].reduce((sum,key)=>sum+(stats.byPos[key]||0)+(stats.quiz.totals.byPos[key]||0),0)})`) as any;
    assert.ok(record.totals>0 && record.totals===record.events,'every identification answer enters the running totals');
    assert.equal(await page.locator('#scoreValue').innerText(),String(record.correct));
    await page.locator('#openRecord').click();
    await page.waitForFunction(`document.getElementById('recordCorrectCells').textContent===${JSON.stringify(String(record.correct))}`);
    assert.equal(await page.locator('#recordBreakdownTotal').innerText(),String(record.donut));
    assert.equal(await page.locator('#quizRecordSummary').count(),0,'the separate identification table is retired');
    assert.equal(await page.locator('#formBars li').count(),6);assert.ok(await page.locator('#kindRings li').count()>0);
    // The learner must never pan the record screen sideways. (WebKit counts the scaled shell of
    // the tablet/PC layout in scrollWidth, so the screen clips it with overflow-x:hidden.)
    assert.ok(await page.evaluate(`(s=>getComputedStyle(s).overflowX==='hidden' || s.scrollWidth<=s.clientWidth)(document.getElementById('recordScreen'))
      && document.documentElement.scrollWidth<=innerWidth`),`${viewport.width}x${viewport.height} record screen scrolls sideways`);
    assert.deepEqual(errors,[],`${viewport.width} page errors`);await context.close();
    console.log(`checked ${viewport.width}x${viewport.height}: ${cases} cases`);
  }
}finally{await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));}
console.log(`check:conj-quiz: ${cases}/${expectedCases} approved-fixture cases; ${masterCases}/${selectedViewports.length*themes.length*2} held-bank master cases; hints, row modes, 4 scopes, record roundtrip/reload`);
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
assert.equal(cases,expectedCases);
