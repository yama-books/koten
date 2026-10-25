// Real browser settings, import/export, cancellation and keyboard regression checks.
import assert from 'node:assert/strict';
export async function checkSettings(browser,base){let checks=0;
for(const view of ['index.html','detail.html']){
 const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());const page=await context.newPage();
 await page.goto(base+view);await page.locator('[data-vintage-settings]').waitFor();
 for(const width of [320,375,414,768]){
  await page.setViewportSize({width,height:812});
  const geometry=await page.evaluate(()=>{const g=document.querySelector('[data-vintage-settings]').getBoundingClientRect();const h=document.querySelector('header h1,header .brand-title').getBoundingClientRect();return {gear:g.width>=44&&g.height>=44&&g.left>=h.right-1&&Math.abs(g.top-h.top)<30,inside:g.right<=innerWidth&&g.left>=0,overflow:document.documentElement.scrollWidth>innerWidth+1};});
  assert.ok(geometry.gear&&geometry.inside&&!geometry.overflow,view+' '+width+' header');checks++;
 }
 assert.equal(await page.getByRole('button',{name:'端末間同期',exact:true}).count(),0);checks++;
 await page.getByRole('button',{name:'設定',exact:true}).click();
 for(const name of ['端末間同期','記録を書き出す','記録を読み込む'])assert.ok(await page.getByRole('button',{name,exact:true}).isVisible());checks++;
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'記録を書き出す',exact:true}).click();const d=await download;let text='';for await(const chunk of await d.createReadStream())text+=chunk;assert.equal(JSON.parse(text).app,'vintage-kana-record');checks++;
 const event={id:'synthetic-ui-answer',at:'2026-10-25T10:00:00Z',localDate:'2026-10-25',setId:'synthetic-set',mode:'reading',masteryMethod:'free-input',outcome:'correct',glyph:'𛀂',glyphId:'u1B002',kana:'あ',jibo:'安'};
 const input=page.locator('#vintageImportRecordFile');const file=id=>({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'vintage-kana-record',exportVersion:1,learningEvents:[{...event,id}],decipherHistory:[],decipherLevel:1}))});
 for(let i=0;i<2;i++){page.once('dialog',d=>d.accept());await input.setInputFiles(file(event.id));await page.locator('#vintageRecordTransferStatus').filter({hasText:'記録を統合しました'}).waitFor();}
 assert.equal(await page.evaluate(()=>JSON.parse(VintageKanaRecordTransfer.exportRecord(localStorage)).learningEvents.length),1);checks++;
 page.once('dialog',d=>d.dismiss());await input.setInputFiles(file('cancelled-answer'));await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>JSON.parse(VintageKanaRecordTransfer.exportRecord(localStorage)).learningEvents.length),1);checks++;
 await page.getByRole('button',{name:'端末間同期',exact:true}).click();await page.locator('.koten-sync-dialog[open]').waitFor();assert.equal(await page.locator('.vintage-settings-dialog').isVisible(),false);checks++;
 assert.ok(await page.getByRole('button',{name:'新しい同期グループを作る',exact:true}).isVisible());assert.ok(await page.getByText('別の端末のQRを読み取る',{exact:true}).isVisible());checks++;
 assert.ok(!(await page.locator('.koten-sync-dialog').innerText()).includes('3アプリ'));assert.ok(!(await page.locator('.koten-sync-dialog').innerText()).includes('Safari'));checks++;
 for(const width of [320,375,414,768]){await page.setViewportSize({width,height:812});assert.ok(await page.locator('.koten-sync-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1));checks++;}
 await page.keyboard.press('Escape');await page.locator('.vintage-settings-dialog[open]').waitFor();await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.matches('[data-vintage-settings]'));assert.ok(await page.getByRole('button',{name:'設定',exact:true}).evaluate(e=>document.activeElement===e));checks++;
 await context.close();console.log('Settings UI '+view+': PASS');
}
return checks;
}
