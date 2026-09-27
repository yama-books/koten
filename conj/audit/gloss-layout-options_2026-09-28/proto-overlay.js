// Prototype overlay for design comparison only (not app code).
window.PROTO=(function(){
  const data={
    'adjv-lemma-030':{ruby:[['し'],['づ','ず'],['かなり']],gloss:['静かだ','平穏だ'],ctx:'打消で「平穏でない」'},
    'adjv-lemma-113':{ruby:[['ばう','ぼう'],['ばう','ぼう'],['たり']],gloss:['広々としてはるかだ'],ctx:'「波の音が激しい」'},
    'adjv-lemma-107':{ruby:[['くわう','こう'],['くわう','こう'],['たり']],gloss:['広々としている']},
    'adjv-lemma-117':{ruby:[['じやう','じょう'],['じやう','じょう'],['たり']],gloss:['露が濃く多く降りているさま']},
    'ramu_aux':{meaning:['現在推量','現在の原因推量','伝聞','婉曲'],em:'現在の原因推量',connShort:'終止形',connFull:'終止形（ラ変型には連体形）'},
    'gotoshi_aux':{meaning:['比況','例示'],em:'比況',connShort:'体言＋の・連体形',connFull:'体言＋の・が／連体形（＋が）'},
    'ru_aux':{meaning:['受身','尊敬','自発','可能'],em:'自発',connShort:'未然形',connFull:'四段・ナ変・ラ変の未然形'}
  };
  const common=`
    .install-guide{display:none!important}
    .p-mark{background:linear-gradient(transparent 18%,var(--example-mark-bg) 18%,var(--example-mark-bg) 92%,transparent 92%);padding:0 2px;border-radius:2px}
    .p-em{font-weight:700;color:var(--ink)}
    .p-nw{white-space:nowrap}
    .kind .p-sep{margin:0 .6em;color:var(--line-strong)}
  `;
  const css={
    A:`
      #lemma.p-ruby{padding-top:12px;margin-top:2px}
      #lemma.p-ruby rt{font:600 11px/1 "Klee One","Yu Mincho",serif;letter-spacing:.02em;color:var(--accent-strong);visibility:hidden}
      @media(min-width:701px){#lemma.p-ruby{padding-top:17px;margin-top:4px}#lemma.p-ruby rt{font-size:15px}}
      .p-revealed #lemma.p-ruby rt{visibility:visible}
      /* gloss strip: fixed width so the rules and the label gutter never move between questions */
      .p-gloss{display:grid;grid-template-columns:var(--p-dt) minmax(0,1fr);column-gap:10px;row-gap:6px;
        --p-dt:6.2em;width:min(calc(100% - 32px),300px);box-sizing:border-box;
        margin:12px auto 0;padding:10px 4px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);
        text-align:left;align-items:baseline;visibility:hidden}
      .p-revealed .p-gloss{visibility:visible}
      .p-gloss dt{font-size:10px;color:var(--tag-ink);text-align:right;white-space:nowrap;justify-self:end}
      .p-gloss dt.p-mark{color:var(--ink)}
      .p-gloss dd{margin:0;font-size:12.5px;line-height:1.5;color:var(--ink)}
      .p-gloss dd.sub{font-size:11px;color:var(--muted)}
      .card .actions{margin-top:16px}
      @media(min-width:701px){
        .p-gloss{width:min(calc(100% - 64px),420px);margin-top:16px;padding:12px 6px;row-gap:8px;column-gap:14px}
        .p-gloss dt{font-size:12px}.p-gloss dd{font-size:15px}.p-gloss dd.sub{font-size:13px}
        .card .actions{margin-top:20px}
      }
      /* wide screens: gloss sits in the empty right column, mirroring the example on the left */
      .study-layout.p-has-side:not(.review-modal-study-layout){grid-template-areas:"example table gloss"}
      .p-gloss.p-side{grid-area:gloss;align-self:start;justify-self:start;display:block;width:auto;max-width:17em;
        margin:0 0 0 16px;padding:1px 0 1px 13px;border:0;border-left:1px solid var(--line);font-size:13px}
      .p-gloss.p-side dt{text-align:left;justify-self:start;font-size:11px;margin:14px 0 2px}
      .p-gloss.p-side dt:first-child{margin-top:0}
      .p-gloss.p-side dd{font-size:14px;line-height:1.6}
      .p-gloss.p-side dd.sub{font-size:12px}
      /* hanamaru: anchored to the headword (placed by JS), learning text stays in front with a halo */
      .perfect-result.p-anchored{right:auto}
      /* stamp is the top layer; multiply lets the text show through the red ink like a real stamp */
      .perfect-result.p-anchored{z-index:20;mix-blend-mode:multiply}
      /* while the stamp is shown, the grey kind/aid text turns to ink colour so it stays legible through the red */
      .card:has(.perfect-result.show) #kind,.card:has(.perfect-result.show) #lemmaAid{color:var(--ink)}
      .card:has(.perfect-result.show) #kind .p-sep{color:var(--muted)}
      #lemmaAid{width:fit-content;max-width:100%;margin-left:auto;margin-right:auto}
    `,
    B:`
      .p-head{margin:3px auto 2px;line-height:1.55;visibility:hidden;text-align:center}
      .p-revealed .p-head{visibility:visible}
      .p-head .l1{font-size:11px;color:var(--muted)}
      .p-head .l1 b{color:var(--accent-strong);font-weight:700}
      .p-head .l2{font-size:12.5px;color:var(--ink)}
      .p-head .l3{font-size:11px;color:var(--ink)}
      .p-head .lab{font-size:9.5px;color:var(--tag-ink);margin-right:.5em}
    `,
    C:`
      .p-card{display:none;margin:12px auto 0;width:fit-content;min-width:230px;max-width:calc(100% - 24px);background:var(--soft);border:1px solid var(--line);
        border-radius:14px;padding:10px 16px 9px;text-align:left}
      .p-revealed .p-card{display:block}
      .p-card .r{display:flex;gap:10px;align-items:baseline;font-size:12.5px;line-height:1.55;margin:1px 0}
      .p-card .k{font-size:10px;color:var(--tag-ink);min-width:5.4em;flex:none}
      .p-card .yomi{font-family:"Klee One","Yu Mincho",serif;font-size:14px}
      .p-card .yomi b{color:var(--accent-strong)}
      .p-card .arrow{color:var(--muted);margin:0 .35em;font-size:11px}
      .p-card .sub{font-size:11px;color:var(--muted)}
    `
  };
  const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
  const rubyHtml=r=>r.map(([b,t])=>t?`<ruby>${b}<rt>${t}</rt></ruby>`:b).join('');
  const modernHtml=r=>r.map(([b,t])=>t?`<b>${t}</b>`:b).join('');
  const glossHtml=g=>g.map((s,i)=>`<span class="p-nw">${s}${i<g.length-1?'・':''}</span>`).join('');
  const meaningHtml=d=>d.meaning.map((m,i)=>`<span class="p-nw">${m===d.em?`<span class="p-mark p-em">${m}</span>`:m}${i<d.meaning.length-1?'・':''}</span>`).join('');

  function placeGloss(dl,aux){
    if(window.PROTO_SIDE && matchMedia('(min-width:701px)').matches){
      dl.classList.add('p-side');
      const lay=document.querySelector('.card .study-layout');lay.classList.add('p-has-side');lay.appendChild(dl);
    }else aux.before(dl);
  }
  function apply(opt,phase){
    const st=el('style');st.id='proto-style';st.textContent=common+css[opt];document.head.appendChild(st);
    const main=document.querySelector('main.card');
    if(phase==='a') main.classList.add('p-revealed');
    const d=data[current.id]; if(!d) throw new Error('no proto data for '+current.id);
    const aux=document.getElementById('auxInfo');
    const lemma=document.getElementById('lemma');
    const kind=document.getElementById('kind');
    const isAux=current.pos==='aux';
    const kindWithConn=()=>{kind.innerHTML=`<span>${current.kind}</span><span class="p-sep">|</span><span>${d.connShort}接続</span>`;};
    aux.style.display='none';
    if(opt==='A'){
      if(!isAux){
        lemma.innerHTML=rubyHtml(d.ruby); lemma.classList.add('p-ruby');
        const dl=el('dl','p-gloss',`<dt>意味</dt><dd>${glossHtml(d.gloss)}</dd>`+(d.ctx?`<dt class="p-mark">この用例では</dt><dd>${d.ctx}</dd>`:''));
        placeGloss(dl,aux);
      }else{
        lemma.classList.add('p-ruby');
        kindWithConn();
        placeGloss(el('dl','p-gloss',`<dt>意味</dt><dd>${meaningHtml(d)}</dd><dt>接続</dt><dd class="sub">${d.connFull}</dd>`),aux);
      }
    }else if(opt==='B'){
      let html;
      if(!isAux){
        const modern=modernHtml(d.ruby);
        html=`<div class="l1"><span class="lab">現代仮名遣い</span>${modern}</div><div class="l2"><span class="lab">意味</span>${glossHtml(d.gloss)}</div>`
          +(d.ctx?`<div class="l3"><span class="lab p-mark">この用例では</span>${d.ctx}</div>`:'');
      }else{
        kindWithConn();
        html=`<div class="l2"><span class="lab">意味</span>${meaningHtml(d)}</div>`;
      }
      document.getElementById('lemmaAid').after(el('div','p-head',html));
    }else if(opt==='C'){
      let html;
      if(!isAux){
        const hist=d.ruby.map(([b])=>b).join('');
        html=`<div class="r"><span class="k">読み</span><span class="yomi">${hist}<span class="arrow">→</span>${modernHtml(d.ruby)}</span></div>`
          +`<div class="r"><span class="k">意味</span><span>${glossHtml(d.gloss)}</span></div>`
          +(d.ctx?`<div class="r"><span class="k"><span class="p-mark">この用例では</span></span><span>${d.ctx}</span></div>`:'');
      }else{
        if(phase==='q'){aux.style.display='block';aux.innerHTML=`<strong>接続：</strong>${d.connShort}`;}
        html=`<div class="r"><span class="k">意味</span><span>${meaningHtml(d)}</span></div>`
          +`<div class="r"><span class="k">接続</span><span class="sub">${d.connFull}</span></div>`;
      }
      aux.before(el('div','p-card',html));
    }
    if(typeof syncStudyHeights==='function'){syncStudyHeights();}
    if(opt==='A') return placeStamp();
  }
  // Ink mask of the stamp image (N x N cells, true where the red line is).
  let MASK=null; const N=48;
  async function loadMask(){
    if(MASK) return MASK;
    const im=new Image(); im.src='./img/hanamaru.png'; await im.decode();
    const c=document.createElement('canvas'); c.width=c.height=N;
    const x=c.getContext('2d'); x.drawImage(im,0,0,N,N);
    const d=x.getImageData(0,0,N,N).data; MASK=[];
    for(let y=0;y<N;y++)for(let i=0;i<N;i++){ if(d[(y*N+i)*4+3]>40) MASK.push([(i+.5)/N,(y+.5)/N]); }
    return MASK;
  }
  function textRects(el){
    if(!el) return [];
    const r=document.createRange(); const out=[];
    const walk=n=>{ if(n.nodeType===3&&n.textContent.trim()){r.selectNodeContents(n);out.push(...r.getClientRects());}
      else n.childNodes&&n.childNodes.forEach(walk); };
    walk(el); return out;
  }
  // Anchor to the headword; choose, among candidates that still overlap the headword a little,
  // the one whose red lines cross the least small learning text (ruby / kanji aid / kind+connection / tag).
  async function placeStamp(){
    const stamp=document.getElementById('perfectResult');
    const lemma=document.getElementById('lemma');
    if(!stamp||!lemma) return;
    const mask=await loadMask();
    const card=stamp.offsetParent||lemma.closest('.card');
    const fs=parseFloat(getComputedStyle(lemma).fontSize);
    const size=Math.round(Math.min(156,Math.max(96,fs*4.35)));
    const range=document.createRange();
    const base=[...lemma.childNodes].flatMap(n=>{
      if(n.nodeType===3){range.selectNodeContents(n);return [...range.getClientRects()];}
      if(n.nodeName==='RUBY'){range.selectNodeContents(n.firstChild);return [...range.getClientRects()];}
      return [];});
    const L=Math.min(...base.map(r=>r.left)),R=Math.max(...base.map(r=>r.right)),T=Math.min(...base.map(r=>r.top)),B=Math.max(...base.map(r=>r.bottom));
    const obstacles=[
      ...[...lemma.querySelectorAll('rt')].flatMap(textRects).map(r=>[r,1]),
      ...textRects(document.getElementById('lemmaAid')).map(r=>[r,1]),
      ...textRects(document.getElementById('kind')).map(r=>[r,1]),
      ...textRects(document.querySelector('.card .meta')).map(r=>[r,window.PROTO_TAGW??.6]),
    ];
    const c=card.getBoundingClientRect(), minTop=c.top+4, maxRight=c.right-6;
    const hits=(x0,y0)=>{let h=0;for(const [u,v] of mask){const px=x0+u*size,py=y0+v*size;
      for(const [r,w] of obstacles){ if(px>=r.left-1&&px<=r.right+1&&py>=r.top-1&&py<=r.bottom+1){h+=w;break;} }}return h;};
    const oMax=Math.min(0.9*fs,0.5*(R-L)), oMin=Math.min(0.3*fs,oMax);
    let best=null;
    for(let k=0;k<=6;k++){
      const o=oMax-(oMax-oMin)*k/6;
      for(const f of (window.PROTO_FS||[0,-.06,-.12,-.18,-.24,.06])){
        let x0=R-o, y0=(T+B)/2-0.54*size+f*size;
        if(x0+size>maxRight) x0=maxRight-size;          // stay inside the card (overlaps more)
        if(y0<minTop) continue;
        const cost=hits(x0,y0) + 4*(oMax-o)/fs + (window.PROTO_FW??20)*Math.abs(f);
        if(!best||cost<best.cost) best={cost,x0,y0,o,f,h:hits(x0,y0)};
      }
    }
    if(!best) return;
    stamp.classList.add('p-anchored');
    Object.assign(stamp.style,{width:size+'px',height:size+'px',right:'auto',
      left:Math.round(best.x0-c.left-card.clientLeft)+'px',top:Math.round(best.y0-c.top-card.clientTop)+'px'});
    stamp.dataset.hits=best.h.toFixed(1); stamp.dataset.overlap=(best.o/fs).toFixed(2); stamp.dataset.dy=best.f;
  }
  return {apply,placeStamp};
})();
