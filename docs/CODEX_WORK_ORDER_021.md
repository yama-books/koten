# Codex向け発注文書 021: 発注019 で**証明力が無いと実測された試験 2 件**の作り直し

発注日: 2026-08-31
階層: **Terra**
優先度: 中（**実装の欠陥ではない。**発注019 の実装は検収で合格している。
本発注は「その実装が正しいことを試験が証明できていない」2 箇所を塞ぐ）
対象: `tests/unit/storage/atomicity.test.ts`（**このファイルのみ**）

> **本発注は発注019 と逆の性質を持つ。** 019 は「試験だけ足して通すな、実装を直せ」であった。
> 本発注は **実装を直してはならない**。`db.ts` / `import.ts` / `merge.ts` は検収済みであり、
> **これらを変更したら不合格とする**（§5 の S-1）。直すのは**試験の証明力**である。

---

## 0. なぜこれを出すか（親担当が自分で実測した結果）

2026-08-31 第8回セッションで発注019 を検収した。受入条件 A-1〜A-9 はすべて満たしていた。
しかし**破壊試験 B-1〜B-5 を親担当が自分で 1 件ずつ実施した**ところ、次の 2 件で
**どの試験も赤くならなかった**。発注019 §5.1 は「赤くならなかった場合、その試験は証明力を持っていない。
その旨を報告し、試験を書き直すこと」と定めている。**本発注がその書き直しである。**

| 反転 | 内容 | 発注019 が期待した結果 | **実測** |
|---|---|---|---|
| B-1 | `runWriteTransaction` の解決を `transaction.oncomplete` から**最後のリクエストの `onsuccess`** へ移す | A-3 が赤くなる | **18 件すべて緑。1 件も赤くならなかった** |
| B-5 | `mergeEvents` の重複判定を反転させる（`eventId` の一致を無視する） | A-5 が赤くなる | **A-5（`applying the same plan twice…`）は緑のまま。**赤くなったのは `transfer.test.ts` の `merging is idempotent…`（`mergeEvents` の単体試験）だけであった |

### B-1 が赤くならなかった原因（**再調査しなくてよい。親担当が特定済み**）

代役（`createAtomicDatabase`）は **commit の前に失敗する筋道しか模していない**。
`failure` は「n 番目の `put` で失敗させる」ものだからである。

- 実装が `oncomplete` より早く解決しても、**代役では commit が先に済んでしまう**ため観測できない。
- 実 IndexedDB では**すべてのリクエストが成功したあと commit の段で失敗しうる**
  （容量超過、他タブによる強制終了など）。このとき早すぎる解決は
  **「取り込めました」と利用者に告げたのに 1 件も書かれていない**という最悪の結果になる。
- **代役にこの筋道が無い限り、`oncomplete` で解決していることは証明されない。**

### B-5 が赤くならなかった原因（同上）

代役の `put` は**キーで既存レコードを上書きする**。これは実 IndexedDB の正しい挙動である
（`keyPath` が同じレコードは 1 件に収束する）。
したがって `mergeEvents` が重複を素通ししても、**ストアの中身は同じに収束する**。
**A-5 が見ているのは `database.records` だけであり、そこには差が出ない。**

**しかし利用者に見えるのは件数である。** `applyImport` の戻り値 `MergeCounts`
（`{ added, duplicates }`）は Transfer 画面が「n 件を取り込みました」と表示する値である。
2 回目の取り込みで `added: 3` と表示されたら、**記録は増えていないのに増えたと告げたことになる**。
**A-5 はここを見ていない。**

---

## 1. 先に読むもの

| 文書・ファイル | 読む箇所 | 何のために |
|---|---|---|
| `docs/CODEX_WORK_ORDER_019.md` | §4.5 の C-1〜C-5、§5.1 | 代役の契約と、破壊試験の作法の原文 |
| `tests/unit/storage/atomicity.test.ts` | 全 136 行 | 直す対象。**既存 3 試験の意図を壊さないこと** |
| `packages/shared/src/storage/db.ts` | 55〜78 行 | `runWriteTransaction` の契約（**読むだけ。変更しない**） |
| `packages/shared/src/storage/import.ts` | 46〜63 行 | `applyImport` の戻り値の形（**読むだけ。変更しない**） |
| `docs/APP_SPEC.md` | §9.2 | 仕様の正本 |

---

## 2. 変更境界

### 変更してよいファイル

| ファイル | 許される変更 |
|---|---|
| `tests/unit/storage/atomicity.test.ts` | 代役への **C-6 の追加**、試験の **1 件追加**、既存 A-5 試験への **表明の追記** |

### 絶対に変更しないファイル

- `packages/shared/src/storage/**`（**`db.ts`・`import.ts`・`merge.ts` を含む。実装は検収済みである**）
- `packages/shared/src/domain/**`、`packages/shared/src/ui/**`
- `tests/unit/storage/storage.test.ts`、`tests/unit/storage/transfer.test.ts`
- `package.json`（**script も依存も足さない**）、`tools/**`、`.github/**`、`docs/**`
- **新しい npm 依存を入れない**

---

## 3. 裁定済み事項（再検討しないこと）

| # | 裁定 | 出典 |
|---|---|---|
| 1 | 取り込みの書き込みは 4 ストアにまたがるただ 1 つの `readwrite` トランザクションで行う | D-18、発注019 §3 |
| 2 | 解決は `transaction.oncomplete` でのみ行う。個々のリクエストの `onsuccess` では解決しない | 発注019 §4.1 の 3 |
| 3 | 実 IndexedDB は使えない。代役で意味論を模す | 発注019 §4.5 |
| 4 | 重複は同一 ID を一回だけ採用。**件数（`MergeCounts`）も利用者に見える契約の一部である** | `APP_SPEC` §9.2。本書で明示 |

---

## 4. 実装範囲

### 4.1 代役に **C-6** を足す（commit の段で失敗する筋道）

現在の `failure`（`{ store, put }`）は残したまま、**commit 時失敗の指定を足す**。

| 要件 | 内容 |
|---|---|
| **C-6** | **すべての `put` / `clear` が成功したあと、commit の段で失敗させられること。**<br>このとき **`oncomplete` は発火させない。** 作業領域を**捨てて**（rollback）`transaction.onabort` を発火させる。<br>確定した記録は **1 バイトも変わらない** |

指定の形は実装者に任せる（例: `createAtomicDatabase(seed, { failAtCommit: true })`）。
**ただし既存 3 試験の呼び出し方を変えないこと。**

> **注意。** C-6 は「n 番目の `put` で失敗」とは**別の筋道**である。
> `put` を失敗させる形で代用してはならない。それでは B-1 を検出できない
> （それが今回の実測結果である）。**すべてのリクエストが成功しきったあとに失敗させること。**

### 4.2 試験を 1 件足す（A-10）

```
storage import: reports failure when the commit itself fails
```

1. C-6 で commit を失敗させた代役に `applyImport` を通す。
2. **例外を投げない**こと（`assert.doesNotReject`）。
3. 戻り値が `{ ok: false, reason: 'transaction-failed' }` であること。
4. **確定した記録が取り込み前と完全に一致する**こと（`sessions` / `events` / `reports` / `settings` の 4 つとも。取り込み前の控えと `assert.deepEqual`）。
5. `writeTransactions` が 1 であること。

### 4.3 既存の A-5 試験に**件数の表明を足す**

`storage import: applying the same plan twice does not add records twice` に次を**追記**する
（既存の `assert.deepEqual(database.records, afterFirst)` は**残す**）。

- 1 回目の戻り値が `{ sessions: { added: 1, … }, events: { added: 3, … }, reports: { added: 1, … } }` であること。
- **2 回目の戻り値が `added: 0` / `duplicates` は取り込み件数と等しいこと**（`sessions` 1・`events` 3・`reports` 1）。

**期待値はハードコードでよい。** 計画（`plan`）は同ファイル内の定数であり、変わらない。

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm test` が終了コード 0 | 終了コード |
| A-2 | 試験件数が **93 件から減っていない**（追加分だけ増える） | `npm test` 末尾の `ℹ tests` 行 |
| A-3 | `npm run typecheck` と `npm run lint` が終了コード 0 | 各コマンド |
| A-4 | `packages/` 配下が **1 バイトも変わっていない** | `git status --porcelain packages/` が空、または着手前の `sha256sum` と一致 |
| A-10 | §4.2 の試験が存在し緑である | `npm test` の試験名 |
| A-11 | §4.3 の件数表明が存在し緑である | 同上 |

### 5.1 破壊試験（**本発注の受入の中心**）

**今度こそ赤くなることを示すこと。** 反転させた実装は必ず元へ戻し、
戻したあとの `sha256sum` を報告に含めること。

| # | 反転させる論理 | 赤くなるべき試験 |
|---|---|---|
| **B-1**（再実施） | `db.ts` の `runWriteTransaction` の解決を `transaction.oncomplete` から**最後のリクエストの `onsuccess`** へ移す | **A-10。** commit 失敗を観測できず `ok: true` を返すため |
| **B-5**（再実施） | `merge.ts` の `mergeEvents` の重複判定を反転させる（`eventId` の一致を無視し、`counts` を `added: 3, duplicates: 0` にする） | **A-11。** 2 回目の `added` が 0 にならない |
| **B-6** | 代役の C-6 を「作業領域を捨てる」から「作業領域を確定する」へ変える | **A-10**（代役自身が rollback を模していることの確認） |

**B-1 と B-5 は検収済みの実装ファイルを一時的に触ることになる**（§2 で変更禁止領域である）。
**破壊試験のための一時的な反転のみ許す。戻したうえでハッシュ一致を示すこと。**

**どれかが赤くならなかった場合、「全部緑でした」と報告せず、赤くならなかった旨を報告して止まること。**

### 5.2 実行環境の注意（Windows）

- `npm test` は node:test を直接使う。ブラウザは要らない。
- 単体で走らせるなら `node --experimental-strip-types --test tests/unit/storage/atomicity.test.ts`。
- **`npm run check:overflow` は走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| **S-1** | **`packages/` 配下を直さないと受入条件を満たせないと判断したとき。** 実装は検収済みである。**直さずに止まって報告すること** |
| **S-2** | 代役が C-6 を満たせないと判断したとき。**緑にして通さない** |
| **S-3** | 新しい npm 依存が必要だと判断したとき。**入れずに止まる** |
| **S-4** | 既存 93 件のいずれかが赤くなり、その原因が本発注の変更にあると判断したとき |
| **S-5** | `APP_SPEC` §9.2 と本書の指示が食い違うと気づいたとき。**`APP_SPEC` が正本である** |

---

## 7. 完了報告に含めること

1. 変更したファイルの一覧（**`tests/unit/storage/atomicity.test.ts` 以外を触っていないことの申告**）。
2. `npm test` の**末尾 10 行をそのまま**（`ℹ tests` / `ℹ pass` / `ℹ fail` を含む）。件数を文章で言い換えない。
3. `npm run typecheck` と `npm run lint` の終了コード。
4. **B-1・B-5・B-6 それぞれについて、赤くなった試験名。** 赤くならなかったものはそう書く。
5. 反転を戻した後の `db.ts` / `merge.ts` / `atomicity.test.ts` の `sha256sum`。
6. A-4（`packages/` 無変更）の実測（`git status --porcelain packages/` の出力そのまま）。
7. **判断に迷って自分で決めた箇所があれば、その一覧と理由。** 黙って決めない。
