# 発注075 検収書

- 作成：2026-09-07。**実装担当が書いた引き継ぎである。検収者はこの文書の数値を信用せず、必ず再実行すること。**
- **基準線は commit `6ff4b5c3256f169b11b5129236621278ca9847fb`。** 実装は commit していない作業ツリーの差分である。
- 実際に使用したモデル：**Claude Opus 5（`claude-opus-5`）**、Claude Code デスクトップ版。
  推論強度はセッション側の設定で、実装担当からは値を読み取れない。**発注書が推奨した Sonnet medium ではない。**
- `git commit` / `git push` / 公開はしていない（発注075 §6）。

---

## 0. 検収者の立場

- **直さない。測る。** 赤が出たら直さずに記録して止まる。
- **下の数値は「実装担当がそう主張している」だけである。** 再実行して自分で数える。
- **想定外の差分は、消す前に誰が書いたか確かめる。**
- **検収の最中、実装担当は作業ツリーに書かない。**

---

## 1. 何が終わって、何が終わっていないか

**発注075 §3 の表示仕様と §5 の受入条件は、下記 §7 の1件を除いて満たしている。**

満たしていない1件は **文字200%での `.nav-edge`（ホームへ戻る）と歌一覧のメーター行の横切れ**で、
**基準線でも同じ画素数で起きている既存の状態**であり、075 の変更が作ったものではない（§4 で前後を並べた）。
直すには全画面共有の `.nav-edge` と共有部品 `.mastery-meter` を触る必要があり、
発注075 §4「共通スタイルを全画面一括変更しない」・§6 停止条件に当たるため**着手していない**。

---

## 2. 差分の範囲（**これ以外に差分があれば異常**）

```bash
git status --short
git diff --stat
```

**製品コード 2 件・試験 1 件・文書 1 件（本書）だけであること。**

| ファイル | 内容 |
| --- | --- |
| `packages/hyakunin/src/ui/screens/Result.tsx` | 表示順序の変更と `details` の追加 |
| `packages/hyakunin/src/styles.css` | 結果画面に限定した規則の追加（`.result-details` 系・`.result-actions` 系・`.result-subheading`）と、`.result-summary h2` の余白 |
| `tests/screen/result.test.tsx` | 075 の受入条件を釘打つ試験 12 件の追加と、074 の 2 件の置換 |
| `docs/CODEX_WORK_ORDER_075_ACCEPTANCE.md` | 本書（新規） |

`domain/result.ts`・`main.tsx`・他画面・データ・生成物は**1バイトも触っていない**。
起草前から存在する `.claude/settings.local.json` と、`docs/CODEX_WORK_ORDER_075.md` /
`076.md`（発注書そのもの）には触れていない。

---

## 3. 実装した表示（発注075 §3 との対応）

結果画面の DOM 順と視覚順は次で一致する。`order` による並べ替えは使っていない。

1. ヘッダー →「今回の結果」（対象範囲・問題数・全問正答の花丸・**内訳**）
2. 「次の操作」（再確認ボタン＋説明、「同じ範囲をもう一度」＋説明）
3. 「次に確認する」（おすすめがある回のみ）
4. `<details class="result-details">`（**初期状態は閉じ**、`summary` は「学習記録の詳細」）
   → 注記 →「習熟度の変化」→「歌ごとの状態」

### 発注書が明示的に変更を指示した既存裁定（2件）

| 変更 | 前 | 後 | 根拠 |
| --- | --- | --- | --- |
| 再確認の説明 | 「まちがえた歌の同じ空欄で、{n}問くりかえし練習します。」 | 「答えを見た問題・正答にならなかった問題を、同じ出題内容で{n}問くりかえし練習します。」 | 発注075 §1（074 工程13 の「同じ空欄」は作者問題を含む再確認の説明として狭い） |
| おすすめの表記 | 「4（習熟度 0%）」 | 「4番」＋理由 | 発注075 §3-3（習熟度%を併記しない） |

対応して `tests/screen/result.test.tsx` の既存2件を置換した。**件数・問題ID・二件数の弁別は落としていない**
（074-13 は「1問／3問」を出し分ける形のまま残している）。D-55 のボタン名「まちがえた歌だけをもう一度」、
D-57 の整数メーター、057 R5 の小数第1位表示、069 M-9 の `practice-choice` 2件は維持。

### 発注書が決めていなかった判断（1件）

「内訳は簡潔に配置する」（§3-1）の解釈として、**内訳を独立 section から「今回の結果」の中へたたんだ**。
区切り線1本と上下 `--space-lg` の余白が減り、その分だけ操作が上がる。見出し `内訳` と `aria-labelledby` は残した。

---

## 4. 実描画の測定

- 測り方：`vite preview` の**ビルド済み `dist`** に Playwright（Chromium・headless）で入り、
  ホーム →「とりあえず始める」→ **8問すべて「わからない！」**→「結果を見る」。
- 座標は**文書座標**（`getBoundingClientRect` + `scrollX/Y`）、フォント読み込み後、単位は CSS px。
- 文字拡大は既存 `check:overflow` と同じ方式（`document.documentElement.style.fontSize = '32px'`）。
- viewport 高は 812px 固定。**計測スクリプトは §9 に全文を載せた。**
- 変更前の測定は、`Result.tsx` と `styles.css` だけを基準線へ戻して**ビルドし直して**から採った
  （`dist` を作り直さずに測ると、新しい要素を1度も見ずに緑になる）。

### 4-1. 結果画面の高さと再練習ボタン（前 → 後）

「同じ範囲」「まちがえた歌」の x / 幅 / 高さは**後**の値。開いた高さは詳細を開いた状態のページ高。

| fixture | 幅 | 文字 | 高さ前 | 高さ後 | 同じ範囲 y 前 | 同じ範囲 y 後 | 同じ範囲 x/幅/高 | まちがえた y 後 | まちがえた x/幅/高 | 開いた高さ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10首 | 320 | 100% | 2107 | 980 | 1982.03 | 584.44 | 16 / 288 / 44 | 479.5 | 16 / 288 / 44 | 2192 |
| 10首 | 320 | 200% | 6612 | 2915 | 6366.36 | 1816.09 | 32 / 256 / 136.38 | 1383.84 | 32 / 256 / 187.56 | 7224 |
| 10首 | 375 | 100% | 1884 | 980 | 1760 | 584.44 | 16 / 343 / 44 | 479.5 | 16 / 343 / 44 | 1990 |
| 10首 | 375 | 200% | 5870 | 2579 | 5624.09 | 1672.78 | 32 / 311 / 136.38 | 1332.66 | 32 / 311 / 136.38 | 6325 |
| 10首 | 414 | 100% | 1884 | 980 | 1760 | 584.44 | 16 / 382 / 44 | 479.5 | 16 / 382 / 44 | 1990 |
| 10首 | 414 | 200% | 5768 | 2477 | 5521.7 | 1570.39 | 32 / 350 / 136.38 | 1230.27 | 32 / 350 / 136.38 | 6182 |
| 10首 | 768 | 100% | 1742 | 838 | 1617.47 | 421.44 | 392 / 360 / 54.23 | 421.44 | 16 / 360 / 44 | 1827 |
| 10首 | 768 | 200% | 3621 | 1893 | 3334.33 | 955.2 | 400 / 336 / 177.31 | 955.2 | 32 / 336 / 136.38 | 3903 |
| 10首 | 1024 | 100% | 1742 | 838 | 1617.47 | 421.44 | 520 / 472 / 54.23 | 421.44 | 32 / 472 / 44 | 1827 |
| 10首 | 1024 | 200% | 3621 | 1852 | 3334.33 | 955.2 | 528 / 464 / 151.72 | 955.2 | 32 / 464 / 136.38 | 3862 |
| 100首 | 320 | 100% | 5725 | 980 | 5600.63 | 584.44 | 16 / 288 / 44 | 479.5 | 16 / 288 / 44 | 5811 |
| 100首 | 320 | 200% | 20642 | 2915 | 20395.86 | 1816.09 | 32 / 256 / 136.38 | 1383.84 | 32 / 256 / 187.56 | 21253 |
| 100首 | 375 | 100% | 5268 | 980 | 5143.44 | 584.44 | 16 / 343 / 44 | 479.5 | 16 / 343 / 44 | 5374 |
| 100首 | 375 | 200% | 21934 | 2579 | 21688.34 | 1672.78 | 32 / 311 / 136.38 | 1332.66 | 32 / 311 / 136.38 | 22390 |
| 100首 | 414 | 100% | 5268 | 980 | 5143.44 | 584.44 | 16 / 382 / 44 | 479.5 | 16 / 382 / 44 | 5374 |
| 100首 | 414 | 200% | 23457 | 2477 | 23211.2 | 1570.39 | 32 / 350 / 136.38 | 1230.27 | 32 / 350 / 136.38 | 23872 |
| 100首 | 768 | 100% | 5125 | 838 | 5000.91 | 421.44 | 392 / 360 / 54.23 | 421.44 | 16 / 360 / 44 | 5211 |
| 100首 | 768 | 200% | 10388 | 1893 | 10101.2 | 955.2 | 400 / 336 / 177.31 | 955.2 | 32 / 336 / 136.38 | 10669 |
| 100首 | 1024 | 100% | 5125 | 838 | 5000.91 | 421.44 | 520 / 472 / 54.23 | 421.44 | 32 / 472 / 44 | 5211 |
| 100首 | 1024 | 200% | 10052 | 1852 | 9764.45 | 955.2 | 528 / 464 / 151.72 | 955.2 | 32 / 464 / 136.38 | 10292 |

**基準線 375px・文字100%・100首は、ページ高 5268 / 上端 5143.44 で、発注書 §1 が引いた公開版の参考値
（5268px / 5143.44px）と一致した。** 測り方が監査時と同じであることの確認になる。

### 4-2. 「首数を増やしても操作の上端が押し下がらない」

同じ内訳（閲覧8問・正答0・△0・誤答0）・同じ問題数で、10首 fixture と 100首 fixture を比べた。

| 幅 / 文字 | 同じ範囲 Δy/Δx/Δ高/Δ幅 | まちがえた Δ | ページ高 Δ | 詳細内の首（10首 / 100首） | 開いた高さ（10首 / 100首） |
| --- | --- | --- | --- | --- | --- |
| 320 / 100% | 0.00 / 0.00 / 0.00 / 0.00 | 同上 0.00 | 0 | 10 / 100 | 2192 / 5811 |
| 320 / 200% | 0.00 | 0.00 | 0 | 10 / 100 | 7224 / 21253 |
| 375 / 100% | 0.00 | 0.00 | 0 | 10 / 100 | 1990 / 5374 |
| 375 / 200% | 0.00 | 0.00 | 0 | 10 / 100 | 6325 / 22390 |
| 414 / 100% | 0.00 | 0.00 | 0 | 10 / 100 | 1990 / 5374 |
| 414 / 200% | 0.00 | 0.00 | 0 | 10 / 100 | 6182 / 23872 |
| 768 / 100% | 0.00 | 0.00 | 0 | 10 / 100 | 1827 / 5211 |
| 768 / 200% | 0.00 | 0.00 | 0 | 10 / 100 | 3903 / 10669 |
| 1024 / 100% | 0.00 | 0.00 | 0 | 10 / 100 | 1827 / 5211 |
| 1024 / 200% | 0.00 | 0.00 | 0 | 10 / 100 | 3862 / 10292 |

**差はすべて 0.00 CSS px（条件は1px以内）。**
**この比較は退化していない**——同じ回で「詳細内の首」が 10 と 100、開いた高さが 1990 と 5374 と分かれている。
**中身は確かに 10 倍違い、閉じている限り操作の位置は 1 画素も動かない。**

### 4-3. その他の受入条件（測定値）

| 条件 | 結果 |
| --- | --- |
| 詳細が初期状態で閉じている | 全20件 `details.open === false` |
| 再練習操作が詳細の外にある | 全20件 `details.contains(button) === false` |
| 「次の操作」が詳細より前 | 全20件 文書順で先行 |
| `summary` の文言 | 全20件「学習記録の詳細」 |
| 375×812・文字100%で両方のボタン全体が初期表示に入る | 10首・100首とも `true`（説明の切り捨て・書体縮小なし） |
| ボタンのタップ領域 | 最小 44px（`summary` は 44 / 64 / 128px） |
| 詳細を開いても操作が残る | 全20件で高さ 44px 以上のまま |
| 詳細を開くと歌一覧が読める | 10首→10件、100首→100件 |
| ページの横あふれ | 全20件 0 |

---

## 5. 検査の実行結果（**転記ではなく今回の実行値**）

| コマンド | 結果 |
| --- | --- |
| `npx vitest run tests/screen/result.test.tsx` | **36 passed (36)** |
| `npm test` | node **pass 530 / fail 0**、screen **24 files / 277 passed** |
| `npm run typecheck` | エラーなし（終了 0） |
| `npm run build` | 成功（結果画面の変更後に作り直し済み） |
| `npm run check:overflow` | **合計 1800 件、合格 1800 件、不合格 0 件** |
| `npm run check:eol` | 走査 1115 件、違反 0 件 |

**注意（被覆の穴）**：`check:overflow` は**結果画面へ一度も入っていない**。
1800 件は閲覧画面の歌で、他は ホーム／初回設定／出題／本番出題／作者／復元／057の開示／本番採点一覧／本番範囲選択である。
**結果画面の実描画を見ている検査は、この検収の §9 のスクリプトだけで、リポジトリの中には無い。**
`tools/overflow-check/index.ts` は発注075 §4 の変更可に入っていないため、走査の追加はしていない。**後続の候補として残す。**

---

## 6. 破壊試験（釘が効いているか）

`Result.tsx` を1か所ずつ壊し、**そのつど `result.test.tsx` を完走させて**赤の内訳を数えた。
破壊後は毎回 `cp` で復元している。置換が0件の破壊は「当たっていない」として扱う。

| # | 破壊 | 結果 | 赤くなった試験 |
| --- | --- | --- | --- |
| M0 | 破壊なし（自己テスト） | 36 passed | （なし） |
| M1 | 操作を詳細の後ろへ戻す | 2 failed | 順序 / 再確認0問でも操作が前 |
| M2 | 詳細を `open` で出す | **1 failed** | 詳細は初期状態で閉じている |
| M3 | 操作を詳細の中へ入れる | 4 failed | 順序 / 操作は詳細の外 / 開閉後も操作 / 再確認0問 |
| M4 | 注記を消す | **1 failed** | 詳細の中は注記・変化・歌ごとの順 |
| M5 | おすすめに習熟度%を戻す | **1 failed** | おすすめは「○番」 |
| M6 | 説明を「同じ空欄」へ戻す | 2 failed | 074-13 / 075 の説明文 |
| M7 | 詳細を入れ子にする | **1 failed** | 詳細は一段だけ |
| M8 | 操作面を `aria-hidden="true"` で隠す | **1 failed** | キーボードで両方へ到達できる |
| M9 | 常時表示に「全体平均 50%」を足す | **1 failed** | 常時表示に全体平均・達成段階を足さない |
| M10 | 操作をページ末尾へ複製する | 2 failed | 再確認ボタンは一つだけ / 末尾へ複製しない |
| M11 | 常時表示に「3日連続」を足す | **1 failed** | 常時表示に全体平均・達成段階を足さない |

M1・M3・M6・M10 が複数を赤にするのは、その破壊が実際に複数の条件を同時に破っているためである。

### 破壊試験の途中で見つけた自分の欠陥（**直した**）

- **最初の M9 は全問緑だった。** 「常時表示に全体平均を足さない」試験が、葉の判定に `childNodes.length === 0`
  を使っていたためである。文字だけの `<p>` は子ノードを 1 つ持つので走査から漏れ、**何を足しても緑になる試験だった。**
  `children.length === 0` へ直し、M9・M11 の両方が赤になることを確認した。
- **最初の破壊試験一式は `--reporter=basic` を付けており、vitest が起動時エラーで落ちていた。**
  「赤が0件」に見えていたのは検査が1件も走っていなかったからである。付け直して測り直した。
  上の表は付け直した後の値である。

---

## 7. 満たしていない条件（**基準線と同じ・075 は原因ではない**）

発注075 §5「幅320〜1024・文字100%/200%で横切れを生じない」のうち、**文字200%の2か所が残っている。**
測定は「切れている要素とその画素数」を前後で並べたもので、**集合も画素数も完全に一致する。**

| 幅 / 文字 | 変更前 | 変更後 |
| --- | --- | --- |
| 320 / 200% | nav-edge:47, BUTTON:48, **practice-choices:193, practice-choice:65, BUTTON:66**, result-section:12, result-poems:12 | nav-edge:47, BUTTON:48, result-section:12, result-poems:12 |
| 375 / 200% | nav-edge:9, BUTTON:10, **practice-choices:138, practice-choice:65, BUTTON:66** | nav-edge:9, BUTTON:10 |
| 414 / 200% | **practice-choices:99, practice-choice:65, BUTTON:66** | （なし） |
| 768 / 200% | **practice-choices:48, practice-choice:113, BUTTON:114, practice-choice:48** | （なし） |

太字が**今回直した分**（再練習の操作面）で、結果画面に限定した3規則を足した。

- `.result-actions button { box-sizing: border-box; max-width: 100%; white-space: normal; overflow-wrap: anywhere; }`
- `.result-actions, .result-actions .practice-choice { grid-template-columns: minmax(0, 1fr); }`
- `.result-actions .primary { min-width: min(12rem, 100%); }`
  — 共有の `.primary { min-width: 12rem }` は文字200%で 384px になり、320px の器を 128px はみ出す。
  `.entry-actions .primary` が先に採った書き方と同じ形を、結果画面にも当てた。
  **40rem 以上の2列は `.practice-choices` 側が後勝ちで維持している**（768px・100% で両ボタンが同じ y=421.44 に並ぶ）。

**残っている2か所（着手していない理由）**

1. `.nav-edge` と「ホームへ戻る」（320px で 47/48px、375px で 9/10px）
   — `.nav-edge` は結果・出題・履歴・範囲選択が共有する。発注075 §4 の「共通スタイルを全画面一括変更しない」に当たる。
2. `.result-poems` の歌1行（12px、**閉じた詳細の中**）
   — 実測すると `.mastery-meter` が 240px 固定で、320px・文字200%の器（256px）に対し
   枠4px＋余白24pxの分だけ足りない。共有部品と D-57 の「既存メーターの維持」に触れる。

いずれも**基準線と同一の画素数**であり、**075 の変更で新たに生じたものではない。**
発注075 §6 の停止条件（共通スタイルへの無差別な上書きが必要になる）に従い、着手せず報告する。

---

## 8. 未確認事項

- **実機未確認。** 測定は Chromium headless のみ。iOS Safari / Android Chrome では確認していない。
  `details` の開閉と `summary` の読み上げは OS により差が出うる。
- **1024px・文字200%・100首の回だけ、8問ではなく7問で終わった。** 4回やり直しても同じ位置で再現し、
  **基準線の測定でも同じ 1024/200%/100首 だけが7問だった。** 前後で同条件なので比較は成立しているが、
  「わからない！」の保存が1件記録されないことがある可能性は残る。**075 の変更とは無関係（基準線でも同じ）。**
  結果画面の表示には現れない（内訳の数字が1違うだけで、行数も桁数も同じ）。**製品側の別件として残す。**
- **結果画面を見る実描画検査がリポジトリに無い**（§5 の注意）。今回の 0.00px は §9 のスクリプトを再実行しないと再現できない。
- 詳細を**開いた**状態での横切れ・重なりは、320px/200%の `result-poems:12` 以外は個別に測っていない。

---

## 9. 測定スクリプト（再実行用・全文）

リポジトリの外（作業用ディレクトリ）に置いて実行した。`tools/` へは置いていない（発注075 §4 の変更境界の外）。
**実行前に `npm run build` を済ませること**（`dist` を測るため）。

```bash
node measure-075.mjs after.json
```

```js
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require_ = createRequire('C:/Users/user/AI開発/koten/package.json');
const { chromium } = require_('playwright');

const repo = 'C:/Users/user/AI開発/koten';
const out = process.argv[2] ?? 'measure.json';
const port = Number(process.env.PORT_075 ?? 4181);
const baseUrl = `http://localhost:${port}/100/`;
const widths = [320, 375, 414, 768, 1024];
const zoomLevels = [1, 2];
// 10首と100首は「同じ内訳・同じ問題数」で比べる。入口は quick（8問）に固定する。
const fixtures = [{ name: '10首', from: 1, to: 10 }, { name: '100首', from: 1, to: 100 }];

const viteBin = `${repo}/node_modules/vite/bin/vite.js`;
const server = spawn(process.execPath, [viteBin, 'preview', '--port', String(port), '--strictPort'], {
  cwd: `${repo}/packages/hyakunin`, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let log = '';
server.stdout.on('data', (chunk) => { log += chunk; });
server.stderr.on('data', (chunk) => { log += chunk; });

async function waitForServer(url) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { const res = await fetch(url); if (res.ok) return; } catch { /* まだ起動していない */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`preview が起動しません: ${log}`);
}

const records = [];
try {
  await waitForServer(`${baseUrl}?from=1&to=1`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  for (const fixture of fixtures) {
    for (const width of widths) {
      for (const zoom of zoomLevels) {
       for (let attempt = 0; attempt < 4; attempt += 1) {
        await page.setViewportSize({ width, height: 812 });
        await page.goto(`${baseUrl}?from=${fixture.from}&to=${fixture.to}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(150);
        if (await page.locator('.onboarding').count()) {
          await page.getByRole('button', { name: '中一', exact: true }).click();
          await page.getByRole('button', { name: 'OK', exact: true }).click();
        }
        await page.waitForSelector('.entry-actions button');
        await page.getByRole('button', { name: 'とりあえず始める', exact: true }).click();
        // quick は確認画面を挟まず、そのまま8問の出題へ入る（main.tsx の onQuickStart）。
        await page.waitForSelector('.session');
        // 全問「わからない！」で終える。各段で表示を待たないと、閲覧が1問記録されずに 7問 になる。
        for (let step = 0; step < 40; step += 1) {
          if (await page.getByRole('button', { name: '結果を見る', exact: true }).count()) break;
          const unknown = page.getByRole('button', { name: 'わからない！', exact: true }).first();
          await unknown.waitFor({ state: 'visible' });
          await unknown.click();
          const next = page.getByRole('button', { name: '次へ', exact: true }).first();
          await next.waitFor({ state: 'visible' });
          await next.click();
          await page.waitForTimeout(80);
        }
        await page.waitForTimeout(250);
        await page.getByRole('button', { name: '結果を見る', exact: true }).click();
        await page.waitForSelector('.result-screen');
        const measured = await page.evaluate((rootFontSize) => {
          document.documentElement.style.fontSize = rootFontSize;
          document.documentElement.getBoundingClientRect();
          window.scrollTo(0, 0);
          const box = (element) => {
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            return {
              x: +(rect.x + window.scrollX).toFixed(2), y: +(rect.y + window.scrollY).toFixed(2),
              w: +rect.width.toFixed(2), h: +rect.height.toFixed(2),
            };
          };
          const named = (name) => [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === name) ?? null;
          const retrySame = named('同じ範囲をもう一度');
          const retryWeak = named('まちがえた歌だけをもう一度');
          const details = document.querySelector('details.result-details');
          const summary = details ? details.querySelector('summary') : null;
          const inViewport = (element) => {
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            return rect.top >= 0 && rect.bottom <= window.innerHeight;
          };
          const clipped = [...document.querySelectorAll('main *')]
            .filter((element) => element.scrollWidth > element.clientWidth + 1)
            .map((element) => ({ what: element.className || element.tagName, by: element.scrollWidth - element.clientWidth, text: (element.textContent || '').slice(0, 14) }));
          const summaryText = document.querySelector('.result-summary')?.textContent ?? '';
          const result = {
            pageHeight: +document.documentElement.scrollHeight.toFixed(2),
            viewportHeight: window.innerHeight,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            clipped: clipped.slice(0, 6),
            questionCount: summaryText.match(/問題数: (\d+)問/)?.[1] ?? null,
            rangeLabel: summaryText.match(/対象範囲: \d+番〜\d+番/)?.[0] ?? null,
            breakdown: [...document.querySelectorAll('.result-breakdown div')].map((row) => row.textContent),
            hasDetails: Boolean(details),
            detailsOpenInitially: details ? details.open : null,
            summaryTextOfDetails: summary ? summary.textContent : null,
            summaryBox: box(summary),
            poemsInDetails: details ? details.querySelectorAll('.result-poems li').length : null,
            poemsOnPage: document.querySelectorAll('.result-poems li').length,
            retrySame: box(retrySame),
            retryWeak: box(retryWeak),
            retrySameVisible: inViewport(retrySame),
            retryWeakVisible: inViewport(retryWeak),
            retrySameInsideDetails: retrySame && details ? details.contains(retrySame) : false,
            actionsBeforeDetails: (() => {
              const actions = document.querySelector('.result-actions');
              if (!actions || !details) return null;
              return (actions.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
            })(),
            openedPageHeight: null,
            openedRetrySame: null,
            openedPoems: null,
          };
          if (details) {
            details.open = true;
            document.documentElement.getBoundingClientRect();
            result.openedPageHeight = +document.documentElement.scrollHeight.toFixed(2);
            result.openedRetrySame = box(named('同じ範囲をもう一度'));
            result.openedPoems = details.querySelectorAll('.result-poems li').length;
            details.open = false;
          }
          document.documentElement.style.fontSize = '';
          return result;
        }, `${16 * zoom}px`);
        if (measured.questionCount !== '8' && attempt < 3) { continue; }
        records.push({ fixture: fixture.name, width, zoom, attempt, ...measured });
        break;
       }
      }
    }
  }
  await browser.close();
} finally {
  server.kill();
}
writeFileSync(out, JSON.stringify(records, null, 2));
```

変更前を測るときは `Result.tsx` と `styles.css` **だけ**を基準線へ戻し、
**`npm run build` をやり直してから**同じスクリプトを走らせる。戻した2ファイルは `cp` で復元する。

---

## 10. 後続へ送るもの

- `check:overflow` に**結果画面の走査を追加する**（本発注では `tools/` が変更境界の外だった）。
- 文字200%の `.nav-edge` と `.mastery-meter` の横切れ（全画面共通・本発注の境界外）。
- 「わからない！」の保存が 1024px/200%/100首 の回で1件記録されないことがある件（基準線でも再現・製品側）。
- 発注075 §4 が後続と明示したもの：今回の問題単位の振り返り、Historyの10番区切り、Historyへの直接遷移。

**075 だけで結果画面全体の監査項目が完了したわけではない。**
