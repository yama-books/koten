const {chromium}=require('D:/dev/koten/node_modules/playwright');
const path=require('path');
const DIR=__dirname;
const OUT=path.join(DIR,'shots');
require('fs').mkdirSync(OUT,{recursive:true});

const ONLY=process.argv[2]?process.argv[2].split(','):null;
const SIDE=process.env.SIDE==='1';
const shots=[
  ['v6-long-a','A','a','adjv-lemma-117','adjv'],
  ['v6-pad-aux-a','A','a','ru_aux','aux',{width:820,height:1180}],
  ['v6-aux-a','A','a','ru_aux','aux'],
  ['v6-pc-aux-a','A','a','ru_aux','aux',{width:1440,height:900}],
  ['v6-aux-ramu','A','a','ramu_aux','aux'],
  ['v6-aux-gotoshi','A','a','gotoshi_aux','aux'],
  ['v5-adjv-a','A','a','adjv-lemma-030','adjv'],
  ['v5-long-a','A','a','adjv-lemma-117','adjv'],
  ['v5-tari-a','A','a','adjv-lemma-113','adjv'],
  ['v5-aux-a','A','a','ru_aux','aux'],
  ['v5-pad-adjv-a','A','a','adjv-lemma-030','adjv',{width:820,height:1180}],
  ['v5-pad-aux-a','A','a','ru_aux','aux',{width:820,height:1180}],
  ['v5-pc-aux-a','A','a','ru_aux','aux',{width:1440,height:900}],
  ['v5-pc-long-a','A','a','adjv-lemma-117','adjv',{width:1440,height:900}],
  ['v4-adjv-q','A','q','adjv-lemma-030','adjv'],
  ['v4-adjv-a','A','a','adjv-lemma-030','adjv'],
  ['v4-long-a','A','a','adjv-lemma-117','adjv'],
  ['v4-tari-a','A','a','adjv-lemma-113','adjv'],
  ['v4-aux-a','A','a','ru_aux','aux'],
  ['v4-aux-q','A','q','ru_aux','aux'],
  ['v4-pad-adjv-a','A','a','adjv-lemma-030','adjv',{width:820,height:1180}],
  ['v4-pad-aux-a','A','a','ru_aux','aux',{width:820,height:1180}],
  ['v4-pc-adjv-a','A','a','adjv-lemma-030','adjv',{width:1440,height:900}],
  ['v4-pc-aux-a','A','a','ru_aux','aux',{width:1440,height:900}],
  ['v4-pc-long-a','A','a','adjv-lemma-117','adjv',{width:1440,height:900}],
  ['v3-pad-adjv-a','A','a','adjv-lemma-030','adjv',{width:820,height:1180}],
  ['v3-pad-aux-a','A','a','ru_aux','aux',{width:820,height:1180}],
  ['v3-padL-adjv-a','A','a','adjv-lemma-030','adjv',{width:1180,height:820}],
  ['v3-pc-adjv-a','A','a','adjv-lemma-030','adjv',{width:1440,height:900}],
  ['v3-pc-aux-a','A','a','ru_aux','aux',{width:1440,height:900}],
  ['v3-pc13-adjv-a','A','a','adjv-lemma-117','adjv',{width:1280,height:800}],
  ['v3-pc-adjv-q','A','q','adjv-lemma-030','adjv',{width:1440,height:900}],
  ['nowx-padL-adjv-a',null,'a','adjv-lemma-030','adjv',{width:1180,height:820}],
  ['nowx-pc13-adjv-a',null,'a','adjv-lemma-117','adjv',{width:1280,height:800}],
  ['v2-adjv-q','A','q','adjv-lemma-030','adjv'],
  ['v2-adjv-a','A','a','adjv-lemma-030','adjv'],
  ['v2-tari-a','A','a','adjv-lemma-113','adjv'],
  ['v2-long-a','A','a','adjv-lemma-117','adjv'],
  ['v2-aux-a','A','a','ru_aux','aux'],
  ['v2-pad-adjv-a','A','a','adjv-lemma-030','adjv',{width:820,height:1180}],
  ['v2-pad-aux-a','A','a','ru_aux','aux',{width:820,height:1180}],
  ['v2-pc-adjv-a','A','a','adjv-lemma-030','adjv',{width:1440,height:900}],
  ['v2-pc-aux-a','A','a','ru_aux','aux',{width:1440,height:900}],
  ['now-pc-adjv-a',null,'a','adjv-lemma-030','adjv',{width:1440,height:900}],
  ['now-pad-adjv-a',null,'a','adjv-lemma-030','adjv',{width:820,height:1180}],
  ['A-long-a','A','a','adjv-lemma-107','adjv'],
  ['A-long2-a','A','a','adjv-lemma-117','adjv'],
  // name, option, phase, item, pos, viewport
  ['now-adjv-a',null,'a','adjv-lemma-030','adjv'],
  ['now-aux-q',null,'q','ru_aux','aux'],
  ['A-adjv-q','A','q','adjv-lemma-030','adjv'],
  ['A-adjv-a','A','a','adjv-lemma-030','adjv'],
  ['A-tari-a','A','a','adjv-lemma-113','adjv'],
  ['A-aux-q','A','q','ru_aux','aux'],
  ['A-aux-a','A','a','ru_aux','aux'],
  ['B-adjv-q','B','q','adjv-lemma-030','adjv'],
  ['B-adjv-a','B','a','adjv-lemma-030','adjv'],
  ['B-aux-a','B','a','ru_aux','aux'],
  ['C-adjv-a','C','a','adjv-lemma-030','adjv'],
  ['C-aux-q','C','q','ru_aux','aux'],
  ['C-aux-a','C','a','ru_aux','aux'],
  ['A-adjv-a-pc','A','a','adjv-lemma-030','adjv',{width:1280,height:800}],
  ['A-adjv-q-pc','A','q','adjv-lemma-030','adjv',{width:1280,height:800}],
];

(async()=>{
  const browser=await chromium.launch();
  for(const [name,opt,phase,id,pos,vp] of shots){
    if(ONLY&&!ONLY.includes(name)) continue;
    const ctx=await browser.newContext({viewport:vp||{width:375,height:812},deviceScaleFactor:2,
      isMobile:!vp,hasTouch:!vp});
    const page=await ctx.newPage();
    await page.addInitScript(()=>{try{localStorage.setItem('conjInstallNoticeDismissed','1');}catch(e){}});
    await page.goto('http://localhost:8790/conj/',{waitUntil:'networkidle'});
    await page.waitForFunction(id=>typeof items!=='undefined'&&items.some(x=>x.id===id),id);
    await page.evaluate(async()=>{ if(document.fonts) await document.fonts.ready; });
    await page.addScriptTag({path:path.join(DIR,'proto-overlay.js')});
    if(SIDE) await page.evaluate(()=>{window.PROTO_SIDE=true;});
    if(process.env.TUNE) await page.evaluate(t=>{Object.assign(window,JSON.parse(t));},process.env.TUNE);
    await page.evaluate(async({id,pos,phase,opt})=>{
      const s=document.getElementById('pos'); s.value=pos; updateLevelUI();
      current=items.find(x=>x.id===id);
      let seed=7; Math.random=()=>((seed=seed*16807%2147483647)/2147483647);
      chooseBlankSlots(); answered=false; answers={}; selected=null;
      render();
      if(typeof closeEditor==='function') closeEditor(false);
      if(phase==='a'){
        document.querySelectorAll('.katsuyo .editable-answer').forEach(td=>{
          const t=targetFor(td.dataset.row,Number(td.dataset.i)); answers[key(td.dataset.row,Number(td.dataset.i))]=(t&&t[0])||'';
        });
        grade(false);
      }
      if(opt) await PROTO.apply(opt,phase);
      else document.head.insertAdjacentHTML('beforeend','<style>.install-guide{display:none!important}</style>');
      if(document.activeElement) document.activeElement.blur();
    },{id,pos,phase,opt});
    await page.waitForTimeout(400);
    await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:false});
    const m=await page.evaluate(()=>{const r=e=>{const b=document.querySelector(e)?.getBoundingClientRect();return b?Math.round(b.top)+'/'+Math.round(b.bottom):'-';};
      const g=document.querySelector('.p-gloss:not(.p-side)'),rn=document.getElementById('rowNote'),ac=document.querySelector('.actions');
      const gb=g&&g.getBoundingClientRect(),rb=rn.getBoundingClientRect(),tb=document.querySelector('.katsuyo').getBoundingClientRect(),ab=ac.getBoundingClientRect();
      const gaps=g?{tableToRule:Math.round(gb.top-tb.bottom),ruleToBtn:Math.round(ab.top-gb.bottom),stripH:Math.round(gb.height),stripW:Math.round(gb.width)}:{};
      const st=document.getElementById('perfectResult');const vis=st.classList.contains('show');return {stamp:vis?[st.dataset.hits,st.dataset.overlap,st.dataset.dy].join('/'):false,vh:innerHeight,gaps,lemma:r('#lemma'),table:r('.katsuyo'),card:r('main.card'),actions:r('.actions'),transform:document.querySelector('.card .study-layout').style.transform||'none'};});
    console.log(name,JSON.stringify(m));
    await ctx.close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
