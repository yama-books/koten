# Codex向け発注文書 008: WOFF2 の self-host と旧字体グリフ網羅検査

発注日: 2026-08-31
階層: **Terra**（取得・配線・網羅検査を伴う。ライセンス裁定は済みだが実装判断の幅がある）
優先度: 高（P3 の公開前残件。フォントが無い状態では意図した書体で公開できない）
対象: `packages/*/public/fonts/`、`packages/shared/src/styles/`、`tools/font-check/`（新規）

---

## 0. 背景と現状（親担当が 2026-08-31 に実測）

- `packages/shared/src/styles/tokens.css` は `--font-ui: "Zen Maru Gothic", ...` と
  `--font-poem: "Klee One", ...` を定義している。
- しかし **`@font-face` はリポジトリのどこにも存在せず**、`index.html` にも Google Fonts への
  `<link>` は無い。つまり現在の表示は**全環境でフォールバック書体**である。
- `packages/*/public/` には `404.html` しか無い。フォント実体は未作成。

ライセンス側は解決済みである。**本発注でライセンスの可否を再調査しないこと。**

- `docs/LICENSE_AUDIT.md` §2: Zen Maru Gothic・Klee One とも **SIL OFL 1.1**。
  self-host・同梱・サブセット化はいずれも可。Reserved Font Name の個別指定は無し。
- **H-02 は 2026-08-30 に依頼者の追認を得て完了。停止条件 S-2 はフォントについて全面解除済み。**
- `docs/PUBLISH_MANIFEST.md` §3.6: `packages/*/public/fonts/**`（WOFF2）は公開許可。
  ライセンス原文ファイルの同梱義務あり。
- `docs/PUBLISH_MANIFEST.md` **§5.1**（2026-08-31 追記）: 公開staging の許可拡張子に
  `.woff2` と `.txt` を含めてある。

---

## 1. 先に読むもの

| 順 | 文書・ファイル | 確認すること |
|---|---|---|
| 1 | `docs/HANDOFF.md` 全文 | 現在の状態と境界。**このファイルは変更しない** |
| 2 | `CONSTITUTION.md` | 検証・公開の不変条件 |
| 3 | `docs/LICENSE_AUDIT.md` §2 全体 | OFL 1.1 の条件と同梱義務。**再調査せず前提として使う** |
| 4 | `docs/PUBLISH_MANIFEST.md` §3.6・§5・§5.1 | 公開許可の範囲と許可拡張子 |
| 5 | `docs/DESIGN_SYSTEM.md` の書体の節 | どの字面をどこで使う契約か |
| 6 | `packages/shared/src/styles/tokens.css` | 現在の font-family 定義と読み込まれ方 |
| 7 | `packages/hyakunin/src/styles.css` | 実際に使う font-weight（`.poem` は 600、`.primary` は 700 等） |
| 8 | `packages/hyakunin/src/data/generated/poems.json` | 網羅検査の対象文字の出どころ |

---

## 2. 変更境界

### 変更してよいファイル

```text
packages/hyakunin/public/fonts/**            （新規）
packages/kanazukai/public/fonts/**           （新規）
packages/shared/src/styles/fonts.css         （新規。@font-face 専用）
packages/shared/src/styles/tokens.css        （fonts.css の読み込み追加のみ。色・寸法は触らない）
packages/hyakunin/src/main.tsx               （読み込み経路の追加が必要な場合のみ）
packages/kanazukai/src/main.tsx              （同上）
tools/font-check/**                          （新規）
tests/unit/font-coverage.test.ts             （新規）
package.json                                 （scripts に check:font を1件追加するのみ）
THIRD_PARTY_NOTICES.md                       （フォント2種の帰属表示の追記）
.gitignore                                   （取得キャッシュ用に1行追加してよい）
```

### 絶対に変更しないファイル・領域

```text
docs/**
CONSTITUTION.md
一次データの .md ファイル群
packages/*/src/data/generated/**
tools/build-data/**
tools/overflow-check/**
tools/scan-publish/**
.github/
packages/*/src/ui/**                         （表示ロジックは本発注の対象外）
```

`git commit` / `git push` をしない。既存の未コミット変更を消去・復元・上書きしない。
**新しい npm 依存を追加しない。** 既存依存と Node 標準ライブラリだけで実現すること。

---

## 3. 裁定済み事項（再検討しないこと）

1. **取得元は Google Fonts の CSS API v2 とする。** 現代的なブラウザの User-Agent で
   `https://fonts.googleapis.com/css2?family=...` を取得すると、`unicode-range` 付きの
   `@font-face` 群と `https://fonts.gstatic.com/...` の **woff2 実URL** が返る。
   これを唯一の取得元とする。フォント形式の変換・サブセット化ツールは使わない。
2. **`unicode-range` は Google が返した値をそのまま保持する。** 自分で書き換えない。
   これが「どの部分集合がどの符号位置を持つか」の正本になる。
3. **必要な字面と太さ**
   - `Klee One`: weight 400 と 600（本文・作者名。`--font-poem`）
   - `Zen Maru Gothic`: weight 400 と 700（UI。`--font-ui`）
4. **ライセンス原文の同梱は必須。** `google/fonts` リポジトリの
   `ofl/kleeone/OFL.txt` と `ofl/zenmarugothic/OFL.txt` を取得し、
   各フォントディレクトリへ `OFL.txt` として置く。`THIRD_PARTY_NOTICES.md` にも列挙する。
5. **取得した全ファイルの SHA-256 を記録する。** 置き場は
   `packages/*/public/fonts/SOURCES.json` とし、ファイル名・取得元URL・SHA-256・バイト数を持たせる。
6. **サブセット化（字形削減）は本発注では行わない。** `unicode-range` による分割配信で足りるかを
   まず実測する。容量削減が必要なら別発注とする。

---

## 4. 実装範囲

### 4.1 フォントの self-host

1. §3.3 の 2 ファミリー × 各2ウェイトについて、CSS API v2 から `@font-face` 定義を取得する。
2. 参照されている woff2 をすべてローカルへ取得し、
   `packages/hyakunin/public/fonts/<family-slug>/` 配下へ置く。
   `packages/kanazukai` へは同一内容を配置してよい（各公開単位が独立して配信されるため）。
3. `packages/shared/src/styles/fonts.css` を新規に作り、取得した `@font-face` を
   **`src` のURLだけローカル相対パスへ書き換えて**転記する。`unicode-range`・`font-weight`・
   `font-style`・`font-display` は Google が返した値を保つ。`font-display` が無ければ `swap` を補う。
4. `fonts.css` が実際に読み込まれる経路をつなぐ。`tokens.css` の先頭 `@import` か、各 `main.tsx` での
   import のうち、**既存の読み込み方に合う方**を選ぶ。選んだ理由を報告に書く。
5. **外部ホストへの実行時参照を残さない。** 完成後、リポジトリ内に `fonts.googleapis.com` /
   `fonts.gstatic.com` への参照が残っていないことを確認する
   （`SOURCES.json` の取得元URL記録だけは例外として残してよい）。

### 4.2 グリフ網羅検査（旧字体検査）

`tools/font-check/index.ts` を新規に置き、`package.json` の scripts へ
`"check:font": "node --experimental-strip-types tools/font-check/index.ts"` を追加する。

1. `packages/hyakunin/src/data/generated/poems.json` から次の文字列をすべて集める。
   - 各首の `ku`（本文の五句）
   - `author.canonical`
   - `reading.historical.ku` / `reading.historical.author`
   - `reading.modern.ku` / `reading.modern.author`
2. 集めた文字列を**符号位置（コードポイント）単位**で一意化する。
   サロゲートペアを2文字と数えないこと（`[...str]` で分解する）。
3. `packages/shared/src/styles/fonts.css` の `@font-face` から `unicode-range` を読み取り、
   ファミリーごとに**対応可能な符号位置の集合**を組み立てる。
   `U+3042`・`U+3040-309F`・`U+4E00-9FFF` の3書式すべてを解釈すること。
4. 本文用（`Klee One`）について、1の符号位置がすべて3の集合に含まれるかを判定する。
   含まれないものは**旧字体・異体字の可能性がある未対応文字**として、
   符号位置・文字・最初に現れる首番号・どの読みかを1行ずつ列挙する。
5. `Zen Maru Gothic` についても同じ判定を行い、結果を別に報告する。
6. 未対応が1件でもあれば終了コード1、0件なら終了コード0。
7. 走査した符号位置の総数と、ファミリーごとの対応数・未対応数を必ず出力する。
8. 絶対パス・内部資料名を出力へ出さない。

### 4.3 追加する unit test

`tests/unit/font-coverage.test.ts` を新規に置く。既存テストの書式（`node:test` + `node:assert/strict`）に
合わせ、**ネットワークに依存させない**こと。

1. `packages/shared/src/styles/fonts.css` が存在し、`@font-face` を1件以上含む。
2. `fonts.css` の `src` に `http://` / `https://` が現れない（外部参照の回帰検査）。
3. `unicode-range` の解析関数が `U+3042` と `U+3040-309F` の両書式を正しく展開する。
4. `packages/*/public/fonts/` に `OFL.txt` が存在する（同梱義務の回帰検査）。

---

## 5. 受入条件

1. `npm run check:font` が実行でき、符号位置の総数とファミリーごとの対応/未対応件数を出力する。
   **実際の数値を報告に書く。**
2. 未対応文字が出た場合、隠したり `fonts.css` を手で書き換えて通したりしない。
   **そのまま列挙して報告する。**（未対応の存在自体は本発注の不合格ではない。§7 S-B へ進む）
3. `npm run build` 後、`packages/hyakunin/dist/` に woff2 と `OFL.txt` が出力されている。
4. `npm run scan:publish` が終了コード0で完走する（§5.1 に `.woff2` `.txt` があるため通るはずである。
   通らない場合は §7 S-C）。
5. `npm run check:overflow` が終了コード0で完走する。
   **フォント適用で字幅が変わるため、この再実行は必須である。**
   親担当が 2026-08-31 に、フォント適用前の状態で 1200 件全件合格を実測している。
   この基準を下回った場合は修正せず、首番号・読み・幅・違反キーをそのまま報告する。
6. `packages/*/public/fonts/SOURCES.json` に、取得した全ファイルの
   ファイル名・取得元URL・SHA-256・バイト数がある。
7. ファミリーごとの**ファイル数と合計バイト数**を報告に書く。
8. §4.3 の unit test 4件が緑である。
9. 次がすべて終了コード0で完了する。**それぞれ実際に実行し、`npm test` は件数を書く。**

```text
npm run typecheck
npm run lint
npm test
npm run build
npm run data:check
npm run scan:publish
npm run check:font
npm run check:overflow
```

10. `git status --short` で、本発注の差分が §2 の許可範囲に収まっている。

### 5.1 検査環境の既知の注意（親担当が実測）

- `check:overflow` は `vite preview` を起動する。**`localhost` に束縛され、Windows では `::1` のみ**である。
  `127.0.0.1` では応答しない。
- 前回の実行が残っているとポート4173が占有され、起動に失敗する。実行前に占有が無いことを確認すること。

---

## 6. 表示の確認

`npm run build` 後の preview で、第57・76・91首を縦書きで表示し、次を目視で確認して報告する。

- 本文が Klee One で表示されている（フォールバックのままでない）。
- 縦書きの5列が崩れていない。字幅が変わったことによる新たなあふれ・改行・切断が無い。
- UI が Zen Maru Gothic で表示されている。

**「実機確認済み」とは書かないこと。** 実機（iOS Safari / Android Chrome / iPad Safari）は人の工程に残る。

---

## 7. 停止して報告する条件

| # | 条件 |
|---|---|
| S-A | ネットワークから Google Fonts / google-fonts リポジトリへ到達できない |
| S-B | `check:font` で未対応の符号位置が出た（**旧字体・異体字の可能性**。書体差し替えの裁定が要る） |
| S-C | `scan:publish` が新しい拡張子で落ち、`docs/PUBLISH_MANIFEST.md` §5.1 の追記が必要になった |
| S-D | 2ファミリー合計のバイト数が **40MB** を超えた（サブセット化の裁定が要る） |
| S-E | `fonts.css` の読み込み経路をつなぐために `packages/*/src/ui/**` の変更が必要になった |
| S-F | 取得した `@font-face` に `unicode-range` が無く、網羅検査の正本が作れない |

**S-B・S-C・S-D では `docs/` 配下を自分で編集してはならない。** 観測結果を報告して停止すること。

---

## 8. 完了報告に含めること

1. 変更・追加したファイルの一覧と、各ファイルで何をしたか。
2. §5 の受入条件1〜10を一項目ずつ、**実行した方法と観測結果**で報告。
3. §6 の目視確認の結果。
4. ファミリーごとのファイル数・合計バイト数と、SHA-256 の記録先。
5. `check:font` の全出力（未対応がある場合は全件）。
6. §7 の停止条件に当たった項目。なければ「なし」と明記。
7. **独自に決めたことがあれば全件。なければ「なし」と明記。**
   既定値・命名・配置・読み込み経路など、本書に書かれていない判断は小さくても全部書くこと。

推測・予定ではなく観測結果を書くこと。**実行していない検査を「成功」と書かないこと。**
**一度も実行できていないコードを完成として報告しないこと。**
