# 次セッション開始プロンプト — vintage-kana

変体仮名アプリ `vintage-kana` の作業を引き継ぎます。

GitHub:
`yama-books/koten`
の `vintage-kana/` を正本として使ってください。

Work/ローカル資源は現在使わず、このチャットからGitHubと公開Web資料を中心に進めます。必要に応じてGoogle Driveは補助的に使って構いません。

## 最初に必ず読むもの

次の順で確認してください。

1. `vintage-kana/DESIGN_HISTORY.md`
2. `vintage-kana/ROADMAP.md`
3. `vintage-kana/HANDOFF.md`
4. `vintage-kana/SESSION_CHECKPOINT_2026-09-19_1110_END.md`
5. `vintage-kana/DATA_MODEL.md`
6. `vintage-kana/CONTEXT_SAMPLING_PLAN.md`
7. `vintage-kana/VIEWER_EXTRACTION_NOTES.md`
8. `vintage-kana/RESEARCH_LOG_2026-09-19.md`
9. `vintage-kana/data/attested-examples.json`

古い研究ログの途中状態より、ROADMAP / HANDOFF / 最新チェックポイントを優先してください。

## 現在位置

`Phase 2C-2 / 最初の context-checked 1件を作る工程`

Phase 0・1・2Aは完了。
Stage A の source-checked 実例は44件。
Phase 2C-1 exact-text は5件まで成立しています。

exact-text 5件はすべて『諸国方言物類称呼』巻五で、

- U+1B012 𛀒 / え / 衣
  - 4オ「見えず」
  - 6ウ「見えない」
  - 7オ「見えたり」
  - 16ウ「見えたり」
- U+3048 え / 衣
  - 9ウ「たえ」

です。

これらは文字位置・語・前後文字までは公式翻字と一意対応済みですが、原画像上の連綿確認が未完了なので review_status は source-checked のままです。

## 次の作業

Stage Aを大量追加することを主目的にしないでください。

まず exact-text 5件のうち1件について、

1. 国語研の原画像を取得・表示できる経路を確立
2. 対象座標・対象字体を原画像上で確認
3. 連綿・接続状態を確認
4. 推測を使わず `renmen` 等を確定
5. 問題がなければ `context_alignment_status: exact`
6. `review_status: context-checked`
7. 最初の context-checked 1件を達成
8. ROADMAP / HANDOFF / チェックポイントを更新

してください。

画像が取得できない場合は、OCRや別伝本で代用せず、VIEWER_EXTRACTION_NOTES.md に技術的な阻害要因と次案を記録してください。

## 重要な研究方針

- 「この資料で多い」と「この時代で正しい」を混同しない
- witnessを勝手に合算しない
- 分布比率を正しさの確率にしない
- AI創作文をattestedにしない
- CODH等の別伝本を中核witnessの代用品にしない
- 不明項目を推測で埋めない

## 作業運用

ROADMAP.md の区切り規則に従ってください。
長くなりそうな作業は、節目ごとにGitHub上のMDへ記録してから継続してください。

進捗報告は必要に応じて、

```text
現在: Phase X / Step Y
進捗: ...
今回: ...
次の区切り: ...
```

の形式で示してください。

まずGitHub上の最新状態を読み、現在位置がこのプロンプトと一致するか確認してから作業を再開してください。
