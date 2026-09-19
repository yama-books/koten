# Checkpoint DB進捗 2026-09-19

## 本日の主作業
- 係り結び30例を同形識別ルートへ接続
- shadow detector の保守的 resolver を強化
- 既存4サンプルで legacy / DB 差分を数値化
- 誤信号を確認して、係り結びの raw近傍自動推定を撤回

## 実装
- `data/kakari_musubi_routes.json`
- `data/surface_match_policy.json` v0.2
- `db-shadow.js`
- `data/discrimination_rules.json` v0.4
- `data/shadow_audit_20260919.json`
- `SHADOW_AUDIT_2026-09-19.md`

## 監査結果
既存4サンプル、計990文字。

- legacy raw: 348
- legacy unique位置: 310
- legacy重複: 38
- DB raw: 310
- **surface_index被覆: 100%**
- DB resolved: 69
- DB suppressed: 241
  - context-required: 207
  - larger-db-surface-preferred: 34
- DB未収録: 0
- resolved rate: 22.3%

初回の89.1% / 19.8%は legacy重複38件を含む比較だったため訂正。
22.3%は正答率ではなく、文脈未解決候補を止めた後の通過率。

## 回帰
- 係り結び route API: 8/8 PASS
- 形容詞内部一致抑制: 2/2 PASS
- `や・か・ぞ・こそ` の raw文字列距離だけで係り先を推定する方式は不採用

## 次
legacy unique 310位置はすべて surface_index に存在することを確認済み。
次は context-required 207位置を安全に解く resolver を増やす。

優先度は `て`・`に`・`と`・`し`・`る`・`を`・`ば`・`な`。
ただし一次資料未確認の助動詞活用表を推測で埋めることはしない。


## 追加: 500例 exact-form context resolver

- 500例から2文字以上・品詞/活用形一意の413表面形を抽出。
- うち209を kanji-anchored、204を kana-only-needs-tokenizer に分類。
- USB-3212接続規則と組み合わせる `context_resolver_rules.json` を追加。
- `ぬ・ね・ば・る` は候補が一意になる場合のみshadow resolvedへ昇格。
- `し・に・て・な・せ` はsupport-onlyで、通常は抑制を解除しない。
- 仮名のみ語形の自動利用は、語内部誤一致（例: 「ごとく」中の「とく」）を確認したため停止。
- 4サンプル再監査: resolved 69→70、suppressed 241→240、DB only 0。
- 新規resolved: 「開いて見れば」の `見れ＋ば` 1件。


## 追加: 既知語境界・百人一首exact phrase

- `known_token_boundary_index.json` を追加。trusted whole-token 290表面形。
- 4サンプルで短い内部hitを20位置追加抑制。
- suppression内訳は context-required 188 / larger-db 32 / known-larger-token 20。
- resolvedは70のまま。ノイズを「解く」のではなく安全に除去する改善。
- `hyakunin_disambiguation_evidence.json` に百人一首の要注意17例を exact phrase evidence 化。
- `hyakunin_disambiguation_regression_20260919.json`: 17/17 PASS。
- 「に」の連体形前接では、USB-3212に従い格助詞・接続助詞の両候補を保持するようresolverを修正。


## 追加: 双方向resolver・shadow v0.5

- USB-3212の後続cueを `context_resolver_rules.json` に追加。
- 連用形＋`に`＋`けり`、連用形＋`て`＋`む/けり/き/まし` のshadow resolverを実装。
- 単体回帰4/4 PASS。テスト文字列は配線確認用で、新規コーパス証拠ではない。
- 百人一首 exact phrase の `知らぬ` が識別サンプルに一致し、resolved 70→71。
- 4サンプル最新版: resolved 71 / suppressed 239 / DB only 0 / resolved率22.9%。
- suppression内訳: context-required 187 / larger-db 32 / known-larger-token 20。


## 追加: shadow v0.6 / 残件151

- 1文字context-required hitが、より長いindexed grammar/discrimination surface内に完全包含される場合、短いhitを `indexed-larger-surface` として抑制。
  - 例: `な→なり`, `る→たる`, `る→ける`, `し→ましか`
- USB-3212に基づく `けれ＋ば` resolverを追加。長文サンプルの6箇所を確定条件候補としてshadow resolvedへ昇格。
- v1.3の BASIC_WORDS 28語をDB境界レイヤへ移行し、known-larger-token抑制は20→31位置。
- 500例全件を `audited_inflection_evidence_500_full.json` に保存:
  - 500行
  - 447表面形
  - 19曖昧表面形
  - 曖昧分析を捨てず全候補を保持
- 4サンプル最新版:
  - raw 310
  - resolved **77**
  - suppressed **233**
  - DB only 0
  - resolved率 **24.8%**
- suppressed内訳:
  - indexed-larger-surface 51
  - known-larger-token 31
  - context-required 151
- 残151位置は `context_required_backlog_20260919.json` に表面形別・必要レイヤ別で整理。


## 追加: 全500例 evidence DB と shadow 77/310

- Driveの500例マイルストーンを引用符対応CSVとして再読込し、500行→447表面形へ再構成。
- `audited_inflection_evidence_500_full.json`:
  - 500例全件の target / lemma / 活用種類 / 活用形 / anchor / source を保持
  - 447表面形
  - 19表面形は複数分析を保持
  - consensus は500例内部の一致状況であり一般文法の一意性とは扱わない
- `known_token_boundary_index.json` をfull DBのkanji-anchored targetで増補。
- `indexed-larger-surface` 抑制を追加。例: `なり` 内の `な`、`たる` 内の `る`、`ける` 内の `る`、`ましか` 内の `し`。
- `けれ＋ば` をUSB-3212の已然形根拠でsource-left-surface resolverに追加し、長文で6件resolved。
- 最新4サンプル: raw 310 / resolved **77** / suppressed **233** / DB only 0。
- suppressed: context-required 151 / indexed-larger-surface 51 / known-larger-token 31。


## 追加: 安倍晴明 exact source / shadow v0.7

ユーザー提供 `安倍晴明_本文・文法・語彙整理.docx` を再利用。

- `abe_seimei_grammar_evidence.json`: 文書に明示された助動詞分析等を24 exact phrase evidenceへ構造化。
- `abe_seimei_grammar_regression_20260919.json`: 24/24 PASS。
- `abe_seimei_vocabulary_evidence.json`: 中学生向け難語29語を構造化。
- vocabulary evidenceをknown-token boundaryにも追加。
- exact grammar evidenceの効果:
  - 15位置をsource-exact resolved
  - 9位置をsource-exact larger-unitとして抑制
- 特に重要:
  - `入らむ` 内部の `らむ` を一語の現在推量「らむ」と誤認しない
  - `ならむ` 内部の `らむ` を一語と誤認しない
  - `黄なる` 内部の `な・る` を独立候補にしない
  - `かたり` 内部の `たり` を助動詞候補にしない
  - `塞がる` 内部の `が・る` を独立候補にしない
- 4サンプル最新版:
  - raw 310
  - resolved **85**
  - suppressed **225**
  - context-required **134**
  - resolved率 **27.4%**
  - DB only 0


## 追加: 安倍晴明 exact evidence 強化 / shadow 86

- `abe_seimei_grammar_evidence.json` を24→28ケースへ拡張。
- grammar exact regression: **28/28 PASS**。
- `abe_seimei_kakari_evidence.json` を追加し、係り結び5表現をexact scope-link化。
- kakari regression: **5/5 PASS**。
- 4サンプル最新版: raw 310 / resolved **86** / suppressed **224** / DB only 0。
- resolved率 **27.7%**。
- context-required は **132**。
- source exact evidenceで `入らむ/ならむ` 内部の `らむ` 誤優先、`黄なる` 内部の `な/る`、`問はるる` 内部の一文字 `る` 等を抑制。


## 追加: 百人一首文節境界 / shadow v0.8

- `hyakunin_bunsetu_boundary_evidence.json` を追加。
- 第9首の監査済み `ながめ/せし/まに` から、明示された名詞 `ながめ` の語内部だけを境界証拠化。
- `ながめ` 内部の `な`・`が` 2位置を抑制。
- `せし`・`まに` は内部品詞を勝手に確定せず保留。
- resolved 86 / context-required **130** / DB only 0。


## 追加: hard-boundary / source-limited `ば` resolver / shadow v0.9

既存4サンプルの context-required 130位置を再分類し、文字境界だけで安全に解けるものと、長い左文脈で安全に接続判定できるものを先に処理した。

### 実装
- `context_resolver_rules.json` v0.2
  - 閉じ引用符 `」/』` 直後の `と` を hard-boundary rule として分離。
  - USB-3212の「格助詞『と』は引用を表す文・句に接続」の根拠だけを使用。
- `db-shadow.js`
  - `resolved-by-source-hard-boundary` を追加。
  - hard-boundary rule は learner-visible detector へは接続しない。
- `known_token_boundary_index.json` v0.2
  - 副助詞 `ばかり` をwhole-token境界として追加。
  - 内部の一文字 `ば` を独立候補として扱わない。意味判定には使わない。
- `external_grammar_crosscheck_20260919.json`
  - 外部文法照合を一次資料確認と分離して保存。
  - `給へ / 申せ / のたまへ / たれ / ましか` の形をshadow用安全確認として保持。
  - auxiliary_master の primary-source-verified には昇格しない。
- `context_resolver_rules.json` の leftSurfaceRules を追加。
  - `し給へ + ば` 2件 → 確定条件候補
  - `ましか + ば` 1件 → 仮定条件候補
  - `申せ + ば` 1件 → 確定条件候補
  - `のたまへ + ば` 1件 → 確定条件候補
  - `投げ上げたれ + ば` 1件 → 確定条件候補
  - 同形衝突を避けるため、一般の `給へば` / `たれば` へは広げない。
- `boundary_resolver_regression_20260919.json` を追加。

### 4サンプル再監査
- legacy unique: 310
- DB raw: **310**
- DB resolved: **105**
- DB suppressed: **205**
- DB only: **0**
- resolved率: **33.9%**
- context-required: **109**

v0.8からの変化:
- 引用符直後の `と`: 13位置 resolved
- `ばかり` 内部の `ば`: 2位置 suppression
- source-limited `ば`: 6位置 resolved
- context-required **130 → 109**

現在の未解決:
`て28 / に24 / を21 / し13 / と10 / な4 / が4 / せ3 / る1 / ぬ1`

### 判断
- `ば` は既存4サンプル上では context-required 0になった。ただし一般規則化はしない。
- `と` は引用境界13件を解消した。残10件は内容格助詞・タリ活用・断定・語内部等を混ぜずに別レイヤで扱う。
- 次の主ボトルネックは `て / に / を / し / と`。特に `て / に / を` は文節・語境界が必要で、無理なresolved化をしない。
- 次段階は全文tokenizerではなく、context-required周辺だけを見る **局所 boundary/tokenizer 層** を検討する。


## 2026-09-19 17:41 JST 停止チェックポイント / shadow v0.11

このセッションはここで一時停止。

現行4サンプル:
- legacy unique: 310
- DB raw: **310**
- DB resolved: **121**
- DB suppressed: **189**
- DB only: **0**
- resolved率: **39.0%**
- context-required: **85**

未解決:
`て28 / を21 / に20 / と10 / が3 / な1 / せ1 / ぬ1`

v0.8（context-required 130 / resolved 86）から:
- context-required **130→85**
- resolved **86→121**
- raw coverage 310/310 と DB only 0 を維持。

この後半で追加した安全改善:
- local boundary signal層を signal-only で導入。句読点・文字種遷移を観測するが単独では判定しない。
- 百人一首第9首を passage-specific exact evidence 化し、和歌サンプルのcontext-requiredを9→0。
- 安倍晴明sourceの `遣はし / 御越し / 物もなし / うち合せて` 等を、境界またはexact evidenceとして限定利用。
- `たなびき / 取り出だし` を出典付きwhole-token境界へ追加。
- 安倍晴明本文で残っていた `し` 8位置は誤検出として消さず、サ変「す」連用形の学習ポイントとしてexact passage限定でresolved。
- Abe grammar evidence は **38件、回帰38/38 PASS**。

重要な保留:
- `不便にせさせ給ひ` の最初の `せ` は、助動詞「さす」の接続が一次資料未確認なので保留。
- learner-visible detectorはまだlegacy。shadow結果を自動正解表示へ接続しない。
- 外部文法照合は `external_grammar_crosscheck_20260919.json` に隔離し、primary-source-verifiedへ昇格しない。

次回は残85件のうち `て / を / に / と` の局所境界・統語判定を主対象とする。


## 追加: 安倍晴明 助詞 exact evidence / shadow v0.12

前回停止地点 v0.11（context-required 85 / resolved 121）から、同程度の進捗を一旦のゴールとして助詞層を追加した。

### 新設
- `data/abe_seimei_particle_evidence.json`
  - 文法・助動詞evidenceと分離した助詞専用のpassage-specific evidence。
  - 42 evidence entries が本文上47位置に作用。
- `data/abe_seimei_particle_regression_20260919.json`
  - 47位置の期待動作を固定。
- `db-shadow.js`
  - `resolved-by-source-exact-particle`
  - `source-exact-particle-larger-unit`
  を追加。
- loader / manifest に新データを登録。

### 今回処理した47位置
- 接続助詞 `て`: **20位置 resolved**
- 格助詞 `を`: **20位置 resolved**
- `とて` 内部の `て`: **6位置 suppression**
  - 「とて」一語扱いと「と＋て」分析の揺れを保持し、一意化しない。
- `さて` 内部の `て`: **1位置 suppression**

### 安全条件
- 安倍晴明本文の完全一致箇所だけ。
- 別本文へ一般化しない。
- USB-3212の候補定義＋外部文法照合は補助根拠で、primary-source-verifiedとはしない。
- learner-visible detectorには接続しない。

### v0.12 実測
- legacy unique: 310
- DB raw: **310**
- resolved: **161**
- suppressed: **149**
- DB only: **0**
- resolved率: **51.9%**
- context-required: **38**

v0.11→v0.12:
- resolved **121→161**
- context-required **85→38**
- 差分47位置は 40 resolved + 7 larger-unit suppression。

残38:
`に20 / と10 / が3 / て1 / ぬ1 / を1 / な1 / せ1`

主ボトルネックは `に` と `と` に収束。


## 追加: `に / と / が` exact evidence / shadow v0.13

v0.12（context-required 38 / resolved 161）から、同程度の進捗を目標に継続。

### 今回追加した28位置
- `に`: 16位置
  - 格助詞 **15 resolved**
  - `たちまちに` 内部 `に` **1 suppression**
- `と`: 9位置
  - `む/じ＋と＋す`、変化・名付け・引用等 **7 resolved**
  - `日ごと` / `こと` 内部 **2 suppression**
- `が`: 3位置
  - 接続助詞 **1 resolved**
  - 格助詞 **2 resolved**

### 意図的hold
安倍晴明本文の次の4件は unresolved のまま:
- 参らせ給ひける**に**
- 見給ふ**に**
- 走らする**に**
- 問はるる**に**

理由:
連体形＋`に` はUSB-3212上で格助詞・接続助詞双方が候補となり、外部の学校文法系品詞分解でも立て方の揺れが確認できるため。一次資料基準が確定するまで一意化しない。

### v0.13 実測
- DB raw: **310**
- resolved: **186**
- suppressed: **124**
- DB only: **0**
- resolved率: **60.0%**
- context-required: **10**

v0.12→v0.13:
- resolved **161→186**
- context-required **38→10**

残10:
`に4 / て1 / ぬ1 / を1 / と1 / な1 / せ1`

残件はすべて、保留理由が明示できる状態。


## 一時停止: shadow v0.14-pre-gold

v0.13の残10件を、単なる未解決から「解消可能」「意図的benchmark」「一次資料待ち」へ再分類した。

- 枕草子「あかりて」の `て`: 接続助詞としてexact passage resolved。
- 残9:
  - intentional-ambiguity-benchmark **4**
  - primary-source-required **5**
  - unclassified context-required **0**
- raw 310 / resolved **187** / suppressed **123** / DB only 0
- resolved率 **60.3%**

新設:
- `passage_disambiguation_evidence.json`
- `context_hold_policy.json`
- `passage_hold_regression_20260919.json`
- `shadow_promotion_policy.json`
- `shadow_promotion_readiness_20260919.json`

開発者向けshadow debug overlayも実装済み。通常はhiddenで、`?debug=shadow` または `#shadow-debug` 時のみ表示。

昇格判断:
- G1/G2/G3/G7 PASS
- G4 independent gold / G5 cross-passage / G6 hold-aware UI はPENDING
- learner-visible global切替はまだ行わない。

次回:
『徒然草』第52段「仁和寺にある法師」を候補に**先に独立goldを固定**し、resolverを触らず現行shadowの初見性能を測る。


## Stage 2 generalization: 3作品blind gold + local syntax signal

### 独立goldを3本固定
goldは必ずshadow実行前にcommitしてから初見評価した。

1. 徒然草第52段「仁和寺にある法師」
   - 55位置
   - blind strict PASS **32/55 = 58.2%**
   - grammar strict resolve **7/30**
   - larger-unit suppression **25/25**
   - wrongResolved 0

2. 伊勢物語第6段「芥川」冒頭
   - 35位置
   - blind strict PASS **17/35 = 48.6%**
   - grammar strict resolve **8/23**
   - larger-unit suppression **9/12**
   - false-positive resolved 3
   - wrongResolved 0

3. 方丈記冒頭「ゆく河の流れ」
   - 22位置
   - blind strict PASS **14/22 = 63.6%**
   - grammar strict resolve **1/8**
   - larger-unit suppression **13/14**
   - false-positive resolved 1
   - wrongResolved 0

blind合算:
- 112位置
- strict PASS **63/112 = 56.3%**
- grammar strict resolve **16/61 = 26.2%**
- boundary suppression **47/51 = 92.2%**
- wrong candidate resolve **0**
- false-positive resolved 4件はすべてlarger-token境界不足。

### blind後に行った安全修正
- `まじかり`
- `呼ばひわたり`
- `からうじて`
- `しかも`

をknown-token boundaryへ追加。文法正解を直接追加せず、内部短hitを抑制するだけ。

その結果、現在の3 development gold:
- boundary suppression **51/51**
- hard error **0**

### strict resolved指標
旧 `resolved` は候補集合が複数残る位置も含んでいたため、以下へ分離:
- existing 4 samples raw 310
- old resolved 187
- **strict resolved 145**
- **ambiguous resolved 42**
- suppressed 123
- DB only 0

learner-visible昇格判断にはold resolved率を使わずstrictを使う。

### source-reviewed token morphology
`source_reviewed_token_morphology.json` を新設。
- 28 exact token forms
- surface / lemma / POS / form / classのみ保持
- passage-specific candidate正解は保持しない
- audited500を常に優先
- secondary-source-reviewedでありprimary verifiedではない

これをresolverへfallback接続。

### strict context rules
trusted token形態＋右文脈が揃う場合だけ:
- `けれ＋ば`
- `しか＋ど/ども`
- `たり＋けり系`

をstrict resolve可能にした。

USB-3212明示cueの
- `ずして`
も literal-left 条件で接続助詞「して」としてstrict resolve。

### development current
gold確認後の値なのでblind scoreとしては扱わない:
- strict PASS **73/112 = 65.2%**
- grammar strict resolve **22/61 = 36.1%**
- boundary suppression **51/51**
- hard error 0

### local syntax signal-only layer
`local_syntax_feature_policy.json` と `local_syntax_feature_audit_20260919.json` を追加。

残39（unresolved or ambiguous expected-resolve）:
- previous morphology取得: **14**
- left trusted token: **7**
- right trusted token: **4**
- punctuation after: **14**
- matched hard right-context cue: **0**

surface別:
- `に 11`
- `て 11`
- `を 7`
- `と 5`
- `し 2`
- `けれ 1`
- `なり 1`
- `なむ 1`

特に `て` は11件中10件で直前連用形まで取得済み。
ただし完了「つ」／接続助詞が衝突するので、読点だけではhard resolveしない。

### 実データで確認した禁止事項
- 名詞＋`に` → 一律格助詞化しない。
  - 方丈記 `水にあらず` は断定「なり」連用形
  - `よどみに浮かぶ` は格助詞
- `けるを` → 一律接続/格助詞化しない。
  - 伊勢物語同一段落に格助詞・接続助詞双方あり
- 連用形＋`て` → 一律接続助詞化しない。
  - 完了「つ」の未然・連用形も同形

### 現在の昇格判断
Stage 2継続。
- G1 coverage PASS
- G2 DB-only zero PASS
- G3 unclassified context zero PASS
- G4 independent gold PASS
- G5 cross-passage PASS_WITH_LIMITATION
- G6 hold-aware learner UI PENDING
- G7 primary-source hold protection PASS
- G8 strict disambiguation readiness PENDING

learner-visible detectorはlegacyのまま。

### 次回
1. right-token morphology / token boundaryをsignalとして拡張。
2. 助動詞列開始と独立語開始を区別するfeatureを作る。
3. `に/を/と` は節構造・係り先なしにhard rule化しない。
4. 新hard ruleを加えた場合、**第四の未使用作品**をgold先固定してblind評価する。


## 一時停止: stage-2 / blind gold 2本完了

### 現在地
- shadow DB / boundary / hold / audit基盤: 実装済み
- stage-2 developer debug overlay: 実装済み
- independent blind gold:
  - 徒然草52段: 55位置
  - 伊勢物語6段「芥川」: 35位置
- blind gold合計: **90位置**

### blind評価
徒然草:
- strict PASS 32/55 = 58.2%
- strict resolve 7/30
- suppression 25/25
- false-positive 0

伊勢物語 baseline:
- strict PASS 17/35 = 48.6%
- strict resolve 8/23
- suppression 9/12
- false-positive 3

baseline後boundary修復:
- `まじかり`
- `呼ばひわたり`
- `からうじて`
をknown-token boundaryへ追加。
修正後、伊勢物語 suppression 12/12 / false-positive 0。
徒然草・既存4サンプルへの悪化なし。

### strict metric
既存4サンプル:
- raw 310
- resolved array 187
- strict resolved **145**
- ambiguous resolved **42**
- suppressed 123

### 次回
途中停止した
「blind gold未解決位置の左語token boundary coverage測定」
から再開。

その後:
1. `て / に / を / と / し` の一般resolver改善
2. frozen goldで再評価
3. 3本目blind gold
4. hold-aware learner UI
5. selective learner promotion判定

### 進捗目安
この **DB/shadow→learner-visible昇格トラック** を100%とした場合:
- 完了: **約72%**
- 残り: **約28%**

内訳イメージ:
- データ・境界・shadow基盤: ほぼ完了
- blind評価基盤: 約2/3完了
- 一般resolver改善: これから本格化
- hold-aware UI: 未実装
- selective learner promotion: 未実施

※ 数値は工数ベースの概算。単純なresolved率ではない。


## 2026-09-20 Git履歴照合訂正 / Stage 2 現行状態

21:01追記の「blind gold 2本完了」は、実装・監査成果物より古い並行スナップショットだった。Git履歴を照合し、以下を現行とする。

- independent blind gold **3作品**: 徒然草52 / 伊勢物語6 / 方丈記冒頭
- blind合算: **112 positions / strict PASS 63 / grammar strict resolve 16/61 / boundary 47/51 / wrongResolved 0**
- blind false-positive resolved 4件はすべて larger-token boundary不足
- post-blind development: **strict PASS 73/112 / grammar strict resolve 22/61 / boundary 51/51 / hard error 0**
- 既存4サンプル: raw 310 / old resolved 187 / **strict 145 / ambiguous 42** / suppressed 123 / DB only 0

途中停止していた左語coverage測定は、その後の成果物で実質完了済み:
- `cross_gold_failure_taxonomy_20260919.json`: 2作品 expected-resolve failure 38を4bucketへ分類
- `local_syntax_feature_audit_20260919.json`: 3作品の unresolved/ambiguous expected-resolve **39** を監査
  - previous morphology 14
  - left trusted token 7
  - right trusted token 4
  - punctuation after 14
  - right hard cue 0

現行の次手は、旧31件測定のやり直しではなく **right-token morphology / 助動詞列開始 vs 独立語開始のsignal-only feature拡張**。その後も `に/を/と` は節構造なしにhard rule化しない。新hard ruleを作る場合は第四作品をgold先固定してblind評価する。

learner-visible detectorはlegacyを維持。primary-source hold 5件も維持する。
