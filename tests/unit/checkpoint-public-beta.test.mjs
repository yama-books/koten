import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const checkpoint=resolve(root,'checkpoint');
const auditVectors=JSON.parse(readFileSync(
  resolve(root,'tests/fixtures/kanazukai_example_test_vectors_2026-09-20.json'),'utf8'
));

const scriptPaths=[
  'core1.js',
  'core2.js',
  'core3.js',
  'core4.js',
  'db-shadow.js',
  'detect1.js',
  'detect2.js',
  'detect3.js',
  'ui1.js',
  'ui2.js',
  'ui3.js',
  'events.js'
];

function readCheckpoint(path){
  return readFileSync(resolve(checkpoint,path),'utf8');
}

function createCheckpointDom(url='https://example.test/checkpoint/'){
  const html=readCheckpoint('index.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const dom=new JSDOM(html,{
    url,
    runScripts:'dangerously',
    pretendToBeVisual:true
  });

  Object.defineProperty(dom.window,'fetch',{
    configurable:true,
    value:async()=>({
      ok:false,
      status:404,
      json:async()=>({})
    })
  });

  const bundle=scriptPaths.map(path=>readCheckpoint(path)).join('\n;\n')+
    '\n;window.__kanaTest={rules:KANA_RULE_DEFS,lexicon:KANA_WHOLE_WORD_LEXICON,examplesForHit,detectKanaCandidates};';
  dom.window.eval(bundle);
  return dom;
}

async function settle(dom){
  await new Promise(resolve=>dom.window.setTimeout(resolve,0));
  await new Promise(resolve=>dom.window.setTimeout(resolve,0));
}

function firstChecklistItem(doc){
  const item=doc.querySelector('.item[data-check]');
  assert.ok(item,'予習チェックリストに項目がある');
  return item;
}

test('通常URLではshadowを公開UIから切り離す',async()=>{
  const dom=createCheckpointDom();
  await settle(dom);
  const {document}=dom.window;

  assert.equal(document.getElementById('shadowDebugPanel')?.hidden,true);
  assert.equal(document.documentElement.dataset.shadowData,'skipped');
  dom.window.close();
});

test('drawerは開閉時に背景スクロール用classを正しく切り替える',async()=>{
  const dom=createCheckpointDom();
  const {document}=dom.window;
  await settle(dom);

  document.getElementById('sample3')?.click();
  firstChecklistItem(document).click();

  assert.equal(document.getElementById('drawer')?.classList.contains('open'),true);
  assert.equal(document.body.classList.contains('drawer-open'),true);

  document.getElementById('closeDrawer')?.click();
  assert.equal(document.getElementById('drawer')?.classList.contains('open'),false);
  assert.equal(document.body.classList.contains('drawer-open'),false);
  dom.window.close();
});

test('「わかる」は履歴へ入り、個別に戻せる',async()=>{
  const dom=createCheckpointDom();
  const {document}=dom.window;
  await settle(dom);

  document.getElementById('sample3')?.click();
  const before=document.querySelectorAll('.item[data-check]').length;

  firstChecklistItem(document).click();
  document.getElementById('markPointKnown')?.click();

  const history=document.getElementById('knownHistory');
  assert.equal(history?.hidden,false);
  assert.equal(document.querySelectorAll('.known-item').length,1);
  assert.match(document.getElementById('knownHistoryStatus')?.textContent||'',/1件/);
  assert.match(document.getElementById('knownList')?.textContent||'',/【.+】/);
  assert.equal(document.querySelectorAll('.item[data-check]').length,before-1);

  const restore=document.querySelector('[data-known-index="0"]');
  assert.ok(restore,'個別の戻すボタンがある');
  restore.click();

  assert.equal(document.getElementById('knownHistory')?.hidden,true);
  assert.equal(document.querySelectorAll('.item[data-check]').length,before);
  dom.window.close();
});

test('「すべて戻す」で複数のわかる履歴を一括復帰できる',async()=>{
  const dom=createCheckpointDom();
  const {document}=dom.window;
  await settle(dom);

  document.getElementById('sample3')?.click();
  const before=document.querySelectorAll('.item[data-check]').length;

  firstChecklistItem(document).click();
  document.getElementById('markPointKnown')?.click();
  firstChecklistItem(document).click();
  document.getElementById('markPointKnown')?.click();

  assert.equal(document.querySelectorAll('.known-item').length,2);
  document.getElementById('restoreAllKnown')?.click();

  assert.equal(document.getElementById('knownHistory')?.hidden,true);
  assert.equal(document.querySelectorAll('.item[data-check]').length,before);
  dom.window.close();
});

test('本文を変更すると「わかる」履歴を自動クリアする',async()=>{
  const dom=createCheckpointDom();
  const {document}=dom.window;
  await settle(dom);

  document.getElementById('sample3')?.click();
  firstChecklistItem(document).click();
  document.getElementById('markPointKnown')?.click();
  assert.equal(document.querySelectorAll('.known-item').length,1);

  const input=document.getElementById('input');
  assert.ok(input instanceof dom.window.HTMLTextAreaElement);
  input.value=input.value+'別の本文';
  document.getElementById('analyze')?.click();

  assert.equal(document.getElementById('knownHistory')?.hidden,true);
  dom.window.close();
});

test('仮名遣いの類例は文語の精査済み例を表示する',async()=>{
  const dom=createCheckpointDom();
  const {document}=dom.window;
  await settle(dom);

  const input=document.getElementById('input');
  input.value='やうなり';
  document.getElementById('checkLevel').value='4';
  document.getElementById('analyze').click();

  const item=[...document.querySelectorAll('.item[data-check]')].find(el=>
    el.querySelector('.word')?.textContent.includes('やう')
  );
  assert.ok(item,'L1の仮名遣いポイントが表示される');
  item.click();

  document.getElementById('focusMainAction').click();
  const examples=document.querySelector('[data-focus-tool="examples"]');
  assert.ok(examples,'類例ボタンが表示される');
  examples.click();

  const text=document.getElementById('focusExtra').textContent;
  for(const expected of ['まうす → もうす','やうなり → ようなり','まうく → もうく','らうたし → ろうたし','さうざうし → そうぞうし']){
    assert.equal(text.includes(expected),true,`類例を表示する: ${expected}`);
  }
  for(const excluded of ['あふ → あう','たまふ → たもう','かう → こう','まうづ → もうず']){
    assert.equal(text.includes(excluded),false,`混乱しやすい例を出さない: ${excluded}`);
  }
  dom.window.close();
});

test('全16規則の類例はローカル監査表と一致し、歴史的主表示をひらがなに保つ',()=>{
  const source=readCheckpoint('core3.js');
  const match=source.match(/const KANA_RULE_DEFS = (\[[\s\S]*?\n\])\s*;?/);
  assert.ok(match,'KANA_RULE_DEFSを取得できる');
  const defs=Function(`return ${match[1]}`)();

  assert.equal(defs.length,16);
  assert.equal(auditVectors.proposedBy,'ai');
  assert.equal(auditVectors.reviewStatus,'pending');
  assert.equal(auditVectors.positiveRuleExamples.length,80);
  assert.equal(new Set(auditVectors.positiveRuleExamples.map(row=>row.ruleId)).size,16);
  for(const rule of defs){
    if(rule.id==='L4'){
      assert.equal(rule.reviewStatus,'record-only');
      assert.equal(rule.examples.length,0);
      continue;
    }
    assert.ok(rule.examples.length>=(rule.id==='L3'?4:5),`${rule.id} の類例数`);
    for(const example of rule.examples){
      const [historical,modern]=example.split(' → ');
      assert.ok(historical && modern,`${rule.id}: 歴史的 → 現代の順`);
      assert.match(historical,/^[ぁ-ゖー｜]+$/,`${rule.id}: 歴史的主表示はひらがな`);
    }
  }

  const audit=JSON.parse(readCheckpoint('data/kana_examples_audit_20260920.json'));
  for(const rule of defs){
    assert.deepEqual(rule.examples||[],audit.rules[rule.id]?.examples||[],`${rule.id} の実装と監査表を一致させる`);
  }

  const all=defs.flatMap(rule=>rule.examples||[]);
  const primaryInputs=new Set(all.map(pair=>pair.split(' → ')[0]));
  for(const forbidden of auditVectors.forbiddenPrimaryExamples){
    assert.equal(primaryInputs.has(forbidden.value),false,`監査案の禁止例を主例へ入れない: ${forbidden.value}`);
  }
  assert.doesNotMatch(all.join('\n'),/ズボン|ずぼん|づぼん|がつこう/);
  for(const excluded of [
    'あふ → あう',
    'たまふ → たもう',
    'かう → こう',
    'らうらうじ → ろうろうじ',
    'くわんおん → かんのん',
    'ことづて → ことづて',
    'もんじやう → もんじょう',
    'ほふし → ほうし',
    'まうづ → もうず',
    'けふ → きょう',
    'がつこう → がっこう',
    'だいしやう → だいしょう',
    'でんじやう → でんじょう'
  ]){
    assert.equal(all.includes(excluded),false,`監査で除外した例を復活させない: ${excluded}`);
  }
});

test('N1は助動詞を含む文法形を主例とし、単独の「む」は自動確定しない',async()=>{
  const dom=createCheckpointDom();
  await settle(dom);
  const {rules,detectKanaCandidates}=dom.window.__kanaTest;
  const n1=rules.find(rule=>rule.id==='N1');
  assert.equal(n1.examples.length,5);
  for(const pair of n1.examples){
    const [historical,modern]=pair.split(' → ');
    assert.match(historical,/(?:む|らむ|けむ)$/);
    assert.match(modern,/ん$/);
    assert.notEqual(historical,'む');
  }
  const candidate=detectKanaCandidates('む',4).find(hit=>hit.kanaRuleId==='N1');
  assert.ok(candidate);
  assert.equal(candidate.kanaPending,true);
  assert.equal(candidate.modernKana,undefined);
  dom.window.close();
});

test('全16規則の定義が実際の類例表示関数へ届き、空のL4に法則文を流さない',async()=>{
  const dom=createCheckpointDom();
  await settle(dom);
  const {rules,examplesForHit}=dom.window.__kanaTest;
  const rows=rules.map(rule => ({id:rule.id, expected:rule.examples, actual:examplesForHit({type:'orthography',kanaRuleId:rule.id,examples:['【法則】旧経路']})}));
  assert.equal(rows.length,16);
  for(const row of rows) assert.deepEqual([...row.actual],[...row.expected],`${row.id} の表示経路`);
  dom.window.close();
});

test('H1・W2・D1の例外も公開drawerから類例へ辿れる',async()=>{
  const dom=createCheckpointDom();
  const {document}=dom.window;
  await settle(dom);
  for(const [word,examples] of [
    ['にほひ',['はかなし → はかなし','あさ｜ひ → あさ｜ひ','はるはあけぼの → はるはあけぼの']],
    ['をとこ',['はなをみる → はなをみる']],
    ['もみぢ',['つづく → つづく']]
  ]){
    document.getElementById('input').value=word;
    document.getElementById('analyze').click();
    firstChecklistItem(document).click();
    document.getElementById('focusMainAction').click();
    const button=document.querySelector('[data-focus-tool="exceptions"]');
    assert.ok(button,`${word}: 例外ボタン`);
    button.click();
    const text=document.getElementById('focusExtra').textContent;
    for(const example of examples) assert.ok(text.includes(example),`${word}: ${example}`);
    document.getElementById('closeDrawer').click();
  }
  dom.window.close();
});

test('複合6例とRC16は全語の歴史的表示と現代化を分けて保持する',async()=>{
  const dom=createCheckpointDom();
  await settle(dom);
  const {document}=dom.window;
  const entries=dom.window.__kanaTest.lexicon;
  assert.equal(auditVectors.pipelineCrossRuleCases.length,6);
  assert.equal(auditVectors.displayPolicyCases.length,4);
  for(const {input:historical,expected:modern} of auditVectors.pipelineCrossRuleCases.concat(
    auditVectors.displayPolicyCases.map(row=>({input:row.historical,expected:row.modern}))
  )){
    const entry=entries.find(x=>x.surface===historical);
    assert.ok(entry,`${historical}: 全語の入口`);
    assert.equal(entry.modernKana,modern,`${historical}: 現代化`);
    assert.equal(/[ゃゅょっ]/.test(entry.surface),false,`${historical}: 歴史的主表示は大書き`);
    document.getElementById('input').value=historical;
    document.getElementById('checkLevel').value='4';
    document.getElementById('analyze').click();
    const item=[...document.querySelectorAll('.item[data-check]')].find(el=>el.querySelector('.word')?.textContent===historical);
    assert.ok(item,`${historical}: 全語のチェック項目`);
    item.click();
    document.getElementById('focusMainAction').click();
    const answer=document.querySelector('[data-focus-tool="answer"]');
    assert.ok(answer,`${historical}: 答えの入口`);
    answer.click();
    document.getElementById('focusRevealAnswer').click();
    assert.equal(document.getElementById('focusAnswerResult').classList.contains('open'),true);
    assert.ok(document.getElementById('focusAnswerResult').textContent.includes(`${historical} → ${modern}`),`${historical}: UIの現代化`);
    document.getElementById('closeDrawer').click();
  }
  assert.deepEqual([...entries.find(x=>x.surface==='まうづ').ruleIds],['L1','D1']);
  assert.deepEqual([...entries.find(x=>x.surface==='けふ').ruleIds],['H1','L3']);
  assert.deepEqual([...entries.find(x=>x.surface==='ゆふひ').ruleIds],['H1','H1-b']);
  assert.deepEqual([...entries.find(x=>x.surface==='うちはらふ').ruleIds],['H1','H1-b']);
  dom.window.close();
});

test('公開UIの文言と選択肢を簡潔に保つ',()=>{
  const html=readCheckpoint('index.html');
  const ui2=readCheckpoint('ui2.js');
  const ui3=readCheckpoint('ui3.js');

  for(const banned of ['次に見る','次にみる','次へ','Checkpoint β0.1','レベル判定','候補名までは一覧']){
    assert.equal(html.includes(banned)||ui2.includes(banned)||ui3.includes(banned),false,`公開UIに残さない: ${banned}`);
  }
  assert.match(html,/<option value="1">厳選<\/option>/);
  assert.match(html,/<option value="2" selected>ふつう<\/option>/);
  assert.match(html,/<option value="4">細かく<\/option>/);
  assert.equal((html.match(/<option /g)||[]).length,3);
  assert.equal(html.includes('id="nextPoint"'),false);
});

test('スマホ公開βのCSS契約を維持する',()=>{
  const css=readCheckpoint('styles.css');

  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css,/@media\(max-width:430px\)/);
  assert.match(css,/min-height:44px/);
  assert.match(css,/#checkLevel\{min-height:44px\}/);
  assert.match(css,/\.sample-picker summary\{min-height:44px\}/);
  assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/max-height:92dvh/);
  assert.match(css,/body\.drawer-open\{overflow:hidden\}/);
  assert.match(css,/textarea\{[\s\S]*?font-size:17px/);
});
