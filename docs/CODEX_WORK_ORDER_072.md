# 発注072準備書：陰性試験 T-15 の走査から機械の状態を追い出す

- 作成：2026-09-07、Sol役＝Opus 5。**依頼者の起草許可を得た。**
- 状態：**裁定済み・着手可。発行済み（2026-09-07）。** 基準線は commit `9d1e46d`。
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

**基準線は commit `f326b43` です。作業ツリーは clean ではありません。**
**発注069 の未コミット差分が入っています。あなたのものではありません。触らず、消さないでください。**
現在の保存済みプロジェクトを直接使い、新しい worktree や既定ブランチから始めないでください。

**本発注は `packages/**` を1バイトも触りません。** 配られるアプリの動作・表示・データは変わりません。
直るのは**保守する側が偽の赤を踏む**一点だけです。**急ぎではありません。**

**変えるのは試験1ファイルの中の1試験だけです。** 走査集合を直すのであって、検査の中身は変えません。

**`docs/HANDOFF.md` には書かないでください。** 発注069・071 と同時に同じ節へ書くと衝突します。
**報告は本書の末尾（実装担当記入）に書いてください。** HANDOFF へは Sol が1回でまとめて写します。

**完了報告に必ず含めるもの**：§3 の A-1〜A-6 の出力、§4 の破壊試験3件の赤緑の件数、`git status --short` の全行。

実装担当記入：未着手。
