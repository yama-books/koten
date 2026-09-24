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

test('conj: record screen keeps summary, legend, and review cards readable across widths', () => {
  const css = html.match(/\/\* ===== v46: record layout readability guard ===== \*\/([\s\S]*?)<\/style>/);
  assert.ok(css);
  const v46 = css[1];
  const rule = (selector: string) => {
    const escaped = selector.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    const match = v46.match(new RegExp(escaped + '\\{([^}]*)\\}'));
    assert.ok(match, selector);
    return match[1];
  };
  const fontSize = (selector: string) => {
    const match = rule(selector).match(/font-size:(\d+)px/);
    assert.ok(match, selector);
    return Number(match[1]);
  };

  // v48: the record screen keeps its compact single-column mobile layout at every width,
  // including PC, instead of stretching the same small type across a wider desktop shell
  assert.match(v46, /\/\* ===== v48: keep the compact single-column record layout at every width, PC included, ===== \*\//);
  assert.match(rule('.record-detail-grid'), /grid-template-columns:1fr/);
  assert.doesNotMatch(html, /\.record-shell\{width:min\(100%,900px\)\}/);
  assert.doesNotMatch(html, /grid-template-columns:minmax\(420px,1fr\) minmax\(0,1fr\)/);
  assert.match(html, /\.record-shell\{width:min\(100%,640px\)\}/);
  assert.match(rule('.record-overview'), /grid-template-columns:minmax\(220px,1fr\) 150px;/);
  assert.match(rule('.record-overview .record-breakdown-panel'), /grid-template-columns:96px minmax\(0,1fr\);/);
  assert.doesNotMatch(rule('.record-overview .record-breakdown-panel'), /max-content/);
  assert.match(v46, /@media\(max-width:700px\)\{[\s\S]*?\.record-overview \.record-breakdown-panel\{[\s\S]*?minmax\(0,1fr\)/);
  assert.match(rule('.review-kind-line strong'), /white-space:nowrap;/);

  // v49: 要確認 cards stay two-per-row down to real phone widths; only screens narrower than
  // 360px (well below any current phone) fall back to one-per-row to avoid clipped text
  assert.doesNotMatch(html, /@media\(max-width:460px\)\{\s*\.record-review\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(html, /@media\(max-width:460px\)\{\s*\.record-review\{\s*grid-template-columns:1fr;/);
  assert.match(v46, /\/\* ===== v49: keep 要確認 cards two-per-row down to real phone widths, ===== \*\//);
  assert.match(v46, /@media\(max-width:359px\)\{\s*\.record-review\{grid-template-columns:1fr\}\s*\.review-toggle\{grid-template-columns:56px minmax\(0,1fr\)\}\s*\}/);
  assert.match(html, /\.record-review\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\);/);

  for (const selector of [
    '.record-overview .record-stat dt',
    '.record-overview .record-stat:first-child dt',
    '.record-points-label',
    '.breakdown-label',
    '.record-breakdown strong',
    '.review-filters button',
    '.record-empty',
  ]) assert.ok(fontSize(selector) >= 12, selector);

  for (const selector of [
    '.record-donut-center span',
    '.review-rate span',
    '.review-copy small',
    '.review-pos-badge',
  ]) assert.ok(fontSize(selector) >= 10, selector);

  assert.match(html, /<dt>取り組んだ問題<\/dt>/);
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

test('conj: examples mark only the conjugated word, not a following auxiliary or particle', () => {
  const helperSrc = html.match(/function markVerticalEllipsis\(html\)\{[\s\S]*?\n\}/);
  assert.ok(helperSrc);
  const src = html.match(/function highlight\(text,target,occurrence\)\{[\s\S]*?\n\}/);
  assert.ok(src);
  const highlight = new Function(`${helperSrc[0]}\n${src[0]}; return highlight;`)() as
    (text: string, target: string, occurrence?: number) => string;
  const expected: [string, RegExp][] = [
    ['furu_snow', /里に<mark>ふれ<\/mark>る白雪/],
    ['wasuru', /^<mark>忘れ<\/mark>じの/],
    ['tayu', /音は<mark>絶え<\/mark>て久しく/],
    ['karu_wither', /草も<mark>かれ<\/mark>ぬと/],
    ['waku', /それとも<mark>わか<\/mark>ぬ間に/],
    ['fuku_late', /小夜<mark>更け<\/mark>て/],
    ['nokoru', /月ぞ<mark>残れ<\/mark>る$/],
    ['sugu', /^春<mark>すぎ<\/mark>て夏/],
    ['sugusu', /世を<mark>すぐし<\/mark>てよとや/],
  ];
  for (const [id, mark] of expected) {
    const item = html.match(new RegExp(`\\{id:"${id}"[\\s\\S]*?target:"([^"]*)",example:"([^"]*)"\\}`));
    assert.ok(item, id);
    assert.match(highlight(item[2], item[1]), mark, id);
  }
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

test('conj: every runtime 形容動詞 heading resolves to kana, leaving kanji for the aid line', () => {
  const read = (name: string) =>
    JSON.parse(readFileSync(new URL(`../../conj/data/${name}`, import.meta.url), 'utf8'));
  const pool = read('adjectival-noun-lemma-pool.json').lemmas as { lemma: string; paradigmId: string; exampleIds: string[] }[];
  const annotations = new Map(
    (read('adjectival-noun-lexical-annotations.json').annotations as { id: string; displayLemma?: string }[])
      .map((a) => [a.id, a]),
  );
  const mapSrc = html.match(/const HISTORICAL_KANA_HEADINGS=\{([\s\S]*?)\};/);
  assert.ok(mapSrc);
  const headings = new Set([...mapSrc[1].matchAll(/"([^"]+)":"[^"]+"/g)].map((m) => m[1]));
  const kanji = /[一-龯々]/;
  const missing = pool
    .map((lemma) => {
      const stems = lemma.exampleIds.map((id) => annotations.get(id)?.displayLemma);
      const stable = stems.length && stems.every((s) => s && s === stems[0]) ? stems[0] : null;
      const suffix = lemma.paradigmId === 'adjv-tari' ? 'たり' : 'なり';
      return stable ? stable + suffix : lemma.lemma;
    })
    .filter((display) => kanji.test(display) && !headings.has(display));
  assert.deepEqual(missing, []);
});

test('conj: 形容動詞 show reviewed public examples, credited once rather than per example', () => {
  const read = (name: string) =>
    JSON.parse(readFileSync(new URL(`../../conj/data/${name}`, import.meta.url), 'utf8'));
  const pool = new Set((read('adjectival-noun-lemma-pool.json').lemmas as { id: string }[]).map((l) => l.id));
  const records = read('adjectival-noun-public-examples.json').records as Record<string, unknown>[];
  const shown = records.filter((r) =>
    r.exampleEnabledPublic === true && r.rightsVerified === true && r.targetVerified === true && r.excerptReviewed === true);
  assert.ok(shown.length > 0);
  for (const r of shown) {
    assert.ok(pool.has(r.lemmaId as string), String(r.id));
    assert.ok((r.example as string).includes(r.publicTarget as string), String(r.id));
    assert.ok(r.sourceLabel && r.sourceUrl && r.sourceLicense, String(r.id));
  }

  const adapter = readFileSync(new URL('../../conj/adjv-runtime-adapter.js', import.meta.url), 'utf8');
  assert.match(adapter, /r\.exampleEnabledPublic!==true \|\| r\.rightsVerified!==true\s*\|\| r\.targetVerified!==true \|\| r\.excerptReviewed!==true/);
  assert.match(html, /publicExamples=await window\.ConjAdjvRuntime\.loadPublicExamples/);
  assert.match(html, /target:ex\.publicTarget/);
  // Examples show only the work name; sources are listed once, in a popup.
  assert.match(html, /source:ex\.work,/);
  assert.match(html, /source:quote\.work,/);
  assert.doesNotMatch(html, /source:ex\.sourceLabel/);
  assert.match(html, /<button class="source-credits-link" id="openSourceCredits" type="button" hidden>用例の出典<\/button>/);
  assert.match(html, /<dialog class="source-credits" id="sourceCredits"/);
  assert.match(html, /renderSourceCredits\(\[\.\.\.publicExamples\.values\(\)\],chj\)/);
  assert.match(html, /\.example-text\.is-prose\{white-space:normal !important\}/);
});

test('conj: every runtime 形容動詞 without open text gets a quoted CHJ example', () => {
  const read = (name: string) =>
    JSON.parse(readFileSync(new URL(`../../conj/data/${name}`, import.meta.url), 'utf8'));
  const pool = read('adjectival-noun-lemma-pool.json').lemmas as { id: string }[];
  const open = new Set((read('adjectival-noun-public-examples.json').records as { lemmaId: string }[]).map((r) => r.lemmaId));
  const chj = read('adjectival-noun-chj-quotations.json');
  assert.ok(chj.source.name && chj.source.url);
  const quoted = new Map((chj.records as { lemmaId: string; target: string; excerpt: string; occurrence: number; work: string }[])
    .map((r) => [r.lemmaId, r]));
  for (const lemma of pool) {
    if (open.has(lemma.id)) continue;
    const r = quoted.get(lemma.id);
    assert.ok(r, lemma.id);
    assert.ok(r.work, lemma.id);
    assert.ok(r.excerpt.split(r.target).length - 1 > r.occurrence, lemma.id);
  }
  assert.match(html, /chj=await window\.ConjAdjvRuntime\.loadChjQuotations/);
  assert.match(html, /occurrence:quote\.occurrence/);
});

test('conj: review card keeps the example within the table height so it does not scroll', () => {
  assert.match(html, /\.review-modal-study-layout \.example-panel\{\s*top:0;\s*bottom:0;\s*\}/);
  assert.match(html, /\.review-modal-study-layout \.example-text\{\s*min-height:0 !important;/);
  assert.match(html, /\.review-modal-card\{[\s\S]*?height:min\(88vh,700px\);/);
});

test('conj: 過ぐ (上二段) and 過ぐす (サ行四段) are separate items with matching examples', () => {
  assert.match(html, /\{id:"sugu",pos:"verb",label:"動詞",lemma:"過ぐ",kind:"ガ行上二段活用",[\s\S]*?poem:2,target:"すぎ",/);
  assert.match(html, /\{id:"sugusu",pos:"verb",label:"動詞",lemma:"過ぐす",kind:"サ行四段活用",\s*forms:\[F\(\["さ"\]\),F\(\["し"\]\),F\(\["す"\]\),F\(\["す"\]\),F\(\["せ"\]\),F\(\["せ"\]\)\],\s*poem:19,target:"すぐし",/);
  assert.match(html, /"過ぐす":"すぐす"/);
});

test('conj: 忍ぶ follows its example しのぶれど as バ行上二段', () => {
  assert.match(html, /\{id:"shinobu",pos:"verb",label:"動詞",lemma:"忍ぶ",kind:"バ行上二段活用",\s*forms:\[F\(\["び"\]\),F\(\["び"\]\),F\(\["ぶ"\]\),F\(\["ぶる"\]\),F\(\["ぶれ"\]\),F\(\["びよ"\]\)\],\s*poem:39,target:"しのぶれ",/);
});

test('conj: source list covers every part of speech, not only 形容動詞', () => {
  assert.match(html, /<p>用例は、次の資料から短く引用しています（空白を詰めて掲載）。<\/p>/);
  assert.doesNotMatch(html, /形容動詞の用例は、次の資料から/);
  assert.match(html, /addGroup\(\["『小倉百人一首』"\],\[\["和歌の用例（歌番号と作者は各用例に表示）"\]\]\)/);
  assert.match(html, /古典作品（作品名は各用例に表示）/);
  // Grouped by provider and license, then by work.
  assert.match(html, /const key=provider\+"\|"\+r\.sourceLicense;/);
  assert.match(html, /const workKey=work\+"\|"\+edition;/);
});

test('conj: no caption under the title, and the title uses the UI round gothic', () => {
  assert.doesNotMatch(html, /app-subtitle|活用表を、静かに、何度でも。/);
  const css = readFileSync(new URL('../../conj/branding.css', import.meta.url), 'utf8');
  assert.match(css, /h1 \{\s*font-family: var\(--conj-font-ui\);/);
});

test('conj: home-screen name is 活用ノート on iOS and Android', () => {
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="活用ノート">/);
  const manifest = JSON.parse(readFileSync(new URL('../../conj/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.short_name, '活用ノート');
});

test('conj: install guide detects home-screen launch and offers to add it otherwise', () => {
  assert.match(html, /function isStandaloneLaunch\(\)\{/);
  assert.match(html, /window\.matchMedia\?\.\("\(display-mode: standalone\)"\)\.matches===true/);
  assert.match(html, /navigator\.standalone===true/);
  assert.match(html, /if\(isStandaloneLaunch\(\) \|\| installNoticeWasDismissed\(\) \|\| installNoticeWasSessionHidden\(\)\) return;/);
});

function plain(text) {
  return text.replace(/<wbr>/g, '');
}

test('conj: install guide shows the iOS share icon wording and an SVG labeled 共有', () => {
  const iosTextMatch = html.match(/textEl\.innerHTML="共有ボタン"\+shareIconSvg\+"([^"]*)";/);
  assert.ok(iosTextMatch);
  assert.equal(plain(iosTextMatch[1]), 'からホーム画面に追加すると、アプリとして扱えます');
  assert.match(html, /viewBox="0 0 24 24" role="img" aria-label="共有"/);
});

test('conj: install guide has button-driven wording for the install-prompt and menu-guide cases', () => {
  const addTextMatch = html.match(/textEl\.innerHTML="([^"]*追加すると[^"]*)";\s*\n\s*addBtn\.hidden=false;/);
  assert.ok(addTextMatch);
  assert.equal(plain(addTextMatch[1]), 'ホーム画面に追加すると、アプリとして扱えます');

  const menuTextMatch = html.match(/textEl\.innerHTML="([^"]*ホーム画面に追加[^"]*)";\s*\n\s*addBtn\.hidden=true;\s*\n\s*\}\s*\n\s*guide\.hidden=false;/);
  assert.ok(menuTextMatch);
  assert.equal(plain(menuTextMatch[1]), 'メニューの「ホーム画面に追加」でアプリとして扱えます');
});

test('conj: install guide offers three actions instead of a corner ×, and distinguishes session vs permanent dismissal', () => {
  assert.doesNotMatch(html, /install-guide__dismiss/);
  assert.match(html, /<button id="installGuideAdd" class="install-guide__btn install-guide__btn--primary" type="button" hidden>ホーム画面に追加する<\/button>/);
  assert.match(html, /<button id="installGuideLater" class="install-guide__btn" type="button">今は追加しない<\/button>/);
  assert.match(html, /<button id="installGuideNever" class="install-guide__btn" type="button">今後は表示しない<\/button>/);

  assert.match(html, /const INSTALL_NOTICE_KEY="conjInstallNoticeDismissed";/);
  assert.match(html, /const INSTALL_NOTICE_SESSION_KEY="conjInstallNoticeSessionHidden";/);
  assert.match(html, /localStorage\.getItem\(INSTALL_NOTICE_KEY\)==="true"/);
  assert.match(html, /localStorage\.setItem\(INSTALL_NOTICE_KEY,"true"\)/);
  assert.match(html, /sessionStorage\.getItem\(INSTALL_NOTICE_SESSION_KEY\)==="true"/);
  assert.match(html, /sessionStorage\.setItem\(INSTALL_NOTICE_SESSION_KEY,"true"\)/);

  assert.match(html, /laterBtn\.addEventListener\("click",dismissForSession\)/);
  assert.match(html, /neverBtn\.addEventListener\("click",dismissPermanently\)/);
});

test('conj: install guide resolves the add-to-home prompt outcome instead of hiding permanently on cancel', () => {
  assert.match(html, /const event=installPrompt;/);
  assert.match(html, /installPrompt=null;/);
  assert.match(html, /await event\.prompt\(\);/);
  assert.match(html, /const choice=await event\.userChoice;/);
  assert.match(html, /if\(choice\?\.outcome==="accepted"\)\{\s*\n\s*dismissPermanently\(\);\s*\n\s*\}else\{\s*\n\s*dismissForSession\(\);\s*\n\s*\}/);
  assert.match(html, /\}catch\{\s*\n\s*\/\/[^\n]*\n\s*dismissForSession\(\);\s*\n\s*\}/);
});

test('conj: install guide sits outside the study card, near the source-credits link', () => {
  assert.match(
    html,
    /<button class="source-credits-link" id="openSourceCredits" type="button" hidden>用例の出典<\/button>\s*<section class="install-guide" id="installGuide" hidden aria-label="ホーム画面への追加">/,
  );
  assert.doesNotMatch(html, /<main class="card">[\s\S]*id="installGuide"[\s\S]*<\/main>/);
});


test('conj: work3 theme system exposes 5 named color schemes, defaults to coffee, and keeps universal/record colors fixed', () => {
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(styleMatch);
  const css = styleMatch[1];

  const rootMatch = css.match(/:root\{([\s\S]*?)\}/);
  assert.ok(rootMatch);
  const rootBody = rootMatch[1];

  const themeMatches: Record<string, RegExpMatchArray> = {};
  for (const name of ['matcha', 'indigo', 'sumi', 'sakura']) {
    const m = css.match(new RegExp(`:root\\[data-theme="${name}"\\]\\{([\\s\\S]*?)\\}`));
    assert.ok(m, name);
    themeMatches[name] = m;
  }

  const parseVars = (body: string) => {
    const map = new Map<string, string>();
    for (const m of body.matchAll(/--([a-z0-9-]+):([^;]+);/g)) map.set(m[1], m[2]);
    return map;
  };
  const rootVars = parseVars(rootBody);
  const themeVars: Record<string, Map<string, string>> = {};
  for (const [name, m] of Object.entries(themeMatches)) themeVars[name] = parseVars(m[1]);

  // default (no data-theme attribute) is the coffee scheme
  assert.strictEqual(rootVars.get('bg'), '#fbf9f7');
  assert.strictEqual(rootVars.get('accent'), '#a68c6f');

  // matcha preserves the exact colors that were the default before work3
  assert.strictEqual(themeVars.matcha.get('bg'), '#f7fbfa');
  assert.strictEqual(themeVars.matcha.get('accent'), '#6fa696');
  assert.strictEqual(themeVars.matcha.get('accent-strong'), '#477d70');

  // the other two named schemes are present with distinct accent hues
  assert.strictEqual(themeVars.indigo.get('accent'), '#6f7ea6');
  assert.strictEqual(themeVars.sumi.get('accent'), '#878e8c');
  assert.strictEqual(themeVars.sakura.get('accent'), '#a66f7f');

  // universal semantic colors (correctness feedback, error state, modal backdrop) never change with theme
  const UNIVERSAL = [
    'good',
    'bad',
    'danger-ink',
    'review-error-border-base',
    'review-error-ink-base',
    'review-error-border',
    'review-error-bg',
    'review-error-ink',
    'source-backdrop',
  ];
  for (const key of UNIVERSAL) {
    assert.ok(rootVars.has(key), key);
    for (const [name, vars] of Object.entries(themeVars)) {
      if (vars.has(key)) assert.strictEqual(vars.get(key), rootVars.get(key), `${name}:${key}`);
    }
  }

  // record POS palette and donut base color stay out of :root and every theme block, in every scheme
  assert.doesNotMatch(rootBody, /--record-(?:verb|adj|adjv|aux|empty|donut-base):/);
  for (const [name, m] of Object.entries(themeMatches)) {
    assert.doesNotMatch(m[1], /--record-(?:verb|adj|adjv|aux|empty|donut-base):/, name);
  }

  const lastThemeEnd = Math.max(...Object.values(themeMatches).map((m) => m.index! + m[0].length));
  const cssBody = css.slice(lastThemeEnd);
  assert.match(
    cssBody,
    /\/\* ===== v42: muted ink-citrus record palette ===== \*\/\s*\.record-screen\{\s*--record-verb:#935568;\s*--record-adj:#b77d55;\s*--record-adjv:#39756f;\s*--record-aux:#3d566b;\s*--record-empty:#e8eef1;/,
  );
  assert.match(cssBody, /\.record-donut\{[\s\S]*?background:#e7f1ee;/);
  assert.doesNotMatch(cssBody, /\.record-donut\{[^}]*background:var\(--record-empty\)/);

  const themedBody = cssBody
    .replace(/\s*--record-(?:verb|adj|adjv|aux|empty):#[0-9a-fA-F]+;/g, '')
    .replace(/background:#e7f1ee;/, 'background:fixed-record-donut;')
    // the theme-picker swatch dots are deliberately fixed previews of each named theme's own
    // accent color, independent of whichever theme is currently active (checked separately below)
    .replace(/\.theme-swatch\[data-theme="[a-z]+"\] \.theme-swatch__dot\{background:#[0-9a-fA-F]+\}/g, '');
  assert.doesNotMatch(themedBody, /#[0-9a-fA-F]{3,8}\b/);

  for (const line of cssBody.split('\n').filter((line) => line.includes('rgba('))) {
    assert.match(line, /box-shadow:/, line.trim());
  }

  assert.match(cssBody, /body\{background:[\s\S]*?var\(--page-glow-primary\)[\s\S]*?var\(--page-glow-secondary\)[\s\S]*?var\(--bg\)/);
  assert.match(cssBody, /td\.editable:hover\{background:var\(--editable-hover\)\}/);
  assert.match(cssBody, /td\.selected\{background:var\(--editable-selected\)\}/);
  assert.match(cssBody, /\.review-rate\{[\s\S]*?border-color:var\(--review-error-border\);[\s\S]*?background:var\(--review-error-bg\);/);
  assert.match(cssBody, /\.review-toggle:hover,[\s\S]*?\.review-toggle:focus-visible\{background:var\(--review-hover-bg\)\}/);
  assert.match(cssBody, /\.record-screen\{[\s\S]*?var\(--record-glow-primary\)[\s\S]*?var\(--record-glow-secondary\)[\s\S]*?var\(--bg\)/);
});

test('conj: theme picker is a set of mood-swatch buttons, not a dropdown, and applies before first paint', () => {
  const pickerMatch = html.match(/<div class="theme-picker" id="themePicker" role="group" aria-label="配色テーマ">([\s\S]*?)<\/div>/);
  assert.ok(pickerMatch);
  const picker = pickerMatch[1];
  for (const [theme, label] of [
    ['coffee', '珈琲'],
    ['matcha', '抹茶'],
    ['indigo', '藍'],
    ['sumi', '墨'],
    ['sakura', '桜'],
  ]) {
    assert.match(
      picker,
      new RegExp(`<button class="theme-swatch" type="button" data-theme="${theme}" aria-pressed="false"><span class="theme-swatch__dot" aria-hidden="true"></span>${label}</button>`),
    );
  }
  assert.doesNotMatch(html, /<select id="themeSelect"/);

  // each swatch's dot previews that named theme's own accent color, independent of which theme is currently active
  const swatchDotColors = {
    coffee: '#a68c6f',
    matcha: '#6fa696',
    indigo: '#6f7ea6',
    sumi: '#878e8c',
    sakura: '#a66f7f',
  };
  for (const [theme, hex] of Object.entries(swatchDotColors)) {
    assert.match(html, new RegExp(`\\.theme-swatch\\[data-theme="${theme}"\\] \\.theme-swatch__dot\\{background:${hex}\\}`));
  }

  // an early, synchronous head script restores a saved non-default theme before <style> is parsed, avoiding a flash of the wrong theme
  const headScript = html.match(/<meta name="theme-color"[^>]*>\s*<script>([\s\S]*?)<\/script>\s*<style>/);
  assert.ok(headScript);
  assert.match(headScript[1], /localStorage\.getItem\("conjTheme"\)/);
  assert.match(headScript[1], /document\.documentElement\.setAttribute\("data-theme",t\)/);

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert.ok(scriptMatch);
  const script = scriptMatch[1];
  assert.match(script, /const CONJ_THEMES=\["coffee","matcha","indigo","sumi","sakura"\];/);
  assert.match(script, /function applyConjTheme\(theme\)\{[\s\S]*?root\.removeAttribute\("data-theme"\)[\s\S]*?root\.setAttribute\("data-theme",theme\)/);
  assert.match(script, /function initThemeSwitcher\(\)\{\s*const buttons=\[\.\.\.document\.querySelectorAll\("#themePicker \.theme-swatch"\)\];/);
  assert.match(script, /button\.setAttribute\("aria-pressed",String\(button\.dataset\.theme===theme\)\)/);
  assert.match(script, /localStorage\.setItem\("conjTheme",next\)/);
  assert.match(script, /async function bootConj\(\)\{\s*initThemeSwitcher\(\);/);
});

test('conj: work4 settings screen hosts the theme picker plus record export/import/erase controls', () => {
  // settings is a wordless gear icon button (identified by aria-label, not visible text)
  assert.match(html, /<button class="ghost icon-button" id="openSettings" type="button" aria-label="設定">\s*<svg class="settings-icon"/);
  assert.doesNotMatch(html, /<button[^>]*id="openSettings"[^>]*>\s*設定\s*<\/button>/);
  assert.match(html, /<dialog class="settings-dialog" id="settingsDialog" aria-labelledby="settingsTitle">/);

  const dialogMatch = html.match(/<dialog class="settings-dialog"[\s\S]*?<\/dialog>/);
  assert.ok(dialogMatch);
  const dialog = dialogMatch[0];

  // the theme picker lives inside the settings dialog, not as a standalone toolbar control
  assert.match(dialog, /<div class="theme-picker" id="themePicker" role="group" aria-label="配色テーマ">/);

  assert.match(dialog, /<button class="ghost" id="exportRecord" type="button">記録を書き出す<\/button>/);
  assert.match(dialog, /<button class="ghost" id="importRecordTrigger" type="button">記録を読み込む<\/button>/);
  assert.match(dialog, /<input type="file" id="importRecordFile" accept="application\/json,\.json" hidden>/);
  assert.match(dialog, /<button class="ghost settings-danger" id="eraseRecord" type="button">記録を消去する<\/button>/);

  // erasing shows an explicit, unmistakable confirmation before touching storage - never a single click, never a native confirm()
  assert.match(dialog, /<div class="settings-erase-confirm" id="eraseConfirm" hidden>/);
  assert.match(dialog, /<p class="settings-erase-confirm__text">本当に消去しますか？もとには戻せません。<\/p>/);
  assert.match(dialog, /<button class="ghost settings-danger" id="eraseConfirmYes" type="button">消去する<\/button>/);
  assert.match(dialog, /<button class="ghost" id="eraseConfirmCancel" type="button">キャンセル<\/button>/);

  assert.match(dialog, /<p class="settings-record-status" id="settingsRecordStatus" role="status"><\/p>/);

  // the danger action color is a universal semantic token, not part of the theme rotation
  assert.match(html, /\.settings-danger\{color:var\(--danger-ink\)\}/);

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert.ok(scriptMatch);
  const script = scriptMatch[1];

  // export bundles the in-memory stats object, not a copy re-read from localStorage
  assert.match(script, /function exportRecord\(\)\{[\s\S]*?app:"conj-katsuyo-record",[\s\S]*?stats\s*\};/);
  assert.match(script, /a\.download=`katsuyo-record-\$\{stamp\}\.json`;/);

  // import runs the parsed payload through the same normalizeStats() sanitizer used on every app load
  assert.match(script, /function importRecordFromText\(text\)\{[\s\S]*?stats=normalizeStats\(rawStats\);[\s\S]*?localStorage\.setItem\(RECORD_STORAGE_KEY,JSON\.stringify\(stats\)\);/);

  // erase is a two-step flow: the first click only reveals the confirm panel, a second explicit click on eraseConfirmYes performs it
  assert.match(script, /function armEraseRecord\(\)\{\s*document\.getElementById\("eraseRecord"\)\.hidden=true;\s*document\.getElementById\("eraseConfirm"\)\.hidden=false;\s*\}/);
  assert.match(script, /function confirmEraseRecord\(\)\{[\s\S]*?localStorage\.removeItem\(RECORD_STORAGE_KEY\);[\s\S]*?stats=normalizeStats\(\{\}\);/);
  assert.match(script, /document\.getElementById\("eraseRecord"\)\.addEventListener\("click",armEraseRecord\);/);
  assert.match(script, /document\.getElementById\("eraseConfirmYes"\)\.addEventListener\("click",confirmEraseRecord\);/);
  assert.match(script, /document\.getElementById\("eraseConfirmCancel"\)\.addEventListener\("click",resetEraseRecordArm\);/);

  assert.match(script, /const RECORD_STORAGE_KEY="katsuyoProtoV37";/);
  assert.match(script, /function refreshAfterRecordChange\(\)\{\s*updateScore\(\);\s*if\(!document\.getElementById\("recordScreen"\)\.hidden\) renderRecord\(\);\s*\}/);

  // opening the settings dialog resets any leftover erase confirmation state from a previous visit
  assert.match(script, /document\.getElementById\("openSettings"\)\.addEventListener\("click",\(\)=>\{\s*setSettingsRecordStatus\(""\);\s*resetEraseRecordArm\(\);\s*document\.getElementById\("settingsDialog"\)\.showModal\(\);/);
  assert.match(script, /document\.getElementById\("settingsDialog"\)\.addEventListener\("close",resetEraseRecordArm\);/);

  // Escape/Enter handling for the study screen ignores keystrokes while the settings dialog is open, like it already does for the source-credits dialog
  assert.match(script, /if\(document\.getElementById\("sourceCredits"\)\.open\) return;\s*if\(document\.getElementById\("settingsDialog"\)\.open\) return;/);
});

test('conj: work4.7 CHJ excerpt ellipsis rotates to match vertical reading direction', () => {
  // .example-text forces text-orientation:upright so kana/kanji stay upright, but that also
  // keeps "…" lying on its side; a dedicated rule rotates just that character back in line
  assert.match(html, /\.v-ellipsis\{text-orientation:sideways\}/);

  const helperSrc = html.match(/function markVerticalEllipsis\(html\)\{[\s\S]*?\n\}/);
  assert.ok(helperSrc);
  const src = html.match(/function highlight\(text,target,occurrence\)\{[\s\S]*?\n\}/);
  assert.ok(src);
  const highlight = new Function(`${helperSrc[0]}\n${src[0]}; return highlight;`)() as
    (text: string, target: string, occurrence?: number) => string;

  // both a leading/trailing excerpt-edge ellipsis and one produced alongside a <mark> highlight are wrapped
  assert.strictEqual(
    highlight('…屋のさまも…', '', 0),
    '<span class="v-ellipsis">…</span>屋のさまも<span class="v-ellipsis">…</span>',
  );
  assert.strictEqual(
    highlight('…ふれる白雪…', 'ふれ', 0),
    '<span class="v-ellipsis">…</span><mark>ふれ</mark>る白雪<span class="v-ellipsis">…</span>',
  );

  // every excerpt-edge "…" actually present in the CHJ quotation data is reachable through the same wrapper
  const chj = JSON.parse(
    readFileSync(new URL('../../conj/data/adjectival-noun-chj-quotations.json', import.meta.url), 'utf8'),
  );
  const excerptsWithEllipsis = chj.records
    .map((record: any) => record.excerpt)
    .filter((excerpt: unknown): excerpt is string => typeof excerpt === 'string' && excerpt.includes('…'));
  assert.ok(excerptsWithEllipsis.length > 0);
  for (const excerpt of excerptsWithEllipsis.slice(0, 5)) {
    assert.match(highlight(excerpt, '', 0), /<span class="v-ellipsis">…<\/span>/);
  }
});

test('conj: toggling the 用例 checkbox does not reset an already-answered question back to its unanswered button state', () => {
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert.ok(scriptMatch);
  const script = scriptMatch[1];

  // toggling the checkbox must call the dedicated visibility-only helper, never the full render(),
  // which unconditionally shows 採点/答えを見る and hides 次の問題 regardless of the real answered state
  assert.match(script, /document\.getElementById\("showExample"\)\.onchange=\(\)=>current&&applyExampleVisibility\(\);/);
  assert.doesNotMatch(script, /document\.getElementById\("showExample"\)\.onchange=\(\)=>current&&render\(\);/);

  // the helper only touches the example panel/layout and the height sync, not the answered-state buttons
  const helperMatch = script.match(/function applyExampleVisibility\(\)\{([\s\S]*?)\n\}/);
  assert.ok(helperMatch);
  const helper = helperMatch[1];
  assert.match(helper, /document\.getElementById\("examplePanel"\)\.style\.display=showing\?"block":"none";/);
  assert.match(helper, /syncStudyHeights/);
  assert.doesNotMatch(helper, /getElementById\("check"\)/);
  assert.doesNotMatch(helper, /getElementById\("reveal"\)/);
  assert.doesNotMatch(helper, /getElementById\("next"\)/);

  // render() (used for an actual new question) still applies example visibility as part of its full reset
  assert.match(script, /function render\(\)\{[\s\S]*?applyExampleVisibility\(\);[\s\S]*?renderTable\(\);/);
});

test('conj: activation-form labels (未然形 etc.) are centered with an inner flex box, not vertical-align alone', () => {
  // Safari does not reliably honor vertical-align:middle for vertical-writing-mode text inside
  // a table cell, which left the 未然形/連用形/... labels sitting off-center in .katsuyo tables
  // (most visibly in the record screen's 要確認 review modal). Center them with a flex child instead.
  assert.match(html, /\.katsuyo th\.label \.label-text\{display:flex;width:100%;height:100%;align-items:center;justify-content:center\}/);

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert.ok(scriptMatch);
  const script = scriptMatch[1];

  // every label cell, in the main study table and the review modal alike, goes through the
  // same builder so the fix (and any future change) can't drift out of sync between the two
  const builderSrc = script.match(/function makeLabelCell\(name\)\{[\s\S]*?\n\}/);
  assert.ok(builderSrc);
  assert.match(builderSrc[0], /th\.className="label";/);
  assert.match(builderSrc[0], /span\.className="label-text";/);
  assert.match(builderSrc[0], /span\.textContent=name;/);
  assert.match(builderSrc[0], /th\.appendChild\(span\);/);

  assert.doesNotMatch(script, /const th=document\.createElement\("th"\);\s*th\.className="label";\s*th\.textContent=name;/);
  const labelCellCallSites = [...script.matchAll(/makeLabelCell\(name\)/g)];
  assert.ok(labelCellCallSites.length >= 8, `expected every label-cell site (main table x4 shapes, review modal x4 shapes) to use makeLabelCell(), found ${labelCellCallSites.length}`);
});

test('conj: question selection favors items with fewer past attempts, without excluding any', () => {
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
  assert.ok(scriptMatch);
  const script = scriptMatch[1];

  const countsSrc = script.match(/function itemAttemptCounts\(\)\{[\s\S]*?\n\}/);
  assert.ok(countsSrc);
  const pickSrc = script.match(/function pickWeightedQuestion\(list\)\{[\s\S]*?\n\}/);
  assert.ok(pickSrc);

  // itemAttemptCounts sums c+w across every slot key for a given item id (the part before the first ":")
  const stats = {
    slots: {
      'yodan:mizen:0': { c: 8, w: 2 },
      'yodan:renyo:0': { c: 5, w: 1 },
      'kahen:mizen:0': undefined,
    },
  };
  const { itemAttemptCounts: counts2 } = new Function(
    'stats',
    `${countsSrc[0]}\nreturn {itemAttemptCounts};`,
  )(stats);
  const attempts = counts2();
  assert.strictEqual(attempts.get('yodan'), 16);
  assert.strictEqual(attempts.get('kahen') ?? 0, 0);

  // an item absent from stats entirely (never drawn before, e.g. a rare kind like カ変)
  // must end up picked far more often than its plain 1-of-N share, but never guaranteed
  const pool = [{ id: 'kahen' }, ...Array.from({ length: 19 }, (_, i) => ({ id: `practiced${i}` }))];
  // give every "practiced" item the same non-zero attempt count so only kahen's zero-count stands out
  const heavyStats = { slots: Object.fromEntries(pool.filter(x => x.id !== 'kahen').map(x => [`${x.id}:mizen:0`, { c: 10, w: 0 }])) };
  const { pickWeightedQuestion: pickHeavy } = new Function(
    'stats',
    `${countsSrc[0]}\n${pickSrc[0]}\nreturn {pickWeightedQuestion};`,
  )(heavyStats);

  let kahenPicks = 0;
  let otherPicksSeen = new Set();
  const trials = 4000;
  for (let i = 0; i < trials; i++) {
    const picked = pickHeavy(pool);
    if (picked.id === 'kahen') kahenPicks++;
    else otherPicksSeen.add(picked.id);
  }
  // with 20 items uniformly it would land on kahen about 5% of the time; being the only
  // unpracticed item it should land far more often than that (loose bound to avoid flakiness)
  assert.ok(kahenPicks / trials > 0.15, `expected kahen to be picked disproportionately often, got ${kahenPicks}/${trials}`);
  // it must not be the only possible outcome - other items still get drawn sometimes
  assert.ok(otherPicksSeen.size > 1, 'other items must still be reachable, not excluded entirely');
});
