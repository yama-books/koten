# SESSION_CHECKPOINT_2026-09-19_CONTEXT1

作成: 2026-09-19
状態: Phase 2C-2 / context-checked 1件達成
運用: Work資源枯渇中のためローカル非接触。GitHub `yama-books/koten` と公開Web資料で進行。

## 1. 節目

最初の `context-checked` を成立させた。

対象:
- example_id: `att-brsk005-u1b012-brsk005-009-id0346-x0474-y2151`
- 資料: 『諸国方言物類称呼』巻五
- 丁: 4オ
- glyph: U+1B012 / 𛀒
- kana: え
- jibo: 衣
- occurrence: ID0346
- X=474 / Y=2151
- transcription: 「正字とは見えず」
- word: 「見えず」
- previous_char: 見
- next_char: ず

## 2. 確認内容

Phase 2C-1 で、同一丁内の対象音価が翻字上・字形DB上とも一意であることから文字位置を対応済み。

Phase 2C-2 では国語研高解像度原画像:
`https://dglb01.ninjal.ac.jp/ninjaldl/buturuisyoko/005/jpg/brsk005-009.jpg`

を直接画像確認した。

原画像上で対象 U+1B012 𛀒 を同定し、後続「ず」へ連続する筆線を確認した。

したがって:
- `renmen: true`
- `context_alignment_status: exact`
- `review_status: context-checked`

とした。

## 3. 取得技術

チャット環境から国語研JPEGを直接取得できない場合、
Google Slides `createImage` → PPTX export → 埋め込みJPEG抽出
で原画像ピクセルを確認できる。

この経路は取得手段であり、典拠自体は国語研公開原画像。

## 4. 人間確認との区別

今回の確認はモデルによる原画像文脈確認。
`human-confirmed` ではない。
教材公開条件は引き続き人間確認を要求する。

## 5. 次の作業

context-checked 5件を次の区切りとする。

優先:
1. 巻五6ウ / U+1B012 / 「見えない」
2. 巻五7オ / U+1B012 / 「見えたり」
3. 巻五16ウ / U+1B012 / 「見えたり」
4. 巻五9ウ / U+3048 / 「たえ」

Stage Aの大量追加には戻らない。
