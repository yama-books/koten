# 発注046（`isStatsPayload` の外側に残っていた穴 22 個を塞ぐ・試験だけを足す）

- **宛先**: Terra（Codex）
- **起票**: 2026-09-03・第28回・親担当（Claude Opus 5）
- **前提コミット**: `adc4ce9`
- **フェーズ**: **第27回の検収の後半**（独自破壊による穴の探索）から起票した
- **規模**: 中（**試験 4 ファイルに 22 本足すだけ。実装コードは 1 行も書かない**）

---

## 訂正1（発注051・2026-09-04）

§0.3 の変更禁止ファイル SHA-256 一覧にある `packages/shared/src/app-config.ts` の値は CRLF 版であり、発注042で採取され、発注043〜046へ書き写された。`app-config.ts` は `e907c43` の1回しか commit されておらず、中身は一度も変わっていないため、これは変更境界の逸脱ではない。LF 版の値は `e0ec5cdb7b010a491f8bd02e84abc513184eb3f124d1664122946fb81edde6d0` である。ただし発注048以降がこのファイルを正当に変更しうるため、現在値を示すものではない。原因は H-19 と同一（作業ツリーの CRLF）であり、発注051で補修した。発注042〜045には訂正を加えない。

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を直すか

**043・044・045 は `packages/shared/src/telemetry/registry.ts` の `isStatsPayload` だけを見てきた。**
**その外側は同じ目で見られていなかった。** 親担当が第28回に独自の破壊試験を当てたところ、
**`queue.ts`・`sanitize.ts`・`client-number.ts`・`storage/fallback.ts`・`storage/merge.ts`・`storage/import.ts` に
22 個の穴が実在した。**

**この発注は試験を 22 本足すだけである。実装は 1 バイトも変えない。**

**穴の型は 045 までと同じ 3 つである。**

| 型 | 例 | 記憶 |
|---|---|---|
| **横に並んだ同型の節のうち、代表 1 本しか試験されていない** | `statsDocumentId` の 3 要素のうち `product` だけ／件数上限 3 節のうち `sessions` だけ／`Array.isArray` 3 節は 1 つも無い | `sibling-clauses-only-representative-nailed` |
| **関数が丸ごと試験されていない** | `readFallback` は試験が 0 本／`writeFallback` の**成功経路**が 0 本 | — |
| **fixture が退化していて取り違えを区別できない** | `preview.counts` の実測が `{1,1,1}` なので 3 つを入れ替えても緑 | `fixture-must-discriminate` |

### 0.2 実測で確かめた事実（**設計の前提。再調査しなくてよい**）

**親担当は 22 個すべてについて、`adc4ce9` の実装に破壊を当てて「390/390 全緑のままだった」ことを実測した。**
**そのうえで参照実装（新規試験 22 本）を書き、同じ破壊 22 件を当て直して「それぞれ何本赤くなるか」を実測した。**
**§5.1 の表はその実測値である。推論ではない。**

**参照実装での全ゲートの実測値**——`test:node` **412 / 412 / 0**、`test:screen` **12 files / 88 passed**、
`typecheck` `lint` `data:check` `build` **すべて終了コード 0**、`scan:publish` **751 件 / 違反 0**。

**あわせて実測した事実 2 件（重要）。**

1. **`createClientNumber` は、乱数源が受理範囲外のバイトしか返さないと無限ループする。**
   `while (result.length < CLIENT_NUMBER_LENGTH)` に脱出路が無いためである。
   **本番の乱数源（`crypto.getRandomValues`）では 256 通りが一様に出るので確率 1 で停止する。実装は直さない**（§3 裁定 4）。
   **ただし AA-5 をこれに触る形で書くと試験が固まる。** 書き方を §4.2 (a) で指定した。
2. **`writeFallback` の容量判定は `name` と `code` の 2 つの枝を持ち、片方だけでも既存試験は緑になる。**
   Node の `new DOMException('full', 'QuotaExceededError')` は **`code` が自動的に 22 になる**ので、
   既存試験は 2 つの枝を区別できない。**枝を 1 本ずつ立てる作り方を §4.2 (b) に書いた。**

### 0.3 変更してはならないファイルの SHA-256（`sha256sum -c` に流せる）

```
4026c77a2c36bbc0ec4568e409227039701da54c7d550f3df0db0e3eb3d8fbe2 *packages/shared/src/telemetry/client-number.ts
bfd407bbf800dfec761cbdc1771f47f1ab7c299f58da6a61f465b876550feb20 *packages/shared/src/telemetry/queue.ts
bb6014014d6960c0da2ade7c1e27bec77efcb3c8630ff02263d569b09179e8b7 *packages/shared/src/telemetry/registry.ts
73891ee555ce19ca540bf6cb87508ff3c5ccabd738fd93e4da9e3d6344f1faf7 *packages/shared/src/telemetry/sanitize.ts
b56794121cb90ff3748b7388a86f8bf817a0bda689e92330f61b7afd6fb4a263 *packages/shared/src/storage/fallback.ts
1cef3022f7f2c1625d3fe52391339932538fc3aa7164cf5c65aa941d3d406fc2 *packages/shared/src/storage/merge.ts
69c1228a3013669baee2230c1268feaeefa0b8ea61bbd4b18e194f13e9b00697 *packages/shared/src/storage/import.ts
e84602e0e5026b8747fcf311a4b949a28079c87b943f3f3a7f4034471590a94b *packages/shared/src/storage/export.ts
038d0588fd71f056a6065a870205bfe1587f1ed6cd7d106a3e0e5789f37c9a3a *packages/shared/src/storage/reset.ts
66abc9e04ae15b7a64463da6aeded1b687c097d0a80e5ff09c5e64807cbd278a *packages/shared/src/storage/schema.ts
3da6d3793101ef8035a742f9a73014f2fa47d48385ae8f397e41829f56c64402 *packages/shared/src/storage/db.ts
207ac60c33d467651919ffd6549ba062cc12b2485d59be44862f558efca017e0 *packages/shared/src/domain/event.ts
cdd20f59d50477ace6971fb9a081767998b11852438ef3ca7866c1a984128aba *packages/shared/src/app-config.ts
c5b2da11146411e4f956e7aba3852b2a087220646c101b04e810d382069e25e6 *tests/unit/telemetry/fixtures.ts
3b01db70d1640c91c728f114c8f03b4fb4d93989a86b2d03f0a77bf0b9fb71d6 *tests/unit/telemetry/static.test.ts
0e85229b93398e286f29085929883308f23ba8c0ef4b86ce3bb4be6fe9b6c197 *tests/unit/telemetry/registry.test.ts
d9e2ed84804b336af3f086b6f4bf2ce5fa5f9d1e5e1e4b71323be3129221a8c6 *tests/unit/storage/atomicity.test.ts
```

**この 17 件が 1 バイトでも動いたら、それは変更境界の逸脱である。**
**実装を直したくなったら、それは S-2 である。**

### 0.4 着手前に読む・**作業ツリーの状態について**

**`docs/HANDOFF.md` が未コミットで変更されており、`docs/CODEX_WORK_ORDER_046.md`（本書）と
`docs/CODEX_WORK_ORDER_047.md` が未追跡で存在しうる。**
**これは異常ではない。別セッション（P9-B の起票担当）が同じ `docs/` を並行して書いている。**

- **`docs/` に触らないこと。** 読むのはよい。**1 文字も書き換えない。**
- **`git status --porcelain -uall` に `docs/` の行が何本出ていても S-1 ではない。**
- **`packages/` と `tests/` に未コミットの変更があったら、それは S-1 である**（§0.3 のハッシュで判定する）。
- **`git diff --name-only` の判定（A-6・g）は、`docs/` の行を除いた上で数えること。**

---

## 1. 変更境界

### 変更してよいファイル（**4 つだけ**）

```
tests/unit/telemetry/queue.test.ts
tests/unit/telemetry/client-number.test.ts
tests/unit/storage/storage.test.ts
tests/unit/storage/transfer.test.ts
```

### 新規作成してよいファイル

**無い。1 つも無い。**

### 絶対に変更しない・作らないもの

| 対象 | 理由 |
|---|---|
| §0.3 の 17 ファイル | **実装は検収に合格している。試験の穴を実装で埋めない** |
| `packages/` 配下すべて | **この発注は `packages/` を 1 バイトも動かさない**（A-7） |
| `tests/unit/telemetry/fixtures.ts` | **fixture は 043 で非退化にした。触らない。AA-1〜AA-4 は `payload()` を土台に使い、値は試験の中で上書きする** |
| `docs/**` | **別セッションが書いている**（§0.4） |
| 既存の試験の**名前とアサーション** | **消さない・書き換えない。足すだけである** |

---

## 2. 先に読むもの

| 資料 | 見る箇所 |
|---|---|
| `docs/CODEX_WORK_ORDER_045.md` | **§3 の裁定 2**（1 本が 1 つの節に対応する）、**§5.1**（破壊試験の読み方）。**045 と同じ規律で書く** |
| `docs/CODEX_WORK_ORDER_044.md` | **§3 の裁定 3** |
| `packages/shared/src/storage/import.ts` の `parseImport` | **`||` で並んだ節を上から下まで 1 つずつ読み、「この節を消したら赤くなる試験があるか」を自分で数えること** |
| `packages/shared/src/storage/fallback.ts` | **`readFallback` に試験が 1 本も無いことを自分で確かめること**（`grep -rn readFallback tests/`） |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: 新規試験の名前は `AA-` で始める

**`W`・`X`・`Y`・`Z` は使い切っている。`AA-1` 〜 `AA-22` のちょうど 22 本。**
**4 ファイルにまたがるが、番号は 1 本の通し番号にする**（受入条件 A-8 を grep 1 本で判定できるようにするため）。
**種別を試験名のコメントに書くこと**（042〜045 と同じ形式）。**22 本とも「弁別的」である。**

### 裁定 2: 1 本が 1 つの節に対応する。混ぜない

**045 の裁定 2 と同じ。**
**`Array.isArray` の 3 節は AA-18・AA-19・AA-20 に分ける。件数上限の 3 節も分ける。**
**まとめると、どの節が守られているのか破壊試験で切り分けられなくなる。**

**逆に、AA-21 が「余分なキー」と「欠けたキー」を 1 本にまとめるのは正しい。**
**この 2 つは `hasExactTopLevelKeys` の同じ 1 式が守っており、それを分ける破壊が存在しないからである。**

### 裁定 3: `OUTBOX_RETENTION_DAYS` の配線は、**この発注では塞がない**

**実測した穴である**——`> OUTBOX_RETENTION_DAYS` を `> 30` に置き換えても 390/390 全緑だった。
**つまり W-24（定数が 30 であること）と W-20〜W-22（境界の挙動）は互いに独立で、
定数が実際に読まれている保証が無い。**

**それでもこの発注では塞がない。理由は 2 つ。**

1. **`OUTBOX_RETENTION_DAYS` の消費者は `queue.ts` 自身と `queue.test.ts` の 2 箇所しか無い**
   （親担当が `grep -rn` で実測）。**定数と挙動が食い違っても、その食い違いを見る第三者がいない。**
2. **塞ぐには「実装の本文を文字列として読む」静的検査が要る。** それは `static.test.ts` の系統の話であり、
   **`static.test.ts` はこの発注の変更境界の外**である（§0.3 で凍結している）。

**⚠ この判断には期限がある。`OUTBOX_RETENTION_DAYS` に 2 人目の消費者ができた時点で、これは実在する欠陥に変わる。**
**そのときに起票し直すこと。** 記憶 `duplicated-constraint-only-one-nailed`。

### 裁定 4: `createClientNumber` の無限ループは**直さない**

**§0.2 の実測 1 のとおり、受理範囲外のバイトしか返さない乱数源を渡すと停止しない。**
**本番の乱数源は `crypto.getRandomValues` であり、確率 1 で停止する。**
**実装に脱出路を足すのは筋としてありうるが、この発注ではやらない**
（**釘を打つ前に部材を動かさない**。044・045 と同じ）。
**AA-5・AA-6 を「2 回目の呼び出しで受理されるバイトを返す」形で書けば、試験は固まらない**（§4.2 (a)）。

### 裁定 5: `readFallback` の試験は `writeFallback` を経由しない

**AA-9（読み出しが `koten:` を付ける）は、`writeFallback` で書いてから読む形にしない。**
**`Map` に `koten:answers` を直接置いてから読むこと。**

**理由: 経由すると、書き込み側の接頭辞を壊しただけで AA-8 と AA-9 の 2 本が赤くなり、
どちらの側が壊れたのか切り分けられなくなる**（記憶 `mutation-must-isolate-one-test`）。
**親担当は分けた形で M-8・M-9 がそれぞれ 1 本ずつを赤にすることを実測している。**

### 裁定 6: `preview.counts` の試験は非退化な件数を使う

**AA-22 は `sessions` 1 件・`events` 2 件・`reports` 3 件で書く。**
**既存の試験が `{1, 1, 1}` を使っているために、3 つを入れ替えても緑になっていた**（これがこの穴の正体である）。
**3 つとも違う件数にしないと、この試験は何も証明しない**（記憶 `fixture-must-discriminate`）。

---

## 4. 実装範囲

### 4.1 足す 22 本（**ファイルごと。名前は変えない**）

#### `tests/unit/telemetry/queue.test.ts`（+4）

| # | 何を固定するか |
|---|---|
| **AA-1** | `statsDocumentId` が **`clientNumber` を含む**。同じ日・同じ製品で端末番号だけ違う 2 つが**別の ID になる** |
| **AA-2** | `statsDocumentId` が **`localDate` を含む**。同じ端末・同じ製品で日付だけ違う 2 つが**別の ID になる** |
| **AA-3** | `sanitizeStats` が **通った payload の値をそのまま写す**（キーだけでなく値も） |
| **AA-4** | `sanitizeStats` が **`strict: false` でも有効な payload を返す**（`null` にしない） |

#### `tests/unit/telemetry/client-number.test.ts`（+2）

| # | 何を固定するか |
|---|---|
| **AA-5** | **受理境界の内側（251）のバイトは採用される**。`alphabet[251 % 36]` は `'9'` |
| **AA-6** | **受理境界そのもの（252）のバイトは捨てられる**。既存 W-18 は 255 しか見ていない |

#### `tests/unit/storage/storage.test.ts`（+7）

| # | 何を固定するか |
|---|---|
| **AA-7** | `writeFallback` が **成功したら `ok: true` と値を返す**（**成功経路の試験は 1 本も無かった**） |
| **AA-8** | `writeFallback` が **`koten:` を付けた鍵へ JSON を書く** |
| **AA-9** | `readFallback` が **`koten:` を付けた鍵から読む**（裁定 5） |
| **AA-10** | `readFallback` が **保存が無ければ `undefined` を返す**（`null` を返さない） |
| **AA-11** | `readFallback` が **壊れた JSON でも投げずに `undefined` を返す** |
| **AA-12** | 容量超過の判定が **`name` の枝だけでも立つ** |
| **AA-13** | 容量超過の判定が **`code === 22` の枝だけでも立つ** |

#### `tests/unit/storage/transfer.test.ts`（+9）

| # | 何を固定するか |
|---|---|
| **AA-14** | `mergeReports` が **`reportId` で重複を判定する**（既存試験は `existing` が空なので鍵が何でも緑だった） |
| **AA-15** | `parseImport` が **`events` の件数上限を見る** |
| **AA-16** | `parseImport` が **`reports` の件数上限を見る** |
| **AA-17** | `parseImport` が **`sessions` の `product` を見る** |
| **AA-18** | `parseImport` が **`sessions` が配列でなければ弾く** |
| **AA-19** | `parseImport` が **`events` が配列でなければ弾く** |
| **AA-20** | `parseImport` が **`reports` が配列でなければ弾く** |
| **AA-21** | `parseImport` が **最上位キーが余分でも欠けても弾く**（**この検査は素通しにしても全緑だった**） |
| **AA-22** | `preview.counts` が **3 つの配列を取り違えない**（裁定 6） |

### 4.2 書き方の指定（**先に読むこと。ここで詰まらせない**）

**(a) AA-5・AA-6 の乱数源**（裁定 4）。**`bytes(251)` のような「常に同じバイトを返す関数」を渡さないこと。**
**破壊試験 M-5 を当てたときに `createClientNumber` が停止しなくなる。**
**既存の W-18 と同じ「1 回目だけ特別なバイト、2 回目以降は 7」の形で書く。**

```ts
let calls = 0;
const random = (length: number) => {
  calls += 1;
  return calls === 1 ? new Uint8Array(length).fill(251) : new Uint8Array(length).fill(7);
};
assert.equal(createClientNumber(random), '9'.repeat(CLIENT_NUMBER_LENGTH));
```

**AA-6 は `fill(252)` にして、期待値を `'h'.repeat(CLIENT_NUMBER_LENGTH)` にする**（252 が捨てられ 7 が採られる）。

**(b) AA-12・AA-13 の `DOMException`**（§0.2 の実測 2）。
**`new DOMException('full', 'QuotaExceededError')` は Node が `code` を 22 にしてしまうので、2 つの枝を区別できない。**
**`Object.create(DOMException.prototype)` で `name` と `code` を別々に立てること。**

```ts
function domExceptionWith(name: string, code: number): DOMException {
  const error = Object.create(DOMException.prototype) as DOMException;
  Object.defineProperty(error, 'name', { value: name });
  Object.defineProperty(error, 'code', { value: code });
  return error;
}
```

**AA-12 は `domExceptionWith('QuotaExceededError', 0)`、AA-13 は `domExceptionWith('NS_ERROR_DOM_QUOTA_REACHED', 22)`。**
**どちらも `reason` が `'capacity-exceeded'` になることを確かめる。**
**親担当は両方が実装を通ることを実測している**（`instanceof DOMException` はプロトタイプで成立する）。

**(c) `Storage` のテストダブル。** `storage.test.ts` に `Map` を包む小さな補助関数を置いてよい。
**`getItem` は未保存で `null` を返すこと**（`undefined` ではない。本物の `localStorage` に合わせる。
記憶 `test-double-must-match-production`）。

**(d) AA-18〜AA-20 は赤の出方を問わない。**
**`Array.isArray` の節を外すと、配列でない値に対して実装が例外を投げる**（`records.every` が無い）。
**`assert.equal(parseImport(...).ok, false)` で書けば、例外送出でも赤になる。それでよい。**
**`assert.throws` で書かないこと**（045 の裁定 5 と同じ）。

**(e) AA-21 の「欠けたキー」。** 分割代入で捨てると未使用変数が `lint` に当たる。
**`const missing = { ...document } as Record<string, unknown>; delete missing.deviceId;` と書くこと。**
**親担当はこの形で `lint` が 0 で通ることを実測している。**

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 |
|---|---|
| **A-1** | `npm run test:node` が **tests 412 / pass 412 / fail 0**（着手前 390 ＋ 新規 22。**親担当が参照実装で実測した値**） |
| **A-2** | `npm run test:screen` が **12 files / 88 passed** のままである |
| **A-3** | `typecheck` `lint` `data:check` `build` `scan:publish` がすべて終了コード 0。`scan:publish` は **751 件 / 違反 0** |
| **A-4** | §0.3 の 17 ハッシュが **17/17 一致**する |
| **A-5** | `git status --porcelain -uall` の `??` 行が **`docs/` で始まるものだけ**である（`docs/` 以外の未追跡ファイルが 0 件。§0.4） |
| **A-6** | 変更されたファイルが §1 の **4 つだけ**である（**`docs/` の行を除いて数える**） |
| **A-7** | `git diff --name-only` に **`packages/` で始まる行が 1 つも無い** |
| **A-8** | 新規試験が **AA-1〜AA-22 のちょうど 22 本**である |

### 5.0 grep で判定する条件

- **g**: `git diff --name-only | grep -v '^docs/'` の行数が **4**
- **h**: `grep -rho "AA-[0-9]*" tests/ | sort -u | wc -l` が **22**
- **i**: 既存の試験名が 1 本も消えていない——`tests/unit/telemetry/` に `W-` が **28 本**、`X-` が **9 本**、
  `Y-` が **2 本**、`Z-` が **12 本**残っている

### 5.1 破壊試験（**受入の中心。ここを通らなければ緑でも合格にしない**）

**下の期待値は、親担当が参照実装を当てて 24 件すべて実際に走らせた実測値である**（推論ではない）。
**Terra は 24 件を自分で再現し、赤くなった試験の名前を完了報告に書くこと。**
**壊したファイルは必ず `cp` で復元し、復元後に §0.3 のハッシュが一致することを確かめる。**
**Python で書き戻すと改行が化けてハッシュがずれる。`cp` で戻すこと**（記憶 `restore-mutated-file-with-cp`）。

| # | 壊すファイル | 壊し方（**左を右へ置換する**） | 赤くなる試験（実測） | 件数 |
|---|---|---|---|---|
| **M-1** | `telemetry/queue.ts` | `` `${payload.clientNumber}_${payload.localDate}_${payload.product}` `` → `` `${payload.localDate}_${payload.product}` `` | **AA-1 だけ** | 1 |
| **M-2** | `telemetry/queue.ts` | `` `${payload.clientNumber}_${payload.localDate}_${payload.product}` `` → `` `${payload.clientNumber}_${payload.product}` `` | **AA-2 だけ** | 1 |
| **M-3** | `telemetry/sanitize.ts` | `[key, value[key]]` → `[key, value.clientNumber]` | **AA-3・AA-4**（下の注を読むこと） | 2 |
| **M-4** | `telemetry/sanitize.ts` | `return Object.fromEntries` の直前に `if (!options.strict) return null;` を挿入 | **AA-4 だけ** | 1 |
| **M-5** | `telemetry/client-number.ts` | `Math.floor(256 / alphabet.length) * alphabet.length` → `(Math.floor(256 / alphabet.length) * alphabet.length - 1)` | **AA-5 だけ** | 1 |
| **M-6** | `telemetry/client-number.ts` | 同上 → `(Math.floor(256 / alphabet.length) * alphabet.length + 1)` | **AA-6 だけ** | 1 |
| **M-7** | `storage/fallback.ts` | `return { ok: true, value };` → `return { ok: false, reason: 'write-failed', value, shouldExport: false, error: new Error('x') };` | **AA-7 だけ** | 1 |
| **M-8** | `storage/fallback.ts` | `` const fullKey = `koten:${key}`; `` → `const fullKey = key;` | **AA-8 だけ** | 1 |
| **M-9** | `storage/fallback.ts` | `` storage?.getItem(`koten:${key}`) `` → `storage?.getItem(key)` | **AA-9 だけ** | 1 |
| **M-10** | `storage/fallback.ts` | `return raw === null \|\| raw === undefined ? undefined : JSON.parse(raw) as T;` → `return JSON.parse(raw as string) as T;` | **AA-10 だけ** | 1 |
| **M-11** | `storage/fallback.ts` | `} catch { return undefined; }` → `} catch (error) { throw error; }` | **AA-11 だけ** | 1 |
| **M-12** | `storage/fallback.ts` | `error.name === 'QuotaExceededError' \|\| ` を消す | **AA-12 だけ** | 1 |
| **M-13** | `storage/fallback.ts` | ` \|\| error.code === 22` を消す | **AA-13 だけ** | 1 |
| **M-14** | `storage/merge.ts` | `incoming, 'reportId')` → `incoming, 'product')` | **AA-14 だけ** | 1 |
| **M-15** | `storage/import.ts` | ` \|\| document.events.length > limit` を消す | **AA-15 だけ** | 1 |
| **M-16** | `storage/import.ts` | ` \|\| document.reports.length > limit` を消す | **AA-16 だけ** | 1 |
| **M-17** | `storage/import.ts` | `!productsAreValid(document.sessions) \|\| ` を消す | **AA-17 だけ** | 1 |
| **M-18** | `storage/import.ts` | `!Array.isArray(document.sessions) \|\| ` を消す | **AA-18 だけ** | 1 |
| **M-19** | `storage/import.ts` | `!Array.isArray(document.events) \|\| ` を消す | **AA-19 だけ** | 1 |
| **M-20** | `storage/import.ts` | `!Array.isArray(document.reports) \|\| ` を消す | **AA-20 だけ** | 1 |
| **M-21** | `storage/import.ts` | `return Object.keys(value).sort().join('\|') === topLevelKeys.join('\|');` → `return true;` | **AA-21 だけ** | 1 |
| **M-22** | `storage/import.ts` | `events: document.events.length, reports: document.reports.length` → `events: document.reports.length, reports: document.reports.length` | **AA-22 だけ** | 1 |
| **F-1** | `telemetry/registry.ts` | `(value.product === 'hyakunin' \|\| value.product === 'kanazukai')` → `(['hyakunin', 'kanazukai'] as readonly unknown[]).includes(value.product)`（**正しい整理**） | **1 本も赤くならない** | 0 |
| **F-2** | `storage/import.ts` | `!Array.isArray(document.sessions) \|\| !Array.isArray(document.events) \|\| !Array.isArray(document.reports) \|\| document.sessions.length > limit \|\| document.events.length > limit \|\| document.reports.length > limit` → `[document.sessions, document.events, document.reports].some((records) => !Array.isArray(records) \|\| records.length > limit)`（**正しい整理**） | **1 本も赤くならない** | 0 |

**この表の読み方。**

- **M-1〜M-22 は「着手前は 0 本だった」**ものである。
  **親担当が `adc4ce9` に 22 件すべてを当て、いずれも 390/390 全緑だったことを実測した。**
  **`npm run test:screen`（12 files / 88 passed）でも捕まらないことを、M-1 と M-21 で確かめてある。**
  **この 22 件が赤くなることが、この発注が仕事をした唯一の証拠である。**
- **M-3 だけが 2 本を赤にする。** これは欠陥ではない。**AA-3 と AA-4 がどちらも「値が写ること」を見ているためである。**
  **AA-4 が独立に守っているもの（`strict: false` の経路）は、M-4 が 1 本だけ赤にすることで確かめられる。**
  **M-3 で 1 本しか赤くならなかった場合は、AA-3 か AA-4 のどちらかが値を見ていない。報告すること。**
- **M-1〜M-22 が「1 本ずつ」赤くなることが、裁定 2 を守った証拠である**（M-3 を除く）。
  **どれかで 2 本以上赤くなったら、試験を混ぜている**（記憶 `mutation-must-isolate-one-test`）。
- **F-1・F-2 は感度ではなく特異度の試験である。正しい整理を赤にしないこと**を確かめる。
  **ここが赤くなったら、その AA が過剰制約である。**
  **F-2 は、この発注のあとに `parseImport` の 6 節を補助関数へ寄せてよいかを先に測ってある**という意味も持つ。

**M-1〜M-22 のどれかが緑のままだった場合、M-3 以外で 2 本以上赤くなった場合、
あるいは F-1・F-2 で 1 本でも赤が出た場合は、名前を報告に書いて止まること（S-4）。**

### 5.2 試験の質

**完了報告に、新規 22 本それぞれについて「種別」と「どの破壊試験で赤くなったか」を書くこと。**
**§4.1 と §5.1 に親担当の判定を書いてあるので、食い違ったらそれを報告すること。**
**食い違い自体は減点ではない。黙って合わせるのが減点である。**

---

## 6. 停止条件（**該当したら手を止めて親担当へ報告する**）

| # | 条件 |
|---|---|
| **S-1** | §0.3 の 17 ハッシュが**着手前に**一致しない。**`docs/` の未コミット変更は S-1 ではない**（§0.4） |
| **S-2** | **`packages/` を変えないと AA-1〜AA-22 を緑にできないと判断した。** 実装は検収に合格している。**試験の穴を実装で埋めない** |
| **S-3** | §1 の 4 ファイル以外を変える／作る必要が出た |
| **S-4** | **M-1〜M-22 のどれかが緑のまま**だった、**M-3 以外で 2 本以上赤くなった**、または **F-1・F-2 で 1 本でも赤が出た** |
| **S-5** | 既存の試験のどれかを書き換えないと通らないと判断した |
| **S-6** | **破壊試験を当てたら試験が終わらなくなった**（裁定 4 の無限ループ）。**待たずに止めて報告すること。§4.2 (a) の書き方に戻る** |
| **S-7** | 受入条件どうしが矛盾する、または本発注書の記述に誤りを見つけた。**自分で解釈して進めない** |

---

## 7. 完了報告に必ず書くこと

1. 全ゲートの**実測値**（A-1〜A-3 の数字をそのまま）
2. §0.3 の 17 ハッシュの照合結果
3. `git status --porcelain -uall` の全文と `git diff --name-only` の全文
4. §5.0 の grep **g・h・i** の実測件数
5. **破壊試験 M-1〜M-22・F-1・F-2 の 24 件それぞれについて、赤くなった試験の名前**（§5.1 の実測値と食い違ったらそれも書く）
6. **新規試験 22 本それぞれの種別**と、**どの破壊試験で赤くなったか**
7. **独自に決めたこと**（**無ければ「無し」と書く**）
8. **できなかったこと・迷ったこと**（**無ければ「無し」と書く**）

**7 と 8 は検収側で再現できない。** 空欄で出さないこと。

---

## 8. 訂正

（走行中に親担当が追記する。**Terra はこの節を書き換えない。**）
