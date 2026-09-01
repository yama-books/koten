# Codex向け発注文書 017: 5 検査の CI 配線、ポート衛生、空集合の合格の封じ込め

発注日: 2026-08-31
階層: **Terra**（CI・実ブラウザ検査・ポート制御を扱う。Windows と Linux の差が効く）
優先度: **最高**（公開ゲートの信頼性そのもの。発注015 の監査所見 A・C・D・E と、検収残件 B を閉じる）
対象: `.github/workflows/ci.yml`、`tools/overflow-check/`、`tools/scan-publish/`、`tools/font-check/`、`tools/font-weight-check/`、`tools/check-storage/`、`tests/unit/`

> **並行発注に関する注意**: 発注016 が同時に走る。016 の対象は `tools/build-data/` と
> `packages/*/public/fonts/SOURCES.json` である。**本発注はそのどちらにも触らない。** 重なるファイルは無い。
> `package.json` は**本発注では一切変更しない**（新しい script を足さない）。

---

## 0. この発注の位置づけ

発注015 の読み取り専用監査（`docs/AUDIT_2026-08-31_false-pass.md`）が挙げた所見のうち、
**設計上の欠陥として実在が確認できたもの**を閉じる。親担当が §5・§6 を追試し、所見 A は自分の目で確認した。

| 監査所見 | 内容 | 本発注の扱い |
|---|---|---|
| **A（最重大）** | `check:overflow` / `check:font` / `check:font-weight` / `check:font-assets` / `check:storage` の **5 検査が CI に一切配線されていない** | **課題 1** |
| **C** | `scan:publish` は `dist` が空でも「走査 0 件・違反 0 件」で合格する | **課題 3** |
| **D** | `check:font` は `poems.json` が空でも合格する | **課題 3** |
| **E** | `check:font-weight` は走査 0 件でも合格する | **課題 3** |
| 検収残件 **B** | `tools/overflow-check/index.ts` に実行前のポート占有確認が無い | **課題 2** |
| 発注014 検収 | **`check:storage` の既定ポート 4174 が `check:font-weight` の 4174 と衝突する** | **課題 4** |
| 発注014 検収 | **`check:storage` の異常終了時の出力に絶対パスが漏れる**（`C:/Users/<利用者名>/...`） | **課題 5** |

**親担当が実測した所見 A の裏づけ（2026-08-31・再調査不要）**

`.github/workflows/ci.yml` は次の 7 ステップしか持たない。

```yaml
- run: npm ci
- run: npm run typecheck
- run: npm run lint
- run: npm test
- run: npm run data:check
- run: npm run build
- run: npm run scan:publish
```

リポジトリ内に `check:overflow` 等を自動実行する経路は他に存在しない。

---

## 1. 先に読むもの

| 順 | 文書・ファイル | 確認すること |
|---|---|---|
| 1 | `docs/HANDOFF.md` §3・§6 末尾・§10.5 | 境界と、ポート衝突の既知の事実。**このファイルは変更しない** |
| 2 | `docs/AUDIT_2026-08-31_false-pass.md` §5・§6 | 所見 A・C・D・E の根拠 |
| 3 | `tools/font-weight-check/index.ts` :52・:105 `assertPortFree` | **課題 2 の手本。この構造を写す** |
| 4 | `tools/overflow-check/index.ts` 全文 | 課題 2 の対象 |
| 5 | `tools/scan-publish/index.ts` :23・:40・:61 | 課題 3 の対象（`scanned` の扱い） |
| 6 | `tools/font-check/index.ts` / `tools/check-storage/index.ts` | 課題 3 の対象 |
| 7 | `package.json` の `scripts` | 課題 1 で CI へ写す対象の正本。**書き換えない** |

---

## 2. 変更境界

### 変更してよいファイル

```text
.github/workflows/ci.yml            （課題 1）
tools/overflow-check/index.ts       （課題 2・3）
tools/scan-publish/index.ts         （課題 3）
tools/font-check/index.ts           （課題 3）
tools/font-weight-check/index.ts    （課題 3・assertPortFree は既にある。下限アサートのみ）
tools/check-storage/index.ts        （課題 3）
tests/unit/ci-wiring.test.ts        （新規・課題 1 の回帰検査）
tests/unit/*.test.ts                （課題 3 の回帰テスト追加）
```

### 絶対に変更しないファイル・領域

```text
docs/**                             （裁定は済んでいる。自分で書き換えない。停止条件でも編集しない）
CONSTITUTION.md
一次データの .md（百人一首_*.md / 古典文法_*.md / 仮名遣い規則_*.md）
package.json                        （scripts も dependencies も触らない）
package-lock.json
tools/build-data/**                 （発注016 の担当）
tools/font-assets-check/**          （発注016 が扱う SOURCES.json の相手方。触らない）
packages/**                         （全体。製品コードには一切手を入れない）
```

`git commit` / `git push` をしない。既存の未コミット変更を消去・復元・上書きしない。

---

## 3. 裁定済み事項（再検討しないこと）

| # | 裁定 | 根拠 |
|---|---|---|
| A | **5 検査はすべて CI で実行する。「重いから一部だけ」にしない。** 選別した瞬間に、選ばれなかった検査は所見 A の状態へ戻る | 親担当裁定 2026-08-31 |
| B | **`check:overflow` と `check:font-weight` は CI でも別ステップとして順に実行する。** 同時に走らせない（4173 と 4174/4175 で衝突する。ローカルで実際に衝突させた記録がある） | `docs/HANDOFF.md` §6 末尾 |
| C | **CI 上のブラウザ取得は `npx playwright install --with-deps chromium` で行う。** 新しい npm 依存は足さない（`playwright` は既に devDependency にある） | 親担当裁定 |
| D | **`overflow-check` のポート衛生は `font-weight-check` の `assertPortFree` を写す。** 独自方式を発明しない | `docs/HANDOFF.md` §6 末尾が手本として名指ししている |
| E | **ポートが埋まっていたら「合否を出さずに停止」する。** 合格にも不合格にもしない。終了コードは 1 とし、合否判定ではなく環境異常であることが分かる文言を出す | `font-weight-check` の既存の挙動に合わせる |
| F | **走査件数の下限は「0 より大きい」ではなく、具体的な期待値で固定する。** 「1 件でもあれば合格」は所見 C・D・E をほとんど塞がない | 親担当裁定。§5 に期待値を書く |

---

## 4. 課題 1: 5 検査を CI に配線する

### 4.1 やること

`.github/workflows/ci.yml` に次を足す。既存の 7 ステップは**順序も内容も変えない**。

1. `npm run build` の**後**にブラウザを取得するステップを置く（`npx playwright install --with-deps chromium`）。
2. 続けて次を**この順で別ステップとして**実行する。

```text
npm run check:font
npm run check:font-assets
npm run check:font-weight
npm run check:overflow
npm run check:storage
```

`check:overflow` は単独ステップにすること（他の検査と同一ステップに `&&` で連ねない）。

### 4.2 Linux（ubuntu-latest）で動くことを確かめる

**この検査群は Windows でしか走らせたことがない。** `docs/HANDOFF.md` §10 と発注書群には
Windows 固有の注意（`npm.cmd` の `EINVAL`、`vite preview` が `::1` にしか束縛されない）が書かれているが、
**Linux では事情が異なる。** ローカル（Windows）で緑でも CI（Linux）で落ちる可能性がある。

したがって次のいずれかで、**CI で実際に緑になることを確認すること**。

- ブランチに push して Actions の実行結果を見る（**`git push` は禁止されている。行わない**）
- `act` 等のローカル実行器を使う（**新しい依存を足さない範囲で**）
- それが不可能なら、**`ci.yml` の各ステップをローカルの Node で同等に再現し、
  Linux 固有の差（ホスト名解決・`--with-deps`・ヘッドレス起動）について、
  コードのどこが環境依存かを列挙して報告する**

**「CI に書いたから通るはず」と書いて完成報告しないこと。** 確認できなかった場合は、
受入条件 3 を「未確認」と明記し、何が確認できていないかを具体的に書く。これは減点ではない。

### 4.3 配線の抜けを機械検査する（`tests/unit/ci-wiring.test.ts` 新規）

CI から検査が抜け落ちる事故を二度と起こさないため、次のテストを作る。

| # | テスト | 内容 |
|---|---|---|
| T-1 | `package.json` の `scripts` のうち `check:` で始まるものが、**全件** `.github/workflows/ci.yml` の中に `npm run <名前>` として現れる | 将来 `check:*` を足して CI に足し忘れると赤くなる |
| T-2 | `data:check` / `typecheck` / `lint` / `test` / `build` / `scan:publish` も同様に `ci.yml` に現れる | 既存ゲートの脱落防止 |
| T-3 | `ci.yml` の中で `check:overflow` と `check:font-weight` が**同一の `run:` 行に同居していない** | 裁定 B の回帰検査 |

T-1 は `package.json` を**読むだけ**で判定すること（期待するスクリプト名を配列でベタ書きしない。
ベタ書きすると同語反復になり、新設スクリプトを検出できない）。

---

## 5. 課題 2: `overflow-check` のポート衛生

### 5.1 現状（親担当が原因を特定済み・再調査不要）

`tools/overflow-check/index.ts` には実行前のポート占有確認が無い。
`waitForServer` は「4173 が応答すれば合格」としか見ない。
前回実行の孤児サーバや `TIME_WAIT` の残留があると、`--strictPort` で**自分のサーバが起動に失敗していても検査を続行し**、
その後 `page.waitForSelector: Timeout` や `ERR_CONNECTION_REFUSED` で落ちる。
2026-08-31 に Codex がこの症状を「`check:overflow` 未完走」として報告したが、原因はフォントではなくこれである。

### 5.2 やること

`tools/font-weight-check/index.ts:105` の `assertPortFree` と**同じ構造**を `overflow-check` にも入れる。

- 自分で `listen` して占有を確かめる。
- 使用中なら**合否を出さずに停止**する（裁定 E）。「合格」も「不合格」も出さない。
- 出力は、これが検査結果ではなく環境異常であることが分かる文言にする。
- `font-weight-check` 側の `assertPortFree` は**書き換えない**（動いているものを触らない）。
  共通化したくなっても、本発注では**しない**（`tools/` に共有モジュールを新設しない）。

---

## 6. 課題 3: 空集合の合格を塞ぐ

各検査に**走査件数の下限アサート**を入れる。件数が期待を下回ったら、違反 0 件でも**不合格**にする。

| 検査 | 現在の実測値 | 入れる下限 | 根拠 |
|---|---|---|---|
| `scan:publish` | 走査 751 件 | **500 件以上** | 2 パッケージの `dist` が両方揃っていれば必ず超える。フォント構成の変更で上下するため余裕を取る |
| `check:font` | 走査符号位置 471 | **400 以上** | 100 首の本文・作者から出る符号位置。一次資料が変わらない限り 471 前後 |
| `check:font-weight` | 走査画面 4 件・テキスト要素 53 件 | **画面 4 件以上・要素 30 件以上** | 現状 4/53 |
| `check:overflow` | 合計 1200 件 | **1200 件ちょうど** | 100 首 × 読み 3 表示 × 4 幅 = 1200。設計上固定である |
| ~~`check:storage`~~ | シナリオ 5 件 | **実装済み。触らない** | `tools/check-storage/index.ts:84` に `aborted \|\| results.length !== 5` の厳密判定が既にある（親担当が 2026-08-31 に実測で確認）。**同じものを二重に入れない** |

- 下限を下回ったときの出力は、**違反ではなく「検査対象が足りない」ことが分かる文言**にすること。
- 期待値は各ツールの先頭付近に**名前つき定数**で置き、なぜその値かの 1 行コメントを添える。
- `check:overflow` と `check:storage` は「ちょうど」なので、**多すぎても不合格**にする。

### 6.1 回帰テスト

各下限アサートについて、**実際に対象を減らして不合格になることを確認**する（受入条件 5）。
`dist` を空にする実験は `packages/*/dist` が git 追跡外であることを利用し、
**ディレクトリごと退避（`mv`）して復元する**方式で行うこと（監査 015 §10 の #1 と同じ方式）。

---

## 6bis. 課題 4: ポートの重複を解消する

### 6bis.1 現状（親担当が実測・再調査不要）

```text
tools/overflow-check/index.ts:6      OVERFLOW_CHECK_PORT ?? 4173
tools/font-weight-check/index.ts:29  hyakunin  port 4174
tools/font-weight-check/index.ts:43  kanazukai port 4175
tools/check-storage/index.ts:10      STORAGE_CHECK_PORT ?? 4174   ← font-weight-check と衝突
```

`check:storage` には占有確認（`isPortAvailable`）があるので、衝突時は**合否を出さずに停止**する。
つまり偽の合格は出ない。しかし CI で並列化した瞬間に、**検査の中身と無関係な理由で赤くなる**。

### 6bis.2 やること

`tools/check-storage/index.ts:10` の既定ポートを **4176** に変える。1 行の変更である。

- 環境変数名 `STORAGE_CHECK_PORT` は変えない。
- `font-weight-check` の 4174 / 4175 と `overflow-check` の 4173 は**変えない**。
- 4 つの検査が使うポートの一覧を、`ci.yml` にコメントとして 1 行残すこと
  （`# ports: overflow=4173 font-weight=4174,4175 storage=4176`）。

---

## 6ter. 課題 5: `check:storage` の出力から絶対パスを消す

### 6ter.1 現状（親担当が実測・再調査不要）

`tools/check-storage/index.ts:77-78` が、捕捉した例外の `error.message` と Vite の `serverLog` を
**そのまま標準エラーへ出している**。実測で次が漏れた。

```text
C:/Users/<利用者名>/<作業ディレクトリ>/tools/check-storage/browser-entry.ts
node_modules/vite/dist/...
```

`docs/HANDOFF.md` §3 の 5 は「ローカル絶対パス（利用者名を含む）をコミットしない」としている。
**課題 1 で CI に配線すると、この出力は Actions のログに残る。公開リポジトリでは Actions のログも公開される。**
したがって配線と同時に塞ぐ必要がある。

### 6ter.2 やること

`check:storage` が標準出力・標準エラーへ出す**すべての行**について、
リポジトリのルート絶対パスを**リポジトリ相対パスへ書き換えてから**出力する。

- 対象は `error.message`・`error.stack`・`serverLog` の 3 経路すべて。
- 置換はルートパスの文字列一致で行い、**区切り文字が `\` と `/` のどちらでも効く**ようにする。
- `node_modules/` 配下のパスは、相対化した結果 `node_modules/...` になるので、それでよい。
- **診断能力を落とさないこと。** 行を削るのではなく、パスだけを短くする。
- 同じ漏れが `tools/overflow-check/` と `tools/font-weight-check/` の異常系にも無いか確認し、
  あれば同じ処理を入れる。**確認した結果を報告に書くこと**（「無かった」も報告する）。

---

## 7. 受入条件（すべてコマンドで機械判定すること）

| # | 条件 | 判定コマンド | 書くべき観測値 |
|---|---|---|---|
| 1 | 5 検査が `ci.yml` に配線されている | `grep -c "npm run check:" .github/workflows/ci.yml` | **5 であること**と、`ci.yml` の全文 |
| 2 | 配線検査テストが機能する | `ci.yml` から `check:storage` の行を一時的に消して `npm test` → **赤**を確認 → **復元** | 赤くなったテスト名と、復元確認の方法 |
| 3 | CI が Linux で緑になる | §4.2 のいずれか | 確認できた場合はその方法と結果。**できなかった場合は「未確認」と明記し、環境依存箇所を列挙する** |
| 4 | ポート占有時に `check:overflow` が合否を出さず停止する | 別プロセスで 4173 を `listen` した状態で `npm run check:overflow` | 出力全文と終了コード。**「合格」「不合格」のどちらも出ていないこと** |
| 5 | ポートが空いていれば従来どおり完走する | 4173 が空であることを確認してから `npm run check:overflow` | **`合計 1200 件、合格 1200 件、不合格 0 件`** と終了コード 0 |
| 6 | 下限アサートが **4 検査**（`scan:publish` / `check:font` / `check:font-weight` / `check:overflow`）で発火する | §6.1 の実験を 4 件それぞれ実施 | 検査ごとに、減らした内容・出力・終了コード・**復元確認**（`diff` または退避復元の確認） |
| 7 | 下限アサートが通常運転を妨げない | `npm run scan:publish`、`npm run check:font`、`npm run check:font-weight`、`npm run check:overflow`、`npm run check:storage` を順に単独実行 | 各出力全文と終了コード。**すべて 0** |
| 8 | **ポートの重複が無い** | `grep -n "417[0-9]" tools/*/index.ts` | 出力全文。**同じ番号が 2 つのツールに現れないこと**（4173 / 4174 / 4175 / 4176） |
| 9 | **`check:storage` の出力に絶対パスが出ない** | `packages/shared/src/storage/fallback.ts` を一時退避して `npm run check:storage` → 出力を確認 → **復元** | 出力全文。**`C:` も `C:/Users` も `AI開発` も現れないこと**と、復元確認 |
| 10 | 同じ漏れが他の 2 ツールに無い | `tools/overflow-check/` と `tools/font-weight-check/` の異常系を実際に起こして出力を見る | 出力全文。**漏れが無かった場合も「無かった」と報告する** |
| 11 | 既存テストと追加テストが緑 | `npm test` | **件数を書くこと**（本発注着手時点は 41 件。発注016 が同時に足すため増えている可能性がある。**着手時の件数と完了時の件数の両方を書く**） |
| 12 | 他のゲートが壊れていない | `npm run typecheck && npm run lint && npm run build` | すべて終了コード 0 |
| 13 | 変更境界を守っている | `git status --short` | 出力全文。**`docs/**`・`package.json`・`package-lock.json`・`packages/**` に差分が無いこと** |

**`npm run data:check` と `npm run check:font-assets` は本発注の着手時点で赤である**（発注016 が直している最中）。
本発注の受入条件に含めない。**赤いままでよい。直そうとしないこと。**

---

## 8. 停止条件

**停止したら `docs/` を自分で編集せず、報告に書いて止まること。**

| # | 条件 | 対応 |
|---|---|---|
| S-A | 5 検査のいずれかが Linux で構造的に動かない（Windows 固有の実装に依存している） | **停止。どの検査のどの行が環境依存かを具体的に報告する。** 動かない検査を CI から外して「配線した」と報告しない |
| S-B | `assertPortFree` を入れたら、ポートが空いているのに占有と判定されるようになった | 停止。判定ロジックと観測値を報告する |
| S-C | 下限アサートを入れたら、通常運転で不合格になった（実測値が下限に届かない） | 停止。実測値と下限値を報告する。**下限を下げて通すのは禁止**（それをすると所見が戻る） |
| S-D | 破壊試験の復元に失敗した、または `diff` が一致しない | **直ちに停止**。何を壊し、どこまで戻したかを正確に報告する |
| S-E | 新しい npm 依存、または `tools/` の共有モジュール新設が必要になった | 停止。何が必要かを報告する |
| S-F | `package.json` / `packages/**` / `docs/**` を変更する必要が出た | 停止。理由を報告する |
| S-G | 発注016 と同じファイルに触る必要が出た（`tools/build-data/**`・`SOURCES.json`） | **直ちに停止。** 衝突する |
| S-H | CI に秘密情報・トークン・外部サービスへの接続が必要になった | 停止。**自分で追加しない**（公開境界に触れる） |

---

## 9. 報告に必ず書くこと

1. **受入条件 1〜13 の判定を 1 件ずつ**。観測した実測値・件数・終了コードを添える。
2. **`ci.yml` の変更後の全文。**
3. **破壊試験（受入条件 2・4・6・9）の記録**。壊した内容・観測した出力と終了コード・**復元の確認方法と結果**。実験は 下限 4 件 + 配線 1 件 + ポート 1 件 + 絶対パス 1 件で **7 件以上**になるはずである。
4. **受入条件 3（Linux での実行）を確認できたか否か。** できていない場合、何が未確認かを具体的に。
5. **各下限値をどう決めたか。** §6 の表と違う値にした場合は理由。
6. **独自に決めたことを全件。無ければ「なし」と明記すること。**
7. `git status --short` の全文。

---

- 実行していない検査を「成功」と書かないこと。
- 一度も実行できていないコードを完成として報告しないこと。
- 検査ツールは、完走しなかったときに合格を出してはならない。
