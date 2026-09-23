import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../vintage-kana/index.html", import.meta.url), "utf8");
// 文面の折り返し位置は <wbr> で指定している。文言の照合では取り除いて読む。
const plain = html.replace(/<wbr>/g, "");

test("vintage-kana install guide detects a standalone launch", () => {
  assert.match(html, /display-mode: standalone/);
  assert.match(html, /navigator\.standalone===true/);
});

test("vintage-kana install guide shows iOS wording with an inline share icon", () => {
  assert.match(plain, /共有ボタン.*からホーム画面に追加すると、アプリとして扱えます/);
  assert.match(html, /role="img" aria-label="共有"/);
  assert.match(html, /installGuide__icon\{height:1em;width:1em/);
});

test("vintage-kana install guide falls back to the browser-menu wording", () => {
  assert.match(plain, /メニューの「ホーム画面に追加」でアプリとして扱えます/);
});

test("vintage-kana install guide has no close button and uses balanced padding, breaking lines only at phrases", () => {
  // ×ボタンは撤廃し、左右対称のpaddingに戻した。文は文節の切れ目（<wbr>）だけで折り返す。
  assert.match(html, /\.installGuide\{position:relative;[^}]*padding:10px 12px/);
  assert.doesNotMatch(html, /installGuide__close/);
  assert.doesNotMatch(html, />×<\/button>/);
  assert.match(html, /\.installGuide__text\{margin:0;word-break:keep-all;overflow-wrap:anywhere\}/);
  assert.match(html, /アプリとして<wbr>扱えます/);
});

test("vintage-kana install guide shows two buttons: dismiss-for-now and never-show-again", () => {
  assert.match(html, /id="installGuideLater" class="installGuide__btn" type="button">今は追加しない<\/button>/);
  assert.match(html, /id="installGuideNever" class="installGuide__btn" type="button">今後は表示しない<\/button>/);
});

test("vintage-kana install guide wires beforeinstallprompt to a prominent add button", () => {
  assert.match(html, /addEventListener\("beforeinstallprompt"/);
  assert.match(html, /id="installGuideAction" class="installGuide__btn installGuide__btn--primary" type="button" hidden>ホーム画面に追加する/);
});

test("vintage-kana install guide writes the two dismissals to different storages", () => {
  // 「今は追加しない」はセッションのみ、「今後は表示しない」は永続。
  assert.match(html, /const INSTALL_NOTICE_KEY="vintageKanaInstallNoticeDismissed";/);
  assert.match(html, /const INSTALL_NOTICE_SESSION_KEY="vintageKanaInstallNoticeSessionHidden";/);
  assert.match(html, /window\.localStorage\.setItem\(INSTALL_NOTICE_KEY,"true"\)/);
  assert.match(html, /window\.localStorage\.getItem\(INSTALL_NOTICE_KEY\)==="true"/);
  assert.match(html, /window\.sessionStorage\.setItem\(INSTALL_NOTICE_SESSION_KEY,"true"\)/);
  assert.match(html, /window\.sessionStorage\.getItem\(INSTALL_NOTICE_SESSION_KEY\)==="true"/);
  assert.match(html, /getElementById\("installGuideLater"\)\?\.addEventListener\("click",dismissInstallGuideForSession\)/);
  assert.match(html, /getElementById\("installGuideNever"\)\?\.addEventListener\("click",dismissInstallGuidePermanently\)/);
});

test("vintage-kana install guide storage access is wrapped in try/catch for private browsing", () => {
  assert.match(html, /function rememberInstallNoticeDismissal\(\)\{\s*try\{window\.localStorage\.setItem/);
  assert.match(html, /function installNoticeWasDismissed\(\)\{\s*try\{return window\.localStorage\.getItem/);
  assert.match(html, /function rememberInstallNoticeSessionHidden\(\)\{\s*try\{window\.sessionStorage\.setItem/);
  assert.match(html, /function installNoticeWasSessionHidden\(\)\{\s*try\{return window\.sessionStorage\.getItem/);
});

test("vintage-kana install guide treats the native prompt outcome correctly and cannot re-fire prompt()", () => {
  // accepted -> 永続非表示、dismissed -> セッション非表示。prompt()を使い切ったら null にして再利用しない。
  assert.match(html, /const event=installPromptEvent;/);
  assert.match(html, /installPromptEvent=null;/);
  assert.match(html, /await event\.prompt\(\);/);
  assert.match(html, /const choice=await event\.userChoice;/);
  assert.match(html, /choice\?\.outcome==="accepted"/);
  assert.match(html, /dismissInstallGuidePermanently\(\);/);
  assert.match(html, /dismissInstallGuideForSession\(\);/);
});

test("vintage-kana install guide clears itself on appinstalled and does not move existing layout", () => {
  assert.match(html, /addEventListener\("appinstalled",dismissInstallGuidePermanently\)/);
  // 案内はfooterの直前、カード一覧・入力欄・操作ボタンより後ろに置く。
  assert.match(html, /id="installGuide" class="installGuide" hidden>[\s\S]*?<footer>/);
  assert.match(html, /id="cards" class="cards">[\s\S]*<\/div>[\s\S]*id="installGuide"/);
});

test("vintage-kana install guide fits one line on phones and row buttons share one width", () => {
  // 390px 幅で iOS の文面が1行に収まる大きさ。行ボタンは「ん」も2文字分の幅にそろえる。
  assert.match(html, /\.installGuide\{[^}]*padding:10px 12px;[^}]*font-size:10px;/);
  assert.match(html, /\.kanaFilterAll \.kanaBtn\{min-width:calc\(2em \+ 10px\)\}/);
});

