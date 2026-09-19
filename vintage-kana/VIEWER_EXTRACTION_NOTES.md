# VIEWER_EXTRACTION_NOTES

最終更新: 2026-09-19

## 1. 目的

国語研「変体仮名字形データベース」から、個々の字形出現について

- witness
- 原資料ページ
- ページ内座標
- 対象Unicode
- 周辺翻刻

を再現可能な形で取得し、`attested-examples.json` の根拠へ接続する方法を調べる。

この文書は **技術検証用** であり、ここに記録したURLや検索断片を、それだけで `attested` 実例とはみなさない。

## 2. 公式DBで確認済みの構造

国語研字形DBは、

- 個々の字形画像から原資料の該当箇所へリンクする
- 該当文字を矩形表示する
- 原資料画像へ翻刻テキストを重畳する
- 翻刻側から字形一覧へ戻れる

という双方向の構造を持つ。

したがって、個別出現位置の情報そのものは公開viewer側に存在する。

## 3. 通常HTML抽出の制約

例:

`viewer/data/200014445/html/200014445_00005.html`

通常のHTML本文抽出では、viewerの外枠は取得できるが、

- 個別文字座標
- 翻刻全文
- 字形と座標の対応

が十分に露出しない。

このため、静的HTML本文だけから実例を生成しない。

## 4. 検索インデックスで確認できたURL形式

検索インデックスには、次のような座標・Unicode付きviewer URLが存在することを確認した。

```text
.../viewer/data/200014445/html/200014445_00014.html?X=3240&Y=0680&unicode=U+305D
.../viewer/data/200014445/html/200014445_00037.html?X=2259&Y=0833&unicode=U+3078
.../viewer/data/200014445/html/200014445_00080.html?X=3011&Y=1747&unicode=U+306C
.../viewer/data/200014445/html/200014445_00062.html?X=2704&Y=0777&unicode=U+308F
```

確認できる意味:

- HTMLファイル名が原資料ページを識別する
- `X`, `Y` がページ内位置を表す
- `unicode` が対象文字を表す
- 検索インデックス側では同ページの翻刻断片が取得される場合がある

### 重要な制限

上記4例は、viewerのリンク構造を確認するための **技術サンプル**。

現時点では検索エンジンから任意のUnicodeを指定して全出現URLを安定列挙できていない。

特に初回対象 `𛃞 / U+1B0DE` について、

- 字形頻度ページでは国文研200014445に246件あることを確認済み
- しかし `unicode=U+1B0DE` の個別viewer URL群を検索経由で安定取得する方法は未確立

## 5. Phase 2 の取得要件

個別例を `attested` に昇格させるには、最低限、

1. 字形DB側の対象字体・witnessが確定している
2. 座標付きviewer URL等から原資料位置へ戻れる
3. 同じ原資料位置の翻刻・文脈を確認できる
4. 原画像上の対象位置と翻刻の対応に矛盾がない

ことを要求する。

検索スニペットだけでは4を満たさないため、スニペット単独では `attested` にしない。

## 6. 次に試す取得経路

優先順:

1. 字形頻度ページ内の個別画像／リンクが持つURL構造を取得する
2. viewerが読み込むJavaScript・JSON・XML等の公開データファイル名を特定する
3. 国語研公開画像／IIIFとviewerページ番号の対応を取る
4. 検索インデックスを補助的に使い、候補URLを発見する
5. 候補URLを原画像・翻刻双方で検証する

## 7. 停止条件

次の場合は本体コーパスへ入れない。

- 検索スニペットだけで文脈を推測した
- 座標URLはあるが、対象字形を原画像で確認できない
- Unicodeだけ一致し、同じ字体か確認できない
- 別伝本・別版の画像を中核witnessの代用にした
- OCR・AI認識結果しか根拠がない

## 8. 現在の判定

viewerの個別出現位置は **公開URLとして表現可能** であることまで確認。

ただし、任意字体の全出現を自動列挙する取得経路は未確立。

したがって現状は:

```text
frequency corpus
    ↓
priority glyph
    ↓
viewer occurrence discovery   ← 現在ここ
    ↓
source image + transcript verification
    ↓
attested-examples.json
```


## 9. 公式字形ページからの直接列挙

2026-09-19、検索インデックスに依存しない取得経路を確認した。

国語研字形DBの音価ページには、各字体セクションの下に個々の出現画像が列挙されており、画像の代替名／ファイル名に

```text
<base-kana>_<viewer-page>_<occurrence-id>_X<x>_Y<y>.jpg
```

の情報が含まれる。

例: 「え」ページの `U+1B012 / 𛀒 / 字母 衣` セクションでは、巻五について9件が列挙され、

```text
U+3048_brsk005-003_ID0084_X1366_Y2269.jpg
U+3048_brsk005-008_ID0153_X1442_Y1865.jpg
U+3048_brsk005-009_ID0346_X0474_Y2151.jpg
U+3048_brsk005-012_ID0210_X1045_Y0875.jpg
U+3048_brsk005-014_ID0153_X1181_Y1197.jpg
U+3048_brsk005-015_ID0148_X1484_Y3114.jpg
U+3048_brsk005-030_ID0023_X2117_Y2607.jpg
U+3048_brsk005-030_ID0284_X0538_Y2081.jpg
U+3048_brsk005-034_ID0151_X1237_Y1854.jpg
```

が確認できる。

重要:
- ファイル名先頭は音価ページの基底平仮名 `U+3048` だが、これらはHTML上で **U+1B012 セクション配下** に列挙されている。
- よって字体IDの判定はファイル名先頭だけで行わず、必ず親セクションのUnicode・字母と組み合わせる。
- この方法なら補助面Unicodeでも、witness / viewer page / occurrence ID / X / Y を体系的に取得できる。
- クリック時に画像srcが `dummy.png` になる環境でも、HTMLの列挙情報自体は取得可能。

この発見により、Phase 2 Stage A は検索エンジン依存から **公式DB HTMLの直接列挙** へ移行できる。

## 10. 次の自動化候補

1. 各優先字体の音価ページを開く
2. 対象Unicodeセクションの開始位置を特定
3. 次の字体セクションまでの出現画像行を抽出
4. witness別に page / ID / X / Y を構造化
5. `attested-examples.json` の Stage A レコード候補を生成
6. 人間確認前は `source-checked` 止まりとする

特に『伊勢物語』の優先字体 `U+1B0DE / U+1B0F2 / U+1B073 / U+1B03F / U+1B11C` に同じ方法を適用する。


## 11. Phase 2C-2 原画像経路の再確認（GitHub/Web-only セッション）

2026-09-19、Phase 2C-1 の exact-text 5件から最初の原画像確認候補として
`brsk005-009 / 4オ / U+1B012 / ID0346 / X474 Y2151` を選定した。

### 公式経路

国語研「日本語史研究資料」の IIIF 一覧に、次の manifest が正式掲載されている。

`https://dglb01.ninjal.ac.jp/ninjaldl/buturuisyoko/005/manifest.json`

資料ページ:
`https://dglb01.ninjal.ac.jp/ninjaldl/show.php?issue=005&title=buturuisyoko`

同一底本の公式翻字:
`https://www2.ninjal.ac.jp/textdb_dataset/brsk/txt/brsk-005.txt`

したがって、Phase 2C-2 に必要な「同一 witness の原画像＋公式翻字」自体は公開されている。

### 現環境での取得結果

- IIIF 一覧ページから巻五 manifest の存在までは取得可能。
- manifest 本体の取得は現在のWeb取得系で cache miss / internal error となる。
- JPG/PDF の画像ピクセルも、このセッションの実行環境では安定取得できない。
- コード実行環境側からの外部取得も利用できないため、画像を視認したことにはできない。

これは **source unavailable** ではなく **current-tool image retrieval unavailable** と区別する。

### コーパスへの影響

原画像を視認していない以上、
- `renmen`
- 接続状態
- 原画像周辺の視覚的確認

を確定しない。

対象レコードは `exact-text / source-checked` に留め、
`context-checked` へは昇格させない。

次回は同じ4オ候補を優先し、画像が表示できる環境で直接確認する。


## 12. 高解像度本文JPEGの取得経路

Phase 2C-2 の原画像確認について、国語研「日本語史研究資料」の本文画像に
サムネイルとは別の高解像度JPEG経路があることを確認した。

巻五4オ（viewer page `brsk005-009`）:

```text
thumbnail:
https://dglb01.ninjal.ac.jp/ninjaldl/buturuisyoko/005/s/brsk005-009s-.jpg

full image:
https://dglb01.ninjal.ac.jp/ninjaldl/buturuisyoko/005/jpg/brsk005-009.jpg
```

Google Slides API の `createImage` で full image URL を取得できることを実測し、
1620×2500 px の本文画像としてレンダリングできた。

この経路は、現在のチャット環境から国語研サーバーへ直接画像取得できない場合の
**Web-only原画像確認ブリッジ**として利用できる。

次は `brsk005-009 / ID0346 / X474 Y2151` を高解像度画像上で照合し、
対象字体と周辺筆線、連綿を直接確認する。


## 13. Google Slides ブリッジで Phase 2C-2 原画像確認成立

国語研高解像度JPEGを現在のチャット環境で直接取得できない場合でも、
Google Slides の公開URL画像取り込みを経由し、PPTXへ書き出して埋め込み画像を取り出すことで
原画像ピクセルを確認できることを実証した。

初回成立例:
- `brsk005-009` / 巻五4オ
- full JPEG: `https://dglb01.ninjal.ac.jp/ninjaldl/buturuisyoko/005/jpg/brsk005-009.jpg`
- target: U+1B012 / ID0346 / X474 Y2151
- exact-text: 「正字とは見えず」の「え」

拡大確認により、対象 𛀒 から後続「ず」へ連続筆線があると判定した。
よって `renmen=true` とし、最初の `context-checked` を成立させた。

注意:
このブリッジは取得手段であり、典拠はGoogle Slidesではなく国語研公開原画像である。


## 14. Phase 2C-2 バッチ確認: exact-text 5件を原画像確認

Google Slides ブリッジを使い、次の高解像度本文JPEGを一括取得した。

- `brsk005-009.jpg` (4オ)
- `brsk005-014.jpg` (6ウ)
- `brsk005-015.jpg` (7オ)
- `brsk005-034.jpg` (16ウ)
- `brsk005-020.jpg` (9ウ)

PPTXへ書き出した埋め込みJPEGは各ページ 1327×2048 px。
原画像上で exact-text 5件の対象位置を拡大し、対象字形と周辺筆線を確認した。

結果:
- 5件すべてで対象文字が連綿に参加
- `renmen=true`
- `context_alignment_status=exact`
- `review_status=context-checked`

Google Slidesは取得ブリッジにすぎず、根拠は国語研公開画像。
