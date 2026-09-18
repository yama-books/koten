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
