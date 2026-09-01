# Codex向け発注文書 018: P5 習熟度エンジン（純関数・規則版 1）

発注日: 2026-08-31
階層: **Terra**（学習上の有効性に直結し、誤りが静かに効く領域）
優先度: 高（P6 出題・P7 学習画面・P8 結果がここに依存する。最長経路上）
対象: `packages/shared/src/domain/mastery/`（新規）、`packages/hyakunin/src/domain/recommend.ts`（新規）、`tests/unit/mastery/`（新規）、`tests/unit/recommend.test.ts`（新規）

> **並行発注に関する注意**: 発注012 が同時に走る可能性がある。012 の対象は
> `packages/shared/src/storage/`（`export` / `import` / `merge` / `reset`）と
> `packages/shared/src/ui/screens/Transfer.tsx` と `tests/unit/storage/` である。
> **本発注は `packages/shared/src/storage/` に一切触らない**（§3 の裁定 A）。重なるファイルは無い。
> `package.json` は**本発注では一切変更しない**。

---

## 0. この発注の位置づけ

`docs/IMPLEMENTATION_PLAN.md` §10 の **P5 習熟度エンジン**（概算規模 中・3〜5 日）である。

前提の `Event` 型は**発注009 で確定し、検収済み**である（`packages/shared/src/domain/event.ts`）。
**P4 後半（発注012）の完了を待つ必要はない。** 書き出し・取り込みは習熟度計算に関与しない。

---

## 1. 先に読むもの

| 順 | 文書・ファイル | 確認すること |
|---|---|---|
| 1 | `docs/HANDOFF.md` §3「絶対に守ること」・§10.5 | 境界と決定権。**このファイルは変更しない** |
| 2 | `CONSTITUTION.md` §2 | 「閲覧だけで高い習熟度に到達させない」 |
| 3 | **`docs/APP_SPEC.md` §8.1・§8.2** | **係数・上限・減分・ヒント一段下げ・90 超・提案順の正本。ここの値をそのまま写す** |
| 4 | `docs/APP_SPEC.md` §15 の 7 番 | 受入条件の原文 |
| 5 | `docs/LEARNING_SCIENCE_AUDIT.md`「承認済みの初期係数」「推薦の優先順」「表示％の扱い」 | 係数の根拠と限界。**推薦の優先順 4 段の正本** |
| 6 | `docs/IMPLEMENTATION_PLAN.md` §6.3（裁定 D-01）・§6.4・§10 の P5 | 粒度と適用順。**§10 は長いので P5 の節だけを範囲指定で読む** |
| 7 | **`packages/shared/src/domain/event.ts` 全文** | `Event` の実際の欄。**発明しない。この型に合わせる** |
| 8 | `packages/shared/src/app-config.ts` | `ProductId` の語彙 |
| 9 | `tests/unit/*.test.ts` | 既存テストの書式（`node:test` + `node:assert/strict`） |

---

## 2. 変更境界

### 変更してよいファイル

```text
packages/shared/src/domain/mastery/rules.v1.ts   （新規）係数・上限・減分・一段下げの表
packages/shared/src/domain/mastery/compute.ts    （新規）Event[] → 0〜100 の純関数
packages/shared/src/domain/mastery/color.ts      （新規）5 色境界と表示値
packages/shared/package.json                     （exports の追加のみ）
packages/hyakunin/src/domain/recommend.ts        （新規）推薦（首単位・製品固有）
tests/unit/mastery/**                            （新規）
tests/unit/recommend.test.ts                     （新規）
```

### 絶対に変更しないファイル・領域

```text
docs/**                                （裁定は済んでいる。自分で書き換えない。停止条件でも編集しない）
CONSTITUTION.md
一次データの .md（百人一首_*.md / 古典文法_*.md / 仮名遣い規則_*.md）
package.json                           （scripts も dependencies も触らない）
package-lock.json
packages/shared/src/storage/**         （発注012 の担当。§3 の裁定 A）
packages/shared/src/domain/event.ts    （発注009 の成果。検収済み。触らない）
packages/shared/src/ui/**              （画面は本発注の対象外）
packages/*/src/data/**                 （生成物とスキーマ）
packages/*/public/**
tools/**  .github/**  tests/data/**  tests/unit/storage/**
```

`git commit` / `git push` をしない。既存の未コミット変更を消去・復元・上書きしない。
新しい npm 依存を足さない。

---

## 3. 裁定済み事項（再検討しないこと）

| # | 裁定 | 根拠 |
|---|---|---|
| **A** | **保存層に一切触らない。** `repo/events.ts` に `itemKey` インデックスを足さない。`db.ts` を変えない。計画 §10 P5 の「変更: `repo/events.ts`（itemKey インデックス）」は**本発注の範囲から外す**。性能上必要になった時点で別発注にする | 親担当裁定 2026-08-31。発注012 が同じ木で `storage/` を触るため。またインデックスが無くても計算はできる |
| **B** | **`compute` は `Event.delta` を使わない。** `delta` は「そのとき規則が何と言ったか」の記録であって、計算の入力ではない。`delta` を合計する実装にすると、計画 §10 P5 の実施内容5「**規則版更新時の全再計算**」が原理的に不可能になる | 親担当裁定 2026-08-31。P5 の受入条件「習熟度が保存値ではなくイベント列から導出されている」の要 |
| **C** | **`compute` の入力に使ってよい `Event` の欄は次だけである。**<br>`itemKey` / `sessionId` / `questionId` / `kind` / `method` / `effectiveMethod` / `outcome` / `hintUsed` / `sameSessionRepeat` / `localDate` / `masteryRulesVersion`<br>**`delta` と `poemId` は使わない**（`poemId` は百人一首固有。集計の鍵は `itemKey`） | 裁定 B と D-01（計画 §6.3） |
| **D** | **集計の鍵は `itemKey` である。`poemId` ではない。** 百人一首は `poemId × skill`、仮名遣いは `wordId`。`compute` は製品を知らなくてよい | 裁定 D-01（計画 §6.3、ADR-0004） |
| **E** | **「別の日」の判定は `Event.localDate` の文字列比較で行う。** タイムスタンプから日付を導出しない。`toISOString()` を使わない | 発注009 が `localDate`（利用者のローカル日付）を保存済み。**UTC で日付を導出すると、日本の利用者にとって同じ日が別日になる**（JST は UTC+9 で 09:00 に日付が変わる）。2026-08-31 に `data:check` で実際にこの罠を踏んでいる |
| **F** | **現在時刻を実装内部で直接読まない。** `Date.now()` / `new Date()` を `domain/` の中で呼ばない。「今日」が必要な関数（推薦の未確認日数）は**引数で受け取る** | 発注009 の裁定5 の継続。再現可能な試験のため |
| **G** | **ヒント一段下げの結果は `Event.effectiveMethod` に既に入っている。** `compute` は `effectiveMethod` を見る。ただし `rules.v1.ts` は**下げの写像そのものも輸出する**（イベントを書く側が使う）。写像は `free-input → kanji-to-kana → choice → self-tri → view`、**下限は `view`**（APP_SPEC §8.1 の「自由入力→漢字候補→選択→△→閲覧」。`self-o` とした旧記述は2026-08-31の018A検収で訂正） | APP_SPEC §8.1・`event.ts` の実際の欄 |
| **H** | **係数・上限・減分は `docs/APP_SPEC.md` §8.1 の値をそのまま写す。コード側で再定義・再解釈しない。** 表と食い違う値を書いたら不合格である | 計画 §10 P5 の実施内容1 |
| **I** | **`rules.v1.ts` は規則版 1 として凍結する。** 版を上げる仕組み（`rules.v2.ts`）は本発注では作らない。`masteryRulesVersion` の値 `1` を定数として持ち、`compute` は入力イベントの `masteryRulesVersion` が `1` でない場合の扱いを**呼び出し側へ返す**（自分で握りつぶさない） | 計画 §10 P5 の実施内容5 |
| **J** | **推薦（`recommend.ts`）は `packages/hyakunin` に置く。** 共有層に置かない | 計画 §4.2・§10 P5（推薦は首単位・製品固有） |
| **K** | **`color.ts` は 5 色境界と表示値を返すが、色名だけを返してはならない。** ％の数値と、色に依存しない文言を同時に返す形にする | 憲章 §8・APP_SPEC §8「色覚だけに依存しない」 |
| **L** | **固定した短い段階名を付けない。** 「初級」「習得済み」のような段階名を定数として持たない | 確定事項 F-11（計画 §1.2）、APP_SPEC §8 |

---

## 4. 実装範囲

### 4.1 `rules.v1.ts`

`docs/APP_SPEC.md` §8.1 の表を定数として持つ。**表の値をそのまま写すこと。**

- 各方式の**増分**と**上限**。
- **不正解の減分**（選択式またはヒント後 `−3` / 漢字候補→ひらがな `−4` / 自由入力・紙手書き `−5`）。
- **同一回の 2 回目以降は加点を切り捨て半分**。**減点は半分にしない**（APP_SPEC §8.1 の本文）。
- **0 未満にしない。表示上限は 100。**
- **ヒント一段下げの写像**（裁定 G）。
- **90 超の条件**: 90 到達後、**別の日**に `free-input` / `paper-handwriting`（または同等の確認済み想起）を
  `correct` で終えたときだけ 90 を超えられる。**同一日の想起では 90 を超えない。**
- `MASTERY_RULES_VERSION = 1`。

**表の各行に、APP_SPEC §8.1 のどの行から写したかを 1 行コメントで添えること。**

### 4.2 `compute.ts`

`Event[]` を受け取り、`itemKey` ごとの 0〜100 を返す純関数。適用順は計画 §6.4 に従う。

- 入力に使ってよい欄は裁定 C のとおり。**`delta` を読まない。**
- 同一 `(sessionId, questionId)` の 2 回目以降を半分にする判定は、`Event.sameSessionRepeat` を見る。
  **ただし `sameSessionRepeat` が無い／偽のときに自分で `(sessionId, questionId)` から導出する経路も持つこと**
  （書き手側の付け忘れで静かに満点が出るのを防ぐ）。**どちらを優先するかを §7 に書くこと。**
- **時間経過だけで％が下がらない。** 減衰を実装しない。
- 副作用を持たない。ファイル・保存層・時刻・乱数に触らない。

### 4.3 `color.ts`

- 5 色境界と、％の数値、色に依存しない文言を返す（裁定 K・L）。
- 境界値そのもの（境界ちょうどの％）がどちらの色に入るかを**明示的に決め、テストで固定すること**。

### 4.4 `recommend.ts`（`packages/hyakunin`）

`docs/LEARNING_SCIENCE_AUDIT.md`「推薦の優先順」と APP_SPEC §8.2 に従う。

- 優先順の段を順に適用する。**同点は番の昇順。**
- **一度に 1 件だけ返す。**
- 「未確認日数」は **`localDate` と、引数で受け取った「今日」の日付文字列**から求める（裁定 E・F）。
- 該当が無いときに何を返すかを決め、テストで固定する。

---

## 5. 受入条件（すべてコマンドで機械判定すること）

テストは計画 §10 P5 の指定どおり **suite を目的別に分ける。1 本に集約しない。**

| # | 条件 | 判定 | 書くべき観測値 |
|---|---|---|---|
| 1 | `increments` | 閲覧 +1 / 見るだけ ×△○ +1/+2/+3 / 選択式 +5 / 漢字候補→ひらがな +7 / 自由入力 +9 / 紙手書き +9 | テスト名と件数 |
| 2 | `caps` | 上限 20 / 20 / 30 / 35 / 65 / 80 / 90 / 90 が各方式で効く。**閲覧だけを 100 回繰り返しても 20 を超えない** | 同上 |
| 3 | `decrements` | −3 / −4 / −5。**0 未満にならない** | 同上 |
| 4 | `same-session` | 同一 `(sessionId, questionId)` の 2 回目以降が切り捨て半分。**減点は半分にならない。** 別問題は通常どおり加算 | 同上 |
| 5 | `hint-downgrade` | 一段下げの写像。**下限が `view`。ヒントだけの正答が自力正答の加分にならない** | 同上 |
| 6 | `over-90` | **同一日の想起では 90 を超えない。** 別日かつ `free-input` / `paper-handwriting` の正答でのみ超える。表示上限 100 | 同上 |
| 7 | `recompute` | 規則版を上げて全再計算しても**イベントが失われない**。`delta` を書き換えても計算結果が変わらない（裁定 B の実証） | 同上 |
| 8 | `recommend` | 優先順の段の順序、同点時の番昇順、**1 件のみ返す** | 同上 |
| 9 | **保存値を直接書く経路が存在しない** | `grep -rn "delta" packages/shared/src/domain/mastery/ packages/hyakunin/src/domain/recommend.ts` | 出力全文。**`delta` を読む行が 1 つも無いこと** |
| 10 | **時刻・乱数に触らない** | `grep -rnE "Date\.now\|new Date\|Math\.random" packages/shared/src/domain/mastery/ packages/hyakunin/src/domain/recommend.ts` | 出力全文。**0 件であること** |
| 11 | **UTC で日付を導出していない** | `grep -rn "toISOString\|getUTC" packages/shared/src/domain/mastery/ packages/hyakunin/src/domain/recommend.ts` | 出力全文。**0 件であること**（裁定 E） |
| 12 | **段階名を持っていない** | `color.ts` を読む | 固定の段階名の定数が無いこと（裁定 L） |
| 13 | 既存テストと追加テストが緑 | `npm test` | **着手時の件数と完了時の件数の両方を書くこと** |
| 14 | 他のゲートが壊れていない | `npm run typecheck && npm run lint && npm run build && npm run data:check && npm run scan:publish` | すべて終了コード 0 |
| 15 | 変更境界を守っている | `git status --short` | 出力全文。**`docs/**`・`package.json`・`packages/shared/src/storage/**`・`tools/**`・`.github/**` に差分が無いこと** |

### 5.1 破壊試験（受入条件に含める）

| # | 壊す内容 | 期待 |
|---|---|---|
| B-1 | `rules.v1.ts` の「閲覧」の上限 20 を 100 に変える | `caps` が**赤くなる** |
| B-2 | 同一回の半分処理を外す | `same-session` が**赤くなる** |
| B-3 | 90 超の「別日」条件を外す | `over-90` が**赤くなる** |
| B-4 | 入力イベントの `delta` を全件 `9999` に書き換える（テスト内で） | **計算結果が変わらない**（裁定 B の実証） |

**すべて 1 件ずつ行い、実行後に必ず復元し、`git diff` で復元を確かめること。**

---

## 6. 停止条件

**停止したら `docs/` を自分で編集せず、報告に書いて止まること。**

| # | 条件 | 対応 |
|---|---|---|
| S-A | `docs/APP_SPEC.md` §8.1・§8.2 に**書かれていない**係数・境界・優先順が必要だと判明した | **停止。推測で埋めない。** 何が足りないかを具体的に報告する |
| S-B | APP_SPEC §8.1 と `docs/LEARNING_SCIENCE_AUDIT.md` の記述が**食い違っている** | 停止。両方の原文を引用して報告する。**どちらかを勝手に採らない** |
| S-C | `packages/shared/src/domain/event.ts` の欄が足りず、計算に必要な情報が取れない | 停止。**`event.ts` を自分で変更しない**（発注009 の検収済み成果である） |
| S-D | `packages/shared/src/storage/**` を変更する必要が出た | **直ちに停止。** 発注012 と衝突する |
| S-E | 破壊試験の復元に失敗した、または `git diff` が一致しない | **直ちに停止。** 何を壊し、どこまで戻したかを正確に報告する |
| S-F | 新しい npm 依存が必要になった | 停止。何が必要かを報告する |
| S-G | `package.json` / `docs/**` / `tools/**` / `.github/**` を変更する必要が出た | 停止。理由を報告する |
| S-H | 他発注の作業中の変更で無関係なコマンドが落ちた | **自分で直さない。** 落ちたコマンドと出力をそのまま報告して停止する |

---

## 7. 報告に必ず書くこと

1. **受入条件 1〜15 の判定を 1 件ずつ**。観測した実測値・件数・終了コードを添える。
2. **破壊試験 B-1〜B-4 の記録**。壊した内容・観測した赤・**復元の確認方法と結果**。
3. **`rules.v1.ts` に写した係数の全表**（イベント／増分／上限／減分／`APP_SPEC` §8.1 の出典行）。
   **親担当が APP_SPEC と突き合わせるための資料である。省略しないこと。**
4. **`sameSessionRepeat` と `(sessionId, questionId)` からの導出の、どちらを優先したか**と理由（§4.2）。
5. **`color.ts` の 5 色境界と、境界ちょうどの値がどちらに入るか。**
6. **`recommend.ts` の優先順の段と、該当が無いときの戻り値。**
7. **独自に決めたことを全件。無ければ「なし」と明記すること。**
8. `git status --short` の全文。

---

- 実行していない検査を「成功」と書かないこと。
- 一度も実行できていないコードを完成として報告しないこと。
- 検査ツールは、完走しなかったときに合格を出してはならない。
