# ADR-0002: 一次資料を書き換えない一方向データパイプライン

- 状態: 採択
- 日付: 2026-08-30
- 決定者: 依頼者（裁定）／実装計画に基づく
- 関連: `docs/IMPLEMENTATION_PLAN.md` §5.1〜§5.5、`CONSTITUTION.md` §3、確定事項 F-05・F-06・F-07

## 文脈

`CONSTITUTION.md` §3 は「正本は変換処理、問題生成、表示都合で書き換えない」「JSON、索引、穴埋め問題、候補一覧は再生成可能な派生物とする」「句切れ、穴埋め候補、作者別名、助動詞判定は、人による確認状態と根拠を持つ」「生成AIを正本の確定、公開時の問題生成、正解判定の根拠にしない」と定めている。

一次資料（`百人一首_本文・作者_一次データ.md` ほか用途別の正本 Markdown）から、公開データ（`poems.json` 等の生成 JSON）と出題問題を作るまでの間に、次の 2 種類の作業が発生する。

1. 機械的な変換（パース・正規化・検証・出力）。
2. 人間による確認（句切れ・穴埋め候補・作者別名・読みの要確認事項の承認）。

この 2 種類の作業をどこに書き込むか、どういう順序で正本へ影響させるかを決めなければ、正本への書き戻しが発生する経路が生まれてしまう。実装計画 §5.1〜§5.5 は、この経路を構造的に閉じる一方向パイプラインを設計している。

## 決定

- 一次資料（正本 Markdown、読み取り専用）から公開データへの変換は、`tools/build-data` による一方向パイプラインで行う。工程は `parse → normalize → apply-review → validate → emit` の順とする。
- **正本への書き戻しは、どの工程でも行わない。** `tools/build-data` は入力パス（正本 Markdown）を読み取りのみで開く。CI で「生成器が正本 Markdown を書き込みモードで開いていないこと」を静的検査する。
- 生成物（`poems.json` / `variants.json` / `layout-hints.json` / `questions.*.json` / `manifest.json`）は各公開単位の `src/data/generated/`（`packages/hyakunin/` および `packages/kanazukai/`。ADR-0004 による構成）に出力し、再生成可能な派生物として扱う。手編集を禁じ、CI（`data:check` の V-14）で「`generated/` 配下に Git 差分があるのに `data:build` を通っていない」ことを検出する。
- 人間による確認結果は正本へ書き戻さず、`review/*.yaml`（人確認台帳）に持つ。台帳は次の運用に従う。
  1. `npm run data:build` を実行すると、`review/` に未記載の候補が `manifest.json` の `reviewCounts.pending` として現れる。
  2. `npm run review:dev`（公開ビルドには含まれないローカル専用ページ）で候補・根拠・該当首の本文を確認する。
  3. 人が各候補に `approved` / `rejected` / `hold` と、確認者・確認日・根拠メモを付け、`review/*.yaml` に**追記**する（正本 Markdown には触れない）。
  4. `npm run data:build` を再実行し、`approved` のものだけが `reviewStatus: "human-confirmed"` として `questions.*.json` に入る。
  5. `data:check` が V-07（未確認データの公開混入防止）を含めて通ることを確認し、`review/*.yaml` と `generated/` を同一コミットで記録する。
  - `review/*.yaml` は判断の根拠を公開できる形にするため公開対象に含める。ただし報告の生テキストや実利用データは含めない。
- 生成 AI は `review/blanks.yaml` の候補案の**下書き**にのみ使ってよい。案には `proposedBy: "ai"` を必ず付け、人が `approved` にするまで `reviewStatus` は `review` に留める。
  - 裁定 D-05 により、承認は 1 件ずつの目視に限らず、機構の妥当性を確認したうえでの一括承認を認める。この場合も `confirmationMode: "batch"` の記録、`batchEvidenceRef`（根拠となった機構確認の記録への参照）、`confirmedBy` / `confirmedOn` を必須とする。
  - `confirmationMode: "batch"` かつ `batchEvidenceRef` が空の項目は validator が V-15 として失敗させる。

## 却下した案

| 却下案 | 却下理由 |
|---|---|
| 正本 Markdown を人間確認の結果で直接編集する案 | `CONSTITUTION.md` §3 に反する。正本が表示都合・確認都合で書き換えられる経路ができ、根拠資料としての正本の同一性が失われる（憲章 §1 の裁定優先順 1 位「校正済み本文と根拠資料を損なわない」に抵触） |
| 生成物（`generated/*.json`）を人が直接手で直す案 | 再生成のたびに手直しが失われる、または再生成と手直しの内容が食い違う。CI の再現性検査（V-11: 同じ入力で 2 回生成した結果がバイト一致）が成立しなくなり、生成物が「正本 Markdown ＋ `review/*.yaml` から機械的に導出される」という保証を失う |

## この決定が守るもの

- `CONSTITUTION.md` §3（一次資料と生成物）: 正本を変換処理・問題生成・表示都合で書き換えない、人による確認状態と根拠を持つ、生成 AI を正本確定・公開時の問題生成・正解判定の根拠にしない、の全項目。
- 確定事項 F-05（一次資料を変換・出題生成から書き換えない）。
- 確定事項 F-06（未確認の派生データを公開出題に混ぜない）: `reviewStatus !== "human-confirmed"` の問を公開対象から除く V-07 で機械的に保証する。
- 確定事項 F-07（生成 AI だけで公開問題・正解・正本を確定しない）: AI 由来案への `proposedBy: "ai"` 付与と人間承認の必須化で満たす。

## 変更条件

次のいずれかが観測されたら、この決定を見直す。

- `data:check`（V-01〜V-15）の検査項目だけでは検出できない公開混入事例が実際に発生した場合。
- 一括承認（`confirmationMode: "batch"`）の運用実績から、`batchEvidenceRef` の記録だけでは根拠不十分と判断される事例が生じた場合。
- 正本 Markdown の構造そのものが変更され、`parse` 工程の前提（列数・番号連続性など）が成立しなくなった場合。

## 影響

- 実装計画 P2（一次資料パイプライン）・P6（レビュー運用）が本決定の工程順序と検証項目に従う。
- 2 プロダクト構成（ADR-0004）では、人確認台帳が `review/hyakunin/` と `review/kanazukai/` に分かれるが、正本を書き換えない一方向生成という原則自体は両プロダクトで共通に適用される。
- `docs/PUBLISH_MANIFEST.md` の許可リストは、`review/*.yaml` を含める一方、`tools/review-page/`（管理確認ページ）と実利用データ・未集計報告を除外する。
