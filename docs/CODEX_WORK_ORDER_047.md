# 発注047（P9-B1・`firestore.rules` を作り、`registry.ts` との一致を釘で留める）

- **宛先**: Terra（Codex）
- **起票**: 2026-09-03・第28回・親担当（Claude Opus 5）
- **前提コミット**: **§8 で発行時に確定する。起票の時点では別セッションが走っている**
- **フェーズ**: **P9-B を 3 本に割った 1 本目**（理由は §0.2）
- **規模**: 小〜中（**新規 1 ファイル＋試験 1 ファイル。実装コードは 1 行も書かない**）

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を作るか

**`firebase/firestore.rules` を新規に作り、その中身が `packages/shared/src/telemetry/registry.ts` と
食い違ったら試験が赤くなるようにする。それだけである。**

- **`transport.ts` を作らない**（P9-B2）。
- **`app-config.ts` を変更しない**（P9-B2）。
- **Firestore エミュレータを持ち込まない**（P9-B3）。新規依存を 1 つも増やさない。
- **`packages/` の既存ファイルを 1 バイトも変えない。**

### 0.2 なぜ P9-B を 3 本に割ったか（**親担当の裁定 D-65**）

**計画 P9 の対象テストは、性質のまったく違う 3 種類を 1 つのフェーズに束ねている。**

| 種類 | 何が要るか | 新規依存 |
|---|---|---|
| **(1) rules のテキスト検査** | ファイルを読んで文字列を比べるだけ | **無し** |
| **(2) 送信経路（`transport.ts`）** | ネットワーク・匿名認証・409 の扱い | 無し（実装は増える） |
| **(3) rules の挙動検査** | **Firestore エミュレータ**（`firebase-tools`・Java） | **大きい** |

**1 本にまとめると、(3) の新規依存の是非という重い論点が、(1) の安い成果を人質に取る。**
計画 §7.5 自身が「Emulator を起動せずに CI で回すテキスト検査」と「Emulator 上の挙動検査」を
**別項目として並べている**ので、割っても計画に反しない。

**この発注は (1) だけである。**

> **⚠ 重大な但し書き。この発注の試験が全部緑になっても、「Rules が正しく動く」ことは 1 ミリも証明されない。**
> **テキスト検査が証明するのは「書いてある内容が `registry.ts` と一致していること」だけである。**
> **Rules が実際に create を通すか拒むかは、P9-B3（エミュレータ）でしか分からない。**
> **完了報告に「Rules が動作することを確認した」と書いてはならない。** 書いたら §6 の S-4 である。

### 0.3 いま塞ごうとしている穴（**なぜこの順で作るか**）

`docs/HANDOFF.md` §8 が言うとおり、**`STATS_KEYS` の 17 個がそのまま
`firestore.rules` の `hasOnly` の引数になる。** つまり**同じ制約が 2 つのファイルに書かれる。**

**このリポジトリは、まさにその型の穴で 3 回連続して発注を出している**——
発注043・044・045 は、いずれも「**同じ形のものが横に並んでいて、釘が代表の 1 本にしか刺さっていない**」
という 1 つの誤りの型を潰す作業だった（045 だけで 12 個）。

**`registry.ts` と `firestore.rules` は、その型が最も出やすい配置である。**
**片方を直してもう片方を忘れても、どちらのファイルも単体では正しく見える。**
**だから釘（parity 試験）を、実装より先に打つ。**

### 0.4 変更してはならないファイルの SHA-256

**§8 で発行時に確定する。起票の時点では別セッションが `tests/unit/telemetry/` を触っており、
いまハッシュを固定すると発行時に必ず食い違う**（記憶: 並行発注中は基準線が取れない）。

### 0.5 着手前に読む・作業ツリーの状態について

**着手時、作業ツリーは clean でなければならない。** clean でなければ **S-1** で止まる。

---

## 1. 変更境界

### 新規作成してよいファイル（**2 つだけ**）

| ファイル | 中身 |
|---|---|
| `firebase/firestore.rules` | Firestore セキュリティルール。**§4.1** |
| `tests/unit/telemetry/rules-parity.test.ts` | 上を読んで検査する試験。**§4.2** |

`firebase/` ディレクトリが無ければ作ってよい。**`firebase/` に他のファイルを置かないこと**
（`firebase.json`・`firestore.indexes.json` は P9-B3 の範囲である）。

### 絶対に変更しない・作らないもの

- **`packages/` 配下のすべて。** 1 バイトも触らない。
- **`tests/unit/telemetry/` の既存 5 ファイル**（`registry.test.ts`・`queue.test.ts`・`client-number.test.ts`・`static.test.ts`・`fixtures.ts`）。**新規の 1 ファイルだけを足す。**
- **`package.json`・`package-lock.json`。** **新規依存を 1 つも入れない。**
- `docs/` 配下（この発注書を含む）。
- 一次資料一式、`review/`、`data/`。
- **`transport.ts` を作らない。** `X-9` の免除一覧にも触らない（P9-B2 の仕事である）。

---

## 2. 先に読むもの

| 場所 | 何のため |
|---|---|
| `packages/shared/src/telemetry/registry.ts` | **`STATS_KEYS` の 17 個**と `isStatsPayload` の型検査。ルールが写すべき内容 |
| `tests/unit/telemetry/static.test.ts` | **既存の静的検査の書き方。** 同じ流儀で書くこと |
| `tests/unit/telemetry/fixtures.ts` | `telemetrySources()` 等の作り。**走査対象を名前で持つ**流儀（D-60） |
| `docs/HANDOFF.md` **§4.1 の D-58・D-59・D-60** | 17 キーの確定、文書 ID の形、走査対象を名前で持つ理由 |
| `docs/IMPLEMENTATION_PLAN.md` **§7.4・§7.5** | コレクション設計と allowlist の二重化 |

**`docs/IMPLEMENTATION_PLAN.md` は 2,000 行を超える。節を指定して読むこと。**

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: 検証の本体は名前つき関数 1 つに置く。`match` ブロックへ複製しない

`stats_days_test` と `stats_days_official` は**同じ検証を要求する。**
**同じ条件式を 2 つの `match` ブロックへ書き写してはならない。**

**理由**——それがこのリポジトリで 3 回連続して穴になった配置そのものだからである（§0.3）。
複製すると、**片方だけを壊す破壊試験が緑のまま通る。**

`function isValidStats(data) { ... }` を 1 つ定義し、**両方の `match` がそれを呼ぶ。**

### 裁定 2: それでも、試験は両方の `match` ブロックを名指しで見る

裁定 1 で複製は消えるが、**`allow` 行そのものは 2 箇所に残る。**
**`test` 側だけを壊しても `official` 側だけを壊しても、それぞれ赤くなること**を試験で守る。
**「代表 1 つを見て済ませる」書き方を禁じる**（記憶: 同じ制約が 2 箇所にあると片方しか刺さらない）。

### 裁定 3: 外側の `data.keys().hasOnly` の引数は 1 箇所にだけ書く

統計 payload 全体を制限する `data.keys().hasOnly([...])` は**1 回だけ**書く。
抽出器が「どれを見たか」で結果が変わらないよう、試験はこの主語まで含めて抽出する。
入れ子 3 map は裁定 4.1 のとおり `hasAll` と `size()` の組で完全一致を表し、
外側の `hasOnly` と同じメソッド名を重ねない。

### 裁定 4: 抽出器は、見つからなかったら例外を投げる。既定値を返さない

`firestore.rules` から `hasOnly` の引数を取り出す関数は、
**パターンに一致しなければ `throw` する。空配列や `STATS_KEYS` を返さない。**

**理由**——既定値を返すと、**ルールを丸ごと壊しても試験が緑のままになりうる。**
**「常に合格する検査」を作らないこと**（記憶: 検査の自己テスト）。

### 裁定 5: 走査対象が空でないことを、検査自身が確かめる

**否定アサーション（「この語が現れない」型）を書く試験は、
走査したファイルが 1 件以上あることを先に assert すること。**
**空を grep しても何も見つからないので、実装ゼロでも緑になる**（記憶: 否定の検査は走査対象の実在を確かめる）。

### 裁定 6: 新規試験の名前は `R-` で始める

既存は `V-`（データ）・`W-`／`X-`（telemetry 静的）・`Y-`／`Z-`（registry）を使っている。
**この発注が足すのは `R-1` から連番。** 既存の記号を再利用しない。

### 裁定 7: `reports_*` のルールをまだ書かない

**Firestore のルールは既定で拒否する。** `stats_days_*` の `match` しか書かなければ、
`reports_*` は**書かなくても全拒否**である。安全側であり、いま書く必要はない。
報告 payload の形は P9 の実施内容 8 がまだ決めていない。**推測で書かない。**

**そのかわり、`match /{document=**}` のような包括 `match` を置いてはならない**（§4.1・§5.0）。

### 裁定 8: 版番号は固定しない

計画 §7.5 は「版固定」と書くが、**`dataVersion`・`masteryRulesVersion` を特定の数へ固定しない。**
固定すると、**版を上げた日に全端末の統計が静かに落ちる**（送信失敗は画面に出ない設計なので、誰も気づかない）。
**型（整数であること）だけを見る。** これは §7.5 の「版固定」からの意図的な逸脱であり、ここで裁定する。

---

## 4. 実装範囲

### 4.1 `firebase/firestore.rules`（新規）

**次の要件を満たすこと。書き方は任せる。**

1. `rules_version = '2';` で始める。
2. `service cloud.firestore` / `match /databases/{database}/documents` の標準の入れ子。
3. **`function isValidStats(data)` を 1 つ定義する**（裁定 1）。中身:
   - `data.keys().hasOnly([...])` に **`STATS_KEYS` の 17 個をそのまま並べる**（裁定 3。**ちょうど 1 回**）。
   - `data.keys().hasAll([...])` も同じ 17 個で書く（**過不足の両方を見る**）。
   - 型検査: `clientNumber` は `string` かつ `matches('^[a-z0-9]{20}$')`、
     `localDate` は `string` かつ `matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')`、
     `expiresAt` も同じ日付の形、
     `product` は `in ['hyakunin','kanazukai']`、
     `grade` は `string`、
     `pageViews`・`attemptCount` は `int` かつ `>= 0`、
     `masteryAvg`・`masteryMax` は `is number` かつ `>= 0` かつ `<= 100`、
     `masteryDistribution` は `is list` かつ `size() == 5`、
     `isOfficial` は `bool`、`appVersion` は `string`、
     `dataVersion`・`masteryRulesVersion` は `int`（**値を固定しない。裁定 8**）、
     `buttonCounts`・`entryCounts`・`questionTypeCounts` は `is map` かつ、
     **それぞれ `keys().hasAll([...])` と `keys().size()` の組で
     `BUTTON_KEYS` 6 個 / `ENTRY_KEYS` 5 個 / `QUESTION_TYPE_KEYS` 2 個への完全一致を表す**（D-58）。
     map のキーは重複しないので、この組は `hasOnly([...])` と同値である。
4. **`match /stats_days_test/{docId}`** と **`match /stats_days_official/{docId}`** の 2 ブロック。
   どちらも:
   - `allow create: if isValidStats(request.resource.data);`
   - `allow get, list, update, delete: if false;`
5. **包括 `match`（`{document=**}`）を書かない**（裁定 7）。
6. **管理者判定をルールに書かない**（計画 §7.4）。`request.auth` の中身で分岐しない。

### 4.2 `tests/unit/telemetry/rules-parity.test.ts`（新規）

**`node:test` ＋ `node:assert/strict`。既存の `static.test.ts` と同じ流儀。**

まず、ルールを読む道具を書く。

- `rulesText(): string` … `firebase/firestore.rules` を `readFileSync` で読む。
- `hasOnlyArgs(text): string[]` … `data.keys().hasOnly([...])` の引数リストを取り出して配列で返す。
  **一致しなければ `throw`（裁定 4）。**

**足す試験は 8 本。**

| # | 名前 | 見るもの |
|---|---|---|
| **R-1** | `hasOnly` の出現がちょうど 1 回である | 裁定 3 |
| **R-2** | `hasOnly` の引数集合が `STATS_KEYS` と**集合として一致**する | **この発注の中心** |
| **R-3** | `hasAll` の引数集合も `STATS_KEYS` と一致する | 過不足の両方 |
| **R-4** | `buttonCounts`・`entryCounts`・`questionTypeCounts` の許可キーが `BUTTON_KEYS`・`ENTRY_KEYS`・`QUESTION_TYPE_KEYS` と一致する | D-58 の抜け道封じ |
| **R-5** | `stats_days_test` と `stats_days_official` の **両方**の `match` が存在する | 裁定 2 |
| **R-6** | **両方**のブロックが `allow create` を持ち、`get, list, update, delete` を `false` にしている | 裁定 2。**片方だけ見る書き方を禁じる** |
| **R-7** | 包括 `match`（`{document=**}`）と `request.auth` による分岐が現れない | 裁定 7・計画 §7.4 |
| **R-8** | `packages/` 配下の `.ts`・`.tsx` に `getAnalytics`・`firebase/analytics`・`gtag`・`measurementId` が現れない。**かつ走査したファイルが 50 件以上ある** | **D-63。** 裁定 5 |

**R-8 の走査対象はディレクトリ走査でよい**（`packages/` 全体が対象なので、
D-60 の「名指しにせよ」は当たらない。**むしろ増えたファイルも見たい**）。
**ただし件数の下限 assert を必ず置くこと**（裁定 5）。

### 4.3 型について（**ここで詰まらせない**）

`hasOnlyArgs` の戻りは `string[]`。`STATS_KEYS` は `readonly [...]` なので、
比較は `[...STATS_KEYS].sort()` と `args.sort()` を `assert.deepEqual` で突き合わせればよい。
**`as` による型の押し込みを使わないこと。**

---

## 5. 受入条件（**すべて機械判定できること**）

### 5.0 grep で判定する条件

| # | 条件 |
|---|---|
| A-1 | `firebase/firestore.rules` に外側の `data.keys().hasOnly` が**ちょうど 1 回**現れる |
| A-2 | `firebase/firestore.rules` に `document=**` が**現れない** |
| A-3 | `firebase/firestore.rules` に `request.auth` が**現れない** |
| A-4 | `packages/` 配下の差分が**0 バイト**（`git diff --numstat -- packages/` が空） |
| A-5 | `tests/unit/telemetry/` の既存 5 ファイルの差分が **0 バイト** |
| A-6 | `package.json`・`package-lock.json` の差分が **0 バイト** |
| A-7 | 新規試験の名前が `R-1` 〜 `R-8` の 8 本ちょうど |

### 5.1 ゲート

`npm run typecheck` / `npm run lint` / `npm test` / `npm run data:check` / `npm run build` /
`npm run scan:publish` が**すべて終了コード 0**。
**試験の総数は着手前の基準線 ＋ 8 になること**（基準線は §8 で確定する）。

> **`scan:publish` について。** `firebase/firestore.rules` は**公開ビルドに入らない**。
> 入っていたら **S-3** で止まること。

### 5.2 破壊試験（**受入の中心。ここを通らなければ緑でも合格にしない**）

**各行を 1 つずつ当て、指定の試験だけが赤くなることを確かめ、`cp` で元に戻すこと。**
**Python で書き戻すと改行が化けてハッシュがずれる**（記憶: 破壊試験のあとは cp で復元）。

| # | 壊し方 | 赤くなるべきもの |
|---|---|---|
| **M-1** | `firestore.rules` の `hasOnly` から `expiresAt` を 1 つ消す | **R-2 だけ** |
| **M-2** | `firestore.rules` の `hasOnly` に架空のキー `foo` を 1 つ足す | **R-2 だけ** |
| **M-3** | `firestore.rules` の `hasAll` から 1 つ消す | **R-3 だけ** |
| **M-4** | `buttonCounts` の許可キーから `report` を消す | **R-4 だけ** |
| **M-5** | **`stats_days_official` のブロックだけ**を消す | **R-5・R-6** |
| **M-6** | **`stats_days_test` の側だけ** `allow get, list, update, delete: if false;` を消す | **R-6 だけ**（**片方しか見ていなければ緑になる。ここが裁定 2 の心臓**） |
| **M-7** | `match /{document=**} { allow read: if true; }` を足す | **R-7 だけ** |
| **M-8** | `packages/shared/src/app-config.ts` に `// getAnalytics` と 1 行足す | **R-8 だけ** |
| **M-9** | **検査自身を壊す。** `hasOnlyArgs` を「一致しなければ `[...STATS_KEYS]` を返す」に変え、続けて rules の外側の `data.keys().hasOnly` だけを `data.keys().hasO_nly` に変える | **R-1 は赤、R-2 は緑のままになること**（＝壊した抽出器が「対象を見つけていないのに正解を返す」嘘を実際につけることを確認する。元の抽出器なら R-2 も例外で赤になる。裁定 4 の心臓） |
| **M-10** | **検査自身を壊す。** R-8 の走査対象を空配列に差し替える | **R-8 の件数 assert が赤**（裁定 5） |

**M-9 と M-10 は「壊したら赤くなる」ではなく「検査が嘘をつけないこと」を見る破壊である。**
**報告には、M-9 で R-2 が緑のまま通ってしまったかどうかを必ず書くこと。**

### 5.3 試験の質

- **`assert.ok(true)` に相当するアサーションを 1 つも書かない。**
- **1 本が 1 つのことを見る。** R-2 に R-3 の内容を混ぜない。
- **アサーションのメッセージに `R-2:` のように番号を書く**（原因特定のため。既存の流儀）。

---

## 6. 停止条件（**該当したら手を止めて親担当へ報告する**）

| # | 条件 | なぜ止まるか |
|---|---|---|
| **S-1** | **着手時に作業ツリーが clean でない** | 並行作業がある。基準線が取れない |
| **S-2** | **`packages/` を変えないと試験が書けない** | 発注の前提が崩れている。**勝手に `packages/` を触らない** |
| **S-3** | **`firestore.rules` が公開ビルドに入る** | 公開範囲の話であり**依頼者裁定**である |
| **S-4** | **「Rules が動作することを確認した」と書きたくなった** | **テキスト検査は挙動を証明しない**（§0.2）。書かない |
| **S-5** | **新規依存を入れたくなった** | この発注は依存を 1 つも増やさない。エミュレータは P9-B3 |
| **S-6** | **元の抽出器のまま rules の外側の `data.keys().hasOnly` を見つからなくしても R-2 が緑のまま通った** | **検査が嘘をついている。** 直してから報告する |

---

## 7. 完了報告に必ず書くこと

1. **§5.0 の A-1〜A-7 の実測値**（数値をそのまま）
2. **§5.1 の全ゲートの終了コードと試験総数**（着手前と着手後の両方）
3. **§5.2 の M-1〜M-10 を 1 件ずつ当てた結果**——**どの試験が赤くなったかを名前で書く。**
   **「期待どおり」と書かない。実際に赤くなった試験名を列挙する。**
4. **M-9 の結果**（S-6 に当たったかどうか）
5. **復元の確認**——破壊試験のあと、`git status` が新規 2 ファイル以外に差分を出さないこと
6. **停止条件に当たったか**（当たっていなければ「無し」と書く）

---

## 8. 発行・検収時に親担当が確定したもの

並行セッションから完了報告が残らなかったため、発行時の空欄を推測で埋めず、
親検収時に次の事実を独立に確定した（2026-09-03・第30回）。

- [x] **親検収の前提コミット**: `05b21b9`
- [x] **変更禁止 17 ファイル**: `docs/CODEX_WORK_ORDER_046.md` §0.3 の SHA-256 を使用し、**17/17 一致**
- [x] **着手前の基準線**: `test:node` **412/412/0**、`test:screen` **12 files / 88**、`scan:publish` **751 / 違反 0**
- [x] **検収後**: `test:node` **420/420/0**（+8）、`test:screen` **12 files / 88**、`scan:publish` **751 / 違反 0**

発注書内にあった 2 件の衝突も親検収で補正した。

1. 裁定 3 の「`hasOnly` は 1 回」と、入れ子 3 map にも `hasOnly` を要求する記述が衝突していた。
   外側の `data.keys().hasOnly` を 1 回、入れ子は `hasAll + size` の完全一致とした。
2. M-9 は `hasOnly` のキーを 1 個消すだけでは抽出自体に成功し、壊した既定値が使われなかった。
   抽出対象のメソッド名を壊す形へ直し、嘘をつく抽出器では R-2 が緑、元の抽出器では R-2 も赤になることを実測した。

**あわせて、発行前に親担当が行うこと（D-61 条件 3）**——
**参照実装を書いて M-1〜M-10 を実測し、この表と食い違わないことを確かめ、破棄して基準線へ戻す。**
**この工程を飛ばして発行しない。**
