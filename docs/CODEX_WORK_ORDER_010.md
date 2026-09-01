# Codex向け発注文書 010: 書体ウェイトを裁定 D-04 の契約へ戻す（合成太字の解消）

発注日: 2026-08-31
階層: **Terra**（フォント取得・CSS 手術・実ブラウザ検査を伴う）
着手時期: **発注009 の完了後**。009 と同一階層のため同時には走らせない
優先度: 中（公開前の見た目の品質に直結する。P4 とは独立で並行可能）
対象: `packages/*/public/fonts/`、`packages/shared/src/styles/fonts.css`、`packages/*/src/styles.css`、`tools/font-weight-check/`（新規）

> **並行発注に関する注意**: 発注011 が同時に走る場合がある。競合しうる共有ファイルは `package.json` の `scripts` だけである。
> `scripts` へは **`check:font-weight` の 1 行だけ**を足し、他の行に触れないこと。

---

## 0. 背景 — 発注008 の指定が契約と食い違っていた

**これは Terra の不履行ではない。発注008 §3.3 のウェイト指定が誤っていた。** 親担当の責任である。
Terra は発注008 の指示に忠実だった。本書がその指定を上書きする。

裁定 **D-04**（2026-08-30・依頼者）と `docs/DESIGN_SYSTEM.md` の書体表が契約である。

| 役割 | 契約されたウェイト |
|---|---|
| UI 本文（ボタン・ラベル・設定・説明・進捗） | Zen Maru Gothic **500** |
| UI 強調（画面タイトル・主要操作・重要な結果文言） | Zen Maru Gothic **700** |
| 和歌本文（本文・設問中の歌・句の引用） | Klee One **600** |

**契約はこの 3 つだけである。** 対して 2026-08-31 の実測は次のとおり。

| # | 観測 | 判定 |
|---|---|---|
| 1 | `fonts.css` に Zen Maru Gothic **500 が無い**。UI 本文は 400 で描画されている | 契約と不一致 |
| 2 | `fonts.css` に **Klee One 400** がある（契約に無い）。画面のどこからも使われていない。約 3.3MB × 2 パッケージ | 契約に無い死蔵 |
| 3 | `.author` 内の `<strong>` が **Klee One 700** を要求。700 の実体が無いため**ブラウザが合成太字を生成**している | 契約に無い。筆書き系書体の合成太字は字形が濁る |
| 4 | Zen Maru Gothic **400** がある（契約に無い）。現在 UI 本文が使っている | #1 を直すと不要になる |

**本発注は新たな裁定ではなく、既に下りている D-04 の執行である。**
D-04 を変更したくなった場合（例: 作者名に Klee One 700 を足したい）は §7 S-D で停止すること。

---

## 1. 先に読むもの

| 順 | 文書・ファイル | 確認すること |
|---|---|---|
| 1 | `docs/HANDOFF.md` §4.1 の **D-04** の行 | 契約の原文。**このファイルは変更しない** |
| 2 | `docs/DESIGN_SYSTEM.md` の書体の節 | 役割とウェイトの対応表。**これが正本** |
| 3 | `docs/CODEX_WORK_ORDER_008.md` §3・§4.1 | 取得手順（CSS API v2・`unicode-range` 保持・SHA-256 記録）。**手順は踏襲する。ウェイト指定だけが誤りだった** |
| 4 | `docs/LICENSE_AUDIT.md` §2 | OFL 1.1。**再調査しない。前提として使う** |
| 5 | `packages/shared/src/styles/fonts.css` | 現在の `@font-face` 群（492 面） |
| 6 | `packages/*/public/fonts/SOURCES.json` | 記録の形式。追加・削除の両方を反映する |
| 7 | `packages/hyakunin/src/styles.css` | `.poem` は 600、`.author` の `<strong>` が 700 を引いている箇所 |
| 8 | `tools/overflow-check/index.ts` | 実ブラウザ検査の手本。**Windows 固有の注意が織り込まれている** |

---

## 2. 変更境界

### 変更してよいファイル

```text
packages/hyakunin/public/fonts/**
packages/kanazukai/public/fonts/**
packages/shared/src/styles/fonts.css
packages/hyakunin/src/styles.css              （font-weight の指定のみ。色・寸法・レイアウトは触らない）
packages/kanazukai/src/styles.css             （同上。存在する場合）
tools/font-weight-check/**                    （新規）
tests/unit/font-weight.test.ts                （新規）
package.json                                  （scripts に check:font-weight を1件追加するのみ）
THIRD_PARTY_NOTICES.md                        （ファイル構成が変わる場合の記述更新のみ）
```

### 絶対に変更しないファイル・領域

```text
docs/**                                       （契約は D-04 で下りている。自分で書き換えない）
CONSTITUTION.md
一次データの .md ファイル群
packages/*/src/data/generated/**
packages/*/src/ui/**                          （表示ロジックは対象外。CSS のウェイト値だけを直す）
packages/shared/src/storage/**                （発注009 の領域。触らない）
packages/shared/src/app-config.ts
tools/build-data/** / tools/scan-publish/** / tools/overflow-check/** / tools/font-check/**
.github/
```

`git commit` / `git push` をしない。既存の未コミット変更を消去・復元・上書きしない。
**新しい npm 依存を追加しない。**

---

## 3. 裁定済み事項（再検討しないこと）

1. **self-host するウェイトは次の 3 つだけとする。**
   - `Zen Maru Gothic` 500（UI 本文）
   - `Zen Maru Gothic` 700（UI 強調）
   - `Klee One` 600（和歌本文）
2. **Klee One 400 と Zen Maru Gothic 400 は削除する。** 契約に無い。
3. **作者名は Klee One 600 とする。** 700 を新たに取得しない。合成太字を止めることが目的である。
4. 取得手順は発注008 §3 を踏襲する。取得元は Google Fonts CSS API v2、
   `unicode-range` は返された値をそのまま保持、`font-display` が無ければ `swap` を補う。
5. **`SOURCES.json` は追加と削除の両方を反映する。** 削除したファイルの記録を残さない。
   追加したファイルはファイル名・取得元URL・SHA-256・バイト数を持たせる。
6. `OFL.txt` は各ファミリーのディレクトリに残す（同梱義務。削除しない）。
7. **外部ホストへの実行時参照を残さない**（`SOURCES.json` の取得元URL記録だけは例外）。

### 3.1 作業順序の注意

**Zen Maru Gothic 400 を先に消すと UI がフォールバックへ落ちる。**
「500 を追加 → CSS の指定を 500 へ切替 → 400 を削除」の順で行うこと。

---

## 4. 実装範囲

### 4.1 ウェイトの入れ替え

1. Zen Maru Gothic **500** を CSS API v2 から取得し、`packages/*/public/fonts/zen-maru-gothic/` へ置く。
2. `fonts.css` に 500 の `@font-face` 群を追加する。
3. UI 本文が 500 を引くように `styles.css` の `font-weight` を直す。
4. `.author` 内の強調が **Klee One 600** になるように直す（合成太字の解消）。
5. Klee One 400 と Zen Maru Gothic 400 の `@font-face` と woff2 実体を削除する。
6. `SOURCES.json` を追加・削除の両方について更新する。

### 4.2 合成太字の機械検査 `tools/font-weight-check/`

`tools/font-weight-check/index.ts` を新規に置き、scripts へ
`"check:font-weight": "node --experimental-strip-types tools/font-weight-check/index.ts"` を追加する。

**目的は、画面が要求する (ファミリー, ウェイト) の組が、`fonts.css` に実体として存在することを機械で保証することである。**
実体が無い組を要求すると、ブラウザは何のエラーも出さずに合成太字を作る。
**この不具合は目視でしか見つからない。だから検査を置く。**

1. Playwright で実ブラウザを起動する。方式は `tools/overflow-check/index.ts` を踏襲する。
   - `npm.cmd` を直接 `spawn` すると Windows で `EINVAL` になる。Vite の JS 入口を Node で直接起動している。
   - `vite preview` は `localhost` に束縛され、Windows では `::1` のみ。`127.0.0.1` では応答しない。
   - 実行前にポート占有が無いことを確認する。
2. **`hyakunin` と `kanazukai` の両方**を対象にする。
   `hyakunin` は少なくとも「範囲選択画面」と「歌の表示画面（縦書き・横書き）」を巡回する。
3. 各画面で、テキストを持つ全要素の算出 `font-family`（先頭のファミリー）と `font-weight` を集める。
4. `fonts.css` の `@font-face` から (ファミリー, ウェイト) の実在集合を組み立てる。
5. **要求された組が実在集合に無ければ違反として列挙する。** ファミリー・ウェイト・要素の役割・
   本文の先頭 10 文字を 1 行ずつ出す。
6. 違反が 1 件でもあれば終了コード1、0 件なら 0。
7. 走査した画面数・要素数・要求された組の一覧・違反数を必ず出力する。
8. **完走しなかった場合は合否を出さず、終了コード1 で止めること。**
9. 絶対パス・内部資料名を出力へ出さない。

### 4.3 unit test `tests/unit/font-weight.test.ts`

既存の書式（`node:test` + `node:assert/strict`）に合わせ、**ネットワークとブラウザに依存させない**。

1. `fonts.css` の (ファミリー, ウェイト) の集合が **ちょうど** `Zen Maru Gothic 500` /
   `Zen Maru Gothic 700` / `Klee One 600` の 3 つである（契約の回帰検査）。
2. `fonts.css` に `Klee One 400` と `Zen Maru Gothic 400` が現れない（再混入の回帰検査）。
3. `fonts.css` の `src` に `http://` / `https://` が現れない。
4. `packages/*/public/fonts/` に `OFL.txt` が存在する。

---

## 5. 受入条件

1. 次がすべて終了コード0で完了する。**それぞれ実際に実行し、`npm test` は件数を書く。**

```text
npm run typecheck
npm run lint
npm test
npm run build
npm run data:check
npm run scan:publish
npm run check:font
npm run check:font-weight
npm run check:overflow
```

2. `npm run check:font` が **471/471・未対応 0** を維持する。
   （Zen Maru Gothic 500 が 400 と同じ符号位置を覆っていることの確認。下回った場合は §7 S-B）
3. `npm run check:font-weight` が違反 0 件で完走する。走査画面数・要素数・要求された組の一覧を報告に書く。
4. `npm run check:overflow` が **1200 件全件合格**を維持する。
   **ウェイトが変わると字幅が変わるため、この再実行は必須である。**
   下回った場合は修正せず、首番号・読み・幅・違反キーをそのまま報告する。
5. §4.3 の unit test 4 件が緑である。
6. `SOURCES.json` の記録と `public/fonts/` の実体が**双方向で一致**する
   （記録にあって実体が無い、実体があって記録に無い、のどちらも 0 件）。
7. ファミリーごとのファイル数と合計バイト数を、**変更前後の両方**で報告に書く。
8. `git status --short` で差分が §2 の許可範囲に収まっている。**`docs/**` に差分が出ていないこと。**

---

## 6. 表示の確認

`npm run build` 後の preview で、第57・76・91首を縦書きで表示して報告する。

- 作者名が合成太字でなく Klee One 600 で描かれている。
- UI が Zen Maru Gothic 500 で描かれている。
- 縦書きの 5 列が崩れていない。ウェイト変更による新たなあふれ・改行・切断が無い。

**「実機確認済み」とは書かないこと。** 実機は人の工程に残る。

---

## 7. 停止して報告する条件

| # | 条件 |
|---|---|
| S-A | Google Fonts から Zen Maru Gothic 500 を取得できない |
| S-B | `check:font` の符号位置対応が 471/471 を下回った（500 の被覆が 400 と異なる。書体差し替えの裁定が要る） |
| S-C | `check:overflow` が 1200 件を下回った（**修正せずそのまま報告する**） |
| S-D | D-04 の契約自体を変えたくなった（例: 作者名に Klee One 700 を足したい）。**これは人の裁定である** |
| S-E | `scan:publish` が落ちた |
| S-F | `packages/*/src/ui/**` の変更が必要になった |

**どの停止条件でも `docs/` 配下を自分で編集してはならない。** 観測結果を報告して停止すること。

---

## 8. 完了報告に含めること

1. 変更・追加・**削除**したファイルの一覧と、各ファイルで何をしたか。
2. §5 の受入条件1〜8を一項目ずつ、**実行した方法と観測結果**で報告。
3. §6 の目視確認の結果。
4. `check:font-weight` の全出力。
5. 変更前後のファイル数・合計バイト数。
6. §7 の停止条件に当たった項目。なければ「なし」と明記。
7. **独自に決めたことがあれば全件。なければ「なし」と明記。**

推測・予定ではなく観測結果を書くこと。**実行していない検査を「成功」と書かないこと。**
**一度も実行できていないコードを完成として報告しないこと。**
**検査ツールは、完走しなかったときに合格を出してはならない。**
