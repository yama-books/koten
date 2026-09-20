# Checkpoint β

古文本文の「立ち止まって確認したい場所」を示す予習支援アプリ。

## 方針
- 答えを自動表示することを目的にしない
- 全助動詞と特徴的な用言をデータベース化する
- 「検出できた」と「文法的に確定した」を分離する
- CHJ / UniDic と学校文法の表示体系を分離する
- 学習者には最初に見るべき観点から段階的に提示する

## β0.1
v1.3 standalone を基礎に GitHub Pages 用へ再構成。
活用した敬語動詞はまず見出し語を確認し、その後に敬語の働きを見る。
仮名遣いの例外は常時列挙せず「一部例外あり」から展開する。
外部 JSON ローダーを用意し、読み込み失敗時は現行埋め込みルールへ fallback する。

## 正本ポリシー
学校文法の接続・活用は『新しい古典文法 四訂新版』付録を一次資料とする。
CHJ / UniDic は候補発見・実例・判定根拠に使い、学校文法の最終表示を直接決める正本とはしない。
一次資料未照合の助動詞項目は verified にせず、未照合の活用表・接続を推測で埋めない。

## 公開β
https://yama-books.github.io/koten/checkpoint/

## モバイル・学習履歴
- スマホ向けに44px操作領域、safe-area、drawerのモバイルスクロールを調整
- 「ここはわかる」で隠したポイントはチェックリスト下部に一覧化
- 個別に「戻す」／「すべて戻す」が可能
- 履歴は現在の本文だけに保持し、本文を変更すると自動クリア

## リポジトリ運用
- Checkpoint の開発正本ブランチ: `checkpoint-main`
- Checkpoint 作業を `main` へ直接 push しない
- production `main` への統合は koten 側の統合工程で行う
- shadow detector は研究・監査専用。通常公開UIは legacy detector を使用する

詳しい引継ぎは HANDOFF.md を参照。

## 公開統合
production `main` への安全な取り込み手順は `PRODUCTION_INTEGRATION.md` を参照。


## 公開βの自動検証
`checkpoint-main` では、公開UIの回帰をGitHub Actionsで自動確認しています。

- 通常URLではshadow debugを出さない
- drawer操作
- 「ここはわかる」履歴
- 個別・全件復帰
- 本文変更時クリア
- スマホ向けCSS契約

検証:
- `tests/unit/checkpoint-public-beta.test.mjs`
- `.github/workflows/checkpoint-public-beta.yml`

production統合前には `PRODUCTION_INTEGRATION.md` と
`data/production_integration_delta_20260920.json` を確認してください。
