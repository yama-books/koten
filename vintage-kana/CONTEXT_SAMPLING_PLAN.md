# CONTEXT_SAMPLING_PLAN

最終更新: 2026-09-19

## 目的

Phase 1 の資料別字体分布から抽出した差の大きい字体について、原資料へ戻って実文脈を採取する。

分布差そのものを規則とみなさず、語・位置・前後文字・連綿等を観察するためのサンプリング計画とする。

## 初回対象

同一作品で異なる witness を直接比較でき、分布差が大きい『伊勢物語』を最優先とする。

- 国文研200014445
- 嵯峨本第二種

優先する同字母逆転:

1. や / 也: 𛃞 ↔ や
2. り / 利: り ↔ 𛃲
3. て / 天: て ↔ 𛁳
4. さ / 左: さ ↔ 𛀿
5. を / 遠: 𛄜 ↔ を
6. な / 奈: 𛂂 ↔ な
7. も / 毛: 𛃚 ↔ も
8. ほ / 保: ほ ↔ 𛂻

## 初回サンプリング量

1字体・1 witness あたり、まず5例を目安とする。

ただし単純な先頭5件に固定せず、取得可能なら資料の前・中・後部に分散させる。

最初の目的は統計的推定ではなく、文脈採取パイプラインの成立確認である。

## 1例ごとに必須とする情報

- example_id
- provenance_type: attested
- glyph_id
- kana
- jibo
- diacritic
- source_work
- source_witness
- source_location
- context_original
- transcription
- word
- position_in_word
- previous_char
- next_char
- renmen
- source_image_ref
- evidence
- review_status

取得できない項目は推測せず `unknown` または `null` とする。

## 採取条件

`attested` として保存するには、最低限:

1. どの witness か確定できる
2. 原資料上の位置へ戻れる
3. 対象字体を原画像または国語研字形DB上で確認できる
4. 周辺文脈を同じ位置から取得できる

を満たすこと。

## 停止条件

次の場合は `attested-examples.json` へ入れない。

- viewer 上で位置を一意に追えない
- 翻刻と原画像の対応が不明
- 字体リンクだけあり文脈が取れない
- OCRだけを根拠に字形を確定する必要がある
- 前後ページの推測で位置を補う必要がある

## 派生候補

機械抽出結果:
`data/context-sampling-candidates.json`

ここにある score / share は採取順を決めるための記述統計であり、「自然さ」「正しさ」を意味しない。


## 段階的な保存

実例収集は二段階に分ける。

### Stage A: source-checked attested

次が確定できれば、`provenance_type: attested` / `review_status: source-checked` として保存してよい。

- witness
- 対象字形
- 個別出現位置（ページ、可能なら座標）
- 出現位置へ戻れるURL
- 同じページの翻刻または原画像参照先

この段階では、字形と翻刻中の文字位置が厳密に対応していない場合、
`context_alignment_status: page-level`
とし、語・前後文字・連綿を推測しない。

### Stage B: context-checked

原画像と翻刻を位置対応させた後、

- word
- position_in_word
- previous_char
- next_char
- renmen
- 必要に応じて bunsetsu_position / grammatical_role

を確定し、`review_status: context-checked`、
`context_alignment_status: exact` へ昇格する。

公開教材にはこの上で人間確認を要求する。

この段階化は、実在する字形出現をコーパスへ取り込みつつ、未確認の文脈解析を混入させないために行う。
