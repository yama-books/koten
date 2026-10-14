# 変体仮名メーカー 引継ぎ（2026-10-14、スライド調整）
**現在位置：実装・mainマージ・Pages公開まで完了。実機体感確認とCI・Chromium/WebKit最終照合が未完了。再実装は不要。**

## 確定状態
- main: `90695b59f655ddd1e765a95b6602b6930e973cd5`（記録作成時）。
- PR #101: https://github.com/yama-books/koten/pull/101 （merged）。実装ブランチ `vintage-kana-browse-manual-slide-20261014`、コミット `452d3fbf19991be761bd9b86367668767e103711`。
- Pages: https://github.com/yama-books/koten/actions/runs/38493220807 （success、対象上記main SHA）。
- 公開: https://yama-books.github.io/koten/vintage-kana/detail.html （HTTP 200、CSSにアニメーション定義が配信されていることを確認）。
- `vintage-kana/detail.html`: CSS `@keyframes vkhSlowSlideIn`、`#browse.view.active` と `#composeRows:not(.autoHidden)` に右35px→0、1100ms、`cubic-bezier(.18,.75,.2,1)`。reduced-motionで無効、横はみ出し抑止。
- 前回PR #99の誤った記録画面速度変更を元に戻した（カード0.86秒、リング・バー0.82秒、数値780ms、段差70/75ms）。
- `vintage-kana/quiz-motion.js` の問題出現演出は維持（字形720ms、選択肢520ms）。「変体仮名とは？」のヘッダー移設は**すでに完了**なので触らない。
- 変更テスト: `tests/unit/vintage-kana-motion-tuning.test.ts`。文書: `vintage-kana/MOTION_TUNING_2026-10-14.md`。
- 学習の採点、習熟度、学習記録、他アプリ、Pages設定は無変更。

## 前回の誤解と訂正
ユーザーが「スライドインはゆっくりめ」と指定したのは**「一覧」タブと「自分で選ぶ」候補欄**。記録画面ではない。承認済みサンプル `vintage_kana_layout_motion_v2.html` の右35px、1.1秒を今回は反映。PR #99は対象を誤解していたが、PR #101で対象を訂正、記録画面を復元した。

## 検証の境界と次の作業
- npm typecheck/lint/test/build と変体仮名単体テストの各ステップ成功。Vintage kana mastery UI QA のPR run `38493040839` およびpush run `38493025222` は success。
- **記録時点で** main CI `38493220821`、motion continuity QA `38493040875`、PR CI `38493040857` は in_progress。最終結果を改めて照合すること。
- 実際のスマホ・WebKitで「一覧」表示時と「自分で選ぶ」切替時の1.1秒の動きを確認し、候補選択ごとの不要な再演出、横スクロール、reduced-motionを検査する。現在は公開ファイルのCSS値を確認したのみで、**人間の実機体感確認は未済**。
- ローカルの作業ディレクトリは `C:\Users\user\AI開発\koten`。このセッションからWindowsローカルの変更はしていない。次回は作業ツリー・未コミット差分を保護したうえで履歴を確認。
- 重要な事故対策: `checkpoint-main` に古いDeploy Pages定義があり、以前アプリ群を巻き戻した。対策コミット `ed88570c97897a57e232c94f03ac3603092b787f` でそのブランチの公開を抑止。**今後の公開はmainのみ**、常にdeploy runのhead_branchとSHAを確認。
- VK-02動画関連は別セッションで並行作業中。勝手に触れず、その他古典アプリも変更しない。

## 再開指示
`vintage-kana/HANDOFF.md` 冒頭を読み、まず上記3つのActions最終状態と公開版の実機動作を確認する。すでにマージ・公開した修正を重複実装しない。ユーザーが見た感触を確認して、必要な場合にのみ小さな追加修正PRを作成する。
