# PUBLICATION_QA

最終更新: 2026-09-19

## 自動・構文検査

- `index.html` inline JavaScript: **PASS（0.7）**
  - GitHub上の現行0.7をV8で構文コンパイル確認
  - current blob SHA: `34a2d0e371922616c09d276242e96911dffcfcaf`
  - 実フィルタ条件 `human-confirmed && publication_status=approved` を確認
- `ui-glyph-master.json`: **PASS**
  - Phase 1分布から生成済みの軽量UIキャッシュ
  - 47音価
  - 138変体仮名字体（U+1B*** / diacritic=none）
  - 各字体に初期15資料での観察総数・観察witness数を保持
- `attested-examples.json`:
  - total 49
  - exact alignment 10
  - context-checked 6
  - human-confirmed 4
  - rejected 0
  - publication approved 4
  - publication excluded 1

## UI公開ゲート

現行 `index.html` 0.7 の「実資料を読む」は:
`review_status === "human-confirmed" && publication_status === "approved"`
だけを表示する。

現在は P1〜P4 の4件が公開対象。P5は史料実例として保持するが `publication_status: excluded` のため表示されない。

## 現行UIで実装済み

- Phase 1由来の軽量キャッシュから観察済み変体仮名を動的生成
- 対応する仮名で絞り込み
- 字母クイズ
- 「書いてみる」で利用者が字体を明示選択
- 自動ランダム変換なし
- 観察件数を歴史的正しさ・確率として表示しない注意書き
- human-confirmed + publication approved限定の実資料読解タブ
- フォント字形を「対応字体の代表表示」と明記し、原資料の手書き筆跡との完全一致を暗示しない
- 出典リンク・典拠説明

## 残る人間QA

一次公開までに必要:
1. ~~公開候補の人間確認~~ → **完了（P1〜P4 approved / P5 excluded）**
2. ~~最低3件 human-confirmed~~ → **4件で達成**
3. PC実ブラウザでNoto Serif Hentaigana表示確認
4. モバイル幅でレイアウト確認
5. GitHub Pages実配信で4タブ操作確認
6. 典拠リンク遷移確認

## 留保

この静的QAは、人間による原画像読解・表示確認を代替しない。
GitHub Pagesの実配信URLは現在のチャットWeb取得環境から直接確認できなかったため、
配信面の最終操作確認は人間QA項目として残す。


## 一次公開候補5件の整合性検査

PASS:
- 5/5件が `attested-examples.json` に存在
- 5/5件が `review_status: context-checked`
- 5/5件が `context_alignment_status: exact`
- 5/5件で `character / word / transcription / source_image_ref` が存在
- 5/5件で `source_witness` が `sources.json` に存在
- `source_image_ref` は対象ページの国語研原画像へ直接リンク

UIキャッシュ:
- schemaVersion 2
- 138字体
- 47音価
- 必須項目欠落 0件


## 読解UI 0.6

- human-confirmed例だけを問題化
- 問題面では字体を提示し、答えを即表示しない
- 「答えを見る」で対応する仮名・字母・実資料中の語・周辺翻字を表示
- 対象ページ原画像へ直接戻れる
- 更新後JavaScript構文検査: PASS


## 2026-09-19 人間確認ゲート

- P1: human-confirmed
- P2: rejected as U+1B012（同字母「衣」の標準形との比較教材候補）
- P3: human-confirmed
- P4: human-confirmed
- P5: 未確認

**human-confirmed最低3件到達。**
一次公開MVPの「実資料を読む」最低件数ゲートは満たした。
ただし推奨5件セットと実ブラウザ／モバイル／Pages QAは未完了。


## P5 人間確認結果

- P5: publication-excluded
- 対象字「ね」は人間確認OK
- ただし教材表示候補「むねもてき」は意味・切り出しが不明瞭なため、一次公開から除外
- 史料実例自体は有効なので `context-checked` を維持し、`rejected` にはしない


## 2026-09-19 字形同定モデル改訂 / UI 0.7

人間確認で、同じ字母「衣」由来の「え」について、原資料の手書き筆跡とUnicodeフォント代表字形の輪郭が一致しない場合があることを確認した。

設計変更:
- `glyph_id / character` は国語研字形DB上の代表字体IDとして保持
- 人間確認の通常スコープを `kana-jibo-context` とする
- 読み・字母・翻字対応・教材表示が確認できれば一次公開可
- Unicode字形の輪郭完全一致が必要な場合だけ `exact-glyph` として別確認
- 公開ゲートは `review_status=human-confirmed AND publication_status=approved`

現在:
- P1: approved / kana-jibo-context
- P2: approved / kana-jibo-context（旧rejectedを再裁定）
- P3: approved / kana-jibo-context
- P4: approved / kana-jibo-context
- P5: excluded（史料実例はcontext-checked維持）
- publication approved: **4件**

UI 0.7:
- 問いを「この字体は何と読む？」から「この資料では何と読む？」へ変更
- フォントを「対応字体の代表表示」と明記
- 原資料の手書き字形と輪郭が完全一致しない場合がある旨を表示


## UI 0.7 静的公開ゲート検算

PASS:
- JavaScript構文: PASS
- strict gate: `review_status === "human-confirmed" && publication_status === "approved"`
- publication approved: 4件
  - P1 「見えず」 / え / 衣
  - P2 「見えない」 / え / 衣
  - P3 「むね」 / ね / 年
  - P4 「かねて」 / ね / 年
- approved 4件の `kana / jibo / word / transcription / source_image_ref` 欠落: 0
- P5: `publication_status: excluded` のため読解タブ非表示

残る公開前QAは実ブラウザ面:
1. PCでWebフォント表示
2. 4タブ操作
3. モバイル幅
4. GitHub Pages実配信
5. 典拠リンク遷移
