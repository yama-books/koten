# SESSION_CHECKPOINT_2026-09-19_1110_END

作成: 2026-09-19 11:10 JST
目的: vintage-kana の本セッション終了時点を固定し、次セッションで断絶なく再開する。

## 1. 最重要の現在位置

全体ロードマップ上の現在地:

```text
Phase 0  設計原則・典拠設計                 ✅ 完了
Phase 1  字体分布コーパス                   ✅ 完了
Phase 2  実例コーパス                       ▶ 進行中
  2A 書誌・候補選定                         ✅ 完了
  2B Stage A: source-checked 実例採取        ✅ パイプライン成立・必要量確保
  2C-1 exact-text 文脈対応                  ✅ 5件到達
  2C-2 context-checked 原画像確認            ← 現在ここ
  2D 比較可能な実例セット整備                ⏳
Phase 3  観察結果と先行研究の照合             ◐ 一部着手
Phase 4  教材データ生成                       ⏳
Phase 5  アプリUI接続                         ⏳
Phase 6  人間確認・公開品質保証               ⏳
Phase 7  継続拡張                             ⏳
```

現在の主工程は **Phase 2C-2: 最初の context-checked 1件を作ること**。

Stage A の件数増加を主目的にしない。
次は、exact-text まで確定した実例を原画像で確認し、連綿・接続状態まで確定する。

## 2. 現在のデータ量

`data/attested-examples.json`:

- totalExamples: 44
- sourceChecked: 44
- exactText: 5
- contextChecked: 0
- humanConfirmed: 0
- variantGlyphExamples: 39
- iseMonogatariExamples: 33

Phase 1:

- 中核47音価
- 15 witness
- 非ゼロ分布 2,046件
- 0件推定を含む派生セル 3,750
- 補遺「ん」15件
- 比率2種計算・検算済み

## 3. Phase 2C-1 で確定した exact-text 5件

すべて『諸国方言物類称呼』巻五。
国語研字形DBの個別出現と、同一底本の国語研公式翻字本文を、同丁内で対象音価が一意である場合に限って対応した。

### U+1B012 𛀒 / え / 字母「衣」

- 4オ: 「見えず」
- 6ウ: 「見えない」
- 7オ: 「見えたり」
- 16ウ: 「見えたり」

### U+3048 え / 字母「衣」

- 9ウ: 「たえ」

現在これらは:

- provenance_type: attested
- review_status: source-checked
- context_alignment_status: exact-text
- word / position_in_word / previous_char / next_char は確定済み
- renmen は unknown

である。

## 4. 次に行うこと

最優先:

1. 上記 exact-text 5件のうち1件を選ぶ
2. 国語研公開原画像を直接確認する
3. 対象字形の位置を照合する
4. 連綿・接続状態を確認する
5. 矛盾がなければ `context_alignment_status: exact`
6. `review_status: context-checked`
7. ROADMAPで定めた最初の区切り「context-checked 1件」を達成
8. 直ちにチェックポイントを更新する

画像取得ができない場合:
- 推測しない
- OCRだけで確定しない
- 画像取得経路の技術調査へ戻る
- VIEWER_EXTRACTION_NOTES.md に記録する

## 5. 伊勢物語比較の現在地

研究上の最重要比較対象は引き続き『伊勢物語』2 witness。

- 200014445: 国文学研究資料館所蔵、伝飛鳥井雅親筆本
- issg001: 国語研所蔵、嵯峨本第二種

主要候補:

- や / 也
- り / 利
- て / 天
- さ / 左
- を / 遠
- な / 奈
- も / 毛
- ほ / 保

Stage A では『伊勢物語』33件まで取得済み。

ただし高頻度字体の一部では、公式HTML上で個別出現行を容易に列挙できない。
そのため、まず brsk005 で context-checked の方法を成立させ、その後『伊勢物語』へ戻る。

## 6. 確定した取得方法

### Stage A

国語研字形DBの音価ページ内、対象字体セクションの個別出現画像情報から、

- witness
- viewer page
- occurrence ID
- X / Y
- 字体セクション
- 字母

を取得できる。

画像ファイル名の基底Unicodeだけで字体を判断してはいけない。
必ず親セクションの字体Unicode・字母と組み合わせる。

### exact-text

同一底本の公式翻字本文で、
同一丁内の対象音価が一意である場合に限って、
個別出現と翻字中の文字を対応させる。

複数候補がある場合は一意対応とみなさない。

## 7. 重要な設計原則

復活させない:

- 本来の仮名対応を無視した換字暗号
- 合言葉による任意換字
- ランダム字体選択を歴史再現と呼ぶ
- AI創作文を実在用例として扱う
- 複数witnessを無差別に合算して標準字体を作る
- 分布比率を歴史的正しさの確率として表示する

維持する:

- 読めなかった文字を解読できるようになる楽しさ
- 字体・字母学習
- 実資料読解
- 現代文を変体仮名で書いてみる活動
- 典拠へ戻れるUI
- witness別の観察事実

## 8. 主要ファイル

必ず読む:

1. `DESIGN_HISTORY.md`
2. `ROADMAP.md`
3. `HANDOFF.md`
4. 本ファイル
5. `DATA_MODEL.md`
6. `CONTEXT_SAMPLING_PLAN.md`
7. `VIEWER_EXTRACTION_NOTES.md`
8. `RESEARCH_LOG_2026-09-19.md`
9. `data/attested-examples.json`
10. `data/context-sampling-candidates.json`

補助:

- `SOURCES.md`
- `AGGREGATION_RULES.md`
- `data/sources.json`
- `data/auxiliary-sources.json`

## 9. ロードマップ運用規則

`ROADMAP.md` を全体正本として扱う。

区切りで必ず記録する:

- Phase/Subphase完了
- データモデル変更
- 新しい取得経路成立
- 取得経路失敗による方針転換
- glyph × witnessセット完了
- context-checked 1 / 5 / 10件
- human-confirmed 1 / 5件
- 会話長・ツール不調による中断リスク

## 10. 次セッションの最初の作業

新しい調査を始める前に、

1. ROADMAP.mdを読む
2. 本チェックポイントを読む
3. attested-examples.json の exact-text 5件を確認
4. brsk005 の原画像確認経路を特定
5. context-checked 1件作成を試す

から開始する。

本セッションはここで終了する。
