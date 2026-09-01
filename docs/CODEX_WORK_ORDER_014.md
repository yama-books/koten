# Codex向け発注文書 014: `check:storage` の作り直し —— 実装を実際に通す検査へ

発注日: 2026-08-31
階層: **Terra**（ブラウザへ TypeScript を載せる経路の設計判断がある。Windows 固有の落とし穴を伴う）
着手時期: **即時。発注013 と並行してよい**（§2 のとおり変更境界が重ならない）
優先度: **最優先**（発注009 の最重要受入条件が実質未実施。P4 後半＝発注012 はここが直るまで着手できない）
対象: `tools/check-storage/index.ts`（作り直し）、`packages/shared/package.json`（`exports` の追加のみ）

---

## 0. 背景 —— `check:storage` は保存層を一度も検査していない

2026-08-31、親担当が発注009 の成果を検収し、**不合格**とした。
最大の理由が本発注の対象である。

### 実測した事実（推測ではない）

**現在の `tools/check-storage/index.ts` は `packages/shared` から何ひとつ import していない。**
import 文は Node 標準 5 つと `playwright` だけである。

そのうえで 94〜116 行目の `installBrowserHelpers` が、
**ブラウザの中でスキーマ定義を丸ごと書き直している。**

```ts
const definitions: Record<string, { keyPath: string; indexes: string[] }> = {
  events: { keyPath: 'eventId', indexes: ['poemId', 'sessionId', 'localDate', 'itemKey', 'product'] },
  sessions: { keyPath: 'sessionId', indexes: ['startedOn'] }, settings: { keyPath: 'key', indexes: [] },
  reports: { keyPath: 'reportId', indexes: ['status'] }, outbox: { keyPath: 'outboxId', indexes: ['kind'] },
};
```

これは `packages/shared/src/storage/schema.ts` の写しである。写しは同期しない。
検査は写しの側を検査しており、出荷される実装には一度も触れていない。

**破壊試験の結果。** 親担当が `packages/shared/src/storage/` を**丸ごと退避**して
`npm run check:storage` を実行した。

```text
check:storage: ページ再読み込み 合格 件数 1
check:storage: ブラウザ文脈再作成 合格 件数 1
check:storage: DB upgrade 合格 件数 1
check:storage: 容量不足 合格 件数 1
check:storage: シナリオ 4 件、合格 4 件、不合格 0 件
```

**保存層が存在しなくても 4/4 合格する。** この検査は何も保証していない。

### 「容量不足」シナリオはさらに悪い

58〜64 行目はこう書かれている。

```ts
const answer = { answer: 'kept' };
try { ({ setItem() { throw new DOMException('full', 'QuotaExceededError'); } }).setItem('koten:event', JSON.stringify(answer)); }
catch (error) { return { ok: false, shouldExport: error instanceof DOMException && error.name === 'QuotaExceededError', value: answer }; }
```

その場で作ったオブジェクトの `setItem` を呼び、**自分が投げた例外を自分で捕まえて**
「投げた例外は `QuotaExceededError` だった」と判定している。
`writeFallback` は呼ばれていない。`fallback.ts` を消しても合格する。
発注009 §4.4 のシナリオ4 は**実施されていない**。

---

## 1. この発注の主題

**検査対象を、出荷される実装そのものにすること。**

`packages/shared/src/storage/` を壊したら `check:storage` が赤くなる。
それだけが本発注の目的である。シナリオの数も判定基準も、発注009 §4.4 から変えない
（§3.4 で 1 つだけ足す）。

---

## 2. 変更境界

### 変更してよいファイル

```text
tools/check-storage/**                  （index.ts の作り直し。補助ファイルを足してよい）
packages/shared/package.json            （exports の追加のみ。既存の行を消さない）
```

### 絶対に変更しないファイル・領域

```text
packages/shared/src/**                  （保存層の実装は変更しない。§6 の S-D）
package.json                            （check:storage script は既にある。発注013 が触る）
tests/**                                （発注013 の範囲。手を出さない）
tools/overflow-check/**                 （読んで手本にする。変更しない）
docs/**                                 （裁定は済んでいる。自分で書き換えない）
CONSTITUTION.md
一次データの .md ファイル群
packages/*/src/data/generated/**
packages/*/src/ui/**
packages/shared/src/styles/**
tools/build-data/** / tools/scan-publish/** / tools/font-check/** /
tools/font-assets-check/** / tools/font-weight-check/**
.github/
```

`git commit` / `git push` をしない。既存の未コミット変更を消去・復元・上書きしない。
**新しい npm 依存を追加しない。** 既存依存（`playwright`・`vite` は導入済み）と Node 標準だけで実現すること。

---

## 3. 裁定済み事項（再検討しないこと）

1. **検査は `packages/shared/src/storage/` の実装を実際に通す。**
   ブラウザ内でスキーマ・DB 操作・退避処理を再実装してはならない。
   `databaseName` / `dbVersion` / `stores` は `schema.ts` から取る。写さない。
2. **ビルド成果物の写しを手で置く方式は禁止する。** 写しは同期せず、F-1 が再発する。
   ソースから毎回変換して載せること。
3. **シナリオ4 は `writeFallback` を実際に呼ぶ。** 例外を自分で投げて自分で捕まえないこと。
4. **シナリオを 1 つ足す（新裁定）。** 発注009 §4.4 の 4 つに加えて、次を検査する。

   | # | シナリオ | 判定 |
   |---|---|---|
   | 5 | 未知の `product` を持つイベントを `appendEvent` に渡す | `ok: false` が返り、**件数が増えない** |

   理由: ADR-0004 追補 H-13 の「`product` は必須・語彙は `appConfig.products` のキー」は
   保存の境界で守られなければ意味がない。unit test は純粋な層でしか見ていない。
5. **完走しなければ合否を出さない。** 終了コード1 で止める。
   1 つでも不合格なら終了コード1。走査したシナリオ数と合格数を必ず出力する。
6. **絶対パス・内部資料名を出力へ出さない**（`CONSTITUTION.md` の公開境界）。
   内部処理で絶対パスを使うのは構わない。**出力に出さないこと**が要件である。
7. **現在時刻を検査対象の実装に読ませない。** 発注009 §3.5 の継続。
8. `dbVersion` は 1 のまま。上げない。

---

## 4. 実装範囲

### 4.1 TypeScript をブラウザへ載せる経路

**方式は任せる。** ただし §3.2 を守ること。既存の材料で少なくとも次の道がある。

- `tools/check-storage/index.ts` は既に `packages/hyakunin` の Vite を起動している。
  Vite の dev サーバは TypeScript をその場で変換して配信できる。
  ページから動的 `import()` で保存層のモジュールを取れる可能性がある。
- 検査専用の小さなエントリを一時ディレクトリに置き、Vite に変換させて読み込ませる。
- `page.addScriptTag({ type: 'module' })` に、変換済みのモジュール URL を渡す。

**どの道を選んでも、`packages/shared/src/storage/` のソースが唯一の出所であること。**
選んだ理由と、他の道を採らなかった理由を報告に書くこと。

### 4.2 Windows 固有の落とし穴（親担当が実測済み。推測ではない）

`tools/overflow-check/index.ts` と現行の `tools/check-storage/index.ts` に
既に織り込まれている。**必ず読んでから書くこと。**

- `npm.cmd` を直接 `spawn` すると Windows で `EINVAL` になる。Vite の JS 入口を Node で直接起動する。
- Vite は `localhost` に束縛され、Windows では `::1` のみである。`127.0.0.1` では応答しない。
- 前回の実行が残っているとポートが占有される。実行前に占有が無いことを確認する。
- 永続プロファイルの一時ディレクトリは、ブラウザ終了直後は削除に失敗することがある。
  現行実装の `removeProfile` の再試行を残すこと。

### 4.3 検査するシナリオ

発注009 §4.4 の 4 つ、および §3.4 の 5 つめ。判定基準は変えない。

| # | シナリオ | 判定 |
|---|---|---|
| 1 | 記録の直後にページを再読み込みする | 件数が減っていない |
| 2 | ブラウザ文脈を作り直す（再起動相当） | 件数が減っていない |
| 3 | `dbVersion` を上げて upgrade する | 既存イベントが失われない |
| 4 | 容量不足の例外を起こす | 回答が失われず、書き出しを促す結果が返る |
| 5 | 未知の `product` を持つイベントを追記する | 拒否され、件数が増えない |

**各シナリオが、対応する実装のどの関数を通るかを報告に書くこと。**

- 1・2 は `openDatabase` と `appendEvent` と `listEvents` を通る。
- 3 は `openDatabase` の `onupgradeneeded` を通る。
- 4 は `writeFallback` を通る。
- 5 は `appendEvent` の `isEvent` ガードを通る。

シナリオ3 は `dbVersion` を上げるが、**`schema.ts` の `dbVersion` は 1 のままである**（§3.8）。
`openDatabase` の `options.version` で上げること。これが発注009 §3.4 の注入可能性の使いどころである。

### 4.4 出力

現行の書式を保つ。

```text
check:storage: <シナリオ名> <合格|不合格> 件数 <n>
check:storage: シナリオ <N> 件、合格 <M> 件、不合格 <N-M> 件
```

完走しなかった場合は合否を出さず、日本語の診断行と終了コード1 で止める。

---

## 5. 受入条件

### 5.1 実行

次がすべて終了コード0で完了する。

```text
npm run typecheck
npm run lint
npm run build
npm run data:check
npm run scan:publish
npm run check:font
npm run check:overflow
npm run check:storage
```

`npm run check:storage` が **5 シナリオ全合格**を出力し、終了コード0 であること。**全出力を報告に貼る。**
`npm run check:overflow` は **1200 件全件合格**を維持していること。
`npm test` は発注013 が変更中である。実行してもよいが本発注の合否に含めない。

### 5.2 破壊試験 —— これが本発注の本体である

**次の 4 つを自分で実施し、それぞれの全出力を報告に貼ること。**
「通るはず」ではなく、実際に壊して赤くなったことを見せること。

| # | 壊す箇所 | 期待 |
|---|---|---|
| D-1 | `packages/shared/src/storage/` を丸ごと退避 | `check:storage` が**終了コード1**（合否を出さず止まってよい） |
| D-2 | `packages/shared/src/storage/fallback.ts` だけを退避 | **シナリオ4 が不合格**、終了コード1 |
| D-3 | `packages/shared/src/storage/repo/events.ts` の `isEvent(event)` ガードを外す | **シナリオ5 が不合格**、終了コード1 |
| D-4 | `packages/shared/src/storage/db.ts` の `onupgradeneeded` のストア作成ループを空にする | **シナリオ1 か 3 が不合格**、終了コード1 |

**D-2・D-3・D-4 では「終了コード1 になった」だけでは足りない。**
**指定したシナリオが名指しで不合格になっていること**を出力で示すこと。
別のシナリオが道連れで落ちるのは構わないが、指定のシナリオが不合格でなければ未達である。

**手順の義務。** 破壊試験は 1 件ずつ行い、次を守ること。

1. 壊す前に対象ファイル（またはディレクトリの全ファイル）の SHA-256 を記録する。
2. 壊す。実行する。出力を保存する。
3. **直ちに元へ戻す。**
4. SHA-256 を再計算し、1 と一致することを確認する。**一致を報告に書く。**
5. `npm run check:storage` を再実行し、5/5 合格に戻ることを確認する。
6. 次の破壊試験へ進む。

**復元できなかった場合は、その時点で停止して報告すること（§6 の S-A）。**
壊したまま次へ進まないこと。並行して壊さないこと。

### 5.3 静的な条件

- `tools/check-storage/**` に、`schema.ts` の `stores` 定義の写しが存在しないこと。
  ストア名・keyPath・索引名を検査ツール側に直書きしていないこと。
- `tools/check-storage/**` が `packages/shared/src/storage/` を出所とするモジュールを
  実際に読み込んでいること。**どの行がそれかを報告で示すこと。**

### 5.4 親担当が検収時に実行する試験

**検収では、親担当が §5.2 の D-1〜D-4 を独立に再実行する。**
とくに **D-1（保存層を丸ごと退避して終了コード1 になること）** を最初に行う。
ここで合格が出た時点で、他が何であれ不合格とする。
報告の文章ではなく、こちらの実行結果で判定する。これを見越して書くこと。

### 5.5 その他

- `git status --short` の差分が §2 の許可範囲に収まっている。**`docs/**` に差分が出ていないこと。**
- `packages/shared/package.json` に追加した `exports` 経路が `typecheck` を通り、
  かつ実際に解決できること（既存 10 経路は親担当が実行時解決を確認済み）。

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| S-A | 破壊試験の復元に失敗した、または SHA-256 が一致しない。**直ちに停止し、失った内容を報告する** |
| S-B | 新規 npm 依存が必要だと判断した。**依存追加は禁止である。** §4.1 の 3 つの道をすべて試し、それぞれ何で塞がったかを書いて停止する |
| S-C | Windows で、ブラウザから保存層のソースへ到達する経路が塞がっている（§4.2 以外の落とし穴を見つけた）。**観測した挙動をそのまま書く。回避策を発明しない** |
| S-D | 検査を成立させるために `packages/shared/src/**` の変更が必要だと判断した。**変更境界外である。** 何が足りないのかを書いて停止する |
| S-E | 既存記録の消失・重複加算・復元不能が疑われる（実装計画の停止条件 **S-7**） |
| S-F | `export` / `import` / `merge` / `reset` に手を出す必要が出た（**発注012 の範囲**） |
| S-G | `packages/*/src/ui/**` の変更が必要になった |
| S-H | `check:overflow` が 1200 件を下回った |

**どの停止条件でも `docs/` 配下を自分で編集してはならない。** 観測結果を報告して停止すること。

---

## 7. 完了報告に含めること

1. 変更・追加したファイルの一覧と、各ファイルで何をしたか。
2. §4.1 で選んだ経路、選んだ理由、**採らなかった道とその理由**。
3. §5.1 の各コマンドを、実行した方法と観測結果で 1 項目ずつ。`check:storage` は**全出力**。
4. §4.3 の表について、**各シナリオが通る実装の関数名**と、それを通ることをどう確かめたか。
5. **§5.2 の D-1〜D-4 それぞれについて、壊したときの全出力・戻したときの全出力・SHA-256 の一致・5/5 への復帰**。
   4 件すべて。省略しないこと。
6. §5.3 の 2 点について、根拠となる行を示すこと。
7. §6 の停止条件に当たった項目。なければ「なし」と明記。
8. **独自に決めたことがあれば全件。なければ「なし」と明記。**
   ポート番号、環境変数名、一時ディレクトリの置き場、シナリオ名の文言、
   モジュールの載せ方の細部など、本書に書かれていない判断は小さくても全部書くこと。

推測・予定ではなく観測結果を書くこと。**実行していない検査を「成功」と書かないこと。**
**検査ツールは、完走しなかったときに合格を出してはならない。**
**そして、検査対象が存在しないときに合格を出してはならない。** 今回はそれが起きた。
