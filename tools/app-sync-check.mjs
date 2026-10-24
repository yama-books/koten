/* Synthetic data only. Never print invitations, group paths or browser storage.
 * Run via the demo Auth+Firestore emulator; real Firebase requests are blocked. */
import http from 'node:http';
import path from 'node:path';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=http.createServer(async(req,res)=>{
  try{
    let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name.startsWith('/100/'))name='/packages/hyakunin/dist/'+name.slice(5);
    if(name.endsWith('/'))name+='index.html';
    const target=path.resolve(root,'.'+name);
    if(!target.startsWith(root+path.sep))throw Error();
    res.setHeader('content-type',mime[path.extname(target)]||'application/octet-stream');res.end(await readFile(target));
  }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(resolve=>server.listen(4199,'127.0.0.1',resolve));
const base='http://127.0.0.1:4199';
const browser=await (process.argv.includes('--webkit')?webkit:chromium).launch({headless:true});
let stage='start',checks=0;
const deadline=setTimeout(()=>{console.error('app-sync browser: TIMEOUT at '+stage);process.exit(1);},300000);deadline.unref();
const contexts=[];
const url=app=>base+(app==='100'?'/100/?join=':app==='conj'?'/conj/':'/vintage-kana/detail.html');
async function pageFor(app,code){
  const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});contexts.push(context);
  await context.route('**/*',r=>{const host=new URL(r.request().url()).hostname;return ['127.0.0.1','localhost'].includes(host)?r.continue():r.abort();});
  const page=await context.newPage();
  await page.addInitScript(()=>{window.syntheticSyncFailure=null;window.addEventListener('koten:sync-failed',event=>{window.syntheticSyncFailure=event.detail.reason;});});
  await page.goto(url(app)+(code?(app==='100'?code:'?join='+code):''));
  if(app==='conj'){
    await page.waitForFunction(()=>window.ConjRecordReady===true);
    if(!code){await page.locator('#openSettings').click();await page.locator('[data-settings-tab="record"]').click();}
  }
  if(app!=='100'&&!code)await page.locator('[data-koten-sync] button').click();
  return {page,context};
}
const selected=(page,app)=>page.evaluate(a=>a==='100'?new Promise(resolve=>{
  const request=indexedDB.open('koten');request.onsuccess=()=>{const db=request.result;const q=db.transaction('settings').objectStore('settings').get('user');q.onsuccess=()=>{db.close();resolve(q.result?.syncCode??null);};};
}):localStorage.getItem('koten:sync-app:'+a+':v1'),app);
async function waitConnected(page,app){
  if(app==='100')await page.waitForFunction(()=>document.querySelector('.sync-status--active')!==null,{},{timeout:30000});
  else await page.waitForFunction(()=>Array.from(document.querySelectorAll('.koten-sync-dialog [role="status"]')).some(e=>e.textContent.startsWith('同期しました')),{},{timeout:30000});
}
async function join(page,app,code,qr){
  if(qr){
    await page.locator(app==='100'?'input[type="file"]':'.koten-sync-dialog input[type="file"]').setInputFiles({name:'synthetic-invitation.png',mimeType:'image/png',buffer:qr});
    await page.getByRole('button',{name:'確認して参加する',exact:true}).click();
  }else if(app==='100'){
    await page.locator('.sync-join-input').fill(code);await page.getByRole('button',{name:'同期先を確認',exact:true}).click();
    await page.getByRole('button',{name:'確認して参加する',exact:true}).click();
  }else{
    await page.locator('.koten-sync-dialog input:not([type="file"])').fill(code);
    await page.getByRole('button',{name:'すでに共有しているグループに参加する',exact:true}).click();
    await page.getByRole('button',{name:'確認して参加する',exact:true}).click();
  }
  await waitConnected(page,app);assert.ok(await selected(page,app)===code,'confirmed group selection');checks++;
}
async function conjAnswer(page){
  await page.evaluate(async()=>{
    const before=ConjRecordTransfer.project(ConjRecordTransfer.read(localStorage));
    const after=structuredClone(before);after.points+=3;after.gradedCells++;after.total++;after.recent=(after.recent+'0').slice(-100);
    await ConjRecordTransfer.recordAnswer(localStorage,before,after);
  });
}
async function vintageAnswer(page,suffix){
  await page.evaluate(s=>{
    const event={id:'synthetic-'+s,at:new Date().toISOString(),localDate:'2026-10-24',setId:'synthetic-set',mode:'reading',masteryMethod:'free-input',outcome:'correct',glyph:'𛀂',glyphId:'u1B002',kana:'あ',jibo:'安'};
    const text=JSON.stringify({app:'vintage-kana-record',exportVersion:1,learningEvents:[event],decipherHistory:[],decipherLevel:1});
    for(let i=0;i<2;i++)VintageKanaRecordTransfer.commitImport(localStorage,VintageKanaRecordTransfer.previewImport(localStorage,text));
    window.dispatchEvent(new Event('koten:record-saved'));
  },suffix);
}
try{
  // No group has been created in these screenshots: no invitations are saved.
  for(const app of ['conj','vintage-kana']){
    stage='layout '+app;const target=await pageFor(app);
    for(const width of [320,375,414,768]){
      await target.page.setViewportSize({width,height:812});
      assert.ok(await target.page.locator('.koten-sync-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1),'dialog fits viewport');checks++;
      if(width===375){await mkdir(path.join(root,'.cache/qa'),{recursive:true});await target.page.screenshot({path:path.join(root,'.cache/qa',app+(process.argv.includes('--webkit')?'-webkit':'-chromium')+'.png')});}
    }
    await target.context.close();contexts.splice(contexts.indexOf(target.context),1);
  }
  // Every creator is tested against all three independent receiving apps.
  for(const creator of ['100','vintage-kana','conj']){
    stage='create '+creator;
    const source=await pageFor(creator);
    await source.page.getByRole('button',{name:creator==='100'?'新しい同期グループを作る':'新しい共有グループを作る',exact:true}).click();
    await waitConnected(source.page,creator);
    const code=await source.page.evaluate(()=>JSON.parse(localStorage.getItem('koten:shared-group:v1')).code);
    if(creator!=='100')await source.page.getByRole('button',{name:'共有QR・コードを表示する',exact:true}).click();
    await source.page.waitForFunction(app=>{const c=document.querySelector(app==='100'?'.sync-qr canvas':'.koten-sync-dialog canvas');return c?.width===(app==='100'?288:256);},creator);
    const qr=Buffer.from((await source.page.locator(creator==='100'?'.sync-qr canvas':'.koten-sync-dialog canvas').evaluate(c=>c.toDataURL())).split(',')[1],'base64');
    if(creator==='100'){
      stage='same browser discovery';const peer=await source.context.newPage();await peer.goto(url('conj'));await peer.waitForFunction(()=>window.ConjRecordReady===true);
      await peer.locator('#openSettings').click();await peer.locator('[data-settings-tab="record"]').click();await peer.locator('[data-koten-sync] button').click();
      await peer.getByRole('button',{name:/見つかった共有グループを使う/}).waitFor();
      assert.ok(await peer.getByRole('button',{name:'新しい共有グループを作る',exact:true}).isHidden());checks++;
      await peer.close();
    }
    await source.context.close();contexts.splice(contexts.indexOf(source.context),1);
    for(const receiver of ['100','vintage-kana','conj']){
      stage='join '+creator+' -> '+receiver;
      const target=await pageFor(receiver);
      await join(target.page,receiver,code,receiver===creator?undefined:qr);
      // Cancel a newly proposed invitation without changing the active group.
      if(receiver!=='100'){
        const before=await selected(target.page,receiver);
        await target.page.locator('.koten-sync-dialog input:not([type="file"])').fill(code);
        await target.page.getByRole('button',{name:'すでに共有しているグループに参加する',exact:true}).click();
        await target.page.getByRole('button',{name:'参加を取り消す',exact:true}).click();
        assert.ok(await selected(target.page,receiver)===before);checks++;
        await target.page.evaluate(()=>{
          Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(resolve=>{window.syntheticCameraResolve=()=>resolve({getTracks:()=>[{stop(){window.syntheticCameraStopped=true;}}]});})}});
        });
        await target.page.getByRole('button',{name:'QRをカメラで読み取る',exact:true}).click();
        await target.page.locator('.koten-sync-dialog').getByRole('button',{name:'閉じる',exact:true}).click();
        await target.page.evaluate(()=>window.syntheticCameraResolve());
        await target.page.waitForFunction(()=>window.syntheticCameraStopped===true);
        assert.ok(await selected(target.page,receiver)===before);checks++;
      }
      await target.context.close();contexts.splice(contexts.indexOf(target.context),1);
    }
    for(const context of contexts.splice(0))await context.close();
    console.log('app-sync matrix: '+creator+' creator PASS');
  }
  for(const app of ['conj','vintage-kana']){
    stage='parallel/offline '+app;
    const a=await pageFor(app);await a.page.getByRole('button',{name:'新しい共有グループを作る',exact:true}).click();await waitConnected(a.page,app);
    const code=await selected(a.page,app);const b=await pageFor(app);await join(b.page,app,code);
    await Promise.all([a.context.setOffline(true),b.context.setOffline(true)]);
    if(app==='conj')await Promise.all([conjAnswer(a.page),conjAnswer(b.page)]);
    else await Promise.all([vintageAnswer(a.page,'a'),vintageAnswer(b.page,'b')]);
    await Promise.all([a.context.setOffline(false),b.context.setOffline(false)]);
    for(let i=0;i<4;i++){
      for(const device of [a,b]){await device.page.getByRole('button',{name:'今すぐ同期する',exact:true}).click();await waitConnected(device.page,app);}
    }
    for(const device of [a,b]){
      const n=await device.page.evaluate(app=>app==='conj'?ConjRecordTransfer.read(localStorage).events.length:JSON.parse(VintageKanaRecordTransfer.exportRecord(localStorage)).learningEvents.length,app);
      assert.equal(n,2,'both independent answer IDs retained exactly once');checks++;
      // Repeated JSON imports keep the same totals and IDs.
      await device.page.evaluate(async app=>{
        const api=app==='conj'?ConjRecordTransfer:VintageKanaRecordTransfer;
        const text=api.exportRecord(localStorage);
        for(let i=0;i<2;i++)await api.commitImport(localStorage,await api.previewImport(localStorage,text));
      },app);checks++;
    }
    for(const context of contexts.splice(0))await context.close();
  }
  console.log(`app-sync browser: PASS ${checks} checks; ${process.argv.includes('--webkit')?'WebKit':'Chromium'}; synthetic, no physical-device claim`);
}catch(error){
  const message=String(error.message).split('\n')[0].replace(/[a-zA-Z0-9_-]{16,}/g,'[redacted]');
  console.error('app-sync browser: FAIL at '+stage+': '+message+' (invitation and storage values omitted)');process.exitCode=1;
  for(const context of contexts)for(const page of context.pages())console.error('sync diagnostic: '+JSON.stringify(await page.evaluate(()=>({reason:window.syntheticSyncFailure??null,status:document.querySelector('.koten-sync-dialog [role="status"], .sync-status')?.textContent??null})).catch(()=>null)));
}finally{clearTimeout(deadline);for(const context of contexts)await context.close();await browser.close();await new Promise(resolve=>server.close(resolve));}
