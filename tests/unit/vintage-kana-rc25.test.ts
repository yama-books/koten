import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../vintage-kana/index.html", import.meta.url), "utf8");
const glyphMaster = JSON.parse(readFileSync(new URL("../../vintage-kana/data/ui-glyph-master.json", import.meta.url), "utf8"));

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
  assert.match(html, /const valid=allKanaForms\(\)\.filter\(f=>f\.character!==entry\.character && f\.jibo!==entry\.jibo\)/);
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
  assert.match(html, /"glyph_id":"U\+1B10C","character":"𛄌","jibo":"王","totalObserved":353,"witnessCount":12,"inOfficialCatalog":false/);
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

test("vintage-kana help dialog puts furigana on 字母 without changing the line rhythm", () => {
  assert.match(html, /<h3><ruby>字<rt>じ<\/rt><\/ruby><ruby>母<rt>ぼ<\/rt><\/ruby>とは？<\/h3>/);
  // ルビを絶対配置で行boxの外へ出す。行送りが見出しごとに変わらない。
  assert.match(html, /\.helpBody h3\{font-size:13px;margin:6px 0 4px;line-height:1\.85\}/);
  assert.match(html, /\.helpBody h3 ruby\{position:relative\}/);
  assert.match(html, /\.helpBody h3 rt\{position:absolute;left:0;right:0;bottom:calc\(100% - 2px\);/);
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
  assert.match(html, /compare:\[\{character:"を",label:"現代の「を」",modern:true\},\{character:"𛄜",label:"を／遠"\}\]/);
  // を／越 には現代の「せ」。
  assert.match(html, /compare:\[\{character:"せ",label:"現代の「せ」",modern:true\}\]/);
  // を／遠 には現代の「を」と、紛らわしい せ／世。
  assert.match(html, /compare:\[\{character:"を",label:"現代の「を」",modern:true\},\{character:"𛁒",label:"せ／世"\}\]/);

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
