# ROADMAP — vintage-kana

最終更新: 2026-09-19
状態: ACTIVE
正本の役割: プロジェクト全体の進行位置・区切り・次作業を示す。詳細な設計思想は DESIGN_HISTORY.md、実作業ログは RESEARCH_LOG_*.md を参照。

---

## 0. 現在位置

```text
Phase 0  設計原則・典拠設計                 ✅ 完了
Phase 1  字体分布コーパス                   ✅ 完了
Phase 2  実例コーパス                       ✅ MVP区切り到達
  2A 書誌・候補選定                         ✅ 完了
  2B Stage A: source-checked 実例採取        ✅ パイプライン成立・必要量確保
  2C Stage B: context-checked 文脈対応        ✅ MVP区切り到達（context-checked 10件）
  2D 比較可能な実例セット整備                ⏳
Phase 3  観察結果と先行研究の照合             ◐ 一部着手
Phase 4  教材データ生成                       ▶ MVP着手
Phase 5  アプリUIへの接続                     ▶ MVP監査・実装
Phase 6  人間確認・公開品質保証               ⏳
Phase 7  継続拡張                             ⏳
```

### 2026-09-19 時点の数値

- 中核47音価の非ゼロ分布: 2,046件
- 派生セル: 3,750
- 補遺「ん」: 15件
- `attested-examples.json`: **49件**
  - source-checked（現在のreview_status）: **39**
  - source-checked以上: **49**
  - exact-text（現在のalignment状態）: **0**
  - exact: **10**
  - exact-text以上到達: **10**
  - context-checked: **10**
  - human-confirmed: **0**
  - 変体仮名字形 U+1B***: **44**
  - 『伊勢物語』: **33**

Phase 2C のMVP区切り条件 `context-checked=10` を達成した。
一次公開を優先するため、ここからは実例の追加研究を主工程にせず、
**教材データ生成・UI接続・公開対象例の human-confirmed・公開QA** をボトルネックとして扱う。

---

# Phase 0 — 設計原則・典拠設計

状態: ✅ 完了

## 目的

変体仮名を歴史的書記文化として扱うための設計原則を固定する。

## 完了条件

- 換字暗号を撤廃
- 無作為字体選択を歴史再現とみなさない
- work / witness を分離
- provenance_type を導入
- attested / adapted / constructed / modern_composition を分離
- 字体マスター・実例・研究の三層典拠を定義
- UI用語を確定

## 正本

- DESIGN_HISTORY.md
- HANDOFF.md
- DATA_MODEL.md

---

# Phase 1 — 字体分布コーパス

状態: ✅ 完了

## 目的

「どの資料にどの字体が何件あるか」を、解釈を加えず観察可能にする。

## 完了済み

- 47音価 × 15 witness
- 非ゼロ分布 2,046件
- 0補完 1,704セル
- 合計 3,750セル
- `share_within_kana_all_forms`
- `share_within_kana_same_diacritic`
- 「ん」補遺
- 算術検算

## 完了条件

✅ 47音価を一巡
✅ 0件推定ルールを明示
✅ 比率計算の意味を限定
✅ 生データと派生データを分離

---

# Phase 2 — 実例コーパス

状態: ▶ 進行中

Phase 1 の件数を「教材」へ直接変換せず、原資料上の個別出現へ戻る工程。

---

## Phase 2A — 書誌監査・採取候補選定

状態: ✅ 完了

### 完了済み

- 15 witness の年代・媒体・所蔵・利用条件を一次確認
- `sources.json` 更新
- 分布差の大きい字体を候補化
- 同字母異体の優勢逆転を抽出
- `context-sampling-candidates.json` 作成
- 補助伝本・方法論データを `auxiliary-sources.json` に分離

### 主な優先候補

『伊勢物語』2 witness の:
- や / 也
- り / 利
- て / 天
- さ / 左
- を / 遠
- な / 奈
- も / 毛
- ほ / 保

---

## Phase 2B — Stage A: source-checked 実例採取

状態: ✅ パイプライン成立・主工程終了

### 定義

次を一次資料／国語研字形DBから追跡可能にする。

- witness
- 字体
- 原資料ページ
- occurrence ID
- X / Y 座標
- 根拠URLまたは根拠ページ

文脈の文字単位対応が未完でもよい。

### 現在値

- source-checked: 44
- うち『伊勢物語』: 33
- うち変体仮名字形: 39

### ここでの目的

1. 取得経路を安定化する
2. 特徴的な字体×witnessペアを複数例で確保する
3. Stage B へ送る候補母集団を作る

### 2B の完了条件

次のいずれかを満たした時点で 2C を主工程へ移す。

**条件A（推奨）**
- 『伊勢物語』2 witness について、比較対象となる字体×witnessペアを最低5組確保
- 各ペアについて原則5例以上、または全出現が5件未満なら全件
- うち少なくとも2組は同字母異体の優勢逆転候補

**条件B（取得制約時）**
- 2資料以上で合計50件程度の Stage A が集まり、
- 文脈対応技術の検証に十分な前・中・後ページ分散が得られた場合

42件あるため、今後は件数を無制限に増やすより **2Cへの移行を優先**する。

---

## Phase 2C — Stage B: 文脈対応

状態: ✅ MVP区切り到達

### 目的

Stage A の「位置が分かる実例」を二段階で深める。

#### 2C-1 exact-text
- 個別字形出現と公式翻刻中の文字位置を一意に対応
- word / position_in_word / previous_char / next_char を確定
- 連綿など画像を要する項目はまだ unknown でよい
- review_status は source-checked のまま

#### 2C-2 exact / context-checked
- 原画像で字形周辺を確認
- renmen 等の古書体上の文脈を確認
- review_status を context-checked へ昇格

### 必須確認

- 原画像上の対象字体
- 同位置の翻刻
- word
- position_in_word
- previous_char
- next_char
- renmen
- 必要に応じて bunsetsu_position
- 必要に応じて grammatical_role

### 原則

- OCRだけで確定しない
- 検索スニペットだけで確定しない
- 別伝本を代用しない
- 不明項目を推測で埋めない

### 最初の完了目標

1. **exact-text 1件** ✅
2. **exact-text 5件** ✅
3. **context-checked 1件** ✅
4. **context-checked 5件** ✅
5. **context-checked 10件** ✅

ただし、同一ページや同一語に偏らせず、
- 2 witness 以上
- 2字体以上
- 前・中・後の複数位置

を含める。

### 2C の区切り

- exact-text 1件成立
- exact-text 5件到達
- context-checked 1件成立
- context-checked 5件到達
- context-checked 10件到達

それぞれでチェックポイントを更新する。

---

## Phase 2D — 比較可能な実例セット整備

状態: ⏳

### 目的

単発実例ではなく、比較可能な単位を作る。

例:

```text
work: 伊勢物語
kana: や
jibo: 也

witness A:
  𛃞 ... 5+ contexts

witness B:
  や ... 5+ contexts
```

### 完了条件

最低3つの比較セットで、
- 両 witness
- 字体
- 語
- 位置
- 前後文字
- 連綿

が比較できる。

---

# Phase 3 — 観察結果と先行研究の照合

状態: ◐ 一部着手

## すでに着手済み

- 白井純 2019
- 鈴木広光 2006
- 鈴木広光 2011
- 高田・矢田・斎藤 2015

## 本格着手条件

Phase 2C で context-checked が10件程度に達した後。

## 目的

観察結果について、

- 資料固有か
- 同一作品の版差か
- 語位置との関係か
- 連綿との関係か
- 印刷／植字工程の差か

を先行研究と照合する。

## 禁止

観察数件だけから「一般規則」を作らない。

---

# Phase 4 — 教材データ生成

状態: ▶ MVP着手

## 4A 字体・字母クイズ

状態: ✅ MVP実装済み

Phase 1の観察済み字体データから動的出題する。字体マスター／分布データの典拠範囲を越えて一般化しない。

### 着手条件

Phase 2とは独立して開始可能だが、
現在は実例基盤を優先する。

## 4B attested 語・短句読解

状態: ▶ 公開ゲート実装済み・human-confirmed待ち

UIは `human-confirmed` のみ表示する。候補5件を `PUBLICATION_REVIEW_QUEUE.md` に固定済み。

### 着手条件

- context-checked 実例が10件以上
- human-confirmed を作る確認手順が決まる

## 4C 原画像読解

### 着手条件

- 画像ライセンス確認
- 原画像位置の安定参照
- 人間確認

---

# Phase 5 — アプリUIへの接続

状態: ▶ MVP監査・実装

## 5A 字体詳細

状態: ✅ MVP実装済み

- 対応する仮名
- 字母
- この資料での件数
- 実例を見る

## 5B 読解

状態: ✅ MVP実装・公開承認4件投入済み

- 一字
- 語
- 短句
- 原画像

## 5C 書いてみる

状態: ✅ MVP実装済み

現代文入力から、
- 対応字体候補
- 字母
- 資料別件数
- 実例

を見て利用者が選択する。

### 禁止

- 「おすすめ字体」
- 「歴史的正しさ○%」
- 自動ランダム変換を歴史再現と表示

---

# Phase 6 — 人間確認・公開品質保証

状態: ▶ 人間確認ゲート達成 / 実ブラウザ・Pages QA中

## 完了条件

- 教材に使う例は human-confirmed
- 出典へ遡れる
- ライセンス表示が正しい
- 変体仮名フォントが安定表示
- モバイル・PCで確認
- 誤読時に原資料へ戻れる

---

# Phase 7 — 継続拡張

状態: ⏳

候補:

- CODH資料との連携
- 他作品・他時代への拡張
- 字母認識支援
- 同一語内の字体比較
- 連綿パターン
- 資料別「書いてみる」候補順
- 教師向け教材作成機能

---

# 区切り・チェックポイント規則

長時間作業で進捗を失わないため、以下を **自動的な区切り** とする。

## A. 必ず記録する区切り

1. Phase / Subphase を完了したとき
2. データモデル・判定基準を変更したとき
3. 新しい取得経路が成立したとき
4. 新しい取得経路が失敗し、方針転換するとき
5. 1つの `glyph × witness` 採取セットを完了したとき
6. Stage A / B / human-confirmed の件数が節目に達したとき
7. 会話長・ツール不調等で中断リスクが高まったとき

## B. 件数による節目

Stage A:
- +20件ごと、または対象ペア完了ごと

Stage B:
- 1件
- 5件
- 10件
- 以後10件ごと

human-confirmed:
- 1件
- 5件
- 教材セット完成ごと

## C. 記録先

最新位置:
- `ROADMAP.md`
- `HANDOFF.md`

詳細経過:
- `RESEARCH_LOG_YYYY-MM-DD.md`

大きな節目:
- `SESSION_CHECKPOINT_*.md`

技術調査:
- `VIEWER_EXTRACTION_NOTES.md`

---

# 現在の次アクション

**現在位置: Phase 6 / 一次公開QA**

1. Phase 2C `context-checked=10` ✅
2. Phase 2 の追加採取を主工程から外す ✅
3. UI 0.7 / 字形一覧・字母クイズ・書いてみる・実資料を読む ✅
4. 人間確認 P1〜P5 ✅
5. publication approved 4件 / 最低3件ゲート ✅
6. PC実ブラウザでフォント・4タブ操作 ← 現在
7. モバイル幅確認
8. GitHub Pages実配信・典拠リンク確認
9. 一次公開

### 2026-09-19 context-checked 10件達成

『比翼連理花廼志満台』初編上の U+1B094 𛂔（ね）5件を追加。
国語研公式翻字・IIIF manifest・同一底本原画像を照合し、5件とも `context_alignment_status: exact` / `review_status: context-checked` とした。
2ウ・15オは同丁に「ね」が複数あるため原画像周辺本文で一意化し、3オ・8ウ・13ウは同丁の「ね」が各1箇所のため一意対応した。
連綿は全5件で原画像確認済みだが二値判定を安全に行えないため `renmen: unknown` とし、未確認ではなく「確認済み判定不能」と記録した。

現在:
- total 49
- exact 10
- context-checked 10
- human-confirmed 0
- witness は brsk005 / hnsd001 の2資料へ拡張
- 対象音価は「え」「ね」へ拡張

Phase 2C は一次公開MVPの区切りを達成。研究拡張より製品化を優先する。

---

# 進捗表示の書式

今後の作業報告では、必要に応じて以下の形式を使う。

```text
現在: Phase 2C / Step 1
進捗: context-checked 0 / 10
今回: Stage A候補から文脈対応を1件検証
次の区切り: context-checked 1件成立
```

これにより、長い作業でも現在位置と次の停止点を常に追跡できる。


### 2026-09-19 context-checked 1件達成

最初の Stage B / context-checked を成立させた。

- example: `att-brsk005-u1b012-brsk005-009-id0346-x0474-y2151`
- 資料: 『諸国方言物類称呼』巻五 4オ
- 字体: U+1B012 / 𛀒 / え / 字母「衣」
- 翻字: 「正字とは見えず」
- word: 「見えず」
- previous_char: 「見」
- next_char: 「ず」
- 原画像: `/ninjaldl/buturuisyoko/005/jpg/brsk005-009.jpg`
- 原画像上で対象字体を同定し、後続「ず」への連続筆線を確認
- `renmen: true`
- `context_alignment_status: exact`
- `review_status: context-checked`
- `human-confirmed: 0` のまま

次の区切りは **context-checked 5件**。
同じ exact-text 5件の残り4件を優先して原画像確認する。


### 2026-09-19 context-checked 5件達成

Phase 2C-1 で exact-text にした『諸国方言物類称呼』巻五の5件すべてを、
同一底本の国語研高解像度原画像で確認し `context-checked` へ昇格した。

- 4オ U+1B012 𛀒 「見えず」: `renmen=true`（対象から後続「ず」へ連続）
- 6ウ U+1B012 𛀒 「見えない」: `renmen=true`（前接「見」から対象へ連続）
- 7オ U+1B012 𛀒 「見えたり」: `renmen=true`（前接「見」から対象へ連続）
- 16ウ U+1B012 𛀒 「見えたり」: `renmen=true`（前接「見」から対象へ連続）
- 9ウ U+3048 え 「たえ」: `renmen=true`（前接「た」から対象へ連続）

`human-confirmed` は 0 件のまま。
次の節目は **context-checked 10件**。
同一ページ・同一語への偏りを避けるため、次の5件は別の字体・witnessを含める。


### 2026-09-19 一次公開UI 0.5 実装

- 旧 prototype 0.4 の「あ・い・う・え」16字直書きを撤廃。
- Phase 1 分布JSONから観察済み U+1B*** 字体を動的に読み込む。
- 字形一覧・字母クイズ・利用者選択式「書いてみる」を実装。
- 観察件数は「歴史的正しさ」や確率ではない旨をUIに明示。
- 「実資料を読む」は `human-confirmed` のみ表示する公開ゲートを実装。
- `PUBLICATION_REVIEW_QUEUE.md` に一次公開候補5件を固定。
- `PUBLICATION_QA.md` に構文検査・残QAを記録。
- 現行 `index.html` のinline JavaScriptはV8構文検査PASS。

現在の主ボトルネックはコード実装ではなく、**公開候補3〜5件の人間確認と実ブラウザ表示QA**。


### 2026-09-19 人間確認ゲート達成

- P1〜P4: `human-confirmed` + `publication_status: approved`
- P5: `publication_status: excluded`（史料実例はcontext-checked維持）
- 公開承認: 4件

人間確認の通常範囲を `kana-jibo-context` とし、原資料の手書き字形とUnicodeフォント代表字形の輪郭完全一致は一次公開の必須条件から外した。
`glyph_id / character` は国語研字形DB上の代表字体IDとして保持する。
