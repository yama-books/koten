# 百人一首 `check:overflow` 6件修復・引継ぎ記録

記録日: 2026-10-13 (JST)
担当: ChatGPT (GitHub接続)
リポジトリ: `yama-books/koten`

## 対象・基点・独立PR

- branch: `hyakunin-overflow-fix-20261013`
- 修正ブランチの初期base SHA: `01b689f8b64d7378ef48bdf55884748ed32ad560`
- 作業中にmainが `9c35434da6e53d426bd78ae5a93f24792e4df1a8` へ進行したため、merge commit `be76eecf2ac3c80a92647a48405e90ffdcc4ece0` で新mainを取り込んだ。
- PR: https://github.com/yama-books/koten/pull/92 （Draft。未マージ・未公開）
- このPRのmainとの差分は `packages/hyakunin/src/styles.css` のみ。変更箇所の比較はGitHub PR Files changedで確認できる。
- 元引継ぎ: https://github.com/yama-books/koten/blob/hyakunin-overflow-handoff-20261013/docs/HYAKUNIN_CI_OVERFLOW_HANDOFF_2026-10-13.md

## Before: 既存CI失敗の実行証跡

- mainで6違反を確認したrun: https://github.com/yama-books/koten/actions/runs/37779463665
- Job ID: `113318593452`、`check:overflow` exit code 1
- `examAuthorNoClipping`: 320px・文字200% で1件
- 作者問題の `noClipping`: 320px・文字200% で1件
- 作者名開示（誤答）の `noClipping`: 320px・文字200% 2件、375px・文字200% 2件
- 計6件。ログ末尾の「1800件全件合格」は別集計のため、全体成功を意味しない。

## 推定根因と再現測定

`packages/hyakunin/src/styles.css` の作者縦書き選択肢は、狭幅時も5列グリッドを維持する。
既定 `body { line-height: 1.6 }` が選択肢の `button { font: inherit }` に引き継がれる。
320px・文字200%では文字32pxの1行送りが51.2pxとなり、縦書きボタンの列幅を超える。
開示後は判定画像 `2rem` が64pxに拡大し、さらに幅を超える。

本番アプリそのものではなく、同じ主要CSS規則を抜き出した独立Chromium再現で以下を計測した（診断根拠であり、本番CI合格の代わりではない）。

| 条件 | before: clientWidth / scrollWidth | after: clientWidth / scrollWidth |
|---|---|---|
| 320px・文字200%、作者ボタン | 47 / 49px | 47 / 47px |
| 320px・文字200%、判定画像つき | 47 / 55px | 47 / 47px |
| 375px・文字200%、判定画像つき | 57 / 61px | 57 / 57px |

## After: 修正内容

- `packages/hyakunin/src/styles.css`
  - 作者の縦書き選択肢だけ `line-height: 1.2`。文字サイズ・5列配置・最低タップ高さ・既存の出題ロジックは変更しない。
  - 選択肢内の `.feedback-mark img` を `1.2em` に変更。狭幅×文字拡大時のマークのみを列に収める。
- `tools/overflow-check/`、`.github/workflows/ci.yml` は無変更。検査緩和やスキップは行わない。
- `vintage-kana/` とPR #91のファイルは編集していない。PR #91は別操作でmainへ統合されたため、新mainを取り込んだだけ。

## CI / 検証記録

- 修正前のmainで6件失敗: https://github.com/yama-books/koten/actions/runs/37779463665
- 修正後・更新済mainを取り込んだブランチのPR CI run: https://github.com/yama-books/koten/actions/runs/38287873129
- 修正後・更新済mainを取り込んだブランチのpush CI run: https://github.com/yama-books/koten/actions/runs/38287868336
- このMDを書いた時点では修正後CIの最終判定は未確認。**成功を推測で宣言しない。** 最終CI実測値（run / SHA / 6件→0件 / 全工程）をPRの検証コメントに追記して引き継ぐ。

## 受入判定・未確認事項

- 必須: `check:overflow` が分類別にも0件、exit code 0。後続 `check:conj-layout`、`check:conj-quiz`、`check:vintage-kana-record`、`scan:publish` まで成功。
- 独立Chromium再現の寸法差は確認済。本番アプリの320/375/414/768px・100/200%、採点前後の視認性・実機はCIと別にレビューが必要。
- CIの検証証跡は上記リンクとPR会話を参照。
- **マージ・公開は行わない。** 利用者による別途判断を待つ。
