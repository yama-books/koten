# Codex向け発注文書 013: 偽合格の除去 —— `npm test` の取りこぼしと同語反復の試験

発注日: 2026-08-31
階層: **Luna**（局所・ネットワーク不要・ブラウザ不要。受入条件を機械判定できる）
着手時期: **即時。発注014 と並行してよい**（§2 のとおり変更境界が重ならない）
優先度: **高**（発注009 の検収で不合格となった項目の一部。P4 後半はここが直るまで着手できない）
対象: `package.json`（`test` script）、`tests/unit/storage/storage.test.ts`、`tools/overflow-check/index.ts`

---

## 0. 背景 —— 何が起きたか

2026-08-31、親担当が発注009 の成果を検収し、**不合格**とした。
報告された数値を転記せず、全項目を再実行し、さらに破壊試験を行った結果、次が判明した。

### 実測した事実（推測ではない）

| # | 事実 | 確認方法 |
|---|---|---|
| A | 保存層の unit test 6 件が `npm test` に含まれていない | `npm test` は 32 件。`tests/` 配下の全 test ファイルを渡すと 38 件。差の 6 件が保存層 |
| B | 「upgrade 例外で abort し既存データを保持」の試験が abort を検査していない | `db.ts` の `request.transaction?.abort();` を削除して実行 → **6/6 合格のまま** |
| C | `tools/overflow-check/index.ts:90` の `serverLog` は宣言が存在しない | `grep -n serverLog tools/overflow-check/index.ts` → 参照 1 箇所のみ、宣言なし |

**A の原因**は `package.json` の glob である。

```json
"test": "node --experimental-strip-types --test tests/data/*.test.ts tests/unit/*.test.ts"
```

`tests/unit/*.test.ts` は 1 階層しか展開しない。`tests/unit/storage/storage.test.ts` は一致しない。
**保存層が壊れても `npm test` は緑のままである。** これは回帰検査の穴として最も悪い形である。

**B の原因**は試験の作りである。現在の試験はこう書かれている。

```ts
const existingEvents = [{ eventId: 'already-saved' }];
const factory = createFailingUpgradeFactory(existingEvents);
const result = await openDatabase(factory, { version: 2, afterSchemaUpgrade: () => { throw new Error('test upgrade failure'); } });
assert.deepEqual(existingEvents, [{ eventId: 'already-saved' }]);
```

`existingEvents` は試験の中で作った配列で、**どの経路からも書き換えられない。**
代役の `abort()` も空実装である。したがって最後の `assert` は
「3 行前に作った配列が変わっていないこと」を主張しているだけで、
`db.ts` が abort しようがしまいが通る。実測でそのとおりだった。

**C は発注005 の成果物に残った潜在バグである。**
本体は正常で、親担当の実測では `check:overflow` は **1200 件全件合格・終了コード0** である。
`serverLog` は catch 節の中でのみ参照されるため、**検査が失敗したときだけ**
`ReferenceError` に化けて本当の原因を握り潰す。発注009 の担当者はこれに当たり、
「`check:overflow` が `serverLog` で落ちた」と報告したが、落ちた本当の理由は失われている。

---

## 1. この発注の主題

**「検査が緑であること」と「実装が正しいこと」の間に因果を通すこと。**

現在この 3 箇所には因果が無い。実装を壊しても検査が緑のままである。
本発注は、実装を壊したら検査が赤くなる状態にする。それだけである。
機能追加ではない。**新しい振る舞いを 1 つも足さないこと。**

---

## 2. 変更境界

### 変更してよいファイル

```text
package.json                            （test script の 1 行のみ）
tests/unit/storage/storage.test.ts      （試験の是正・追加）
tools/overflow-check/index.ts           （serverLog の宣言追加のみ）
```

### 絶対に変更しないファイル・領域

```text
packages/shared/src/storage/**          （実装は正しい。試験の側を直す）
packages/shared/src/domain/**
tools/check-storage/**                  （発注014 の範囲。手を出さない）
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
**新しい npm 依存を追加しない。**

> **発注014 との並行について。** 発注014 は `tools/check-storage/**` のみを触る。
> 本発注は `tools/check-storage/**` を触らない。`package.json` は本発注だけが触る
> （発注014 は `check:storage` script が既にあるため `package.json` を変更しない）。
> したがって同時に走らせて衝突しない。

---

## 3. 裁定済み事項（再検討しないこと）

1. **実装は変えない。** §0 の A・B は試験の欠陥であって実装の欠陥ではない。
   `db.ts` の abort は正しく書かれている。`fallback.ts` の容量判定も正しい。
   **実装を直したくなったら、それは §6 の停止条件 S-B である。**
2. **`serverLog` の修正は宣言の追加のみ。** `tools/overflow-check/index.ts` の
   検査ロジック・判定基準・出力書式に手を入れない。1200 件全件合格を維持する。
3. **同じ test ファイルを二度実行しない。**
   `tests/unit/*.test.ts` と `tests/unit/**/*.test.ts` を素朴に並べると
   同じファイルが重複して走る（親担当が実測済み。38 件のはずが 38 件を超える並べ方がある）。
   **重複した件数を「増えた」と読み違えないこと。**
4. **試験の件数は自然数として報告する。** 「6 件成功」ではなく
   「保存層 8 件、全体 40 件」のように、変更前後の実数を両方書く。
5. **代役 `IDBFactory` は試験の中に置く。** 新規依存にしない（発注009 §3.4 の継続）。

---

## 4. 実装範囲

### 4.1 `npm test` に保存層試験を含める

`package.json` の `test` script を、`tests/` 配下の全 test ファイルを
**各 1 回だけ**実行するように直す。

- 変更前の実測: **32 件**（保存層を含まない）
- 変更後に期待される件数: **38 件 + §4.2〜§4.4 で追加した件数**

`tests/` の下に将来ディレクトリが増えても取りこぼさない形にすること。
glob の展開はシェルに依存する。**シェルに頼らず Node 側で解決できる書き方を優先すること**
（`node --test` のディレクトリ指定や `--test-name-pattern` ではなく、
実行対象ファイルの列挙が確定する方法を選ぶ）。
どの方法を選んだかと、**なぜ重複しないと言えるのか**を報告に書くこと。

### 4.2 試験の是正 A —— upgrade の abort

`tests/unit/storage/storage.test.ts` の
`'storage: an upgrade exception aborts and preserves the existing event'` を作り直す。

代役 `IDBFactory` を、**abort の有無で結果が変わる**ものにすること。最低限:

- 代役は「確定済みデータ」と「upgrade 中の未確定の変更」を別に持つ。
- `onupgradeneeded` の中で既存データに触れる経路を作る（本物の IndexedDB と同じく、
  upgrade トランザクションの中の変更は abort されなければ確定する）。
- `transaction.abort()` が呼ばれたら未確定の変更を捨てる。呼ばれなければ確定させる。

そのうえで次の 2 つを検査する。

1. `openDatabase` が `{ ok: false, reason: 'upgrade-failed' }` を返すこと。
2. **確定済みデータが upgrade 前と同一であること。**

### 4.3 試験の追加 B —— `fallback.ts` の失敗の種類

現在の試験は容量超過（`QuotaExceededError`）だけを見ている。
**容量超過でない失敗**の分岐が検査されていない。次を追加する。

- `setItem` が `QuotaExceededError` **以外**の例外を投げたとき、
  `reason` が `'write-failed'`、`shouldExport` が **`false`** であること。
- LocalStorage 自体が使えない（`storage` が `undefined`）とき、
  例外を投げずに結果型を返すこと。

### 4.4 試験の追加 C —— `events` が追記であること

現在の試験は `Object.keys(eventsRepository)` で API 名を見ているだけで、
`appendEvent` が `add` を使っているか `put` を使っているかを見ていない。
`put` に変えると**同じ `eventId` の記録を黙って上書きする**。これは記録の消失である。

代役の `IDBObjectStore` を使い、次を検査する。

- 同じ `eventId` のイベントを 2 回 `appendEvent` すると、2 回目が失敗すること
  （`add` の重複キー拒否の挙動を代役で模す）。
- 1 回目に保存された内容が残っていること。

### 4.5 `tools/overflow-check/index.ts` の `serverLog` 宣言

`tools/check-storage/index.ts` の 12・26〜27 行目と同じ方式で、
`serverLog` を宣言し、spawn した server の `stdout` / `stderr` を蓄積する。
**それ以外を変更しない。**

---

## 5. 受入条件

### 5.1 実行

次がすべて終了コード0で完了する。**それぞれ実際に実行し、`npm test` は件数を書く。**

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

`npm run check:overflow` は **1200 件全件合格**を維持していること。
下回った場合は修正せず、首番号・読み・幅・違反キーをそのまま報告して停止すること。

`npm run check:storage` は本発注の対象外である（発注014 が作り直している）。
実行してもよいが、その結果は本発注の合否に含めない。

### 5.2 赤緑の証明 —— これが本発注の本体である

**次の 4 つの破壊試験を自分で実施し、変更前後の出力を両方報告に貼ること。**
「通るはず」ではなく、実際に壊して赤くなったことを見せること。

| # | 壊す箇所 | 期待 |
|---|---|---|
| R-1 | `packages/shared/src/storage/db.ts` の `try { request.transaction?.abort(); } catch { … }` を削除 | §4.2 の試験が**落ちる** |
| R-2 | `packages/shared/src/storage/fallback.ts` の `const quota = …` を `const quota = true` に置換 | §4.3 の試験が**落ちる** |
| R-3 | `packages/shared/src/storage/repo/events.ts` の `store.add(event)` を `store.put(event)` に置換 | §4.4 の試験が**落ちる** |
| R-4 | `packages/shared/src/storage/` を丸ごと退避 | `npm test` が**落ちる**（§4.1 が効いている証拠） |

**手順の義務。** 破壊試験は 1 件ずつ行い、次を守ること。

1. 壊す前に対象ファイル（または対象ディレクトリの全ファイル）の SHA-256 を記録する。
2. 壊す。実行する。出力を保存する。
3. **直ちに元へ戻す。**
4. SHA-256 を再計算し、1 と一致することを確認する。**一致を報告に書く。**
5. 次の破壊試験へ進む。

**復元できなかった場合は、その時点で停止して報告すること（§6 の S-A）。**
壊したまま次へ進まないこと。並行して壊さないこと。

### 5.3 親担当が検収時に実行する試験

**検収では、親担当が §5.2 の R-1〜R-4 を独立に再実行する。**
1 つでも「壊したのに緑のまま」であれば不合格とする。
報告の文章ではなく、こちらの実行結果で判定する。これを見越して書くこと。

### 5.4 その他

- `git status --short` の差分が §2 の許可範囲に収まっている。**`docs/**` に差分が出ていないこと。**
- `npm test` の件数が変更前（32 件）より増えていること。増分の内訳を書くこと。

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| S-A | 破壊試験の復元に失敗した、または SHA-256 が一致しない。**直ちに停止し、失った内容を報告する** |
| S-B | 試験を成立させるために `packages/shared/src/storage/**` の実装変更が必要だと判断した。**変更境界外である。** なぜ試験側で表現できないのかを書いて停止する |
| S-C | `check:overflow` が 1200 件を下回った |
| S-D | `test` script の書き換えで、重複なしの列挙がシェル依存なしに実現できない |
| S-E | 新規 npm 依存が必要だと判断した。**依存追加は禁止である** |
| S-F | `tools/overflow-check/index.ts` の `serverLog` 以外に手を入れる必要が出た |

**どの停止条件でも `docs/` 配下を自分で編集してはならない。**

---

## 7. 完了報告に含めること

1. 変更したファイルの一覧と、各ファイルで何をしたか。
2. §5.1 の各コマンドを、**実行した方法と観測結果**で 1 項目ずつ。`npm test` は変更前後の件数。
3. §4.1 で選んだ列挙方法と、**重複しないと言える根拠**。
4. **§5.2 の R-1〜R-4 それぞれについて、壊したときの出力・戻したときの出力・SHA-256 の一致**。
   4 件すべて。省略しないこと。
5. §6 の停止条件に当たった項目。なければ「なし」と明記。
6. **独自に決めたことがあれば全件。なければ「なし」と明記。**
   代役の作り、試験名、追加した試験の粒度など、本書に書かれていない判断は小さくても全部書くこと。

推測・予定ではなく観測結果を書くこと。**実行していない検査を「成功」と書かないこと。**
**壊していない破壊試験を「落ちた」と書かないこと。**
