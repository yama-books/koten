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

---

## 7. 2 回目以降の公開手順（**2026-09-05・第36回に追記。Sol 向け**）

**初回移管（§1〜§5）は済んでいる。** 公開リポジトリ `yama-books/koten` には
commit `472f98a` が 1 本あり、ローカルの複写先 `C:/Users/user/AI開発/koten-public` がそれを追跡している。
**ここに書くのは「直したものを公開版へ反映する」手順である。**

### 7.0 大前提（**先に読む**）

| # | 決まり |
|---|---|
| **P-1** | **非公開リポジトリ（`moyashimisosoup/koten`）へは push しない。** 裁定 **D-03**。現リポジトリの履歴は公開経路に乗せない。**commit はする。push はしない** |
| **P-2** | **公開は必ず `tools/publish-transfer` を通す。** 手で `cp` しない。**許可リストに載っていないものが公開側へ出る唯一の経路が手作業である** |
| **P-3** | **push は公開行為である。** **依頼者の確認を取ってから押す。** 押す前に §7.3 の差分確認を必ず行う |
| **P-4** | **`.git` を消さない。** 公開側は新規履歴で始めており、消すと初回移管からやり直しになる |

### 7.1 前提ゲート（**これが緑でなければ複写しない**）

```
npm run typecheck && npm run lint && npm test && npm run data:check && npm run build
npm run scan:publish     # 違反 0 件。件数ではなく違反数を見る
npm run check:eol        # 違反 0 件。走査件数は commit で動くので判定に使わない
```

**画面を直したときは `npm run check:overflow` と `npm run check:font-weight` も走らせる。**
**`npm run build` を先に走らせること**——`check:overflow` は `vite preview` 経由で `dist/` を配るので、
**build し直さずに測ると直したはずの画面を 1 度も見ずに緑になる。**

### 7.2 複写（**既存の複写先には書けない。そういう作りである**）

**`--write` は複写先が空でないと `複写先が空でない` で必ず止まる。**
**`koten-public` を直接 `--out` に指定しても通らない。** **これは事故防止の門であって、不具合ではない。**
**したがって、いったん空のディレクトリへ書き出してから流し込む。**

```
node --experimental-strip-types tools/publish-transfer/index.ts --out C:/Users/user/AI開発/koten-transfer --write
```

- **`--write` を付けないと空試行になる。** まず空試行で「許可リスト N 項目 → ファイル M 件」を見る。
- **許可リストの項目が 1 つでも実体に解決しなければ複写は中止される。** 部分ツリーを作らないための門である。
- **複写先は存在しないか空であること。** 前回の残りがあれば先に消す（**`koten-public` ではない方**を消す）。

### 7.3 流し込みと差分確認（**ここが唯一の関門**）

**追跡ファイルだけを消してから、新しいツリーを流し込む。** `.git` は残す。

```
cd C:/Users/user/AI開発/koten-public
git ls-files -z | xargs -0 rm -f
cp -r C:/Users/user/AI開発/koten-transfer/. .
git add -A
git status --porcelain | head -50
git diff --cached --stat
```

**押す前に、次の 3 つを自分の目で確かめる。**

1. **`docs/` が 1 件も無い**（発注書・引き継ぎメモは内部資料である）
2. **`USB-*.pdf`・`CONSTITUTION.md`・`古典文法_一次データ索引.md`・
   `古典関係アプリ_設計計画書_*.md`・`debug.log`・`tools/publish-transfer/` が 1 件も無い**
3. **差分が今回直した範囲と対応している。** **見覚えのない削除・追加があったら止まる**
   （許可リストを触っていないのにファイルが消えるのは、複写が部分的だった証拠である）

**`npm run scan:publish` を複写先でもう一度走らせる**——移管ツリーで初めて出た欠陥が実際にある（§3）。

### 7.4 commit と push

```
git commit -m "<何を直したか>"
git push origin main
```

**認証で詰まったときに見るのは 1 行だけである。**

```
gh auth status        # Token scopes: に repo と workflow があるか
```

**成功した観測は権限を証明しない。** `gh repo view` が通ること、`permissions.push: true`、
エラーが正しいアカウント名を挙げること——**いずれも権限の証拠にならない**
（public は誰でも読める／`permissions` はトークンではなくユーザの役割／主体が正しくても scope 不足なら拒否される）。
**scope 行だけを見ること。**

| 症状 | 手当て |
|---|---|
| scope に `repo` / `workflow` が無い | `gh auth login --web` で入れ直す。**貼り付けた PAT では書き込み権限が付かなかった実績がある** |
| `gh auth switch` したのに push が別アカウントで拒否される | **`gh auth switch` が切り替えるのは gh 自身の資格情報である。** `git push` が使うのは Windows 資格情報マネージャーの `git:https://github.com` で別系統（`cmdkey /list` で 2 系統が並ぶ）。**現在は `credential.helper=manager`** |
| `HTTP 408` で切れる | **`git config --global http.version HTTP/1.1`。設定済みである**（既定の HTTP/2 は Windows で 10 MiB 級の push が切れる） |

### 7.5 押したかどうかの判定（**出力で判断しない**）

```
git ls-remote origin
```

**`refs/heads/main` が返るかどうかで判定する。**
**`fatal: the remote end hung up unexpectedly` のあとに `Everything up-to-date` と出て、
それでも 1 バイトも上がっていなかった実績がある。** **push の成否はリモートで見る。**

### 7.6 公開の確認（**ワークフローのバッジで判定しない**）

**Pages の Source は「GitHub Actions」に設定済みである。** push すると `CI` と `Deploy Pages` が走る。
**緑を確認したあと、公開 URL を自分で開いて実測する。**

```
https://yama-books.github.io/koten/100/?from=10&to=20
```

**直した不具合そのものを公開版で踏み直すこと。** **ローカルで直ったことは公開版の証拠にならない。**

### 7.7 やってはいけないこと

- **`--out` に `koten-public` を直接指定する**（門に当たって止まるが、`--force` 相当を探さないこと）
- **`git push --force`**（新規履歴を壊す。**やり直す手段はロールバック文書だけである**）
- **`koten-public/.git` を消す**
- **許可リスト（`publish-allowlist.txt`）を「通すため」に広げる。** 広げるのは裁定であって、作業ではない
- **公開側で直接編集して push する**（複写元と乖離し、次の移管で黙って巻き戻る）
