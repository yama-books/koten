# Codex向け発注文書 016: 生成物検査の日付爆弾と、OFL.txt 4件の出所記録

発注日: 2026-08-31
階層: **Luna**（受入条件がコマンド 1 本で機械判定できる。ネットワーク・ブラウザを使わない）
優先度: **最高**（`data:check` は CI に配線済みで、現在**赤**である。放置すると以後すべての CI が落ちる）
対象: `tools/build-data/`、`packages/*/public/fonts/SOURCES.json`

> **並行発注に関する注意**: 発注017 が同時に走る。017 の対象は `.github/workflows/ci.yml`・`tools/overflow-check/`・
> `tools/scan-publish/`・`tools/font-check/`・`tools/font-weight-check/`・`tools/check-storage/` である。
> **本発注は `tools/build-data/` と `SOURCES.json` にしか触らない。** 重なるファイルは無い。
> `package.json` は**本発注では一切変更しない**。

---

## 0. この発注の位置づけ

親担当が 2026-08-31 に基準線を取り直したところ、**2 つのゲートが赤**だった。本発注はその 2 件を閉じる。

| # | 症状 | 原因 | 本発注の扱い |
|---|---|---|---|
| 1 | `npm run data:check` が `V-14: stale generated file manifest.json` で終了コード 1 | `generatedOn` が実行日から作られ、V-14 が生成物を全文一致で照合している | **課題 1** |
| 2 | `npm run check:font-assets` が `license` 違反 4 件で終了コード 1 | `OFL.txt` 4 件が `SOURCES.json` に未記録 | **課題 2** |

どちらも**現状のまま公開ゲートとして使えない**状態である。

---

## 1. 先に読むもの

| 順 | 文書・ファイル | 確認すること |
|---|---|---|
| 1 | `docs/HANDOFF.md` §3「絶対に守ること」・§10.5 | 境界と決定権。**このファイルは変更しない** |
| 2 | `tools/build-data/index.ts` / `validate.ts` / `emit.ts` / `paths.ts` | 課題 1 の全体像 |
| 3 | `tests/data/reproducibility.test.ts` | 再現性テストが何を保証しているか |
| 4 | `tools/font-assets-check/index.ts` :88-96 | 課題 2 の検査項目 6（`license`）の判定条件 |
| 5 | `packages/hyakunin/public/fonts/SOURCES.json` 先頭 | 記録の書式（`file` / `url` / `sha256` / `bytes`） |
| 6 | `docs/LICENSE_AUDIT.md` §2 | 課題 2 の `url` の値の出典。**再調査しない。この値を使う** |

---

## 2. 変更境界

### 変更してよいファイル

```text
tools/build-data/index.ts                          （generatedOn の作り方）
tools/build-data/validate.ts                       （V-14 の照合方法）
tools/build-data/paths.ts                          （必要なら定数の追加のみ）
packages/hyakunin/src/data/generated/manifest.json （課題 1 の解として再生成する場合のみ）
packages/kanazukai/src/data/generated/manifest.json（存在する場合のみ・同上）
packages/hyakunin/public/fonts/SOURCES.json        （課題 2・4 件の追記のみ）
packages/kanazukai/public/fonts/SOURCES.json       （課題 2・4 件の追記のみ）
tests/data/*.test.ts                               （課題 1 の回帰テスト追加）
tests/unit/font-assets.test.ts                     （課題 2 の回帰テスト追加）
```

### 絶対に変更しないファイル・領域

```text
docs/**                          （裁定は済んでいる。自分で書き換えない。停止条件でも編集しない）
CONSTITUTION.md
一次データの .md（百人一首_*.md / 古典文法_*.md / 仮名遣い規則_*.md）
package.json                     （本発注では scripts も dependencies も触らない）
.github/**                       （発注017 の担当）
tools/overflow-check/** tools/scan-publish/** tools/font-check/**
tools/font-weight-check/** tools/check-storage/** tools/font-assets-check/**
packages/*/src/**                （生成物 manifest.json を除く）
packages/*/public/fonts/**/*.woff2   （実体に触らない）
packages/*/public/fonts/**/OFL.txt   （実体に触らない。記録を足すだけ）
```

`git commit` / `git push` をしない。既存の未コミット変更を消去・復元・上書きしない。
新しい npm 依存を足さない。

---

## 3. 裁定済み事項（再検討しないこと）

| # | 裁定 | 根拠 |
|---|---|---|
| A | **`generatedOn` は残す。フィールドごと削除しない。** 生成日は監査上の情報として有用である | 親担当裁定 2026-08-31 |
| B | **V-14 の趣旨は「生成物が一次資料と同期しているか」であり、「いつ生成したか」ではない。** したがって照合から `generatedOn` を除くのが正しい直し方である | 同上 |
| C | **`dataVersion` / `generatorVersion` / `sourceHashes` / `counts` は従来どおり全文一致で照合する。** 緩めてよいのは `generatedOn` 1 フィールドだけである | 同上 |
| D | **D-11 は裁定済み。`OFL.txt` 4 件を `SOURCES.json` に記録する。** 検査項目 6 を緩めない | 親担当裁定 2026-08-31（依頼者が必要度の判断を委任） |
| E | **`OFL.txt` の `url` の値は次で固定する。**<br>`klee-one/OFL.txt` → `https://raw.githubusercontent.com/google/fonts/main/ofl/kleeone/OFL.txt`<br>`zen-maru-gothic/OFL.txt` → `https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/OFL.txt`<br>**この値を変えない。別の URL を提案しない。ネットワークで取得し直さない** | `docs/LICENSE_AUDIT.md` §2（H-02 で依頼者が追認済み） |
| F | **`sha256` と `bytes` はローカルの実ファイルから計算する。** 記録は「手元にあるこの実体」の記述であり、遠隔の現在値ではない | 検査項目 4（`metadata`）の判定方法に合わせる |

---

## 4. 課題 1: `data:check` の日付爆弾

### 4.1 現状

`tools/build-data/index.ts:20`

```ts
const manifest = { ..., generatedOn: new Date().toISOString().slice(0, 10), ... };
```

`tools/build-data/validate.ts:30-32`

```ts
export function assertGeneratedCurrent(data, directory = paths.generated) {
  for (const { file, content } of outputFiles(directory, data))
    if (!existsSync(file) || readFileSync(file, 'utf8') !== content) throw new Error(`V-14: stale generated file ...`);
}
```

`--check` は毎回その日の日付で `manifest` を組み立て、ディスク上の `manifest.json` と**全文比較**する。
`generatedOn` は生成した日のまま固定されているので、**生成日以外に走らせると必ず不一致になる**。

**実測（2026-08-31・親担当）**

```text
$ npm run data:check
Error: V-14: stale generated file manifest.json
```

ディスク上の `manifest.json` の `generatedOn` は `"2026-08-30"`。
前セッションで緑だったのは、JST 8/31 午前が UTC ではまだ 8/30 だったためである（`toISOString` は UTC）。

### 4.2 やること

`assertGeneratedCurrent` を、**`manifest.json` についてだけ `generatedOn` を除いて照合する**ように直す。

- `poems.json` と `variants.json` はこれまでどおり**全文一致**で照合する。緩めない。
- `manifest.json` は、`generatedOn` 以外の全フィールド（`dataVersion` / `generatorVersion` / `sourceHashes` / `counts`）が一致することを照合する。
- ディスク上の `manifest.json` に `generatedOn` が**存在しない**場合は不合格にする（フィールドを消して逃げられないようにする）。
- ディスク上の `generatedOn` が `YYYY-MM-DD` 形式でない場合も不合格にする。
- エラーメッセージは、どのフィールドが食い違ったかが分かる文言にする（`V-14: stale generated file manifest.json` だけで終わらせない）。

`emit`（`--check` なしの生成側）は**変えない**。生成時は従来どおり実行日を書き込む。

### 4.3 回帰テスト（`tests/data/` に追加）

次の 4 件を追加する。既存テストは 1 件も消さない・書き換えない。

| # | テスト | 期待 |
|---|---|---|
| T-1 | `manifest.json` の `generatedOn` だけが異なる状態で `assertGeneratedCurrent` を呼ぶ | **例外を投げない**（合格） |
| T-2 | `manifest.json` の `counts.poems` を 99 に変えて呼ぶ | **例外を投げる** |
| T-3 | `manifest.json` から `generatedOn` を削除して呼ぶ | **例外を投げる** |
| T-4 | `poems.json` を 1 バイト変えて呼ぶ | **例外を投げる**（全文一致が緩んでいないことの確認） |

テストは**一時ディレクトリ**に生成物のコピーを作って行うこと。
`packages/*/src/data/generated/` の実ファイルを書き換えて戻す方式は取らない。

---

## 5. 課題 2: `OFL.txt` 4 件の記録

### 5.1 現状

**実測（2026-08-31・親担当）**

```text
$ npm run check:font-assets
license hyakunin klee-one/OFL.txt
license hyakunin zen-maru-gothic/OFL.txt
license kanazukai klee-one/OFL.txt
license kanazukai zen-maru-gothic/OFL.txt
font-assets: 不合格
```

`tools/font-assets-check/index.ts:94-95` は、`OFL.txt` の**実体があること**と
**`SOURCES.json` に記録があること**の両方を要求している。実体はあり、記録が無い。

### 5.2 やること

`packages/hyakunin/public/fonts/SOURCES.json` と `packages/kanazukai/public/fonts/SOURCES.json` の
`files` 配列に、各 2 件（計 4 件）を追記する。

```jsonc
{
  "file": "klee-one/OFL.txt",
  "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/kleeone/OFL.txt",
  "sha256": "<実ファイルから計算>",
  "bytes": <実ファイルのバイト数>
}
```

```jsonc
{
  "file": "zen-maru-gothic/OFL.txt",
  "url": "https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/OFL.txt",
  "sha256": "<実ファイルから計算>",
  "bytes": <実ファイルのバイト数>
}
```

- **既存 736 件の記録を 1 件も書き換えない。並べ替えない。** 追記のみ。
- 挿入位置は既存の並び順の規則に従うこと（現状の並びを読んで判断し、§8 に何をしたか書く）。
- `sourceCss` フィールドに触らない。
- **2 パッケージで `sha256` と `bytes` が同一になるはずである。** ならない場合は停止条件 S-B。

### 5.3 回帰テスト（`tests/unit/font-assets.test.ts` に追加）

| # | テスト | 期待 |
|---|---|---|
| T-5 | 両パッケージの `SOURCES.json` に `klee-one/OFL.txt` と `zen-maru-gothic/OFL.txt` の記録が存在する | 真 |
| T-6 | 記録された `sha256` / `bytes` が実ファイルと一致する | 真 |

---

## 6. 受入条件（すべてコマンドで機械判定すること）

| # | 条件 | 判定コマンド | 書くべき観測値 |
|---|---|---|---|
| 1 | `data:check` が合格する | `npm run data:check` | 終了コード。**0 であること** |
| 2 | **`data:check` が日付に依存しない** | `manifest.json` の `generatedOn` を `"1999-01-01"` に書き換えて `npm run data:check` → 終了コード 0 を確認 → **元の値に復元** | 書き換え後の終了コード（0）と、復元後に `git diff`（または退避コピーとの `diff`）が一致すること |
| 3 | **V-14 が緩みすぎていない** | `manifest.json` の `counts.poems` を `99` に書き換えて `npm run data:check` → **終了コード 1** を確認 → **元の値に復元** | 書き換え後の終了コード（1）と、出たエラー文言 |
| 4 | `check:font-assets` が合格する | `npm run check:font-assets` | 出力全文。**`検査ファイル 740 件、記録 740 件、全項目 0`** かつ終了コード 0 |
| 5 | **`check:font-assets` が偽の合格を出さない** | `OFL.txt` 1 件を一時退避して `npm run check:font-assets` → **終了コード 1** を確認 → **復元** | 反応した違反種別と件数、復元確認の方法 |
| 6 | 既存テストと追加テストが緑 | `npm test` | **件数を書くこと**（現在 41 件。T-1〜T-6 を足して 47 件になるはず） |
| 7 | 他のゲートが壊れていない | `npm run typecheck && npm run lint && npm run build && npm run scan:publish && npm run check:font` | すべて終了コード 0 と、`scan:publish` の走査件数・`check:font` の対応件数 |
| 8 | 変更境界を守っている | `git status --short` | 出力全文。**`docs/**`・`package.json`・`.github/**` に差分が無いこと** |
| 9 | `SOURCES.json` の既存記録が無傷 | 変更前の `SOURCES.json` を退避しておき `diff` で比較 | **追加 4 件以外の差分が 0 行であること**（`diff` の出力を貼る） |

---

## 7. 停止条件

**停止したら `docs/` を自分で編集せず、報告に書いて止まること。**

| # | 条件 | 対応 |
|---|---|---|
| S-A | `generatedOn` を除く照合に直したら、`counts` や `sourceHashes` の食い違いが**新たに**露見した | 直さずに停止。何が食い違ったかを報告する（一次資料が動いた可能性がある） |
| S-B | 2 パッケージの `OFL.txt` の `sha256` が一致しない | 停止。両方のハッシュとバイト数を報告する |
| S-C | `OFL.txt` の中身が `docs/LICENSE_AUDIT.md` §2 の著作権表示（Klee One = `Copyright 2020 The Klee Project Authors`、Zen Maru Gothic = `Copyright 2021 The Zen Maru Gothic Project Authors`）と食い違う | **停止。ライセンス表示に触れるため人の判断が要る**（§10.5） |
| S-D | 受入条件 3（`counts` を壊すと赤くなる）が満たせない。つまり V-14 を緩めすぎた | 停止。緩めた範囲を報告する |
| S-E | 破壊試験の復元に失敗した、または `diff` が一致しない | **直ちに停止**。何を壊し、どこまで戻したかを正確に報告する |
| S-F | 新しい npm 依存が必要になった | 停止。何が必要かを報告する |
| S-G | `package.json` / `docs/**` / `.github/**` を変更する必要が出た | 停止。理由を報告する |

---

## 8. 報告に必ず書くこと

1. **受入条件 1〜9 の判定を 1 件ずつ**。観測した実測値・件数・終了コードを添える。
2. **破壊試験（受入条件 2・3・5）の記録**。壊した内容・観測した終了コードと出力・**復元の確認方法と結果**。
3. **`SOURCES.json` の追加 4 件の実際の値**（`sha256` と `bytes` を含む全文）。
4. **`OFL.txt` 記録の挿入位置をどう決めたか。**
5. **独自に決めたことを全件。無ければ「なし」と明記すること。**
6. `git status --short` の全文。

---

- 実行していない検査を「成功」と書かないこと。
- 一度も実行できていないコードを完成として報告しないこと。
- 検査ツールは、完走しなかったときに合格を出してはならない。
