# 発注049（P9-B3・Firestore Emulator で Rules の実挙動を検査する）

- **宛先**: Luna（Codex）
- **起票**: 2026-09-03・第30回・親担当（Codex Sol）
- **前提コミット**: `1ec279a`
- **発注書を含む実装開始時 HEAD**: `e23422c`（前提コミットは047の実装基準線を指す）
- **フェーズ**: P9-B3（D-65）
- **規模**: 中（試験専用環境＋Rules 補強。アプリ実装・送信経路は触らない）
- **状態**: **親検収合格（2026-09-03・第30回）**

---

## 0. 目的と境界

`firebase/firestore.rules` を Firestore Emulator の実際の Rules エンジンで評価し、
許可すべき create だけが通り、それ以外が拒否されることを自動検査する。

この発注は Firebase の実プロジェクトへ接続しない。ログイン・API キー・サービスアカウント鍵・
App Check キーを要求しない。プロジェクト ID は `demo-koten-rules` に固定する。

**通常の `npm test` へ入れない。** rules 専用の `test:rules` と GitHub Actions だけで走らせる（D-69）。
開発機での実行は初回検収と問題調査時だけでよい。

> この試験が証明するのは Emulator 上の Rules の許可・拒否である。
> 本番への deploy、App Check enforcement、TTL による実削除、REST 送信成功は証明しない。

---

## 1. 変更境界

### 変更してよいファイル

- `firebase/firestore.rules`
- ルート `package.json`（依存は足さず、`test:rules` script だけ）
- `tests/unit/telemetry/rules-parity.test.ts`（D-71で増えた引数にR-6を追随させる親検収時の補正だけ）

### 新規作成してよいファイル

- `firebase/firebase.json`
- `firebase/firestore.indexes.json`
- `tests/rules/package.json`
- `tests/rules/package-lock.json`
- `tests/rules/stats.test.mjs`
- `.github/workflows/rules.yml`

### 変更禁止

- `packages/**` のすべて
- `tests/unit/**` と `tests/screen/**` のすべて
- ルート `package-lock.json`
- `docs/**`
- 既存 `.github/workflows/ci.yml`
- 一次資料、公開物、Firebase 実プロジェクトの状態

`node_modules/`、エミュレータ jar、ログ、coverage を追跡しない。

---

## 2. 依存と実行環境（版を決め直さない）

`tests/rules/package.json` は `private: true` とし、次の **devDependencies 3 件だけ**を厳密版で持つ。

- `@firebase/rules-unit-testing`: `5.0.2`
- `firebase-tools`: `15.29.0`
- `firebase`: `12.18.0`

親担当の隔離実測では `@firebase/rules-unit-testing@5.0.2` の peer は `firebase ^12.0.0`、
Node 要件は 20+。3 件を入れた `node_modules` は **342.9 MiB / 730 packages**、lockfile は **340,152 bytes**。
これは Node 26・`--ignore-scripts` での参考値であり受入値ではない。

`firebase-tools` の推移依存 `superstatic@10` が Node 26 を対応外として警告したため、
rules workflow は **Node 24** に固定する。アプリ本体 CI の Node 26 は変えない。

---

## 3. Firebase 設定

`firebase/firebase.json` は Firestore Emulator だけを構成する。

- rules: `firebase/firestore.rules`（CLI が実際に読める相対指定にする）
- indexes: `firebase/firestore.indexes.json`
- Firestore port: `8088`
- Emulator UI: 無効
- `singleProjectMode`: true

`firebase/firestore.indexes.json` は複合 index を 0 件とし、
`stats_days_test` と `stats_days_official` の両 collection group について
`expiresAt` を TTL 対象にし、単一フィールド index を無効にする（D-70）。

Emulator は TTL 削除を再現する受入対象ではない。設定ファイルに TTL 指定が存在することと、
Rules が `expiresAt is timestamp` を要求することだけを検査する。

---

## 4. Rules の補強（D-70・D-71）

既存の外側17キー、日付形式、製品、基本型、create-only を維持した上で次を足す。

1. `expiresAt` は `timestamp`。文字列を拒否する。
2. `dataVersion` と `masteryRulesVersion` は `int` かつ 0 以上。
3. `buttonCounts` 6 値、`entryCounts` 5 値、`questionTypeCounts` 2 値は、
   **各値が個別に** `int` かつ 0 以上。
4. `masteryDistribution` の5要素は、**各要素が個別に** `int` かつ 0 以上。
5. 文書 ID は `clientNumber + '_' + localDate + '_' + product` と完全一致。
6. `stats_days_test` は `isOfficial == false`、`stats_days_official` は `isOfficial == true`。
7. get / list / update / delete は両 collection とも拒否。包括 allow を足さない。

重複する値検査は名前つき関数へまとめてよい。ただし、片方の collection だけを検査する実装は禁止する。

---

## 5. 挙動試験

`tests/rules/stats.test.mjs` は `node:test`、`node:assert/strict`、
`@firebase/rules-unit-testing` の `initializeTestEnvironment` / `assertSucceeds` / `assertFails`、
`firebase/firestore` を使う。

- project ID は `demo-koten-rules`。
- 実プロジェクト ID、資格情報、ネットワーク上の Firestore URLを読まない。
- 各試験の前に Emulator 内データを消す。
- 最後に必ず test environment を cleanup する。
- 同じ文書を使う試験を並列実行しない。
- 標準 fixture は境界を識別できる値にする。全 count を同じ値にしない。

最低限、次の名前つき試験を置く。表形式の候補反復は1試験にまとめてよいが、失敗時に対象フィールド名を出す。

| # | 試験 | 期待 |
|---|---|---|
| E-1 | test collectionへ正しい false payloadと正しいIDをcreate | 成功 |
| E-2 | official collectionへ正しい true payloadと正しいIDをcreate | 成功 |
| E-3 | testへ true、officialへ false | 両方失敗 |
| E-4 | clientNumber・localDate・product の各要素を1つずつ違えた文書ID | 各失敗 |
| E-5 | 同じIDへ2回目の set/create | 失敗（updateへ化けない） |
| E-6 | get と list | 両方失敗 |
| E-7 | update と delete | 両方失敗 |
| E-8 | 17キーの1つ欠落、架空キー追加 | 両方失敗 |
| E-9 | clientNumber の長さ/字種、localDate の時刻混入、product の第3値 | 各失敗 |
| E-10 | pageViews・attemptCount の負数/小数/文字列 | 各失敗 |
| E-11 | masteryAvg・masteryMax の負数/100超/文字列 | 各失敗 |
| E-12 | dataVersion・masteryRulesVersion の負数/小数 | 各失敗 |
| E-13 | 3 count map のキー欠落/余分キー | 各失敗 |
| E-14 | 3 count map の値を負数/小数/文字列へ | 各失敗 |
| E-15 | masteryDistribution の長さ4/6、各位置の負数/小数/文字列 | 各失敗 |
| E-16 | expiresAt が Date/Timestamp | 成功 |
| E-17 | expiresAt が `YYYY-MM-DD` 文字列 | 失敗 |
| E-18 | 未定義 collection へのcreate | 失敗 |
| E-19 | indexes設定が test/official 両方の expiresAt TTL と index無効を持つ | 成功 |
| E-20 | rules workflow が3イベント・対象paths・Node 24・JDK 21固定・Java確認・専用 `npm ci` を持つ | 成功 |
| E-21 | 標準 fixture の13 count値と分布5値がすべて同じ値ではない | 成功 |

**E-14 と E-15 は代表1件で済ませない。** 全キー・全5位置を候補表で回す。

---

## 6. scripts と CI

ルート `package.json` に依存を足さず、`test:rules` を1本だけ足す。
その script は `tests/rules` のローカル `firebase-tools` と lockfile を使って、
`demo-koten-rules` の Firestore Emulator 上で `stats.test.mjs` を実行する。

`.github/workflows/rules.yml`:

- `push` と `pull_request` の両方、および `workflow_dispatch`
- 自動契機の paths:
  - `firebase/**`
  - `tests/rules/**`
  - `packages/shared/src/telemetry/registry.ts`
  - `package.json`
  - `.github/workflows/rules.yml`
- `ubuntu-24.04`
- Node 24
- npm cache は `tests/rules/package-lock.json`
- `actions/setup-java@v5` で Temurin JDK 21を固定
- `java -version` を実行し、JDK 21が無ければ失敗
- `npm ci --prefix tests/rules`
- `npm run test:rules`

この workflow を required check に設定する作業はこの発注に含めない。

---

## 7. 受入条件

1. `npm run test:rules` が終了コード0で、E-1〜E-21がすべて実行される。
2. `npm test` は Emulator を起動せず、従来の420 node tests＋88 screen testsを通す。
3. `npm run typecheck` / `lint` / `data:check` / `build` / `scan:publish` がすべて0。
4. ルート `package-lock.json` は byte 不変。ルート `node_modules` に Firebase を足さない。
5. `tests/rules/package-lock.json` の direct devDependency は §2 の3件だけ。
6. `firebase login`、実プロジェクトID、秘密値、外部Firestore URLの出現が0。
7. `packages/**`、既存 CI workflow の差分が0。既存 tests は§1で許可した `rules-parity.test.ts` のR-6追随だけ。
8. rules workflow の YAML 構文と paths を静的に検査し、`push` / `pull_request` / `workflow_dispatch` を確認する。

---

## 8. 破壊試験（親検収の中心）

各変更を1件ずつ当てて復元し、次を実測する。

| # | 壊し方 | 赤くなる試験 |
|---|---|---|
| M-1 | test collection の `isOfficial == false` を外す | E-3 |
| M-2 | 文書ID照合から `product` を外す | E-4 |
| M-3 | `dataVersion >= 0` を外す | E-12 |
| M-4 | buttonCounts.report の値検査を外す | E-14 |
| M-5 | entryCounts.exam の値検査を外す | E-14 |
| M-6 | questionTypeCounts.author の値検査を外す | E-14 |
| M-7 | distribution の4番目の値検査を外す | E-15 |
| M-8 | `expiresAt is timestamp` を `string` に戻す | E-1・E-2・E-5・E-16・E-17（正常fixtureもtimestampなので陽性側も赤になる） |
| M-9 | test collection の get を許可する | E-6 |
| M-10 | official collection の delete を許可する | E-7 |
| M-11 | indexes設定から official のTTLだけを消す | E-19 |
| M-12 | rules workflow の `packages/shared/src/telemetry/registry.ts` pathを消す | E-20 |
| M-13 | fixture の count 値を全部0へ退化させる | E-21 |

同じ E 番号の中に候補表を持つ場合、失敗メッセージに壊したキー・位置が出ること。

---

## 9. 停止条件

- Java が無いことだけを理由に system-wide install を勝手に行わない。親担当へ報告する。
- 実Firebaseへのログイン・接続・鍵が必要になったら停止する。
- `packages/**` や既存試験を変えないと通らない場合は停止する。
- Rules を緩めて試験を通したくなったら停止する。
- TTL削除そのものを Emulator で確認できない場合は失敗扱いにせず、確認不能と報告する。
- 実行していない試験を成功と書かない。

---

## 10. 完了報告

1. 変更ファイル一覧。
2. 導入版、peer警告、実インストール容量、Emulator初回取得後の増分。
3. E-1〜E-21の実行件数と結果。
4. M-1〜M-13で実際に赤くなった試験名。
5. 全ゲートの終了コードと試験数。
6. 実Firebase・資格情報へ接続していない証拠。
7. 独自判断、未実施、停止条件。無ければ「無し」。

---

## 11. 親検収結果（2026-09-03・第30回）

**合格。** Luna の報告値は転記せず、Sol が Microsoft OpenJDK のportable ZIPを照合して一時利用し、
Firestore Emulator を実際に起動して再検査した。Windowsへのsystem-wide Java導入、永続的な環境変数変更、
Firebase login、実プロジェクト、資格情報の追加は行っていない。

- 固定版: `@firebase/rules-unit-testing 5.0.2`、`firebase-tools 15.29.0`、`firebase 12.18.0`
- 実容量: `tests/rules/node_modules` 342.9 MiB、lockfile 340,013 bytes、Emulator JAR 130.4 MiB
- 実行要件補正: `firebase-tools 15.29.0` はJDK 17を拒否し、JDK 21以上を要求した。workflowはTemurin 21を明示する形へ補正
- E-1〜E-21: 21/21合格
- M-1→E-3、M-2→E-4、M-3→E-12、M-4〜M-6→E-14、M-7→E-15、M-8→E-1・E-2・E-5・E-16・E-17、M-9→E-6、M-10→E-7、M-11→E-19、M-12→E-20、M-13→E-21
- M-12の初版はpathが片方に1件残っても緑になる穴があったため、E-20を「pushとpull_requestの双方＝各pathが2回」に補強してから赤を確認
- 既存R-6はD-71の3引数化に追随し、test=`false` / official=`true`まで静的照合するよう補正
- 通常ゲート: typecheck、lint、node 420/420、screen 88/88、data:check、build、scan:publish 751件/違反0——すべて終了コード0
- 資源最小化のため、検収後にlocal `node_modules`、portable JDK 17/21、試験ログ、Emulator JARを削除した。いずれもlockfileとworkflowから再取得可能
