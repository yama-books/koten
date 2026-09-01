# Codex向け発注文書 028: P6-C 正誤判定（`domain/question.ts`）

発注日: 2026-09-01（第13回セッション）
階層: **Terra**
優先度: 中（026・027 と並行してよい）
対象: **`packages/hyakunin/src/domain/question.ts` と `tests/unit/question.test.ts` の 2 本のみ**

> **並行発注がある。** 発注024（`packages/kanazukai/`）、発注026（`domain/{range,order,session}.ts`）、
> 発注027（`tools/build-data/` と `tests/data/`）。
> **本発注はどれとも対象ファイルが重ならない。**
> **`npm test` の総件数は判定材料にならない。** §4 の A-2 は **`tests/unit/question.test.ts` 単体の件数**で判定する。

---

## 0. この発注の位置づけ（**先に読むこと**）

P6 を 3 本に割ったうちの **C** である。**本発注は「入力文字列を正規化して、正解かどうかを決める」だけである。**

### 0.1 **本発注が唯一の実装箇所である（重要）**

**仮名の畳み込み（正規化）を実装してよいのは、このファイル 1 本だけである。**
発注027 の生成器は `normalization` という**ラベルを書くだけ**で、畳み込みを一切行わない。

理由: 同じ判定が 2 箇所にあると、**片方を壊しても試験が緑のままになる。**
2026-09-01 の発注023 検収で、`validateData` 側の V-01・V-02 が
`parse.test.ts` の同名検査に隠れて**無試験のまま残っていた事故が実際に起きている。**
**二重実装を作らないことが、この発注の設計上の目的の半分である。**

### 0.2 やらないこと

- **歴史的仮名遣い ↔ 現代仮名遣いの変換を書かない。** それは `packages/kanazukai/` の仕事である。
  どの表記を正解・部分正解とするかは、`question.acceptedAnswers` と `question.partialAnswers` に
  **文字列が並んでいることで**表現済みである（発注027 裁定 2・裁定 4）。
  **変換規則を書いた時点で不合格とする。**
- **`author.aliases` を実行時に展開しない。** 別名は `acceptedAnswers` に既に入っている（発注027 §4.2）。
  **`aliases` を読む処理を書いた時点で不合格とする。** 未確認の別名を正解にする経路になり、**S-8** に当たる。
- **画面（`.tsx`）を作らない。** 純関数だけである。

---

## 1. 先に読むもの

| ファイル | 読む箇所 | 何のために |
|---|---|---|
| `docs/APP_SPEC.md` | **§7.1 の末尾 2 段落・§7.2・§7.3 の先頭**、§6 の「読みの出典・異同が確認済みでない場合は『要確認』と表示し、正解を自動断定しない」、§10.1 の `Question` | **唯一の正本** |
| `docs/CODEX_WORK_ORDER_027.md` | **§3 の裁定 2・裁定 4、§4.1・§4.2 の表** | `Question` の形と `normalization` の 2 値 |
| `tools/build-data/normalize.ts` | 全部（**読むだけ。変更しない**） | **手本。** NFC・全角空白・長音の扱いが既に決まっている。**同じ扱いにする** |
| `packages/shared/src/domain/mastery/` の任意の 1 本 | 純関数の書き方 | **手本。** 内部時刻・乱数・副作用を持たない形 |
| `docs/IMPLEMENTATION_PLAN.md` | §12.3（suite の分け方）、§12.4 の **R-13**・**R-14** | 試験の分け方と重点シナリオ |

---

## 2. 変更境界

### 作成してよいファイル

| ファイル | 種類 |
|---|---|
| `packages/hyakunin/src/domain/question.ts` | 新規 |
| `tests/unit/question.test.ts` | 新規 |

### 絶対に変更しないファイル・領域

- **`tools/**` を 1 文字も変更しない**（`normalize.ts` は読むだけ）。
- **`packages/hyakunin/src/domain/{range,order,session}.ts` を作らない・触らない**（発注026 の範囲）。
- **`packages/kanazukai/**` を読まない。** 変換規則を借りてこない（§0.2）。
- `packages/shared/**`、`packages/hyakunin/src/data/**`、`packages/hyakunin/src/ui/**`、
  `review/**`、`tests/data/**`、`tests/unit/kanazukai/**`、`docs/**`、`.github/**`
- **一次資料 Markdown 5 本と PDF。読み取りもしなくてよい。**
- **`package.json`。スクリプトも依存も足さない。新しい npm 依存を入れない。**

---

## 3. 実装範囲

### 3.1 型

```ts
export type Normalization = 'exact' | 'kana';
export type Judgement = 'correct' | 'partial' | 'incorrect' | 'needs-review';
export const QUESTION_RULES_VERSION = 1;
```

`Question` の形は発注027 §4.1・§4.2 のとおり。**本発注では `questionId` / `answer` /
`acceptedAnswers` / `partialAnswers` / `normalization` の 5 欄しか読まない。**
`reviewStatus` を見る必要はない（公開出題に載る時点で `"human-confirmed"` である）。

### 3.1.1 正解基準（**依頼者裁定 D-26。決め直さない**）

**正解基準は「歴史的仮名遣い、あるいは漢字ですべて書く」。現代仮名遣い（ひらがな）は部分正解とする。**
正本は `APP_SPEC` §7.1.1 である。

- **完全正解 → `'correct'`。** 受け付ける文字列は `acceptedAnswers`（漢字表記・歴史的仮名遣い・確認済み別名）。
- **現代仮名遣い → `'partial'`。** 受け付ける文字列は `partialAnswers`。
- **`'partial'` は「惜しい」ではなく、習熟度にプラスが付く判定である。**
  呼び出し側（P7）は、**歴史的仮名遣いと漢字でどう書くかを必ずフィードバックする。**
  そのための文字列は `question.answer` と `question.answerHistorical` に既に入っている。
  **本発注はフィードバック文を組み立てない**（画面の仕事である）。
- **設定で正解基準を段階から選ぶ機能を作らない**（依頼者「現時点では不要」）。
  **`Normalization` や `Judgement` に段階の概念を持ち込んだ時点で S-C とする。**

### 3.2 `normalizeAnswer(input: string, mode: Normalization): string`

| 段 | `exact` | `kana` |
|---|---|---|
| 1. NFC 正規化 | ○ | ○ |
| 2. 全角空白を半角空白へ | ○ | ○ |
| 3. 前後の空白を落とす | ○ | ○ |
| 4. **すべての空白を落とす** | × | ○ |
| 5. **長音記号（`ｰ` と `ー`）を `ー` へ統一** | × | ○ |
| 6. **カタカナをひらがなへ畳み込む**（`ァ`〜`ヶ`。`ー` は対象外） | × | ○ |

段 1〜3 は `tools/build-data/normalize.ts` の `normalizeText` と**同じ扱い**にする（**import しない。`tools/` は公開境界の外である**）。
**段 6 以外の変換を足さないこと。** 濁点の付け外し・踊り字の展開・旧字体の新字体化は**行わない**
（一次資料では踊り字が既に展開済みである。`normalize.ts` の先頭コメントを参照）。

### 3.3 `judge(question, input, context): Judgement`

`context` は `{ readingStatus: 'confirmed' | 'review' }` とする。**`poems.json` の `reading.status` を呼び出し側が渡す。**
**`question.ts` の中で `poems.json` を読まないこと**（純関数である）。

判定は次の順に行う。**順序を変えないこと。**

| 順 | 条件 | 返す値 |
|---:|---|---|
| 0 | 正規化した入力が空文字 | `'incorrect'`（**最初に門で弾く**） |
| 1 | 正規化した入力が、正規化した `answer` と一致 | `'correct'` |
| 2 | 正規化した入力が、正規化した `acceptedAnswers` のいずれかと一致し、かつ `readingStatus === 'confirmed'` | `'correct'` |
| 3 | 正規化した入力が、正規化した `acceptedAnswers` のいずれかと一致し、かつ `readingStatus === 'review'` | **`'needs-review'`** |
| 4 | 正規化した入力が、正規化した `partialAnswers` のいずれかと一致し、かつ `readingStatus === 'confirmed'` | **`'partial'`**（D-26） |
| 5 | 正規化した入力が、正規化した `partialAnswers` のいずれかと一致し、かつ `readingStatus === 'review'` | `'needs-review'` |
| 6 | 上のいずれにも当たらない | `'incorrect'` |

**順 3・5 が重点シナリオ R-13 である**（`APP_SPEC` §6「読みの出典・異同が確認済みでない場合は
『要確認』と表示し、正解を自動断定しない」）。
**`answer` そのものとの一致（順 1）は `readingStatus` に左右されない。** 本文・作者名は読みではないためである。

**順 2 が順 4 より先であること（完全正解が部分正解に優先すること）を試験で固定する。**
同じ文字列が両方の集合に入ることは生成器が防いでいるが、**判定側でも順序を保証する。**

**順 0 の門を省かないこと。** 正規化後に空文字になった入力が、たまたま空の集合要素と
一致して正解や部分正解になる事故を塞ぐ。

---

## 4. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm run typecheck` / `npm run lint` が終了コード 0 | 各コマンド |
| A-2 | **`tests/unit/question.test.ts` 単体が 16 件以上** | `node --experimental-strip-types --test "tests/unit/question.test.ts"` の `ℹ tests` 行。**全体の件数は並行発注のため判定に使わない** |
| A-3 | **`normalizeAnswer` の 6 段が段ごとに別の試験で固定されている** | `grep -n "^test(" tests/unit/question.test.ts` の出力を貼る。**1 本に集約しない**（計画 §12.3） |
| A-4 | **`judge` の 7 分岐（順 0〜6）がそれぞれ別の試験で固定されている** | 同上。**1 本にまとめない。** 発注024 では §7.2 の 12 行が 2 本に集約され、どの行が壊れたか特定できなくなった |
| A-4b | **完全正解が部分正解に優先する**（順 2 が順 4 より先） | 同じ文字列を `acceptedAnswers` と `partialAnswers` の両方に入れた fixture で `'correct'` が返る試験 |
| A-5 | **`exact` が `kana` の畳み込みを一切しない** | `normalizeAnswer('カタカナ', 'exact') === 'カタカナ'` を assert する試験があること |
| A-6 | **`aliases` を読む処理が無い** | `grep -n "aliases" packages/hyakunin/src/domain/question.ts` が **0 件**（§0.2） |
| A-7 | **歴史的↔現代の変換表が無い** | `grep -nE "historical\|kanazukai\|づ\|ゐ\|ゑ" packages/hyakunin/src/domain/question.ts` の出力を貼る。**変換の対応表が無いこと** |
| A-8 | **`Math.random` / `Date` / `fetch` / `readFileSync` が 0 件** | `grep -nE "Math\.random\|new Date\|Date\.now\|fetch\(\|readFileSync\|import .*data/generated" packages/hyakunin/src/domain/question.ts`（**0 件**） |
| A-9 | **`tools/` と `packages/kanazukai/` と `packages/shared/` に差分が無い** | `git status --porcelain tools packages/kanazukai packages/shared` が空 |
| A-10 | **`.tsx` を 1 本も作っていない** | `git status --porcelain` の出力を貼る |

### 4.1 破壊試験（**受入の中心。ここが本題である**）

**実装の論理を 1 箇所だけ反転させ、狙った試験だけが赤くなることを示す。**
**反転させたら必ず元へ戻し、戻した後の `sha256sum packages/hyakunin/src/domain/question.ts` を報告に貼る。**

| # | 反転させる論理 | 赤くなるべき試験 |
|---|---|---|
| **B-1** | 段 6（カタカナ畳み込み）を外す | **カタカナの試験だけ。** NFC・空白・長音の試験は**緑のままであること** |
| **B-2** | 段 4（すべての空白を落とす）を外す | **空白の試験だけ** |
| **B-3** | 段 5（長音統一）を外す | **長音の試験だけ** |
| **B-4** | `exact` にも `kana` の畳み込みを適用する | **A-5 の試験だけ** |
| **B-5** | 順 3 を `'correct'` に変える | **R-13 の試験だけ** |
| **B-6** | 順 2 の `readingStatus` 条件を外す | **R-13 の試験だけ**（B-5 と同じ試験が赤くなってよい。ただし他は緑のまま） |
| **B-7** | 順 6 を `'needs-review'` に変える | **不一致の試験だけ** |
| **B-8** | 順 0 の空文字の門を外す | **空文字・空白だけの入力の試験だけ** |
| **B-9** | 順 4 を `'correct'` に変える（部分正解を完全正解にする） | **部分正解の試験だけ**（D-26。**ここが甘くなると「ひらがなで書けば正解」になる**） |
| **B-10** | 順 4 を `'incorrect'` に変える（部分正解を不正解にする） | **部分正解の試験だけ**（D-26。**ここが辛くなると習熟度にプラスが付かない**） |
| **B-11** | 順 4 を順 2 より先に評価する | **A-4b の試験だけ** |
| **B-12** | 順 5 を `'partial'` に変える | **部分正解かつ読み未確認の試験だけ** |

**B-9 と B-10 の両方が赤くなって初めて、部分正解が両側から固定されている。**
片方だけなら、判定が甘い側か辛い側のどちらかに倒れても検出できない。

**B-1・B-2・B-3 で「他の段の試験が緑のまま」であることが、正規化の試験が段ごとに分かれていることの証明である。**
ここで複数本が同時に赤くなった場合、試験が集約されすぎている。

**どれかが期待どおりにならなかった場合、「全部緑でした」と報告せず、
どれがどうならなかったかを報告して止まること。**

### 4.2 実行環境の注意（Windows）

- `npm test` は `node --experimental-strip-types` を直接使う。ブラウザは要らない。
- **`npm run check:overflow` を走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。
- **`npm test` の全体実行は並行発注のため赤くなることがある。** A-2 のファイル指定で判定する。

---

## 5. 停止して報告する条件

- **歴史的仮名遣いと現代仮名遣いの変換規則を書く必要が生じた。** 書かずに止まる（§0.2）。
- **`aliases` を読まないと別名照合ができないと判断した。** 読まずに止まる（§0.2・**S-8**）。
- **`poems.json` か `questions.*.json` を読む必要があると判断した。** 読まずに止まる（純関数である）。
- **`tools/build-data/normalize.ts` を import したくなった。** せずに止まる（公開境界を越える）。
- §2 で許した以外のファイルが必要になった。**作らずに**止まる。
- 新しい npm 依存が要ると判断した。**入れずに**止まる。

---

## 6. 完了報告に含めること

1. **完了時の `tests/unit/question.test.ts` 単体の試験件数。**
2. `typecheck` / `lint` の終了コード。
3. `grep -n "^test(" tests/unit/question.test.ts` の出力そのまま。
4. **A-6・A-7・A-8 の grep の出力そのまま。**
5. **破壊試験 B-1〜B-12 の一覧と、それぞれで赤くなった試験名の全部**（緑のままだったものも書く）。
6. **反転を戻した後の `sha256sum packages/hyakunin/src/domain/question.ts`。**
7. `git status --porcelain` の出力そのまま。
8. **判断に迷って自分で決めた事項があれば、全部列挙する。**
