# 発注042（P9-A・匿名統計の純関数群）

- **宛先**: Terra（Codex）
- **起票**: 2026-09-03・第25回・親担当（Claude Opus 5）
- **前提コミット**: `bec66c7`（作業ツリー clean）
- **フェーズ**: P9 匿名統計と問題報告のうち **P9-A のみ**
- **規模**: 中

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を作るか

**匿名統計の「送る中身を決める」部分だけを、純関数として作る。**
**ネットワークに触れるコードを 1 行も書かない。** Firebase も Firestore も `fetch` も出てこない。

作るのは 4 つのモジュールと、その試験である。

| モジュール | 役目 |
|---|---|
| `telemetry/registry.ts` | **送ってよいキーの一覧（allowlist）と、各キーの形**。これが仕様の正本になる |
| `telemetry/client-number.ts` | 継続する無作為な利用番号を**作る**（保存はしない） |
| `telemetry/sanitize.ts` | 組み立てた payload を allowlist で濾し、外れたら**捨てる** |
| `telemetry/queue.ts` | outbox に溜まったものから**送る対象と捨てる対象を決める**（書き込みはしない） |

### 0.2 これは「予防」ではなく「土台」である

発注041 と違い、**いま壊れているものを直す発注ではない。**
**まだ何も無いところに、privacy invariant を機械判定できる形で最初に置く発注である。**

**したがって「実機で確かめる」ことは何も無い。** 実機を触らないこと。
**`npm run dev` を起動する必要も、画面を開く必要も無い。** 全部 `npm run test:node` で完結する。

### 0.3 実測で確かめた構造上の制約（**設計の前提。読み飛ばさないこと**）

**親担当が `bec66c7`・clean で実測した。以下は再調査しなくてよい。**

| # | 事実 | 実測値 | 帰結 |
|---|---|---|---|
| 1 | `telemetry` という語はリポジトリ全体に**存在しない** | 参照ファイル **0 件** | **完全な新規領域である。** 既存の呼び出し元を壊す心配は無い |
| 2 | `clientNumber` という語も**存在しない** | 参照 **0 件** | 名前の衝突は無い |
| 3 | outbox に**書き込む本番コードは 1 つも無い** | `enqueueOutbox` の本番呼出 **0 件**（`reset.ts` が `listOutbox` を読むだけ） | **queue.ts は「まだ誰も使っていない箱」を扱う。** 既存の挙動を変えられない |
| 4 | `crypto.getRandomValues` を使う本番コードは**無い** | **0 件** | 利用番号の生成器はこの発注で初めて入る |
| 5 | `UserSettings.deviceId` は**型にあるが、誰も値を入れていない** | `packages/shared/src/domain/event.ts:75` に `deviceId?: string` | **保存の器は既にある。** この発注では**保存しない**（P9-B） |
| 6 | `reset.ts` は `settings` ストアを**一切触らない** | 対象は `sessions` / `events` / `reports` / `outbox` の 4 つだけ | **「初期化で利用番号を作り直さない」（計画 §7.2）は構造上すでに成立している。** 壊さないよう試験で釘を打つ |
| 7 | `import.ts:43` は読み込み時に**自端末の `deviceId` を優先**する | `...(existing?.deviceId === undefined ? {} : { deviceId: existing.deviceId })` | **他人の書き出しを読み込んでも利用番号は乗っ取られない。** これも既存の良い性質で、壊さないこと |
| 8 | `tests/**/*.test.ts` は `test:node` が**自動で拾う** | `package.json` の `test:node` | **新しい試験ファイルを登録する作業は要らない** |
| 9 | 既存試験は `packages/` を**相対パスで import** している | `tests/unit/recommend/recommend.test.ts:3` など | **`packages/shared/package.json` の `exports` を触る必要は無い。触ってはならない** |

### 0.4 基準線（**着手前に照合すること**）

```
npm run test:node    -> tests 339 / pass 339 / fail 0
npm run test:screen  -> 12 files / 88 passed
npm run scan:publish -> 走査 751 件 / 違反 0 件
typecheck lint data:check build -> すべて終了コード 0
```

**変更してはならないファイルの SHA-256**（`sha256sum -c` に流せる）:

```
207ac60c33d467651919ffd6549ba062cc12b2485d59be44862f558efca017e0 *packages/shared/src/domain/event.ts
9c264f7b884fad23f4b47e1912d1a7cbba23c1a434aa137d1a43604f4ff006c4 *packages/shared/src/storage/repo/outbox.ts
936a87717f33872c34a22c64b9a1e08b7a6f9c37391bd9eb80b9a493f27bd5fa *packages/shared/src/storage/repo/settings.ts
038d0588fd71f056a6065a870205bfe1587f1ed6cd7d106a3e0e5789f37c9a3a *packages/shared/src/storage/reset.ts
69c1228a3013669baee2230c1268feaeefa0b8ea61bbd4b18e194f13e9b00697 *packages/shared/src/storage/import.ts
e84602e0e5026b8747fcf311a4b949a28079c87b943f3f3a7f4034471590a94b *packages/shared/src/storage/export.ts
cdd20f59d50477ace6971fb9a081767998b11852438ef3ca7866c1a984128aba *packages/shared/src/app-config.ts
65436b90add6455b73ff5ca2897716fd68e8fbfaa7db8d71909d653f4d2ca2ff *packages/shared/package.json
66abc9e04ae15b7a64463da6aeded1b687c097d0a80e5ff09c5e64807cbd278a *packages/shared/src/storage/schema.ts
```

**この 9 件が 1 バイトでも動いたら、それは変更境界の逸脱である。**

---

## 1. 変更境界

### 新規作成してよいファイル（**9 つだけ**）

```
packages/shared/src/telemetry/registry.ts
packages/shared/src/telemetry/client-number.ts
packages/shared/src/telemetry/sanitize.ts
packages/shared/src/telemetry/queue.ts
tests/unit/telemetry/fixtures.ts
tests/unit/telemetry/registry.test.ts
tests/unit/telemetry/static.test.ts
tests/unit/telemetry/client-number.test.ts
tests/unit/telemetry/queue.test.ts
```

**`sanitize` の試験は独立したファイルにせず、`queue.test.ts` に W-26 〜 W-28 として置く**
（§4.5 の割り当てのとおり。**親担当の参照実装がこの形で 367 本を実測している**）。

### 変更してよい既存ファイル

**無い。1 つも無い。**

### 絶対に変更しない・作らないもの

| 対象 | 理由 |
|---|---|
| §0.4 の 9 ファイル | データモデルと保存層は P4 で確定済み。**P9-A はそこへ触らない** |
| `packages/shared/package.json` の `exports` | §0.3 の 9 により不要。**「後で要るから」で先に足さないこと** |
| `firebase/` 配下（`firestore.rules` を含む） | **P9-B の範囲である。この発注では 1 行も書かない** |
| `telemetry/transport.ts` | **P9-B の範囲。作らないこと** |
| `packages/shared/src/reports/` | **P9-C の範囲。作らないこと** |
| UI 部品（`StatsNotice` / `GradePicker` / `ReportForm`） | **P9-B 以降。作らないこと** |
| 一次資料 5 件 | §3 の 1 |
| `docs/**` | **この発注書を含め、文書は 1 文字も書き換えない**（訂正は親担当が §8 に足す） |

---

## 2. 先に読むもの

| 資料 | 見る箇所 |
|---|---|
| `docs/IMPLEMENTATION_PLAN.md` | **§7.1**（送るもの・送らないもの）、**§7.2**（無作為な利用番号）、**§7.5**（allowlist の二重化）、**§7.6**（outbox） |
| `docs/APP_SPEC.md` | **§10.2** 末尾（`AggregateStats` の項目）、**§11**（匿名統計） |
| `docs/HANDOFF.md` | **§4.1 の D-58**（送信フィールドの確定。**下の裁定 2 と同じもの**）、§3（絶対に守ること） |
| `packages/shared/src/domain/event.ts` | `OutboxItem` と `UserSettings` の形。**読むだけ** |
| `tests/unit/recommend/recommend.test.ts` | 試験の書き方の見本（`node:test` ＋ `node:assert/strict`、相対 import） |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: **P9-A はネットワークに触れない。**

`fetch` / `XMLHttpRequest` / `firebase` / `firestore` / `signIn` のいずれも、
**4 つの新規モジュールに 1 回も現れてはならない。** 送信そのものは P9-B である。

**この発注が答えるのは「何を送ってよいか」であって「どう送るか」ではない。**

### 裁定 2: **送信フィールドは次の 17 個で確定（依頼者裁定 D-58・2026-09-03）。**

**`stats_days_{env}` の 1 ドキュメントは「1 利用番号 × 1 日 × 1 製品」を表す。**

| キー | 型 | 制約 |
|---|---|---|
| `clientNumber` | string | `[a-z0-9]` のちょうど 20 文字 |
| `localDate` | string | `YYYY-MM-DD`。**時刻を含まない** |
| `product` | string | `hyakunin` または `kanazukai` のいずれか |
| `grade` | string | 学年区分コード。空文字を許す（未選択） |
| `pageViews` | number | 0 以上の整数 |
| `buttonCounts` | object | キーは**裁定 3 の一覧に載るものだけ**。値は 0 以上の整数 |
| `entryCounts` | object | キーは `quick` `view` `learn` `review` `exam` だけ。値は 0 以上の整数 |
| `questionTypeCounts` | object | キーは `blank` `author` だけ。値は 0 以上の整数 |
| `attemptCount` | number | 0 以上の整数 |
| `masteryAvg` | number | 0 以上 100 以下 |
| `masteryMax` | number | 0 以上 100 以下 |
| `masteryDistribution` | array | **長さちょうど 5** の 0 以上の整数の配列 |
| `isOfficial` | boolean | — |
| `appVersion` | string | — |
| `dataVersion` | number | 0 以上の整数 |
| `masteryRulesVersion` | number | 0 以上の整数 |
| `expiresAt` | string | `YYYY-MM-DD`。TTL 400 日 |

**この 17 個がすべてであり、1 つでも足しても引いてもならない。**
**とくに `poemId` `questionId` `sessionId` `eventId` を含むキーを作ってはならない**——
個別の問題別履歴を送らないという境界そのものである（APP_SPEC §11）。

### 裁定 3: **`buttonCounts` のキーも allowlist にする。**

自由なキーを許すと、そこが自由記述の抜け道になる。**次の 6 つだけを許す。**

```
start  answer  hint  reveal  history  report
```

**キーの一覧は `registry.ts` に定数として置き、試験がそれを読む。**
**試験の中に一覧を書き写さないこと**——2 箇所に書くと、片方だけ直したときに気づけない。

### 裁定 4: **`sanitize` は環境を自分で判定しない。呼び出し側が渡す。**

計画 §7.5 は「開発時は例外を投げ、本番は握りつぶして送信を捨てる」と定めるが、
**その分岐を `sanitize.ts` の中で `import.meta.env` や `process.env` から読んではならない。**
**純関数のままにする**——第 2 引数で `{ strict: boolean }` を受け取る。

- `strict: true` → 違反を見つけたら **throw する**
- `strict: false` → **`null` を返す**（呼び出し側はそれを捨てる。例外を投げない）

**理由**: 環境判定を中に入れると、試験が環境変数を書き換えなければ両方向を確かめられない。
**判定の置き場所を呼び出し側へ寄せることで、この関数は「どちらの向きも試験できる純関数」になる。**

### 裁定 5: **利用番号の生成器は注入する。`crypto` を直接呼ばない。**

`createClientNumber(randomBytes: (length: number) => Uint8Array): string` の形にする。
**本番で `crypto.getRandomValues` を渡すのは P9-B の配線の仕事である。**

**理由**: 注入すれば、試験が既知のバイト列を渡して**出力を完全に決められる**。
`crypto` を中で呼ぶと、試験は「20 文字であること」しか確かめられず、
**「氏名・時刻から導出していない」を証明できない**（憲章 §6・計画 §7.2）。

### 裁定 6: **`queue.ts` は IndexedDB に触らない。決めるだけである。**

`selectOutbox(items: OutboxItem[], today: string): { send: OutboxItem[]; drop: OutboxItem[] }`
の形にする。**実際の削除は既存の `repo/outbox.ts` が行い、それを呼ぶのは P9-B である。**

- **保持期間は 30 日とする**（計画 §7.6 の「例 30 日ぶん」を確定値にする）。定数名は `OUTBOX_RETENTION_DAYS`。
- `createdOn` が `today` より **30 日より古いもの**を `drop` に入れる。ちょうど 30 日は `send` に残す。
- **`send` と `drop` は交わらない。** 入力のどの要素もどちらか一方にだけ入り、合計数は入力数と等しい。

**日付の差の求め方について（親担当が検算で見つけた衝突。先に解いておく）。**
**裁定 7 は `toISOString` を禁じている**ので、「30 日前の日付文字列を作って比較する」実装はできない。
**`YYYY-MM-DD` を `-` で分割し `Date.UTC(年, 月-1, 日)` でミリ秒に直して差を取ること。**
`Date.UTC` は禁止語に入っていない（**時刻もタイムゾーンも読まないため**）。
**`new Date()` を引数なしで呼んではならない**——それは現在時刻を読むことであり、`today` を引数で受け取る意味が消える。

**親担当が使い捨てのコードで実測した値。これをそのまま境界の試験に使ってよい**（`today = '2026-09-03'`）。

| `createdOn` | 経過日数 | 行き先 |
|---|---:|---|
| `2026-08-05` | 29 | `send` |
| `2026-08-04` | **30** | **`send`**（ちょうど 30 日は残す） |
| `2026-08-03` | **31** | **`drop`** |
| `2026-08-02` | 32 | `drop` |

**閏年も月跨ぎも正しく出る**ことを確かめた（`2024-02-28` → `2024-03-01` が **2 日**、`2026-02-28` → `2026-03-01` が **1 日**）。

### 裁定 7: **`telemetry/` に書いてはならない語を、試験で禁じる。**

計画 §7.5 の後段。**次の 7 語が `packages/shared/src/telemetry/` 配下のソースに 1 回も現れないこと。**

```
textContent  innerHTML  getAttribute  Date.now  toISOString  getTimezoneOffset  localStorage
```

**「危険な値を弾く」のではなく「危険な経路を書かない」ことを守る検査である。**
**この検査は `telemetry/` 配下だけに掛けること。** リポジトリ全体に掛けてはならない
（発注030 の A-21 と同じ誤りになる）。

### 裁定 8: **新規試験の名前は `W-` で始める。**

041 が `V-` を使ったので次の記号にする。`W-1` から通し番号を振り、
**下の §5.2 の表に書いた「種別」を試験名のコメントに書くこと。**

### 裁定 9: **`grade` の中身は決めない。**

学年区分の二段階（中一／中二／中三／その他 → 小学生／高一／高二／高三／大人）は
**P9-B の UI（`GradePicker`）の仕事である。**
P9-A は **「string であること」と「allowlist に載っていること」だけ**を見る。
**値の一覧を `registry.ts` に書かないこと**——ここで決めると P9-B で二重管理になる。

---

## 4. 実装範囲

### 4.1 `packages/shared/src/telemetry/registry.ts`（新規）

**この発注の正本である。** 次を export する。

- `STATS_KEYS`: 裁定 2 の 17 キーの配列（読み取り専用）
- `BUTTON_KEYS`: 裁定 3 の 6 キーの配列（読み取り専用）
- `ENTRY_KEYS` / `QUESTION_TYPE_KEYS`: 裁定 2 の表のとおり
- `MASTERY_BUCKET_COUNT`: `5`
- `StatsPayload`: 17 キーの型
- `isStatsPayload(value: unknown): value is StatsPayload`: 型と制約を実際に検査する述語

**`isStatsPayload` は「キーがあるか」だけでなく、裁定 2 の表の制約（正規表現・範囲・配列長・オブジェクトのキー）をすべて見ること。**
**余分なキーが 1 つでもあれば `false` を返す**（`hasOnly` 相当）。

### 4.2 `packages/shared/src/telemetry/client-number.ts`（新規）

- `CLIENT_NUMBER_LENGTH`: `20`
- `createClientNumber(randomBytes: (length: number) => Uint8Array): string`
- `isClientNumber(value: unknown): value is string`

**`[a-z0-9]` の 36 文字から選ぶ。** 剰余の偏りを避けるため、
**36 の倍数を超えるバイト値は捨てて引き直すこと**（`randomBytes` を必要なだけ追加で呼んでよい）。
**引数以外から値を取らないこと**——`Date` も `crypto` も `navigator` も呼ばない。

### 4.3 `packages/shared/src/telemetry/sanitize.ts`（新規）

- `sanitizeStats(value: unknown, options: { strict: boolean }): StatsPayload | null`

`isStatsPayload` が `true` を返すときだけ、**入力そのものではなく、
`STATS_KEYS` の順に組み直した新しいオブジェクト**を返す（prototype 汚染と余分キーの持ち込みを断つ）。
`false` のときは裁定 4 のとおり `strict` で分岐する。

### 4.4 `packages/shared/src/telemetry/queue.ts`（新規）

- `OUTBOX_RETENTION_DAYS`: `30`
- `selectOutbox(items, today)`: 裁定 6 のとおり
- `statsDocumentId(payload: StatsPayload): string`:
  **`` `${clientNumber}_${localDate}_${product}` `` を返す。**
  **親担当が決めた（§10.5 の「表現方法」）。** 依頼者裁定 D-58 で `product` が加わり、
  1 日 1 件の前提が崩れたため、**製品を ID に含めないと同じ日の 2 製品が衝突する。**
  create のみ許可＋409 を成功とみなす設計（計画 §7.6）が、これで冪等になる。

### 4.5 試験（新規・**28 本ちょうど**）と補助ファイル 1 つ

**試験ファイルは 4 つ、加えて共有の道具を置く `fixtures.ts` を 1 つ作る（合計 5 ファイル）。**

```
tests/unit/telemetry/fixtures.ts            （試験ではない。道具だけ）
tests/unit/telemetry/registry.test.ts       W-1 〜 W-9
tests/unit/telemetry/static.test.ts         W-10 〜 W-14
tests/unit/telemetry/client-number.test.ts  W-15 〜 W-19
tests/unit/telemetry/queue.test.ts          W-20 〜 W-28
```

**試験ファイルを別の試験ファイルから import してはならない。**
**親担当が実際にやってみて踏んだ**——`static.test.ts` が `registry.test.ts` から道具を import したら、
**`registry.test.ts` の 9 本が二重に走って総数が 28 ではなく 37 になった。**
共有する道具は `fixtures.ts`（`.test.ts` ではない）に置くこと。
既存の `tests/unit/recommend/fixtures.ts` が同じ形をしている。

**`fixtures.ts` が持つのは 2 つだけ。**

1. `telemetrySources()`: `packages/shared/src/telemetry/` 配下のソースを `{ file, text }` で返す。
   **走査結果が 4 件未満なら例外を投げること**（理由は §5.1 の C-0 を読むこと。**これは飾りではない**）。
2. `payload()`: 裁定 2 を満たす正しい `StatsPayload` を新しく作って返す。

**28 本の名前と役目（この名前で作ること。破壊試験の期待値がこの名前で書いてある）。**

| # | 名前 | 見るもの | 種別 |
|---|---|---|---|
| W-1 | `registry: 送信キーはちょうど 17 個である` | `STATS_KEYS.length === 17` | 弁別的 |
| W-2 | `registry: 余分なキーが 1 つでもあれば弾く` | `poemId` を足した payload が `false` | 弁別的 |
| W-3 | `registry: キーが欠けていれば弾く` | 1 キー削った payload が `false` | 弁別的 |
| W-4 | `registry: 正しい payload は通る` | `payload()` が `true` | 弁別的 |
| W-5 | `registry: buttonCounts に一覧外のキーがあれば弾く` | 一覧外キーで `false`、**`BUTTON_KEYS` の各要素で `true`** | 弁別的 |
| W-6 | `registry: localDate が時刻を含むと弾く` | `2026-09-03T10:00:00Z` が `false` | 弁別的 |
| W-7 | `registry: 習熟度分布は長さ 5 に固定されている` | 長さ 4 が `false` | 弁別的 |
| W-8 | `registry: 個別履歴を指すキーが allowlist に無い` | 4 つの識別子が `STATS_KEYS` に無い | 弁別的 |
| W-9 | `registry: 学年区分の具体値を持たない` | `registry.ts` に `中一` などが現れない（裁定 9） | **固定ピン** |
| W-10 | `static: telemetry に送信の語が現れない` | `fetch` `firebase` `firestore` `XMLHttpRequest` | 弁別的 |
| W-11 | `static: telemetry に画面と時刻を読む語が現れない` | 裁定 7 の 7 語 | 弁別的 |
| W-12 | `static: telemetry が環境変数を読まない` | `import.meta.env` `process.env` | 弁別的 |
| W-13 | `static: client-number が crypto を直接呼ばない` | `getRandomValues` | 弁別的 |
| W-14 | `static: telemetry に個別履歴の識別子が現れない` | 4 つの識別子 | 弁別的 |
| W-15 | `client-number: 異なるバイト列からは異なる番号が出る` | 注入した乱数が出力に効く | 弁別的 |
| W-16 | `client-number: 同じバイト列からは同じ番号が出る` | 決定的であること | **固定ピン** |
| W-17 | `client-number: 20 文字の [a-z0-9] である` | 桁数と字種 | **固定ピン** |
| W-18 | `client-number: 範囲外のバイトは捨てられ、出力に現れない` | **下の注記を読むこと** | 弁別的 |
| W-19 | `client-number: 同じ乱数なら時間が経っても同じ番号になる` | 時刻から導出しない | **固定ピン** |
| W-20 | `queue: 29 日前は送る` | 境界 | 弁別的 |
| W-21 | `queue: ちょうど 30 日前は送る` | 境界（**残す側**） | 弁別的 |
| W-22 | `queue: 31 日前は捨てる` | 境界（**捨てる側**） | 弁別的 |
| W-23 | `queue: send と drop は入力の分割になっている` | A-8 | **固定ピン** |
| W-24 | `queue: 保持期間は 30 日である` | `OUTBOX_RETENTION_DAYS === 30` | 弁別的 |
| W-25 | `queue: 文書 ID は同じ日の 2 製品を区別する` | 裁定 D-59 | 弁別的 |
| W-26 | `sanitize: strict なら allowlist 外で例外を投げる` | 裁定 4（投げる側） | 弁別的 |
| W-27 | `sanitize: strict でなければ null を返して投げない` | 裁定 4（捨てる側） | 弁別的 |
| W-28 | `sanitize: 通った payload は 17 キーだけを持つ新しい物になる` | 余分なキーを持ち込まない | 弁別的 |

**固定ピンは 5 本（W-9・W-16・W-17・W-19・W-23）である。それでよい**——裁定の帰結を将来の変更から守る役目がある。
**悪いのは、弁別的なつもりの試験が固定ピンだったことに誰も気づかないことである。**

#### W-18 についての注記（**親担当が踏んだ罠。同じ穴に落ちないこと**）

`createClientNumber` は剰余の偏りを避けるため、36 の倍数を超えるバイトを捨てて引き直す。
**この枝を検査しているつもりの試験が、実際には何も検査していないことがある。**

**親担当は最初こう書いた**——255 を 20 回返してから 7 を返す乱数を与え、
**結果が 20 文字の `[a-z0-9]` に一致すること**を確かめた。
**破壊試験 C-9（枝を消す）で、この試験は緑のままだった。**
枝を消すと 255 を 36 で割った余りが 3 になり、**それも有効な文字だからである。**

**正しくはこう書く**——結果が **`h` を 20 個並べた文字列**（＝ 7 を 36 で割った余りが 7、対応する文字が `h`）
**に等しい**ことを確かめる。**捨てられたはずのバイトが出力に現れないこと**まで見て、はじめて C-9 で赤くなる。

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 |
|---|---|
| **A-1** | `npm run test:node` が **tests 367 / pass 367 / fail 0**（着手前 339 ＋ 新規 28。**親担当が参照実装で実測した値**） |
| **A-2** | `npm run test:screen` が **12 files / 88 passed** のままである（**増減したら境界の逸脱**） |
| **A-3** | `typecheck` `lint` `data:check` `build` `scan:publish` がすべて終了コード 0。`scan:publish` は **751 件 / 違反 0** |
| **A-4** | §0.4 の 9 ハッシュが **9/9 一致**する |
| **A-5** | 新規ファイルは §1 の **9 つだけ**である |
| **A-6** | `STATS_KEYS` の要素数が **ちょうど 17** である |
| **A-7** | `BUTTON_KEYS` の要素数が **ちょうど 6** である |
| **A-8** | `selectOutbox` の出力が入力の分割になっている |

### 5.0 grep で判定する条件（**表の外に置く。表の中では縦棒が壊れる**）

着手前の実測値を添える。**全称条件は着手前が 0 件であることを親担当が確かめてある**（§0.3）。

- **a**: `packages/shared/src/telemetry/` に `poemId` `questionId` `sessionId` `eventId` → **0 件**
- **b**: 同ディレクトリに `fetch` `firebase` `firestore` `XMLHttpRequest` → **0 件**
- **c**: 同ディレクトリに裁定 7 の 7 語 → **0 件**
- **d**: 同ディレクトリに `import.meta.env` `process.env` → **0 件**
- **e**: `client-number.ts` に `getRandomValues` → **0 件**
- **f**: `git diff --name-only` に `packages/shared/package.json` が**現れない**

**a〜e は W-10 〜 W-14 として試験にも書くこと。**
**コマンドで確かめるだけにしない**——検収の後、誰かが足したときに落ちる必要がある。

**c について、禁止語はコメントの中にも書けない。**
**親担当が踏んだ**: `queue.ts` のコメントに禁止語を 1 つ書いたら W-11 が赤くなった。
**検査を賢くしない**（コメントを剥がしてから探す、などにしない）。
**理由を書くときは、禁止語を名指ししないで書くこと。**

### 5.1 破壊試験（**受入の中心。ここを通らなければ緑でも合格にしない**）

**下の期待値は、親担当が参照実装を当てて 10 件すべて実際に走らせた実測値である**（推論ではない）。
**Terra は 10 件を自分で再現し、赤くなった試験の名前を完了報告に書くこと。**
**壊したファイルは必ず `cp` で復元し、復元後にハッシュが一致することを確かめる**
（Python での書き戻しは改行が変わることがある）。

| # | 壊すもの | 赤くなる新規試験（実測） | 既存 339 件 |
|---|---|---|---|
| **C-0** | **実装 4 本を消し、試験だけ置く** | **W-10・W-11・W-12・W-13・W-14**（残り 3 ファイルは import が解決せずファイルごと失敗） | 全緑 |
| **C-1** | `STATS_KEYS` に `poemId` を足す | **W-1・W-2・W-4・W-5・W-8・W-14・W-26・W-27・W-28**（9 本） | 全緑 |
| **C-2** | `isStatsPayload` を `return true` 固定 | **W-2・W-3・W-5・W-6・W-7・W-26・W-27**（7 本） | 全緑 |
| **C-3** | `isStatsPayload` を `return false` 固定 | **W-4・W-5・W-28**（3 本） | 全緑 |
| **C-4** | `sanitizeStats` の `strict` 分岐を殺す（常に `null`） | **W-26 だけ** | 全緑 |
| **C-5** | `createClientNumber` を `a` 20 個の固定値にする | **W-15 だけ** | 全緑 |
| **C-6** | `OUTBOX_RETENTION_DAYS` を **3000** にする | **W-22・W-24** | 全緑 |
| **C-7** | `statsDocumentId` から `product` を落とす | **W-25 だけ** | 全緑 |
| **C-8** | `OUTBOX_RETENTION_DAYS` を **3** にする | **W-20・W-21・W-24** | 全緑 |
| **C-9** | `client-number` の「範囲外バイトを捨てる」枝を消す | **W-18 だけ** | 全緑 |

**この表の対が、この発注の心臓である。**

- **C-2 と C-3 は逆向きに壊れる。重なるのは W-5 だけ**（両方向を見ている唯一の試験）。
  片方だけなら、常に緑の検査とも常に赤の検査とも区別がつかない。
- **C-6 と C-8 は保持期間を伸ばす／縮める両方向である。C-6 だけでは境界の片側しか守られていない。**
- **C-0 は「実装が無いのに緑になる試験が 1 本も無いこと」を見る。件数を数える試験ではない。**
  **親担当が最初に測ったとき、W-10・W-11・W-12・W-14 が実装ゼロで緑になった**——
  **空のディレクトリを走査した否定アサーションは素通りするからである。**
  **だから `fixtures.ts` の `telemetrySources()` は走査結果が 4 件未満なら例外を投げる。**
  **これを外すと、telemetry を丸ごと消しても静的試験が全部緑になる。**

**C-0 で緑になる新規試験が 1 本でもあれば、それは何も測っていない。名前を報告に書いて止まること（S-4）。**

### 5.2 試験の質（**ここを外すと、緑でも合格にしない**）

**完了報告に、28 本それぞれについて「種別」と「どの破壊試験で赤くなったか」を書くこと。**
**§4.5 の表に親担当の判定を書いてあるので、食い違ったらそれを報告すること。**
**食い違い自体は減点ではない。黙って合わせるのが減点である。**

**裁定と受入条件の対応**（裁定の各項に 1 本以上。第24回の教訓 2）。

| 裁定 | 守る試験 |
|---|---|
| 裁定 1（ネットワークに触れない） | W-10 |
| 裁定 2（17 キー） | W-1・W-2・W-3・W-4・W-8 |
| 裁定 3（ボタン名 6 つ） | W-5 |
| 裁定 4（strict の両方向） | W-26（投げる）・W-27（捨てる） |
| 裁定 5（乱数の注入） | W-13・W-15・W-16・W-18 |
| 裁定 6（30 日境界） | W-20・W-21・W-22・W-24 |
| 裁定 7（禁止語） | W-11 |
| 裁定 9（grade の値を決めない） | W-9 |
| D-59（文書 ID） | W-25 |

---

## 6. 停止条件（**該当したら手を止めて親担当へ報告する**）

| # | 条件 |
|---|---|
| **S-1** | §0.4 の基準線が着手前に一致しない（誰かが並行して触っている） |
| **S-2** | §1 の 8 ファイル以外を作る／変える必要が出た。**とくに `packages/shared/package.json` の `exports` を足したくなったら止まる** |
| **S-3** | 裁定 2 の 17 キーでは表せない値が必要になった。**キーを勝手に足さない**——privacy invariant は依頼者裁定である |
| **S-4** | 破壊試験 C-0 で**緑になる新規試験があった**、または C-2・C-3・C-5・C-7・C-9 のいずれかが**緑のまま**だった（試験が退化している） |
| **S-5** | 受入条件どうしが矛盾する、または本発注書の記述に誤りを見つけた。**自分で解釈して進めない** |
| **S-6** | ネットワーク・Firebase・Rules に触れないと進めないと判断した。**それは P9-B であり、この発注の範囲外である** |

---

## 7. 完了報告に必ず書くこと

1. 全ゲートの**実測値**（A-1〜A-3 の数字をそのまま）
2. §0.4 の 9 ハッシュの照合結果
3. `git status --porcelain -uall` の全文
4. §5.0 の grep **a〜f** の実測件数
5. **破壊試験 C-0〜C-9 の 10 件それぞれについて、赤くなった試験の名前**（§5.1 の実測値と食い違ったらそれも書く）
6. **新規試験 28 本それぞれの種別（弁別的／固定ピン）**と、**どの破壊試験で赤くなったか**
7. **独自に決めたこと**（この発注書が指定していないのに決めた事柄。**無ければ「無し」と書く**）
8. **できなかったこと・迷ったこと**（**無ければ「無し」と書く**）

**7 と 8 は検収側で再現できない。** 空欄で出さないこと。

---

## 8. 訂正

（走行中に親担当が追記する。**Terra はこの節を書き換えない。**）
