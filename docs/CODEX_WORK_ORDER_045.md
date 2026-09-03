# 発注045（`isStatsPayload` に残った同型の穴 12 個を塞ぐ・試験だけを足す）

- **宛先**: Terra（Codex）
- **起票**: 2026-09-03・第27回・親担当（Claude Opus 5）
- **前提コミット**: `4b74225`（**作業ツリーは clean ではない。下の §0.4 を必ず読むこと**）
- **フェーズ**: P9-A の是正。**新機能は無い**
- **規模**: 小（**1 ファイルに試験を 12 本足すだけ**）

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を直すか

**発注044 は検収に合格した。この発注でも実装は 1 行も変えない。**
直すのは **`tests/unit/telemetry/registry.test.ts` だけ**である。

044 の検収で、親担当が発注書の 5 件とは別に破壊試験を 14 件回したところ、
**044・043 が塞いだのと同じ型の穴が、`isStatsPayload` の中に 12 個残っていた。**
**14 件すべてが `4b74225`（044 合格後）で 378/378 全緑だった。実装を弱めても誰も気づかない。**

**誤りの型は 1 つである——同じ形の節が横に並んでいて、釘が代表の 1 本にしか刺さっていない。**

| 並んでいるもの | 釘が刺さっている側 | 腐っている側 |
|---|---|---|
| 計数表 3 つ（`buttonCounts` / `entryCounts` / `questionTypeCounts`） | **`buttonCounts` だけ**（W-5・X-3・X-4） | `entryCounts`・`questionTypeCounts` は allowlist も整数検査も **0 本** |
| 版番号 2 つ（`dataVersion` / `masteryRulesVersion`） | **`dataVersion` だけ**（X-3） | `masteryRulesVersion` は **0 本** |
| 習熟度 2 つの `typeof number` | **どちらも 0 本**（X-5 は範囲だけを見ており、`typeof` を消しても緑） | `masteryAvg`・`masteryMax` |
| 型の見張り（`product` / `isOfficial` / `appVersion` / `grade` / `masteryDistribution` の `Array.isArray`） | **0 本** | 全部 |

**042 の裁定 2 が 17 キーに置いた制約のうち、試験が守っているのは一部にすぎない。**
**043 §0.1・044 §0.1 とまったく同じ話が、同じ関数の中で 12 回起きている。**

### 0.2 実測で確かめた事実（**設計の前提。再調査しなくてよい**）

**親担当が `4b74225` で実測した。**

| # | 事実 | 実測値 |
|---|---|---|
| 1 | 着手前の基準線 | `test:node` **378/378/0**、`test:screen` **12 files / 88 passed**、`scan:publish` **751 件 / 違反 0** |
| 2 | `typecheck` `lint` `data:check` `build` `scan:publish` | **すべて終了コード 0** |
| 3 | §5.1 の破壊 **E-1〜E-14 の 14 件すべて**を `4b74225` に当てると | **14 件とも 378/378 全緑**（＝穴は 12 個とも実在する） |
| 4 | 参照実装（下の Z-1〜Z-12）を当てると | **390/390/0**、`typecheck` `lint` `data:check` `build` 0、`test:screen` 12 files / 88 passed、`scan:publish` 751 件 / 違反 0 |
| 5 | `isObject` から `!Array.isArray(value)` を外しても全緑だが、**これは等価変異である** | `hasOnly` が配列を必ず弾く。**穴ではない。直そうとしないこと**（044 §0.2 と同じ） |

### 0.3 変更してはならないファイルの SHA-256（`sha256sum -c` に流せる）

```
4026c77a2c36bbc0ec4568e409227039701da54c7d550f3df0db0e3eb3d8fbe2 *packages/shared/src/telemetry/client-number.ts
bfd407bbf800dfec761cbdc1771f47f1ab7c299f58da6a61f465b876550feb20 *packages/shared/src/telemetry/queue.ts
bb6014014d6960c0da2ade7c1e27bec77efcb3c8630ff02263d569b09179e8b7 *packages/shared/src/telemetry/registry.ts
73891ee555ce19ca540bf6cb87508ff3c5ccabd738fd93e4da9e3d6344f1faf7 *packages/shared/src/telemetry/sanitize.ts
207ac60c33d467651919ffd6549ba062cc12b2485d59be44862f558efca017e0 *packages/shared/src/domain/event.ts
9c264f7b884fad23f4b47e1912d1a7cbba23c1a434aa137d1a43604f4ff006c4 *packages/shared/src/storage/repo/outbox.ts
936a87717f33872c34a22c64b9a1e08b7a6f9c37391bd9eb80b9a493f27bd5fa *packages/shared/src/storage/repo/settings.ts
038d0588fd71f056a6065a870205bfe1587f1ed6cd7d106a3e0e5789f37c9a3a *packages/shared/src/storage/reset.ts
69c1228a3013669baee2230c1268feaeefa0b8ea61bbd4b18e194f13e9b00697 *packages/shared/src/storage/import.ts
e84602e0e5026b8747fcf311a4b949a28079c87b943f3f3a7f4034471590a94b *packages/shared/src/storage/export.ts
cdd20f59d50477ace6971fb9a081767998b11852438ef3ca7866c1a984128aba *packages/shared/src/app-config.ts
65436b90add6455b73ff5ca2897716fd68e8fbfaa7db8d71909d653f4d2ca2ff *packages/shared/package.json
66abc9e04ae15b7a64463da6aeded1b687c097d0a80e5ff09c5e64807cbd278a *packages/shared/src/storage/schema.ts
f679ced6dfca36b6741d1b5623386ec9df66d7fc38c763b464e0e8c70ed71ee3 *tests/unit/telemetry/client-number.test.ts
3b01db70d1640c91c728f114c8f03b4fb4d93989a86b2d03f0a77bf0b9fb71d6 *tests/unit/telemetry/static.test.ts
2753d66ddf4e20e1587ed5096fdd9c07db4a6d6b291ef4e2347e47c5df5913aa *tests/unit/telemetry/queue.test.ts
c5b2da11146411e4f956e7aba3852b2a087220646c101b04e810d382069e25e6 *tests/unit/telemetry/fixtures.ts
```

**この 17 件が 1 バイトでも動いたら、それは変更境界の逸脱である。**
**とくに `registry.ts` を直したくなったら、それは S-2 である。**

### 0.4 着手前に読む・**作業ツリーの状態について**

**`docs/HANDOFF.md` が未コミットで変更されている。これは異常ではない。**
**別セッション（H-05／H-08 の担当）が同じファイルを並行して書いている。**

- **`docs/HANDOFF.md` に触らないこと。** 読むのはよい。**1 文字も書き換えない**（§1 のとおり `docs/**` は変更禁止である）。
- **`git status --porcelain -uall` に `M docs/HANDOFF.md` が出ていても、それは S-1 ではない。**
- **`packages/` と `tests/` に未コミットの変更があったら、それは S-1 である**（§0.3 のハッシュで判定する）。
- **完了報告の `git status` には、`docs/HANDOFF.md` の行が残っていてよい。**
  **`git diff --name-only` の判定（A-6・g）は、`docs/HANDOFF.md` を除いた上で数えること**（§5.0 参照）。

---

## 1. 変更境界

### 変更してよいファイル（**1 つだけ**）

```
tests/unit/telemetry/registry.test.ts
```

### 新規作成してよいファイル

**無い。1 つも無い。**

### 絶対に変更しない・作らないもの

| 対象 | 理由 |
|---|---|
| §0.3 の 17 ファイル | **実装は検収に合格している。試験の穴を実装で埋めない** |
| `packages/` 配下すべて | **この発注は `packages/` を 1 バイトも動かさない**（A-7） |
| `tests/unit/telemetry/fixtures.ts` | **fixture は 043 で非退化にした。もう触らない。Z-1〜Z-12 は fixture を土台に使うが、値は試験の中で上書きする** |
| `docs/**` | **この発注書を含め、文書は 1 文字も書き換えない。`docs/HANDOFF.md` は別セッションが書いている**（§0.4） |
| 既存の W-1〜W-28・X-1〜X-9・Y-1〜Y-2 の**名前とアサーション** | **消さない・書き換えない。足すだけである** |

---

## 2. 先に読むもの

| 資料 | 見る箇所 |
|---|---|
| `docs/CODEX_WORK_ORDER_044.md` | **§3 の裁定 3・4**（1 本が 1 つの穴に対応する／文字列でない値の扱い）、**§5.1**（破壊試験の読み方） |
| `docs/CODEX_WORK_ORDER_042.md` | **§3 の裁定 2**（17 キーとその制約）。**Z-1〜Z-12 が守るのは、この裁定が置いた制約である** |
| `packages/shared/src/telemetry/registry.ts` | **`isStatsPayload` の `return` 式を上から下まで 1 節ずつ読み、「この節を消したら赤くなる試験があるか」を自分で数えること** |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: 新規試験の名前は `Z-` で始める

044 が `Y-` を使ったので次の記号にする。**`Z-1` 〜 `Z-12` のちょうど 12 本**。
**種別を試験名のコメントに書くこと**（042〜044 と同じ形式）。**12 本とも「弁別的」である。**

### 裁定 2: 1 本が 1 つの節に対応する。混ぜない

**044 の裁定 3 と同じである。**
`entryCounts` の allowlist と整数検査は**別の試験**にする（Z-1 と Z-2）。
`questionTypeCounts` も同様（Z-3 と Z-4）。**混ぜると E-1〜E-4 で切り分けられなくなる。**

**逆に、`Z-2` の中で「負」と「非整数」を 1 本にまとめるのは正しい。**
**この 2 つは `every(isNonNegativeInteger)` という同じ 1 節が守っており、それを分ける破壊が存在しないからである。**

### 裁定 3: `true` のアサーションを足さない

**044 §4.1 と同じ。正しい値が通ることは W-4 が既に固定している。**
**Z-1〜Z-12 に `true` のアサーションを足さないこと**（足すと、緩める破壊ときつくする破壊の両方で赤くなり、切り分けが鈍る）。

### 裁定 4: `product` の 2 値は列挙のままにする。実装を配列へ寄せない

`(value.product === 'hyakunin' || value.product === 'kanazukai')` を
`['hyakunin', 'kanazukai'].includes(...)` へ書き換える整理は、**筋としては正しいが、この発注ではやらない**（044 の裁定 2 と同じ理由——**釘を打つ前に部材を動かさない**）。
**親担当は、その整理が Z-6 と衝突しないことを先に実測してある**（§5.1 の F-1）。**Z-6 は正しい実装を赤にしない。**

### 裁定 5: `masteryDistribution` の Z-12 は、赤の出方を問わない

**E-12（`Array.isArray` を外す）を当てると、`.every` を持たない値で実装が例外を投げる。**
**Z-12 は「アサーション失敗」でも「例外送出」でも、赤であればよい。**
**現在の正しい実装は `&&` の短絡で `false` を返すだけで、例外を投げない**（親担当が実測）。
**Z-12 を `assert.throws` で書かないこと。`assert.equal(..., false)` で書く。**

---

## 4. 実装範囲

### 4.1 `tests/unit/telemetry/registry.test.ts`（変更）

**ファイルの末尾に 12 本足す。既存の行は 1 つも動かさない。**
**すべて `payload()` を土台に、表のキーだけを差し替える。**

| # | 名前 | 差し替えるキーと値 | 期待 | 種別 |
|---|---|---|---|---|
| **Z-1** | `registry: entryCounts に一覧外のキーがあれば弾く` | `entryCounts` に既存 5 キー＋ `custom: 0` | `false` | 弁別的 |
| **Z-2** | `registry: entryCounts の計数が負または非整数なら弾く` | `entryCounts.quick` に `-1` / `0.5` | 2 個とも `false` | 弁別的 |
| **Z-3** | `registry: questionTypeCounts に一覧外のキーがあれば弾く` | `questionTypeCounts` に既存 2 キー＋ `custom: 0` | `false` | 弁別的 |
| **Z-4** | `registry: questionTypeCounts の計数が負または非整数なら弾く` | `questionTypeCounts.blank` に `-1` / `0.5` | 2 個とも `false` | 弁別的 |
| **Z-5** | `registry: masteryRulesVersion が負または非整数なら弾く` | `masteryRulesVersion` に `-1` / `0.5` | 2 個とも `false` | 弁別的 |
| **Z-6** | `registry: product が定められた 2 値でなければ弾く` | `product` に `''` / `'HYAKUNIN'` / `'hyakunin '` / `'other'` / `1` / `null` | 6 個とも `false` | 弁別的 |
| **Z-7** | `registry: isOfficial が真偽値でなければ弾く` | `isOfficial` に `'true'` / `1` / `0` / `null` | 4 個とも `false` | 弁別的 |
| **Z-8** | `registry: appVersion が文字列でなければ弾く` | `appVersion` に `1` / `null` / `true` | 3 個とも `false` | 弁別的 |
| **Z-9** | `registry: grade が文字列でなければ弾く` | `grade` に `1` / `null` / `true` | 3 個とも `false` | 弁別的 |
| **Z-10** | `registry: masteryAvg が数値でなければ弾く` | `masteryAvg` に `'50'` / `null` / `true` | 3 個とも `false` | 弁別的 |
| **Z-11** | `registry: masteryMax が数値でなければ弾く` | `masteryMax` に `'50'` / `null` / `true` | 3 個とも `false` | 弁別的 |
| **Z-12** | `registry: masteryDistribution が配列でなければ弾く` | `masteryDistribution` に `null` / `'43125'` / `{ length: 5 }` | 3 個とも `false` | 弁別的 |

**Z-6・Z-7・Z-10・Z-11 の値の選び方について（裁定済み。変えない）。**
**`null` と `true` を入れているのは意図的である。**
`null >= 0` も `true >= 0` も JavaScript では `true` に評価されるため、
**`typeof` の節を消した実装がこれらを通してしまう。つまりこの 2 値が破壊を検出する主力である。**
**`undefined` は入れないこと**——`hasOnly` はキーの存在だけを見るので `undefined` は allowlist を通過するが、
**`typeof` を消した弱い実装でも `undefined >= 0` は `false` になり、破壊を検出できない値である**（044 の裁定 4 と同じ話）。

### 4.2 型について（**先に読むこと。ここで詰まらせない**）

`isStatsPayload(value: unknown)` は `unknown` を取るので、
**`{ ...payload(), product: 1 }` のような不正値をそのまま渡しても `typecheck` は通る**（親担当が参照実装で実測。終了コード 0）。
**`as never` や `as unknown` のキャストを足さないこと。足さずに通る。**
**`for (const x of [...])` で配列に混在型を並べる形も通る**（要素型が推論で union になる）。
**`typecheck` が赤くなったら、それは書き方の問題であって仕様の問題ではない。S-6 に上げる前にここを読み直すこと。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 |
|---|---|
| **A-1** | `npm run test:node` が **tests 390 / pass 390 / fail 0**（着手前 378 ＋ 新規 12。**親担当が参照実装で実測した値**） |
| **A-2** | `npm run test:screen` が **12 files / 88 passed** のままである |
| **A-3** | `typecheck` `lint` `data:check` `build` `scan:publish` がすべて終了コード 0。`scan:publish` は **751 件 / 違反 0** |
| **A-4** | §0.3 の 17 ハッシュが **17/17 一致**する |
| **A-5** | `git status --porcelain -uall` に **`??` の行が 1 つも無い** |
| **A-6** | 変更されたファイルが `tests/unit/telemetry/registry.test.ts` の **1 つだけ**である（**`docs/HANDOFF.md` を除いて数える**。§0.4） |
| **A-7** | `git diff --name-only` に **`packages/` で始まる行が 1 つも無い** |
| **A-8** | 新規試験が **Z-1〜Z-12 のちょうど 12 本**である |

### 5.0 grep で判定する条件

- **g**: `git diff --name-only | grep -v '^docs/HANDOFF\.md$'` の行数が **1**
- **h**: `tests/unit/telemetry/` に `W-` で始まる試験名が **28 本**、`X-` が **9 本**、`Y-` が **2 本**残っている（1 本も消えていない）

### 5.1 破壊試験（**受入の中心。ここを通らなければ緑でも合格にしない**）

**下の期待値は、親担当が参照実装を当てて 15 件すべて実際に走らせた実測値である**（推論ではない）。
**Terra は 15 件を自分で再現し、赤くなった試験の名前を完了報告に書くこと。**
**壊したファイルは必ず `cp` で復元し、復元後にハッシュが一致することを確かめる。**
**Python で書き戻すと改行が化けてハッシュがずれる。`cp` で戻すこと**（記憶 `restore-mutated-file-with-cp`）。

**壊す場所はすべて `packages/shared/src/telemetry/registry.ts` の `isStatsPayload` の `return` 式である。**

| # | 壊し方（**左を右へ置換する**） | 赤くなる試験（実測） | 件数 |
|---|---|---|---|
| **E-1** | `isCountMap(value.entryCounts, ENTRY_KEYS)` → `isObject(value.entryCounts) && Object.values(value.entryCounts).every(isNonNegativeInteger)` | **Z-1 だけ** | 1 |
| **E-2** | `isCountMap(value.entryCounts, ENTRY_KEYS)` → `isObject(value.entryCounts) && hasOnly(value.entryCounts, ENTRY_KEYS)` | **Z-2 だけ** | 1 |
| **E-3** | `isCountMap(value.questionTypeCounts, QUESTION_TYPE_KEYS)` → `isObject(value.questionTypeCounts) && Object.values(value.questionTypeCounts).every(isNonNegativeInteger)` | **Z-3 だけ** | 1 |
| **E-4** | `isCountMap(value.questionTypeCounts, QUESTION_TYPE_KEYS)` → `isObject(value.questionTypeCounts) && hasOnly(value.questionTypeCounts, QUESTION_TYPE_KEYS)` | **Z-4 だけ** | 1 |
| **E-5** | `isNonNegativeInteger(value.masteryRulesVersion)` → `typeof value.masteryRulesVersion === 'number'` | **Z-5 だけ** | 1 |
| **E-6** | `(value.product === 'hyakunin' \|\| value.product === 'kanazukai')` → `typeof value.product === 'string'` | **Z-6 だけ** | 1 |
| **E-7** | `typeof value.isOfficial === 'boolean'` → `value.isOfficial !== undefined` | **Z-7 だけ** | 1 |
| **E-8** | `typeof value.appVersion === 'string'` → `value.appVersion !== undefined` | **Z-8 だけ** | 1 |
| **E-9** | `typeof value.grade === 'string'` → `value.grade !== undefined` | **Z-9 だけ** | 1 |
| **E-10** | `typeof value.masteryAvg === 'number' && value.masteryAvg >= 0` → `value.masteryAvg >= 0` | **Z-10 だけ** | 1 |
| **E-11** | `typeof value.masteryMax === 'number' && value.masteryMax >= 0` → `value.masteryMax >= 0` | **Z-11 だけ** | 1 |
| **E-12** | `Array.isArray(value.masteryDistribution)` → `value.masteryDistribution !== undefined` | **Z-12 だけ**（**例外送出で赤になる。それでよい**。裁定 5） | 1 |
| **E-13** | `isCountMap(value.entryCounts, ENTRY_KEYS)` → `isObject(value.entryCounts)`（**2 つの約束を同時に殺す**） | **Z-1・Z-2** | 2 |
| **E-14** | `isCountMap(value.questionTypeCounts, QUESTION_TYPE_KEYS)` → `isObject(value.questionTypeCounts)` | **Z-3・Z-4** | 2 |
| **F-1** | `(value.product === 'hyakunin' \|\| value.product === 'kanazukai')` → `(['hyakunin', 'kanazukai'] as readonly unknown[]).includes(value.product)`（**正しい整理**） | **1 本も赤くならない**（390/390） | 0 |

**この表の読み方。**

- **E-1〜E-12 は「着手前は 0 本だった」**ものである。
  **親担当が 044 の検収時に実測した**——**14 件すべてを `4b74225` に当てると、いずれも 378/378 全緑だった。**
  **この 12 件が赤くなることが、この発注が仕事をした唯一の証拠である。**
- **E-13・E-14 は「1 つの `isCountMap` 呼び出しが 2 つの約束を持っている」ことを見る**（044 の E-3 と同型）。
  **Z-1 と Z-2 が別々の約束を守っていることが、E-1・E-2 と E-13 の差で見える。**
- **E-1〜E-4 が「1 本ずつ」赤くなることが、裁定 2 を守った証拠である。**
  **どれかで 2 本以上赤くなったら、試験を混ぜている**（記憶 `mutation-must-isolate-one-test`）。
- **F-1 は感度ではなく特異度の試験である。正しい整理を赤にしないこと**を確かめる。
  **ここが赤くなったら Z-6 が過剰制約である。**

**E-1〜E-12 のどれかが緑のままだった場合、E-1〜E-12 のどれかで 2 本以上赤くなった場合、
あるいは F-1 で 1 本でも赤が出た場合は、名前を報告に書いて止まること（S-4）。**

### 5.2 試験の質

**完了報告に、新規 12 本それぞれについて「種別」と「どの破壊試験で赤くなったか」を書くこと。**
**§4.1 と §5.1 に親担当の判定を書いてあるので、食い違ったらそれを報告すること。**
**食い違い自体は減点ではない。黙って合わせるのが減点である。**

---

## 6. 停止条件（**該当したら手を止めて親担当へ報告する**）

| # | 条件 |
|---|---|
| **S-1** | §0.3 の 17 ハッシュが**着手前に**一致しない。**`docs/HANDOFF.md` の未コミット変更は S-1 ではない**（§0.4） |
| **S-2** | **`packages/` を変えないと Z-1〜Z-12 を緑にできないと判断した。** 実装は検収に合格している。**試験の穴を実装で埋めない** |
| **S-3** | `tests/unit/telemetry/registry.test.ts` 以外を変える／作る必要が出た |
| **S-4** | **E-1〜E-12 のどれかが緑のまま**だった、**E-1〜E-12 のどれかで 2 本以上赤くなった**、または **F-1 で 1 本でも赤が出た** |
| **S-5** | 既存の W-1〜W-28・X-1〜X-9・Y-1〜Y-2 のどれかを書き換えないと通らないと判断した |
| **S-6** | 受入条件どうしが矛盾する、または本発注書の記述に誤りを見つけた。**自分で解釈して進めない**（**`typecheck` で詰まった場合は先に §4.2 を読むこと**） |

---

## 7. 完了報告に必ず書くこと

1. 全ゲートの**実測値**（A-1〜A-3 の数字をそのまま）
2. §0.3 の 17 ハッシュの照合結果
3. `git status --porcelain -uall` の全文と `git diff --name-only` の全文
4. §5.0 の grep **g・h** の実測件数
5. **破壊試験 E-1〜E-14・F-1 の 15 件それぞれについて、赤くなった試験の名前**（§5.1 の実測値と食い違ったらそれも書く）
6. **新規試験 12 本それぞれの種別**と、**どの破壊試験で赤くなったか**
7. **独自に決めたこと**（**無ければ「無し」と書く**）
8. **できなかったこと・迷ったこと**（**無ければ「無し」と書く**）

**7 と 8 は検収側で再現できない。** 空欄で出さないこと。

---

## 8. 訂正

（走行中に親担当が追記する。**Terra はこの節を書き換えない。**）
