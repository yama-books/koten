# PoC v3 Node長時間観察ランナー設計

## 原則

ブラウザ版とNode版でsimulationを二重実装しない。1 tickの実処理は `js/sim/step.js` の `HKLife.Simulation.step()` を共有する。

- Browser adapter: `js/core/engine.js`。タイマー、速度、IndexedDB保存、UIイベントを担当。
- Shared simulation: `js/data/*`, `js/core/utils.js`, `event-bus.js`, `logger.js`, `world-state.js`, `js/sim/*`。
- Node adapter: `node/runner.cjs` (batch)。seed、長時間loop、JSONL、snapshot、停止処理を担当。
- Node共有部品: `node/sim-core.cjs` (PRNG・決定論固定・step呼び出し・snapshot封筒)、`node/run-store.cjs` (run I/O・resume照合)、`node/compat.cjs` (互換性fingerprint)。

UI (`js/ui/*`, `js/main.js`) とブラウザ保存 (`js/core/storage.js`) はNodeから読み込まない。

## ログ契約

`events.jsonl` は追記型。各行は独立したJSON objectとし、最低限以下を持つ。

- runId
- engineVersion
- worldSchemaVersion
- characterDataVersion
- timestamp
- worldTime
- eventType
- actorIds
- objectIds
- area
- action
- interpretation
- environmentChanges
- seed
- sequence
- payload

観察ログと内部ログは `stream` で区別する。句読点の「正体」を固定せず、`interpretation` は行為者ごとの現在の見立てとして記録する。

## Run不変条件

- 既存runディレクトリを上書きしない。
- `run-meta.json` は新規作成のみ。
- `events.jsonl` は当該run内で追記のみ。
- snapshotはPRNG state・last event sequenceを含め、一時ファイルからrenameしてtickごとに新規保存。
- resumeはversion/seedが一致し、simulation compatibility fingerprintが一致するrunだけ許可 (下記)。snapshot後のeventがある場合は共有simulationで再生し、完全一致するtick境界だけ回復。それ以外の不一致は拒否。
- run区間の開始・終了情報は`segments/segment-NNNN.json`に記録し、`run-meta.json`は作成時のまま保持。
- v4/v5導入後も旧runをそのまま残す。

## バージョン

`js/data/version-info.js` をブラウザ/Node共通の実験バージョン情報とする。初版:

- engineVersion: `poc-v3-shared-step-1`
- worldSchemaVersion: `1` → `2` (2026-10-03、punctuation history上限の導入)
- characterDataVersion: `poc-cast-v1`

schema変更時は `worldSchemaVersion` を変え、旧snapshotを直接上書きしないmigration方式を別途実装する。worldSchemaVersion 1のsnapshotはversion照合で拒否されるので、旧runは旧commitでのみresumeできる。

## Simulation compatibility fingerprint

resume可否は「simulation結果・PRNG・snapshot/resume stateに影響するファイル」の内容で判定する。Git SHAは監査情報として記録するが、判定には使わない (fingerprint導入前のlegacy runを除く)。

- scheme: `hklife-sim-compat-1` (`node/compat.cjs`)
- 対象ファイル (poc-v3 からの相対パス、ソート順):
  - `node/load-simulation.cjs` の `SIMULATION_FILES` 全部 (Nodeが読み込む共有simulation): `js/data/version-info.js`, `js/data/poc-cast.js`, `js/data/world-config.js`, `js/data/action-catalog.js`, `js/data/punctuation-catalog.js`, `js/core/utils.js`, `js/core/event-bus.js`, `js/core/logger.js`, `js/core/world-state.js`, `js/sim/punctuation.js`, `js/sim/background.js`, `js/sim/scoring.js`, `js/sim/actions.js`, `js/sim/step.js`
  - Node側で結果・state・eventに影響するもの: `node/load-simulation.cjs` (読込順)、`node/sim-core.cjs` (PRNG、`Math.random`/`Date.now`固定、step呼び出し、snapshot封筒)、`node/event-writer.cjs` (event record形式。replay照合の対象)
- 除外: README、docs、HANDOFF、`schema/*.json` (実行時に読まない)、`node/analyze-run.cjs`、比較ツール、health check類、`node/runner.cjs`・`node/observer.cjs`・`node/observer-supervisor.cjs`・`node/run-store.cjs`・`node/event-chunks.cjs` (CLI・I/O・監視のみ)、ブラウザ専用の `js/core/engine.js`・`js/core/storage.js`・`js/ui/*`・`js/main.js`。
- 生成方法: 各ファイルをUTF-8で読み、先頭BOMを除き、CRLFをLFにしてsha256を取る。`"<scheme>
" + 各行 "<sha256>  <path>" をソート順に改行で連結 + "
"` のsha256がfingerprint。
- 記録先: `run-meta.json` の `compatibility` ({scheme, fingerprint, files[{path, sha256}]})、各snapshotの `compatibilityFingerprint`、各segmentの `compatibilityFingerprint`。
- 監査情報として引き続き記録: `sourceCommit` (run-meta作成時。`--source-commit`指定時はHEADと一致必須、未指定ならHEADを自動記録)、`sourceDirty`、snapshot/segmentごとの書込時点の `sourceCommit`、`engineVersion`、`worldSchemaVersion`、`characterDataVersion`。
- 判定: version 3種とseedがsnapshot・run-meta・現在のコードで一致 → snapshotのfingerprintがrun-metaと一致 → 現在のツリーのfingerprintがrun-metaと一致。不一致なら変更ファイル名を出して拒否する (`RefusalError`)。
- legacy run (`run-meta.compatibility` なし、2026-10-02までのrun): 従来どおり現在のHEADとrun-meta.sourceCommitの完全一致を要求する。
- 検証: `node node/compat-health-check.cjs`。analyzerのみ変更・README/docsのみ変更はresume可、scoring・PRNG・world-state・event形式の変更とlegacy runのcommit不一致は拒否。

## Punctuation history上限 (worldSchemaVersion 2)

`punctuation[].history` は直近 `WORLD_CONFIG.punctuationHistory.recentLimit` 件 (初期値200) だけ保持する。

- 200件の根拠: 実測で1トークンあたり約0.077件/tick。200件 ≈ 2600 tick ≈ 実時間56分 (1.3秒/tick) ≈ 世界時間3.6日分、1トークン約11KB。
- 古い分は `punctuation[].historySummary` に累積する: `total` (全件数)、`dropped` (historyから外した件数)、`reinterpretations` (同じ個体が前回と違う見立てにした回数)、`byInterpretation` (見立て別の累積回数)、`byActor` (個体×見立ての累積回数)、`firstAt`/`lastAt` (世界時刻の分)。summaryは全件を数え、historyはその一部。
- historySummaryのない旧world (ブラウザ保存など) は、最初の記録時に既存historyから作成する。
- historyはsimulationの判断に使われていないので、eventは変わらない。10万tick・seed 20261002で旧run (`observer-100k-20261002`) と全264794 eventが一致した (timestamp/runId/worldSchemaVersionを除く)。
- 完全な観察記録は引き続き events に残る。
- 検証: `node node/snapshot-size-check.cjs` (10万tick、5000tickごとのsnapshotサイズ。historyが上限内、後半50000tickの増加が10%以内、summaryの件数が全記録数と一致することを確認)。

## Node resume / analysis

`node/runner.cjs --resume-run <run-directory> [--resume-from <snapshot-file>]`でsnapshotから再開する。`--ticks`はそのsegmentで追加実行するtick数。`--pause-after-segment`はresumeを許す計画停止テスト用。PRNG stateとevent sequenceを復元する。`resume-health-check.cjs`は2000連続tickと1000+resume+1000をworld/event単位で比較し、crashでsnapshotより後に残ったeventsのreplayも確認する。

`node/analyze-run.cjs --run <run-directory> [--out <output-directory>]`はJSONLとsnapshotを読むoffline analyzerで、JSON/Markdown集計を出す。既存の集計ファイルは上書きしない。`--out`はrunディレクトリ外に限る。

## Continuous observer

`node/observer.cjs` (実時間ペース、checkpoint、chunk化event、STOP/signal/IPC停止、crash回復) と `node/observer-supervisor.cjs` (再起動、hang検出、ALERT) 。詳細と運用コマンドは `node/README.md`。

- 決定論: 待機 (`node/pacer.cjs`) はsimulationの外。壁時計はworld stateにもeventの比較対象にも入らない。停止中の時間は取り戻さない (1 tick以上遅れたら予定を今から引き直す)。
- 回帰条件: `continuous-health-check.cjs` で、停止・crash・途中tickでの破損・hard kill・supervisor再起動を挟んだ1500 tickが、同seedのbatch runとevent・world・rngStateとも一致すること。
- append-only: chunkは1プロセスが新規作成し再オープンしない。manifestは追記のみ。crash後のchunkは書き換えずに封印し、`validThroughSequence` より後ろは読まない。checkpoints/ だけが削除対象 (直近K個を残す)。snapshots/ は削除しない。
- 拒否: version・seed・fingerprint不一致、再生不一致、failed segment、manifestの連続性破れ。終了コード3でsupervisorは再試行しない。

## 現段階で未実装

- migration runner
- 自動update/rollback
- chunkの圧縮・アーカイブ (1日約123 MBのまま保持)
- 数GB規模のchunkを全件メモリに読まないstreaming analyzer
- 複数area
- 濁点・半濁点の実変換
- 全200見立ての投入
- 植物・生物・工房・レシピ
