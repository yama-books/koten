# Codex向け発注文書 041: 想起を伴わない閲覧が学習対象から歌を外さないようにする（裁定 D-56）

発注先: **Terra**
親担当: Claude Opus（第23回セッション）
起草日: 2026-09-03
発行日: **2026-09-03（第23回セッション）。§0.4 は親担当が `66da7c9`・clean で実測して充填済み。**
基準となるコミット: **`66da7c9`**（第22回の引継ぎ。作業ツリー clean）。
着手条件: **`git log --oneline -1` が `66da7c9` 以降であり、`git status --porcelain --untracked-files=all` が空であること。**
**並行して走らせてはならない**（理由は §0.2）。着手前に **§0.4 の基準線を照合すること。**

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を作るか

**依頼者裁定 D-56 の実装である。**

いま、**誤答した歌を「ただ見る」だけで、その歌が学習対象から外れる。**
依頼者の裁定は次のとおりである。

> 閲覧することで習熟度が上がってほしい。しかし閲覧／未閲覧は表示可否とは別枠であり、
> **習熟度は上がるが、閲覧のみのものは学習対象の上位グループにいることは変わらないようにしたい。**

**作るものは、既存 3 ファイルへの合計 12 行の変更と、新規試験 7 本だけである。**
画面は 1 つも作らない。点数計算は 1 つも変えない。保存形式は変えない。データ移行は不要である。

### 0.2 単独で走らせなければならない理由

**`packages/shared/src/domain/` の検収済みファイル 2 本に触るためである。**
`recommend.ts` は発注036 の検収を通っており、`rules.v1.ts` は点数規則の正本である。
**並行する発注があると `test:node` の赤緑もハッシュも判定材料にならない**（引継ぎ §9 の既定）。

### 0.3 実測で確かめた構造上の制約（**設計の前提。読み飛ばさないこと**）

**すべて親担当が `66da7c9`・clean で実測した。推測は 1 つも含まない。**

1. **`viewed` イベントは、現在の製品では 1 件も作られない。**
   イベントを書く箇所は `packages/hyakunin/src/ui/screens/Session.tsx` の 29 行目 **1 箇所だけ**で、
   常に `kind: 'answer'` である。`outcomeFor()`（`domain/record.ts`）は `Judgement` からしか
   `outcome` を作らず、**`'viewed'` を返す枝が無い。**
   閲覧入口は `planQuestions()` が `entry === 'view'` で `[]` を返すため、問を 1 つも出さない。
   → **本発注は「いま壊れている」ものの修理ではない。「閲覧を記録し始めた瞬間に壊れる」欠陥を、
   安いうちに塞ぐ発注である。** 実機で症状を再現しようとしないこと。**できない。**

2. **`packages/shared/package.json` の `exports` に `"./domain/mastery/rules.v1"` が既にある。**
   → **`package.json` を 1 文字も変えてはならない。**（発注040 は `exports` に 1 行足す必要があったが、
   今回は不要である。足したら S-5 で止まる案件である。）

3. **`effectiveMethod` は使えない。** `HINT_METHOD_DOWNGRADE`（`rules.v1.ts` 44 行目）は
   ヒント使用時に `self-tri` を `view` へ降格させる。**`effectiveMethod` で判定すると、
   ヒントを使った自己評価△が「ただ見ただけ」に化ける。**
   → **判定は必ず `event.method` で行う**（裁定 2）。**これは §5.1 の C-3・C-4 で機械判定する。**

4. **`tests/unit/recommend/recommend.test.ts` には既に `A-1`〜`A-10`・`C-1`〜`C-4` という名前の試験がある。**
   → **新規試験の名前は `V-` で始めること。** 既存の `A-` `C-` と衝突させない。
   本発注書の「受入条件 A-n」「破壊試験 C-n」は**発注書の中の番号**であって、試験名ではない。

5. **既存試験は、この欠陥を 1 件も守っていない**（親担当が破壊試験で実測）。
   `isViewOnly` を `() => false` に固定しても **`test:node` 332 件は全緑のままである。**
   → **新規 7 本だけが唯一の守り手になる。** だから §5.1 を受入の中心に置く。

### 0.4 基準線（**着手前に照合すること**）

**親担当が `66da7c9`・作業ツリー clean で実測した値である。1 つでも合わなければ S-1 で止まる。**

| ゲート | 実測値 |
|---|---|
| `npm run test:node` | **tests 332 / pass 332 / fail 0** |
| `npm run test:screen` | **12 passed (12) / 88 passed (88)** |
| `npm run scan:publish` | **走査 751 件、違反 0 件** |
| `npm run typecheck` | 終了コード **0** |
| `npm run lint` | 終了コード **0** |
| `npm run data:check` | 終了コード **0** |
| `npm run build` | 終了コード **0** |

**変更してよい 5 ファイルの着手前ハッシュ**（`sha256sum -c` に流せる）:

```
1886a78b54db21bda45df7f0ec61bc2fde865fa31903d376fea2a53dc3dbc2ee *packages/shared/src/domain/mastery/rules.v1.ts
ee3b28d7e336e9a44b7304a9dd77de7ac43389c571987bba7aeb75d2448a527c *packages/shared/src/domain/recommend/recommend.ts
9d17aeb397ed6c1c25b399e29c3c44a82df163d41fc39ea5f5faa955ce4265cf *packages/hyakunin/src/domain/history.ts
7318699d748cb92576f46243de8267c947f9f7a49eff6012b1fd6092935f166a *tests/unit/history.test.ts
bb8385b79bae0249576798abcb1ffb5aa48758bbc31eb6201b3d54b4b67b752b *tests/unit/recommend/recommend.test.ts
```

**触ってはならない主要ファイルのハッシュ**（**完了時にも一致すること**）:

```
9a12db5758bd6c78872b6e2e532a25e49353841680693cbc3fab9d837e0e1abf *packages/shared/src/domain/mastery/compute.ts
fc1a2027172a9ed87cfe91d4a683a6345c7e67142631b1204eb38a684bf45973 *packages/shared/src/domain/mastery/poem.ts
443b4c062359636981fe034de5bd6942850946469ee6d2260279b99bc36e7b5b *packages/shared/src/domain/mastery/color.ts
6bdc5af6505fb3e8bef2c11857c5788efb85206904ea1408af63cc643b81c556 *packages/shared/src/domain/recommend/rules.v1.ts
207ac60c33d467651919ffd6549ba062cc12b2485d59be44862f558efca017e0 *packages/shared/src/domain/event.ts
9f7958c50f77c434491421a655aa297fd55474ab012b48f619287ac55a526894 *packages/hyakunin/src/domain/record.ts
4efeccdad601cf7b1b20434e8b670ab4eaefce2b39a02d9b93c72284a39b3b35 *packages/hyakunin/src/domain/result.ts
b99841022c269822cea0abed40624b080b32cbd2f5d052201c59447a9a0823b2 *packages/hyakunin/src/ui/screens/History.tsx
8d11de46398719a71de2db080207c55bfe2c7743f6ff5bba3af73686274188e1 *packages/hyakunin/src/ui/screens/Result.tsx
d96ea116dbaadeff43e3b3c9efaf90ccd60081e288dc0cbc9f978621a69cde2b *packages/hyakunin/src/main.tsx
98ff4666eef7882563a9315703cc6850af2da8adee733e406975d3296241e137 *tests/unit/recommend/fixtures.ts
3753d1b9a0e03a82f43b5f83937ff37dd2afd145ed5000d55b2b7e976cbd06fa *tests/unit/mastery/fixtures.ts
```

---

## 1. 変更境界

### 変更してよいファイル（**5 つだけ**）

| ファイル | 扱い |
|---|---|
| `packages/shared/src/domain/mastery/rules.v1.ts` | **追記のみ**（`isViewOnly` の 1 関数。**既存の行を 1 つも書き換えない**） |
| `packages/shared/src/domain/recommend/recommend.ts` | **変更**（import 1 行と `lastLearnedOn` の 1 行だけ） |
| `packages/hyakunin/src/domain/history.ts` | **変更**（import 1 行と `needsReview` の filter 1 行だけ） |
| `tests/unit/history.test.ts` | **追記のみ**（**既存 8 本の assert を 1 つも書き換えない**） |
| `tests/unit/recommend/recommend.test.ts` | **追記のみ**（**既存 15 本の assert を 1 つも書き換えない**） |

**親担当が参照実装で実測した `git diff --numstat` は次のとおりである。**

```
2	1	packages/hyakunin/src/domain/history.ts
8	0	packages/shared/src/domain/mastery/rules.v1.ts
2	2	packages/shared/src/domain/recommend/recommend.ts
```

**ずれても止まらなくてよい**（注釈の行数で変わる）。ただし **`rules.v1.ts` の削除列が 0 でなければ S-4 で止まる**——追記のみの約束を破っている。

### 絶対に変更しないファイル・領域

| 対象 | 理由 |
|---|---|
| `packages/shared/src/domain/mastery/{compute,poem,color}.ts` | **点数計算と表示境界の正本。1 行も触らない。** 本発注は点数を変えない |
| `packages/shared/src/domain/recommend/rules.v1.ts` | `REVIEW_INTERVAL_DAYS` と `RECENT_TROUBLE_DAYS`。**新しい係数も閾値も作らない** |
| `packages/shared/src/domain/event.ts` | `EventOutcome` にも `EventMethod` にも値を足さない。**保存形式を変えない** |
| `packages/hyakunin/src/domain/` の**既存 11 ファイル** | `history.ts` **だけ**が例外。とくに `record.ts`（`deltaFor` の `viewed` 枝）を触らない |
| `packages/shared/src/storage/**` | 検収済み。**読むだけ** |
| `packages/*/src/ui/**` / `main.tsx` / `*.css` | **画面を 1 つも触らない。** 本発注に画面の変更は無い |
| `packages/shared/package.json` ほか全 `package.json` / `vitest.config.ts` / `tsconfig.base.json` | §0.3 の 2。**`exports` は既にある** |
| `tests/unit/` の**上記 2 本以外**・`tests/screen/` の**全ファイル** | 検収済み。**1 行も触らない** |
| `packages/hyakunin/src/data/generated/**` / `review/**` / `docs/**` | 生成物・台帳・文書 |
| 一次資料一式 | 憲章 §3 |

---

## 2. 先に読むもの

| 資料 | 読む箇所 |
|---|---|
| `docs/HANDOFF.md` | **裁定 D-51**（「未確認」＝イベントが 1 件も無いこと。**本発注はこれを変えない**）・**D-56**（本発注の根拠） |
| `docs/CODEX_WORK_ORDER_040.md` | **§3 の裁定 7**（要確認一覧は番号順。**本発注はこれを変えない**） |
| `packages/shared/src/domain/mastery/rules.v1.ts` | **全文**。とくに `isRecallMethod`（新関数を隣に置く）と `HINT_METHOD_DOWNGRADE`（§0.3 の 3） |
| `packages/shared/src/domain/recommend/recommend.ts` | **全文**。5 つの段と `poemStatus()` |
| `packages/hyakunin/src/domain/history.ts` | **全文**。`needsReview()` |
| `packages/hyakunin/src/domain/record.ts` | **`effectiveMethodFor` と `outcomeFor` だけ**。なぜ `effectiveMethod` を使えないかの根拠 |
| `tests/unit/history.test.ts` / `tests/unit/recommend/recommend.test.ts` | **全文**。既存の書き方と、既存の試験名（§0.3 の 4） |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: **「想起を伴わない接触」を 1 箇所で名付け、2 箇所から使う。**

`packages/shared/src/domain/mastery/rules.v1.ts` の `isRecallMethod` の**隣に**追加する。

```ts
/**
 * 想起を伴わない接触。既存 8 方式のうち、学習者が何も思い出そうとしていない唯一の方式が 'view'。
 * 自己評価（self-x / self-tri / self-o）は「思い出せたか」の申告なので想起である。
 */
export function isViewOnly(method: EventMethod): boolean {
  return method === 'view';
}
```

**`history.ts` と `recommend.ts` の両方から、この 1 つを import する。**
**`method === 'view'` を 2 箇所に直接書いてはならない**（片方だけ直されて食い違う。§5.0 の A-6 で grep 判定）。

**`MASTERY_RULES_VERSION` を上げない。** 点数計算を 1 つも変えないためである。
`MASTERY_RULES` / `INCORRECT_DECREMENT` / `HINT_METHOD_DOWNGRADE` / `isRecallMethod` を 1 文字も変えない。

### 裁定 2: **判定は `event.method` で行う。`effectiveMethod` を使ってはならない。**

根拠は §0.3 の 3 である。ヒントの有無は点数の話であって、**想起を試みたかどうかとは別の軸**である。
**C-3・C-4 でこれを機械判定する。**

### 裁定 3: **`history.ts` の `needsReview` は、純閲覧イベントを判定材料から除く。**

```ts
function needsReview(poemId: string, events: readonly Event[]): boolean {
  const latest = events
    .filter((event) => event.poemId === poemId && !isViewOnly(event.method))
    .slice()
    .sort((left, right) => left.localDate.localeCompare(right.localDate))
    .at(-1);
  return latest?.outcome === 'incorrect' || latest?.outcome === 'skipped';
}
```

**`return` の行を書き換えない**（`'incorrect'` と `'skipped'` の 2 値のまま）。
**並び替えも `.at(-1)` も変えない**（発注040 の F-5 で安定性が担保されている）。

**帰結を明記する。閲覧しかしていない歌は `latest` が `undefined` になり、要確認に入らない。**
**これは正しい**——依頼者裁定であり、発注040 の裁定 7 後半（まだ間違えていないものを要確認と呼ばない）とも一致する。
**「閲覧しかしていない歌を要確認に入れる」実装をしたら差し戻す**（V-2 で機械判定する）。

### 裁定 4: **`recommend.ts` の `lastLearnedOn` は、純閲覧イベントを除いて求める。**

```ts
const lastLearnedOn = events
  .filter((event) => !isViewOnly(event.method))
  .reduce<string | undefined>((latest, event) =>
    latest === undefined || event.localDate > latest ? event.localDate : latest, undefined);
```

**閲覧では復習の時計が進まない**ので、期限超過の歌は段 1 に残る。

**`poemStatus()` の他の 4 つを 1 文字も変えない。**

| 変数 | 扱い |
|---|---|
| `hasEvents` | **変えない。** `poemMastery().untouched` のまま（D-51）。閲覧は「着手」に数え続ける |
| `hasDifferentDayRecall` | **変えない。** 元から `outcome === 'correct' && isRecallMethod(effectiveMethod)` |
| `hasRecentTrouble` | **変えない。** 元から閲覧では消えない |
| `reviewColor()` / `compareStatuses()` / `daysBetween()` | **変えない** |

### 裁定 5: **段の順序も理由文も変えない。**

`REASONS` の 5 文と、`tiers` の 5 行の順序を 1 文字も変えない。
**閲覧しかしていない歌が段 3 に入るのは正しい**（段 4 の未着手より上位）。V-6 で固定する。

### 裁定 6: **新規試験の名前は `V-` で始める。**

§0.3 の 4。既存の `A-` `C-` と衝突させない。

---

## 4. 実装範囲

### 4.1 `packages/shared/src/domain/mastery/rules.v1.ts`（追記のみ）

裁定 1 の関数 1 つ。**ファイル末尾に足す。既存の行を動かさない。**

### 4.2 `packages/hyakunin/src/domain/history.ts`（2 行）

import 1 行（`@koten/shared/domain/mastery/rules.v1` から）と、裁定 3 の filter 1 行。

### 4.3 `packages/shared/src/domain/recommend/recommend.ts`（2 行）

import 1 行（既存の `isRecallMethod` の import に足す）と、裁定 4 の filter 1 行。

### 4.4 `tests/unit/history.test.ts`（**追記のみ・4 本**）

既存の `event()` ヘルパをそのまま使う。**書き換えない。**

| 試験名 | 内容 |
|---|---|
| **V-1** | **誤答した歌を翌日 閲覧しても要確認に残る。** `[誤答 2026-09-01（method free-input）, 閲覧 2026-09-02（kind view / method view / effectiveMethod view / outcome viewed）]` → `needsReview` の `cardNo` が `[12]` |
| **V-2** | **閲覧しかしていない歌は要確認に入らない。** 閲覧 1 件だけ → `needsReview` が `[]` |
| **V-3** | **ヒント後の自己評価△は判定材料から外れない。** `method: 'self-tri'` / `effectiveMethod: 'view'` / `hintUsed: true` / `outcome: 'incorrect'` の 1 件 → `needsReview` の `cardNo` が `[12]` |
| **V-4** | **最新の正答があれば、そのあと閲覧しても要確認に戻らない。** `[誤答 09-01, 正答 09-02, 閲覧 09-03]` → `needsReview` が `[]` |

### 4.5 `tests/unit/recommend/recommend.test.ts`（**追記のみ・3 本**）

既存の `input()` / `learned()` / `event()` をそのまま使う。**書き換えない。**

**共通の土台**（親担当が実測した値。**この値でなければ 2 実装が同じ結果を出して素通りする**）:

- `today` は **`'2026-08-31'`**、`poemIds` は **`['p001']`**。
- `answered` ＝ `p001` の**正答**、`itemKey: 'p001:text'`、`localDate: '2026-08-25'`、`method: 'free-input'`。
- `scores` は **`{ 'p001:text': 20, 'p001:author': 20 }`**（**赤帯にする。`REVIEW_INTERVAL_DAYS.red = 1` なので 6 日超過して段 1 に入る**）。
  青や緑にすると期限が届かず、**修正の有無で差が出ない。**

| 試験名 | 内容 |
|---|---|
| **V-5** | **期限超過の歌を閲覧しても段 1 に残る。** 土台に閲覧イベント（`localDate: '2026-08-31'`・`kind: 'view'`・`method: 'view'`・`effectiveMethod: 'view'`・`outcome: 'viewed'`）を足す。**足す前も足したあとも `tier` が `1`** |
| **V-6** | **閲覧しかしていない歌は段 3 に留まる。** 閲覧イベント 1 件だけ・**`scores` は `{}`** → `tier` が **`3`**（段 1 でも段 5 でもない。`lastLearnedOn` が `undefined` のとき期限超過を 0 にしている証拠） |
| **V-7** | **ヒント後の自己評価△は復習の時計を進める。** 土台に `localDate: '2026-08-31'`・`kind: 'self-rate'`・**`method: 'self-tri'`・`effectiveMethod: 'view'`・`hintUsed: true`・`outcome: 'correct'`** を足す → `tier` が **`3`**（段 1 から外れる） |

**V-7 の `outcome` は必ず `'correct'` にすること。** `'incorrect'` にすると `hasRecentTrouble` が立って
**段 2 になり、`tier` が `3` にならない。** 段 2 は `lastLearnedOn` を見ないので、**この試験は何も証明しなくなる。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 |
|---|---|
| **A-1** | `npm run test:node` が **pass 339 / fail 0**（332 ＋ 新規 7）。**332 より減っていたら既存を壊している** |
| **A-2** | `npm run test:screen` が **12 files / 88 passed**（**変わらないこと**。画面を触らないため） |
| **A-3** | `npm run typecheck` / `lint` / `data:check` / `build` / `scan:publish` がすべて 0（`scan:publish` は **751 / 違反 0**） |
| **A-4** | §0.4 の「触ってはならない 12 ファイル」のハッシュが **12/12 一致** |
| **A-5** | `git diff --numstat` に **§1 の 5 ファイル以外が 1 つも現れない** |
| **A-6** | §5.0 の grep 5 本がすべて条件を満たす |
| **A-7** | `git diff packages/shared/src/domain/mastery/rules.v1.ts` の**削除行が 0**（追記のみ） |
| **A-8** | 新規 7 本の**試験名がすべて `V-` で始まる**（§0.3 の 4） |
| **A-9** | §5.1 の破壊試験 **C-0 〜 C-6 の 7 件すべて**を実施し、出力を貼っている |

### 5.0 grep で判定する条件（**表の外に置く。表の中では `|` が壊れる**）

```bash
# A-6a isViewOnly が rules.v1.ts に 1 つだけ定義されている（1 でなければならない）
grep -rn "export function isViewOnly" packages/shared/src/domain/ | wc -l

# A-6b history.ts と recommend.ts が isViewOnly を import している（2 でなければならない）
grep -rln "isViewOnly" packages/hyakunin/src/domain/history.ts packages/shared/src/domain/recommend/recommend.ts | wc -l

# A-6c method === 'view' を直接書いた箇所が rules.v1.ts 以外に無い（0 でなければならない。裁定 1）
# 着手前は 0 件である（親担当が実測）。
# 注意: entry === 'view' は EntryId であって EventMethod ではない。別物であり、3 件ある
#       （entry.ts 17・53、Home.tsx 85）。この grep はそれらに当たらない。1 つも触らないこと。
grep -rn "method === 'view'" packages/ --include=*.ts --include=*.tsx | grep -v "mastery/rules.v1.ts" | wc -l

# A-6d isViewOnly を effectiveMethod に当てていない（0 でなければならない。裁定 2）
grep -rn "isViewOnly(.*effectiveMethod" packages/ | wc -l

# A-6e 点数規則のバージョンを上げていない（1 でなければならない）
grep -c "MASTERY_RULES_VERSION = 1 as const" packages/shared/src/domain/mastery/rules.v1.ts
```

### 5.1 破壊試験（**受入の中心**）

**すべて親担当が第23回に参照実装で 1 度通してある。期待する結果は実測値である。**
**壊したファイルは `cp` で復元し、`sha256sum` の一致を報告に貼ること**
（Python やエディタで書き戻すと改行が変わってハッシュがずれる。第21回の実測）。

| # | 壊す箇所 | **赤くなるべき試験**（これ以外が赤くなったら S-6） |
|---|---|---|
| **C-0** | **実装を入れる前に、新規 7 本だけを書いて走らせる** | **V-1・V-5 が赤。V-2・V-3・V-4・V-6・V-7 は緑。既存 332 は全緑** |
| **C-1** | `isViewOnly` の本体を `() => false` に固定 | **V-1・V-5 だけが赤。既存 332 は全緑**（＝既存試験はこの件を 1 件も守っていない） |
| **C-2** | `isViewOnly` の本体を `() => true` に固定 | **V-1・V-3・V-5 が赤。V-2・V-4・V-6・V-7 は緑。加えて既存試験が 13 件赤くなる**（内訳は下記。**数や名前が違っても止まらず、赤くなった試験名を全部貼る**） |
| **C-3** | `history.ts` の `event.method` を `event.effectiveMethod` に差し替え | **V-3 だけが赤。他の 6 本は緑。既存 332 は全緑** |
| **C-4** | `recommend.ts` の `event.method` を `event.effectiveMethod` に差し替え | **V-7 だけが赤。他の 6 本は緑。既存 332 は全緑** |
| **C-5** | `history.ts` の `&& !isViewOnly(event.method)` を消す | **V-1 だけが赤。他の 6 本は緑（V-5 も緑）。既存 332 は全緑** |
| **C-6** | `recommend.ts` の `.filter(...)` を消す | **V-5 だけが赤。他の 6 本は緑（V-1 も V-7 も緑）。既存 332 は全緑** |

**C-5 と C-6 が対になっている。**片方を消しても、もう片方が守る試験は緑のままである
——**2 箇所の修正が独立して効いていることの実証**であって、取り違えではない。

**C-4 と C-6 の違いに注意すること。** `effectiveMethod` に差し替えると **V-7 だけ**が赤くなり、
filter ごと消すと **V-5 だけ**が赤くなる。**V-7 は「軸の選択」だけを守り、V-5 は「除外そのもの」だけを守る。**
どちらか一方でも欠けると、片方の欠陥が素通りする。

**C-2 で赤くなる既存 13 件（親担当の実測。`recommend` 12 件 ＋ `history` 1 件）**:

```
A-1: 段1は段2より優先される
A-4: 赤帯は期限ちょうどで段1に入る
A-4: 黄帯は期限ちょうどで段1に入る
A-4: 青帯は期限ちょうどで段1に入る
A-4: 緑帯は期限ちょうどで段1に入る
A-8: 同点は期限超過日数、習熟度、番順で安定して決まる
C-1: 段5は別日想起済みで期限超過した首を返す
C-2(a): 月またぎの暦日差で黄帯の期限両側を判定する
C-2(b): 年またぎの暦日差で黄帯の期限両側を判定する
C-2(c): うるう日をまたぐ暦日差で黄帯の期限両側を判定する
C-3: 0%でもイベントがあれば赤帯の期限を使う
C-4: 段2・段3・段5の理由文は仕様の正本と一致する
history: 要確認は誤答を含み番号順で返す
```

**C-2 で既存試験が赤くなるのは正常である。直しにかかってはならない。**
**観測して報告し、復元する。**（§1 の「既存試験を 1 行も触らない」と衝突しない——赤くなるのを見るだけである。）
**これは「過剰適用の側は既存試験が守っている」ことの実証でもある**——`isViewOnly` を広げすぎると既存が落ちる。
**守られていないのは C-1 の方向（狭すぎる＝直さない）だけである。**

**C-0 は実装より先に行う。** 新規試験を書いてから実装する順序でなければ C-0 は成立しない。

### 5.2 試験の質（**ここを外すと、緑でも合格にしない**）

1. **fixture は 2 実装が別の値を出す値にすること。**
   V-1 は**閲覧を誤答より後の日付に置く**（同日・前日では、修正の有無で結果が変わらない）。
   V-5 は**閲覧を `today` に置き、正答を `REVIEW_INTERVAL_DAYS.red = 1` より前に置く**
   （`scores` を 20 にして赤帯にする。青や緑にすると期限が届かず、修正の有無で差が出ない）。

2. **新しく足した 7 本について、次の表を報告に書くこと。**

   | 試験名 | 名乗る対象 | assert が実際に触るもの |
   |---|---|---|

3. **`vi.mock` を使わない。** 純関数の試験である。
4. **内部時刻・乱数を読まない。** `today` は必ず引数で渡す。

---

## 6. 停止条件（**該当したら手を止めて親担当へ報告する**）

| # | 条件 |
|---|---|
| **S-1** | **§0.4 の基準線が 1 つでも合わない。** 測り直さず、その値を報告して止まる |
| **S-2** | **裁定 1〜6 のいずれかを守ると、他の受入条件が満たせなくなる。** どちらかを勝手に選ばず、**両方を書いて**止まる |
| **S-3** | **既存の試験を書き換えなければ通せない。** §1 の「絶対に変更しない」に触れる。止まって報告する |
| **S-4** | **`rules.v1.ts` の既存の行を書き換える必要が生じた。** 追記のみの約束を破る。止まる |
| **S-5** | **`package.json` / `tsconfig` / `vitest.config.ts` の変更が要る。** §0.3 の 2 により、ありえない。止まる |
| **S-6** | **破壊試験で、§5.1 の表に無い試験が一緒に赤くなる**（C-2 の既存 `recommend` 試験は除く）。直しにかかる前に、赤くなった試験名を全部貼って報告する |
| **S-7** | **画面ファイル・`compute.ts`・`poem.ts`・`color.ts`・`event.ts`・`record.ts` を変更する必要が生じた。** 設計が間違っている。止まる |
| **S-8** | 一次資料に触れる必要が生じた（憲章 §3）。**ありえない。生じたら設計が間違っている** |

---

## 7. 完了報告に必ず書くこと

1. **§0.4 の基準線を照合した結果**（7 ゲートの数値と、着手前 5 ハッシュ・不変 12 ハッシュの照合）。
2. **C-0 の出力**（実装前に **V-1・V-5 が赤だったこと**）。
   **これは「穴が本当に開いていた」ことの証拠である。省いた報告は未実施とみなす。**
3. **受入条件 A-1 〜 A-9 の判定**（コマンドと出力）。
4. **§5.0 の grep 5 本の出力**（0 件のものも「0 件だった」と書く）。
5. **破壊試験 C-0 〜 C-6 の 7 件すべて。**
   **各回について、壊した箇所・赤くなった試験名・`test:node` の末尾 5 行を貼る。**
   **復元後の `sha256sum` の一致も貼る。**
   **末尾 5 行を貼っていない回は未実施とみなす。**
6. **§5.2 の 2 の表**（新しく足した 7 本の「試験名 / 名乗る対象 / assert が触るもの」）。
7. **完了時のハッシュ**（触ってはならない 12 ファイルの 12/12 一致）。
8. **独自に決めたこと。** 裁定 1〜6 に書かれていない判断をしたら、全部書く。
   **これは検収側で再現できない。必ず書くこと。**
9. **できなかったこと。** 満たせなかった受入条件、諦めた実装、迷って選んだ方。
   **「全部できました」だけの報告は受け付けない。**

---

## 8. 訂正

（着手後に親担当が出した訂正はここへ追記する。現時点で 0 件。）
