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
  assert.match(html, /class="score-label">累計正答<\/span>/);
  assert.match(html, /class="score-value" id="scoreValue">0<\/strong>/);
  assert.match(html, /value\.textContent=String\(stats\.correctCells\)/);
  assert.match(html, /<dt>正答数<\/dt>/);
});

test('conj: cumulative correct count animates like a water splash after an increase', () => {
  assert.match(html, /let scoreAnimationReady=false/);
  assert.match(html, /stats\.correctCells>previous/);
  assert.match(html, /score\.classList\.add\("is-updating"\)/);
  assert.match(html, /@keyframes score-pop/);
  assert.match(html, /@keyframes score-ripple/);
  assert.match(html, /@keyframes score-splash/);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)/);
});

test('conj: record colors keep the palette but map red yellow green navy in POS order', () => {
  assert.match(html, /--record-verb:#935568/);
  assert.match(html, /--record-adj:#b77d55/);
  assert.match(html, /--record-adjv:#39756f/);
  assert.match(html, /--record-aux:#3d566b/);
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
  assert.match(html, /id="reviewModalPosTag"/);
  assert.match(html, /class="word" id="reviewModalWord"/);
  assert.match(html, /class="kind" id="reviewModalKind"/);
  assert.match(html, /id="reviewKatsuyo" aria-label="活用表"/);
  assert.match(html, /function renderReviewTable\(item\)/);
  assert.match(html, /id="reviewExamplePanel"/);
  assert.match(html, /id="reviewExampleText"/);
  assert.match(html, /function renderReviewExample\(item\)/);
  assert.match(html, /\.review-modal-card \.lemma-aid\{min-height:14px\}/);
  assert.match(html, /lemmaAid\.style\.visibility=aidText\?"visible":"hidden"/);
  assert.match(html, /\.review-modal-study-layout\{[\s\S]*?display:flex[\s\S]*?justify-content:center/);
  assert.match(html, /table\.className="katsuyo"/);
  assert.match(html, /table\.classList\.add\("adjective-pair"\)/);
  assert.match(html, /table\.classList\.add\("paired-conjugation"\)/);
  assert.match(html, /table\.classList\.add\("one-track"\)/);
  assert.match(html, /event\.target===event\.currentTarget/);
  assert.match(html, /e\.key==="Escape"/);
  assert.doesNotMatch(html, /reviewModalKicker/);
  assert.doesNotMatch(html, /reviewModalTitle/);
  assert.doesNotMatch(html, /`正解例・\$\{item\.label\}`/);
  assert.doesNotMatch(html, /`\$\{item\.lemma\}の活用表`/);
  assert.doesNotMatch(html, /class="review-full-table"/);
  assert.doesNotMatch(html, /className="review-example"/);
});

test('conj: review randomly chooses a word in the selected group and shows its example', () => {
  assert.match(html, /exampleItems:\[\]/);
  assert.match(html, /prev\.exampleItems\.push\(item\)/);
  assert.match(html, /function randomReviewItem\(candidates\)/);
  assert.match(html, /Math\.floor\(Math\.random\(\)\*candidates\.length\)/);
  assert.match(html, /openReviewModal\(randomReviewItem\(entry\.exampleItems\)\)/);
  assert.match(html, /text\.innerHTML=highlight\(compactExample,compactTarget,item\.occurrence\)/);
});

test('conj: review uses error rate after three answers and groups auxiliaries by word', () => {
  assert.match(html, /const MIN_REVIEW_ATTEMPTS=3/);
  assert.match(html, /entry\.total>=MIN_REVIEW_ATTEMPTS && entry\.wrong>0/);
  assert.match(html, /誤答率/);
  assert.match(html, /`誤答 \$\{entry\.wrong\}\/\$\{entry\.total\}`/);
  assert.match(html, /item\.pos==="aux" \? item\.pos\+":"\+item\.id/);
  assert.match(html, /if\(item\.pos!=="aux"\) return broadKind\(item\.kind\)/);
});
