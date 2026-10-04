# Hentaigana Life headless runner

ブラウザ版と同じ `js/data/*`・`js/core/{utils,event-bus,logger,world-state}.js`・`js/sim/*` を読み、`HKLife.Simulation.step()` を共有して画面なしで長時間運転する。Node専用の行動決定ロジックは持たない。

## 最小実行

```bash
node node/health-check.cjs
node node/runner.cjs --ticks 10000 --seed 20261002 --output ./runs --source-commit <commit-sha>
node node/resume-health-check.cjs
node node/compat-health-check.cjs
node node/snapshot-size-check.cjs
node node/continuous-health-check.cjs
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

resume時はrun metadata・snapshot・現在のコードのversion/seedと、simulation compatibility fingerprintを照合する。fingerprintはsimulation結果・PRNG・snapshot/resume stateに影響するファイルだけのhashで、analyzer・README・docs・比較ツールの変更ではresume互換性を失わない。Git SHA (`sourceCommit`) は監査情報として記録する。fingerprintのないlegacy run (2026-10-02まで) は従来どおりcommit完全一致を要求する。仕様と対象ファイル一覧は `docs/NODE_RUNNER_DESIGN.md`。completed run、version不一致、末尾が不完全なeventは拒否する。snapshotより後ろに完全なeventが残るcrashでは、`event-level=all`のrunだけ共有simulationを同一seed/PRNG stateから再生し、既存eventと一致したtick境界までsnapshotを復元してから再開する。再生不一致や安全なtick境界が見つからない場合は停止する。`events.jsonl`はappend-only、snapshotは一時ファイルからrenameして新規作成する。`segments/`に各実行区間を記録する。

## Offline analysis

```bash
node node/analyze-run.cjs --run ./runs/<run-id>
node node/analyze-run.cjs --run ./runs/<run-id> --out ./comparisons/<name>/<run-id>
```

既存events/snapshotsを読むだけで`analysis-summary.json`と`analysis-summary.md`を生成する。`--out`なしはrunディレクトリ内に、`--out`ありは指定先に書く。どちらも出力先に同名ファイルがあれば上書きせず停止する。`--out`にrunディレクトリ内のパスは指定できない。分析済みrunを再集計するときやrun間比較では`--out`を使う。continuous runの分割eventも読み、crash後に置き換えられたeventは数えない。

## Continuous observer (常時観察運転)

batch runner (`runner.cjs`) とは別に、`observer.cjs` が共有stepを実時間ペース (既定1.3秒/tick) で止まるまで回す。待機はsimulationの外側で行い、停止していた時間は取り戻さない。同じseedなら、何度止めてもcrashしても、batch runの同tick数と同じevent・worldになる (`continuous-health-check.cjs` で確認)。

```powershell
# 観察フォルダ (hentaigana-life-observer) で
$w = ".\app\source\vintage-kana\hentaigana-life\poc-v3\node\windows"
# 開始: 新規runなら作成、既存runならresume。supervisorを別の非表示コンソールで起動し、tickが進むのを確認して戻る
powershell -File "$w\start-observer.ps1" -RunId <run-id> -Seed <seed>      # -DryRun で確認だけ
# 状態 (読み取りのみ。-AppendTo FILE で1行JSONを追記)
powershell -File "$w\observer-status.ps1" -RunDir .\runtime\runs\<run-id> -StateDir .\runtime\current
# 停止 (STOPを作って最終heartbeatを待つ。STOPは残る)
powershell -File "$w\stop-observer.ps1" -StateDir .\runtime\current
# 再開: runtime\current\STOP を自分で削除してから start-observer.ps1 を再実行 (-Seed は省略可)
```

`observer.cjs --create` は run を作るだけで終了し、tick は進めない。常時動くのは supervisor (と、その子の observer) 。start-observer.ps1 は次の場合に起動しない: STOP や ALERT.json がある (どちらも削除しない)、同じ state dir の supervisor や observer が動いている、既存 run の seed が `-Seed` と違う、continuous run ではない。検証は `windows/test-start-observer.ps1` (一時ディレクトリで実際に起動・停止する。Windows PowerShell 5.1 と 7 で確認済み)。

run の構成 (`eventLayout: chunked-v1`):

```text
<run-id>/
  run-meta.json            mode: continuous, tickMs, compatibility
  events/seg0001-c000001.jsonl ...   chunk。1プロセスが書き、二度と開かない
  events/chunks.jsonl      append-only manifest (first/validThrough sequence, bytes, sha256, closeReason)
  snapshots/               永続: initial、rotate (chunk境界)、stop、recovered。削除しない
  checkpoints/             定期checkpoint。直近 --keep-checkpoints 個だけ残す
  segments/                プロセスごとの区間。stopped / crashed / failed
```

state dir (`runtime/current`): `heartbeat.json` (毎秒とcheckpoint時)、`STOP` (あれば停止、残っている間は起動しない)、`supervisor.lock`、`supervisor.log`、`ALERT.json` (人の確認が必要なとき)。

- checkpoint: 230 tick (約5分) または5分ごと。events を fsync してから snapshot を一時ファイル→renameで書く。
- chunk切替: 66000 tick (約24時間) または 256 MB。切替直前に永続snapshotを書く。
- 停止: STOPファイル、SIGINT/SIGTERM/SIGBREAK/SIGHUP、supervisorからのIPC。tickの途中では止めない。
- crash後: 最新snapshotから共有simulationを再生し、既存eventと完全一致した最後のtick境界まで回復する。途中のtickのeventと壊れた末尾行は元のchunkに残したまま、manifestの `validThroughSequence` で無効扱いにする (`supersededEvents`, `tornTailBytes`)。再生が一致しなければ拒否する。
- supervisor: 終了コード0で終了、3 (互換性や安全性で拒否) は ALERT.json を書いて終了、それ以外は指数backoffで再起動 (1時間に5回を超えたら ALERT)。heartbeatが古い (既定 max(120秒, 50 tick)) と hang とみなして kill し再起動する。同じstate dirで2つ目のsupervisorは即終了、同じrunで2つ目のobserverは終了コード5。
- Windows自動起動: `windows/register-observer-task.ps1 -RunDir <run> -StateDir <state>` がログオン時と15分ごとのタスクを登録する (`-WhatIf` で確認可)。常駐設定の変更なので利用者が実行する。解除は `unregister-observer-task.ps1`。ログオン中のみ動作し、node のコンソール窓が出る。窓を閉じると停止する。SIGHUPでの正常停止を試みるが未検証で、間に合わなければcrash扱いになり、次の起動時に回復する。STOPがなければ次の15分トリガーで再開する。

## 更新時の安全運用

長時間観察専用の独立フォルダで運用し、通常の `koten` 作業ツリーを自動pullしない。

1. 現runのfinal snapshotを保存してNodeを停止する。
2. 新しい安全確認済みcommit/tagを別ディレクトリへ取得する。
3. `node node/health-check.cjs` を実行する。
4. 必要なschema migrationがある場合だけ、旧runを直接変更せず「新しいrun用コピー」に適用する。
5. health check成功後、新しいrun-idで起動する。
6. 失敗したら旧ディレクトリ・旧commitで再開する。

v3 runner初版は、自動更新・自動migration・旧run再開までは実装しない。
