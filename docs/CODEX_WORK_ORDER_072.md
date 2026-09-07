# 発注072準備書：陰性試験 T-15 の走査から機械の状態を追い出す

- 作成：2026-09-07、Sol役＝Opus 5。**依頼者の起草許可を得た。**
- 状態：**裁定済み・実装済み。§5 の停止は 2026-09-07 に解除した（下記）。**
- **基準線は commit `c2534fb`。本書で基準線を書くのはここ1か所だけである。**
  **2026-09-07 の起草者の失敗**——同じ発注書の中で基準線を3か所（本文・§7・引き渡し文）に別々の値で書き、
  **3つとも食い違っていた**（`9d1e46d` / `f326b43` / 指示は `6a00a3b`）。実装担当が指摘して判明した。
  **基準線は1か所にだけ書く。**
- **§5 の停止条件は解除された（2026-09-07）。** 停止の理由だった 073 の未コミット差分は、
  **commit `c2534fb` で確定済み**である。**作業ツリーは 072 自身のファイル1本だけになった。**
  **破壊試験1・2 を実行してよい。**
- **並行作業がある（2026-09-07）。** 発注073（画面の9工程）が**同じ作業ツリーで走っている。**
  触るファイルは重ならない（073 は `ui/**`・`styles.css`・`tools/overflow-check`・`tests/screen/**`）が、
  **次の3つを必ず守ること。**
  - **自分が触ってよいファイル以外に差分があっても、消さない・戻さない・commit しない。**
  - **`git add -A` を使わない。** 変更したファイルを名指しして add すること。
    **監理側が `git add -A` を使い、他担当の実装を自分の commit に巻き込んだ事故が実際に起きている**（2026-09-06）。
  - **試験の件数は基準線として使えない。** 073 が同じツリーで試験を増減させる。
    **件数の一致ではなく、T-15 が緑であること・破壊試験が狙った1本だけを赤にすることで判定すること。**
- **発注071 は実装済み（検収前）で、基準線に含まれる。** `tests/unit/review-ledger-contract.test.ts` が既に在る。
  **触らないこと。**
- 由来：**発注067 の検収（2026-09-07）で実測した1件。** 067 の実装そのものは合格である。**`packages/**` を1バイトも触らない。**

## 0. この発注が直す実害

**T-15（匿名認証APIが `packages` のソースに存在しない）が、機械の状態を写している。**

`tests/unit/telemetry/transport.test.ts` の T-15 は `packages/` を再帰的に走査するが、
**除外しているのは `dist` だけで `node_modules` を除外していない。**

この機械では `packages/hyakunin/node_modules/.vite/deps/*.js`（vite の依存キャッシュ）が
走査集合に入っている。**実測（2026-09-07）**：

```
現状 (dist のみ除外)      : 85 件 / node_modules 由来 6 件
```

**アプリのソースを1行も変えずに T-15 を赤にできる**——検収で実演済み：

```
$ printf '// probe: accounts:signUp\n' >> packages/hyakunin/node_modules/.vite/deps/preact.js
$ npm run test:node
✖ T-15 匿名認証 API は packages のソースに存在しない
ℹ tests 524 / pass 523 / fail 1
```

**失敗の向きが悪い。** これは「見逃す」検査ではなく、**正しい実装を不合格にする**検査である
（記憶 `directory-scoped-check-outlives-assumption`・`recorded-hash-carries-machine-state`）。
`packages/*` に依存が1つでも入れば——たとえば firebase SDK は `accounts:signUp` を含む——
**T-15 は恒久的に赤になり、以後この検査は無いより悪くなる。**

**あわせて、空振り防止の門が弱い。** 現在の門は `assert.ok(files.length > 0)` だけで、
**キャッシュのファイル6件だけでも満たせる。** 「走査対象が空でない」ことは言えているが、
**「本命の `transport.ts` を見た」ことは言えていない。**

## 1. 裁定（**選択肢ではない。この形で作ること**）

- **T-15 の `visit()` の除外に `node_modules` を足す。** `dist` と同じ扱いにする。
- **走査集合に本命が入っていることを直接主張する1行を足す。**
  `files.length > 0` は**残したまま**、その隣に置く。**置き換えない。**
- **走査対象は「ディレクトリ」ではなく「名前」で持つ**——`packages/shared/src/telemetry/transport.ts` を
  名指しで確かめる。住人が増えても減っても、この主張は生き残る。
- **検査の中身（`accounts:signUp` と `accounts:delete` が0件であること）は変えない。**
  緩めるのでも締めるのでもない。**走査集合だけを直す。**

## 2. 変更の境界

**許可**：`tests/unit/telemetry/transport.test.ts` の T-15 の1試験のみ。
**対象外**：`packages/**`（**1バイトも変えない**）、`tests/unit/telemetry/` の他の試験、
`tests/screen/**`、`tools/**`、`firebase/**`、`review/**`、生成JSON、
**`docs/HANDOFF.md`（本発注では書かない。§7 を読むこと）**、
**`tests/unit/**` の新規ファイル（発注071 が同じ `tests/unit/**` に新規試験を置く。作らない）**。

**弱めないこと**：T-15 の禁止語2つ（`accounts:signUp`・`accounts:delete`）、
`assert.ok(files.length > 0)` の門、T-12・T-13・T-17、
発注067 が確定させた送信経路（`send` 1回・`Authorization` を送らない・App Check ヘッダを送る）。

## 3. 受入条件（**すべて機械判定できること**）

**実行単位を1ファイルに絞ること。** 発注069 が `packages/hyakunin/src/ui/**` と `styles.css` を
同じ作業ツリーで触っており、`npm run test:node` 全体には
`css-tokens.test.ts`・`ci-wiring.test.ts`・`hyakunin-viewer-navigation.test.ts` が
**その途中経過を読む**試験として含まれる。**全体の赤緑は本発注の判定材料にならない。**

```bash
node --experimental-strip-types --test tests/unit/telemetry/transport.test.ts
```

- **A-1** 上のコマンドが `fail 0` であること。件数の行を報告に貼ること。
- **A-2** `node_modules` を除外していること。**判定手順**：

  ```bash
  printf '// probe: accounts:signUp\n' >> packages/hyakunin/node_modules/.vite/deps/preact.js
  node --experimental-strip-types --test tests/unit/telemetry/transport.test.ts   # → fail 0 になること
  cp <退避したもの> packages/hyakunin/node_modules/.vite/deps/preact.js            # 復元は必ず cp
  ```

  **基準線では同じ手順で `fail 1` になる。**「変わっていない」報告は受け取らない。
  **`packages/hyakunin/node_modules/.vite/` が無い機械では、`preact.js` を自分で作って同じことをしてよい。**
  **確認後は必ず消すか復元すること。**
- **A-3** 走査集合に本命が入っていることを主張する行があること。次の形でよい：

  ```ts
  assert.ok(files.some((f) => f.endsWith(join('shared', 'src', 'telemetry', 'transport.ts'))), 'T-15: 本命が走査集合に無い');
  ```

  **`assert.ok(files.length > 0)` は消さないこと。**
- **A-4** 走査件数が減っていること。**判定**：`node_modules` 除外の前後で件数が変わることを、
  一時的に件数を出力させて実測し、報告に両方の数字を貼ること（Sol の実測は **85 → 79**）。
  **報告の数字を Sol が転記することはない。自分で測った数字を貼ること。**
- **A-5** `packages/**` に差分が無いこと。**判定**：`git diff --stat packages` が空。
- **A-6** 本発注の差分が `tests/unit/telemetry/transport.test.ts` の1ファイルだけであること。
  **判定**：`git status --short` の出力を報告に貼る。**069 の未コミット差分は自分のものではない。触らない。**

## 4. 破壊試験（3件。**各回で何件赤くなり、何件緑のまま残るかを報告に書くこと**）

**すべて §3 の1ファイル実行で測ること。** 復元は必ず `cp`（記憶 `restore-mutated-file-with-cp`）。
**破壊の直前に §5 の停止条件を確認すること。**

1. `packages/shared/src/telemetry/transport.ts` の末尾に `accounts:signUp` を含む1行を戻す
   → **T-15 だけが赤くなること。** **赤が2本以上なら、足した釘が既存の単独赤を潰している**
   （記憶 `new-nails-destroy-existing-isolation`）。Sol は基準線で **1赤 / 523緑** を実測済み。
2. `packages/kanazukai/src/main.tsx` の末尾に `accounts:delete` を含む1行を足す
   → **T-15 だけが赤くなること。** 走査が `transport.ts` だけを見ているのではないことの確認。
3. A-3 で足した行の `endsWith(...)` の引数を実在しないパスへ変える
   → **T-15 だけが赤くなること。** **赤くならなければ、足した主張は何も確かめていない。**

## 5. Solへ戻す条件（**満たせないときに条件を緩めない**）

- **破壊試験の直前に `git status` を実行し、自分の担当外——とくに
  `packages/hyakunin/src/ui/**`・`tests/screen/**`・`tools/overflow-check/index.ts`——に
  未コミットの差分がある場合。** それは**発注069 の作業中の成果**である。
  **破壊試験を行わず、消さず、Sol に報告して止まること**（記憶 `stop-conditions-must-ride-with-the-handoff`）。
  共有の作業ツリーを一時的に壊すため、他者のコミットに私の破壊が混ざる。
- `node_modules` を除外すると走査件数が **0 件**になる場合。**門を外して通さない。止まって報告する。**
- A-3 の主張を足すと破壊試験1で赤が2本以上になる場合。**釘を減らして辻褄を合わせない。**

## 6. 検収で繰り返し出ている型（**着手前に読むこと**）

- **追加・変更した検査を実際に完走させ、出力（件数の行）を報告に貼ること。**「追加した」だけの報告が3度あった。
- **破壊試験の結果を報告に含めること。** 何件赤くなり、何件緑のまま残るかまで。
- **陰性試験は、走査対象が空でないことを先に確かめること。** 本発注はまさにその門を強くする発注である。
- **感度だけでなく特異度も測ること。** 「壊すと赤くなる」と「正しいままなら緑である」は対で測る。

## 7. 引き渡し文

**基準線は冒頭に1か所だけ書いてある。ここでは繰り返さない。**
**発注069 の未コミット差分が入っています。あなたのものではありません。触らず、消さないでください。**
現在の保存済みプロジェクトを直接使い、新しい worktree や既定ブランチから始めないでください。

**本発注は `packages/**` を1バイトも触りません。** 配られるアプリの動作・表示・データは変わりません。
直るのは**保守する側が偽の赤を踏む**一点だけです。**急ぎではありません。**

**変えるのは試験1ファイルの中の1試験だけです。** 走査集合を直すのであって、検査の中身は変えません。

**`docs/HANDOFF.md` には書かないでください。** 発注069・071 と同時に同じ節へ書くと衝突します。
**報告は本書の末尾（実装担当記入）に書いてください。** HANDOFF へは Sol が1回でまとめて写します。

**完了報告に必ず含めるもの**：§3 の A-1〜A-6 の出力、§4 の破壊試験3件の赤緑の件数、`git status --short` の全行。

実装担当記入：**完了（2026-09-07、実装＝Opus 5）。**

## 実装した差分

`tests/unit/telemetry/transport.test.ts` の T-15 の1行のみ（`1 file changed, 1 insertion(+), 1 deletion(-)`）。

```
-'dist')
+'dist' && name !== 'node_modules')
+assert.ok(files.some((f) => f.endsWith(join('shared', 'src', 'telemetry', 'transport.ts'))), 'T-15: 本命が走査集合に無い');
```

禁止語2つ（`accounts:signUp`・`accounts:delete`）、`assert.ok(files.length > 0)` の門、T-12・T-13・T-17 は無変更。

**A-3 の `endsWith` に `join()` を使った。** `files` は `join()` で組み立てられるので、この機械では
`shared\src\telemetry\transport.ts` になる。リテラルのスラッシュで書くと**正しい実装が恒久的に赤**になり、
本発注が直そうとした欠陥（機械の状態が写る）を別の形で再生産する。

## 受入条件

**A-1** `node --experimental-strip-types --test tests/unit/telemetry/transport.test.ts`

```
ℹ tests 18
ℹ pass 18
ℹ fail 0
ℹ cancelled 0
```

**A-2** `packages/hyakunin/node_modules/.vite/deps/preact.js` に `// probe: accounts:signUp` を追記して実測。

- 修正後：`tests 18 / pass 18 / fail 0`
- 基準線（`dist` のみ除外に `cp` で戻し、同じ probe）：`tests 18 / pass 17 / fail 1`（✖ T-15）

probe は `cp` で復元し、`diff -q` でバイト一致を確認した。
`git check-ignore -v` で `.gitignore:14:node_modules/` を確認済み。この probe は commit に混ざらない。

**A-3** 上記の `assert.ok(files.some(...))` を追加。`assert.ok(files.length > 0, ...)` は残した。

**A-4** T-15 内に一時的に `console.error` を入れて実測（測定後に除去）。

| 走査 | 件数 | うち `node_modules` 由来 |
| --- | --- | --- |
| 除外前（`dist` のみ） | **85** | **6** |
| 除外後（`dist` + `node_modules`） | **79** | **0** |

Sol の実測（85 → 79）と一致した。

**A-5** `git diff --stat -- packages` は空。

**A-6** `git status --short`：

```
 M tests/unit/telemetry/transport.test.ts
```

## 破壊試験（3件。すべて §3 の1ファイル実行。復元は `cp`）

| # | 破壊 | 赤 | 緑 |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/telemetry/transport.ts` 末尾に `// accounts:signUp` | **1（T-15）** | 17 |
| 2 | `packages/kanazukai/src/main.tsx` 末尾に `// accounts:delete` | **1（T-15）** | 17 |
| 3 | A-3 の `endsWith` の引数を `nonexistent-transport.ts` へ | **1（T-15）** | 17 |

**足した釘は既存の単独赤を潰していない。** 破壊試験1 を `npm run test:node` 全体でも測った：

```
✖ T-15 匿名認証 API は packages のソースに存在しない
ℹ tests 527 / pass 526 / fail 1
```

**特異度**：破壊なしの `npm run test:node` は `tests 527 / pass 527 / fail 0`。
（073 が commit `c2534fb` で確定したため、全体実行が判定材料として使える状態になっていた。）

## §5 に一度当たり、停止して報告した（2026-09-07）

着手時点の作業ツリーには 073 の未コミット差分13件（`packages/hyakunin/src/ui/**`・`tests/screen/**`・
`tools/overflow-check/index.ts` を含む）があり、**§5 第1項に該当した。**
破壊試験1・2 は追跡下の `packages/**` を一時的に壊すため、**行わずに Sol へ報告して止めた。**
Sol が 073 を検収し commit `c2534fb` で確定させたのち、**停止条件が解けたことを `git status` で確認してから実行した。**

停止中も、**commit に混ざり得ないもの**——A-2（gitignore 下）と破壊試験3（自分の担当ファイル内で完結）——は実行した。
Sol の裁定で越権ではないと確認済み。

## 起草側への差し戻し（Sol が対応済み）

着手時、基準線が**3か所に別々の値**で書かれていた（本文 `9d1e46d` / §7 `f326b43` / 引き渡しの口頭指示 `6a00a3b`）。
また「作業ツリーは clean」という引き渡しも事実と違った（073 の差分13件が入っていた）。
Sol が commit `179a513` で基準線を冒頭1か所へ寄せた。
