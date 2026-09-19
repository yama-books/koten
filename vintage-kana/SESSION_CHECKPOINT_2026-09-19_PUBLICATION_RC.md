# SESSION CHECKPOINT — vintage-kana — 一次公開RC 2026-09-19

## 現在位置

一次公開MVPの研究・データ・人間確認・静的UI実装は完了。
残る主作業は実ブラウザ／モバイル／GitHub Pagesの配信QA。

## データ

`data/attested-examples.json` schemaVersion 2。

- total: 49
- publication approved: 4
- publication excluded: 1
- rejected: 0
- approved: P1 / P2 / P3 / P4
- excluded: P5

公開ゲート:
`review_status === "human-confirmed" && publication_status === "approved"`

## 人間確認モデル

原資料の手書き字形とUnicodeフォント代表字形を同一視しない。

- `glyph_id / character`: 国語研字形DB上の代表字体ID
- `human_confirmation_scope: kana-jibo-context`: 読み・字母・翻字対応・教材表示の人間確認
- `human_confirmation_scope: exact-glyph`: Unicode字形の厳密同定が必要な場合のみ
- 一次公開は kana-jibo-context で可

P1/P2:
- 読み「え」
- 字母「衣」
- P1「見えず」
- P2「見えない」
- いずれも publication approved
- U+1B012は国語研DB上の代表字体IDとして保持し、原画像筆跡とフォント輪郭の完全一致は要求しない

P3/P4:
- 読み「ね」
- 字母「年」
- P3「むね」
- P4「かねて」
- publication approved

P4翻字は原資料構造を保ち `汲｛くみ｝とりかねて...` とする。

P5:
- 「ね」自体は確認済み
- 「むねもてき」の教材切り出しが不明瞭
- publication excluded
- 史料実例として context-checked を維持

## UI 0.8

`index.html`:
- 47音価 / 観察済み138変体仮名字体
- 字形を見る
- 字母クイズ
- 書いてみる
- 実資料を読む
- 読解公開ゲートを approved のみに限定
- 「この資料では何と読む？」へ表現変更
- フォント字形を「対応字体の代表表示」と明記
- 原資料の筆跡とフォント字形が完全一致しない場合がある旨を明示
- Noto Serif Hentaigana Webフォント読込診断を追加

静的QA:
- inline JavaScript syntax: PASS
- strict publication gate: PASS
- approved 4件の必須項目欠落: 0
- P5除外: PASS
- current index blob: `9991f10a0f153d6501d4b005ab17948d368448ac`

## GitHub

- repo: `yama-books/koten`
- visibility: public
- default branch: main
- GitHub/Web-only作業。ユーザーのローカルには触れていない。
- HNSD取得用の一時workflow/tmpファイルはmain上に残っていない。

## 残QA

1. PC実ブラウザで「字体フォント: 読込済み」を確認
2. 4タブの基本操作
3. 実資料を読むに4件だけ出ること
4. P1〜P4の原画像リンク
5. モバイル幅でタブ・カード・入力欄の崩れ確認
6. GitHub Pages実配信URLで同じ内容を確認
7. 問題なければ一次公開版表記へ変更

## 進捗概算

一次公開まで **約92%完了 / 残り約8%**。
残りは実ブラウザ・配信面QAと公開版表記。
