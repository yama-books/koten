# Codex向け発注文書 009: P4 前半 — 保存の土台（イベント定義・IndexedDB・リポジトリ・退避）

発注日: 2026-08-31
階層: **Terra**（設計判断の幅があり、既存記録の消失に直結する領域）
優先度: 高（P5 習熟度・P6 出題・P7 学習画面のすべてがここに依存する。最長経路上）
対象: `packages/shared/src/domain/`、`packages/shared/src/storage/`、`tools/check-storage/`（新規）、`tests/unit/storage/`（新規）

> **並行発注に関する注意**: 発注010・011 が同時に走る場合がある。競合しうる共有ファイルは `package.json` の `scripts` だけである。
> `scripts` へは **`check:storage` の 1 行だけ**を足し、他の行に触れないこと。

---

## 0. この発注の位置づけ

`docs/IMPLEMENTATION_PLAN.md` §10 の **P4 保存・移行**（概算規模 中・4〜7 日）を **2 本に分割した前半**である。

| 発注 | 範囲 |
|---|---|
| **009（本書）** | イベント定義、`schema.ts`、`db.ts`、`repo/`、`fallback.ts`、実ブラウザ検査、unit test |
| **012**（本書の受入後に発注） | `export.ts`、`import.ts`、`merge.ts`、`reset.ts`、`ui/screens/Transfer.tsx` |

**本書の範囲は「記録を作って安全に置く」までである。書き出し・取り込み・統合・初期化には手を出さない。**
必要になったら §7 S-C で停止すること。

分割した理由は、P4 全体を 1 本で出すと受入条件が機械判定しきれず、
「実行していない検査を成功と報告する」事故の余地が残るためである。

---

## 1. 先に読むもの

| 順 | 文書・ファイル | 確認すること |
|---|---|---|
| 1 | `docs/HANDOFF.md` 全文 | 現在の状態と境界。**このファイルは変更しない** |
| 2 | `CONSTITUTION.md` | 検証・公開の不変条件 |
| 3 | `docs/APP_SPEC.md` §9.1・§9.2 | 書き出し形式と取り込みの契約。**`product` は 2026-08-31 に反映済み** |
| 4 | `docs/ADR/0004-two-products-layout.md` **追補 H-13** | `product` 判別子の表現方法。**この追補が本発注の正本である** |
| 5 | `docs/ADR/0004-two-products-layout.md` 本文（D-06・D-01） | IndexedDB は 2 製品で 1 つ。`itemKey` は「1 つの想起行為 = 1 つの問」 |
| 6 | `docs/IMPLEMENTATION_PLAN.md` §10 の **P4** | 実施内容 1〜4、対象テスト、受入条件、停止条件 S-7 |
| 7 | `packages/shared/src/app-config.ts` | `products` のキー（`product` の値の語彙はここと一致させる） |
| 8 | `tools/overflow-check/index.ts` | **実ブラウザ検査の書き方の手本。Windows 固有の注意が既に織り込まれている** |
| 9 | `tests/unit/*.test.ts` | 既存テストの書式（`node:test` + `node:assert/strict`） |

---

## 2. 変更境界

### 変更してよいファイル

```text
packages/shared/src/domain/event.ts                （新規）
packages/shared/src/storage/schema.ts              （新規）
packages/shared/src/storage/db.ts                  （新規）
packages/shared/src/storage/fallback.ts            （新規）
packages/shared/src/storage/repo/events.ts         （新規）
packages/shared/src/storage/repo/sessions.ts       （新規）
packages/shared/src/storage/repo/settings.ts       （新規）
packages/shared/src/storage/repo/reports.ts        （新規）
packages/shared/src/storage/repo/outbox.ts         （新規）
packages/shared/package.json                       （exports の追加のみ）
tools/check-storage/**                             （新規）
tests/unit/storage/**                              （新規）
package.json                                       （scripts に check:storage を1件追加するのみ）
```

### 絶対に変更しないファイル・領域

```text
docs/**                                            （裁定は済んでいる。自分で書き換えない）
CONSTITUTION.md
一次データの .md ファイル群
packages/*/src/data/generated/**
packages/*/src/ui/**                               （画面は本発注の対象外）
packages/shared/src/styles/**                      （発注008の成果。触らない）
tools/build-data/** / tools/scan-publish/** / tools/overflow-check/** / tools/font-check/**
.github/
```

`git commit` / `git push` をしない。既存の未コミット変更を消去・復元・上書きしない。
**新しい npm 依存を追加しない。** 既存依存（`playwright` は導入済み）と Node 標準ライブラリだけで実現すること。

---

## 3. 裁定済み事項（再検討しないこと）

1. **`product` 判別子は `docs/ADR/0004-two-products-layout.md` 追補 H-13 に厳密に従う。**
   - `sessions` / `events` / `reports` の**各要素**が持つ。最上位には置かない。
   - 値は `'hyakunin' | 'kanazukai'`。`appConfig.products` のキーと一致させる。
   - **必須**とする。省略可にしない。既定値を推測して補完しない。
   - `settings` には付けない。
   - `schemaVersion` は **1 のまま**。上げない。
2. **IndexedDB は 2 製品で 1 つ**（裁定 D-06）。DB 名は `koten` とする。
   ストアは `events` / `sessions` / `settings` / `reports` / `outbox` の 5 つ。`dbVersion` の初期値は 1。
3. **`events` は追記専用とする。** 更新・削除の API を作らない。
   （初期化は発注012の `reset.ts` が担当する。本発注では作らない）
4. **`db.ts` は `IDBFactory` を注入可能にする。** 既定引数で `globalThis.indexedDB` を使い、
   試験では差し替えられる形にする。**これは試験容易性のための必須要件である**（理由は §4.4）。
5. **現在時刻を実装内部で直接読まない。** `Date.now()` に相当する値は引数または注入で受け取る。
   再現可能な試験のためである。
6. **upgrade は追加のみとする。** 既存ストアの削除・作り直し・キー変更を行わない。
   `onupgradeneeded` の途中で例外が出た場合、トランザクションを中断し**既存データを保持したまま**失敗を返す。
7. **`fallback.ts` は例外を投げずに結果型を返す。** 容量超過は正常系の分岐として扱う。
   LocalStorage のキー接頭辞は `koten:` とする。

---

## 4. 実装範囲

### 4.1 `domain/event.ts`

`Event` / `Session` / `Report` の型を置く。§3.1 に従い `product` を必須で持たせる。
`itemKey` は裁定 D-01（1 つの想起行為 = 1 つの問）に従う。
`eventId` / `sessionId` / `reportId` は発注012 の重複排除の鍵になるため、**文字列の完全一致で比較できる形**にする。

### 4.2 `storage/schema.ts` と `storage/db.ts`

1. `schema.ts` に 5 ストアの定義と `dbVersion` を置く。各ストアの keyPath と索引を明示する。
2. `db.ts` に open / upgrade / トランザクションを置く。
   - **upgrade 失敗時に既存データを消さない経路にする**（§3.6）。
   - open 失敗（プライベートモード等で IndexedDB が使えない）を例外にせず、
     呼び出し側が `fallback.ts` へ切り替えられる結果型で返す。

### 4.3 `storage/repo/` と `storage/fallback.ts`

- `events`（追記のみ）/ `sessions` / `settings` / `reports` / `outbox` の 5 本。
- `fallback.ts`: IndexedDB が使えない環境で LocalStorage へ退避する。
  容量上限に達したら、**回答を失わずに**「書き出しを促す」ことを呼び出し側へ伝える結果を返す。

### 4.4 実ブラウザ検査 `tools/check-storage/`

`tools/check-storage/index.ts` を新規に置き、`package.json` の scripts へ
`"check:storage": "node --experimental-strip-types tools/check-storage/index.ts"` を追加する。

**Node には IndexedDB が無い。新しい npm 依存も禁止している。**
したがって実 DB の挙動は `tools/overflow-check/index.ts` と同じ方式で、
**Playwright で実ブラウザを起動して検査する。** 純粋な層の試験は §4.5 の unit test が受け持つ。
この二層構成が §3.4（`IDBFactory` 注入）を必須要件にしている理由である。

`tools/overflow-check/index.ts` には Windows 固有の落とし穴が既に織り込まれている。
**必ず読んで同じ方式を使うこと。**

- `npm.cmd` を直接 `spawn` すると Windows で `EINVAL` になる。Vite の JS 入口を Node で直接起動している。
- `vite preview` は `localhost` に束縛され、Windows では `::1` のみである。`127.0.0.1` では応答しない。
- 前回の実行が残っているとポートが占有される。実行前に占有が無いことを確認すること。

検査する 4 シナリオ（`docs/IMPLEMENTATION_PLAN.md` §10 P4 の受入条件と対応する）。

| # | シナリオ | 判定 |
|---|---|---|
| 1 | 記録の直後にページを再読み込みする | 件数が減っていない |
| 2 | ブラウザ文脈を作り直す（再起動相当） | 件数が減っていない |
| 3 | `dbVersion` を上げて upgrade する | 既存イベントが失われない |
| 4 | 容量不足の例外を起こす | 回答が失われず、書き出しを促す結果が返る |

各シナリオの合否と件数を出力し、**1 つでも不合格なら終了コード1** とする。
**完走しなかった場合は合否を出さず、終了コード1 で止めること。**
走査したシナリオ数と合格数を必ず出力する。絶対パス・内部資料名を出力へ出さない。

### 4.5 unit test `tests/unit/storage/`

既存の書式（`node:test` + `node:assert/strict`）に合わせ、**ネットワークと実 IndexedDB に依存させない**。
§3.4 の注入を使い、`IDBFactory` の最小の代役を試験内に置いてよい（新規依存にしないこと）。

最低限、次を検査する。

1. `product` が欠落したイベント、および未知の値を**受け付けない**（ADR-0004 追補 決定4 の回帰検査）。
2. `product` の値の語彙が `appConfig.products` のキーと一致する（語彙のずれの回帰検査）。
3. `events` に更新・削除の API が生えていない（追記専用の回帰検査）。
4. upgrade の途中で例外が起きても既存データを保持したまま失敗を返す。
5. `fallback.ts` が容量超過で例外を投げず、書き出しを促す結果を返す。
6. `schemaVersion` が 1 である（ADR-0004 追補 決定3 の回帰検査）。

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
npm run check:overflow
npm run check:storage
```

2. `npm run check:storage` が §4.4 の 4 シナリオを**実際に走らせ**、シナリオ数と合格数を出力する。
   **実際の数値を報告に書く。**
3. §4.5 の unit test 6 項目が緑である。追加した件数を報告に書く。
4. `check:overflow` が 1200 件全件合格を維持している（保存層の追加で画面が壊れていないことの確認）。
   下回った場合は修正せず、首番号・読み・幅・違反キーをそのまま報告する。
5. `git status --short` で、本発注の差分が §2 の許可範囲に収まっている。
   **`docs/**` に差分が出ていないこと。**
6. `packages/shared/package.json` の `exports` に追加した経路が、`typecheck` を通っている。

### 5.1 検査環境の既知の注意

§4.4 に列挙した Windows 固有の 3 点は**親担当が実測したものである**。推測ではない。
`tools/overflow-check/index.ts` の該当箇所を読んでから書くこと。

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| S-A | IndexedDB の試験に新規 npm 依存が必要だと判断した。**依存追加は禁止である。** §3.4 の注入と §4.4 の実ブラウザ検査で回避できない理由を書いて停止する |
| S-B | 既存記録の消失・重複加算・復元不能が疑われる（実装計画の停止条件 **S-7**） |
| S-C | `export` / `import` / `merge` / `reset` / `Transfer.tsx` に手を出す必要が出た（**発注012 の範囲**） |
| S-D | `settings` に `product` が必要だと判明した（ADR-0004 追補 H-13 の変更条件に当たる） |
| S-E | `scan:publish` が新しい拡張子で落ちた |
| S-F | `packages/*/src/ui/**` の変更が必要になった |

**どの停止条件でも `docs/` 配下を自分で編集してはならない。** 観測結果を報告して停止すること。

---

## 7. 完了報告に含めること

1. 変更・追加したファイルの一覧と、各ファイルで何をしたか。
2. §5 の受入条件1〜6を一項目ずつ、**実行した方法と観測結果**で報告。
3. `check:storage` の全出力。
4. §6 の停止条件に当たった項目。なければ「なし」と明記。
5. **独自に決めたことがあれば全件。なければ「なし」と明記。**
   ストア名以外の命名、索引の張り方、結果型の形、代役 `IDBFactory` の作り、
   ポート番号、環境変数名など、本書に書かれていない判断は小さくても全部書くこと。

推測・予定ではなく観測結果を書くこと。**実行していない検査を「成功」と書かないこと。**
**一度も実行できていないコードを完成として報告しないこと。**
**検査ツールは、完走しなかったときに合格を出してはならない。**
