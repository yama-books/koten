import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../vintage-kana/index.html", import.meta.url), "utf8");
const glyphMaster = JSON.parse(readFileSync(new URL("../../vintage-kana/data/ui-glyph-master.json", import.meta.url), "utf8"));


test("vintage-kana fallback glyph data stays identical to the UI master", () => {
  const match = html.match(/const FALLBACK_GLYPHS=(\[[^\n]+\]);/);
  assert.ok(match, "FALLBACK_GLYPHS が見つからない");
  const fallback = JSON.parse(match[1]);
  assert.deepEqual(fallback, glyphMaster.glyphs);
});
test("vintage-kana RC25 staged quiz thresholds stay fixed", () => {
  assert.match(html, /const QUIZ_SET_SIZE=5;/);
  assert.match(html, /const QUIZ_CORRECT_POINTS=10;/);
  assert.match(html, /const QUIZ_ATTEMPT_POINTS=1;/);
  assert.match(html, /const CHOICE_MASTERY_INCREMENT=5;/);
  assert.match(html, /const CHOICE_MASTERY_CAP=65;/);
  assert.match(html, /const FREE_INPUT_MASTERY_INCREMENT=9;/);
  assert.match(html, /const FREE_INPUT_MASTERY_CAP=90;/);
  assert.match(html, /const OVER_NINETY_MASTERY_INCREMENT=2;/);
  assert.match(html, /const DAILY_MASTERY_GAIN_CAP=20;/);
  assert.match(html, /const CHOICE_INCORRECT_DECREMENT=3;/);
  assert.match(html, /const FREE_INPUT_INCORRECT_DECREMENT=5;/);
  assert.match(html, /const JIBO_REVERSE_MASTERY_THRESHOLD=65;/);
  assert.match(html, /return mastery>=CHOICE_MASTERY_CAP\?"free-input":"choice"/);
  assert.match(html, /mastery>=30\?focusedReadingPool\(quizEntry\)/);
  assert.match(html, /mastery>=30\?focusedJiboPool\(quizEntry\)/);
  assert.match(html, /masteryMethod==="free-input"\|\|e\.masteryMethod==="jibo-reverse"/);
});

test("vintage-kana G palette keeps selected controls sky-blue and primary actions sakura", () => {
  assert.match(html, /--accent:#356b9e;--accent2:#e0ecf8;--accent-border:#9bbbd8;--primary:#c2506e;--danger:#a85732;/);
  assert.match(html, /\.tab\.active\{background:var\(--accent2\);border-color:var\(--accent\);color:var\(--accent\)/);
  assert.match(html, /\.kanaBtn\.active\{background:var\(--accent2\);color:var\(--accent\);border-color:var\(--accent\)\}/);
  assert.match(html, /\.quizModeBtn\.active\{background:var\(--accent2\);border-color:var\(--accent\);color:var\(--accent\)\}/);
  assert.match(html, /\.composeModeBtn\.active\{background:var\(--accent2\);border-color:var\(--accent\);color:var\(--accent\)\}/);
  assert.match(html, /\.btn\.primary\{background:var\(--primary\);border-color:var\(--primary\);color:#fff\}/);
  assert.match(html, /\.choice\.wrong\{border-color:var\(--danger\);background:#fff0e8;color:#6f3a26\}/);
});

test("vintage-kana keeps the mobile answer grid as a 2x2 bento", () => {
  assert.match(
    html,
    /@media\(max-width:720px\)\{[\s\S]*?\.choices\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:8px\}/,
  );
  assert.match(html, /\.choice\{[^}]*font-size:30px;[^}]*min-height:84px;/);
});

test("vintage-kana narrow navigation remains tappable without wrapping the three primary tabs", () => {
  assert.match(html, /\.tab\{[^}]*min-height:44px;/);
  assert.match(html, /@media\(max-width:720px\)\{button\{min-height:44px\}/);
  assert.match(html, /<button id="openHelp" class="learnHelpBtn" type="button" aria-label="変体仮名とは？">/);
  assert.match(html, /\.quizModeBtn\{min-height:44px;/);
  assert.match(html, /\.quizScreenBtn\{min-height:44px;/);
  assert.match(
    html,
    /@media\(max-width:380px\)\{\.learnHelpBtn\{width:44px;[^}]*\}\.learnHelpBtn>span:last-child\{display:none\}\.utilityTabs\{flex:1;justify-content:flex-end\}/,
  );
});

test("vintage-kana points stay hidden until the five-question result screen", () => {
  assert.match(html, /<div id="quizResult" class="quizStage setResult" hidden>/);
  assert.match(html, /<strong id="setPoints">\+0<\/strong><span>ポイント<\/span>/);
  assert.doesNotMatch(
    html.match(/<div id="quizPractice" class="quizStage">[\s\S]*?<\/div>\s*<div id="quizResult"/)?.[0] ?? "",
    /id="setPoints"/,
  );
});


test("vintage-kana record mastery uses glyph-first ring cards with 3-to-2 responsive columns", () => {
  assert.match(html, /\.rowGlyphMastery\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html, /\.glyphMasteryCard\{[^}]*aspect-ratio:1\/1\.12;/);
  assert.match(html, /\.glyphMasteryCard\{[^}]*padding:22px 4px 6px/);
  assert.match(html, /\.glyphMasteryCore\{[^}]*transform:translateX\(4px\)/);
  assert.match(html, /\.glyphMasteryGlyph\{[^}]*font-family:"Noto Serif Hentaigana"/);
  assert.match(html, /@media\(max-width:360px\)\{\.rowGlyphMastery\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}\}/);
  assert.match(html, /@media\(orientation:landscape\) and \(min-width:721px\)\{\.recordRows\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}\.rowGlyphMastery\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)\}\}/);
  assert.match(html, /class="glyphMasteryRing"[^>]*role="meter"/);
  assert.match(html, /class="glyphMasteryReading">/);
  assert.match(html, /class="glyphMasteryJibo">'\+escapeHtml\(g\.jibo\)/);
  assert.doesNotMatch(html, /class="glyphMasteryJibo">字母 /);
  assert.match(html, /class="glyphMasteryPercent">/);
  assert.match(html, /id="glyphInfoDialog"/);
  assert.match(html, /data-glyph-info/);
  assert.doesNotMatch(html, /class="masteryBar"/);
});

test("vintage-kana choice questions use larger labels without the redundant 4-choice hint", () => {
  assert.match(html, /\.choice\{[^}]*font-size:30px;/);
  assert.match(html, /\.choices\.glyphChoices \.choice\{[^}]*font-size:48px/);
  assert.doesNotMatch(html, /"4択"/);
});

test("vintage-kana advanced jibo questions show exactly one correct glyph choice per jibo prompt", () => {
  assert.match(html, /if\(mode==="jibo" && mastery>=JIBO_REVERSE_MASTERY_THRESHOLD\)return "jibo-reverse"/);
  assert.match(html, /return "jibo-reverse"/);
  assert.match(html, /function reverseJiboChoices\(entry\)/);
  assert.match(html, /const same=shuffle\(valid\.filter\(f=>row\.includes\(f\.kana\)\)\)/);
  assert.match(html, /const other=shuffle\(valid\.filter\(f=>!row\.includes\(f\.kana\)\)\)/);
  assert.match(html, /const standard=shuffle\(valid\.filter\(f=>f\.isStandard\)\)/);
  assert.match(html, /valid=allKanaForms\(\)\.filter\(f=>f\.character!==entry\.character && f\.jibo!==entry\.jibo\)/);
  assert.match(html, /この字母からできた平仮名はどれ？/);
  assert.match(html, /id="jiboAnswerReading"/);
  assert.match(html, /jiboAnswerReading\.textContent=quizEntry\.kana/);
});


test("vintage-kana help is modal and browse navigation uses the compact row menu", () => {
  assert.match(html, /h1\{font-family:var\(--font-ui\)/);
  assert.match(html, /data-view="browse">一覧<\/button>/);
  assert.match(html, /id="helpDialog" class="helpDialog"/);
  assert.match(html, /className="kanaFilterRow"/);
  assert.match(html, /className="kanaFilterRow__buttons"/);
});

test("vintage-kana keeps the audited glyph corrections and official-catalog annotation", () => {
  const d8 = glyphMaster.glyphs.find((g: { glyph_id: string }) => g.glyph_id === "U+1B0D8");
  const e6 = glyphMaster.glyphs.find((g: { glyph_id: string }) => g.glyph_id === "U+1B0E6");
  const c10 = glyphMaster.glyphs.find((g: { glyph_id: string }) => g.glyph_id === "U+1B10C");
  assert.deepEqual({ kana: d8?.kana, jibo: d8?.jibo }, { kana: "も", jibo: "毛" });
  assert.equal(e6?.jibo, "遊");
  assert.equal(c10?.inOfficialCatalog, false);
  assert.match(html, /id="glyphInfoNote" class="glyphInfoDialog__note" hidden/);
  assert.match(html, /entry\?\.inOfficialCatalog===false/);
  assert.match(html, /公式収録一覧には含まれないため、補足字形として表示しています/);
  assert.match(html, /"glyph_id":"U\+1B0D8","character":"𛃘","jibo":"毛"/);
  assert.match(html, /"glyph_id":"U\+1B0E6","character":"𛃦","jibo":"遊"/);
  assert.match(html, /"glyph_id":"U\+1B10C","character":"𛄌","jibo":"王","totalObserved":353,"witnessCount":12,"ninjal_id":null,"inOfficialCatalog":false,"renderability":"unicode-text"/);
});

test("vintage-kana keeps U+1B11C mapped to を / 遠 in the current glyph master", () => {
  const item = glyphMaster.glyphs.find((g: { glyph_id: string }) => g.glyph_id === "U+1B11C");
  assert.ok(item);
  assert.equal(item.kana, "を");
  assert.equal(item.jibo, "遠");
  assert.equal(item.character, "𛄜");
  assert.equal(glyphMaster.glyphs.some((g: { glyph_id: string; kana: string }) => g.glyph_id === "U+1B11C" && g.kana === "せ"), false);
});


test("vintage-kana keeps quiz sub-navigation stable across top-level view changes", () => {
  assert.match(html, /let activeQuizScreen="practice";/);
  assert.match(html, /let recordReturnScreen="practice";/);
  assert.match(html, /if\(b\.dataset\.view==="quiz"\)showQuizScreen\(activeQuizScreen\)/);
  assert.match(html, /function openQuizRecord\(\)/);
  assert.match(html, /recordReturnScreen=document\.getElementById\("quizResult"\)\?\.hidden===false\?"result":"practice"/);
  assert.match(html, /function returnFromRecord\(\)/);
  assert.match(html, /recordReturnScreen==="result"\)showQuizResult\(\)/);
  assert.match(html, /back\.textContent=recordReturnScreen==="result"\?"結果に戻る":"練習に戻る"/);
});

test("vintage-kana glyph explanations are reachable from browse and mastery cards", () => {
  assert.match(html, /document\.createElement\(e\.isStandard\?"div":"button"\)/);
  assert.match(html, /d\.dataset\.glyphInfo=""/);
  assert.match(html, /bindGlyphInfoCards\(root\)/);
  assert.match(html, /<button type="button" class="glyphMasteryCard" data-glyph-info/);
  assert.match(html, /bindGlyphInfoCards\(rows\)/);
  assert.match(html, /\["U\+1B052",\{\n    note:"※この字は現代の「を」とよく似た形ですが、読みは「せ」、字母は「世」です。/);
  assert.match(html, /\["U\+1B11A",\{\n    note:"※この字は現代の「せ」に似て見えることがありますが、読みは「を」、字母は「越」です。/);
  assert.match(html, /notes\.join\("\\n"\)/);
});

test("vintage-kana small-kana toggle covers every small kana, not just yoon", () => {
  // SMALL_BASE に載る小文字すべてがトグルの対象。拗音3字だけではない。
  assert.match(html, /const SMALL_BASE=\{"ぁ":"あ","ぃ":"い","ぅ":"う","ぇ":"え","ぉ":"お","ゃ":"や","ゅ":"ゆ","ょ":"よ","っ":"つ","ゎ":"わ"\};/);
  assert.match(html, /const SMALL_TOGGLE_KANA=new Set\(Object\.keys\(SMALL_BASE\)\);/);

  // 旧実装の痕跡が残っていないこと。
  assert.doesNotMatch(html, /YOON_SMALL/);
  assert.doesNotMatch(html, /yoonSmallEnabled/);

  // チェックなし = すべて大文字（base）で描く。
  assert.match(html, /if\(togglesSmall && !smallKanaEnabled\) return previewCell\(escapeHtml\(SMALL_BASE\[ch\]\)\);/);
  assert.match(html, /if\(togglesSmall && !smallKanaEnabled\) return \{text:SMALL_BASE\[ch\],small:false,hentaigana:false\};/);

  // チェックあり = 小さく描く。
  assert.match(html, /const shouldSmall=sel\.small && \(!togglesSmall \|\| smallKanaEnabled\);/);
  assert.match(html, /small:sel\.small && \(!togglesSmall \|\| smallKanaEnabled\),/);

  // 「普通のひらがな」候補の見出しも同じ規則で切り替わる。
  assert.match(html, /const standardText=SMALL_TOGGLE_KANA\.has\(k\) && !smallKanaEnabled \? info\.base : k;/);
  assert.match(html, /const showSmall=info\.small && \(!SMALL_TOGGLE_KANA\.has\(k\) \|\| smallKanaEnabled\);/);

  // 文言が拗音限定のままになっていないこと。
  assert.doesNotMatch(html, /ゃ・ゅ・ょを小さく表示/);
  assert.match(html, /ぁ・ぃ・ゅ などを小さく表示/);
});

test("vintage-kana mastery cards keep the percent inside the card", () => {
  // 中央寄せ＋下方向オフセットだと、カード高が内容に足りず % が
  // overflow:hidden で切れる。上端から積み、内容が収まる最小高を持たせる。
  assert.match(html, /\.glyphMasteryCard\{position:relative;aspect-ratio:1\/1\.12;min-width:0;min-height:108px;overflow:hidden;display:flex;align-items:flex-start;justify-content:center;/);
  assert.match(html, /\.glyphMasteryCard\{[^}]*padding:22px 4px 6px;/);
  assert.match(html, /\.glyphMasteryCore\{display:flex;flex-direction:column;align-items:center;gap:3px;transform:translateX\(4px\)\}/);
  assert.doesNotMatch(html, /transform:translate\(4px,8px\)/);
});

test("vintage-kana G palette applies to the ground, not just the accents", () => {
  // §56 では accent 系だけGへ寄せ、地・紙・罫線・インクは旧配色のままだった。
  assert.match(html, /--bg:#fbf7f5;--paper:#fffdfb;--paper2:#fdf6f4;--ink:#2f3138;--muted:#77737a;/);
  assert.match(html, /--line:#ecdfdb;--ring-track:#ebe3df;/);
  assert.match(html, /<meta name="theme-color" content="#fbf7f5">/);
  assert.match(html, /background:radial-gradient\(circle at 86% -8%,rgba\(122,166,209,\.20\),transparent 31rem\),var\(--bg\)/);

  // 旧配色のハードコードが残っていないこと。
  assert.doesNotMatch(html, /#f2efe8/);
  assert.doesNotMatch(html, /#fffdf8/);
  assert.doesNotMatch(html, /#e5e1d8/);

  // 保存PNGもアプリの地・紙・インクに同期している。
  assert.match(html, /ctx\.fillStyle="#fbf7f5";/);
  assert.match(html, /ctx\.fillStyle="#fffdfb";/);
  assert.match(html, /ctx\.fillStyle="#2f3138";/);
});

test("vintage-kana reading quiz tells the jibo when it reveals the answer", () => {
  assert.match(html, /function readingFeedbackText\(correct\)\{/);
  assert.match(html, /const jibo=quizEntry&&quizEntry\.jibo\?"字母は「"\+quizEntry\.jibo\+"」です。":"";/);
  assert.match(html, /return \(correct\?"正解です。":"「"\+quizEntry\.kana\+"」と読みます。"\)\+jibo;/);
  // 4択と自由入力の両方が同じ文面を使う。
  assert.strictEqual((html.match(/\? readingFeedbackText\(correct\)/g) ?? []).length, 2);
});

test("vintage-kana help dialog spells the reading of 字母 in parentheses", () => {
  // ルビは行boxを押し広げて見出しだけ背が高くなるため、括弧書きにしてある。
  assert.match(html, /<h3>字母（じぼ）とは？<\/h3>/);
  assert.doesNotMatch(html, /<ruby>/);
  assert.doesNotMatch(html, /<rt>/);
  assert.match(html, /\.helpBody h3\{font-size:13px;margin:14px 0 4px\}/);
});

test("vintage-kana preview can be switched to vertical writing", () => {
  assert.match(html, /<button class="previewDirBtn active" type="button" data-writing="horizontal">横書き<\/button>/);
  assert.match(html, /<button class="previewDirBtn" type="button" data-writing="vertical">縦書き<\/button>/);
  assert.match(html, /let verticalWriting=false;/);
  assert.match(html, /previewEl\.classList\.toggle\("vertical",verticalWriting\);/);

  // 縦幅は固定枠、あふれは横スクロール。幅を明示しないと縦組みは内容なりに広がる。
  assert.match(
    html,
    /\.previewDock \.preview\.vertical\{writing-mode:vertical-rl;text-orientation:upright;width:100%;max-width:100%;height:300px;min-height:0;overflow-x:auto;overflow-y:hidden;/,
  );

  // 保存PNGも縦書きに追従する。
  assert.match(html, /function layoutCanvasColumns\(ctx,tokens,fontSize,maxHeight\)\{/);
  assert.match(html, /if\(verticalWriting\)\{/);
});

test("vintage-kana browse grid lines the kana up by vowel column", () => {
  // 一覧の並びは記録の行集計・出題プール（KANA_ROWS）とは別に持つ。
  assert.match(html, /const KANA_FILTER_ROWS=\[/);
  assert.match(html, /\["や行",\["や",null,"ゆ",null,"よ"\]\],/);
  assert.match(html, /\["わ行",\["わ","ゐ",null,"ゑ","を"\]\],/);
  assert.match(html, /\["ん",\["ん",null,null,null,null\]\]/);
  assert.match(html, /KANA_FILTER_ROWS\.forEach\(\(\[label,slots\]\)=>\{/);
  assert.match(html, /spacer\.className="kanaFilterSlot";/);

  // 記録と出題が使う正本は空きを持たない。
  assert.match(html, /\["わ行",\[\.\.\."わゐゑをん"\]\]/);
});

test("vintage-kana vertical writing keeps every kana upright and evenly spaced", () => {
  // text-orientation の既定 mixed では濁点の合成文字が90度回転する。
  assert.match(html, /\.preview\.vertical\{writing-mode:vertical-rl;text-orientation:upright;/);

  // 1字を1.12emの枠に収め、字ごとの送りの差で列の字数がばらつかないようにする。
  assert.match(
    html,
    /\.previewDock \.preview\.vertical \.pvCell\{display:inline-block;inline-size:1\.12em;block-size:1em;line-height:1;text-align:center\}/,
  );
  assert.match(html, /function previewCell\(inner\)\{return '<span class="pvCell">'\+inner\+'<\/span>'\}/);
  // 画面の各字は必ず枠で包まれる。
  assert.strictEqual((html.match(/previewCell\(/g) ?? []).length, 4);

  // 保存PNGの送りも画面と同じ 1.12em。
  assert.match(html, /const advance=fontSize\*1\.12;/);
  assert.match(html, /if\(height\+advance>maxHeight && columns\.at\(-1\)\.length\)/);
  // 天地の決め方は「保存PNGの上揃え」のテストで固定している。
  assert.match(html, /       y\+=advance;/);
});

test("vintage-kana glyph dialog shows the look-alike glyph next to the note", () => {
  // 「現代の『を』に似ている」と書いても、その「を」が並んでいないと読者は確かめようがない。
  assert.match(html, /<div id="glyphInfoCompare" class="glyphInfoDialog__compare" hidden>/);
  assert.match(html, /<div class="glyphInfoDialog__compareLabel">似ている字<\/div>/);
  assert.match(html, /function renderGlyphInfoCompare\(items\)\{/);
  assert.match(html, /renderGlyphInfoCompare\(visual\?\.compare\);/);

  // せ／世 には現代の「を」と、同じく「を」に見える を／遠 を並べる。
  assert.match(html, /\{character:"を",kind:"現代のかな",detail:"「を」",modern:true\}/);
  assert.match(html, /\{character:"𛄜",kind:"変体仮名",detail:"「を」（遠）"\}/);
  // を／越 には現代の「せ」。
  assert.match(html, /\{character:"せ",kind:"現代のかな",detail:"「せ」",modern:true\}/);
  // を／遠 には現代の「を」と、紛らわしい せ／世。
  assert.match(html, /\{character:"𛁒",kind:"変体仮名",detail:"「せ」（世）"\}/);
  assert.match(html, /\.compareItem__kind\{display:block;font-weight:700\}/);

  // 現代の仮名は明朝、変体仮名は専用フォントで出し分ける。
  assert.match(html, /\.compareItem\.isModern \.compareItem__glyph\{font-family:var\(--font-poem\)\}/);
});

test("vintage-kana glyph dialog aligns the labels with their values", () => {
  // ラベル14px・値20pxで、grid の既定の上端揃えでは字の座りがずれる。
  assert.match(html, /\.glyphInfoDialog__meta\{display:grid;grid-template-columns:auto auto;justify-content:center;align-items:baseline;/);
  assert.match(html, /\.glyphInfoDialog__meta dt\{color:var\(--muted\);text-align:right\}/);
  assert.match(html, /\.glyphInfoDialog__meta dd\{margin:0;font-family:var\(--font-poem\);font-size:20px;text-align:left\}/);
});

test("vintage-kana vertical export starts every column at the same top", () => {
  // 列ごとに天地中央で置くと、字数の少ない最後の列だけ宙に浮く。
  assert.match(html, /const longest=Math\.max\(1,\.\.\.columns\.map\(c=>c\.length\)\);/);
  assert.match(html, /const columnTop=520-\(longest\*advance\)\/2\+fontSize\*\.85;/);
  assert.match(html, /     let y=columnTop;/);
  assert.doesNotMatch(html, /let y=520-\(column\.length\*advance\)/);
});

test("vintage-kana result screen lists the glyphs from the set and marks the misses", () => {
  assert.match(html, /<h2>今回確認した字<\/h2>/);
  assert.doesNotMatch(html, /<h2>5問おわりました<\/h2>/);
  assert.match(html, /<div id="setResultGlyphs" class="setResultGlyphs"><\/div>/);

  // 1問ごとの正誤を持つ。glyphs は出題の重複除けなので別にしてある。
  assert.match(html, /answered:0,correct:0,glyphs:\[\],results:\[\]/);
  assert.match(html, /quizSet\.results\.push\(\{/);
  assert.match(html, /function renderQuizResultGlyphs\(\)\{/);
  assert.match(html, /renderQuizResultGlyphs\(\);/);

  // 読みと字母は一覧に出さず、変体仮名だけを並べる。
  assert.match(html, /<span class="setResultGlyph__char">'\+escapeHtml\(r\.character\)\+'<\/span>/);
  assert.doesNotMatch(html, /setResultGlyph__kana/);

  // 押すと既存の字形解説ダイアログが開く。
  assert.match(html, /data-glyph-info data-character="'\+escapeHtml\(r\.character\)\+'"/);
  assert.match(html, /bindGlyphInfoCards\(root\);/);

  // 間違えた字は色と記号の両方で示し、正解は静かな印だけにする。
  assert.match(html, /\.setResultGlyph\.isWrong\{background:#fff0e8;border-color:var\(--danger\)\}/);
  // 日本の採点では ✓ が誤答を指すことがあるため、正解は ◎、誤答は ✓ に分ける。
  assert.match(html, /\(r\.correct\?"◎":"✓"\)/);
  assert.doesNotMatch(html, /setResultLegend/);
  assert.match(html, /\.setResult h2\{margin:0 0 8px;font-family:var\(--font-ui\)/);
  assert.match(html, /class="setResultGlyph'\+\(r\.correct\?"":" isWrong"\)/);

  // 読み上げにも正誤を乗せる。
  assert.match(html, /const state=r\.correct\?"正解":"間違えた字";/);
});

test("vintage-kana keeps already-shown glyphs stable while typing", () => {
  // 入力のたびに全字を引き直すと、打つたび・改行するたびに既出の字が変わる。
  // renderCompose は未割当の字にだけ割り当てるので、入力時はこちらを使う。
  assert.doesNotMatch(html, /if\(composeMode==="auto"\) randomizeCompose\(\); else renderCompose\(\);/);
  assert.match(html, /全部引き直すのは「もう一度」を押したときだけ。\n renderCompose\(\);/);
  // 引き直しは「もう一度」だけの操作。
  assert.match(html, /document\.getElementById\("rerollCompose"\)\.onclick=randomizeCompose;/);
  // 同じ仮名には同じ字体を割り当てる（selected は文字をキーにしている）。
  assert.match(html, /if\(!\(k in selected\) \|\| selected\[k\]\?\.keep\) selected\[k\]=pickDefault\(k\);/);
});

test("vintage-kana reports the saved image as an export", () => {
  assert.match(html, /status\.textContent="画像を書き出しました。"/);
  assert.doesNotMatch(html, /画像を保存しました。/);
  assert.doesNotMatch(html, /画像を共有しました。/);
});

test("vintage-kana export credit sits outside the paper in the title face", () => {
  // 紙は roundedRect(70,70,940,940) なので下端は 1010。クレジットはその外側。
  assert.match(html, /"変体仮名メーカー © 2026",\n   540,\n   1050,/);
  assert.match(html, /'500 20px "Zen Maru Gothic","Hiragino Maru Gothic ProN",sans-serif'/);
  assert.match(html, /ctx\.fillStyle="#a49ca0";/);

  // 細罫と明朝の奥付はやめた。
  assert.doesNotMatch(html, /ctx\.strokeStyle="#c8c1b5";/);
  assert.doesNotMatch(html, /'600 24px "Klee One","Yu Mincho",serif'/);

  // 描く前に字体を読み込む。読み込み前だとフォールバックで描かれる。
  assert.match(html, /document\.fonts\.check\('500 20px "Zen Maru Gothic"',"変体仮名メーカー"\)/);
});

test("vintage-kana defaults compose picks to the most frequent glyph, keeping weighted randomness for reroll only", () => {
  // 初回・未選択時は最頻の字体を既定にする。ばらつきは「もう一度」の重み付き抽選に任せる。
  assert.match(html, /function pickDefault\(ch\)\{/);
  assert.match(html, /const e=choices\.slice\(\)\.sort\(compareGlyphBrowseOrder\)\[0\];/);
  assert.match(html, /if\(!\(k in selected\) \|\| selected\[k\]\?\.keep\) selected\[k\]=pickDefault\(k\);/g);
  // reroll (「もう一度」/randomizeCompose) は引き続き重み付きランダムを使う。
  assert.match(html, /function randomizeCompose\(\)\{[\s\S]*?selected\[ch\]=pickAutomatic\(ch\);/);
});

test("vintage-kana weights the automatic pick by frequency without excluding anything", () => {
  // 生の出現回数を重みにすると、同じ仮名の中で最多の字体が他を潰す。
  // 平方根で均し、観測0回にも下限の重みを残して除外しない。
  assert.match(html, /const AUTO_WEIGHT_FLOOR=2;/);
  assert.match(html, /return Math\.sqrt\(Math\.max\(0,entry\?\.totalObserved\|\|0\)\)\+AUTO_WEIGHT_FLOOR;/);
  assert.match(html, /function pickWeighted\(list\)\{/);
  assert.match(html, /const e=pickWeighted\(choices\);/);
  // 一様抽選は残っていない。
  assert.doesNotMatch(html, /choices\[Math\.floor\(Math\.random\(\)\*choices\.length\)\]/);
});

test("vintage-kana weights quiz questions by frequency without excluding anything", () => {
  // 出題も頻度で重み付けする。一様だと観測0回の字が出題の約半分を占めていた。
  assert.match(html, /quizEntry=pickQuizWeighted\(poolForQuestion\);/);
  assert.doesNotMatch(html, /poolForQuestion\[Math\.floor\(Math\.random\(\)\*poolForQuestion\.length\)\]/);
  assert.match(html, /const QUIZ_WEIGHT_EXPONENT_MAX=0\.5;/);
  assert.match(html, /return Math\.pow\(Math\.max\(0,entry\?\.totalObserved\|\|0\),exponent\)\+AUTO_WEIGHT_FLOOR;/);
  assert.match(html, /const exponent=QUIZ_WEIGHT_EXPONENT_MAX\*\(1-quizFrequencyProgress\(\)\);/);
});

test("vintage-kana quiz shifts toward rare glyphs as mastery grows", () => {
  // 習熟の進み具合 0→1 で、観測0回の字の出題割合が単調に増え、どの段階でも0にならない。
  const FLOOR = 2;
  const glyphs = glyphMaster.glyphs as { totalObserved: number }[];
  const zeroShare = (progress: number) => {
    const exponent = 0.5 * (1 - progress);
    const w = (g: { totalObserved: number }) => Math.pow(Math.max(0, g.totalObserved || 0), exponent) + FLOOR;
    const total = glyphs.reduce((sum, g) => sum + w(g), 0);
    return glyphs.filter((g) => !g.totalObserved).reduce((sum, g) => sum + w(g), 0) / total;
  };
  const shares = [0, 0.25, 0.5, 0.75, 1].map(zeroShare);
  for (let i = 1; i < shares.length; i++) assert.ok(shares[i] > shares[i - 1], "逓増していない: " + shares.join(", "));
  assert.ok(shares[0] > 0.05 && shares[0] < 0.2, "初学者でも珍しい字は少しは出る: " + shares[0]);
  // 全部習熟すると一様になる。
  const zeroCount = glyphs.filter((g) => !g.totalObserved).length;
  assert.ok(Math.abs(shares[4] - zeroCount / glyphs.length) < 1e-9);
});

test("vintage-kana frequency weighting keeps rare glyphs reachable", () => {
  // 実データで、最多の字体が独占せず、最少の字体も出ることを確かめる。
  const FLOOR = 2;
  const weight = (n: number) => Math.sqrt(Math.max(0, n)) + FLOOR;
  const ru = glyphMaster.glyphs.filter((g: { kana: string }) => g.kana === "る");
  assert.ok(ru.length >= 2);
  const total = ru.reduce((sum: number, g: { totalObserved: number }) => sum + weight(g.totalObserved), 0);
  const share = (g: { totalObserved: number }) => weight(g.totalObserved) / total;
  const top = Math.max(...ru.map(share));
  const bottom = Math.min(...ru.map(share));
  assert.ok(top < 0.7, "最多の字体が独占していない: " + top);
  assert.ok(bottom > 0.02, "最少の字体も出る: " + bottom);
  // 観測0回でも到達できる。
  assert.ok(weight(0) > 0);
});

test("vintage-kana honours newlines in the preview", () => {
  // 改行を枠で包むと空白に潰れ、画像だけ改行されて画面と食い違う。
  assert.match(html, /if\(ch==="\\n"\) return "<br>";/);
  // 保存PNG側は以前から改行で行・列を切っている。
  assert.match(html, /if\(token\.text==="\\n"\)\{lines\.push\(\[\]\)/);
  assert.match(html, /if\(token\.text==="\\n"\)\{columns\.push\(\[\]\)/);
});

