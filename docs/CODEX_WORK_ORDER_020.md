# Codex向け発注文書 020: P5 の残り — 「次に確認する」の推薦（純関数）

発注日: 2026-08-31
階層: **Terra**（仕様は本書で確定済み。受入条件はすべて機械判定できる）
優先度: 高（**P5 の最後の 1 本**。P6「出題生成と選題」は P5 完了が前提である）
対象: `packages/shared/src/domain/recommend/`（**新規**）、`tests/unit/recommend/`（**新規**）

> **並行発注に関する注意。同時に次が走っている。衝突するファイルに触らないこと。**
>
> | 発注 | 階層 | 触っている領域 |
> |---|---|---|
> | 019 | Terra | `packages/shared/src/storage/db.ts`・`import.ts`、`tests/unit/storage/` |
>
> 本発注は `packages/shared/src/domain/recommend/` と `tests/unit/recommend/` の**外に出ない**。
> **`packages/shared/src/storage/` に触らない。** リポジトリ直下の `package.json` も変更しない。

---

## 0. この発注の位置づけ

| 発注 | 範囲 | 状態 |
|---|---|---|
| 018A | P5 習熟度の計算コア（`domain/mastery/`） | **検収済み（合格）。触るな** |
| **020（本書）** | P5 の推薦（`domain/recommend/`） | 本発注。**これで P5 が閉じる** |

**推薦の仕様は 2026-08-31 まで未定義であった**（懸案 H-16）。`docs/APP_SPEC.md` §8.2 は 3 軸、
`docs/LEARNING_SCIENCE_AUDIT.md`「推薦の優先順」は 4 段で、期限日数も「直近」も未定義だったためである。
**親担当が裁定 D-17 として確定させ、`APP_SPEC` §8.2 へ書き込んだ。本書はその実装である。**
仕様の正本は `APP_SPEC` §8.2 であり、本書と食い違ったら **`APP_SPEC` が勝つ**（§6 の S-5）。

### 基準線（2026-08-31 に親担当が自分で実測した値。転記ではない）

- `npm test` … **77 件 pass / 0 fail**、終了コード 0。本発注の完了時に**1 件も減っていてはならない**。

---

## 1. 先に読むもの

| 文書・ファイル | 読む箇所 | 何のために |
|---|---|---|
| `docs/APP_SPEC.md` | **§8.2 全体（D-17 の表を含む）** | **仕様の正本。5 段・期限表・同点規則・理由文・「該当なしなら出さない」** |
| `docs/APP_SPEC.md` | §8・§8.1 | 習熟度の色境界と、90 超えの「別の日の想起」の定義 |
| `docs/LEARNING_SCIENCE_AUDIT.md` | 「推薦の優先順」「間隔スケジュールの試験案」 | 日数 1・3・7・14 が**試験候補であって最適値ではない**こと |
| `packages/shared/src/domain/mastery/rules.v1.ts` | 全 57 行 | **`isRecallMethod` をそのまま使う。** 版番号つき定数の書き方の手本 |
| `packages/shared/src/domain/mastery/compute.ts` | 1〜40 行 | `computeMastery` の戻り値。**スコアは `itemKey` 単位である** |
| `packages/shared/src/domain/mastery/color.ts` | 全 22 行 | 色境界（0 / 30 / 60 / 85）。**同じ境界を再実装しない。この関数を使う** |
| `packages/shared/src/domain/event.ts` | 1〜27 行 | `Event` の全フィールドと `EventMethod` / `EventOutcome` の語彙 |
| `tests/unit/mastery/over-90.test.ts` | 全体 | 018A の試験の書き方の手本 |

---

## 2. 変更境界

### 新規作成するファイル

| ファイル | 内容 |
|---|---|
| `packages/shared/src/domain/recommend/rules.v1.ts` | 版番号と設計係数（期限日数・「直近」日数）だけを置く |
| `packages/shared/src/domain/recommend/recommend.ts` | 純関数 `recommendNext` |
| `tests/unit/recommend/recommend.test.ts` | 受入条件 A-1〜A-11 の試験 |
| `tests/unit/recommend/fixtures.ts` | 試験用のイベント生成（`tests/unit/mastery/fixtures.ts` の書き方に倣う） |

### 絶対に変更しないファイル・領域

- `packages/shared/src/domain/mastery/**`（018A の検収済み成果。**1 バイトも変えない**）
- `packages/shared/src/domain/event.ts`、`app-config.ts`
- `packages/shared/src/storage/**`（**発注019 が同時に触っている**）
- `packages/shared/src/ui/**`（**本発注は画面を作らない。**「次に確認する」の表示は P7 で接続する）
- `tools/**`、`.github/**`、`docs/**`、すべての `package.json`
- **新しい npm 依存を入れない**

---

## 3. 裁定済み事項（再検討しないこと）

| # | 裁定 | 出典 |
|---|---|---|
| 1 | **純関数である。** 内部で時刻・乱数・保存層に触らない。`Date.now` / `new Date` / `Math.random` / `toISOString` / `getUTC*` / `localStorage` / `indexedDB` を**書かない** | 018A と同じ契約。§5 の A-11 |
| 2 | **「今日」は引数で受け取る**（`'YYYY-MM-DD'` の文字列）。日付の差は**文字列から作った暦日の差**で求め、時分秒・時間帯を持ち込まない | D-15、`APP_SPEC` §8.1「日付変更だけを偽装する操作は用意しない」 |
| 3 | **提案は一件だけ。** 上位の段に該当があれば下位の段を見ない | `APP_SPEC` §8.2 |
| 4 | **該当なしなら提案を出さない。** 無理に一件を選ばない（戻り値 `undefined`） | `APP_SPEC` §8.2 |
| 5 | **首の習熟度は、その首に属する項目（`itemKey`）のスコアの最小値** | `APP_SPEC` §8.2（D-17） |
| 6 | **別の日の想起成功** = `isRecallMethod(effectiveMethod)` かつ `outcome === 'correct'` の事象が、**2 つ以上の異なる `localDate`** に存在すること。同じ日に何回成功しても「別の日」にはならない | `APP_SPEC` §8.1 の 90 超え条件と同じ考え方 |
| 7 | 期限日数 1・3・7・14 と「直近 3 日」は**試験運用で校正する設計係数**であり、`rules.v1.ts` に版番号つきで置く | `LEARNING_SCIENCE_AUDIT`「間隔スケジュールの試験案」 |
| 8 | **色の境界を再実装しない。** `masteryDisplay`（`domain/mastery/color.ts`）を呼んで帯を得る | 二重定義を作らないため |

---

## 4. 実装範囲

### 4.1 `recommend/rules.v1.ts`

```ts
export const RECOMMEND_RULES_VERSION = 1 as const;

/** 復習期限（日）。LEARNING_SCIENCE_AUDIT の初期試験候補 1・3・7・14。最適値ではない。 */
export const REVIEW_INTERVAL_DAYS = { red: 1, yellow: 3, blue: 7, green: 14 } as const;

/** 段 2 の「直近」。 */
export const RECENT_TROUBLE_DAYS = 3 as const;
```

**各定数に、根拠となる `APP_SPEC` §8.2 の行を引くコメントを付けること**（`mastery/rules.v1.ts` と同じ流儀）。

### 4.2 `recommend/recommend.ts`

```ts
export type RecommendTier = 1 | 2 | 3 | 4 | 5;

export type Recommendation = Readonly<{
  poemId: string;
  tier: RecommendTier;
  reason: string;
  percent: number;
}>;

export type RecommendInput = Readonly<{
  today: string;                              // 'YYYY-MM-DD'
  poemIds: readonly string[];                 // 対象範囲の首。番の昇順で渡される
  events: readonly Event[];                   // 対象範囲・対象 product のイベント全件
  scores: Readonly<Record<string, number>>;   // computeMastery(...).scores（itemKey 単位）
}>;

export function recommendNext(input: RecommendInput): Recommendation | undefined;
```

段の判定は `APP_SPEC` §8.2 の表のとおりとする。実装上の要点だけ書く。

1. 首ごとに次を集める。**イベント 0 件の首も対象に含める**（段 4 の候補になる）。
   - 属する `itemKey` のスコアの**最小値**（= 首の習熟度。項目が無ければ未着手）
   - 最後に学習した日（`localDate` の最大値）
   - **別の日の想起成功があるか**（裁定 6）
   - **直近 `RECENT_TROUBLE_DAYS` 日以内**に、`outcome === 'incorrect'`、または
     `effectiveMethod` が `'self-x'` / `'self-tri'` の事象があるか
     （**この一文は誤りであった。取り消す。** 正しくは「直近 N 日以内」＝ `today` からの暦日差が **N 以下**である。
     本書の受入条件 A-5 と食い違っていたもので、**A-5 が正しい**。**裁定 D-19**（2026-08-31・親担当。
     依頼者が判断を一任した）で確定し、定義は `APP_SPEC` §8.2 に置いた。**実装・試験の変更は不要である**）
2. 帯は `masteryDisplay(percent).color` で得る。`'gray'`（0%）でイベントがある首は
   **赤帯として扱う**（`APP_SPEC` §8.2「0% の扱い」）。
3. **期限超過** = `today` と最終学習日の暦日差が、帯の `REVIEW_INTERVAL_DAYS` **以上**。
4. 段の順に候補を探し、最初に見つかった段の中で
   **(1) 期限超過日数の降順 → (2) 習熟度の昇順 → (3) `poemIds` に現れる順** で 1 件を選ぶ。
   段 2〜4 は期限超過日数を持たないので (2) から比べる。
5. `reason` は `APP_SPEC` §8.2 の文言をそのまま使う。**期限や連続日数を数値で出さない。**
6. `masteryRulesVersion` が現行と異なるイベントは **`computeMastery` が既に除外している**。
   本関数はスコアを再計算しない。**`scores` を受け取って使うだけである。**

### 4.3 暦日差の求め方

**`new Date` を使わずに**、`'YYYY-MM-DD'` から年・月・日を取り出して通日へ直す小さな純関数を書く
（グレゴリオ暦の日数計算。うるう年を含む）。関数は `recommend.ts` の内部に置き、export しない。
**時間帯・時刻・`Date` を一切通さない**ことが、この方式の目的である（§5 の A-11）。

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | 段 1 が段 2〜5 より優先される（段 1 と段 2 の候補が同時に存在するとき、段 1 が返る） | `recommend.test.ts` |
| A-2 | 段 2 が段 3・4・5 より優先される | 同上 |
| A-3 | 段 3 が段 4・5 より優先され、段 4 が段 5 より優先される | 同上 |
| A-4 | **期限がちょうどの日は超過とみなす**（赤帯・最終学習日から 1 日後で段に入り、0 日後では入らない）。黄 3・青 7・緑 14 も同様に**境界の両側**を試す | 同上。**境界ちょうどを固定する試験を帯ごとに 1 件ずつ書く** |
| A-5 | 「直近 3 日以内」の境界を固定する（3 日前の不正解は段 2、4 日前は段 2 でない） | 同上 |
| A-6 | 同じ日に何度想起成功しても「別の日の想起成功」にならない | 同上 |
| A-7 | 首の習熟度が**属する項目の最小値**である（`p001:text` 90 / `p001:author` 10 の首は 10 として扱われる） | 同上 |
| A-8 | 同点のとき (1) 期限超過日数の降順 → (2) 習熟度の昇順 → (3) 番の昇順 で決まる。**同じ入力で常に同じ結果**である | 同上。同じ入力で 100 回呼んで結果が一致すること |
| A-9 | 範囲内のすべてが期限内かつ別日想起済みのとき **`undefined`** を返す | 同上 |
| A-10 | イベントが 1 件も無い首だけの範囲では、段 4 として**番の昇順で先頭**が返る | 同上 |
| A-11 | `packages/shared/src/domain/recommend/` の全ファイルに、`Date.now` / `new Date` / `Math.random` / `toISOString` / `getUTC` / `localStorage` / `indexedDB` の**いずれも現れない** | `grep -rE 'Date\.now\|new Date\|Math\.random\|toISOString\|getUTC\|localStorage\|indexedDB' packages/shared/src/domain/recommend/` の一致件数が 0 |
| A-12 | `npm test` / `npm run typecheck` / `npm run lint` がいずれも終了コード 0。試験件数が **77 件から減っていない** | 各コマンド |
| A-13 | `packages/shared/src/domain/mastery/` の 3 ファイルが**変更されていない** | `sha256sum` が着手前と一致 |

### 5.1 破壊試験（**受入の中心。論理を 1 箇所ずつ反転させる**）

**ファイルを消す形の破壊試験は認めない。** 「消したら落ちた」は、検査が**存在**することしか示さない。
**実装の論理を 1 箇所だけ反転させ、対応する試験が名指しで赤くなること**を示す。
手本は `docs/PROGRESS_2026-08-31.md` 第6回記録 §6.2 の E-1〜E-5 である。

| # | 反転させる論理 | 赤くなるべき試験 |
|---|---|---|
| **B-1** | 期限超過の判定を「以上」から「より大きい」へ変える | A-4（帯ごとの境界試験） |
| **B-2** | `REVIEW_INTERVAL_DAYS.blue` を `7` から `8` へ変える | A-4 の青帯 |
| **B-3** | 段 1 と段 2 の判定順を入れ替える | A-1 |
| **B-4** | 首の習熟度を「最小値」から「最大値」へ変える | A-7 |
| **B-5** | 「別の日の想起成功」の判定から**別日条件を外す**（同じ日の 2 回で成立させる） | A-6 と、段 1・3 の試験 |
| **B-6** | `RECENT_TROUBLE_DAYS` を `3` から `4` へ変える | A-5 |

**報告には、B-1〜B-6 それぞれについて「赤くなった試験名」を書くこと。**
反転後に**どの試験も赤くならなかった場合、その試験は証明力を持っていない**。
その旨を報告し、試験を書き直すこと。**「全部緑でした」だけの報告は受け付けない。**
**反転させた実装は必ず元へ戻し、戻した後の `sha256sum` を報告に含める。**

### 5.2 実行環境の既知の注意（Windows）

- `npm test` は node:test を直接使う。ブラウザは要らない。
- **`npm run check:overflow` は走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| **S-1** | 画面（`ui/`）に接続したくなったとき。**本発注は純関数までである。P7 で接続する** |
| **S-2** | `domain/mastery/` を変更しないと実装できないと判断したとき |
| **S-3** | `storage/` を読む必要があると判断したとき。**推薦は保存層を知らない。引数で受け取る** |
| **S-4** | 新しい npm 依存が必要だと判断したとき |
| **S-5** | **`APP_SPEC` §8.2 と本書が食い違うと気づいたとき。`APP_SPEC` が正本である。従わずに報告する** |
| **S-6** | 既存 77 件のいずれかが赤くなり、その原因が本発注の変更にあると判断したとき |
| **S-7** | 期限日数や「直近」の値を、根拠なく変えたくなったとき。**設計係数であり、変えるのは試験運用（H-06）の結果を見てからである** |

---

## 7. 完了報告に含めること

1. 変更・追加したファイルの一覧（**それ以外を触っていないことの申告**）。
2. `npm test` の**末尾 10 行をそのまま**（`ℹ tests` / `ℹ pass` / `ℹ fail` の行を含む）。件数を文章で言い換えない。
3. `npm run typecheck` と `npm run lint` の終了コード。
4. A-11 の `grep` の**実際の出力**（0 件であること）。
5. A-13 の `sha256sum`（`domain/mastery/` の 3 ファイル）。
6. **B-1〜B-6 の破壊試験それぞれについて、赤くなった試験名。** 赤くならなかったものはそう書く。
7. 反転を戻した後の `recommend.ts` と `rules.v1.ts` の `sha256sum`。
8. **判断に迷って自分で決めた箇所があれば、その一覧と理由。** 黙って決めない。
