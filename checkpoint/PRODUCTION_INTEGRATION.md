# Checkpoint production integration guide

更新: 2026-09-20

## 目的

`checkpoint-main` の Checkpoint 公開β成果を、他チームが利用中の production `main` へ安全に取り込むための手順。

## 前提

- Checkpoint 側は `main` へ直接 push しない。
- `main` / 他ブランチへ force-push しない。
- 他ブランチを削除しない。
- 2026-09-20 時点で GitHub compare `main...checkpoint-main` は `No common ancestor`。
- したがって通常mergeを前提にせず、Checkpoint成果物のファイル単位統合を第一候補とする。

## Checkpoint側の正本

- branch: `checkpoint-main`
- handoff: `checkpoint/HANDOFF.md`
- public preflight: `checkpoint/data/public_release_preflight_20260920.json`
- mobile audit: `checkpoint/data/mobile_ui_audit_20260920.json`

## 推奨統合単位

Checkpoint の公開成果は原則 **`checkpoint/` ディレクトリだけ**を対象にする。

今回の公開β準備で重要な実装ファイル:

- `checkpoint/index.html`
- `checkpoint/styles.css`
- `checkpoint/core1.js`
- `checkpoint/core4.js`
- `checkpoint/db-shadow.js`
- `checkpoint/ui1.js`
- `checkpoint/events.js`
- `checkpoint/data/manifest.json`
- `checkpoint/data/local_syntax_feature_policy.json`
- `checkpoint/data/morphology_provider_policy.json`
- `checkpoint/data/morphology_provider_audit_20260920.json`
- `checkpoint/data/mobile_ui_audit_20260920.json`
- `checkpoint/data/public_release_preflight_20260920.json`
- `checkpoint/data/shadow_promotion_readiness_20260919.json`

監査・引継ぎ:
- `checkpoint/HANDOFF.md`
- `checkpoint/PROGRESS_2026-09-19_db.md`
- `checkpoint/README.md`
- `checkpoint/REPOSITORY_POLICY.md`

既存の他の `checkpoint/data/*` も依存関係があるため、最も安全なのは **checkpoint-main の `checkpoint/` ディレクトリを一式同期**すること。

## production側で触らないもの

Checkpoint統合だけを理由に、以下を上書きしない:

- `packages/`
- `100/`
- `kana/`
- `conj/`
- `vintage-kana/`
- 他チームのworkflow/config
- production main の履歴

## Pages workflow確認

production側の `.github/workflows/deploy-pages.yml` で、site assemble工程に次があることを確認:

```
mkdir -p _site/checkpoint
cp -r checkpoint/. _site/checkpoint/
```

無ければ統合担当側で追加を判断する。
Checkpoint側からproduction workflowを勝手に変更しない。

## 統合後の必須smoke

### desktop
1. `/checkpoint/` が200で開く
2. sample1-4
3. 本文マーカー
4. checklist
5. drawer
6. level switch
7. clear

### iPhone Safari
1. portrait / landscape
2. 横スクロールなし
3. drawer scroll
4. drawer中に背景が動かない
5. 一文字マーカーをtap
6. checklistから同じpointを開く
7. `ここはわかる` を2-3件
8. 「わかる」にしたポイント一覧が出る
9. 個別 `戻す`
10. `すべて戻す`
11. 本文変更で履歴が消える
12. normal URLでshadow debug非表示

### developer-only
`?debug=shadow` または `#shadow-debug` のときだけshadow panelと重いmorphology dataを有効化。

## 公開判定

以下を満たしたら legacy-visible public beta の runtime gate を PASS にできる:

- desktop smoke PASS
- iPhone Safari smoke PASS
- production Pages deploy PASS
- normal URLでshadow非表示
- learner-visible detectorがlegacyのまま
- primary-source holdをshadowからlearner-visibleへ昇格していない

shadow G6/G8 は別レーンであり、legacy-visible public betaの公開条件と混同しない。
