# 公開移管の記録（内部資料。公開しない）

計画 P12。**この文書は「何を移したか」ではなく「どう確かめたか」を残す。**

- **移管日**: 2026-09-04（第34回）
- **移管元**: `C:/Users/user/AI開発/koten`（非公開・commit `c5a4cc1`）
- **移管先ツリー**: `C:/Users/user/AI開発/koten-public`（新規履歴。commit `472f98a` の 1 本だけ）
- **公開先**: `https://github.com/yama-books/koten`
- **公開 URL**: `https://yama-books.github.io/koten/100/` と `/koten/kana/`

---

## 1. どう選んだか

**`tools/publish-transfer` が `publish-allowlist.txt` の `[sources]` だけを複写した。**
**許可リストの項目が 1 つでも実体に解決しなければ複写を中止する**——部分ツリーを作らないための門である。

- 許可リスト **37 項目** → ファイル **963 件**
- `git init` 後の追跡ファイル **959 件**（差の 4 件は `.gitignore` が除くもの）

**`git init` から始めており、非公開リポジトリの履歴は 1 コミットも引き継いでいない。**
理由は §2.3 のとおりで、現履歴に再配布許可が未確認の原資料 PDF が含まれるためである。

## 2. 混入していないことの確認（実測）

| 対象 | 結果 |
|---|---|
| `docs/`（内部資料・発注書 51 本） | **無し** |
| `USB-*.pdf`（原資料） | **無し** |
| `古典文法_一次データ索引.md`（H-14 で除外） | **無し** |
| `古典関係アプリ_設計計画書_2026-08-29.md` | **無し** |
| `CONSTITUTION.md` | **無し** |
| `tools/publish-transfer/`（移管ツール自身） | **無し** |
| `debug.log` | **無し** |
| `dist/`（ビルド成果物） | **追跡 0 件** |
| `node_modules/` | **追跡 0 件** |
| `npm run scan:publish` | 走査 **753**、違反 **0** |

## 3. 移管先で実際に走らせた（clone → build 相当）

**報告ではなく、移管先のツリーで実行した値である。**

| 検査 | 実測 |
|---|---|
| `npm ci` | **0** |
| `npm run check:eol` | 走査 **959**、違反 **0** |
| `npm run data:check` | **0** |
| `npm run typecheck` | **0** |
| `npm run lint` | **0** |
| `npm test` | `test:node` **450/450/0**、`test:screen` **12 files / 90** |
| サブパスでの build | `/koten/100/assets/…` と `/koten/kana/assets/…` を確認 |
| `npm run scan:publish` | 走査 **753**、違反 **0** |
| 公開出題 | 穴埋め **500**、作者 **300** |

**この工程で欠陥が 1 件見つかっている**（2026-09-04 の早い時点）——
`tools/scan-publish` と許可リストの試験が**非公開の `docs/PUBLISH_MANIFEST.md` を読んでいた**。
**移管ツリーを実際に作って `npm ci && npm test` を走らせるまで、どの検査にも掛からなかった。**
許可リストの実体を `publish-allowlist.txt` として公開側へ移し、自分自身を許可リストに載せて解決した。
**教訓は記憶 `run-the-delivery-path-early` に落とした。**

## 4. 公開名義

- commit の author: **`koten contributors <koten-contributors@users.noreply.github.com>`**
- **個人 SNS 名（`moyashimisosoup`）とメール（`moyashimisoshiru@gmail.com`）は author にも本文にも含まれない**——
  `git log --format="%an <%ae>"` で **0 件**を実測した。
- `review/*.yaml` の確認者は **`human-01`**（役割表記。`PUBLISH_MANIFEST` §3.3）。

## 5. まだ済んでいないこと

- **push は依頼者が行う。** 親担当の `gh` は旧アカウント `moyashimisosoup` で認証されており、
  **新アカウントの資格情報を親担当は持たない。持つべきでもない。**
- **Pages の有効化（Settings → Pages → Source: GitHub Actions）は依頼者の操作である。**
- **公開後のスモーク**（`?from=10&to=20` から 1 問目まで）は Pages が生きてから行う。

## 6. ロールバック

[`docs/ROLLBACK.md`](ROLLBACK.md) を参照。**Pages の無効化が最も速い止め方である。**
