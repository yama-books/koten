# 変体仮名を飼う PoC v3 starter

PoC v2以降の統合設計を、長時間自律生活向けの分割コードへ落とした最初の実装基盤です。

## 起動

最も簡単:
`index.html` をブラウザで開く。

GitHub Pagesへ置いた場合も、そのまま動作する構成です。

## 現在動くもの

- 代表8体の自律行動
- 性格非公開
- 読み／字母のみ確定情報として表示
- idle / wander / look / approach / retreat / rest
- 句点・読点への異なる見立て
- 穴掘り
- 穴と土山の背景への永続追記
- 観察ログ
- 開発用内部ログ
- IndexedDB保存
- 再読み込み復元
- 簡易オフライン論理時間
- 世界時計・朝昼夕夜
- 小雨介入
- 句点／読点の追加

## Node長時間観察

ブラウザとNodeは `js/sim/step.js` の同じsimulation stepを使います。Node専用の行動ロジックはありません。

```bash
node node/health-check.cjs
node node/runner.cjs --ticks 10000 --seed 20261002 --output ./runs --source-commit <commit-sha>
```

詳細は `node/README.md` と `docs/NODE_RUNNER_DESIGN.md`。
## 次の設計・実装優先順位

1. 自動運転ログを数時間分取得
2. 行動頻度と個体差を監査
3. 濁点・半濁点
4. `、+、⇄゛`
5. 背景改変（巣・芽・句点置場）
6. 流動個体
7. 色
8. 複数エリア
9. 育成・工房・レシピ
