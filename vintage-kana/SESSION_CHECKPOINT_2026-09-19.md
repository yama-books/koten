# SESSION_CHECKPOINT_2026-09-19

この文書は、会話上限到達時点の `vintage-kana` の正確な引継ぎ状態を固定するためのチェックポイントである。

## 1. 現在の到達点

国立国語研究所「変体仮名字形データベース」を基礎として、学術情報交換用変体仮名の中核47音価
（「あ」から「を」まで。「ん」は補遺扱い）の資料別分布収集は一巡済み。

### 中核47音価
- 音価: 47 / 47 完了
- witness: 15資料単位
- 非ゼロ分布レコード: 2,046
- 生データ status: `phase1-core-47-complete`

### 補遺「ん」
- 中核47音価とは分離
- 15資料分の非ゼロレコードを補遺JSONへ保存
- 補遺を含む非ゼロ分布総数: 2,061

## 2. 生成済みデータ

### 生データ
- `data/glyph-distribution.json`
- `data/glyph-distribution-part2.json`
- `data/glyph-distribution-index.json`
- `data/glyph-distribution-supplemental.json`

ファイル分割は容量対策であり、歴史的・言語学的な区分を意味しない。

### 派生データ
- `data/glyph-distribution-derived-part1.json`
- `data/glyph-distribution-derived-part2.json`
- `data/glyph-distribution-derived-supplemental.json`

47音価本体について:
- 観察された `kana × glyph × diacritic` 組合せ: 250
- 15資料との直積: 3,750セル
- 原DBに明示された非ゼロセル: 2,046
- ページ省略から0と推定したセル: 1,704

0推定セルには:
`count_status: inferred-zero-from-omission`
を付与。

### 比率
2種類を生成済み。

1. `share_within_kana_all_forms`
   - 同一資料・同一仮名の全字形・全付加記号を分母とする。
2. `share_within_kana_same_diacritic`
   - 同一資料・同一仮名・同一付加記号区分だけを分母とする。

詳細規則は `AGGREGATION_RULES.md` を参照。

重要:
これらの比率は「歴史的正しさの確率」ではない。
資料内分布の観察値であり、教材で「正解確率」として扱わない。

## 3. 検算済み

派生処理について:
- 比率範囲外: 0件
- all-forms 比率は各資料×仮名群で合計1（丸め誤差内）
- same-diacritic 比率も分母が正の群で合計1（丸め誤差内）
- 8桁丸め後の最大合計誤差: 0.00000002

算術的一貫性は確認済み。

## 4. データモデル上の重要決定

### 濁点・半濁点
同一基底字形でも、
- none
- dakuten
- handakuten
を別属性で保持する。

国語研DBには、変体仮名字形そのものの濁点付き・半濁点付き実例が存在するため、無印と合算しない。

### work / witness
同一作品でも異本・版・巻を合算しない。
`work` と `witness` を分ける。

### 観察事実と一般規則
「この資料で多い」と「この時代で正しい」を同一視しない。

## 5. 「ん」の扱い

国語研の学術情報交換用変体仮名セットは中核を47音価として整理しており、
「ん」は別扱いとする。

このプロジェクトでは:
- 中核コーパス: 47音価
- `ん`: supplemental

とする。

現代文の「書いてみる」機能では必要になるため、データ自体は保持する。

## 6. まだ未完了の作業

### 優先1: 15資料の書誌情報確定
`data/sources.json` の以下が未確定または要監査:
- 年代
- ジャンル
- 媒体
- 所蔵
- 画像利用条件
- 必要に応じた版・刊行・写本情報

### 優先2: 実文脈採取
分布差が大きい字体から優先して原資料へ戻り、
- 実際の語
- 語内位置
- 文節位置
- 文法的役割
- 前後文字
- 連綿
- 原画像位置
を記録する。

保存先:
`data/attested-examples.json`

### 優先3: 先行研究との照合
特に:
- 『春色梅児与美』
- 『浮世風呂』
- 黄表紙・洒落本
- 仮名字体の語位置・連綿・使い分け研究

を分布観察と照合する。

### 優先4: 教材化
実文脈採取後に:
- 字母クイズ
- 字体クイズ
- attested短語
- attested短句
- 原画像読解
へ進む。

## 7. 今はやらないこと

- 分布比率だけから「おすすめ字体」を決める
- 作品を跨いで「歴史的標準字体」を作る
- ランダム変換を歴史再現と呼ぶ
- AI創作文を実在用例として出す
- 未確認の語用例を教材化する

## 8. 次セッションの開始手順

1. `DESIGN_HISTORY.md` を読む
2. `HANDOFF.md` を読む
3. この `SESSION_CHECKPOINT_2026-09-19.md` を読む
4. `AGGREGATION_RULES.md` を読む
5. `data/glyph-distribution-index.json` を入口に分布データを確認
6. 次の実作業は `sources.json` の書誌確定から開始

## 9. 現行公開アプリ

https://yama-books.github.io/koten/vintage-kana/

現行公開版はまだ資料収集前の最小UI試作。
分布コーパスはアプリUIへ未接続。
実資料読解も未開放。

## 10. 正本の優先順位

1. `DESIGN_HISTORY.md` — 設計思想と経緯
2. `HANDOFF.md` — 現在の運用状態
3. 本チェックポイント — 会話終了時点の確定状態
4. `AGGREGATION_RULES.md` — 派生集計規則
5. `SOURCES.md` — 典拠
6. `RESEARCH_LOG_2026-09-18.md` — 作業履歴

研究ログには途中経過の古い「未完了」記述も残っている。
次の担当者は、**現在状態の判断には本チェックポイントとHANDOFFを優先すること。**
