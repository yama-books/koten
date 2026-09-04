# 発注048（P9-B2・`transport.ts` を「記述子を組み立てるだけの層」として作り、`app-config.ts` へ Web 設定を入れる）

- **宛先**: Terra（Codex）
- **起票**: 2026-09-03・第29回・親担当（Claude Opus 5）
- **前提コミット**: **`d287a77` 以降**（2026-09-04・第34回。**判定は §8.1 の 4 条件で行う。ハッシュ一致では見ない**）
- **状態**: **発行済み**（2026-09-04・第34回）。**§8 の 4 項目すべて記入済み。M-1〜M-15 は参照実装で実測して 15/15 一致した（§8.2）。着手条件は §8.1 の 4 つで、公開移管の push 完了後に着手すること**
- **フェーズ**: **P9-B を 3 本に割った 2 本目**（D-65）
- **規模**: 中（**新規 2 ファイル＋既存 3 ファイルの小改修。ネットワークを 1 回も呼ばない**）

> **⚠ この発注は発注047 の完了・検収後にしか発行できない。**
> 047 が `firebase/firestore.rules` と `rules-parity.test.ts` を作り、この発注はその上に乗る。
> **並行して走らせない**（D-61 条件 2）。

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を作るか

**Firestore へ統計 1 件を create するための「HTTP 要求の中身」を組み立てる純関数群を作る。**
**送信そのもの（`fetch` の呼び出し）は作らない。**

- **`fetch` を 1 回も呼ばない。** 組み立てた記述子を返して終わる（理由は §0.2）。
- **App Check トークンの取得経路を作らない。** 引数で受け取り、ヘッダに載せるだけ。
- **outbox からの起動時送信の配線をしない**（P9-B4 の範囲）。
- **エミュレータを持ち込まない**（P9-B3）。**新規依存を 1 つも増やさない。**
- **`firestore.rules` を変更しない**（047 の成果物である）。

### 0.2 なぜ「送信しない送信層」なのか（**親担当の裁定 D-66**）

**選択肢は 2 つあった。**

| 案 | 中身 | 新規依存 | いま試験で守れる範囲 |
|---|---|---|---|
| **A** | Firebase JS SDK（`firebase/app`・`firebase/auth`・`firebase/firestore`）を入れる | **`preact` に次ぐ 2 つ目の実行時依存。公開バンドルに載る** | SDK の内側は試験できない |
| **B（採用）** | **REST の要求記述子を純関数で組み立てる。`fetch` は呼び出し側が持つ** | **0** | **URL・コレクション・文書 ID・本文の型・ヘッダ・状態コードの解釈がすべて単体試験で決まる** |

**採用理由は依存の数ではなく、「いま釘を打てる面積」である。**
案 A だと、409 の扱いも文書 ID も型変換も SDK の内側に隠れ、**エミュレータ（P9-B3）が入るまで 1 本も試験できない。**
案 B なら、**P9-B3 を待たずに全部いま機械判定できる。** `fetch` を呼ぶ数行だけが未試験のまま P9-B4 へ残る。

**D-02 は「統計は Firestore 直書き＋App Check」で確定しており、直書きは REST で足りる。**
**§10.5 の 3 条件を満たす**——コードの変更だけで戻せる／公開物の意味内容・プライバシー境界・ライセンスに触れない／理由をここと `docs/HANDOFF.md` §4.1 に記録する。

> **⚠ 重大な但し書き。この発注の試験が全部緑になっても、「統計が実際に送れる」ことは 1 ミリも証明されない。**
> **証明されるのは「組み立てた要求の中身が仕様どおりであること」だけである。**
> **実際に通るかどうかは P9-B3（エミュレータ）と P9-B4（配線）でしか分からない。**
> **完了報告に「送信を確認した」「Firestore に書けた」と書いてはならない。** 書いたら §6 の S-4 である。

### 0.3 いま塞ごうとしている穴 2 つ（**なぜこの形なのか**）

**穴 1——免除は被覆の穴を空ける。**
D-60 は `telemetry/` の禁止語検査を名指しの 4 ファイルに固定し、**`transport.ts` は免除一覧へ 1 行足して外に出す**と決めた。
**外に出た瞬間、`transport.ts` は W-10〜W-14 のどれからも見られなくなる。**
`localStorage` でトークンを保存しても、`Date.now()` で正確な時刻を載せても、`poemId` を混ぜても、**すべて緑のまま通る。**
**この発注は、免除一覧に載ったファイルを別の検査が必ず拾う配置にする**（§3 裁定 4）。
**免除一覧を単一の出所にし、X-9 と transport 側の禁止語検査の両方がそれを読む。**
**免除ファイルが 2 つ目に増えた日、その 2 つ目も自動で禁止語検査の対象になる。**

**穴 2——17 キー制約の 3 箇所目。**
`STATS_KEYS` の 17 個は、いま `registry.ts`（型検査）と `firestore.rules`（`hasOnly`）の 2 箇所にある。
**この発注は 3 箇所目を作る**——REST の `Value` 表現へ変換する encoder である。
**しかも encoder は「キーの一覧」だけでなく「キーごとの型」まで持つ。**
`registry.ts` が `number` としか言っていない `pageViews` を、REST では `integerValue`（**値は文字列**）で書き、
`masteryAvg` は `doubleValue` で書く。**この対応表が静かにずれると、Rules に弾かれて統計が全部落ちる。**
**送信失敗は画面にも `console` にも出さない設計なので、誰も気づかない**（計画 §7.6）。
**だから型の対応を 1 つずつ釘で留める**（§4.3 の T-7〜T-10。**代表 1 本で済ませない**）。

### 0.4 変更してはならないファイルの SHA-256（**2026-09-04・第33回に `9f53fd4`・clean で実測。18 件**）

**着手前に `sha256sum -c` へ流して 18/18 OK を確かめ、完了報告に再掲すること。**
**1 件でも FAILED なら S-1 である**（並行作業か、想定外の状態）。

**この一覧は発注051 の 17 件とは別物である。**
**外した 3 件**——`packages/shared/src/app-config.ts`・`tests/unit/telemetry/fixtures.ts`・`tests/unit/telemetry/static.test.ts`。
**この発注が正当に変更するファイルである**（§1 の「変更してよい既存ファイル」）。**禁止一覧に入れてはならない。**
**足した 4 件**——`firebase/firestore.rules` と `tests/unit/telemetry/rules-parity.test.ts`（**047 の成果**）、
`tests/unit/telemetry/queue.test.ts` と `tests/unit/telemetry/client-number.test.ts`（**§1 が名指しで禁止している試験**）。

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
29e9f4c48cafd35dcec1617249be2030d7534587e124faad5eeceec983382285 *firebase/firestore.rules
1dacc5ac92579c1a6af65b223d220fa84ad9b1d942724c56c88ff80141c192e5 *tests/unit/telemetry/rules-parity.test.ts
0e85229b93398e286f29085929883308f23ba8c0ef4b86ce3bb4be6fe9b6c197 *tests/unit/telemetry/registry.test.ts
dc592cbbc006ddd6a05f1a46685fa1063386dd2fa44f53f4e5152e30e78186ee *tests/unit/telemetry/queue.test.ts
14ec9948de871e8435dac08c2e4d6f2ccd1901fe53e501e0e75adfff61740209 *tests/unit/telemetry/client-number.test.ts
d9e2ed84804b336af3f086b6f4bf2ce5fa5f9d1e5e1e4b71323be3129221a8c6 *tests/unit/storage/atomicity.test.ts
```

> **この 18 値は改行コードに依存しない。** **発注051 で作業ツリーの CRLF 13 本を LF へ直し、`check:eol` を新設した**ので、
> **どの機械でも同じ値が出る。** 042〜046 の `app-config.ts` で起きた事故（**CRLF 版の値を記録して二度と一致しなくなる**）は
> もう起きない。**記憶 `recorded-hash-carries-machine-state`。**

### 0.5 着手前の状態

**着手時、作業ツリーは clean でなければならない。** clean でなければ **S-1** で止まる。
**`firebase/firestore.rules` と `tests/unit/telemetry/rules-parity.test.ts` が commit 済みで存在していること**を確かめる。
無ければ **S-2**（047 が未完了である。この発注は乗る土台が無い）。

---

## 1. 変更境界

### 新規作成してよいファイル（**2 つだけ**）

| ファイル | 中身 |
|---|---|
| `packages/shared/src/telemetry/transport.ts` | 要求記述子の組み立てと状態コードの解釈。**§4.1** |
| `tests/unit/telemetry/transport.test.ts` | 上の試験。**§4.3** |

### 変更してよい既存ファイル（**3 つだけ。書き足す量は下に書いたとおり**）

| ファイル | 変更内容 |
|---|---|
| `packages/shared/src/app-config.ts` | **`firebase` の 6 項目と `appCheckSiteKey` を足す。§4.2**。他の既存キーを 1 つも変えない |
| `tests/unit/telemetry/fixtures.ts` | **`TELEMETRY_EXEMPT_FILES` の export と、免除ファイルを読む関数を 1 つ足す。§4.4**。既存の export を変えない |
| `tests/unit/telemetry/static.test.ts` | **X-9 を `TELEMETRY_EXEMPT_FILES` を使う形に直し、X-10 を 1 本足す。§4.4**。W-10〜W-14・X-8 を変えない |

### 絶対に変更しない・作らないもの

- **`firebase/firestore.rules`**（047 の成果物。**1 バイトも触らない**）。
- **`tests/unit/telemetry/rules-parity.test.ts`**（同上）。
- **`packages/shared/src/telemetry/` の既存 4 ファイル**（`registry.ts`・`queue.ts`・`sanitize.ts`・`client-number.ts`）。
  **`statsDocumentId` も `STATS_KEYS` も、既にあるものを import して使う。書き写さない。**
- **`tests/unit/telemetry/` の既存試験**（`registry.test.ts`・`queue.test.ts`・`client-number.test.ts`・`rules-parity.test.ts`）。
  **例外は `static.test.ts` と `fixtures.ts` の 2 つだけ**（上の表）。
- **`package.json`・`package-lock.json`。** **新規依存を 1 つも入れない。**
- `docs/` 配下（この発注書を含む）、一次資料一式、`review/`、`data/`。
- **UI 層（`packages/*/src/ui/`）と `storage/` 配下。** 配線は P9-B4 である。

---

## 2. 先に読むもの

| 場所 | 何のため |
|---|---|
| `packages/shared/src/telemetry/registry.ts` | **`STATS_KEYS` 17 個・`BUTTON_KEYS`・`ENTRY_KEYS`・`QUESTION_TYPE_KEYS`・`StatsPayload` の型** |
| `packages/shared/src/telemetry/queue.ts` | **`statsDocumentId`。これを再実装しない** |
| `firebase/firestore.rules`（047 の成果） | Rules が要求する型。**encoder はこれに通る形を作る** |
| `tests/unit/telemetry/static.test.ts`・`fixtures.ts` | 免除一覧の現状（`exemptFiles` は X-9 の中のローカル定数） |
| `tests/unit/telemetry/rules-parity.test.ts`（047 の成果） | **既にある禁止語走査（R-8）の範囲。§3 裁定 5 で重複を禁じる** |
| `docs/HANDOFF.md` **§4.1 の D-58・D-59・D-60・D-63** ＋ **§4.2 の「D-02 の運用前提」** | 17 キー、文書 ID、免除一覧、Analytics 禁止、無課金運用 |
| `docs/IMPLEMENTATION_PLAN.md` **§7.4・§7.6** | コレクション設計と 409 の扱い |

**`docs/IMPLEMENTATION_PLAN.md` は 2,000 行を超える。節を指定して読むこと。**

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: `transport.ts` は `fetch` を呼ばない。記述子を返して終わる

**`fetch`・`XMLHttpRequest`・`navigator.sendBeacon` を 1 回も書かない**（§4.3 の T-17 で守る）。
戻り値は `{ url, method, headers, body }` の素のオブジェクトである。
**理由は §0.2。** 呼び出し側（P9-B4）が `fetch` を持つ。

**この裁定の代償を明記する**——**「組み立てた記述子が実際に受理されるか」はこの発注では分からない。**
**それでよい。** 分からないことを分かったふりで報告しないこと（S-4）。

### 裁定 2: 文書 ID とコレクション名は 1 箇所からしか出さない

- **文書 ID は `queue.ts` の `statsDocumentId` を import して使う**（D-59）。**同じ式を書き写さない。**
- **コレクション名は `statsCollection(isOfficial)` の 1 関数からしか出さない。**
  URL を組む側で `'stats_days_' + env` のような文字列連結を再度書かない。

**理由**——044・045・046 が潰したのは全部この型である（同じ式が横に並び、釘が片方にしか刺さらない）。

### 裁定 3: コレクションは `payload.isOfficial` から決める。引数で別に受け取らない

`statsCreateRequest` は `isOfficial` を**独立した引数として取らない。** `payload.isOfficial` を見る。

**理由**——引数で別に取ると、**payload の中身とコレクションが食い違う組み合わせが作れてしまう。**
`isOfficial: false` の統計が `stats_days_official` へ入る事故は、憲章 §6 の test/official 物理分離を壊す。
**呼び出し側が間違えられない形にする**（§4.3 の T-11）。

### 裁定 4: 免除一覧は単一の出所にし、免除されたファイルは別の禁止語検査が必ず拾う

**`TELEMETRY_EXEMPT_FILES` を `fixtures.ts` に置き、X-9 と transport の禁止語検査の両方がそれを読む。**
**X-9 のローカル定数 `exemptFiles` は消す。**

**理由**——**免除は「検査の外に出す」ことなので、出した先に別の検査が無ければ被覆がゼロになる**（§0.3 の穴 1）。
**一覧を 1 つにしておけば、2 つ目の免除ファイルが増えた日、それも自動で禁止語検査に入る。**
**「代表 1 本を見て済ませる」形にしないこと**（記憶: 同じ制約が 2 箇所にあると片方しか刺さらない）。

### 裁定 5: D-63 の禁止語（Analytics 系）をここで重複させない

**`getAnalytics`・`firebase/analytics`・`gtag`・`measurementId` の走査は、047 の R-8 が `packages/` 全体で行っている。**
**この発注で同じ語の走査をもう 1 本書かないこと。**

**理由**——D-63 は 047 より前に書かれた文で、「`telemetry/` とは別系統の走査対象を起こせ」と求めていた。
**047 の R-8（`packages/` 配下の再帰走査＋件数下限）がそれを満たしている。**
ここで同じ語をもう 1 本書けば、**同じ制約が 2 箇所に書かれ、片方しか釘が刺さらない配置**を自分で作ることになる。

**そのかわり、この発注が足す禁止語は R-8 と重ならない別の語である**（保存・時刻・DOM・個別履歴。§4.3 の T-16）。
**これは `transport.ts` が W-10〜W-14 の外へ出たことで失う被覆をちょうど埋めるものである。**

### 裁定 6: `measurementId` を `app-config.ts` に入れない

**D-63 のとおり。** Web 設定は **6 項目だけ**入れる（§4.2）。**7 つ目を足さない。**

### 裁定 7: `firebaseEnabled` は `false` のまま置く

**この発注では送信の配線をしないので、フラグを立てる理由が無い**（D-02 運用前提 6）。
**`true` に変えないこと。** 変えたら §5.0 の A-3 で落ちる。

### 裁定 8: 整数は `integerValue` で、値は**文字列**で書く

Firestore REST の `Value` は int64 を JSON の文字列で表す。**`{ integerValue: '7' }` であって `{ integerValue: 7 }` ではない。**
`masteryAvg`・`masteryMax` だけが `doubleValue`（数値のまま）である。
**この対応を 1 つずつ試験する**（§4.3 の T-7・T-8）。**代表 1 本にしない**（記憶: 横に並んだ同型の節は代表 1 本しか試験されない）。

### 裁定 9: 匿名トークンを永続化しない。削除要求の組み立てまでを持つ

計画 P9 の 5 は「匿名認証 → create → 匿名アカウント削除」である。
**この発注は 3 つの要求すべての記述子を組み立てる**（作るだけ作って削除を忘れると、匿名アカウントが端末ごとに残り続ける）。
**`localStorage`・`sessionStorage`・`indexedDB`・`document.cookie` を `transport.ts` に書かない**（T-16）。

### 裁定 10: 新規試験の名前は `T-` で始める

既存は `V-`・`W-`／`X-`・`Y-`／`Z-`・`AA-`・`R-`・`P1:` を使っている。**`T-1` から連番。** 既存の記号を再利用しない。
**X-10 だけは例外で、`static.test.ts` の既存の並びに足すため `X-` を使う**（同じファイル・同じ性質のため）。

---

## 4. 実装範囲

### 4.1 `packages/shared/src/telemetry/transport.ts`（新規）

**次を export する。名前はこのとおりにすること**（試験が名前で呼ぶ）。

```ts
export type HttpRequestSpec = {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: string;
};
export type SendOutcome = 'sent' | 'retry';

export function statsCollection(isOfficial: boolean): string;
export function encodeStatsFields(payload: StatsPayload): Record<string, unknown>;
export function anonymousSignUpRequest(config: FirebaseWebConfig): HttpRequestSpec;
export function anonymousDeleteRequest(config: FirebaseWebConfig, idToken: string): HttpRequestSpec;
export function statsCreateRequest(
  config: FirebaseWebConfig,
  options: { payload: StatsPayload; idToken: string; appCheckToken: string | null },
): HttpRequestSpec;
export function interpretCreateStatus(status: number): SendOutcome;
```

**要件。**

1. `statsCollection(true)` は `'stats_days_official'`、`statsCollection(false)` は `'stats_days_test'`（計画 §7.4）。
2. `encodeStatsFields` は **`STATS_KEYS` の 17 個をちょうど**返す。型の対応は**裁定 8** と次のとおり。
   - `stringValue`: `clientNumber`・`localDate`・`product`・`grade`・`appVersion`（**5 つ**）
   - `integerValue`（**文字列**）: `pageViews`・`attemptCount`・`dataVersion`・`masteryRulesVersion`（**4 つ**）
   - `doubleValue`（**数値**）: `masteryAvg`・`masteryMax`（**2 つ**）
   - `booleanValue`: `isOfficial`
   - `timestampValue`: `expiresAt` の `YYYY-MM-DD` に **`T00:00:00.000Z` を付けた固定 UTC 午前0時**（D-70）。端末時刻・タイムゾーンを読まない
   - `mapValue.fields`: `buttonCounts`・`entryCounts`・`questionTypeCounts`（**各値は `integerValue` の文字列**）
   - `arrayValue.values`: `masteryDistribution`（**5 要素・各 `integerValue` の文字列**）
3. `statsCreateRequest` の URL は
   `https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents/{collection}?documentId={docId}`。
   **`{collection}` は `statsCollection(payload.isOfficial)`（裁定 3）、`{docId}` は `statsDocumentId(payload)`（裁定 2）。**
   本文は `{"fields": <encodeStatsFields の結果>}` を `JSON.stringify` したもの。
   ヘッダは `Content-Type: application/json` と `Authorization: Bearer {idToken}`、
   **`appCheckToken` が `null` でないときだけ `X-Firebase-AppCheck` を足す**（D-62 条件 b により enforce はまだ入れていない）。
4. `anonymousSignUpRequest` は `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={apiKey}`、
   本文 `{"returnSecureToken":true}`。**`Authorization` ヘッダを付けない**（まだトークンが無い）。
5. `anonymousDeleteRequest` は `https://identitytoolkit.googleapis.com/v1/accounts:delete?key={apiKey}`、
   本文 `{"idToken":"..."}`（裁定 9）。
6. `interpretCreateStatus`: **200 と 409 は `'sent'`**（409 ALREADY_EXISTS を成功とみなす。計画 §7.6）。
   **それ以外はすべて `'retry'`。例外を投げない。`console` を 1 回も呼ばない**（計画 §7.6 の「画面にも `console` にも出さない」）。
7. `FirebaseWebConfig` の型は `app-config.ts` の `appConfig.firebase` の形から導く
   （`typeof appConfig.firebase` を使ってよい）。**6 項目を別に書き写さない。**

### 4.2 `packages/shared/src/app-config.ts`（変更）

**次の 2 つを足す。既存のキーを 1 つも変えない。**

```ts
  firebase: {
    apiKey: 'AIzaSyCDOo2YfCxkTWAGpPotCzabWtpJN_kK0Ko',
    authDomain: 'koten-fde43.firebaseapp.com',
    projectId: 'koten-fde43',
    appId: '1:324835470506:web:b81389fcaa9bbfe49834d3',
    messagingSenderId: '324835470506',
    storageBucket: 'koten-fde43.firebasestorage.app',
  },
  appCheckSiteKey: '6LfypaYtAAAAAOpjJ_83HMURnkXIH_iJ9kuwEl0O',
```

**この 7 つの値は公開してよい識別子である**（`docs/H05_FIREBASE_BRIEF.md` §2.1。秘密ではない）。
**`measurementId` を足さない**（裁定 6）。**`firebaseEnabled` は `false` のまま**（裁定 7）。

### 4.3 `tests/unit/telemetry/transport.test.ts`（新規）

**`node:test` ＋ `node:assert/strict`。既存の流儀。payload は `fixtures.ts` の `payload()` を使う。**

**足す試験は 18 本。**

| # | 名前 | 見るもの |
|---|---|---|
| **T-1** | `statsCollection(true)` が `stats_days_official` | 計画 §7.4 |
| **T-2** | `statsCollection(false)` が `stats_days_test` | **両方向。片方だけ見ない** |
| **T-3** | `encodeStatsFields` のキー集合が `STATS_KEYS` と**集合として一致** | **17 キー制約の 3 箇所目** |
| **T-4** | `buttonCounts` の `mapValue.fields` のキーが `BUTTON_KEYS` と一致 | D-58 |
| **T-5** | `entryCounts` の `mapValue.fields` のキーが `ENTRY_KEYS` と一致 | **T-4 の代表で済ませない** |
| **T-6** | `questionTypeCounts` の `mapValue.fields` のキーが `QUESTION_TYPE_KEYS` と一致 | 同上 |
| **T-7** | **整数 4 つ**（`pageViews`・`attemptCount`・`dataVersion`・`masteryRulesVersion`）が `integerValue` を持ち、**値が `string` 型**である。**4 つを個別に assert する** | 裁定 8 |
| **T-8** | **`masteryAvg` と `masteryMax`** が `doubleValue` を持ち、**値が `number` 型**で、`integerValue` を持たない。**2 つを個別に** | 裁定 8 |
| **T-9** | `masteryDistribution` が `arrayValue.values` で長さ 5、**各要素が `integerValue` の文字列** | D-58 |
| **T-10** | **文字列 5 つ**（`clientNumber`・`localDate`・`product`・`grade`・`appVersion`）が `stringValue`、`expiresAt` が元の日付に対応する固定UTC午前0時の `timestampValue`、**`isOfficial` が `booleanValue`**。**7 つを個別に** | §4.1 の 2・D-70 |
| **T-11** | `statsCreateRequest` の URL が、**`payload.isOfficial` に対応するコレクション**と `statsDocumentId(payload)` を含む。**`isOfficial` を `true`／`false` の両方で確かめる** | **裁定 3 の心臓** |
| **T-12** | `appCheckToken` が文字列なら `X-Firebase-AppCheck` ヘッダが付き、**`null` なら付かない**。**両方向** | §4.1 の 3 |
| **T-13** | **`statsCreateRequest` の** `Authorization` が `Bearer {idToken}` である。**かつ、その `body` に `idToken` が現れない**（**`anonymousDeleteRequest` の body には現れる。そちらは §4.1 の 5 のとおりで正しい**） | トークンを本文へ漏らさない |
| **T-14** | `interpretCreateStatus`: **200→`sent`・409→`sent`**、**400・401・403・429・500・0→`retry`**。**表で回す。例外を投げないことも確かめる** | 計画 §7.6 |
| **T-15** | `anonymousSignUpRequest` が `accounts:signUp` と `key={apiKey}` を含み、**`Authorization` ヘッダを持たない** | §4.1 の 4 |
| **T-16** | **免除ファイル**（`TELEMETRY_EXEMPT_FILES`）の本文に `localStorage`・`sessionStorage`・`indexedDB`・`document.cookie`・`Date.now`・`toISOString`・`getTimezoneOffset`・`textContent`・`innerHTML`・`getAttribute`・`poemId`・`questionId`・`sessionId`・`eventId`・`console` が現れない。**かつ走査したファイルが 1 件以上あり、各本文が 1 文字以上あることを先に assert する** | **裁定 4・9。走査対象の実在を確かめる** |
| **T-17** | `transport.ts` に `fetch(`・`XMLHttpRequest`・`sendBeacon` が現れない | 裁定 1 |
| **T-18** | `package.json` の `dependencies` が **`preact` の 1 件だけ**である | **新規依存 0 の番人** |

**T-16 について。** 走査は `TELEMETRY_EXEMPT_FILES` を読む（**`transport.ts` と直に書かない**）。
**免除ファイルが将来 2 つになったら、その 2 つ目も自動でこの検査に入る形にすること**（裁定 4）。

### 4.4 `fixtures.ts` と `static.test.ts`（変更）

**`fixtures.ts` に足すもの（既存の export を変えない）。**

```ts
export const TELEMETRY_EXEMPT_FILES = ['transport.ts'] as const;
export function telemetryExemptSources(): Array<{ file: string; text: string }>;  // 名前で readFileSync する
```

**`static.test.ts` の変更（2 つだけ）。**

1. **X-9** のローカル定数 `const exemptFiles: string[] = []` を消し、**`TELEMETRY_EXEMPT_FILES` を使う**（裁定 4）。
   **assert の中身（ディレクトリの `.ts` が検査対象＋免除一覧と一致する）は変えない。**
2. **X-10 を 1 本足す**——**`TELEMETRY_EXEMPT_FILES` がちょうど `['transport.ts']` である**（固定ピン）。
   **黙って 2 つ目が増えたら赤くなる。**

**W-10〜W-14 と X-8 を 1 文字も変えないこと。** 触ったら §5.0 の A-5 で落ちる。

### 4.5 型について（**ここで詰まらせない**）

`encodeStatsFields` の戻りは `Record<string, unknown>` でよい。**`as` による型の押し込みを使わない。**
`FirebaseWebConfig` は `typeof appConfig.firebase` から導く（§4.1 の 7）。
`STATS_KEYS` は `readonly` なので、集合比較は `[...STATS_KEYS].sort()` と `Object.keys(...).sort()` を `assert.deepEqual` で突き合わせる。

---

## 5. 受入条件（**すべて機械判定できること**）

### 5.0 grep で判定する条件

| # | 条件 |
|---|---|
| A-1 | `transport.ts` に `fetch(`・`XMLHttpRequest`・`sendBeacon` が**現れない** |
| A-2 | `transport.ts` に `localStorage`・`sessionStorage`・`indexedDB`・`cookie`・`console` が**現れない** |
| A-3 | `app-config.ts` に `measurementId` が**現れない**、かつ `firebaseEnabled: false` のままである |
| A-4 | `firebase/firestore.rules` と `tests/unit/telemetry/rules-parity.test.ts` の差分が **0 バイト** |
| A-5 | `static.test.ts` の W-10〜W-14・X-8 の**行が変わっていない**（X-9 の 1 箇所と X-10 の追加以外に差分が無い） |
| A-6 | `package.json`・`package-lock.json` の差分が **0 バイト** |
| A-7 | `telemetry/` の既存 4 実装ファイル（`registry`・`queue`・`sanitize`・`client-number`）の差分が **0 バイト** |
| A-8 | 新規試験の名前が **`T-1` 〜 `T-18` の 18 本ちょうど**＋ `static.test.ts` に **`X-10` が 1 本**（合計 **+19**） |
| A-9 | `transport.ts` が `statsDocumentId` を `queue.ts` から import しており、**文書 ID の式を書き写していない**（`_${` の連結が `transport.ts` に現れない） |

### 5.1 ゲート

`npm run typecheck` / `npm run lint` / `npm test` / `npm run data:check` / `npm run build` /
`npm run scan:publish` が**すべて終了コード 0**。
**`test:node` の総数は着手前の基準線 430 ＋ 19 ＝ 449 になること。**

**基準線は §8.3 の表が正である**（2026-09-04・第34回に採り直し、参照実装で着手後の値も実測した）。
**起票時（第33回）の値 420／439・`scan:publish` 751・`check:eol` 1032 は古い。使わないこと。**

> **⚠ `check:eol` の件数を判定に使わないこと。** この検査は `git ls-files` を数えるので、
> **件数は「ファイルを作った時点」ではなく「commit した時点」で動く。** 見るのは**違反 0 件**だけである。

> **`check:eol` は `npm test` に入っていない。** 着手後に別途走らせること（発注051 で新設）。

> **`scan:publish` について。** Web 設定 7 項目は**公開バンドルに入ってよい**（`H05_FIREBASE_BRIEF` §2.1）。
> **違反が 1 件でも出たら S-3 で止まること**（基準線は走査 753 件・違反 0 件。§8.3）。

### 5.2 破壊試験（**受入の中心。ここを通らなければ緑でも合格にしない**）

**各行を 1 つずつ当て、指定の試験だけが赤くなることを確かめ、`cp` で元に戻すこと。**
**Python で書き戻すと改行が化けてハッシュがずれる**（記憶: 破壊試験のあとは cp で復元）。

| # | 壊し方 | 赤くなるべきもの |
|---|---|---|
| **M-1** | `encodeStatsFields` に架空のキー `foo` を 1 つ足す | **T-3 だけ**（**`expiresAt` を消す破壊は使わない。T-3 と T-10 の 2 本が同時に赤くなり、1 件を分離できないためである**） |
| **M-2** | `buttonCounts` の encode から `report` を落とす | **T-4 だけ**（**T-5・T-6 が道連れで赤くなったら、3 つを 1 本で見ている＝§3 裁定 4 の趣旨違反**） |
| **M-3** | `entryCounts` の encode から `exam` を落とす | **T-5 だけ** |
| **M-4** | `pageViews` を `{ integerValue: payload.pageViews }`（数値のまま）に変える | **T-7 だけ** |
| **M-5** | `masteryAvg` を `integerValue` に変える | **T-8 だけ** |
| **M-6** | `masteryDistribution` の要素を `doubleValue` に変える | **T-9 だけ** |
| **M-7** | `statsCreateRequest` のコレクションを `statsCollection(true)` 固定に変える | **T-11 だけ**（**`isOfficial: false` の側を見ていなければ緑になる。裁定 3 の心臓**） |
| **M-8** | `appCheckToken` が `null` でもヘッダを常に付ける | **T-12 だけ** |
| **M-9** | `interpretCreateStatus` の 409 を `'retry'` に変える | **T-14 だけ** |
| **M-10** | `transport.ts` に `const saved = localStorage;` と 1 行足す | **T-16 だけ**（**免除で被覆が消えていれば全緑になる。§0.3 の穴 1 の心臓**） |
| **M-11** | `TELEMETRY_EXEMPT_FILES` に `'dummy.ts'` を足す | **X-9・X-10・T-16 の 3 本**（**T-16 は存在しないファイルを読んで落ちる。これは事故ではなく確認である**——**T-16 が赤くならなければ、T-16 が免除一覧を読んでおらず `transport.ts` を直書きしている＝裁定 4 違反である**） |
| **M-12** | `package.json` の `dependencies` に `"firebase": "^11.0.0"` を足す（**`npm install` はしない**） | **T-18 だけ** |
| **M-13** | **検査自身を壊す。** `telemetryExemptSources()` を空配列を返す形に変える | **T-16 の件数 assert が赤**（記憶: 否定の検査は走査対象の実在を確かめる） |
| **M-14** | **検査自身を壊す。** T-11 から `isOfficial: false` の側の assert を消したうえで **M-7 を当て直す** | **T-11 が緑のまま通ってしまうこと**（＝この破壊は**試験の弱さを可視化する**。**通ってしまったら S-6**） |
| **M-15** | `expiresAt` を `timestampValue` ではなく `stringValue` に戻す | **T-10 だけ**（TTL が無効になる退行を分離して検出する。D-70） |

**M-14 は「壊したら赤くなる」ではなく「試験が片方しか見ていないと何が起きるか」を見る破壊である。**
**報告には M-14 の結果を必ず書くこと。**

### 5.3 試験の質

- **`assert.ok(true)` に相当するアサーションを 1 つも書かない。**
- **1 本が 1 つのことを見る。** T-4 に T-5 の内容を混ぜない。
- **アサーションのメッセージに `T-7:` のように番号を書く**（既存の流儀）。
- **`payload()` を書き換えない。** 値が要るときは複製して上書きする（`{ ...payload(), isOfficial: false }`）。

---

## 6. 停止条件（**該当したら手を止めて親担当へ報告する**）

| # | 条件 | なぜ止まるか |
|---|---|---|
| **S-1** | **着手時に作業ツリーが clean でない** | 並行作業がある。基準線が取れない |
| **S-2** | **`firebase/firestore.rules` が存在しない** | 047 が未完了である。この発注は土台の上に乗る |
| **S-3** | **`scan:publish` に違反が出る** | 公開範囲の話であり**依頼者裁定**である |
| **S-4** | **「送信を確認した」「Firestore に書けた」と書きたくなった** | **この層は送信しない**（§0.2）。書かない |
| **S-5** | **新規依存を入れたくなった**（`firebase` パッケージ・HTTP クライアント・モック機構） | この発注は依存を 1 つも増やさない。**`node:test` の標準機能で足りる** |
| **S-6** | **M-14 で T-11 が緑のまま通った** | **試験が片方しか見ていない。** 直してから報告する |
| **S-7** | **`registry.ts` か `queue.ts` を変えないと書けない** | 発注の前提が崩れている。**勝手に触らない** |

---

## 7. 完了報告に必ず書くこと

1. **§5.0 の A-1〜A-9 の実測値**（数値をそのまま）
2. **§5.1 の全ゲートの終了コードと `test:node` の総数**（着手前と着手後の両方）
3. **§5.2 の M-1〜M-15 を 1 件ずつ当てた結果**——**どの試験が赤くなったかを名前で書く。**
   **「期待どおり」と書かない。実際に赤くなった試験名を列挙する。**
   **M-2 で T-5・T-6 も赤くなったかどうかを明記する**（道連れは被覆の粗さの兆候である）
4. **M-13・M-14 の結果**（S-6 に当たったかどうか）
5. **復元の確認**——破壊試験のあと、`git status` が許可された 5 ファイル以外に差分を出さないこと
6. **独自に決めたこと**（無ければ「無し」）
7. **できなかったこと・停止条件に当たったか**（無ければ「無し」）

---

## 8. 発行時に親担当が埋めるもの（**4 項目すべて記入済み。この発注は発行済みである**）

- [x] **前提コミット**——**`d287a77` 以降**（2026-09-04・第34回）。
      **公開移管の commit がこれより後に入っているのは想定内で、S-1 ではない。**
      判定は commit ハッシュではなく、下の「着手前に自分で確かめること」の 4 条件で行う。
- [x] **§0.4 の SHA-256 一覧**——**18 件。第34回に `d287a77`・clean で再照合し、18/18 OK。**
      **第33回に `9f53fd4` で記録した値から 1 件も動いていない**（第34回の変更はどれもこの 18 件に触れていない）。
- [x] **§5.1 の基準線**——**第34回に採り直した。下の表が正である。**
- [x] **D-61 条件 3——参照実装で M-1〜M-15 を実測した。§8.2 に全結果がある。表の修正は不要だった。**

### 8.1 着手前に自分で確かめること（**commit ハッシュではなく、この 4 条件で判定する**）

| # | 条件 | 満たさないとき |
|---|---|---|
| 1 | `git status --porcelain -uall` が **0 行** | **S-1** |
| 2 | §0.4 の `sha256sum -c` が **18/18 OK** | **S-1** |
| 3 | `npm run test:node` が **430 / 430 / 0** | **S-1**（基準線が動いている） |
| 4 | `npm run check:eol` の**違反が 0 件** | **S-1** |

> **⚠ 着手は公開移管の push が完了してからにすること。**
> **第34回の時点でテスト公開の移管が進行中であり、`packages/` に手が入ると移管ツリーが
> 作りかけのスナップショットになる**（記憶 `parallel-order-invalidates-baseline`）。
> **上の条件 3 が 430 でなければ、まだ移管が終わっていないか別の作業が走っている。**

> **`check:eol` の件数は指定しない。** この検査は `git ls-files` を数えるので、
> **件数は「ファイルを作った時点」ではなく「commit した時点」で動く。**
> **判定に使うのは違反 0 件だけである。**（第34回に 1041 → 1043 と動いて実際に混乱した。）

### 8.2 M-1〜M-15 の実測（**2026-09-04・第34回。親担当が参照実装を書いて測り、破棄した**）

**参照実装は `transport.ts`・`transport.test.ts` の新規 2 本と、`app-config.ts`・`fixtures.ts`・`static.test.ts` の改修である。**
**`test:node` は 430 → 449（＋19）で、§5.1 の予測と一致した。**
**各破壊は 1 件ずつ当て、`tests/unit/telemetry/*.test.ts`（84 件）を走らせて赤くなった試験名を採り、`cp` で戻した。**

| # | 表の予測 | **実測** | 一致 |
|---|---|---|---|
| M-1 | T-3 だけ | **T-3** | ○ |
| M-2 | T-4 だけ（T-5・T-6 が道連れなら違反） | **T-4**（**道連れ無し**） | ○ |
| M-3 | T-5 だけ | **T-5** | ○ |
| M-4 | T-7 だけ | **T-7** | ○ |
| M-5 | T-8 だけ | **T-8** | ○ |
| M-6 | T-9 だけ | **T-9** | ○ |
| M-7 | T-11 だけ | **T-11** | ○ |
| M-8 | T-12 だけ | **T-12** | ○ |
| M-9 | T-14 だけ | **T-14** | ○ |
| M-10 | T-16 だけ | **T-16** | ○ |
| M-11 | X-9・X-10・T-16 の 3 本 | **T-16・X-9・X-10** | ○ |
| M-12 | T-18 だけ | **T-18** | ○ |
| M-13 | T-16 の件数 assert | **T-16** | ○ |
| M-14 | **T-11 が緑のまま通る** | **84/84 緑のまま通った** | ○ |
| M-15 | T-10 だけ | **T-10** | ○ |

**15/15 が予測どおりだったので、§5.2 の表は 1 行も直していない。**

**M-2 の道連れは起きなかった。** 起票時に「参照実装の書き方で変わる」と注記されていた点である。
**道連れが起きない書き方**は、`buttonCounts`・`entryCounts`・`questionTypeCounts` を
**共通のヘルパに `KEYS` を引数で渡して組み立てる**形である（`counts(map, BUTTON_KEYS)`）。
**この形なら、片方の KEYS を間引いても他方の encode は影響を受けない。**
**3 つを別々にベタ書きしても同じ結果になるが、`STATS_KEYS` の 4 箇所目を作ることになるので薦めない。**

**M-14 の結果を明記する**（§5.2 が報告を求めている）。
**T-11 の `for (const isOfficial of [true, false])` を `[true]` に削ってから M-7 を当てると、84 件が全部緑のまま通った。**
**つまり T-11 が片方向しか見ていなければ、裁定 3 の違反は素通りする。** **両方向を必ず残すこと。**

### 8.3 参照実装で測った着手後のゲート（**Codex はこの値に一致させること**）

| 検査 | 着手前 | **着手後（参照実装での実測）** |
|---|---|---|
| `npm run test:node` | **430 / 430 / 0** | **449 / 449 / 0** |
| `npm run test:screen` | **12 files / 89** | **12 files / 89**（同数。screen 試験を足さない） |
| `npm run scan:publish` | 走査 **753** / 違反 **0** | 走査 **753** / 違反 **0**（**Web 設定 7 項目は公開バンドルに入ってよい**） |
| `npm run check:eol` | 違反 **0** | 違反 **0**（件数は commit 時に動くので判定に使わない） |
| `npm run data:check` | **0** | **0** |
| `typecheck` / `lint` / `build` | すべて **0** | すべて **0** |

> **`test:node` が 449 でなければ、足した試験の本数が 19 本ちょうどではない**（A-8）。

### 8.4 参照実装は破棄済みであることの確認（**第34回に実測**）

`rm` と `git checkout` で破棄したうえで、**`git status --porcelain -uall` が 0 行**、
**§0.4 の 18 ハッシュが 18/18 OK**、**`test:node` が 430 / 430 / 0** に戻ることを確かめた。
**この発注が土台にする木は、参照実装を書く前と 1 バイトも違わない。**

