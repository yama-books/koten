const {chromium}=require('D:/dev/koten/node_modules/playwright');
const path=require('path');const fs=require('fs');
const S=path.join(__dirname,'shots');
const img=n=>'data:image/png;base64,'+fs.readFileSync(path.join(S,n+'.png')).toString('base64');
const sheets={
 'sheet1-adjv':{title:'形容動詞「しづかなり」（保元物語）・答え合わせ後',cols:[
   ['now-adjv-a','現状','語釈なし'],['A-adjv-a','A 分散・近接型（推奨）','読み＝見出しにルビ／意味＝表の下の語釈帯'],
   ['B-adjv-a','B 見出し集約型','読み・意味を見出しの下にまとめる'],['C-adjv-a','C まとめカード型','読み・意味を表の下のカードに集約']]},
 'sheet2-aux':{title:'助動詞「る」（百人一首八十四番）',cols:[
   ['now-aux-q','現状（出題中）','意味・接続は下の小さな枠。出題中から表示'],['A-aux-a','A 分散・近接型（推奨）','接続→活用型の行／意味→語釈帯で「自発」に印'],
   ['B-aux-a','B 見出し集約型','接続・意味とも見出しの下'],['C-aux-a','C まとめカード型','意味・接続を表の下のカードに集約']]},
 'sheet3-A':{title:'推奨案 A の詳細：出題中→答え合わせ後で表・ボタンが動かない／長い見出し語',cols:[
   ['A-adjv-q','A 出題中','ルビと語釈帯の場所だけ確保'],['A-adjv-a','A 答え合わせ後','同じ位置に中身が出る'],
   ['A-tari-a','A タリ活用','複数字の差分ルビ＋この用例では'],['A-long2-a','A 最長級の見出し語','はなまるとルビの重なりを確認']]},
};
(async()=>{
 const b=await chromium.launch();
 for(const [name,s] of Object.entries(sheets)){
  const html=`<html><head><meta charset=utf-8><style>
   body{margin:0;padding:28px 30px 30px;background:#efebe6;font-family:"Yu Gothic","Meiryo",sans-serif;color:#3b352c}
   h1{font-size:22px;margin:0 0 18px}
   .row{display:flex;gap:22px}.c{width:340px}
   .c img{width:340px;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.12);display:block}
   .t{font-weight:700;font-size:16px;margin:0 0 3px}.d{font-size:12.5px;color:#6b6258;margin:0 0 10px;min-height:1.4em}
   .rec .t{color:#7d6747}.rec img{outline:3px solid #a68c6f;outline-offset:3px}
  </style></head><body><h1>${s.title}</h1><div class=row>${s.cols.map(([f,t,d])=>`<div class="c ${t.includes('推奨')?'rec':''}"><p class=t>${t}</p><p class=d>${d}</p><img src="${img(f)}"></div>`).join('')}</div></body></html>`;
  const p=await b.newPage({viewport:{width:1500,height:900},deviceScaleFactor:1.5});
  await p.setContent(html);await p.waitForTimeout(300);
  await p.screenshot({path:path.join(__dirname,name+'.png'),fullPage:true});
  await p.close();
 }
 await b.close();
})();
