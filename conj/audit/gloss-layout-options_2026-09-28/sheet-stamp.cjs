const {chromium}=require('D:/dev/koten/node_modules/playwright');
const path=require('path');const fs=require('fs');const S=path.join(__dirname,'shots');
const img=n=>'data:image/png;base64,'+fs.readFileSync(path.join(S,n+'.png')).toString('base64');
const cols=[['v4-long-a','前回：最長の見出し語（下地で前面化）','はなまるの下半分が隠れる'],['v6-long-a','今回：最長の見出し語','はなまる最前面・学習情報との交差 0'],
 ['v4-aux-a','前回：助動詞「る」','下地で はなまるが欠ける'],['v6-aux-a','今回：助動詞「る」','はなまる最前面。文字は朱の下から透ける'],
 ['v6-aux-gotoshi','今回：最も幅の広い行（ごとし）','交差は残るが文字は読める']];
(async()=>{const b=await chromium.launch();
 const crop=async(n)=>{const p=await b.newPage({viewport:{width:560,height:250}});await p.setContent(`<body style="margin:0;overflow:hidden"><img src="${img(n)}" style="width:750px;margin:-215px 0 0 -170px;display:block">`);await p.waitForTimeout(100);const buf=await p.screenshot();await p.close();return 'data:image/png;base64,'+buf.toString('base64');};
 const crops={};for(const [f] of cols) crops[f]=await crop(f);
 const html=`<html><head><meta charset=utf-8><style>body{margin:0;padding:28px 30px;background:#efebe6;font-family:"Yu Gothic","Meiryo",sans-serif;color:#3b352c}
 h1{font-size:22px;margin:0 0 6px}.lead{font-size:13px;color:#6b6258;margin:0 0 18px}.row{display:flex;gap:18px;flex-wrap:wrap}.c{width:560px}.c img{width:560px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.12);display:block}
 .t{font-weight:700;font-size:15px;margin:0 0 3px}.d{font-size:12px;color:#6b6258;margin:0 0 8px;min-height:2.6em}.new .t{color:#7d6747}</style></head><body>
 <h1>はなまるを最前面にした共存案（スマホ・見出しまわりを拡大）</h1><p class=lead>① はなまるは常に最前面・朱肉のように重ね（multiply）＝下の文字が透ける　② はなまるの実際の線形で、ルビ・漢字補助・活用型／接続・品詞タグとの交差が最小になる位置を自動選択（見出し語には0.3〜0.9字かかる範囲）　③ はなまる表示中は活用型／接続の灰色文字を本文色に</p>
 <div class=row>${cols.map(([f,t,d])=>`<div class="c ${t.startsWith('今回')?'new':''}"><p class=t>${t}</p><p class=d>${d}</p><img src="${crops[f]}"></div>`).join('')}</div></body></html>`;
 const p=await b.newPage({viewport:{width:1780,height:600},deviceScaleFactor:1.3});await p.setContent(html);await p.waitForTimeout(300);
 await p.screenshot({path:path.join(__dirname,'final4-stamp.png'),fullPage:true});await b.close();})();
