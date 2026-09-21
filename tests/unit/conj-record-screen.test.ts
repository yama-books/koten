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

test('conj: review defaults to verbs and supports examples plus POS filters', () => {
  assert.match(html, /const reviewPosFilters=new Set\(\["verb"\]\)/);
  assert.match(html, /data-review-pos="verb" aria-pressed="true"/);
  assert.match(html, /data-review-pos="adj" aria-pressed="false"/);
  assert.match(html, /function correctExample\(item\)/);
  assert.match(html, /example\.className="review-example"/);
});
