const {chromium}=require('D:/dev/koten/node_modules/playwright');
(async()=>{
 const b=await chromium.launch(); const out={};
 for(const [name,vp,mob] of [['phone375',{width:375,height:812},true],['phone360',{width:360,height:740},true],['phoneSE375',{width:375,height:667},true],['phone360s',{width:360,height:640},true],['ipad820',{width:820,height:1180},false],['ipad768',{width:768,height:1024},false],['pc1440',{width:1440,height:900},false]]){
  const ctx=await b.newContext({viewport:vp,deviceScaleFactor:1,isMobile:mob,hasTouch:mob});
  const p=await ctx.newPage();
  await p.addInitScript(()=>{try{localStorage.setItem('conjInstallNoticeDismissed','1')}catch(e){}});
  await p.goto('http://localhost:8790/conj/',{waitUntil:'networkidle'});
  await p.waitForFunction(()=>typeof items!=='undefined'&&items.filter(x=>x.pos==='adjv').length>100);
  await p.evaluate(async()=>{await document.fonts.ready;});
  out[name]=await p.evaluate(async()=>{
   const s=document.getElementById('pos'); s.value='adjv'; updateLevelUI();
   const res=[]; const stamp=document.getElementById('perfectResult'); const card=document.querySelector('main.card');
   for(const it of items.filter(x=>x.pos==='adjv')){
     if(typeof closeEditor==='function') closeEditor(false);
     current=it; chooseBlankSlots(); answered=false; answers={}; selected=null; render();
     await new Promise(r=>requestAnimationFrame(()=>r()));
     if(typeof closeEditor==='function') closeEditor(false);
     document.querySelectorAll('.katsuyo .editable-answer').forEach(td=>{const t=targetFor(td.dataset.row,Number(td.dataset.i));answers[key(td.dataset.row,Number(td.dataset.i))]=(t&&t[0])||'';});
     grade(false); await placePerfectStamp();
     const sr=stamp.getBoundingClientRect(), cr=card.getBoundingClientRect();
     res.push({id:it.id,h:Number(stamp.dataset.hits),placed:stamp.classList.contains('is-placed'),inside:sr.left>=cr.left&&sr.right<=cr.right-5.5&&sr.top>=cr.top+3.5,
       shown:stamp.classList.contains('show'),blend:getComputedStyle(stamp).mixBlendMode,z:getComputedStyle(stamp).zIndex});
   }
   return res;
  });
  await ctx.close();
 }
 await b.close();
 for(const [k,v] of Object.entries(out)){
   const bad=v.filter(r=>r.h>0||!r.placed||!r.inside||r.blend!=='multiply'||r.z!=='20');
   console.log(`${k}: adjv items=${v.length}, hits>0=${v.filter(r=>r.h>0).length}, notPlaced=${v.filter(r=>!r.placed).length}, outside=${v.filter(r=>!r.inside).length}, maxHits=${Math.max(...v.map(r=>r.h))}`);
   if(bad.length) console.log('  ',JSON.stringify(bad.slice(0,20)));
 }
})().catch(e=>{console.error(e);process.exit(1);});
