# vintage-kana 監査・実装統合計画
更新: 2026-10-12
状態: ACTIVE / GitHub監査を開始、実装は段階的
管理: ChatGPT（設計統括・静的監査・GitHub上の文書/低リスク実装・独立検証）
基点: yama-books/koten の `main`、開始SHA `01b689f8b64d7378ef48bdf55884748ed32ad560`
作業ブランチ: `vintage-kana-audit-20261012`（上記SHAから新規作成）
公開状態: **本計画の変更は未公開。mainへの直接push・Pages公開・マージは実施しない。**

## 1. 正本と境界

- GitHub の `yama-books/koten`、特に現在の `main` を**実装と公開状態の基準**とする。ユーザーPCの未検証コピーや過去の引継ぎ内容で上書きしない。
- `vintage-kana-main` は歴史的な専用ブランチとして参照するが、2026-10-12時点で `main...vintage-kana-main` の比較は「No common ancestor」。**同ブランチへ盲目的にpush/mergeしない**。必要なら履歴の復旧方針を別途決定する。
- `vintage-kana/index.html` は正式入口・公開演出版（URL固定）、`vintage-kana/detail.html` は学習/一覧/記録の詳しい版、`vintage-kana/prototypes/cinematic-motion-v1/index.html` は演出試作・検証用。
- 実装・デザイン上の上位文書: `vintage-kana/DESIGN_HISTORY.md`、`vintage-kana/HANDOFF.md`、`vintage-kana/prototypes/cinematic-motion-v1/MOTION_LIFELIKE_DESIGN_2026-10-01.md`。本計画は既存の決定事項を勝手に変更しない。
- 変体仮名を意味の異なる文字に置き換える暗号、対応字体の無根拠なランダム選択を復活させない。**例文のランダム選択と字体のランダム選択は別物**。
- `main` や公開URLは直接改変しない。PRレビュー・CI・必要な実機確認の後に公開可否を人間が判定する。

## 2. 役割と依頼原則

**ChatGPTで可能な作業はChatGPTが先行して実施する。** 機械的なコード検索、変更点の静的監査、既存仕様との照合、タスク分解、MD記録、GitHub上の限定的なコード変更、差分の独立確認、テスト案・テストコードの作成は原則ChatGPT担当とする。

Codexには動的な描画計測、大規模な演出コードの実装、Canvas/WebM等の録画検証、実行環境でのテスト・性能計測を必要に応じて依頼する。Claude CodeにはUI/インタラクションの精緻な調整、画面幅/入力IME/アクセシビリティの実機またはブラウザ検査を必要に応じて依頼する。ツール到達性がない場合は、実行可能な担当へ引き継ぎプロンプトを発行する。

担当区分は固定しない。資源制約・競合の状況を見て担当を変更できるが、**同じファイルの同一区間を同時編集しない**。成果物の監査者は原則として実装者とは別にする。

## 3. タスク台帳

| ID | 内容 | 初動担当 | 状態 | 受入条件 |
|---|---|---|---|---|
| VK-00 | 正本確認、GitHub作業ブランチ、監査計画/引継ぎ記録 | ChatGPT | 進行中 | SHA/出典/未検証事項を明記、main不変 |
| VK-01 | 通常空間から白背景・閃光への連続性、全前半モード監査と修正 | ChatGPT静的監査 → 必要時Codex実機 | 静的監査中 | 位置/scale/回転/opacity/白化のフレーム境界に不連続なし。白世界で各モードが見える時間を確保 |
| VK-02 | ひらがな→変体仮名／逆方向の演出動画保存 | ChatGPT設計・可否監査 → Codex実装/再生確認 | 未着手 | 方向を明示、再生と保存の内容一致、録画中のUI混入なし、対応形式を端末ごとに案内、キャンセル復帰可能 |
| VK-03 | 逆変換へのアクセス改善 | ChatGPT静的監査/UI要件 → UI担当 | 現状確認済み/改善未着手 | 既存の上部切替を生かし、切替後の字体・ラベルが整合 |
| VK-04 | 記録への導線改善 | ChatGPT | 実装準備 | シンプル版から記録へ到達可能、既存履歴・習熟度ロジック不変、戻りの導線あり |
| VK-05 | 押下、文字入力・削除のマイクロモーション | ChatGPT静的監査 → UI担当 | 設計準備 | 入力遅延なし、IME確定を壊さない、削除は迅速、reduced-motion時は静止、既存演出を上書きしない |
| VK-06 | 古典・俳句等の歴史的仮名遣いによるランダム例文 | ChatGPT資料照合/候補監査 → UI担当 | 設計・候補照合中 | 字体選択は無作為化しない、原典/表記を監査済みの候補のみ、連続同一候補回避、逆変換時の初期値も整合 |
| VK-07 | 統合・テスト・公開判定 | ChatGPT監査 + 実行担当 | 未着手 | 監査証跡、差分、CI、PC/スマホの確認、明示的公開許可 |

## 4. ChatGPTが実施する先行監査（2026-10-12時点）

### 確認済みの実装事実
- `main` の `vintage-kana/index.html` に `conversionMode` の forward/reverse 選択が既存実装されている（シンプル版に逆変換自体はある）。
- `detail.html` に「習得する」タブの内部切替として「記録」が実装されている。シンプル版からの直通導線は確認できない。
- `index.html` の `setWhiteLevel` は白化の単調増加を狙うが、相の切替時の各文字の pose の連続性は別途確認が必要。
- `index.html` の閃光下の字体差替え `p>.88` と事前font preloadは、2026-10-06修正（PR #88）後の現行実装に存在する。**この再発防止条件を維持する**。
- `detail.html` の「画像で保存」はPNG保存であり、シンプル版の**演出動画保存**とは別機能。
- `index.html` はデフォルト初期文言 `あさきゆめみし`、`detail.html` は `きょうはいいてんきですね`。30件の完全な承認済み例文リストは現行GitHubで未確認。

### 静的監査の仮説（実際の映像で未再現）
- `index.html` の第1・2相の `sideFrontPose`／`diagonalFrontPose`／`columnFrontPose` などと第4相の `sideShakePose`／`diagonalShakePose`／`columnBouncePose` は、式と周波数が異なり、各相の境界 `phase12Duration=8900` ms から第4相の初回フレームで位置・回転・大きさが飛ぶ可能性がある。
- 第4相→第5相、第5相→第6相も同様に境界前後を計測する。**修正対象として断定する前に連続性を定量検査**する。
- 非竜巻系の第4相は `setWhiteLevel(lerp(.42,.96,...))`、第5相は `setWhiteLevel(lerp(.72,1,...))`。単調増加クランプがあっても、白背景到達と運動継続時間の観察検査は必要。
- 動画保存を `MediaRecorder` で実装する場合、DOM自体は録画できず、Canvas等に再描画する別経路か動画合成が必要。MP4が全ブラウザで使えるとは宣言しない。

## 5. テスト・監査の最小セット

1. フロント演出10モード（orbit, formation, chick, chick-column-sync/random, float-pinball, side-shake-sync/random, diagonal-sync/random）で境界前後の座標・角度・スケール・不透明度をログ化。入力文字数1/5/20/80、改行有無、forward/reverse、幅320/390/768/1280pxを代表組合せで検査する。
2. 白化値は全フレーム非減少。閃光開始前の字形切替禁止。欠字グリフ再発防止。白空間で文字が動いた状態を一定時間確保する。
3. 導線はキーボード操作、iOS/WebKit、スマホ狭幅、URL直アクセス/戻る操作、記録なし/あり、永続記録の非破壊を確認する。
4. 動画保存は対応判定、録画中キャンセル、成功/失敗時のUI復帰、リプレイ再現性と音声なしの扱いを明示する。端末対応はブラウザで検証してから保証する。
5. 既存 `npm run test:node`, `npm run test:screen`, `npm run check:vintage-kana-record`, `npm run typecheck`, `npm run lint`, `npm run check:eol`, `npm run scan:publish`、対象に応じて `check:overflow` を実行し、既知ベースラインとの比較を示す。**この計画文書を記録した段階ではテスト実行済みと扱わない**。

## 6. ステップ・停止点

- **Step A（現在）**: ChatGPTがGitHub基点と先行静的監査を記録し、比較的独立した導線修正・テストコードを実装可能な範囲で進める。
- **Step B**: VK-01の境界不連続をブラウザ実測して修正。映像としての連続性を最優先。修正時はprototypeと公開入口の双方の差分を確認。
- **Step C**: VK-02録画。方向選択、保存形式、ボタン配置をVK-01の仕上がりに合わせる。
- **Step D**: VK-03〜06を取り込み、スマホの密度と落ち着いた既存配色を維持する。
- **Step E**: 回帰監査→PRレビュー→ユーザーによる公開判断→公開証跡の記録。

### 報告様式
各担当は `task ID / base SHA / head SHA / 修正ファイル / 変更概要 / 実行コマンド・結果 / 目視確認と未確認 / 再発リスク / 引継ぎ先` を記録する。未実行の検査は「未実行」と書く。完了報告だけで自動合格にしない。

## 7. 参照
- [HANDOFF](./HANDOFF.md)
- [DESIGN_HISTORY](./DESIGN_HISTORY.md)
- [演出設計](./prototypes/cinematic-motion-v1/MOTION_LIFELIKE_DESIGN_2026-10-01.md)
- [ROADMAP](./ROADMAP.md)
- 正式入口: https://yama-books.github.io/koten/vintage-kana/
