# DATA_MODEL — vintage-kana

最終更新: 2026-09-18

## 字体マスター

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

## 資料

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
notes:
```

同じ作品でも異なる本・版を同一資料として潰さない。

## 実例

```yaml
example_id:
provenance_type: attested

glyph_id:
kana:
jibo:

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

## provenance_type

- `attested`
- `adapted`
- `constructed`
- `modern_composition`

## review_status

- `unreviewed`
- `source-checked`
- `context-checked`
- `human-confirmed`
- `rejected`

公開読解問題は原則 `human-confirmed` のみ。
