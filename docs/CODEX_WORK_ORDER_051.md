# 発注051（H-19 補修・改行コードで機械依存になっている検査を 3 箇所とも閉じる）

- **宛先**: **Luna（Codex）**
- **起票**: 2026-09-04・第32回・親担当（Claude Opus 5）
- **発行**: 2026-09-04・第33回・親担当（Claude Opus 5）
- **前提コミット**: **`fc4c45e`（`Issue order 051 after measuring every mutation against a reference build`）＝発行時の `main` 先頭**。
  **`4f36aa7` との差分は `docs/` だけである**（`docs/CODEX_WORK_ORDER_051.md` の新規と `docs/HANDOFF.md`）。
  **`packages/`・`tests/`・`tools/` は `4f36aa7` と 1 バイトも違わない**ので、§8.1 の基準線と §1 の 17 ハッシュはそのまま使える
  （**親担当が `fc4c45e` で 17/17 OK と CRLF 13 本を実測し直した**。§8.3）
- **作業ツリー**: 発行時点で **clean**（§0.6 を着手前に必ず確かめ直すこと）
- **フェーズ**: **P9 と無関係。常時の補修**（新機能ではない）
- **規模**: 小〜中（**`packages/` の実装コードを 1 バイトも変えない**。生成物 1 件・新ツール 1 本・設定 2 件・文書）
- **状態**: **発行済み**（§8 の 5 項目すべて記入済み。§8.3 が発行直前の並行発注の確認である）

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何が壊れているか（**一言でいうと**）

**`npm run data:check` は、この開発機でだけ通る。新しい clone では必ず落ちる。**

```
Error: V-14: stale generated file manifest.json (field differs: sourceHashes)
```

**2026-09-04 の初 push（run 33811338509）で発覚した。** それまで誰も fresh checkout をしたことが
無かったため、**manifest が生成された時からずっと潜在していた。**

### 0.2 なぜそうなるか（**この発注の全部**）

**`.gitattributes` の `* text=auto eol=lf` により、どの新規 checkout でも一次資料は LF になる。**
ところがこの開発機の作業ツリーでは **CRLF のまま**である（`git ls-files --eol` が `i/lf w/crlf`）。

**`tools/build-data/hash.ts` の `sha256` は、ファイルを `'utf8'` ではなく Buffer として読む。**

```ts
export const sha256 = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
```

**つまり生バイトを数える。CRLF と LF で値が変わる。**
一方、**同じツールの構文解析はすべて `/\r?\n/` で割っている**（`parse-table.ts`）。
**だから解析結果は改行コードに依存しない。**

> **この非対称が、症状が `sourceHashes` だけに出る理由である。**
> 生成物のうち **`manifest.json` の `sourceHashes` だけがバイトを見ており、他は見ていない。**

**`git status` は clean と言う。** git は読むときに改行を正規化するので、
**CRLF の作業ツリーは git 由来のどの検査からも見えない。**
**見えるのは「ディスクのバイトを数えるもの」だけである。**

### 0.3 同じ型の欠陥が 3 箇所ある（**症状ではなく型で探した結果**）

| # | 場所 | 状態 |
|---|---|---|
| **(1)** | **`manifest.json` の `sourceHashes`**（一次資料 4 本） | **CI で赤。H-19 の本体** |
| **(2)** | **作業ツリーに CRLF のファイルが 13 本ある**（4 本ではない） | 今日は無害。**(3) の原因** |
| **(3)** | **発注042〜046 の §0.3「変更してはならないファイルの SHA-256」17 件のうち `app-config.ts` の 1 件が CRLF 版である** | **今日この機械でも落ちる。H-20 として起票する** |

**(3) の証拠**——`packages/shared/src/app-config.ts` は `e907c43`（2026-09-01）で 1 回 commit されたきりで、
**作業ツリー＝索引＝HEAD である**（変更境界の逸脱ではない）。にもかかわらず 046 §0.3 の値と一致しない。

```
lf    e0ec5cdb7b010a491f8bd02e84abc513184eb3f124d1664122946fb81edde6d0   ← 実際の中身（どの checkout でも）
crlf  cdd20f59d50477ace6971fb9a081767998b11852438ef3ca7866c1a984128aba   ← 発注042〜046 が記録した値
```

**記録されているのは CRLF 版である。** 042 で採取され、043・044・045・046 へ書き写された。
その後この 1 本だけが LF へ checkout し直されたため、**今はどの機械でも一致しない。**

> **常に落ちる 1 行を含む検査は、検査が無いより悪い。**
> 次の担当者は `sha256sum -c` の出力を見なくなる。**だから同じ発注で直す。**

### 0.4 直したあと commit される差分は驚くほど小さい

**索引（commit されている中身）は最初から LF である。** 作業ツリーだけが違う。
**したがって一次資料 4 本の commit 差分はゼロである。**
親担当が別ディレクトリへ clone して実測した結果、**変わるのは `manifest.json` の 5 行だけ**である。

```
 packages/hyakunin/src/data/generated/manifest.json | 10 +++++-----
 1 file changed, 5 insertions(+), 5 deletions(-)
```

**内訳は `sourceHashes` 4 行と `generatedOn` 1 行。** 新しい 4 つの値は
`git show :<file> | sha256sum` と一致する（親担当が別経路で照合済み）。

### 0.5 再発防止を同じ発注で入れる（**依頼者裁定・2026-09-04**）

**依頼者の言葉:「再発防止の検査を足す（推奨）」「今後の作業最適化のために最善の方法をとってください」。**

**`check:eol` を新設する。** 追跡ファイルのうち **索引が LF・作業ツリーが CRLF／混在**のものが
1 本でもあれば落とす。**これが無ければ、誰かが同じ CRLF を持ち込んだ瞬間に同じ穴が再発し、
また push するまで見えない。**

> **⚠ この検査の限界を正直に書く。**
> **CI は必ず fresh checkout なので、CI 上の `check:eol` はほぼ永久に緑である。**
> **実際に H-19 を捕まえるのは、開発機でローカルに走らせたときだけである。**
> だから受入条件は「CI に足したこと」ではなく、
> **「補修前の作業ツリーで走らせて 13 件を挙げること」「補修後に 0 件になること」**で判定する（§5.2 の M-0）。
> **走らせたことを機械判定できない検査を足さない**（D-68 末尾の規律）。

### 0.6 着手前に必ず確かめること（**並行作業**）

**別セッションが発注048（P9-B2・`transport.ts` ＋ `app-config.ts` の配線）を進めている可能性がある。**

- **`git status --porcelain -uall` に `packages/` の行が出ていたら S-1 である。** 手を止めて報告する。
- **この発注は `packages/` の実装コードを 1 バイトも触らない。**
  例外は生成物 `packages/hyakunin/src/data/generated/manifest.json` の 1 件だけである。
- **発注048 が `app-config.ts` を変えると、§0.3 (3) の訂正で書く LF 値は正当な理由で古くなる。**
  **だから §4 の (D) は「今の値はこれだ」ではなく「042〜046 が記録したのは CRLF 版だった」という
  事実の訂正として書く。** 現在値を断定する文を書かないこと。

---

## 1. 変更境界

### 変更してよいファイル（**これだけ**）

| ファイル | 何をするか |
|---|---|
| **作業ツリーの CRLF ファイル 13 本**（§4 (A) に一覧） | **ディスクのバイトを LF へ書き換える。中身は 1 文字も変えない** |
| `packages/hyakunin/src/data/generated/manifest.json` | **`npm run data:build` の出力で置き換える。手編集しない** |
| **`tools/eol-check/index.ts`（新規）** | `check:eol` の実体 |
| `package.json` | **`check:eol` の script を 1 行足すだけ** |
| `.github/workflows/ci.yml` | **`check:eol` の step を 1 行足すだけ** |
| `docs/CODEX_WORK_ORDER_046.md` | **冒頭に「訂正1」節を足す**（§4 (D)） |

### 変更禁止（**1 バイトも触らない**）

| 対象 | 理由 |
|---|---|
| **`packages/` の実装コードすべて** | この発注は実装を直さない。生成物 1 件だけが例外 |
| **`tests/` すべて** | 試験を 1 本も足さない・消さない・書き換えない |
| **`tools/build-data/` すべて** | **`sha256` の実装は正しい。** バイトを数えるのが仕事である。**`'utf8'` を足して改行を吸収させない**（S-2） |
| **`.gitattributes`** | **正しい。** 壊れているのは作業ツリーの実体であって規則ではない |
| **一次資料の中身**（文字・表のセル・行の並び） | **F-05・F-07。一次資料の内容に関する判断は人の仕事である**（S-3） |
| `docs/HANDOFF.md` | **親担当が書く。1 文字も触らない** |
| 発注042〜045 | **記録である。書き換えない。**046 にだけ訂正を足す |

### 変更してはならないファイルの SHA-256（**着手前に照合し、報告に再掲する**）

**発注046 §0.3 の 17 件のうち、`app-config.ts` の 1 行だけを LF 版へ訂正したものである。**
**残り 16 件は 046 と同じ値で、親担当が起票時に `sha256sum -c` で 16/16 OK を実測した。**

```
4026c77a2c36bbc0ec4568e409227039701da54c7d550f3df0db0e3eb3d8fbe2 *packages/shared/src/telemetry/client-number.ts
bfd407bbf800dfec761cbdc1771f47f1ab7c299f58da6a61f465b876550feb20 *packages/shared/src/telemetry/queue.ts
bb6014014d6960c0da2ade7c1e27bec77efcb3c8630ff02263d569b09179e8b7 *packages/shared/src/telemetry/registry.ts
73891ee555ce19ca540bf6cb87508ff3c5ccabd738fd93e4da9e3d6344f1faf7 *packages/shared/src/telemetry/sanitize.ts
b56794121cb90ff3748b7388a86f8bf817a0bda689e92330f61b7afd6fb4a263 *packages/shared/src/storage/fallback.ts
1cef3022f7f2c1625d3fe52391339932538fc3aa7164cf5c65aa941d3d406fc2 *packages/shared/src/storage/merge.ts
69c1228a3013669baee2230c1268feaeefa0b8ea61bbd4b18e194f13e9b00697 *packages/shared/src/storage/import.ts
e84602e0e5026b8747fcf311a4b949a28079c87b943f3f3a7f4034471590a94b *packages/shared/src/storage/export.ts
038d0588fd71f056a6065a870205bfe1587f1ed6cd7d106a3e0e5789f37c9a3a *packages/shared/src/storage/reset.ts
66abc9e04ae15b7a64463da6aeded1b687c097d0a80e5ff09c5e64807cbd278a *packages/shared/src/storage/schema.ts
3da6d3793101ef8035a742f9a73014f2fa47d48385ae8f397e41829f56c64402 *packages/shared/src/storage/db.ts
207ac60c33d467651919ffd6549ba062cc12b2485d59be44862f558efca017e0 *packages/shared/src/domain/event.ts
e0ec5cdb7b010a491f8bd02e84abc513184eb3f124d1664122946fb81edde6d0 *packages/shared/src/app-config.ts
c5b2da11146411e4f956e7aba3852b2a087220646c101b04e810d382069e25e6 *tests/unit/telemetry/fixtures.ts
3b01db70d1640c91c728f114c8f03b4fb4d93989a86b2d03f0a77bf0b9fb71d6 *tests/unit/telemetry/static.test.ts
0e85229b93398e286f29085929883308f23ba8c0ef4b86ce3bb4be6fe9b6c197 *tests/unit/telemetry/registry.test.ts
d9e2ed84804b336af3f086b6f4bf2ce5fa5f9d1e5e1e4b71323be3129221a8c6 *tests/unit/storage/atomicity.test.ts
```

**この 17 件が 1 バイトでも動いたら、それは変更境界の逸脱である。**
**着手前の照合で 17/17 OK にならなかったら S-1 である**（並行作業か、想定外の状態）。

---

## 2. 先に読むもの

| 資料 | 見る箇所 |
|---|---|
| `tools/build-data/hash.ts` | **4 行しかない。`readFileSync(file)` に第 2 引数が無いことを自分の目で見る** |
| `tools/build-data/validate.ts` | **`assertGeneratedCurrent`。`generatedOn` が比較から除外されていること**（`delete actualComparable.generatedOn`） |
| `tools/build-data/parse-table.ts` | **`split(/\r?\n/)`。解析側が改行に依存していないこと** |
| `tools/scan-publish/index.ts` | **`\r?\n` を使う書き方の手本。`minimumScanned` の作り**（`check:eol` はこれに倣う） |
| `.gitattributes` | **`* text=auto eol=lf` と、`*.ps1`／`*.bat`／`*.cmd` の例外、`LICENSE`・`**/OFL.txt` の `-text`** |
| `docs/HANDOFF.md` §4.2 の H-19 | 経緯 |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: 直すのは作業ツリーであって、ツールでも `.gitattributes` でもない

**`sha256` がバイトを数えるのは正しい。** 一次資料の同一性を保証するのが仕事である。
**`readFileSync(file, 'utf8')` にして改行差を吸収してはならない。**
それは「別の中身を同じと見なす」ことであり、**一次資料の保護を弱める。**

### 裁定 2: `git add --renormalize` を使わない

**`--renormalize` は索引を作り直すだけで、作業ツリーのバイトを変えない。**
**索引は最初から LF である。** 直す対象はディスクの実体なので、この命令は何も解決しない。

### 裁定 3: 対象は 13 本すべてにする（4 本だけにしない）

**`data:check` を通すだけなら一次資料 4 本で足りる。** それでも 13 本すべてを直す。
**理由は §0.3 (3) である。** 残した CRLF は、**次に誰かがその機械で sha256 を採った瞬間に
機械依存の定数として文書へ焼き付く。** `app-config.ts` で実際にそれが起きた。

### 裁定 4: 生成物の差分は `sourceHashes` と `generatedOn` の 2 フィールドに限る

**`npm run data:build` は生成物を全部書き直す。** そのうち**中身が変わってよいのは manifest の
この 2 フィールドだけ**である。**他の生成 JSON に 1 バイトでも差分が出たら S-4 である**——
それは改行の話ではなく、**一次資料の中身が変わったこと**を意味する。

**`generatedOn` は `new Date().toISOString()`（UTC）で入る。** 日本時間の朝に走らせると前日の日付になる。
**これは異常ではない。** V-14 は `generatedOn` を比較から外している。

### 裁定 5: `check:eol` の判定規則は「索引 lf・作業ツリー crlf／mixed」の 1 つだけにする

**`i/crlf`（`*.ps1` などの意図的な CRLF）と `i/-text`（バイナリ）は対象外である。**
**規則を増やさない。** 増やすと、正しい実装を赤にする事故が起きる。

### 裁定 6: `check:eol` は走査対象が空でないことを自分で確かめる

**違反 0 件が「守られている」なのか「1 本も見ていない」なのかを、出力だけで区別できるようにする。**
`scan:publish` の `minimumScanned` と同じ作りにし、**追跡ファイルが 400 件未満なら設定異常として落とす。**
**（親担当は参照実装でこの分岐が実際に発火することを確かめた。§5.2 の M-4。）**

### 裁定 7: 発注046 は書き換えず、冒頭に訂正節を足す

**過去の発注書は記録である。ハッシュの行を黙って書き換えない。**
050 が「訂正1」を冒頭に足した前例に倣う。**042〜045 には何も足さない**（046 の訂正から辿れる）。

---

## 4. 実装範囲

### 実行順（**この順でなければ M-0 が採れない**）

**`check:eol` は補修より先に作る。** 補修してしまうと「補修前に 13 件を挙げた」証拠が二度と採れない。

| # | やること |
|---|---|
| 1 | **§5.0 の B-1〜B-3 を採る**（着手前の値） |
| 2 | **(C) の `tools/eol-check/index.ts` と `package.json` の script を作る** |
| 3 | **`npm run check:eol` を走らせる → 違反 13 件で終了コード 1**（**M-0 の「前」。これを報告に貼る**） |
| 4 | **(A) の 13 本を LF にする** |
| 5 | **`npm run check:eol` → 違反 0 件**（**M-0 の「後」**）。**(B) の `npm run data:build`** |
| 6 | **§5.2 の M-1〜M-6 を 1 件ずつ当てて戻す。** **commit しない**——commit は親検収後に親担当が行う |
| 7 | **(C) の `ci.yml` の step と (D) の 046 訂正を書く** |
| 8 | **§5.1 の A-1〜A-9 と §5.3 のゲートを採り直す** |

### (A) 作業ツリーの 13 本を LF にする

**起票時点の一覧である。着手時に `git -c core.quotepath=false ls-files --eol` で採り直して照合すること**
（**13 本と違っていたら S-5**）。

```
NOTICE
docs/ADR/0003-publish-boundary.md
docs/CODEX_WORK_ORDER_009.md
docs/CODEX_WORK_ORDER_010.md
docs/PUBLISH_MANIFEST.md
packages/hyakunin/index.html
packages/kanazukai/index.html
packages/kanazukai/src/ui/screens/Home.tsx
古典文法_一次データ索引.md
百人一首_本文・作者_一次データ.md
百人一首_読み_歴史的仮名遣い.md
百人一首_読み_現代仮名遣い.md
百人一首_読み_異同確認.md
```

**うち `sourceHashes` に効くのは下 4 本**（`paths.sources`。`古典文法_一次データ索引.md` は入っていない）。

**やり方**——`CRLF` を `LF` へ置換して**同じ位置へ書き戻す**。**中身は 1 文字も変えない。**
**`git checkout` に頼らないこと**——git は作業ツリーを clean と見なしており、書き直すとは限らない。

**判定は目視でなく `git ls-files --eol` で行う。** 13 本すべてが `w/lf` になること。

> **⚠ `packages/kanazukai/src/ui/screens/Home.tsx` と `packages/*/index.html` も対象である。**
> **これは「`packages/` を触らない」の例外ではない。** commit される中身は変わらない
> （索引は既に LF）。**`git status` に 1 行も出ないことで、それを示す**（§5.1 の A-2）。

### (B) manifest を作り直す

```
npm run data:build
```

**手編集しない。** 実行後、`git status --porcelain` に出るのは
**`M packages/hyakunin/src/data/generated/manifest.json` の 1 行だけ**であること。

### (C) `check:eol` を足す

**`tools/eol-check/index.ts` を新規に作る。** 仕様は次のとおり。

| # | 仕様 |
|---|---|
| 1 | `git -c core.quotepath=false ls-files --eol` を実行して全追跡ファイルを得る。**`core.quotepath=false` を落とさないこと**——非 ASCII のファイル名が `\346…` へ化け、一次資料 4 本が読めなくなる |
| 2 | 各行を**タブ 1 個で割る**。`attr/` の中には空白が入る（`attr/text=auto eol=lf`）ので、タブより前だけを正規表現で読む |
| 3 | **索引が `lf` で作業ツリーが `crlf` または `mixed` のものを違反とする**（裁定 5） |
| 4 | 行の形が読めなければ**違反として報告する**（黙って飛ばさない） |
| 5 | **追跡ファイルが 400 件未満なら「設定異常」として落とす**（裁定 6） |
| 6 | 出力は `scan:publish` に倣い `check:eol: 走査 N 件、違反 M 件`。違反は**ファイル名を 1 件ずつ挙げる** |
| 7 | 違反または設定異常で `process.exitCode = 1` |

**`package.json` に足す script（1 行）:**

```
"check:eol": "node --experimental-strip-types tools/eol-check/index.ts",
```

**`.github/workflows/ci.yml` に足す step（1 行）。`npm ci` の前に置く**——依存を必要としないので、
**壊れていれば最短で分かる。**

```yaml
      - run: npm run check:eol
```

> **⚠ 自分が編集するファイルを CRLF で書き戻さないこと。**
> `package.json`・`.github/workflows/ci.yml`・`docs/CODEX_WORK_ORDER_046.md` はいずれも LF である。
> **CRLF で保存すると A-3 が赤くなる。** それは検査の誤作動ではなく、**`check:eol` が正しく働いた証拠である。**
> その場合は編集し直すこと（S-5 には当たらない）。

### (D) 発注046 の訂正1 を足す

**`docs/CODEX_WORK_ORDER_046.md` の冒頭（ヘッダ直後の `---` の次）に訂正節を足す。**
文面は担当が書いてよいが、**次の 4 点を必ず含めること。**

1. **§0.3 の 17 件のうち `app-config.ts` の値は CRLF 版であり、042 で採取されて 043〜046 へ書き写された。**
2. **`app-config.ts` は `e907c43` の 1 回しか commit されておらず、中身は一度も変わっていない。**
   **したがってこれは変更境界の逸脱ではない。**
3. **LF 版の値は `e0ec5cdb7b010a491f8bd02e84abc513184eb3f124d1664122946fb81edde6d0` である。**
   **ただし発注048 以降がこのファイルを正当に変更しうる。**
   **「現在値はこれである」と書かない**（§0.6）。
4. **原因は H-19 と同一である**（作業ツリーの CRLF）。**発注051 で直した。**

**042〜045 には何も足さない。**

---

## 5. 受入条件（**すべて機械判定できること**）

### 5.0 着手前に採る値（**報告に必ず書く**）

| # | 条件 |
|---|---|
| **B-1** | `sha256sum -c` で §1 の 17 件が **17/17 OK**（1 件でも FAILED なら **S-1**） |
| **B-2** | `git -c core.quotepath=false ls-files --eol` の `i/lf` かつ `w/crlf` の行数が **13** |
| **B-3** | `npm run data:check` が **終了コード 0**（この機械では通る。それが H-19 の症状である） |

### 5.1 grep で判定する条件（**着手後**）

| # | 条件 |
|---|---|
| **A-1** | `git status --porcelain -uall` の出力が**次の 5 種類だけ**であること<br>`M packages/hyakunin/src/data/generated/manifest.json`／`M package.json`／`M .github/workflows/ci.yml`／`M docs/CODEX_WORK_ORDER_046.md`／`?? tools/eol-check/`（または `?? tools/eol-check/index.ts`） |
| **A-2** | **13 本の LF 化が `git status` に 1 行も出ていないこと**（索引は元から LF。§4 (A)） |
| **A-3** | `git -c core.quotepath=false ls-files --eol` の `i/lf` かつ `w/crlf` の行数が **0** |
| **A-4** | `git diff -- packages/hyakunin/src/data/generated/manifest.json` の変更行が **`sourceHashes` の 4 行と `generatedOn` の 1 行だけ**（**それ以外が 1 行でもあれば S-4**） |
| **A-5** | `git diff --stat -- packages/hyakunin/src/data/generated/` が **1 file changed** であること（**他の生成 JSON に差分が出ていない**） |
| **A-6** | 新しい `sourceHashes` の 4 値が、`git show :<file> | sha256sum` の値と**4/4 一致**すること（**別経路での照合**） |
| **A-7** | `sha256sum -c` で §1 の 17 件が **17/17 OK**（着手後も動いていない） |
| **A-8** | `tools/build-data/`・`.gitattributes`・`tests/` に差分が **0 行** |
| **A-9** | `.github/workflows/ci.yml` と `package.json` に `check:eol` が**各 1 回**現れること |

### 5.2 破壊試験（**受入の中心**）

**各行を 1 つずつ当て、指定のものだけが赤くなることを確かめ、`cp` で元に戻すこと。**
**Python で書き戻すと改行が化けてハッシュがずれる**（記憶: `restore-mutated-file-with-cp`）。

**下の「期待」は、親担当が起票前に参照実装で 1 件ずつ実測した値である。推測ではない。**
**実測と食い違ったら、直すのは実装ではなく報告である——食い違いをそのまま報告すること。**

| # | 壊し方 | 赤くなるべきもの（**実測済み**） |
|---|---|---|
| **M-0** | **補修の前後で `npm run check:eol` を走らせる** | **前: 違反 13 件で終了コード 1／後: 違反 0 件で終了コード 0**（§0.5。**この検査が本当に H-19 を捕まえることの証拠**） |
| **M-1** | 補修後、**一次資料 1 本だけを CRLF へ戻す** | **`data:check` が `V-14: … (field differs: sourceHashes)` で赤。`check:eol` はその 1 本だけを挙げて赤** |
| **M-2** | **`git clone` で別ディレクトリへ複製し**（＝ LF の fresh checkout になる）、**新しい `manifest.json` だけをそこへ複写して** `data:check` を走らせる | **緑（終了コード 0）。** これが H-19 が閉じたことの本体である。**commit してはならない**（§4 の実行順 6）。clone は補修前の HEAD で構わない——見たいのは「LF の作業ツリーと新しい manifest が一致するか」だけである |
| **M-3** | **`check:eol` 自身を壊す。** 違反判定の条件を `if (false)` にし、**そのうえで M-1 を当てる** | **`check:eol` が「違反 0 件」で緑になること**（＝条件が信号を担っている証拠。**緑にならなければ判定が別の場所に紛れている**） |
| **M-4** | **`check:eol` の走査対象を狭める**（`ls-files --eol -- review` のように一部だけにする） | **「追跡ファイルが N 件しか見つからない（設定異常）」で赤**（＝空走査で緑にならない。裁定 6） |
| **M-5** | 補修後、**`manifest.json` の `sourceHashes` の 1 文字を書き換える** | **`data:check` が `V-14: … (field differs: sourceHashes)` で赤** |
| **M-6** | **一次資料の中身を実際に変える**（例: 3 番の作者を別表記にする） | **`data:check` が `V-04: fixture mismatch at 3 author` で赤。** **`V-14` ではない**（＝バイトの経路と中身の経路が別物であることの証拠。**確認したら直ちに戻す**） |

> **M-3 と M-4 は「壊したら赤くなる」ではなく「検査が嘘をつけないこと」を見る破壊である**
> （記憶: `inspection-self-test`）。**M-3 で緑にならなかったら S-6 である。**
> **M-6 で `V-14` が出たら S-7 である**——2 つの経路が混ざっている。

### 5.3 ゲート（**着手前と着手後の両方を報告する**）

| ゲート | 基準線 | 着手後 |
|---|---|---|
| `npm run data:check` | **0** | **0** |
| `npm run check:eol` | （存在しない） | **走査 1031 件前後・違反 0 件・終了コード 0** |
| `npm run test:node` | **§8.1 の値** | **同数・fail 0** |
| `npm run test:screen` | **§8.1 の値** | **同数** |
| `npm run scan:publish` | **§8.1 の値** | **同数・違反 0** |
| `npm run typecheck` / `lint` / `build` | **すべて 0** | **すべて 0** |

**試験の本数は 1 本も増減しないこと。** この発注は試験を足さない。

---

## 6. 停止条件（**該当したら手を止めて親担当へ報告する**）

| # | 条件 | なぜ止まるか |
|---|---|---|
| **S-1** | **着手前の `sha256sum -c` が 17/17 にならない、または `packages/` に自分以外の差分がある** | **発注048 が走っている。** 基準線が取れない（§0.6） |
| **S-2** | **`tools/build-data/` を直したくなった**（`sha256` に `'utf8'` を足すなど） | **ツールは正しい**（裁定 1）。一次資料の保護を弱める変更である |
| **S-3** | **一次資料の中身を直したくなった**（表記ゆれ・表の崩れが目についた等） | **F-05・F-07。一次資料の内容判断は人の仕事である。** 改行以外に触らない |
| **S-4** | **`manifest.json` 以外の生成 JSON に差分が出た** | **改行の問題ではない。** 一次資料の中身が変わっている（裁定 4） |
| **S-5** | **CRLF のファイルが 13 本でない** | 起票時と状態が違う。**勝手に増減を判断しない** |
| **S-6** | **M-3 で `check:eol` が緑にならなかった** | 判定条件が信号を担っていない。**検査が別の理由で赤くなっている** |
| **S-7** | **M-6 で `V-14` が出た**（`V-04` でなく） | バイトの経路と中身の経路が混ざっている。前提が崩れている |
| **S-8** | **新しい依存を入れたくなった** | **この発注は依存を 1 つも増やさない。** `check:eol` は Node 組込みと `git` だけで書く |

---

## 7. 完了報告に必ず書くこと

1. **§5.0 の B-1〜B-3 の実測値**（着手前）
2. **§5.1 の A-1〜A-9 の実測値**（**数値と出力をそのまま。「期待どおり」と書かない**）
3. **§5.2 の M-0〜M-6 を 1 件ずつ当てた結果**——**何がどのエラー文言で赤くなったかを書く。**
   **とくに M-0 の「前 13 件／後 0 件」と、M-6 が `V-04` であって `V-14` でないこと**
4. **§5.3 のゲートの着手前・着手後の両方の数値**
5. **M-2 で使った clone の場所と、そこでの `data:check` の終了コード**
6. **復元の確認**——`git status --porcelain -uall` が A-1 の 5 種類に戻っていること
7. 停止条件に当たったか（当たっていなければ「無し」と書く）

**書いてはならないこと**——**「改行コードの問題をすべて解消した」。**
**この発注が示せるのは、13 本を LF にしたことと、`check:eol` がそれを見張ることだけである。**
**今後 CRLF で作られるファイルを未然に防ぐものではない**（§0.5 の限界）。

---

## 8. 発行前に親担当が埋めること（**5 項目すべて記入済み。2026-09-04・第33回に発行した**）

| # | 項目 | 状態 |
|---|---|---|
| 1 | **前提コミット** | **`fc4c45e`（発行時の `main` 先頭）。記入済み。`4f36aa7` との差分は `docs/` だけである** |
| 2 | **SHA-256 一覧（17 件）** | **§1 に記入済み。16 件は起票時に `sha256sum -c` で実測、1 件は §0.3 (3) の訂正値** |
| 3 | **基準線**（`test:node` / `test:screen` / `scan:publish`） | **§8.1 に記入済み** |
| 4 | **D-61 条件 3**（参照実装で破壊試験の期待値を実測する） | **完了。§8.2** |
| 5 | **並行発注の有無の確認** | **完了。並行発注は無し**（**発注048 は未発行**）。実測は §8.3 |

### 8.1 基準線（**2026-09-04・第32回に親担当が clean な作業ツリーで実測した値**）

| 検査 | 値 |
|---|---|
| `npm run test:node` | **tests 420 / pass 420 / fail 0** |
| `npm run test:screen` | **12 files / 88 passed** |
| `npm run scan:publish` | **走査 751 件 / 違反 0 件** |
| `npm run data:check` | **終了コード 0**（この機械でのみ） |
| §1 の 17 ハッシュ | **16/17 OK ＋ `app-config.ts` の 1 件は 046 の値では FAILED**（§0.3 (3)） |

> **`test:node` は 412 ではなく 420 である。** §9 の第28回の基準線（412）は発注049・050 の前の値である。

### 8.2 参照実装で実測した破壊試験の期待値（**D-61 条件 3**）

**親担当は `4f36aa7` を別ディレクトリへ clone し、そこで補修と `check:eol` の参照実装を書き、
§5.2 の M-0〜M-6 を 1 件ずつ当てて期待値を実測した。**
**参照実装は起票後に破棄した。** 実測の要点は次のとおり。

| 破壊 | 実測 |
|---|---|
| 補修前の clone で `data:check` | **`V-14: … (field differs: sourceHashes)` で終了コード 1**（CI と同じ。**CI 固有ではない**） |
| `data:build` 後の差分 | **`manifest.json` のみ・5 行**（`sourceHashes` 4 ＋ `generatedOn` 1） |
| 新しい 4 値 | **`git show :<file> | sha256sum` と 4/4 一致** |
| 補修後の `data:check` | **終了コード 0** |
| M-1（1 本を CRLF へ） | **`V-14` で赤。`check:eol` はその 1 本だけを挙げて違反 1 件** |
| `check:eol` を clean な clone で実行 | **走査 1031 件・違反 0 件・終了コード 0** |
| M-3（判定条件を `if (false)`） | **CRLF が 1 本ある状態で「違反 0 件」で緑**（＝条件が信号を担っている） |
| M-4（走査対象を `review` だけに） | **「追跡ファイルが 5 件しか見つからない（設定異常）」で赤** |
| M-5（`sourceHashes` を 1 文字書換） | **`V-14` で赤** |
| M-6（3 番の作者を別表記へ） | **`V-04: fixture mismatch at 3 author` で赤。`V-14` ではない** |

**参照実装の途中で、`attr/` の中の空白を読み落とす正規表現の誤りが 1 件出た。**
**それを捕まえたのは裁定 6 の「行の形が読めない」分岐である**——
**この分岐は飾りではなく、起票中に実際に 1 件の欠陥を捕まえた。**

---

### 8.3 発行直前の並行発注の確認（**§8 の項目 5。2026-09-04・第33回・`fc4c45e`・親担当が実測**）

**結論——並行発注は無し。発注048 は未発行である。この発注は単独で走る**（D-61 条件 2）。

| 見たもの | 実測 | 意味 |
|---|---|---|
| `git status --porcelain -uall` | **出力 0 行** | **`packages/` の行が 1 行も無い＝S-1 不発**（§0.6） |
| `git worktree list` | **`main` の 1 本だけ** | 別ディレクトリで走っている作業が無い |
| `git stash list` | **0 件** | 退避された走行中の差分が無い |
| `sha256sum -c`（§1 の 17 件） | **17/17 OK** | **`app-config.ts` の LF 訂正値も含めて一致する。§5.0 の B-1 は着手時点でも通るはずである** |
| `git -c core.quotepath=false ls-files --eol` の `i/lf` かつ `w/crlf` | **13 本**（§4 (A) の一覧と完全一致） | **S-5 不発。起票時から状態が動いていない** |
| `docs/CODEX_WORK_ORDER_048.md` の §8 | **3 つのチェックボックスがすべて未記入** | **048 は起票のみ・未発行** |
| `git log -- docs/CODEX_WORK_ORDER_048.md` | **`e8f0e17`（起票）と `e23422c` の 2 件だけ** | **発行の commit が存在しない** |

> **なぜ 048 の §8 を見たのか。**
> **§0.6 の S-1 は「`packages/` に差分がある」で判定するが、それは Codex が着手した後にしか出ない。**
> **着手前に発行だけされている状態は、`git status` からは見えない**（H-19 と同じ型の見落としである）。
> **048 の発行は §8 の 3 項目を埋める commit を必ず残す。** **その commit の不在が、機械で採れる証拠である。**

**あわせて H-20 の実在を発行直前に再確認した**——`packages/shared/src/app-config.ts` の実体は
`e0ec5cdb7b010a491f8bd02e84abc513184eb3f124d1664122946fb81edde6d0` であり、**索引の値と一致し、
046 §0.3 が記録した `cdd20f59…`（CRLF 版）とは一致しない。** §0.3 (3) は今日この機械でも成り立っている。

**`check:eol` を CI へ足す前提も確かめた**——`.github/workflows/ci.yml` は **`node-version: 26`** であり、
`package.json` には `--experimental-strip-types` を使う script が既に **9 本**ある。
**§4 (C) の 1 行は前例どおりで、`npm ci` の前に置いても依存を必要としない。**

### 8.4 担当を Luna にした理由（**発行時の判断**）

**この発注は裁定が 7 件すべて済んでおり**（§3）、**破壊試験 M-0〜M-6 の期待値も親担当が参照実装で実測済みである**（§8.2）。
**担当が決めることは残っていない。** D-69 の「**Luna は確定済みの導入・配線を担当できるが、
挙動表と破壊試験の裁定・最終検収は Sol/Terra が持つ**」の線にそのまま乗る。
**検収は親担当が行う**——報告の数値は 1 つも転記せず、M-0〜M-6 を自分で当て直す（§5.2）。

**Terra は発注048 の宛先として起票済みである**（`docs/CODEX_WORK_ORDER_048.md`）。
**ただし 048 を 051 と並行させないこと**（D-61 条件 2）。**048 の発行は 051 の検収・確定後である。**
**先に 048 が入ると、§4 (D) で 046 へ書く LF 値が正当な理由で古くなる**（§0.6）。
