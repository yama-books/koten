import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../conj/index.html', import.meta.url), 'utf8');

test('conj: mobile answer editor avoids iOS zoom and focuses synchronously', () => {
  assert.match(html, /@media\(max-width:700px\)[\s\S]*?\.editor input\{font-size:16px\}/);
  assert.match(html, /inp\.focus\(\{preventScroll:true\}\)/);
  assert.doesNotMatch(html, /setTimeout\(\(\)=>\{inp\.focus\(\); inp\.select\(\);\},0\)/);
});

test('conj: header and record screen use cumulative correct wording', () => {
  assert.match(html, /id="score">累計正答 0</);
  assert.match(html, /累計正答 \$\{stats\.correctCells\}/);
  assert.match(html, /<dt>正答数<\/dt>/);
});

test('conj: attempted count and donut share the same per-POS total', () => {
  assert.match(html, /const total=keys\.reduce\(\(sum,key\)=>sum\+counts\[key\],0\)/);
  assert.match(html, /recordQuestions"\)\.textContent=total\+"問"/);
  assert.match(html, /function reconcilePosCounts\(storedByPos,total,slots\)/);
  assert.match(html, /byPos:reconcilePosCounts\(storedPosCounts,attemptedTotal,slots\)/);
});

test('conj: review defaults to verbs and supports full-table modal plus POS filters', () => {
  assert.match(html, /const reviewPosFilters=new Set\(\["verb"\]\)/);
  assert.match(html, /data-review-pos="verb" aria-pressed="true"/);
  assert.match(html, /data-review-pos="adj" aria-pressed="false"/);
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /function openReviewModal\(item\)/);
  assert.match(html, /button\.setAttribute\("aria-haspopup","dialog"\)/);
  assert.match(html, /id="reviewKatsuyo" aria-label="正解の活用表"/);
  assert.match(html, /function renderReviewTable\(item\)/);
  assert.match(html, /table\.className="katsuyo"/);
  assert.match(html, /table\.classList\.add\("adjective-pair"\)/);
  assert.match(html, /table\.classList\.add\("paired-conjugation"\)/);
  assert.match(html, /table\.classList\.add\("one-track"\)/);
  assert.match(html, /event\.target===event\.currentTarget/);
  assert.match(html, /e\.key==="Escape"/);
  assert.doesNotMatch(html, /class="review-full-table"/);
  assert.doesNotMatch(html, /className="review-example"/);
});

test('conj: review uses error rate after three answers and groups auxiliaries by word', () => {
  assert.match(html, /const MIN_REVIEW_ATTEMPTS=3/);
  assert.match(html, /entry\.total>=MIN_REVIEW_ATTEMPTS && entry\.wrong>0/);
  assert.match(html, /誤答率/);
  assert.match(html, /`誤答 \$\{entry\.wrong\}\/\$\{entry\.total\}`/);
  assert.match(html, /item\.pos==="aux" \? item\.pos\+":"\+item\.id/);
  assert.match(html, /if\(item\.pos!=="aux"\) return broadKind\(item\.kind\)/);
});
