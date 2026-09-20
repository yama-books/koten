# HANDOFF — vintage-kana

最終更新: 2026-09-20

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


## 31. RC13 / iPhone向け作成画面を圧縮

作成画面をスマホ向けに整理。

- 入力見出し削除
- placeholder「ひらがなを入力」
- 「仮名設定」表記、コロンなし
- 入力欄・完成形プレビューを縮小
- 「もとの文」は通常表示しない
- 自分で選ぶ時、完成形プレビューが上部に sticky した時だけ
  フローティング枠内に「もとの文」を表示

現行 index.html: release candidate 1.0 RC13
JavaScript構文PASS。


## 32. RC14 / 通常ひらがなを手動候補へ復帰

「自分で選ぶ」モードでは、
- 普通のひらがな
- 変体仮名
を同じ候補群から選択可能。

普通のひらがなは淡い青背景・「普通のひらがな」表記で区別。
完成形への即時反映、追従プレビューは維持。

現行 index.html: release candidate 1.0 RC14
JavaScript構文PASS。


## 33. RC15 / 拗音小書き設定

「自分で選ぶ」モードへ
「拗音（ゃ・ゅ・ょ）を小さくする」チェックを追加。

初期値 ON。
OFFでは該当する通常ひらがな／変体仮名を通常サイズ表示。
「っ」等には影響させない。
おまかせモードは小書き固定で、切替時に ON へ戻す。

歴史的に江戸期の拗音が一律小書きだったとは扱わず、
UI上の表示設定として位置づける。

現行 index.html: release candidate 1.0 RC15
JavaScript構文PASS。


## 34. RC16 / 拗音大書きをデフォルト化

歴史寄りの表示方針へ変更。

- ゃ・ゅ・ょは初期状態で通常サイズ
- 自分で選ぶ時だけ「ゃ・ゅ・ょを小さく表示」チェックを表示
- チェック初期値 OFF
- おまかせも通常サイズ
- おまかせへ戻すと OFF に戻す

重要:
これは歴史的仮名遣いへの自動変換ではなく、字形サイズの表示設定。
例として「今日」は歴史的仮名遣いでは「けふ」であり、
現代入力「きょう」の「ょ」を大きくするだけでは歴史的仮名遣いにはならない。

現行 index.html: release candidate 1.0 RC16
JavaScript構文PASS。


## 35. RC17 / ホーム画面アイコン設定

承認済みの「こ」（字母: 古）アイコンを公開設定へ追加。

追加ファイル:
- apple-touch-icon.png (180x180)
- icon-192.png
- icon-512.png
- favicon-32x32.png
- site.webmanifest

index.html:
- apple-touch-icon
- favicon
- manifest
- theme-color
- apple-mobile-web-app-capable
- apple-mobile-web-app-title
を設定。

背景色: #f2efe8
現行 index.html: release candidate 1.0 RC17


## 36. RC18 / 補助機能を右上小ボタン化

補助機能の見せ方を整理。

- 「おまけ」表記を削除
- 右上に「字形」「クイズ」の小型ボタン
- 左上に「変体仮名とは？」ヘルプ
- 主機能「書いてみる」は大ボタンのまま

現行 index.html: release candidate 1.0 RC18
JavaScript構文PASS。


## 37. RC19 / 「習得する」へ名称変更

右上の補助機能「クイズ」を「習得する」に変更。
内部の quiz ID / ロジックはそのまま維持。

現行 index.html: release candidate 1.0 RC19
JavaScript構文PASS。


## 38. RC20 / 3メニューを小型ナビへ統一

「書いてみる / 字形 / 習得する」を右上の小型ナビへ統合。
大型の「書いてみる」ボタンは撤廃。

選択中:
- 濃い緑背景
- 白文字

非選択:
- 白背景
- muted文字

これにより習得モードでも「書いてみる」が過度に目立たず、
現在選択中の機能が一目で分かる。

現行 index.html: release candidate 1.0 RC20
JavaScript構文PASS。


## 39. RC21 / 画像保存と習得記録

実装済み:
- 書いてみるを主経路のまま維持
- 画像で保存: 1080px正方形PNG
- Web Share対応端末は共有シート優先
- iOS fallbackは画像を開いて長押し保存
- 習得する: localStorageで回答イベントを保存
- 正答10ポイント / 誤答3ポイント
- 累計ポイント・回答数・読み方数・字母数・正解数を表示
- 百人一首と同じ cat-mascot.webp を累計ポイント横に表示
- ポイント記録は途中切捨てしない

重要:
- 百人一首の弱点倍率・段係数は、変体仮名側に習熟度/段が存在しないため未実装
- 将来習熟度を導入する場合に再検討する
- 画像保存はコード経路まで実装済みだが、iPhone実機での最終共有確認は未実施

現行 index.html: release candidate 1.0 RC21
JavaScript構文PASS。


## 40. RC22 / 5問セットと記録画面

習得機能を5問1セットへ再構成。

- 正答 10pt / 誤答 1pt
- ポイントとネコチャンは5問終了結果で表示
- 記録画面を追加
- 最近取り組んだ字
- 間違えやすい字
- 字ごとの習熟度
- 行ごとの円形習熟度メーター
- 百人一首と同じ 0/30/60/85 の5色境界

習熟度:
- 正答 +12
- 誤答 +1
- 上限100

保存画像:
- 通常文字と変体仮名のCanvasフォントを分離
- 通常文字は和文明朝
- クレジットは細罫＋明朝の署名へ変更

旧イベントはポイントには残すが、glyph情報の必要な詳細記録には使わない。

現行 index.html: release candidate 1.0 RC22
JavaScript構文PASS。


## 41. RC23 / 記録を行別アコーディオン化

記録画面:
- あ行 / か行 ... を押して展開
- 各行の円形習熟度
- 展開内に各変体仮名の習熟度バー
- 未着手字体も0%として行習熟度へ含める
- 説明ラベル（未着手、練習中等）は削除
- 行60%以上の時だけ低習熟の仮名を「要確認」で表示
- 最近取り組んだ字 / 間違えやすい字は、字形＋字母だけ

ポイント:
- 回答中は表示しない
- 5問終了時だけ今回ポイントを表示
- 正答10 / 誤答1
- 完了セットのみ累計へ算入

字母出題:
- 変体仮名字形
  ↑
  ？
の縦型へ変更

フォント:
- UI Zen Maru Gothic
- 見出し等 Klee One
- 変体仮名 Noto Serif Hentaigana
- 保存PNG通常文字もKlee One

現行 index.html: release candidate 1.0 RC23
JavaScript構文PASS。


## 42. RC24 / 行習熟度を2列正方形タイルへ

記録画面を再調整。

- あ行 / か行等は2列の正方形タイル
- 行タイルを押すと、その行だけ全幅へ展開
- 各字体の習熟度バーを展開内に表示
- 記録欄の字母表示はすべて削除
- 最近の字 / 間違えやすい字も字形だけ
- 要確認表示は維持

現行 index.html: release candidate 1.0 RC24
JavaScript構文PASS。


## 43. RC25 / 習熟度で出題形式を自動変更

習得機能を段階式へ変更。

出題:
- 0〜29%: ランダム4択
- 30〜64%: 同じ行中心の難しい4択
- 65%以上: 自力入力
- 読み / 字母とも共通
- 4択はiPhoneでも2×2の「おべんとう」レイアウト
- 正解は淡い緑、誤答は淡い赤
- 5問セット内は原則同じ字体を重複出題しない

習熟度:
- 選択式正答 +5 / 上限65 / 誤答 -3
- 自由入力正答 +9 / 上限90 / 誤答 -5
- 同一字体の正の増加は1日 +20まで
- 90に達した当日は90で停止
- 別日の自力入力正答のみ +2 で100へ進む
- 同一セットで再回答した場合の正加点は半分
- 旧イベントは互換計算を維持

ポイント:
- 回答中は表示しない
- 5問終了時だけ今回ポイント表示
- 正答10pt / 誤答1pt
- 完了した5問セットのみ累計ポイントへ算入

現行 index.html: release candidate 1.0 RC25
index blob: 39959e3707349dc20b257f9cd8f15ecc0f86f468
RC25実装コミット: f398f209b2e1e39f360a64fff52a35afb8793cab
JavaScript構文PASS。


## 44. 2026-09-20 17:46 JST 停止チェックポイント

ここで作業停止。

正本ブランチ:
- `vintage-kana-main`
- `main` へ直接pushしない
- force-pushしない
- 他ブランチを削除しない

停止時点:
- RC25
- 5問セット
- 2×2 Bento型4択
- 30%から同じ行中心の難しい4択
- 65%から読み / 字母とも自由入力
- 方式別習熟度天井 65 / 90
- 同一字体の正の習熟度増加は1日最大+20
- 90到達日は90で停止し、別日の自由入力正解で+2ずつ100へ
- 記録画面は行ごと2列正方形タイル、展開時のみ全幅
- 保存画像 / アイコン / PWA設定まで実装済み

次回再開:
1. RC25をiPhone実機確認
2. 2×2選択肢、入力式切替、5問結果、記録画面を確認
3. 習熟度の日次上限と90超の別日進行を実機またはテストで再確認
4. 保存PNGの字体確認
5. その後ローカルセッションへデザイン監査

再開指示:
`vintage-kana-main HANDOFF §44 から再開。RC25実機確認→デザイン監査`



## 45. 2026-09-20 RC26 Web-only監査完了 / 実機確認待ち

§44 から再開後、iPhone実機確認へ入る前に Web-only で実施できる狭幅・操作性監査を完了したため、ここで停止する。

### 現在の正本
- branch: `vintage-kana-main`
- HEAD: `1e6f7c8e49471d3bc9105f6a351cbc30d366ba9a`
- footer表記は release candidate 1.0 RC25 のまま。RC26は実機前のWeb-only監査・ハードニング段階の呼称。
- CI run `35501695769` は success。

### RC26 Web-onlyで完了したこと
- 320 / 375 / 390 / 430px のレンダリングQAを Playwright で自動化。
- 4択2×2 Bento、行記録2列、展開時全幅、30%同じ行優先、65%自由入力をレンダリング経路で固定。
- 日次+20、選択式cap65、自由入力cap90、90到達日の停止、翌日+2を自動QAで固定。
- 上部ナビ、読み方/字母、練習/記録など主要ボタンをモバイル44px以上へ調整。
- 380px以下では「変体仮名とは？」を ? アイコンへ圧縮し、3メニューの横並びを維持。
- 圧縮時も summary に aria-label を付け、? は aria-hidden としてアクセシビリティを維持。
- RC25のポイント仕様（正答10 / 誤答1）へコメント・監査文書を同期。
- `DESIGN_AUDIT_BRIEF_2026-09-20.md` に RC26 Web-only デザイン監査を記録。
- `PUBLICATION_QA.md` に RC26 レスポンシブQAを記録。

### 自動QAで確認済み
- ページ横overflowなし
- 4択は4個・2列×2行・高さ78px以上
- 上部主要タップ領域44px以上
- 行記録は10行、閉時2列正方形、open時全幅
- 30%では4択継続かつ同じ行の誤答候補を優先
- 65%では読み / 字母とも自由入力
- 自由入力font-size 19pxでiOSズーム回避ラインを超える
- 習熟度 65 → 90 → 翌日92 の進行契約

### ここから先は実機で確認する
1. iPhone Safariで上部ナビと ? ヘルプの見た目が自然か。特に320〜380px。
2. 読み方 / 字母の4択が2×2の「おべんとう箱」として気持ちよく見えるか。
3. 正解の淡い緑・誤答の淡い赤が強すぎないか。
4. 65%以上の自由入力で日本語IMEと「答える」ボタンが窮屈でないか。
5. 5問途中ではポイントが見えず、終了時だけポイント＋ネコチャンが自然に出るか。
6. 記録の2列正方形タイル、押した行だけ全幅展開、展開内1列バーが読みやすいか。
7. 「画像で保存」→共有シート→「画像を保存」が成立するか。
8. 保存PNGで通常仮名=Klee One、変体仮名=Noto Serif Hentaiganaが画面表示と一致するか。
9. ホーム画面追加時の「こ（字母: 古）」アイコン。
10. iPhone文字拡大時に操作不能・折返し崩れがないか。

### 次回再開
実機結果を DESIGN_AUDIT_BRIEF のRC26節へ反映し、必要なものだけ修正する。実機で問題がなければRC25の公開候補状態を維持し、不要な見た目変更は加えない。

再開指示:
`vintage-kana-main HANDOFF §45 から再開。実機結果を反映→デザイン監査確定`



## 46. 2026-09-20 20:26 JST 実機確認後・記録UI改修方針確定

iPhone実機で「記録」画面を確認。スクリーンショット上では、行ごとの2列正方形タイルは破綻していないが、ユーザー判断として「もう少し大きくてよい」。また、行を展開した際の各字の習熟度表示を、現在のバー中心UIから「字形そのものを主役にする円形カードUI」へ変更する方針を承認した。

### 実機で確認した現状
- 「これまでの記録」→ポイント・ネコチャン表示は成立。
- 5問セット / 取り組んだ問題 / 正解の集計表示は成立。
- 行ごとの習熟度は2列正方形タイルで表示できている。
- 行タイル内の円形メーターも表示できている。
- 現状は余白がやや広く、行タイル・円メーターとも少し大きくしてよい。
- 各字体の詳細習熟度は、バー型より「円＋字形」を中心にした方がこのアプリの性格に合うと判断。

### 承認済みの次実装
1. **行タイル**
   - 現行の2列正方形は維持。
   - タイルを少し大きく見せる。
   - 行名と円形習熟度メーターも一段大きくする。
   - 上下余白は過剰にならないよう調整する。

2. **行展開後の各字**
   - 現行の横長バー型表示を廃止。
   - 小さめの正方形カードをグリッド表示する。
   - 標準iPhone幅では **3列** を基本とする。
   - 360px以下など狭幅のみ **2列** へフォールバックする。

3. **各字カードの内容**
   - カード中央に円形習熟度リング。
   - 円の中央に **大きく変体仮名**。
   - 円の中央内に **小さく字母**。
   - 円の下に **習熟度%**。
   - 情報量を増やしすぎず、字形を主役とする。
   - 現代仮名の追加表示は現段階では必須としない。

4. **色**
   - 習熟度リングは既存の習熟度色体系を流用する。
   - 色を強くしすぎず、静かな既存配色を維持する。
   - 0%は薄いグレー、進行に応じて既存の赤 / 黄 / 青 / 緑系へ連動。

### 実装時に壊さないもの
- 行ごとの習熟度計算。
- 各字体の習熟度計算。
- 0 / 30 / 60 / 85 の既存色境界。
- 30%で同じ行中心4択、65%以上で自由入力となるRC25ロジック。
- 日次+20、選択式cap65、自由入力cap90、90到達日の停止、翌日+2。
- 5問セットとポイント計算。
- localStorage学習記録。
- 最近取り組んだ字 / 間違えやすい字。
- 「要確認」表示。
- iPhone狭幅対策、44pxタップ領域、2×2 Bento型4択。
- 画像保存 / PWA / フォント周り。

### 実装時の目安
- `.recordRows`: 2列維持、gapとタイル内寸を微調整。
- 閉じた `.recordRowGroup summary`: 正方形維持、行名とリングを少し拡大。
- `.ringMeter`: 現在より一回り大きくする。
- `.rowGlyphMastery`: 展開内を3列グリッドへ変更。
- 新しい各字カードは `aspect-ratio:1/1` を基本とする。
- 各字リング中央は Noto Serif Hentaigana で字形を最優先表示。
- 字母は小サイズ・muted。
- %はリング外の下部へ。
- `@media(max-width:360px)` では各字カードを2列へ。

### QA追加候補
- 390 / 430pxで展開内3列が成立すること。
- 320 / 360pxで2列へ自然に落ちること。
- 各字カードが正方形に近いこと。
- 円リングの中央字形が切れないこと。
- 字母が変体仮名より目立たないこと。
- 0% / 30% / 60% / 85% / 100%でリング色と%が一致すること。
- 行を開いた時だけ全幅になる既存アコーディオン挙動を維持すること。
- 既存RC26レンダリングQAを更新し、旧バー前提の検査が残っていないこと。

### 状態
- **この§46は設計承認・引継ぎ記録であり、上記UI改修はまだ未実装。**
- 実装は次セッションで `vintage-kana-main` 上に行う。
- `main` へ直接pushしない。
- force-pushしない。
- 他ブランチを削除しない。

### 次回再開
1. HANDOFF §46 を読む。
2. 現行 `vintage-kana/index.html` とRC26のレンダリングQAを確認。
3. 行タイル拡大＋各字3列円形習熟度カードを実装。
4. 320 / 360 / 390 / 430px をレンダリングQA。
5. 実機で再確認。
6. 問題なければデザイン監査を確定する。

再開指示:
`vintage-kana-main HANDOFF §46 から再開。記録UIを行タイル拡大＋各字3列円形習熟度カードへ実装→狭幅QA→実機再確認`


## 47. 2026-09-20 Web-only再開直後・実装前停止チェックポイント

ユーザー指示により、§46から再開した直後の調査段階で停止する。
**このセッションではローカルを使用していない。実装コードの変更もまだ行っていない。**

### 正本確認
- repository: `yama-books/koten`
- branch: `vintage-kana-main`
- 再開時HEAD: `15e8d84bfa6d92b760ac9e10dab558a9a32d3bb6`
- このHEADは§46を記録したコミットそのもの。
- `main` へ直接pushしていない。
- force-pushしていない。
- 他ブランチを削除していない。

### 今回確認したもの
1. `vintage-kana/HANDOFF.md` §46
2. `vintage-kana/DESIGN_HISTORY.md`
3. `vintage-kana/index.html`
4. `tests/unit/vintage-kana-rc25.test.ts`
5. `tools/vintage-kana-check/index.mjs`
6. `vintage-kana/DESIGN_AUDIT_BRIEF_2026-09-20.md`
7. `vintage-kana/PUBLICATION_QA.md`

設計史との矛盾は見つかっていない。
換字暗号・無作為字体選択を歴史再現として復活させる変更は行わない。

### 現行実装で特定した変更箇所

`vintage-kana/index.html`:
- `.recordRows` は2列。
- 閉じた `.recordRowGroup summary` は正方形。
- 行リング `.ringMeter` は48px、内円35px。
- `.rowGlyphMastery` は基礎CSSでは2列だが、`@media(max-width:720px)` で1列へ落ちる。
- 展開内各字体は `.masteryItem` + `.masteryBar` の横長バー型。
- `rowGlyphMasteryHtml()` が、字形・対応仮名・%・バーを生成している。
- `GLYPHS` には `jibo` があるため、新カードの字母表示は既存データから直接取得できる。
- 習熟度色は `masteryDisplayLocal()` の既存境界 0 / 30 / 60 / 85 をそのまま再利用できる。

### RC26 QAで特定した更新箇所

`tools/vintage-kana-check/index.mjs`:
- 現在の狭幅QA幅は `[320, 375, 390, 430]`。
- §46承認仕様に合わせ、次回は **320 / 360 / 390 / 430px** へ更新する。
- 現在は記録画面について
  - 10行
  - 閉時2列
  - 閉時正方形
  - open時全幅
  を検査している。
- 各字カードの3列 / 2列、正方形性、リング中央字形、字母、%表示はまだ検査していない。
- 旧バーUI前提の検査が残らないよう、実装と同時に更新する。

`tests/unit/vintage-kana-rc25.test.ts`:
- RC25の習熟度・ポイント・出題閾値、2×2 Bento、狭幅ナビ、44px、5問終了時ポイント表示を固定している。
- **これらは今回の記録UI改修で変更しない。**
- 新しい記録カードDOM/CSS契約の静的テストはまだ追加していない。

### 未実装
§46で承認された次の変更は、**すべて未実装のまま**。
- 行タイルを少し大きく見せる。
- 行名と行リングを一段拡大。
- 展開内の横長習熟度バーを廃止。
- 各字体を正方形カード化。
- 標準iPhone幅で3列。
- 360px以下で2列。
- 各カード中央に円形習熟度リング。
- リング中央に大きい変体仮名＋小さい字母。
- リング外下部に習熟度%。
- 320 / 360 / 390 / 430px QA。

### 次回の安全な再開順
1. 本§47と§46を読む。
2. `vintage-kana/index.html` の記録UI CSSと `rowGlyphMasteryHtml()` だけを最小差分で変更。
3. RC25ロジック・ポイント・localStorage・出題閾値には触れない。
4. `tools/vintage-kana-check/index.mjs` を320 / 360 / 390 / 430pxへ更新し、各字カードの列数・正方形性・リング表示を追加検査。
5. `tests/unit/vintage-kana-rc25.test.ts` の既存契約を保持し、必要なら記録UIの静的契約だけ追加。
6. CI確認。
7. その後iPhone実機再確認。

再開指示:
`vintage-kana-main HANDOFF §47 から再開。§46承認済みの記録UI改修を最小差分実装→320/360/390/430 QA。RC25/26の学習ロジックは変更しない`

## 48. 2026-09-20 Web-only 記録UI改修完了 / 実機再確認待ち

§46・§47の承認内容に沿い、GitHub `vintage-kana-main` 上だけで記録UI改修と狭幅QAを完了した。
この工程ではローカルを使用していない。

### 現在の正本
- repository: `yama-books/koten`
- branch: `vintage-kana-main`
- 実装確定HEAD: `1aa262d1fa31f39a9e0031306aa4fda61cde4804`
- §46記録コミット `15e8d84bfa6d92b760ac9e10dab558a9a32d3bb6` から実装4コミット進行
- §48・監査文書の記録コミットによりブランチHEADはこの実装HEADより先へ進むが、コード実体は `1aa262d...` で確定
- `main` へ直接pushしていない
- force-pushしていない
- 他ブランチを削除していない

### 実装済み
`vintage-kana/index.html`:
- 行ごとの2列正方形タイルは維持。
- 行名を 12px → 13px、行リングを 48px → 56px へ拡大。
- 行タイルの内側余白・展開時高さを少し拡大。
- 展開内の旧 `.masteryItem` / `.masteryBar` を廃止。
- 各字体を `.glyphMasteryCard` の正方形カードへ変更。
- 361px以上は3列、360px以下は2列。
- 各カード中央に円形習熟度リング。
- リング中央に Noto Serif Hentaigana の変体仮名を大きく表示。
- その下に小さい字母を表示。
- 習熟度%はリング外のカード下部に表示。
- 習熟度リング色は既存 `masteryDisplayLocal()` を再利用し、0 / 30 / 60 / 85 境界を変更していない。
- 320px級では行タイル内リングのみ48pxへ戻し、閉じた2列タイルの収まりを確保。

### 壊していないもの
- RC25の出題切替: 30%で同じ行中心4択、65%以上で自由入力。
- 選択式 cap65 / 自由入力 cap90。
- 同一字体の正の増加は1日+20まで。
- 90到達日の停止と翌日以降+2。
- 正答10pt / 誤答1pt。
- 5問セット、完了セットのみポイント集計。
- localStorage学習記録。
- 最近取り組んだ字 / 間違えやすい字 / 要確認。
- 2×2 Bento型4択、44pxタップ領域。
- 画像保存 / PWA / フォント。

### QA更新
`tools/vintage-kana-check/index.mjs`:
- 幅を 320 / 360 / 390 / 430px に固定。
- 行10件、閉時2列正方形、open時全幅を継続検査。
- 各字カードの列数（320/360=2、390/430=3）を検査。
- カード正方形性、リングがカード内に収まることを検査。
- 変体仮名の文字サイズが字母より大きいことを検査。
- %がリング外にあることを検査。
- 0%時の aria-valuenow と表示%一致を検査。

`tests/unit/vintage-kana-rc25.test.ts`:
- 3列→2列レスポンシブ契約を追加。
- 正方形カード、Noto Serif Hentaigana、meter、字母、%、旧 masteryBar 不在を固定。
- 既存RC25の閾値・ポイント・Bento・44px・5問終了時ポイント表示テストは維持。

### CI
最終HEAD `1aa262d1fa31f39a9e0031306aa4fda61cde4804` の GitHub Actions:
- run: `35510240216`
- workflow: CI
- result: **success**

PASSした主要工程:
- check:eol
- typecheck
- lint
- npm test
- data:check
- build
- check:vintage-kana
- check:font
- check:font-assets
- check:font-weight
- check:overflow
- scan:publish

途中の `0cc14e0...` と `3b5459f...` は狭幅QAで失敗し、カード/行リング寸法を修正した後の `1aa262d...` でPASSした。

### 残る確認
Web-onlyでの実装・自動QAは完了。
次は iPhone Safari 実機で記録画面を再確認する。

重点:
1. 行タイルが「少し大きく」の意図に合っているか。
2. 390px級の3列カードが窮屈でないか。
3. 320/360pxの2列カードでリング・変体仮名・字母・%が読みやすいか。
4. 字母が変体仮名より目立っていないか。
5. 0 / 30 / 60 / 85 / 100%の色の見え方が既存UIから浮かないか。
6. 行を開いた時だけ全幅になるアコーディオンが自然か。

footer表記は release candidate 1.0 RC25 のまま。今回の変更はRC25学習ロジックを変えず、記録UIとQAを更新したもの。

再開指示:
`vintage-kana-main HANDOFF §48 から再開。記録UIのiPhone実機再確認→必要なら見た目だけ最小修正→デザイン監査確定`

## 49. 2026-09-20 実機フィードバック追加・部分実装後の一時停止

ユーザー実機確認後の追加指示を受け、GitHub `vintage-kana-main` 上だけで一部を実装したところで一時停止。
ローカルは使用していない。

### 現在のブランチHEAD
- `f36684aa882be2c75b78390574cfe55b9896d990`
- 実装本体:
  - `c237f1734338d972f90855e549ef427e0d47287f` 記録UI追加修正
  - `a444b0137f22b6b95df6b0954c3cfd6431dc9f31` 上位字母→字体問題
- テスト:
  - `c576678ec7bcae149001de616ceda3c816af13cd` 静的契約更新
  - `f36684aa882be2c75b78390574cfe55b9896d990` Playwright QA更新

### 今回実装済み
1. 各文字習熟度カード
   - 円内の `字母：安` の「字母：」を削除し、字母だけを表示。
   - 円の上に読み（あ・い・う・え・お等）を表示。
2. 行習熟度タイル
   - 正方形固定をやめ、高さを圧縮。
   - 行リングを56px→72pxへ拡大し、余白比率を大きく削減。
   - 320pxでは66pxへ調整。
3. 最近取り組んだ字 / 間違えやすい字
   - 各字をbutton化。
   - 押すと dialog で大きい字形＋「読み」「字母」を表示。
4. 字母問題の上位段階
   - 習熟度65%以上の字母モードで、条件を満たす場合に「この字母からできた平仮名はどれ？」を追加。
   - 表示は `？ ↑ 安` 型。
   - 選択肢は変体仮名＋現代仮名を含む。
   - 同じ行・別の行・現代仮名を混ぜる。
   - 同じ字母から複数字形が成立し単一正解にできない対象は、現段階では逆向き問題から除外。
   - 回答後は正誤にかかわらず、変体仮名の横に中くらいの読みを表示。
   - 逆向き問題の習熟度増減は自由入力相当の上位段階として扱う。

### テスト状態
静的 `npm test` はPASS。

最新 `check:vintage-kana` は3 findingsでFAIL:
- 320px: `recordClosedCompact`
- 360px: `recordClosedCompact`
- 390px: `recordClosedCompact`

ただし各幅の行リング占有率は:
- 320px: 0.667
- 360px: 0.605
- 390px: 0.537

したがって、今回の「余白を半分以下へ」という実機指示に対する見た目改善は入っており、QA側の高さ≤幅×0.82条件が過度に厳しい可能性が高い。
430pxはこのcompact判定で問題なし。
その他の新QA:
- 各字カード列数
- 円内収まり
- 読み表示
- 「字母」接頭辞なし
- ポップアップ
- 逆向き字母問題
- 回答後読み表示
は、今回のブラウザQAで追加済み。

### 追加指示・未実装
A. UI / デザイン
- タイトル「変体仮名メーカー」のフォントを他UIと同じ丸ゴシック系へ変更。
- 「変体仮名とは？」展開時に上部ナビ行へ割り込んでレイアウト崩れする問題を修正。
  - 候補: dialog / modal化してナビとは別レイヤー表示。
  - 要デザイン裁定。
- メニュー「字形」→「一覧」へ改称。
- 一覧画面を行ごとに見やすく整列できるか検討・実装。

B. 出題
- 複数字形が成立する字母問題では、正解候補を一つだけにする。
  - 現在の実装は「単一正解が保証できない対象を逆向き問題から除外」している。
  - 今後、複数字形字母も出題対象へ含めるなら、問題単位で正解対象字形を一つ固定し、他の同字母由来字形を選択肢から除外する方式が安全。

C. 字形データ
- 「せ」と「を」に同じ字が入っているとの実機指摘あり。
- `遠` の字 `U+1B11C` は「せ」に似るが別字として扱う必要がある。
- NINJAL公開字形のうち未収録が多数あるとの指摘。
- 国立国語研究所の公開対象字形を全件収録する監査・補完が必要。
- 現行 `vintage-kana/data/ui-glyph-master.json` を正本候補として、NINJALの公開一覧との全件突合が必要。

### 分担案
こちら（ChatGPT / GitHub Web-only）で継続しやすい:
1. タイトルフォント修正。
2. 「字形」→「一覧」。
3. 「変体仮名とは？」dialog/modal化。
4. 一覧画面の行別レイアウト。
5. 逆向き字母問題の単一正解UI/ロジック整理。
6. 既存UI/Playwright QAの調整。

ClaudeCodeへ切り出しやすい:
1. NINJAL公開字形の全件取得・一覧化。
2. `ui-glyph-master.json` とのUnicode code point / kana / jibo全件突合。
3. 未収録・誤分類・重複・同一characterの複数kana割当を機械監査。
4. `U+1B11C` を含む「せ / を」周辺のUnicode割当監査。
5. 補完JSON案と監査レポート作成。
6. 既存データ生成元がある場合は、派生データを手編集せず生成経路を修正。

### 次回再開
まず§49を読む。
UI側とデータ監査側を混ぜず、UI改修はGitHub Web-only、NINJAL全件監査はClaudeCodeへ分担可能。

再開指示:
`vintage-kana-main HANDOFF §49から再開。UI改修（タイトル/一覧/help dialog/行別一覧/逆向き字母単一正解）と、NINJAL全字形監査を分離して進行`

## 50. 2026-09-20 追加実機フィードバック反映・NINJAL監査分担

§49以後、GitHub `vintage-kana-main` 上だけで追加UI・出題修正を実装した。
ローカルは使用していない。

### UI / 出題 実装確定HEAD
- `80365000b7d3a8cdb34b52fd7a14618312a3b17e`

主要コミット:
- `eba3c8b7f5f5fef02069315bfb028a4d6e9102af` help / navigation / 一覧レイアウト
- `6699617d024d78e7e24977d66e2ab832533b23aa` 逆向き字母問題の誤答feedback
- `bf1bec752b161ff38565f90edb0a8e68132a8d9e` 静的契約更新
- `c17a5d779a14b50b281854e2ebf5f4f3deca94f6` 狭幅QA更新
- `cb20187e757229428e657efeb6b636c879b9dacb` 320px行タイルQA調整
- `80365000b7d3a8cdb34b52fd7a14618312a3b17e` 逆向き字母問題テスト名を単一正解契約へ同期

### 今回追加実装したUI
1. タイトル
   - 「変体仮名メーカー」のh1を `var(--font-ui)` = Zen Maru Gothic系へ変更。
2. 「変体仮名とは？」
   - インラインdetails展開を廃止。
   - 上部は「?」ボタン＋3メニューの行を固定。
   - 説明は `<dialog id="helpDialog">` のモーダルで別レイヤー表示。
   - 380px以下では従来どおり「?」だけへ圧縮。
3. 上部メニュー
   - 「字形」→「一覧」へ改称。
4. 一覧
   - 見出しを「行・仮名から見る」へ変更。
   - すべてボタン＋あ行〜わ行の10行に整列。
   - 各行は行名＋最大5仮名の横並び。
5. 行習熟度タイル
   - 実機指摘に合わせさらに高さを圧縮。
   - 320pxではリング占有率を優先してQAする。
6. 各字習熟度 / 最近 / 弱点
   - §49実装を維持:
     - 円上に読み
     - 円内は変体仮名＋字母のみ（「字母：」なし）
     - 最近 / 弱点は押下で読み・字母dialog表示

### 逆向き字母問題
- 習熟度65%以上の字母モードで
  `この字母からできた平仮名はどれ？`
  を出題。
- 表示は `？ ↑ 安` 型。
- 選択肢は現代仮名＋変体仮名。
- 同行・他行・現代仮名を混ぜる。
- 複数字形が同じ字母から成立する場合も出題可。
- ただしその問題でtargetに選ばれた1字だけを正解とし、**同じ字母由来の他字形はdistractorから除外**するため、画面上の正解は必ず1個。
- 回答後は正誤にかかわらず、変体仮名の横に中サイズの読みを表示。
- 逆向き問題の習熟度増減は上位段階として扱う。

### せ / を / U+1B11C
現行 `vintage-kana/data/ui-glyph-master.json` を機械確認:
- glyphCount: 138
- `U+1B11C` は
  - character: `𛄜`
  - kana: `を`
  - jibo: `遠`
- 現行JSON内で同一characterの重複割当は0件。
- 「せ」側には `U+1B052 / 世`, `U+1B055 / 勢` が入っており、`U+1B11C` を「せ」に割り当ててはいない。
- 静的テストにも `U+1B11C === 𛄜 / を / 遠`、かつ「せ」ではない契約を追加。

したがって「せ」と「を」が同じ字に見える件は、
データ割当以外にフォントglyph / fallback / renderingの監査も必要。

### NINJAL全収録について判明した構造上の重要点
現行 `ui-glyph-master.json` は公式全字形カタログではない。
ファイル自身に:
- `status: derived-ui-cache-from-phase1`
- 初期15資料で観測された
- 無濁点
- U+1B***のみ
- 重複除去・集計した派生キャッシュ
と明記されている。

したがって138字しかないのは、現在の設計では「実資料観測subset」だからであり、
NINJAL公式全件を収録するには別の **公式カタログ層** を追加する必要がある。

`SOURCES.md` には学術情報交換用セットを47音価・215字母・264字体と記録。
公式一覧にはUnicode欄が空の掲載字形もあるため、
「全件収録」は単純なUnicode文字追加だけでは完了しない。

### ClaudeCodeへの切り出し
専用ブランチを作成済み:
- branch: `vintage-kana-ninjal-audit`
- 基点: `80365000b7d3a8cdb34b52fd7a14618312a3b17e`

指令書:
- `vintage-kana/NINJAL_GLYPH_AUDIT_TASK_2026-09-20.md`
- 作成コミット: `63dc7360fc923011b464f2efb6cabe3bf6a0f7b5`

ClaudeCode側では:
- NINJAL公式一覧全件を取得・正規化
- official catalog JSON作成
- 現行138字との全件差分
- Unicodeなし字形の扱い・ライセンス確認
- せ / を / U+1B11C重点監査
- 再現可能な監査スクリプト / テスト
を行う。

**`vintage-kana/index.html` はClaudeCode側で触らない。**
UI統合は監査結果を受けて `vintage-kana-main` 側で行う。

### 重要な統合方針
公式全字形を現在の `GLYPHS` へ単純置換しない。
現行 `GLYPHS` は書いてみる「おまかせ」等にも使われるため、
公式264字体級へ置換すると、観測頻度に基づく現行挙動が変わる。

推奨:
- full official catalog: 一覧 / 手動選択 / 学習候補
- observed corpus subset: おまかせ自動生成 / 実資料頻度
の二層化。

### QA
`check:vintage-kana`:
- 320 / 360 / 390 / 430px
- help dialog open / nav reflowなし
- 一覧10行 / overflowなし
- 行リング余白
- 各字カード3→2列
- 読み・字母prefixなし
- recent / weak popup
- 読み65%以上自由入力
- 字母65%以上逆向き4択
- 同字母由来の別正解をdistractorに含めない
- 同行 / 他行 / 現代仮名の混在
- 回答後の読み表示
を検査。

`cb20187e757229428e657efeb6b636c879b9dacb` のCI run `35513270176` は **success**。
その後の `80365000b7d3a8cdb34b52fd7a14618312a3b17e` も全体CI run `35513391691` が **success**。
`check:vintage-kana`、`check:overflow` を含む全工程が完走した。
`check:overflow` は百人一首100首×複数幅等を走査する全体検査で、vintage-kana固有検査ではないが、リポジトリ全体の回帰としてPASSしている。

### 次回
1. ClaudeCodeのNINJAL監査結果を受領。
2. official catalog / observed subsetの二層統合を設計。
3. Unicodeなし字形の表示方式を、ライセンスと表示技術を確認して決定。
4. せ / をの実機表示が同一に見える原因をfont/rendering側まで確認。
5. 全公式字形を一覧・手動選択・学習へ統合し、回帰QA。
6. iPhone実機再確認。

再開指示:
`vintage-kana-main HANDOFF §50から再開。ClaudeCodeのNINJAL全字形監査結果を取り込み→official catalog / observed subset二層化→全字形UI統合→せ/を実機表示監査`

## 51. 2026-09-20 ローカルpull再開用固定

この節は、GitHub Web-only作業をローカル `C:\Users\user\AI開発\koten` へ戻すための再開地点。

### ローカルでUI本線を再開

未コミット変更がないことを確認してから:

```powershell
cd C:\Users\user\AI開発\koten
git status
git fetch origin
git switch vintage-kana-main
git pull --ff-only origin vintage-kana-main
```

pull後に最初に読む:
1. `vintage-kana/HANDOFF.md` §50〜§51
2. `vintage-kana/DESIGN_HISTORY.md`
3. 必要に応じて `vintage-kana/PUBLICATION_QA.md`
4. 必要に応じて `vintage-kana/DESIGN_AUDIT_BRIEF_2026-09-20.md`

UI本線の実装確定HEAD:
- `80365000b7d3a8cdb34b52fd7a14618312a3b17e`
- CI run `35513391691` success

HANDOFF等の記録を含むローカル取得対象HEADは、この§51を含む最新 `vintage-kana-main`。

### ClaudeCodeのNINJAL監査を再開

別作業ツリーまたは作業切替時:

```powershell
cd C:\Users\user\AI開発\koten
git fetch origin
git switch vintage-kana-ninjal-audit
git pull --ff-only origin vintage-kana-ninjal-audit
```

最初に読む:
- `vintage-kana/NINJAL_GLYPH_AUDIT_TASK_2026-09-20.md`

監査ブランチの開始コミット:
- `63dc7360fc923011b464f2efb6cabe3bf6a0f7b5`

### 競合回避
- UI作業: `vintage-kana-main`
- NINJAL全字形監査: `vintage-kana-ninjal-audit`
- ClaudeCode監査側では `vintage-kana/index.html` を編集しない。
- 監査結果をUI本線へ統合するまでは、両ブランチを直接混ぜない。
- `main` へ直接pushしない。
- force-pushしない。

### ローカル再開指示

UI本線:
`HANDOFF §50〜§51から再開。最新vintage-kana-mainをpull済みとして、ClaudeCode監査結果待ちの間はUI側の回帰確認・実機確認のみ進める。`

NINJAL監査:
`vintage-kana-ninjal-auditをpullし、NINJAL_GLYPH_AUDIT_TASK_2026-09-20.mdを最初から読んで監査開始。index.htmlは触らない。`

## 52. 2026-09-20 mainとの履歴系統・公開手順

### 重要: `main` と `vintage-kana-main` に共通祖先がない理由

`vintage-kana` は、Thinking上でローカル作業環境を使わずGitHub/Web-onlyで開発を継続してきた履歴を、後から現在の `koten` リポジトリ構成へ統合した経緯がある。

そのため、GitHub上では `main` と `vintage-kana-main` が**履歴上の共通祖先を持たない別系統**として扱われる。これは異常や破損ではなく、開発経緯による既知の状態。

結果:
- `main...vintage-kana-main` の通常compareは `No common ancestor` になる。
- `vintage-kana-main` から `main` への通常PRを、そのまま公開手段として使わない。
- force pushや履歴の付け替えで解決しない。

### 公開時の安全な手順

GitHub Pagesは `main` pushで公開されるため、公開時は次の方式を使う。

1. 最新 `main` から公開専用ブランチを作る。
2. `vintage-kana-main` から、公開に必要な `vintage-kana/` 配下のファイルだけをそのブランチへ移植する。
3. `main` 基準の差分としてCI/内容を確認する。
4. 公開専用ブランチから `main` へPRを作成してマージする。
5. Pagesのデプロイ成功を確認する。

この方式なら、他アプリの `main` 履歴を壊さず、`vintage-kana` の公開内容だけ更新できる。

### ローカルへ戻す際の注意

`vintage-kana-main` 自体の開発履歴はそのまま維持する。
`main` と無理に履歴統合しない。
ローカルでは `vintage-kana-main` を独立した開発ブランチとしてpullして扱う。

再開時の注意文:
`mainとvintage-kana-mainは開発経緯上no common ancestor。公開はmain起点の一時ブランチへvintage-kana公開ファイルだけ移植し、PR経由でmainへ反映する。`

## 53. 2026-09-20 実機確認版をGitHub Pagesへ反映

§52の「mainとvintage-kana-mainはno common ancestor」の公開手順に従い、`main` 起点の公開専用ブランチ `publish-vintage-kana-20260920` を作成し、今回の実機確認に必要な公開ファイルだけを移植した。

公開差分:
- `vintage-kana/index.html`
- `vintage-kana/apple-touch-icon.png`
- `vintage-kana/favicon-32x32.png`
- `vintage-kana/icon-192.png`
- `vintage-kana/icon-512.png`
- `vintage-kana/site.webmanifest`

他アプリには変更なし。

公開用コミット:
- `4ec0e9e541cb4217aa267951c5828b64449d6352`

PR:
- #10 `publish: update vintage-kana device review build`
- CI全項目 success

mainマージコミット:
- `057f1def01f8b395d1b10a922aa52710bc2e8d21`

GitHub Pages:
- Deploy Pages run `35514897855`
- conclusion: success
- 公開URL: `https://yama-books.github.io/koten/vintage-kana/`

この公開はNINJAL全字形監査結果の統合前。今回の実機確認対象は§49〜§50で実装したUI・習得記録・逆引き字母問題等。

