# Codex向け発注文書 005: 百人一首・縦書きあふれ自動検査ツールの新設

発注日: 2026-08-31
階層: **Luna**（仕様・判定基準・許可依存をすべて本書で確定済み。裁定を要さない機械的実装）
優先度: 高（発注004でS-C（基盤不在）により未達となった項目の解消）
対象: `tools/overflow-check/` の新規作成と `package.json` への接続

---

## 0. 背景

発注004で `packages/hyakunin` の狭幅縦書きを修正した。コマンド検査（typecheck / lint / test 18件 / build / data:check）は
すべて終了コード0で完了済み。しかし受入条件6の「100首 × 読み3表示 × 幅4種」の自動あふれ検査は、
`tools/overflow-check` が存在せず停止条件 S-C に当たったため未達である。

本発注はその足場を新設する。**表示仕様・CSS・アプリ本体は一切変更しない。** 検査で不合格が出た場合も、
本発注では修正せず、結果を報告するだけでよい。

---

## 1. 裁定済み事項（本発注で再検討しないこと）

発注004では新規のブラウザ自動化依存の追加を禁じていた。本発注に限り、親担当が次を裁定した。

1. **`playwright` を devDependency として1件だけ追加してよい。** ほかの依存は追加しない。
2. 追加先は**リポジトリ直下の `package.json` の `devDependencies`** とする。`packages/**` には入れない。
3. 本ツールは**検査専用**であり、`packages/hyakunin` の公開バンドルへ入れてはならない。
   `src/` から本ツールを import しないこと。
4. ブラウザは **Chromium のみ**を使う。WebKit / Firefox は本発注の対象外。

---

## 2. 変更してよいファイル

```text
tools/overflow-check/**        （新規）
package.json                   （devDependencies 1件と scripts 1件の追加のみ）
package-lock.json              （上記に伴う正当な更新のみ）
```

### 絶対に変更しないファイル・領域

```text
packages/**                    （全域。CSS・TSX・生成JSONを含む）
tests/**
tools/build-data/**
tools/scan-publish/**
docs/**                        （本書を含む）
CONSTITUTION.md
一次データの .md ファイル群
.github/
```

`git commit` / `git push` をしない。既存の未コミット変更を消去・復元・上書きしない。

---

## 3. 実装仕様

### 3.1 配置と実行

- 入口: `tools/overflow-check/index.ts`
- 実行: `package.json` の scripts に `"check:overflow": "node --experimental-strip-types tools/overflow-check/index.ts"` を追加する。
  既存 scripts の書式（`node --experimental-strip-types`）に合わせること。
- 検査対象の配信元は、`packages/hyakunin` を `vite preview` で立てた静的配信とする。
  ベースパスは `/hyakunin/` である（`npx vite preview --port 4173 --strictPort` を
  `packages/hyakunin` で実行したときの実測値）。ポートは環境変数で上書きできてよいが、既定値を持つこと。
- ツールは自分でサーバを起動・終了してよい。起動できない場合は、事前に `npm run build` が必要である旨を
  終了コード1と明確なメッセージで示すこと。

### 3.2 検査マトリクス

```text
100首（cardNo 1〜100） × 読み3表示（ルビなし / 歴史的仮名遣い / 現代仮名遣い） × 幅 320 / 375 / 414 / 768 CSS px
= 1200 通り
```

各首は `?from=N&to=N` で単独表示させ、閲覧開始ボタンを押して閲覧状態に入ること。
**縦書き（既定）のみを対象とする。** 横書きは本発注の対象外。

### 3.3 各通りで記録する判定

| キー | 判定 | 不合格条件 |
|---|---|---|
| `verticalWritingMode` | 各句 `span` の computed `writing-mode` | `vertical-rl` 以外が1つでもある |
| `columnCount` | `.poem__half span` の総数 | 5 でない |
| `columnOrder` | 各 `span` の `getBoundingClientRect().left` | DOM順に対し左座標が単調減少でない（右→左でない） |
| `tallerThanWide` | 2文字以上の句の矩形 | 高さが幅以下のものがある（横書き文字列の混入） |
| `noIntraLineWrap` | `span.getClientRects().length` | 1 でないものがある |
| `noClipping` | `scrollHeight > clientHeight+1` または `scrollWidth > clientWidth+1` | 真のものがある |
| `noPageOverflow` | `documentElement.scrollWidth - clientWidth` | 1 より大きい |
| `noAuthorOverlap` | `.poem` と `.author` の矩形交差 | 交差している |

### 3.4 待機の注意（重要・実測済み）

ヘッドレス／非表示のブラウザでは **`requestAnimationFrame` が発火しないことがある**。
描画待ちに `requestAnimationFrame` を使わず、Playwright の `waitForFunction` / `waitForSelector`、
または `setTimeout` ベースの待機を使うこと。この点で1度実装が失敗している。

### 3.5 出力

- 標準出力に、合計件数・合格件数・不合格件数の要約を出す。
- 不合格がある場合は、**首番号・読み表示・幅・違反したキー・観測値**を1行ずつ出す。
  出力が長くなる場合でも先頭50件は必ず出し、残件数を明記すること。
- 不合格が1件でもあれば終了コード1、全件合格なら終了コード0とする。
- 機械可読の結果を `tools/overflow-check/last-run.json` へ書いてよい。書く場合は
  リポジトリ直下の `.gitignore` に1行追加してよい（`.gitignore` はこの1行追加に限り変更を許可する）。
- **画像・スクリーンショット・ローカル絶対パス・内部資料名を出力やコードへ入れない。**

### 3.6 実行時間

1200通りの全数検査が現実的な時間で終わらない場合、**ページ再読み込みを首ごとに1回だけにする**、
幅と読み表示の切替はページ内操作で行う、といった最適化をしてよい。
検査項目を削って速くしてはならない。全数が終わらないときは §5 の停止条件に従う。

---

## 4. 受入条件

1. `npm run check:overflow` が単独で実行でき、上記1200通りを検査して要約と終了コードを返す。
2. §3.3 の8項目すべてを実際に computed style と矩形から観測している。定数や推測で埋めていない。
3. `packages/**`・`tests/**`・`docs/**` に差分がない（`git status --short` で確認して報告する）。
4. 追加した依存は `playwright` 1件のみである。
5. 次がすべて終了コード0で完了する。

```text
npm run typecheck
npm run lint
npm test
npm run build
npm run data:check
```

6. `npm run check:overflow` の**実際の実行結果**（総数・合格数・不合格数、不合格があればその明細）を報告する。
   合否そのものは本発注の成否に含めない。**不合格が出ても修正せず、観測結果をそのまま報告すること。**

---

## 5. 停止して報告する条件

| # | 条件 |
|---|---|
| S-A | `playwright` のブラウザ実体を取得できず、検査を起動できない |
| S-B | 全数検査が現実的な時間で終わらず、検査項目を削る以外の手段がない |
| S-C | 検査のために `packages/**` の DOM 構造・class 名・CSS の変更が必要だと判明した |
| S-D | `vite preview` のベースパス・ポートが本書の記載と異なり、特定できない |

停止時は、再現条件・観測した結果・必要と判断した裁定を簡潔に残すこと。

---

## 6. 完了報告に含めること

1. 追加・変更したファイルの一覧。
2. §4 の受入条件1〜6を一項目ずつ、確認方法と観測結果で報告。
3. `npm run check:overflow` の実行結果（総数・合格・不合格。不合格があれば明細）。
4. `git status --short` による、本発注の差分と既存の未コミット変更の区別。
5. §5 の停止条件に当たった項目。なければ「なし」と明記。
6. 独自に決めたことがあれば全件。なければ「なし」と明記。

推測・予定ではなく観測結果を書くこと。
