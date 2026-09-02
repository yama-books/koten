# Codex向け発注文書 039: P8-D 再開の配線（`.tsx`）

発注先: **Terra**
親担当: Claude Opus（第18回セッション）
起草日: 2026-09-02
発行日: **未発行。§0.4 が空のまま発行してはならない。**
基準となるコミット: **発注038 の検収コミット**（§0.4 に記す）。
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
| **再確認**（結果画面の「もう一度」） | 037 裁定 14 により `RangePicker` へ戻し、`min..max` の連続範囲を渡す | まちがえた首だけを渡す（裁定 7 で上書き） |

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

> ## ⚠ **この節が空のまま発行してはならない**
>
> **発注038 の検収が終わった時点で、親担当が `git status --porcelain` を空にしてから自分で実測し、**
> **次を埋めること。報告からの転記は禁止する。**
>
> - 基準となるコミット: `________`
> - `npm run typecheck` / `npm run lint` / `npm run data:check` / `npm run build`: すべて終了コード 0
> - `npm run test:node`: **tests `____` / fail 0**
> - `npm run test:screen`: **Tests `____` passed**
> - `npm run scan:publish`: **走査 `____` 件、違反 0 件**
>
> **変更する 7 ファイルの SHA-256**（着手前の値。完了時の差分を切り分けるため）
>
> ```
> ____ *packages/hyakunin/src/main.tsx
> ____ *packages/hyakunin/src/ui/screens/Home.tsx
> ____ *packages/hyakunin/src/ui/screens/Result.tsx
> ____ *packages/hyakunin/src/styles.css
> ____ *tests/screen/restore.test.tsx
> ____ *tests/screen/main-wiring.test.tsx
> ____ *tests/screen/result.test.tsx
> ```
>
> **1 バイトも変えてはならない 6 ファイルの SHA-256**
>
> ```
> ____ *packages/hyakunin/src/domain/resume.ts
> ____ *packages/hyakunin/src/domain/range.ts
> ____ *packages/hyakunin/src/domain/entry.ts
> ____ *packages/hyakunin/src/domain/session.ts
> ____ *packages/hyakunin/src/ui/screens/Session.tsx
> ____ *packages/hyakunin/src/ui/screens/RangePicker.tsx
> ```
>
> - 一次資料（A-14 の照合先）の SHA-256 5 件も同様に貼ること。

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

### 裁定 7（D-53）: **発注037 の裁定 14 を上書きする。文言を「まちがえた首だけをもう一度」へ戻す。**

**037 裁定 14 は失効する。** 当時は `RangePicker` の連続範囲しか渡せず、
「まちがえた首だけ」と書けば嘘になるため「要確認の首を**ふくむ範囲**をもう一度」としていた。
**裁定 6 により飛び飛びの首を渡せるようになったので、前提が変わった。**

- 文言を **「まちがえた首だけをもう一度」** にする
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
| A-8 | **判断ロジックを画面へ写していない**（裁定 9） | §5.0 の A-8 が **0 件** |
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

### 5.0 grep で判定する条件（**表の外に置く。表の中では `|` が壊れる**）

```bash
# A-8 判断ロジックを画面へ写していない
grep -nE "MAX_CHUNK_SIZE|mostUnconfirmed|untouched|splitIntoChunks|nextChunkIndex" packages/hyakunin/src/ui/screens/Home.tsx packages/hyakunin/src/ui/screens/Result.tsx

# A-13 範囲の全首を作る古い書き方が残っていない
grep -nE "range\.to - range\.from \+ 1" packages/hyakunin/src/main.tsx

# A-16 D-39 を壊していない（new URL の引数にバッククォートが無い）
grep -nE "new URL\(\`" packages/hyakunin/src/ui/screens/Home.tsx

# A-17a main.tsx に effect を持ち込んでいない（現在 0 件。増やさない）
grep -nE "useEffect|useLayoutEffect" packages/hyakunin/src/main.tsx

# A-17b Home.tsx が回を保存・生成していない（読むだけ。saveSettings は既存で対象外）
grep -nE "saveSession|createSession|randomUUID" packages/hyakunin/src/ui/screens/Home.tsx
```

**5 本とも 0 件でなければならない。** 1 件でも出たら、その行を完了報告に貼って理由を書くこと。

**この 5 本は「何を渡しても 0 件を返す検査」ではない。** 着手前の実測でいずれも 0 件だが、
**裁定に反する実装を書けば陽性になる**——A-13 は現在の `main.tsx` で **1 件出る**（裁定 4 で消す対象である）。
**A-13 が着手前に 1 件出ることを、着手時に自分で確かめること。** 出なければ §0.4 の照合が間違っている。

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
| **C-7** | `onRetryWeak` で `cardNumbers` を無視し範囲全体を渡す | 「まちがえた首だけが出る」試験**だけ**が赤 |
| **C-8** | 裁定 3 を破り「復元しない」で `completed: true` を保存する | 「保存を書き換えない」試験**だけ**が赤 |
| **C-9** | 「あと○首」をまとまり内の数に変える | 「範囲全体の残り」試験**だけ**が赤 |
| **C-10** | **否定アサーションの偽合格封じ。** 検査対象を空配列（`questions={[]}`）に差し替える | **緑のままの試験があってはならない。** あればその試験は何も検査していない |

**C-0 と C-10 と C-2 が本発注の中心である。**
C-0 は「守っているつもりの試験が守っていない」ことの実証、
C-10 は「0 件だから緑」の偽合格封じ、C-2 は**依頼者の目的そのもの**（未習の取りこぼし防止）の回帰試験である。

### 5.2 試験の書き方（**この 6 点を守ること**）

1. **`vi.mock` を使わない**（D-35）。`createMemoryPort()` を props で渡す
2. **fixture の範囲は 21 首以上にする。** 20 首以下ではまとまりが 1 つしかできず C-2 が効かない
3. **確認済みをまとまりごとに偏らせる。** 均一だと C-2・C-9 が効かない
4. **「空でないこと」を先に assert する。** 出題された首の配列が空なら検査になっていない
5. **否定の assert だけで終えない。** 「間の首が出ない」を書いたら「どの首が出るか」も書く
6. **試験名は実際に assert しているものに合わせる**（D-49）。画面挙動を名乗って port を見る、の逆も禁止

### 5.3 実行環境の注意（Windows）

- `sha256sum` は Git Bash のものを使う
- **`.tsx` の差分判定には `git diff --stat` を使う。** 行数の目視で判断しない（発注034 の誤検出の原因）

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
3. A-1〜A-20 の**判定コマンドの実際の出力**（要約でなく、終了コードと件数が読める形で）
4. §5.0 の grep 4 本の出力（0 件であること）
5. **破壊試験 C-0〜C-10 の実施記録。** 各件について「壊した箇所」「赤くなった試験名」「赤の件数」。
   **C-0 は「1 件も赤くならなかった」という出力そのものを貼ること**
6. 追加した画面試験の**本数**と、`test:screen` の増分が一致することの確認
7. 完了時の `sha256sum`——**1 バイトも変えてはならない 6 ファイル**が §0.4 と一致すること、一次資料 5 件も同様
8. **S-1〜S-8 に当たったものがあれば、その内容**（無ければ「無し」と書く）
