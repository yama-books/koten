# Codex向け発注文書 002: P1 最小実行基盤（3 パッケージの足場）

発注日: 2026-08-30
階層: **Terra**（既定。Sol は使わない。`docs/HANDOFF.md` §10.1）
前提フェーズ: P0 完了・P2 完了（`docs/IMPLEMENTATION_PLAN.md` §10 冒頭の「実施状況」）
対象: `docs/IMPLEMENTATION_PLAN.md` §10 の P1、および §17 の 6〜11

---

## 0. なぜこの作業を出すか

裁定 D-06 により、このリポジトリは共有層 1 つと公開単位 2 つの計 3 パッケージで構成される。P2（一次資料パイプライン）は先に完成しているが、**その出力を読む器がまだ無い**。P1 はその器を作る。

仕様は確定済みで、判断の余地をほぼ残していない（`docs/HANDOFF.md` §10.0 の原則 7）。**この発注に裁定は含まれない。** 迷ったら §9 の停止条件に従って止めること。

---

## 1. 作業場所と禁止事項

作業ディレクトリはリポジトリ直下（`AI開発\koten`）。相対パスで読み書きすること。

### 絶対に触らないファイル

```text
百人一首_本文・作者_一次データ.md
百人一首_読み_歴史的仮名遣い.md
百人一首_読み_現代仮名遣い.md
百人一首_読み_異同確認.md
古典文法_一次データ索引.md
USB-*.pdf
CONSTITUTION.md
docs/ 配下のすべて
```

### 触らないディレクトリ（P2 の成果物。完成している）

```text
tools/build-data/
tests/data/
packages/hyakunin/src/data/generated/
```

`packages/hyakunin/src/data/generated/` は `tools/build-data` が生成する。**手で編集しない。**

### そのほかの禁止事項

1. **ローカル絶対パスをコミットしない。** 利用者名を含むものは特に不可（`C:\Users\...`、`H:/...`）。
2. **`git commit` / `git push` をしない。** 作業ツリーに置いたまま完了報告すること。
3. 原資料 PDF をどこへも複製しない。
4. 依存パッケージを増やすときは §9 の停止条件を見ること。

---

## 2. 前提（実測済み・再調査不要）

2026-08-30 に実測した。**同じ調査をやり直さないこと**（`docs/HANDOFF.md` §10.0 の原則 5）。

| 項目 | 実測値 |
|---|---|
| Node | v26.5.1 |
| npm | 11.17.0 |
| ルート `package.json` | **すでに存在する。** 下記のとおり |
| `npm test` | 7 件すべて緑 |
| `npm run data:check` | 終了コード 0 |
| 生成物 | `poems.json`（100 首）/ `variants.json`（10 件）/ `manifest.json` |

現在のルート `package.json` の全内容:

```json
{
  "name": "koten-data-pipeline",
  "private": true,
  "type": "module",
  "scripts": {
    "data:build": "node --experimental-strip-types tools/build-data/index.ts",
    "data:check": "node --experimental-strip-types tools/build-data/index.ts --check",
    "test": "node --experimental-strip-types --test tests/data/*.test.ts"
  }
}
```

### 2.1 ルート `package.json` は新規作成ではない（重要）

実装計画の古い版は「`app/` を作り package.json を置く」と書いていた。**その前提は裁定 D-06 で廃止された。**

上の `package.json` を**破棄も上書きもしない**。`workspaces` を足して育てること。既存の 3 スクリプト（`data:build` / `data:check` / `test`）は名前も中身も変えない。P2 のテストが CI で回り続ける必要がある。

`name` は `koten` へ改称してよい（workspace ルートとして自然な名前にするため）。改称する場合は他から参照されていないことを確認すること。

---

## 3. 成果物

3 つに分かれる。**この順で作ると手戻りが少ない。**

### 3.1 workspace ルート

```text
package.json          既存に workspaces: ["packages/*"] を追加
tsconfig.base.json    新設。3 パッケージがこれを継承する
```

ルートに追加する npm スクリプト:

| スクリプト | 内容 |
|---|---|
| `build` | 2 公開単位を順に build する |
| `typecheck` | 全パッケージの型検査 |
| `lint` | 全パッケージの lint |
| `scan:publish` | `tools/scan-publish` を実行する |

既存の `test` は `tests/data/*.test.ts` を指したままにし、**P1 で足す unit テストも拾えるよう** `tests/**/*.test.ts` へ広げてよい。広げる場合は `npm test` が引き続き緑であることを確認すること。

### 3.2 `packages/shared`（共有層・非公開パッケージ）

```text
packages/shared/
├─ package.json          private: true。ランタイム依存として配布しない
├─ tsconfig.json
└─ src/
    ├─ app-config.ts             ★2 製品で 1 ファイル
    └─ ui/screens/ErrorScreen.tsx
```

`app-config.ts` が持つもの（`docs/IMPLEMENTATION_PLAN.md` §4.3）:

表示名（仮称）、公開名義、リポジトリ URL、`appVersion`、`dataVersion`、`masteryRulesVersion`、正式公開日時、Firebase の使用可否フラグ、`isOfficial`、機能フラグ（助動詞・同期・かるた・対戦・現代語訳）。

**機能フラグはすべて `false` にすること。** 仮称は `古典学習帳`、公開名義は `koten contributors`。

製品ごとに異なる値（base path・公開単位名）は、同ファイル内の製品別セクションに置く。**製品ごとに別ファイルへ分けない。**

### 3.3 `packages/hyakunin` と `packages/kanazukai`（公開単位 2 つ）

両方とも同じ形にする。

```text
packages/<unit>/
├─ package.json
├─ tsconfig.json
├─ tsconfig.node.json
├─ vite.config.ts        base は環境変数から読む。既定は /hyakunin/ または /kanazukai/
├─ vitest.config.ts
├─ eslint.config.js
├─ index.html
├─ public/404.html       ★公開単位ごとに複製する（裁定 D-07）
└─ src/
    ├─ main.tsx          エントリ。ルート描画とグローバルエラー境界
    └─ ui/screens/Home.tsx
```

- **`hyakunin` の Home の第一操作は「とりあえず始める」**とすること。押しても「未実装」の案内を出すだけでよい。
- `kanazukai` の Home は同等の最小画面でよい。**単語モードは横書き**である（縦書きにしない）。
- `ErrorScreen` とグローバルエラー境界は `packages/shared` のものを両方から呼ぶ。**複製しない。**
- 画面の文言は必ず `app-config.ts` を参照する。**仮称の文字列を直書きしない。**

### 3.4 `tools/scan-publish`（初版）

```text
tools/scan-publish/index.ts
```

`docs/PUBLISH_MANIFEST.md` §5 の機械可読ブロックを**唯一の入力**とする。ブロックは `# common` / `# unit:hyakunin` / `# unit:kanazukai` の 3 区分からなる。

P1 時点での役割は限定してよい。**「`packages/` 配下に禁止パターンが無いこと」だけを見る。**

検出する禁止パターン:

| # | パターン | 例 |
|---|---|---|
| 1 | ローカル絶対パス | `C:\Users\`、`H:/`、`/home/`、`/Users/` |
| 2 | 秘密情報らしき文字列 | `PRIVATE KEY`、`service_account`、`api_key`、`client_secret` |
| 3 | 内部資料のファイル名 | `HANDOFF`、`CODEX_WORK_ORDER`、`USB-`、`PUBLISH_MANIFEST` |
| 4 | 個人 SNS アカウント名 | `moyashimisosoup`（`docs/HANDOFF.md` §3 の 6） |

**検出したら終了コードを 0 以外にする。** 検出 0 件で終了コード 0。

`docs/` 配下と一次資料は走査対象に含めない（内部資料そのものであり、必ず当たる）。

---

## 4. 裁定済みで、この発注に効くもの

| 番号 | 内容 |
|---|---|
| D-06 | 3 パッケージ構成。公開リポジトリは 1 つ、Pages の別パス `/hyakunin/`・`/kanazukai/` で配信 |
| **D-07** | ~~`404.html` は公開単位ごとに複製。フォントは `packages/shared/assets/fonts/` を正本とし `prebuild` でコピー~~（**フォント実体は P3 で入る。P1 では作らない**）<br>**取り消し注記（2026-09-01）: フォントの部分は実装されなかった。** 実体は `packages/{hyakunin,kanazukai}/public/fonts/` に 371 ファイルずつ置かれ、共有正本も `prebuild` も存在しない。**裁定 D-12 がこの重複を追認済みであり、記述を実態へ合わせた。** 正は ADR-0004 追補 D-07 と計画 §4.2。**`404.html` の複製は記述どおりで有効。** 本発注は完了済みなので作業は発生しない |
| **D-08** | `load.ts` は共有層に置く（**P1 では作らない**。P2 の残りとして別途） |

`.github/workflows/` は**リポジトリ直下に 1 組だけ**置く。公開リポジトリが 1 つだからである。

---

## 5. CI（`.github/workflows/ci.yml`）

1 ファイルだけ作る。実行するもの:

```text
typecheck / lint / test / data:check / scan:publish
```

`data:check` は P2 で入った検査である。**外さないこと。** これが緑でなくなったら生成物が壊れている。

---

## 6. 受入条件

すべて満たすこと。

1. `npm install` が通る（workspaces が解決される）。
2. **2 公開単位それぞれで** `npm run build` が通る。
3. **2 公開単位それぞれで** `npm run preview` をサブパス配信し、`/hyakunin/` `/kanazukai/` の**深いパスでリロードしても 404 にならない**。
4. `npm test` が緑。**P2 の 7 件が引き続き緑であること。**
5. `npm run data:check` の終了コードが 0（P2 の検査が壊れていない）。
6. `npm run scan:publish` の検出が 0 件で終了コード 0。
7. `app-config.ts` の仮称を 1 箇所変えると、**両公開単位の**全画面の表示が変わる。
8. 機能フラグがすべて `false` であることを検査する unit テストがある（`tests/unit/app-config.test.ts`）。
9. `packages/*/src/ui/` に仮称の文字列リテラルが現れないことを検査する grep 型否定アサーションがある。
10. 320 / 375 / 414 / 768px で Home に横あふれがない。キーボードで可視フォーカスが見え、操作領域が 44px 以上ある。

### 6.1 テストの置き方

`tests/` はリポジトリ直下（`docs/IMPLEMENTATION_PLAN.md` §4.2）。**パッケージの中に置かない。**

```text
tests/unit/app-config.test.ts
```

1 本の巨大なテストへ集約しないこと（`CONSTITUTION.md` §9）。

---

## 7. この発注に含めないもの

含めたくなっても止めること。範囲を広げない。

- デザイントークン・フォント実体・縦書き CSS（**P3**）
- `load.ts` と実行時スキーマ検査（**P2 の残り**）
- IndexedDB・保存層（**P4**）
- 習熟度（**P5**）／出題生成（**P6**）／学習画面（**P7**）
- Firebase・統計（**P9**）
- `.github/workflows/deploy-pages.yml`（**P12** で有効化する。P1 では作らない）
- `tools/overflow-check`（D-04 未確定）
- 仮名遣いツールの中身（一次データが未作成）

---

## 8. 検証の進め方

`CONSTITUTION.md` §9 に従う。

1. 変更箇所の型検査
2. 対象 unit
3. 関連回帰（**P2 の `tests/data/` が緑のままであること**）

---

## 9. 停止して裁定を求める条件

次に当たったら、**自分で決めずに止めて報告すること。**

| # | 条件 |
|---|---|
| S-A | GitHub Pages のサブパス配信で SPA が成立しない構成的な問題が出た（配信方式の裁定に上げる） |
| S-B | `packages/shared` を 2 公開単位から参照する方法が、workspaces のローカル依存では成立しない |
| S-C | 既存の `data:build` / `data:check` / `test` を壊さずに workspaces を導入できない |
| S-D | 上記以外で、`docs/IMPLEMENTATION_PLAN.md` §4.2 に置き場の記載が無いファイルを作る必要が生じた |
| S-E | 依存パッケージを新たに足す必要が生じ、それが `docs/ADR/0001-frontend-stack.md` の選定と食い違う |

**とくに S-D は勝手に決めないこと。** 置き場の裁定は Claude 側と人が持つ（`docs/HANDOFF.md` §10.3）。

---

## 10. 完了報告に含めること

1. 作成・変更したファイルの一覧。
2. §6 の受入条件 10 項目それぞれについて、**実際に実行したコマンドと結果**。「通ったはず」を書かない。
3. `npm test` の件数（P2 の 7 件＋ P1 で足した分）。
4. サブパス配信でのリロード確認を、**どのパスで試したか**。
5. 追加した依存パッケージがあれば、その名前と理由。
6. §9 の停止条件に当たった項目があれば、その内容。
7. 判断に迷って独自に決めたことがあれば、**すべて列挙すること**。後で裁定に上げる。
