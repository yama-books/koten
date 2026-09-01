# Codex向け発注文書 019: 取り込みと復旧の**原子性**と、その破壊試験

発注日: 2026-08-31
階層: **Terra**
優先度: **最高**（実装計画の停止条件 **S-7「既存記録の消失」に直結する**。現状の実装は
**復旧の途中で失敗すると利用者の学習記録が失われる**。P5 推薦・P6 出題より先に閉じる）
対象: `packages/shared/src/storage/db.ts`（**追加のみ**）、`packages/shared/src/storage/import.ts`、
`tests/unit/storage/`（**新規ファイルの追加と、既存 1 ファイルへの追記のみ**）

> **これは「試験を足す」発注ではない。** 発注012 の検収で、実装そのものに欠陥が見つかった。
> **原子性を実装で確保し、それが確保されていることを破壊試験で示す**のが本発注である。
> 試験だけを足して現在の実装を通すことは、**不合格**とする（§6 の S-1）。

---

## 0. この発注の位置づけ

発注012（P4 後半 export / import / merge / reset / Transfer）は 2026-08-31 の第6回検収で
**条件付き合格**となった。合格しなかった点が本発注である。

| 発注 | 範囲 | 状態 |
|---|---|---|
| 009 | `schema.ts` / `db.ts` / `repo/` / `fallback.ts` | 検収済み（条件付き合格） |
| 012 | `export.ts` / `import.ts` / `merge.ts` / `reset.ts` / `Transfer.tsx` | **条件付き合格。残件が本書** |
| **019（本書）** | 取り込みと復旧の原子性、および未実施だった破壊試験 3 件 | 本発注 |

### 検収で確定した事実（**再調査しなくてよい。親担当が実コードを読んで確認済み**）

1. **`replaceStore`（`import.ts:42`）は原子的でない。**
   `clear()` を 1 トランザクションで実行したあと、**レコード 1 件ごとに別のトランザクション**で `put` する。
   `db.ts:42` の `runTransaction` は**呼び出しごとに `database.transaction()` を張る**ためである。
2. したがって取り込みは途中で失敗するとストアが**中途半端な状態で残る**。
3. **復旧経路 `restore`（`import.ts:51`）も同じ `replaceStore` を使う。**
   よって**復旧中に失敗すると既存記録が失われる**。返るのは文言の違うエラーだけである
   （`import.ts:73` の "Import write and restoration failed"）。
4. **`applyImport` を呼ぶ試験が 1 件も存在しない。** 発注012 §5.1 の破壊試験 5（ロールバック）は
   **未実施**であった。書いてあるだけのロールバックは、動くことが確認されるまでは無いのと同じである。
5. 発注012 §5.1 の破壊試験 3（`schemaVersion`）は **`2` しか試していない**。
   `0` と文字列は未実施である（`tests/unit/storage/transfer.test.ts:25`）。
6. 発注012 §5.1 の破壊試験 6（二重取り込み）は **`mergeEvents` 単体の冪等性しか確認していない**
   （`transfer.test.ts:38`）。**取り込み経路 `applyImport` を 2 回通す試験は無い。**

### 基準線（2026-08-31 に親担当が自分で実測した値。転記ではない）

- `npm test` … **77 件 pass / 0 fail**、終了コード 0。
- 本発注の完了時、**77 件は 1 件も減っていてはならない**（§5 の A-7）。

---

## 1. 先に読むもの

| 文書・ファイル | 読む箇所 | 何のために |
|---|---|---|
| `docs/APP_SPEC.md` | §9.2「読み込みとマージ」 | **仕様の正本。**「読み込みは既存記録を消さず」「異なる履歴は全件を保持」 |
| `docs/IMPLEMENTATION_PLAN.md` | 停止条件 S-7 | 既存記録の消失は停止条件である |
| `packages/shared/src/storage/db.ts` | 全 53 行 | `runTransaction` の現在の契約。**他に 5 ファイル 12 箇所から呼ばれている** |
| `packages/shared/src/storage/import.ts` | 全 81 行 | 直す対象 |
| `tests/unit/storage/storage.test.ts` | 86〜138 行 | **代役（テストダブル）の書き方の手本。** `queueMicrotask` で非同期を模している |
| `docs/CODEX_WORK_ORDER_012.md` | §5.1 | 未実施だった破壊試験の原文 |

---

## 2. 変更境界

### 変更してよいファイル

| ファイル | 許される変更 |
|---|---|
| `packages/shared/src/storage/db.ts` | **関数の追加のみ。** 既存の `openDatabase` / `runTransaction` / 型の**シグネチャを変えない** |
| `packages/shared/src/storage/import.ts` | `replaceStore` / `restore` / `applyImport` の書き換え。公開シグネチャ（`parseImport` と `applyImport` の引数・戻り値の型）は変えない |
| `tests/unit/storage/atomicity.test.ts` | **新規作成。** 本発注の試験はここへ書く |
| `tests/unit/storage/transfer.test.ts` | **追記のみ**（§4.4 の 2 件）。既存 6 試験を書き換えない |

### 絶対に変更しないファイル・領域

- `packages/shared/src/storage/schema.ts`、`fallback.ts`、`repo/**`、`export.ts`、`merge.ts`、`reset.ts`
- `packages/shared/src/domain/**`（習熟度コアは発注018A で検収済み。**触るな**）
- `packages/shared/src/ui/**`（`Transfer.tsx` を含む。本発注は画面を変えない）
- リポジトリ直下の `package.json`、`packages/*/package.json`（**script も依存も足さない**）
- `tools/**`、`.github/**`、`docs/**`
- **新しい npm 依存を入れない。** `fake-indexeddb` 等の導入は禁止する（§6 の S-3）

---

## 3. 裁定済み事項（再検討しないこと）

| # | 裁定 | 出典 |
|---|---|---|
| 1 | **IndexedDB は 2 製品で 1 つ。** 書き出し 1 ファイルに両製品の記録が混在する | D-06、`APP_SPEC` §9.1 |
| 2 | `sessions` / `events` / `reports` の各要素は `product` を必須で持つ。欠落と未知の値は「不正な形式」として拒否する | H-13、`APP_SPEC` §9.1・§9.2 |
| 3 | `schemaVersion` は **1 のまま据え置く**。1 以外はすべて拒否する | ADR-0004 追補 |
| 4 | 重複は `eventId` / `sessionId` / `reportId` の同一値を**一回だけ**採用。異なる履歴は全件保持 | `APP_SPEC` §9.2 |
| 5 | 例外を投げて画面を落とさない。**戻り値の型で失敗を表す**（`StorageResult`） | 009 の設計。`db.ts:3` |
| 6 | **本発注の裁定 D-18: 取り込みの書き込みは `sessions` / `events` / `reports` / `settings` の 4 ストアにまたがる<br>ただ 1 つの `readwrite` トランザクションで行う。** 途中の失敗は `abort` により**全体が取り消される**ため、<br>`readBackup` → `restore` による**手作りの復旧経路は不要になる**。手作りの復旧は削除する | 本書。親担当裁定 |

### D-18 の理由（設計判断の背景。実装者はここを読んでから §4 へ進むこと）

IndexedDB のトランザクションは、**1 つのトランザクションで複数ストア・複数リクエストを扱える**。
1 つでも失敗すれば処理系が自動で `abort` し、**そのトランザクション内の書き込みはすべて取り消される**。
つまり **原子性は処理系が保証する**。自前で「バックアップを取り、失敗したら書き戻す」経路を持つと、

- 書き戻し自体が失敗しうる（**いまの実装の欠陥そのものである**）
- 書き戻しの最中に別の書き込みが挟まりうる

という二重の危険を抱える。**保証されているものを自作しない。**
`readBackup` は「既存記録を読んでマージの入力にする」用途では引き続き必要である。
**復旧のためのバックアップとしては不要**、という意味である。

---

## 4. 実装範囲

### 4.1 `db.ts` に多ストア書き込みの土台を足す（追加のみ）

`runTransaction` は「1 ストア・1 リクエスト」に固定されており、**このままでは原子性を作れない**。
次の関数を**追加**する。既存の `runTransaction` は**そのまま残す**（他の 5 ファイル 12 箇所が使っている）。

```ts
export function runWriteTransaction(
  database: IDBDatabase,
  storeNames: StoreName[],
  action: (stores: Record<string, IDBObjectStore>) => void,
): Promise<StorageResult<undefined>>
```

要件は次のとおり。

1. `database.transaction(storeNames, 'readwrite')` を **1 回だけ**張る。
2. `action` に、名前で引ける `IDBObjectStore` の集合を渡し、**同期的に**呼ぶ。
3. **`transaction.oncomplete` でのみ `{ ok: true }` を返す。** 個々のリクエストの `onsuccess` では返さない。
4. `onerror` / `onabort`、および `action` が投げた例外を
   `{ ok: false, reason: 'transaction-failed', error }` にする。
   `action` が投げた場合は `transaction.abort()` を試みる
   （すでに abort 済みなら握りつぶす。`db.ts:34` と同じ書き方でよい）。
5. **例外を外へ投げない。**

> **重要（実装を誤りやすい箇所）。** IndexedDB のトランザクションは、
> **保留中のリクエストが無い状態でイベントループが一巡すると自動で commit される**。
> したがって `action` の中で **`await` を挟んではならない**。
> すべての `clear()` と `put()` を**同期的に発行しきる**こと。
> `for (const record of records) await runTransaction(...)` の形へ書き換えるのは**誤りである**。

### 4.2 `import.ts` の書き込みを 1 トランザクションへまとめる

- `replaceStore`（現 42〜50 行）を**削除**し、4 ストアをまとめて書く 1 つの関数へ置き換える。
- `restore`（現 51〜60 行）を**削除**する（D-18）。
- `applyImport` は次の順序にする。
  1. `readBackup` で既存記録を読む（**マージの入力として**）。失敗したらそのまま返す。
  2. `mergeSessions` / `mergeEvents` / `mergeReports` と `importedSettings` で、
     **書き込む内容を先に全部作る**（純粋な計算。ここに I/O を混ぜない）。
  3. `runWriteTransaction(database, ['sessions', 'events', 'reports', 'settings'], …)` を **1 回**呼ぶ。
     その中で各ストアを `clear()` してから全レコードを `put()` し、`settings` も同じトランザクションで `put()` する。
  4. 失敗したら `{ ok: false, reason: 'transaction-failed', error }` を返す。
     **"restored" や "restoration failed" といった文言は不要になる**（取り消しは処理系が行う）。
  5. 成功したら従来どおり `{ ok: true, value: { sessions, events, reports } }`（`MergeCounts`）を返す。
- **`settings` を同じトランザクションに含めること。** 現在は `saveSettings`（別トランザクション）であり、
  ここだけ取り残されると「記録は入ったが設定は古い」状態が残りうる。

### 4.3 `applyImport` の冪等性

同じ計画を 2 回適用しても、**2 回目で件数が増えてはならない**（`APP_SPEC` §9.2）。
マージ側が冪等であればこれは自然に満たされるが、**取り込み経路として**確認する（§5 の A-5）。

### 4.4 `transfer.test.ts` への追記（2 件のみ。既存試験は書き換えない）

1. `schemaVersion` が **`0`** の文書を `parseImport` が拒否する。
2. `schemaVersion` が **文字列 `"1"`** の文書を `parseImport` が拒否する。

### 4.5 `tests/unit/storage/atomicity.test.ts`（新規）

**実 IndexedDB は使えない**（node:test に DOM は無い）。`storage.test.ts` の 86〜138 行と同じ流儀で、
**トランザクションの意味論を模した代役**を書く。代役の要件は次のとおりで、これを満たさない代役は
**原子性を証明しない**（§6 の S-2）。

| 要件 | 内容 |
|---|---|
| C-1 | `transaction(names, mode)` が**名前の配列を受け付ける**。`objectStore(name)` で各ストアを返す |
| C-2 | `clear()` と `put()` は**確定した記録へ直接書かない。** トランザクションごとの**作業領域へ溜める** |
| C-3 | `oncomplete` が発火したときに**初めて**作業領域を確定した記録へ反映する（commit） |
| C-4 | `abort()` または失敗時は作業領域を**捨てる**（rollback）。確定した記録は**1 バイトも変わらない** |
| C-5 | **n 番目の `put` で失敗させられる**こと（引数で指定する）。失敗時は `request.onerror` を発火させ、続けて `transaction.onabort` を発火させる |

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm test` が終了コード 0 | `npm test` の終了コード |
| A-2 | 取り込み成功時、`sessions` / `events` / `reports` / `settings` の内容が期待どおり | `atomicity.test.ts` |
| A-3 | **`events` の 3 件目の `put` で失敗させたとき、確定した記録が取り込み前と完全に一致する**（`sessions` も `reports` も `settings` も含め 1 件も変わらない） | `atomicity.test.ts`。取り込み前の控えと `assert.deepEqual` |
| A-4 | 同じ失敗のとき `applyImport` は**例外を投げず** `{ ok: false, reason: 'transaction-failed' }` を返す | `assert.doesNotReject` ＋ 戻り値の検査 |
| A-5 | **同じ `ImportPlan` を 2 回 `applyImport` しても、2 回目の後の件数が 1 回目の後と等しい** | `atomicity.test.ts` |
| A-6 | **書き込みで張られたトランザクションが 1 回だけである** | 代役が `transaction()` の呼び出し回数を数え、`assert.equal(writeTransactions, 1)` |
| A-7 | 試験件数が **77 件から減っていない**（追加分だけ増える） | `npm test` 末尾の `ℹ tests` 行 |
| A-8 | `import.ts` に **`restore` という名の関数が存在しない**（D-18 で削除される） | `grep -c 'function restore' packages/shared/src/storage/import.ts` が 0 |
| A-9 | `npm run typecheck` と `npm run lint` が終了コード 0 | 各コマンド |

### 5.1 破壊試験（**本発注の受入の中心。論理を 1 箇所ずつ反転させる**）

**ファイルを消す形の破壊試験は認めない。** 「消したら落ちた」は、検査が**存在**することしか示さない。
**実装の論理を 1 箇所だけ反転させ、対応する試験が名指しで赤くなること**を示す。
手本は `docs/PROGRESS_2026-08-31.md` 第6回記録 §6.2 の E-1〜E-5 である。

| # | 反転させる論理 | 赤くなるべき試験 |
|---|---|---|
| **B-1** | `runWriteTransaction` の解決を `transaction.oncomplete` から**最後のリクエストの `onsuccess`** へ移す | A-3（commit 前に成功を返すので、取り消しが観測されない） |
| **B-2** | `applyImport` の書き込みを**ストアごとに別トランザクション**へ戻す（現行実装に戻す） | A-3 と A-6 |
| **B-3** | `settings` の書き込みだけを**同じトランザクションから外す**（別トランザクションにする） | A-3（設定だけが取り込み後の値で残る）と A-6 |
| **B-4** | 代役の `abort` を「作業領域を捨てる」から「作業領域を確定する」へ変える | A-3（**代役自身が原子性を模していることの確認**） |
| **B-5** | `mergeEvents` の重複判定を反転させる（`eventId` の一致を無視する） | A-5 |

**報告には、B-1〜B-5 それぞれについて「赤くなった試験名」を書くこと。**
反転後に**どの試験も赤くならなかった場合、その試験は証明力を持っていない**。
その旨を報告し、試験を書き直すこと。**「全部緑でした」だけの報告は受け付けない。**

**反転させた実装は必ず元へ戻すこと。** 戻したあと `npm test` が再び緑になることを確認し、
**戻した後のファイルのハッシュ**（`sha256sum`）を報告に含める。
B-5 は `merge.ts` を一時的に触ることになるが、**戻したうえでハッシュ一致を示すこと**
（`merge.ts` は §2 で変更禁止領域である。破壊試験のための一時的な反転のみ許す）。

### 5.2 実行環境の既知の注意（Windows）

- 開発機は Windows である。`npm test` は node:test を直接使う。ブラウザは要らない。
- **`npm run check:overflow` は走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| **S-1** | **実装を変えずに試験だけを足して受入条件を満たそうとしていることに気づいたとき。** それは本発注の趣旨に反する |
| **S-2** | 代役が C-1〜C-5 を満たせず、原子性を試験で示せないとき。**「実 IndexedDB が無いので確認できません」と報告して止まること。緑にして通さない** |
| **S-3** | 新しい npm 依存が必要だと判断したとき。**入れずに止まる** |
| **S-4** | `runTransaction` の既存シグネチャを変えないと実装できないと判断したとき |
| **S-5** | §2 の「絶対に変更しない」領域に、破壊試験の一時反転以外で触れる必要が生じたとき |
| **S-6** | 既存 77 件のいずれかが赤くなり、その原因が本発注の変更にあると判断したとき |
| **S-7** | `APP_SPEC` §9.2 と本発注の指示が食い違うと気づいたとき。**`APP_SPEC` が正本である。従わずに報告する** |

---

## 7. 完了報告に含めること

1. 変更したファイルの一覧（**それ以外を触っていないことの申告**）。
2. `npm test` の**末尾 10 行をそのまま**（`ℹ tests` / `ℹ pass` / `ℹ fail` の行を含む）。件数を文章で言い換えない。
3. `npm run typecheck` と `npm run lint` の終了コード。
4. **B-1〜B-5 の破壊試験それぞれについて、赤くなった試験名。** 赤くならなかったものはそう書く。
5. 反転を戻した後の `import.ts` / `db.ts` / `merge.ts` の `sha256sum`。
6. A-6（トランザクション 1 回）と A-8（`restore` 不在）の実測。
7. **判断に迷って自分で決めた箇所があれば、その一覧と理由。** 黙って決めない。
