// Layout checks for the gloss/ruby/hanamaru implementation (DESIGN_GLOSS_LAYOUT_2026-09-28 §8).
// Usage: start a static server for D:/dev/koten on :8790, then
//   node conj/audit/gloss-layout-impl_2026-09-28/check-layout.cjs [baseUrl] [baselineUrl]
// baselineUrl (optional) serves the pre-change app (e.g. `git archive HEAD conj`) for the
// "how much did the ruby band move the table" comparison.
const {chromium}=require('D:/dev/koten/node_modules/playwright');
const path=require('path');


const BASE=process.argv[2]||'http://localhost:8790/conj/';
const BASELINE=process.argv[3]||null;
const OUT=__dirname;
const VIEWPORTS=[
  ['phone375',{width:375,height:812},true],
  ['phone360',{width:360,height:740},true],
  // v54: 高さの低いスマホ（iPhone SE など）。答えの後もボタンが画面内にあり、行は 44px 以上。
  ['phoneSE375',{width:375,height:667},true],
  ['phone360s',{width:360,height:640},true],
  ['phone390s',{width:390,height:664},true],
  ['ipad820',{width:820,height:1180},false],
  ['ipad768',{width:768,height:1024},false],
  ['ipadL1180',{width:1180,height:820},false],
  ['ipadL1024',{width:1024,height:768},false],
  ['pc1440',{width:1440,height:900},false],
];
const SHORT_PHONES=new Set(['phoneSE375','phone360s','phone390s']);
// v54: iPad 縦で、右の列の語釈が長い問題の拡大率の下限（べし 1.11 → 1.42 に改善した）。
const MIN_ZOOM={'ipad820 beshi_aux':1.3,'ipad820 maji_aux':1.3,'ipad820 mu_aux':1.3,'ipad820 ramu_aux':1.3,'ipad820 adjv-lemma-117':1.3};
const zoomOf=t=>{const m=/scale\(([\d.]+)\)/.exec(t);return m?Number(m[1]):1;};
const ITEMS=[
  ['adjv-lemma-030','adjv'],
  ['adjv-lemma-113','adjv'],
  ['adjv-lemma-117','adjv'],
  ['ru_aux','aux'],
  ['gotoshi_aux','aux'],
  ['meri_aux','aux'],
  ['beshi_aux','aux'],
  ['itadura','adjv'],
  ['mu_aux','aux'],
  ['ramu_aux','aux'],
  // v54: 高さの低いスマホで下端に近い問題（2行の語釈・表の上の見出し・3〜5字の固定の語形）と、ほかの品詞
  ['adjv-lemma-052','adjv'],
  ['maji_aux','aux'],
  ['mahoshi_aux','aux'],
  ['ku','verb'],
  ['kanasi','adj'],
  // HANDOFF §30: the longest aux example (candidate meaning, so no emphasis)
  ['tashi_aux','aux','aux-tashi-006'],
  // 2026-09-28 audit: 別解 labels (maji-003) and the longest 備考 row (nari-assert-003)
  ['maji_aux','aux','aux-maji-003'],
  ['nari_assert_aux','aux','aux-nari-assert-003'],
];
const SHOTS=new Set(['phone375','phoneSE375','phone360s','ipad820','pc1440']);
const SHOT_ITEMS=new Set(['adjv-lemma-030','adjv-lemma-117','ru_aux','meri_aux','beshi_aux','adjv-lemma-052','maji_aux','nari_assert_aux']);

async function open(browser,url,vp,mobile){
  const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:2,isMobile:mobile,hasTouch:mobile});
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{try{localStorage.setItem('conjInstallNoticeDismissed','true');}catch(e){}});
  await page.goto(url,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__conjAdjvRuntimeStatus&&window.__conjAdjvRuntimeStatus.loaded
    &&(typeof loadAuxExamples!=='function'||window.__conjAuxExampleStatus));
  await page.evaluate(async()=>{ if(document.fonts) await document.fonts.ready; });
  return {ctx,page,errors};
}

// Puts `id` on screen as a fresh question (level: aux Lv4 unless `level` is given).
async function show(page,id,pos,opts={}){
  await page.evaluate(async({id,pos,opts})=>{
    const s=document.getElementById('pos'); s.value=pos; updateLevelUI();
    if(opts.level){ auxLevel=opts.level; adjvLevel=opts.level; updateLevelUI(); }
    if(opts.exampleOff!==undefined) document.getElementById('showExample').checked=!opts.exampleOff;
    current=items.find(x=>x.id===id);
    // aux: show the former built-in example (audited meanings) unless an example id is given (HANDOFF §30)
    if(current.pos==='aux'&&typeof assignAuxExample==='function'){
      const all=current.auxExamples||[];
      const want=opts.exampleId||(all.find(x=>x.origin==='builtin')||{}).id;
      current.auxExamples=all.filter(x=>x.id===want); current.exampleId=null;
      assignAuxExample(current); current.auxExamples=all;
    }
    let seed=7; Math.random=()=>((seed=seed*16807%2147483647)/2147483647);
    chooseBlankSlots(); answered=false; answers={}; selected=null;
    render();
    if(typeof closeEditor==='function') closeEditor(false);
    if(document.activeElement) document.activeElement.blur();
    await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,120)));
  },{id,pos,opts});
}
async function answerAll(page,{wrong=false,revealOnly=false}={}){
  await page.evaluate(async({wrong,revealOnly})=>{
    document.querySelectorAll('.katsuyo .editable-answer').forEach((td,i)=>{
      const t=targetFor(td.dataset.row,Number(td.dataset.i));
      answers[key(td.dataset.row,Number(td.dataset.i))]=wrong&&i===0?'×':((t&&t[0])||'');
    });
    grade(revealOnly);
    await new Promise(r=>setTimeout(r,400));
  },{wrong,revealOnly});
}
const measure=page=>page.evaluate(()=>{
  const q=s=>document.querySelector(s);
  const rect=el=>{ if(!el) return null; const b=el.getBoundingClientRect(); return {l:b.left,t:b.top,r:b.right,b:b.bottom,w:b.width,h:b.height}; };
  const card=q('main.card'), stamp=q('#perfectResult'), gloss=q('#gloss');
  const lemma=q('#lemma');
  const range=document.createRange();
  const base=[...lemma.childNodes].flatMap(n=>{
    if(n.nodeType===3){range.selectNodeContents(n);return [...range.getClientRects()];}
    if(n.nodeName==='RUBY'){range.selectNodeContents(n.firstChild);return [...range.getClientRects()];}
    return [];});
  const word=base.length?{l:Math.min(...base.map(r=>r.left)),r:Math.max(...base.map(r=>r.right)),t:Math.min(...base.map(r=>r.top)),b:Math.max(...base.map(r=>r.bottom))}:null;
  const fs=parseFloat(getComputedStyle(lemma).fontSize);
  const cs=el=>el?getComputedStyle(el):null;
  const glossDt=[...gloss.querySelectorAll('dt')].map(d=>d.textContent);
  return {
    lemmaTop:rect(lemma).t, tableTop:rect(q('.card .katsuyo')).t, actionsTop:rect(q('.card .actions')).t, actionsBottom:rect(q('.card .actions')).b,
    transform:q('.card .study-layout').style.transform||'none',
    card:rect(card), gloss:rect(gloss), glossVisibility:cs(gloss).visibility, glossHidden:gloss.hidden, glossDt,
    glossDtCol:gloss.querySelector('dt')?rect(gloss.querySelector('dt')).r-rect(gloss).l:null,
    glossEm:[...gloss.querySelectorAll('.gloss-em')].map(e=>e.textContent),
    glossText:gloss.textContent,
    rt:[...lemma.querySelectorAll('rt')].map(r=>r.textContent+':'+cs(r).visibility),
    ariaLabel:lemma.getAttribute('aria-label'),
    kindText:q('#kind').textContent, kindClass:q('#kind').className, kindVisibility:cs(q('#kind')).visibility,
    kindColor:cs(q('#kind')).color, aidColor:cs(q('#lemmaAid')).color,
    ink:getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(),
    word, fs,
    minRow:Math.min(...[...document.querySelectorAll('#formBody > tr')].map(tr=>tr.getBoundingClientRect().height)),
    cardPadR:parseFloat(getComputedStyle(card).paddingRight),
    // 固定表示の語形の文字（行ボックス）が、そのセルの上下から何px出ているか（最大）
    cellTextOut:(()=>{let worst=0;const rg=document.createRange();
      for(const c of document.querySelectorAll('.card .katsuyo td')){const r=c.getBoundingClientRect();
        for(const d of c.querySelectorAll('.display')){rg.selectNodeContents(d);for(const b of rg.getClientRects()) worst=Math.max(worst,r.top-b.top,b.bottom-r.bottom);}}
      return worst;})(),
    stamp:stamp.classList.contains('show')?{...rect(stamp),z:cs(stamp).zIndex,blend:cs(stamp).mixBlendMode,hits:Number(stamp.dataset.hits),placed:stamp.classList.contains('is-placed'),vis:cs(stamp).visibility}:null,
    vh:innerHeight
  };
});
const hex2rgb=h=>{h=h.replace('#','');return `rgb(${parseInt(h.slice(0,2),16)}, ${parseInt(h.slice(2,4),16)}, ${parseInt(h.slice(4,6),16)})`;};

(async()=>{
  const browser=await chromium.launch();
  const rows=[]; const fails=[]; const notes=[];
  const check=(ok,msg)=>{ if(!ok) fails.push(msg); return ok; };
  for(const [vpName,vp,mobile] of VIEWPORTS){
    const {ctx,page,errors}=await open(browser,BASE,vp,mobile);
    let baseline=null;
    if(BASELINE) baseline=await open(browser,BASELINE,vp,mobile);
    const stripWidths=new Set(), dtCols=new Set();
    for(const [id,pos,exampleId] of ITEMS){
      await show(page,id,pos,{exampleId});
      if(SHOTS.has(vpName)&&SHOT_ITEMS.has(id)) await page.screenshot({path:path.join(OUT,`${vpName}-${id}-q.png`)});
      const before=await measure(page);
      await answerAll(page);
      if(SHOTS.has(vpName)&&SHOT_ITEMS.has(id)) await page.screenshot({path:path.join(OUT,`${vpName}-${id}-a.png`)});
      const after=await measure(page);
      const tag=`${vpName} ${id}`;
      // §8-7 / §8-13: nothing above the strip moves; zoom does not change
      check(Math.abs(before.lemmaTop-after.lemmaTop)<0.5,`${tag}: lemma top moved ${before.lemmaTop}->${after.lemmaTop}`);
      check(Math.abs(before.tableTop-after.tableTop)<0.5,`${tag}: table top moved ${before.tableTop}->${after.tableTop}`);
      check(Math.abs(before.actionsTop-after.actionsTop)<0.5,`${tag}: buttons moved ${before.actionsTop}->${after.actionsTop}`);
      check(before.transform===after.transform,`${tag}: transform ${before.transform}->${after.transform}`);
      check(before.glossVisibility==='hidden'&&after.glossVisibility==='visible',`${tag}: gloss visibility ${before.glossVisibility}->${after.glossVisibility}`);
      check(before.rt.every(r=>r.endsWith(':hidden'))&&after.rt.every(r=>r.endsWith(':visible')),`${tag}: rt visibility ${before.rt}/${after.rt}`);
      check(before.card.h===after.card.h,`${tag}: card height changed ${before.card.h}->${after.card.h}`);
      // §8-15: side column on wide screens, strip under the table on phones
      // 動詞・形容詞には語釈帯が無い（hidden）ので、語釈帯の配置は見ない
      if(after.glossHidden) check(pos==='verb'||pos==='adj',`${tag}: gloss hidden for ${pos}`);
      else if(!mobile) check(after.gloss.t<=after.tableTop+1 && after.gloss.l>=after.card.l && after.gloss.r<=after.card.r-after.cardPadR+1,`${tag}: gloss is not in the right column or runs into the card padding (${after.gloss.r} > ${after.card.r}-${after.cardPadR})`);
      else { stripWidths.add(Math.round(after.gloss.w)); dtCols.add(Math.round(after.glossDtCol)); check(after.gloss.t>after.tableTop,`${tag}: strip not under table`); }
      // v54: 行は 44px 以上、固定の語形はセルからはみ出さない。高さの低いスマホでも答えの後のボタンが画面内にある。
      if(mobile){
        check(after.minRow>=43.5,`${tag}: table row ${after.minRow.toFixed(1)}px < 44px`);
        check(after.cellTextOut<=1,`${tag}: fixed form text overflows its cell by ${after.cellTextOut.toFixed(1)}px`);
      }
      if(SHORT_PHONES.has(vpName)) check(after.actionsBottom<=after.vh+0.5,`${tag}: buttons off screen after answering: bottom ${after.actionsBottom.toFixed(1)} > ${after.vh}`);
      if(MIN_ZOOM[tag]) check(zoomOf(after.transform)>=MIN_ZOOM[tag],`${tag}: zoom ${after.transform} < ${MIN_ZOOM[tag]}`);
      // §8-14: hanamaru
      const s=after.stamp;
      let overlapEm=null;
      if(check(!!s,`${tag}: stamp not shown`)){
        check(s.placed&&s.vis==='visible',`${tag}: stamp not placed`);
        check(s.z==='20'&&s.blend==='multiply',`${tag}: stamp z/blend ${s.z}/${s.blend}`);
        check(s.l>=after.card.l&&s.r<=after.card.r-5.5&&s.t>=after.card.t+3.5&&s.b<=after.card.b,`${tag}: stamp outside card`);
        const want=Math.round(Math.min(156,Math.max(96,after.fs*4.35)));
        check(Math.abs(s.w-want)<1,`${tag}: stamp size ${s.w} != ${want}`);
        overlapEm=(after.word.r-s.l)/after.fs;
        const maxEm=Math.min(0.9,0.5*(after.word.r-after.word.l)/after.fs);
        const tol=1/after.fs; // left is rounded to whole px
        check(overlapEm>=0.3-tol && overlapEm<=Math.max(maxEm+tol, (after.word.r-(after.card.r-6-s.w))/after.fs+tol),`${tag}: overlap ${overlapEm.toFixed(2)}em`);
        if(pos==='adjv') check(s.hits===0,`${tag}: stamp crosses learning text (${s.hits})`);
        check(after.kindClass.includes('kind-answer-badge')||after.kindColor===hex2rgb(after.ink),`${tag}: kind colour ${after.kindColor} while stamp shown`);
      }
      let baseDelta='';
      if(baseline){
        await show(baseline.page,id,pos);
        const b=await baseline.page.evaluate(()=>({lemmaTop:document.getElementById('lemma').getBoundingClientRect().top,tableTop:document.querySelector('.card .katsuyo').getBoundingClientRect().top,transform:document.querySelector('.card .study-layout').style.transform||'none',cardBottom:document.querySelector('main.card').getBoundingClientRect().bottom,actionsBottom:document.querySelector('.card .actions').getBoundingClientRect().bottom}));
        baseDelta=`table ${(after.tableTop-b.tableTop).toFixed(1)}px; zoom ${b.transform}→${after.transform}; card bottom ${Math.round(b.cardBottom)}→${Math.round(after.card.b)} (vh ${after.vh})`;
        // The buttons must stay on screen wherever they were on screen before this change
        // (§4.6 参考: syncStudyHeights never shrinks, so some wide screens already overflowed).
        check(after.actionsBottom<=after.vh+0.5 || b.actionsBottom>after.vh,`${tag}: buttons newly off screen: bottom ${after.actionsBottom} > ${after.vh} (before: ${b.actionsBottom})`);
        // v54: 表の拡大率は変更前より下がらない
        check(zoomOf(after.transform)>=zoomOf(b.transform)-0.005,`${tag}: zoom dropped ${b.transform}→${after.transform}`);
      }
      rows.push({vp:vpName,id,lemmaTop:after.lemmaTop.toFixed(1),tableTop:after.tableTop.toFixed(1),transform:after.transform,
        gloss:`${Math.round(after.gloss.w)}×${Math.round(after.gloss.h)}`,stamp:s?`${Math.round(s.w)}px hits=${s.hits} overlap=${overlapEm.toFixed(2)}em`:'-',
        dt:after.glossDt.join('/'),em:after.glossEm.join('/'),vsBaseline:baseDelta,
        row:after.minRow.toFixed(1),buttons:`${after.actionsBottom.toFixed(0)}/${after.vh}`});
      // item-specific content checks
      if(id==='meri_aux') check(after.glossEm.join()==='推定',`${tag}: meri_aux (audited) should emphasise 推定, got ${after.glossEm}`);
      if(id==='beshi_aux') check(after.glossEm.join()==='推量,当然',`${tag}: beshi_aux (audited) should mark 推量 and 当然, got ${after.glossEm}`);
      if(id!=='meri_aux'&&id!=='beshi_aux') check(before.glossEm.length===0||pos==='aux',`${tag}: unexpected emphasis`);
      if(id==='ru_aux') check(after.glossEm.join()==='自発',`${tag}: ru_aux (audited) should mark 自発, got ${after.glossEm}`);
      if(id==='mu_aux') check(after.glossEm.join()==='推量,意志',`${tag}: mu_aux should mark 推量 and 意志, got ${after.glossEm}`);
      if(id==='ramu_aux') check(after.glossEm.join()==='現在推量',`${tag}: ramu_aux should mark 現在推量 only, got ${after.glossEm}`);
      if(id==='gotoshi_aux') check(after.glossEm.join()==='比況',`${tag}: gotoshi_aux (audited) should mark 比況, got ${after.glossEm}`);
      if(id==='ru_aux') check(after.kindText==='下二段型|未然形接続'&&after.glossDt.join()==='意味,接続',`${tag}: aux kind/gloss rows ${after.kindText} ${after.glossDt}`);
      if(id==='gotoshi_aux') check(after.glossDt.join()==='意味',`${tag}: gotoshi connection equals short form, no 接続 row`);
      if(id==='itadura') check(after.glossDt.join()==='意味'&&after.glossText.includes('無駄だ・むなしい')&&after.rt.join()==='ず:visible',`${tag}: itadura gloss ${after.glossText} ${after.rt}`);
      if(id==='adjv-lemma-030') check(after.glossDt.join()==='意味,この用例では'&&after.ariaLabel==='しづかなり（現代仮名遣い しずかなり）',`${tag}: 030 rows/aria ${after.glossDt} ${after.ariaLabel}`);
    }
    if(mobile){
      check(stripWidths.size===1,`${vpName}: strip width varies ${[...stripWidths]}`);
      check(dtCols.size===1,`${vpName}: dt column varies ${[...dtCols]}`);
      notes.push(`${vpName}: strip width ${[...stripWidths]}px, dt column ${[...dtCols]}px`);
    }
    // §8-4: example off -> no 「この用例では」 row in the DOM
    await show(page,'adjv-lemma-030','adjv',{exampleOff:true});
    const off=await page.evaluate(()=>[...document.querySelectorAll('#gloss dt')].map(d=>d.textContent));
    check(off.join()==='意味',`${vpName}: example off still shows ${off}`);
    await page.evaluate(()=>{document.getElementById('showExample').checked=true;});
    // §8-12: aux Lv5 hides kind+connection until the answer, then shows a badge
    await show(page,'ru_aux','aux',{level:5});
    const lv5q=await measure(page);
    await answerAll(page,{revealOnly:true});
    const lv5a=await measure(page);
    check(lv5q.kindVisibility==='hidden'&&lv5a.kindVisibility==='visible'&&lv5a.kindClass.includes('kind-answer-badge')&&lv5a.kindText.includes('未然形接続'),`${vpName}: Lv5 kind ${lv5q.kindVisibility}->${lv5a.kindVisibility} ${lv5a.kindClass}`);
    check(Math.abs(lv5q.tableTop-lv5a.tableTop)<0.5,`${vpName}: Lv5 table moved`);
    check(!lv5a.stamp,`${vpName}: 答えを見る must not show the stamp`);
    await page.evaluate(()=>{auxLevel=4;adjvLevel=4;updateLevelUI();});
    if(errors.length) fails.push(`${vpName}: page errors ${errors.join(' | ')}`);
    // review modal (記録→要確認) opens in the answered state
    if(vpName==='phone375'||vpName==='pc1440'){
      await page.evaluate(()=>{openRecord();openReviewModal(items.find(x=>x.id==='adjv-lemma-117'));});
      await page.waitForTimeout(200);
      const m=await page.evaluate(()=>({rt:[...document.querySelectorAll('#reviewModalWord rt')].map(r=>r.textContent+':'+getComputedStyle(r).visibility),gloss:getComputedStyle(document.getElementById('reviewGloss')).visibility,dt:[...document.querySelectorAll('#reviewGloss dt')].map(d=>d.textContent)}));
      check(m.rt.join()==='じょう:visible,じょう:visible'&&m.gloss==='visible'&&m.dt.join()==='意味',`${vpName}: review modal ${JSON.stringify(m)}`);
      await page.screenshot({path:path.join(OUT,`${vpName}-review-modal-adjv-lemma-117.png`)});
      await page.evaluate(()=>{closeReviewModal();closeRecord();});
    }
    await ctx.close();
    if(baseline) await baseline.ctx.close();
  }
  await browser.close();
  const table=['| viewport | item | lemma top | table top | transform | row | buttons bottom/vh | gloss w×h | hanamaru | gloss rows | emphasised | vs. before change |','|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map(r=>`| ${r.vp} | ${r.id} | ${r.lemmaTop} | ${r.tableTop} | ${r.transform} | ${r.row} | ${r.buttons} | ${r.gloss} | ${r.stamp} | ${r.dt} | ${r.em||'-'} | ${r.vsBaseline||'-'} |`)].join('\n');
  const report=`# gloss layout check (${new Date().toISOString()})\n\n${table}\n\n${notes.map(n=>'- '+n).join('\n')}\n\n${fails.length?'## FAILURES\n'+fails.map(f=>'- '+f).join('\n'):'All checks passed ('+rows.length+' item×viewport combinations + per-viewport example-off / Lv5 / review-modal checks).'}\n`;

  console.log(report);
  process.exit(fails.length?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
