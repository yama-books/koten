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
  const style=element('style');style.textContent='.koten-sync-dialog{box-sizing:border-box;width:min(30rem,calc(100% - 24px));max-height:90dvh;overflow:auto;border:1px solid #aaa;border-radius:12px;padding:20px;background:var(--paper,#fff);color:var(--ink,#222);font:inherit;line-height:1.7}.koten-sync-dialog button,.koten-sync-dialog input{font:inherit;box-sizing:border-box;min-height:44px;max-width:100%;margin:5px 0}.koten-sync-dialog button{padding:6px 12px;margin-right:8px}.koten-sync-dialog input{width:100%}.koten-sync-dialog canvas,.koten-sync-dialog video{display:block;max-width:100%;height:auto;margin:auto}.koten-sync-dialog [hidden]{display:none!important}.koten-sync-dialog code{overflow-wrap:anywhere}.koten-sync-dialog::backdrop{background:#0006}';document.head.append(style);
  const open=element('button','端末間同期',target);open.type='button';open.style.cssText='min-height:44px;padding:6px 12px;border:1px solid var(--line,#ccc);border-radius:12px;background:var(--paper,#fff);color:inherit;font:inherit;cursor:pointer';
  const dialog=element('dialog',null,document.body);dialog.className='koten-sync-dialog';
  element('h2','端末間同期',dialog);
  element('p','3アプリで同じQR・共有コードを使えます。学習記録とポイントはアプリごとに保存します。',dialog);
  element('p','Safariとホーム画面のアプリは別の保存場所になることがあります。すでに共有中なら、新しく作らずQRか共有コードで参加してください。',dialog);
  const status=element('p','同期はオフです',dialog);status.setAttribute('role','status');
  const current=element('p','',dialog), choices=element('div',null,dialog);
  const currentQr=element('canvas',null,dialog);currentQr.hidden=true;currentQr.setAttribute('aria-label','共有グループのQR');
  const showQr=element('button','共有QR・コードを表示する',dialog);
  const secret=element('code','',dialog);secret.hidden=true;
  const leave=element('button','このアプリの同期を停止',dialog);
  const label=element('label','招待リンク・共有コード',dialog), input=element('input',null,label);input.autocomplete='off';input.spellcheck=false;
  const check=element('button','すでに共有しているグループに参加する',dialog);
  const camera=element('button','QRをカメラで読み取る',dialog), video=element('video',null,dialog);video.muted=true;video.playsInline=true;video.hidden=true;
  const imageLabel=element('label','QR画像を選ぶ',dialog), file=element('input',null,imageLabel);file.type='file';file.accept='image/*';
  const candidate=element('section',null,dialog);candidate.hidden=true;
  const candidateText=element('p','',candidate), confirm=element('button','確認して参加する',candidate), cancel=element('button','参加を取り消す',candidate);
  const create=element('button','新しい共有グループを作る',dialog);
  create.disabled=true;
  const replace=element('details',null,dialog);replace.hidden=true;
  element('summary','別の共有グループを新しく作る',replace);
  element('p','すでに使っているグループとは別の共有先を作ります。この端末の記録を新しい共有先にも追加します。以前のグループは削除・統合しません。',replace);
  const createAnother=element('button','確認して新規グループを作成',replace);
  const syncNow=element('button','今すぐ同期する',dialog), close=element('button','閉じる',dialog);
  const selectionKey=`koten:sync-app:${app}:v1`;
  let code=localStorage.getItem(selectionKey), proposed=null, generation=0, request=0, stream=null, frame=0, busy=false, remote=null, nextRetry=0, failures=0;
  const adapter=adapterFor(app);
  const say=message=>{status.textContent=message;};
  function stopCamera(){request++;cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;}
  function update(){showQr.hidden=leave.hidden=syncNow.hidden=!code;current.textContent=code?'現在の共有グループ：コード末尾 '+code.slice(-4):'このアプリはまだ共有していません。';}
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
      say(backups?'同期しました。別系統の旧累計はバックアップとして保持し、加算していません。':'同期しました。記録はこのアプリだけで共有しています。');
    }catch(error){if(epoch===generation){
      const reason=error?.code==='permission-denied'?'permission':String(error?.code||'').startsWith('auth/')?'authentication':error?.name==='OperationError'?'decryption':'other';
      window.dispatchEvent(new CustomEvent('koten:sync-failed',{detail:{reason}}));
      failures++;nextRetry=Date.now()+Math.min(300000,15000*2**Math.min(failures,4));say('同期できません。記録は端末に残っています。通信・Firebaseの設定を確認してください。');
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
      generation++;code=next;remote=null;nextRetry=0;candidate.hidden=true;proposed=null;update();void run();
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
      proposed=next;candidate.hidden=false;
      candidateText.textContent=`コード末尾 ${next.slice(-4)} のグループへ参加します。${code&&code!==next?'現在と異なるグループです。この端末の記録を新しい共有先にも追加します。既存のグループは自動統合しません。':'この端末の学習記録を共有先に追加します。'}`;
      say('参加ボタンを押すまで接続先は変わりません。');
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
      if(id!==request){s.getTracks().forEach(t=>t.stop());return;}stream=s;video.srcObject=s;video.hidden=false;await video.play();
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
  showQr.onclick=async()=>{if(!code)return;const {default:QRCode}=await import('qrcode');await QRCode.toCanvas(currentQr,makePortableInvite(code,location.href),{width:256,margin:4});currentQr.hidden=false;secret.textContent=code;secret.hidden=false;};
  leave.onclick=()=>{generation++;request++;code=null;remote=null;localStorage.removeItem(selectionKey);currentQr.hidden=secret.hidden=true;update();say('このアプリの同期を停止しました。端末の記録は残っています。');};
  syncNow.onclick=()=>{nextRetry=0;void run();};close.onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{stopCamera();candidate.hidden=true;proposed=null;currentQr.hidden=secret.hidden=true;});
  open.onclick=()=>{dialog.showModal();};
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
    create.hidden=!!code||codes.length>0;
    create.disabled=false;replace.hidden=!code&&codes.length===0;
    for(const known of codes){const b=element('button','見つかった共有グループを使う（末尾 '+known.slice(-4)+'）',choices);b.onclick=()=>{void propose(known);};}
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
