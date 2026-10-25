/* Settings entry shared by the two views. Record import/export handlers are
 * moved from detail.html; the transfer API and stored records stay unchanged. */
(()=>{
const trigger=document.querySelector('[data-vintage-settings]');if(!trigger)return;
const style=document.createElement('style');style.textContent=`
.vintage-header-tools{display:flex;align-items:center;gap:8px;flex:none}
.vintage-settings-trigger{display:grid;place-items:center;flex:none;width:44px;height:44px;min-width:44px;min-height:44px;padding:10px;border:1px solid var(--line,#ddd);border-radius:50%;background:var(--paper,#fff);color:var(--ink,#222);cursor:pointer}
.vintage-settings-icon{width:23px;height:23px}.vintage-settings-trigger:focus-visible{outline:2px solid var(--accent,#356b9e);outline-offset:2px}
.pageHeader{display:grid;grid-template-columns:minmax(0,1fr) 44px;align-items:center}.pageHeader .headerLinks{grid-column:1/-1;justify-content:space-between;width:100%}
.vintage-settings-dialog{box-sizing:border-box;width:min(28rem,calc(100% - 24px));max-height:85dvh;overflow:auto;padding:20px;border:1px solid var(--line,#ddd);border-radius:18px;background:var(--paper,#fff);color:var(--ink,#222);font:inherit;line-height:1.7}
.vintage-settings-dialog::backdrop{background:#0006}.vintage-settings-dialog button{width:auto;min-height:44px;padding:8px 12px;border:1px solid var(--line,#ccc);border-radius:10px;background:var(--paper,#fff);color:inherit;font:inherit;box-shadow:none;cursor:pointer}.vintage-settings-dialog button:focus-visible{outline:2px solid var(--accent,#356b9e);outline-offset:2px}
.vintage-settings-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.vintage-settings-heading h2{margin:0;font-size:1.2rem;white-space:nowrap}.vintage-settings-heading button{flex:none;border:0;background:transparent}.vintage-settings-items{display:grid;gap:10px;margin-top:20px}.vintage-settings-items [data-koten-sync] button{width:100%;text-align:left}.vintage-settings-items>button{text-align:left}.vintage-settings-dialog .note{font-size:.85rem}
`;document.head.append(style);
const dialog=document.createElement('dialog');dialog.className='vintage-settings-dialog';dialog.setAttribute('aria-labelledby','vintageSettingsTitle');
dialog.innerHTML=`<div class="vintage-settings-heading"><h2 id="vintageSettingsTitle">設定</h2><button type="button" data-settings-close>閉じる</button></div>
<div class="vintage-settings-items"><div data-koten-sync="vintage-kana"></div>
<button id="vintageExportRecord" type="button">記録を書き出す</button>
<button id="vintageImportRecord" type="button">記録を読み込む</button>
<input id="vintageImportRecordFile" type="file" accept=".json,application/json" hidden></div>
<p id="vintageRecordTransferStatus" class="note" role="status" aria-live="polite"></p>`;
document.body.append(dialog);trigger.onclick=()=>dialog.showModal();dialog.querySelector('[data-settings-close]').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))trigger.focus();});
document.getElementById("vintageExportRecord")?.addEventListener("click",()=>{
 try {
  const record=VintageKanaRecordTransfer.exportRecord(localStorage);
  const blob=new Blob([record],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="vintage-kana-record-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  document.getElementById("vintageRecordTransferStatus").textContent="記録を書き出しました。";
 } catch(error) {
  document.getElementById("vintageRecordTransferStatus").textContent="書き出しに失敗しました。"+error.message;
 }
});
document.getElementById("vintageImportRecord")?.addEventListener("click",()=>{
 document.getElementById("vintageImportRecordFile").click();
});
document.getElementById("vintageImportRecordFile")?.addEventListener("change",async event=>{
 const input=event.currentTarget, file=input.files?.[0];input.value="";
 if(!file)return;
 const status=document.getElementById("vintageRecordTransferStatus");
 try {
  status.textContent="記録を確認しています…";
  if(file.size>5*1024*1024)throw new Error("ファイルが大きすぎます。");
  const preview=VintageKanaRecordTransfer.previewImport(localStorage,await file.text());
  const question="既存の記録は残し、読み・字母 "+preview.addedLearning+"件、解読 "+preview.addedDecipher+"件を追加します。よろしいですか？";
  if(!window.confirm(question)){status.textContent="読み込みを取り消しました。";return;}
  const commit=()=>VintageKanaRecordTransfer.commitImport(localStorage,preview);
  if(navigator.locks)await navigator.locks.request('koten:vintage-kana-record',commit);else commit();
  window.dispatchEvent(new Event('koten:record-saved'));
  window.dispatchEvent(new Event("koten:remote-records"));
  status.textContent="記録を統合しました。";
 }catch(error){status.textContent="読み込みに失敗しました。"+error.message;}
});
})();
