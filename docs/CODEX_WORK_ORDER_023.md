# Codex向け発注文書 023: P2 の残件 — 人確認台帳（`review/`）と `apply-review` と未実装の検査 6 件

発注日: 2026-09-01（第11回セッション）
階層: **Terra**（仕様は `docs/IMPLEMENTATION_PLAN.md` §5.1〜§5.5 に確定済み。受入条件はすべて機械判定できる）
優先度: **高。P6（出題生成と選題）はこの残件が塞いでいる。**
対象: `tools/build-data/`、`review/`（新規）、`tests/data/`

> **並行発注は無い。** 021・022 は 2026-08-31 に検収して合格した。本発注は単独で走る。

---

## 0. この発注の位置づけ（**先に読むこと**）

`docs/IMPLEMENTATION_PLAN.md` §10 の実施状況は P2 を
「**発注001の範囲完了。正式 P2 は一部残件あり。review 台帳・公開問題 JSON・`reviewCounts` は未実装**」
としている。本発注はこのうち**公開問題 JSON を除く全部**を実装する。

**公開問題（`questions.*.json`）と `review/blanks.yaml` の中身は P6 の領分であり、本発注では作らない**（S-7）。
本発注が作るのは、**P6 が「人が承認したものだけを出題に載せる」ことを機械的に強制されるための土台**である。

### 現状（親担当が 2026-09-01 に実測した）

| 項目 | 実測 |
|---|---|
| 実装済みの検査 | V-01・V-02・V-04・V-05・V-06・V-12・V-14（`tools/build-data/validate.ts` 全 60 行） |
| **未実装の検査** | **V-03・V-07・V-08・V-09・V-10・V-13・V-15** |
| 未実装の工程 | `apply-review`（§5.1 の工程 3 がまるごと無い） |
| 未実装の出力 | `layout-hints.json`、`manifest.reviewCounts` |
| 存在しないもの | `review/` ディレクトリそのもの |

**本発注の範囲は V-03・V-08・V-09・V-10・V-15 と、後述の V-16 である。**
**V-07 と V-13 は `questions.*.json` に対する検査であり、P6 で実装する。本発注では書かない。**

---

## 1. 先に読むもの

| 文書・ファイル | 読む箇所 | 何のために |
|---|---|---|
| `docs/IMPLEMENTATION_PLAN.md` | **§5.1〜§5.5 全体** | **仕様の正本。** 工程・生成物の形・検査表・確認手順・生成 AI の扱い |
| `docs/IMPLEMENTATION_PLAN.md` | §10「実施状況」・P2 の枠 | 何が済んでいて何が残っているか |
| `docs/APP_SPEC.md` | §7.1、§15.1 | 人確認の条文と、一括承認運用（裁定 D-05） |
| `tools/build-data/index.ts` | 全 29 行 | 工程の配線。ここに `apply-review` を挟む |
| `tools/build-data/validate.ts` | 全 60 行 | **書き方を合わせる。** 失敗は `throw new Error('V-xx: …')` の形 |
| `tools/build-data/emit.ts`・`paths.ts` | 全部 | 出力とパスの持ち方 |
| `packages/hyakunin/src/data/generated/manifest.json` | 全部 | `counts` の隣に `reviewCounts` を足す |
| `tests/data/*.test.ts` | 全部 | 試験の書き方を合わせる |

---

## 2. 変更境界

### 変更してよいファイル

| ファイル | 変更の種類 |
|---|---|
| `tools/build-data/apply-review.ts` | **新規** |
| `tools/build-data/parse-yaml.ts` | **新規**（§3 の裁定 2。限定サブセットの YAML パーサ） |
| `tools/build-data/validate.ts` | **追加のみ。** 既存の V-01〜V-06・V-12・V-14 を削除・緩和しない |
| `tools/build-data/index.ts` | 工程の配線に `apply-review` を挟む |
| `tools/build-data/emit.ts`・`paths.ts` | `layout-hints.json` と `reviewCounts` と `review/` のパスを足す |
| `review/authors.yaml`・`readings.yaml`・`kugire.yaml`・`layout.yaml`・`blanks.yaml` | **新規。骨組みのみ**（§4.2） |
| `tests/data/review.test.ts` | **新規** |
| `packages/hyakunin/src/data/generated/*.json` | **`npm run data:build` による再生成のみ。手編集は禁止**（V-14 が捕まえる） |

### 絶対に変更しないファイル・領域

- **一次資料 Markdown 5 本と PDF**（`百人一首_本文・作者_一次データ.md` /
  `百人一首_読み_歴史的仮名遣い.md` / `百人一首_読み_現代仮名遣い.md` /
  `百人一首_読み_異同確認.md` / `古典文法_一次データ索引.md` / `USB-*.pdf`）。
  **読み取り専用で開くこと。書き込みモードで開いた時点で不合格とする。**
- `packages/shared/**`、`packages/hyakunin/src/ui/**`、`packages/hyakunin/src/domain/**`
- `packages/kanazukai/**`
- `tests/unit/**`（021・022 で検収済み）
- `docs/**`、`.github/**`
- **`package.json`（ルート・各パッケージとも）。スクリプトも依存も足さない**
- **新しい npm 依存を入れない。YAML パーサも例外ではない**（§3 の裁定 2）

---

## 3. 裁定済み事項（**再検討しないこと**）

| # | 裁定 | 出典 |
|---|---|---|
| 1 | 人が書き込む唯一の場所は `review/*.yaml` である。**正本 Markdown への書き戻しはどの工程でも行わない** | 計画 §5.1 |
| 2 | **台帳は YAML のまま。ただし新規依存は入れない。** `tools/build-data/parse-yaml.ts` に**限定サブセットのパーサを自作**する。対応するのは (a) 2 スペース字下げのマッピング、(b) `- ` で始まるマッピングの並び、(c) 素のスカラ・引用符つき文字列・整数・`true`/`false`/`null`、(d) `#` 以降の行末コメント、(e) 空行。**これ以外の構文（アンカー・参照・複数行スカラ・フロー記法・タブ字下げ）に出会ったら、黙って読み飛ばさず、行番号とその行の内容を含む例外で必ず失敗する** | 親担当（2026-09-01）。計画 §5.1 が YAML を選んでおり、依存追加は本プロジェクトの方針に反するため |
| 3 | 確認状態は `pending` / `approved` / `rejected` / `hold` の 4 値。**`approved` のものだけが生成物へ載る** | 計画 §5.4 の 3・4 |
| 4 | `confirmationMode` は `individual` / `batch` の 2 値。**`batch` の項目は `batchEvidenceRef` を必ず持つ**（V-15） | 計画 §5.5、裁定 D-05 |
| 5 | `confirmedBy` と `confirmedOn` は、`individual` でも `batch` でも `approved` の項目に必須である | 計画 §5.5 |
| 6 | `confirmedOn` と `generatedOn` は**日付のみ**（`YYYY-MM-DD`）。時刻を入れない。**時刻を入れると再現性が壊れる**（V-11） | 計画 §5.2、既存 `validate.ts` の `generatedOn` 検査 |
| 7 | **`proposedBy: "ai"` かつ `approved` かつ `confirmedBy` または `confirmedOn` が無い項目は失敗させる。** 計画 §5.5 は「V-07 とは別に validator が失敗する」と定めるが番号が無いため、**本発注ではこれを V-16 と呼ぶ**（裁定 D-20・親担当。計画 §5.3 の表へは親担当が追記する） | 計画 §5.5 |
| 8 | **句切れは「表示上の便宜」であることの印を必須とする**（憲章 §3）。`kugire.yaml` の各項目は `displayConvenienceOnly: true` を持ち、**`false` や欠落は V-09 で失敗**する | 計画 §5.3 V-09 |
| 9 | `review/*.yaml` は公開対象に含めてよい。**ただし報告の生テキストと実利用データは決して入れない** | 計画 §5.4 末尾 |
| 10 | **台帳の中身（実際の別名・句切れ・改行位置・読みの確認）を Codex が埋めてはならない。** これは H-04・H-05 の人確認事項である。**骨組みだけを作り、状態は全件 `pending` にする**（S-1） | `APP_SPEC` §7.1、憲章 F-07 |

---

## 4. 実装範囲

### 4.1 工程へ `apply-review` を挟む

計画 §5.1 の工程は `parse → normalize → apply-review → validate → emit` である。
現在の `index.ts` には 3 が無い。**`normalize` と `validate` の間に挟む。**

`apply-review` の責務は次の 3 つだけである。

1. `review/*.yaml` 5 本を読む（`parse-yaml.ts` を使う）。
2. **`approved` の項目だけ**を、対応する生成物へ反映する。
   - `authors.yaml` → `poems.json` の `author.aliases` と `author.confirmed`
   - `readings.yaml` → `poems.json` の `reading.status`
   - `layout.yaml` → `layout-hints.json`（**新規出力**）
   - `kugire.yaml` → 本発注では出力へ載せない（**V-09 の検査対象としてのみ読む**）
   - `blanks.yaml` → 本発注では出力へ載せない（**P6 の領分**。V-15・V-16 の検査対象としてのみ読む）
3. **5 台帳すべての状態別件数を数え、`manifest.reviewCounts` として返す。**

**`approved` 以外（`pending` / `rejected` / `hold`）は生成物へ一切載せない。**
**台帳に記載の無い首は `pending` として数える**（計画 §5.4 の 1）。

### 4.2 `review/*.yaml` の骨組み

**5 本すべてを作る。中身は 100 首分の枠だけで、状態は全件 `pending` とする。**
確認欄（`confirmedBy` / `confirmedOn` / `batchEvidenceRef` / `note`）は `null` で置く。
**`blanks.yaml` だけは `entries: []`（空）でよい**（候補生成は P6）。

共通の形は次のとおりとする。**この形から外れない。**

```yaml
# 作者の別名・有職読みの確認台帳（人が書き込む唯一の場所）
# 状態: pending | approved | rejected | hold
version: 1
entries:
  - cardNo: 1
    canonical: 天智天皇
    aliases: []
    status: pending
    confirmationMode: individual
    batchEvidenceRef: null
    proposedBy: human
    confirmedBy: null
    confirmedOn: null
    note: null
```

各台帳の固有欄は次のとおり。**共通欄（`cardNo` / `status` / `confirmationMode` /
`batchEvidenceRef` / `proposedBy` / `confirmedBy` / `confirmedOn` / `note`）は 5 本とも共通で持たせる。**

| 台帳 | 固有欄 |
|---|---|
| `authors.yaml` | `canonical`（文字列）、`aliases`（**本発注では常に空の並び**） |
| `readings.yaml` | `needsReview`（`true` / `false`。既定は `false`） |
| `kugire.yaml` | `breaks`（整数の並び。**本発注では空**）、**`displayConvenienceOnly: true`（必須）** |
| `layout.yaml` | `breaks`（整数の並び。**本発注では空**）、`device`（`null`） |
| `blanks.yaml` | `entries: []` のみ（P6 が埋める） |

> **`canonical` は `poems.json` の既存値をそのまま写すこと。自分で作らない。**
> **`aliases` を自分で埋めてはならない**（裁定 10・S-1）。

### 4.3 `layout-hints.json` を出す

計画 §5.2 の形に従う。

```text
layout-hints.json[]  cardNo, breaks[], confirmedBy, confirmedOn, device
```

**`layout.yaml` の `approved` 項目だけを載せる。本発注の時点では承認が 1 件も無いので、
出力は空の並び（`[]`）になる。これが正しい。**（A-8 でこれを固定する。）

### 4.4 `manifest.reviewCounts` を出す

```text
manifest.json  … 既存の dataVersion / generatorVersion / generatedOn /
                 sourceHashes / counts に加えて
                 reviewCounts: {
                   authors:  { pending, approved, rejected, hold },
                   readings: { pending, approved, rejected, hold },
                   kugire:   { pending, approved, rejected, hold },
                   layout:   { pending, approved, rejected, hold },
                   blanks:   { pending, approved, rejected, hold }
                 }
```

**キーの並びは上のとおりに固定する**（再現性のため。V-11）。

### 4.5 検査を 6 件足す（`validate.ts` へ**追加のみ**）

| # | 検査 | 失敗時の意味 |
|---|---|---|
| **V-03** | 本文・歴史的・現代の 3 表で番号が一対一対応する | 参照切れ |
| **V-08** | `layout-hints.json` の全項目に `confirmedBy` と `confirmedOn` がある | 未確認の改行候補の採用 |
| **V-09** | `kugire.yaml` の全項目に `displayConvenienceOnly: true` がある | 句切れを唯一の解釈として出す（憲章 §3） |
| **V-10** | `poems.json` の `author.aliases` に現れる別名が、すべて `authors.yaml` に `approved` の確認記録を持つ | 未確認別名を正解にした |
| **V-15** | `confirmationMode: "batch"` の項目に `batchEvidenceRef` がある（**5 台帳すべて**） | 根拠のない一括承認 |
| **V-16** | `proposedBy: "ai"` かつ `status: "approved"` の項目に `confirmedBy` と `confirmedOn` がある（**5 台帳すべて**） | 生成 AI の案を人の確認なしに採用した（F-07） |

**失敗は既存に倣い `throw new Error('V-xx: …')` の形にし、番号と、
どの台帳のどの `cardNo` かをメッセージに含めること。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm test` / `npm run typecheck` / `npm run lint` がいずれも終了コード 0 | 各コマンド |
| A-2 | 試験件数が**着手時より増えている**（減っていない）。**着手時の件数を最初に自分で測り、報告に両方書くこと** | `ℹ tests` の行を着手時と完了時の 2 回 |
| A-3 | `npm run data:check` が終了コード 0 | コマンド |
| A-4 | **`npm run data:build` を 2 回実行して `generated/` がバイト一致する**（再現性・V-11） | 2 回実行し、間で `sha256sum packages/hyakunin/src/data/generated/*.json` を取って比較 |
| A-5 | **一次資料 Markdown 5 本が 1 バイトも変わっていない** | 着手前後の `sha256sum` が一致すること。**実測値を報告に貼る** |
| A-6 | **作業ツリーに、§2 で許した以外の変更が無い** | `git status --porcelain` の出力そのまま。**2026-08-31 に全ファイルを追跡下へ入れたので、この式は今回から正しく機能する** |
| A-7 | `manifest.json` に `reviewCounts` があり、5 台帳すべてに 4 状態が揃う。**この時点では `approved` が全台帳 0 である**（人確認がまだ無いため） | `manifest.json` の中身 |
| A-8 | `layout-hints.json` が出力され、**中身は空の並びである** | ファイルの中身。**「空であること」を試験で固定する** |
| A-9 | `review/*.yaml` 5 本が存在し、自作パーサで読める。`authors` / `readings` / `kugire` / `layout` は 100 件、`blanks` は 0 件 | 試験 |
| A-10 | **`tools/build-data` が一次資料を書き込みモードで開いていない** | 静的検査（計画 P2「対象テスト」の 3 番）。無ければ足す |

### 5.1 破壊試験（**受入の中心。「検査を足しました。全部緑です」は受け付けない**）

**足した検査が証明力を持つことを、意図的に不整合を作って示すこと。**
**fixture でよい。実ファイルを壊した場合は必ず元へ戻し、戻した後の `sha256sum` を報告に含める。**

| # | 作る不整合 | 赤くなるべき検査 |
|---|---|---|
| **B-1** | `layout.yaml` に `status: approved` かつ `confirmedBy: null` の項目を 1 件作る | **V-08** |
| **B-2** | `kugire.yaml` の 1 件を `displayConvenienceOnly: false` にする（**欠落させる場合も別途試す**） | **V-09** |
| **B-3** | `poems.json` に `authors.yaml` の承認記録が無い別名を 1 件持たせる | **V-10** |
| **B-4** | いずれかの台帳に `confirmationMode: batch` かつ `batchEvidenceRef: null` の項目を作る | **V-15** |
| **B-5** | `blanks.yaml` に `proposedBy: ai` かつ `status: approved` かつ `confirmedBy: null` の項目を作る | **V-16** |
| **B-6** | 読み表の 1 行を欠いた fixture を与える | **V-03** |
| **B-7** | **自作 YAML パーサに未対応構文を与える**（アンカー・フロー記法・タブ字下げ・複数行スカラの 4 種すべて） | **パーサが行番号つきで失敗すること。黙って読み飛ばして「成功」を返してはならない**（裁定 2） |
| **B-8** | `reviewCounts` の集計を 1 段ずらす（例: `pending` を `hold` に数える） | **A-7 を固定した試験** |

**さらに、既存の V-01・V-02・V-04・V-05・V-06・V-12・V-14 が引き続き赤くなることを確かめること。**
**検査を足した結果、既存の検査が効かなくなっていないこと**を示すためである。

**どれかが赤くならなかった場合、「全部緑でした」と報告せず、赤くならなかった旨を報告して止まること。**

### 5.2 実行環境の注意（Windows）

- `npm test` と `data:build` は `node --experimental-strip-types` を直接使う。ブラウザは要らない。
- **`npm run check:overflow` は走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。
- 一次資料のファイル名は日本語である。**パスの引用符を省かないこと。**

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| **S-1** | **台帳の中身（実際の別名・句切れ・改行位置・読みの確認結果）を埋めたくなったとき。** これは人（H-04・H-05）の仕事である。**骨組みだけ作り、全件 `pending` のまま報告する** |
| **S-2** | **新しい npm 依存が要ると判断したとき（YAML パーサを含む）。入れずに止まる**（裁定 2） |
| **S-3** | 一次資料 Markdown を変更しないと通らないと判断したとき。**変更せずに報告する** |
| **S-4** | `generated/*.json` を手編集したくなったとき。**`data:build` で再生成する。手編集は V-14 が捕まえる** |
| **S-5** | 計画 `docs/IMPLEMENTATION_PLAN.md` §5.1〜§5.5 と本書が食い違うと気づいたとき。**計画が正本である。従わずに報告する** |
| **S-6** | 既存 100 件の試験のいずれかが赤くなり、その原因が本発注の変更にあると判断したとき |
| **S-7** | **`questions.blank.json` / `questions.author.json` や `blanks.yaml` の候補を作りたくなったとき。P6 の領分である。作らない** |
| **S-8** | V-07 または V-13 を実装したくなったとき。**`questions.*.json` が無いので実装できない。P6 で行う** |

**停止条件に当たったときは、`docs/` を自分で編集しないこと。報告に書く。**

---

## 7. 完了報告に含めること

1. 変更・追加したファイルの一覧（**それ以外を触っていないことの申告**）。
2. `npm test` の**末尾 10 行をそのまま**（`ℹ tests` / `ℹ pass` / `ℹ fail` を含む）。**着手時の件数も書く。** 件数を文章で言い換えない。
3. `npm run typecheck`・`npm run lint`・`npm run data:check` の終了コード。
4. **A-4 の実測**（`data:build` 2 回のあいだで取った `generated/*.json` の `sha256sum` 2 組）。
5. **A-5 の実測**（一次資料 Markdown 5 本の `sha256sum`、着手前と完了後の 2 組）。
6. **A-6 の実測**（`git status --porcelain` の出力そのまま）。
7. `manifest.json` の `reviewCounts` の実際の値と、`layout-hints.json` の中身。
8. **B-1〜B-8 それぞれについて、赤くなった検査名とエラーメッセージ。** 赤くならなかったものはそう書く。
9. **既存 V-01・V-02・V-04・V-05・V-06・V-12・V-14 が引き続き赤くなることの確認。**
10. 実ファイルを壊した場合は、**戻した後の `sha256sum`**。
11. **判断に迷って自分で決めた箇所があれば、その一覧と理由。黙って決めない。無ければ「なし」と明記する。**

---

**実行していない検査を「成功」と書かないこと。**
**一度も実行できていないコードを完成として報告しないこと。**
**検査ツールは、完走しなかったときに合格を出してはならない。**
