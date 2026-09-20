# PUBLICATION_QA

最終更新: 2026-09-19

## 自動・構文検査

- `index.html` inline JavaScript: **PASS（0.7）**
  - GitHub上の現行0.7をV8で構文コンパイル確認
  - current blob SHA: `9991f10a0f153d6501d4b005ab17948d368448ac`
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


## UI 0.8 静的公開ゲート検算

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


### Webフォント診断

UI 0.8でヘッダーに変体仮名Webフォントの読込状態を表示する診断を追加。

表示:
- 「字体フォント: 読込済み」
- 「字体フォント: 未読込」
- 「字体フォント: 読込失敗」
- ブラウザが FontFaceSet API 非対応の場合は「ブラウザ確認不可」

判定対象は `Noto Serif Hentaigana` と U+1B012 の実文字。
JavaScript構文検査: **PASS**。


## UI 0.9 / Pages JSON取得フォールバック

実ブラウザ確認で:
- Noto Serif Hentaigana: 読込済み
- 外部JSON: 取得失敗
- 画面: 「字体データを読み込めませんでした」

を確認。

対策:
- `ui-glyph-master.json` の138字体をHTML内にも軽量フォールバックとして内蔵
- 公開承認4件を読解用フォールバックとして内蔵
- 必要な2witnessの最小source情報を内蔵
- 通常はJSONを優先
- JSON取得失敗時だけ内蔵データへ自動切替
- 右上に教材データ状態を表示
  - `教材データ: 読込済み`
  - `教材データ: 内蔵データで表示中`

現行:
- UI 0.9
- current index blob: `9925b2966e5f65dd560bd1cf4c3a5d8aef02e743`
- JavaScript構文: PASS
- strict publication gate: PASS

これによりPages側のJSON配信不調があっても一次公開MVPは表示可能。


## RC2 / 濁音・小書き仮名

実ブラウザ確認で「書いてみる」に以下の問題を確認。

- 清音「て」は字体候補へ変換できる
- 濁音「で」は候補対象にならない
- 拗音の小書き「ょ」などが字体候補として扱われない

原因:
- UIが `GLYPHS[].kana` と入力文字を完全一致で比較しており、清音1文字だけを対象にしていた。

修正:
- 濁音・半濁音を基本清音＋結合濁点／半濁点へ分解
- 例: `で → て + U+3099`
- 小書き仮名を基本仮名へ対応付け
- 例: `ょ → よ`
- 小書き字体候補はCSSで縮小表示
- 「小書き表示は現代的な補助表現であり、歴史的な小書き慣習の再現ではない」とUIに明記
- 原文保持を初期値とし、利用者選択式は維持

対象:
- 濁音: が〜ご、ざ〜ぞ、だ〜ど、ば〜ぼ、ゔ
- 半濁音: ぱ〜ぽ
- 小書き: ぁぃぅぇぉゃゅょっゎ

検査:
- JavaScript構文: PASS
- `で → て + 濁点` mapping: PASS
- `ょ → よ + small` mapping: PASS
- strict publication gate: 維持


## RC3 / 通常の平仮名カード

「字形を見る」の一覧に、変体仮名だけでなく通常の平仮名も比較用カードとして追加。

表示:
- 通常の平仮名
- 対応する仮名
- 字母
- 「変体仮名ではありません」の注記
- 淡い青灰色の背景で変体仮名カードと視覚的に区別

通常仮名の字母は国語研の対照資料に合わせて保持。
例:
- あ / 安
- え / 衣
- す / 寸
- よ / 與
- れ / 禮
- ゐ / 爲
- ゑ / 惠
- を / 遠
- ん / 无

フィルタは47音すべてを表示し、変体仮名観察例がない音でも通常仮名カードは確認可能。

検査:
- JavaScript構文: PASS
- 通常仮名カード: PASS
- 変体仮名との背景色区別: PASS
- strict publication gate: 維持


## RC4 / 「実資料を読む」を一次公開から延期

実ブラウザ確認の結果、資料ページ全体から対象文字を読ませる方式は、
対象箇所が小さく、初学者向け教材としての負荷が高いと判断した。

一次公開では公開UIから「実資料を読む」を外す。

重要:
- 研究データ自体は削除しない
- human-confirmed / publication approved の判定履歴も保持
- 原画像・翻字・位置情報も保持
- 将来、対象箇所の切り抜き・ハイライト・段階的ヒントが整った時点で再設計する

RC4 公開UI:
1. 字形を見る
2. 字母クイズ
3. 書いてみる

公開HTMLからも、実資料読解用の埋め込みfallbackデータを除去して軽量化した。

検査:
- JavaScript構文: PASS
- 公開タブ: 3件
- `data-view="read"`: なし
- `id="read"`: なし
- `FALLBACK_ATTESTED`: なし
- `FALLBACK_SOURCES`: なし
- 通常仮名カード: 維持
- 濁音／半濁音／小書き対応: 維持


## RC5 / UI説明を中学生向けに簡略化

公開画面の説明文を短くし、専門用語は最小限にした。

追加した基本説明:
- 変体仮名とは？ → 「昔使われていた、今とは形のちがうひらがなです。」
- 字母とは？ → 「ひらがなのもとになった漢字です。たとえば『え』の字母は『衣』です。」

変更:
- タグラインを短文化
- 「対応する仮名で絞り込む」→「読みたい仮名を選ぶ」
- 通常仮名カードの説明を「今ふつうに使うひらがなです。」へ簡略化
- 観察件数表現を「資料で○件見つかっています」へ簡略化
- 字母クイズの問いを「この文字のもとになった漢字は？」へ平易化
- 書いてみる説明を2行へ簡略化
- 専門的な出典説明は「くわしい情報」に折りたたみ

検査:
- JavaScript構文: PASS
- RC5表示: PASS
- 変体仮名説明: PASS
- 字母説明: PASS
- 実資料タブ除外: 維持


## RC6 / 押して読む基礎解説

冒頭の常時表示説明をやめ、小さな開閉ボタン
`？ 変体仮名と字母`
に集約。

開いた中に以下を表示:
- 変体仮名とは？
- いつ使われていた？
- 字母とは？
- 今のひらがなの字母 5例

時代説明:
- 平安時代から明治時代まで、同じ音に複数の仮名字体が使われた
- 1900年（明治33年）に学校で教える仮名字体が整理された

字母例:
- あ ← 安
- い ← 以
- う ← 宇
- え ← 衣
- お ← 於

検査:
- JavaScript構文 PASS
- RC6表示 PASS
- 開閉ヘルプ PASS
- 5例表示 PASS
- NINJAL成立解説リンク PASS


## RC7 / 一覧を字形＋字母だけに簡略化

スマホ確認を踏まえ、一覧画面の内部情報を公開UIから除去。

削除:
- 「通常の平仮名○字体」
- 「変体仮名○字体」
- 「データのある読み○」
- 各カードの「対応する仮名」
- 各カードの出現件数・資料数
- 通常仮名カードのバッジ・注記
- 書いてみる候補の出現件数

表示は全カード共通で
- 字形
- 字母
のみ。

通常仮名は背景色だけで区別し、変体仮名カードと同じレイアウトに統一。

検査:
- JavaScript構文 PASS
- 件数表示なし
- バッジなし
- 対応する仮名表示なし
- 通常仮名の別背景色維持


## RC8 / 読み方クイズ追加

クイズタブを一本化し、内部で「読み方」「字母」を切り替える方式に変更。

- 初期表示: 読み方
- 読み方: 変体仮名を見て、対応する仮名を4択
- 字母: 変体仮名を見て、もとになった漢字を4択
- 正解後は読みと字母を短く表示
- 上部タブ名は「クイズ」

検査:
- JavaScript構文 PASS
- 読み方モード PASS
- 字母モード PASS


## RC9 / 変体仮名メーカーとしてUI再構成

公開時の主目的を「変体仮名で書いてみる」に変更。

UI:
- タイトルを「変体仮名メーカー」に変更
- サブタイトル削除
- RC / フォント / 教材データの状態バッジを公開UIから削除
- 冒頭注記を削除
- 「字形と字母」だけを小さな開閉ヘルプとして残す
- ? を丸型アイコンで表示
- 「書いてみる」を先頭・初期表示・主ボタン化
- 「字形を見る」「クイズ」は「おまけ」に配置

書いてみる:
- 初期モード「おまかせ」
- 「おまかせ」は入力仮名ごとに利用可能な変体仮名候補を自動選択
- 「もう一度」で別の組合せを生成
- 「自分で決める」では従来の文字ごとの候補選択UIを表示
- 濁音・半濁音・小書き対応は維持

検査:
- JavaScript構文 PASS
- 必須DOM欠落 0
- 書いてみる初期表示 PASS
- おまかせ / 自分で決める PASS
- 旧公開状態バッジなし


## RC12 / 自分で選ぶ時の追従プレビュー

スマホ確認を踏まえ、「自分で選ぶ」時の操作性を改善。

変更:
- 「できあがり」を候補一覧より上へ移動
- 自分で選ぶモードでは完成形を sticky 表示
- 候補を押すたび完成形を即時更新
- 通常ひらがなの「そのまま」候補を削除
- 変体仮名候補がある文字は、変体仮名だけを選ぶ
- 候補がない文字だけ元の文字を保持
- 「もとの文」は自分で選ぶ時のみ候補一覧直前に表示

検査:
- JavaScript構文 PASS
- sticky preview PASS
- 「そのまま」候補なし
- RC12表示 PASS
