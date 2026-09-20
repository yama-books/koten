# NINJAL全字形監査タスク — ClaudeCode分担

日付: 2026-09-20
repository: yama-books/koten
作業ブランチ: `vintage-kana-ninjal-audit`
基点: `80365000b7d3a8cdb34b52fd7a14618312a3b17e`

## 目的

変体仮名メーカーで、国立国語研究所「学術情報交換用変体仮名」の公開一覧に含まれる字形を漏れなく管理できる正本カタログを作り、現行UI用データの欠落・誤分類・重複を全件監査する。

## 最重要ルール

- `vintage-kana-main` には直接pushしない。
- このブランチ `vintage-kana-ninjal-audit` だけで作業する。
- force-pushしない。
- 他ブランチを削除しない。
- 今回は **`vintage-kana/index.html` を編集しない**。UI統合は別担当が行う。
- 現行 `data/ui-glyph-master.json` をいきなり「全件表」に手編集しない。
- 現行 `ui-glyph-master.json` は
  `status: derived-ui-cache-from-phase1`
  で、初期15資料の実出現分布から作った138字の派生キャッシュ。正本は `glyph-distribution*.json` と明記されている。
- 「実資料で観測された字体」と「NINJAL公式カタログに存在する字体」を混同しない。

## 一次資料

必ず以下を優先する。

1. 国立国語研究所「学術情報交換用変体仮名」一覧
   - https://cid.ninjal.ac.jp/kana/list/
2. 凡例
   - https://cid.ninjal.ac.jp/kana/usage/
3. リポジトリ
   - `vintage-kana/SOURCES.md`
   - `vintage-kana/DATA_MODEL.md`
   - `vintage-kana/data/ui-glyph-master.json`
   - `vintage-kana/data/glyph-distribution-index.json`
   - `vintage-kana/data/glyph-distribution*.json`

`SOURCES.md` には、学術情報交換用セットが47音価・215字母・264字体と記録されている。
ただし、現在の公式一覧ページを実際に取得して、現時点の掲載行数・Unicodeあり/なし件数を改めて数えること。既存文書の数字だけを盲信しない。

## 必須監査

### 1. 公式一覧の全件取得

公式一覧の各行について少なくとも次を保存する。

- `ninjal_id` — 例: `470050020`
- `kana`
- `jibo`
- `unicode` — 例: `U+1B11C`、未付与なら null
- `character` — Unicode文字、未付与なら null
- `mj_glyph_name` — 未記載なら null
- `notes`
- `source_url`
- `renderability` — 少なくとも `unicode-text` / `non-unicode` を区別

推奨出力:
`vintage-kana/data/ninjal-glyph-catalog.json`

このファイルは「公式カタログ」であり、実資料の出現頻度は混ぜない。

### 2. 現行138字との全件突合

`ui-glyph-master.json` と公式カタログを比較し、以下を分類する。

- exact match
- official but missing from current UI cache
- kana mismatch
- jibo mismatch
- Unicode / character mismatch
- current cache only
- duplicate Unicode / duplicate character
- 同一字母複数字形
- 備考に「別の仮名としても使われる」とあるもの

監査結果を
`vintage-kana/NINJAL_GLYPH_AUDIT_2026-09-20.md`
へ記録する。

### 3. 「せ / を」重点監査

ユーザー実機確認で「せ」と「を」に同じ字形が見えるとの指摘があった。

公式一次資料上、
- `U+1B11C` = `𛄜`
- 平仮名 = `を`
- 字母 = `遠`

であることを再確認する。

現行 `ui-glyph-master.json` も現在は `U+1B11C / を / 遠` になっているため、
同じ字が見える原因が
- データ割当
- fallbackデータ
- Unicode文字列
- Webフォント
- font fallback
- レンダリング
のどこにあるかを切り分ける。

「せ」側の公式Unicode群と `U+1B11C` が混同されていないことを機械検査する。

ただし今回は `index.html` を直さず、原因と必要修正案を監査文書へ書く。

### 4. Unicode未付与字形

公式一覧にはUnicode欄が空の行が存在する。
これらを「存在しない」として捨てない。

以下を調査する。
- 公式ページでどのように字形画像が提示されているか
- MJ文字図形名の有無
- 公開アプリへ収録する際のライセンス / 再配布条件
- ローカル画像資産化が可能か
- Unicode文字として表示できない場合の安全なUI表現

**ライセンスが明確になるまで画像を無断取得・再配布しない。**

監査文書に
- そのままUnicodeフォント表示できる群
- 画像等の別表示手段が必要な群
を分けて記録する。

### 5. 生成経路

可能なら取得・突合を再実行できるスクリプトを追加する。
手作業コピペだけで264字体級を維持しない。

ただしサイト規約・robots・アクセス負荷に配慮し、取得が不適切なら
保存した一次資料由来の監査表を使う方式へ切り替える。

## UI統合へ渡すべき結論

監査終了時、次を明記する。

1. 公式掲載総行数
2. Unicodeあり件数
3. Unicodeなし件数
4. 現行138字との一致件数
5. 未収録件数
6. 誤分類・不一致件数
7. `U+1B11C` の監査結果
8. 公式カタログをUIへ統合する推奨方式

重要:
全公式カタログをそのまま現行 `GLYPHS` に置換すると、
「書いてみる」の自動選択が、実資料で観測された138字から公式全字形へ一気に広がる可能性がある。
したがって統合案では
- full official catalog
- observed corpus subset / frequency
を分離すること。

例:
- 一覧 / 手動選択 / 学習: full official catalog を利用可能
- おまかせ自動生成: observed corpus subsetを維持
など、既存挙動を壊さない設計を提案する。

## テスト

少なくとも次の自動検査を用意する。

- NINJAL ID重複なし
- primary Unicode重複の意図しない発生なし
- Unicode文字とcode pointの一致
- `U+1B11C === 𛄜 / を / 遠`
- 公式カタログ全行が差分分類のどれかに必ず入る
- nullableなUnicodeを不正に文字化しない

## 完了条件

- 公式カタログJSON
- 全件監査Markdown
- 必要なら再現スクリプト / テスト
- CIを壊さない
- コミット・push
- 最後にコミットSHAと、UI担当が次に行うべき統合手順をHANDOFFまたは監査文書末尾へ記載

UI実装や `vintage-kana-main` へのマージは行わず、ここで停止する。
