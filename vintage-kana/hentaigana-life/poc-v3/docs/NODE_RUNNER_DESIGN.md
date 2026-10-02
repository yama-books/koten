# PoC v3 Node長時間観察ランナー設計

## 原則

ブラウザ版とNode版でsimulationを二重実装しない。1 tickの実処理は `js/sim/step.js` の `HKLife.Simulation.step()` を共有する。

- Browser adapter: `js/core/engine.js`。タイマー、速度、IndexedDB保存、UIイベントを担当。
- Shared simulation: `js/data/*`, `js/core/utils.js`, `event-bus.js`, `logger.js`, `world-state.js`, `js/sim/*`。
- Node adapter: `node/runner.cjs`。seed、長時間loop、JSONL、snapshot、停止処理を担当。

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
- snapshotはtickと時刻を含む新規ファイルのみ。
- v4/v5導入後も旧runをそのまま残す。

## バージョン

`js/data/version-info.js` をブラウザ/Node共通の実験バージョン情報とする。初版:

- engineVersion: `poc-v3-shared-step-1`
- worldSchemaVersion: `1`
- characterDataVersion: `poc-cast-v1`

schema変更時は `worldSchemaVersion` を変え、旧snapshotを直接上書きしないmigration方式を別途実装する。

## 現段階で未実装

- 既存runのresume
- migration runner
- 自動update/rollback
- 複数area
- 濁点・半濁点の実変換
- 全200見立ての投入
- 植物・生物・工房・レシピ
