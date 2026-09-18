# 古典活用表ドリル `conj`

古典文法の活用表学習と、実際の古典本文に基づく実例ドリルを分離して扱う学習アプリです。

公開ページ: https://yama-books.github.io/koten/conj/

## 正本とデータの役割

- 学校文法の正本: 『新しい古典文法 四訂新版』付録
- CHJ / UniDic: 実例探索・分布確認・候補発見に使用
- Google Drive「活用表アプリ」: 生コーパス、監査表、中間成果物、正本候補を保持
- GitHub `conj/`: 公開アプリ、軽量な実装仕様、監査済み集計、引継ぎ文書を保持
- CHJ生コーパス全量はGitHubへ置かない

## 現在の到達点

- 動詞: 360例。公開前監査済み、公開ブロッカー0
- 形容詞: 140例。動詞と合わせて500例マイルストーン到達
- 助動詞第一陣: ず・べし・まじ・まほし・たし、180例を一次選抜
- 助動詞180例: target / anchor監査完了
  - anchor必須 8例、すべてanchor内でtargetが一意
  - 原文表記と正規化キーが異なる 32例、すべて原文targetを本文で確認
- 形容動詞: 120例を一次選抜・target監査済み。raw CSV再照合120/120通過。活用表・実例の二層データ化を開始

## 重要な教材設計

活用表ドリルと実例ドリルを分けます。

一次資料に載る活用形は活用表ドリルで学習対象とします。一方、実例ドリルには確認できた歴史的実例だけを入れます。

例: `たし` の補助活用連体形 `たかる` は一次資料上の正規セルですが、CHJ全体と外部調査で確実な実例をまだ得ていません。そのため活用表では出題し、実例ドリルでは現時点で出題しません。

## ファイル

- `index.html`: 現行アプリ
- `HANDOFF.md`: 継続作業用の引継ぎ
- `IMPLEMENTATION.md`: データ構造・実装原則
- `PROGRESS_2026-09-19.md`: 今回までの進捗記録
- `data/corpus-status.json`: 監査済み集計・希少セル・Drive参照の機械可読メタデータ
- `data/adjectival-noun-paradigms.json`: 形容動詞の活用表正本
- `data/adjectival-noun-example-index-120.json`: 形容動詞120例の軽量実例索引（本文なし）
- `data/adjectival-noun-lemma-pool.json`: 表ドリル用の監査済み117語幹
- `data/adjectival-noun-integration-audit.json`: 活用表セルと実例索引の回帰監査
- `adjv-runtime-adapter.js`: 形容動詞二層データの副作用なし互換アダプタ
- `adjv-runtime-smoke.html`: 本番indexから独立した読込スモーク確認

最終更新: 2026-09-19
