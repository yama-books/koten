# Codex向け発注文書 034: P8-A 回の結果の集計（純関数・画面なし）

発注先: **Terra**
親担当: Claude Opus（第16回セッション）
発注日: 2026-09-02
基準となるコミット: **`ae72911`**（発注032・033 の検収完了後。作業ツリー clean）

---

## 0. この発注の位置づけ（**先に読むこと**）

P8（結果・おすすめ）を 2 本に割った、その 1 本目である。**本発注は純関数だけを作る。**

- **`.tsx` を 1 本も作らない。1 行も編集しない。** 画面は次の発注（036）で作る。
- P7 で同じ割り方をして成功している（030 = 純関数 → 032 = 画面）。**判断ロジックを画面に書くと
  `test:node` の 276 件で守られなくなる**ためである。
- **発注035（`main.tsx` の配線と試験の穴）と並行して走らせてよい。**
  対象ファイルが 1 件も重ならない（§1 の末尾に一覧がある）。
- **`npm test` の総件数は判定材料にならない**（2 本が同時に増やすため）。
  受入条件はファイル単体・ディレクトリ単体の件数で判定する。

### 着手前に必ず確認すること

**親担当が破壊試験を行っている窓に当たると、全体テストの赤は回帰と区別できない。**
着手時に `git log --oneline -1` が `ae72911` 以降であることと、
`packages/hyakunin/src/domain/` のハッシュが数十秒間動かないことを確かめること。

---

## 1. 変更境界

### 変更・作成してよいファイル

| ファイル | 扱い |
|---|---|
| `packages/hyakunin/src/domain/result.ts` | **新規作成** |
| `packages/hyakunin/src/domain/session.ts` | **追記のみ**（既存の 2 関数を変更しない） |
| `packages/hyakunin/src/domain/ports.ts` | **追記のみ**（§3 の裁定 5） |
| `packages/hyakunin/src/ui/adapters/indexeddb-port.ts` | **追記のみ**（裁定 5 の実装側。`.ts` であり画面ではない） |
| `tests/unit/result.test.ts` | **新規作成** |
| `tests/unit/session.test.ts` | **追記のみ**（既存の assert を書き換えない） |

### 絶対に変更しないファイル・領域

| 対象 | 理由 |
|---|---|
| **すべての `.tsx`** | 画面は発注036 の範囲である。1 文字も触らない |
| `packages/hyakunin/src/main.tsx` | **発注035 が並行して触っている。** 衝突する |
| `tests/screen/**` | 同上 |
| `packages/hyakunin/src/domain/{entry,flow,order,ports,question,range,record}.ts` の**既存の関数** | 検収済み（`ports.ts` への**追記だけ**は裁定 5 で許可する） |
| `packages/shared/src/domain/**` | 習熟度・推薦は検収済み。**読むだけ**にする |
| `packages/hyakunin/src/data/generated/**` | 生成物。触らない |
| `review/**` | 人確認の台帳（S-1） |
| `docs/**` | 本発注書を含め、変更しない |
| `package.json` / `vitest.config.ts` / `tsconfig.base.json` | 依存も設定も増やさない |
| 一次資料一式（`百人一首_*.md` ほか） | 憲章 §3 |

### 発注035 との分離（**並行実行の根拠**）

- 034（本発注）= `domain/result.ts` ＋ `domain/session.ts` ＋ `domain/ports.ts` ＋
  `ui/adapters/indexeddb-port.ts` ＋ `tests/unit/`。
- 035 = `main.tsx` ＋ `tests/screen/`。

**1 件も重ならない。** ただし 035 の試験は `createMemoryPort()` を分割代入で使っているため、
**裁定 5 で `SessionPort` に足す口は `createMemoryPort()` にも必ず同時に足すこと。**
片方だけだと 035 側の `typecheck` が落ちる。

---

## 2. 先に読むもの

| 順 | 文書 | 何のために |
|---|---|---|
| 1 | `docs/APP_SPEC.md` §7.3・§8・§8.2 | **正本。** 結果表示・習熟度・提案の確定仕様 |
| 2 | `docs/IMPLEMENTATION_PLAN.md` P8 | フェーズの受入条件 |
| 3 | `packages/shared/src/domain/mastery/compute.ts` | `computeMastery` の署名と再導出の性質 |
| 4 | `packages/shared/src/domain/recommend/recommend.ts` | `recommendNext` の署名 |
| 5 | `packages/hyakunin/src/domain/{question,record,session}.ts` | `Judgement` と `Session` の型 |

**`docs/HANDOFF.md` は読まなくてよい**（内部の作業記録であり、本発注に必要な事実は本書に転記してある）。

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1（D-40）: **花丸は「全問を `correct` で終えた回」だけに出す。部分正解を含む回には出さない。**

`APP_SPEC` §7.3 は「全問を**○**で終えた場合」と書く。**部分正解は○ではない。**
D-29 は「丸印は部分正解を全部正解として誤って伝える」として、部分正解に丸印を使うことを禁じた。
**部分正解を花丸に数えれば、同じ誤りを回の単位で犯す**（憲章 §1 の優先順 3「表示上の誠実さ」）。

したがって `allCorrect` は次で決める。

- 回に含まれるすべての問の判定が `'correct'` であること。
- **かつ、問が 1 問以上あること。**

**2 つ目の条件を落とすと `every()` は空配列に対して `true` を返し、
「0 問の回に花丸が出る」という偽合格が生まれる。**
**このプロジェクトはこの型の事故を繰り返し踏んでいる**（発注005 の「1 件も検査せず 1200 件合格」、
発注029 の B-4、発注032 の B-13）。**専用の試験を必ず 1 本置くこと**（§5 の B-3）。

### 裁定 2（D-41）: **内訳は 5 区分にする。部分正解を他の区分へ畳まない。**

計画 P8 は「正解／要確認／閲覧」の 3 区分、`APP_SPEC` §7.3 は「閲覧／正答／要確認／誤答」の 4 区分と
書いており、**どちらも D-26（部分正解）より前に書かれている**。
`Judgement` は現在 `'correct' | 'partial' | 'incorrect' | 'needs-review'` の 4 値である。

**部分正解をどの既存区分へ畳んでも、学習者に誤った情報を伝える。**
「正答」へ入れれば全部正解として、「誤答」へ入れれば加点される結果を不正解として伝える。
**D-29 が個々の問について下した判断を、回の集計にも同じ形で適用する。**

| 区分 | 対応する判定 |
|---|---|
| `viewed`（閲覧） | 答えを開いただけ・`view` 入口。`outcome === 'viewed'` |
| `correct`（正答） | `judgement === 'correct'` |
| `partial`（部分正解） | `judgement === 'partial'` |
| `needsReview`（要確認） | `judgement === 'needs-review'` |
| `incorrect`（誤答） | `judgement === 'incorrect'` |

**区分を増やすことは新しい係数を作ることではない。** 既にある `Judgement` の 4 値を隠さずに出すだけである。
**5 つの数の合計は、必ず回の問数と一致すること**（§5 の A-6 で機械判定する）。

### 裁定 3: **「習熟度の変化」は `computeMastery` を 2 回呼んで差を取る。保存済みの `delta` を読まない。**

D-15 が「計算は保存済み `delta` ではなく規則版1と `effectiveMethod` から再導出する」と定めており、
`tests/unit/mastery/recompute.test.ts` は `delta` を `9999` に書き換えても点数が変わらないことを
assert している。**この性質を壊さない。**

- `before` = **この回のイベントを除いた**全イベントに `computeMastery` を適用した結果
- `after` = **全イベント**に `computeMastery` を適用した結果

**除外は `sessionId` で行う。** 時刻や順序で切らない（並びは `computeMastery` が内部で決める）。

### 裁定 4: **首の状態は、その首に属する項目の中で最も弱いものに合わせる。**

`APP_SPEC` §8.2 の「首の習熟度は、その首に属する項目のスコアの最小値」と同じ規則を、
**回の結果の首ごと表示にも使う。** 新しい規則を作らない。

判定の区分にも同じ考えを適用する。1 つの首に複数の問があり判定が分かれた場合、
**最も弱い判定**を首の状態とする。強さの順は次で固定する。

```
correct  >  partial  >  needs-review  >  incorrect  >  viewed
```

`viewed` を最も弱いとするのは、閲覧は想起の証拠にならないためである（`APP_SPEC` §8.1 の上限 20）。

### 裁定 5（D-42）: **`SessionPort` に `listEvents()` を足す。**

**実測（2026-09-02）: `packages/shared/src/storage/repo/events.ts` に `listEvents` の実装は既にあるが、
`SessionPort` はその口を持っていない。** したがって**現在の画面はイベントを 1 件も読み戻せない。**
Result の「習熟度の変化」も History の習熟度表示も、この口なしには作れない。

**D-35（保存層は port 経由。`domain/` も画面も IndexedDB を知らない）を守る唯一の道が、
port に口を足すことである。** `vi.mock` で保存層を差し替えてはならない。

```ts
// packages/hyakunin/src/domain/ports.ts へ追記する
export type SessionPort = Readonly<{
  // …既存の 5 つはそのまま…
  listEvents(): Promise<readonly Event[]>;
}>;
```

**3 箇所へ同時に足すこと。片方だけだと並行中の発注035 の `typecheck` が落ちる。**

1. `SessionPort` の型
2. `createMemoryPort()`（内部の `events` 配列を返す）
3. `createIndexedDbPort()`（`repo/events.ts` の `listEvents` を呼ぶ。
   データベースが開けないときは `readFallback` 側を読むのではなく **空配列を返してよい**——
   fallback は `hyakunin:event:<id>` の個別キーで書いており一覧できる作りになっていないため。
   **ただし「読めなかった」ことを握りつぶさないよう、空配列と区別できる形にはしないこと**——
   ここで `null` や例外を足すと呼び出し側の分岐が増える。**空配列で統一する。**）

### 裁定 6: **再確認の対象は「部分正解・要確認・誤答」の首とし、正答と閲覧を含めない。**

`APP_SPEC` §7.3 は「要確認・誤答だけを再確認する」と定める。**部分正解を足すのは D-26 の帰結である**——
部分正解は「歴史的仮名遣いでも漢字でも書けなかった」状態であり、正解基準に達していない。
**閲覧を含めないのは、閲覧が「まだ問に答えていない」状態だからである。**

戻り値は**番の昇順の重複なし配列**とする。順序を乱数で決めない（V-11 と同じ理由）。

### 裁定 7: **`completeSession()` を `domain/session.ts` へ足す。呼ぶのは画面（発注036）である。**

**実測（2026-09-02）: `completed` を `true` にする経路がリポジトリに 1 つも無い。**
`grep -rn "completed" packages/` の結果、代入は `session.ts:24` の `completed: false` だけである。
`indexeddb-port.ts:34` の `loadLastSession` は `!session.completed` で絞るため、
**一度学習すると「前回の学習を復元しますか」が永久に出続ける。**

```ts
export function completeSession(session: Session): Session {
  return { ...session, completed: true };
}
```

**本発注は関数を作るだけで、呼ばない。** 呼び出しは発注036（画面）の仕事である。
**`createSession` の既定値 `completed: false` を変えないこと。**

### 裁定 8: **乱数源と時刻源を引数で受け取る。モジュール内部で `Math.random()` と `Date` を呼ばない（D-25）。**

**新規則ではない。** `packages/shared/src/domain/mastery/` と `recommend/` は内部時刻・乱数を 0 件に
保っており、発注018A・020・030 の受入条件だった。`result.ts` も同じ規約で書く。
「今日」が要る場合は `today: string`（`YYYY-MM-DD`）を引数で受ける。

### 裁定 9: **おすすめは `recommendNext()` をそのまま呼ぶ。判定を書き直さない。**

`packages/shared/src/domain/recommend/recommend.ts` は検収済みで、`APP_SPEC` §8.2 と全数照合されている。
**5 段の優先順・期限表・理由文・同点規則を `result.ts` に再実装してはならない。**
`result.ts` の仕事は `RecommendInput` を組み立てて渡すことだけである。

**該当なしのとき `recommendNext` は `undefined` を返す。それをそのまま通す。**
無理に 1 件をでっち上げない（`APP_SPEC` §8.2「該当する首が 1 つも無い場合は提案を出さない」）。

---

## 4. 実装範囲

### 4.1 `packages/hyakunin/src/domain/result.ts`（新規）

**次の型と関数をエクスポートする。名前を変えないこと**（発注036 の画面がこの名前で呼ぶ）。

```ts
import type { Event } from '@koten/shared/domain/event';
import type { MasteryColor } from '@koten/shared/domain/mastery/color';
import type { Recommendation } from '@koten/shared/domain/recommend/recommend';

/** 首ごとの状態。裁定 2 の 5 区分と同じ語彙を使う。 */
export type OutcomeKind = 'viewed' | 'correct' | 'partial' | 'needs-review' | 'incorrect';

export type Breakdown = Readonly<{
  viewed: number;
  correct: number;
  partial: number;
  needsReview: number;
  incorrect: number;
}>;

export type MasteryChange = Readonly<{
  poemId: string;
  before: number;
  after: number;
}>;

export type PoemOutcome = Readonly<{
  poemId: string;
  cardNo: number;
  kind: OutcomeKind;
  percent: number;
  color: MasteryColor;
}>;

export type SummarizeInput = Readonly<{
  sessionId: string;
  range: Readonly<{ from: number; to: number }>;
  /** 回に出した問の判定。問の順に並べる。閲覧だけの回は空配列でよい。 */
  outcomes: readonly Readonly<{ poemId: string; kind: OutcomeKind }>[];
  /** 保存済みの全イベント（この回のぶんを含む）。port の listEvents() の戻り値をそのまま渡す。 */
  allEvents: readonly Event[];
  /** 範囲内の首の識別子。番の昇順。 */
  poemIds: readonly string[];
  today: string;
}>;

export type SessionResult = Readonly<{
  range: Readonly<{ from: number; to: number }>;
  questionCount: number;
  breakdown: Breakdown;
  /** 裁定 1。全問 correct かつ 1 問以上のときだけ true。 */
  allCorrect: boolean;
  /** 回の前後で値が変わった首だけを、番の昇順で並べる。 */
  changes: readonly MasteryChange[];
  /** 範囲内の全首。番の昇順。 */
  poems: readonly PoemOutcome[];
  /** 裁定 6。部分正解・要確認・誤答の首の番。昇順・重複なし。 */
  retryCardNumbers: readonly number[];
  /** 裁定 9。該当なしなら undefined。 */
  recommendation: Recommendation | undefined;
}>;

export function summarizeSession(input: SummarizeInput): SessionResult;
```

**補助関数を外へ出してよいが、上の 8 つの名前は必ずこの形でエクスポートすること。**

実装の注意を 4 点だけ挙げる。

1. **`percent` と `color` は `masteryDisplay()` から取る。** 色の境界を `result.ts` へ書き写さない
   （**`0=灰 / 1〜29=赤 / 30〜59=黄 / 60〜84=青 / 85〜100=緑` を直書きしたら不合格**）。
2. **首の習熟度は項目スコアの最小値**（裁定 4）。`computeMastery` が返す `scores` は
   `itemKey`（`p010:text` の形）で引ける。その首に属する `itemKey` を集めて最小を取る。
   **項目が 1 つも無い首は 0 とする**（未着手。`APP_SPEC` §8.2）。
3. **`changes` は「値が変わった首だけ」に絞る。** 変わらなかった首を `before === after` で
   並べると、回で触っていない 90 首が結果画面に並ぶ。
4. **`poems` は範囲内の全首**を返す（`APP_SPEC` §7.3「一巡後、首ごとに示す」）。
   `outcomes` に現れない首の `kind` は `'viewed'` ではなく——**イベントが 1 件も無いなら
   その首は回に出ていないので、`kind` を持たせるのは誤りである。**
   **`PoemOutcome.kind` を `OutcomeKind | null` とし、回に出なかった首は `null` にすること。**
   （上の型定義の `kind: OutcomeKind` を `kind: OutcomeKind | null` へ直して実装すること。
   本項が優先する。）

### 4.2 `packages/hyakunin/src/domain/session.ts`（追記）

裁定 7 の `completeSession()` を足すだけ。**既存の `createSession` と `resolveActiveRange` を変更しない。**

### 4.3 `packages/hyakunin/src/domain/ports.ts` と `ui/adapters/indexeddb-port.ts`（追記）

裁定 5 のとおり `listEvents()` を 3 箇所へ足す。**既存の 5 つの口の署名を変えない。**
**`SaveReceipt` の `unique symbol` による封じ（D-36）を緩めない。**

---

## 5. 受入条件（**すべて機械判定できること**）

**A-2 のコマンドは親担当が実際に走らせて確認済みである。そのまま使うこと。**

| # | 条件 | 判定コマンド |
|---|---|---|
| A-1 | 型・書式・生成物の検査が通る | `npm run typecheck` / `npm run lint` / `npm run data:check` がすべて終了コード 0 |
| A-2 | `result.ts` の試験が **14 件以上**ある | `node --experimental-strip-types --test "tests/unit/result.test.ts"` |
| A-3 | 既存の Node 試験が**減っていない**（276 件以上・fail 0） | `npm run test:node` |
| A-4 | 画面試験が**減っていない**（37 件以上） | `npm run test:screen` |
| A-5 | 2 製品の build が通る | `npm run build` が終了コード 0 |
| A-6 | **内訳 5 つの合計が問数と一致する**ことを見る試験がある | `grep -c "questionCount" tests/unit/result.test.ts` が 1 以上、かつ該当試験が存在する |
| A-7 | **`.tsx` を 1 本も作っていない・触っていない** | `git status --porcelain -- "*.tsx"` が**空** |
| A-8 | **`main.tsx` と `tests/screen/` を触っていない**（発注035 の領域） | `git status --porcelain -- packages/hyakunin/src/main.tsx tests/screen` が**空** |
| A-9 | **色の境界を書き写していない** | `grep -nE "\b(29\|30\|59\|60\|84\|85)\b" packages/hyakunin/src/domain/result.ts` が **0 件** |
| A-10 | **乱数・時刻を内部で呼んでいない**（D-25） | `grep -nE "Math\.random\|new Date\|Date\.now" packages/hyakunin/src/domain/result.ts` が **0 件** |
| A-11 | **推薦の判定を書き直していない**（裁定 9） | `grep -nE "前回から間隔\|もう一度思い出\|別の日にも思い出\|まだ確認していない" packages/hyakunin/src/domain/result.ts` が **0 件** |
| A-12 | **保存済みの `delta` を読んでいない**（裁定 3） | `grep -n "\.delta" packages/hyakunin/src/domain/result.ts` が **0 件** |
| A-13 | `review/` と生成物に差分が無い | `git status --porcelain review packages/hyakunin/src/data/generated` が**空** |
| A-14 | `package.json` を変えていない（依存を増やしていない） | `git diff --exit-code package.json` が終了コード 0 |
| A-15 | 一次資料のハッシュが不変 | `sha256sum 百人一首_*.md 古典文法_一次データ索引.md` が着手前と一致 |

### 5.1 破壊試験（**受入の中心。ここが本題である**）

**「試験を足しました。全部緑です」は受け付けない。**
下の 10 件を**自分で 1 件ずつ実装へ当て、対応する試験が名指しで赤くなることを確かめ、復元すること。**

**当てたつもりで当たっていない事故を防ぐため、パッチの前後で
`sha256sum packages/hyakunin/src/domain/result.ts` が変わったことを毎回確かめること。**
復元後もハッシュが元に戻ることを確かめること。

| # | 壊し方（**論理を 1 箇所だけ反転させる**） | 赤くなるべき試験 |
|---|---|---|
| **B-1** | `allCorrect` の判定へ `partial` も数える（甘くする） | 「部分正解を含む回に花丸が出ない」1 本だけ |
| **B-2** | `allCorrect` の判定から `correct` を外す（辛くする） | 「全問正解の回に花丸が出る」1 本だけ |
| **B-3** | `allCorrect` の「1 問以上」の条件を落とす | **「0 問の回に花丸が出ない」1 本だけ。****これが受入の中心である** |
| **B-4** | 内訳の `partial` を `correct` へ足す | 5 区分の内訳を見る試験。**合計を見る試験は緑のまま**（合計は変わらないため） |
| **B-5** | `before` の計算からこの回のイベントを除かない（`before` と `after` が同じになる） | 「習熟度が回の前後で変化する」1 本だけ |
| **B-6** | `retryCardNumbers` に `correct` の首も入れる | 再確認の対象を見る試験 1 本だけ |
| **B-7** | `retryCardNumbers` から `partial` を落とす（裁定 6 を破る） | **部分正解が再確認に入ることを見る試験 1 本だけ** |
| **B-8** | `completeSession` が `completed: false` のまま返す | `session.test.ts` の完了の試験 1 本だけ |
| **B-9** | 首の習熟度を「最小値」でなく「最初の項目の値」にする（裁定 4 を破る） | 複数項目を持つ首の試験 1 本だけ |
| **B-10** | `listEvents()` が常に空配列を返すようにする（`ports.ts` の `createMemoryPort` 側） | before/after が両方 0 になる試験 |

**B-3 が最重要である。** 空集合に対する `every()` は `true` を返す。
**「0 件だから緑」「0 問だから満点」という形の偽合格は、このプロジェクトが 4 回踏んでいる。**

### 5.2 試験の書き方（**この 3 点を守ること**）

1. **1 試験 1 目的**（計画 §12.3）。`assert` は最初の失敗で止まるため、
   1 本に複数の性質を詰めると、**先に壊れた性質のせいで後の assert が一度も評価されない。**
   **発注032 の F-1 で実際に起きた事故である。**
2. **同じ番号を投げる分岐が複数ある場合、assert のメッセージ本文まで名指しする。**
   `/V-01/` のような番号だけの照合は、どちらの分岐が生きているかを区別できない
   （**発注025 の誤報の原因**）。
3. **fixture は生成器が実際に作る形に合わせる。**
   **発注030 では、fixture が `acceptedAnswers: ['れきしてき']` という漢字を含まない
   非現実的な形だったため、破壊試験 12 本すべてが正しく赤くなったのに実装は実データで壊れていた。**
   本発注では **`itemKey` は `p010:text` の形**（`poemId:skill`）であり、
   1 つの首が `text` と `author` の 2 項目を持ちうることを fixture に必ず含めること
   （裁定 4 の「最小値」は、項目が 1 つしかない fixture では一度も検査されない）。

### 5.3 実行環境の注意（Windows）

- **`--test` にディレクトリを渡すと動かない。** グロブを引用符つきで渡すこと。
  誤: `node --test tests/unit/` / 正: `node --experimental-strip-types --test "tests/unit/*.test.ts"`
- `git status --porcelain packages/` は判定に使えない場合がある。**ファイルを名指しすること。**

---

## 6. 停止して報告する条件

次に当たったら、**自分で決めずに停止して報告すること。** 停止せず自分で規則を発明した場合は不合格とする。

| # | 条件 |
|---|---|
| **S-1** | `review/*.yaml` の中身を書く必要が出た（人確認 H-04・H-05 の代行になる） |
| **S-2** | 新しい依存を入れる必要が出た（`package.json` を触る必要が出た） |
| **S-3** | `packages/shared/src/domain/` の既存関数を変更する必要が出た |
| **S-4** | `APP_SPEC` と本発注書が食い違っていると判断した（**仕様が正である。勝手に寄せない**） |
| **S-5** | 裁定 1〜9 のいずれかが実装できないと判断した（**構造上満たせない指定は過去 3 回あった。黙って迂回せず報告すること**） |
| **S-6** | `.tsx` を触らないと受入条件を満たせないと判断した |
| **S-7** | 破壊試験のどれかが「1 本も赤くならない」または「予告より多くを赤にする」 |

**S-7 は不合格ではない。** 発注書の予告が誤っていた例が過去に 3 件ある
（030 の 2 件、032 の B-6、033 の C-4）。**隠さずに報告すれば、それは正しい仕事である。**

---

## 7. 完了報告に含めること

**次の 8 項目をすべて書くこと。欠けた完了報告は差し戻す。**

1. §5 の A-1〜A-15 の**実測値**（「成功しました」ではなく、コマンドの出力の数値）
2. §5.1 の破壊試験 B-1〜B-10 について、**壊し方・赤くなった試験名・復元後のハッシュ一致**の 3 点を 1 件ずつ
3. **B-3 の結果を独立の節に書くこと**（受入の中心のため）
4. `git status --porcelain` の全文
5. `sha256sum packages/hyakunin/src/domain/{result,session,ports}.ts packages/hyakunin/src/ui/adapters/indexeddb-port.ts` の値
6. **独自に決めたこと**を 1 件残らず列挙する（本発注書が指定していない判断をした箇所すべて）
7. **できなかったこと**があれば、隠さずに書く。**「できませんでした」も実測で検証される**
   （発注025 で、Codex が「B-1 で停止」と報告したが実測では正しく赤くなった前例がある）
8. `tests/unit/result.test.ts` の**試験名の一覧**（`grep -o "test('[^']*'" tests/unit/result.test.ts`）

**親担当は全コマンドを再実行し、破壊試験 10 本を自分で 1 件ずつ反転させて検収する。**
**報告の数値は転記しない。**
