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

- legacy comparable: 348
- DB raw: 310
- DB resolved: 69
- DB suppressed: 241
- matched: 69
- DB only: 0
- legacy only: 252
- raw coverage: 89.1%
- resolved match rate: 19.8%

`resolved match rate` は正答率ではない。短い表面形を文脈未解決のまま通さないため、意図的に低い。

## 回帰
- 係り結び route API: 8/8 PASS
- 形容詞内部一致抑制: 2/2 PASS
- `や・か・ぞ・こそ` の raw文字列距離だけで係り先を推定する方式は不採用

## 次
まず legacyOnly 252件を表面形別に集計し、
1) DB未収録
2) context-required で意図的抑制
3) 大きい単位に吸収
4) legacy 側の過剰部分一致候補
へ分解する。
