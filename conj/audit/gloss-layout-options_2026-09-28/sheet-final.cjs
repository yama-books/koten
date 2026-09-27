const {chromium}=require('D:/dev/koten/node_modules/playwright');
const path=require('path');const fs=require('fs');
const S=path.join(__dirname,'shots');
const img=n=>'data:image/png;base64,'+fs.readFileSync(path.join(S,n+'.png')).toString('base64');
const sheets={
 'final1-phone':{w:340,title:'A案 確定レイアウト（スマホ 375×812）',cols:[
   ['v4-adjv-q','出題中','語釈帯とルビの場所だけ確保'],['v4-adjv-a','答え合わせ後','表・ボタンは出題中と同じ位置'],
   ['v4-long-a','最長の見出し語','はなまるは右端から約1字分かかる'],['v4-aux-a','助動詞','活用型／接続・ルビはスタンプより前面']]},
 'final2-ipad':{w:520,title:'A案 確定レイアウト（iPad 縦 820×1180）：語釈は表の右の余白へ（用例｜表｜語釈）',cols:[
   ['v4-pad-adjv-a','形容動詞',''],['v4-pad-aux-a','助動詞','']]},
 'final3-pc':{w:1100,title:'A案 確定レイアウト（PC 1440×900）：はなまるは見出し語に寄せて固定',cols:[
   ['v4-pc-aux-a','助動詞','']]},
};
(async()=>{
 const b=await chromium.launch();
 for(const [name,s] of Object.entries(sheets)){
  const html=`<html><head><meta charset=utf-8><style>
   body{margin:0;padding:28px 30px 30px;background:#efebe6;font-family:"Yu Gothic","Meiryo",sans-serif;color:#3b352c}
   h1{font-size:22px;margin:0 0 18px}.row{display:flex;gap:22px;align-items:flex-start}.c{width:${s.w}px}
   .c img{width:${s.w}px;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.12);display:block}
   .t{font-weight:700;font-size:16px;margin:0 0 3px}.d{font-size:12.5px;color:#6b6258;margin:0 0 10px;min-height:1.4em}
  </style></head><body><h1>${s.title}</h1><div class=row>${s.cols.map(([f,t,d])=>`<div class=c><p class=t>${t}</p><p class=d>${d}</p><img src="${img(f)}"></div>`).join('')}</div></body></html>`;
  const p=await b.newPage({viewport:{width:s.w>1000?1200:1500,height:900},deviceScaleFactor:1.5});
  await p.setContent(html);await p.waitForTimeout(300);
  await p.screenshot({path:path.join(__dirname,name+'.png'),fullPage:true});await p.close();
 }
 await b.close();
})();
