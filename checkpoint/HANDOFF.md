# Checkpoint 引継ぎ
更新: 2026-09-18

## 目的
古文本文を貼り付けると、学習者が立ち止まって確認すべき箇所をマーキングし、答えを直接示さずに、識別・接続・活用・敬語・語彙・歴史的仮名遣い等の観点へ案内する。

## 名称・公開
- 英名 / GitHubフォルダ: Checkpoint / `checkpoint`
- 日本語表示: 現在「古文予習」
- 公開β: https://yama-books.github.io/koten/checkpoint/
- GitHub: `yama-books/koten` の `main`
- Google Drive: 「古文予習ノート_作業」を正本候補・監査・研究データ置場とする

## 学習設計
1. 本文では問いを囲む
2. ヒント内で切り方・候補を示す
3. 同一箇所の観点を一度に全部出さない
4. 最初に見る場所を一つ示す
5. 答え開示を主目的にしない
6. 類例・候補・例外は必要時に展開
7. 情報の網羅性はデータ側で確保し、画面では優先順位をつける

## 見出し語ルート
- `参れ・給ひ・やすく` 等は見出し語復元が有益なので先に「見出し語は？」を問う
- `参る・給ふ` 等、すでに見出し語形なら省略
- `ぬ・なり・けれ・し・しか` 等は語自体が未確定なので、見出し語より先に切り方・接続・前後を見る
- 見出し語復元と活用形判定を混同しない

## 敬語
原則は「敬語種別 → 本動詞/補助動詞 → 普通語に直した意味」。
誰の動作か、誰への敬意かを別観点として保持。
「参るの敬語用法候補」のように最初から答え方向へ誘導する表現は使わない。

## 同形識別
最大の意味単位を本文マーカーにし、内部で候補を分解する。
重要対象: が, けれ, し, しか, して, せ, たり, て, と, とも, な, なむ, なり, に, にて, ぬ, ね, ば, ばや, らむ, る, を, む, ましか。
「検出確度」と「分析確度」は分離する。

## 歴史的仮名遣い
承認済み16規則: H1/H1-a/H1-b/H1-c/W1/W2/W2-a/D1/D1-a/K1/N1/L1/L2/L3/L4/S1。
検出は 1)語彙全体 2)見出し語＋活用生成 3)規則fallback。
例外は原則「※ 一部例外あり」から展開し、初期画面に全例外を撒かない。
`なでふ` は全体をマークし、`でふ → ?` を考えさせる。安全に確定できないものは答えを自動表示しない。

## データ
- `data/auxiliary_master.json`: 全助動詞の在庫。一次資料未照合は未確定
- `data/surface_index.json`: 本文検出表面形
- `data/inflecting_words.json`: 敬語・特徴的用言
- `data/basic_lexicon.json`: 見出し語候補
- `data/discrimination_rules.json`: 同形識別の見る順
- `data/corpus_evidence.json`: CHJ監査済み集計・参照ID
- `data/kana_rules.json`: 仮名遣い16規則
- `data/manifest.json`: データ構成

## 一次資料ポリシー
学校文法の接続・活用の正本は『新しい古典文法 四訂新版』付録。
CHJ/UniDicは候補発見・実例・判定根拠。学校文法表示の最終権威ではない。
Driveの「助動詞5種_180例_学校文法セル監査_AI案」は `ず・べし・まじ・まほし・たし` の実例資料だが、文書自身が一次資料照合待ちなので確定扱いしない。
推測で未確認セルを埋めない。

## CHJ再利用
動詞360例、形容詞140例の500例マイルストーン。
動詞360例は329公開可＋31教材注記あり、公開ブロッカー0。
係り結びは連体形15例＋こそ已然形15例の30例を個別監査済み。
検索条件そのものを判定根拠として再利用する。

## β0.1実装
GitHub Pages向けに standalone HTML を CSS と複数JSへ分割した。概念設計の変更ではない。
読み込み順:
`core1.js → core2.js → core3.js → core4.js → detect1.js → detect2.js → detect3.js → ui1.js → ui2.js → ui3.js → events.js`
外部JSONを読み、失敗時は埋め込みルールへfallbackする。

## 次工程
1. 公開URLのスマホ動作確認
2. GitHub上のJS構文・JSON読込を監査
3. 『新しい古典文法 四訂新版』付録で全助動詞の接続・活用を照合
4. verified項目から surface_index を拡張
5. 手書き検出ロジックをDB参照へ段階的に置換
6. 係り結び30例を案内経路へ接続
7. CHJ 500例から特徴的用言を増補
8. UI変更ごとにサンプル長文と同形識別サンプルで回帰確認

## 再開時に最初に読むもの
1. この HANDOFF.md
2. README.md
3. data/manifest.json
4. data/auxiliary_master.json
5. data/discrimination_rules.json
6. Google Drive「活用表アプリ_コーパス収集・監査ログ」


## 2026-09-18 追加: DB精度向上

- GitHub Pages 404 の原因は `.github/workflows/deploy-pages.yml` が `checkpoint/` を `_site` にコピーしていなかったこと。workflow と publish allowlist を修正済み。修正後の Deploy Pages は成功。
- USB-3212 pp.162-172 を出典データとして 22表面形・65候補へ構造化。出典候補と Checkpoint 独自追加候補を分離。
- USB-3212 が明示する助動詞の部分証拠を 14系列・24断片として `auxiliary_evidence_usb3212.json` に保存。全活用表の代替にはしない。
- 動詞360＋形容詞140の500例から、教材表示注記31例を19群に集約して `inflecting_words.json` に追加。
- `surface_index.json` v0.2 は39表面形、うち25表面形を ambiguous として保持。
- `auxiliary_corpus_evidence_20260918.json` を追加。ず・べし・まじ・まほし・たしのCHJ実測値、たし52例追加検索、旧AI監査の「～かれを命令形不足として探す」誤りを guard として記録。
- `auxiliary_verification_queue.json` を追加。全28助動詞を一次資料照合待ちとして管理し、意味・接続・活用型・六活用形・表面形を個別確認してから human-confirmed に昇格する。
- `auxiliary_master.json` v0.3 では USB-3212 の部分証拠を持たせたが、未照合セルは空欄のまま。DB-authoritative detection は primary-source 確認まで false。
- 正本 `古典文法_一次データ索引.md` は桐原書店『新しい古典文法 四訂新版』付録の構造化データであることが過去HANDOFFから確認できる。ただし現チャットではファイル本体を直接取得できていないため、モデル知識による補完は行わない。


## 2026-09-19 追加: shadow detector 監査

- `kakari_musubi_routes.json` を追加し、本文監査済み30例と USB-3212 の候補活用形を接続した。
- ただし raw 文字列距離だけで係り結びを自動適用すると、長文 `とぞ申しける` で `申し` 内部の `し`、`ける` 内部の `る` へ誤った候補支持が出た。
- そのため、係り結びは **形態境界＋係り先範囲が確定した後だけ** `kakariSupportForResolvedParticle()` を呼ぶ。自動近傍走査は全係助詞で停止。
- `surface_match_policy.json` v0.2 で `ぬ・ね・ば・む` も context-required に追加。
- DB 内で大きい意味単位がある場合、内部の短い表面形を `larger-db-surface-preferred` で抑制。
- 既存4サンプル計990文字の比較を再集計:
  - legacy raw 文法/識別 hit: 348
  - legacy unique位置: 310
  - legacy重複ルール: 38
  - DB raw hit: 310
  - **unique位置の被覆: 100%**
  - DB resolved: 69（22.3%）
  - DB suppressed: 241
    - context-required: 207
    - larger-db-surface-preferred: 34
  - DB未収録による欠落: 0
- 初回の「89.1%被覆・19.8%通過」は legacy側の重複38件を分母に含めた集計だったため訂正。22.3%は正答率ではなく、保守的ゲート通過率。
- 係り結び route API 回帰テスト 8/8 成功。
- 形容詞の内部一致抑制（`かひなけれ`→`けれ`, `みしかゝり`→`しか`）2/2 成功。
- 監査記録: `SHADOW_AUDIT_2026-09-19.md`, `data/shadow_audit_20260919.json`

### 次の優先作業
1. legacyOnly 252件を「未収録」と「意図的抑制」に分類
2. 接続だけで安全に解ける context-required 表面形から resolver を追加
3. 係助詞の品詞同定と係り先範囲解析を別レイヤとして設計
4. 一次資料参照可能になり次第、助動詞の verified 化を再開

- 位置別分類の詳細は `data/legacy_gap_classification_20260919.json` に保存。


## 2026-09-19 追加: 監査済み活用形resolver

- `audited_inflected_form_index_500.json`: 動詞360＋形容詞140から、2文字以上かつ活用形・品詞が一意の413表面形を作成。
- 日本語の無空白本文では仮名だけの語形を境界なしで使うと誤一致するため、209の kanji-anchored のみ自動context resolverへ使用。204の kana-only はtokenizer待ち。
- `context_resolver_rules.json`: USB-3212の接続規則だけを使い、context-required hit の候補支持を行う。
- singleCandidateResolve 対象: `ぬ・ね・ば・る`。supportOnly: `し・に・て・な・せ`。
- 既存4サンプル再監査で DB resolved 69→70。新規1件は「開いて見れば」の「見れ（已然形）＋ば」で、確定条件候補を出典付きで支持。
- 仮名のみ表面形を広く自動利用する案は不採用。例として「ごとく」内部の「とく」を動詞「溶く」と誤認し得た。
- このresolverはshadow専用で、学習者画面の正解表示には未接続。


## 2026-09-19 追加: known-token boundary と百人一首 exact evidence

- `known_token_boundary_index.json`: 500例のkanji-anchored語形＋basic lexicon＋inflecting wordsを統合した trusted whole-token DB。290表面形。
- 既知の大きい語の内部にある短い識別表面形は `known-larger-token` でshadow抑制する。
- 4サンプルでは20位置を追加抑制。context-required は206→188へ減少したが、resolvedは70のまま。これは解決率向上ではなく誤マーキング候補の削減。
- `hyakunin_disambiguation_evidence.json`: 百人一首文節監査の要注意17例を完全一致限定の識別証拠として追加。
- exact phrase 回帰17/17 PASS。ぬ・ねの候補支持、ぬる・ぬれの大単位優先、`いぬめり` の「ぬ」非助動詞抑制を確認。
- 百人一首証拠はその句の監査結果であり、同じ表面形の一般規則へ自動一般化しない。
- `context_resolver_rules.json` の「に＋前が連体形」は、USB-3212に従って格助詞・接続助詞の両候補を保持するよう修正した。

### 現在の安全側優先順位
1. exact context-reviewed phrase
2. trusted larger token
3. explicit largest DB unit
4. kanji-anchored audited preceding form + USB-3212接続
5. context-requiredで保留

仮名のみの語境界を推測で突破しない。


## 2026-09-19 追加: 双方向context resolver

- `context_resolver_rules.json` にUSB-3212の後続cueを明示。
- shadowでは、監査済みkanji-anchored連用形に続く `に＋けり`、`て＋む/けり/き/まし` を候補支持に使用可能。
- 単体回帰 `context_resolver_regression_20260919.json` は4/4 PASS。ただしテスト文字列は配線確認用で、新しい文法証拠ではない。
- 百人一首 exact phrase `知らぬ` が既存識別サンプルにも一致し、`ぬ` を打消「ず」連体形候補としてshadow resolvedへ昇格。
- 4サンプル最新版: raw 310 / resolved 71 / suppressed 239 / DB only 0。
- suppressed: context-required 187 / larger-db 32 / known-larger-token 20。
- learner-visible検出はまだlegacyのまま。shadowのresolvedをそのまま正解表示へ接続しない。


## 2026-09-19 追加: shadow v0.6

- `audited_inflection_evidence_500_full.json`: 動詞360＋形容詞140の全500例を、447表面形・19曖昧表面形として保持。曖昧なものを一意化せず、全分析を残す。
- `known_token_boundary_index.json` に v1.3 BASIC_WORDS 28語を移行。既存の部分一致フィルタをDBレイヤへ寄せた。
- 1文字hitが長いindexed grammar/discrimination surface内にある場合、`indexed-larger-surface` で短いhitを抑制する。分析正解の確定ではなく、最大の意味単位優先の実装。
- USB-3212出典から `けれ＋ば` の接続ルートを追加。6箇所の `ば` を已然形接続＝確定条件候補としてshadow resolved。ただし「けれ」自体の候補は確定しない。
- 4サンプル: raw 310 / resolved 77 / suppressed 233 / DB only 0。resolved率24.8%。
- suppression: indexed-larger 51 / known-larger-token 31 / context-required 151。
- 残151は `context_required_backlog_20260919.json` に整理。A群は `て28・に28・と23・を21` で、文節/統語境界が主ボトルネック。
- learner-visible detectorはまだlegacy。shadow側の改善をそのまま正解表示へつながない。


## 2026-09-19 追加: 全500例DB・境界拡張

- `audited_inflection_evidence_500_full.json` を新設。500監査例を **447表面形**として全保持し、同一表面形の複数分析を捨てない。曖昧表面形は19件。
- 既存の `audited_inflected_form_index_500.json` は活用形・品詞が一意な413表面形のcontext resolver用。新しいfull DBは「証拠保存＋語境界」の役割。
- full DBのうち2文字以上かつ漢字を含む監査済みtargetを語境界専用trusted tokenへ追加し、`known_token_boundary_index.json` は拡張済み。
- raw DB内の一文字hitが、より長い索引済み文法単位に完全包含される場合は `indexed-larger-surface` で抑制する処理を追加。
- USB-3212に基づき `けれ＋ば` は「ば」の確定条件候補を支持できるため、`resolved-by-source-left-surface` を追加。安倍晴明サンプルで6件resolved。
- 最新4サンプル監査: legacy unique 310 / DB raw 310 / resolved **77** / suppressed **233** / DB only 0。
- suppressed内訳: `context-required-not-yet-resolved` **151** / `indexed-larger-surface` **51** / `known-larger-token` **31**。
- unresolved上位: `て 28 / に 28 / と 23 / を 21 / し 13 / な 8 / ば 8 / が 6 / る 6 / せ 6 / む 3 / ぬ 1`。
- ここからはresolved数を無理に上げず、①既知語内部、②接続根拠あり、③本当に文脈解析が必要、の3群へ分解する。


## 2026-09-19 追加: 安倍晴明 source evidence

- File Libraryの `安倍晴明_本文・文法・語彙整理.docx` に、本文全体・助動詞一覧・係り結び・敬語・歴史的仮名遣い・難語が整理されていることを再確認。
- 同文書を `abe_seimei_grammar_evidence.json` 24件と `abe_seimei_vocabulary_evidence.json` 29件へ分離してDB化。
- grammar evidenceは完全一致句だけに適用し、別本文へ一般化しない。回帰24/24 PASS。
- exact evidenceで、`入らむ` と `ならむ` 内部の `らむ` を「現在推量らむ」一語として扱う誤検出を抑制。これは本アプリの「最大の意味単位＋切り方をヒントで示す」方針に直結する重要修正。
- `黄なる` は同文書に「形容動詞『黄なり』の連体形、断定ではない」と明示されているため内部の `な・る` を抑制。
- 難語DBの `塞がる` と `かたり` をwhole-token境界へ入れ、内部の `が・る・たり` を抑制。
- 4サンプル shadow v0.7: raw 310 / resolved 85 / suppressed 225 / context-required 134 / DB only 0。
- learner-visible detectorは依然legacy。source-exact結果も、現段階ではshadow監査に限定する。


## 2026-09-19 追加: 安倍晴明 exact evidence 強化

- File Library の `安倍晴明_本文・文法・語彙整理.docx` と `安倍晴明_ワークシート_解答なし_横書き_テキストのみ_修正版.txt` を passage-specific evidence として再利用。
- `abe_seimei_grammar_evidence.json` を24→**28 exact cases**へ拡張。
  - 2回目の「車より降りて入らむ」: 内部の `らむ` を抑制し `む` を支持
  - 「不便にせさせ給ひ」: 形容動詞「不便なり」の `に` を支持
  - 「させ」内部の第二の `せ` を一文字候補として扱わない
- Abe grammar regression は **28/28 PASS**。
- `abe_seimei_kakari_evidence.json` を追加。教材に明示された係り結び5表現を完全一致のscope-linkとして保持:
  1. なむ…ければ（結びの流れ）
  2. か…たる
  3. や…らむ
  4. ぞ…ける
  5. 文末なむ（結び省略）
- exact kakari regression は **5/5 PASS**。ending surfaceへ直接linkできたものは4件、結び省略1件。
- 最新4サンプル:
  - legacy unique 310
  - DB raw 310
  - resolved **86**
  - suppressed **224**
  - DB only 0
  - resolved率 **27.7%**
- suppressed内訳:
  - context-required **132**
  - indexed-larger-surface 48
  - known-larger-token 33
  - source-exact-phrase-larger-unit 11
- unresolved上位:
  - `て 28 / に 24 / と 23 / を 21 / し 13 / ば 8 / な 5 / が 5 / せ 3 / る 1 / ぬ 1`
- exact evidence は当該本文限定。一般文法マスターへ自動一般化しない。


## 2026-09-19 追加: 百人一首文節境界 evidence

- `hyakunin_bunsetu_boundary_evidence.json` を新設。
- 出典は `hyakunin_isshu_bunsetsu_audit_2026-09-05.md`。文節監査を助動詞正解表として扱わず、**明示された語彙・文節境界だけ**を利用する。
- 第9首の監査は `ながめ/せし/まに` を推奨し、「ながめ」を名詞、「す」をサ変動詞、「ま」を名詞と明記。
- 現段階では名詞 `ながめ` の内部の `な`・`が` だけを exact passage 限定で抑制。
- `せし` 内の `せ`・`し`、`まに` の `に` は、文節が一つであることだけを理由に消さない。助詞・助動詞は自立語と同一文節に入るため。
- 4サンプル shadow v0.8:
  - raw 310 / resolved **86** / suppressed **224** / DB only 0
  - context-required **130**（132→130）
  - 新規抑制2件: 第9首 `ながめ` 内部の `な`・`が`
- unresolved: `て28 / に24 / と23 / を21 / し13 / ば8 / な4 / が4 / せ3 / る1 / ぬ1`


## 2026-09-19 継続チェックポイント: shadow v0.9

### 現在地
既存4サンプル・legacy unique 310位置に対して:
- DB raw: **310**
- DB resolved: **105**
- DB suppressed: **205**
- DB only: **0**
- resolved率: **33.9%**
- context-required: **109**

現行未解決:
`て28 / に24 / を21 / し13 / と10 / な4 / が4 / せ3 / る1 / ぬ1`

### 今回追加したもの
- `data/external_grammar_crosscheck_20260919.json`
  - 外部文法照合を一次資料確認と分離。
  - shadow resolver安全確認専用。auxiliary_masterをprimary-source-verifiedへ昇格させない。
- `data/boundary_resolver_regression_20260919.json`
  - v0.9の期待値と安全条件を固定。
- `context_resolver_rules.json` v0.2
  - 閉じ引用符 `」/』` 直後の `と` を hard-boundary rule 化。
  - `し給へ / ましか / 申せ / のたまへ / 投げ上げたれ` + `ば` を長い左文脈限定で追加。
- `known_token_boundary_index.json` v0.2
  - 副助詞 `ばかり` をwhole-token境界として追加。
- `db-shadow.js`
  - `resolved-by-source-hard-boundary` を実装。

### v0.8からの差分
- 引用符直後の `と`: 13位置 resolved。
- `ばかり` 内部の `ば`: 2位置 suppression。
- source-limited `ば`: 6位置 resolved。
- context-required: **130 → 109**。
- `ば` は既存4サンプル上では context-required 0。
- raw 310 / DB only 0 は維持。

### 安全判断
- `給へば` を一般規則化しない。尊敬四段と謙譲下二段の同形衝突があるため、今回のresolverは `し給へ` に限定。
- `たれば` も一般規則化しない。今回は `投げ上げたれ` という長い文脈に限定。
- `ましかば` は反実仮想の監査済み句＋外部照合を合わせてshadow支持。
- `ばかり` は意味判定に使わず、内部の一文字hitを黙らせる境界証拠だけに使う。
- learner-visible detector はまだlegacy。shadow resolvedを正解表示へ直結しない。

### 次回の再開地点
次の主戦場は `て / に / を / し / と`。
優先順位:
1. context-required周辺だけを見る **局所 boundary/tokenizer 層** を設計する。
2. まず既知語内部・句読点・引用境界など、品詞推定なしで切れる境界を増やす。
3. その後、監査済み活用形＋USB-3212接続で候補支持。
4. `に / と / を / が` のように統語構造が必要なものは、候補が一意にならなければ保留。
5. 一次資料 `新しい古典文法 四訂新版` が参照可能になったら auxiliary_master の verified 化を別レーンで再開する。

### 再開時に先に読むもの
1. `checkpoint/HANDOFF.md` のこの節
2. `checkpoint/PROGRESS_2026-09-19_db.md` の shadow v0.9 節
3. `checkpoint/data/shadow_audit_20260919.json`
4. `checkpoint/data/context_required_backlog_20260919.json`
5. `checkpoint/data/boundary_resolver_regression_20260919.json`
6. `checkpoint/data/context_resolver_rules.json`
7. `checkpoint/db-shadow.js`


## 2026-09-19 17:41 JST セッション停止チェックポイント

### 正本現在値
- shadow: **v0.11**
- legacy unique: 310
- DB raw: **310**
- resolved: **121**
- suppressed: **189**
- DB only: **0**
- resolved率: **39.0%**
- context-required: **85**

残件:
`て28 / を21 / に20 / と10 / が3 / な1 / せ1 / ぬ1`

### 今回の重要成果
1. 引用符直後の `と` 13件を hard-boundary でresolved。
2. `ば` は4サンプル上のcontext-requiredを0まで整理。
3. local boundary signal層を導入。ただしsignal単独ではresolveしない。
4. 百人一首第9首を完全一致evidence化し、和歌サンプルのcontext-requiredを0へ。
5. `遣はし / 御越し / たなびき / 取り出だし / 物もなし / うち合せて` の内部短hitを、出典付き境界として安全に整理。
6. 安倍晴明本文の残 `し` 8位置をサ変「す」連用形としてpassage-specificにresolved。学習価値があるため抑制しなかった。
7. Abe grammar evidence は38件、回帰38/38 PASS。

### 次回の最優先
- `て28 / を21 / に20 / と10` を中心に、局所boundary/tokenizerを設計・監査する。
- まずwhole-tokenとexact passage evidenceを増やし、signalだけで品詞確定しない。
- `不便にせさせ給ひ` の最初の `せ` は一次資料待ち。
- learner-visibleはlegacyのまま維持し、shadowの安全性検証を続ける。

### 再開時に読む順
1. この節
2. `data/shadow_audit_20260919.json`
3. `data/context_required_backlog_20260919.json`
4. `data/local_boundary_policy.json`
5. `data/local_boundary_audit_20260919.json`
6. `data/abe_seimei_grammar_evidence.json`
7. `data/hyakunin_disambiguation_evidence.json`
8. `db-shadow.js`


## 2026-09-19 次区切りチェックポイント: shadow v0.12

### 一旦のゴール達成
前回停止時 `context-required 85 / resolved 121` から、同程度の進捗を目標に進めた。
今回の終了値:
- legacy unique: 310
- DB raw: **310**
- resolved: **161**
- suppressed: **149**
- DB only: **0**
- resolved率: **51.9%**
- context-required: **38**

前回比:
- resolved **+40**
- context-required **-47**

### 今回の中核
`abe_seimei_particle_evidence.json` を新設し、文法・助動詞evidenceと助詞evidenceを分離。

本文上47位置:
- `て` 20位置 → 接続助詞候補として exact resolved
- `を` 20位置 → 格助詞候補として exact resolved
- `とて` 内部 `て` 6位置 → 分析揺れ保持の larger-unit suppression
- `さて` 内部 `て` 1位置 → lexical larger-unit suppression

回帰:
- `abe_seimei_particle_regression_20260919.json`
- expected: 47 effects = 40 resolved + 7 suppressed
- full 4-sample result: raw 310 / resolved 161 / suppressed 149 / context-required 38 / DB only 0

### 残38
`に20 / と10 / が3 / て1 / ぬ1 / を1 / な1 / せ1`

### 次回の優先順位
1. `に20`
   - 体言＋格助詞
   - 連体形＋接続助詞
   - 断定「なり」連用形
   - 完了「ぬ」連用形
   を passage-specific evidence と局所構文で分離。
2. `と10`
   - `日ごと` の語内部
   - `む/じ＋と＋す`
   - 引用
   - 名詞＋と
   を混ぜずに処理。
3. `が3`
   - 接続助詞1件と格助詞2件の可能性を本文構造で監査。
4. 各1件の `て/ぬ/を/な/せ` は別サンプルまたは一次資料待ちなので、無理にまとめない。

### 維持する安全策
- exact evidenceは当該本文だけ。
- 外部Web照合はprimary-source-verifiedへ昇格しない。
- local boundary signal単独ではresolveしない。
- learner-visible detectorはlegacyのまま。


## 2026-09-19 次区切りチェックポイント: shadow v0.13

### 現在値
- legacy unique: 310
- DB raw: **310**
- resolved: **186**
- suppressed: **124**
- DB only: **0**
- resolved率: **60.0%**
- context-required: **10**

v0.12比:
- resolved **161→186**
- context-required **38→10**
- 今回28位置を処理。

### 今回処理したもの
#### `に` 16位置
- 格助詞として15位置resolved。
- `たちまちに` は副詞全体を優先し、内部 `に` 1位置をlarger-unit suppression。

#### `と` 9位置
- `む/じ＋と＋す`、名付け・変化・引用内容等の7位置を格助詞としてresolved。
- `日ごと` / `こと` の内部 `と` 2位置をlarger-unit suppression。

#### `が` 3位置
- `御供しけるが、` の1位置を接続助詞。
- `晴明が外` / `道摩が科` の2位置を格助詞。
- すべてpassage-specific exact evidence。

### 意図的に残した `に` 4位置
1. `参らせ給ひけるに、白き犬を…`
2. `掘らせて見給ふに、土五尺…`
3. `下部を走らするに、六条坊門…`
4. `呪詛の故を問はるるに、…`

USB-3212では連体形＋`に` に格助詞・接続助詞双方の候補があり、外部の学校文法系品詞分解でも両方の立て方が存在する。
**v0.13では一意化しない。**
一次資料『新しい古典文法 四訂新版』で、このアプリが採用する学校文法基準を確認してから裁定する。

### 残10
`に4 / て1 / ぬ1 / を1 / と1 / な1 / せ1`

サンプル別:
- 枕草子: `て1`
- 百人一首: 0
- 識別テスト: `ぬ/を/と/な` 各1
- 安倍晴明: `に4 / せ1`

### 次回の再開方針
1. 残10を無理にゼロにすることを目標にしない。
2. まず `新しい古典文法 四訂新版` の一次資料確認で `連体形＋に` と `せ/さす` を裁定。
3. 枕草子 `あかりて` は出典付きexact evidence化候補。
4. 識別テスト4件は曖昧性テストとして残す価値を検討し、教材テストなら正解固定、stress testならholdを維持。
5. shadowが十分安定したら、learner-visible移行の閾値・表示方針を別途決める。

### 安全策
- learner-visible detectorはまだlegacy。
- passage-specific evidenceを一般文法ルールへ自動一般化しない。
- Web照合はsecondary crosscheckでありprimary-source-verifiedではない。
- local boundary signal単独ではresolveしない。
