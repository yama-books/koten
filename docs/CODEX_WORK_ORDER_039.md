# Codex向け発注文書 039: P8-D 再開の配線（`.tsx`）

発注先: **Terra**
親担当: Claude Opus（第18回セッション）
起草日: 2026-09-02
発行日: **2026-09-02（第20回セッション）。§0.4 は実測して充填済み。**
基準となるコミット: **`48227c2`**（発注038 の検収コミット。§0.4 に実測値を記した）。
着手条件: **`git log --oneline -1` が §0.4 のコミット以降であり、`git status --porcelain` が空であること。**
**並行して走らせてはならない**（理由は §0.2）。着手前に **§0.4 の基準線を照合すること。**

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を作るか

**P8 の最後である。発注038 で作った `planResume()` を画面へ配線する。**

これで **`APP_SPEC` §12 の受入条件 3「21首以上の20首分割が動く」が初めて満たされる。**

配線するのは次の 3 経路である。**3 つとも同じ関数を通す。**

| 経路 | いま何が起きるか | 本発注のあと |
|---|---|---|
| **新規開始**（`RangePicker` の「開始」） | 範囲の**全首**を渡している。21首以上でもまとまりに割れていない | 最初のまとまりの首だけを渡す |
| **中断からの再開**（「復元する」） | **何も起きない。** ボタンは `setRestoring(false)` を呼ぶだけ | 未確認の残りから再開する |
| **再確認**（結果画面の「もう一度」） | 037 裁定 14 により `RangePicker` へ戻し、`min..max` の連続範囲を渡す | まちがえた歌だけを渡す（裁定 7 で上書き） |

### 0.2 発注038 と並行してはならない理由

**本発注は `planResume()` を呼ぶ。** 038 の作業中に走らせると、赤が本発注の配線の誤りなのか
038 の実装が途中であるためなのか**区別できない。**

さらに本発注は画面試験を増やし、`tests/screen/restore.test.tsx` を**書き換える**。
038 の受入条件 A-4 は画面試験を「1 件も増減していない」で縛っている。**同時には成立しない。**

### 0.3 実測で確かめた構造上の制約（**設計の前提。読み飛ばさないこと**）

**1. 現在の「復元する」は偽物である。**

`packages/hyakunin/src/ui/screens/Home.tsx` で、「復元する」と「復元しない」は
**どちらも `setRestoring(false)` を呼ぶだけ**である。復元は 1 行も実装されていない。

同ファイルの `useLayoutEffect` は `loadLastSession()` を呼んでいるが、
**`session !== null` しか見ておらず、`from` / `to` / `entry` / `order` / `seed` を全部捨てている。**

**2. それを守っている試験は偽合格である。**

`tests/screen/restore.test.tsx` は**「復元する」「復元しない」という文言のボタンが存在すること**しか
assert していない。**`onClick` を空関数に書き換えても緑のままである。**

**本発注はこの試験を書き換える**（§1 で明示的に許可する）。
**書き換える前に、現在の版が壊しても緑であることを実測して示すこと**（破壊試験 C-0）。

**3. `orderCardNumbers` は渡された順序を捨てる。**

`domain/order.ts` は `mode === 'number'` のとき番号順に並べ直す。
**「未確認を前に並べて渡す」は効かない。** 絞って渡すこと（発注038 裁定 2 と同じ理由）。

**4. `createSession()` の呼び出しは 1 箇所でなければならない。**

発注037 の受入条件 A-19 が `grep -c "createSession(" main.tsx` を **1** で縛っている。
**復元は新しい回を作らない**ので、この数は本発注でも **1** のままである（裁定 1）。

**5. `data/generated/` の読み込み先は静的な文字列である（D-39・依頼者裁定）。**

`Home.tsx` の `poemsUrl` / `blankQuestionsUrl` / `authorQuestionsUrl` を
テンプレートリテラルへ変えてはならない。**公開物が増える。**
`tests/screen/no-pressure.test.tsx` に回帰試験がある。**触らない。**

### 0.4 基準線（**着手前に照合すること**）

**親担当が `48227c2`・作業ツリー clean で自分で実測した値である（2026-09-02・第20回）。報告からの転記ではない。**

| 検査 | 実測値 |
|---|---|
| 基準となるコミット | **`48227c2`**（発注038 の検収コミット） |
| `npm run typecheck` / `npm run lint` / `npm run data:check` / `npm run build` | すべて終了コード **0** |
| `npm run test:node` | **tests 322 / pass 322 / fail 0** |
| `npm run test:screen` | **Test Files 11 / Tests 61 passed** |
| `npm run scan:publish` | **走査 751 件、違反 0 件** |

**変更する 7 ファイルの SHA-256**（着手前の値。完了時の差分を切り分けるため。**7 件とも既存ファイルである。新規作成ではない**）:

```
b72f815bdcd39f760eb0025aea889e9f1ba6f34a46bbb0f965fc647dfe584bbd *packages/hyakunin/src/main.tsx
0f6e47111c2e0de6afffd18db59a7fda196143bd82bd9a2e3178598eecefd999 *packages/hyakunin/src/ui/screens/Home.tsx
7fa6f01bb3b9cbff1d2a989e4ff6033706f51d28a6ad119c422a94758dfcbaa5 *packages/hyakunin/src/ui/screens/Result.tsx
40d41a6d77059c3272683ea7e08fea5f621aeaeed922b03205f9bff58a24e14c *packages/hyakunin/src/styles.css
8ff016b9027287b5958563aa23a49cbceea8267f710d6d7368ec9055f36cc72b *tests/screen/restore.test.tsx
2f3628ac3e34be54196a94420dd583478ed33c9a17ba21262254c313199dd818 *tests/screen/main-wiring.test.tsx
d8d8f174f36050d71e565dca9e3b4914465b9350e69aa63328a7f9ce39a0470c *tests/screen/result.test.tsx
```

**1 バイトも変えてはならない 6 ファイルの SHA-256**:

```
6b1b7f397e182c09bd31f34902ebc0718a784d07be19c66fd2db01b199900416 *packages/hyakunin/src/domain/resume.ts
a667bd6e97627b1061cce5a66c0f764190a6cb8f653cfb9e9f9b82abec278449 *packages/hyakunin/src/domain/range.ts
9b8fbe5506c361f650a606df1f5523ece6b2673d497cfebee349c05958c49a02 *packages/hyakunin/src/domain/entry.ts
17f9d3e9e40c63b4d11c578cd5c7c7817c2123372768da4b078e682c59a3fd28 *packages/hyakunin/src/domain/session.ts
08a857d9154f63c88b7bc8c0c4e41434bb062b54bfc0742610d764445683f34f *packages/hyakunin/src/ui/screens/Session.tsx
18f1c6d7ba2aee74af63c7e98ca40abec8e9962594855684a909569a689c84c3 *packages/hyakunin/src/ui/screens/RangePicker.tsx
```

一次資料（A-14 の照合先）:

```
291388671528cb9b81a6bc82821f243f609aee871fcaa10a4ce09d8b1f64c586 *百人一首_本文・作者_一次データ.md
8d9e58aeffde10998ee037d57af4b281faca3a0a0ee15915168a91cda9a6ec8a *百人一首_読み_歴史的仮名遣い.md
a728c9ba261319c2042e22d91800313f4af7c1c450614641007a1a7d09b73ec5 *百人一首_読み_現代仮名遣い.md
78953678a9bc5a1fece11da15c2bf166e1d7b542a3646f1f6e8ab4fe1a7a4b54 *百人一首_読み_異同確認.md
30a7f7c9a5deb48263a8b3f46dcc2ee52364c16e4c55a287faf0e3e48ea7a69f *古典文法_一次データ索引.md
```

**着手前の追加確認（発注038 の検収時に親担当が確認済み。着手時にもう一度見ること）**:
`grep -cE "range\.to - range\.from \+ 1" packages/hyakunin/src/main.tsx` が **1** を返すこと。


**1 件でも食い違ったら着手せず S-8 で報告すること。**

---

## 1. 変更境界

### 変更・作成してよいファイル

| ファイル | 扱い |
|---|---|
| `packages/hyakunin/src/main.tsx` | **変更**（3 経路の配線。裁定 1・4・6） |
| `packages/hyakunin/src/ui/screens/Home.tsx` | **変更**（復元の誘いと「あと○首」。**D-39 の 3 本の `new URL()` を触らない**） |
| `packages/hyakunin/src/ui/screens/Result.tsx` | **変更は文言 1 箇所だけ**（裁定 7）。他は 1 行も変えない |
| `packages/hyakunin/src/styles.css` | **追記のみ**（既存の class を書き換えない） |
| `tests/screen/restore.test.tsx` | **書き換えを許可する**（§0.3-2。偽合格のため） |
| `tests/screen/main-wiring.test.tsx` | **追記のみ**（既存の assert を書き換えない） |
| `tests/screen/result.test.tsx` | **追記のみ**（同上） |

### 絶対に変更しないファイル・領域

| 対象 | 理由 |
|---|---|
| `packages/hyakunin/src/domain/**` / `packages/shared/src/**` | 026・030・034・036・038 で検収済み。**判断を画面へ写さない。読むだけ** |
| `packages/hyakunin/src/ui/screens/{Session,RangePicker}.tsx` | 032・035・037 で検収済み。**本発注の範囲外** |
| `packages/hyakunin/src/ui/components/**` | 検収済み。**新しい部品が要るなら変更してよい画面の中に閉じて書く** |
| `tests/unit/**` | 純関数の試験。本発注は 1 本も触らない |
| `tests/screen/{no-pressure,harness,home,entries,range-picker,viewer,settings-migration,session}.test.tsx` | 検収済み。**`no-pressure` は D-39 の回帰試験を持つ** |
| `packages/hyakunin/src/data/generated/**` / `review/**` / `docs/**` | 生成物・台帳・文書 |
| `package.json`（すべて）/ `vitest.config.ts` / `tsconfig.base.json` | 依存も設定も増やさない |
| 一次資料一式 | 憲章 §3 |

---

## 2. 先に読むもの

| 順 | 文書・コード | 何のために |
|---|---|---|
| 1 | `docs/APP_SPEC.md` **§4**（57 行目）・**§5.1**（74・76 行目） | **正本。** まとまり、未確認優先、復元、番号順 |
| 2 | `packages/hyakunin/src/domain/resume.ts` | `planResume()` の署名と戻り値。**読むだけ** |
| 3 | `packages/hyakunin/src/main.tsx` | 配線の現状。`onStart` が範囲の全首を作っている箇所 |
| 4 | `packages/hyakunin/src/ui/screens/Home.tsx` | 復元の誘いの現状（§0.3-1）と D-39 の 3 本の `new URL()` |
| 5 | `tests/screen/restore.test.tsx` | **書き換える対象。** なぜ偽合格なのかを自分の目で確かめる |
| 6 | `packages/hyakunin/src/domain/session.ts` の `resolveActiveRange` | 復元する範囲の決め方。**呼び出し元がまだ 0 件である** |
| 7 | `docs/HANDOFF.md` の **D-39**・**D-45** | 触ってはならない点と、保存を effect で書かない理由 |
| 8 | `tests/screen/no-pressure.test.tsx` | 禁止語の一覧。本発注の画面もこの検査を通る |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: **復元は「同じ回の続き」である。新しい回を作らない。**

`APP_SPEC` §3 は「回（`sessionId`）: 一回の学習開始から結果表示まで。**中断しても保存済みイベントは失わない**」と定める。

- 復元では **`createSession()` を呼ばない**。`loadLastSession()` が返した `Session` をそのまま state へ入れる
- **`sessionId` を引き継ぐ**。新しい UUID を作らない
- **`seed` を引き継ぐ**（`APP_SPEC` §5.1「ランダムは回の開始時に固定した並びを使い、同じ回で並び直さない」）
- **`entry` と `order` も引き継ぐ**。復元時に入口を選び直させない
- 範囲は **`resolveActiveRange(session, urlRange)`** で決める。**自分で書かない**（呼び出し元がまだ 0 件である）

**`main.tsx` の `createSession(` の出現数は 1 のままでなければならない**（§0.3-4、A-11）。

### 裁定 2: **復元の誘いを出す条件は 3 つの積である。**

```
session !== null && !session.completed && plan.remainingInRange > 0
```

- **`!session.completed`**: 発注037 裁定 2 で `completeSession()` が呼ばれるようになった。終わった回は誘わない
- **`remainingInRange > 0`**: 範囲に未確認が 1 首も無ければ、復元しても出すものが無い。**誘わない**

**この 3 つ目が「放棄した回に永久に誘われ続ける」を、保存を書き換えずに塞ぐ。**

### 裁定 3: **「復元しない」は保存を書き換えない。**

`completed: true` を書いてはならない。**終わっていない学習を終わった扱いにするのは記録の嘘である**（憲章 §1 の優先順 3）。

**同一起動中だけ誘いを畳む**（現在の `setRestoring(false)` のままでよい）。
次に開いたときにまた誘われるのは正しい挙動である——**未確認の残りがある限り、取りこぼさないため。**

### 裁定 4: **新規開始も `planResume()` を通す。まとまり分割は復元だけの話ではない。**

現在の `main.tsx` の `onStart` は
`Array.from({ length: range.to - range.from + 1 }, ...)` で**範囲の全首**を作って渡している。
**これでは 21 首以上を選んでもまとまりに割れない**（`APP_SPEC` §4・§12 受入条件 3）。

- 新規開始でも `planResume(range, events)` を呼び、`plan.cardNumbers` を `planQuestions` へ渡す
- **初回は全首が未確認なので、最初のまとまりの全首が番号順で渡る**（`APP_SPEC` §5.1「最初の一巡は番号順」を自動的に満たす）
- **新規開始と復元で別の計算を書かない。** 同じ 1 本の経路にすること

### 裁定 5: **読み込みは effect でよい。保存とセッション生成は遷移ハンドラでのみ行う（D-45）。**

D-45 が禁じたのは**描画中のセッション生成と保存**である。読み込みではない。

- `Home.tsx` の既存の `useLayoutEffect` に `listEvents()` を足してよい。既存の `loadLastSession()` と同じ流儀である
- **`saveSession()` と `createSession()` と `crypto.randomUUID()` を effect や描画中に書いてはならない**。遷移ハンドラだけ
- `listEvents()` は**遷移ハンドラで 1 回だけ読み、state へ入れる**（発注037 裁定 3 と同じ）

### 裁定 6: **再確認は `planQuestions` の `review` 入口へ直接渡す。`RangePicker` を経由しない。**

`Result.tsx` の `onRetryWeak(cardNumbers)` は**既にカード番号の配列を親へ渡す形になっている**（発注037 §4.1）。
**`Result.tsx` 側の実装は変えない。** 受け取る `main.tsx` を変える。

- `planQuestions('review', questions, cardNumbers, 新しい seed, order)` を呼ぶ
- **`entry` は `'review'` に固定する**（`ENTRY_RULES.review.questionCount` は 0 ＝上限なし。渡した首の全問が出る）
- **新しい `sessionId` と新しい `seed` を作る。** これは新しい回である（裁定 1 の復元とは違う）
- **`range` は元の回のものを引き継ぐ。** `min..max` へ書き換えない
  （学習者が選んだ範囲は変わっていない。`questionCount` が実際の出題数を記録する）
- **「同じ範囲をもう一度」（`onRetrySame`）は `planResume` を通す。** 未確認の残りから続く

### 裁定 7（D-53）: **発注037 の裁定 14 を上書きする。文言を「まちがえた歌だけをもう一度」へ戻す。**

**037 裁定 14 は失効する。** 当時は `RangePicker` の連続範囲しか渡せず、
「まちがえた歌だけ」と書けば嘘になるため「要確認の首を**ふくむ範囲**をもう一度」としていた。
**裁定 6 により飛び飛びの首を渡せるようになったので、前提が変わった。**

- 文言を **「まちがえた歌だけをもう一度」** にする
- **変更するのは `Result.tsx` のこの文言 1 箇所だけである。** 他は 1 行も変えない
- `retryCardNumbers` が空のときボタンを出さない、は**037 裁定 14 のまま維持する**

### 裁定 8: **「あと○首」は復元の誘いの中にだけ出す。`Session.tsx` を触らない。**

`APP_SPEC` §4 の「『あと○首』とまとまりの進捗を示す」を、本発注では **`Home.tsx` の復元の誘い**で満たす。

- `plan.remainingInRange` と `plan.chunkIndex + 1` / `plan.chunkCount` を使う
- **数え直さない。** `planResume()` が返した値をそのまま書く
- **`Session.tsx` の学習中の進捗表示（`progressLabel`）は本発注の範囲外である。** 触らない

### 裁定 9: **判断を画面に書かない（発注037 裁定 6 の継承）。**

次を画面で計算したら不合格とする。**すべて `planResume()` の戻り値をそのまま使う。**

- どのまとまりを選ぶか
- まとまりの中のどの首を出すか
- 「あと○首」の数
- 確認済みかどうかの判定

### 裁定 10: **`vi.mock` を使わない（D-35）。画面試験には `createMemoryPort()` を渡す。**

保存層を差し替えない。**`jsdom` に `window.indexedDB` は無い**ので、本物は動かない。

---

## 4. 実装範囲

### 4.1 `packages/hyakunin/src/main.tsx`（変更）

**3 経路を 1 本の開始関数へ集約すること。**

```ts
// 名前は自由。要点は「首の決定を1箇所に閉じる」ことである。
function startPlanned(input: {
  session: Session;          // 復元なら既存、新規・再確認なら作ったもの
  cardNumbers: readonly number[];
  questions: PublishedQuestion[];
}): void
```

| 経路 | `session` | `cardNumbers` |
|---|---|---|
| 新規開始 | `createSession(...)`（**唯一の呼び出し**） | `planResume(range, events).cardNumbers` |
| 復元 | `loadLastSession()` の戻り値**そのまま** | `planResume(resolveActiveRange(session, urlRange), events).cardNumbers` |
| 再確認（`onRetryWeak`） | 新しい `sessionId` / `seed`、`entry: 'review'`、**range は元のまま** | `Result` から渡された `cardNumbers` **そのまま** |

**`onRetrySame` は「新規開始」と同じ扱いでよい**（新しい `seed`、`planResume` 経由）。

### 4.2 `packages/hyakunin/src/ui/screens/Home.tsx`（変更）

- `useLayoutEffect` に `listEvents()` を足し、`planResume()` の結果を state へ入れる（裁定 5）
- 復元の誘いを裁定 2 の 3 条件で出す
- 「復元する」に**本物のハンドラ**を繋ぐ（`onResume` を props で受け、親が配線する）
- 誘いの中に「あと○首」とまとまりの進捗を出す（裁定 8）
- **D-39 の 3 本の `new URL()` を触らない**（§0.3-5）

### 4.3 `packages/hyakunin/src/ui/screens/Result.tsx`（変更・文言 1 箇所）

裁定 7 の文言だけ。**それ以外は 1 行も変えない。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定コマンド |
|---|---|---|
| A-1 | 型・書式・生成物の検査が通る | `npm run typecheck` / `npm run lint` / `npm run data:check` がすべて終了コード 0 |
| A-2 | `restore.test.tsx` の試験が **6 件以上**ある | `npx vitest run tests/screen/restore.test.tsx` |
| A-3 | 画面試験が**増えており fail 0** | `npm run test:screen`。§0.4 の件数より**10 件以上多い**こと |
| A-4 | Node 試験が **1 件も増減していない** | `npm run test:node` が §0.4 の件数ちょうど・fail 0 |
| A-5 | 2 製品の build が通る | `npm run build` が終了コード 0 |
| A-6 | 公開物が増えていない | `npm run scan:publish` が §0.4 の件数・違反 0 件 |
| A-7 | **禁止語を入れていない** | `npm run test:screen` の `no-pressure` が全件緑 |
| A-8 | **判断ロジックを画面へ写していない**（裁定 9） | §5.0 の **A-8a と A-8b がどちらも 0 件**。**`untouched` を `Result.tsx` へ適用しないこと**（§5.0 の注記） |
| A-9 | **`domain/` と `shared/` を触っていない** | `git diff --exit-code packages/hyakunin/src/domain packages/shared/src` が終了コード 0 |
| A-10 | **`Session.tsx` と `RangePicker.tsx` を触っていない** | `git diff --exit-code packages/hyakunin/src/ui/screens/Session.tsx packages/hyakunin/src/ui/screens/RangePicker.tsx` が終了コード 0 |
| A-11 | **新しい回を作っているのは 1 箇所だけ**（裁定 1） | `grep -c "createSession(" packages/hyakunin/src/main.tsx` が **1** |
| A-12 | **`planResume` を呼んでいる** | `grep -n "planResume" packages/hyakunin/src/main.tsx` が **1 件以上** |
| A-13 | **範囲の全首を作る古い書き方が残っていない**（裁定 4） | §5.0 の A-13 が **0 件** |
| A-14 | 一次資料のハッシュが不変 | `sha256sum 百人一首_*.md 古典文法_一次データ索引.md` が §0.4 と一致 |
| A-15 | **`Result.tsx` の変更が文言 1 箇所だけ**（裁定 7） | `git diff --numstat packages/hyakunin/src/ui/screens/Result.tsx` の出力が **`1	1	packages/hyakunin/src/ui/screens/Result.tsx` の 1 行だけ**（追加 1・削除 1）。**`--stat` を使わないこと**——文言が `1 file changed`（単数）で、目視の取り違えが起きる |
| A-16 | **D-39 を壊していない** | §5.0 の A-16 が **0 件**、かつ `no-pressure` の該当試験が緑 |
| A-17 | **`main.tsx` に effect を持ち込んでいない**（裁定 5・D-45） | §5.0 の A-17a が **0 件**。現在 `main.tsx` に `useEffect` は 1 つも無い。**増やさないこと** |
| A-17b | **`Home.tsx` が回を保存・生成していない**（裁定 5） | §5.0 の A-17b が **0 件**。`Home.tsx` は読むだけである（`saveSettings` は既存で、対象外） |
| A-18 | **`vi.mock` を使っていない**（D-35） | `grep -rn "vi\.mock" tests/screen/` が **0 件** |
| A-19 | `package.json` を 1 つも変えていない | `git diff --exit-code -- package.json "packages/*/package.json"` が終了コード 0 |
| A-20 | `review/` と生成物に差分が無い | `git status --porcelain review packages/hyakunin/src/data/generated` が**空** |
| **A-21** | **保存失敗の一行を守る試験がある**（発注037 の検収で見つかった穴。下の §5.1.1） | `main.tsx` から `result-save-failure` の一行を削除すると **`test:screen` が赤になる**ことを実測して示す（C-11） |
| **A-22** | **読み込み中の表示を守る試験がある**（同上） | `main.tsx` から `result-loading` の行を削除すると **`test:screen` が赤になる**ことを実測して示す（C-12） |

### 5.0 grep で判定する条件（**表の外に置く。表の中では `|` が壊れる**）

```bash
# A-8a まとまりの選択規則を画面へ写していない（2 ファイル共通）
grep -nE "MAX_CHUNK_SIZE|mostUnconfirmed|splitIntoChunks|nextChunkIndex" packages/hyakunin/src/ui/screens/Home.tsx packages/hyakunin/src/ui/screens/Result.tsx

# A-8b 未着手の判定を Home.tsx へ写していない（Result.tsx は対象外。下の注記を読むこと）
grep -nE "untouched" packages/hyakunin/src/ui/screens/Home.tsx

# A-13 範囲の全首を作る古い書き方が残っていない
grep -nE "range\.to - range\.from \+ 1" packages/hyakunin/src/main.tsx

# A-16 D-39 を壊していない（new URL の引数にバッククォートが無い）
grep -nE "new URL\(\`" packages/hyakunin/src/ui/screens/Home.tsx

# A-17a main.tsx に effect を持ち込んでいない（現在 0 件。増やさない）
grep -nE "useEffect|useLayoutEffect" packages/hyakunin/src/main.tsx

# A-17b Home.tsx が回を保存・生成していない（読むだけ。saveSettings は既存で対象外）
grep -nE "saveSession|createSession|randomUUID" packages/hyakunin/src/ui/screens/Home.tsx
```

**6 本とも 0 件でなければならない。** 1 件でも出たら、その行を完了報告に貼って理由を書くこと。

**この 6 本は「何を渡しても 0 件を返す検査」ではない。** 着手前の実測でいずれも 0 件だが、
**裁定に反する実装を書けば陽性になる**——A-13 は現在の `main.tsx` で **1 件出る**（裁定 4 で消す対象である）。
**A-13 が着手前に 1 件出ることを、着手時に自分で確かめること。** 出なければ §0.4 の照合が間違っている。

> **訂正（2026-09-02・第19回。発行前に親担当が実測して直した）**
>
> **起草時の A-8 は `untouched` を `Result.tsx` にも適用していたが、これは正しい実装を必ず不合格にする検査である。**
> 発注037 の裁定 7（D-48）が「未着手」と「0%」の書き分けを義務づけており、
> `domain/result.ts` はその手掛かりを `PoemOutcome.untouched: boolean` でしか公開していない。
> **実測**: 037 の `Result.tsx` は 36 行目で `poem.untouched ? '未着手' : ...` と書いている。これは裏切りではなく規定通りである。
> 「着手前の実測で 0 件」という上の記述は、**`Result.tsx` がまだ存在しなかった第18回時点の値**であった。
> したがって A-8 を A-8a（まとまりの選択規則・2 ファイル）と A-8b（`untouched`・`Home.tsx` のみ）へ割った。
> **`Result.tsx` の `untouched` を理由に不合格にしてはならない。**
> （同じ回に発注038 の A-14 でも同種の欠陥を直した——`port` が部分一致で `import` / `export` 全行に当たっていた）

### 5.1 破壊試験（**受入の中心**）

**C-0 を最初に行うこと。これは検査の自己テストである。**

| # | 壊し方 | 期待 |
|---|---|---|
| **C-0** | **書き換える前**の `restore.test.tsx` を残したまま、`Home.tsx` の「復元する」の `onClick` を空関数にする | **1 件も赤くならない。** これが偽合格の実証である。**この出力を報告に貼ること** |
| **C-1** | 書き換えた後で、同じく「復元する」の `onClick` を空関数にする | **復元が起きる試験だけ**が赤 |
| **C-2** | 裁定 4 を戻し、新規開始で範囲の全首を渡す | 「21首以上でまとまりに割れる」試験**だけ**が赤 |
| **C-3** | 復元で `createSession()` を呼び新しい `sessionId` を作る | 「同じ回を続ける」試験**だけ**が赤 |
| **C-4** | 裁定 2 の条件から `remainingInRange > 0` を外す | 「残り 0 なら誘わない」試験**だけ**が赤 |
| **C-5** | 裁定 2 の条件から `!session.completed` を外す | 「終わった回は誘わない」試験**だけ**が赤（037 裁定 2 の回帰） |
| **C-6** | 復元で `seed` を作り直す | 「seed を引き継ぐ」試験**だけ**が赤 |
| **C-7** | `onRetryWeak` で `cardNumbers` を無視し範囲全体を渡す | 「まちがえた歌だけが出る」試験**だけ**が赤 |
| **C-8** | 裁定 3 を破り「復元しない」で `completed: true` を保存する | 「保存を書き換えない」試験**だけ**が赤 |
| **C-9** | 「あと○首」をまとまり内の数に変える | 「範囲全体の残り」試験**だけ**が赤 |
| **C-10** | **否定アサーションの偽合格封じ。** 検査対象を空配列（`questions={[]}`）に差し替える | **緑のままの試験があってはならない。** あればその試験は何も検査していない |
| **C-11** | `main.tsx` から保存失敗の一行（`result-save-failure`）を削除する | **保存失敗を見る試験だけ**が赤。**現状は全緑のままである** |
| **C-12** | `main.tsx` から読み込み中の表示（`result-loading`）を削除する | **読み込み中を見る試験だけ**が赤。**現状は全緑のままである** |

**C-0 と C-10 と C-2 が本発注の中心である。**
C-0 は「守っているつもりの試験が守っていない」ことの実証、
C-10 は「0 件だから緑」の偽合格封じ、C-2 は**依頼者の目的そのもの**（未習の取りこぼし防止）の回帰試験である。

### 5.1.1 C-11・C-12 の出所（**発注037 の検収で親担当が実測した穴**。推測ではない）

**実装はすでに正しい。足りないのは試験だけである。**
発注037 は `main.tsx` に次の 2 つを作らせ、Terra は規定どおり実装した（発注037 §4.2・裁定 3、`APP_SPEC` §8.4）。

- `<p class="result-save-failure" role="alert">保存に失敗しました。結果は表示しています。</p>`
- `<main class="loading" aria-live="polite">結果を読み込んでいます。</main>`

**その上で、親担当が 2026-09-02（第19回）にこの 2 行をそれぞれ丸ごと削除して `npm run test:screen` を回したところ、
**61 件すべて緑のままだった**。発注037 の受入条件も破壊試験 10 本もこれを要求していなかった——**発注書の穴であって、受注側の不履行ではない。**

**本発注で埋める。** 試験は `tests/screen/main-wiring.test.tsx` へ**追記**する（既存の assert を書き換えない）。

- **保存失敗**: `saveSession` が失敗を返す port を渡し、**結果が表示されることと、失敗の一行が出ることの両方**を assert する。
  **片方だけにしない**——「失敗を出す」だけでは、結果を見せずにエラー画面へ逃げる実装が緑になる。
- **読み込み中**: `listEvents` が解決する前の瞬間に `結果を読み込んでいます。` が出ていることを assert する。
  **文言を名指しする**。画面の存在だけを見ない。

**`vi.mock` を使わない（D-35）。** `createMemoryPort()` を包んで `saveSession` だけ差し替える
（発注037 の `main-wiring.test.tsx` に `{ ...base, saveLocalReport: async () => true }` の先例がある）。

### 5.2 試験の書き方（**この 6 点を守ること**）

1. **`vi.mock` を使わない**（D-35）。`createMemoryPort()` を props で渡す
2. **fixture の範囲は 21 首以上にする。** 20 首以下ではまとまりが 1 つしかできず C-2 が効かない
3. **確認済みをまとまりごとに偏らせる。** 均一だと C-2・C-9 が効かない
4. **「空でないこと」を先に assert する。** 出題された首の配列が空なら検査になっていない
5. **否定の assert だけで終えない。** 「間の首が出ない」を書いたら「どの首が出るか」も書く
6. **試験名は実際に assert しているものに合わせる**（D-49）。画面挙動を名乗って port を見る、の逆も禁止

### 5.3 実行環境の注意（Windows）

- `sha256sum` は Git Bash のものを使う
- **`.tsx` の差分判定には `git diff --numstat` を使う。** 行数の目視で判断しない（発注034 の誤検出の原因）。**`--stat` は使わないこと**——A-15 の理由（`1 file changed` の単数表記で取り違えが起きる）と同じである

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| **S-1** | `domain/` を変えないと配線できないと判断した。**特に `planResume()` の署名が足りない場合**（038 へ差し戻す） |
| **S-2** | 保存形式（`Session` / `Event`）の変更が要ると判断した |
| **S-3** | 裁定 1〜10 のいずれかが矛盾していると判断した。**自分で決め直さないこと** |
| **S-4** | `Session.tsx` か `RangePicker.tsx` を触る必要が出たと判断した |
| **S-5** | `Result.tsx` の変更が文言 1 箇所に収まらないと判断した（A-15 が満たせない） |
| **S-6** | 破壊試験 C-1〜C-9 のどれかで「だけ」が達成できず、試験の書き直しでも解けない |
| **S-7** | **C-10 で緑のままの試験が残り、直せない** |
| **S-8** | 着手時に §0.4 の基準線が 1 件でも食い違った、または `git status --porcelain` が空でなかった |

**停止したら、そこまでの変更を捨てずに残し、`git status --porcelain` の出力を添えて報告すること。**

---

## 7. 完了報告に含めること（**8 項目。1 つでも欠けたら差し戻す**）

1. 着手時の `git log --oneline -1` と `git status --porcelain`
2. **§0.4 の基準線を照合した結果**（全件一致したか。食い違いがあれば全部）
3. A-1〜A-22（A-17b を含む）の**判定コマンドの実際の出力**（要約でなく、終了コードと件数が読める形で）
4. §5.0 の grep **6 本**の出力（A-13 以外は 0 件。A-13 は着手前 1 件・完了時 0 件の**両方**を貼ること）
5. **破壊試験 C-0〜C-12 の実施記録。** 各件について「壊した箇所」「赤くなった試験名」「赤の件数」。
   **C-0 は「1 件も赤くならなかった」という出力そのものを貼ること**
6. 追加した画面試験の**本数**と、`test:screen` の増分が一致することの確認
7. 完了時の `sha256sum`——**1 バイトも変えてはならない 6 ファイル**が §0.4 と一致すること、一次資料 5 件も同様
8. **S-1〜S-8 に当たったものがあれば、その内容**（無ければ「無し」と書く）

---

## 8. 訂正 2（2026-09-02・第20回。**走行中に親担当が発行**）

**着手済みでも、下の 5 点は本文へ反映済みである。本文が正である。**

### 8.1 用語（**依頼者裁定。文言に直接効く**）

| 語 | 意味 | 例 |
|---|---|---|
| **○番** | その歌の固有の番号 | 「17番」「最初の番」 |
| **○首** | 歌の**数量**を数える単位 | 「あと12首」「100首収録」「21首以上」 |
| **歌** | 和歌そのものを指す語 | 「まちがえた歌だけをもう一度」「この歌の読み」 |

**裁定 7 の文言を「まちがえた歌だけをもう一度」へ改める**（首 → 歌）。本文の 5 箇所は置換済み。
**A-15 は変わらない**——`Result.tsx` の変更は依然として**追加 1・削除 1 の 1 行だけ**である。

**`Result.tsx` の他の 2 箇所（`<th>首</th>`・`<h2>首ごとの状態</h2>`）は本発注では直さない。**
A-15（1 行だけ）を壊すためである。**発注040 で直す**（D-55 に記録）。**勝手に直さないこと。**

### 8.2 §7 の数え違い 3 件（**報告の抜けを生む**）

- 項目 3: `A-1〜A-20` → **`A-1〜A-22`**。A-21・A-22 は本発注の中心（C-11・C-12）であり、旧記述では報告から落ちていた
- 項目 4: `grep 4 本` → **`6 本`**。§5.0 は 6 本ある
- 項目 5: `C-0〜C-10` → **`C-0〜C-12`**

### 8.3 A-21 の参照先

`下の §5.4` は誤り。**`§5.1.1`** が正しい（§5.4 は存在しない）。

### 8.4 §5.3 と A-15 の矛盾

§5.3 が `git diff --stat` を使えと書き、A-15 が `--stat` を使うなと書いていた。**`--numstat` が正**。§5.3 を訂正済み。
