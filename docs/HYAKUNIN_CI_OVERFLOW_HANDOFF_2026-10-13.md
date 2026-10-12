# 百人一首アプリ CI `check:overflow` 修復引継ぎ

作成: 2026-10-13（JST）  
対象: `yama-books/koten`  
正本: **GitHub `main`**（調査時 `01b689f8b64d7378ef48bdf55884748ed32ad560`）  
専用引継ぎブランチ: `hyakunin-overflow-handoff-20261013`（`main`起点、ドキュメントのみ）  
目的: **百人一首アプリ側で既存の表示崩れを修復し、CI全体が先へ進める状態を実現する。**  
作業担当: 別ChatGPT/Codex/Claude Codeセッション。変体仮名のPR #91とは作業を分離。

## 別セッションに渡す実行指示

GitHub `yama-books/koten` の **最新の `main` を正本**に、百人一首アプリの `npm run check:overflow` 失敗を修復してください。専用の修正ブランチを `main` から作成し、再現 → 最小限のレイアウト修正 → Chromium実測 → 全検査 → PR → 監査・完了記録まで進めます。既存の `vintage-kana-audit-20261012` とその PR #91 には触れず、`vintage-kana/` のコードを編集しないでください。CIを通すためにテスト対象・検査精度を弱めたりスキップしたりしないこと。公開/マージはユーザーの統合判断に従ってください。

## 1. 原因の確認結果（2026-10-13時点、GitHub Actionsの実ログ）

- **CIの失敗工程は1つ**: `npm run check:overflow`。`verify` job で exit code 1。
- **失敗分類は3つ、違反レポートは計6件**。すべて幅 320px または 375px、文字サイズ200%の条件。
- **最新作業ブランチでの確認**: [CI run 38258957291](https://github.com/yama-books/koten/actions/runs/38258957291)、job `114844229562`。
- **比較用mainの確認**: [CI run 37779463665](https://github.com/yama-books/koten/actions/runs/37779463665)、job `113318593452`。**同じ3分類・4+1+1件の違反が再現**。今回の変体仮名改修から発生した問題ではない。
- 最新作業ブランチも `main` も、`npm run check:eol`、`typecheck`、`lint`、`npm test`、`build`、`check:font`、`check:font-assets`、`check:font-weight` までは成功。`check:overflow` 失敗により後続の `check:conj-layout` / `check:conj-quiz` / `check:vintage-kana-record` / `scan:publish` はスキップされている。

| 分類 | 違反件数 | 再現条件 | 検出要素 |
|---|---:|---|---|
| 本番の出題画面（作者問題） | 1 | 320px / 文字200% | `examAuthorNoClipping: ["BUTTON","BUTTON","BUTTON","BUTTON"]` |
| 作者問題の出題中 | 1 | 320px / 文字200% | `noClipping: ["BUTTON","BUTTON","BUTTON","BUTTON"]` |
| 作者名の開示（誤答時） | 4 | 320px / 文字200%で2件、375px / 文字200%で2件 | `answer-choice--chosen` / `answer-choice--answer` などの選択肢 |

作者名開示時の元ログ:
```text
誤答 320px 文字200% noClipping: ["answer-choice--chosen","BUTTON","BUTTON","BUTTON"]
誤答 320px 文字200% noClipping: ["BUTTON","answer-choice--chosen","BUTTON","answer-choice--answer"]
誤答 375px 文字200% noClipping: ["answer-choice--chosen"]
誤答 375px 文字200% noClipping: ["answer-choice--chosen"]
```

**集計上の落とし穴**: ログ末尾の `合計 1800 件、合格 1800 件、不合格 0 件` は、別の `findings` 配列に対する集計。上記の `authorRevealFindings` / `examSessionFindings` / `authorReflowFindings` は別に集約され、`process.exitCode=1` になる。**「1800件全合格」だけを根拠に検査を成功と見なさないこと**。

## 2. まず調べるファイル

- `packages/hyakunin/`（百人一首アプリ本体。特に作者を答える出題画面の選択肢と正誤開示のUI/CSS）
- `tools/overflow-check/index.ts`（本番状態をブラウザで再現する検査）
- `package.json` の `check:overflow` スクリプト、`.github/workflows/ci.yml`
- 関連するデザイン・引継ぎ記録があれば履歴を尊重

`tools/overflow-check/index.ts` の結果出力付近：
- 約1054〜1056行: `authorRevealFindings` を列挙し、非ゼロなら exit code 1
- 約1076〜1078行: `examSessionFindings`
- 約1080〜1082行: `authorReflowFindings`
- 約1100〜1105行: 別の `findings` 配列の「1800件」集計

**コード内の座標・計測根拠まで追い、具体的にどの親コンテナでクリップが起きるかを再現してください。** CSSの幅指定、グリッド列の縮み、`min-width`、`overflow`、行高さ、折り返しを調べ、文字拡大200%に耐えるよう修正する。安易なスクロール許容・内容切り捨て・`font-size` 強制縮小は避ける。

## 3. 推奨作業手順

1. GitHub `main` の現行SHAとCIベースラインを再確認。既存の上記6件だけなのか、他の異常が増えていないか比較する。
2. `main` 起点の**新規コード修正ブランチ**を作成（この引継ぎドキュメント用ブランチとは別でよい）。
3. `npm ci`, `npm run build`, `npm run check:overflow` で再現。検査スクリプトのスクリーンショット/DOM計測（clipping対象の矩形・親子境界）を採取。
4. 作者問題の選択肢の狭幅×200%で、出題中と正誤開示時の両方を修正。1件を直したら他の同系列も再検査。
5. `npm run check:overflow` **全体を再実行**し、別配列を含む違反ゼロ・exit code 0まで確認。その後、`npm test`、`typecheck`、`lint`、`build`、関連する後続検査を実行して回帰がないか監査。
6. 自動検査では通るが端末上で読みにくい配置にしない。320/375/414/768px、文字100/200%、選択中/正解/不正解で見やすさと操作可能なタップ面積を目視する。
7. GitHubに最小限の修正をコミットし、独立PRを作成。修正前後の比較、検査コマンドと結果、未確認事項を引継ぎに記録。マージ・公開は適切な承認後。

## 4. 受入基準

- `check:overflow` の上記**6件が0件**、他のカテゴリー含めて違反0件、最終プロセスexit code 0。
- 各選択肢が欠けず、文字200%でも読みやすい。既存UIの洗練された密度/余白/カラー、出題・採点・正誤表示を壊さない。
- **検査条件を削除/省略/緩和して「成功」にすることは禁止**。
- CIの従来チェック（npm test・型・lint等）と後続チェックが完了すること。
- 変更対象が百人一首アプリと必要な関連テストに限定され、`vintage-kana/` とPR #91に影響しない。
- PRと作業ログを発行し、次の監査者が `SHA / CI run / 再現条件 / 変更箇所 / before-afterの証拠` を追える。

## 5. 現在の他作業との関係

- 変体仮名の習熟度リング: [Draft PR #91](https://github.com/yama-books/koten/pull/91)、ブランチ `vintage-kana-audit-20261012`（現状 `8d52e79733e0057a46e5a7e84a8a0109632bae29`）
- VK側の担当セッションでは別途、変体仮名の専用テストを独立実行し、習熟度リングのQAを完了させる。
- **百人一首の修復PRと変体仮名PRは別々にレビュー・統合する。** 互いの作業ファイルを編集しない。

## 6. 終了・引継ぎフォーマット

```text
担当:
branch:
base SHA:
head SHA:
変更ファイル:
原因（計測証拠）:
6件の修正前/修正後:
実行した検査と終了コード:
CI run URL:
PR URL:
未確認事項:
マージ・公開状態:
```
