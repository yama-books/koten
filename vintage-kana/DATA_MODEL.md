# DATA_MODEL — vintage-kana

最終更新: 2026-09-18

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
date:
period:
genre:
medium:
holding_institution:
source_url:
license:
bibliographic_status:
review_status:
notes:
```

`work` と `witness` を分ける。
同じ作品でも異なる本・版を同一資料として潰さない。

## 3. 実例

```yaml
example_id:
provenance_type: attested

glyph_id:
kana:
jibo:
diacritic: none | dakuten | handakuten | other | unknown

source_work:
source_witness:
source_volume:
source_location:

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

source_image_ref:
evidence:
review_status:
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
