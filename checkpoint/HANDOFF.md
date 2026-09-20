# Checkpoint 引継ぎ
更新: 2026-09-18

## 目的
古文本文を貼り付けると、学習者が立ち止まって確認すべき箇所をマーキングし、答えを直接示さずに、識別・接続・活用・敬語・語彙・歴史的仮名遣い等の観点へ案内する。

## 名称・公開
- 英名 / GitHubフォルダ: Checkpoint / `checkpoint`
- 日本語表示: 現在「古文予習」
- 公開β: https://yama-books.github.io/koten/checkpoint/
- GitHub: `yama-books/koten`。Checkpoint開発正本は `checkpoint-main`（production `main` への直接push禁止）
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


## 2026-09-19 一時停止チェックポイント: shadow v0.14 準備完了

### 停止理由
ユーザー指示によりここで一時停止。**徒然草を使う独立gold set監査にはまだ着手しない。**
次回はこの節から再開する。

### v0.13から実装済み
1. `passage_disambiguation_evidence.json`
   - 一般実本文用のpassage-specific evidence層を新設。
   - 枕草子「すこしあかりて、紫だち」の `て` を、複数の外部品詞分解照合に基づき接続助詞候補としてexact resolved。
   - Web照合はsecondaryであり、primary-source-verifiedにはしない。

2. `context_hold_policy.json`
   - 一意判定できない位置を、単なる「未解決」ではなく理由付きholdへ分類。
   - `intentional-ambiguity-benchmark`: 識別サンプル4件
     - 花咲き**ぬ**
     - 来なむ**を**
     - 思ひけれど の内部候補 **と**
     - いか**な**らむ
   - `primary-source-required`: 安倍晴明5件
     - 連体形＋`に` 4件
     - 「不便に**せ**させ給ひ」1件

3. `db-shadow.js`
   - `resolved-by-source-exact-passage` を追加。
   - `context-intentional-ambiguity-benchmark` を追加。
   - `context-primary-source-hold` を追加。
   - auditに
     - passage exact resolved
     - intentional benchmark hold
     - primary-source hold
     - unclassified context-required
     の件数を出すようにした。

4. v0.14準備時の実測
   - raw: **310**
   - resolved: **187**
   - suppressed: **123**
   - resolved率: **60.3%**
   - context hold: **9**
     - intentional benchmark: **4**
     - primary-source hold: **5**
   - **unclassified context-required: 0**
   - DB only: 0
   - 旧v0.13の「あかりて」1件だけresolvedへ昇格。

5. `passage_hold_regression_20260919.json`
   - expected: raw310 / resolved187 / suppressed123 / hold9 / unclassified0 / DB-only0
   - 枕草子「あかりて」1件 + hold9件を固定。

6. shadow→learner-visible昇格方針
   - `shadow_promotion_policy.json`
   - `shadow_promotion_readiness_20260919.json`
   - 現在ステージは **stage-1 shadow telemetry継続**。
   - G1 raw coverage: PASS
   - G2 DB-only zero: PASS
   - G3 unclassified context zero: PASS
   - G4 independent gold regression: PENDING
   - G5 cross-passage generalization: PENDING
   - G6 hold-aware learner UI: PENDING
   - G7 primary-source hold protection: PASS
   - **global learner-visible切替はまだ行わない。**

7. 開発者向けdebug overlay
   - `index.html` と `ui1.js` に実装。
   - 通常画面では非表示。
   - `?debug=shadow` または `#shadow-debug` のときだけ表示。
   - legacy unique / DB raw / resolved / suppressed / hold / unclassified / DB-only、
     resolved理由、suppression理由、hold理由を確認できる。
   - 学習者向け挙動は変更していない。

### 未完了・次回最優先
**独立gold setを作って現行shadowを調整前の状態で評価する。**

候補作品:
- 『徒然草』第52段「仁和寺にある法師」

選定理由:
- 現在のresolver作成に使っていない別作品。
- `に・を・て・と・ぬ・し・ば・しか` など識別surfaceを含む。
- 複数の品詞分解資料でgoldを固定しやすい。
- 安倍晴明偏重（現4サンプルrawの273/310）を緩和できる。

### 次回の重要手順
1. **先にgoldを固定する。**
2. gold作成後までresolver・evidenceを追加しない。
3. 現行shadowを無調整で徒然草へ走らせ、初見性能を測る。
4. false positive / unresolved / larger-unit suppressionを分類。
5. その結果をG4/G5の昇格判定に使う。
6. 成績を見てから一般規則を修正する。goldに合わせて先にresolverをいじらない。

### 一次資料待ち
『新しい古典文法 四訂新版』原資料は、現在アクセス可能なFile Library/GitHubでは確認できなかった。
したがって:
- 連体形＋`に` 4件
- 「せさせ給ひ」の `せ` 1件
はprimary-source holdを維持。

### 通常UI
learner-visible detectorは依然legacy。
shadow debug overlayも通常はhidden。


## 2026-09-19 Stage 2 チェックポイント: 3作品blind generalization完了

### 現在地
shadowは **v0.15-stage2-generalization** 相当。
learner-visibleは引き続きlegacy。

既存4サンプル:
- raw **310**
- old resolved **187**
- strict resolved **145**
- ambiguous resolved **42**
- suppressed **123**
- DB only **0**
- context hold **9**
- unclassified context-required **0**

old resolvedはcompatibility metric。今後の品質判断はstrict resolvedを優先する。

### 独立gold 3作品
goldを先にcommitし、その後にshadowを無調整で初回評価したbaselineを永久保存。

#### 徒然草52
- gold: `tsurezure52_independent_gold_20260919.json`
- baseline: `tsurezure52_shadow_baseline_v014.json`
- 55 positions
- blind strict PASS 32
- grammar strict resolve 7/30
- suppression 25/25
- wrongResolved 0

#### 伊勢物語6「芥川」
- gold: `ise6_akutagawa_independent_gold_20260919.json`
- baseline: `ise6_akutagawa_shadow_baseline_v014.json`
- 35 positions
- blind strict PASS 17
- grammar strict resolve 8/23
- suppression 9/12
- false-positive 3
- wrongResolved 0

#### 方丈記冒頭
- gold: `hojoki_opening_independent_gold_20260919.json`
- baseline: `hojoki_opening_shadow_baseline_v015.json`
- 22 positions
- blind strict PASS 14
- grammar strict resolve 1/8
- suppression 13/14
- false-positive 1
- wrongResolved 0

### blind合算
- 112 positions
- strict PASS **63/112 = 56.3%**
- grammar strict resolve **16/61 = 26.2%**
- larger-unit suppression **47/51 = 92.2%**
- wrong candidate resolve **0**
- false-positive resolved 4件はすべて語内部boundary不足

このblind値は今後上書きしない。

### blind後のdevelopment
安全側修正:
- boundary: `まじかり / 呼ばひわたり / からうじて / しかも`
- source-reviewed token morphology 28語形
- strict contextual rules:
  - trusted連用形 + `ければ`
  - trusted連用形 + `しかど/ども`
  - trusted連用形 + `たり＋けり系`
- USB-3212明示cue `ずして`

current development:
- strict PASS **73/112 = 65.2%**
- grammar strict resolve **22/61 = 36.1%**
- larger-unit suppression **51/51**
- hard error 0

**注意:** current development値はgoldを見た後の改善を含むのでblind性能として扱わない。

### failure taxonomy
`cross_gold_failure_taxonomy_20260919.json`

2作品時点のexpected-resolve failure 38:
- left-token boundary / morphology missing: 25
- resolved candidate set not unique: 7
- token known but morphology not connected: 1
- morphology known but rule nonunique: 5

これを受けてtoken morphology層を追加した。

### local syntax signal-only
`local_syntax_feature_policy.json`
`local_syntax_feature_audit_20260919.json`

3 development goldの残39:
- previous morphology 14
- left trusted token 7
- right trusted token 4
- punctuation after 14
- matched right-context hard cue 0

`て` は11件中10件で直前連用形を取得済み。
埼玉県立春日部東高の文法資料でも、助動詞「つ」の「て」は `てむ / てき / てけり` 等、接続助詞「て」は読点を置けることが識別目安とされる。
ただし句読点は版依存なのでsignal-onlyを維持。

### 重要な反例
1. 方丈記
   - `水にあらず`: 断定「なり」連用形
   - `よどみに浮かぶ`: 格助詞
   → 名詞＋にだけでは決めない。

2. 伊勢物語
   - 同じ段落の `けるを` に格助詞・接続助詞双方あり。
   → `けるを` を文字列rule化しない。

3. `て`
   - 連用形接続だけでは完了「つ」/接続助詞が衝突。
   → punctuation aloneでresolveしない。

### 昇格ゲート
- G1 legacy coverage: PASS
- G2 DB-only zero: PASS
- G3 unclassified context zero: PASS
- G4 independent gold: PASS
- G5 cross-passage: PASS_WITH_LIMITATION
- G6 hold-aware learner UI: PENDING
- G7 primary-source hold protection: PASS
- G8 strict disambiguation readiness: PENDING

Stage 3 selective learner promotionにはまだ進まない。

### 一次資料hold
引き続き:
- 安倍晴明 連体形＋`に` 4件
- `不便にせさせ給ひ` の最初の `せ` 1件
は『新しい古典文法 四訂新版』原資料確認までhold。

### 次回の推奨再開地点
1. `local_syntax_feature_audit_20260919.json` を読む。
2. right-token morphology / boundaryをsignalとして増やす。
3. 「次が助動詞列か、独立語か」をfeature化する。
4. `に/を/と` は節構造・係り先レイヤを設計する。
5. hard resolverへ昇格する一般規則ができたら、**第四の未使用作品を先にgold固定**してblind評価。
6. learner-visibleは変更しない。

### 主要commit
- 徒然草gold freeze: `1cb0d5baca470172843e4ef8063653a1fc271e53`
- 徒然草blind baseline: `f19a4c2389600ad1cbce4e0d02ade20d26ce0f1b`
- strict metric: `fb29d377b98a74a18de53e7fd3785e67e3546d73`
- 伊勢物語gold freeze: `2f36a6d7b0aee96e4f5b4be547852f86c3842e40`
- 伊勢物語blind baseline: `78527f91716dadfe47a75da19f6e1c2b94ebf097`
- 伊勢boundary patch: `ea283eef13dff068fb01b17b4b8c70a800700ed2`
- token morphology: `48055d9a21915c346587750f44edfcb18e037375`
- token morphology resolver: `099e0e09b6030c9b458641dcf8d0e69a75262361`
- 方丈記gold freeze: `4a46315c5864c70a3cf9f1453524d87c7e53eb70`
- 方丈記blind baseline: `555b5076b591b4b7c9d74e0cd7dcc8f0252d45c9`
- stage2 checkpoint: `5e7179d53377a5a24e859d88422eff9c2f63e430`
- local syntax audit: `54500390704b072ded254cc9bbcec48ec7abbd8f`


## 2026-09-19 一時停止チェックポイント: stage-2 / independent gold 2本完了

### 今回ここまで完了

#### 1. 独立gold 1本目: 徒然草第52段
`tsurezure52_independent_gold_20260919.json`
- **shadow評価前にfreeze**
- 評価位置: **55**
- expected:
  - resolveCandidate 26
  - resolveAuxiliaryLemma 4
  - suppressInsideLargerUnit 25

blind baseline:
`tsurezure52_shadow_baseline_v014.json`
- strict PASS: **32/55 = 58.2%**
- resolve対象30件のうちstrict correct: **7/30**
- larger-unit suppression: **25/25**
- false-positive resolved: **0**
- wrong resolved: **0**
- unresolved context: 19
- resolvedだがcandidate未一意: 4

重要:
境界抑制は非常に強いが、一般本文の文法disambiguationはunder-resolving。

#### 2. resolved指標をstrict / ambiguousへ分離
`db-shadow.js` に `resolvedDecisionState()` を追加。

既存4サンプル:
- raw 310
- resolved配列 187
- **strict resolved 145**
- **ambiguous resolved 42**
- suppressed 123

従来の `resolved=187` は互換用指標として残すが、learner-visible昇格判断には使わない。
今後はstrict resolvedと誤確定率を主要指標とする。

#### 3. stage-2へ移行
`shadow_promotion_policy.json`:
- currentStage = `stage-2-evidence-backed-debug-overlay`

開発者debug overlay:
- `?debug=shadow` または `#shadow-debug`
- strict / ambiguous / hold / DB-only 等を表示。
- 通常学習者UIは変更なし。
- learner-visible detectorは依然legacy。

#### 4. 独立gold 2本目: 伊勢物語第6段「芥川」
`ise6_akutagawa_independent_gold_20260919.json`
- **shadow評価前にfreeze**
- 評価位置: **35**
- expected:
  - resolveCandidate 17
  - resolveAuxiliaryLemma 6
  - suppressInsideLargerUnit 12

blind baseline:
`ise6_akutagawa_shadow_baseline_v014.json`
- strict PASS: **17/35 = 48.6%**
- resolve対象23件のうちstrict correct: **8/23**
- larger-unit suppression: **9/12**
- false-positive resolved: **3**
- wrong candidate resolved: **0**

false-positive 3件:
1. `まじかり` 内の `じ`
2. `呼ばひわたり` 内の `たり`
3. `からうじて` 内の `じ`

#### 5. blind baseline後の安全修復
`known_token_boundary_index.json` v0.3

追加:
- `まじかり`
- `呼ばひわたり`
- `からうじて`

これは文法正解を追加する修正ではなく、
**source-reviewed larger-token boundaryを追加して内部短hitを抑制するだけ**。

修正後:
- 伊勢物語 suppression **12/12**
- false-positive resolved **3→0**
- 徒然草gold: 変化なし
- 既存4サンプル: 変化なし

### 2本のblind goldから見えた共通傾向

1. larger-token boundaryは強い。
2. known-token coverageの穴はfalse-positiveにつながる。
3. 文法disambiguationは安全側だがunder-resolving。
4. `て / に / を / と / し` が主な未解決surface。
5. exact passage evidenceの追加だけで埋めるのは避ける。
6. 次はtokenizer / 前接語境界 / 活用形 evidenceの一般化が主戦場。

### 次回最優先

直前に実行しようとして途中停止した:
**「2本のgoldで未解決の約31件について、known-token boundaryが左語をどこまで拾えているか測る」**
処理を再実行する。

注意:
- 最後のtool実行は途中で停止したため、**その結果は未取得・未採用**。
- 途中結果を推測して記録しない。

その後:
1. 左語token境界coverageを集計。
2. `て / に / を / と / し` 共通失敗を分類。
3. passage-specific ruleではなく一般resolver改善案を作る。
4. frozen goldは変更せず再評価。
5. さらに別作品1本のblind goldを追加。
6. learner-visible切替はまだ行わない。

### 一次資料hold
引き続き:
- 安倍晴明 連体形＋`に` 4件
- 「せさせ給ひ」の `せ` 1件
は『新しい古典文法 四訂新版』原資料確認待ち。

### 現段階の判定
- stage-2到達
- G1 PASS
- G2 PASS
- G3 PASS
- G4 PARTIAL（blind gold 2本）
- G5 PARTIAL（2作品）
- G6 PENDING
- G7 PASS
- global learner-visible promotion はまだ不可


## 2026-09-20 Git履歴照合による訂正: 3作品Stage 2を現行正本とする

21:01 JST に追記された直前節「stage-2 / independent gold 2本完了」は、並行作業の古いスナップショットが後から追記されたものだった。Git ancestry と現行データを照合した結果、**その節は履歴として残すが現行状態としては superseded** とする。

### 照合した順序
- 伊勢boundary修復: `ea283eef13dff068fb01b17b4b8c70a800700ed2`
- 2作品failure taxonomy: `f863b5944d16798082b0d3a9603504699aa73cbd`
- source-reviewed token morphology: `48055d9a21915c346587750f44edfcb18e037375`
- morphology resolver接続: `099e0e09b6030c9b458641dcf8d0e69a75262361`
- 方丈記gold freeze: `4a46315c5864c70a3cf9f1453524d87c7e53eb70`
- 方丈記blind baseline freeze: `555b5076b591b4b7c9d74e0cd7dcc8f0252d45c9`
- 方丈記post-blind boundary修復（`しかも`）: `5c913268eaca8a5c5059e749595dc25cf8b4275e`
- local syntax signal audit: `54500390704b072ded254cc9bbcec48ec7abbd8f`
- Stage 2 shadow audit: `aab08af7d8de08e4f9068d244793e16a3ba8c2b9`

この後の 21:01 の `9250e629` / `e5b31ed7` / `4b1d9aef` / `79c8d795` は、2作品時点の停止記録を追記したが、第三gold・baseline・local syntax実装をrevertしていない。したがってコード・監査成果物と一致する **3作品Stage 2** を現行正本とする。

### 現行のblind / development指標
blind 3作品合算:
- 112 positions
- strict PASS **63/112 = 56.3%**
- grammar strict resolve **16/61 = 26.2%**
- boundary suppression **47/51 = 92.2%**
- wrong candidate resolve **0**
- false-positive resolved **4**（すべて larger-token boundary不足）

blind後のdevelopment:
- strict PASS **73/112 = 65.2%**
- grammar strict resolve **22/61 = 36.1%**
- boundary suppression **51/51**
- hard error **0**

既存4サンプルは raw 310 / old resolved 187 / **strict 145 / ambiguous 42** / suppressed 123 / DB only 0 のまま。

### 「左語token境界coverage測定」の扱い
2作品時点で途中停止した約31件の測定は、その後の作業でより広い形に置き換えられて完了している。
- `cross_gold_failure_taxonomy_20260919.json`: 2作品の expected-resolve failure **38** を分類
  - left-token boundary / morphology missing 25
  - resolved candidate set not unique 7
  - token known but morphology not connected 1
  - morphology known but rule nonunique 5
- `local_syntax_feature_audit_20260919.json`: 3作品development残 **39** をsignal-only監査
  - previous morphology 14
  - left trusted token 7
  - right trusted token 4
  - punctuation after 14
  - matched right-context hard cue 0

したがって旧31件の測定を再実行して二重管理せず、この39位置監査を次の入力とする。

### 次の作業
1. right-token morphology / boundary を **signal-only** で拡張する。
2. 次tokenが「助動詞列開始」か「独立語開始」かをfeature化する。これだけで候補を削らない。
3. `に / を / と` は節構造・係り先レイヤを設計し、局所文字列ruleを作らない。
4. 新hard ruleへ上げる一般条件ができたら、**第四の未使用作品をgold先固定**してblind評価する。
5. G6 hold-aware learner UI は別レーンで設計するが、learner-visible detectorはlegacyのまま維持する。

### 維持するhold / 安全条件
- 安倍晴明の連体形＋`に` 4件はprimary-source hold。
- `不便にせさせ給ひ` の最初の `せ` 1件もprimary-source hold。
- secondary Web資料を『新しい古典文法 四訂新版』のprimary verification代替にしない。
- passage-specific evidenceを一般文法規則へ自動一般化しない。
- learner-visibleへshadow resolvedを直結しない。



## 2026-09-20 Stage 2 継続: right-context signal-only 拡張

Git履歴照合訂正後、`local_syntax_feature_audit_20260919.json` の39位置を入力として右側signalを追加した。

### 実装
- `db-shadow.js`
  - `nextMorphology`: hit右側の audited500 / source-reviewed morphology を観測
  - `rightTokenRoleSignal`: 句読点境界 / auxiliary列候補 / 独立活用語候補 / 文法surface曖昧 / trusted boundary / unknown を観測
- `local_syntax_feature_policy.json` v0.2
- `local_syntax_right_context_audit_20260920.json`

すべて **signal-only**。candidate削除・resolved昇格には接続していない。

### 39位置の追加coverage
- nextMorphology: **15/39**
- right role:
  - independent-inflecting-candidate 14
  - punctuation-boundary 14
  - unknown 8
  - trusted-token-boundary 2
  - grammar-surface-ambiguous 1
  - auxiliary-sequence-candidate 0

特に未解決 `て` 11位置:
- previous morphology 10/11
- punctuation after 8/11
- nextMorphology 4/11
- **読点なし3位置は3/3で immediate next = 独立活用語**

これは次のblind検証候補であり、現時点ではhard rule化しない。

### 反例維持
`に` は右側独立活用語が見えても一意化できない。
- 方丈記 `水にあらず`: 断定「なり」連用形
- 伊勢物語 `暗きに来けり`: 格助詞

したがって right-token signal は `に/を/と` のhard ruleには使わず、節構造レイヤの入力に留める。

### 回帰
既存4サンプルは変更前後とも:
- raw 310 / resolved 187 / suppressed 123
- strict **145** / ambiguous **42** / unspecified 0
- resolved位置差分 0 / suppressed位置差分 0

3 development goldでもresolved/suppressed位置集合に差分0。
learner-visible detectorはlegacyのまま。

### 次
第四の未使用作品を **gold先固定** し、特に `連用形＋て＋即時独立活用語` がblind本文でも安全なsignalか確認する。goldを見てresolverを先に調整しない。



## 2026-09-20 第四blind完了: 平家物語「敦盛の最期」

right-context signal実装後、未使用作品として『平家物語』「敦盛の最期」熊谷決断段落83字を選び、**shadow実行前にgoldを固定**した。

- gold: `heike_atsumori_independent_gold_20260920.json`
- gold固定commit: `85f8197824fc9e0a35480839555b693d16f45014`
- baseline: `heike_atsumori_shadow_baseline_v015.json`
- baseline固定commit: `e0ab7e4df46bf31848e45a3e8077882d4273fbba`

### blind結果
- gold 24
- strict PASS **12/24 = 50.0%**
- grammar resolve target 14
- strict correct resolve **2/14 = 14.3%**
- larger-unit suppression **10/10 = 100%**
- false-positive resolved **0**
- wrong resolved **0**
- unresolved context 10
- resolved but ambiguous 2（`とも`, `けれ`）

### 「て」について得た重要な材料
同一83字内に detector surface `て` が5位置あり、goldでは:
- 接続助詞 `て`: 2
- larger-unit内部: 2（`消えはて`, `さて`）
- 完了 `つ` 連用形 `て`: 1（`かいてんげる`）

したがって **「連用形＋て」だけでは一般化不能**。右側が独立節開始かauxiliary chainか等の構造が必要。

ただし今回のblindでは previous/next morphology が新作品語彙を十分認識できず、development3作品で見えたright-context仮説は入力coverage不足で直接検証できなかった。これは仮説反証とせず、`heike_atsumori_feature_gap_audit_20260920.json` に分離した。

### 4作品blind合算
- positions **136**
- strict PASS **75/136 = 55.1%**
- grammar strict resolve **18/75 = 24.0%**
- boundary suppression **57/61 = 93.4%**
- false-positive resolved 4（過去3作品のblind boundary gap）
- wrongResolved **0**

development（過去のpost-blind boundary修復込み）では boundary **61/61**、hard error 0。

### 次
平家goldからexact morphologyを足さない。既存approved/audited資産から本文非依存に形態情報を供給する morphology provider を **signal-only** で設計する。新hard ruleへ進むなら第五作品をgold先固定する。


## 2026-09-20 一時停止チェックポイント / repository branch policy changed

### リポジトリ運用の恒久変更
Checkpointチームの作業対象は今後 **`checkpoint-main` ブランチ** とする。

- `checkpoint/` 以下の作業は `main` へ直接pushしない。
- `main` を含む他ブランチへforce-pushしない。
- 他ブランチを削除しない。
- PRを作る場合のbaseは `main` ではなく `checkpoint-main`。
- 古典学習アプリ本体側が必要に応じて `checkpoint-main` から `main` へ取り込む。
- 2026-09-20までに `main` へ直接入ってしまったcheckpointコミットは履歴改変せず、そのまま残す。巻き戻し・force-pushはしない。

専用ブランチ `checkpoint-main` は、運用変更時点の `main` を起点に新設済み。**この節以降のCheckpoint記録・実装は `checkpoint-main` のみを正本とする。**

### 停止時点の技術状態
- stage: **stage-2 evidence-backed debug overlay**
- learner-visible detector: **legacyのまま**
- existing 4 samples: raw 310 / resolved array 187 / **strict 145 / ambiguous 42** / suppressed 123 / DB only 0
- primary-source hold: **5件維持**
  - 連体形＋`に` 4件
  - `不便にせさせ給ひ` 最初の `せ` 1件
- blind gold: **4作品・136位置**
  - strict PASS **75/136 = 55.1%**
  - grammar strict resolve **18/75 = 24.0%**
  - boundary suppression **57/61 = 93.4%**
  - wrongResolved **0**
- post-blind development boundary: **61/61 / hard error 0**

第四blind『平家物語・敦盛の最期』:
- gold 24 / strict 12 / grammar 2/14 / boundary 10/10
- false-positive resolved 0 / wrongResolved 0
- `て` 5位置 = 接続助詞2 / larger-unit内部2 / 完了`つ`連用形1

### 直前の実装・監査
- `db-shadow.js`: `nextMorphology` / `rightTokenRoleSignal` を **signal-only** で追加
- 既存4サンプル・3 development goldのresolved/suppressed位置集合は変更なし
- `local_syntax_right_context_audit_20260920.json`: development残39位置で nextMorphology 15/39
- `heike_atsumori_feature_gap_audit_20260920.json`: unseen workでmorphology入力coverage不足を分離
- gold由来の平家exact morphologyはresolverへ追加していない

### 次回再開地点
1. **必ず `checkpoint-main` をcheckout / 正本確認してから作業開始。mainへpushしない。**
2. 平家goldを辞書化せず、passage-independent morphology providerをsignal-onlyで設計。
3. providerは evidence tier / source / exact-vs-derived を返す。
4. derived morphologyはcandidate削除・resolved昇格に使わない。
5. `て` は left form + right auxiliary-chain / independent-start の複合featureとして研究。
6. `に/を/と` は節構造・係り先なしにhard rule化しない。
7. 新hard resolverへ進む場合は、**第五の未使用作品をgold先固定**してblind評価。
8. learner-visible global promotionはまだ行わない。

再開用短句: **「checkpoint-main の HANDOFF 最終節から再開。次は passage-independent morphology provider signal-only」**


## 2026-09-20 公開β準備: passage-independent morphology provider / public preflight

### 方針
- 公開βとshadow→learner-visible昇格を別レーンに分離した。
- **公開βは learner-visible detector = legacy のまま進める。**
- shadow detector / morphology provider は研究・監査専用。通常公開画面の判定へ接続しない。
- Checkpoint開発は `checkpoint-main` のみ。production `main` へ直接push・force-pushしない。

### passage-independent morphology provider
- `data/morphology_provider_policy.json` を追加。
- `db-shadow.js` に作品非依存の形態signal providerを追加。
- 返却メタデータ:
  - `evidenceTier`
  - `source`
  - `matchMode`（exact / derived-suffix）
  - `resolverEligible`
  - `supportCount`
- 新しい観測tier:
  1. `audited-corpus-exact-signal`
     - `audited_inflection_evidence_500_full.json` の一意分析・2文字以上exact surface
     - kana-onlyも観測可だが signal-only
  2. `corpus-derived-suffix-signal`
     - 監査500例だけから生成
     - suffix長 3 / 2
     - support 3件以上
     - POS / form / conjugationClass 全一致のみ
     - **候補削除・suppression解除・resolved昇格には使用しない**
- 既存 `previousFormEvidence()` はresolver専用として変更していないため、新providerはresolver decision pathへ入っていない。
- 平家物語「敦盛の最期」のgold由来exact morphologyは追加していない。

### provider post-blind audit
`data/morphology_provider_audit_20260920.json`

第四blind 平家24位置:
- previous morphology signal: **3/24**
- grammar targetでsignalあり: **3/14**
- 内訳:
  - `いとほしく + て` → `しく` = 形容詞シク活用・連用形（500例suffix support 7）
  - `おぼえ + けれ` → `おぼえ` = 動詞・連用形（full500 exact signal）
  - `ある + べき` → `ある` = 動詞・連体形（full500 exact signal）
- 「て」5位置のsignalは1位置のみ。接続助詞て / 語内部 / 完了つ連用形を一般分離できる段階ではない。
- coverage向上をresolver精度向上として数えない。

### 公開UIのshadow隔離
公開前に性能上の問題を修正:
- 従来 `ui1.js` はshadow debug panelが非表示でも `shadowAuditLegacyVsDb()` を毎render実行していた。
- 修正後は `?debug=shadow` または `#shadow-debug` のときだけshadow auditを実行。
- 通常公開UIではshadow解析を実行しない。

さらに `core4.js` でprovider関連の重い研究データをlazy-load:
- `sourceReviewedTokenMorphology`
- `auditedInflectionEvidenceFull`
- `morphologyProviderPolicy`
- `localSyntaxFeaturePolicy`

特に `audited_inflection_evidence_500_full.json` は約38万文字。通常公開経路では取得せず、shadow debug時のみ読む。

### 公開前静的preflight
`data/public_release_preflight_20260920.json`

結果:
- index.html参照ローカルアセット: **13/13存在**
- JS: **12/12 構文PASS**
- `CHECKPOINT_DATA_PATHS` のJSON: **31/31存在・JSON.parse PASS**
- primary-source hold 5位置: 保護継続
- learner-visible detector: legacy維持
- shadow G6/G8 pendingは、shadow昇格条件でありlegacy-visible公開βとは分離

公開βの残ブロッカー:
1. 実ブラウザ / スマホ runtime smoke
2. production統合経路の確認

### branch統合上の注意
2026-09-20時点でGitHub APIの `main...checkpoint-main` 比較は **No common ancestor** を返した。
- 原因をCheckpoint側で推測して履歴を書き換えない。
- `main` へのforce-push / reset / direct mergeはしない。
- production統合担当側で、安全な統合方法（通常merge可否、必要ならcherry-pick / ファイル単位統合）を確認する。

### readiness
`data/shadow_promotion_readiness_20260919.json` を v0.4 へ更新。
- shadow: stage-2維持
- provider: implemented signal-only
- 新hard resolverを作る場合: **第五未使用作品goldを先にfreeze → blind**
- public beta: `CONDITIONAL_PASS`
  - static checks PASS
  - runtime smoke PENDING
  - production integration PENDING

### 今回の主要コミット（checkpoint-main）
- `deb1aa0be42653a4bc0ecf2e86d3f6b00e35112a` provider用data load
- `849b78bfd7a4d65546f108669df33721fb67a942` passage-independent morphology signals
- `898fb435b8cc277f18b98ad32a00c806bcc4c2fa` provider safety policy
- `0ebe20075d4c1004062fb0d52f806b848ff04837` provider audit
- `a7a6f001681e91a1865c65bbb1229333223f1044` normal UIでshadow auditを停止
- `71d1dd68e9dc0870b45939e5062e2a2680e89eea` heavy shadow data lazy-load
- `7e610ef6cbd3a0430acc10260e3cf03a1023c3f9` public release preflight
- `43c906c34180e6a336142431d023393c2b837516` readiness v0.4

### 次回再開
最優先:
1. `checkpoint-main` を確認
2. `public_release_preflight_20260920.json` のR8 runtime browser/mobile smoke
3. normal URLでshadow panel非表示・shadow data skippedを確認
4. 入力 → マーカー → drawer → レベル切替 → リセットのsmoke
5. production統合担当へ No common ancestor 状態を伝える
6. shadow研究は公開作業とは分け、hard rule追加前に第五blindをfreeze

再開短句:
**「checkpoint-main HANDOFF最終節から再開。公開βruntime smokeを実施」**


## 2026-09-20 継続: スマホ対応・「わかる」履歴

### 「ここはわかる」履歴
学習者が `✓ ここはわかる` を押したポイントを、予習チェックリスト下部に一覧表示する機能を追加。

仕様:
- 表面形
- カテゴリ
- 前後8文字程度の文脈（対象を【】で表示）
- 各行の `戻す`
- `すべて戻す`
- 0件時は履歴パネル非表示
- `aria-live="polite"` で更新通知
- 確認レベル変更では履歴を維持
- 本文自体を変更した場合は `dismissedKeys` を自動クリア
- 「戻す」後、現在の確認レベル対象なら本文・チェックリストへ再表示

実装:
- `index.html`: `knownHistory / knownHistoryStatus / knownList / restoreAllKnown`
- `core1.js`: `dismissedTextSnapshot`
- `ui1.js`: `knownPointContext / uniqueKnownHits / renderKnownHistory`
- `events.js`: 個別復帰・全件復帰
- `styles.css`: desktop/mobile history layout

### スマホ向けUI改善
`styles.css` / `events.js` を調整:
- viewport metaは既存でOK
- 680px / 430px breakpoint
- mobile主要操作を44px以上
- iPhone下部safe-area対応
- drawerを `92dvh` 対応
- drawer open時にbody scroll lock
- drawer自体はtouch scroll維持
- 430px以下ではdrawer footerを縦積み
- 「わかる」履歴も1列化
- textarea 17pxを維持し、iOSの16px未満focus zoomを回避

一文字の本文マーカー自体は横幅が小さいが、同じポイントを大きいチェックリスト項目から開けるため、スマホではチェックリストを代替タップ面として使える。

### mobile static audit
`data/mobile_ui_audit_20260920.json`

結果: **STATIC_PASS_RUNTIME_DEVICE_PENDING**

主なPASS:
- viewport
- responsive breakpoints
- 44px touch targets
- safe-area
- 92dvh drawer
- drawer scroll / background lock
- fixed-width overflow riskなし
- understood-history responsive layout
- JS最終構文 **12/12 PASS**

legacy detectorの計算量参考:
- 安倍晴明長文サンプル 877文字
- browser-free V8で500回実行
- 1011ms合計
- 平均 **約2.022ms / detect**

これはiPhone実測値ではないが、通常公開経路で明らかな計算量爆発は見られない。

### 実機確認がまだPENDINGの理由
`.github/workflows/deploy-pages.yml` は:
- push trigger = `main`
- `checkpoint-main` は通常Pagesへ配信されない

したがって、現在の公開URLで `checkpoint-main` の最新UIを確認したと偽装しない。
また他チームがproduction mainを使用しているため、Checkpoint側からpreview目的でproduction Pagesを上書きしない。

production統合後にiPhone Safariで確認:
1. portrait / landscape
2. 横スクロールなし
3. sample3 / sample4
4. 一文字マーカーとチェックリスト双方からdrawerを開く
5. drawer scroll中に背景が動かない
6. 「ここはわかる」2-3件 → 履歴一覧
7. 個別 `戻す`
8. `すべて戻す`
9. 本文変更 → 履歴自動クリア
10. normal URLでshadow debug非表示

### release preflight更新
`public_release_preflight_20260920.json`
- R8: `PARTIAL_PASS`（mobile static PASS / device runtime pending）
- R11: `PASS`（understood-point history）
- legacy-visible public betaは引き続き `CONDITIONAL_PASS`

### 今回の主要コミット
- `b90bf6cf68d27a9b79cdb5e2d5abd92f1f307cd6` understood history HTML
- `4b3c213999a64999031d3582f6539b6123092847` current-text scope
- `1545f4fa0232df0698c911e571b4e25c7e3f4f90` history rendering
- `f8a223d95caf81f91b395f594785c3981ff45ab5` restore actions / mobile drawer lock
- `8a016e5f3692e9a632edca0b1bc583ec659a5d47` responsive / safe-area styling
- `14803fdc62c0389e89e2ed94f5af4f73d0540215` mobile UI audit
- `d3fad0d89a6b5f9f65420146d3b96bd589159ac1` release preflight update
- `ec3e9ac2929fb70bf55b068bbe46e3c2b5774dbd` restore-level explanation

### 次回の公開作業
1. `checkpoint-main` を維持
2. production統合方法をkoten側で確認
3. 統合後のPagesをiPhone Safariで上記10項目smoke
4. 問題なければ public beta runtime gateをPASSへ
5. shadow研究は第五blindを別レーンで継続

再開短句:
**「checkpoint-main HANDOFF最終節から再開。production統合後のiPhone smokeへ」**


## 2026-09-20 継続2: 公開βDOM smoke自動化・production差分固定

### 自動DOM smoke
追加:
- `tests/unit/checkpoint-public-beta.test.mjs`
- `.github/workflows/checkpoint-public-beta.yml`

jsdomで実際の `checkpoint/index.html` と12本のclassic scriptを読み込み、公開UI操作を自動確認する。

検証:
1. 通常URLで `shadowDebugPanel.hidden === true`
2. 通常URLで `document.documentElement.dataset.shadowData === "skipped"`
3. drawer openで `body.drawer-open`
4. closeで `body.drawer-open`解除
5. 「ここはわかる」→履歴1件
6. 履歴に対象文脈 `【…】`
7. 個別 `戻す` → 元件数へ復帰
8. 複数「わかる」→ `すべて戻す`
9. 本文変更 → 履歴自動クリア
10. mobile CSS contract:
   - 680px / 430px breakpoint
   - 44px touch target
   - safe-area
   - 92dvh
   - body scroll lock
   - textarea 17px

初回run `35481895053` は、テスト終了後にも非同期 `loadCheckpointData()` が残るテスト側の問題でfailure。
各機能テスト自体は6件すべてPASSしていた。

修正後run:
- run: **35481928465**
- head: `414514e911ab88b4187993a725d369e0b7080daf`
- conclusion: **SUCCESS**

アプリ本体の不具合ではなくtest teardown問題だったことをログで確認済み。

### production差分の固定
`data/production_integration_delta_20260920.json` を作成。

mainの `checkpoint/` 自体は存在しており、checkpoint-mainとの差は限定的。
スナップショット時:
- top-level changed: 11
- `checkpoint/data` changed: 7
- runtime critical: 13
- unchanged runtime:
  - `core2.js`
  - `core3.js`
  - `detect1.js`
  - `detect2.js`
  - `detect3.js`
  - `ui2.js`
  - `ui3.js`

delta JSONには各ファイルの:
- production `mainSha`
- `checkpointSha`
- ADD / UPDATE
- size
を記録。

production統合時は必ず `mainSha` を再照合する。
main側が変化していれば、そのファイルは自動上書きせず再レビュー。

### release preflight更新
`public_release_preflight_20260920.json`
- R8: `PARTIAL_PASS`
  - static mobile PASS
  - automated DOM smoke PASS
  - iPhone Safari actual deviceのみPENDING
- R11: understood history PASS
- R12: automated public-beta DOM smoke PASS
- production integration delta: FROZEN

残る公開ブロッカー:
1. production ownerによるファイル単位integration
2. 統合直前のmainSha再照合
3. Pages deploy
4. iPhone Safari実機smoke

### branch-only workflow
Checkpoint Public Beta Smoke は `checkpoint-main` 専用。
production deployは行わない。
triggerはruntime関連:
- `checkpoint/*.js`
- `checkpoint/index.html`
- `checkpoint/styles.css`
- `checkpoint/data/**`
- test / workflow / package lock
に限定し、HANDOFF等だけの更新では不要なrunを発生させない。

### 今回の主要コミット
- `e30c741352fcd8c948115e129e93438606c908d5` DOM smoke tests
- `fc41a2f5d7d82d85dd0667ff8b42ef0064b0a31c` branch-only smoke workflow
- `414514e911ab88b4187993a725d369e0b7080daf` async teardown fix / successful smoke head
- `870a99b5dc5d203e8e17d96abea6134d13d601b8` production integration delta
- `05924ef40feb226d8ff1e0eedcaa925e62278cdc` preflight automated smoke evidence
- `e04fd93963e90345bd50a9d8c48d6ce753eb0ec5` workflow trigger narrowing

### 次回
**実装側はproduction統合待ちの状態まで到達。**
統合担当は `PRODUCTION_INTEGRATION.md` と `data/production_integration_delta_20260920.json` を先に読む。

再開短句:
**「checkpoint-main HANDOFF最終節から再開。delta再照合→production統合→iPhone smoke」**


## 2026-09-20 継続3: WebKitスマホbrowser smoke

公開βのスマホ確認を static/jsdom から一段進め、Playwright WebKitで実ブラウザsmokeを追加。

追加:
- `tests/checkpoint-public-beta-browser.smoke.mjs`
- branch-only workflowに `npx playwright install --with-deps webkit` とbrowser smoke step

GitHub Actions:
- run: **35482145135**
- head: `62f70c3532f4419252437768554d8b8b9d3bbe6f`
- result: **SUCCESS**
- engine: **WebKit 26.5**

実測条件:
- portrait: **390 × 844**
- landscape: **844 × 390**
- sample3 checklist: **16**
- 安倍晴明long sample rendered markers: **162**

PASSした操作:
1. normal URLでshadow panel hidden
2. `shadowData=skipped`
3. portraitで横overflowなし
4. **一文字の本文markerをtouchしてdrawer open**
5. drawer open中のbody scroll lock
6. 「ここはわかる」→履歴
7. 個別「戻す」
8. 複数履歴→「すべて戻す」
9. 本文変更→履歴自動clear
10. long sample描画
11. landscapeで横overflowなし
12. landscape drawerがviewport内に収まる

`mobile_ui_audit_20260920.json`:
- status → `BROWSER_EMULATION_PASS_RUNTIME_DEVICE_PENDING`
- M11 WebKit mobile browser smoke PASS

`public_release_preflight_20260920.json`:
- R13 WebKit mobile browser smoke PASS
- browser runtime = `PASS_EMULATED`
- R8は物理iPhone未確認のため `PARTIAL_PASS` のまま

残るスマホ確認は **production統合後の物理iPhone Safari最終smokeのみ**。
WebKit emulationは強い確認だが実機そのものではないため、実機PASSとは記録しない。

再開短句:
**「checkpoint-main HANDOFF最終節から再開。production delta照合→統合→物理iPhone smoke」**


## 2026-09-20 継続4: スマホ実寸tap target・public/shadow経路分離

Playwright WebKit mobile smokeをさらに強化。

最新確定smoke:
- run: **35482932843**
- head: `2fc149f4086e42eb7a3d4e00872ae7b252d8414c`
- WebKit 26.5
- result: **SUCCESS**

### WebKit計算後の実寸tap target
portrait 390×844でbounding boxを実測:
- 上部action buttons 最小: **44px**
- 確認範囲 `#checkLevel`: **46px**
- checklist item 最小: **約81.09px**
- drawer close: **44px**
- `ここはわかる`: **44px**
- 個別 `戻す`: **44px**

確認範囲selectは当初mobile 44px指定の対象外だったため、
`styles.css` に `#checkLevel{min-height:44px}` を追加。
WebKit計算値46pxでPASS。

### public / shadow data-path分離
同じWebKit smokeで:
- normal `/checkpoint/`
  - `externalData=loaded`
  - `shadowData=skipped`
  - `auditedInflectionEvidenceFull === null`
  - `morphologyProviderPolicy === null`
- `/checkpoint/?debug=shadow`
  - `shadowData=requested`
  - audited morphology corpus loaded
  - morphology provider policy loaded

したがって、公開UIに必要なdata loadを保ったまま、
研究用heavy dataだけをnormal URLから外す分離をbrowser levelでも確認済み。

### テスト上の一時failure
実寸tap test初版は `#nextPoint` が常にvisibleと仮定しfailure。
単一point drawerではnextが非表示になる正常仕様だったため、
**visibleな場合だけ44pxを要求**するようtestを修正。
アプリ本体のfailureではない。

### 現在の公開残作業
実装・自動検証側はほぼ完了。
残るgate:
1. production deltaの最終再生成・main SHA再照合
2. production ownerによるfile-level integration
3. Pages deploy
4. **物理iPhone Safari** smoke

再開短句:
**「checkpoint-main HANDOFF最終節から再開。final delta照合→production統合→物理iPhone smoke」**


## 2026-09-20 継続5: 公開UI・文言整理

公開版を「説明するUI」から「触れば分かるUI」へ寄せて整理。

### 撤廃
- `Checkpoint β0.1` 表示
- 長いsubtitle / 注意書き / footer説明
- 数字つき5段階の確認範囲
- 公開用の件数ダッシュボード / 非表示件数
- 常時表示の例文4ボタン
- 「次に見る」「次へ」系の表示と導線
- drawerの順送り状態
- 「ミニ解説」等の機能説明的ラベル

公開実行ファイル全体で `次に見る / 次にみる / 次へ / nextPoint` を再走査し、UI経路から0件。

### 現在の公開UI
入力:
- 本文
- 見る範囲: **厳選 / ふつう / 細かく**
- **見る**
- **消す**
- **例文** はdetails内に収納
  - 枕草子
  - 和歌
  - 識別
  - 長文

結果:
- **ポイント**
- 本文マーカー
- **チェック**
- **わかる** 履歴
- **全部戻す**

drawer:
- 複数観点は順番ではなくラベルから自由選択
- 主操作は **ヒント**
- 補助: 類例 / 候補 / 例外 / 敬語 / 答え
- `✓ わかる` でdrawerを閉じ、一覧へ戻る
- 自動で別観点へ進まない
- 候補詳細の `ミニ解説` は **補足**、`見るポイント` は **手がかり**

### 表示範囲の内部対応
公開3択は既存detector tierをそのまま利用:
- 厳選 = value 1
- ふつう = value 2
- 細かく = value 4

内部tier 3 / 5の処理自体は削除せず、公開selectからのみ外した。

### 検証
Checkpoint Public Beta Smoke:
- run **35486907188**
- head `575929e5ad16b263868f2c7d80b3602658d889ad`
- **SUCCESS**
- DOM smoke PASS
- WebKit mobile smoke PASS
- portrait 390×844 / landscape 844×390
- example picker computed height 44px
- level selector 46px
- checklist min 約81.09px
- drawer close / わかる / 戻す = 44px
- long sample 162 markers
- public/shadow data path separation PASS

### production反映
公開runtime 8ファイルをSHA確認後、file-levelでproduction `main` へ反映:
- index.html
- styles.css
- core1.js
- detect2.js
- ui1.js
- ui2.js
- ui3.js
- events.js

production上で **8/8 target blob一致** を確認。
main history merge / reset / force-pushは行っていない。

### 次回
物理iPhoneで新しい公開UIを確認し、表現・余白・操作順について実機ベースで微調整する。

再開短句:
**「checkpoint-main HANDOFF最終節から再開。整理済み公開UIの実機確認から」**


## 2026-09-20 継続6: 仮名遣い「類例」全件精査・表示経路修正（一時記録）

### ユーザー方針
仮名遣いの「類例」は、単に規則上作れる語ではなく、
1. **文語・古典本文で実際に用いられる表現**
2. **その規則を混乱なく示せる**
3. **別の読み・別規則との競合が少ない**
ものに限定する。

明示的に除外:
- `あふ → あう`：オウ読みにもなり得て学習上混乱
- `たまふ → たもう`：「たまふ」のまま扱う余地があり規則例として不適
- `かう → こう`：現代語「こう」そのものに近く、今回の文語類例として弱い
- 現代語のみの語（例: ズボン）は不可

ユーザー提案:
- H1の末尾に **`ほふし → ほうし`** を採用候補として入れる。

### 現在の実装
`checkpoint/core3.js` の `KANA_RULE_DEFS` に各規則の類例を5件前後追加。
現時点の主なL1:
- まうす → もうす
- まうづ → もうず
- らうたし → ろうたし
- らうらうじ → ろうろうじ
- さうざうし → そうぞうし

L1から上記除外3例は入れていない。

### 類例の表示経路
従来は `KANA_RULE_DEFS.examples` を増やしても、drawer「類例」に必ず出る構造ではなかった。

`checkpoint/detect1.js` の `examplesForHit(h)` を変更し、
- `type==="orthography"`
- `kanaRuleIds / kanaRuleId`
から対応する `KANA_RULE_DEFS.examples` を直接集め、
仮名遣いdrawerの「類例」に表示するよう修正。

### 回帰テスト
`tests/unit/checkpoint-public-beta.test.mjs` に、
`やうなり` を「細かく」で解析し、L1「類例」に以下5件が実表示されることを確認するtestを追加:
- まうす → もうす
- まうづ → もうず
- らうたし → ろうたし
- らうらうじ → ろうろうじ
- さうざうし → そうぞうし

同時に以下が表示されないことを固定:
- あふ → あう
- たまふ → たもう
- かう → こう

### この時点の主要blob
- `core3.js`: `3bddb86d715dde59e999f9a658fe20980ed3a63b`
- `detect1.js`: `1d2f1c721eedb21cc59766ccce95a874a983190f`
- unit test: `eac2fa1e777dcdc14fa621a4f266aa50c9d69fcc`

### 未完了
**全規則の類例について出典・語形監査がまだ完了していない。**
特に H1-b / K1 / N1 / L2 / L3 / S1 は、5件を埋めるために採用するのではなく、古語辞典・古典本文等で再確認し、怪しい例は差し替えまたは保留にする。

L4（オ段＋う）は無理に5例を埋めず、現状 `record-only / examples: []` とする方針。

### 再開短句
**「仮名遣い類例の継続6から再開。全規則を文語出典監査→怪しい例を差替え→UI実表示テスト」**


## 2026-09-20 一時停止: 仮名遣い類例の全件精査・表示経路修正

### ユーザー確定方針
仮名遣いの「類例」は、単に歴史的仮名遣いとして成立する語ではなく、**高校古文で扱う文語表現・古典本文で実際に出会いうる形**を優先する。

特に以下は除外確定:
- `あふ → あう`
  - オウ系の読みとの混同を招くため、規則例として使わない。
- `たまふ → たもう`
  - 学習上の扱いに揺れがあり、規則確認用には使わない。
- `かう → こう`
  - 現代語に直結しすぎ、文語類例としては採用しない。
- 現代語例（例: ズボン）は使用しない。

H1 の末尾例としては:
- `ほふし → ほうし`
を採用候補として追加済み。

### 現在の実装
#### 1. KANA_RULE_DEFS の examples を文語中心に更新
`checkpoint/core3.js`
commit:
- `b897319473b9e441c1b715483bfa37ad5176fcdc`

主な更新:
- H1:
  - あはれ → あわれ
  - おもひ → おもい
  - いふ → いう
  - まへ → まえ
  - ほふし → ほうし
- L1:
  - まうす → もうす
  - まうづ → もうず
  - らうたし → ろうたし
  - らうらうじ → ろうろうじ
  - さうざうし → そうぞうし
- L2:
  - うつくしう → うつくしゅう
  - いみじう → いみじゅう
  - あやしう → あやしゅう
  - くるしう → くるしゅう
  - よろしう → よろしゅう
- L3:
  - けふ → きょう
  - せうと → しょうと
  - せうそこ → しょうそこ
  - てうづ → ちょうず
  - えうなき → ようなき
- L4:
  - 無理に5例を埋めず `examples: []`
  - `reviewStatus: "record-only"`

H1-a / H1-b / H1-c / W1 / W2 / W2-a / D1 / D1-a / K1 / N1 / S1 も5例前後へ拡張しているが、**全例の一次・信頼できる辞書資料による再確認は未完了**。
次セッションでは「実装済みだから確定」と扱わず、全例を再監査すること。

#### 2. 「類例」表示経路を修正
`checkpoint/detect1.js`
commit:
- `cff153eefe0f1538909dc4e7cc18f0ac14bb8072`

変更:
- `examplesForHit(h)` で orthography の場合、
  `kanaRuleIds / kanaRuleId` から `KANA_RULE_DEFS.examples` を取得。
- 仮名遣いdrawerの「類例」で、法則説明ではなく**精査済み類例そのもの**を表示する経路へ変更。

#### 3. L1表示の回帰テストを追加
`tests/unit/checkpoint-public-beta.test.mjs`
commit:
- `2d18ae8cb6bf9fee1b4a8cd1b6f908b6e8726e71`

テスト内容:
- 本文 `やうなり`
- 見る範囲 `細かく`
- L1ポイントを開く
- `類例` を開く
- 以下5例が表示されること:
  - まうす → もうす
  - まうづ → もうず
  - らうたし → ろうたし
  - らうらうじ → ろうろうじ
  - さうざうし → そうぞうし
- 以下3例が出ないこと:
  - あふ → あう
  - たまふ → たもう
  - かう → こう

### 未完了・次セッションで最優先
1. **全ルールの類例を再監査**
   - 古典本文・古語辞典等で文語形を確認
   - 現代語例を排除
   - 別規則との混線が強い例を排除
   - 「5例埋めること」自体を目的にしない
2. 特に要精査:
   - H1-b 複合語
   - K1 合拗音
   - S1 拗音・促音
   - N1 文法形
   - W2 / W2-a
3. 最新の unit test / WebKit smoke を**まだ最終確認していない**
4. この仮名遣い類例更新は**production main / 公開URLへ未反映**
5. 全例監査とテストPASS後にのみ production へ反映する。

### 停止位置
コード変更は上記3コミットまで。
この節を書いた時点では、それ以上の仮名遣い類例実装・公開反映は行わない。

再開短句:
**「checkpoint-main HANDOFF最終節から再開。仮名遣い類例を全ルール再監査→テスト→公開反映」**


## 2026-09-20 継続: 仮名遣い類例16規則のローカル統合・公開前QA

### 正本と監査案

- `checkpoint-main` を `origin/checkpoint-main` から fast-forward pull し、停止記録の HEAD `5fbbb842d0c409f6b98132f4860aaf2a4b2ff49a` で開始した。元の `D:\dev\koten` は別作業の変更があるため触れず、`D:\dev\koten-checkpoint-main` の分離 worktree で作業。
- Google Drive直下の4資料（prelocalaudit MD/JSON、test vectors JSON、local apply handoff MD）を確認。いずれもAI案で `proposedBy: ai` / `reviewStatus: pending`。最新の人の裁定・一次資料・本HANDOFF・ローカル実装を優先した。
- 16規則の現行類例とAI案を機械的に照合。5例列の完全一致は0、ローカル根拠を覆す確定差し替えは0。分類は次のとおり。

| 分類 | 規則 | 裁定 |
|---|---|---|
| 現行ローカル優先 | H1, H1-a, H1-c, W1, W2, W2-a, D1, D1-a, K1, N1, L1, L2, S1 | 既存の古典実例・除外理由を維持。漢字を主表示へ戻さない。 |
| 複合例なので表示位置変更 | H1-b, L3 | `ゆふひ`・`うちはらふ`・`けふ` は単一規則主例でなく全語確認に置く。 |
| 現行ローカル優先（記録のみ） | L4 | 最新HANDOFFどおり `record-only / examples: []`。AI案の5例は主例へ追加しない。 |

- 現行主例は74件（14規則×5、L3×4、L4×0）。AI案の80件は候補ベクトルとして全件照合したが、複合例とL4の扱いがローカル確定方針に衝突するため、80件をそのまま公開主例とはしていない。L3の5件目は一次資料との個別照合まで保留。
- 採用した全74例は `core3.js` の `KANA_RULE_DEFS.examples` と `data/kana_examples_audit_20260920.json` に同一内容で記録。今回の実変更は H1（`ほふし` を複合確認へ、`にほひ` を主例へ）、H1-c/W2-a（ひらがな主表示）、N1（助動詞形のみ）、L1（`まうづ` を複合確認へ、`やうなり` を主例へ）、L3（`けふ` を複合確認へ）、S1（`きやく`・`しゆじん` を採用し複合的な旧例を除外）。
- 主例から除外した代表は `ズボン`、`がつこう`、単独 `かう`、`たまふ`、`あふ`、K1の `くわんおん`、複合例 `まうづ`・`けふ`・`ほふし`。AI案の `もつとも` はローカル監査の除外裁定を優先し、RC16表示確認だけで使う。
- 複合6例（`まうづ→もうず`, `けふ→きょう`, `ほふし→ほうし`, `いつしよ→いっしょ`, `ゆふひ→ゆうひ`, `うちはらふ→うちはらう`）は既存whole-word経路で全語テスト。新しい `combined` データモデルは導入していない。
- RC16の歴史的主表示 `きやく / しゆじん / ちよくし / もつとも` は大書き維持、現代化側のみ `きゃく / しゅじん / ちょくし / もっとも`。類例で漢字を一意に固定しない。

### 表示経路・QA

- `examplesForHit()` が16規則の `KANA_RULE_DEFS.examples` を返すことを全件テスト。L4空配列で法則文へ逆戻りしない。H1-a/H1-b/H1-c、W2-a、D1-aの例外類例は親規則のdrawerから到達可能にした。N1は単独文字列 `む` を自動確定せず文法判断待ち。
- AI test vectors JSONは `tests/fixtures/kanazukai_example_test_vectors_2026-09-20.json` に `pending` のまま保存し、80候補件数、禁止例、複合6例、RC16の現行テストへ利用。候補80件を無条件に公開主例とするテストにはしていない。
- `node --test tests/unit/checkpoint-public-beta.test.mjs`: 13/13 PASS。
- `node tests/checkpoint-public-beta-browser.smoke.mjs`: WebKit portrait 390×844 / landscape 844×390 PASS、長い例外句・RC16とも横overflowなし、long sample marker 257件。
- `npm test`: Node 760件（731 PASS、29 SKIP、0 FAIL）、Vitest 30 files（354 PASS、2 SKIP）。
- `npm run typecheck`、`npm run lint`、`npm run build`、`npm run data:check` PASS。
- `npm run scan:publish`: 759件・違反0。`npm run check:eol`: 1224件・違反0。`check:font`、`check:font-assets`、`check:overflow`、`check:font-weight`、`check:storage` もPASS。
- `npm run test:rules` は Firebase emulator がポート8088を確保できず未実行。今回のCheckpoint類例変更とは別系統のテスト。ポートを占有する他プロセスは停止していない。

### 公開状態・次の再開位置

- この類例更新はこの記録時点で production `main` / 公開URLへ未反映。`checkpoint-main` の検証workflowはproduction Pages deployではない。
- production `origin/main` を読み取りで最新取得し、HEAD `28eac51c7a745be604d652930212d21071cf2770` を確認。旧 `production_integration_delta_20260920.json` のmainShaは18対象すべてで更新済みのため、この旧スナップショットを適用条件に使わない。今回の7ファイルのmainSha・candidateShaを `data/production_kana_integration_delta_20260920.json` に新規記録した。適用直前に再照合する。
- `PRODUCTION_INTEGRATION.md` の現行手順ではCheckpoint側から `main` へ直接pushしない。production ownerが最新mainのblob SHAを再照合し、必要な `checkpoint/` ファイルだけ統合する。履歴merge・reset・force-pushはしない。
- 残件: L3の5件目の一次資料確認、production ownerによるfile-level integration、Pages deploy後の公開URL類例・RC16・キャッシュ確認、物理iPhone Safari smoke。
- 再開短句: **「checkpoint-mainのこの最終節から再開。production delta再照合→owner統合→公開URL/実機確認」**
