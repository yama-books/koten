# 百人一首練習帳: アプリアイコン引き継ぎ

更新日: 2026-09-06

## 採用済み素材

- 実ファイル: `packages/hyakunin/public/app-icon-hyakunin.png`
- 使用箇所: `packages/hyakunin/index.html` の favicon と Apple touch icon
- 内容: 添付された取り札をまっすぐな正面の札として置き、余白のある生成り背景に、陰影のないシュールなネコを添えた案。

## 変更の境界

- この変更はアイコン素材と HTML head のみ。画面、ドメイン、データ、スタイルには触れていない。
- 既存の未コミット変更と衝突しないよう、すでに変更中の `docs/HANDOFF.md` は編集していない。

## 継続時の注意

- アイコンを差し替える場合は同じファイル名を維持するか、`index.html` の両方のリンクを同時に更新する。
- `public/` 配下のため、Vite のビルド時に `/app-icon-hyakunin.png` としてそのまま配布される。
