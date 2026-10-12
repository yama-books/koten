// Focused browser QA for the approved mastery-ring navigation.
// Run: node tools/vintage-kana-mastery-ring-check/index.mjs [--webkit]
// All fixtures use an isolated local server and browser profile.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../');
const appDir=path.join(root,'vintage-kana');
const master=JSON.parse(readFileSync(path.join(appDir,'data/ui-glyph-master.json'),'utf8'));
const glyphs=master.glyphs;
assert.ok(glyphs.length>0,'Master glyph data must not be empty');

const storageKey='vintage-kana:learning-events:v1';
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||'/','http://localhost');
  if(req.method!=='GET'||!url.pathname.startsWith('/vintage-kana/')){res.writeHead(404).end();return}
  const rel=decodeURIComponent(url.pathname.slice('/vintage-kana/'.length));
  let target=path.resolve(appDir,rel);
  if(!target.startsWith(appDir+path.sep)&&target!==appDir){res.writeHead(403).end();return}
  if((await stat(target)).isDirectory())target=path.join(target,'index.html');
  const ext=path.extname(target);
  const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
  res.setHeader('content-type',(types[ext]||'application/octet-stream')+'; charset=utf-8');
  res.end(await readFile(target));
 }catch{res.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/vintage-kana/';
const engine=process.argv.includes('--webkit')?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const recentDate=(n)=>new Date(Date.UTC(2026,9,1+n)).toISOString();
function attemptsFor(share){
 const count=Math.round(glyphs.length*share);
 return glyphs.slice(0,count).map((g,i)=>({id:'mastery-qa-'+i,glyph:g.character,mode:i%2?'reading':'jibo',outcome:'correct',at:recentDate(i%15),masteryMethod:'choice'}));
}
const cases=[
 {label:'not started',events:[],text:'未',percent:0},
 {label:'attempted zero',events:[{id:'wrong',glyph:glyphs[0].character,mode:'reading',outcome:'incorrect',at:recentDate(0)}],text:'0',percent:0},
 {label:'half correct',events:attemptsFor(.5),text:String(Math.floor(Math.round(glyphs.length*.5)*100/glyphs.length)),percent:Math.floor(Math.round(glyphs.length*.5)*100/glyphs.length)},
 {label:'fully correct',events:attemptsFor(1),text:'100',percent:100},
];
async function makePage(width,events){
 const page=await browser.newPage({viewport:{width,height:840},reducedMotion:'reduce'});
 await page.addInitScript(([key,value])=>localStorage.setItem(key,value),[storageKey,JSON.stringify(events)]);
 await page.route(/fonts\.(googleapis|gstatic)\.com/,route=>route.abort());
 return page;
}
function assertNoHorizontalOverflow(snap,where){
 assert.ok(snap.scrollWidth<=snap.viewport+2,where+': horizontal overflow '+JSON.stringify(snap));
}
async function geometry(page,selector){
 return page.evaluate(sel=>{
  const el=document.querySelector(sel),r=el.getBoundingClientRect(),root=document.documentElement;
  return {x:r.x,right:r.right,width:r.width,viewport:window.innerWidth,scrollWidth:root.scrollWidth};
 },selector);
}
let checks=0;
try{
 for(const width of [320,375,390,768]){
  for(const entry of cases){
   const page=await makePage(width,entry.events);
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base+'index.html');
    await page.waitForFunction(target=>document.getElementById('masteryShortcutValue')?.textContent===target,entry.text);
    const simpleRing=await page.locator('#masteryShortcutRing').evaluate(el=>el.style.getPropertyValue('--p'));
    assert.equal(Number(simpleRing),entry.percent,width+' '+entry.label+' simple ring percent');
    const simpleLink=page.locator('#masteryShortcut');
    assert.equal(await simpleLink.getAttribute('href'),'./detail.html#record');
    assertNoHorizontalOverflow(await geometry(page,'#masteryShortcut'),'simple '+width);
    assert.ok((await simpleLink.getAttribute('aria-label')).includes(entry.text==='未'?'未着手':entry.percent+'%'));

    // Full navigation from the cinematic entry to the actual learning-record screen.
    await simpleLink.click();
    await page.waitForURL('**/vintage-kana/detail.html#record');
    await page.waitForFunction(expected=>document.getElementById('masteryRingValue')?.textContent===expected,entry.text);
    await page.locator('#quizRecord').waitFor({state:'visible'});
    const recordValue=await page.locator('#recordMasteryValue').textContent();
    assert.equal(recordValue,String(entry.percent),width+' '+entry.label+' record percent');
    const ringValue=Number(await page.locator('#masteryRing').evaluate(el=>el.style.getPropertyValue('--p')));
    assert.equal(ringValue,entry.percent,width+' '+entry.label+' detailed ring percent');

    const pos=await page.evaluate(()=>{
      const outer=document.getElementById('quizTabCluster').getBoundingClientRect();
      const ring=document.getElementById('masteryRing').getBoundingClientRect();
      return {outerL:outer.left,outerR:outer.right,ringL:ring.left,ringR:ring.right,scroll:document.documentElement.scrollWidth,width:innerWidth};
    });
    assert.ok(pos.ringL>=pos.outerL-.5&&pos.ringR<=pos.outerR+.5,'ring stays inside quiz pill: '+JSON.stringify(pos));
    assert.ok(pos.scroll<=pos.width+2,'detailed page has no horizontal overflow: '+JSON.stringify(pos));
    assert.equal(await page.locator('#quizTabCluster').count(),1,'one consolidated pill');

    // Text opens practice; the small ring remains a separate record action.
    await page.locator('[data-view="quiz"]').click();
    await page.locator('#quizPractice').waitFor({state:'visible'});
    await page.locator('#masteryRingAction').click();
    await page.locator('#quizRecord').waitFor({state:'visible'});
    await page.locator('#masteryRingAction').focus();
    await page.keyboard.press('Enter');
    await page.locator('#quizRecord').waitFor({state:'visible'});
    assert.deepEqual(errors,[],'browser page errors '+width+' '+entry.label);
    checks++;
    console.log('mastery QA '+engine+' '+width+'px '+entry.label+': '+entry.text+' / '+entry.percent+'% PASS');
   }finally{await page.close()}
  }
 }
 console.log('mastery QA '+engine+': '+checks+' browser scenarios PASS');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
