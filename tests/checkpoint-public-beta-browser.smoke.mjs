import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve, sep } from 'node:path';
import { webkit } from 'playwright';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');

const mime={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.md':'text/plain; charset=utf-8'
};

const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/','http://127.0.0.1');
    let pathname=decodeURIComponent(url.pathname);
    if(pathname.endsWith('/')) pathname+='index.html';
    const file=resolve(root,'.'+pathname);
    if(file!==root && !file.startsWith(root+sep)){
      res.writeHead(403).end('forbidden');
      return;
    }
    const body=await readFile(file);
    res.writeHead(200,{
      'content-type':mime[extname(file)]||'application/octet-stream',
      'cache-control':'no-store'
    });
    res.end(body);
  }catch(_err){
    res.writeHead(404,{'content-type':'text/plain; charset=utf-8'}).end('not found');
  }
});

await new Promise((ok,ng)=>{
  server.once('error',ng);
  server.listen(0,'127.0.0.1',ok);
});

const address=server.address();
assert.ok(address && typeof address==='object');
const base=`http://127.0.0.1:${address.port}/checkpoint/`;

let browser;
try{
  browser=await webkit.launch({headless:true});
  const context=await browser.newContext({
    viewport:{width:390,height:844},
    deviceScaleFactor:3,
    hasTouch:true,
    isMobile:true,
    locale:'ja-JP'
  });
  const page=await context.newPage();

  const noHorizontalOverflow=async(label)=>{
    const size=await page.evaluate(()=>({
      rootScroll:document.documentElement.scrollWidth,
      rootClient:document.documentElement.clientWidth,
      bodyScroll:document.body.scrollWidth
    }));
    assert.ok(size.rootScroll<=size.rootClient+1,`${label}: html horizontal overflow ${JSON.stringify(size)}`);
    assert.ok(size.bodyScroll<=size.rootClient+1,`${label}: body horizontal overflow ${JSON.stringify(size)}`);
  };

  const minVisibleHeight=async(selector,label,min=44)=>{
    const boxes=await page.locator(selector).evaluateAll(els=>els
      .filter(el=>{
        const style=getComputedStyle(el);
        const r=el.getBoundingClientRect();
        return style.display!=='none' && style.visibility!=='hidden' && r.width>0 && r.height>0;
      })
      .map(el=>{
        const r=el.getBoundingClientRect();
        return {width:r.width,height:r.height,text:(el.textContent||'').trim().slice(0,40)};
      }));
    assert.ok(boxes.length>0,`${label}: visible target missing`);
    for(const box of boxes){
      assert.ok(box.height>=min,`${label}: target height below ${min}px: ${JSON.stringify(box)}`);
    }
    return boxes;
  };

  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.documentElement.dataset.shadowData==='skipped');

  assert.equal(await page.locator('#shadowDebugPanel').evaluate(el=>el.hidden),true);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.shadowData),'skipped');
  await noHorizontalOverflow('portrait initial');
  const initialButtonBoxes=await minVisibleHeight('.row button','top actions');
  const levelSelectorBox=(await minVisibleHeight('#checkLevel','level selector'))[0];

  await page.locator('#sample3').tap();
  const checklist=page.locator('.item[data-check]');
  const initialCount=await checklist.count();
  assert.ok(initialCount>0,'sample3 checklist should have points');
  const checklistBoxes=await minVisibleHeight('.item[data-check]','checklist items');

  // 一文字の本文マーカーもtouch経路でdrawerを開けることを確認。
  const oneCharSeg=await page.locator('.mark[data-seg]').evaluateAll(els=>{
    for(const el of els){
      const clone=el.cloneNode(true);
      clone.querySelectorAll?.('.candidate-badge').forEach(x=>x.remove());
      if((clone.textContent||'').trim().length===1) return el.getAttribute('data-seg');
    }
    return null;
  });
  assert.ok(oneCharSeg!==null,'sample3 should expose at least one one-character marker');
  await page.locator(`.mark[data-seg="${oneCharSeg}"]`).tap();
  assert.equal(await page.locator('#drawer').evaluate(el=>el.classList.contains('open')),true);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('drawer-open')),true);
  const closeBox=(await minVisibleHeight('#closeDrawer','drawer close'))[0];
  const knownActionBox=(await minVisibleHeight('#markPointKnown','known action'))[0];
  await minVisibleHeight('#nextPoint','next action');
  await page.locator('#closeDrawer').tap();
  assert.equal(await page.evaluate(()=>document.body.classList.contains('drawer-open')),false);

  // checklistから「ここはわかる」→履歴→個別復帰。
  await checklist.first().tap();
  assert.equal(await page.evaluate(()=>document.body.classList.contains('drawer-open')),true);
  await page.locator('#markPointKnown').tap();
  await page.locator('#knownHistory').waitFor({state:'visible'});
  assert.equal(await page.locator('.known-item').count(),1);
  assert.match(await page.locator('#knownList').innerText(),/【.+】/);
  assert.match(await page.locator('#filterStatus').innerText(),/「ここはわかる」で省略 1件/);
  assert.equal(await page.locator('.item[data-check]').count(),initialCount-1);
  const restoreOneBox=(await minVisibleHeight('[data-known-index="0"]','restore one'))[0];
  await minVisibleHeight('#restoreAllKnown','restore all');

  await page.locator('[data-known-index="0"]').tap();
  assert.equal(await page.locator('#knownHistory').evaluate(el=>el.hidden),true);
  assert.equal(await page.locator('.item[data-check]').count(),initialCount);

  // 複数履歴→全件復帰。
  await page.locator('.item[data-check]').first().tap();
  await page.locator('#markPointKnown').tap();
  await page.locator('.item[data-check]').first().tap();
  await page.locator('#markPointKnown').tap();
  assert.equal(await page.locator('.known-item').count(),2);
  await page.locator('#restoreAllKnown').tap();
  assert.equal(await page.locator('#knownHistory').evaluate(el=>el.hidden),true);
  assert.equal(await page.locator('.item[data-check]').count(),initialCount);

  // 本文変更時に「わかる」履歴が残留しない。
  await page.locator('.item[data-check]').first().tap();
  await page.locator('#markPointKnown').tap();
  assert.equal(await page.locator('.known-item').count(),1);
  const original=await page.locator('#input').inputValue();
  await page.locator('#input').fill(original+'別の本文');
  await page.locator('#analyze').tap();
  assert.equal(await page.locator('#knownHistory').evaluate(el=>el.hidden),true);
  assert.match(await page.locator('#filterStatus').innerText(),/「ここはわかる」で省略 0件/);

  // 長文サンプルでも描画し、横はみ出しを確認。
  await page.locator('#sample4').tap();
  assert.ok(await page.locator('.mark[data-seg]').count()>50,'long sample should render many markers');
  await noHorizontalOverflow('portrait long sample');

  // 横向き相当。
  await page.setViewportSize({width:844,height:390});
  await noHorizontalOverflow('landscape long sample');
  await page.locator('.item[data-check]').first().tap();
  const drawerBox=await page.locator('#drawer').boundingBox();
  assert.ok(drawerBox && drawerBox.height<=391,`landscape drawer should fit viewport: ${JSON.stringify(drawerBox)}`);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
  await page.locator('#closeDrawer').tap();

  console.log(JSON.stringify({
    result:'PASS',
    engine:'webkit',
    portrait:{width:390,height:844},
    landscape:{width:844,height:390},
    sample3Checklist:initialCount,
    longSampleMarkers:await page.locator('.mark[data-seg]').count(),
    measuredTouchTargets:{
      topActionsMinHeight:Math.min(...initialButtonBoxes.map(x=>x.height)),
      levelSelectorHeight:levelSelectorBox.height,
      checklistMinHeight:Math.min(...checklistBoxes.map(x=>x.height)),
      drawerCloseHeight:closeBox.height,
      knownActionHeight:knownActionBox.height,
      restoreOneHeight:restoreOneBox.height
    }
  }));

  await context.close();
}finally{
  if(browser) await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
