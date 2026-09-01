# Codex向け発注文書 030: P7-A 回の進行と記録（純関数・画面なし）

発注日: 2026-09-01（第14回セッション）
階層: **Terra**
優先度: 高
対象: **`packages/hyakunin/src/domain/{entry,flow,record,ports}.ts`、`packages/hyakunin/src/data/question-schema.ts`、`packages/shared/src/domain/mastery/rules.v1.ts`（1 行のみ）と対応する `tests/unit/` のみ**

> **並行発注がある。** 発注031（Terra・`tools/review-approve/` と `tests/data/`）。
> **本発注とは対象ファイルが 1 件も重ならない。**
> **`npm test` の総件数は判定材料にならない**（031 が同時に増やすため）。
> §5 の A-2 は**本発注が作る 5 本の試験ファイル合計**で判定する。
>
> **基準線（2026-09-01・本発注書作成時に実測）**: 作業ツリーは clean、`npm run test:node` 196 件全緑、
> `npm run test:screen` 6 件全緑。**この数字は「着手前」の値である。**

---

## 0. この発注の位置づけ（**先に読むこと**）

P7（学習画面）を 2 本に割ったうちの **A** である。

| 発注 | 範囲 | 依存 |
|---|---|---|
| **030（本書）** | **回の進行・判定の受け方・イベントの組み立て。すべて純関数** | 発注026・028 の成果（`order.ts` / `session.ts` / `question.ts`） |
| 032 | **画面（`.tsx`）。** Session・範囲選択・設定・中断復元 | **030 の完了が前提。** 030 の検収後に出す |

**本発注は `.tsx` を 1 本も作らない。** 画面は 032 の範囲である。
ここで作るのは「画面が呼ぶ関数」だけであり、描画・DOM・preact に一切触れない。

**発注026 との違いを取り違えないこと。** 026 は**番号の列**を決めた（どの首を、どの順で）。
本発注は**一問の中で何が起きるか**を決める（出す → 答える → 保存する → 見せる → 次へ）。
026 が作った `orderCardNumbers` / `resolveActiveRange` / `splitIntoChunks` を**呼ぶ側**であり、
それらを**書き換えない**。

---

## 1. 先に読むもの

| ファイル | 読む箇所 | 何のために |
|---|---|---|
| `docs/APP_SPEC.md` | **§5（5つの入口）全部**、**§5.1（共通の回の流れ）全部**、**§6（表示と操作）全部**、**§7.1.1（正解基準 D-26）全部**、**§7.3（答え合わせ）全部**、**§8.1（イベント表）全部** | **これが唯一の正本である。** 本発注書と食い違ったら仕様が正 |
| `packages/hyakunin/src/domain/question.ts` | 全部 | 発注028 の成果。**`judge` と `normalizeAnswer` を 1 文字も変えない** |
| `packages/hyakunin/src/domain/{order,session,range}.ts` | 全部 | 発注026 の成果。**呼ぶだけ。変えない** |
| `packages/shared/src/domain/mastery/rules.v1.ts` | 全部 | **本発注が 1 行だけ足す唯一の共有ファイル** |
| `packages/shared/src/domain/mastery/compute.ts` | 全部 | `effectiveMethod` が唯一の係数であること |
| `packages/shared/src/domain/event.ts` | `Event` / `Session` / `UserSettings` | 保存する形 |
| `packages/hyakunin/src/data/schema.ts` | 全部 | **手本。** 実行時検査の書き方を合わせる |
| `tools/build-data/questions.ts` | 全部 | **出題 JSON の正本の形。推測しないで読むこと** |
| `packages/shared/src/storage/repo/*.ts` | 署名だけ | port が写し取る面 |
| `docs/IMPLEMENTATION_PLAN.md` | §12.3（suite の分け方）、§8.4（画面状態）、§8.5（正誤表現）、P7 の「対象テスト」 | **1 本に集約しない**という規約 |

**「番」「首」「問」「回」を混同しないこと**（`APP_SPEC` §2）。本発注が扱うのは**問**と**回**である。

---

## 2. 変更境界

### 変更・作成してよいファイル

| ファイル | 種類 |
|---|---|
| `packages/hyakunin/src/domain/entry.ts` | 新規 |
| `packages/hyakunin/src/domain/flow.ts` | 新規 |
| `packages/hyakunin/src/domain/record.ts` | 新規 |
| `packages/hyakunin/src/domain/ports.ts` | 新規 |
| `packages/hyakunin/src/data/question-schema.ts` | 新規 |
| `packages/shared/src/domain/mastery/rules.v1.ts` | **1 行の追加とその根拠コメント 1 行のみ**（§3 の裁定 6）。他の行に触れない |
| `tests/unit/entry.test.ts` | 新規 |
| `tests/unit/flow.test.ts` | 新規 |
| `tests/unit/record.test.ts` | 新規 |
| `tests/unit/question-schema.test.ts` | 新規 |
| `tests/unit/mastery/hint-downgrade.test.ts` | **1 行の書き換えのみ**（§3 の裁定 6）。他の assert を消さない・変えない |

### 絶対に変更しないファイル・領域

- **`.tsx` を 1 本も作らない。1 行も変えない。** 画面は発注032 の範囲である。
- **`packages/hyakunin/src/domain/{question,order,session,range}.ts` を 1 文字も変更しない。**
- **`packages/shared/src/domain/mastery/{compute,color}.ts` と `recommend/` 以下を 1 文字も変更しない。**
- **`packages/shared/src/storage/` 以下を 1 文字も変更しない。** port は**写し取る**のであって、既存を作り替えない。
- **`tools/` 以下を 1 文字も変更しない**（発注031 の範囲である）。
- **`review/` 以下と `packages/hyakunin/src/data/generated/` 以下を 1 文字も変更しない。読み取りもしない。**
- `packages/kanazukai/`、`tests/unit/kanazukai/`、`tests/data/`、`tests/screen/`、
  `docs/`、`.github/`、`assets/`、`packages/*/public/` の各以下
- **一次資料 Markdown 5 本と PDF。読み取りもしなくてよい。**
- **`package.json`（ルート・各パッケージとも）。スクリプトも依存も足さない。**
- **新しい npm 依存を入れない。**

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1（D-28）: **出題台帳が空のとき、問を実行時に合成しない。入口を縮退させる。**

**実測（2026-09-01）**: `packages/hyakunin/src/data/generated/questions.blank.json` と
`questions.author.json` は**いずれも `[]` である**。`manifest.json` の
`reviewCounts.blanks.pending` は 500、`authors.pending` は 100 で、**承認済みが 1 件も無い**。

これは不具合ではない。**人確認されていない候補を公開出題しない**という
`APP_SPEC` §7.1・§14 の門が効いている状態であり、発注027 の破壊試験で両方向から固定されている
（門を殺すと陽性 fixture が赤くなり、門を開きっぱなしにすると実台帳の 0 件が赤くなる）。

したがって次を守る。

- **`poems.json` から問を組み立てる経路を作らない。** 出題は `questions.*.json` からのみ読む。
- 問が 0 件のとき、**`view`（見るだけ）だけが利用できる**。`view` は `APP_SPEC` §5 のとおり
  回答を要求せず、`poems.json` だけで成立するためである。
- 残る 4 入口（`quick` / `learn` / `review` / `exam`）は**利用不可として返す**。
  例外を投げない。空の問配列で「完了」と言わない。

**受入条件 A-7 で `grep` により機械判定する。** 本発注の作成 5 ファイルに
`poems.json` / `parsePoems` / `poem.ku` への参照が 1 件でもあれば不合格である。

**なぜここまで厳しくするか。** 出題データを実行時に合成できてしまうと、
人確認を経ていない候補が画面に出る。それは公開事故そのものであり、
「`review/*.yaml` への追記だけで公開出題の可否が変わる」という設計（計画 P10 の受入条件）が崩れる。

### 裁定 2（D-29）: **部分正解の提示は 3 点を必ず返す。丸印もチェック印も使わない。**

D-26 は「部分正解のときは、『歴史的仮名遣いではどう書くか』と『漢字ではどう書くか』を
**必ず**フィードバックする」と定める。`docs/IMPLEMENTATION_PLAN.md` §8.5 の正誤表現の表には
**部分正解の行が無い**（D-26 より前に書かれたためである）。本発注で次のとおり補う。

| 結果 | 記号 | 返す内容 |
|---|---|---|
| 部分正解 | **記号なし**（`mark: 'none'`） | ①歴史的仮名遣いの表記、②漢字の表記、③習熟度の増分。**3 つとも空にしない** |

**正解の丸印を使わない**理由は、部分正解を全部正解として誤って伝えるためである（憲章 §1 の
「表示上の誠実さ」）。**要確認のチェック印も使わない**理由は、加点される結果を不正解として
誤って伝えるためである。**記号は置かず、文言で伝える。**

D-26 の目的は「**学べる情報を返すこと**」である。「惜しい」とだけ示して正解を伏せる実装は、
たとえ加点が正しくても本裁定に反する。

### 裁定 3（D-30）: **`exam` の自己採点は ○ を 2 つに割る。△ と × は据え置く。**

D-26 は「`exam` 入口も同じ扱いとする。自己採点の○を部分正解に読み替えるのではなく、
**入力または自己申告が現代仮名遣いに留まった場合を部分正解とする**」と定める。
しかし紙に書いた内容をアプリは見られない。**本人に申告させるほか手段が無い。**

`APP_SPEC` §7.3 の ○・△・× という 3 つの評価を**増やさずに**これを満たす。

| 押すもの | 記録 |
|---|---|
| **○（漢字・歴史的仮名遣いで書けた）** | `outcome: 'correct'`、方式は `paper-handwriting` |
| **○（現代仮名遣いで書けた）** | **部分正解。** `outcome: 'correct'`、方式は一段下げて `kanji-to-kana`（裁定 5・6） |
| △（少しあやしい） | `self-tri` |
| × | `self-x` |

**○ を押した後に追加の質問を出す形にしない。** 操作が 1 段増え、既定値をどちらに置いても
申告を歪めるためである。**ボタンを 2 つ並べる。** 評価の記号はどちらも ○ である。

本発注は**この分岐を関数として持つところまで**である。ボタンの描画は発注032 で行う。

### 裁定 4（D-31）: **ヒント利用は「その問を表示している間に、ルビなし以外の読み表示が有効だったか」で決める。切替の時点を問わない。**

`APP_SPEC` §6 は「問題中に読み表示を使った事実は、**答えの箇所に直接関係するかを問わず**
ヒント利用として保存し、習熟度加点を一段軽くする」と定める。

したがって、**問が始まる前から歴史的仮名遣い表示が有効だった場合も、ヒント利用である。**
「問の途中で切り替えたときだけ」と読まないこと。画面に読みが出ている以上、
いつ切り替えたかは関係がない。**仕様に書かれているので、ここは発明ではない。**

### 裁定 5（D-32）: **方式の一段下げは、何が重なっても最大 1 段とする。**

ヒント利用（`APP_SPEC` §8.1）でも一段下げ、部分正解（D-26）でも一段下げである。
**両方が同時に起きても 2 段は下げない。**

D-26 は「一段下げは §8.1 のヒントと同じ表を使い、**新しい係数を作らない**」と明記している。
2 段下げれば表に無い実効係数を作ったことになり、この一文に反する。
**下げるかどうかを判定し、下げるなら `downgradeForHint` を 1 回だけ適用する。**

### 裁定 6（D-33）: **`HINT_METHOD_DOWNGRADE` に `paper-handwriting: 'kanji-to-kana'` を足す。既存の assert 1 行を書き換える。**

D-26 は「紙手書き自己申告は自由入力と同じ増分であるため、**一段下げ先は漢字候補（+7 / 上限 80）
とする**」と明記している。現在の `rules.v1.ts` にこの行は無い。

**`tests/unit/mastery/hint-downgrade.test.ts` の次の 1 行を書き換える。**

```ts
assert.equal(downgradeForHint('paper-handwriting'), undefined);        // 変更前
assert.equal(downgradeForHint('paper-handwriting'), 'kanji-to-kana');  // 変更後
```

**これは本発注で唯一許された「既存 assert の書き換え」である。**
根拠は D-26（依頼者裁定）であり、当該 assert は D-26 より前に書かれたものである。
**他の assert を 1 行も消さない・変えない。** `self-x` と `self-o` が `undefined` であることは
そのまま残す（この 2 つは §8.1 の表で一段下げ先が定義されていない）。

`rules.v1.ts` へ足すのは**この 1 行と、根拠を示すコメント 1 行だけ**である。
増分表（`MASTERY_RULES`）・減分表（`INCORRECT_DECREMENT`）・`MASTERY_RULES_VERSION` に触れない。

### 裁定 7（D-34）: **入口ごとの設計係数は `ENTRY_RULES` に版番号つきで 1 箇所に置く。**

`APP_SPEC` §5 が**数を明示しているのは 2 つだけ**である。

- `view`: **1 回 10 首を目安**
- `review`: **指定範囲の全首を一巡し、本文・読み・作者の確認問題を均等に**

残り（`quick` の混ぜ方、`learn` と `exam` の問数）は**仕様に数が無い**。
発明を散らかさないため、**`packages/shared/src/domain/mastery/rules.v1.ts` と同じ作りにする。**

```ts
export const ENTRY_RULES_VERSION = 1 as const;
export const ENTRY_RULES: Readonly<Record<EntryId, EntryRule>>;
```

`quick` の既定問数は **8 問**とする。`APP_SPEC` §6 が進捗表示の例として
「**12番・3問目/8**」を挙げており、リポジトリ内で唯一の根拠がある数だからである。
混ぜ方は**穴埋め 3・作者 1 の比**とする（§5 の「穴埋めと作者確認を少量ずつ混ぜ」）。

**これらは設計係数であって仕様ではない。** H-06 の試験運用で差し替わる前提で、
**1 箇所の定数として持ち、判定ロジックへ数を直接書かない。**
`grep` で数の直書きを検出できるようにすること（A-8）。

**`learn` と `exam` の既定値は仕様に根拠が無い。** 何を選んでもよいが、
**選んだ値と理由を完了報告に必ず書くこと**（§7 の 12）。黙って決めない。

### 裁定 8（D-35）: **保存層は port 経由で受け取る。`domain/` は IndexedDB を知らない。**

**実測（2026-09-01）**: `jsdom` の `window.indexedDB` は **`undefined`** である
（`structuredClone` も無い）。発注029 で入れた画面試験基盤は `jsdom` だけであり、
**画面試験の中で本物の IndexedDB は動かない。**

したがって `packages/hyakunin/src/domain/ports.ts` に**保存層の面だけ**を型で置く。

```ts
export type SessionPort = Readonly<{
  appendEvent(event: Event): Promise<SaveReceipt | SaveFailure>;
  saveSession(session: Session): Promise<SaveReceipt | SaveFailure>;
  loadLastSession(): Promise<Session | null>;
  saveSettings(settings: UserSettings): Promise<SaveReceipt | SaveFailure>;
  loadSettings(): Promise<UserSettings | null>;
}>;
export function createMemoryPort(): SessionPort & { readonly events: readonly Event[] };
```

- **`packages/shared/src/storage/` を import しない。** 型（`Event` / `Session` / `UserSettings`）だけを
  `@koten/shared/domain/event` から取る。**実装を写さない。**
- 本物の IndexedDB への接続は**発注032 の画面側**で行う。本発注は**面と、試験用の記憶実装**まで。
- `createMemoryPort()` は**試験のためだけの実装**である。

**受入条件 A-9 で `grep` により機械判定する。**

### 裁定 9（D-36）: **「回答 → 保存 → 開示」の順序を、規約ではなく型で強制する。**

P7 の受入条件に「**回答が保存された後に答えが表示される（順序が逆でない）**」がある。
コメントで注意しても守られない。**型で表現する。**

- `ports.ts` に**エクスポートしない** `unique symbol` を置き、`SaveReceipt` をその印で封じる。
- `SaveReceipt` を**外の module からリテラルで作れないようにする**。
- 開示状態への遷移関数は `SaveReceipt` を**引数に要求する**。

```ts
declare const receiptBrand: unique symbol;          // export しない
export type SaveReceipt = Readonly<{ [receiptBrand]: true; eventId: string }>;
export function reveal(state: FlowState, receipt: SaveReceipt): FlowState;
```

**保存に失敗したときは開示しない。** `SaveFailure` を受けた場合は
`docs/IMPLEMENTATION_PLAN.md` §8.4 の「保存失敗」状態へ遷移し、**回答を失わせない**
（`submitted` を保持する）。再試行できる形にする。

### 裁定 10（D-37）: **本発注も発注032 も、画像資産を 1 件も足さない。**

`assets/feedback/*.png` はリポジトリ直下にあり、`packages/hyakunin/public/` には無い。
**移すことは公開許可リストに触れる操作**であり、`docs/HANDOFF.md` §10.5 により
**Claude と Codex のどちらも単独で決めてよい範囲に入らない。**

`docs/IMPLEMENTATION_PLAN.md` §8.5 は「代替テキストまたは**隣接する状態文を必ず置く**」と
定めている。**文言だけで受入条件を満たせる。** 画像は P11 で扱う。

---

## 4. 実装範囲

### 4.1 `data/question-schema.ts`（新規）

`packages/hyakunin/src/data/schema.ts` の `parsePoems` と**同じ作りで**、出題 JSON の実行時検査を書く。

`tools/build-data/questions.ts` が出す形が正本である（**読んで確かめること。推測しない**）。
`domain/question.ts` の `Question` 型は**判定に必要な最小の面**であり、画面はそれより多くを要る。

| 項目 | 内容 |
|---|---|
| `PublishedQuestion` 型 | `questionId` / `poemId` / `skill` / `type` / `blankUnit` / `prompt` / `answer` / `answerHistorical` / `answerModern` / `acceptedAnswers` / `partialAnswers` / `candidates` / `normalization` / `sourceRef` / `reviewStatus` ほか、生成器が実際に出しているもの |
| `blankUnit` | **`'word' \| 'phrase' \| 'ku' \| null` の 4 値**（`APP_SPEC` §7.1 の 3 単位 ＋ 作者問の `null`）。**`any` や素の `string` で済ませない** |
| `parseQuestions(value: unknown): PublishedQuestion[]` | **空配列を正常として受け入れる**（裁定 1）。要素があれば 1 件ずつ検査し、壊れていれば `TypeError` |
| `toQuestion(published): Question` | `domain/question.ts` の `Question` へ落とす。**`judge` に渡せる形にする** |

**`reviewStatus !== 'human-confirmed'` の要素を受け取ったら `TypeError` にする。**
生成器が既に絞っているが、**検査は生成器を信用しない**（それが検査の役目である）。

> **記録済みの負債をここで解消する。** 発注027 の検収時に「`blankUnit` の 3 値型がコード上
> どこにも表現されていない（`tools/build-data/questions.ts` は `type Poem = any` で `'ku'` を直書き）」
> と記録した。**生成器側は触らない**（発注031 も `tools/build-data/` を変更しない）が、
> **読み取り側の型としてここで初めて表現する。**

### 4.2 `domain/entry.ts`（新規）

裁定 7 のとおり。

| 記号 | 内容 |
|---|---|
| `EntryId` | `'quick' \| 'view' \| 'learn' \| 'review' \| 'exam'`。`Session['entry']` と一致させる |
| `ENTRY_RULES_VERSION` | `1 as const` |
| `ENTRY_RULES` | 入口ごとの設計係数。**数はここにしか書かない** |
| `isEntryAvailable(entry, availableQuestionCount): boolean` | 裁定 1。問 0 件なら `view` だけ `true` |
| `planQuestions(entry, available, cardNumbers, seed): PublishedQuestion[]` | 入口の方針で問を選ぶ。**順序は発注026 の `orderCardNumbers` を呼ぶ。自前で並べ替えない** |

`planQuestions` は**乱数も時刻も内部で呼ばない**（発注026 の裁定 1 と同じ。A-6 で機械判定）。

### 4.3 `domain/flow.ts`（新規）

一問の進行を表す純関数の集合。**状態を持つオブジェクトを作らない**（引数で受け、新しい状態を返す）。

| 記号 | 内容 |
|---|---|
| `FlowPhase` | `'prompt' \| 'answered' \| 'revealed' \| 'save-failed' \| 'complete'` |
| `FlowState` | `phase` / `questionIndex` / `questionCount` / `cardNo` / `cardIndex` / `cardCount` / `hintUsed` / `submitted` / `judgement` |
| `beginQuestion(state, question, readingMode)` | `'prompt'` へ。**`readingMode` が「ルビなし」以外なら `hintUsed` を立てる**（裁定 4） |
| `useHint(state)` | `hintUsed` を立てる。**一度立ったら下げられない** |
| `submitAnswer(state, question, input, context)` | `judge` を呼び `'answered'` へ。**ここで答えを開示しない** |
| `reveal(state, receipt)` | 裁定 9。`SaveReceipt` が無ければ呼べない。`'revealed'` へ |
| `failSave(state, failure)` | `'save-failed'` へ。**`submitted` を保持する** |
| `advance(state)` | 「次へ」/ Enter。次問が無ければ `'complete'` |
| `progressLabel(state)` | `APP_SPEC` §6 の「**12番・3問目/8**」の形を返す。**番・首・問を区別する** |
| `buildFeedback(question, judgement)` | 裁定 2。`Feedback` を返す |

**`advance` はタイマーを持たない。** `setTimeout` / `setInterval` を書かない
（`APP_SPEC` §7.3「自動で次の問題へ送らない」）。**A-6 で機械判定する。**

### 4.4 `domain/record.ts`（新規）

| 記号 | 内容 |
|---|---|
| `effectiveMethodFor(method, hintUsed, judgement)` | 裁定 5。下げるのは**最大 1 段**。下げ先が `undefined` なら `method` のまま |
| `deltaFor(effectiveMethod, outcome, currentScore, isRepeat)` | **`rules.v1.ts` を唯一の出所とする。係数を書き写さない** |
| `buildEvent(input): Event` | `eventId` / `localDate` / `sessionId` は**すべて引数で受け取る**。関数の中で作らない |
| `outcomeFor(judgement)` | `'correct'` → `correct`、`'partial'` → `correct`、`'incorrect'` → `incorrect`、`'needs-review'` → **`skipped`** |

**`'needs-review'` を `incorrect` にしない。** `APP_SPEC` §6 は「読みの出典・異同が確認済みで
ない場合は『要確認』と表示し、**正解を自動断定しない**」と定める。減点は断定である。
`skipped`（`computeMastery` が増減させない）へ写す。

`buildEvent` は `Math.random` / `Date` を呼ばない（A-6）。

### 4.5 `domain/ports.ts`（新規）

裁定 8・9 のとおり。**`packages/shared/src/storage/` を import しない。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm run typecheck` / `npm run lint` が終了コード 0 | 各コマンド |
| A-2 | **本発注の 5 本の試験合計が 2 件から 45 件以上へ増えている** | **着手時**は `node --experimental-strip-types --test "tests/unit/mastery/hint-downgrade.test.ts"` の `ℹ tests`（**2 件**。残り 4 本はまだ存在しないので指定できない）。**完了時**は 5 本すべてを列挙して実行し `ℹ tests` を取る。**両方を報告に貼る。全体の件数は並行発注のため判定に使わない** |
| A-3 | **`npm run test:node` の既存 196 件が、`hint-downgrade` の 1 行を除いて名前も内容も変わらず緑** | `npm run test:node` の `ℹ pass` と `ℹ fail`。**`fail 0` であること**。196 + 新規分の合計を報告に貼る |
| A-4 | **`npm run test:screen` が 6 件のまま緑** | `npm run test:screen`。**本発注は画面を触らないので増減してはならない** |
| A-5 | **裁定 1 の縮退**が試験で固定されている | (a) 問 0 件で `isEntryAvailable('view', 0)` が `true`、(b) 残る 4 入口が `false`、(c) `planQuestions` が問 0 件で**空配列を返し、例外を投げない** |
| A-6 | **`Math.random` / `Date.now` / `new Date` / `toISOString` / `getTimezoneOffset` / `setTimeout` / `setInterval` が本発注の作成 5 ファイルに 0 件** | `grep -nE "Math\.random\|Date\.now\|new Date\|toISOString\|getTimezoneOffset\|setTimeout\|setInterval" packages/hyakunin/src/domain/entry.ts packages/hyakunin/src/domain/flow.ts packages/hyakunin/src/domain/record.ts packages/hyakunin/src/domain/ports.ts packages/hyakunin/src/data/question-schema.ts` の出力を報告に貼る（**0 件であること**） |
| A-7 | **`poems.json` / `parsePoems` / `poem.ku` が本発注の作成 5 ファイルに 0 件**（裁定 1） | 上と同じ 5 ファイルに `grep -nE "poems\.json\|parsePoems\|poem\.ku"`。出力を貼る（**0 件であること**） |
| A-8 | **`ENTRY_RULES` の外に入口の数が直書きされていない** | `grep -nE "[0-9]+" packages/hyakunin/src/domain/entry.ts` の出力を貼り、**数が `ENTRY_RULES` の定義と版番号の中だけに現れる**ことを示す |
| A-9 | **`packages/shared/src/storage` への import が本発注の作成 5 ファイルに 0 件**（裁定 8） | 上と同じ 5 ファイルに `grep -n "shared/storage\|storage/repo\|storage/db"`。出力を貼る（**0 件であること**） |
| A-10 | **部分正解の 3 点が空でない**（裁定 2） | `judgement` が `'partial'` のとき `buildFeedback` の返す `historical` と `kanji` が**どちらも空文字でない**、かつ `mark` が `'none'` であることを見る試験。**`every()` だけで書かない**（§5.3） |
| A-11 | **一段下げが最大 1 段**（裁定 5） | `effectiveMethodFor('free-input', true, 'partial')` が **`'kanji-to-kana'`**（`'choice'` ではない）ことを見る試験 |
| A-12 | **`.tsx` を 1 本も作っていない・変えていない** | `git status --porcelain` の出力を貼る |
| A-13 | `tools/` と `packages/kanazukai/` と `review/` と `packages/hyakunin/src/data/generated/` に差分が無い | `git status --porcelain tools packages/kanazukai review packages/hyakunin/src/data/generated` が空 |
| A-14 | **`rules.v1.ts` の差分が 2 行以内**（裁定 6） | `git diff --stat packages/shared/src/domain/mastery/rules.v1.ts` の出力を貼る |
| A-15 | `npm run scan:publish` が 0 件違反 | コマンドの出力を貼る |

### 5.1 破壊試験（**受入の中心。ここが本題である**）

**実装の論理を 1 箇所だけ反転させ、狙った試験だけが赤くなることを示す。**
**反転させたら必ず元へ戻し、戻した後の `sha256sum` を報告に貼る。**

| # | 反転させる論理 | 赤くなるべき試験 |
|---|---|---|
| **B-1** | `isEntryAvailable` が入口を問わず常に `true` を返す | 問 0 件で 4 入口が使えないことを見る試験だけが赤くなり、`view` を見る試験は**緑のまま**であること |
| **B-2** | `planQuestions` が問 0 件のときに例外を投げる | 空配列を返すことを見る試験だけ |
| **B-3** | `beginQuestion` が `readingMode` を見ずに `hintUsed` を立てない（裁定 4 の反転） | 「問の開始前から読み表示が有効ならヒント」を見る試験だけが赤くなること。**問の途中で切り替える試験は緑のままであること**（`useHint` は別経路のため） |
| **B-4** | `effectiveMethodFor` が下げを 2 回適用する（裁定 5 の反転） | **A-11 の試験だけ**が赤くなり、ヒントのみ・部分正解のみの試験は**緑のまま**であること |
| **B-5** | `outcomeFor('needs-review')` を `'incorrect'` にする | 要確認が減点にならないことを見る試験だけ |
| **B-6** | `buildFeedback` が部分正解のとき `historical` を空文字で返す | **A-10 のうち歴史的仮名遣いを見る試験だけ**。**`kanji` を見る試験は緑のままであること**（2 つを別々に固定していることの証明） |
| **B-7** | `buildFeedback` が部分正解のとき `mark` を `'maru'` で返す | 記号を見る試験だけ。**文言を見る試験は緑のまま** |
| **B-8** | `deltaFor` が `rules.v1.ts` を見ずに固定値 `9` を返す | 方式ごとの増分を見る試験が**複数本**赤くなること（係数の出所が 1 つであることの証明） |
| **B-9** | `advance` が `phase` を見ずに常に次問へ進む | 「保存前に開示しない」「開示前に進まない」を見る試験だけ |
| **B-10** | `reveal` の `receipt` 引数を使わない実装にし、`flow.ts` の外から `SaveReceipt` のリテラルを作ってみる | **`npm run typecheck` が失敗すること。** 通ってしまう場合は裁定 9 の封じが効いていない。**その事実を報告して止まる** |
| **B-11** | `HINT_METHOD_DOWNGRADE` から `paper-handwriting` の行を消す | `hint-downgrade.test.ts` の当該 1 件と、A-11 の試験が赤くなること |
| **B-12** | `parseQuestions` が `reviewStatus` を検査しない | 未確認の要素を弾く試験だけ |

**B-3・B-4・B-6・B-7・B-8 の「他は緑のまま」が、試験が目的別に分かれていることの証明である。**
ここで複数本が同時に赤くなった場合、試験が集約されすぎている（計画 §12.3 違反）。

**B-10 は他と性質が違う。** 赤くなるのは試験ではなく**型検査**である。
`npm run typecheck` が**失敗すること**が期待される結果である。

**どれかが期待どおりにならなかった場合、「全部緑でした」と報告せず、
どれがどうならなかったかを報告して止まること。**

### 5.2 fixture の選び方（**発注026 で実際に踏んだ落とし穴**）

発注026 の破壊試験 B-6 では、**第 1 首を fixture に使うと距離順と番号順が一致してしまい、
論理を反転させても赤くならない**ことが分かった。指定した論理は正しく、fixture が悪かった。

本発注で同じ形になりやすいのは次である。**先に確かめてから fixture を選ぶこと。**

- **歴史的仮名遣いと現代仮名遣いが一致する語**を部分正解の fixture に使うと、
  `partialAnswers` が空になり、**部分正解が一度も起きない**。**両者が異なる語を選ぶこと。**
- **`acceptedAnswers` が空**の問を使うと、`some()` は常に `false` を返すため
  「受理される」経路が一度も通らない。**空でないことを先に assert すること。**
- **`quick` の混ぜ方を見る fixture に、穴埋めだけ／作者だけの問集合を渡すと、
  比が何であっても同じ結果になる。** 両方を含む集合を渡すこと。

### 5.3 空集合の偽合格を作らないこと（**このプロジェクトが繰り返し踏んでいる型**）

**空配列に対する `every()` は `true` を返す。** 「すべての要素が条件を満たす」形の assert は、
配列が空のとき**無条件に緑になる**。発注029 の作業中に実際に見つかった経路である。

したがって、**`every()` / `filter().length === 0` / `for` ループ内だけの assert を書くときは、
必ず直前に「配列が空でないこと」を assert する。**

```ts
assert.ok(items.length > 0, 'fixture が空では検査にならない');
assert.ok(items.every(...));
```

**A-5・A-10 はこの形で書くこと。**

### 5.4 実行環境の注意（Windows）

- `npm run test:node` は `node --experimental-strip-types` を直接使う。ブラウザは要らない。
- **`npm run check:overflow` を走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。
- **`npm test` の全体実行は並行発注（031）のため赤くなることがある。** A-2 の 5 ファイル指定で判定する。
- **`npm run test:screen` は本発注では 6 件のまま**であるべきである（A-4）。増えていたら画面を触っている。
- 破壊試験でファイルを書き戻すとき、**Windows のファイルロックで書き込みが失敗することがある。**
  親担当が実際に踏んだ。**書き戻しに再試行を入れ、戻した後に必ず `sha256sum` で一致を確かめること。**
  反転したまま次へ進むのが最悪である。

---

## 6. 停止して報告する条件

- **`poems.json` を読まないと実装できないと判断した。** 読まずに止まる（裁定 1。設計を間違えている）。
- **`packages/shared/src/storage/` を import しないと実装できないと判断した。** せずに止まる（裁定 8）。
- **`rules.v1.ts` に 1 行を超える変更が要ると判断した。** 加えずに止まる（裁定 6）。
- **`hint-downgrade.test.ts` の `paper-handwriting` 以外の assert を変えたくなった。** 変えずに止まる。
- **`Math.random()` か `Date` を関数の中で呼ばないと実装できないと判断した。** 呼ばずに止まる。
- **`APP_SPEC` §5・§5.1・§6・§7.1.1・§7.3・§8.1 に書かれていない挙動を決める必要が生じた。**
  決めずに止まり、何を決めたいかを報告する。とくに**習熟度の係数・色の境界・推薦の順序**は
  発明しないこと（既に裁定済みである）。
- **B-10 で型検査が通ってしまった。** 通ってしまった事実を報告して止まる（裁定 9 の封じが効いていない）。
- §2 で許した以外のファイルが必要になった。**作らずに**止まる。
- 新しい npm 依存が要ると判断した。**入れずに**止まる。
- **画面（`.tsx`）が無いと受入条件を満たせないと判断した。** 作らずに止まる（発注032 の範囲である）。

---

## 7. 完了報告に含めること

1. **着手時と完了時の、A-2 の 5 ファイル合計の試験件数**（両方）。
2. **`npm run test:node` の `ℹ tests` / `ℹ pass` / `ℹ fail`** と、**`npm run test:screen` の件数**。
3. `typecheck` / `lint` / `scan:publish` の終了コードと出力。
4. `grep -n "^test(" tests/unit/entry.test.ts tests/unit/flow.test.ts tests/unit/record.test.ts tests/unit/question-schema.test.ts` の出力そのまま。
5. **A-6・A-7・A-8・A-9 の grep の出力そのまま**（A-6・A-7・A-9 は 0 件であること）。
6. **`git diff packages/shared/src/domain/mastery/rules.v1.ts` の出力そのまま**（2 行以内であること）。
7. **`git diff tests/unit/mastery/hint-downgrade.test.ts` の出力そのまま**（1 行であること）。
8. **破壊試験 B-1〜B-12 の一覧と、それぞれで赤くなった試験名の全部**
   （B-3・B-4・B-6・B-7・B-8 は「赤くなったもの」と「緑のままだったもの」を両方書く。
   **B-10 は `npm run typecheck` の出力そのもの**）。
9. **反転を戻した後の `sha256sum`**（作成 5 ファイル ＋ `rules.v1.ts` ＋ `hint-downgrade.test.ts`）。
10. **§5.2 で、どの語・どの問集合を fixture に選び、なぜそれが反転を検出できるのかの説明。**
11. `git status --porcelain` の出力そのまま。
12. **判断に迷って自分で決めた事項があれば、全部列挙する。**
    **「独自に決めたことは無い」と書く前に、決めた箇所が本当に無いか確かめること。**
    とくに `ENTRY_RULES` の `learn` と `exam` の既定値は**仕様に数が無い**ので、
    何を選び、なぜそうしたかを必ず書くこと（裁定 7）。
