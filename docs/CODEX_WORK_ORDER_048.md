# 発注048（P9-B2・`transport.ts` を「記述子を組み立てるだけの層」として作り、`app-config.ts` へ Web 設定を入れる）

- **宛先**: Terra（Codex）
- **起票**: 2026-09-03・第29回・親担当（Claude Opus 5）
- **前提コミット**: **§8 で発行時に確定する。起票の時点では発注047 が走行中である**
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

### 0.4 変更してはならないファイルの SHA-256

**§8 で発行時に確定する。起票の時点では発注047 が走行中で、`tests/unit/telemetry/` と `firebase/` が動いている。**

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
   - `stringValue`: `clientNumber`・`localDate`・`product`・`grade`・`appVersion`・`expiresAt`（**6 つ**）
   - `integerValue`（**文字列**）: `pageViews`・`attemptCount`・`dataVersion`・`masteryRulesVersion`（**4 つ**）
   - `doubleValue`（**数値**）: `masteryAvg`・`masteryMax`（**2 つ**）
   - `booleanValue`: `isOfficial`
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
| **T-10** | **文字列 6 つ**（`clientNumber`・`localDate`・`product`・`grade`・`appVersion`・`expiresAt`）が `stringValue`、**`isOfficial` が `booleanValue`**。**7 つを個別に** | §4.1 の 2 |
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
**`test:node` の総数は着手前の基準線 ＋ 19 になること**（基準線は §8 で確定する）。

> **`scan:publish` について。** Web 設定 7 項目は**公開バンドルに入ってよい**（`H05_FIREBASE_BRIEF` §2.1）。
> **違反が 1 件でも出たら S-3 で止まること**（基準線は走査 751 件・違反 0 件）。

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
3. **§5.2 の M-1〜M-14 を 1 件ずつ当てた結果**——**どの試験が赤くなったかを名前で書く。**
   **「期待どおり」と書かない。実際に赤くなった試験名を列挙する。**
   **M-2 で T-5・T-6 も赤くなったかどうかを明記する**（道連れは被覆の粗さの兆候である）
4. **M-13・M-14 の結果**（S-6 に当たったかどうか）
5. **復元の確認**——破壊試験のあと、`git status` が許可された 5 ファイル以外に差分を出さないこと
6. **独自に決めたこと**（無ければ「無し」）
7. **できなかったこと・停止条件に当たったか**（無ければ「無し」）

---

## 8. 発行時に親担当が埋めるもの（**起票の時点では埋められない**）

**発注047 が走行中のため、次の 3 つは発行時に確定する。**

- [ ] **前提コミット**（**047 の検収・確定後のコミット**）
- [ ] **§0.4 の SHA-256 一覧**（変更してはならないファイル。**047 が作った 2 ファイルを必ず含める**）
- [ ] **§5.1 の基準線**（`test:node` / `test:screen` / `scan:publish` の件数。**047 で +8 されているはずである**）

**あわせて、発行前に親担当が行うこと（D-61 条件 3）**——
**参照実装を書いて M-1〜M-14 を実測し、この表と食い違わないことを確かめ、破棄して基準線へ戻す。**
**この工程を飛ばして発行しない。**
**特に M-2 の道連れ（T-5・T-6 が一緒に赤くなるか）は、参照実装の書き方で結果が変わる。実測して表を直すこと。**
