import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../vintage-kana/index.html", import.meta.url), "utf8");

test("vintage-kana install guide detects a standalone launch", () => {
  assert.match(html, /display-mode: standalone/);
  assert.match(html, /navigator\.standalone===true/);
});

test("vintage-kana install guide shows iOS wording with an inline share icon", () => {
  assert.match(html, /共有ボタン.*からホーム画面に追加すると、アプリとして扱えます/);
  assert.match(html, /role="img" aria-label="共有"/);
  assert.match(html, /installGuide__icon\{height:1em;width:1em/);
});

test("vintage-kana install guide falls back to the browser-menu wording", () => {
  assert.match(html, /ブラウザのメニューから「ホーム画面に追加」を選ぶと、アプリとして扱えます/);
});

test("vintage-kana install guide wires beforeinstallprompt to a button", () => {
  assert.match(html, /addEventListener\("beforeinstallprompt"/);
  assert.match(html, /installPromptEvent\.prompt\(\)/);
  assert.match(html, /id="installGuideAction" class="installGuide__btn" type="button" hidden>ホーム画面に追加する/);
});

test("vintage-kana install guide remembers dismissal under its own key", () => {
  assert.match(html, /const INSTALL_NOTICE_KEY="vintageKanaInstallNoticeDismissed";/);
  assert.match(html, /window\.localStorage\.setItem\(INSTALL_NOTICE_KEY,"true"\)/);
  assert.match(html, /window\.localStorage\.getItem\(INSTALL_NOTICE_KEY\)==="true"/);
});

test("vintage-kana install guide clears itself on appinstalled and does not move existing layout", () => {
  assert.match(html, /addEventListener\("appinstalled",dismissInstallGuide\)/);
  // 案内はfooterの直前、カード一覧・入力欄・操作ボタンより後ろに置く。
  assert.match(html, /id="installGuide" class="installGuide" hidden>[\s\S]*?<footer>/);
  assert.match(html, /id="cards" class="cards">[\s\S]*<\/div>[\s\S]*id="installGuide"/);
});
