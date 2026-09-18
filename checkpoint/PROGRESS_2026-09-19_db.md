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
