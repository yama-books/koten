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
