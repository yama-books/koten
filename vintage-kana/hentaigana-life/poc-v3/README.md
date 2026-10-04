# 変体仮名を飼う PoC v3

文字を操作するゲームではなく、少人数の変体仮名が暮らす世界を観察するPoCです。Browser と Node は同じ shared simulation core を使います。

## 現在のPoC

- 常住6体 + 流動2枠。流動候補は 隱・希・土・茂・傳・寶
- 流動個体は自分で来訪・滞在・離脱し、去っても履歴を保持
- 句読点を個体ごとに別のものとして見立てる
- 。と、に加えて、゛・゜の見立てを少数ずつ実装
- 記号を拾う・運ぶ・置く
- 水辺や雨では 。→゜ が起こりやすく、乾いた場所では ゜→。 が起こりやすい。必ず変わる固定レシピではない
- 穴・土山に加えて、繰り返しから道・句点置場・芽が残る
- stateChanges をイベントへ記録し、analyzer が「永続世界が変わったtick」の割合を集計
- IndexedDB保存、Node snapshot/resume、continuous observer

ブラウザ保存は world schema 3 から新しい世界として始まります。既存の schema 2 の長時間runは compatibility fingerprint が異なるため、新コードではresumeできません。

## Node

\`\`\`bash
node node/health-check.cjs
node node/runner.cjs --ticks 10000 --seed 20261004 --output ./runs --source-commit <commit-sha>
node node/analyze-run.cjs --run <run-directory> --out <new-output-directory>
\`\`\`

health-check は Browser/Node の simulation file contract と同一seed再現性も確認します。

## 評価

世界状態変化率は固定ノルマにしません。stateChanges で再計測し、まず15〜20%程度を観察上の初期目安として、何も起きない時間を残しながら調整します。観察イベントは1 tickあたり1.0以下を歯止めにします。
