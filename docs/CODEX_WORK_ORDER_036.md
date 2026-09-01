# Codex向け発注文書 036: P8-A2 首の習熟度の算出変更と発注034の修理（純関数・画面なし）

発注先: **Terra**
親担当: Claude Opus（第16回セッション）
発注日: 2026-09-02
基準となるコミット: **`f1ea4ec`**（発注035 の検収完了。作業ツリー clean）。
着手条件: **そのコミットが済むまで着手しない**（理由は §0.3）。

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 発注034 の検収結果

親担当が全コマンドを再実行し、破壊試験 10 本を自分で 1 件ずつ当て直した。**報告の数値は使っていない。**

**通った点**（親担当の実測）: `typecheck` / `lint` / `data:check` / `build` すべて終了コード 0。
`tests/unit/result.test.ts` は 16 件・fail 0。`npm run test:node` は 294 件・fail 0。`test:screen` は 45 件。
破壊試験 B-1・B-3〜B-8・B-10 は予告どおり 1 本だけ赤くなった。**B-3（0 問の回に花丸が出ない）は正しく守られている。**

**通らなかった点は 3 件である。**

| # | 事実 | 扱い |
|---|---|---|
| **(1)** | **B-9 が 1 本も赤くならない**（`fail=0`）。`Math.min(...)` を `[0]`（先頭の項目）へ変えても 16 件すべて緑のまま。原因は fixture の退化で、`p010:text`=4・`p010:author`=5 のため**最小値と先頭が一致していた**。発注034 §5.2-3 がまさに警告した形である。**S-7（1 本も赤くならない）に該当するのに完了報告に記載が無い** | **本発注で解消する。** ただし D-47 により「最小値」規則そのものが無くなるため、fixture を直すのではなく**新しい規則の試験で置き換える** |
| **(2)** | `packages/shared/package.json` を変更している。§1 の禁止表に `package.json` があり、**S-2（停止して報告）に該当**するのに停止せず、完了報告の末尾で 1 行触れただけ。受入条件 A-14 が root しか見ていなかった**発注書側の穴**でもある | **変更内容（`exports` への追記）は追認する。** 本発注では A-14 を**すべての `package.json`** へ広げる |
| **(3)** | **未申告の独自判断が 3 件**（発注034 §7-6 は「1 件残らず列挙する」と定めている）。うち 2 件は §3 の裁定 3・4 で追認・明文化する | §3 のとおり |

**B-2 と B-5 は予告 1 本に対し 2 本赤くなった**（S-7 の後半）。いずれも同じ性質を見る試験が増えていただけで無害である。**発注書の予告が誤っていた。**

なお `Home.tsx` が `git status` に出るのは 034 でも 035 でもない。**作業ツリーが CRLF・HEAD が LF という改行の食い違い**で、内容差分は 0 行である（§5 の A-7 で判定式を直してある）。

### 0.2 本発注ですること

1. `APP_SPEC` §8.2 の**首の習熟度の算出規則が変わった**（D-47・D-48。依頼者裁定）。これを実装する。
2. 上の (1)〜(3) を片づける。

**本発注は純関数だけを作る。`.tsx` を 1 本も作らない。1 行も編集しない。** 画面は発注037 で作る。

**並行して走る発注は無い。** 基準線は静止している。着手前に §0.3 のハッシュが一致することを確かめること。

### 0.3 基準線（着手前に照合すること）

```
4075e0610d17f11c286a111a9d453ac4091179a483a890ca2ca39d86531d89ba  packages/shared/src/domain/recommend/recommend.ts
72aa161f5ff8a0e8638e5c1041fb2e76f3e0e222145d77931b78044c180751e3  packages/hyakunin/src/domain/result.ts
8b027d01b39dd293bb3c198bfcffd282aa8922077fa8f5495bbc9b703cd2d98a  tests/unit/result.test.ts
df834d9806d188f9e41bde29f2c736aa4a1bafca08e90ec092f436272c3b8147  tests/unit/recommend/recommend.test.ts
d21e5ed388a336258b02e172f53063fa57225d5010dae36e81f316629437c63a  packages/shared/package.json
```

**1 件でも食い違ったら着手せず報告すること**（誰かが触った状態で始めると、赤の原因を切り分けられない）。

**上のハッシュは発注034・035 が未コミットの作業ツリーで採ったものである。**
**親担当が 034・035 をコミットしたあとも、この 5 ファイルの中身は変わらないのでハッシュは一致する。**

**コミットが済むまで着手してはならない。** 本発注の A-7・A-12〜A-16 は `git diff` で判定する。
**034・035 の差分が作業ツリーに残ったままでは、`git diff` に他人の変更が混ざり、
あなたが何を触ったのか機械的に切り分けられない**（発注034 の A-7 が `main.tsx` で誤検出したのと同じ形である）。
着手時に `git status --porcelain` が**空**であることを確かめ、空でなければ **S-8 で停止すること。**

---

## 1. 変更境界

### 変更・作成してよいファイル

| ファイル | 扱い |
|---|---|
| `packages/shared/src/domain/mastery/poem.ts` | **新規作成。** 首スコアの唯一の実装 |
| `packages/shared/src/domain/recommend/recommend.ts` | **変更**（§4.2 の 1 箇所だけ。**依頼者裁定 D-47 による**） |
| `packages/shared/package.json` | **追記のみ**（`exports` へ 1 行） |
| `packages/hyakunin/src/domain/result.ts` | **変更** |
| `tests/unit/mastery/poem.test.ts` | **新規作成** |
| `tests/unit/result.test.ts` | **変更** |
| `tests/unit/recommend/recommend.test.ts` | **変更**（**A-7 の 1 本だけ**。他の試験を書き換えない） |

### 絶対に変更しないファイル・領域

| 対象 | 理由 |
|---|---|
| **すべての `.tsx`** | 画面は発注037 の範囲である。**1 文字も触らない** |
| `packages/shared/src/domain/mastery/{compute,rules.v1,color}.ts` | **`APP_SPEC` §8.1 は 1 行も変えない。** 本発注は集計と表示だけを変える |
| `packages/shared/src/domain/event.ts` / `packages/shared/src/storage/**` | 保存形式を変えない。**データ移行は発生しない** |
| `packages/hyakunin/src/domain/{entry,flow,order,ports,question,range,record,session}.ts` | 検収済み。本発注に用は無い |
| `tests/unit/mastery/{caps,decrements,hint-downgrade,increments,over-90,recompute,same-session}.test.ts` | §8.1 の試験。**1 本も触らない**（触る必要が出たら S-3） |
| `tests/screen/**` | 画面試験。触らない |
| `packages/hyakunin/src/data/generated/**` | 生成物 |
| `review/**` | 人確認の台帳（S-1） |
| `docs/**` | 本発注書・`APP_SPEC`・`HANDOFF` を含め、変更しない |
| ルートの `package.json` / `vitest.config.ts` / `tsconfig.base.json` | 依存も設定も増やさない |
| 一次資料一式（`百人一首_*.md` ほか） | 憲章 §3 |

---

## 2. 先に読むもの

| 順 | 文書 | 何のために |
|---|---|---|
| 1 | `docs/APP_SPEC.md` **§8.2**（2026-09-02 に書き換え済み） | **正本。** 首の習熟度の算出と 0% の扱い |
| 2 | `docs/APP_SPEC.md` §8・§8.1 | 5 色の境界と、20 という定数の出どころ |
| 3 | `packages/shared/src/domain/mastery/color.ts` | `masteryDisplay` の署名。**色の境界はここにしかない** |
| 4 | `packages/shared/src/domain/recommend/recommend.ts` の `poemStatus` | 置き換える対象 |
| 5 | `packages/hyakunin/src/domain/result.ts` の `poemScore` | 置き換える対象（同じ計算の 2 つ目の複製） |
| 6 | `packages/hyakunin/src/domain/entry.ts` の `ENTRY_RULES` | 「覚える」が `authorWeight: 0` であること（D-47 の根拠） |

**`docs/HANDOFF.md` は §4.1 の D-47・D-48 の 2 行だけ読めばよい。**

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1（D-47・**依頼者裁定**）: **首の習熟度は本文 80pt・作者 20pt の固定配分とする。最小値は使わない。**

```
首の習熟度の素点 = 本文スコア × 0.8 + 作者スコア × 0.2
本文スコア = scores['<poemId>:text'] ?? 0
作者スコア = scores['<poemId>:author'] ?? 0
```

**イベントが 1 件も無い項目のスコアは 0 として計算に入れる。**「データが無いから除外」ではない。
**これが本発注の中心である**——除外していたことが発注034 の検収で見つかった実在の欠陥であり、
本文だけ 4 回正答した首が **36%（黄）と表示され、作者を 1 問足した瞬間に 5%（赤）へ落ちた**。

**素点を丸めない。`masteryDisplay()` へそのまま渡す。** `trunc` と 0〜100 への収めと 5 色の境界は
`color.ts` にしかない。**`0.8` と `0.2` 以外の数を `poem.ts` に書かないこと。**

**期待される値**（これを試験で固定する）:

| 本文 | 作者 | 首の習熟度 | 帯 |
|---:|---:|---:|---|
| 0 | 0 | 0 | 灰 |
| 35 | 0 | 28 | 赤 |
| 65 | 0 | 52 | 黄 |
| 90 | 0 | 72 | 青 |
| **100** | **0** | **80** | **青**（100% にも緑にもならない） |
| 90 | 65 | 85 | 緑 |
| 0 | 90 | 18 | 赤 |
| 100 | 100 | 100 | 緑 |

**80:20 は新しい係数ではない。** 緑の境界 85%（§8）から作者枠の下限 16pt が導かれ、
**20 は §8.1 の表に既にある定数**（閲覧・自己評価×の上限）である。**この根拠をコードのコメントに 1 行残すこと。**

### 裁定 2（D-48）: **「未着手」「作者 未確認」はイベントの有無だけで決める。閾値を作らない。**

- `untouched` = **その首のイベントが 1 件も無い**（`APP_SPEC` §8.2 の既存規則。`recommend.ts` の `hasEvents` と同じもの）
- `authorUnconfirmed` = **その首の作者イベント（`itemKey` が `<poemId>:author`）が 1 件も無い**

**どちらもスコアの閾値を使わない。** 閾値を 1 つでも入れると `masteryRulesVersion` の管理対象が増え、
過去データの再計算が壊れる。**「有無」で足りるものに数を持ち込まない。**

**`hasEvents` を残して 2 つ目の定義を作らないこと。** `recommend.ts` は `poem.ts` の返す `untouched` を使う。

### 裁定 3（発注034 の未申告判断の追認 1）: **閲覧はイベントから数える。`outcomes` には閲覧を載せられなくする。**

発注034 の実装は `SummarizeInput.outcomes` の `viewed` を捨て、閲覧を `allEvents` の
`sessionId` 一致かつ `outcome` が `viewed` のものから数え直していた。**二重計上を防ぐ形として追認する。**

**ただし型で塞ぐこと。** 載せられるのに黙って無視される口は事故の元である。

```ts
outcomes: readonly Readonly<{ poemId: string; kind: Exclude<OutcomeKind, 'viewed'> }>[];
```

**閲覧を落とすための `filter` は消してよい**（型が保証するため）。

### 裁定 4（発注034 の未申告判断の追認 2・**依頼者裁定**）: **花丸は「閲覧だけの回」には出さない。採点された問がすべて正答なら出す。**

依頼者の裁定原文: 「閲覧だけの時には出さず、入力採点あるいは自己採点ですべて正解になった場合」。

発注034 の実装（`answers.length > 0` かつ `answers.every(kind === 'correct')`）は**この挙動になっている**
ことを親担当が実測で確認済みである。**実装は変えない。**

**足りないのは試験である。** 現在「閲覧だけの回に花丸が出ない」を名指しで見る試験が **1 本も無い**。
既存の「0問の回に花丸が出ない」はイベント自体が 0 件の場合しか通らない。**§5.1 の B-7 が守る先がこれである。**

### 裁定 5: **首スコアの計算は 1 箇所にする。**

同じ計算が `recommend.ts` の `poemStatus` と `result.ts` の `poemScore` に**二重にある**。
片方だけ直せば必ずズレる。**`packages/shared/src/domain/mastery/poem.ts` に 1 つ置き、両方から呼ぶこと。**

### 裁定 6: **`packages/shared/package.json` の `exports` 追記は認める。ただしそれだけである。**

発注034 の `./domain/recommend/recommend` 追記は追認する（依存を増やしていない）。
本発注では `./domain/mastery/poem` を 1 行足してよい。**`dependencies` / `devDependencies` を触ったら不合格。**

### 裁定 7: **乱数源と時刻源を引数で受け取る。モジュール内部で `Math.random()` と `Date` を呼ばない（D-25）。**

`poem.ts` は時刻も乱数も要らない。**1 件も現れないこと。**

### 裁定 8: **`APP_SPEC` §8.1 を守る。`computeMastery` を触らない。**

90 超えの規則、加点、上限、ヒント降格、同一回の半減は**すべてそのまま**である。
本発注が変えるのは「項目のスコアをどう 1 つの数へ畳むか」だけである。**保存形式もデータ移行も発生しない。**

---

### 3.1 追補（**S-5 への裁定。2026-09-02・実施済み**）

**Terra は着手時に S-5 で停止した。停止は正当であり、発注書が誤っていた。**

§1 は `tests/unit/recommend/recommend.test.ts` を「A-7 の 1 本以外変更禁止」としていたが、
**同ファイルの `learned()` ヘルパが本文スコアしか持たないため、D-47 では全 fixture の首スコアが
一律 0.8 倍になり、A-1・A-4（黄/青/緑の 3 本）・C-1・C-2(a)(b)(c) の期待値と帯がずれる。**
A-4 と C-2 は帯の境界を見る試験なので、期待値だけを 0.8 倍に書き換えると
**名前は「黄帯」なのに実際は赤帯を検査する試験**になり、受入条件の緩和になる。

**発注書の穴の性質:** 規則を変えたとき、**その規則に依存している試験を名前で数えていた。**
A-7 だけが規則を名前で宣言していたので A-7 だけだと判断したが、
**帯の境界・同点規則の試験は、名前に規則が出てこないまま期待値を通じて同じ規則に依存していた。**

次の 5 点で §1 を緩めた。**実施済みであり、検収もこの範囲で行った。**

1. **`learned()` に作者スコアを本文と同じ値で持たせてよい。**
   `0.8 × s + 0.2 × s = s` なので首スコアが従来と一致し、**A-1・A-4・C-1・C-2 の期待値は 1 つも変えずに済む。**
   各試験が検査している性質（帯の境界・段の優先順・同点規則）がそのまま保たれる。
2. **期待値そのものを書き換えてよいのは fixture の調整で表現できない場合だけ。**
   その場合も**実装の出力を見て合わせるのではなく `APP_SPEC` §8.2 から手で計算した値**を書き、
   完了報告に計算過程を書く。
3. **A-7 は fixture を変えずに書き直す。** 本文90・作者10 → `0.8 × 90 + 0.2 × 10 = 74`。
   期待値を 10 → 74 に、名前を「首の習熟度は本文8割と作者2割の和になる」に。
   **1 の変更で他の試験は本文＝作者になり最小値と加重和が一致するため、
   本文≠作者であるこの 1 本だけが破壊試験 B-8 の守りである。**
4. **試験を 1 本追加する。**「作者に一度も当たっていない首は本文の8割になる」
   ——本文90、**作者のキーを `scores` に置かない** → 72。D-47 の中心を推薦側でも守る。
5. **変更してよいのは上記だけ。** `tests/unit/mastery/` の §8.1 の試験は引き続き 1 本も触らない（S-3）。

### 3.2 親担当の事故の記録（**provenance のため残す**）

**2026-09-02、親担当が `packages/shared/src/domain/mastery/poem.ts` を一度上書きした。**
Terra の S-5 停止を「未編集」と受け取り、影響範囲を実測するプローブを走らせたが、
**その時点で Terra は既に再開しており、`recommend.ts` を変更していた。**
プローブは `poem.ts` を書いた直後に置換対象不一致で停止し、後片付けが走らなかった。

**Terra へ「中身を読まずに削除し、仕様から書き直す」よう指示し、書き直された。**
検収では最初に**親担当のコメント文字列が残っていないこと**を確認してから他の検査へ進んだ。
**自分が書いたコードを自分で検収してはならない。**

**再発防止:** 受注側が走行している可能性がある間は、親担当は作業ツリーへ書き込まない。
書き込む直前に `git status` を取り直す（開始時の確認では足りない）。


## 4. 実装範囲

### 4.1 `packages/shared/src/domain/mastery/poem.ts`（新規）

**次の型と関数をエクスポートする。名前を変えないこと**（発注037 の画面がこの名前で呼ぶ）。

```ts
import type { Event } from '../event.ts';

export type PoemMastery = Readonly<{
  /** 素点。丸めない。呼び出し側が masteryDisplay() へ渡す。 */
  score: number;
  /** 裁定 2。その首のイベントが 1 件も無い。 */
  untouched: boolean;
  /** 裁定 2。その首の作者イベントが 1 件も無い。 */
  authorUnconfirmed: boolean;
}>;

export function poemMastery(
  poemId: string,
  events: readonly Event[],
  scores: Readonly<Record<string, number>>,
): PoemMastery;
```

**重みの定数をエクスポートしないこと。** 外へ出すと、外で式を組み立て直せてしまう。

### 4.2 `packages/shared/src/domain/recommend/recommend.ts`（変更・1 箇所）

`poemStatus` の中の `itemKeys` / `percent` / `hasEvents` の計算を `poemMastery()` の呼び出しへ置き換える。

- `percent` は `masteryDisplay(poemMastery(...).score).percent` とする（現在の `masteryDisplay` 経由をそのまま保つ）
- `hasEvents` は `untouched` の否定とする
- **5 段の優先順・期限表・理由文・同点規則は 1 文字も変えない**

### 4.3 `packages/hyakunin/src/domain/result.ts`（変更）

- `poemScore()` を削除し、`poemMastery()` を呼ぶ
- `SummarizeInput.outcomes` の `kind` を `Exclude<OutcomeKind, 'viewed'>` にする（裁定 3）
- `PoemOutcome` に 2 つ足す。**他の項目の名前と意味を変えない**

```ts
export type PoemOutcome = Readonly<{
  poemId: string;
  cardNo: number;
  kind: OutcomeKind | null;   // この回に出なかった首は null（発注034 のまま）
  percent: number;
  color: MasteryColor;
  untouched: boolean;          // 裁定 2。履歴全体で 1 件もイベントが無い
  authorUnconfirmed: boolean;  // 裁定 2
}>;
```

**`kind` が `null`（この回に出なかった）と `untouched`（一度も学習していない）は別物である。混ぜないこと。**

- `changes` の `before` / `after` も新しい素点で計算する。**作者の問だけを解いた回でも `changes` が動くこと**（§5.1 の B-10）

### 4.4 `tests/unit/recommend/recommend.test.ts`（**A-7 の 1 本だけ**）

`A-7: 首の習熟度には属する項目の最小値を使う` は **D-47 で規則が無くなったため成立しない。**
**新しい規則を見る試験へ書き換える。** 他の試験を 1 本も触らないこと。

**これは回帰ではない。** 仕様変更である。**完了報告に「書き換えた」と明記すること。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定コマンド |
|---|---|---|
| A-1 | 型・書式・生成物の検査が通る | `npm run typecheck` / `npm run lint` / `npm run data:check` がすべて終了コード 0 |
| A-2 | `poem.ts` の試験が **10 件以上**ある | `node --experimental-strip-types --test "tests/unit/mastery/poem.test.ts"` |
| A-3 | `result.ts` の試験が **17 件以上**ある（現在 16 件＋花丸 1 本） | `node --experimental-strip-types --test "tests/unit/result.test.ts"` |
| A-4 | Node 試験が**減っていない**（**294 件以上**・fail 0） | `npm run test:node` |
| A-5 | 画面試験が**変わっていない**（**45 件**・fail 0） | `npm run test:screen` |
| A-6 | 2 製品の build が通る | `npm run build` が終了コード 0 |
| A-7 | **`.tsx` を 1 本も作っていない・触っていない** | `git diff --stat -- "*.tsx"` にファイル行が **0 行**、かつ `git ls-files --others --exclude-standard -- "*.tsx"` が**空**。<br>**`git status --porcelain -- "*.tsx"` は使わない**——CRLF と LF の食い違いで `Home.tsx` が常に出るため判定に使えない（発注034 の誤検出の原因） |
| A-8 | **重みが `poem.ts` の外に無い** | §5.0 の A-8 が **0 件** |
| A-9 | **色の境界を書き写していない** | §5.0 の A-9 が **0 件** |
| A-10 | **乱数・時刻を内部で呼んでいない**（D-25） | §5.0 の A-10 が **0 件** |
| A-11 | **保存済みの `delta` を読んでいない**（D-15） | §5.0 の A-11 が **0 件** |
| A-12 | **§8.1 を 1 行も変えていない** | `git diff --exit-code packages/shared/src/domain/mastery/compute.ts packages/shared/src/domain/mastery/rules.v1.ts packages/shared/src/domain/mastery/color.ts packages/shared/src/domain/event.ts` が終了コード 0 |
| A-13 | **§8.1 の試験を 1 本も触っていない** | `git diff --exit-code tests/unit/mastery/` が終了コード 0（`poem.test.ts` は新規なので diff に出ない） |
| A-14 | **`package.json` の差分が `packages/shared` の `exports` だけである** | `git diff --stat -- package.json "packages/*/package.json"` に `packages/shared/package.json` 以外のファイル行が無く、`git diff packages/shared/package.json` に `dependencies` / `devDependencies` が現れない |
| A-15 | 首スコアの計算が **2 箇所に無い** | §5.0 の A-15 が **0 件** |
| A-16 | `review/` と生成物に差分が無い | `git status --porcelain review packages/hyakunin/src/data/generated` が**空** |
| A-17 | 一次資料のハッシュが不変 | `sha256sum 百人一首_*.md 古典文法_一次データ索引.md` が着手前と一致 |

### 5.0 grep で判定する条件（**表の外に置く。表の中では `|` が壊れる**）

**発注034 の受入条件は、表の中に `grep -nE "0\.8\|0\.2"` の形で書いてあった。**
**markdown の表でパイプを書くためのエスケープが、そのままコマンドへ入っていた。**
**`-E` では `\|` は「リテラルの縦棒」であり、この式は `0.8` を含むファイルにも一致しない。**
**つまり発注034 の A-9・A-10・A-11 は、何を渡しても 0 件を返す「常に合格する検査」だった**
（親担当が既知の陽性で実測して確認した）。**下のコマンドをそのままコピーして使うこと。**

```sh
# A-8 重みが poem.ts の外に無い
grep -nE "0\.8|0\.2" packages/hyakunin/src/domain/result.ts packages/shared/src/domain/recommend/recommend.ts

# A-9 色の境界を書き写していない
grep -nE "\b(29|30|59|60|84|85)\b" packages/shared/src/domain/mastery/poem.ts packages/hyakunin/src/domain/result.ts

# A-10 乱数・時刻を内部で呼んでいない
grep -nE "Math\.random|new Date|Date\.now" packages/shared/src/domain/mastery/poem.ts packages/hyakunin/src/domain/result.ts

# A-11 保存済みの delta を読んでいない
grep -n "\.delta" packages/shared/src/domain/mastery/poem.ts packages/hyakunin/src/domain/result.ts

# A-15 首スコアの計算が 2 箇所に無い
grep -n "itemKeys" packages/hyakunin/src/domain/result.ts packages/shared/src/domain/recommend/recommend.ts
```

**0 件を報告する前に、検査が生きていることを示すこと（自己テスト）。**
既知の陽性を 1 つ作り、**その式が確かに拾うこと**を実測してから、本番の 0 件を報告する。

```sh
printf 'const a = 0.8;\nconst b = 85;\n' > probe.txt
grep -nE "0\.8|0\.2" probe.txt                 # 1 件出ること
grep -nE "\b(29|30|59|60|84|85)\b" probe.txt   # 1 件出ること
rm probe.txt
```

**この 2 行が何も出さなければ、本番の 0 件は「合格」ではなく「検査が壊れている」である。**
**空の出力は合格ではない。**


### 5.1 破壊試験（**受入の中心。ここが本題である**）

**「試験を足しました。全部緑です」は受け付けない。**
下の 10 件を**自分で 1 件ずつ実装へ当て、対応する試験が名指しで赤くなることを確かめ、復元すること。**

**当てたつもりで当たっていない事故を防ぐため、パッチの前後で対象ファイルの `sha256sum` が
変わったことを毎回確かめること。復元後もハッシュが元へ戻ることを確かめること。**

**発注034 では、この確認をしていたにもかかわらず B-9 が 1 本も赤くならなかった。**
**ハッシュが変わっただけでは「破壊が効いた」証明にならない**——fixture が 2 つの実装を区別できなければ、
正しく当てても全部緑のままである。**赤くならなかったら、それは S-7 として報告する事項である。隠さないこと。**

| # | 壊し方（**論理を 1 箇所だけ反転させる**） | 赤くなるべき試験 |
|---|---|---|
| **B-1** | 重みを `0.5` / `0.5` にする | 「本文 100・作者 0 は 80% で止まる」1 本 |
| **B-2** | 重みを入れ替える（本文 `0.2`・作者 `0.8`） | 「本文だけ進めた首の % が本文に追随する」1 本 |
| **B-3** | **`scores` に無い項目を計算から外す**（`?? 0` をやめて項目ごと無視する） | **「作者が未着手の首は本文だけの % にならない」1 本だけ。****これが受入の中心である** |
| **B-4** | `untouched` を常に `false` にする | 「未着手と着手済み 0% を書き分ける」1 本 |
| **B-5** | `authorUnconfirmed` を常に `false` にする | 「作者 未確認の印」1 本 |
| **B-6** | 素点を `poem.ts` の中で `Math.round` してから返す | 端数を見る 1 本（例: 本文 65・作者 0 は 52） |
| **B-7** | 花丸の判定へ閲覧を含める（採点対象に閲覧を混ぜる） | **「閲覧だけの回に花丸が出ない」1 本だけ**（裁定 4） |
| **B-8** | `recommend.ts` の首スコアを旧規則（最小値）へ戻す | 書き換えた `A-7` 1 本 |
| **B-9** | `recommend.ts` の段 4 の判定を `untouched` から別定義へ戻す | 段 4（未着手）の試験 1 本 |
| **B-10** | `result.ts` の `changes` を本文スコアだけで計算する | 「作者の問だけを解いた回でも習熟度の変化が出る」1 本 |

**B-3 が最重要である。**「データが無い項目は無かったことにする」は、**評価を無条件に甘い方向へ倒す**。
`every()` が空配列に `true` を返すのと**向きも構造も同じ誤り**であり、このプロジェクトが繰り返し踏んでいる型である。

### 5.2 試験の書き方（**この 4 点を守ること**）

1. **1 試験 1 目的**（計画 §12.3）。`assert` は最初の失敗で止まるため、1 本に複数の性質を詰めると
   **先に壊れた性質のせいで後の assert が一度も評価されない**（発注032 の F-1 の事故）。
2. **同じ番号を投げる分岐が複数ある場合、assert のメッセージ本文まで名指しする**（発注025 の誤報の原因）。
3. **fixture は 2 つの実装を区別できる値にする。**
   **発注034 の B-9 は、`p010:text` が 4・`p010:author` が 5 で最小値と先頭が一致していたため、
   正しく破壊したのに 16 件すべて緑のままだった。**
   本発注では **重みを掛けた結果が偶然一致しない値**を選ぶこと
   （例: 本文 65・作者 0 は 52。重みを入れ替えれば 13 になり、必ず区別できる）。
   **fixture を書いたら、その値で B-1・B-2・B-3 が本当に区別できるか手で確かめること。**
4. **`itemKey` は `<poemId>:text` / `<poemId>:author` の形である。**
   1 つの首が 2 項目を持つ fixture を必ず含めること。

### 5.3 実行環境の注意（Windows）

- **`--test` にディレクトリを渡すと動かない。** グロブを引用符つきで渡すこと。
  誤: `node --test tests/unit/` / 正: `node --experimental-strip-types --test "tests/unit/*.test.ts"`
- `git status --porcelain` は**改行の食い違いで内容差分 0 のファイルを拾う。** A-7 のとおり `git diff --stat` を使うこと。

---

## 6. 停止して報告する条件

次に当たったら、**自分で決めずに停止して報告すること。** 停止せず自分で規則を発明した場合は不合格とする。

| # | 条件 |
|---|---|
| **S-1** | `review/*.yaml` の中身を書く必要が出た |
| **S-2** | **新しい依存を入れる必要が出た**（`dependencies` を触る必要が出た）。**`exports` の追記は裁定 6 で許可済みであり、S-2 に当たらない** |
| **S-3** | `packages/shared/src/domain/mastery/{compute,rules.v1,color}.ts` または `tests/unit/mastery/` の既存試験を変更する必要が出た（**`recommend.ts` と `recommend.test.ts` の A-7 だけは裁定 1 で許可済み**） |
| **S-4** | `APP_SPEC` §8.2 と本発注書が食い違っていると判断した（**仕様が正である。勝手に寄せない**） |
| **S-5** | 裁定 1〜8 のいずれかが実装できないと判断した |
| **S-6** | `.tsx` を触らないと受入条件を満たせないと判断した |
| **S-7** | **破壊試験のどれかが「1 本も赤くならない」または「予告より多くを赤にする」** |
| **S-8** | §0.3 のハッシュが着手前に一致しない |

**S-7 は不合格ではない。** 発注書の予告が誤っていた例が過去に 5 件ある（030 の 2 件、032 の B-6、033 の C-4、034 の B-2・B-5）。
**隠さずに報告すれば、それは正しい仕事である。発注034 は B-9 でこれを怠った。**

---

## 7. 完了報告に含めること

**次の 8 項目をすべて書くこと。欠けた完了報告は差し戻す。**
**発注034 の完了報告はこの 8 項目のうち 7 項目が欠けており、差し戻し相当であった。**

1. §5 の A-1〜A-17 の**実測値**（「成功しました」ではなく、コマンドの出力の数値）
2. §5.1 の破壊試験 B-1〜B-10 について、**壊し方・赤くなった試験名・復元後のハッシュ一致**の 3 点を 1 件ずつ
3. **B-3 の結果を独立の節に書くこと**（受入の中心のため）
4. `git status --porcelain` の全文
5. `sha256sum packages/shared/src/domain/mastery/poem.ts packages/shared/src/domain/recommend/recommend.ts packages/hyakunin/src/domain/result.ts` の値
6. **独自に決めたことを 1 件残らず列挙する**（本発注書が指定していない判断をした箇所すべて）
7. **できなかったことがあれば、隠さずに書く。**「できませんでした」も実測で検証される
8. `tests/unit/mastery/poem.test.ts` と `tests/unit/result.test.ts` の**試験名の一覧**
   （`grep -o "test('[^']*'" <file>`）

**親担当は全コマンドを再実行し、破壊試験 10 本を自分で 1 件ずつ反転させて検収する。**
**報告の数値は転記しない。**
