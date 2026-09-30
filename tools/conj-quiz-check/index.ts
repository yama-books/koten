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
let fixtures=false;
const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/','http://localhost');
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
const browser=await (process.argv.includes('--webkit')?webkit:chromium).launch({headless:true});
const viewports=[{width:360,height:640},{width:375,height:667},{width:375,height:812},{width:390,height:664},{width:768,height:1024},{width:820,height:1180},{width:1180,height:820},{width:1440,height:900}];
const themes=['coffee','matcha','indigo','sumi','sakura'];
const selectedViewports=process.argv.includes('--smoke')?viewports.slice(0,1):viewports;
const expectedCases=selectedViewports.length*themes.length*2*4;
const failures:string[]=[];let cases=0;
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
try{
  // Real data is still held; returning to the drill must clear the empty state.
  const empty=await browser.newPage();await empty.goto(`http://127.0.0.1:${port}/conj/`);
  await empty.waitForFunction("!document.getElementById('quizMode').disabled");
  assert.equal(await empty.locator('.quiz-mode-tabs button').count(),3,'all modes exist in the main card');
  assert.ok(await empty.locator('.quiz-mode-tabs').isVisible() || await empty.locator('#openQuizModes').isVisible(),'mode entry is visible on the main screen');
  await empty.locator('#showExample').uncheck();
  await chooseMode(empty,'form');await empty.locator('#quizEmpty').waitFor({state:'visible'});
  assert.equal(await empty.locator('#quizChoices button').count(),0);
  await chooseMode(empty,'table');assert.ok(await empty.locator('#formBody > tr').count()===6);
  await empty.locator('#openSettings').click();await empty.selectOption('#quizMode','type');
  assert.equal(await empty.locator('[data-quiz-mode="type"]').getAttribute('aria-pressed'),'true','settings mode stays in sync');
  await chooseMode(empty,'table');
  assert.equal(await empty.locator('#showExample').isChecked(),false,'drill example preference is preserved');
  assert.equal(await empty.locator('#showExample').isEnabled(),true,'drill example control is restored');
  await empty.locator('#showExample').check();
  assert.equal(await empty.locator('#examplePanel').isVisible(),true,'drill example control still works');
  await empty.close();fixtures=true;
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
          await page.selectOption('#supportLevel','0');if(mode==='type') await page.selectOption('#rowMode','omitted');
          await page.waitForTimeout(60);
          assert.equal(await page.locator('#formBody > tr').count(),6,tag);
          assert.equal(await page.locator('.editable-answer').count(),0,tag);
          assert.equal(await page.locator('#tablePanel').getAttribute('data-support'),'hidden',tag);
          assert.equal(await page.locator('#kind').innerText(),'',tag+' answer leak');
          assert.equal(await page.locator('#check').isDisabled(),true,tag);
          assert.equal(await page.locator('#levelMeters').isVisible(),false,tag);
          if(output && theme==='coffee' && mode==='form' && pos==='verb' && viewport.width===375 && viewport.height===812){
            await mkdir(output,{recursive:true});await page.screenshot({path:path.join(output,'quiz-before-hint.png'),fullPage:true,timeout:15000});
          }
          assert.equal(await page.locator('#quizChoices button').count(),mode==='form'?6:pos==='adj'||pos==='adjv'?2:4,tag);
          await page.evaluate('window.__quizTableBefore=document.querySelector("#formBody > tr")');
          await page.locator('#reveal').click();
          assert.equal(await page.locator('#tablePanel').getAttribute('data-support'),'partial',tag);
          assert.ok(await page.locator('#formBody > tr.quiz-masked').count()>0,tag);
          await page.locator('#reveal').click();
          assert.equal(await page.locator('#tablePanel').getAttribute('data-support'),'full',tag);
          assert.equal(await page.evaluate('window.__quizTableBefore===document.querySelector("#formBody > tr")'),true,tag+' renderer replaced');
          const correct=await page.evaluate('quizState.example.'+(mode==='form'?'form':'conjugationType'));
          await page.locator('#quizChoices button').evaluateAll((buttons,value)=>{(buttons.find(b=>(b as HTMLElement).dataset.canonical===value) as HTMLButtonElement).click();},correct);
          await page.locator('#check').click();await page.waitForTimeout(50);
          assert.match(await page.locator('#feedback').innerText(),/^正解/,tag);
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
    await page.locator('#check').click();assert.equal(await page.evaluate('stats.quiz.events.at(-1).maxHintLevel'),0);
    // Type/row correctness, text input and stable row-button order.
    await chooseMode(page,'type');await page.selectOption('#rowMode','select');
    await page.locator('#quizChoices button').evaluateAll((buttons)=>{(buttons.find(b=>(b as HTMLElement).dataset.canonical==='カ行四段活用') as HTMLButtonElement).click();});
    const order=await page.locator('#quizRowAnswer button').allTextContents();
    await page.locator('#quizRowAnswer button').filter({hasText:'ガ行'}).click();assert.deepEqual(await page.locator('#quizRowAnswer button').allTextContents(),order);
    await page.locator('#check').click();assert.equal(await page.evaluate('stats.quiz.events.at(-1).typeCorrect'),true);assert.equal(await page.evaluate('stats.quiz.events.at(-1).rowCorrect'),false);
    await page.selectOption('#rowMode','input');
    await page.locator('#quizChoices button').evaluateAll((buttons)=>{(buttons.find(b=>(b as HTMLElement).dataset.canonical==='カ行四段活用') as HTMLButtonElement).click();});
    await page.fill('#quizRowInput','か');await page.locator('#check').click();assert.equal(await page.evaluate('stats.quiz.events.at(-1).correct'),true);
    const counts=[];
    for(const scope of ['near','part_of_speech','cross_pos','all']){await page.selectOption('#choiceScope',scope);counts.push(await page.locator('#quizChoices button').count());}
    assert.ok(counts[0]<counts[1] && counts[1]<counts[2] && counts[2]<counts[3]);
    // Saved old data and new event fields survive importing/exporting the existing envelope.
    const saved=await page.evaluate('JSON.stringify(stats)');
    await page.evaluate(`importRecordFromText(${JSON.stringify(JSON.stringify({stats:JSON.parse(saved)}))})`);
    assert.equal(await page.evaluate('JSON.stringify(stats)'),saved);
    await page.reload();await page.waitForFunction("!document.getElementById('quizMode').disabled");assert.equal(await page.evaluate('JSON.stringify(stats)'),saved);
    await chooseMode(page,'table');assert.equal(await page.locator('#quizAnswerPanel').isHidden(),true);
    await page.locator('#openRecord').click();assert.match(await page.locator('#quizRecordSummary').innerText(),/表なし正解/);
    assert.deepEqual(errors,[],`${viewport.width} page errors`);await context.close();
    console.log(`checked ${viewport.width}x${viewport.height}: ${cases} cases`);
  }
}finally{await browser.close();await new Promise<void>(resolve=>server.close(()=>resolve()));}
console.log(`check:conj-quiz: ${cases}/${expectedCases} mode/POS/viewport/theme cases, real held-bank check, hints, row modes, 4 scopes, record roundtrip/reload`);
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
assert.equal(cases,expectedCases);
