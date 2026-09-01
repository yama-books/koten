# Codex向け発注文書 026: P6-A 出題列の決定（範囲分割・順序・回）

発注日: 2026-09-01（第13回セッション）
階層: **Terra**
優先度: 高
対象: **`packages/hyakunin/src/domain/{range,order,session}.ts` と `tests/unit/` の 3 ファイルのみ**

> **並行発注がある。** 発注024（Terra・`packages/kanazukai/` と `tests/unit/kanazukai/`）、
> 発注027（Terra・`tools/build-data/` と `tests/data/`）、発注028（Terra・`domain/question.ts`）。
> **本発注はどれとも対象ファイルが重ならない。**
> **`npm test` の総件数は判定材料にならない**（他の発注が同時に増やすため）。
> §4 の A-2 は **`tests/unit/hyakunin-range.test.ts` / `order.test.ts` / `session.test.ts` の 3 本合計**で判定する。

---

## 0. この発注の位置づけ（**先に読むこと**）

P6（出題生成と選題）を 3 本に割ったうちの **A** である。

| 発注 | 範囲 | 依存 |
|---|---|---|
| **026（本書）** | **出題列の決定。** 範囲の 20 首分割・順序・回の固定 | **無し。** `APP_SPEC` §4・§5.1 だけで決まる |
| 027 | 出題データの生成（`questions.*.json`・V-07・V-13） | 発注023 の成果物 |
| 028 | 正誤判定（`domain/question.ts`） | `APP_SPEC` §7 |

**本発注は生成データに一切依存しない。** `questions.*.json` を読まない。読もうとしたら設計を間違えている。
扱うのは「番号の列」だけであり、問の中身は扱わない。

---

## 1. 先に読むもの

| ファイル | 読む箇所 | 何のために |
|---|---|---|
| `docs/APP_SPEC.md` | **§4（範囲URLと学習単位）全部**、**§5.1（共通の回の流れ）全部**、§2（用語） | **これが唯一の正本である。** 本発注書と食い違ったら仕様が正 |
| `packages/hyakunin/src/domain/range.ts` | 全部 | 既存実装。**`parseRange` と `normalizeRange` の挙動を変えない** |
| `tests/unit/hyakunin-range.test.ts` | 全部 | 書き方を合わせる |
| `packages/shared/src/domain/recommend/rules.v1.ts` | 版番号つき定数の持たせ方 | **手本。** 設計係数を版番号つきで持つ形 |
| `docs/IMPLEMENTATION_PLAN.md` | §12.3（suite の分け方）、P6 の「対象テスト」 | **1 本に集約しない**という規約 |

**「番」「首」「問」「回」を混同しないこと**（`APP_SPEC` §2）。本発注が扱うのは**番**と**回**である。

---

## 2. 変更境界

### 変更・作成してよいファイル

| ファイル | 種類 |
|---|---|
| `packages/hyakunin/src/domain/range.ts` | **追加のみ。** 既存の `parseRange` / `normalizeRange` / `CardRange` の**挙動と署名を変えない** |
| `packages/hyakunin/src/domain/order.ts` | 新規 |
| `packages/hyakunin/src/domain/session.ts` | 新規 |
| `tests/unit/hyakunin-range.test.ts` | 追加のみ。既存 3 件の assert を消さない |
| `tests/unit/order.test.ts` | 新規 |
| `tests/unit/session.test.ts` | 新規 |

### 絶対に変更しないファイル・領域

- **`tools/**` を 1 文字も変更しない。**
- **`packages/hyakunin/src/domain/question.ts` を作らない**（発注028 の範囲である）。
- `packages/kanazukai/**`、`packages/shared/**`、`tests/unit/kanazukai/**`、`tests/data/**`、`review/**`、
  `packages/hyakunin/src/data/**`、`packages/hyakunin/src/ui/**`、`docs/**`、`.github/**`
- **一次資料 Markdown 5 本と PDF。読み取りもしなくてよい。**
- **`package.json`（ルート・各パッケージとも）。スクリプトも依存も足さない**
- **新しい npm 依存を入れない。**
- **画面（`.tsx`）を作らない。** 本発注は純関数だけである。導線接続は P7 で行う。

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1（D-25）: **乱数源と時刻源は引数で受け取る。モジュール内部で `Math.random()` と `Date` を呼ばない。**

理由は 2 つある。

1. **試験が決定的にならない。** 「同一 seed で並びが再現する」ことを機械判定できなくなる。
2. **本プロジェクトは既にこの規約で動いている。** `packages/shared/src/domain/mastery/` と
   `recommend/` は内部時刻・乱数・UTC 日付導出を 0 件に保っており、発注018A・020 の受入条件だった。

したがって次の形にする。

```ts
export function createSeed(randomSource: () => number): string
export function orderCardNumbers(cardNumbers: number[], mode: OrderMode, seed: string): number[]
```

`createSeed` の呼び出し側（P7 の画面）が `Math.random` を渡す。**本発注では渡さない。**
`orderCardNumbers` は seed から決定的に並びを作る。**`Math.random()` を一度も呼ばない。**

**受入条件 A-6 で `grep` により機械判定する。** `Math.random` / `Date.now` / `new Date` /
`toISOString` / `getTimezoneOffset` が対象 3 ファイルに 1 件でもあれば不合格である。

### 裁定 2: **決定的シャッフルの実装は指定しない。ただし外から見える性質は指定する。**

アルゴリズムの選択は任せる（線形合同法 + Fisher–Yates で十分である）。
**満たすべき性質だけを受入条件にする**（A-4）。**新しい依存を入れて実現しないこと。**

### 裁定 3: **20 首分割の「あと○首」は、まとまり内の残り数ではなく範囲全体の残り数とする。**

`APP_SPEC` §4 は「『あと○首』と**まとまりの進捗**を示す」と書いており、2 つを併記する形である。
したがって `chunkProgress()` は**両方**を返す。片方だけにしない。

### 裁定 4: **「次に同じ範囲を開いたときは未確認の残りを優先する」の「未確認」は、呼び出し側から渡す。**

`domain/` は保存層を読まない（純関数である）。確認済みの番の集合を引数で受け取る。
**IndexedDB にも `packages/shared/src/storage/` にも触らない。**

### 裁定 5: **順序の切替は「区切りでのみ起きる」ことを型で表現する。**

`APP_SPEC` §5.1 は「切替は一問の途中ではなく、まとまり・一巡等の区切りで行う」と定める。
**実行時に弾く関数**（`canChangeOrder(session): boolean`）を置き、**回が進行中は `false` を返す**。
画面がこれを見る。**本発注は関数まで。画面は作らない。**

---

## 4. 実装範囲

### 4.1 `range.ts` への追加

`APP_SPEC` §4 の「21首以上は自動的に最大20首のまとまりへ分割する。まとまりは元の番号順で連続させる」を実装する。

| 関数 | 内容 |
|---|---|
| `splitIntoChunks(range: {from,to}): number[][]` | 範囲内の番を昇順に並べ、**最大 20 首**の連続したまとまりへ分割する。20 首以下ならまとまりは 1 つ |
| `chunkProgress(range, chunkIndex, confirmed: Set<number>): { remainingInRange: number; chunkIndex: number; chunkCount: number }` | 裁定 3 のとおり両方返す。`remainingInRange` は範囲全体のうち `confirmed` に無い番の数 |
| `nextChunkIndex(range, confirmed: Set<number>): number` | 裁定 4。**未確認の番を最も多く含むまとまり**の添字を返す。同数なら添字の昇順。全部確認済みなら `0` |

**分割の境界を発明しないこと。** 21 首なら `[20, 1]` であり `[11, 10]` ではない。
`APP_SPEC` は「最大20首」「元の番号順で連続」としか言っておらず、均等割りを求めていない。

### 4.2 `order.ts`（新規）

```ts
export type OrderMode = 'number' | 'random';
export const ORDER_RULES_VERSION = 1;
```

| 関数 | 内容 |
|---|---|
| `createSeed(randomSource: () => number): string` | 裁定 1。`randomSource` を複数回呼んでよい。**同じ `randomSource` からは同じ seed が出る**こと |
| `orderCardNumbers(cardNumbers, mode, seed): number[]` | `mode === 'number'` なら**昇順**。`'random'` なら seed から決定的に並べ替える。**入力配列を破壊しない**（新しい配列を返す） |
| `canChangeOrder(state: { questionIndexInChunk: number }): boolean` | 裁定 5。`questionIndexInChunk === 0` のときだけ `true` |

### 4.3 `session.ts`（新規）

`APP_SPEC` §5.1 と §10.2 の `Session`（`sessionId`・範囲・入口・順序・seed・開始日・完了状態・問数）を作る**純関数**を置く。

| 関数 | 内容 |
|---|---|
| `createSession(input): Session` | `sessionId` と `seed` と `startedOn`（`YYYY-MM-DD`）は**すべて引数で受け取る**（裁定 1）。関数の中で作らない |
| `resolveActiveRange(session, urlRange): {from,to}` | **`APP_SPEC` §4 の「学習中にURLだけを変えて現在の回を変更しない」を実装する。** 回が `status: 'active'` なら `session` の範囲を返し、`urlRange` を**捨てる**。`'completed'` または回が無いときだけ `urlRange` を返す |

`resolveActiveRange` は重点シナリオ **R-11** そのものである。**ここが本発注の中心である。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm run typecheck` / `npm run lint` が終了コード 0 | 各コマンド |
| A-2 | **`tests/unit/hyakunin-range.test.ts` + `order.test.ts` + `session.test.ts` の 3 本合計が 3 件から 20 件以上へ増えている** | `node --experimental-strip-types --test "tests/unit/hyakunin-range.test.ts" "tests/unit/order.test.ts" "tests/unit/session.test.ts"` の `ℹ tests` 行を着手時と完了時の 2 回。**全体の件数は並行発注のため判定に使わない** |
| A-3 | **既存 3 件の range 試験が名前も内容も変わらず緑** | 上のコマンド。試験名 3 つを報告に貼る |
| A-4 | **順序の性質 4 件**がすべて試験で固定されている | (a) `mode='number'` は昇順、(b) 同一 seed で 2 回呼ぶと同一配列、(c) 別 seed で異なる配列（少なくとも 1 箇所）、(d) 出力は入力の**並べ替えであって過不足が無い**（`sort` して一致） |
| A-5 | **`splitIntoChunks` の境界**が試験で固定されている | 20 首 → 1 まとまり / 21 首 → `[20,1]` / 100 首 → `[20,20,20,20,20]` / 1 首 → `[1]` |
| A-6 | **`Math.random` / `Date.now` / `new Date` / `toISOString` / `getTimezoneOffset` が対象 3 ファイルに 0 件** | `grep -nE "Math\.random\|Date\.now\|new Date\|toISOString\|getTimezoneOffset" packages/hyakunin/src/domain/{range,order,session}.ts` の出力を報告に貼る（**0 件であること**） |
| A-7 | **`packages/hyakunin/src/domain/question.ts` が存在しない** | `ls packages/hyakunin/src/domain/` の出力を貼る（発注028 の範囲を侵していないこと） |
| A-8 | `tools/` と `packages/kanazukai/` と `packages/shared/` に差分が無い | `git status --porcelain tools packages/kanazukai packages/shared` が空 |
| A-9 | **`.tsx` を 1 本も作っていない** | `git status --porcelain` の出力を貼る |

### 5.1 破壊試験（**受入の中心。ここが本題である**）

**実装の論理を 1 箇所だけ反転させ、狙った試験だけが赤くなることを示す。**
**反転させたら必ず元へ戻し、戻した後の `sha256sum` を報告に貼る。**

| # | 反転させる論理 | 赤くなるべき試験 |
|---|---|---|
| **B-1** | `splitIntoChunks` のまとまり上限 20 → 21 | 21 首と 100 首の分割を見る試験が赤くなり、20 首・1 首の試験は緑のままであること。**上限そのものを固定する 2 本が赤くなるのが正しい** |
| **B-2** | `orderCardNumbers` の `mode === 'number'` 分岐を `mode === 'random'` と取り違える | 昇順を見る試験と、別 seed で変わることを見る試験が赤くなり、並べ替えの過不足を見る試験（A-4 の d）は**緑のままであること**。random 分岐も昇順へ倒れるため、別 seed の試験まで赤くなるのが正しい |
| **B-3** | `orderCardNumbers` が seed を無視する（seed 引数を使わない） | **別 seed で変わることを見る試験だけが赤くなり、同一 seed の再現性と昇順の試験は緑のままであること。** seed を無視しても固定の決定的順序なら同一入力の再現性は保たれるため、同一 seed の試験を赤にする要求は置かない |
| **B-4** | `resolveActiveRange` が `status` を見ずに常に `urlRange` を返す | **R-11 の試験だけ**が赤くなること |
| **B-5** | `canChangeOrder` が常に `true` を返す | 区切り以外で切替が起きないことを見る試験**だけ** |
| **B-6** | `nextChunkIndex` が `confirmed` を無視して常に 0 を返す | 未確認優先を見る試験**だけ** |

**B-2・B-3 の「他は緑のまま」が、試験が目的別に分かれていることの証明である。**
ここで複数本が同時に赤くなった場合、試験が集約されすぎている（計画 §12.3 違反）。

**どれかが期待どおりにならなかった場合、「全部緑でした」と報告せず、
どれがどうならなかったかを報告して止まること。**

### 5.2 実行環境の注意（Windows）

- `npm test` は `node --experimental-strip-types` を直接使う。ブラウザは要らない。
- **`npm run check:overflow` を走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。
- **`npm test` の全体実行は並行発注のため赤くなることがある。** A-2 の 3 ファイル指定で判定する。

---

## 6. 停止して報告する条件

- **`questions.*.json` を読む必要があると判断した。** 読まずに止まる（設計を間違えている。§0 を読み直すこと）。
- **`Math.random()` か `Date` を関数の中で呼ばないと実装できないと判断した。** 呼ばずに止まる（裁定 1）。
- **`APP_SPEC` §4・§5.1 に書かれていない挙動を決める必要が生じた。** 決めずに止まり、何を決めたいかを報告する。
  とくに**分割の境界・順序の切替時点・「未確認」の定義**は発明しないこと。
- §2 で許した以外のファイルが必要になった。**作らずに**止まる。
- 新しい npm 依存が要ると判断した。**入れずに**止まる。
- 画面（`.tsx`）が無いと受入条件を満たせないと判断した。**作らずに**止まる（P7 の範囲である）。

---

## 7. 完了報告に含めること

1. **着手時と完了時の、A-2 の 3 ファイル合計の試験件数**（両方）。
2. `typecheck` / `lint` の終了コード。
3. `grep -n "^test(" tests/unit/hyakunin-range.test.ts tests/unit/order.test.ts tests/unit/session.test.ts` の出力そのまま。
4. **A-6 の grep の出力そのまま**（0 件であること）。
5. **破壊試験 B-1〜B-6 の一覧と、それぞれで赤くなった試験名の全部**
   （B-2・B-3 は「赤くなったもの」と「緑のままだったもの」を両方書く）。
6. **反転を戻した後の `sha256sum packages/hyakunin/src/domain/range.ts packages/hyakunin/src/domain/order.ts packages/hyakunin/src/domain/session.ts`。**
7. `git status --porcelain` の出力そのまま。
8. **判断に迷って自分で決めた事項があれば、全部列挙する。**
   **「独自に決めたことは無い」と書く前に、決めた箇所が本当に無いか確かめること。**
