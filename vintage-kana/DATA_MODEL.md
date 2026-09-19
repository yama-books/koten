# DATA_MODEL — vintage-kana

最終更新: 2026-09-19

## 1. 字体マスター

```yaml
glyph_id:
kana:
jibo:
character:
unicode:        # 内部識別用。通常UIには表示しない
mj_glyph_name:
note:
source:
review_status:
```

通常UI:

```text
対応する仮名: あ
字母: 安
備考: （必要な場合のみ）
```

## 2. 資料

```yaml
work_id:
title:
witness_id:
witness_name:
volume:
creator:
date:
period:
genre:
medium:
holding_institution:
shelfmark:
source_material_id:
source_url:
bibliographic_source_url:
license:
license_source_url:
bibliographic_status:
review_status:
notes:
```

`work` と `witness` を分ける。
同じ作品でも異なる本・版を同一資料として潰さない。

書誌確認では、変体仮名字形DBのviewer URLとは別に、所蔵機関の書誌ページを `bibliographic_source_url` に保存する。画像利用条件の根拠ページは `license_source_url` に保存し、請求記号・資料IDも可能な限り構造化して保持する。

## 3. 実例

```yaml
example_id:
provenance_type: attested

glyph_id:        # 国語研字形DB／字体マスター上の代表字体ID。原画像の筆跡との完全一致を意味しない
kana:
jibo:
diacritic: none | dakuten | handakuten | other | unknown
glyph_assignment_basis: ninjal-hentaiganaDB | human-exact | other

source_work:
source_witness:
source_volume:
source_location:
occurrence_url:
source_image_ref:

context_alignment_status: none | page-level | exact-text | exact
page_transcription_ref:
context_original:
transcription:
normalized_reading:

word:
position_in_word: initial | medial | final | single | unknown
bunsetsu_position:
grammatical_role:

previous_char:
next_char:
renmen: true | false | unknown

evidence:
review_status:
human_confirmation_scope: none | kana-jibo-context | exact-glyph
publication_status: pending | approved | excluded
reviewed_by:
reviewed_at:
notes:
```

## 4. provenance_type

- `attested`
- `adapted`
- `constructed`
- `modern_composition`

## 5. 根拠

```yaml
evidence:
  - type: master_list
    source_id:
    locator:
  - type: attested_context
    source_id:
    locator:
  - type: scholarship
    citation:
    scope:
```

## 6. review_status

- `unreviewed`
- `source-listed`
- `source-checked`
- `context-checked`
- `human-confirmed`
- `rejected`

公開読解問題は原則 `human-confirmed` のみ。

### 実例の段階的確認

`provenance_type: attested` は「実資料上の出現そのものへ遡れる」ことを示す。
一方、語・前後文字・連綿等の文脈解析が完了したことまでは意味しない。

- `source-checked`
  - witness と個別出現位置（ページ・座標・字形）が一次資料／国語研字形DBで追跡可能
  - 文脈の文字単位対応は未完了でもよい
  - `context_alignment_status: none | page-level | exact-text`
  - 未確認の `word / previous_char / next_char / renmen` は推測せず null / unknown
- `source-checked` + `context_alignment_status: exact-text`
  - 対象字形の個別出現位置と、同じ丁の公式翻刻中の文字位置を一意に対応できる
  - `word / position_in_word / previous_char / next_char` 等の本文情報は記録してよい
  - ただし連綿・接続など原画像を要する古書体上の文脈は未確認
- `context-checked`
  - 対象字形と翻刻の位置対応に加え、原画像で必要な古書体上の文脈も確認
  - `renmen` 等を確認済みまたは明示的に判定不能とした
  - `context_alignment_status: exact`
- `human-confirmed`
  - 人間が原画像と翻字対応、教材表示内容を確認
  - `human_confirmation_scope` で確認範囲を明示する
  - `publication_status: approved` のものだけ公開読解教材に出せる

### Unicode代表字体と原画像の筆跡を分ける

国語研字形DBの `glyph_id / character` は、データベース上でその出現に付与された代表字体IDとして保持する。
ただし、歴史資料中の手書き字形はフォントの代表字形と完全一致するとは限らない。

そのため人間確認では、次を分離する。

- `human_confirmation_scope: kana-jibo-context`
  - 原画像中の文字の読み（対応する仮名）
  - 字母
  - 公式翻字との対応
  - 教材表示としての妥当性
  を確認した状態。
  - Unicode代表字体との輪郭完全一致までは要求しない。
- `human_confirmation_scope: exact-glyph`
  - 上記に加えて、原画像の字形を特定Unicode字体として人間が厳密同定した状態。

一次公開の読解教材では、原則 `kana-jibo-context` まで確認できれば公開可とする。
UIではフォント字形を「対応字体の代表表示」として扱い、原資料の筆跡そのものと誤認させない。

同じ字母から現代標準平仮名と複数の変体仮名が生じる場合があるため、
「字母が同じ」ことと「Unicode字体が同一」ことを同義にしない。

この段階分けにより、「実在する出現」「文脈解析済み」「人間確認済みの読み・字母」「Unicode字形の厳密同定」を混同しない。

## 7. 資料別字体分布

```yaml
distribution_id:
source_witness:
kana:
glyph_id:
character:
jibo:
diacritic: none | dakuten | handakuten | other | unknown
count:
kana_total:
ratio:
data_source:
retrieved_at:
review_status:
notes:
```

### 分布データの扱い

- `source_witness` 単位で保存し、同一作品の複数巻・異本を勝手に合算しない。
- 国語研字形DBのページで0件の資料が省略される場合、初回転記では非ゼロ件のみを保存する。
- 0件を明示的に補完する処理は、全47仮名の非ゼロ転記完了後に別工程で行う。
- `ratio` は分母の定義が確定するまで `null` とする。
- 濁点・半濁点等は無印字形と合算しない。`diacritic` で分離する。
- 「この資料で多い」という観察を「この時代で正しい」という規則へ一般化しない。

### ファイル分割

分布データは件数増加に応じて複数JSONへ分割できる。

正規の入口:
`data/glyph-distribution-index.json`

現行:
- `data/glyph-distribution.json` — part 1
- `data/glyph-distribution-part2.json` — part 2

索引には、各partの収録仮名、非ゼロレコード件数、全体件数を記録する。
分割境界は保存・取得上の都合であり、歴史的・言語学的な分類を意味しない。

## 8. 学習問題

```yaml
question_id:
question_type:
source_example_ids:
prompt:
choices:
answer:
explanation:
difficulty:
review_status:
```

`question_type` 例:
- `glyph_to_kana`
- `glyph_to_jibo`
- `jibo_to_glyph`
- `attested_word_reading`
- `attested_phrase_reading`
- `source_image_reading`

## 9. 字体選択支援

現代文作成画面で候補を並べる場合:

```yaml
candidate:
glyph_id:
attested_count_in_selected_source:
example_ids:
note:
```

「おすすめ」「正しい」ではなく、
「この資料では実例が多い」「この資料では実例を確認済み」のように、観察事実として表示する。
