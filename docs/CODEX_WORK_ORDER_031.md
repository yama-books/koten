# Codex向け発注文書 031: P10-A 承認の書き込み口（`review/*.yaml` を安全に書く CLI）

発注日: 2026-09-01（第14回セッション）
階層: **Terra**
優先度: 中（**発注030 と完全に並行して進む**）
対象: **`tools/review-approve/` と `tests/data/review-approve.test.ts` のみ**

> **並行発注がある。** 発注030（Terra・`packages/hyakunin/src/domain/` と `tests/unit/`）。
> **本発注とは対象ファイルが 1 件も重ならない。**
> **`npm test` の総件数は判定材料にならない**（030 が同時に増やすため）。
> §5 の A-2 は**本発注が作る 1 本の試験ファイル**で判定する。
>
> **基準線（2026-09-01・本発注書作成時に実測）**: 作業ツリーは clean、`npm run test:node` 196 件全緑、
> `npm run test:screen` 6 件全緑。
>
> **本発注は `review/*.yaml` の実物を 1 文字も書き換えない**（§3 の裁定 2）。
> 発注030 の受入条件 A-13 が `git status --porcelain review` の空を要求しているためでもある。

---

## 0. この発注の位置づけ（**先に読むこと**）

**いま、公開できる問は 0 件である。** `packages/hyakunin/src/data/generated/questions.blank.json` と
`questions.author.json` はどちらも `[]` であり、`manifest.json` の `reviewCounts` は
`blanks.pending: 500` / `authors.pending: 100` である。

これは不具合ではない。**人確認されていない候補を公開出題しない**という門
（`APP_SPEC` §7.1・§14、validator の V-07）が効いている状態で、
発注027 の破壊試験で両方向から固定されている。

**この門を開ける唯一の正しい方法が、`review/*.yaml` への承認の書き込みである。**
`docs/HANDOFF.md` §5.2 の B は「台帳の校正は全体完成後。いま人手を使わない」と定めており、
**その判断は変えない。** 本発注が作るのは、**そのときに人が使う道具**である。

道具を先に作る理由は 2 つある。

1. **書き込み口が無いままだと、校正の日に手で 500 件の YAML を書くことになる。**
   手書きは V-15（一括承認に根拠が必要）を機械的に守れない。
2. **本発注は誰の作業も待たない。** `tools/` だけを触り、発注030（`packages/`）と衝突しない。

### P10 全体との関係（**本発注は P10 の一部だけである**）

`docs/IMPLEMENTATION_PLAN.md` の P10 は 5 項目からなり、**依存関係は P2, P9** である。
P9 は未着手であり、裁定 **D-02**（統計・報告の受け口）も未決である。
したがって P10 全体はまだ出せない。**P2 だけに依存する部分を切り出す。**

| P10 の項目 | 本発注 | 理由 |
|---|---|---|
| 2. 候補確認（`review/*.yaml` への追記） | **本発注で行う** | P2 にしか依存しない |
| 1. `tools/review-page/` の Vite エントリ | **行わない** | 画面は後。**まず書き込み口の正しさを固める** |
| 3. 報告確認 | **行わない** | P9 依存 |
| 4. 管理者集計（Admin SDK） | **行わない** | P9・D-02 依存 |
| 5. `scan-publish` への review-page 検査 | **行わない** | 1 が無いので検査対象が無い |

**画面を作らないのは意図的である。** 台帳を壊す事故は、画面があってもなくても
書き込み口の設計で決まる。**先に口を固め、画面は後から被せる。**

---

## 1. 先に読むもの

| ファイル | 読む箇所 | 何のために |
|---|---|---|
| `tools/build-data/parse-yaml.ts` | **全部** | **本発注が書く YAML は、必ずこの parser で読み戻せなければならない。** 対応していない記法を出したら不合格 |
| `tools/build-data/apply-review.ts` | 全部 | 台帳の読み方・`reviewCounts` の数え方。**`missing` を pending に足している**ことに注意 |
| `tools/build-data/validate.ts` | **V-07 と V-15 の行** | 書いた結果が validator を通ること |
| `tools/build-data/questions.ts` | `metadata()` と `generateQuestions()` | **承認が出題へどう効くか。`status === 'approved'` だけが `human-confirmed` になる** |
| `tools/build-data/paths.ts` | 全部 | `reviewFile(directory, name)` が**ディレクトリを引数で受ける**こと（試験で使う） |
| `review/*.yaml` の 5 本 | 全部 | 既存の形。**`blanks.yaml` だけ `entries: []` である** |
| `tests/data/review.test.ts` | 全部 | 書き方を合わせる。**既存の期待値を壊さない** |
| `docs/IMPLEMENTATION_PLAN.md` | **§5.4（人間確認結果を JSON へ戻す手順）**、§5.5、§15.1（D-05 一括承認）、P10 | 一括承認の必須項目 |
| `docs/APP_SPEC.md` | §7.1、§12、§14 | 公開条件 |

---

## 2. 変更境界

### 変更・作成してよいファイル

| ファイル | 種類 |
|---|---|
| `tools/review-approve/index.ts` | 新規 |
| `tools/review-approve/emit-yaml.ts` | 新規 |
| `tools/review-approve/plan.ts` | 新規 |
| `tests/data/review-approve.test.ts` | 新規 |

### 絶対に変更しないファイル・領域

- **`review/*.yaml` の 5 本を 1 文字も変更しない**（§3 の裁定 2）。**読むだけ。**
- **`tools/build-data/` 以下を 1 文字も変更しない。** import して**呼ぶだけ**である。
  parser を「直したい」と思っても直さない（§6 の停止条件）。
- **`packages/` 以下を 1 文字も変更しない**（発注030 の範囲である）。
- **`packages/hyakunin/src/data/generated/` 以下を 1 文字も変更しない。**
  **`npm run data:build` を実行しないこと**（`--check` は実行してよい）。
- `tests/unit/`、`tests/screen/`、`docs/`、`.github/`、`assets/` の各以下
- **一次資料 Markdown 5 本と PDF。読み取りもしなくてよい。**
- **`package.json`。スクリプトも依存も足さない。**
  CLI は `node --experimental-strip-types tools/review-approve/index.ts` で直接起動する。
  **`review:approve` スクリプトの追加は、本発注では行わない**（ルート `package.json` は
  発注029 で触ったばかりであり、並行発注中に触らない）。
- **新しい npm 依存を入れない。** YAML ライブラリを入れない（既存 parser と対にする自前の出力器を書く）。

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1（D-38）: **P10 は分割する。本発注は「候補確認の書き込み口」だけである。**

§0 の表のとおり。**画面・報告確認・管理者集計を作らない。**
「ついでに作っておく」を許さない。P9 と D-02 が決まる前に作ると、決め直しになる。

### 裁定 2: **本発注は `review/*.yaml` の実物を書き換えない。試験は必ず一時ディレクトリで行う。**

理由は 3 つある。

1. **`tools/build-data/` の関数はすべて `directory` を引数で受ける。**
   `readReviewLedgers(directory = paths.review)` / `paths.reviewFile(directory, name)`。
   **既にそう作られているので、一時ディレクトリで試験できる。**
2. **並行発注030 の受入条件 A-13 が `git status --porcelain review` の空を要求している。**
   本発注が実物を汚すと、030 が理由もなく落ちる。
3. **台帳への承認の書き込みは、人が名前と根拠を添えて行う行為である**
   （`docs/HANDOFF.md` §10.5 の「一次資料の内容に関する判断」に隣接する）。
   Codex が代わりに押さない。

**`--write` を実物のディレクトリに向けて実行しないこと。** §6 の停止条件である。

### 裁定 3: **既定は書き込まない。`--write` を明示したときだけ書く。**

引数なしで実行したら**差分を表示して終わる**（dry-run）。
`--write` があるときだけファイルを置き換える。**逆にしない。**

台帳は「人が書き込む唯一の場所」であり、取り返しのつく操作ではあるが、
**気づかずに書き換わることを設計で防ぐ。**

### 裁定 4: **一括承認の必須項目を、CLI が拒否によって強制する。**

`docs/IMPLEMENTATION_PLAN.md` §5.5 と §15.1（D-05）が求めるものは次である。

| 項目 | 必須か |
|---|---|
| `status` | 常に必須。`approved` / `rejected` / `hold` / `pending` の 4 値のみ |
| `confirmationMode` | 常に必須。`individual` / `batch` の 2 値のみ |
| `confirmedBy` | **承認・却下・保留のとき必須**（`pending` のときは `null` を許す） |
| `confirmedOn` | 同上。`YYYY-MM-DD` の形のみ |
| `batchEvidenceRef` | **`confirmationMode: batch` のとき必須**（V-15）。`individual` のときは `null` |
| `proposedBy` | 常に必須。`human` / `ai` の 2 値のみ |

**足りない引数があれば、書き込まずに終了コード 1 で終わる。** 既定値で埋めない。
とくに `confirmedBy` を `"unknown"` や空文字で埋めることを許さない。
**誰が確認したか分からない承認は、承認ではない。**

### 裁定 5: **書いた結果を必ず読み戻して検査する。読み戻せなければ書かない。**

`tools/build-data/parse-yaml.ts` は**汎用の YAML parser ではない**。
引用符・`[]`・数値・`null` / `true` / `false` しか解さず、
`[ ] { } & * ! > |` を含むスカラは**例外を投げる**。タブも弾く。インデントは 2 の倍数のみ。

したがって本発注の出力器は、**この parser と対でなければ意味がない。**

**書き込みの直前に、次の順で必ず検査する。**

1. 生成した文字列を `parseYaml()` に通す。**例外が出たら書かない。**
2. 読み戻した結果と、書こうとした構造を**深く比較する**。**一致しなければ書かない。**
3. 5 本すべてを `readReviewLedgers(一時ディレクトリ)` に通す。**例外が出たら書かない。**
4. `validateData()` を通す。**V-15 で落ちたら書かない。**

**「たぶん大丈夫」で書かないこと。** 台帳が壊れると、生成 JSON も出題も止まる。

### 裁定 6: **`blanks.yaml` の空台帳には、まず `pending` の骨組みを敷く。承認と分ける。**

**実測（2026-09-01）**: `review/blanks.yaml` は `entries: []` である。
一方 `manifest.json` の `blanks.pending` は **500** である。
これは `reviewCounts` が **`missing = expected - entries.length` を pending に足している**ためで、
**「台帳に行が無い」と「pending と書いてある」が同じ意味になっている。**

承認するには、まず 500 行が要る。したがって CLI に 2 つの操作を分けて持たせる。

| 操作 | 内容 | 危険度 |
|---|---|---|
| `seed` | **`generateQuestions()` が数えた候補**（現在は 500 件）を **`status: pending` で**台帳へ敷く。**件数を決め打ちしない**（裁定 7） | **低い。** 公開出題は 1 件も増えない |
| `set` | 指定した範囲の行の `status` ほかを書き換える | **高い。** 承認は公開出題を増やす |

**`seed` は公開出題を 1 件も増やしてはならない。** これを機械判定する（A-6）。
**`seed` の直後に `npm run data:check` を実行し、`data/generated/` が 1 バイトも変わらないこと**を
確かめる。理由は上記のとおり、pending の数え方が「行が無い」と「pending」で同じになるためである。

**`seed` が既存の行を上書きしないこと。** 既にある `cardNo` × `ku` の行は**触らない**。

### 裁定 7: **候補の中身を発明しない。`generateQuestions` が数えた候補と一致させる。**

`seed` が敷く行は、**`tools/build-data/questions.ts` の `generateQuestions()` が返す
`blankCandidates` と 1 対 1 に対応**しなければならない。
「100 首 × 5 句 = 500」と決め打ちで書かない。**生成器に数えさせる。**

生成器が候補の作り方を変えたとき、台帳が黙ってずれることを防ぐためである。

### 裁定 8: **出力は決定的でなければならない。同じ入力から同じバイト列が出る。**

`Date` も `Math.random` も出力器の中で呼ばない。日付は**引数で受け取る**。
行の順序は `cardNo` 昇順、同じ `cardNo` なら `ku` 昇順に固定する。
**同じ台帳に対して 2 回実行したら、2 回目の差分が空である**こと（A-7）。

---

## 4. 実装範囲

### 4.1 `tools/review-approve/emit-yaml.ts`（新規）

`parse-yaml.ts` が読める範囲だけを出力する。**汎用の YAML 出力器を書かない。**

| 関数 | 内容 |
|---|---|
| `emitLedger(name, entries): string` | 先頭のコメント 2 行 ＋ `version: 1` ＋ `entries:` ＋ 各行。**既存 5 本と同じ体裁にする**（先に読むこと） |
| `emitScalar(value): string` | `null` / `true` / `false` / 整数 / `[]` / 文字列。**parser が弾く文字を含む文字列は引用符で囲む。囲んでも解けない場合は例外を投げる** |

**`entries: []` の空台帳も正しく出せること**（`blanks.yaml` の現状がこれである）。

### 4.2 `tools/review-approve/plan.ts`（新規）

**書き込みを行わない純関数**として、変更の計画を作る。

| 関数 | 内容 |
|---|---|
| `planSeed(name, candidates, existing): Plan` | 裁定 6・7。既存にある行は `unchanged`、無い行は `added`（`status: pending`） |
| `planSet(name, selector, fields, existing): Plan` | 裁定 4。必須項目が欠けていれば `Plan` ではなく**不足の一覧**を返す |
| `describePlan(plan): string` | dry-run の表示。**何行が追加・変更・据置になるかを数で示す** |

`Plan` は `{ added, changed, unchanged, entries }` の形とする。**副作用を持たない。**

### 4.3 `tools/review-approve/index.ts`（新規）

CLI の入口。**ここだけがファイルを書く。**

```text
node --experimental-strip-types tools/review-approve/index.ts seed  --ledger blanks --dir <path>
node --experimental-strip-types tools/review-approve/index.ts set   --ledger blanks --dir <path> \
     --cards 1-20 --status approved --mode batch \
     --confirmed-by "<名前>" --confirmed-on 2026-09-01 --evidence "<根拠への参照>" [--write]
```

- **`--dir` は必須とする。** 既定で `review/` を向かせない（裁定 2）。
- **`--write` が無ければ書かない**（裁定 3）。dry-run の出力を標準出力へ出し、終了コード 0。
- 必須項目が欠けていれば、**不足を列挙して終了コード 1**（裁定 4）。
- 裁定 5 の 4 段検査に 1 つでも失敗したら、**書かずに終了コード 1**。
- **標準出力に一次資料の本文を出さない。** 台帳の識別子（`cardNo` / `ku` / `status`）だけを出す。

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm run typecheck` / `npm run lint` が終了コード 0 | 各コマンド |
| A-2 | **`tests/data/review-approve.test.ts` が 0 件から 18 件以上へ増えている** | **着手時**はファイルが存在しないので `ls tests/data/` の出力で「無いこと」を示す（**存在しないファイルを `--test` に渡さない**）。**完了時**は `node --experimental-strip-types --test "tests/data/review-approve.test.ts"` の `ℹ tests`。**両方を報告に貼る。全体の件数は並行発注のため判定に使わない** |
| A-3 | **既存の `tests/data/*.test.ts` が名前も内容も変わらず緑** | `node --experimental-strip-types --test "tests/data/*.test.ts"` の `ℹ pass` / `ℹ fail`。**`fail 0`** |
| A-4 | **`review/*.yaml` の 5 本に差分が無い**（裁定 2） | `git status --porcelain review` が空。**`sha256sum review/*.yaml` を着手時と完了時の 2 回**貼る |
| A-5 | **`packages/` と `tools/build-data/` と `data/generated/` に差分が無い** | `git status --porcelain packages tools/build-data` が空 |
| A-6 | **`seed` が公開出題を 1 件も増やさない**（裁定 6） | 一時ディレクトリで `seed` を実行 → `buildData(そのディレクトリ)` の `questionsBlank.length` が **0 のまま**、かつ `reviewCounts.blanks` が **`{pending:500, approved:0, rejected:0, hold:0}` のまま**であることを見る試験 |
| A-7 | **2 回実行しても差分が出ない**（裁定 8） | `seed` を 2 回、`set` を 2 回。**2 回目の `Plan` の `added` と `changed` がどちらも 0** |
| A-8 | **書いた YAML が `parse-yaml.ts` で読み戻せる**（裁定 5） | 生成文字列 → `parseYaml()` → 深い比較で一致。**5 本すべてについて** |
| A-9 | **必須項目が欠けたら書かない**（裁定 4） | `confirmedBy` 欠落 / `confirmedOn` 欠落 / `batch` なのに `evidence` 欠落 の **3 通りすべて**で、終了コード 1 かつファイルが変わらないこと |
| A-10 | **`--write` が無ければ書かない**（裁定 3） | dry-run 実行後、対象ファイルの `sha256sum` が変わらないこと |
| A-11 | **承認すると出題が増える**（門が本当に開くこと） | 一時ディレクトリで `blanks` の一部を `approved` にし、`buildData` の `questionsBlank.length` が **0 より大きくなる**ことを見る試験。**この 1 本が「道具が効いている」ことの証明である** |
| A-12 | **V-15 を通らない状態を書かない**（裁定 5 の 4） | `batch` かつ `batchEvidenceRef` が `null` の計画を強制的に作り、`validateData` が投げること、CLI がそれを事前に止めることの**両方** |
| A-13 | **`Math.random` / `Date.now` / `new Date` / `toISOString` が `tools/review-approve/` に 0 件**（裁定 8） | `grep -nE "Math\.random\|Date\.now\|new Date\|toISOString" tools/review-approve/index.ts tools/review-approve/emit-yaml.ts tools/review-approve/plan.ts` の出力を貼る（**0 件であること**） |
| A-14 | **候補数を決め打ちしていない**（裁定 7） | `grep -n "500" tools/review-approve/` の出力を貼る（**0 件であること**） |
| A-15 | `npm run data:check` が終了コード 0（実物の `review/` に対して） | コマンドの出力を貼る |
| A-16 | `npm run scan:publish` が 0 件違反 | コマンドの出力を貼る |

### 5.1 破壊試験（**受入の中心。ここが本題である**）

**実装の論理を 1 箇所だけ反転させ、狙った試験だけが赤くなることを示す。**
**反転させたら必ず元へ戻し、戻した後の `sha256sum` を報告に貼る。**

| # | 反転させる論理 | 赤くなるべき試験 |
|---|---|---|
| **B-1** | `seed` が `status` を `pending` ではなく `approved` で敷く | **A-6 の試験だけ**が赤くなること。**`seed` の行数を見る試験は緑のままであること**（行数は同じで中身だけ危険になる、という最も怖い形を検出できているかの確認） |
| **B-2** | `seed` が既存の行を上書きする | 既存の `status` が保たれることを見る試験だけ |
| **B-3** | `planSet` が `confirmedBy` の欠落を見逃す | A-9 の 3 通りのうち**該当する 1 本だけ**が赤くなること（3 つを別々に固定していることの証明） |
| **B-4** | `planSet` が `batch` のとき `evidence` の欠落を見逃す | A-9 の 3 通りのうち**該当する 1 本だけ**と、A-12 の CLI 側 |
| **B-5** | `--write` が無くても書く | **A-10 の試験だけ** |
| **B-6** | `emitScalar` が引用符を付けない | parser が弾く文字（`[`・`#`・`:` を含む文字列）を書いたときに読み戻せなくなることを見る試験だけ。**通常の文字列を書く試験は緑のままであること** |
| **B-7** | 書き込み前の読み戻し検査（裁定 5 の 1〜2）を飛ばす | 壊れた YAML を書こうとしたときに止まることを見る試験だけ |
| **B-8** | `set` が承認しても `human-confirmed` にならないよう `status` の綴りを変える | **A-11 の試験だけ**が赤くなること（**門が開くことを見ている試験が本当に門を見ているかの確認**） |
| **B-9** | 行の並びを `cardNo` 昇順ではなく入力順にする | 決定性を見る試験（A-7）だけ |
| **B-10** | 候補数を `500` で決め打ちする | A-14 の grep が 1 件になり、かつ**生成器が候補数を変えたときに追随できないことを見る試験**が赤くなること |

**B-1 と B-8 が本発注で最も重要である。**
B-1 は「安全な操作が危険な操作にすり替わっていないか」、
B-8 は「門が本当に開くことを見ているか」を確かめる。
**どちらも、行数や件数だけを見る試験では検出できない。**

**どれかが期待どおりにならなかった場合、「全部緑でした」と報告せず、
どれがどうならなかったかを報告して止まること。**

### 5.2 空集合の偽合格を作らないこと（**このプロジェクトが繰り返し踏んでいる型**）

**空配列に対する `every()` は `true` を返す。** 「すべての行が pending である」形の assert は、
**行が 0 件のとき無条件に緑になる。** `blanks.yaml` は現に `entries: []` であり、
**本発注で最も踏みやすい罠である。**

```ts
assert.ok(entries.length > 0, '台帳が空では検査にならない');
assert.equal(entries.filter((entry) => entry.status !== 'pending').length, 0);
```

**A-6 は必ずこの形で書くこと。** 「`seed` の後に台帳が 500 行あること」を先に assert する。

同じ理由で、**A-11 は「増えた件数が 0 より大きい」だけでなく、
「増えた問の `reviewStatus` が `human-confirmed` である」ことも見ること。**

### 5.3 実行環境の注意（Windows）

- 一時ディレクトリは `node:fs` の `mkdtempSync(path.join(os.tmpdir(), ...))` で作り、**試験の後に消す**。
  **リポジトリの中に一時ディレクトリを作らないこと**（`git status` が汚れ、A-4・A-5 が落ちる）。
- **`npm run data:build` を実行しないこと。** `data:check` は実行してよい。
- **`npm run check:overflow` を走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。
- **`npm test` の全体実行は並行発注（030）のため赤くなることがある。** A-2・A-3 のファイル指定で判定する。
- Windows のファイルロックで書き込みが失敗することがある。**破壊試験の書き戻しに再試行を入れ、
  戻した後に必ず `sha256sum` で一致を確かめること。**

---

## 6. 停止して報告する条件

- **`review/*.yaml` の実物へ `--write` したくなった。** せずに止まる（裁定 2）。
- **`tools/build-data/parse-yaml.ts` を直したくなった。** 直さずに止まり、**何が書けないのかを報告する。**
  parser は発注001 の成果物であり、既存の 5 本を読めている。**書けない記法があるなら、
  書かない形へ寄せるのが正しい。**
- **YAML ライブラリを入れたくなった。** 入れずに止まる。
- **`package.json` にスクリプトを足したくなった。** 足さずに止まる（§2）。
- **候補の作り方（どの句を穴埋めにするか）を決める必要が生じた。** 決めずに止まる。
  **それは `tools/build-data/questions.ts` の仕事であり、本発注の範囲ではない**（裁定 7）。
- **画面（`.tsx`）が要ると判断した。** 作らずに止まる（裁定 1。P10 の残りは後の発注である）。
- **`data/generated/` を更新しないと受入条件を満たせないと判断した。** 更新せずに止まる。
- §2 で許した以外のファイルが必要になった。**作らずに**止まる。

---

## 7. 完了報告に含めること

1. **着手時と完了時の、`tests/data/review-approve.test.ts` の試験件数**（両方）。
2. **`node --experimental-strip-types --test "tests/data/*.test.ts"` の `ℹ tests` / `ℹ pass` / `ℹ fail`。**
3. `typecheck` / `lint` / `data:check` / `scan:publish` の終了コードと出力。
4. **着手時と完了時の `sha256sum review/*.yaml`**（**5 本すべて一致していること**。裁定 2）。
5. `grep -n "^test(" tests/data/review-approve.test.ts` の出力そのまま。
6. **A-13・A-14 の grep の出力そのまま**（どちらも 0 件であること）。
7. **A-11 の試験で、承認した行数と、増えた `questionsBlank` の件数の実数**
   （**「増えた」ではなく数を書く**）。
8. **破壊試験 B-1〜B-10 の一覧と、それぞれで赤くなった試験名の全部**
   （B-1・B-3・B-4・B-6 は「赤くなったもの」と「緑のままだったもの」を両方書く）。
9. **反転を戻した後の `sha256sum tools/review-approve/*.ts`。**
10. `git status --porcelain` の出力そのまま。
11. **`emit-yaml.ts` が引用符を付ける条件の一覧**（どの文字を見て、なぜそうしたか）。
12. **判断に迷って自分で決めた事項があれば、全部列挙する。**
    **「独自に決めたことは無い」と書く前に、決めた箇所が本当に無いか確かめること。**
    とくに **CLI の引数名・`Plan` の形・コメント行の体裁**は本発注書が細部まで定めていないので、
    決めた内容を必ず書くこと。
