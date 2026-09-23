#!/usr/bin/env node
// 国立国語研究所「学術情報交換用変体仮名」公式一覧の取得と突合。
//
//   node tools/ninjal-catalog/index.mjs            現行カタログの自己検査と差分レポート（通信しない）
//   node tools/ninjal-catalog/index.mjs --fetch    公式サイトから再取得してカタログを書き直す
//   node tools/ninjal-catalog/index.mjs --verify   再取得して、現行カタログとの差を検出する（差があれば exit 1）
//
// --fetch / --verify は cid.ninjal.ac.jp へ1回だけHTTPアクセスする。CIには入れない。
// 一覧ページは Next.js のSSGで、全行が __NEXT_DATA__ に埋まっているため、
// HTMLのスクレイピングではなくそのJSONを読む。ページ分割も追加リクエストも要らない。

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const LIST_URL = "https://cid.ninjal.ac.jp/kana/list/";
const DETAIL_BASE = "https://cid.ninjal.ac.jp/kana/detail/";
const IMAGE_BASE = "https://cid.ninjal.ac.jp/kana/images/kana/";

const root = new URL("../../", import.meta.url);
const CATALOG = new URL("vintage-kana/data/ninjal-glyph-catalog.json", root);
const UI_MASTER = new URL("vintage-kana/data/ui-glyph-master.json", root);

/** 公式一覧ページの __NEXT_DATA__ から素の行を取り出す。 */
async function fetchRows() {
  const res = await fetch(LIST_URL, { headers: { "user-agent": "koten-vintage-kana-audit/1.0" } });
  if (!res.ok) throw new Error(`一覧ページの取得に失敗: ${res.status}`);
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("__NEXT_DATA__ が見つからない。ページ構造が変わった可能性がある。");
  const rows = JSON.parse(m[1])?.props?.pageProps?.hgList;
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("hgList が空。ページ構造が変わった可能性がある。");
  return rows;
}

/** 公式の素の行を、このリポジトリのカタログ形式へ写す。 */
function toCatalog(rows) {
  const glyphs = rows.map((r) => {
    const cp = r.ucs?.trim() ? Number.parseInt(r.ucs, 16) : null;
    return {
      ninjal_id: r.id,
      kana: r.kana,
      jibo: r.jibo,
      unicode: cp === null ? null : `U+${cp.toString(16).toUpperCase().padStart(5, "0")}`,
      code_point: cp,
      character: cp === null ? null : String.fromCodePoint(cp),
      mj_glyph_name: r.mj?.trim() ? r.mj : null,
      notes: r.note?.trim() ? r.note : null,
      renderability: cp === null ? "non-unicode" : "unicode-text",
      // 公式ページ上の字形画像。著作権は国立国語研究所にあり、複製・再配布はしない。参照専用。
      official_image_url: `${IMAGE_BASE}${r.id}.webp`,
      source_url: `${DETAIL_BASE}${r.id}/`,
      // 凡例 https://cid.ninjal.ac.jp/kana/usage/ の「見える字体に○」欄。
      attestations: {
        tebiki: r.tebiki, jiten: r.jiten, myoseki: r.myoseki, renmen: r.renmen, yorei: r.yorei,
        seiko: r.seiko, nakanishi: r.nakanishi, tsukiji: r.tsukiji,
        text1892: r.text1892, text1894: r.text1894,
      },
    };
  });
  glyphs.sort((a, b) => a.ninjal_id.localeCompare(b.ninjal_id));
  const withUnicode = glyphs.filter((g) => g.unicode !== null);
  return {
    schemaVersion: 1,
    status: "official-catalog",
    description:
      "国立国語研究所「学術情報交換用変体仮名」公開一覧の全件写し。実資料の出現頻度は含めない。"
      + "頻度の正本は glyph-distribution*.json、UI用の観測subsetは ui-glyph-master.json。",
    source: { name: "学術情報交換用変体仮名（国立国語研究所）", list_url: LIST_URL, legend_url: "https://cid.ninjal.ac.jp/kana/usage/", policy_url: "https://www.ninjal.ac.jp/utility/policy/" },
    license_note:
      "本ファイルは公式一覧の書誌的事実（番号・仮名・字母・符号位置・MJ名・備考）のみを写したもの。"
      + "公式ページの字形画像は国立国語研究所に著作権があり、再配布しないため取得も保存もしていない。",
    retrievedAt: new Date().toISOString().slice(0, 10),
    counts: {
      total: glyphs.length,
      withUnicode: withUnicode.length,
      withoutUnicode: glyphs.length - withUnicode.length,
      distinctKana: new Set(glyphs.map((g) => g.kana)).size,
      distinctJibo: new Set(glyphs.map((g) => g.kana + g.jibo)).size,
    },
    glyphs,
  };
}

const readJson = (url) => JSON.parse(readFileSync(url, "utf8"));

/** 公式カタログと現行UIキャッシュ(138字)を全件突合する。 */
export function diff(catalog, uiMaster) {
  const byUnicode = new Map(catalog.glyphs.filter((g) => g.unicode).map((g) => [g.unicode, g]));
  const out = {
    exactMatch: [], kanaMismatch: [], jiboMismatch: [], characterMismatch: [],
    currentCacheOnly: [], officialMissingFromCache: [],
  };
  for (const ui of uiMaster.glyphs) {
    const off = byUnicode.get(ui.glyph_id);
    if (!off) { out.currentCacheOnly.push(ui); continue; }
    const kanaOk = off.kana === ui.kana;
    const jiboOk = off.jibo === ui.jibo;
    const charOk = off.character === ui.character;
    if (!kanaOk) out.kanaMismatch.push({ glyph_id: ui.glyph_id, ui: ui.kana, official: off.kana });
    if (!jiboOk) out.jiboMismatch.push({ glyph_id: ui.glyph_id, ui: ui.jibo, official: off.jibo });
    if (!charOk) out.characterMismatch.push({ glyph_id: ui.glyph_id, ui: ui.character, official: off.character });
    if (kanaOk && jiboOk && charOk) out.exactMatch.push(ui.glyph_id);
  }
  const inCache = new Set(uiMaster.glyphs.map((g) => g.glyph_id));
  out.officialMissingFromCache = catalog.glyphs.filter((g) => !g.unicode || !inCache.has(g.unicode));
  return out;
}

/** カタログ自身の整合（重複・符号位置と文字の一致など）を検査する。 */
export function selfCheck(catalog) {
  const problems = [];
  const ids = new Set(), unis = new Set(), chars = new Set();
  for (const g of catalog.glyphs) {
    if (ids.has(g.ninjal_id)) problems.push(`ninjal_id 重複: ${g.ninjal_id}`);
    ids.add(g.ninjal_id);
    if (g.unicode === null) {
      if (g.character !== null) problems.push(`${g.ninjal_id}: Unicode未付与なのに character がある`);
      if (g.renderability !== "non-unicode") problems.push(`${g.ninjal_id}: renderability が non-unicode でない`);
      continue;
    }
    if (unis.has(g.unicode)) problems.push(`unicode 重複: ${g.unicode}`);
    unis.add(g.unicode);
    if (chars.has(g.character)) problems.push(`character 重複: ${g.character}`);
    chars.add(g.character);
    if (String.fromCodePoint(g.code_point) !== g.character) problems.push(`${g.ninjal_id}: code_point と character が食い違う`);
    if (`U+${g.code_point.toString(16).toUpperCase().padStart(5, "0")}` !== g.unicode) problems.push(`${g.ninjal_id}: unicode 表記と code_point が食い違う`);
  }
  return problems;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--fetch") || argv.includes("--verify")) {
    const fresh = toCatalog(await fetchRows());
    if (argv.includes("--fetch")) {
      writeFileSync(CATALOG, `${JSON.stringify(fresh, null, 2)}\n`);
      console.log(`書き出した: ${fileURLToPath(CATALOG)} (${fresh.counts.total}件)`);
      return;
    }
    const current = readJson(CATALOG);
    const strip = (c) => JSON.stringify({ ...c, retrievedAt: null }, null, 2);
    if (strip(fresh) !== strip(current)) {
      console.error("公式一覧が、コミット済みカタログと食い違う。--fetch で更新して差分を確認すること。");
      console.error(`  公式 ${fresh.counts.total}件 / 手元 ${current.counts.total}件`);
      process.exitCode = 1;
      return;
    }
    console.log(`公式一覧と一致 (${fresh.counts.total}件)`);
    return;
  }

  const catalog = readJson(CATALOG);
  const problems = selfCheck(catalog);
  for (const p of problems) console.error(`NG ${p}`);
  const d = diff(catalog, readJson(UI_MASTER));
  console.log(JSON.stringify({
    counts: catalog.counts,
    exactMatch: d.exactMatch.length,
    kanaMismatch: d.kanaMismatch,
    jiboMismatch: d.jiboMismatch,
    characterMismatch: d.characterMismatch,
    currentCacheOnly: d.currentCacheOnly.map((g) => `${g.glyph_id} ${g.kana}/${g.jibo}`),
    officialMissingFromCache: d.officialMissingFromCache.length,
  }, null, 2));
  if (problems.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.filename === realpathSync(process.argv[1])) {
  await main();
}
