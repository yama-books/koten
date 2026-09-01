# Codex向け発注文書 025: 発注023 検収で見つかった「証明力の無い検査」3 件の穴埋め（試験のみ）

発注日: 2026-09-01（第12回セッション）
階層: **Luna**（既存の試験の書き方をなぞる定型作業。設計判断は含まない）
優先度: 中
対象: **`tests/data/` のみ**

> **並行発注が 1 件ある。** 発注024（Terra・`packages/kanazukai/` と `tests/unit/kanazukai/` のみ）が同時に走る。
> **対象ファイルは完全に分離してある。** 024 は `tests/data/` に一切触れない。
> **`npm test` の総件数は判定材料にならない**（024 が同時に増やすため）。§4 の A-2 は
> **`tests/data/` 単体の件数**で判定する。

---

## 0. この発注の位置づけ（**先に読むこと**）

**実装は正しい。触らせない。** 発注023 は 2026-09-01 に親担当が検収し、
受入条件 A-1〜A-10 を全部満たし、破壊試験 B-1〜B-8 が全件、名指しで赤くなった。

しかし親担当が**追加で 3 つの反転**を行ったところ、**どれも試験を赤くしなかった**。
つまり `tools/build-data/validate.ts` の一部の検査には、それを守る試験が無い。
**本発注はその穴を塞ぐ。実装は 1 行も変えない。**

### 親担当が 2026-09-01 に実測した「赤くならなかった反転」

| # | 反転した箇所（`tools/build-data/validate.ts`） | 結果 |
|---|---|---|
| 1 | `if (data.poems.length !== 100)` → `if (false)` | **105 件すべて緑** |
| 2 | `if (new Set(cards).size !== 100 \|\| cards.some` → `if (false && cards.some` | **105 件すべて緑** |
| 3 | `if (poem.ku.length !== 5 \|\| poem.ku.some` → `if (false && poem.ku.some` | **105 件すべて緑** |
| 4 | `if (!existsSync(file))`（`assertGeneratedCurrent` 内） → `if (false)` | **105 件すべて緑** |

**原因**（親担当が特定済み。調査し直さなくてよい）:
`tests/data/parse.test.ts` の V-01 / V-02 試験は **parse 側の関数**（`assertCardNumbers`・列数検査）を
呼んでおり、**`validateData` 側の同名検査を一度も呼んでいない**。検査が二重化されていて、
片方に試験が無い。V-14 の 5 本の試験は、どれも**「生成物ファイルが存在しない」場合**を作っていない。

---

## 1. 先に読むもの

| ファイル | 読む箇所 | 何のために |
|---|---|---|
| `tools/build-data/validate.ts` | **全部（読むだけ。変更しない）** | どの検査がどのメッセージを投げるか |
| `tests/data/validate.test.ts` | 全部 | **書き方を合わせる。** fixture の作り方と `assert.throws(..., /V-xx/)` の形 |
| `tests/data/review.test.ts` | 全部 | 同上。`structuredClone(data)` で壊す作法 |
| `tests/data/reproducibility.test.ts` | 全部 | V-14 の試験の作り方 |
| `docs/IMPLEMENTATION_PLAN.md` | §12.3「suite の分け方」 | **「1 本に集約しない」**という規約 |

---

## 2. 変更境界

### 変更してよいファイル

| ファイル | 変更の種類 |
|---|---|
| `tests/data/validate.test.ts` | **追加と分割。既存の assert を削除・緩和しない** |
| `tests/data/review.test.ts` | **分割のみ。既存の assert を削除・緩和しない** |
| `tests/data/reproducibility.test.ts` | **追加のみ** |

### 絶対に変更しないファイル・領域

- **`tools/**` を 1 文字も変更しない。**とくに `tools/build-data/validate.ts`。
  **試験を通すために実装を緩める・条件を足すことを禁じる。**
- `packages/**`、`review/**`、`tests/unit/**`、`tests/data/parse.test.ts`、
  `tests/data/variants-fixture.test.ts`、`docs/**`、`.github/**`
- **一次資料 Markdown 5 本と PDF。読み取りもしなくてよい。**
- **`package.json`（ルート・各パッケージとも）。スクリプトも依存も足さない**
- **新しい npm 依存を入れない。**

---

## 3. 実装範囲（**この 3 件だけ**）

### 3.1 `validateData` 側の V-01 と V-02 に試験を足す

`tests/data/validate.test.ts` に、**`validateData` を直接呼ぶ**試験を足す。
`assertCardNumbers` や parse 側の関数を呼んではならない（それは既に試験がある）。

| 新しい試験名（この名前を使うこと） | 作る不整合 | 期待 |
|---|---|---|
| `V-01 rejects a poem count other than 100` | `poems` を 99 件にした fixture | `/V-01/` を投げる |
| `V-01 rejects duplicated or out-of-order card numbers` | `cardNo` を 1 件重複させた fixture と、順序を入れ替えた fixture の**2 通り** | どちらも `/V-01/` を投げる |
| `V-02 rejects a poem with a missing or short ku` | `ku` を 4 件にした fixture と、`ku` の 1 要素を空文字にした fixture の**2 通り** | どちらも `/V-02/` を投げる |

fixture は `review.test.ts` と同じく `buildData()` の結果を `structuredClone` して壊す形にする。

### 3.2 V-14 の「生成物が存在しない」分岐に試験を足す

`tests/data/reproducibility.test.ts` に足す。

| 新しい試験名 | 作る不整合 | 期待 |
|---|---|---|
| `V-14 detects a missing generated file` | 生成物のうち 1 本が存在しない一時ディレクトリを `assertGeneratedCurrent` に渡す | `/V-14/` を投げ、**欠けたファイル名がメッセージに出る**こと |

**実ファイルを消してはならない。** 既存試験と同じく一時ディレクトリで行う。

### 3.3 集約された試験を目的別に分ける（計画 §12.3）

現在、5 つの検査が 1 本の試験に集約されている。**assert は 1 つも減らさず、試験を分ける。**

| 分割前 | 分割後（この名前を使うこと） |
|---|---|
| `V-08, V-09, V-10, V-15 and V-16 reject broken review fixtures`（`review.test.ts`） | `V-08 rejects an unconfirmed layout hint` / `V-09 rejects a kugire entry without displayConvenienceOnly` / `V-10 rejects an alias without an approved author record` / `V-15 rejects a batch confirmation without evidence` / `V-16 rejects an AI proposal approved without a confirmer` |
| `V-05, V-06 and V-12 reject broken generated fixtures`（`validate.test.ts`） | `V-05 rejects text that does not match its ku` / `V-06 rejects a reading containing non-kana` / `V-12 rejects a source hash mismatch` |

**各試験の `assert.throws` の正規表現は、分割前と同じ具体性を保つこと**
（例: `/V-09: kugire cardNo 1/`。`/V-09/` だけに緩めない）。

---

## 4. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm test` / `npm run typecheck` / `npm run lint` がいずれも終了コード 0 | 各コマンド |
| A-2 | **`tests/data/` 単体の試験件数が 16 件から 25 件以上へ増えている**（内訳: §3.1 で +3、§3.2 で +1、§3.3 の分割で +4 と +2） | `node --experimental-strip-types --test tests/data/` の `ℹ tests` 行を着手時と完了時の 2 回。**全体の件数は並行発注のため判定に使わない** |
| A-3 | `npm run data:check` が終了コード 0 | コマンド |
| A-4 | **`tools/` と `packages/` に差分が無い** | `git status --porcelain tools packages` が空 |
| A-5 | §3.3 の分割後の試験名が**すべて存在する** | `grep -n "^test(" tests/data/*.test.ts` の出力を報告に貼る |
| A-6 | 分割前の集約試験名（`V-08, V-09, V-10, V-15 and V-16 …` と `V-05, V-06 and V-12 …`）が**消えている** | 同上 |

### 4.1 破壊試験（**受入の中心。ここが本題である**）

**実装の論理を 1 箇所だけ反転させ、狙った試験だけが赤くなることを示す。**
**反転させたら必ず元へ戻し、戻した後の `sha256sum tools/build-data/validate.ts` を報告に貼る。**

| # | 反転させる論理（`tools/build-data/validate.ts`） | 赤くなるべき試験 |
|---|---|---|
| **B-1** | `if (data.poems.length !== 100)` → `if (false)` | `V-01 rejects a poem count other than 100` |
| **B-2** | `if (new Set(cards).size !== 100 \|\| cards.some` → `if (false && cards.some` | `V-01 rejects duplicated or out-of-order card numbers` |
| **B-3** | `if (poem.ku.length !== 5 \|\| poem.ku.some` → `if (false && poem.ku.some` | `V-02 rejects a poem with a missing or short ku` |
| **B-4** | `if (!existsSync(file))` → `if (false)` | `V-14 detects a missing generated file` |
| **B-5** | `if (entry.displayConvenienceOnly !== true)` → `if (false)` | **`V-09 …` だけが赤くなり、`V-08` / `V-10` / `V-15` / `V-16` の試験は緑のままであること** |
| **B-6** | `if (!approvedAliases` → `if (false && !approvedAliases` | **`V-10 …` だけが赤くなり、他の 4 本は緑のままであること** |
| **B-7** | `if (poem.text !== poem.ku.join(''))` → `if (false)` | **`V-05 …` だけが赤くなり、`V-06` / `V-12` の試験は緑のままであること** |

**B-5・B-6・B-7 の「他は緑のまま」が、分割できたことの証明である。**
ここで複数本が同時に赤くなった場合、分割は失敗している。

**どれかが期待どおりにならなかった場合、「全部緑でした」と報告せず、
どれがどうならなかったかを報告して止まること。**

### 4.2 実行環境の注意（Windows）

- `npm test` は `node --experimental-strip-types` を直接使う。ブラウザは要らない。
- **`npm run check:overflow` を走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。

---

## 5. 停止して報告する条件

- **実装（`tools/` または `packages/`）を直したくなった。** 直さずに止まり、何をどう直したいかを報告する。
  **試験を通すために実装を緩めることを禁じる。**
- 既存の assert を消さないと分割できないと判断した。**消さずに**止まる。
- §2 で許した以外のファイルが必要になった。**作らずに**止まる。
- 新しい npm 依存が要ると判断した。**入れずに**止まる。

---

## 6. 完了報告に含めること

1. **着手時と完了時の `tests/data/` 単体の試験件数**（両方）。
2. `npm test` / `typecheck` / `lint` / `data:check` の終了コード。
3. `grep -n "^test(" tests/data/*.test.ts` の出力そのまま。
4. **破壊試験 B-1〜B-7 の一覧と、それぞれで赤くなった試験名の全部**
   （B-5・B-6・B-7 は「赤くなった 1 本」と「緑のままだった残り」を両方書く）。
5. **反転を戻した後の `sha256sum tools/build-data/validate.ts`。**
   期待値は `622f0e80c14e521ecc75c30b3d4fe5127f2530cafdea3e280b4b21655d29ffef` である
   （親担当が 2026-09-01 に実測。**一致しなければ実装を変えてしまっている**）。
6. `git status --porcelain` の出力そのまま。
7. **判断に迷って自分で決めた事項があれば、全部列挙する。**
