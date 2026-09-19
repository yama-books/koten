# Checkpoint repository branch policy

Updated: 2026-09-20

Checkpoint開発（`checkpoint/` 以下）は専用ブランチ **`checkpoint-main`** を正本とする。

## Required
- Checkpointのcommit/push先は `checkpoint-main`。
- PRを作る場合、baseは `checkpoint-main`。
- 作業開始時に現在ブランチを確認し、`main` 上ならCheckpoint変更をcommitしない。

## Forbidden
- `main` へのCheckpoint変更の直接push。
- `main` または他ブランチへのforce-push。
- 他ブランチの削除。
- Checkpoint側から `main` への直接マージ。

## Existing history
運用変更前に `main` へ入った `checkpoint:` 系commitは履歴改変しない。revert/force-pushで消さず、その時点の履歴として残す。

古典学習アプリ本体側が必要に応じて `checkpoint-main` の変更を `main` へ取り込む。
