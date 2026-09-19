# PUBLICATION_QA

最終更新: 2026-09-19

## 自動・構文検査

- `index.html` inline JavaScript: **PASS**
  - GitHub上の現行 `index.html` を取得し、V8で構文コンパイル確認
  - current blob SHA: `bbe9234b5c0345a12bd8d79787290b16e4737eab`
- `ui-glyph-master.json`: **PASS**
  - Phase 1分布から生成済みの軽量UIキャッシュ
  - 47音価
  - 138変体仮名字体（U+1B*** / diacritic=none）
  - 各字体に初期15資料での観察総数・観察witness数を保持
- `attested-examples.json`:
  - total 49
  - exact 10
  - context-checked 10
  - human-confirmed 0

## UI公開ゲート

現行 `index.html` の「実資料を読む」は:
`review_status === "human-confirmed"`
だけを表示する。

したがって human-confirmed=0 の現在、研究途中のcontext-checked 10件が公開読解教材として誤表示されることはない。

## 現行UIで実装済み

- Phase 1由来の軽量キャッシュから観察済み変体仮名を動的生成
- 対応する仮名で絞り込み
- 字母クイズ
- 「書いてみる」で利用者が字体を明示選択
- 自動ランダム変換なし
- 観察件数を歴史的正しさ・確率として表示しない注意書き
- human-confirmed限定の実資料読解タブ
- 出典リンク・典拠説明

## 残る人間QA

一次公開までに必要:
1. `PUBLICATION_REVIEW_QUEUE.md` の候補を原画像・翻字・表示で人間確認
2. 最低3件、推奨5件を `human-confirmed` へ昇格
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
