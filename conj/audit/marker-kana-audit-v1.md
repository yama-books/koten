# marker / historical-kana display audit v1

総件数: 910

## 構造的な注記（個別行ではなくスキーマ全体の欠落）

- 動詞360例: 322/360 が漢字lemmaかつ targetReading・kanjiAidフィールドを一切持たない（動詞カテゴリにはそもそも読み仮名フィールドが存在しない）。「変る→かはる」型の歴史的仮名遣い懸念は動詞カテゴリ全体で機械的に検出できない。人間による個別レビューが必要。
- 助動詞290例: 290/290 が targetReading 未設定。ただしlemmaがすでに平仮名（ず・り・けり等）のため、表示上の懸念は低いと推定（要人間確認）。

## 全体サマリ

| status | 件数 |
|---|---|
| PASS | 772 |
| REVIEW_MARKER | 21 |
| REVIEW_KANA | 110 |
| REVIEW_BOTH | 7 |
| DATA_ERROR | 0 |

## 品詞別サマリ

| 品詞 | PASS | REVIEW_MARKER | REVIEW_KANA | REVIEW_BOTH | DATA_ERROR |
|---|---|---|---|---|---|
| 動詞 | 344 | 16 | 0 | 0 | 0 |
| 形容詞 | 36 | 4 | 93 | 7 | 0 |
| 形容動詞 | 102 | 1 | 17 | 0 | 0 |
| 助動詞 | 290 | 0 | 0 | 0 | 0 |

## 代表的疑義 (最大20件)

- `verb-040` [REVIEW_MARKER] 動詞/養ふ/未然形 target=`やしなは` reason=target-length-outlier(len=4,group-median=2.0)
- `verb-057` [REVIEW_MARKER] 動詞/御覧ず/未然形 target=`御覧ぜ` reason=target-length-outlier(len=3,group-median=1)
- `verb-059` [REVIEW_MARKER] 動詞/立ち去る/未然形 target=`立ち去ら` reason=target-length-outlier(len=4,group-median=2.0)
- `verb-121` [REVIEW_MARKER] 動詞/恨む/終止形 target=`うらむ` reason=target-ends-with-suspect-trailing(らむ)
- `verb-147` [REVIEW_MARKER] 動詞/恨む/終止形 target=`うらむ` reason=target-ends-with-suspect-trailing(らむ)
- `verb-159` [REVIEW_MARKER] 動詞/おはす/終止形 target=`おはす` reason=target-length-outlier(len=3,group-median=1)
- `verb-171` [REVIEW_MARKER] 動詞/奉る/終止形 target=`たてまつる` reason=target-length-outlier(len=5,group-median=2)
- `verb-173` [REVIEW_MARKER] 動詞/復ち返り鳴く/終止形 target=`をちかへりなく` reason=target-length-outlier(len=7,group-median=2.5)
- `verb-178` [REVIEW_MARKER] 動詞/雲隠れ行く/終止形 target=`雲かくれゆく` reason=target-length-outlier(len=6,group-median=2.5)
- `verb-199` [REVIEW_MARKER] 動詞/窺う/連体形 target=`うかがふ` reason=target-length-outlier(len=4,group-median=2)
- `verb-217` [REVIEW_MARKER] 動詞/付け試みる/連体形 target=`つけ試みる` reason=target-length-outlier(len=5,group-median=3)
- `verb-234` [REVIEW_MARKER] 動詞/患う/連体形 target=`わづらふ` reason=target-length-outlier(len=4,group-median=2)
- `verb-244` [REVIEW_MARKER] 動詞/傾く/已然形 target=`かたぶけ` reason=target-length-outlier(len=4,group-median=2.0)
- `verb-252` [REVIEW_MARKER] 動詞/思し焦がる/已然形 target=`思しこがるれ` reason=target-length-outlier(len=6,group-median=4)
- `verb-298` [REVIEW_MARKER] 動詞/振り放け見る/已然形 target=`ふりさけみれ` reason=target-length-outlier(len=6,group-median=3.0)
- `verb-317` [REVIEW_MARKER] 動詞/大殿籠る/命令形 target=`大殿籠れ` reason=target-length-outlier(len=4,group-median=2.0)
- `adj-001` [REVIEW_KANA] 形容詞/無し/連用形 target=`なく` reason=kanji-lemma-not-covered-by-lexical-annotation-pass
- `adj-002` [REVIEW_KANA] 形容詞/多し/連用形 target=`おほく` reason=kanji-lemma-not-covered-by-lexical-annotation-pass
- `adj-004` [REVIEW_KANA] 形容詞/別れ難し/連用形 target=`別れがたく` reason=kanji-lemma-not-covered-by-lexical-annotation-pass
- `adj-005` [REVIEW_KANA] 形容詞/遅し/連用形 target=`をそく` reason=kanji-lemma-not-covered-by-lexical-annotation-pass

(疑義合計 138 件のうち先頭20件を表示。全件は marker-kana-audit-v1.csv を参照)
