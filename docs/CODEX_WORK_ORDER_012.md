# Codex向け発注文書 012: P4 後半 — 書き出し・取り込み・統合・初期化と移行画面

発注日: 2026-08-31
階層: **Terra**（**既存記録の消失に直結する領域**である。取り込み・統合・初期化はいずれも、
誤れば利用者が積み上げた学習履歴を復元不能に壊す。設計判断の幅も残っている）
優先度: 高（P4 の残り。P5 習熟度の再計算と P7 学習画面はここに載る）
対象: `packages/shared/src/storage/`（`export` / `import` / `merge` / `reset` の 4 本）、
`packages/shared/src/ui/screens/Transfer.tsx`、`tests/unit/storage/`（**新規ファイルの追加のみ**）

> **並行発注に関する注意。** 本発注と同時に次が走っている。**衝突するファイルに触らないこと。**
>
> | 発注 | 階層 | 触っている領域 |
> |---|---|---|
> | 016 | Luna | `tools/build-data/**`、`packages/*/public/fonts/SOURCES.json` |
> | 017 | Terra | `.github/workflows/ci.yml`、`tools/overflow-check/`、`tools/scan-publish/`、`tools/font-check/`、`tools/font-weight-check/`、`tools/check-storage/`、`tests/unit/ci-wiring.test.ts` |
>
> 本発注は `packages/shared/src/storage/`・`packages/shared/src/ui/`・`tests/unit/storage/` の
> **外に出ない**。とくに **`package.json`（リポジトリ直下）を変更しない。新しい script を足さない。**
> `packages/shared/package.json` も変更しない（`exports` の追加も行わない。§6 の S-F）。

---

## 0. この発注の位置づけ

`docs/IMPLEMENTATION_PLAN.md` §10 の **P4 保存・移行**を 2 本に分割した**後半**である。

| 発注 | 範囲 | 状態 |
|---|---|---|
| 009 | イベント定義、`schema.ts`、`db.ts`、`repo/`、`fallback.ts`、実ブラウザ検査、unit test | **検収済み（条件付き合格）** |
| **012（本書）** | `export.ts`、`import.ts`、`merge.ts`、`reset.ts`、`ui/screens/Transfer.tsx` | 本発注 |

本書は 009 が作った API の**上に載る**。009 の実装（`db.ts` / `schema.ts` / `fallback.ts` / `repo/*.ts`）
と `domain/event.ts` は**変更しない**。接続先の実 API は §4.1 に列挙してある。

実装計画 §10 P4 の実施内容 5〜9 が本発注に対応する。

| 実装計画 §10 P4 実施内容 | 本書 |
|---|---|
| 5. `storage/export.ts` | §4.2 |
| 6. `storage/import.ts` | §4.4 |
| 7. `storage/merge.ts` | §4.3 |
| 8. `storage/reset.ts` | §4.5 |
| 9. `ui/screens/Transfer.tsx` と確認ダイアログ | §4.6 |

実装計画 §10 P4 の「変更: `packages/hyakunin/src/ui/screens/Home.tsx`（データの移動への導線）／
`packages/kanazukai/src/ui/screens/Home.tsx`（同上）」は、**本発注の範囲外である**。導線は別発注で足す。
必要になったら §6 の S-F で停止すること。

**本発注の中心は「動くこと」ではなく「壊れたものを拒否できること」である。** §5.1 を先に読むこと。

---

## 1. 先に読むもの

| 順 | 文書・ファイル | 確認すること |
|---|---|---|
| 1 | `docs/HANDOFF.md` 全文 | 現在の状態と境界。**このファイルは変更しない** |
| 2 | `CONSTITUTION.md` §5・§7・§8 | 保存と端末間共有／確認ダイアログの原則／アクセシビリティ |
| 3 | `docs/APP_SPEC.md` **§9.1・§9.2** | **書き出し形式と取り込みの契約。これが正本である** |
| 4 | `docs/ADR/0004-two-products-layout.md` **追補 H-13** | `product` 判別子の表現方法（決定 1〜5）。**これが正本である** |
| 5 | `docs/ADR/0004-two-products-layout.md` 本文（D-06・D-01） | IndexedDB は 2 製品で 1 つ。`itemKey` は「1 つの想起行為 = 1 つの問」 |
| 6 | `docs/IMPLEMENTATION_PLAN.md` §10 の **P4** | 実施内容 5〜9、対象テスト、受入条件、停止条件 S-7 |
| 7 | `docs/IMPLEMENTATION_PLAN.md` §6.6・§6.7 | 統合の順序・拒否条件・初期化の対象／端末間の移し方（ファイル経路と文字列経路） |
| 8 | `packages/shared/src/storage/` の実装済みコード全部 | 009 が作った実 API。**本発注はこの API に接続する形で書く**（§4.1） |
| 9 | `packages/shared/src/domain/event.ts` | `Event` / `Session` / `Report` / `UserSettings` / `OutboxItem` の実際の形 |
| 10 | `packages/shared/src/app-config.ts` | `products` のキー（`product` の値の語彙はここと一致させる） |
| 11 | `tests/unit/storage/storage.test.ts` | 既存テストの書式（`node:test` + `node:assert/strict`）と、**既に検査されていること**（§4.7） |
| 12 | `packages/shared/src/ui/screens/ErrorScreen.tsx`・`packages/shared/src/ui/ErrorBoundary.tsx` | 共有 UI の書式（Preact・`class` 属性・`role` の付け方） |

---

## 2. 変更境界

### 変更してよいファイル

```text
packages/shared/src/storage/export.ts          （新規）書き出し
packages/shared/src/storage/import.ts          （新規）取り込み
packages/shared/src/storage/merge.ts           （新規）統合
packages/shared/src/storage/reset.ts           （新規）初期化
packages/shared/src/ui/screens/Transfer.tsx    （新規）書き出し・取り込み画面
tests/unit/storage/*.test.ts                   （新規ファイルの追加のみ）
```

### 絶対に変更しないファイル・領域

```text
packages/shared/src/storage/schema.ts          （009 の成果。検収済み）
packages/shared/src/storage/db.ts              （同上。§3 の裁定7 も参照）
packages/shared/src/storage/fallback.ts        （同上）
packages/shared/src/storage/repo/**            （同上。§3 の裁定9 も参照）
packages/shared/src/domain/**                  （同上）
packages/shared/src/data/**
packages/shared/src/styles/**
packages/shared/package.json                   （exports の追加も行わない）
package.json                                   （script を足さない。並行発注と衝突する）
tests/unit/storage/storage.test.ts             （既存試験。書き換えない。落ちたら S-D）
tests/ 配下の既存試験一式                       （ci-wiring.test.ts は発注017 の範囲）
packages/hyakunin/**                           （Home.tsx の導線は本発注の範囲外）
packages/kanazukai/**
packages/*/src/data/generated/**
packages/*/public/**                           （発注016 の範囲）
tools/**                                       （発注016・017 の範囲。読んで手本にするのは可）
docs/**                                        （裁定は済んでいる。自分で書き換えない）
CONSTITUTION.md
一次データの .md ファイル群
.github/
```

`git commit` / `git push` をしない。既存の未コミット変更を消去・復元・上書きしない。
**新しい npm 依存を追加しない。** 既存依存と Node 標準ライブラリだけで実現すること。

---

## 3. 裁定済み事項（再検討しないこと）

1. **書き出しの最上位形式は `docs/APP_SPEC.md` §9.1 のとおりとする。**
   鍵は `schemaVersion` / `exportedAt` / `deviceId` / `settings` / `sessions` / `events` / `reports`。
   鍵を増やさない。減らさない。
   - `schemaVersion` は **1**（ADR-0004 追補 H-13 決定3）。
   - `exportedAt` は**日付のみ**（例 `"2026-08-30"`）。時刻を出さない（§9.1・実装計画 §6.6）。
   - 秘密情報および学年以外の個人情報を含めない（§9.1）。
2. **`product` 判別子は ADR-0004 追補 H-13 に厳密に従う。**
   - `sessions` / `events` / `reports` の**各要素**が持つ。最上位には置かない（決定1）。
   - 値は `'hyakunin' | 'kanazukai'`。`appConfig.products` のキーと一致させる（決定2）。
   - **必須**。欠落・未知値は §9.2 の「不正な形式」として**理由つきで拒否**する。
     **既定値を推測して補完しない**（決定4）。
   - `settings` には付けない（決定5）。
3. **旧版の移行分岐を作らない。** `schemaVersion: 1` 以外の書き出しファイルは 1 つも存在しない
   （H-13 決定3）。したがって §9.2 の「再計算できない旧版はバックアップとして保持し要確認を出す」
   に該当する経路は**発生しない**。存在しない旧版のための分岐を書かないこと。
4. **拒否条件は `docs/APP_SPEC.md` §9.2 に書かれたものだけとする。**
   §9.2 が挙げるのは「不正なJSON」「別アプリの形式」「未来のスキーマ」「過大な件数」、および
   「`product` の欠落・未知の値」である。実装計画 §6.6 はこれを
   「不正 JSON、未知の最上位キー、`schemaVersion` が未来、件数が上限超過、別アプリ形式」と展開している。
   **この一覧に無い拒否条件を発明しないこと。** 必要だと判断したら §6 の S-A で停止して報告する。
5. **重複排除は `eventId` / `sessionId` / `reportId` の完全一致のみ**（§9.2・実装計画 §6.6）。
   時刻や内容の近さで同一視しない。同一値は**一回だけ**採用する。異なる履歴は全件を保持する。
6. **`merge.ts` は純関数とする。** IndexedDB・LocalStorage・`fetch`・現在時刻・乱数に触らない。
   引数（既存の記録と取り込む記録）から新しい配列を返すだけにする。IO は `import.ts` が持つ。
   理由: 統合の正しさを `npm test` だけで機械判定できるようにするためである。
7. **取り込みの順序は「検証 → プレビュー → 統合前バックアップ → 書き込み」とする**（実装計画 §6.6）。
   書き込みの途中で失敗したら、**バックアップから取り込み前の状態へ戻す**。部分適用を残さない。
   - **`db.ts` に多ストア原子トランザクションを足さない。** 既存の `runTransaction` は 1 ストア単位である。
     原子性はバックアップと復元で担保する。`db.ts` の変更が必要だと判断したら **S-C で停止**する。
8. **初期化（`reset.ts`）の対象は `events` / `sessions` / `reports` / `outbox` の 4 ストアとする。**
   `settings` は残す（§9.2・実装計画 §6.6・CONSTITUTION §5）。
   `settings` に含まれる `deviceId`（無作為な利用番号）も当然残る。
   - **`outbox` を初期化の対象に含める（親担当裁定 2026-08-31）。**
     `outbox` は**外部への送信待ちの控え**である。`reports` を消して `outbox` を残すと、
     **利用者が「消した」と思った記録が、初期化後に外部へ送信される。**
     「明記のないものは消さない」は通常は安全側の原則だが、**外部送信キューに限っては安全側が反転する。**
     憲章 §1 の優先順 3（表示上の誠実さ）に照らし、初期化は送信待ちの控えまで消すのが正しい。
   - **確認ダイアログには「送信待ちの報告 N 件も削除されます」を件数つきで明示すること**（裁定14 と対）。
     消えるものを黙って消さない。
   - **初期化はプロダクト単位で選べるようにする**（ADR-0004「影響」の実装計画 §6.6 に対する項）。
     すなわち「両方」「`hyakunin` のみ」「`kanazukai` のみ」を選べる形にする。
     絞り込みは各要素の `product` で行う。
9. **`reset.ts` は `repo/events.ts` に関数を足して実現してはならない。**
   既存試験 `tests/unit/storage/storage.test.ts` が
   `Object.keys(eventsRepository).sort()` が `['appendEvent', 'listEvents']` であることを検査している。
   関数を足すとこの試験が落ちる。`reset.ts` は `db.ts` の `runTransaction` を直接使うこと
   （009 の裁定「`events` は追記専用。初期化は発注012 の `reset.ts` が担当する」の継続）。
10. **習熟度の再計算は本発注では実装しない。** P5 の範囲である。
    §9.2 の「習熟度は保存値を盲目的に上書きせず、イベントから再計算する」に対して本発注が守るのは、
    **「保存された習熟度の値を書き出さない・取り込まない」**ことだけである。
    §9.1 の最上位形式に習熟度の欄は無い。欄を足さないこと（裁定1）。
11. **現在時刻を実装内部で直接読まない**（009 の裁定5 の継続）。`exportedAt` に入れる日付は
    引数で受け取る。`Date.now()` / `new Date()` を `storage/*.ts` の中で呼ばない。
    理由: 再現可能な試験のためである。
12. **「過大な件数」の閾値は裁定済み（親担当 2026-08-31）。**
    **`sessions` / `events` / `reports` の各配列につき 100,000 件を上限とする。**
    実装は上限を**必須の引数**として受け取り**既定値をコード内に置かない**。
    この数値は呼び出し側（`Transfer.tsx`）が定数として持つ。**再検討しないこと。**
    - 根拠: 1 イベントは概ね 200 バイト前後であり、100,000 件で約 20MB。
      長年使い込んだ利用者の記録を**正当に拒否してしまわない**だけの余裕を取った値である。
      拒否は記録の消失に直結するため、閾値は厳しくではなく**緩く**取る。
    - **バイト長そのものの上限は設けない**（§9.2 に無い）。件数で足りる。
13. **`settings` に含める鍵の範囲は裁定済み（親担当 2026-08-31）。**
    **含めるのは `reading` / `writing` / `order` / `soundEnabled` / `grade` の 5 鍵。**
    **含めないのは `noticeConfirmed` / `key` / `deviceId` の 3 鍵。再検討しないこと。**

    | 鍵 | 扱い | 理由 |
    |---|---|---|
    | `reading` / `writing` / `order` | 含める | §9.1 の例に現れる |
    | `soundEnabled` | 含める | 表示設定と同種の、端末をまたいで引き継ぐべき好み |
    | `grade` | 含める | §9.1 が「**学年以外の**個人情報を含めない」と書いており、学年は対象と読める |
    | `noticeConfirmed` | **含めない** | 「この端末でお知らせを確認した」という端末固有の状態。移行先で「確認済み」にすると、実際には見ていないものを見たことにしてしまう（憲章 §1 の優先順 3・表示上の誠実さ） |
    | `key` | **含めない** | 値は `'user'`。保存層の主キーであって利用者の設定ではない |
    | `deviceId` | **含めない** | §9.1 のとおり**最上位**に置く。`settings` の中に重複させない |
14. **確認ダイアログは統合と初期化にだけ出す。**
    対象と件数を明示する（§9.2・実装計画 §6.6）。
    範囲選択・次へ・読み表示切替のような安全な操作には出さない（CONSTITUTION §7）。
    **`reset` は確認を経ずに実行できてはならない**（§5.1 の破壊試験7）。
15. **`Transfer.tsx` は薄い殻にする。** 判断・検証・整形・件数計算は `storage/*.ts` の純関数へ置き、
    `Transfer.tsx` は「呼ぶ・表示する・確認を取る」だけにする。
    理由: `npm test` は `node --experimental-strip-types --test` であり、**JSX を実行できない**。
    `.tsx` に判断を書くほど機械判定できない部分が増える。機械判定できる範囲を最大化すること。
16. **ファイル経路と文字列経路の両方を実装する**（実装計画 §6.7）。
    書き出しは「UTF-8 JSON ファイル」と「貼り付け可能な JSON 文字列」の両方（§9.1）。
    取り込みも「ファイル選択」と「文字列の貼り付け」の両方。片方だけにしない。
    書き出し時に**件数と概算文字数を先に表示する**（実装計画 §6.6・§6.7）。
17. **`Transfer.tsx` は 2 製品共通の画面である**（実装計画 §10 P4）。
    製品名を焼き付けない。表示に製品名が要る場合は `appConfig.products` の `displayName` を使う。
    操作・設定の画面であるから**横書き**とする（CONSTITUTION §7）。

---

## 4. 実装範囲

### 4.1 接続先の既存 API（009 の成果。ここに接続する）

**新しい保存層を作らない。** 下記をそのまま使うこと。行番号は 2026-08-31 時点の実測である。

| ファイル | 使うもの |
|---|---|
| `packages/shared/src/storage/schema.ts` | `databaseName`（`'koten'`・1 行）、`dbVersion`（`1`・2 行）、`stores`（4〜10 行）、`StoreName`（12 行） |
| `packages/shared/src/storage/db.ts` | `openDatabase(factory?, options?)`（13 行）、`runTransaction(database, storeName, mode, action)`（42 行）、結果型 `StorageResult<T>` / `StorageFailure` / `StorageSuccess<T>`（3〜5 行）、`getIndexedDbFactory()`（9 行） |
| `packages/shared/src/storage/repo/events.ts` | `appendEvent(database, event)`、`listEvents(database)` |
| `packages/shared/src/storage/repo/sessions.ts` | `saveSession`、`listSessions` |
| `packages/shared/src/storage/repo/settings.ts` | `saveSettings`、`getSettings` |
| `packages/shared/src/storage/repo/reports.ts` | `saveReport`、`listReports` |
| `packages/shared/src/storage/repo/outbox.ts` | `enqueueOutbox`、`listOutbox`、`removeOutbox` |
| `packages/shared/src/storage/fallback.ts` | `writeFallback(storage, key, value)`、`readFallback(storage, key)` |
| `packages/shared/src/domain/event.ts` | 型 `Event` / `Session` / `Report` / `UserSettings` / `OutboxItem`、判定 `isEvent(value)`（34 行）、`isProductId(value)`（29 行） |

`StorageResult<T>` は `{ ok: true; value: T }` か
`{ ok: false; reason: 'unavailable' | 'open-failed' | 'upgrade-failed' | 'transaction-failed'; error: unknown }` である。
**本発注の関数も、例外を投げずに結果型を返す方式に揃えること。**
拒否は異常系ではなく**正常系の分岐**として扱う（拒否理由を画面に出す必要があるため。§9.2）。

`isProductId` は既に `appConfig.products` のキーと突き合わせている。
**`product` の語彙を自前で書き直さないこと。** `isProductId` を使う。
`appendEvent` は既に `isEvent` で `product` を検査して弾く（`repo/events.ts` 5 行）。
取り込み側の検証は、この保存層の検査に**依存せず**、書き込みの**前に**独立して行うこと（§4.4）。

### 4.2 `storage/export.ts`

1. 保存層から `sessions` / `events` / `reports` / `settings` / `deviceId` を集め、
   §9.1 の最上位形式のオブジェクトを組み立てる。
2. 「JSON 文字列」と「ファイルとして落とすための中身」を両方出せるようにする（§3 の裁定16）。
3. **件数（`sessions` / `events` / `reports` の各件数）と概算文字数**を、書き出し実行の**前に**
   計算して返す関数を分けて置く。`Transfer.tsx` はそれを先に表示する。
4. `exportedAt` は引数で受け取る（§3 の裁定11）。日付のみ（§3 の裁定1）。
5. 書き出す各要素の `product` を落とさないこと。落とすと取り込み側が拒否する。

### 4.3 `storage/merge.ts`

- **純関数**（§3 の裁定6）。
- `eventId` / `sessionId` / `reportId` の**完全一致**で重複排除する（§3 の裁定5）。
- **既存記録を消さない。** 同一 ID が両側にあるとき、既存側を残す。
- 何件を新規採用し、何件を重複として捨てたかを、呼び出し側へ数で返すこと（確認画面に出すため）。
- 双方向に収束すること（A に B を統合したものと、B に A を統合したものが、
  ID の集合として一致すること）。実装計画 §10 P4 の対象テストに入っている。

### 4.4 `storage/import.ts`

順序は §3 の裁定7 のとおり。**検証 → プレビュー → 統合前バックアップ → 書き込み → 失敗時は復元**。

**検証（拒否の判定）は §9.2 に書かれたものだけを見る**（§3 の裁定4）。

| 拒否する入力 | 出典 |
|---|---|
| JSON として解釈できない | §9.2「不正なJSON」 |
| 最上位が §9.1 の形でない（未知の最上位キー、必須キーの欠落を含む） | §9.2「別アプリの形式」／実装計画 §6.6 |
| `schemaVersion` が 1 でない | §9.2「未来のスキーマ」／H-13 決定3（1 以外の書き出しファイルは存在しない） |
| 件数が上限を超える | §9.2「過大な件数」（上限は引数。§3 の裁定12） |
| `sessions` / `events` / `reports` のいずれかの要素で `product` が欠落 | §9.2・H-13 決定4 |
| 同上で `product` が `appConfig.products` のキーに無い値 | 同上 |

- **拒否は理由つきで返す**（§9.2「理由を表示する」）。どの拒否条件に当たったかを、
  画面に出せる形（結果型のフィールド）で返すこと。理由を握り潰さない。
- **拒否したときは保存層へ一切書き込まない。** 検証は書き込みの前に完了させる。
- プレビューは「版・件数・対象範囲」を返す（§9.2・実装計画 §6.6）。ここで利用者の確認を取る。
- **統合前バックアップ**: 書き込み前に既存の `events` / `sessions` / `reports` を読み出して保持する。
- **失敗時の復元**: 書き込みの途中で失敗したら、バックアップの状態へ戻す。
  部分適用を残さない（§5.1 の破壊試験5）。
- 復元にも失敗した場合は、**S-B（実装計画の停止条件 S-7）で停止して報告する**。黙って続行しない。

### 4.5 `storage/reset.ts`

- 対象は `events` / `sessions` / `reports` / **`outbox`**（§3 の裁定8）。**`settings` だけを残す。**
  `outbox` を残さない理由は裁定8 に書いたとおり、**消したはずの記録が後から外部へ送信されるのを防ぐ**ためである。
- **プロダクト単位で選べる**（両方 / `hyakunin` のみ / `kanazukai` のみ）。
- **確認なしに実行できてはならない**（§3 の裁定14）。
  対象と件数を受け取って初めて実行する形にし、確認を経ていない呼び出しでは実行しないこと。
  この「確認を経ていない呼び出しでは実行しない」ことを **unit test で検査できる形**にする
  （`Transfer.tsx` の中だけで確認を取る作りにしない。それでは機械判定できない）。
- `repo/events.ts` に関数を足さない（§3 の裁定9）。`runTransaction` を直接使う。

### 4.6 `ui/screens/Transfer.tsx`

- 書き出し（ファイル・文字列の両方）と取り込み（ファイル選択・貼り付けの両方）と初期化の画面。
- 書き出し前に**件数と概算文字数**を表示する。
- 取り込みは**プレビュー（版・件数・対象範囲）→ 確認 → 実行**の順。
- 拒否されたときは**理由を画面に出す**。
- 統合と初期化の確認は**対象と件数**を示す。それ以外の操作に確認を挟まない（§3 の裁定14）。
- 既存の共有 UI の書式に合わせる（`packages/shared/src/ui/screens/ErrorScreen.tsx`。Preact、`class` 属性）。
- CONSTITUTION §8 / `docs/APP_SPEC.md` §13 を満たすこと。とくに次を守る。
  - キーボードだけで全操作ができる。可視フォーカスがある。
  - タップ領域は原則 44px 以上。
  - 状態（拒否理由・完了・件数）を色だけで伝えない。文言を併用する。
  - 320px 幅で横あふれ・文字切れ・操作不能がない。
- **`Transfer.tsx` に判断を書かない**（§3 の裁定15）。

> **`Transfer.tsx` の描画確認は本発注の範囲外である（親担当裁定 2026-08-31）。再検討しないこと。**
>
> 根拠: `packages/shared` に DOM テストの基盤が無い。`vitest.config.ts` は
> `packages/hyakunin` と `packages/kanazukai` にしか存在せず、`tests/unit/` は `node:test` で
> DOM を持たない。基盤を新設すれば新しい依存と新しい設定が要り、**停止条件 S-E に触れる**。
> **導線接続と実ブラウザでの描画確認は P7（学習画面の統合）でまとめて行う。**
>
> したがって `Transfer.tsx` について報告できるのは「`typecheck` / `lint` / `build` を通った」までである。
> **描画確認をしていないものを「動作確認済み」と書かないこと。**
> §7 に「`Transfer.tsx` の描画確認は未実施（範囲外）」と**事実として明記すること**。これは減点ではない。
> 描画確認のために境界外の変更をしたくなっても、**しない**。

### 4.7 unit test `tests/unit/storage/`

- **新規ファイルを足す。** 既存の `tests/unit/storage/storage.test.ts` は**変更しない**。
  （同ファイルは他発注の検収対象でもある。落ちた場合は直さず S-D で報告する）
- 既存の書式に合わせる（`node:test` + `node:assert/strict`）。**ネットワークと実 IndexedDB に依存させない。**
- 実 IndexedDB が要る箇所は、`tests/unit/storage/storage.test.ts` の 86 行以降にある
  代役 `IDBFactory` の作り方を手本にする。**新規依存にしないこと。**
- 検査するのは §5.1 の破壊試験 1〜7 と、次である。
  1. 書き出し → 取り込みの往復で、`sessions` / `events` / `reports` の件数と ID 集合が保たれる。
  2. 書き出しの最上位キーが §9.1 のとおりである（鍵の集合の一致を検査する）。
  3. 書き出した `sessions` / `events` / `reports` の各要素が `product` を持っている。
  4. `merge` が双方向に収束する。
  5. `reset` 後も `settings`（`reading` / `writing` / `order` / `deviceId` を含む）が残る。
  6. `reset` をプロダクト単位で行うと、他方の製品の記録が残る。
  7. **`reset` 後に `outbox` が空になる**（送信待ちの控えが残らない）。**この試験を必ず入れること。**
  8. **書き出したファイルの `settings` に `noticeConfirmed` / `key` / `deviceId` が含まれていない**（§3 の裁定13）。

---

## 5. 受入条件

1. 次がすべて終了コード0で完了する。**それぞれ実際に実行すること。**

```text
npm run typecheck
npm run lint
npm test
npm run build
npm run data:check
npm run scan:publish
npm run check:font
npm run check:font-weight
npm run check:font-assets
npm run check:overflow
npm run check:storage
```

2. **`npm test` は件数を書く。** 2026-08-31 時点の基準値は
   **`tests 41 / pass 41 / fail 0`**（親担当が実測）。
   本発注の後の**総件数・合格件数・失敗件数**と、**本発注で追加した件数**を報告に書く。
   **41 件を下回ってはならない。** 下回った場合は既存試験を書き換えて通さず、S-D で報告する。
3. **`npm run check:storage` はシナリオ数と合格数を書く。** 2026-08-31 時点の基準値は
   **「シナリオ 5 件、合格 5 件、不合格 0 件」**（親担当が実測）。
   本発注は `tools/check-storage/` を変更しないので、**この値が変わってはならない**。
   変わった場合は保存層に影響を与えた疑いがある。修正せず S-B で報告する。
4. `npm run check:overflow` は、**本発注の変更前に一度実行して件数と合格数を記録し**、
   変更後も同じ値であることを示す。下回った場合は修正せず、首番号・読み・幅・違反キーを
   そのまま報告する。
5. `git status --short` の差分が §2 の許可範囲に収まっている。
   **`docs/` 配下に差分が出ていないこと。`package.json` と `packages/shared/package.json` に
   差分が出ていないこと。`tools/` 配下に差分が出ていないこと。**
6. 009 の成果である既存 8 ファイル（`packages/shared/src/storage/schema.ts` / `db.ts` /
   `fallback.ts` と `packages/shared/src/storage/repo/` の 5 本）および
   `packages/shared/src/domain/event.ts` が **無変更**である（`git status --short` で示す）。

### 5.1 破壊試験（**本発注の受入の中心**）

取り込みと統合は既存記録を壊しうる。したがって受入は「動くこと」ではなく
**「壊れたものを拒否できること」**の側に置く。次を**すべて** unit test として実装し、
**実際に実行した結果**を報告すること。

| # | 与えるもの | 満たすこと |
|---|---|---|
| 1 | `sessions` / `events` / `reports` のいずれかの要素から `product` を抜いた書き出しファイル | **拒否される。** 理由が返る。保存層に一切書き込まれない |
| 2 | `product` が `appConfig.products` の語彙に無い値（例 `"other"`）である書き出しファイル | 同上。**既定値を推測して補完しない** |
| 3 | `schemaVersion` が 1 でない書き出しファイル（例 `2`、`0`、文字列） | **拒否される。** 理由が返る |
| 4 | JSON として壊れているファイル／空ファイル／件数上限を超える巨大なファイル | **例外を投げずに**拒否の結果型を返す。処理が止まらない。既存記録が変化しない |
| 5 | 書き込みの途中で失敗する状況（書き込み経路に失敗を注入する） | **既存記録が取り込み前の状態に戻る。部分適用が残らない** |
| 6 | 同一の書き出しファイルを 2 回取り込む | **記録が二重にならない。** 2 回目の後も件数と ID 集合が 1 回目と同一（冪等） |
| 7 | 確認を経ていない `reset` の呼び出し | **実行されない。** 記録が消えない |

破壊試験 5 は、失敗を注入するために §4.1 の結果型と代役 `IDBFactory` を使う。
**「失敗しなかったから合格」と書かないこと。** 失敗を実際に起こしたうえで、
既存記録が戻ったことを assert すること。

### 5.2 実行環境の既知の注意（Windows）

本発注は実ブラウザ検査ツールを**作らない**（`tools/check-storage/` は発注017 の範囲）。
ただし受入条件で `npm run check:overflow` と `npm run check:storage` を**実行する**ため、
次の 3 点は本発注でも効く。**親担当が実測したものであり、推測ではない。**
`tools/overflow-check/index.ts` を手本として読むこと（**変更しない**）。

- `npm.cmd` を直接 `spawn` すると Windows で `EINVAL` になる。Vite の JS 入口を Node で直接起動している
  （`tools/overflow-check/index.ts` 25〜26 行）。
- `vite preview` は `localhost` に束縛され、Windows では `::1` のみである。`127.0.0.1` では応答しない
  （同 7〜8 行）。
- 前回の実行が残っているとポートが占有される。実行前に占有が無いことを確認すること
  （`tools/check-storage/index.ts` 31 行の空きポート確認）。

### 5.3 他発注の影響で落ちた場合

本発注は 016・017 と**同じ作業ツリー**で走る。`data:check` / `check:font-assets` /
`scan:publish` などが他発注の作業中の変更で落ちることがある。
**自分で直さないこと。** 落ちたコマンドと出力をそのまま報告し、S-G で停止する。

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| S-A | `docs/APP_SPEC.md` §9.2 に**書かれていない**拒否条件が必要だと判断した |
| S-B | 既存記録の消失・重複加算・復元不能が疑われる（実装計画の停止条件 **S-7**）。復元に失敗した場合を含む。`check:storage` の 5 件合格が崩れた場合を含む |
| S-C | `packages/shared/src/storage/db.ts`（または `schema.ts` / `fallback.ts` / `repo/` 配下 / `domain/` 配下）の変更が必要になった。**009 の検収済み成果である。触らない** |
| S-D | 既存試験 `tests/unit/storage/storage.test.ts` またはその他の既存試験が落ちた。**書き換えて通さない** |
| S-E | `docs/APP_SPEC.md` §9.1・§9.2 に書かれていない値を、仕様として新たに決める必要が出た。**ただし「過大な件数」の閾値（100,000 件）と `settings` に含める鍵の 5 件は §3 の裁定12・13 で決着済みである。この 2 つで停止しないこと。** 新しい依存・新しいテスト設定が必要になった場合もここで停止する |
| S-F | `packages/*/src/ui/` 配下（Home.tsx の導線）、`package.json`、`packages/shared/package.json` の `exports`、`tools/` 配下の変更が必要になった |
| S-G | 他発注（016・017）の作業と差分が衝突した、または受入コマンドが本発注と無関係な理由で落ちた |
| S-H | 習熟度の再計算が必要だと判断した（**P5 の範囲**である） |

**どの停止条件でも `docs/` 配下を自分で編集してはならない。** 観測結果を報告して停止すること。

---

## 7. 完了報告に含めること

1. 変更・追加したファイルの一覧と、各ファイルで何をしたか。
2. §5 の受入条件1〜6を一項目ずつ、**実行した方法と観測結果**で報告。
   `npm test` は総件数・合格件数・失敗件数・追加件数を書く。
   `check:storage` はシナリオ数と合格数を書く。
   `check:overflow` は変更前と変更後の件数・合格数を両方書く。
3. **§5.1 の破壊試験 1〜7 を、1 件ずつ「与えた入力」「観測した結果」で報告。**
   実行していないものがあれば、**実行していないと書くこと**。
4. `Transfer.tsx` について、**実行・描画による確認を行えたか否かを事実として書く**（§4.6 の注記）。
5. §6 の停止条件に当たった項目。なければ「なし」と明記。
6. **独自に決めたことがあれば全件。なければ「なし」と明記。**
   `settings` に含めた鍵の範囲とその理由（§3 の裁定13。**これは必ず書く項目である**）、
   結果型の形、関数名・引数の並び、拒否理由の識別子、バックアップの持ち方、
   件数上限の引数名、試験ファイル名、代役の作りなど、
   本書に書かれていない判断は小さくても全部書くこと。

推測・予定ではなく観測結果を書くこと。**実行していない検査を「成功」と書かないこと。**
**一度も実行できていないコードを完成として報告しないこと。**
**検査ツールは、完走しなかったときに合格を出してはならない。**
