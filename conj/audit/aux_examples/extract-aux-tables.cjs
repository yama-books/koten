// conj/index.html に組み込まれた助動詞28項目の活用表（forms・forms2）と意味を JSON で標準出力に出す（build.py が使う）。
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
const start=html.indexOf('const items=[')+'const items=['.length-1;
let depth=0,i=start,quote='';
for(;i<html.length;i++){
  const c=html[i];
  if(quote){ if(c==='\\') i++; else if(c===quote) quote=''; continue; }
  if(c==='"'||c==="'"||c==='`'){ quote=c; continue; }
  if(c==='[') depth++;
  else if(c===']' && --depth===0){ i++; break; }
}
const items=new Function('const F=a=>a; return '+html.slice(start,i)+';')();
const aux=items.filter(x=>x.pos==='aux').map(x=>({id:x.id,lemma:x.lemma,meaning:x.meaning,forms:x.forms,forms2:x.forms2||null}));
process.stdout.write(JSON.stringify(aux));
