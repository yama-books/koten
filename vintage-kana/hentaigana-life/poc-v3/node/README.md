# Hentaigana Life headless runner

ブラウザ版と同じ `js/data/*`・`js/core/{utils,event-bus,logger,world-state}.js`・`js/sim/*` を読み、`HKLife.Simulation.step()` を共有して画面なしで長時間運転する。Node専用の行動決定ロジックは持たない。

## 最小実行

```bash
node node/health-check.cjs
node node/runner.cjs --ticks 10000 --seed 20261002 --output ./runs --source-commit <commit-sha>
node node/resume-health-check.cjs
```

既存runディレクトリがある場合は上書きを拒否する。毎回新しい `run-id` を使う。

## 出力

```text
runs/
  <run-id>/
    run-meta.json
    events.jsonl
    run-result.json
    snapshots/
      000000000000-initial-....json
      ...
      ...-final-....json
```

`events.jsonl` は実行中に追記される。snapshotは常に新規ファイルで、過去snapshotを置換しない。

### 主なオプション

- `--ticks N`: 実行tick数
- `--seed N`: 再現用uint32 seed
- `--snapshot-every N`: snapshot間隔
- `--event-level all|observation`: 内部ログも保存するか
- `--tick-delay-ms N`: 実時間の間隔を付けたい場合
- `--run-id ID`: 新規run IDを明示
- `--source-commit SHA`: 実行対象commit/tagを記録
- `--resume-run DIR`: 保存済みrunを新しいsegmentとして再開。追加で実行するtick数を`--ticks`に指定
- `--resume-from FILE`: `--resume-run`内のsnapshotを明示
- `--pause-after-segment`: テストや計画停止向けに再開可能なinterrupted状態でsegmentを終了

resume時はrun metadata・snapshot・現在のGit commitのsource/version/seedを照合する。completed run、version不一致、末尾が不完全なeventは拒否する。snapshotより後ろに完全なeventが残るcrashでは、`event-level=all`のrunだけ共有simulationを同一seed/PRNG stateから再生し、既存eventと一致したtick境界までsnapshotを復元してから再開する。再生不一致や安全なtick境界が見つからない場合は停止する。`events.jsonl`はappend-only、snapshotは一時ファイルからrenameして新規作成する。`segments/`に各実行区間を記録する。

## Offline analysis

```bash
node node/analyze-run.cjs --run ./runs/<run-id>
node node/analyze-run.cjs --run ./runs/<run-id> --out ./comparisons/<name>/<run-id>
```

既存events/snapshotsを読むだけで`analysis-summary.json`と`analysis-summary.md`を生成する。`--out`なしはrunディレクトリ内に、`--out`ありは指定先に書く。どちらも出力先に同名ファイルがあれば上書きせず停止する。`--out`にrunディレクトリ内のパスは指定できない。分析済みrunを再集計するときやrun間比較では`--out`を使う。

## 更新時の安全運用

長時間観察専用の独立フォルダで運用し、通常の `koten` 作業ツリーを自動pullしない。

1. 現runのfinal snapshotを保存してNodeを停止する。
2. 新しい安全確認済みcommit/tagを別ディレクトリへ取得する。
3. `node node/health-check.cjs` を実行する。
4. 必要なschema migrationがある場合だけ、旧runを直接変更せず「新しいrun用コピー」に適用する。
5. health check成功後、新しいrun-idで起動する。
6. 失敗したら旧ディレクトリ・旧commitで再開する。

v3 runner初版は、自動更新・自動migration・旧run再開までは実装しない。
