# Codex向け発注文書 027: P6-B 出題データの生成（`questions.*.json`・V-07・V-13）

発注日: 2026-09-01（第13回セッション）
階層: **Terra**
優先度: 高
対象: **`tools/build-data/` と `tests/data/questions.test.ts` と生成物のみ**

> **並行発注がある。** 発注024（`packages/kanazukai/`）、発注026（`packages/hyakunin/src/domain/{range,order,session}.ts`）、
> 発注028（`packages/hyakunin/src/domain/question.ts`）。
> **本発注はどれとも対象ファイルが重ならない。`packages/` を 1 文字も変更しない**
> （**生成物 `packages/hyakunin/src/data/generated/` を除く**。ここは `data:build` の出力である）。
> **`npm test` の総件数は判定材料にならない。** §5 の A-2 は **`tests/data/` 単体の件数**で判定する。

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 P6 の 3 分割

| 発注 | 範囲 | 依存 |
|---|---|---|
| 026 | 出題列の決定（範囲分割・順序・回） | 無し |
| **027（本書）** | **出題データの生成。** `questions.*.json`・V-07・V-13 | **発注023 の成果物（検収済み）** |
| 028 | 正誤判定（`domain/question.ts`） | `APP_SPEC` §7 |

### 0.2 **本発注のいちばん危険な点（必ず読むこと）**

**現時点で `review/*.yaml` は全件 `pending` である。**
依頼者の裁定（2026-09-01）により、**台帳の承認は全体完成後の校正で行う**ことになっている。

したがって **V-07（`reviewStatus !== "human-confirmed"` の問を出さない）により、
本発注が正しく実装されたとき `questions.blank.json` と `questions.author.json` は
どちらも `[]`（空配列）になる。これは故障ではない。仕様どおりである。**

**ここに罠がある。生成器が完全に壊れていても出力は `[]` である。**
実台帳だけを見た検査は、壊れた実装を合格にする。

**したがって本発注の受入は必ず両方向で行う**（§5 の A-4・A-5）。

| 方向 | 使うもの | 期待 |
|---|---|---|
| **陽性** | **承認済みの fixture 台帳**を渡して生成する | **非空**。件数・形・中身まで機械判定する |
| **陰性** | 実台帳（全件 `pending`）で生成する | **`[]`。1 件も混ざらない** |

**「空でした、V-07 が効いています」だけの報告は受け付けない。**
**先に陽性を示すこと**（既知の陽性を拾えることを示してから、陰性を主張する）。

### 0.3 台帳を埋めないこと（**発注023 と同じ S-1**）

**`review/*.yaml` を 1 文字も変更しない。**
別名・句切れ・改行位置・穴埋め候補の**承認は人の仕事**である（H-04・H-05、憲章 F-07）。
**`status: approved` を 1 件でも書き込んだら不合格である。**
fixture は `tests/data/` の中の一時ディレクトリに作る。**`review/` には作らない。**

---

## 1. 先に読むもの

| ファイル | 読む箇所 | 何のために |
|---|---|---|
| `docs/APP_SPEC.md` | **§7.1（穴埋め）・§7.2（作者3形式）全部**、§10.1（`Question` の形） | **唯一の正本** |
| `docs/IMPLEMENTATION_PLAN.md` | **§5.2（生成物の中身）・§5.3（V-01〜V-16）・§5.4・§5.5**、P6 の「対象テスト」「受入条件」 | 生成物の形と検査の定義 |
| `tools/build-data/index.ts` | 全部 | `buildData()` の組み立て順 |
| `tools/build-data/emit.ts` | 全部 | **`outputFiles` のファイル名対応表。`layoutHints` → `layout-hints.json` が手本** |
| `tools/build-data/apply-review.ts` | 全部 | `readReviewLedgers` / `reviewCounts` の `missing` の扱い |
| `tools/build-data/validate.ts` | 全部 | V-01〜V-16 の書き方。**既存の検査を緩めない** |
| `tests/data/validate.test.ts` / `review.test.ts` | 全部 | **書き方を合わせる。** `structuredClone` で壊す作法、`assert.throws(..., /V-xx: 具体的な語/)` の形 |
| `packages/hyakunin/src/data/generated/poems.json` | 先頭 1 首ぶん | 入力の形（`ku[5]` / `author.canonical` / `author.aliases` / `reading.historical.ku` / `reading.modern.ku`） |

---

## 2. 変更境界

### 変更・作成してよいファイル

| ファイル | 種類 |
|---|---|
| `tools/build-data/emit-questions.ts` | **新規。** 候補の列挙と `Question` の組み立て |
| `tools/build-data/index.ts` | 変更。`buildData` に組み込む |
| `tools/build-data/emit.ts` | 変更。**ファイル名対応の 2 行だけ** |
| `tools/build-data/validate.ts` | **追加のみ。** V-07 と V-13 を足す。**既存の V-01〜V-16 を 1 文字も緩めない** |
| `tools/build-data/apply-review.ts` | 変更。`reviewCounts.blanks` の `missing` を候補数から数える（§4.4） |
| `tests/data/questions.test.ts` | 新規 |
| `packages/hyakunin/src/data/generated/questions.blank.json` | **新規（`data:build` の出力）** |
| `packages/hyakunin/src/data/generated/questions.author.json` | **新規（`data:build` の出力）** |
| `packages/hyakunin/src/data/generated/manifest.json` | 再生成 |

### 絶対に変更しないファイル・領域

- **`review/**` を 1 文字も変更しない**（§0.3。承認は人の仕事）。
- **`packages/**` を変更しない。ただし `packages/hyakunin/src/data/generated/` だけは `data:build` の出力として変わる。**
  **手で編集しない**（V-14 が検出する）。
- **`packages/hyakunin/src/domain/`** — 発注026・028 の範囲である。**1 本も作らない。**
- `tests/data/parse.test.ts` / `validate.test.ts` / `review.test.ts` / `reproducibility.test.ts` /
  `variants-fixture.test.ts`、`tests/unit/**`、`docs/**`、`.github/**`
- **一次資料 Markdown 5 本と PDF。読み取りは既存パーサ経由のみ。新しい読み取り経路を作らない。**
- **`package.json`。スクリプトも依存も足さない。新しい npm 依存を入れない。**

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1（D-22）: **穴埋め候補の機械生成は「句」単位だけに限る。単語・文節は生成しない。**

`APP_SPEC` §7.1 は隠す単位を**単語 / 文節 / 句**の 3 種と定めるが、**機械生成してよいのは句だけである。**

理由: **句の境界は既にデータである。** `poems.json` の `ku[5]` がそれである。
一方、**古文の語境界と文節境界はデータとして存在しない。** 文字列から推測すれば、
それは形態素解析の代わりを当て推量でやることになる。
§7.1 自身が「**確認済みの**文節境界で隠す」と定めており、確認済みのものは今は存在しない。
**発注024 で「助詞・複合語・語義・文法形を文字列から推測しない」と裁定したのと同じ線である。**

- `blankUnit` の型は **`"word" | "bunsetsu" | "ku"` の 3 値のまま**にする（機構は 3 種に対応する）。
- **生成器が作るのは `"ku"` だけ**である。`"word"` と `"bunsetsu"` は `review/blanks.yaml` に
  人が書いた項目からのみ作る。**今は 0 件になる。**
- **`"word"` / `"bunsetsu"` を文字列から推測する処理を書いた時点で不合格とする。**
  受入条件 A-8 で機械判定する。

### 裁定 2（D-23）: **`normalization` は 2 値。歴史的仮名遣いと現代仮名遣いの両許容は「変換」ではなく「文字列の列挙」で表す。**

`APP_SPEC` §7.1 の「表記ゆれの許容（ひらがな/歴史的仮名遣い等）は問の `normalization` に明記」を、次のとおり確定する。

| 値 | 意味 |
|---|---|
| `"exact"` | 入力を NFC 正規化して前後の空白を落とすだけ。それ以外は完全一致 |
| `"kana"` | 上に加え、**全角空白の除去・長音記号の統一・カタカナからひらがなへの畳み込み**を行ってから一致 |

**`"historical"` のような値を作らないこと。**
「歴史的仮名遣いでも現代仮名遣いでも正解」は、**`acceptedAnswers[]` に正本から取った文字列を並べて表す。**
**変換規則で導かない。** 変換で導けば、それは歴史的仮名遣いツール（`packages/kanazukai/`）を
ここに二重実装することになり、片方だけ壊れても気づけなくなる。

**`normalization` の実装は本発注に含まれない。** 生成器は**ラベルを書くだけ**である。
実際に文字列を畳み込むのは発注028 の `domain/question.ts` **ただ 1 箇所**である。
**`tools/` 側に畳み込み処理を書かないこと**（二重実装の禁止。受入条件 A-9）。

### 裁定 3（D-24）: **作者 4〜5 択の誤答は、乱数を使わず番号距離で決定的に選ぶ。**

**V-11（同じ入力で 2 回生成した結果がバイト一致）があるため、乱数は使えない。**
`APP_SPEC` §7.2 の「誤答は同じ範囲または確認済みの作者プールから選ぶ」を、次の決定的規則で満たす。

> 正解の番を N とする。**`|cardNo − N|` の昇順、同値なら `cardNo` の昇順**に候補を走査し、
> **`author.canonical` が正解と異なり、かつ既に選んだ誤答と重複しないもの**を先頭から **4 件**取る。

- **4 件に満たない場合は 4〜5 択の問を作らない**（`APP_SPEC` §7.2「候補数不足時は無理に水増しせず、別形式へ切り替える」）。
  形式 2・3 は作る。**重点シナリオ R-14 がこれである。**
- **`Math.random` を使ったら不合格。** 受入条件 A-9 で機械判定する。

### 裁定 4（D-26 を含む）: **`Question` に 4 欄を足す。正解基準は「歴史的仮名遣いまたは漢字」である。**

**依頼者裁定 D-26（2026-09-01）。正解基準は「歴史的仮名遣い、あるいは漢字ですべて書く」。
現代仮名遣い（ひらがな）は部分正解とする。** 詳細は `APP_SPEC` §7.1.1。

計画 §5.2 の `questions.*.json` の形に次の 4 欄を追加する。

| 欄 | 役割 |
|---|---|
| `answerHistorical: string \| null` | 歴史的仮名遣いの読み（**表示用**）。該当しない問は `null` |
| `answerModern: string \| null` | 現代仮名遣いの読み（**表示用**）。該当しない問は `null` |
| `acceptedAnswers: string[]` | **完全正解**として受け付ける文字列の全部 |
| `partialAnswers: string[]` | **部分正解**として受け付ける文字列の全部 |

**すべて正本から取った文字列**であり、生成器が組み立てた文字列を入れてはならない。
`answerHistorical` / `answerModern` は**部分正解のときのフィードバック表示**に使う
（「歴史的仮名遣いではこう書く」「漢字ではこう書く」）。**判定には `acceptedAnswers` と
`partialAnswers` を使う。** 役割が違うので両方を持つが、**生成器の同じ 1 箇所から同時に作る**こと。

これは §10.5 の 3 条件を満たす技術的表現の決定である（生成物の変更だけで戻せる／
公開物の意味内容・プライバシー・ライセンスに触れない／`docs/HANDOFF.md` §4.1 と
`docs/APP_SPEC.md` §10.1 と計画 §5.2 に記録済み）。

### 裁定 5: **`buildData` は review ディレクトリを引数で受け取れるようにする。**

fixture 試験（§0.2 の陽性方向）のために必要である。

```ts
export function buildData(reviewDirectory = paths.review)
```

既定値を変えないこと。`applyReview(poems, directory)` は既に第 2 引数を取る。**そこへ渡すだけである。**

---

## 4. 実装範囲

### 4.1 穴埋め問（`questions.blank.json`）

各首・各句（5 句）につき 1 問を**候補として列挙**する。**出力に入るのは人が承認したものだけである。**

| 欄 | 値 |
|---|---|
| `questionId` | `` `${poemId}-blank-ku${n}` ``（`n` は 1〜5）。**決定的であること** |
| `poemId` | 首の `poemId` |
| `skill` | `"text"` |
| `type` | `"blank"` |
| `blankUnit` | `"ku"` |
| `prompt` | 当該句を `"＿＿＿"` に置き換えた `text`。**それ以外の飾りを付けない** |
| `answer` | 当該句の文字列（`ku[n-1]`。**漢字表記**） |
| `answerHistorical` | `reading.historical.ku[n-1]` |
| `answerModern` | `reading.modern.ku[n-1]` |
| `acceptedAnswers` | **完全正解。** `[ku[n-1], reading.historical.ku[n-1]]`。**重複は除く。順序はこの順** |
| `partialAnswers` | **部分正解。** `[reading.modern.ku[n-1]]`。`acceptedAnswers` と重複するものは除く |
| `candidates` | `[]`（選択式は初回公開の範囲外。**発明しない**） |
| `normalization` | `"kana"` |
| `reviewStatus` | §4.3 の規則で決める |
| `sourceRef` | 首の `sourceRef` |
| `confirmationMode` / `confirmedBy` / `confirmedOn` / `proposedBy` / `batchEvidenceRef` | 対応する `review/blanks.yaml` の項目から写す。項目が無ければ `"individual"` / `null` / `null` / `"human"` / `null` |

### 4.2 作者問（`questions.author.json`）

各首につき最大 3 問（`APP_SPEC` §7.2 の 3 形式）。

| 形式 | `questionId` の接尾 | `answer` | `acceptedAnswers`（完全正解） | `partialAnswers`（部分正解） | `candidates` | `normalization` |
|---|---|---|---|---|---|---|
| 1. 4〜5択 | `-author-choice` | `author.canonical` | `[author.canonical]` | `[]`（**選択式に部分正解は無い**） | **正解 1 件 ＋ 裁定 3 の誤答 4 件、`cardNo` の昇順**で並べる | `"exact"` |
| 2. 漢字候補→ひらがな | `-author-kana` | **`reading.historical.author`** | `[reading.historical.author]` | `[reading.modern.author]` | 形式 1 と同じ 5 件 | `"kana"` |
| 3. 自由入力 | `-author-free` | `author.canonical` | `[author.canonical, ...author.aliases, reading.historical.author]`（重複除去、この順） | `[reading.modern.author]` | `[]` | `"kana"` |

3 形式とも `answerHistorical` は `reading.historical.author`、`answerModern` は `reading.modern.author` とする。

**形式 2 の `answer` が現代仮名遣いでないことに注意。** 裁定 D-26 により
**正解基準は「歴史的仮名遣い、あるいは漢字ですべて書く」**であり、現代仮名遣いは部分正解である。
`APP_SPEC` §7.2 の「利用者が選んだ作者名をひらがなで答える」の「ひらがな」は、**歴史的仮名遣いのひらがな**を指す。

`skill` は 3 形式とも `"author"`、`type` は `"author"`、`blankUnit` は `null`。
**誤答が 4 件に満たない首では形式 1 を作らない**（裁定 3）。形式 2 の `candidates` も作れないので、**形式 2 も作らない**。形式 3 だけになる。

### 4.3 `reviewStatus` の決め方（**V-07 の本体**）

| 条件 | `reviewStatus` |
|---|---|
| 対応する台帳項目が `status: approved` | `"human-confirmed"` |
| 対応する台帳項目が `status: rejected` | `"rejected"` |
| それ以外（`pending` / `hold` / **台帳に項目が無い**） | `"review"` |

対応する台帳は、**穴埋め問は `review/blanks.yaml`**（`cardNo` と `ku` 番号で対応）、
**作者問は `review/authors.yaml`**（`cardNo` で対応）とする。

**`questions.*.json` に書き出すのは `reviewStatus === "human-confirmed"` のものだけである。**
`"review"` と `"rejected"` は**ファイルに含めない**（§5.3 の V-07 の定義は「公開対象に含まれない」である）。

### 4.4 `manifest` の更新

- `counts` に次を足す: `blankCandidates`（列挙した穴埋め候補の総数。**今は 500**）、
  `authorCandidates`（列挙した作者候補の総数）、
  `questionsBlank` / `questionsAuthor`（**書き出した件数。今は 0 と 0**）。
- `reviewCounts.blanks` の `missing`（未記載を `pending` に足す扱い）を、
  **`apply-review.ts` の `missing = name === 'blanks' ? 0 : ...` から、
  「列挙した候補のうち台帳に記載の無い数」へ改める。**
  計画 §5.4 の 1「`review/` に未記載の候補が `reviewCounts.pending` として出る」がこれである。
  **今は `reviewCounts.blanks.pending` が 500 になる。**

### 4.5 `emit.ts` のファイル名対応

`outputFiles` の対応表に 2 件足す。**既存の `layoutHints` → `layout-hints` と同じ形にする。**

| `data` のキー | 出力ファイル |
|---|---|
| `questionsBlank` | `questions.blank.json` |
| `questionsAuthor` | `questions.author.json` |

**これにより V-11（バイト一致）と V-14（生成物の手編集検出）が自動的に新ファイルへ及ぶ。**
**V-14 を迂回する経路を作らないこと。**

### 4.6 `validate.ts` へ足す検査

| # | 検査 | 失敗メッセージ（**この語を含めること**） |
|---|---|---|
| **V-07** | `questions.blank.json` / `questions.author.json` の全項目の `reviewStatus` が `"human-confirmed"` | `` `V-07: ${file} ${questionId} is not human-confirmed` `` |
| **V-13** | `candidates.length > 0` の作者問について、`candidates` が正解を 1 件含み、**重複が無く**、**誤答が 4 件以上**ある | `` `V-13: ${questionId} has N distractors` `` / `` `V-13: ${questionId} has duplicate candidates` `` |

**既存の V-01〜V-16 を 1 文字も緩めないこと。** 受入条件 A-7 で機械判定する。

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm run typecheck` / `npm run lint` が終了コード 0 | 各コマンド |
| A-2 | **`tests/data/` 単体の件数が 26 件から 34 件以上へ増えている** | `node --experimental-strip-types --test "tests/data/*.test.ts"` の `ℹ tests` 行を着手時と完了時の 2 回。**ディレクトリ指定（`--test tests/data/`）は動かない。グロブを使うこと** |
| A-3 | `npm run data:check` が終了コード 0 | コマンド |
| A-4 | **【陽性】承認済み fixture 台帳で生成すると `questions.*.json` が非空になる** | `tests/data/questions.test.ts` が一時ディレクトリに `status: approved` の台帳を作り、`buildData(dir)` を呼ぶ。**穴埋めが 5 件以上、作者が 3 件以上**であることを assert する |
| A-5 | **【陰性】実台帳（全件 `pending`）で生成すると両ファイルが `[]`** | 生成物を直接読み、`length === 0` を assert する。**A-4 が緑であることが前提**（§0.2） |
| A-6 | **`data:build` を 2 回続けて実行し、`questions.*.json` がバイト一致する** | `data:build` → sha256 → `data:build` → sha256。V-11 の実地確認 |
| A-7 | **既存の V-01〜V-16 の試験（`tests/data/` の 26 件）が名前も内容も変わらず全部緑** | `grep -n "^test(" tests/data/*.test.ts` の出力を報告に貼る |
| A-8 | **`"word"` / `"bunsetsu"` を文字列から推測する処理が無い** | `grep -nE '"word"\|"bunsetsu"\|bunsetsu' tools/build-data/*.ts` の出力を報告に貼る。**型定義以外に出現しないこと**（裁定 1） |
| A-9 | **`tools/` に `Math.random` が 0 件、かつ仮名の畳み込み処理が無い** | `grep -nE "Math\.random\|カタカナ\|katakana\|0x30A1\|\\\\u30A1" tools/build-data/*.ts` の出力を貼る（**0 件**。裁定 2・3） |
| A-10 | **`review/` に差分が無い** | `git status --porcelain review` が空（§0.3・S-1） |
| A-11 | **`packages/` の差分が `src/data/generated/` の中だけ** | `git status --porcelain packages` の出力を貼る |
| A-12 | `manifest.json` の `reviewCounts.blanks.pending` が **500** | 生成物を読んで確認。§4.4 |
| A-13 | **完全正解と部分正解が入れ替わっていない**（D-26） | 陽性 fixture の出力について、**`acceptedAnswers` に `reading.modern` が 1 件も入っていない**こと、**`partialAnswers` が `reading.modern` だけである**ことを assert する試験があること。**穴埋めと作者形式 3 の両方で確かめる** |
| A-14 | **形式 2 の `answer` が歴史的仮名遣いである**（D-26） | 陽性 fixture の出力を assert する試験があること |

### 5.1 破壊試験（**受入の中心。ここが本題である**）

**実装の論理を 1 箇所だけ反転させ、狙った試験だけが赤くなることを示す。**
**反転させたら必ず元へ戻し、戻した後の `sha256sum tools/build-data/*.ts` を報告に貼る。**

| # | 反転させる論理 | 赤くなるべき試験 |
|---|---|---|
| **B-1** | V-07 の判定を `if (false)` にする | **陽性 fixture に `pending` を混ぜた試験**が赤くなること。**実台帳だけの試験では捕まらないことを確認し、報告に書くこと**（§0.2 の証明） |
| **B-2** | §4.3 の `reviewStatus` 決定で `approved` 以外も `"human-confirmed"` にする | **A-5（陰性）の試験**が赤くなること |
| **B-3** | §4.3 の `reviewStatus` 決定で `approved` を `"review"` にする | **A-4（陽性）の試験**が赤くなること。**B-2 と B-3 の両方が赤くなって初めて、判定が両方向に効いている** |
| **B-4** | 裁定 3 の誤答選択で `author.canonical` の比較を外し、正解と同じ作者を誤答に入れる | **V-13 の試験だけ** |
| **B-5** | 誤答を 4 件でなく 3 件取る | **V-13 の試験だけ**。「4 件未満なら形式 1 を作らない」を見る試験（R-14）とは**別の試験**であること |
| **B-6** | 裁定 3 の走査順を `cardNo` の昇順のみ（距離を見ない）に変える | **誤答の決定性を見る試験だけ。** 並びが変わるので、期待値を固定した試験が赤くなる |
| **B-7** | `partialAnswers` に `reading.modern` でなく `reading.historical` を入れる | **`acceptedAnswers` と `partialAnswers` の分離を見る試験だけ。** 完全正解と部分正解が入れ替わっていないことの証明である（D-26） |
| **B-7b** | 形式 2 の `answer` を `reading.modern.author` に変える | **形式 2 の `answer` を見る試験だけ**（D-26。正解基準は歴史的仮名遣いである） |
| **B-8** | §4.5 の `emit.ts` の対応表から `questionsBlank` を消す | **V-14 か V-11 の試験が赤くなること**（生成物が出なくなる） |
| **B-9** | §4.4 の `missing` を 0 に戻す | **A-12 を見る試験だけ** |

**「他は緑のまま」を必ず併記すること。** 複数本が同時に赤くなった場合、試験が集約されすぎている（計画 §12.3 違反）。

**どれかが期待どおりにならなかった場合、「全部緑でした」と報告せず、
どれがどうならなかったかを報告して止まること。**

### 5.2 実行環境の注意（Windows）

- `npm test` は `node --experimental-strip-types` を直接使う。ブラウザは要らない。
- **`npm run check:overflow` を走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。
- **`npm test` の全体実行は並行発注のため赤くなることがある。** A-2 のグロブ指定で判定する。

---

## 6. 停止して報告する条件

- **`review/*.yaml` に `approved` を書きたくなった。** 書かずに止まる（§0.3・**S-1**）。
- **単語・文節の境界を文字列から決める必要が生じた。** 決めずに止まる（裁定 1・**S-8**）。
- **歴史的仮名遣いと現代仮名遣いの変換規則を書く必要が生じた。** 書かずに止まる（裁定 2）。
- **乱数を使わないと誤答を選べないと判断した。** 使わずに止まる（裁定 3・V-11）。
- **既存の V-01〜V-16 を緩めないと通らないと判断した。** 緩めずに止まり、何をどう緩めたいかを報告する。
- §2 で許した以外のファイルが必要になった。**作らずに**止まる。
- 新しい npm 依存が要ると判断した。**入れずに**止まる。

---

## 7. 完了報告に含めること

1. **着手時と完了時の `tests/data/` 単体の試験件数**（両方）。
2. `typecheck` / `lint` / `data:check` の終了コード。
3. `grep -n "^test(" tests/data/*.test.ts` の出力そのまま。
4. **A-8・A-9 の grep の出力そのまま。**
5. **A-4（陽性）の実測件数**（穴埋め何件・作者何件）と、**A-5（陰性）の実測件数**（両方 0）。
6. **A-6 の 2 回の sha256** と、一致したかどうか。
7. **A-12 の `reviewCounts.blanks.pending` の実測値。**
8. **破壊試験 B-1〜B-9（B-7b を含む）の一覧と、それぞれで赤くなった試験名の全部**（緑のままだったものも書く）。
   **とくに B-1 では「実台帳だけの試験では捕まらなかった」ことを明記する。**
9. **反転を戻した後の `sha256sum tools/build-data/*.ts`。**
10. `git status --porcelain` の出力そのまま（**`review/` が空であること**）。
11. **判断に迷って自分で決めた事項があれば、全部列挙する。**
