# Codex向け発注文書 032: P7-B 学習画面（5 入口・回の流れ・中断復元）

発注日: 2026-09-01（第14回セッション。**作成のみ。発注は 030 の検収後**）
階層: **Terra**
優先度: 高
対象: **`packages/hyakunin/src/ui/` 以下、`packages/hyakunin/src/main.tsx`、`tests/screen/` のみ**

> **本発注は発注030 の完了・検収が前提である。**
> 030 が作る `domain/{entry,flow,record,ports}.ts` と `data/question-schema.ts` を**呼ぶだけ**であり、
> **1 文字も書き換えない。** 030 が未完のうちは着手しない（型検査が通らない）。
>
> **本発注を出すとき、他の発注が走っていてはならない。**
> 画面試験（`npm run test:screen`）の件数が受入条件の中心であり、
> **並行発注があると赤緑もハッシュも判定材料にならない**（`docs/HANDOFF.md` §9 手順 0）。

---

## 0. この発注の位置づけ（**先に読むこと**）

P7（学習画面）を 2 本に割ったうちの **B** である。**ここで初めて画面へつなぐ。**

| 発注 | 範囲 | 状態 |
|---|---|---|
| 030 | 回の進行・判定の受け方・イベントの組み立て。すべて純関数 | **本発注の前提** |
| **032（本書）** | **画面（`.tsx`）。** Session・範囲選択・設定・中断復元・進捗表示 | 本書 |

**本発注は判断ロジックを 1 行も書かない。** 「どう判定するか」「どう記録するか」「何問出すか」は
すべて 030 が決めている。**画面はそれを呼び、結果を表示し、操作を渡すだけである。**

**判断ロジックを画面側に書いたら不合格である。** 受入条件 A-8 で機械判定する。
理由は、画面に書かれた判断は `npm run test:node` の 200 件超で守られず、
`jsdom` の画面試験でしか触れなくなるためである（**守りが薄い場所へ重要な判断を置かない**）。

### 何が「動く」ことを求めているか

**この段階で実際に問が出ることは期待していない。**
`questions.blank.json` と `questions.author.json` は現在 `[]` であり、
**`view`（見るだけ）以外の 4 入口は縮退する**（030 の裁定 1・D-28）。
これは不具合ではなく、人確認の門が効いている状態である。

したがって本発注が示すべきものは 2 つである。

1. **実データ（問 0 件）で、`view` が動き、残る 4 入口が「まだ準備中」と正しく縮退する。**
2. **fixture（問あり）で、5 入口すべてが一問目に到達し、回の流れが最後まで通る。**

**片方だけでは受入にならない。** 実データだけでは出題経路が一度も通らず、
fixture だけでは縮退が一度も通らない。**両方を必ず試験する。**

---

## 1. 先に読むもの

| ファイル | 読む箇所 | 何のために |
|---|---|---|
| `docs/APP_SPEC.md` | **§4・§5・§5.1・§6・§7.3 全部**、§13 | **これが唯一の正本である。** 本発注書と食い違ったら仕様が正 |
| `packages/hyakunin/src/domain/{entry,flow,record,ports}.ts` | **全部** | 発注030 の成果。**呼ぶだけ。変えない** |
| `packages/hyakunin/src/data/question-schema.ts` | 全部 | 同上 |
| `packages/hyakunin/src/domain/{range,order,session,question}.ts` | 全部 | 発注026・028 の成果。**呼ぶだけ。変えない** |
| `packages/hyakunin/src/ui/screens/Home.tsx` | **全部** | **本発注が作り替える唯一の既存画面。** 既存の閲覧機能を壊さない |
| `tests/screen/{harness,home}.test.tsx` | **全部** | **手本。** 発注029 の成果。`jsdom` の受け渡し・`act` の使い方をそのまま踏襲する |
| `packages/shared/src/storage/{db,fallback}.ts` と `repo/*.ts` | 全部 | 本物の保存層。**画面がここへつなぐ** |
| `packages/shared/src/ui/{ErrorBoundary,screens/ErrorScreen}.tsx` | 全部 | 既存の作法 |
| `docs/DESIGN_SYSTEM.md` | 操作部品の 8 状態、カラートークン、アクセシビリティと文言、**禁止事項** | 見た目の規約 |
| `docs/IMPLEMENTATION_PLAN.md` | **§8.1〜§8.6 全部**、§12.3、§12.5、§13.4、P7 | 画面遷移・状態・正誤表現・否定アサーション |
| `packages/hyakunin/src/styles.css` | 全部 | 既存のクラス名。**作り直さない** |

**「番」「首」「問」「回」を混同しないこと**（`APP_SPEC` §2）。
進捗表示「**12番・3問目/8**」はこの 3 つを区別している。**まとめて「3/8」にしない。**

---

## 2. 変更境界

### 変更・作成してよいファイル

| ファイル | 種類 |
|---|---|
| `packages/hyakunin/src/ui/screens/Session.tsx` | 新規 |
| `packages/hyakunin/src/ui/screens/RangePicker.tsx` | 新規 |
| `packages/hyakunin/src/ui/components/ReadingToggle.tsx` | 新規 |
| `packages/hyakunin/src/ui/components/WritingModeToggle.tsx` | 新規 |
| `packages/hyakunin/src/ui/components/AnswerFeedback.tsx` | 新規 |
| `packages/hyakunin/src/ui/components/ReportButton.tsx` | 新規 |
| `packages/hyakunin/src/ui/adapters/indexeddb-port.ts` | 新規。**`SessionPort` の本物の実装はここだけ** |
| `packages/hyakunin/src/ui/screens/Home.tsx` | 変更。**既存の閲覧機能を壊さない** |
| `packages/hyakunin/src/main.tsx` | 変更。**画面の出し分けのみ** |
| `packages/hyakunin/src/styles.css` | **追加のみ。** 既存の規則を消さない・書き換えない |
| `tests/screen/session.test.tsx` | 新規 |
| `tests/screen/entries.test.tsx` | 新規 |
| `tests/screen/restore.test.tsx` | 新規 |
| `tests/screen/range-picker.test.tsx` | 新規 |
| `tests/screen/no-pressure.test.tsx` | 新規（§4.7 の否定アサーション） |
| `tests/screen/home.test.tsx` | 追加のみ。**既存 2 件の assert を消さない** |

### 絶対に変更しないファイル・領域

- **`packages/hyakunin/src/domain/` 以下を 1 文字も変更しない**（発注026・028・030 の成果）。
- **`packages/hyakunin/src/data/` 以下を 1 文字も変更しない**（`question-schema.ts` と `schema.ts` と `generated/`）。
- **`packages/shared/` 以下を 1 文字も変更しない。** 既存の repo 関数を**呼ぶだけ**である。
  「画面に都合がよいので shared を直す」を許さない（§6 の停止条件）。
- **`tools/` 以下・`review/` 以下を 1 文字も変更しない。**
- `packages/kanazukai/`、`tests/unit/`、`tests/data/`、`docs/`、`.github/` の各以下
- **一次資料 Markdown 5 本と PDF。読み取りもしなくてよい。**
- **`package.json`・`vitest.config.ts`・`tsconfig*.json`。1 文字も変えない。**
  **`vitest.config.ts` の `include` と `passWithNoTests: false` に触らない**（発注029 の B-4 が守っている
  「0 件で成功しない」性質を壊すため）。
- **新しい npm 依存を入れない。** `@testing-library/*` を入れない（D-27）。
- **画像資産を 1 件も足さない**（030 の裁定 10・D-37）。`assets/feedback/*.png` を移さない。

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: **画面は判断しない。030 の関数を呼ぶ。**

次を画面（`.tsx`）に書いてはならない。**すべて 030 が持っている。**

| 書いてはならないもの | 呼ぶべきもの |
|---|---|
| 正誤の判定 | `judge()`（`domain/question.ts`） |
| 部分正解の文言の組み立て | `buildFeedback(forms, judgement)`（`domain/flow.ts`）。**`forms` は `{ historical: q.answerHistorical, kanji: q.answer }` を画面が渡す**（030 検収で署名を訂正した。§3 の裁定 11） |
| 方式の一段下げ | `effectiveMethodFor()`（`domain/record.ts`） |
| 増減の値 | `deltaFor()`（`domain/record.ts`） |
| 入口ごとの問数・混ぜ方 | `ENTRY_RULES` / `planQuestions(entry, available, cardNumbers, seed, mode)`（`domain/entry.ts`）。**第5引数の `mode` に番号順／ランダムを渡す**（030 検収で追加した。§3 の裁定 11） |
| 並び順 | `orderCardNumbers()`（`domain/order.ts`） |
| 進捗の文言 | `progressLabel()`（`domain/flow.ts`） |
| 20 首分割 | `splitIntoChunks()`（`domain/range.ts`） |

**受入条件 A-8 で `grep` により機械判定する。**
`ui/` 以下の `.tsx` に `MASTERY_RULES` / `INCORRECT_DECREMENT` / `normalizeAnswer` /
`acceptedAnswers` / `partialAnswers` への参照があれば不合格である。

### 裁定 2: **保存への接続は `ui/adapters/indexeddb-port.ts` の 1 ファイルだけが行う。**

**実測（2026-09-01）**: `jsdom` の `window.indexedDB` は **`undefined`** である。
発注029 で入れた画面試験基盤は `jsdom` だけであり、**画面試験の中で本物の IndexedDB は動かない。**

したがって次の形にする。

- `Session.tsx` と `Home.tsx` は **`SessionPort` を props で受け取る**（030 の `domain/ports.ts`）。
- **画面が `openDatabase()` を直接呼ばない。** 呼ぶのは `indexeddb-port.ts` だけである。
- `main.tsx` が `indexeddb-port.ts` から本物の port を作り、画面へ渡す。
- **画面試験は `createMemoryPort()` を渡す**（030 の成果）。`vi.mock` で保存層を差し替えない。

**受入条件 A-9 で `grep` により機械判定する。**
`ui/screens/` と `ui/components/` の `.tsx` に `openDatabase` / `indexedDB` / `storage/db` への
参照があれば不合格である。

**IndexedDB が使えない環境（`openDatabase` が `unavailable` を返す）でも、
画面は落ちない。** `docs/IMPLEMENTATION_PLAN.md` §8.4 の「保存失敗」状態を出し、
**回答を失わせない**。`packages/shared/src/storage/fallback.ts` が既にある。

### 裁定 3: **`view` 以外の 4 入口が縮退したとき、「準備中」と正直に書く。無効なボタンを黙って置かない。**

問が 0 件のとき、`isEntryAvailable()` は `view` 以外に `false` を返す（030 の裁定 1・D-28）。
画面は次のとおりにする。

- 4 つの入口を**隠さない。** 存在することは見せる。
- **`disabled` にするだけで済ませない。** なぜ使えないかを 1 行で書く。
- 文言は「**問題はまだ準備中です。いまは「見るだけ」を使えます。**」とする。
  **「エラー」「読み込みに失敗」と書かない**（失敗していない。門が効いているだけである）。
- **`view` は必ず使える。** 問が 0 件でも `poems.json` だけで成立する。

`docs/CONSTITUTION.md` の「表示上の誠実さ」に照らし、**準備中を故障として見せない。**

### 裁定 4: **自動で次へ進めない。タイマーを 1 つも置かない。**

`APP_SPEC` §7.3 は「**答えと結果は同じ問題領域に表示し、自動で次の問題へ送らない。
「次へ」ボタンまたはEnterで進む**」と定める。

- **`ui/` 以下の `.tsx` に `setTimeout` / `setInterval` を書かない。** A-10 で機械判定する。
- 「次へ」ボタンと **Enter の両方**で進む。**どちらか一方にしない。**
- **Enter は「開示済み」のときだけ効く。** 入力中の Enter で問が飛んだら不合格である。

### 裁定 5: **読み表示の切替を、正解そのものに触れさせない。**

`APP_SPEC` §6 は「読みの表示切替は問題の正解そのものを変更しない」と定める。

- `ReadingToggle` は**表示だけ**を変える。`Question` にも `judge()` の引数にも影響しない。
- 切替は `UserSettings` として保存する（§5「切替は設定として保存する」）。
- **切替すると `hintUsed` が立つ**（030 の裁定 4・D-31）。`flow.ts` の関数を呼んで立てる。
  **画面側で `hintUsed` を組み立てない。**

### 裁定 6: **縦横切替は問・閲覧の両方に置く。設定として保存する。**

`APP_SPEC` §6 のとおり。既存 `Home.tsx` は `localStorage` の `hyakunin:orientation` に保存している。

**この既存の保存先を、`UserSettings.writing` へ寄せる。**
理由は `APP_SPEC` §10.2 が `UserSettings` に「縦/横書き」を持たせているためである。
**ただし既存の `localStorage` の値を読めなくして利用者の設定を失わせないこと**——
`UserSettings` に値が無いときは既存キーを読む。**移行を 1 回だけ行い、以後は `UserSettings` を使う。**

### 裁定 7: **「問題を報告」は置く。送信はしない。**

`APP_SPEC` §12 と計画 P7 の 6 のとおり。

- 各問と閲覧画面に「問題を報告」を置く。
- **押すと `Report` をローカルへ保存する**（`packages/shared/src/storage/repo/reports.ts` が既にある）。
  `status: 'local'` とする。
- **送信しない。** `fetch` / `XMLHttpRequest` / `navigator.sendBeacon` を 1 件も書かない
  （送信は P9・裁定 D-02 が未決）。**A-11 で機械判定する。**

### 裁定 8: **中断からの復元は、必ず「復元しない」を並べて出す。既定で復元しない。**

`APP_SPEC` §5.1 は「タブを閉じても最後に保存された回を復元できる。**復元しない選択も可能とする**」
と定める。

- 起動時に未完了の回があれば、**復元するか尋ねる。** 黙って復元しない。
- **「復元しない」を選べる。** 選んだら新しい回を始められる。
- 復元中は `resolveActiveRange()`（030 が呼ぶ発注026 の関数）に従い、
  **URL の範囲より進行中の回の範囲を優先する**（`APP_SPEC` §4・重点シナリオ R-11）。

### 裁定 9: **画像資産を足さない。文言で伝える。**

030 の裁定 10（D-37）と同じ。`assets/feedback/*.png` を `packages/hyakunin/public/` へ移さない。
**移すことは公開許可リストに触れる操作**であり、`docs/HANDOFF.md` §10.5 により
Codex が単独で決めてよい範囲に入らない。

`docs/IMPLEMENTATION_PLAN.md` §8.5 は「代替テキストまたは**隣接する状態文を必ず置く**」と
定めており、**文言だけで受入条件を満たせる。**

### 裁定 11: **030 の検収で 2 件を訂正した。訂正後の署名を使う。**

**2026-09-01 の 030 検収で、親担当が実装の欠陥 2 件を見つけて直した。**
**発注書の起草時の署名が原因であり、Codex の誤りではない。** 訂正後は次のとおりである。

| 記号 | 訂正後 | なぜ訂正したか |
|---|---|---|
| `buildFeedback(forms: AnswerForms, judgement)` | 第1引数は **`{ historical, kanji }` の 2 表記**。`Question` を渡さない | `Question` は判定に要る面しか持たず**歴史的仮名遣いを運ばない**。旧実装は `acceptedAnswers.at(0)` から推測していたが、**生成器は `[漢字, 歴史的読み]` の順で作る**ため、実データでは**両方とも漢字表記**になっていた（2番3句で `歴史的仮名遣い: 白妙の` / `漢字: 白妙の`）。D-29 の目的が達成されない |
| `planQuestions(entry, available, cardNumbers, seed, mode)` | **第5引数 `mode`**（`'number'` / `'random'`。既定は `'number'`） | 旧実装は `orderCardNumbers` に `'number'` を直書きしており、**ランダム順へ到達できなかった**（`seed` が飾りになっていた）。`APP_SPEC` §5.1 の「一巡後に番号順／ランダムを選べる」を画面から実現できない |

**画面は `PublishedQuestion` を持っているので、`answerHistorical` と `answer` をそのまま渡せばよい。**
**`acceptedAnswers` から推測しないこと。**

### 裁定 10: **`tests/screen/` の fixture は、`data/generated/` を読まずに作る。**

問が 0 件の実データでは、出題経路が一度も通らない。
**fixture の `PublishedQuestion` をコード内に直接書く。**

- fixture は `parseQuestions()` を**通す。** 通らない fixture は現実と乖離している。
- **`reviewStatus: 'human-confirmed'` の要素だけを置く**（それ以外は `parseQuestions` が弾く）。
- **実データを読む試験を、fixture の試験と同じファイルに混ぜない。**
  `tests/screen/entries.test.tsx` が実データ（縮退）、`session.test.tsx` が fixture（出題）である。

---

## 4. 実装範囲

### 4.1 画面の遷移（`main.tsx`）

`docs/IMPLEMENTATION_PLAN.md` §8.1 に従う。**ルータを入れない**（依存を増やさない）。
`main.tsx` が状態で出し分ける。

```text
Home（第一操作＝とりあえず始める）
  ├→ RangePicker（範囲・入口・順序の確認）
  │     └→ Session（問を解く → 即時フィードバック → 次へ → 完了）
  └→ 既存の閲覧（view）— 現在の Home.tsx の機能。壊さない
```

**結果画面（Result）を作らない。** P8 の範囲である。
回が完了したら「今回の範囲を確認しました」と表示して止め、**Home へ戻る導線を置く。**

### 4.2 `Home.tsx`（変更）

- **既存の閲覧機能（100 首・読み 3 表示・縦横・前後移動・範囲 URL）を 1 つも壊さない。**
  既存の `tests/screen/home.test.tsx` の 2 件と `tests/unit/hyakunin-viewer-navigation.test.ts` が
  **名前も内容も変わらず緑であること**が受入条件である（A-4）。
- 5 つの入口を主要導線として置く（`APP_SPEC` §5）。**第一操作は「とりあえず始める」。**
- 裁定 3 の縮退表示。
- 裁定 8 の復元の問いかけ。
- 「実機確認版 · 学習記録と出題はまだ保存しません」の注記は、**保存が動くようになったので外す。**
  代わりに、問が 0 件である旨（裁定 3 の文言）を出す。

### 4.3 `RangePicker.tsx`（新規）

`APP_SPEC` §5 の「開始前に範囲、入口、順序を確認する。**詳細設定を最初から要求せず**」。

- 範囲（既存の数値入力を流用してよい）、入口、順序（番号順／ランダム）。
- **順序の切替は `canChangeOrder()` を見る**（発注026 の成果）。回の進行中は変えられない。
- **URL の範囲を失わせない**（`APP_SPEC` §4・P7 の受入条件）。

### 4.4 `Session.tsx`（新規）

`APP_SPEC` §5.1 の流れをそのまま画面にする。

| 段 | 画面 |
|---|---|
| 問 | 縦書きの本文／作者。横書きの操作。読み表示・縦横切替・「問題を報告」 |
| 回答 | 入力欄または選択肢。`exam` は自己採点（裁定 3・D-30 の ○ 2 つ・△・×） |
| 保存 | **答えを見せる前に保存する。** 失敗したら「保存失敗」状態（裁定 2） |
| 開示 | `buildFeedback()` の結果を表示。**部分正解では歴史的仮名遣いと漢字を必ず出す** |
| 次へ | ボタンと Enter（裁定 4） |

- **進捗は `progressLabel()` を表示する。**「12番・3問目/8」の形。
- **読みの `status === 'review'` の首では「要確認」を出し、正解を自動断定しない**（`APP_SPEC` §6）。
  既存 `Home.tsx` の `review-note` の文言をそのまま使う。
- **手書き欄（`HandwritingPad`）を作らない。** 計画 P7 は「画面手書き欄は**任意**」とし、
  受入条件は「**手書き欄なしでも exam を完了できる**」である。
  **任意のものを先に作らない。** 文字認識・画像保存は初回公開で行わない（`APP_SPEC` §5）。

### 4.5 `ui/adapters/indexeddb-port.ts`（新規）

裁定 2 のとおり。`packages/shared/src/storage/` の既存関数を**呼んで**、
030 の `SessionPort` の形へ**合わせるだけ**。**ロジックを足さない。**

### 4.6 アクセシビリティ（`APP_SPEC` §13・計画 §13.4）

- **タップ領域 44px 以上。** `styles.css` に規則を置く。
- **可視フォーカス。** `DESIGN_SYSTEM` の 8 状態。
- **縦書きとは別に、読み上げ順序が自然な DOM を持つ**（`APP_SPEC` §13）。
  既存 `Home.tsx` の `aria-label` による上句・下句の与え方を踏襲する。
- **`aria-live` で正誤・保存状態・範囲エラーを通知する。**
- **ドラッグ・音声・手書き認識を必須操作にしない。**
- 自由入力には**ラベル・入力例・エラー位置**を付ける。

### 4.7 否定アサーション（計画 §12.5。**`tests/screen/no-pressure.test.tsx`**）

計画 §12.5 は「**経路そのものを禁止する** grep 型の否定アサーション」を求めている。
次を `packages/hyakunin/src/ui/` 以下のソース文字列に対して検査する。

| # | 禁止するもの | 理由 |
|---|---|---|
| N-1 | `setTimeout` / `setInterval` | 裁定 4。自動遷移を作らない |
| N-2 | `fetch` / `XMLHttpRequest` / `sendBeacon` | 裁定 7。送信は P9 |
| N-3 | 順位・偏差値・ランキング・連続日数・「他の人」 | `APP_SPEC` §5・§7.3。圧力表示を置かない |
| N-4 | `openDatabase` / `indexedDB`（`adapters/` を除く） | 裁定 2 |
| N-5 | `MASTERY_RULES` / `INCORRECT_DECREMENT` / `normalizeAnswer` | 裁定 1 |

**この試験は「0 件であること」を見る。** したがって**空の偽合格が起きやすい**（§5.3）。
**検査対象のファイル一覧が空でないことを先に assert すること。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm run typecheck` / `npm run lint` / `npm run build` が終了コード 0 | 各コマンド |
| A-2 | **`npm run test:screen` が 6 件から 30 件以上へ増えている** | `npm run test:screen` の件数を着手時と完了時の 2 回 |
| A-3 | **`npm run test:node` の件数が 1 件も減っていない** | `npm run test:node` の `ℹ tests` / `ℹ pass` / `ℹ fail`。**`fail 0`** |
| A-4 | **既存の `home.test.tsx` 2 件と `harness.test.tsx` 4 件が名前も内容も変わらず緑** | 試験名 6 つを報告に貼る |
| A-5 | **実データ（問 0 件）で `view` が動き、4 入口が縮退する**（裁定 3） | `entries.test.tsx`。(a) `view` の導線が押せる、(b) 4 入口が押せない、(c) **「準備中」の文言が出る**、(d) **「エラー」「失敗」の語が出ない** |
| A-6 | **fixture（問あり）で 5 入口すべてが一問目に到達する** | `session.test.tsx`。**範囲が失われないこと**（`?from=10&to=20` で始め、一問目が範囲内であること） |
| A-7 | **回答 → 保存 → 開示の順序**（P7 の受入条件） | 保存を失敗させる port を渡すと**答えが表示されないこと**、かつ**入力が残っていること** |
| A-8 | **判断ロジックが画面に無い**（裁定 1） | `grep -rnE "MASTERY_RULES\|INCORRECT_DECREMENT\|normalizeAnswer\|acceptedAnswers\|partialAnswers" packages/hyakunin/src/ui/` の出力を貼る（**0 件であること**） |
| A-9 | **保存への接続が `adapters/` の 1 ファイルだけ**（裁定 2） | `grep -rnE "openDatabase\|indexedDB\|storage/db" packages/hyakunin/src/ui/screens packages/hyakunin/src/ui/components` の出力を貼る（**0 件であること**） |
| A-10 | **タイマーが無い**（裁定 4） | `grep -rnE "setTimeout\|setInterval" packages/hyakunin/src/ui/` の出力を貼る（**0 件であること**） |
| A-11 | **送信経路が無い**（裁定 7） | `grep -rnE "fetch\(\|XMLHttpRequest\|sendBeacon" packages/hyakunin/src/ui/` の出力を貼る（**0 件であること**） |
| A-12 | **「次へ」と Enter の両方で進む**（裁定 4） | 2 本の試験。**1 本にまとめない** |
| A-13 | **読み表示を使うと `hintUsed` が立ち、正解が変わらない**（裁定 5） | port に記録されたイベントの `hintUsed` と、`judge` の結果が切替前後で同じであることの**両方** |
| A-14 | **部分正解で歴史的仮名遣いと漢字が画面に出る**（030 の裁定 2・D-29） | fixture で部分正解を起こし、**2 つの表記が両方 DOM に現れ、かつ互いに異なる**こと。**「空でない」だけを見ない**——030 の検収で、両方が同じ漢字表記になっていても「空でない」検査は通ってしまうことが実測された。**丸印の文言が出ないこと** |
| A-15 | **中断復元に「復元しない」がある**（裁定 8） | 未完了の回を持つ port を渡し、両方の選択肢が押せること |
| A-16 | **順位・連続日数の表示が存在しない**（N-3） | `no-pressure.test.tsx`。**検査対象が空でないことを先に assert**（§5.3） |
| A-17 | **`packages/shared/` と `packages/hyakunin/src/domain/` と `data/` に差分が無い** | `git status --porcelain packages/shared packages/hyakunin/src/domain packages/hyakunin/src/data` が空 |
| A-18 | **`package.json` / `vitest.config.ts` / `tsconfig*.json` に差分が無い** | `git status --porcelain` の出力を貼る |
| A-19 | `npm run scan:publish` が 0 件違反 | コマンドの出力を貼る |
| A-20 | **`npm run build` の成果物に送信経路が増えていない** | `grep -c "fetch(" packages/hyakunin/dist/assets/*.js` が **1**（基準線。`@koten/shared/data/load` が `poems.json` を読むための 1 件である。**0 にしようとしないこと——データ読み込みが壊れる**）、かつ `grep -c "sendBeacon" ...` と `grep -c "XMLHttpRequest" ...` が **どちらも 0**。**3 つの数を報告に貼る** |

### 5.1 破壊試験（**受入の中心。ここが本題である**）

**実装の論理を 1 箇所だけ反転させ、狙った試験だけが赤くなることを示す。**
**反転させたら必ず元へ戻し、戻した後の `sha256sum` を報告に貼る。**

| # | 反転させる論理 | 赤くなるべき試験 |
|---|---|---|
| **B-1** | 縮退を無視し、問 0 件でも 4 入口を押せるようにする | **A-5 の (b) だけ**が赤くなり、`view` を見る (a) は**緑のまま**であること |
| **B-2** | 縮退の文言を「読み込みに失敗しました」に変える | **A-5 の (c)(d) だけ** |
| **B-3** | 保存の結果を待たずに開示する（裁定 2 の反転） | **A-7 だけ**が赤くなること。**通常の出題を見る A-6 は緑のまま**であること |
| **B-4** | 保存失敗時に入力を捨てる | A-7 のうち**入力が残ることを見る半分だけ**が赤くなり、答えが出ないことを見る半分は緑のまま |
| **B-5** | Enter で進めなくする | **A-12 の 2 本のうち Enter の 1 本だけ**（2 つを別々に固定していることの証明） |
| **B-6** | 入力中の Enter でも進むようにする | 「入力中の Enter で飛ばない」ことを見る試験だけ |
| **B-7** | 読み表示の切替で `hintUsed` を立てない | **A-13 のうち `hintUsed` を見る半分だけ**が赤くなり、正解が変わらないことを見る半分は**緑のまま** |
| **B-8** | 読み表示の切替が `judge` の引数を変えるようにする | A-13 の**もう半分だけ** |
| **B-9** | **部分正解の歴史的仮名遣いの欄へ漢字表記を入れる**（落とすのではなく、取り違える） | **A-14 の「互いに異なる」を見る試験が赤くなること。** 落とす（空にする）反転より弱い変更で赤くなることを確かめる——**030 で実際に起きた欠陥の形がこれである** |
| **B-10** | 復元の問いかけを飛ばして常に復元する | **A-15 だけ** |
| **B-11** | `progressLabel()` を使わず「3/8」と直に書く | 進捗の形を見る試験だけ。**番・首・問の区別が失われることを検出できるか** |
| **B-12** | `Session.tsx` に `setTimeout` を 1 件足す | **A-10 と N-1 の試験だけ**が赤くなること |
| **B-13** | `no-pressure.test.tsx` の検査対象ファイル一覧を**空の配列**に差し替える | **A-16 の「対象が空でない」assert が赤くなること。** 赤くならなければ、この試験は**何も検査していない**（§5.3）。**その事実を報告して止まる** |
| **B-14** | `Home.tsx` の既存の前後移動を壊す | **A-4 の既存試験と `hyakunin-viewer-navigation.test.ts` が赤くなること** |

**B-13 が本発注で最も重要である。** 否定アサーションは「0 件であること」を見るため、
**検査対象が空でも緑になる。** 発注029 の作業中に実際に見つかった型であり、
**このプロジェクトが繰り返し踏んでいる事故である。**
B-13 で赤くならなかった場合、`no-pressure.test.tsx` は嘘をついている。

**B-3・B-4・B-5・B-7・B-8・B-9 の「他は緑のまま」が、試験が目的別に分かれていることの証明である。**

**どれかが期待どおりにならなかった場合、「全部緑でした」と報告せず、
どれがどうならなかったかを報告して止まること。**

### 5.2 fixture の選び方（**発注026 で実際に踏んだ落とし穴**）

発注026 の破壊試験 B-6 では、**第 1 首を fixture に使うと距離順と番号順が一致してしまい、
論理を反転させても赤くならない**ことが分かった。指定した論理は正しく、fixture が悪かった。

本発注で同じ形になりやすいのは次である。**先に確かめてから fixture を選ぶこと。**

- **歴史的仮名遣いと現代仮名遣いが一致する語**を部分正解の fixture に使うと、
  **部分正解が一度も起きない。** A-14 と B-9 が空振りする。**両者が異なる語を選ぶこと。**
- **`acceptedAnswers` を `['<歴史的読み>']` だけにしないこと。**
  **生成器は必ず `unique([answer, ...aliases, historical])` を作るので先頭は漢字表記である。**
  030 の fixture がこれを外しており、**実データで壊れている実装が全試験を通った。**
  **`tests/unit/flow.test.ts` の現在の fixture（`['白妙の', 'しろたへの']`）を手本にすること。**
- **範囲を `?from=1&to=100` にすると、範囲が失われても気づけない。**
  A-6 は**狭い範囲**（例 `?from=10&to=20`）で試験すること。
- **1 問だけの fixture では「次へ」が一度も効かない。** A-12 は **2 問以上**で試験すること。
- **問数と首数が同じ fixture では「番・首・問」の取り違えが検出できない。**
  B-11 のために、**1 首から複数問が出る fixture**（同じ `poemId` の問を 2 つ）を用意すること。

### 5.3 空集合の偽合格を作らないこと（**このプロジェクトが繰り返し踏んでいる型**）

**空配列に対する `every()` は `true` を返す。** **空の検査対象に対する「0 件であること」も常に真である。**
発注029 の作業中に実際に見つかった経路であり、
発注005 では「**1 件も検査せず 1200 件合格**」と報告された事故が実際に起きている。

したがって §4.7 の否定アサーションは**必ず**次の形で書く。

```ts
const files = collectUiSources();
assert.ok(files.length > 0, '検査対象が空では検査にならない');
assert.ok(files.some((file) => file.endsWith('Session.tsx')), 'Session.tsx が対象に入っていない');
for (const file of files) assert.equal(forbiddenMatches(file).length, 0);
```

**「対象が空でない」だけでなく、「見るべきファイルが実際に入っている」ことも assert する。**
`Session.tsx` が対象から漏れていれば、そこに何を書いても通ってしまう。

**B-13 はこれを実測で確かめる試験である。**

### 5.3.1 `fetch` について（**本発注書の起草時に実測して確かめた**）

**`packages/shared/src/data/load.ts` は `fetch` を使っている。** `poems.json` を読むためである。
したがって **`npm run build` の成果物には `fetch(` が 1 件現れる。これは正常であり、消してはならない。**

裁定 7 が禁じているのは**画面から統計・報告を送ること**であって、静的データの読み込みではない。

- **A-11 は `packages/hyakunin/src/ui/` 以下だけを見る。** ここは 0 件でなければならない。
- **A-20 は成果物全体を見る。** ここは **1 件**が正しい。

**この区別を取り違えて `load.ts` を書き換えたら不合格である**（そもそも `packages/shared/` は §2 で禁止している）。

### 5.4 実行環境の注意（Windows）

- **`npm run check:overflow` を走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。
- **`npm run build` は実行する**（A-1・A-20）。`dist/` は追跡外である。
- **`npm test` は本発注では全体で走らせてよい**（並行発注が無いことが前提である。§0）。
- Windows のファイルロックで書き込みが失敗することがある。**破壊試験の書き戻しに再試行を入れ、
  戻した後に必ず `sha256sum` で一致を確かめること。** 親担当が実際に踏んだ事故である。

---

## 6. 停止して報告する条件

- **`packages/shared/` を直さないと実装できないと判断した。** 直さずに止まる（§2）。
  「画面に都合がよい」は理由にならない。**何が足りないのかを報告する。**
- **`packages/hyakunin/src/domain/` を直さないと実装できないと判断した。** 直さずに止まる。
  **それは発注030 の欠落であり、本発注で塞ぐものではない。**
- **`vitest.config.ts` か `package.json` を変えたくなった。** 変えずに止まる。
  とくに **`passWithNoTests: false` と `include`** に触らない（発注029 の B-4 が守っている性質である）。
- **新しい npm 依存（ルータ、`@testing-library/*`、状態管理）が要ると判断した。** 入れずに止まる。
- **画像資産を `public/` へ移したくなった。** 移さずに止まる（裁定 9。公開許可リストに触れる）。
- **手書き欄（`HandwritingPad`）が無いと受入条件を満たせないと判断した。** 作らずに止まる（§4.4）。
- **`fetch` を書かないと実装できないと判断した。** 書かずに止まる（裁定 7。送信は P9・D-02 未決）。
- **`APP_SPEC` §4・§5・§5.1・§6・§7.3・§13 に書かれていない挙動を決める必要が生じた。**
  決めずに止まり、何を決めたいかを報告する。
- **B-13 で `no-pressure.test.tsx` が赤くならなかった。** その事実を報告して止まる。
  **試験が何も検査していないということである。**
- **結果画面（Result）・おすすめ・履歴が無いと受入条件を満たせないと判断した。**
  作らずに止まる（P8 の範囲である）。
- §2 で許した以外のファイルが必要になった。**作らずに**止まる。

---

## 7. 完了報告に含めること

1. **着手時と完了時の `npm run test:screen` の件数**（両方）。
2. **`npm run test:node` の `ℹ tests` / `ℹ pass` / `ℹ fail`**（着手時と完了時）。
3. `typecheck` / `lint` / `build` / `scan:publish` の終了コードと出力。
4. `grep -rn "^test(" tests/screen/` の出力そのまま。
5. **A-8・A-9・A-10・A-11 の grep の出力そのまま**（**すべて 0 件であること**）と、
   **A-20 の 3 つの数**（`fetch(` は **1**、`sendBeacon` と `XMLHttpRequest` は **0**。§5.3.1）。
6. **A-4 の既存 6 件の試験名**（`home` 2 件・`harness` 4 件）。
7. **破壊試験 B-1〜B-14 の一覧と、それぞれで赤くなった試験名の全部**
   （B-1・B-3・B-4・B-5・B-7・B-8・B-9 は「赤くなったもの」と「緑のままだったもの」を両方書く）。
8. **B-13 の結果を単独で報告する。** 赤くなったか。赤くならなかったなら、そこで止まる。
9. **反転を戻した後の `sha256sum`**（作成・変更した `.tsx` と `.ts` の全部）。
10. **§5.2 で、どの首・どの語・どの範囲を fixture に選び、なぜそれが反転を検出できるのかの説明。**
    とくに **1 首から 2 問が出る fixture**（B-11 用）をどう作ったか。
11. **裁定 6 の設定移行**（既存 `localStorage` の `hyakunin:orientation` からの引き継ぎ）を
    どう実装し、どう試験したか。
12. `git status --porcelain` の出力そのまま。
13. **判断に迷って自分で決めた事項があれば、全部列挙する。**
    **「独自に決めたことは無い」と書く前に、決めた箇所が本当に無いか確かめること。**
    画面の発注は、文言・レイアウト・クラス名など**本発注書が細部まで定めていない箇所が多い**。
    **決めたことは必ず書くこと。**
