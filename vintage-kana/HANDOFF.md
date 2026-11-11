# HANDOFF — vintage-kana

## 2026-10-15 濁点・小書き・ん の変体仮名化、もう1回の引き直し、一字ずつ設定

- **シンプル版（変換演出）**：濁点・半濁点つきの字（で・ぱ など）と小書きの仮名（ゃ→や など）が普通のひらがなのまま残っていた。清音の大きい仮名に分けて変体仮名にし、濁点・半濁点を付け直す。濁点つきの字は演出でも一字として動く（`kanaUnits`）。逆変換は濁点つきの変体仮名も普通のひらがなに戻す。
- **シンプル版の字体**：初回は従来の既定の字。「もう1回」のあとの変換は、字形データ（`data/ui-glyph-master.json`）の候補から前回と別の字を一様に選ぶ。「演出を飛ばす」と失敗時の表示は、その回の変換結果をそのまま使う。「ん」は Unicode の N-MU-MO（U+1B11D・U+1B11E、字母「无」）を使い、シンプル版ではこの2字を「ん」専用にして逆変換も「ん」に戻す。
- **シンプル版の文言**：結果画面の「変体仮名をもっと見る」を「くわしく」に変更。
- **くわしい版「おまかせ」**：「ん」にも N-MU-MO を候補にし、最初から普通のひらがなが出ないようにした。「もう一度」は頻度重みをやめ、頻度の低い字体も同じ確率で、いまと別の字を選ぶ。
- **くわしい版「自分で選ぶ」**：「普通のひらがな」を押しても既定の字体に上書きされていた不具合を修正し、現代の仮名を選べるようにした。「一字ずつ設定する」バッジを追加。押すと同じ字でも位置ごと（「1字目」など）に、普通のひらがなを含めて選べる。解除すると位置ごとの選択を捨てて一括の選択に戻る。おまかせに切り替えると解除。
- **検査**：`tools/vintage-kana-compose-check`（`npm run check:vintage-kana-compose [-- --webkit]`）を追加し、Vintage kana mastery UI QA ワークフローで実行する。

---

## 2026-10-15 PR #104 公開完了（下の句100首・初期文の確率分離）

- **CI停止の原因と修正**：`check:vintage-kana-record` の省アニメーション検査が、ページ全体の実行中CSSアニメーションを数えていた。百人一首データの取得が加わり、記録画面を開いた時点で読み込み中スピナー（`#vkmBoot` の `vkm-spin`、記録画面の外。省アニメーション時も2.5秒周期で回る仕様）が残り、1件と数えられて失敗した。`#quizRecord` 配下（`getAnimations({subtree:true})`）だけを数える方式に修正（`26c317f`）。検査は無効化していない。
- **ローカル検証（最新main取り込み後）**：vintage-kana 単体テスト41件、記録画面 Chromium・WebKit、習熟度リング Chromium・WebKit（各16シナリオ）、モーション Chromium・WebKit（WebKit 50シナリオ）、seam 単体テスト、eol・typecheck・lint・`npm test`・data:check すべて成功。
- **CI**：push CI run 38637905439 成功、mastery-ring・seam 成功。pull_request CI run 38637911108 は attempt 1 で conj WebKit 検査 `master action stays in view` が失敗したが、conj 関連ファイルは main（`387f6f0`、同検査成功済み）と同一で、同じSHAの push CI では成功しているため一過性と判断。attempt 2 は成功。
- **マージ**：PR #104 → main マージコミット `8da8ef02b882aef56df8dd685cb3ca448f47e007`。conj 関連ファイルはマージ前後で変更なし。
- **Pages**：Deploy Pages run 38642358295 成功。公開の `index.html`・`detail.html`・`decipher-engine.js`・`data/hyakunin-lower-verses.json` は main とバイト一致。公開データは和歌100件（`hy-0001`〜`hy-0100`）、現代語367件。
- **公開画面の実測**：シンプル版・詳しい版とも両データを200で取得し、初期文を置き換え。公開データで `pickComposerPhrase` を各7000回抽選し、和歌の割合はシンプル版0.139（設計1/7）、詳しい版0.101（設計1/10）。詳しい版は字形266件、読み込み表示は終了済み。

---

## 2026-10-15 下の句100首と初期文の確率分離（PR #104 追補）

- **確定削除追加10件**：`とりがなく`、`あめがふる`、`ゆきがふる`、`かぜがふく`、`ねこがねる`、`ねこがのびる`、`いぬがはしる`、`くまがねむる`、`うみがひかる`、`ほしがきえる` を語句プールから削除。IDは欠番のまま。`やまがわらう` と `はるがきた` は残す。
- **現代語の語句プール**：前回377→367件。`data/decipher-phrases.json` を正本とし、通常の出題器 `pickPhrase` は変更しない。
- **和歌プール**：`data/hyakunin-lower-verses.json` に百人一首の歴史的仮名遣いの第四・五句を結合した100件を新規収録。正本はルートの `百人一首_読み_歴史的仮名遣い_作者訂正版_v2.md`。ID `hy-0001`〜`hy-0100`、番号・二句・結合読み・典拠情報を保持。単体テストで正本100首との一致を点検。
- **シンプル版初期表示**：`pickComposerPhrase(modern,historical,"simple")`。現代語5文字以上から6/7、和歌から1/7を先に抽選し、選んだプール内で一様抽選。画面編集済みなら取得終了後も上書きしない。現代語に適格項目がない場合のみ別プールへフォールバック。
- **詳しい版初期表示**：`pickComposerPhrase(modern,historical,"detail")`。現代語全長から9/10、和歌100件から1/10。プールサイズの影響を受けない。解読クイズは現代語プールのままとし、既存の難易度・出題確率・学習履歴を維持。
- 取得不能時は取得できたプールのみ使用、どちらも取得不能なら初期文字列 `そら` を残す。確率は後から変更できる定数相当の数値。
- **公開状況**：2026-10-15 に公開完了（上の「PR #104 公開完了」を参照）。

---

## 2026-10-15 語句教材の追加・整理（確定分のみ）

- ユーザー確定：`dc-0373` の「ぶたにしんじゅ」は、拗音の小書き「ゅ」を使わず「ぶたにしんじゆ」に修正。語句問題・初期表示とも共通の `reading` を参照し、「ゆ」を独立した変体仮名候補として扱う。データ検証の小書き仮名除外を元に戻す。
- ユーザー確定：`dc-0102`「さんぽみち」と `dc-0151`「ねこがなく」を語句候補から削除。旧IDは欠番として再利用しない。
- ユーザー確定：`dc-0375`〜`dc-0379` の5例「こんなんはぶんかつせよ」「めろすはげきどした」「せきたんをばはやつみはてつ」「なまえはまだない」「わがはいはねこである」を「アニメ・作品・名言」カテゴリに追加。
- 総数：374 − 2 ＋ 5 = **377件**（「ゅ」→「ゆ」は件数変更なし）。追加例の著作物出典・原文照合は未監査であり、原文の正確な引用や歴史的用例であることは保証しない。
- **未決定・削除禁止**：「とりがなく」「あめがふる」「ゆきがふる」「かぜがふく」「ねこがねる」「ねこがのびる」「いぬがはしる」「くまがねむる」「うみがひかる」「ほしがきえる」「やまがわらう」「はるがきた」などの単純な創作文を列挙してユーザー検討待ち。確定削除2例以外は触れない。
- 学習履歴、採点、UIモーション、GitHub Pages のブランチ制限は変更しない。PR・CI・公開結果は別途記録する。

---

## 2026-10-14 引継ぎ確定：一覧・自分で選ぶのスライドイン（PR #101、公開済み）

- **実装・マージ・Pages公開成功**。main `90695b59f655ddd1e765a95b6602b6930e973cd5`、PR #101、Pages #38493220807。
- **対象は「一覧」「自分で選ぶ」**。右35px・1.1秒。記録画面の誤調整は元の0.86秒へ戻し、問題表示字形720ms／選択肢520msは維持。「変体仮名とは？」の配置も変更なし。
- **未完了**：main CIとモーションQAの最終結果、スマホ実機での視覚確認。既存のコードを再実装せず、まず確認する。
- 詳細：[HANDOFF_2026-10-14_SLIDE.md](./HANDOFF_2026-10-14_SLIDE.md)。古い「未公開」記述よりこの節が新しい。

---


## 2026-10-13 VK-11: 共通モーション／字形フィルター／初回読み込み（実装）

- ユーザーが先行試作の方針を承認。追加指定: circular-progress の大見出し「変体仮名を準備しています」は削除し、既存の「字体データを読み込んでいます…」と「文字表示を…」系の案内は維持。
- `vintage-kana/quiz-motion.js`: 入場（変体仮名・選択肢）、正誤演出（淡い光・約300msの微振動）、５問まとめ grid-wave、フィルター reflow/FLIP を追加。要素の再作成ではなく、位置差分をWeb Animations APIで動かす。reduced-motion はスキップ。
- `detail.html`: 「読み」「字母」「解読」の出題字形および選択肢の動き。解読まとめ「すべて／読めた字／読めなかった字」を追加。読みの「ひらがなで入力」プレースホルダー、上部重複ラベル撤去、「字形と字母を確認」下の不要説明文撤去。
- 分類は語句単位正誤の暫定代用指標。正解語句に一度でも登場した字形を「読めた字」、誤答語句にしか登場しない字形を「読めなかった字」。字形の習熟度を更新せず、従来の正解のみ加点の規則を変更しない。
- `index.html` と `detail.html` の初回読み込み時に、円形の不確定進捗リングを表示。架空の百分率や「変体仮名を準備しています」の説明は表示しない。実際のデータ取得・フォント準備が揃うかタイムアウトした時点で閉じる。
- QA: `tests/unit/vintage-kana-decipher.test.ts` と `tools/vintage-kana-record-check/index.ts` を拡張。既存記録形式、得点、５問セットの計数は変更なし。
- 本実装の検証・コミット・PR・配信の最終情報はPR側を参照。過去の設計引継ぎとサンプル `VINTAGE_KANA_MOTION_HANDOFF_2026-10-13.md` は参照元として残す。

---

## 2026-10-13 VK-10 解読の入力欄・字母復習・まとめ（作業ブランチ）

- 指摘：iOSの解読入力欄で「読みをひらがなで入力」というプレースホルダーが横幅に収まらない。説明を常時表示のラベルへ移し、プレースホルダーは「ひらがな」。スマホでも回答ボタンと干渉しない2列グリッドにする。
- 解読の誤答時も正解と同じく、当該問題に実際に表示された字形・読み・字母を一覧化し、字形をタップすると既存の詳細ダイアログを開ける。
- 誤答問題の字形に一律の誤答判定・減点・加点をしない。正解時のみ既存習熟度集計に含める。
- ５問のまとめには語句別の正誤に加えて「今回出会った字形」を表示。重複字形は統合、濁点別の読みは併記し、各カードに字母を示す。長い問題に備え一覧領域だけスクロール可能にする。
- `decipher-engine.js` の純粋関数 `collectSetGlyphs`、`detail.html`、単体回帰テストを更新。学習履歴の保存キーと集計規則は維持。
- **未公開**。ブラウザ・CI・マージは別途検証する。

---

## 2026-10-13 VK-08 ヘッダー整理（サンプル承認・実装）

- 承認済み `vintage_kana_header_layout_sample.html` に合わせ、詳しい版 `detail.html` の「変体仮名とは？」を主メニューの枠外（タイトル付近）へ移す。
- スマホ幅ではタイトル直下に「変体仮名とは？」／「シンプル版 ↗」を左右配置。枠内ナビは「書いてみる」「一覧」「習得する＋習熟度リング」の3区画をグリッド表示。PCはタイトル右に案内リンクを横配置。
- 既存のヘルプダイアログ・習熟度リング・記録への導線のDOM IDとイベントを維持。
- 回帰テストを追加し、320〜1440pxのChromium/WebKitでリンク位置、メニュー重なり、横スクロール、既存ヘルプダイアログを確認する設計。CI結果は別途確認。
- PR #94 のドラフトに追加。**main公開は未実施。**

---

## 2026-10-13 VK-08 「解読」モードの実装引継ぎ（未公開）

今回のユーザー確定内容は [DECIPHER_IMPLEMENTATION_2026-10-13.md](./DECIPHER_IMPLEMENTATION_2026-10-13.md) を参照。読み／字母／解読の３モード、371語句・５段階・出題時字形抽選・仮名均衡化・正解時字形加点に対応する。  
作業ブランチ `vintage-kana-decipher-vk08-20261013`、基点 `main@7a88407`。VK-01の演出系 PR #93 と独立。**mainには未反映。Playwright・WebKit・CI・公開は未確認。** 旧学習記録を上書きしないため解読履歴は別キー。

---

最終更新: 2026-09-19（公開構造のみ 2026-10-03 更新）

## 2026-10-12 中央監査・複数担当実装の引継ぎ（最新）

**最新計画**: [AUDIT_AND_IMPLEMENTATION_PLAN_2026-10-12.md](./AUDIT_AND_IMPLEMENTATION_PLAN_2026-10-12.md)。この節より下の従来履歴は削除・改変せず保持する。

1. ユーザーの現行指示: **GitHubが正本**。ChatGPTセッションを監査拠点にし、できる限りChatGPTが調査・設計・MD更新・低リスク実装を担当する。必要なものだけCodex/Claude Codeへ指示する。
2. 対象: `yama-books/koten` の `main` を基準にする。開始コミット `01b689f8b64d7378ef48bdf55884748ed32ad560`。作業ブランチ `vintage-kana-audit-20261012` はこのSHAから新設。
3. **実ファイルの構造に注意**: 正式入口は `vintage-kana/index.html`（cinematic演出版）、詳しい学習・記録画面は `vintage-kana/detail.html`、演出デバッグ版は `vintage-kana/prototypes/cinematic-motion-v1/index.html`。旧ログの「index.html」が今の「detail.html」を指す箇所がある。
4. 旧ルールの `vintage-kana-main` は残すが、現状のGitHub APIでは `main...vintage-kana-main` 比較が **No common ancestor**。新作業は現行main起点で行い、既存ブランチへ無造作にpushしない。
5. 現行シンプル版には forward/reverse の方向切替がすでに存在。記録画面は詳しい版の習得タブに内包されており、直通導線の余地がある。
6. 2026-10-06修正の `p>.88` 閃光内切替・font事前読み込みの条件を保持。前半phase境界のpose不連続疑いは**静的監査の仮説**で、実機再現は未確認。
7. 例文候補は古典・俳句等の**歴史的仮名遣い**を尊重。2026-10-07の候補として「はるはあけぼの」「あきはゆふぐれ」「ゆくかはのながれはたえずして」「ぎをんしやうじやのかねのこゑ」「ふるいけやかはづとびこむみづのおと」が挙げられている。ただし**約30件の完全な確定リストと原典照合は未回収**。未確認の文面を「承認済み」として登録しない。
8. 監査対象: VK-00〜VK-07。PR・CI・ブラウザ検査・公開許可は別ゲート。**現時点で公開版は変更していない**。

### 2026-10-12 追補: ChatGPT作業結果

- 作業ブランチ `vintage-kana-audit-20261012` に、監査計画と本HANDOFF/ROADMAPの更新を保存。
- VK-04: `index.html` に記録直通リンクを設置、`detail.html` に `#record` のルーティング（教材データ読み込み後）を設置。既存の学習記録保存・集計は改変なし。
- `tests/unit/vintage-kana-record-route.test.ts` に3件の静的回帰ガードを新設。GitHubの現行ブランチからソースを取得しV8上で構文検査PASS・ガードアサーション3/3 PASS。
- **ブラウザ/WebKit/iPhoneの動作・正規npm CIの最終合格は未確認。** PR作成・mainマージ・Pages公開は未実施。
- 詳細監査証跡: [AUDIT_LOG_2026-10-12.md](./AUDIT_LOG_2026-10-12.md)。その他の担当分担・受入条件は統合計画書を参照。

---

## 公開構造（2026-10-03〜）

- `index.html` — 正式入口（`https://yama-books.github.io/koten/vintage-kana/`、QR で配布済み・URL変更禁止）。`prototypes/cinematic-motion-v1/index.html` の派手アニメ版から、デバッグUI・刻印方向UIを外し、上部バー（タイトル＋「詳しい版」）と演出後の「もう1回／変体仮名をもっと見る」を足したもの。演出ロジックは prototype と同じ（違いは結果盤の字の大きさを画面幅に収める上限だけ）。
- `detail.html` — 2026-10-03 までの `index.html`（詳しい版）。上部に「シンプル？版」（`./`）を追加した以外は同一。`check:vintage-kana-record` はこちらを検査する。
- `prototypes/cinematic-motion-v1/` — 演出の開発・検証用（デバッグUIあり）。演出を直したら `index.html` へも反映する。
- 以下の本文で「`index.html`」とあるのは、2026-10-03 以前の記述では詳しい版（現 `detail.html`）を指す。

## 0. 着手前に読む

**最初に [DESIGN_HISTORY.md](DESIGN_HISTORY.md) を読むこと。**

このプロジェクトでは、現在の仕様だけでなく「なぜその仕様になったか」が重要である。
特に、初期の暗号機能・ランダム字体選択を、理由を知らずに復活させないこと。

その後、必要に応じて次を読む。

1. `DESIGN_HISTORY.md` — 詳細な経緯・意図・撤廃理由
2. `ROADMAP.md` — 全体工程・現在位置・区切り条件
3. この `HANDOFF.md` — 現在の作業状態
4. `SESSION_CHECKPOINT_2026-09-19_1110_END.md` — 本セッション終了時点の最新チェックポイント
5. `NEXT_SESSION_PROMPT_2026-09-19.md` — 次セッション開始用プロンプト
6. `SESSION_CHECKPOINT_2026-09-19_PHASE2.md` — Phase 2移行後の旧チェックポイント
7. `SESSION_CHECKPOINT_2026-09-19.md` — Phase 1完了時点のチェックポイント
8. `VIEWER_EXTRACTION_NOTES.md` — 原資料位置・文脈取得の技術調査
9. `AGGREGATION_RULES.md` — 0件補完・比率計算の規則
10. `SOURCES.md` — 典拠
11. `RESEARCH_PLAN.md` — 資料収集手順
12. `DATA_MODEL.md` — データ構造
13. `INTEGRATION_NOTES.md` — koten全体との統合注意

## 1. 現在地

典拠と実例を厚く収集する段階。

2026-09-18 時点で、国語研「変体仮名字形データベース」の現行収録資料15単位を `data/sources.json` に台帳化した。

**Phase 1 の47音価について、資料別の非ゼロ字体分布を一巡済み。**

- 対象: 47仮名
- witness: 15資料単位
- 非ゼロ分布レコード: 2,046件
- `glyph-distribution.json`: 36仮名 / 1,691件
- `glyph-distribution-part2.json`: 11仮名 / 355件
- `glyph-distribution-index.json`: 分割索引・全体進捗
- `glyph-distribution-supplemental.json`: 「ん」15件
- 補遺を含む非ゼロ分布: 2,061件
- 派生データ:
  - 47音価本体: 3,750セル（非ゼロ2,046 / 推定0 1,704）
  - 補遺「ん」: 15セル
  - 比率2種を計算済み
- 集計規則: `AGGREGATION_RULES.md`

大容量化により、分布データは複数JSONへ分割して保存する。
意味上は一つのコーパスであり、索引ファイルから追跡する。

完了済み:
- 中核47音価の非ゼロ分布収集
- 補遺「ん」の15資料分収集
- 欠落セルの0件推定による派生データ生成
- `share_within_kana_all_forms` / `share_within_kana_same_diacritic` の2種比率計算
- 比率合計・範囲の算術検算

未完了:
- 15資料の年代・ジャンル・媒体・所蔵・画像利用条件の一次確認（2026-09-19完了。国文研200014445の書写年のみ一点確定を避け留保付き）
- 分布差が大きい字体の候補抽出（2026-09-19完了、`data/context-sampling-candidates.json`）
- Stage A 実例: `data/attested-examples.json` 44件（source-checked 44）
- 公式字形ページHTMLから個別出現の page / occurrence ID / X / Y を直接列挙する方法を確認
- 高頻度の『伊勢物語』優先字体では個別出現行の取得経路が未確立
- Phase 2C-1 exact-text 5件を達成（U+1B012 𛀒 4件 + U+3048 え 1件を一意対応）
- Phase 2C-2: 原画像で連綿等を確認し、最初の `context-checked` 1件を作るのが現在の主工程
- 先行研究との照合
- `attested-examples.json` の本格増補
- 分布コーパスのアプリUI接続

目的は、変体仮名を「見慣れない暗号記号」として消費することではなく、

- 字体と字母を知る
- 実際の資料を少しずつ読めるようになる
- 歴史的な背景を知った上で現代の文章を変体仮名で書いてみる

という体験を作ること。

最初の「秘密の手紙／暗号文」の楽しさは、換字暗号ではなく、**読めなかった文字を解読できるようになる楽しさ**として残す。

## 2. 確定事項

### D-VK-01 歴史的正確性を優先
変体仮名を単なる換字記号として扱わない。

### D-VK-02 換字暗号案を撤廃
本来の仮名対応を無視する換字暗号は採用しない。

### D-VK-03 無作為な字体選択を歴史再現として扱わない
同じ仮名に対応する複数字体が存在しても、ランダムに選べば歴史的に自然になるとは考えない。

### D-VK-04 UI用語
字形詳細の利用者向け表示は原則:
- 対応する仮名
- 字母
- 備考（必要な場合）

使用しない表記:
- 本来の平仮名
- 本来の読み
- 暗号上の割り当て

Unicode番号は内部データに保持してよいが、通常UIでは表示しない。

### D-VK-05 読解問題は実例優先
読解問題は `attested`（実資料に確認できる用例）を既定とする。

### D-VK-06 現代文作成は歴史再現と分離
現代の文章を変体仮名で書く機能は認めるが、「歴史的に自然な表記を再現したもの」とは表示しない。

### D-VK-07 作品と資料を分ける
同じ作品でも異本・版本・写本等を合算せず、`work` と `witness` を分離する。

### D-VK-08 観察事実と一般規則を分ける
「この資料で多い」と「この時代では正しい」を同一視しない。

### D-VK-09 濁点・半濁点等を無印字形と合算しない
国語研字形DBでは、同一字形でも「濁点」「半濁点」付きが別項目として出現する。
初回コーパスでは `diacritic` を別属性として保存する。

### D-VK-10 分布データは索引付きで分割可能
大容量JSONを一つに固定せず、`glyph-distribution-index.json` を正規の入口として複数partへ分割可能とする。
分割は保管上の都合であり、意味上の資料範囲や集計単位を変えない。

## 3. provenance_type

- `attested`: 実資料に確認できる
- `adapted`: 実資料を教材用に最小加工
- `constructed`: 教材用創作
- `modern_composition`: 現代文の変体仮名表記

読解教材の既定は `attested`。

## 4. 典拠の三層

### A. 字体マスター
国立国語研究所「学術情報交換用変体仮名」

### B. 実例
国立国語研究所「変体仮名字形データベース」
CODH「日本古典籍くずし字データセット」

### C. 研究
国語研・J-STAGE・国語研リポジトリ等。

## 5. 初期コーパス

国語研字形DBの15資料単位を最初の観察範囲とする。

作品群:
- 『春色梅児与美』3巻
- 『比翼連理花廼志満台』初編3巻
- 『諸国方言物類称呼』5巻
- 『和漢朗詠集』上下
- 『伊勢物語』2資料

これらを合算して「標準」を作るのではなく、各 `witness` 内の分布を先に観察する。

## 6. 現在の次作業

1. `sources.json` の書誌一次確認結果を維持し、必要な追加書誌だけ個別監査する
2. `data/context-sampling-candidates.json` の優先候補を使う
3. Phase 2C-1 の exact-text 5件達成済み
4. 原資料画像を取得・確認できる経路を確立する
5. exact-text 5件のうち少なくとも1件で連綿・接続等を原画像確認し、`context-checked` へ昇格する
6. 並行して『伊勢物語』高頻度優先字体の個別出現取得経路を継続調査する
6. `attested-examples.json` を段階的に増補する
7. 先行研究と観察結果を照合する
8. 字母・字体クイズ候補を生成する
9. 短い `attested` 読解教材を生成する
10. 人間が典拠と表示を確認する
11. 「書いてみる」候補表示を実例データと接続する

## 7. 停止条件

次の場合は勝手に教材化しない。

- 字体と字母の対応に疑義がある
- 出典位置へ遡れない
- 画像・翻刻のライセンスが不明
- 「この字体がこの条件で自然」という推測しかない
- AI生成文を実例のように見せる必要が生じる
- 複数資料を混ぜなければ傾向を作れない
- 観察件数が少なすぎるのに一般規則化しようとしている

## 8. 旧試作

prototype v0.1〜v0.3では、フォント表示、縦書き、字母表示、暗号・ゆらぎ暗号等を試した。

現行方針で残す技術的成果:
- 変体仮名フォントをWeb側で確保する
- フォント診断
- 縦書き表示
- 字形をクリックして字母を見るUI

撤廃:
- 本来対応しない仮名への換字
- 合言葉による換字表
- ランダム字体選択を歴史再現として扱うこと

## 9. GitHub公開状態

公開リポジトリ:
`yama-books/koten`

公開アプリ:
`https://yama-books.github.io/koten/vintage-kana/`

ローカル資源復帰後は `INTEGRATION_NOTES.md` に従い、既存の全体設計との差分を確認する。


## 10. 2026-09-19 15:16 JST 停止チェックポイント

ユーザー指示により、この地点でセッションを停止する。

### 最新状態

- `ROADMAP.md` を新設し、全体Phase・区切り条件・チェックポイント規則を固定。
- 現在位置: **Phase 2B → Phase 2C 移行確定**
- `data/attested-examples.json`:
  - total: 42
  - source-checked: 42
  - context-checked: 0
  - human-confirmed: 0
  - 『伊勢物語』: 33
  - 変体仮名字形: 38
- 公式字形ページHTMLから、個別出現の page / occurrence ID / X / Y を直接列挙できる取得経路を確認。
- 『伊勢物語』では比較可能な Stage A セットが成立済み。
  - 例: ね / 字母「年」
    - 国文研本 U+1B094 𛂔: 10例
    - 嵯峨本 U+1B092 𛂒: 8例

### 再開地点

次回は Stage A の大量追加から再開しない。

1. `ROADMAP.md` を読む
2. 本 `HANDOFF.md` を読む
3. `SESSION_CHECKPOINT_2026-09-19_PHASE2.md`
4. `VIEWER_EXTRACTION_NOTES.md`
5. `data/attested-examples.json`

を確認し、**Phase 2C の最初の `context-checked` 1件を作ること**から再開する。

初回候補:
- 『諸国方言物類称呼』巻五
- すでに Stage A として登録済みの実例
- 公式翻刻TXTと原画像を同一底本で照合し、対象字形と翻刻文字を厳密に対応させる

最初の区切り:
- `context-checked = 1` 達成時点でチェックポイントを更新する。


## 11. 2026-09-19 GitHub/Web-only 継続チェックポイント

Work の資源枯渇中につき、依頼者の指示で **本セッションではローカルを一切触らない**。
`C:\Users\user\AI開発\koten` は参照・変更とも行わず、当面は GitHub `yama-books/koten` の `main` を正本として作業する。
公開Web資料は調査・検証のために併用する。

### 現在値

`data/attested-examples.json`:
- total: 44
- source-checked: 44
- exact-text: 5
- context-checked: 0
- human-confirmed: 0
- 変体仮名字形: 39
- 『伊勢物語』: 33

現在位置は **Phase 2C-2 / 最初の context-checked 1件を作る工程** のまま。
Stage A の大量追加へは戻らない。

### 最初の原画像確認候補

`att-brsk005-u1b012-brsk005-009-id0346-x0474-y2151`

- 資料: 『諸国方言物類称呼』巻五
- 丁: 4オ
- 字体: U+1B012 / 𛀒 / え / 字母「衣」
- viewer page: `brsk005-009`
- occurrence: `ID0346`
- 座標: X=474, Y=2151
- exact-text: 「正字とは見えず」の「え」
- word: 「見えず」
- previous_char: 「見」
- next_char: 「ず」

同一底本の国語研公式翻字と、字形DBの個別出現は一意対応済み。

### 本セッションで確認した原画像経路

国語研の公式公開経路として次を確認した。

- 巻五資料ページ:
  `https://dglb01.ninjal.ac.jp/ninjaldl/show.php?issue=005&title=buturuisyoko`
- 巻五 IIIF manifest:
  `https://dglb01.ninjal.ac.jp/ninjaldl/buturuisyoko/005/manifest.json`
- 公式翻字:
  `https://www2.ninjal.ac.jp/textdb_dataset/brsk/txt/brsk-005.txt`

国語研のIIIF一覧に巻五 manifest が正式掲載されていること、資料ページ側で画像・翻字の公開と CC BY 4.0 表示があることを再確認した。

ただし現在のチャット実行環境では、manifest / JPG の**画像ピクセルそのものの取得・表示が安定せず**、原画像の筆線を視認して `renmen` を判定できなかった。
これは資料不存在ではなく、このセッションの取得環境上の制約として扱う。

### 判定

- `renmen` は推測せず `unknown` を維持。
- `review_status` は `source-checked` のまま。
- `context_alignment_status` は `exact-text` のまま。
- `context-checked` は 0 件のまま。
- `attested-examples.json` 自体には変更を加えていない。

### 次の再開点

1. Stage A は増やさない。
2. 上記4オの原画像ピクセルを表示できる経路を確保する。
3. `brsk005-009 / ID0346 / X474 Y2151` の対象字体と周辺筆線を直接確認する。
4. 連綿・接続状態を画像で確定できた場合だけ `renmen` を更新する。
5. 矛盾がなければ `context_alignment_status: exact`、`review_status: context-checked` へ昇格する。
6. `context-checked = 1` 到達時に ROADMAP / HANDOFF / チェックポイントを即更新する。

画像を直接確認できない環境では、OCR・別伝本・推測による代用を行わない。


### 2026-09-19 15:34 JST 追記: 原画像取得経路成立

GitHub/Web-only 継続中。ローカルは引き続き一切触っていない。

Phase 2C-2 の初回候補:
`att-brsk005-u1b012-brsk005-009-id0346-x0474-y2151`
（『諸国方言物類称呼』巻五4オ、「正字とは見えず」の「え」）

#### 原画像取得の進展

国語研公開画像について、サムネイルだけでなく高解像度JPEGへの直接経路を確認した。

- サムネイル:
  `https://dglb01.ninjal.ac.jp/ninjaldl/buturuisyoko/005/s/brsk005-009s-.jpg`
- 高解像度本文画像:
  `https://dglb01.ninjal.ac.jp/ninjaldl/buturuisyoko/005/jpg/brsk005-009.jpg`

Google Slides の `createImage` を経由すると、この高解像度JPEGを取得・レンダリングできることを実測した。
高解像度画像は 1620×2500 px として取得できた。

これにより、前回の「current-tool image retrieval unavailable」という阻害要因は解消方向へ進んだ。

#### 現在位置

- exact-text: 5
- context-checked: 0
- 現在の作業: 高解像度4オ画像上で対象位置を拡大し、対象字体と周辺筆線、`renmen` を直接確認する
- 次の区切り: `context-checked = 1`

まだ画像判定は完了していないため、`attested-examples.json` の昇格は行っていない。


## 12. Phase 2C-2: context-checked 1件達成

GitHub/Web-only、ローカル非接触のまま最初の context-checked を成立させた。

対象:
`att-brsk005-u1b012-brsk005-009-id0346-x0474-y2151`

『諸国方言物類称呼』巻五4オ、「正字とは見えず」の「え」。
Phase 2C-1 で字形DB occurrence と公式翻字の一意対応は済んでいた。
今回、国語研高解像度本文画像 `brsk005-009.jpg` を取得し、原画像上で U+1B012 𛀒 を同定した。

対象字形から後続「ず」へ連続する筆線を視認したため:
- `renmen: true`
- `context_alignment_status: exact`
- `review_status: context-checked`

とした。

これはAI/モデルによる画像文脈確認であり、人間確認ではない。
`human-confirmed` は 0 件のまま。

### 次

同じ取得経路で exact-text 残り4件:
- 6ウ「見えない」
- 7オ「見えたり」
- 16ウ「見えたり」
- 9ウ「たえ」

を原画像確認し、次の区切り `context-checked = 5` を目指す。


## 13. Phase 2C-2: context-checked 5件達成

ローカル非接触のまま、Phase 2C-1 exact-text 5件をすべて原画像確認し Stage B へ昇格した。

現在:
- total: 44
- review_status=source-checked: 39
- source-checked以上: 44
- alignment exact-text: 0
- alignment exact: 5
- context-checked: 5
- human-confirmed: 0

5件はいずれも『諸国方言物類称呼』巻五。
4件は U+1B012 𛀒、1件は U+3048 え。
各ページの国語研高解像度JPEGを直接画像確認し、対象字形と公式翻字の対応および連綿を確認した。
5件とも `renmen=true`。

### 次

ROADMAPの偏り制約に従い、次の context-checked 5件は
- 別字体
- 可能なら別witness
- 前・中・後の複数位置

を含める。
まず『伊勢物語』Stage A 33件から、原画像と本文を同一witnessで対応できる候補を選ぶ。


## 14. Phase 2C MVP区切り: context-checked 10件達成 / 製品化へ移行

一次公開を優先する方針に従い、Phase 2C のMVP区切り `context-checked=10` を達成した。

### 現在値

`data/attested-examples.json`:
- total: 49
- review_status=source-checked: 39
- source-checked以上: 49
- alignment exact: 10
- exact-text以上到達: 10
- context-checked: 10
- human-confirmed: 0
- 変体仮名字形: 44
- 『伊勢物語』: 33

### 今回追加した5件

資料: 『比翼連理花廼志満台』初編上（hnsd001）
字体: U+1B094 / 𛂔 / ね / 字母「年」

- 2ウ / hnsd001-014 / ID0052 / X1142 Y718 / 「くらしかねたる」
- 3オ / hnsd001-015 / ID0119 / X1611 Y1645 / 「むね」
- 8ウ / hnsd001-026 / ID0111 / X522 Y1719 / 「かねて」
- 13ウ / hnsd001-036 / ID0103 / X1181 Y1131 / 「むね」
- 15オ / hnsd001-039 / ID0054 / X627 Y2254 / 「むね」

国語研公式翻字 `hnsd-001.txt`、IIIF manifest、同一底本原画像を照合した。
2ウ・15オは同丁に「ね」が複数あるため原画像周辺本文で一意化。
3オ・8ウ・13ウは同丁の「ね」が各1箇所で、対象 U+1B094 出現も各1件のため一意対応。

全5件で原画像上の対象字体と周辺を確認した。
連綿は true/false の二値判定を安全に行えないため `renmen: unknown` とし、
notes/evidence に「未確認ではなく、画像確認済み判定不能」と明記した。

### 技術的突破

長大な国語研公式TXTがWeb取得層で1行化される問題を、短命のGitHub Actions取得ブリッジで解消。
公式TXTをUTF-8・改行正規化して取得し、IIIF manifestも同じ経路で取得できた。
manifestから画像ページと丁ラベルの対応を機械的に確定した。

### 方針転換

ここから Stage A / context-checked の追加収集を主工程にしない。
一次公開MVPの工程へ移る。

次:
1. 既存UI・試作・データ接続の監査
2. 字体・字母クイズのMVP教材データ生成
3. context-checked 10件から公開対象例を絞る
4. 公開対象例のみ human-confirmed 手順へ
5. 字体詳細・実例・読解UIへ接続
6. 出典・ライセンス・フォント・モバイル/PC QA
7. 一次公開

ローカル非接触方針は引き続き維持する。


## 15. 一次公開準備版 0.5 / UI・公開ゲート実装

Phase 2C のMVP区切り後、そのままPhase 4・5へ移行した。

### 実装

`index.html` を旧 prototype 0.4 から一次公開準備版0.5へ更新。

- 「あ・い・う・え」16字の直書きDATAを撤廃
- Phase 1由来の軽量UIキャッシュ `data/ui-glyph-master.json` を使用
- UI対象: 47音価 / 観察済み変体仮名138字体
- 字形を見る
- 字母クイズ
- 書いてみる
- 実資料を読む
の4タブを実装

「書いてみる」は原文維持を初期値とし、利用者が字体を選ぶ。
ランダム変換や「歴史的に正しい字体」の自動推薦は行わない。

### 実資料公開ゲート

「実資料を読む」は `review_status === "human-confirmed"` だけを表示する。
現在 human-confirmed=0 のため、context-checked 10件は公開教材として表示されない。

一次公開候補5件を:
`PUBLICATION_REVIEW_QUEUE.md`
に固定した。

### QA

`PUBLICATION_QA.md` 作成。

確認済み:
- index.html JavaScript構文 PASS
- UIキャッシュ 138字体 / 47音価 / 必須項目欠落0
- 一次公開候補5/5件がcontext-checked + exact
- 5/5件に文字・語・翻字・原画像直リンクあり
- 5/5件のwitnessがsources.jsonに存在
- context-checked 10件のsource_image_refを対象ページ原画像直リンクへ統一

### 現在のボトルネック

コード側の主要MVP機能は成立。
一次公開に残る必須作業は人間QA。

1. 公開候補を原画像・翻字・表示で人間確認
2. 最低3件、推奨5件を human-confirmed へ昇格
3. PC実ブラウザでフォント・4タブ操作確認
4. モバイル幅確認
5. GitHub Pages実配信・典拠リンク確認
6. 公開版表記へ更新して一次公開

GitHub/Web-only・ローカル非接触方針は維持。


## 16. 2026-09-19 21:06 JST 一時停止

チャット／ツール実行が硬直気味になったため、依頼者指示で一時停止。

詳細:
- `SESSION_CHECKPOINT_2026-09-19_2106_PAUSE.md`

停止時点:
- Phase 2C MVP区切り: **context-checked 10件達成済み**
- total 49 / exact 10 / context-checked 10 / human-confirmed 0
- 一次公開UI 0.5〜読解UI 0.6 実装済み
- 公開候補5件は `PUBLICATION_REVIEW_QUEUE.md` に固定済み
- 公開面は human-confirmed のみ表示する安全ゲート実装済み
- JavaScript構文検査 PASS
- 一次公開までの進捗概算: **約80〜85%完了 / 残り約15〜20%**

再開は研究追加ではなく、公開候補P1〜P5の人間確認と実ブラウザQAから行う。


## 17. 2026-09-19 人間確認完了 / UI 0.7

一次公開候補P1〜P5の人間裁定を完了。

### 判定

- P1: human-confirmed / publication approved
- P2: human-confirmed / publication approved
- P3: human-confirmed / publication approved
- P4: human-confirmed / publication approved
- P5: publication excluded / context-checked維持

現在:
- total 49
- context-checked 6
- human-confirmed 4
- rejected 0
- publication approved 4
- publication excluded 1

一次公開MVPの最低3件ゲートは達成。

### 重要なデータモデル変更

人間確認を通じ、原資料中の手書き字形とUnicodeフォントの代表字形を完全一致させることを公開条件にしない方針へ変更した。

- `glyph_id / character`: 国語研字形DB上の代表字体ID
- `human_confirmation_scope: kana-jibo-context`: 読み・字母・翻字対応・教材表示を人間確認
- `human_confirmation_scope: exact-glyph`: Unicode字体まで厳密同定する場合のみ使用
- `publication_status: approved | excluded | pending`
- 公開ゲート: `human-confirmed && publication_status=approved`

P1/P2はともに「え」・字母「衣」として承認。
P2の旧 rejected は撤回し、P1と同一基準で publication approved とした。

### UI 0.7

- 「この字体は何と読む？」→「この資料では何と読む？」
- フォント字形は「対応字体の代表表示」と明記
- 原資料の手書き筆跡とフォント代表字形は完全一致しない場合がある旨を表示
- 読解表示は `human-confirmed && publication_status=approved` のみ

### 次

研究追加へ戻らず、公開QAを続行する。

1. index.html 0.7 JavaScript構文再確認
2. PC実ブラウザでフォント・4タブ操作
3. モバイル幅レイアウト
4. GitHub Pages実配信
5. 典拠リンク遷移
6. 一次公開


## 18. 一次公開RC / UI 0.8

詳細チェックポイント:
- `SESSION_CHECKPOINT_2026-09-19_PUBLICATION_RC.md`

現在:
- publication approved 4件
- publication excluded 1件
- rejected 0
- UI 0.8
- JavaScript構文 PASS
- strict publication gate PASS
- Webフォント読込診断実装済み
- 一次公開まで概算 約92%

残りはPC・モバイル・GitHub Pagesの実ブラウザQAと、公開版表記への変更。
研究追加や人間裁定追加は一次公開の必須工程ではない。


## 19. UI 0.9 / Pages JSONフォールバック

実ブラウザでWebフォントは正常、JSON取得のみ失敗する症状を確認。
UI 0.9で公開に必要なデータをHTML内へ軽量フォールバックし、
JSON失敗時も表示できるよう修正。

- 138字体
- publication approved 4件
- 必要な2witness情報

を内蔵。通常は外部JSON優先。
右上に教材データ状態を表示。
JavaScript構文PASS。


## 20. RC2 / 書いてみる濁音・拗音対応

実ブラウザ確認で、清音は変換できるが濁音「で」と小書き「ょ」等が候補化されない問題を確認。

修正:
- 濁音・半濁音: 清音字体 + 結合濁点／半濁点
- 小書き仮名: 対応基本仮名の字体を縮小表示
- 小書きは現代的表示補助であり、歴史的再現ではない旨を明記
- 原文保持初期値・利用者選択式は維持

現行 index.html: 一次公開準備版 1.0 RC2
JavaScript構文PASS。


## 21. RC3 / 通常の平仮名を一覧へ追加

「字形を見る」で、各音の通常の平仮名を字母付きで先頭表示するよう変更。
変体仮名ではないことが分かるよう、別背景色・「通常の平仮名」バッジ・注記を追加。
47音すべてのフィルタを表示し、変体仮名観察例がない音でも通常仮名を確認できる。

現行 index.html: 一次公開準備版 1.0 RC3
JavaScript構文PASS。


## 22. ブランチ運用変更 — vintage-kana-main

2026-09-20以降、`vintage-kana/` 関係の作業は専用集約ブランチ
`vintage-kana-main`
で行う。

運用ルール:
- `main` へ直接pushしない
- `main` をforce-pushしない
- 他ブランチを削除しない
- 他ブランチをforce-pushしない
- 既存の `vintage-kana-*` ブランチ群は保持
- PRを作る場合のマージ先は `vintage-kana-main`
- koten本体チームが必要に応じて `vintage-kana-main` から `main` へ取り込む
- 今後のHANDOFF / QA / ROADMAP / index.html / data更新も原則 `vintage-kana-main` 上で行う

この変更以前に vintage-kana の作業コミットが `main` に入っているが、
今後はその履歴を巻き戻さず、現時点の `main` を基点として
`vintage-kana-main` を作成し、以後の変更を分離する。


## 23. vintage-kana-main ブランチプレビュー

main を触らずに専用ブランチの現行UIを確認するため、branch直結のHTMLプレビューを使用する。

開発用プレビュー:
`https://raw.githack.com/yama-books/koten/vintage-kana-main/vintage-kana/index.html`

用途:
- `vintage-kana-main` の最新 `vintage-kana/index.html` を確認
- main / GitHub Pages本番へ反映前のブラウザQA
- RC更新の都度このURLを再利用可能

注意:
- これは第三者のGitHub raw HTML表示サービスを経由する開発プレビュー
- 正式公開URLではない
- 正式公開は koten本体側が `vintage-kana-main` を main へ取り込んだ後に GitHub Pages で確認する
- プレビューで外部JSON取得に失敗しても、RC3にはHTML内蔵fallbackがあるため教材表示は継続する

現行ブランチUI:
- 一次公開準備版 1.0 RC3
- 通常の平仮名＋字母カード
- 変体仮名カード
- 濁音／半濁音／小書き仮名対応
- 実資料画像表示
- publication approved 4件のみ読解教材に表示

今後の書込み先は必ず `vintage-kana-main`。


## 24. 2026-10-01 記録画面のグラフ表示・登場アニメーション（Claude Code）

この節は origin/main 上の作業記録。§25〜§69 の詳しい記録は `vintage-kana-main` ブランチの HANDOFF にある
（記録画面の現行版は main 側が新しいため、origin/main `583780a` から作業した。ブランチ `vintage-kana-record-graph-20261001`）。
活用ノート（conj）の記録画面（conj/HANDOFF.md §45、PR #69）のグラフ表示と登場アニメーションを当てはめた。
`prototypes/cinematic-motion-v1/` は文字作成画面用の別の試作で、今回は対象外（ユーザー確認済み）。

### ユーザー裁定（比較モックで決定）
- 全体の習熟度バーを追加。値は「正答率×取り組み範囲」で、正答率は**字形ごとの直近5回**。分母は出題され得る全字形（266）、未着手の字形は0、表示は切り捨て。
  100%は「全字形を解き、どの字形も直近5回がすべて正解」のときだけ。累計の正答率は、誤答が1つでもあると100%に届かないため不採用。
  行の輪と同じ考え方（全字形の習熟度の平均）は、伸びにくいため不採用。
- 行ごとの「要確認」の文字列は廃止し、弱い行・弱い字形を枠と地色で強調する（conj と同じ規則：3問以上解いたもののうち習熟度の低いものを、3つに1つの割合で最大3つ。並び順は固定）。
- 未着手（0問）は、行・字形とも破線の空の輪に「未」。
- 行を開いたときに、その行の字形の輪も描く。
- 既存の不具合（375〜430px で行を開くと、字形カードが最小幅約96pxのまま列に入りきらず重なり、右端が切れる）も直す。
- 比較モックは `D:\dev\vintage-kana-record-graph-compare-20261001.html` に退避（リポジトリ外。`vintage-kana/prototypes/` に置けば `../index.html` を iframe で読んで動く）。

### 実装（`vintage-kana/index.html`、表示とアニメーションのみ）
- 全体の習熟度：`overallMasteryPercent()`。直近の回数は1〜5回なので60を掛けて整数で足し、浮動小数の誤差で100%を割らないようにした。バー（`.recordMastery`）は1本のバーと％だけ。4分の1ごとの目盛りは塗りの下。
- 弱い項目：`weakRecordItems()`。行は `rowMastery` の％、字形は `computeGlyphMastery` の値で比べ、同値は正答率の低い順。`rowReviewKanas` と `.recordReview` は削除。
- 未着手：行は行内の字形の解答0件、字形は解答0件で判定。`aria-label` は「未着手」。
- 登場アニメーション：`playRecordMotion` ほか（conj と同じ時間・曲線）。動くカードは全体のバー・行（10枚）・字のならび（2本、横スクロールの枠ごと）。行の輪と全体のバーは、カードと同じ遅れで描き始める。数字（ポイント・セット数・解答数・正解数・全体の習熟度）は 0 から数える。PC・iPad（768px以上）は開いた時点で70ms刻み、スマホは IntersectionObserver で見えたものだけ75ms刻み。滑走中のカードは記録の枠（`.quizBox`）の内側で切る（`overflow-x:clip`）。
- 輪は `@property --record-draw`（既定1）を `.ringMeter`／`.glyphMasteryRing` の conic-gradient に掛けた。非対応環境・reduced motion では完成形。
- 字形カード：`.glyphMasteryCard` に `width:100%` を足し、列幅に収めた（列が96px以上の幅では見た目は変わらない）。
- 学習記録の保存形式・集計・書き出しと読み込みは変えていない。新しい色は使っていない（`--accent`・`--ring-track`・`--danger`・`--paper2`・`--accent-border`・`--line` と既存の白）。

### 検査
- `tools/vintage-kana-record-check`（`npm run check:vintage-kana-record`、`--webkit` で WebKit）を追加し、CI と公開許可リストにも載せた。
  見る点：全体の習熟度（確認用記録で7%、全字形が直近5回正解で100%、最後の1回だけ誤答で99%、記録なしで0%）、
  320/340/360/375/390/820/1180/1440px で横スクロールなし（滑走中も）、輪の数と％・ラベルが描画前後で一致、
  未着手（や行・わ行）と弱い行、行を開くと字形の輪を描き、カードが重ならず枠に収まる、字形カードを押すと情報が出る、
  360×640 で画面外のカードは待機しスクロールで出る、reduced motion で開いた時点から最終状態。
  修正前のカード幅に戻すと 375px で失敗することを確認した。
- Chromium・WebKit とも通過。npm test（Node 929/929、Vitest 398/398）、lint、typecheck、build 後の scan:publish（767件・違反0）、check:eol（違反0）、git diff --check。
- Jev：jev_verify で完了主張9件すべて verified（contradicted 0・unsupported 0）。ファイル探索は決定的検索で足りたため jev_find は使っていない。
- 実機の iPhone・iPad・Safari は未確認（WebKit ヘッドレスで代替）。

### 追補：PC・iPad の行カードの大きさ（同日・ユーザー指示）
- 721px以上の行カードは画面幅に応じて 111〜183px 角になるのに、輪は 84px・行名は 16px で固定だったため、広い画面で余白が過剰だった。
  閉じた行カードをコンテナ（`container-type:inline-size`）にし、輪を `clamp(64px,62cqi,116px)`、行名を `clamp(16px,10.5cqi,20px)`、％を `clamp(13px,10cqi,19px)` にした。輪の内側の白は輪の76%。
  実測：721px 68px／820px 80px／1024px 105px／1180・1440・1920px 112px（行名 16→19px）。cqi 非対応の環境では従来の 84px・16px。
- 修正前から 721px 付近（iPad mini 縦など）では、84px の輪がカードに収まらず楕円に潰れていた。輪に `flex-shrink:0` を付け、下限を 64px に下げて円のまま収めた。
- 開いた行の見出しは、行名と輪が両端に離れて中央が大きく空いていたため、左にまとめた（行名 18px）。
- 検査に 721×900 を加え、全幅で「行の輪が円のまま（縦横差1px未満）カードの中に収まる」ことを確かめる。修正前の指定に戻すと 721px で失敗する。Chromium・WebKit とも通過、npm test・lint・typecheck・scan:publish・check:eol も通過。
## 25. 2026-10-06 cinematic版：閃光中の字形切替と欠字グリフ対策

ユーザー実機確認で、白い世界の「ゴゴゴゴゴ」中に閃光より先に変換後の字形が見えること、
および切替瞬間に一瞬「□に×」の欠字グリフが出ることを確認。

原因:
- `vintage-kana/index.html` の phase 5 で、字形差し替えが `p > .43` だった一方、
  閃光の立ち上がりは約 `p = .70` 以降で、変換後の字形が白世界で先に露出していた。
- forward変換では Noto Serif Hentaigana の対象字形が未ロードの場合、
  差し替え直後だけfallback fontに字形がなく欠字表示になる可能性があった。

修正（ブランチ `vintage-kana-flash-fix-20261006`）:
- 差し替えを `p > .88` に移し、ほぼ不透明な閃光＋旧字形がほぼ消えた区間でのみ行う。
- 差し替えフレームでは一度 opacity=0 として、文字列・font-familyの切替を視認不能にする。
- play開始前に、今回使う変体仮名の実字形を `document.fonts.check/load` で先読みする。
- 他の動き、配色、変換ロジックは変更しない。

作業中の枝運用メモ:
- 最初に誤って main へ修正コミット `6abdf90c` を入れたが、直後に `ce7775a9` で
  index.html を完全に元の blobへ復帰した。main の機能差分は残っていない。
- 実修正は `vintage-kana-flash-fix-20261006` に置き直した。
### 公開完了（2026-10-06）

- 修正PR: #88 `vintage-kana: 閃光中に字形を切り替え、欠字グリフを防ぐ`
- main マージコミット: `f20edd426ea3ccde45af96bffcca2d909baad897`
- Deploy Pages: run `37433905081`、build / deploy とも success。
- Pages artifact `github-pages` は head SHA `f20edd426ea3ccde45af96bffcca2d909baad897` から生成され、deploy済み。
- `main` の `vintage-kana/index.html` で `p > .43` の早期切替が消え、`p > .88` の閃光内切替、切替フレーム `opacity=0`、対象変体仮名字形の事前 font load を再確認。
- HTML内JavaScript構文、typecheck、lint、npm test、data:check、build、Hentaigana Life health check、font / font-assets / font-weight は成功。
- 共通CIの `check:overflow` は今回変更前の main（`07bdb9d9`）でも同じ箇所で失敗している既知ベースライン不具合。今回の修正由来ではない。

これにより、今回の2件（閃光より前に字形が変わる／切替瞬間の欠字グリフ）は公開処理まで完了。


## 2026-10-12 VK-04 習熟度リング版への採用変更

- **最終UI裁定**: シンプル版は横長A案（円＋「習熟度」）。詳しい版は「習得する」ボタンの**内側**に小さな円グラフと数値を表示する。「習熟度」の追加ラベルを詳しい版には出さない。
- 2つのページは新設の `vintage-kana/mastery-summary.js` で**同一の集計関数**を参照し、`vintage-kana/data/ui-glyph-master.json` の全字形を分母に、各字形の直近5問の正答割合を合算・端数切り捨て。記録のキーは従来の `vintage-kana:learning-events:v1` を維持。
- 表示: 記録なしは「未」、記録あり正答なしは「0」、マスターデータ未取得は「…」。シンプル版・詳しい版とも端末内の同一記録を参照する。
- **ボタンとリングは意味上別の操作**。詳しい版では「習得する」の文字を押すと練習へ、同じ楕円内のリングを押すと記録へ進む。ボタンの入れ子は使わず、同じ枠に2つのbuttonを入れた。リングはキーボード操作に対応し、aria-labelに意味を持たせる。
- シンプル版の円＋「習熟度」は `detail.html#record` に遷移し、既存のデータ読み込み後の深いリンクが記録を開く。
- 記録イベントの保存・履歴・既存の正答率ロジック・2026-10-06修正の閃光字体切替は変更しない。
- 実施した静的検証: 2つのHTMLのinline script＋共通scriptの構文PASS、導線のソース回帰テスト4件PASS、習熟度計算fixture 44%・80% PASS。**新しいNodeテストファイルはCIに追加したが、GitHub Actions/Playwright/スマホでの成功判定はまだしていない。**
- 新規テスト: `tests/unit/vintage-kana-mastery-summary.test.ts`。更新: `tests/unit/vintage-kana-record-route.test.ts`。
- 正本の `main` は変更せず、作業ブランチ上でPRレビューとWebKit/小画面のQAを経て公開判断する。

## 2026-10-12 追加要望：VK-08 文字入力式100〜200問の計画（コンテンツ別セッション）

- **ユーザーの新規要望**: 文字入力で答える問題を**100〜200問程度**追加したい。
- **問題コンテンツは別のChatGPTセッションに委任**。このセッションは出題・入力・採点ロジック、データ受入、テスト・監査の準備を扱う。**問題本文・正答はまだ受領していない**。
- 既存の読み方・字母の文字入力モードと、追加100〜200問の関係は**未決定**。内容を受領してから既存機能拡張か別クイズかを決める。
- 問題ID、設問、正答、別解・典拠、歴史的仮名遣い／異体字の扱い、IME対応、履歴・習熟度への連動について受入仕様を策定する。
- **状態：計画への登録のみ、未実装・未公開。** PR #91の機能変更には含めない。
- 再開指示: **`AUDIT_AND_IMPLEMENTATION_PLAN_2026-10-12.md` §9（VK-08）を確認し、別セッションから問題データの引継ぎを受けて具体化する。**

## 2026-10-13 VK-01 進行中：前半アニメーションの境界補間
- `main` `9c35434` 起点の作業ブランチ `vintage-kana-motion-continuity-vk01`、未公開。
- `vintage-kana/motion-seam.js` と本番 `index.html` / 試作 `prototypes/cinematic-motion-v1/index.html` に第1・2相→第4相、第4相→第5相の連続補間を実装中。古い演出と閃光字体差替えは保持。
- 本タスクの計測・受入条件は [`VK01_MOTION_CONTINUITY_2026-10-13.md`](./VK01_MOTION_CONTINUITY_2026-10-13.md) を参照。**まだマージ・公開しない**。

### 2026-10-13 VK-01 停止チェックポイント
- ユーザー指示により、これ以上作業を進めず記録して停止。
- 作業ブランチ `vintage-kana-motion-continuity-vk01` の記録開始HEAD: `c869a66fe284e103f615b58c38ac15df4256165b`。第1・2→4相、第4→5相の連続補間と全10モード検査をコードへ反映済み。
- 先行専用QA run `38289784395` 成功。最新拡張版 run `38290192240`、共通CI `38290192277` は確認時点で実行中。**最新HEADはまだ最終合格未確定**。
- 詳細なコード、検証経過、既知の不具合・修正、未完了QA、次回の再開順序は [`VK01_MOTION_CONTINUITY_2026-10-13.md`](./VK01_MOTION_CONTINUITY_2026-10-13.md) 最終節を参照。
- **mainへのマージ・Pages公開なし**。百人一首の `check:overflow` 修復は別セッション。

## 2026-10-13 VK-01 再開追補（過去の停止指示に対する後続記録）
- VK-01作業ブランチ `vintage-kana-motion-continuity-vk01` は停止HEAD `c3c4f612` 以降に補間緩和コミット `a7b654d5` が追加済み。第5相460ms補間と3次easeInOut、42ms速度減衰を使用。
- `a7b654d5` の専用QA [38290594194](https://github.com/yama-books/koten/actions/runs/38290594194) はChromium/WebKitとも10モードPASS。習熟度リング回帰 [38290594216](https://github.com/yama-books/koten/actions/runs/38290594216) もSUCCESS。従前の失敗 [38290192240](https://github.com/yama-books/koten/actions/runs/38290192240) は `front-side-random` / 1280px / forward / 第4→5相64msの移動170.293px。
- 残る確率依存の問題を捕捉するため `944bb433` でテストをモード別5条件（合計50/ブラウザ）・再現可能なseedへ変更。`9fd07b82` で大振幅の単体回帰ガードを追加。**最新の拡張QA [38312939198](https://github.com/yama-books/koten/actions/runs/38312939198) の最終結果は未確認**。これに合格するまで完了扱いにしない。
- PRは新規に重複作成せず既存[ドラフト #93](https://github.com/yama-books/koten/pull/93)を継続。mainは別PR #94を含む `ace435ba` へ進んでおり、レビュー時に差分・衝突の確認が必要。
- 百人一首のoverflow既存6件とVK-08は別担当。閃光字体切替 `p>.88`、フォント事前読み込み、習熟度リング、公開入口URLを維持。**マージ・公開禁止を維持**。
- 次の担当: 拡張QAの Chromium/WebKit 50ケースのログを確認 → 失敗時は数値・seedで再現して原因修正 → 再検査 → PR #93に受入結果追記。未実施: 実映像・スマホ実機Safari・フレーム落ちの評価。

### 2026-10-13 VK-01 機械QA完了チェックポイント
- 最新コード `9fd07b82`、再開後の拡張実ブラウザQA [run 38312939198](https://github.com/yama-books/koten/actions/runs/38312939198) が **SUCCESS**。10モード×5条件×Chromium/WebKit=100ケース全PASS、両相境界を検査。X最大112.91px、Y最大112.98px（最初80ms、閾値130px据え置き）。大距離806.25pxのユニットテストもPASS。
- 習熟度リング [38312939203](https://github.com/yama-books/koten/actions/runs/38312939203) もSUCCESS。実装ファイルおよび字形切替・フォント読み込みの処理は変更なし。
- PR #93はドラフトのままレビュー可能。mainは独立に進んでいるので統合時の差分確認必須。百人一首overflowとVK-08は別担当。**マージ・公開なし**。
- 未完了の人確認: iPhone/iPad Safari実機で映像の自然さとfps、スキップ・入力復帰・白背景可読性の目視評価。機械QAと実機受入を混同しない。

### 2026-10-13 VK-01 公開統合前の差分裁定
- 最新mainはPR #94（解読）・PR #95（iPhoneキーボード修正）まで反映済み。VK-01の正式入口 `index.html` をmain正本へ8箇所の変更を適用する形で統合し、両PRの仕様・データ・演出前処理を維持。
- このHANDOFFはmainで並行して追記された内容を正として、VK-01の一連の監査・試験結果を末尾へ追補した。過去の「マージ・公開禁止」は公開許可前の履歴記録であり、現在のユーザー公開指示によりゲートが解除された。
- 実機Safariでの人による映像印象・描画負荷の評価は未実施であり、公開後の確認項目として引き続き保持。

## 2026-10-13 17:58 JST VK-01 公開完了・作業停止チェックポイント
- **本件の状態: 公開反映完了、ユーザー指示により作業停止。** この節は公開許可後の最終記録。前節までの「未公開」「マージ禁止」は当時の履歴であり現時点には適用しない。
- **対象:** 変体仮名メーカーの第1・2相→第4相、および第4相→閃光（第5相）の動きの境界連続補間、全10モード。修正先は `vintage-kana/index.html`、`motion-seam.js` 等。検査の詳細は [VK01_MOTION_CONTINUITY_2026-10-13.md](./VK01_MOTION_CONTINUITY_2026-10-13.md)。
- **正本とマージ:** [PR #93](https://github.com/yama-books/koten/pull/93) を `main` にマージ済み。マージコミット `a1c031dea8a1393701443522193ef22f0b540cc0`。PR #94（解読）・#95（iPhoneキーボード修正）との `index.html` 競合を先に解消して両機能を保持。VK-01のソース/資料はこのマージコミットに含まれる。
- **公開証跡:** [Deploy Pages run 38314811317](https://github.com/yama-books/koten/actions/runs/38314811317) は **completed/success**、build・deployとも **success**、head SHAは `a1c031de...`。[共通CI run 38314811259](https://github.com/yama-books/koten/actions/runs/38314811259) も **completed/success**。公開URL: https://yama-books.github.io/koten/vintage-kana/ 。ただし公開HTMLの独立直接取得による突合までは実施していない。
- **機械QA:** [run 38312939198](https://github.com/yama-books/koten/actions/runs/38312939198)で Chromium 50/50、WebKit 50/50、全100ケースPASS（両相境界）。最初80ms未満のdx最大112.91px、dy最大112.98px、閾値130px以下。習熟度回帰 [38312939203](https://github.com/yama-books/koten/actions/runs/38312939203) SUCCESS。字形差替え `p>.88` と `ensureMotionTargetFont()` を保持。
- **17:58 JST 時点のリポジトリ:** `main` は別作業のPR #96まで進み `7792859cbdab0f5e63da4b5eaabd6bf859c83864`。この最新状態を巻き戻さず、VK-01は完了案件として扱う。ローカルの未コミット変更はこのセッションでは検証していない。
- **残る実機観察（新規コード変更を意味しない）:** iPhone/iPad Safariでの動きの自然さ、白背景での字形可読性、fps/フレーム落ち、スキップ・文字入力への復帰、iPhoneキーボードの挙動。WebKitヘッドレスの成功は実機保証ではない。
- **再開時:** まずその時点の `main` と本節以降のHANDOFFを確認する。実機で退行を確認した場合のみ別タスク・別ブランチで修正し、CI/Pagesの証跡を残す。**本セッションではここで停止し、追加の実装・デプロイは行わない。**

## 2026-10-13 VK-02 実装再開（技術検証PoC、未公開）
- **前件VK-01は完了済み**。2026-10-13 17:58 JSTの停止チェックポイントを踏まえ、新しいユーザー指示「次に進めてください」に従い**計画Step C / VK-02 動画保存**へ進んだ。VK-01再実装は行わない。
- 正本基点: `main` `039063230233037973f5db5f1cfee43b6d45d1a7`（PR #97まで）。作業ブランチ `vintage-kana-video-export-vk02-poc-20261013`。
- `vintage-kana/index.html` は DOM要素・CSS/WAAPIで動作し、そのままCanvas/MediaRecorder録画できないことを静的に確認。画面共有はiOS Safari非対応。ブラウザの選択を曖昧にせず、両方向のCanvas録画・拡張子判定・キャンセルを**隔離PoC**として `tools/vintage-kana-video-poc/` に実装。
- 検査: `tests/unit/vintage-kana-video-export.test.ts` を追加。録画APIの形式判定/非対応/取消・UI非混入等の回帰を登録。**実ブラウザで実動画を生成したという意味ではない**。
- 設計・検証ゲート・未実施項目: [VK02_VIDEO_EXPORT_FEASIBILITY_2026-10-13.md](./VK02_VIDEO_EXPORT_FEASIBILITY_2026-10-13.md)。本番の10モードに対する動画録画は**未実装**、公開HTML変更なし、`main`への統合・Pages公開なし。
- 再開時はまずこのブランチと最新 `main` のSHA・競合を確認 → 新設Nodeテストと実ブラウザ PoC（Chromium/WebKit） → DOM/Canvas映像一致を検証してからUI統合。録画失敗時の復帰、実機Safari、動画ファイル本体の再生を優先。


### 2026-10-13 VK-02 実ブラウザ初回合格・DOMミラー試験着手
- 隔離Canvas録画PoCの[専用QA 38379301233](https://github.com/yama-books/koten/actions/runs/38379301233) は SUCCESS。ChromiumでMP4 forward/reverse とキャンセルに成功。WebKit LinuxではMediaRecorderが使えず、非対応表示を確認。
- 720×405pxが720×404pxで符号化されたため768×432pxに改めた。[再検証 38380791924](https://github.com/yama-books/koten/actions/runs/38380791924) SUCCESS。両方向とも768×432/2.81秒のMP4を生成し、デコードした異なる動画フレーム・保存・キャンセルまで確認。
- 次の段階として現行本番アプリを無変更のiframeで読み込み、そこからDOMの文字ポーズをCanvas2Dに再描画する **低忠実度ミラーPoC** を追加した。 `tools/vintage-kana-video-poc/dom-mirror.js` / `dom-mirror.html` / `check-dom-mirror.mjs` とユニットテストを参照。**3D透視・閃光・刻印の正確な映像化は未実装。**
- 実DOMミラーのブラウザ検査と画質差の監査は未判定/継続中。詳細は [VK02_VIDEO_EXPORT_FEASIBILITY_2026-10-13.md](./VK02_VIDEO_EXPORT_FEASIBILITY_2026-10-13.md) 最終節。
- **本番は未変更。** 作業ブランチ `vintage-kana-video-export-vk02-poc-20261013`、[ドラフトPR #98](https://github.com/yama-books/koten/pull/98)。`main`にマージせず公開もしない。次は実DOMミラーのCI結果→画像差分・FPSの実測→レンダラ方式の再判定。


### 2026-10-14 VK-02 DOM/Canvas定量検証完走・再開チェックポイント
- **現在地:** [ドラフトPR #98](https://github.com/yama-books/koten/pull/98) に、隔離の動画録画PoC・実アプリDOMミラー・画素差の自動測定を実装済み。**本番用の動画保存機能は未完成・未公開**。公開済みVK-01とは別タスクであり、前件は再実装しない。
- **確定QA:** [VK-02 run 38485884694](https://github.com/yama-books/koten/actions/runs/38485884694) **SUCCESS**、Node単体7/7 PASS、ChromiumとWebKitで実DOMミラーと画像比較の検証が通過。Chromiumでは両方向のMP4作成/再生/ダウンロード/キャンセルPASS、WebKit LinuxではMediaRecorder非対応表示PASS。WebKitでのMP4録画成功ではない。
- **定量比較:** 同一オリジンiframe上の実アプリに「あ」1文字・front-orbitを与え、比較中のみ入力UIとskipを非表示。768×432へ比較用画像を正規化し、0.9秒/5.5秒をChromium・WebKitで比較。暗部IoUは前半 **0.284 / 0.321**、白化移行 **0.292 / 0.222**（順序 Chromium / WebKit）。初期の入力画面透過による汚染とCanvas/iframeの撮影枠差を除外した数値。それでも文字形状の忠実度は不足。画面全体のRGB誤差だけで合格としない。
- **証跡:** [比較画像とJSON artifact #11860282062](https://github.com/yama-books/koten/actions/runs/38485884694/artifacts/11860282062)（7日保持）。詳細な測定表・処理境界は [VK02_VIDEO_EXPORT_FEASIBILITY_2026-10-13.md](./VK02_VIDEO_EXPORT_FEASIBILITY_2026-10-13.md) 最終節。
- **暫定裁定:** 現行Canvas2Dミラーは**位置・字形データの転送と録画APIの縦断PoCとしてのみ採用**。3D透視、X/Y/Z回転、発光・白化、WAAPI刻印の映像一致を実証できていないため、録画ボタンを本番へ統合しない。まず文字テクスチャ/4×4透視変換を扱う限定WebGLレンダラ等を現行コードから隔離して比較する。全10モード・後半全相への拡張やプロダクション実装はその後。
- **差分管理:** 本記録時のmain `cb6a43ac841bbfa64d4e18033473a8dcc9076d6a` は別作業で進行しており、作業枝の基点 `03906323...` と異なる。main/既存別担当の変更を戻さず、PR #98をドラフトのまま保持する。ローカル `C:\Users\user\AI開発\koten` はこのチャットから直接変更していない。
- **再開順:** PR #98と最新mainの差分確認 → 次の技術的実験（1文字限定の4×4透視・字形ラスタライズ）→ staticでのCanvas/DOM視覚差とfpsの再計測 → 機能採否。WebKitとiPhone Safariを混同せず、実機確認なしに互換性を保証しない。
