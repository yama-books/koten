# Codex向け発注文書 037: P8-B 結果画面（`.tsx`）

発注先: **Terra**
親担当: Claude Opus（第16回セッション）
発注日: 2026-09-02
着手条件: **発注036 の検収完了後**（検収コミット `ed84a0b`）。**並行して走らせてはならない**（理由は §0.2）。

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を作るか

P8（結果・おすすめ）の 2 本目である。**発注034・036 で作った純関数を画面へ配線する。**

- `packages/hyakunin/src/ui/screens/Result.tsx` を新規に作る
- `main.tsx` に `result` 画面を足し、`Session` の完了から遷移させる
- **`completeSession()` を呼ぶ**（現在リポジトリに呼び出しが 1 つも無く、
  「前回の学習を復元しますか」が**一度学習すると永久に出続ける**）

**判断ロジックを画面に書かない。** `summarizeSession()` が返したものを表示するだけである。
**画面に規則を書けば `test:node` の 294 件で守られなくなる。**

### 0.2 発注036 と並行してはならない理由

**発注034 と 035 は対象ファイルが 1 件も重ならなかったので並行できた。本発注は違う。**

本発注の画面試験は `summarizeSession()` を呼び、**発注036 が変える `SessionResult` / `PoemOutcome` の形に依存する。**
036 の作業中に走らせると、赤が「本発注の欠陥」なのか「036 が途中である」ためなのか**区別できない。**

**着手前に `git log --oneline -1` が `ed84a0b`（発注036 の検収）以降であり、`git status --porcelain` が空であることを確かめること。**
空でなければ S-8 で停止する。

### 0.3 実測で確かめた構造上の制約（**設計の前提。読み飛ばさないこと**）

**保存されたイベントからは 5 区分（D-41）を復元できない。**

`packages/shared/src/domain/event.ts` の `EventOutcome` は
`'correct' | 'incorrect' | 'skipped' | 'viewed'` の **4 値しか無い**。
`packages/hyakunin/src/domain/record.ts` の `outcomeFor()` は次のように畳んでいる。

| `Judgement` | 保存される `outcome` |
|---|---|
| `correct` | `correct` |
| **`partial`** | **`correct`**（部分正解が正答へ畳まれる） |
| `incorrect` | `incorrect` |
| **`needs-review`** | **`skipped`** |

したがって **`listEvents()` を読んでも「部分正解」と「正答」を区別できない。**
これが `summarizeSession()` が `outcomes` を**別引数で受け取る**理由である。

**帰結: `Session` が判定を親へ渡さなければならない。イベントから導出してはならない。**
`listEvents()` から 5 区分を組み立てる実装を書いたら**不合格**とする（部分正解が正答として表示される）。

**この制約自体（保存形式が部分正解を持たない）は本発注の範囲外である。** 触らない。S-4 で報告するに留める。

---

## 1. 変更境界

### 変更・作成してよいファイル

| ファイル | 扱い |
|---|---|
| `packages/hyakunin/src/ui/screens/Result.tsx` | **新規作成** |
| `packages/hyakunin/src/main.tsx` | **変更**（`result` 画面の追加と配線） |
| `packages/hyakunin/src/ui/screens/Session.tsx` | **変更**（`onComplete` の署名と、完了画面のボタン文言だけ。§3 の裁定 1・11） |
| `packages/hyakunin/src/styles.css` | **追記のみ**（既存の class を書き換えない） |
| `tests/screen/result.test.tsx` | **新規作成** |
| `tests/screen/session.test.tsx` | **追記のみ**（既存の assert を書き換えない） |
| `tests/screen/main-wiring.test.tsx` | **追記のみ**（同上） |

### 絶対に変更しないファイル・領域

| 対象 | 理由 |
|---|---|
| `packages/hyakunin/src/domain/**` | **発注034・036 で検収済み。判断ロジックはここにある。画面へ写さない** |
| `packages/shared/src/**` | 同上。**読むだけ** |
| `packages/hyakunin/src/ui/screens/{Home,RangePicker}.tsx` | 検収済み（032・033・035）。`Home.tsx` は **D-39 の回帰試験が見ている** |
| `packages/hyakunin/src/ui/components/**` | 検収済み。**新しい部品が要るなら `Result.tsx` の中に閉じて書く** |
| `tests/unit/**` | 純関数の試験。本発注は 1 本も触らない |
| `tests/screen/{no-pressure,harness,home,entries,range-picker,restore,viewer,settings-migration}.test.tsx` | 検収済み |
| `packages/hyakunin/src/data/generated/**` / `review/**` / `docs/**` | 生成物・台帳・文書 |
| `package.json`（すべて）/ `vitest.config.ts` / `tsconfig.base.json` | 依存も設定も増やさない |
| 一次資料一式 | 憲章 §3 |

---

## 2. 先に読むもの

| 順 | 文書・コード | 何のために |
|---|---|---|
| 1 | `docs/APP_SPEC.md` **§7.3** | **正本。** 結果画面に何を出し、何を出さないか |
| 2 | `docs/APP_SPEC.md` **§8.2**（D-47・D-48） | 首の習熟度・未着手・作者 未確認 |
| 3 | `packages/hyakunin/src/domain/result.ts` | `summarizeSession()` の署名と戻り値。**読むだけ** |
| 4 | `packages/hyakunin/src/domain/session.ts` の `completeSession` | 呼ぶ相手 |
| 5 | `packages/hyakunin/src/main.tsx` | 配線の現状（発注035 で `App` が port を props で受ける形になっている） |
| 6 | `packages/hyakunin/src/ui/screens/Session.tsx` | `onComplete` の現在の使われ方 |
| 7 | `tests/screen/no-pressure.test.tsx` | **禁止語の一覧。** 本発注の画面もこの検査を通る |
| 8 | `docs/DESIGN_SYSTEM.md` | 見た目の規約 |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: **`Session` は判定を親へ渡す。イベントから導出しない。**

§0.3 のとおり、保存形式は部分正解を正答へ畳む。**したがって導出は不可能である。**

```ts
// Session.tsx の Props
onComplete: (outcomes: readonly Readonly<{ poemId: string; kind: Exclude<OutcomeKind, 'viewed'> }>[]) => void;
```

`Session` は各問の `judgement` を**問の順に**積み、完了時に渡す。
`Judgement` の 4 値（`correct` / `partial` / `incorrect` / `needs-review`）は
`Exclude<OutcomeKind, 'viewed'>` と**同じ 4 値である**。変換表を書かないこと。

**閲覧は渡さない**（`summarizeSession` がイベントから数える。発注036 の裁定 3）。

**`Session` の既存の表示・保存・順序を変えないこと。** 足すのは判定の蓄積と `onComplete` の引数だけである。

### 裁定 2: **`completeSession()` を必ず呼ぶ。呼ぶ場所は遷移ハンドラである。**

**実在する欠陥である。** `grep -rn "completed" packages/` の代入は `session.ts` の `completed: false` だけであり、
`indexeddb-port.ts` の `loadLastSession` は `!session.completed` で絞る。
**一度学習すると「前回の学習を復元しますか」が永久に出続ける。**

- `Session` の完了 → `completeSession(session)` → `port.saveSession(...)` の順で行う
- **`useEffect` では書かない**（D-45 と同じ理由。描画と保存の順序が保証されない）
- **描画中に呼ばない**（D-45。再描画で二重に走る）

### 裁定 3: **`listEvents()` は遷移ハンドラで 1 回だけ読み、状態へ入れる。**

`summarizeSession` には `allEvents` が要る。`listEvents()` は `Promise` である。

- 遷移ハンドラの中で `await` し、結果を `useState` へ入れてから `result` 画面へ移る
- **描画中に `await` しない。`useEffect` で読まない**（D-45）
- **読み込み中の状態を用意すること**（`APP_SPEC` §8.4 の「保存失敗」と同じ扱いで、白画面にしない）

### 裁定 4: **`today` は画面が作る。`domain/` に時刻を持ち込まない（D-25）。**

`Session.tsx` の `today()` と同じ形（`new Date().toISOString().slice(0, 10)`）で `main.tsx` が作り、
`summarizeSession` へ引数で渡す。**`result.ts` に時刻が現れたら不合格である。**

### 裁定 5: **`poemIds` は範囲から作る。`p` ＋ 3 桁ゼロ埋めである。**

実測: `poems.json` は 100 件、`p001` 〜 `p100`、`cardNo` は 1 〜 100。

```ts
Array.from({ length: range.to - range.from + 1 }, (_, index) => `p${String(range.from + index).padStart(3, '0')}`)
```

**`poems.json` を読み直さないこと。** `Home.tsx` の読み込みは D-39 の対象であり、触ると回帰試験が赤くなる。

### 裁定 6: **画面は `summarizeSession()` の戻り値を表示するだけである。判断を書かない。**

**次のものを画面で計算したら不合格とする。**

- 花丸を出すかどうか（`allCorrect` をそのまま使う）
- 再確認の対象（`retryCardNumbers` をそのまま使う）
- 首の百分率・色（`percent` と `color` をそのまま使う）
- おすすめ（`recommendation` をそのまま使う。`undefined` なら**何も出さない**）
- 内訳の合計（`questionCount` をそのまま使う）

### 裁定 7（D-48）: **「未着手」と「0%」を書き分ける。「作者 未確認」を併記する。割合の内訳は出さない。**

| `PoemOutcome` の状態 | 表示 |
|---|---|
| `untouched === true` | **「未着手」**。**「0%」と書かない** |
| `untouched === false` かつ `percent === 0` | **「0%」**（灰） |
| `authorUnconfirmed === true` | **「作者 未確認」を併記** |

**本文 n% / 作者 m% の内訳は出さない**（依頼者の指定）。**首の百分率は 1 つだけ示す。**

**色だけに依存しないこと**（`APP_SPEC` §8）。**数値と文言を必ず併記する。**

### 裁定 8: **`APP_SPEC` §7.3 の「出さないもの」を守る。**

- **順位・他者比較・平均・学年別・連続日数を出さない**（`no-pressure.test.tsx` の禁止語）
- **自動で次へ進まない。自動で再開しない。** 再確認は利用者が押したときだけ始まる
- 花丸は**全問正解のときだけ**。それ以外に丸印を足さない（D-29）

### 裁定 9: **再確認の導線は「押したら始まる」だけにする。本発注では再確認の実行までは作らない。**

`APP_SPEC` §7.3 は「要確認・誤答だけを再確認するか、同じ範囲を別順で再確認するかを任意で選べる」と定める。

**本発注では 2 つのボタンを置き、押されたら `RangePicker` へ戻る**（範囲は `retryCardNumbers` から復元する）。
**再確認専用の出題計画は作らない**——`planQuestions` の `review` 入口が既にあり、
**そこへ配線するのは別の発注である。** 迷ったら S-5 で報告すること。

---
### 裁定 10: **`main.tsx` は `createSession()` が返した `Session` を state に保持する。作り直さない。**

**実測（2026-09-02）: 現在の `main.tsx` は `Session` オブジェクトを捨てている。**
`onStart` の中で `void port.saveSession(createSession({ ... }))` と書き、
`Selection` へ入れているのは `sessionId` だけである。

**したがって `completeSession(session)` へ渡すものが存在しない。**

- `createSession()` の戻り値を変数へ受け、**`Selection` に `session` として持たせること。**
- **完了時に作り直してはならない。** `startedOn` と `seed` と `questionCount` を失う
  （作り直した値は「学習を始めた日」ではなく「終えた日」になる）。
- `sessionId` を別に持つ必要は無くなる。**`session.sessionId` を使うこと。**

### 裁定 11: **完了画面のボタン文言を変える。これは「表示を変えない」の例外である。**

現在の `Session.tsx` の完了画面は次である。

```tsx
<h1>今回の範囲を確認しました</h1><button type="button" onClick={onComplete}>ホームへ戻る</button>
```

**このボタンは本発注で結果画面へ進むようになる。「ホームへ戻る」のままにすると嘘になる**
（憲章 §1 の優先順 3「表示上の誠実さ」）。**文言を「結果を見る」に変えること。**

- **見出し「今回の範囲を確認しました」は変えない。** `tests/screen/session.test.tsx` の
  `session: completing the last question shows completion` がこの文字列を assert している。
- **実測: 「ホームへ戻る」を assert している試験は 1 本も無い**（`grep -rn "ホームへ戻る" tests/` が 0 件）。
  したがって文言の変更で既存試験は赤くならない。
- **変えてよいのはこのボタンの文言だけである。** 他の画面の文言・クラス名・構造は 1 文字も触らない。

### 裁定 12: **規則や署名を変えたら、それに依存する試験を grep で数える。名前で数えない。**

**発注036 で親担当が踏んだ穴である。** `recommend.test.ts` の変更禁止を「A-7 の 1 本だけ」と
書いたが、**帯の境界を見る試験が名前に規則を出さないまま期待値を通じて同じ規則に依存しており**、
Terra は着手前に S-5 で停止した（停止は正当だった）。

**本発注で同じ形になりうるのは次である。着手前に自分で確かめること。**

| 変えるもの | 依存しうる試験を探すコマンド |
|---|---|
| `Session` の `onComplete` の署名 | `grep -rn "onComplete" tests/ packages/` |
| 完了画面の文言 | `grep -rn "ホームへ戻る\|今回の範囲を確認しました" tests/` |
| `main.tsx` の画面遷移 | `grep -rn "setScreen\|screen ===" tests/ packages/hyakunin/src` |

**親担当は上の 3 つを実測済みで、いずれも本発注の変更で赤くならない。**
`onComplete={() => {}}` は引数つきの署名へそのまま代入できる。
**それでも着手前に自分で確かめること。** 数えずに始めて途中で気づくと、
どこまでが自分の変更か切り分けられなくなる。

**新たに依存が見つかったら S-5 で停止して報告すること。** 黙って期待値を書き換えないこと。



## 4. 実装範囲

### 4.1 `packages/hyakunin/src/ui/screens/Result.tsx`（新規）

```ts
type Props = {
  result: SessionResult;
  onRetryWeak: (cardNumbers: readonly number[]) => void;
  onRetrySame: () => void;
  onHome: () => void;
};
```

`APP_SPEC` §7.3 のとおり、**次の 6 つに絞る**。他を足さない。

1. 対象範囲（`result.range`）
2. 問題数（`result.questionCount`）
3. **5 区分の内訳**（`result.breakdown`。閲覧・正答・部分正解・要確認・誤答。**畳まない**）
4. 習熟度の変化（`result.changes`。**空なら「変化はありません」と書き、表を出さない**）
5. 次のおすすめ 1 件（`result.recommendation`。**`undefined` なら節ごと出さない**）
6. 首ごとの状態（`result.poems`。裁定 7 の書き分け）

`result.allCorrect` が `true` のときだけ **「全問花丸」** を加える。

### 4.2 `packages/hyakunin/src/main.tsx`（変更）

- 画面の種類に `'result'` を足す
- `Session` の `onComplete(outcomes)` で、**順に**次を行う
  1. `completeSession(session)` を作り `await port.saveSession(...)`
  2. `await port.listEvents()`
  3. `summarizeSession({ sessionId, range, outcomes, allEvents, poemIds, today })`
  4. 結果を state へ入れて `setScreen('result')`
- **読み込み中の表示を出す**（裁定 3）
- **`saveSession` が失敗しても結果は見せる**（学習の成果を失わせない）。ただし**失敗を握りつぶさず**、
  画面に一行出すこと（`APP_SPEC` §8.4）

### 4.3 `packages/hyakunin/src/ui/screens/Session.tsx`（変更・最小）

判定の蓄積と `onComplete` の引数だけ。**表示・保存・順序を変えない。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定コマンド |
|---|---|---|
| A-1 | 型・書式・生成物の検査が通る | `npm run typecheck` / `npm run lint` / `npm run data:check` がすべて終了コード 0 |
| A-2 | `result.test.tsx` の試験が **10 件以上**ある | `npx vitest run tests/screen/result.test.tsx` |
| A-3 | 画面試験が**減っていない**（**45 件以上**・fail 0） | `npm run test:screen` |
| A-4 | Node 試験が**変わっていない**（fail 0） | `npm run test:node` |
| A-5 | 2 製品の build が通る | `npm run build` が終了コード 0 |
| A-6 | 公開物が増えていない | `npm run scan:publish` の件数が着手前と一致し、違反 0 |
| A-7 | **禁止語を入れていない** | `npm run test:screen` の `no-pressure` 3 件が緑 |
| A-8 | **判断ロジックを画面へ写していない** | §5.0 の A-8 が **0 件** |
| A-9 | **色の境界を書き写していない** | §5.0 の A-9 が **0 件** |
| A-10 | **イベントから 5 区分を組み立てていない**（§0.3） | §5.0 の A-10 が **0 件** |
| A-11 | **`completeSession` を呼んでいる** | `grep -n "completeSession" packages/hyakunin/src/main.tsx` が **1 件以上**、かつ対応する試験がある |
| A-12 | **`useEffect` で保存・読み込みをしていない**（D-45） | §5.0 の A-12 が **0 件** |
| A-13 | **`vi.mock` を使っていない**（D-35） | `grep -rn "vi\.mock" tests/screen/result.test.tsx` が **0 件** |
| A-14 | **`Home.tsx` を触っていない**（D-39 の回帰試験の対象） | `git diff --exit-code packages/hyakunin/src/ui/screens/Home.tsx` が終了コード 0 |
| A-15 | **`domain/` と `shared/` を触っていない** | `git diff --exit-code packages/hyakunin/src/domain packages/shared/src` が終了コード 0 |
| A-16 | `package.json` を 1 つも変えていない | `git diff --exit-code -- package.json "packages/*/package.json"` が終了コード 0 |
| A-17 | `review/` と生成物に差分が無い | `git status --porcelain review packages/hyakunin/src/data/generated` が**空** |
| A-18 | 一次資料のハッシュが不変 | `sha256sum 百人一首_*.md 古典文法_一次データ索引.md` が着手前と一致 |
| A-19 | **`Session` を作り直していない**（裁定 10） | `grep -c "createSession(" packages/hyakunin/src/main.tsx` が **1** |
| A-20 | **完了画面のボタンが結果へ進むと言っている**（裁定 11） | `grep -c "ホームへ戻る" packages/hyakunin/src/ui/screens/Session.tsx` が **0**、かつ対応する試験がある |

### 5.0 grep で判定する条件（**表の外に置く。表の中では `|` が壊れる**）

**発注034 の受入条件は、表の中に `grep -nE "0\.8\|0\.2"` の形で書いてあった。**
**markdown の表でパイプを書くためのエスケープが、そのままコマンドへ入っていた。**
**`-E` では `\|` は「リテラルの縦棒」であり、この式は `0.8` を含むファイルにも一致しない。**
**つまり発注034 の A-9・A-10・A-11 は、何を渡しても 0 件を返す「常に合格する検査」だった**
（親担当が既知の陽性で実測して確認した）。**下のコマンドをそのままコピーして使うこと。**

```sh
# A-8 判断ロジックを画面へ写していない
grep -nE "allCorrect *=|retryCardNumbers *=|0\.8|0\.2|'gray'|'red'|'yellow'|'blue'|'green'" packages/hyakunin/src/ui/screens/Result.tsx

# A-9 色の境界を書き写していない
grep -nE "\b(29|30|59|60|84|85)\b" packages/hyakunin/src/ui/screens/Result.tsx

# A-10 イベントから 5 区分を組み立てていない
grep -n "outcome" packages/hyakunin/src/ui/screens/Result.tsx

# A-12 useEffect で保存・読み込みをしていない
grep -n "useEffect" packages/hyakunin/src/main.tsx packages/hyakunin/src/ui/screens/Result.tsx
```

**0 件を報告する前に、検査が生きていることを示すこと（自己テスト）。**
既知の陽性を 1 つ作り、**その式が確かに拾うこと**を実測してから、本番の 0 件を報告する。

```sh
printf "const a = 0.8;\nconst b = 85;\nconst c = 'gray';\n" > probe.txt
grep -nE "0\.8|0\.2|'gray'" probe.txt          # 2 件出ること
grep -nE "\b(29|30|59|60|84|85)\b" probe.txt   # 1 件出ること
rm probe.txt
```

**この 2 行が何も出さなければ、本番の 0 件は「合格」ではなく「検査が壊れている」である。**
**空の出力は合格ではない。**


### 5.1 破壊試験（**受入の中心**）

**「試験を足しました。全部緑です」は受け付けない。**
下の 10 件を**自分で 1 件ずつ実装へ当て、対応する試験が名指しで赤くなることを確かめ、復元すること。**
**パッチの前後で対象ファイルの `sha256sum` が変わったこと、復元後に元へ戻ることを毎回確かめること。**

**ハッシュが変わっただけでは「破壊が効いた」証明にならない。**
**発注034 では、ハッシュ確認をしていたのに fixture の退化で破壊試験 1 本が全く効かなかった。**
**赤くならなかったら S-7 として報告すること。隠さないこと。**

| # | 壊し方（**論理を 1 箇所だけ反転させる**） | 赤くなるべき試験 |
|---|---|---|
| **C-1** | `main.tsx` から `completeSession()` の呼び出しを外す | **「学習を終えると復元の誘いが出なくなる」1 本だけ。****これが受入の中心である** |
| **C-2** | `Result.tsx` が `allCorrect` を無視して常に花丸を出す | 「部分正解を含む回に花丸が出ない」1 本 |
| **C-3** | `Result.tsx` が `allCorrect` を無視して花丸を出さない | 「全問正解の回に花丸が出る」1 本 |
| **C-4** | 内訳の `partial` を表示から落とす（4 区分にする） | 5 区分を見る 1 本 |
| **C-5** | `untouched` を無視して常に「0%」と書く | 「未着手は 0% と書かない」1 本 |
| **C-6** | `authorUnconfirmed` を無視して印を出さない | 「作者 未確認」1 本 |
| **C-7** | `recommendation` が `undefined` でも節を出す | 「該当なしのとき提案を出さない」1 本 |
| **C-8** | `Session` が判定を積まず空配列を渡す | **内訳を見る試験が赤くなること。**「空でも緑」にならないこと（偽合格の封じ） |
| **C-9** | `retryCardNumbers` を無視して全首を再確認に渡す | 再確認の導線を見る 1 本 |
| **C-10** | `listEvents()` の結果を捨てて空配列で集計する | 「習熟度の変化が出る」1 本 |

**C-1 と C-8 が最重要である。**
C-1 は**実在する欠陥の再発防止**であり、C-8 は**「空の入力でも緑」という偽合格**を封じる。
**このプロジェクトはこの型を 5 回踏んでいる**（005・029 の B-4・032 の B-13・033 の C-8・034 の B-9）。

### 5.2 試験の書き方（**この 5 点を守ること**）

1. **1 試験 1 目的**（計画 §12.3）。1 本に複数の性質を詰めると、先に壊れた性質のせいで後の assert が評価されない。
2. **文言で照合するときは本文まで名指しする。** 番号だけの照合はどちらの分岐が生きているか区別できない（発注025 の誤報の原因）。
3. **fixture は 2 つの実装を区別できる値にする。**
   例: 花丸の試験は「正答 1 件だけ」ではなく「**正答 1 件＋部分正解 1 件**」を必ず 1 本置く。
   前者だけでは C-2（常に花丸）を検出できない。
4. **`vi.mock` を使わない。`createMemoryPort()` を props で渡す**（D-35）。
5. **`localStorage` が要るときは試験の中で差し込む。`vitest.config.ts` を触らない**（D-46）。
   実測: この環境の vitest + jsdom では `window.localStorage` が `undefined` である。

### 5.3 実行環境の注意（Windows）

- **`--test` にディレクトリを渡すと動かない。** グロブを引用符つきで渡すこと。
- `git status --porcelain` は**改行の食い違いで内容差分 0 のファイルを拾う。**
  `.tsx` の判定には `git diff --stat` を使うこと（発注034 の誤検出の原因）。

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| **S-1** | `review/*.yaml` の中身を書く必要が出た |
| **S-2** | 新しい依存を入れる必要が出た |
| **S-3** | `packages/hyakunin/src/domain/` または `packages/shared/src/` を変更する必要が出た（**判断ロジックが足りないなら、それは発注036 側の穴である。画面に書かずに報告すること**） |
| **S-4** | 保存形式（`EventOutcome`）が部分正解を持たないことが障害になった（§0.3。**本発注の範囲外である**） |
| **S-5** | 裁定 9 の範囲（再確認の導線）を超える必要が出たと判断した。**または裁定 12 の grep で、本発注の変更に依存する既存試験が新たに見つかった** |
| **S-6** | `Home.tsx` または既存の画面部品を触らないと受入条件を満たせないと判断した |
| **S-7** | **破壊試験のどれかが「1 本も赤くならない」または「予告より多くを赤にする」** |
| **S-8** | 着手時に `git log --oneline -1` が発注036 の検収コミットより前だった（§0.2） |

**S-7 は不合格ではない。** 発注書の予告が誤っていた例が過去に 5 件ある。
**隠さずに報告すれば、それは正しい仕事である。**

---

## 7. 完了報告に含めること

**次の 8 項目をすべて書くこと。欠けた完了報告は差し戻す。**

1. §5 の A-1〜A-18 の**実測値**（「成功しました」ではなく、コマンドの出力の数値）
2. §5.1 の破壊試験 C-1〜C-10 について、**壊し方・赤くなった試験名・復元後のハッシュ一致**の 3 点を 1 件ずつ
3. **C-1 と C-8 の結果を独立の節に書くこと**（受入の中心のため）
4. `git status --porcelain` の全文
5. `sha256sum packages/hyakunin/src/ui/screens/Result.tsx packages/hyakunin/src/main.tsx packages/hyakunin/src/ui/screens/Session.tsx` の値
6. **独自に決めたことを 1 件残らず列挙する**（本発注書が指定していない判断をした箇所すべて）
7. **できなかったことがあれば、隠さずに書く。**「できませんでした」も実測で検証される
8. `tests/screen/result.test.tsx` の**試験名の一覧**

**親担当は全コマンドを再実行し、破壊試験 10 本を自分で 1 件ずつ反転させて検収する。**
**報告の数値は転記しない。**
