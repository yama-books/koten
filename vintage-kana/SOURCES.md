# SOURCES — vintage-kana

最終更新: 2026-09-18

## 1. 字体・字母の基準資料

### 国立国語研究所「学術情報交換用変体仮名」

- 一覧: https://cid.ninjal.ac.jp/kana/list/
- 凡例: https://cid.ninjal.ac.jp/kana/usage/

役割:
- 対応する現行仮名
- 字母
- Unicode
- MJ文字図形名
- 備考
- 同字母異体の整理

確認できる例:
- 𛀂: 対応する仮名「あ」、字母「安」
- 𛀅: 対応する仮名「あ」、字母「惡」。備考に「『を』の仮名としても使われる」
- 𛀢: 「か」、字母「家」。備考に「『け』の仮名としても使われる」

注意:
- 字体・字母の基準として用いる。
- 一覧だけから「どの語・位置で、どの字体が自然だったか」を推定しない。
- Unicode番号は内部識別には有用だが学習UIでは通常表示しない。

## 2. 実例コーパス

### 国立国語研究所「変体仮名字形データベース」

- https://cid.ninjal.ac.jp/hentaiganaDB/

役割:
- 実資料中の変体仮名字形
- 作品・資料単位での出現傾向
- 原資料上の用例へ遡るための中核資料

### CODH「日本古典籍くずし字データセット」

- トップ: https://codh.rois.ac.jp/char-shape/
- 書名一覧: https://codh.rois.ac.jp/char-shape/book/
- 検索: https://codh.rois.ac.jp/char-shape/search/
- DOI: 10.20676/00000340

2019年11月時点の公開情報:
- 古典籍44点
- 6,151コマ
- 4,328文字種
- 1,086,326文字

重要な注意:
- 変体仮名はデータ上では変体仮名専用Unicodeではなく、統合した現代仮名のUnicodeを用いている。
- したがって字母・字体確定では、切り抜き字形画像・原本画像・国語研字形DB等と照合する。
- 主に江戸時代の古典籍を対象とし、テーマ・資料に偏りがある。
- 頻度を日本語史全体の一般頻度とみなさない。

ライセンス:
- CC BY-SA 4.0
- 公開物で利用する際は出典とライセンスを確認し、可能な限り DOI を併記する。

## 3. 字体選択・用字傾向の研究

### J-STAGE掲載論文・解説

入口:
https://www.jstage.jst.go.jp/article/johokanri/58/6/58_438/_html/-char/ja

研究上の観点:
- 特定の語と字体の結びつき
- 語頭 / 語中・語尾
- 助詞
- 同音節が隣接したときの字体選択
- 音価との関係
- 前後文字との関係
- 連綿

扱い:
- すべての時代・資料に通用する規則として実装しない。
- 論文が対象とした資料・時代・集団を記録する。
- 個別資料の観察結果と一般論を分ける。

### 国語研研究成果・リポジトリ

- https://repository.ninjal.ac.jp/
- https://www.ninjal.ac.jp/research/

目的:
- 字体選択の要因を実資料と研究成果の双方から確認
- 単語・文節・字体・連綿・版面等の相関を把握

## 4. evidence_type

- `master_list`
- `attested_glyph`
- `attested_context`
- `distribution`
- `scholarship`
- `editorial`

`scholarship` と `editorial` を混同しない。
