# 発注050（P9-B3 補修・E-9 が名乗った 3 節に釘を打ち直す）

- **宛先**: Luna（Codex）
- **起票**: 2026-09-03・第31回・親担当（Claude Opus 5）
- **前提コミット**: `6bc84ce`（発注049 の成果）
- **⚠ 作業ツリーは clean ではない。発注048（P9-B2）が並行して走っている**（§0.5）
- **フェーズ**: P9-B3 の補修（新機能ではない）
- **規模**: 小（**試験 1 ファイルだけを直す。Rules を 1 バイトも変えない**）
- **状態**: 未発行

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を直すか

**`tests/rules/stats.test.mjs` の E-9 が、自分が名乗っている 3 つの節を一つも守っていない。**
それを守る形に書き直し、試験の無い 2 節に 1 本ずつ足す。**それだけである。**

- **`firebase/firestore.rules` を変更しない。ルールは正しい。壊れているのは試験である。**
- **`packages/` を 1 バイトも触らない。**
- **新規依存を 1 つも入れない。**
- **`firebase.json`・`firestore.indexes.json`・`rules.yml`・`package.json`・lockfile を変更しない。**

### 0.2 なぜ E-9 は嘘をついているか（**この発注の全部**）

発注049 で Rules の末尾に次の節が入った。

```
&& docId == data.clientNumber + '_' + data.localDate + '_' + data.product;
```

いっぽう `stats.test.mjs` の `ref()` は**常に固定の正しい文書 ID `id` を使う。**

```js
const id = 'abcdefghijklmnopqrst_2026-09-03_hyakunin';
const ref = (name) => doc(env.authenticatedContext('client').firestore(), name, id);
```

E-9 は **payload 側の `clientNumber` / `localDate` / `product` だけ**を壊して `assertFails` する。
**文書 ID は正しいままなので、上の docId 照合が必ず不一致になって拒否する。**

**その結果、Rules から次の 3 節を全部消しても E-1〜E-21 は全緑になる。**

| 消しても緑になる節 |
|---|
| `data.clientNumber is string && data.clientNumber.matches('^[a-z0-9]{20}$')` |
| `data.localDate is string && data.localDate.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')` |
| `data.product in ['hyakunin', 'kanazukai']` |

**これは識別フィールドに掛かっている唯一の値制約である。**
発注049 の破壊試験 M-1〜M-13 はこの 3 節を一つも狙っていなかったので、
**「M 全件が異常を検出した」は真のまま、この穴を素通りした。**

### 0.3 一般則（**次に陰性試験を書くとき必ず思い出すこと**）

**`assertFails` 型の陰性試験は「どの節が拒否したか」を問わない。**
**狙った節を消しても、別の節が同じ入力を弾いていれば緑のままである。**

陽性試験（`assertSucceeds`）は 1 節でも落ちれば赤くなるので過検出しない。
**陰性試験は逆向きに壊れ、被覆を過大に見積もる。**

**したがって陰性試験は、狙った節以外がすべて通る入力で書く。**
`product` を壊すなら**文書 ID の product も一緒に壊して**、docId 照合を通してから拒否させる。

### 0.4 試験の無い 2 節

`data.grade is string` と `data.appVersion is string` には、E-1〜E-21 のどこにも試験が無い。
**1 本ずつ足す。**

（`data.isOfficial is bool` にも独立した試験は無いが、`data.isOfficial == official` が
真偽値以外を必ず落とすので**実害が無い。足さない。**）

### 0.5 並行作業がある（**着手前に必ず読む**）

**この発注は、発注048（P9-B2）と並行して走る。作業ツリーは clean ではない。**
起票時点で、他者が次を触っている——
`packages/shared/src/telemetry/transport.ts`（新規）、`packages/shared/src/app-config.ts`、
`tests/unit/telemetry/fixtures.ts`、`tests/unit/telemetry/static.test.ts`。

**衝突はしない。** この発注が触るのは `tests/rules/stats.test.mjs` だけであり、
**`firebase/` と `tests/rules/` は `6bc84ce` のまま 1 バイトも動いていない**（起票時に確認済み）。

| ファイル | 起票時の SHA-256 |
|---|---|
| `firebase/firestore.rules` | `29e9f4c48cafd35dcec1617249be2030d7534587e124faad5eeceec983382285` |
| `tests/rules/stats.test.mjs` | `74abd8914670a40483db7d4d8f06d9d3e600754cf1b5071d12eb57976ae35df6` |

**したがって次の 2 点を守ること。**

1. **`git status` が clean でないことを理由に止まらない**（S-1 を読み替える）。
   **止まるのは、`firebase/` または `tests/rules/` に自分以外の差分が出たときだけである。**
2. **`npm run test:node` / `npm run test:screen` の件数を受入条件に使わない。**
   **並行作業で動くので、判定材料にならない**（記憶: 並行発注中は基準線が取れない）。
   使うのは **`npm run test:rules` の件数（21 → 23）だけ**である。

---

## 1. 変更境界

### 変更してよいファイル（**1 つだけ**）

| ファイル | 何を |
|---|---|
| `tests/rules/stats.test.mjs` | E-9 を書き直し、E-22・E-23 を足す |

### 変更禁止（**1 バイトも触らない**）

- **`firebase/firestore.rules`** —— **ルールは正しい。触る必要が出たら S-2 で止まる。**
- `firebase/firebase.json`・`firebase/firestore.indexes.json`
- `.github/workflows/rules.yml`
- `package.json`・`package-lock.json`・`tests/rules/package.json`・`tests/rules/package-lock.json`
- **`packages/` 配下のすべて**
- `tests/unit/` 配下のすべて（`rules-parity.test.ts` を含む）
- `docs/` 配下（この発注書を含む）、一次資料一式、`review/`、`data/`

### 変更してはならないファイルの SHA-256（着手前に照合し、報告に再掲する）

| ファイル | SHA-256 |
|---|---|
| `firebase/firestore.rules` | `29e9f4c48cafd35dcec1617249be2030d7534587e124faad5eeceec983382285` |
| `tests/unit/telemetry/rules-parity.test.ts` | `1dacc5ac92579c1a6af65b223d220fa84ad9b1d942724c56c88ff80141c192e5` |

---

## 2. 先に読むもの

| 場所 | 何のため |
|---|---|
| `tests/rules/stats.test.mjs` | 直す対象。既存の流儀（1 行 1 試験・`assertFails` の第 2 引数にラベル） |
| `firebase/firestore.rules` の `isValidStats` | **どの節がどの入力を落とすか。読むだけで、変更しない** |
| `docs/CODEX_WORK_ORDER_049.md` §5・§8 | 既存 E 表と M 表。番号を再利用しないため |
| `docs/HANDOFF.md` §4.1 の **D-70・D-71** | `expiresAt` の timestamp 化と、文書ID・環境境界の照合 |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: E-9 は番号を保ったまま 3 本へ割る

`E-9a` / `E-9b` / `E-9c` とする。**1 本が 1 つの節だけを見る。**
（既存の `E-` 連番を詰め直さない。`E-10` 以降の番号を動かさない。）

### 裁定 2: 文書 ID は payload に追随させる

E-9a〜E-9c は、**壊した payload から文書 ID を組み立てる。**
固定の `id` を使わない。`ref()` も使わない。

```js
const idFor = (d) => `${d.clientNumber}_${d.localDate}_${d.product}`;
```

**これにより docId 照合は必ず通り、狙った節だけが拒否する。**

### 裁定 3: `nonNegativeInt` の節に巻き込まれない値を選ぶ

壊す値は、**狙った節だけが落とす**ものにする。

| 試験 | 壊す場所 | 値 | 落とす節 |
|---|---|---|---|
| E-9a | `clientNumber` | `'ABC'` | 20 文字の正規表現 |
| E-9b | `localDate` | `'2026-09-03T00:00:00Z'` | 日付書式の正規表現 |
| E-9c | `product` | `'other'` | `in ['hyakunin','kanazukai']` |
| E-22 | `grade` | `123`（数値） | `grade is string` |
| E-23 | `appVersion` | `5`（数値） | `appVersion is string` |

**E-22・E-23 は文書 ID に現れないフィールドなので、固定 `id` と `ref()` のままでよい。**

### 裁定 4: 陽性側を 1 本も壊さない

E-1・E-2 が緑のままであること。**E-9a〜E-9c の入力は「その 1 節以外はすべて正しい」payload である。**

### 裁定 5: 番号は既存の `E-` を続ける

新規は **`E-22`（grade）・`E-23`（appVersion）**。`R-`・`M-` を再利用しない。

### 裁定 6: 検収が終わるまで実行環境を残す

**依存・JDK・Emulator JAR・ログを、親検収の完了前に削除しない**（S-3）。
資源最小化は検収後の別工程である。

---

## 4. 実装範囲

**`tests/rules/stats.test.mjs` だけを直す。**

1. **E-9 を削除し、E-9a・E-9b・E-9c を置く。** 各本は
   - 裁定 3 の値で payload を 1 箇所だけ壊し、
   - **裁定 2 の `idFor(d)` で文書 ID を組み立て、**
   - `assertFails` に**節を名指しするラベル**を渡す（既存の流儀）。
2. **E-22 を足す。** `grade` を数値にして `assertFails`（文書 ID は既存の `id`）。
3. **E-23 を足す。** `appVersion` を数値にして `assertFails`（同上）。
4. **既存の E-1〜E-8・E-10〜E-21 を書き換えない。**

**書き方は任せる。ただし `assert.ok(true)` に相当するアサーションを書かない。**

---

## 5. 受入条件（**すべて機械判定できること**）

### 5.0 grep で判定する条件

| # | 条件 |
|---|---|
| A-1 | **自分が触ったファイルが `tests/rules/stats.test.mjs` の 1 つだけ**。`git status --porcelain -- firebase/ tests/rules/` の出力が `M tests/rules/stats.test.mjs` の 1 行だけであること（`packages/` と `tests/unit/` の差分は**発注048 のものであり、この発注の成果ではない。触らない・commit しない**） |
| A-2 | `firebase/firestore.rules` の SHA-256 が §1 の値から**変わっていない** |
| A-3 | `tests/unit/telemetry/rules-parity.test.ts` の SHA-256 が §1 の値から**変わっていない** |
| A-4 | `stats.test.mjs` に `test('E-9a`・`test('E-9b`・`test('E-9c`・`test('E-22`・`test('E-23` が各 1 回 |
| A-5 | `stats.test.mjs` に `test('E-9 ` が**現れない**（旧版が残っていない） |
| A-6 | E 試験の総数が **23 本**（着手前 21 本 ＋ 2 本） |

### 5.1 ゲート

| ゲート | 着手前の基準線 | 着手後 |
|---|---|---|
| `npm run test:rules` | E-1〜E-21 が 21/21 | **23/23** |
| `npm run scan:publish` | 走査 751 件・違反 0 | **751 件・違反 0** |

**`test:node`・`test:screen`・`typecheck`・`lint`・`build` の件数と成否は、この発注の受入条件にしない**（§0.5）。
**並行する発注048 が動かすので判定材料にならない。**
この発注は `tests/rules/stats.test.mjs` しか触らず、そのファイルは `test:node`（`tests/**/*.test.ts`）にも
`test:screen`（vitest）にも拾われない。**着手前と着手後で自分が動かしていないことだけを、上の A-1 で示す。**

### 5.2 破壊試験（**受入の中心**）

**各行を 1 つずつ当て、指定の試験だけが赤くなることを確かめ、`cp` で元に戻すこと。**
**Python で書き戻すとハッシュがずれる。**

> **⚠ 破壊は Rules の構文を壊さないこと。**
> `isValidStats` は `&&` で繋いだ 1 つの式であり、**末尾の節には `;` が付いている。**
> 節を消すときは `;` を残す（M-6 は `docId ==` の行を消したあと、直前の
> `&& data.isOfficial == official` を `;` で閉じる）。
> **構文を壊すと E-1〜E-23 が全部赤くなり、何も証明しない**（記憶: 全部赤くなる破壊は別の欠陥を叩いている）。
> 破壊のたびに **E-1・E-2 が緑であること**を先に確かめてから、狙った試験を見る。

| # | 壊し方 | 赤くなるべきもの |
|---|---|---|
| **M-1** | Rules から `data.clientNumber.matches(...)` の節を消す | **E-9a だけ** |
| **M-2** | Rules から `data.localDate.matches(...)` の節を消す | **E-9b だけ** |
| **M-3** | Rules の `data.product in [...]` から `'kanazukai'` ごと節を消す | **E-9c だけ** |
| **M-4** | Rules から `data.grade is string` を消す | **E-22 だけ** |
| **M-5** | Rules から `data.appVersion is string` を消す | **E-23 だけ** |
| **M-6** | **Rules から `docId == ...` の節を消す** | **E-4 だけ。E-9a〜E-9c は緑のままであること**（＝ masking が本当に解けた証拠。**ここがこの発注の心臓**） |
| **M-7** | **試験自身を旧版へ戻す。** E-9c を「固定 `id` のまま product だけ壊す」書き方に戻し、そのうえで **M-3 を当てる** | **E-9c が緑のまま通ること**（＝旧版が嘘をついていたことの再現。確認したら直ちに新版へ戻す） |

**M-6 と M-7 は「壊したら赤くなる」ではなく「試験が嘘をつけないこと」を見る破壊である。**
**M-6 で E-9a〜E-9c のどれかが赤くなったら S-6 である。** docId 照合にまだ寄りかかっている。

### 5.3 試験の質

- **1 本が 1 つの節を見る。** E-9a に E-9b の内容を混ぜない。
- **`assertFails` の第 2 引数に、狙った節が分かるラベルを書く。**
- **`assert.ok(true)` に相当するアサーションを書かない。**

---

## 6. 停止条件（**該当したら手を止めて親担当へ報告する**）

| # | 条件 | なぜ止まるか |
|---|---|---|
| **S-1** | **`firebase/` または `tests/rules/` に自分以外の差分が出た** | 基準線が取れない。**`packages/` と `tests/unit/` の差分は発注048 のものなので止まらない**（§0.5） |
| **S-2** | **Rules を変えないと試験が書けない** | **ルールは正しい。** 前提が崩れている。勝手に Rules を触らない |
| **S-3** | **検収完了前に依存・JDK・Emulator・ログを消したくなった** | **検収の手段そのものが消える。** 片付けは検収後 |
| **S-4** | 「Rules が正しく動くことを確認した」を超える主張を書きたくなった | Emulator が示すのは**この 23 本の範囲**だけである |
| **S-5** | 新規依存を入れたくなった | この発注は依存を 1 つも増やさない |
| **S-6** | **M-6 で E-9a〜E-9c のどれかが赤くなった** | **masking が解けていない。** 直してから報告する |
| **S-7** | **M-7 で E-9c が赤くなった** | 旧版の再現に失敗している。再現手順が違う |

---

## 7. 完了報告に必ず書くこと

1. **§5.0 の A-1〜A-6 の実測値**（数値をそのまま）
2. **§5.1 の `test:rules` の件数と `scan:publish` の実測値**（着手前と着手後の両方）。
   **`test:node` / `test:screen` の件数は書かない**（並行作業で動くため。§0.5）
3. **§5.2 の M-1〜M-7 を 1 件ずつ当てた結果**——**どの試験が赤くなったかを名前で列挙する。**
   **「期待どおり」と書かない。**
4. **M-6 の結果**（E-9a〜E-9c が緑のままだったか）と **M-7 の結果**（E-9c が緑のまま通ったか）
5. **復元の確認**——`git status` が `tests/rules/stats.test.mjs` 以外に差分を出さないこと
6. **実行環境を残していること**（S-3。親検収で再実行するため）
7. 停止条件に当たったか（当たっていなければ「無し」と書く）
