import { makePairingCode, normalizeCode } from './crypto.ts';
import { isPairingCode } from './pairing.ts';
import { makePortableInvite, readPortableInvite } from './portable-invite.ts';
import { savedGroup, saveGroup, GROUP_KEY } from './group-store.ts';
import { createGroup, joinGroup, verifyGroup, appRemote } from './group-client.ts';
import { syncApp } from './app-engine.ts';
import { openDatabase } from '../storage/db.ts';
import { getSettings } from '../storage/repo/settings.ts';

function element(tag,text,parent){const e=document.createElement(tag);if(text)e.textContent=text;if(parent)parent.append(e);return e;}
async function discover(){
  const codes=new Set();const shared=savedGroup(localStorage);if(shared)codes.add(shared);
  const opened=await openDatabase();
  if(opened.ok){try{const result=await getSettings(opened.value);if(result.ok&&result.value?.syncEnabled&&isPairingCode(result.value.syncCode))codes.add(normalizeCode(result.value.syncCode));}finally{opened.value.close();}}
  return [...codes];
}
function adapterFor(app){
  if(app==='conj'){
    const api=window.ConjRecordTransfer;
    return {
      async read(){const l=api.read(localStorage);return [{id:l.baselineId,type:'baseline',value:l.baseline},...l.backups.map(b=>({id:b.id,type:'baseline',value:b.stats})),...l.events.map(e=>({id:e.id,type:'answer',value:e}))];},
      async merge(records,active=()=>true){
        const run=()=>{
          let l=api.read(localStorage);
          for(const r of records.filter(r=>r.type==='baseline').sort((a,b)=>a.id.localeCompare(b.id)))l=api.merge(l,{version:1,baselineId:r.id,baseline:r.value,events:[],backups:[]});
          const events=records.filter(r=>r.type==='answer').map(r=>{if(r.value?.id!==r.id)throw Error('解答IDが一致しません。');return r.value;});
          if(records.some(r=>!['baseline','answer'].includes(r.type)))throw Error('活用表以外の記録です。');
          return api.commitImport(localStorage,{incoming:{...l,events,backups:[]}},active);
        };
        // commitImport re-reads the canonical ledger under the same writer lock.
        await run();window.dispatchEvent(new Event('koten:remote-records'));
      },
    };
  }
  const api=window.VintageKanaRecordTransfer;
  return {
    async read(){const v=JSON.parse(api.exportRecord(localStorage));return [...v.learningEvents.map(e=>({id:e.id,type:'learning',value:e})),...v.decipherHistory.map(e=>({id:e.id,type:'decipher',value:e}))];},
    async merge(records,active=()=>true){
      if(!records.length)return;
      if(records.some(r=>!['learning','decipher'].includes(r.type)||r.id!==r.value?.id))throw Error('変体仮名以外の記録です。');
      const incoming=JSON.stringify({app:'vintage-kana-record',exportVersion:1,learningEvents:records.filter(r=>r.type==='learning').map(r=>r.value),decipherHistory:records.filter(r=>r.type==='decipher').map(r=>r.value),decipherLevel:1});
      const run=()=>{
        if(!active())return;
        const plan=api.previewImport(localStorage,incoming);api.commitImport(localStorage,plan);
        // Level is a projection: reassess the chronologically latest answer's
        // recorded level against the merged history. Old level-only backups
        // retain their existing max-level import policy.
        const history=plan.after.decipherHistory,last=history.at(-1);
        if(last?.level&&window.VintageKanaDecipher)localStorage.setItem(api.KEYS.level,String(window.VintageKanaDecipher.nextLevel(history,last.level)));
      };
      if(navigator.locks)await navigator.locks.request('koten:vintage-kana-record',run);else run();
      window.dispatchEvent(new Event('koten:remote-records'));
    },
  };
}
export function mount(app,target=document.querySelector('[data-koten-sync]')){
  if(!target)return;
  const style=element('style');style.textContent=`
.koten-sync-dialog{--sync-bg:var(--bg,var(--paper,#fff));--sync-card:var(--card,var(--paper,#fff));--sync-soft:var(--accent-soft,var(--paper2,#f4f1ec));--sync-accent:var(--accent-strong,var(--accent,var(--ink,#222)));--sync-line:var(--line-strong,var(--line,#d6cfc5));box-sizing:border-box;width:min(36rem,calc(100% - 24px));max-height:92dvh;overflow:auto;overscroll-behavior:contain;border:1px solid var(--sync-line);border-radius:20px;padding:24px;background:var(--sync-bg);color:var(--ink,#222);font-family:inherit;font-size:16px;line-height:1.7}
.koten-sync-dialog *{box-sizing:border-box}
.koten-sync-dialog button,.koten-sync-dialog input{font:inherit;min-height:44px;max-width:100%;margin:0}
.koten-sync-dialog button{width:auto;padding:10px 14px;border:1px solid var(--sync-line);border-radius:9px;background:var(--sync-card);color:inherit;box-shadow:none;cursor:pointer;line-height:1.5}
.koten-sync-dialog button:disabled{opacity:.5;cursor:default}
.koten-sync-dialog input{display:block;width:100%;padding:10px 12px;border:1px solid var(--sync-line);border-radius:9px;background:var(--sync-card);color:inherit}
.koten-sync-dialog button:focus-visible,.koten-sync-dialog input:focus-visible,.koten-sync-dialog summary:focus-visible{outline:2px solid var(--sync-accent);outline-offset:3px}
.koten-sync-dialog canvas,.koten-sync-dialog video{display:block;max-width:100%;height:auto;margin:auto}
.koten-sync-dialog [hidden]{display:none!important}.koten-sync-dialog code{overflow-wrap:anywhere}.koten-sync-dialog::backdrop{background:#0006}
.koten-sync-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:16px;border-bottom:1px solid var(--sync-line)}.koten-sync-heading h2{font-size:1.35em;margin:0;white-space:nowrap}.koten-sync-heading button{flex:none;font-size:.85em}
.koten-sync-status{display:table;max-width:100%;margin:16px 0 8px;padding:7px 14px;border-radius:999px;background:var(--sync-soft);font-size:.9em;font-weight:700;overflow-wrap:anywhere}.koten-sync-status::before{content:'●';margin-right:8px}
.koten-sync-intro{margin:0 0 20px;color:var(--muted,#666);font-size:.85em}
.koten-sync-panel{border-top:1px solid var(--sync-line);padding:16px 0}.koten-sync-panel h3{font-size:1.1em;margin:0}.koten-sync-panel p{margin:12px 0 16px}
.koten-sync-card{margin:16px 0;padding:22px;border:1px solid var(--sync-line);border-radius:20px;background:var(--sync-card)}.koten-sync-receive{background:var(--sync-soft)}
.koten-sync-step{display:flex;align-items:center;gap:12px;font-weight:700;line-height:1.5}.koten-sync-number{display:inline-grid;place-items:center;flex:none;width:36px;height:36px;border-radius:50%;background:var(--sync-accent);color:var(--on-accent,#fff);font-size:1.15em;font-weight:700}
.koten-sync-dialog .koten-sync-primary{display:block;width:100%;background:var(--sync-accent);border-color:var(--sync-accent);color:var(--on-accent,#fff);font-weight:700}
.koten-sync-scan-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:16px 0}.koten-sync-scan-actions>button,.koten-sync-scan-actions>label{width:100%;text-align:center;justify-content:center}
.koten-sync-join label{display:block;font-weight:700;margin:14px 0 10px}.koten-sync-join input{margin-top:8px}.koten-sync-join>button{display:block;width:100%}
.koten-sync-dialog summary{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:8px}.koten-sync-dialog summary::before{content:'＋';font-size:1rem}.koten-sync-dialog details[open]>summary::before{content:'−'}
.koten-sync-dialog .koten-sync-step{gap:12px;list-style:none}.koten-sync-dialog .koten-sync-receive>.koten-sync-step::before{content:none}.koten-sync-step::-webkit-details-marker{display:none}
.koten-sync-dialog .koten-sync-note{font-size:.75em;color:var(--muted,#666);margin:18px 4px 10px}.koten-sync-current{font-size:.85em;color:var(--muted,#666)}
.koten-sync-file{display:inline-flex;align-items:center;min-height:44px;padding:10px 8px;border:1px solid var(--sync-line);border-radius:9px;background:var(--sync-card);cursor:pointer;line-height:1.5}.koten-sync-file:focus-within{outline:2px solid var(--sync-accent);outline-offset:3px}.koten-sync-file input{position:absolute;width:1px;height:1px;opacity:0;min-height:0;padding:0}
@media(max-width:420px){.koten-sync-dialog{padding:16px;font-size:14px}.koten-sync-card{padding:18px 16px}.koten-sync-heading{gap:8px}.koten-sync-heading button{padding:9px 10px}.koten-sync-number{width:32px;height:32px}}
`;document.head.append(style);
  const open=element('button','端末間同期',target);open.type='button';open.style.cssText='min-height:44px;padding:6px 12px;border:1px solid var(--line,#ccc);border-radius:12px;background:var(--paper,#fff);color:inherit;font:inherit;cursor:pointer';
  const dialog=element('dialog',null,document.body);dialog.className='koten-sync-dialog';
  const heading=element('div',null,dialog);heading.className='koten-sync-heading';
  const title=element('h2','端末間同期',heading);title.id='koten-sync-title';dialog.setAttribute('aria-labelledby',title.id);
  const close=element('button','設定へ戻る',heading);
  const status=element('p','端末間同期はオフです',dialog);status.className='koten-sync-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  element('p','複数の端末で記録を共有できるようにします。',dialog).className='koten-sync-intro';
  const current=element('p','',dialog);current.className='koten-sync-current';
  const choices=element('section',null,dialog);choices.className='koten-sync-panel';choices.hidden=true;
  element('h3','このブラウザの同期グループ',choices);
  const choiceButtons=element('div',null,choices);
  const active=element('section',null,dialog);active.className='koten-sync-panel';
  const showQr=element('button','別の端末にも共有する',active);
  const qrPanel=element('div',null,active);qrPanel.hidden=true;
  element('h3','この端末の QR',qrPanel);element('p','共有する端末で読み取ってください。',qrPanel);
  const currentQr=element('canvas',null,qrPanel);currentQr.setAttribute('aria-label','同期用の QR');
  const shareAlternative=element('details',null,qrPanel);element('summary','リンク・共有コードを使う',shareAlternative);
  const inviteLabel=element('label','招待リンク',shareAlternative), inviteInput=element('input',null,inviteLabel);inviteInput.readOnly=true;
  const copy=element('button','リンクをコピー',shareAlternative);
  const secret=element('code','',element('p','共有コード ',shareAlternative));
  const createPanel=element('section',null,dialog);createPanel.className='koten-sync-panel koten-sync-card';
  const createHeading=element('div',null,createPanel);createHeading.className='koten-sync-step';
  element('span','1',createHeading).className='koten-sync-number';element('h3','この端末で QR を作る',createHeading);element('p','共有する端末で読み取って設定します。',createPanel);
  const create=element('button','新しい同期グループを作る',createPanel);create.className='koten-sync-primary';
  create.disabled=true;
  const receive=element('details',null,dialog);receive.className='koten-sync-panel koten-sync-card koten-sync-receive';receive.open=true;
  const receiveHeading=element('summary',null,receive);receiveHeading.className='koten-sync-step';
  element('span','2',receiveHeading).className='koten-sync-number';element('span','別の端末のQRを読み取る',receiveHeading);
  const scanActions=element('div',null,receive);scanActions.className='koten-sync-scan-actions';
  const camera=element('button','カメラを開く',scanActions), imageLabel=element('label','画像を選ぶ',scanActions), file=element('input',null,imageLabel);imageLabel.className='koten-sync-file';file.type='file';file.accept='image/*';
  const video=element('video',null,receive);video.muted=true;video.playsInline=true;video.hidden=true;
  const alternative=element('div',null,receive);alternative.className='koten-sync-join';
  const label=element('label','招待リンク・共有コード',alternative), input=element('input',null,label);input.className='sync-join-input';input.autocomplete='off';input.spellcheck=false;
  const check=element('button','同期先を確認',alternative);
  const candidate=element('section',null,receive);candidate.hidden=true;
  element('h3','参加の確認',candidate);
  const candidateText=element('p','',candidate), confirm=element('button','確認して参加する',candidate), cancel=element('button','取り消す',candidate);
  const syncNow=element('button','今すぐ同期する',dialog);
  const stop=element('details',null,dialog);stop.className='koten-sync-panel';element('summary','同期を停止',stop);
  element('p','同期を停止します。この端末の記録は残ります。',stop);
  const leave=element('button','停止する',stop);
  const replace=element('details',null,dialog);replace.hidden=true;
  element('summary','別の同期グループを新しく作る',replace);
  element('p','現在とは別の共有先を作り、この端末の記録を追加します。以前のグループの記録は残ります。',replace);
  const createAnother=element('button','確認して新規グループを作成',replace);
  const note=element('p',app==='conj'?'「百人一首練習帳」「変体仮名ノート」で同期を設定済みの場合も、同じQR・招待リンクを使えます。':'「百人一首練習帳」「古典文法活用ノート」で同期を設定済みの場合も、同じQR・招待リンクを使えます。',dialog);note.className='koten-sync-note';
  const help=element('details',null,dialog);element('summary','同期について',help);
  element('p','QRや招待リンクは、共有する相手だけに渡してください。',help);
  element('p','Safariとホーム画面のアプリで記録が別々に見える場合は、同じQR・招待リンクで設定してください。',help);
  const selectionKey=`koten:sync-app:${app}:v1`;
  let code=localStorage.getItem(selectionKey), knownCodes=[], proposed=null, generation=0, request=0, stream=null, frame=0, busy=false, remote=null, nextRetry=0, failures=0;
  const adapter=adapterFor(app);
  const say=message=>{status.textContent=message;};
  function stopCamera(){request++;cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;camera.textContent='カメラを開く';}
  function update(){
    active.hidden=stop.hidden=syncNow.hidden=!code;current.hidden=!code;current.textContent=code?'共有コードの末尾: '+code.slice(-4):'';
    createPanel.hidden=create.hidden=!!code||knownCodes.length>0;replace.hidden=!code&&!knownCodes.length;receive.open=!code;
    qrPanel.hidden=true;showQr.textContent='別の端末にも共有する';secret.textContent=inviteInput.value='';stop.open=false;
    choiceButtons.replaceChildren();
    for(const known of knownCodes.filter(c=>c!==code)){const b=element('button','見つかった同期グループを使う（末尾 '+known.slice(-4)+'）',choiceButtons);b.onclick=()=>{void propose(known);};}
    choices.hidden=!choiceButtons.children.length;
  }
  async function run(){
    if(!code||busy||Date.now()<nextRetry)return;
    if(!navigator.onLine){say('オフラインです。記録は端末に保存し、再接続後に同期します。');return;}
    const epoch=generation,selected=code;busy=true;say('記録を同期しています…');
    try{
      if(!remote){await joinGroup(selected);if(epoch!==generation)return;remote=await appRemote(selected,app);}
      await syncApp(app,selected,adapter,remote,()=>epoch===generation&&code===selected);
      if(epoch!==generation)return;
      failures=0;nextRetry=0;
      const backups=app==='conj'?window.ConjRecordTransfer.read(localStorage).backups.length:0;
      say(backups?'端末間同期が有効です。旧累計のバックアップがあります。':'端末間同期が有効です');
    }catch(error){if(epoch===generation){
      const reason=error?.code==='permission-denied'?'permission':String(error?.code||'').startsWith('auth/')?'authentication':error?.name==='OperationError'?'decryption':'other';
      window.dispatchEvent(new CustomEvent('koten:sync-failed',{detail:{reason}}));
      failures++;nextRetry=Date.now()+Math.min(300000,15000*2**Math.min(failures,4));say('同期できません。接続を確認してください。記録は端末に残っています。');
    }}
    finally{busy=false;}
  }
  async function accept(next,isNew,allowReplace=false){
    const id=++request,expected=savedGroup(localStorage);
    if(isNew&&expected&&!allowReplace){void propose(expected);return;}
    confirm.disabled=create.disabled=createAnother.disabled=true;
    try{
      if(isNew)await createGroup(next);else await joinGroup(next);
      if(id!==request)return;
      saveGroup(localStorage,next,expected);localStorage.setItem(selectionKey,next);
      generation++;code=next;knownCodes=[...new Set([...knownCodes,next])];remote=null;nextRetry=0;candidate.hidden=true;proposed=null;update();void run();
    }catch{say('参加設定を保存できませんでした。現在の接続先を確認してください。');}
    finally{confirm.disabled=create.disabled=createAnother.disabled=false;}
  }
  async function propose(value){
    stopCamera();const id=++request;
    const next=readPortableInvite(value,location.href)?.code??(isPairingCode(value)?normalizeCode(value):null);
    if(!next){say('このQR・共有コードは使えません。');return;}
    say('共有グループを確認しています…');
    try{
      if(!await verifyGroup(next))throw Error();
      if(id!==request)return;
      proposed=next;receive.open=true;candidate.hidden=false;
      candidateText.textContent=`共有コードの末尾: ${next.slice(-4)}。${code&&code!==next?'現在と異なる同期先です。この端末の記録を追加します。以前のグループは自動統合しません。':'この端末の記録を同期グループと共有します。'}`;
      say('同期先を確認できました。');
    }catch{if(id===request)say('共有先を確認できません。コードと通信を確認してください。');}
  }
  async function readImage(source){
    const {default:jsQR}=await import('jsqr');
    const canvas=document.createElement('canvas');const scale=Math.min(1,1200/(source.videoWidth||source.width));
    canvas.width=Math.round((source.videoWidth||source.width)*scale);canvas.height=Math.round((source.videoHeight||source.height)*scale);
    if(!canvas.width||!canvas.height)return null;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,canvas.width,canvas.height);
    return jsQR(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height)?.data??null;
  }
  camera.onclick=async()=>{
    if(stream){stopCamera();return;}const id=++request;
    try{
      const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
      if(id!==request){s.getTracks().forEach(t=>t.stop());return;}stream=s;video.srcObject=s;video.hidden=false;camera.textContent='カメラを閉じる';await video.play();
      const scan=async()=>{if(id!==request)return;try{const result=video.readyState>=2?await readImage(video):null;if(id!==request)return;if(result){void propose(result);return;}frame=requestAnimationFrame(()=>{void scan();});}catch{stopCamera();say('QRを読み取れませんでした。画像か共有コードを使ってください。');}};void scan();
    }catch{stopCamera();say('カメラを開けません。画像か共有コードを使ってください。');}
  };
  file.onchange=async()=>{
    const f=file.files?.[0];file.value='';if(!f)return;stopCamera();const id=++request;
    try{const bitmap=await createImageBitmap(f);let value;try{value=await readImage(bitmap);}finally{bitmap.close();}if(id!==request)return;if(value)void propose(value);else say('画像に共有QRが見つかりません。');}catch{say('画像を読み込めませんでした。');}
  };
  confirm.onclick=()=>{if(proposed)void accept(proposed,false);};
  cancel.onclick=()=>{stopCamera();proposed=null;candidate.hidden=true;say('参加を取り消しました。');};
  check.onclick=()=>{void propose(input.value);};
  create.onclick=()=>{void accept(makePairingCode(),true);};
  createAnother.onclick=()=>{void accept(makePairingCode(),true,true);};
  showQr.onclick=async()=>{if(!code)return;if(!qrPanel.hidden){qrPanel.hidden=true;showQr.textContent='別の端末にも共有する';return;}const {default:QRCode}=await import('qrcode');await QRCode.toCanvas(currentQr,makePortableInvite(code,location.href),{width:256,margin:4});inviteInput.value=makePortableInvite(code,location.href);secret.textContent=code;qrPanel.hidden=false;showQr.textContent='共有QRを閉じる';};
  copy.onclick=()=>{if(!navigator.clipboard?.writeText){inviteInput.select();say('リンクを選択してコピーしてください。');return;}void navigator.clipboard.writeText(inviteInput.value).then(()=>say('招待リンクをコピーしました。'),()=>say('コピーできませんでした。リンクを選択してコピーしてください。'));};
  leave.onclick=()=>{generation++;request++;code=null;remote=null;localStorage.removeItem(selectionKey);update();say('同期を停止しました。この端末の記録は残ります。');};
  syncNow.onclick=()=>{nextRetry=0;void run();};close.onclick=()=>dialog.close();
  let settingsDialog=null;
  dialog.addEventListener('close',()=>{stopCamera();candidate.hidden=true;proposed=null;qrPanel.hidden=true;showQr.textContent='別の端末にも共有する';if(settingsDialog){settingsDialog.showModal();settingsDialog=null;}});
  open.onclick=()=>{const parent=open.closest('dialog');if(parent?.open){settingsDialog=parent;parent.close();}dialog.showModal();};
  window.addEventListener('online',()=>{nextRetry=0;void run();});
  window.addEventListener('koten:record-saved',()=>{nextRetry=0;void run();});
  window.addEventListener('storage',e=>{
    if(e.key===selectionKey&&localStorage.getItem(selectionKey)!==code){generation++;request++;code=null;remote=null;update();say('別の画面でこのアプリの共有先が変更されました。誤送信を避けるため同期を停止しました。画面を開き直して確認してください。');}
    else if(e.key===GROUP_KEY&&savedGroup(localStorage)!==code)say('別の画面で異なるグループが選ばれました。自動変更せず、現在のグループを維持します。');
  });
  const timer=setInterval(()=>{if(!document.hidden)void run();},60000);
  window.addEventListener('pagehide',()=>{stopCamera();clearInterval(timer);},{once:true});
  window.KotenSyncActive=()=>!!localStorage.getItem(selectionKey);
  update();
  void discover().then(codes=>{
    knownCodes=codes;create.disabled=false;update();
    if(codes.length>1)say('異なる共有グループが見つかりました。接続先を確認して選んでください。');
  }).catch(()=>{create.disabled=true;say('保存済みの共有設定を読めません。設定を上書きせず停止しました。');});
  const invite=new URL(location.href);if(invite.searchParams.has('join')){dialog.showModal();void propose(location.href);invite.searchParams.delete('join');invite.searchParams.delete('r');history.replaceState(null,'',invite.href);}
  if(code&&isPairingCode(code))void run();
}
const target=document.querySelector('[data-koten-sync]');
if(target){
  const app=target.dataset.kotenSync;
  if(app==='conj'&&!window.ConjRecordReady)window.addEventListener('koten:conj-ready',()=>mount(app,target),{once:true});
  else mount(app,target);
}
