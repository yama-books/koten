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

test('conj: cumulative correct count uses a text-only beat after an increase', () => {
  assert.match(html, /let scoreAnimationReady=false/);
  assert.match(html, /stats\.correctCells>previous/);
  assert.match(html, /score\.classList\.add\("is-updating"\)/);
  assert.match(html, /@keyframes score-beat/);
  assert.doesNotMatch(html, /score-ripple|score-splash/);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)/);
});

test('conj: cumulative correct label and value stay on two lines on mobile', () => {
  assert.match(html, /\.header-record \.score\{\s*display:flex;\s*flex-direction:column;\s*align-items:center;/);
});

test('conj: review status stays readable and summary stats use compact rows', () => {
  assert.match(html, /\.review-copy small\{[\s\S]*?font-size:8px;[\s\S]*?white-space:nowrap;/);
  assert.match(html, /\.record-overview \.record-stat\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) max-content;[\s\S]*?padding:4px 7px;/);
  assert.match(html, /<dt>取り組んだ問題<\/dt>/);
  assert.match(html, /\.record-overview \.record-grid\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\);[\s\S]*?align-self:center;/);
  assert.match(html, /\.record-overview \.record-stat:first-child\{\s*grid-column:1 \/ -1;/);
  assert.match(html, /\.record-overview \.record-stat:first-child dt\{[\s\S]*?width:5em;/);
  assert.match(html, /\.record-overview \.record-stat:nth-child\(n\+2\)\{[\s\S]*?flex-direction:column;/);
});

test('conj: hanamaru is an overlaid stamp and donut total is centered as one baseline-aligned unit', () => {
  assert.match(html, /\.card\{\s*position:relative;/);
  assert.match(html, /\.perfect-result\{[\s\S]*?position:absolute;[\s\S]*?pointer-events:none;/);
  assert.match(html, /\.perfect-result\.show\{\s*display:block;/);
  assert.match(html, /setAttribute\("alt","はなまる"\)/);
  assert.match(html, /class="record-donut-value"><strong id="recordBreakdownTotal">0<\/strong><span>問<\/span><\/span>/);
  assert.match(html, /\.record-donut-value\{[\s\S]*?align-items:baseline;/);
});

test('conj: headings use historical kana with kanji as a secondary aid', () => {
  assert.match(html, /const HISTORICAL_KANA_HEADINGS=/);
  assert.match(html, /"思ふ":"おもふ"/);
  assert.match(html, /"帰る":"かへる"/);
  assert.match(html, /"匂ふ":"にほふ"/);
  assert.match(html, /document\.getElementById\("lemma"\)\.textContent=lemmaHeadingText\(current\)/);
  assert.match(html, /document\.getElementById\("reviewModalWord"\)\.textContent=lemmaHeadingText\(item\)/);
  assert.match(html, /lemmaAid\.style\.visibility=aidText\?"visible":"hidden"/);
  assert.match(html, /return aid \? String\(aidFull\) : ""/);
  assert.doesNotMatch(html, /`漢字：\$\{aidFull\}`/);
});

test('conj: paired tables center primary track names independently of supplementary notes', () => {
  assert.match(html, /function setPairedTrackLabels\(left,right,item\)/);
  assert.match(html, /left\.textContent="補助活用"/);
  assert.match(html, /left\.dataset\.trackNote=item\?\.id==="zu" \? "（ザリ活用）" : "（カリ活用）"/);
  assert.match(html, /right\.textContent="本活用"/);
  assert.match(html, /\.table-panel\.paired-mode \.track-heads > span:first-child::after\{[\s\S]*?content:attr\(data-track-note\);[\s\S]*?position:absolute;/);
  assert.match(html, /function syncPairedTrackHeads\(panel,table\)/);
  assert.match(html, /heads\.style\.gridTemplateColumns=/);
  assert.doesNotMatch(html, /textContent="左：補助活用　／　右：本活用"/);
});

test('conj: supplementary track note (カリ活用/ザリ活用) reads horizontally', () => {
  const rules = [...html.matchAll(/\.table-panel\.paired-mode \.track-heads > span:first-child::after\{([^}]*)\}/g)]
    .map((m) => m[1]);
  assert.ok(rules.length > 0);
  for (const body of rules) assert.doesNotMatch(body, /vertical-rl|text-orientation:upright/);
  assert.match(rules[0], /writing-mode:horizontal-tb;/);
  assert.match(rules[0], /white-space:nowrap;/);
});

test('conj: 降る example marks only the verb ふれ, not the auxiliary る', () => {
  const src = html.match(/function highlight\(text,target,occurrence\)\{[\s\S]*?\n\}/);
  assert.ok(src);
  const highlight = new Function(`${src[0]}; return highlight;`)() as
    (text: string, target: string, occurrence?: number) => string;
  const item = html.match(/\{id:"furu_snow"[\s\S]*?target:"([^"]*)",example:"([^"]*)"\}/);
  assert.ok(item);
  assert.equal(item[1], 'ふれ');
  assert.match(highlight(item[2], item[1]), /里に<mark>ふれ<\/mark>る白雪/);
});
test('conj: answer reveal is unscored and leaves no redundant feedback sentence', () => {
  assert.match(html, /if\(!revealOnly\)\{[\s\S]*?stats\.gradedCells\+\+/);
  assert.match(html, /if\(!revealOnly\)\{[\s\S]*?stats\.total\+\+/);
  assert.match(html, /document\.getElementById\("feedback"\)\.textContent=""/);
  assert.doesNotMatch(html, /答えを表示しました。/);
});

test('conj: auxiliary difficulty rises monotonically from levels 1 through 7', () => {
  const ratios = [...html.matchAll(/\d:\{ratio:(\d+(?:\.\d+)?|\.\d+),\s*includeZero:(?:true|false),\s*hideKind:(?:true|false),\s*label:/g)]
    .slice(0, 7)
    .map(match => Number(match[1]));
  assert.deepEqual(ratios, [.28, .42, .55, .65, .75, .90, 1]);
  assert.ok(ratios.every((ratio, index) => index === 0 || ratio >= ratios[index - 1]));
  assert.match(html, /4:\{ratio:\.65, includeZero:true,\s+hideKind:false/);
  assert.match(html, /5:\{ratio:\.75, includeZero:true,\s+hideKind:true/);
  assert.match(html, /count=Math\.max\(1,Math\.ceil\(eligible\.length\*p\.ratio\)\)/);
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
