# Codex向け発注文書 038: P8-C 再開計画（純関数）

発注先: **Terra**
親担当: Claude Opus（第18回セッション）
起草日: 2026-09-02
発行日: **2026-09-02（第19回セッション）。検収済み——第20回に `48227c2` で合格。**
基準となるコミット: **発注037 の検収コミット**（§0.4 に記す）。
着手条件: **`git log --oneline -1` が §0.4 のコミット以降であり、`git status --porcelain` が空であること。**
**並行して走らせてはならない**（理由は §0.2）。着手前に **§0.4 の基準線を照合すること。**

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を作るか

**中断した学習を再開したとき、未習の範囲を取りこぼさないための純関数を作る。**

- `packages/hyakunin/src/domain/resume.ts` を**新規に作る**
- `tests/unit/resume.test.ts` を**新規に作る**

**この 2 ファイル以外は 1 バイトも触らない。** 画面も配線も本発注の範囲外である（発注039 で行う）。

**作る理由（実測）。** `APP_SPEC` §4 は「次に同じ範囲を開いたときは未確認の残りを優先する」と定め、
§12 の受入条件 3 は「21首以上の20首分割が**動く**」ことを要求している。**どちらも満たされていない。**

部品は揃っているのに、それを呼ぶ側が存在しない。

| 部品 | 実装 | 単体試験 | **呼び出し元** |
|---|---|---|---|
| `splitIntoChunks(range)` | あり | あり | **0 件** |
| `nextChunkIndex(range, confirmed)` | あり | あり | **0 件** |
| `chunkProgress(range, chunkIndex, confirmed)` | あり | あり | **0 件** |
| `confirmed: Set<number>` を台帳から作る関数 | **無い** | — | — |

**欠けているのは最後の 1 行だけである。** 発注026 の裁定は
「**未確認の集合は呼び出し側から渡す（保存層を読まない）**」と定めており、
`nextChunkIndex` が `Set<number>` を引数で受け取るのはそのためである。
**本発注はその「呼び出し側」の純関数部分を作る。**

### 0.2 発注037 と並行してはならない理由

**対象ファイルは 1 件も重ならない**（本発注は新規 2 ファイルのみ）。**それでも並行できない。**

発注037 の受入条件 **A-4 は `test:node` を「tests 310 / fail 0」ちょうどで縛っている。**
本発注は `tests/unit/resume.test.ts` を足すので、**同時に走らせると 037 が A-4 で不合格になる。**
赤の原因が 037 の欠陥なのか本発注の追加なのか**区別できない。**

**発注037 の検収完了後に着手すること。** 着手前に §0.4 を照合し、1 件でも食い違えば S-8 で停止する。

### 0.3 実測で確かめた構造上の制約（**設計の前提。読み飛ばさないこと**）

**1. `orderCardNumbers` は渡された順序を捨てる。**

`packages/hyakunin/src/domain/order.ts` の `orderCardNumbers(cardNumbers, mode, seed)` は
`mode === 'number'` のとき `[...cardNumbers].sort((left, right) => left - right)` で**番号順に並べ直す**。

**したがって「未確認の首を前に並べて渡す」実装は効かない。** 並べ替えは捨てられる。
**未確認を優先するには、渡す首番号そのものを絞るしかない**（裁定 2）。

**2. 出題数の上限がある入口では、まとまり全首を渡すと先頭しか出ない。**

`packages/hyakunin/src/domain/entry.ts` の `takeWeighted` は並んだ問題の**先頭から**取る。

| 入口 | 上限 | まとまり 20 首をそのまま渡すと |
|---|---|---|
| `quick` | 8 問 | **実質 1〜4 番あたりで打ち止め** |
| `learn` | 10 問 | 実質 1〜10 番あたり |
| `exam` | 10 問 | 同上 |
| `review` | **上限なし**（`questionCount: 0`） | まとまりの全問 |
| `view` | — | `planQuestions` は `[]` を返す |

**つまり `quick` で 1〜20 のまとまりを渡し続けると、5〜20 番へ永久に到達しない。**
**これが「取りこぼし」の実体である。** 本発注が直すのはここである。

**3. 保存された `Session` は首番号の集合を持たない。**

`packages/shared/src/domain/event.ts` の `Session` は `from` / `to` しか持たない。
**飛び飛びの首の集合を保存する場所は無い。**

**それでよい。** 本発注は集合を保存せず、**イベント台帳から毎回導出する。**
保存形式は変更しない。**変更が必要だと判断したら S-2 で停止して報告すること。**

**4. 既存コードはイベントを `product` で絞っていない。**

`packages/shared/src/domain/mastery/compute.ts` の `computeMastery` も
`packages/hyakunin/src/domain/result.ts` の `summarizeSession` も、`event.product` を見ていない。
**本発注は絞る**（裁定 5）。**既存コードを直しに行ってはならない。** 不一致は完了報告に 1 行書くだけでよい。

### 0.4 基準線（**着手前に照合すること**）

**親担当が `3901c37`・作業ツリー clean で自分で実測した値である（2026-09-02・第19回）。報告からの転記ではない。**

| 検査 | 実測値 |
|---|---|
| 基準となるコミット | **`3901c37`**（発注037 の検収コミット） |
| `npm run typecheck` / `npm run lint` / `npm run data:check` / `npm run build` | すべて終了コード **0** |
| `npm run test:node` | **tests 310 / pass 310 / fail 0** |
| `npm run test:screen` | **Test Files 11 / Tests 61 passed** |
| `npm run scan:publish` | **走査 751 件、違反 0 件** |

**触ってはならない 6 件の SHA-256**（本発注は**新規 2 ファイルしか作らない**。この 6 件は 1 バイトも変えない）:

```
a667bd6e97627b1061cce5a66c0f764190a6cb8f653cfb9e9f9b82abec278449 *packages/hyakunin/src/domain/range.ts
7250bdb250f2b97351ba76c2a8bb17438176c60d235f48b3f7fd3936283cb3eb *packages/hyakunin/src/domain/order.ts
9b8fbe5506c361f650a606df1f5523ece6b2673d497cfebee349c05958c49a02 *packages/hyakunin/src/domain/entry.ts
17f9d3e9e40c63b4d11c578cd5c7c7817c2123372768da4b078e682c59a3fd28 *packages/hyakunin/src/domain/session.ts
207ac60c33d467651919ffd6549ba062cc12b2485d59be44862f558efca017e0 *packages/shared/src/domain/event.ts
b72f815bdcd39f760eb0025aea889e9f1ba6f34a46bbb0f965fc647dfe584bbd *packages/hyakunin/src/main.tsx
```

一次資料（A-12 の照合先）:

```
291388671528cb9b81a6bc82821f243f609aee871fcaa10a4ce09d8b1f64c586 *百人一首_本文・作者_一次データ.md
8d9e58aeffde10998ee037d57af4b281faca3a0a0ee15915168a91cda9a6ec8a *百人一首_読み_歴史的仮名遣い.md
a728c9ba261319c2042e22d91800313f4af7c1c450614641007a1a7d09b73ec5 *百人一首_読み_現代仮名遣い.md
78953678a9bc5a1fece11da15c2bf166e1d7b542a3646f1f6e8ab4fe1a7a4b54 *百人一首_読み_異同確認.md
30a7f7c9a5deb48263a8b3f46dcc2ee52364c16e4c55a287faf0e3e48ea7a69f *古典文法_一次データ索引.md
```

**注意: `packages/shared/src/domain/event.ts` を §0.3-4 の「`product` で絞っていない」問題のために直しに行かないこと。**
**絞るのは `resume.ts` だけである**（裁定 5）。触れたら S-3。

**1 件でも食い違ったら着手せず S-8 で報告すること。**

---

## 1. 変更境界

### 変更・作成してよいファイル

| ファイル | 扱い |
|---|---|
| `packages/hyakunin/src/domain/resume.ts` | **新規作成。これだけが実装である** |
| `tests/unit/resume.test.ts` | **新規作成** |

**これ以外に 1 ファイルも足さない。** 既存ファイルへの追記も禁止する。

### 絶対に変更しないファイル・領域

| 対象 | 理由 |
|---|---|
| `packages/hyakunin/src/domain/` の**既存**ファイル全部 | 発注026・030・034・036 で検収済み。**読むだけ** |
| `packages/shared/src/**` | 同上。**読むだけ** |
| `packages/hyakunin/src/ui/**` / `main.tsx` | 配線は発注039 の範囲 |
| `tests/unit/` の**既存**ファイル全部 / `tests/screen/**` | 検収済み。**1 本も触らない** |
| `packages/hyakunin/src/data/generated/**` / `review/**` / `docs/**` | 生成物・台帳・文書 |
| `package.json`（すべて）/ `vitest.config.ts` / `tsconfig.base.json` | 依存も設定も増やさない |
| 一次資料一式 | 憲章 §3 |

---

## 2. 先に読むもの

| 順 | 文書・コード | 何のために |
|---|---|---|
| 1 | `docs/APP_SPEC.md` **§4**（57 行目） | **正本。** まとまり分割と「未確認の残りを優先する」 |
| 2 | `docs/APP_SPEC.md` **§5.1**（74・76 行目） | 復元、最初の一巡は番号順 |
| 3 | `packages/hyakunin/src/domain/range.ts` | `splitIntoChunks` / `nextChunkIndex` / `chunkProgress` の署名。**読むだけ** |
| 4 | `packages/hyakunin/src/domain/order.ts` | `orderCardNumbers` が順序を捨てること（§0.3-1）。**読むだけ** |
| 5 | `packages/hyakunin/src/domain/entry.ts` | `planQuestions` が首番号をどう使うか（§0.3-2）。**読むだけ** |
| 6 | `packages/shared/src/domain/event.ts` | `Event` の形。`product` と `poemId` |
| 7 | `packages/shared/src/domain/mastery/poem.ts` | `untouched` の語義（裁定 1 の根拠） |
| 8 | `tests/unit/hyakunin-range.test.ts` | 既存の書き方。**同じ流儀で書く** |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1（D-51）: **「未確認」＝その首のイベントが 1 件も無いこと。**

習熟度の閾値で決めない。**新しい境界値を発明しない。**

根拠は既存コードの語義である。`PoemMastery.untouched` は「その首のイベントが 1 件も無い」であり
（`packages/shared/src/domain/mastery/poem.ts`）、`recommendNext` の段 4 の理由文は
**「まだ確認していない歌です」**である（`packages/shared/src/domain/recommend/recommend.ts`）。

**帰結として「見るだけ」の閲覧イベントも確認済みに数える。** これは意図した挙動である。
**`outcome` の値で選り分けてはならない**——`viewed` を除外する実装を書いたら不合格とする。

### 裁定 2（D-52）: **まとまりの中から渡すのは、未確認の首だけ。全首確認済みのときだけ、まとまり全首。**

**全 5 入口で同じ規則にする。** 入口ごとに分岐を書かない。

- そのまとまりに未確認の首が 1 つでもあれば、**未確認の首だけ**を返す
- **1 つも無ければ、まとまりの全首**を返す（**空配列を返してはならない**。何も出題されなくなる）

この規則は自動的に次を満たす。**追加の分岐を書く必要は無い。**

- **初回は全首が未確認**なので全首が渡り、番号順になる（`APP_SPEC` §5.1「最初の一巡は番号順」）
- 未確認優先が効くのは 2 巡目以降＝**再開のときだけ**である

### 裁定 3: **まとまりの選択は `nextChunkIndex` に任せる。選び方を書き直さない。**

「未確認が最も多いまとまりを選ぶ」「同数なら先頭のまとまり」は
`packages/hyakunin/src/domain/range.ts` に実装済みで、単体試験もある。**そのまま呼ぶ。**
**同じ選択規則を `resume.ts` に書き写したら不合格とする。**

### 裁定 4: **「あと○首」は `chunkProgress` の戻り値をそのまま返す。数え直さない。**

`chunkProgress` の `remainingInRange` は**範囲全体**の未確認数であり、まとまり内の数ではない
（発注026 の裁定「範囲全体とまとまり進捗の**両方**を返す」）。**この語義を変えない。**

### 裁定 5: **イベントは `product` が `hyakunin` のものだけに絞る。`poemId` の形も検査する。**

台帳は製品をまたいで共有される。**絞らないと他製品のイベントが確認済みに数えられる。**

- `event.product` が `hyakunin` でないイベントは無視する
- `event.poemId` が `/^p\d{3}$/` に一致しないイベントは**例外にせず無視する**（保存境界の値である）

**既存コード（`computeMastery` / `summarizeSession`）が絞っていないことは §0.3-4 のとおりである。**
**直しに行かないこと。** 完了報告に 1 行書くだけでよい。

### 裁定 6: **時刻・乱数・保存層に触らない（D-25）。**

`resume.ts` は `Date` も `Math.random` も `port` も使わない。**引数で受け取ったものだけで決める。**
`import` してよいのは `./range.ts` と型だけである。

---

## 4. 実装範囲

### 4.1 `packages/hyakunin/src/domain/resume.ts`（新規）

```ts
import type { Event } from '@koten/shared/domain/event';
import type { CardRange } from './range.ts';

/** 裁定 1（D-51）。確認済み＝その首のイベントが 1 件以上ある。 */
export function confirmedCardNumbers(events: readonly Event[]): Set<number>;

export type ResumePlan = Readonly<{
  /** 裁定 3。nextChunkIndex の戻り値をそのまま入れる。 */
  chunkIndex: number;
  chunkCount: number;
  /** 裁定 2。planQuestions へ渡す首番号。空配列にしてはならない。 */
  cardNumbers: readonly number[];
  /** 裁定 4。範囲全体の未確認数。「あと○首」。 */
  remainingInRange: number;
  /** そのまとまりが全首確認済みだったか。呼び出し側の文言に使う。 */
  chunkFullyConfirmed: boolean;
}>;

/** 中断した学習の再開で、次に出す首を台帳から決める。保存された集合は使わない。 */
export function planResume(
  range: Pick<CardRange, 'from' | 'to'>,
  events: readonly Event[],
): ResumePlan;
```

**`planResume` の手順（この順で書くこと）。**

1. `confirmedCardNumbers(events)` で確認済みの集合を作る
2. `nextChunkIndex(range, confirmed)` でまとまりを選ぶ（裁定 3）
3. `splitIntoChunks(range)[chunkIndex]` でそのまとまりの首番号を得る
4. まとまりの中の未確認を絞る。**1 つでもあればそれを、無ければまとまり全首を** `cardNumbers` にする（裁定 2）
5. `chunkProgress(range, chunkIndex, confirmed)` から `remainingInRange` と `chunkCount` を取る（裁定 4）

**判断はこの 5 手順だけである。** 入口（`EntryId`）を引数に取らない。順序（`OrderMode`）も受け取らない。
**それらは `planQuestions` の仕事である。**

### 4.2 `tests/unit/resume.test.ts`（新規）

**fixture は `range` を 21 首以上にすること。** 20 首以下ではまとまりが 1 つしかできず、
**裁定 3 の破壊試験（B-5）が全く効かない。**

**確認済みをまとまりごとに偏らせること。** 全まとまりが同じ状態だと `nextChunkIndex` を
0 固定にしても赤くならない。**推奨の骨格: 範囲 1〜40（まとまり 2 個）、1〜20 番だけ確認済み。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定コマンド |
|---|---|---|
| A-1 | 型・書式・生成物の検査が通る | `npm run typecheck` / `npm run lint` / `npm run data:check` がすべて終了コード 0 |
| A-2 | `resume.test.ts` の試験が **12 件以上**ある | `npx vitest run tests/unit/resume.test.ts` |
| A-3 | Node 試験が**着手前より増えており、fail 0** | `npm run test:node`。**増分が `resume.test.ts` の本数と一致すること**（一致しなければ他を壊している） |
| A-4 | 画面試験が **1 件も増減していない** | `npm run test:screen` が §0.4 の件数ちょうど・fail 0 |
| A-5 | 2 製品の build が通る | `npm run build` が終了コード 0 |
| A-6 | 公開物が増えていない | `npm run scan:publish` が §0.4 の件数・違反 0 件 |
| A-7 | **新規 2 ファイル以外に差分が無い** | `git status --porcelain` の出力が **その 2 行だけ** |
| A-8 | **既存の `domain/` と `shared/` を触っていない** | `git diff --exit-code packages/hyakunin/src/domain packages/shared/src` が終了コード 0 |
| A-9 | **画面と配線を触っていない** | `git diff --exit-code packages/hyakunin/src/ui packages/hyakunin/src/main.tsx` が終了コード 0 |
| A-10 | **既存の試験を触っていない** | `git diff --exit-code tests/` が終了コード 0 |
| A-11 | `package.json` を 1 つも変えていない | `git diff --exit-code -- package.json "packages/*/package.json"` が終了コード 0 |
| A-12 | 一次資料のハッシュが不変 | `sha256sum 百人一首_*.md 古典文法_一次データ索引.md` が §0.4 と一致 |
| A-13 | **選択規則を書き写していない**（裁定 3） | §5.0 の A-13 が **0 件** |
| A-14 | **時刻・乱数・保存層に触っていない**（裁定 6） | §5.0 の A-14 が **0 件** |
| A-15 | **`outcome` で選り分けていない**（裁定 1） | §5.0 の A-15 が **0 件** |
| A-16 | **`vi.mock` を使っていない**（D-35） | `grep -rn "vi\.mock" tests/unit/resume.test.ts` が **0 件** |

### 5.0 grep で判定する条件（**表の外に置く。表の中では `|` が壊れる**）

```bash
# A-13 まとまりの選択規則を resume.ts へ書き写していない
grep -nE "mostUnconfirmed|MAX_CHUNK_SIZE|slice\(0, 20\)" packages/hyakunin/src/domain/resume.ts

# A-14 時刻・乱数・保存層に触っていない
grep -nE "\bDate\b|Math\.random|\bport\b|SessionPort|EventPort|localStorage|indexedDB" packages/hyakunin/src/domain/resume.ts

# A-15 outcome の値で選り分けていない
grep -nE "outcome|viewed|correct|incorrect|skipped" packages/hyakunin/src/domain/resume.ts
```

**3 本とも 0 件でなければならない。** 1 件でも出たら、その行を完了報告に貼って理由を書くこと。

### 5.1 破壊試験（**受入の中心**）

**下の 6 件を 1 件ずつ実際に壊し、`npm run test:node` を回し、赤くなった試験名を報告すること。**
**「赤くなるはず」と書くのは報告ではない。実際に回した出力を貼ること。**

| # | 壊し方 | 期待 |
|---|---|---|
| **B-1** | `confirmedCardNumbers` の `product` 絞りを外す | 他製品のイベントを無視する試験**だけ**が赤 |
| **B-2** | `poemId` の形の検査を外す | 壊れた `poemId` を無視する試験**だけ**が赤 |
| **B-3** | 裁定 2 の絞りを外し、常にまとまり全首を返す | 「未確認の首だけを返す」試験**だけ**が赤 |
| **B-4** | 裁定 2 のフォールバックを外し、全首確認済みのとき空配列を返す | 「全首確認済みでも空にならない」試験**だけ**が赤 |
| **B-5** | `nextChunkIndex` の戻り値を `0` 固定にする | 「未確認の多いまとまりを選ぶ」試験**だけ**が赤 |
| **B-6** | `remainingInRange` をまとまり内の数に変える | 「あと○首は範囲全体」試験**だけ**が赤 |

**「だけ」を守れないものがあれば、それは試験の書き方が悪い。** 直してから報告すること。

**B-3 と B-4 が本発注の中心である。** B-3 は取りこぼしの再発防止、B-4 は「何も出題されない」事故の封じである。

### 5.2 試験の書き方（**この 5 点を守ること**）

1. **fixture は退化させない。** `range` は 21 首以上、確認済みはまとまりごとに偏らせる（§4.2）
2. **「空でないこと」を先に assert する。** `assert.ok(plan.cardNumbers.length > 0, 'fixture が空では検査にならない')`
3. **否定の assert だけで終えない。** 「含まない」を書いたら「何を含むか」も書く
4. **`vi.mock` を使わない**（D-35）。純関数なので必要ない
5. **試験名は assert している内容と一致させる。** 見ていない挙動を名前に書かない

### 5.3 実行環境の注意（Windows）

- `sha256sum` は Git Bash のものを使う
- 差分の判定に `git diff --stat` を使う。**行数の目視で判断しない**

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| **S-1** | `range.ts` の既存関数を変えないと実装できないと判断した |
| **S-2** | 保存形式（`Session` / `Event`）の変更が要ると判断した（§0.3-3） |
| **S-3** | 裁定 1〜6 のいずれかが矛盾していると判断した。**自分で決め直さないこと** |
| **S-4** | 既存コードの `product` 未絞り込み（§0.3-4）が本発注の受入を妨げると判断した |
| **S-5** | 破壊試験 B-1〜B-6 のどれかで「だけ」が達成できず、試験の書き直しでも解けない |
| **S-8** | 着手時に §0.4 の基準線が 1 件でも食い違った、または `git status --porcelain` が空でなかった |

**停止したら、そこまでの変更を捨てずに残し、`git status --porcelain` の出力を添えて報告すること。**

---

## 7. 完了報告に含めること（**8 項目。1 つでも欠けたら差し戻す**）

1. 着手時の `git log --oneline -1` と `git status --porcelain`
2. **§0.4 の基準線を照合した結果**（全件一致したか。食い違いがあれば全部）
3. A-1〜A-16 の**判定コマンドの実際の出力**（要約でなく、終了コードと件数が読める形で）
4. §5.0 の grep 3 本の出力（0 件であること）
5. **破壊試験 B-1〜B-6 の実施記録。** 各件について「壊した箇所」「赤くなった試験名」「赤の件数」
6. 追加した試験の**本数**と、`test:node` の増分が一致することの確認
7. 完了時の `sha256sum` 6 件＋一次資料 5 件（§0.4 と一致すること）
8. **S-1〜S-8 に当たったものがあれば、その内容**（無ければ「無し」と書く）
