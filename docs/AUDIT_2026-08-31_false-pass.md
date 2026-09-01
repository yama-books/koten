# 監査文書 2026-08-31: 偽合格の全数監査（発注015）

監査者: Sonnet（読み取り専用）
監査対象時点: 2026-08-31（`tools/**` と `tests/**` は監査中に一部が発注013/014により変更された。該当箇所は本文に明記）
製品コードへの変更: なし（一時的な破壊実験は §4 の手順で全件復元済み。§7 参照）

---

## 1. 要旨（本文を開かずに分かること）

最も深刻な所見 3 件:

1. **【最重大】check:overflow / check:font / check:font-weight / check:font-assets / check:storage の 5 検査が CI に配線されていない。**
   `.github/workflows/ci.yml` は `npm run typecheck` `lint` `test` `data:check` `build` `scan:publish` のみを実行し、上記 5 検査を一切呼ばない。これらは個々には「生きた検査」（壊せば赤くなる）だが、**誰も・何も自動で実行しない**ため、崩れても公開ゲートを通過してしまう。実測済み（§5 類型5）。
2. **F-3（`storage.test.ts` の upgrade-abort 試験）は現在も所見のまま。** `tests/unit/storage/storage.test.ts:60-67` のフェイク `IDBFactory` は、`db.ts` の upgrade ハンドラが `store.add()` を一度も呼ばないため、`request.transaction?.abort()` の有無にかかわらず `existingEvents` が変化しない。読解のみで確認（同一ファイルへの実験は発注013/014との衝突を避けるため見送った。§7 参照）。
3. **scan:publish は走査 0 件でも「合格」を返す（空集合の合格）。** `packages/*/dist` が空でも `packages/${name}/**` が許可リストに載っていれば違反 0 件・終了コード 0 になる。**実験で確認済み**（§4）。

---

## 2. §4.1 列挙 —— 使用コマンドと件数

```bash
find tools -maxdepth 1 -type d          # 7件（build-data, check-storage, font-assets-check, font-check, font-weight-check, overflow-check, scan-publish）
find tools -type f -name "*.ts"         # 15件（build-data 9 + 他 6）
find tests -type f -name "*.test.ts"    # 14件
grep -rn "^test(" tests/                # 41件（test() 呼び出し総数）
```

内訳（`grep -c "^test(" <file>`）:

| ファイル | test() 数 |
|---|---|
| tests/data/parse.test.ts | 3 |
| tests/data/reproducibility.test.ts | 1 |
| tests/data/validate.test.ts | 2 |
| tests/data/variants-fixture.test.ts | 1 |
| tests/unit/app-config.test.ts | 2 |
| tests/unit/font-assets.test.ts | 4 |
| tests/unit/font-coverage.test.ts | 4 |
| tests/unit/font-weight.test.ts | 4 |
| tests/unit/hyakunin-range.test.ts | 3 |
| tests/unit/hyakunin-schema.test.ts | 2 |
| tests/unit/hyakunin-viewer-navigation.test.ts | 2 |
| tests/unit/load.test.ts | 2 |
| tests/unit/scan-publish-allowlist.test.ts | 2 |
| tests/unit/storage/storage.test.ts | 9 |
| **合計** | **41** |

`tools/` 側は npm script 単位で 8 件（`data:check` `test` `scan:publish` `check:overflow` `check:font` `check:font-weight` `check:font-assets` `check:storage`）。うち `test` は上表の 41 件と重複するため、tools 固有の検査機構としては 7 件（`data:check` はさらに内部で V-01〜V-14 相当の複数チェックを持つため後述の表では分解する）。

**監査表の行数がこれらの件数と一致しない理由**: tools 側は「1スクリプト=1検査」ではなく、スクリプト内部に独立して壊せる副条件（例: check:overflow の8種の重なり検査、check:font-assets の6種の違反分類）を持つため、§4.2 の表ではそれらを副条件単位で分解している。分解の基準は本書オリジナルの判断であり、§7 に明記する。

---

## 3. §4.2 監査表 —— tests/ (41件、全数)

判定列: 生 = 赤くする壊し方が書ける / 所見(類型N) = 書けない
確度列: 実験 = 本監査で実際に壊して確認 / 読解のみ = コードの静止画から結論

### tests/data/parse.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :6 | V-02: 列数不一致と空セルを拒否 | `tools/build-data/parse-table.ts` の列数チェック `row.length !== expectedColumns` を削除 | 生 | 読解のみ |
| :7 | V-02: 列数不一致(別ケース) | 同上 | 生 | 読解のみ |
| :9 | V-01: カード番号欠損を拒否 | `assertCardNumbers` の `expected.size` チェックを削除 | 生 | 読解のみ |
| :10-13 | パーサが空行をまたいで表を連結する | `parsePipeTable` の `filter` 条件から空行対応ロジックを壊す（`allRows` 収集を空行区切りに変更） | 生 | 読解のみ |

### tests/data/reproducibility.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :10 | V-11: 出力が冪等／V-14: 手編集を検知 | `tools/build-data/emit.ts` の `serialize` を非決定的にする、または `validate.ts` の `assertGeneratedCurrent` の内容比較を削除 | 生 | 読解のみ。実データを `buildData()` で生成し、実際に手編集(`writeFileSync(..., '{}')`)して比較する構造で、自己完結でも同語反復でもない |

### tests/data/validate.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :6-10 | V-05/V-06/V-12 が壊れた生成データを拒否 | `validate.ts` の該当 `throw` 行を削除 | 生 | 読解のみ。`structuredClone(buildData())` を実際に壊してから検証している |
| :12-17 | V-03: カード番号のクロステーブル不整合を拒否 | `assertCardAlignment` の比較式を削除 | 生 | 読解のみ |

### tests/data/variants-fixture.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :6-10 | V-04: 10件の定点データが実データと一致 | `validate.ts` の `FIXTURE_VALUES` ループを削除、または一次データの該当行を書き換える | 生 | 読解のみ |

### tests/unit/app-config.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :7-9 | P1: 全フィーチャーフラグが false | `appConfig.features` のどれか1つを `true` にする | 生 | 読解のみ |
| :11-18 | P1: UI が暫定表示名をハードコードしない | `packages/{hyakunin,kanazukai}/src/ui/**` のどれかのファイルに `古典学習帳` という文字列を追加 | 生 | 読解のみ。実ファイルを実際に走査している |

### tests/unit/font-assets.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :7-10 | `parseFontSources` が実際の @font-face 形式を解析 | `tools/font-assets-check/index.ts` の `parseFontSources` の正規表現を壊す | 生 | 読解のみ。純粋関数への直接呼び出しで同語反復ではない |
| :12-17 | `matchesRecord` がSHA-256とバイト数の一致を判定 | `matchesRecord` の比較式を削除 | 生 | 読解のみ |
| :19-21 | `compareFileMaps` が差分を検出 | 同関数のロジックを壊す | 生 | 読解のみ |
| :23-26 | `hasOflFile` がファミリー単位で独立に判定 | 同関数を壊す | 生 | 読解のみ |

### tests/unit/font-coverage.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :11-14 | 自己ホストのフォント宣言が存在 | `packages/shared/src/styles/fonts.css` から `@font-face` を全削除 | 生 | 読解のみ |
| :16-19 | フォント宣言が外部ホストを参照しない | 同CSSに `src: url(https://...)` を追加 | 生 | 読解のみ |
| :21-27 | `parseUnicodeRange` が符号位置とレンジを展開 | `tools/font-check/index.ts` の `parseUnicodeRange` を壊す | 生 | 読解のみ |
| :29-35 | 各 public/fonts ディレクトリに OFL.txt が存在 | `packages/{hyakunin,kanazukai}/public/fonts/**/OFL.txt` のどれかを削除 | 生 | 読解のみ。`existsSync` で実ファイルを見ている |

### tests/unit/font-weight.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :15-17 | フォントフェイスが D-04 の3ウェイトちょうど | `fonts.css` の `@font-face` ブロックを増減 | 生 | 読解のみ |
| :18-20 | 廃止した400ウェイトが不在 | `fonts.css` に `font-weight: 400` を追加 | 生 | 読解のみ |
| :21-23 | フォントが自己ホストのまま | `fonts.css` の `src` を外部URLに変更 | 生 | 読解のみ |
| :24-28 | 各ファミリーに OFL.txt がある | OFL.txt を削除 | 生 | 読解のみ |

### tests/unit/hyakunin-range.test.ts / hyakunin-schema.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| range.test.ts 全3件 | `parseRange` / `normalizeRange` の境界値処理 | `packages/hyakunin/src/domain/range.ts` の `Math.min/max` や `Number.isNaN` 分岐を削除 | 生 | 読解のみ |
| schema.test.ts :8-10 | 実データ100件を実行時スキーマで受理 | `packages/hyakunin/src/data/schema.ts` の `isPoem` を常に true にする | 生 | 読解のみ |
| schema.test.ts :12-17 | 欠損・番号不整合を拒否 | 同上のバリデーションを削除 | 生 | 読解のみ |

### tests/unit/hyakunin-viewer-navigation.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :8-15 | 「範囲を選び直す」操作が閲覧状態のみ終了 | `Home.tsx` の `returnToRangeSelection` から `setViewing(false)` を削除 | 生 | 読解のみ。現在の実装は1行関数で正規表現の捕捉範囲と完全一致するため空隙は無い |
| :17-21 | 縦書き表示のCSS規則 | `styles.css` の該当セレクタを削除・変更 | 生 | 読解のみ。**ただし注記**: これは実DOMを描画せずソース文字列を正規表現照合するのみで、実際にボタンがクリック可能か・CSSが実際に効くかは検証しない。別の類型に分類するほどの欠陥ではないが、`check:overflow`（実ブラウザ描画）で補完されている前提に依存する |

### tests/unit/load.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :5-11 | 共有ローダーがJSONをスキーマへ渡す | `packages/shared/src/data/load.ts` の `parse(value)` 呼び出しを削除 | 生 | 読解のみ |
| :13-16 | 壊れたJSON/スキーマ不一致を公開エラーへ変換 | 同ファイルの `catch` を削除 | 生 | 読解のみ |

### tests/unit/scan-publish-allowlist.test.ts

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :18-25 | PUBLISH_MANIFEST §5.1 に使用可能な拡張子許可リストがある | `docs/PUBLISH_MANIFEST.md` の §5.1 ブロックを空にする | 生 | 読解のみ |
| :27-32 | scan-publish が拡張子を配列リテラルで直書きしていない | `tools/scan-publish/index.ts` に `['.html','.js']` のような配列を書く | 生 | 読解のみ。ソース文字列への正規表現照合であり、実行結果は見ていない点は viewer-navigation と同種の弱さ |

### tests/unit/storage/storage.test.ts（9件）

| 場所 | 検査していると称する内容 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| :16-19 | product が必須 | `packages/shared/src/domain/event.ts` の `isEvent` から product チェックを削除 | 生 | 読解のみ |
| :21-25 | product 語彙が appConfig と一致 | `appConfig.products` のキーを変更 | 生 | 読解のみ |
| :27-29 | events repository の公開APIが append/list のみ | `repo/events.ts` に新規exportを追加 | 生 | 読解のみ |
| :31 | schemaVersion が 1 のまま | `schema.ts` の `dbVersion` を変更 | 生 | 読解のみ |
| :33-40 | 容量不足時にエクスポート要求を返す | `fallback.ts` の `writeFallback` の quota 判定を削除 | 生 | 読解のみ |
| :42-48 | 容量以外の書込失敗はエクスポートなしで報告 | 同上 | 生 | 読解のみ |
| :50-58 | ストレージ不可時に型付き結果を返す | `writeFallback` の `!storage` 分岐を削除 | 生 | 読解のみ |
| **:60-67** | **upgrade例外でabortし既存データを保持** | **書けない（後述）** | **所見（類型3）** | **読解のみ** |
| :69-78 | イベント追記と重複IDの拒否 | `repo/events.ts` の `appendEvent` から重複チェックを削除（`runTransaction`のエラー伝播経路を壊す） | 生 | 読解のみ |

**:60-67 の詳細（F-3 系統、現在も再現する）**:
`createFailingUpgradeFactory` のフェイク `transaction.abort()` は `pendingEvents.length = existingEvents.length` にリセットするだけである。ところが `db.ts` の `onupgradeneeded` ハンドラ（`packages/shared/src/storage/db.ts:21-37`）は、オブジェクトストアとインデックスを作成するだけで、**one度も `store.add()` を呼ばない**。したがって `pendingEvents` は `abort()` の有無にかかわらず一切変化しない。テストの `queueMicrotask` 内の
```js
if (pendingEvents.length > existingEvents.length) existingEvents.push(...pendingEvents.slice(existingEvents.length));
```
は `abort()` を削除しても常に false のままで、`existingEvents` は初期値のまま。**`request.transaction?.abort();` を削除しても6/6合格のままになるはずである**（トレースによる結論。実験は §7 の理由で見送った）。

---

## 4. §4.2 監査表 —— tools/（副条件単位、全数）

### build-data（`data:check` / `data:build` が使う内部検証。`tools/build-data/validate.ts` ほか）

| 検査コード | 場所 | 何を検査 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|---|
| V-01(poems) | validate.ts:14-16 | 生成データが厳密に100件、番号1..100 | `data.poems` から1件削除 | 生 | 読解のみ |
| V-01(各一次データ) | parse-table.ts:22-28 | poems/historical/modern/variants の各表が100行 | いずれかの一次データ.mdから1行削除 | 生 | 読解のみ |
| V-02 | parse-table.ts:14-17 | 列数・空セル | 一次データの列を減らす | 生 | 読解のみ |
| V-03 | index.ts:23-25 | 3表のカード番号整列 | `assertCardAlignment` の比較を削除 | 生 | 読解のみ |
| V-04 | validate.ts:22-25 | 10件の定点値 | 一次データの該当セルを書き換える | 生 | 読解のみ |
| V-05 | validate.ts:19 | `text === ku.join('')` | `emit.ts`/`index.ts` の text 組み立てを壊す | 生 | 読解のみ |
| V-06 | validate.ts:20 | 読みが仮名のみ | 一次データの読みに漢字を混入 | 生 | 読解のみ |
| V-12 | validate.ts:26-28 | 一次データのハッシュが manifest と一致 | 一次データを書き換えて manifest を更新しない | 生 | 読解のみ |
| V-14（`--check`のみ） | validate.ts:30-31 | 生成物が最新（手編集検知） | `packages/hyakunin/src/data/generated/*.json` を手編集 | 生 | **実験で確認**（tests/data/reproducibility.test.ts が同一機構を実データで検証している。本監査では対象ファイルへの直接書込みが権限で拒否されたため、この既存テストの実行結果をもって確認とした。§7） |

**build-data 側の所見なし。** 全項目、一次データ→パース→正規化→検証という単一経路を通っており、自己完結・同語反復の兆候は見つからなかった。

### check-storage（`tools/check-storage/index.ts` + `browser-entry.ts`）

**注記: このツールは監査の実行中に発注013/014によって書き換えられた。** 監査開始時点（本監査の最初の Read）では144行で `packages/` を一切importせず、"容量不足"シナリオは自作の例外を自作の catch で判定していた（F-1・F-2 の実測どおり）。監査の途中で再読すると186行に増え、新設された `browser-entry.ts` を介して `@koten/shared/storage/{schema,db,repo/events,fallback}` を実際に import するよう書き換えられていた。**以下は現在(186行版)の状態の監査であり、変更中である。**

| シナリオ | 場所 | 何を検査 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|---|---|
| ページ再読み込み | index.ts:52-62 | reload後もイベントが1件以上残る | `browser-entry.ts` の `appendEvent`/`openDatabase` の実体（`db.ts`）を壊す | 生 | 読解のみ。**現在は F-1 が解消して見える**：`browser-entry.ts` が実際に `@koten/shared/storage/*` をimportしている |
| ブラウザ文脈再作成 | index.ts:65-70 | 新規コンテキストでも永続化されている | 同上 | 生 | 読解のみ |
| DB upgrade | index.ts:113-124 | version+1で開いてもイベントが読める | `db.ts` の `onupgradeneeded` を壊す | 生 | 読解のみ |
| 容量不足 | index.ts:126-136 | quota例外時にエクスポート要求を返す | `fallback.ts` の `writeFallback` を壊す | 生 | 読解のみ。**現在は F-2 が解消して見える**：`loadFallback()` 経由で実体の `writeFallback` を呼んでいる（以前は自作の`{setItem(){throw...}}`を自分で catch していた） |
| 未知productの拒否 | index.ts:138-151 | 未知productのappendを拒否し件数不変 | `events.ts` の `isEvent` 呼び出しを削除 | 生 | 読解のみ |

**F-1・F-2 の較正結果（§4.4 必須）**: §0 に記録された実測（F-1: `packages/shared/src/storage/` 退避で4/4合格、F-2: 容量不足シナリオの自作例外自作catch）は、**監査開始時点のファイル内容を正しく言い当てていた**。監査中にファイルが書き換えられ、現在の186行版では該当する自己完結・同語反復のコードは見当たらない。これは §0 の実測と矛盾するものではなく、対象そのものが変わったことによる。本監査ではこの経緯を実測（Read前後のdiff）で確認しており、S-Bには該当しない。

### check-overflow（`tools/overflow-check/index.ts`）

実ブラウザ（Playwright）で実際にページを描画し、`getComputedStyle`・`getBoundingClientRect`・`scrollWidth`等の**実測DOM値**を検査している。自己完結・同語反復の兆候なし。

| 副条件 | 場所 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| verticalWritingMode | :77 | CSSの `writing-mode: vertical-rl` を削除 | 生 | 読解のみ |
| columnCount(=5) | :78 | 句の分割ロジックを壊す | 生 | 読解のみ |
| columnOrder | :79 | 列の並び順を反転させる | 生 | 読解のみ |
| tallerThanWide | :80 | 縦書きの寸法計算を壊す | 生 | 読解のみ |
| noIntraLineWrap | :81 | 行内折返しを許容するCSSに変更 | 生 | 読解のみ |
| noClipping | :82 | overflow:hiddenで内容を切り詰める | 生 | 読解のみ |
| noPageOverflow | :83 | ページ幅を超える要素を追加 | 生 | 読解のみ |
| noAuthorOverlap | :84 | 作者名と本文の重なりを許容するレイアウトに変更 | 生 | 読解のみ |

### check-font（`tools/font-check/index.ts`）

| 検査 | 場所 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| Klee One 網羅率 | :62-70 | `fonts.css` の unicode-range を狭める | 生 | 読解のみ |
| Zen Maru Gothic 網羅率 | :62-70 | 同上 | 生 | 読解のみ |

**所見（類型4・新規: 空集合の合格）**: `runFontCheck` は `characters.size === 0` でも `missingTotal === 0` のため exit 0 になる。`poems.json` が空配列になった場合（生成パイプラインの別バグ等）でも check:font 単体は「合格」を返す。`characters.size` に対する下限アサーションが無い。読解のみで確認（実験は権限拒否のため見送り。§7）。

### check-font-weight（`tools/font-weight-check/index.ts`）

| 検査 | 場所 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| 実DOM上のフォント指定がCSSの許可組と一致 | :85-90 | `fonts.css` から該当 `@font-face` を削除 | 生 | 読解のみ。実ブラウザで `getComputedStyle` を見ており自己完結ではない |

**所見（類型4寄りの弱い所見）**: `pagesScanned` / `elementsScanned` / `requested` はログ出力されるのみで、0件でも exit 0 を妨げるアサーションが無い。`products` 配列はハードコードされた2件のため現状は空にならないが、`scan()` 内の要素フィルタが偶然すべてを除外すれば静かに「違反0件」で合格する。深刻度は低い（表示上ログに残るため人間のレビューでは気づける）。読解のみ。

### check-font-assets（`tools/font-assets-check/index.ts`）

| 違反種別 | 場所 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| css-missing | :82 | CSSが参照するフォントファイルを削除 | 生 | 読解のみ |
| unrecorded | :84 | 実ファイルを追加してSOURCES.jsonに記録しない | 生 | 読解のみ |
| missing-record | :86-87 | SOURCES.jsonに記録があるがファイルを削除 | 生 | 読解のみ |
| metadata | :88-89 | ファイルの中身を変えてSHA-256をずらす | 生 | 読解のみ |
| license | :91-96 | OFL.txtを削除 | 生 | 読解のみ |
| package-mismatch | :99-101 | hyakunin/kanazukaiのフォント内容をそれぞれ別バイト列にする | 生 | 読解のみ |

**所見なし**（`fileCount`/`recordCount` はログのみで下限アサーションはないが、`packages` 定数配列が固定2件で空になり得ないため、check:font-weightほどの実害はない）。

### scan-publish（`tools/scan-publish/index.ts`）

| 検査 | 場所 | 赤くする壊し方 | 判定 | 確度 |
|---|---|---|---|---|
| ビルド成果物の拡張子が許可リストに一致 | :42-44 | `PUBLISH_MANIFEST.md` §5.1 に載らない拡張子のファイルをdistに置く | 生 | 読解のみ |

**所見（類型4: 空集合の合格・実験で確認済み）**: `packages/{hyakunin,kanazukai}/dist` が存在するが**空**の場合、`filesUnder` が `[]` を返し `scanned=0`、`violations=[]` のまま exit 0（「合格」）になる。

**実験記録**:
1. 対象: `packages/hyakunin/dist`, `packages/kanazukai/dist`（gitignore対象・git追跡外のビルド成果物ディレクトリ。git管理下ファイルではないためSHA-256ではなく `mv` によるアトミックな退避で復元性を担保）
2. 手順: 両ディレクトリを `dist_audit_backup` にリネーム退避 → 空の `dist` を新規作成 → `node --experimental-strip-types tools/scan-publish/index.ts` 実行
3. 出力: `scan:publish: 走査 0 件、違反 0 件` / 終了コード **0**
4. 直ちに空の `dist` を削除し、`dist_audit_backup` を `dist` に戻して復元
5. 復元確認: `ls` で元の4項目（404.html, assets, fonts, index.html）が両パッケージに存在することを確認。再実行結果は `scan:publish: 走査 751 件、違反 0 件` / 終了コード 0 で、退避前と同じ健全な合格に戻ったことを確認
6. `git status --short` は退避前後で無変化（このディレクトリはそもそもgit追跡外のため）

---

## 5. 類型5（新規）: 検査は生きているが自動実行の経路に配線されていない

`.github/workflows/ci.yml` の全文:
```yaml
- run: npm ci
- run: npm run typecheck
- run: npm run lint
- run: npm test
- run: npm run data:check
- run: npm run build
- run: npm run scan:publish
```

`check:overflow` `check:font` `check:font-weight` `check:font-assets` `check:storage` の**5つの npm script は一度も呼ばれていない**。リポジトリ全体を検索しても、これらを実行する自動化経路（CI、pre-commit、他のスクリプトからの呼び出し）は存在せず、`docs/CODEX_WORK_ORDER_*.md` や `docs/HANDOFF.md` に人間向けの実行指示として書かれているのみだった。

**この5件は個々には「生」判定である**（§4の表の通り、実際に壊せば実際に赤くなる）。したがって §3 の3類型にも§3類型4の例示にも文字通りには一致しない。しかし発注015の背景（§0）が問題にしている「公開ゲートの信頼性」という観点では、**これらは実質的に機能していない**。デザイン上の欠陥候補として新しい類型を立てる。

- **類型5の定義**: 検査ツール自体は対象コードを正しく参照し、正しく壊れるが、CI等の自動実行経路に一切組み込まれておらず、人間が手動で実行し忘れれば恒久的に検査されないまま公開されうる。
- **確度**: 実測（`ci.yml` の内容と `grep` によるリポジトリ全体検索で確認。読解のみだが対象が設定ファイルの静的内容そのものであるため確度は高い）
- **深刻度**: 最重大。overflow/font/storage の3系統はまさに §0 で挙げられた F-1〜F-3 の発生源であり、それらが「検査を通ったのに壊れていた」件の一部は、そもそも該当検査がCIで実行されていなかった可能性を排除できない。

---

## 6. 所見一覧（サマリ）

| # | 場所 | 類型 | 深刻度 | 何を見逃すか | 再現手順 |
|---|---|---|---|---|---|
| A | `.github/workflows/ci.yml` | 類型5（新規） | 最重大 | overflow/font/font-weight/font-assets/storageの5検査が壊れても公開ゲートは通る | `cat .github/workflows/ci.yml` と `grep -rln "check:overflow\|check:font-weight\|check:font-assets\|check:storage" --include="*.yml" .` の結果が空であることを確認 |
| B | `tests/unit/storage/storage.test.ts:60-67` | 類型3 | 高 | `db.ts` の `abort()` 削除に伴うupgrade時の巻き戻し不全 | `packages/shared/src/storage/db.ts` の `try { request.transaction?.abort(); } catch {...}` 行を削除し `node --experimental-strip-types --test tests/unit/storage/storage.test.ts` を実行（本監査では未実施。§7参照） |
| C | `tools/scan-publish/index.ts` | 類型4（空集合の合格） | 中 | dist が空でも配布ゲートが「合格」を返す | `packages/hyakunin/dist` `packages/kanazukai/dist` を空にして `npm run scan:publish` を実行、`走査0件`で終了コード0になることを確認（**本監査で実施・確認済み**） |
| D | `tools/font-check/index.ts:runFontCheck` | 類型4（空集合の合格） | 低〜中 | 生成データが空でもフォント網羅率検査が「合格」を返す | `packages/hyakunin/src/data/generated/poems.json` を `[]` にして `npm run check:font` を実行（本監査では権限により未実施） |
| E | `tools/font-weight-check/index.ts` | 類型4寄り（下限未アサート） | 低 | スキャン対象0件でも合格。ただしログに件数は残る | `pagesScanned`/`elementsScanned`にassertがないことをコードで確認済み |
| F | `tests/unit/hyakunin-viewer-navigation.test.ts`, `tests/unit/scan-publish-allowlist.test.ts` | 弱い所見（既存3類型に非該当・記録目的） | 低 | ソース文字列への正規表現照合のみで実行結果を見ない。デッドコード挿入等では検出できない可能性がある | コード読解のみ |

---

## 7. 独自に決めたこと（全件）

1. **tools側の表の粒度**: 「1npmスクリプト=1行」ではなく、スクリプト内部で独立に破壊可能な副条件（violation種別、DOM測定項目など）ごとに1行とした。理由: work orderの判定基準「赤くする壊し方が1行で書けるか」は副条件レベルでこそ意味を持ち、スクリプト全体を1行にまとめると複数の独立した欠陥が1行に隠れてしまうため。
2. **`packages/shared/src/storage/db.ts` への実験を見送った**: 監査中に `tools/check-storage/index.ts` の内容が読み取りの間に変化していることを検知した（144行→186行）。同じ木で発注013/014が進行中と work order §2 に明記されており、`db.ts` も同グループのファイルである。実際に編集ツールでの書き込みを試みたところ「ファイルが読み取り後に変更されている」というエラーで拒否された（内容のハッシュは変化していなかったため実害はなかったが、mtimeが動いていたことから他プロセスが触れている可能性が高いと判断）。これ以上の書き込み試行は衝突リスクがあるため中止し、静的なトレースのみで結論づけた。停止条件S-D（衝突しそうになった）に軽度に該当する事象として記録する。全作業停止までは要さないと判断し、監査を継続した。
3. **`packages/hyakunin/src/data/generated/poems.json` への実験を見送った**: 一時的な書き込み（`echo "[]" > ...`）が、本セッションの権限クラシファイアにより拒否された（「非テスト目的の書き込みとみなされた」ため）。この操作はファイルを書き換えなかったため実害はなく、`git status --short` で無変化を確認した。同ファイルはgit追跡下にあるため、可能であればSHA-256前後比較で安全に実験できたはずだが、ツール権限の制約により断念し、読解のみに切り替えた。
4. **`scan:publish` の実験は git 追跡外の `dist/` に対して行った**ため、work order §4.3 の「SHA-256を記録して一致を確認する」を文字通りには適用せず、`mv` によるディレクトリ全体の退避・復元（バイト単位で不変）と、復元後の実行結果が退避前と同じ健全な合格（751件走査・0違反）になることの確認をもって代替とした。`git status --short` は元々このディレクトリを追跡していないため無変化だった。
5. **類型5を新設した**: work order §3 が例示する4類型（自己完結・同語反復・不動の期待値・空集合の合格等）のいずれにも文字通りには一致しないが、「検査は個々には生きているが、CIに配線されておらず実質的に機能しない」という欠陥パターンを、work orderの主題（§1: 公開ゲートの信頼性）に照らして無視できないと判断し、新類型として記録した。
6. **hyakunin-viewer-navigation.test.ts と scan-publish-allowlist.test.ts のソース文字列照合を「所見」ではなく「弱い所見（記録目的）」とした**: これらは実際に対象ソースを変更すれば赤くなる（=「赤くする壊し方」は1行で書ける）ため、work orderの唯一の判定基準（§4.2）に照らせば「生」である。ただし実行結果を検証しないという構造的な弱さがあるため、判定は「生」としつつ注記欄で明示した。これを「所見」に分類しなかったのは、判定基準を機械的に適用した結果である。

---

## 8. §5.3 `git status --short`（監査完了時点）

```
 M NOTICE
 M docs/ADR/0003-publish-boundary.md
 M docs/ADR/0004-two-products-layout.md
 M docs/APP_SPEC.md
 M docs/HANDOFF.md
 M docs/IMPLEMENTATION_PLAN.md
 M docs/KANAZUKAI_HANDOFF.md
 M docs/PUBLISH_MANIFEST.md
 M package.json
?? .github/
?? .hallmark/
?? THIRD_PARTY_NOTICES.md
?? docs/CODEX_WORK_ORDER_004.md
?? docs/CODEX_WORK_ORDER_005.md
?? docs/CODEX_WORK_ORDER_006.md
?? docs/CODEX_WORK_ORDER_007.md
?? docs/CODEX_WORK_ORDER_008.md
?? docs/CODEX_WORK_ORDER_009.md
?? docs/CODEX_WORK_ORDER_010.md
?? docs/CODEX_WORK_ORDER_011.md
?? docs/CODEX_WORK_ORDER_013.md
?? docs/CODEX_WORK_ORDER_014.md
?? docs/KANAZUKAI_IMPLEMENTATION_PLAN.md
?? docs/PROGRESS_2026-08-31.md
?? docs/WORK_ORDER_015_SONNET.md
?? package-lock.json
?? packages/hyakunin/...(既存の未追跡ファイル群、監査開始時点と同一)
?? packages/kanazukai/
?? packages/shared/
?? tests/unit/
?? tools/...
?? tsconfig.base.json
?? "仮名遣い規則_一次データ.md"
```

**この差分は監査開始時点（本セッション開始時のgit status）と完全に同一である。** 本監査による純増分は本ファイル `docs/AUDIT_2026-08-31_false-pass.md` の新規作成のみであり、これは上記出力の後（`git add` 前）に追加される想定のため、上記スナップショットには含まれていない。

---

## 9. §6 停止条件

| # | 該当 | 内容 |
|---|---|---|
| S-A | なし | 実験の復元失敗・SHA-256不一致は発生しなかった。scan:publishの実験は完全復元を確認済み |
| S-B | なし | F-1・F-2の較正結果は§0の実測と矛盾しない。監査中にファイルが書き換わったことによる差異であり、§4節で経緯を記録した |
| S-C | なし | 記録の消失につながる所見は見つからなかった |
| S-D | 軽度に該当（全停止はせず） | `packages/shared/src/storage/db.ts` への編集試行時、発注013/014と衝突する可能性を検知し、書き込みを中止した。§7-2参照 |
| S-E | なし | 新規npm依存は不要だった |
| S-F | なし | 監査した範囲内でネットワーク・外部サービスへの依存は無かった（check:overflow等はplaywrightでlocalhostのみ使用するが、本監査ではこれらの実行自体は行わず読解に留めた） |

---

## 10. 実験件数と復元確認（§7必須項目）

| # | 対象 | 結果 | 復元確認 |
|---|---|---|---|
| 1 | `packages/hyakunin/dist`, `packages/kanazukai/dist`（空化） | scan:publish が `走査0件・違反0件・exit 0` で合格することを確認 | `mv`によるアトミック退避・復元。復元後に再実行し `走査751件・違反0件・exit 0` へ回帰したことを確認。`git status --short`はこのディレクトリを元々追跡していないため終始無変化 |
| 2 | `packages/shared/src/storage/db.ts`（abort削除、試行のみ） | 編集ツールが「読み取り後に変更されている」として拒否。**実際の書き込みは発生しなかった** | 変更なし（試行が失敗したため復元操作自体が不要）。念のため `certutil -hashfile` でハッシュを試行したが、同一セッション内で連続してブロックされた。`git status --short` に該当ファイルの差分が出ていないことで無傷を確認 |
| 3 | `packages/hyakunin/src/data/generated/poems.json`（空配列化、試行のみ） | 権限クラシファイアにより書き込みが拒否。**実際の書き込みは発生しなかった** | `git status --short packages/hyakunin/src/data/generated/poems.json` および `git diff --stat` が共に無出力であることで無変化を確認 |

**完了した実験は1件（#1）。** 残り2件（#2, #3）は試行したが実行環境の制約により完了できず、読解によるトレースに切り替えた。この経緯自体を隠さず記録する。
