# HANDOFF — vintage-kana

最終更新: 2026-09-19

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


## 24. RC4 / 実資料読解を一次公開から延期

利用者確認により、資料ページ全体から対象字を探して読む方式は
初学者向け一次公開として負荷が高いと判断。

一次公開UIから「実資料を読む」を外した。

現行公開機能:
- 字形を見る
- 字母クイズ
- 書いてみる

研究資産:
- attested-examples.json 49件
- human-confirmed 4件
- 原画像・翻字・位置情報
は削除せず保持。

将来は、対象箇所の切り抜き／ハイライト／拡大表示などを備えた
実資料読解UIとして再設計する。

現行 index.html: 一次公開準備版 1.0 RC4
JavaScript構文PASS。


## 25. RC5 / 説明文を中学生向けに簡略化

一次公開UIの説明を、中学生が一読で理解できる短文へ整理。

基本説明:
- 変体仮名: 昔使われていた、今とは形のちがうひらがな
- 字母: ひらがなのもとになった漢字

専門的な注意は公開画面から減らし、「出典 > くわしい情報」に退避。
現行 index.html: 一次公開準備版 1.0 RC5
JavaScript構文PASS。


## 26. RC6 / 基礎解説を小型開閉メニュー化

冒頭説明を常時表示せず、`？ 変体仮名と字母` の小さな開閉メニューへ変更。

内容:
- 変体仮名の短い定義
- 平安〜明治、1900年の字体整理
- 字母の短い定義
- 現代平仮名の字母5例（あ安／い以／う宇／え衣／お於）

現行 index.html: 一次公開準備版 1.0 RC6
JavaScript構文PASS。


## 27. RC7 / 一覧を字形＋字母だけに整理

公開UIから件数・資料数・集計バッジ・「対応する仮名」表示を除去。
通常仮名も変体仮名も「字形＋字母」の同一レイアウトに統一。
通常仮名は背景色のみで区別。
内部データとしての件数は保持するが、公開画面には出さない。

現行 index.html: 一次公開準備版 1.0 RC7
JavaScript構文PASS。


## 28. RC8 / 読み方クイズ追加

「クイズ」内に
- 読み方
- 字母
の小型切替ボタンを追加。

初期表示は「読み方」。
変体仮名を見て、対応する仮名を4択で答える。
字母クイズも従来どおり利用可能。

現行 index.html: 一次公開準備版 1.0 RC8
JavaScript構文PASS。


## 29. RC9 / 変体仮名メーカーへUI再構成

公開UIを「変体仮名メーカー」へ再構成。

主役:
- 書いてみる
- 初期表示も書いてみる

入力モード:
- おまかせ: 候補を自動選択。「もう一度」で再生成
- 自分で決める: 各仮名の字体を利用者が選択

補助機能:
- 字形を見る
- クイズ
は「おまけ」として配置。

冒頭はタイトルと「字形と字母」ヘルプだけに簡略化。
RC / フォント / データ読込状態は公開UIから除去。
? は丸型アイコン化。

現行 index.html: release candidate 1.0 RC9
JavaScript構文PASS。


## 30. RC12 / 自分で選ぶ時の完成形を追従表示

「自分で選ぶ」モード:
- 完成形を候補一覧より上へ移動
- スクロール中も sticky で確認可能
- 候補クリックで即時更新
- 「そのまま」の通常ひらがな候補は削除
- 変体仮名候補だけを表示
- もとの文は候補一覧直前に表示

候補が存在しない文字だけは元文字のまま残る。

現行 index.html: release candidate 1.0 RC12
JavaScript構文PASS。
