# 発注052（P9-D1・統計案内と学年選択の初回導線）

- **宛先**: Sol（Codex）
- **起票・発行**: 2026-09-04・第34回・親担当（Claude Opus 5）
- **前提**: 作業ツリーが clean で、`npm run test:node` が **450 / 450 / 0**、`npm run test:screen` が **12 files / 90**
- **状態**: **検収済み（2026-09-04・第35回。合格・条件付き。記録は §10）**
- **規模**: 中（新規 2 コンポーネント＋既存 2 ファイルの小改修＋画面試験）

---

## 0. この発注書は普通と形が違う（**先に読むこと**）

**通常この発注書には、親担当が参照実装を書いて実測した「破壊試験の期待値」が入っている**（裁定 D-61 条件 3）。
**この発注ではそれを入れていない。§6 の表の「赤くなるべきもの」欄は空欄で渡す。**

**理由**——親担当の残資源が薄く、参照実装を書く工程を担当側へ移したためである。**意図的な緩和であり、省略ではない。**

**したがって、あなたが次を行うこと。**

1. **§6 の各行を 1 つずつ当て、どの試験が赤くなったかを実測して表を埋め、完了報告に載せる。**
2. **1 行の破壊で 2 本以上が赤くなったら、それは「同じことを 2 本で見ている」か「試験が広すぎる」かのどちらかである。** 報告に明記すること。
3. **破壊のあとは `cp` で復元する**（Python で書き戻すと改行が化ける）。
4. **「破壊したのに全部緑」だったときは、まず破壊が本当に適用されたかを確かめること。** 置換が 0 件だったという事故が実際に起きている。

**親担当は検収で、この表の一部を抜き取りで当て直し、あわせて「§5 の釘に対して抜けている試験」を型で探す。**

---

## 1. 何を作るか

**初回起動時に統計の案内を出し、学年を選んでもらい、その結果を端末の設定として保存する。**
**送信は一切しない。** 送信経路は P9-B4 と P9-C の範囲である。

### 新規作成（2 つだけ）

| ファイル | 中身 |
|---|---|
| `packages/shared/src/ui/components/StatsNotice.tsx` | 統計案内。確定文を表示し、確認を受け取る |
| `packages/shared/src/ui/components/GradePicker.tsx` | 学年選択の二段階 |

### 変更してよい既存ファイル（3 つだけ）

| ファイル | 変更の範囲 |
|---|---|
| `packages/shared/package.json` | `exports` に 2 件足すだけ |
| `packages/hyakunin/src/ui/screens/Home.tsx` | 初回導線の配線 |
| `packages/hyakunin/src/styles.css` | 新しい class の CSS を末尾に足すだけ |

### 絶対に変更しないもの

```
packages/shared/src/telemetry/**        ← 1 バイトも触らない
packages/shared/src/domain/event.ts     ← UserSettings は既に必要な欄を持っている
firebase/firestore.rules
tests/unit/telemetry/**
tests/screen/no-pressure.test.tsx       ← 走査対象が増えることで自動的に効く。書き換えない
packages/shared/src/storage/**
review/**  ・  一次資料の Markdown  ・  docs/**（この発注書を除く）
```

**完了時に `git diff --numstat` を上の各パスに対して実行し、すべて 0 行であることを報告すること。**

---

## 2. 先に読むもの

- `docs/APP_SPEC.md` **§11**（365〜373 行）——確定文はここの **1 文だけ**である
- `docs/IMPLEMENTATION_PLAN.md` **1581〜1583 行**——実施内容 6・7
- `packages/shared/src/domain/event.ts` **73〜74 行**——`UserSettings.grade?: string` と `noticeConfirmed: boolean` は**既に存在する**
- `packages/shared/src/ui/components/MasteryMeter.tsx`——共有コンポーネントの流儀（`type Props` はローカル、`class` 属性、BEM 風、名前付き export）
- `tests/screen/history.test.tsx`——コンポーネントを直接マウントする画面試験の流儀
- `tests/screen/no-pressure.test.tsx`——`packages/shared/src/ui` 配下に掛かる既存の禁止語検査

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: 確定文は `APP_SPEC` §11 の 1 文をそのまま使う

> 利用状況を一部集計します。集計には無作為な番号を使用するため、個人が特定されることはありません。

**1 文字も変えない。** 言い換えない。付け足さない。
**コードがこの文字列を持つのは `StatsNotice.tsx` の 1 箇所だけにする。**

### 裁定 2: オプトアウト UI を置かない

**初回公開では個別のオプトアウト機能を設けない**（F-13、`APP_SPEC` §11、計画 P9 の受入条件）。
**切り替えも、チェックボックスも、「送らない」選択肢も作らない。** 案内の操作は**確認の 1 つだけ**である。

### 裁定 3: 学年は二段階。第二段は「その他」を選んだときだけ出す

- 第一段: **中一／中二／中三／その他**（4 つ）
- 第二段: **小学生／高一／高二／高三／大人**（5 つ）
- **第一段で中一・中二・中三を選んだときは第二段を出さない。**

### 裁定 4: 学年の具体値は `GradePicker.tsx` が持つ

**`registry.ts` に持ち込まない。** 既存の試験 `W-9`（`tests/unit/telemetry/registry.test.ts:53`）が
**`registry.ts` のソースに学年区分の具体値が現れないこと**を既に禁止している。**この試験を赤くしてはならない。**

### 裁定 5: 保存先は既存の `UserSettings` である。欄を増やさない

`grade?: string` と `noticeConfirmed: boolean` は `packages/shared/src/domain/event.ts:73-74` に**既にある**。
**新しいフィールドを足さない。** `export.ts` / `import.ts` は既に `grade` を取り回している（触らない）。

### 裁定 6: 学年は任意である。未選択でも先へ進める

**学年を選ばなくても学習を始められること。** 選択を強制しない。
**`grade` が未選択のときは `UserSettings.grade` を書かない**（`undefined` のままにする。`''` を入れない）。

### 裁定 7: 送信しない。ネットワークに触れない

`fetch` / `XMLHttpRequest` / `sendBeacon` / `setTimeout` / `setInterval` を書かない。
**`tests/screen/no-pressure.test.tsx` が `packages/shared/src/ui` 配下を走査しており、新しい 2 ファイルは自動的にその対象になる。**
**同試験の禁止語には `平均` `学年別` `みんなの` も含まれる**——画面文言に使わないこと（`学年` 単独は禁止語ではない）。

### 裁定 8: 案内は `noticeConfirmed === false` のときだけ出す

**確認したら二度と出さない。** 判定は `UserSettings.noticeConfirmed` のみで行う。
**`localStorage` を直接読み書きしない**（設定は既存の経路で永続化される）。

### 裁定 9: `StatsPayload` を組み立てない

**この発注は統計を 1 件も作らない。** 集計する実装はまだどこにも無く、それは P9-B4 の範囲である。

---

## 4. 名前（試験が名前で呼ぶ。このとおりにすること）

```ts
// StatsNotice.tsx
export const STATS_NOTICE_TEXT: string;               // 裁定 1 の確定文
export function StatsNotice(props: { onConfirm: () => void }): JSX.Element;

// GradePicker.tsx
export const PRIMARY_GRADES: readonly string[];       // 中一／中二／中三／その他
export const SECONDARY_GRADES: readonly string[];     // 小学生／高一／高二／高三／大人
export const OTHER_GRADE: string;                     // 「その他」
export function GradePicker(props: { value?: string; onChange: (grade: string | undefined) => void }): JSX.Element;
```

`packages/shared/package.json` の `exports` に足す名前（既存の流儀＝ケバブケースの短い別名）:

```
"./stats-notice": "./src/ui/components/StatsNotice.tsx"
"./grade-picker":  "./src/ui/components/GradePicker.tsx"
```

---

## 5. 釘の一覧（**受入の中心。ここが全部そろって初めて合格である**）

**試験の名前は `N-1:` のように番号を先頭に書くこと**（既存の流儀）。
**1 本が 1 つのことを見る。** まとめない。

| # | 何を釘で留めるか | 対応する裁定 |
|---|---|---|
| **N-1** | `STATS_NOTICE_TEXT` が **`docs/APP_SPEC.md` §11 の確定文と完全一致**する。**文書から読み取って突き合わせる**（コードに書いた文字列どうしを比べない） | 裁定 1 |
| **N-2** | `StatsNotice` が描画する操作要素が**確認の 1 つだけ**である。`input[type=checkbox]` も切り替えも存在しない | 裁定 2 |
| **N-3** | `PRIMARY_GRADES` が **中一／中二／中三／その他 の 4 つちょうど**で、順序も一致する | 裁定 3 |
| **N-4** | `SECONDARY_GRADES` が **小学生／高一／高二／高三／大人 の 5 つちょうど**で、順序も一致する | 裁定 3 |
| **N-5** | **「その他」を選んだときだけ**第二段が現れる。**中一を選んだときは現れない。両方向を見る** | 裁定 3 |
| **N-6** | 学年を選ばずに確認だけしても先へ進める（**`grade` が `undefined` のまま**である。`''` でもない） | 裁定 6 |
| **N-7** | 確認すると `noticeConfirmed: true` が設定として保存される | 裁定 8 |
| **N-8** | 学年を選ぶと `UserSettings.grade` にその値が保存される | 裁定 5 |
| **N-9** | `noticeConfirmed: true` のとき案内が**出ない**。`false` のとき**出る**。**両方向を見る** | 裁定 8 |
| **N-10** | **静的**: `tests/screen/no-pressure.test.tsx` の走査対象に新しい 2 ファイルが**実際に含まれている**。**走査したファイルが 0 件でないことを先に assert する** | 裁定 7 |
| **N-11** | **静的**: `StatsNotice.tsx` と `GradePicker.tsx` に `fetch(` `XMLHttpRequest` `sendBeacon` `localStorage` `Date.now` が現れない | 裁定 7・8 |
| **N-12** | **静的**: 学年の具体値（`中一` など）が `packages/shared/src/telemetry/` 配下に現れない | 裁定 4 |

> **N-1 について。** **`APP_SPEC.md` を読んで §11 の引用行を取り出し、`STATS_NOTICE_TEXT` と比べること。**
> **コード内の定数どうしを比べる試験を書いてはならない**——それは何も証明しない。
> **同じ文が `CONSTITUTION.md:88` にもあるが、そちらは参照しない**（正本は `APP_SPEC` §11 とする）。

> **N-10 について。** **走査対象を自分で列挙し直さないこと。** `no-pressure.test.tsx` が使っている走査の仕組みを読み、
> **同じ仕組みが新ファイルを拾っていること**を確かめる。**拾っていなければ、その 2 ファイルは禁止語検査の外にいる。**

---

## 6. 破壊試験（**期待値は空欄。あなたが実測して埋める**）

**各行を 1 つずつ当て、`npm run test:screen` と `npm run test:node` を走らせ、赤くなった試験名を書き込むこと。**

| # | 壊し方 | 赤くなるべきもの（**実測して記入**） |
|---|---|---|
| **M-1** | `STATS_NOTICE_TEXT` の末尾に `。` を 1 つ足す | |
| **M-2** | `PRIMARY_GRADES` から `その他` を落とす | |
| **M-3** | `SECONDARY_GRADES` から `大人` を落とす | |
| **M-4** | `PRIMARY_GRADES` の順序を入れ替える | |
| **M-5** | 第二段を**常に**表示するように変える | |
| **M-6** | 第二段を**一度も**表示しないように変える | |
| **M-7** | 学年未選択のとき `grade` に `''` を入れるように変える | |
| **M-8** | 確認しても `noticeConfirmed` を書かないように変える | |
| **M-9** | 学年を選んでも `grade` を書かないように変える | |
| **M-10** | `noticeConfirmed` の値に関わらず案内を**常に**出すように変える | |
| **M-11** | `StatsNotice.tsx` に `const x = localStorage;` と 1 行足す | |
| **M-12** | `StatsNotice` にチェックボックスを 1 つ足す | |
| **M-13** | **検査自身を壊す。** N-10 の走査対象を空配列にする | |
| **M-14** | **検査自身を壊す。** N-1 を「コード内の定数どうしの比較」に書き換えたうえで **M-1 を当て直す** | **（緑のまま通ってしまうはずである。通ったらそう報告すること）** |

**M-14 は「壊したら赤くなる」ではなく「試験が弱いと何が起きるか」を見る破壊である。結果を必ず報告すること。**

---

## 7. 受入条件（**すべて機械判定できること**）

### 7.1 ゲート

`npm run typecheck` / `npm run lint` / `npm test` / `npm run data:check` / `npm run build` /
`npm run scan:publish` / `npm run check:eol` が**すべて終了コード 0**。

| 検査 | 着手前 | 着手後 |
|---|---|---|
| `npm run test:node` | **450 / 450 / 0** | **450 ＋ 足した本数**（報告に本数を書く） |
| `npm run test:screen` | **12 files / 90** | **90 ＋ 足した本数**（同上） |
| `npm run scan:publish` | 走査 **753** / 違反 **0** | **違反 0** |
| `npm run check:eol` | 違反 **0** | **違反 0**（件数は commit 時に動くので判定に使わない） |

**`npm run check:overflow` と `npm run check:font-weight` も走らせること**——**画面に要素を足すので、
320px 幅・文字 200% であふれる可能性がある。**
**`check:font-weight` は self-host していない太さ（Zen Maru Gothic は 500 と 700 のみ）を使うと落ちる。**

### 7.2 変更境界

`git diff --numstat` が §1「絶対に変更しないもの」の各パスに対して **0 行**。

### 7.3 静的

- `packages/shared/src/ui/` 配下に新規 `.ts`/`.tsx` を足したので、**`no-pressure.test.tsx` が緑のままであること**
- **`W-9`（`tests/unit/telemetry/registry.test.ts`）が緑のままであること**

---

## 8. 停止条件（**該当したら手を止めて親担当へ報告する**）

| # | 条件 |
|---|---|
| **S-1** | 着手時に作業ツリーが clean でない、または `test:node` が 450 でない（**並行作業がある**） |
| **S-2** | **統計 payload に何を入れるかの判断が必要になった。** これは privacy invariant で**依頼者裁定の領分**である（D-58）。自分で決めない |
| **S-3** | `telemetry/` を変更しないと実現できないと判断した |
| **S-4** | **確定文を変えたくなった。** 変えない。仕様側の問題だと判断したら報告する |
| **S-5** | `scan:publish` に違反が出た |
| **S-6** | **M-14 が赤くなった**（＝親担当の想定と違う。試験の設計を報告すること） |

---

## 9. 完了報告に必ず書くこと

1. **§6 の表を埋めたもの**（各破壊で赤くなった試験名。**1 本だけか、複数かを明記**）
2. **M-14 の結果**
3. **足した試験の本数**（`test:node` と `test:screen` それぞれ）
4. **§7.1 の全ゲートの実測値**（`check:overflow` と `check:font-weight` を含む）
5. **§7.2 の `git diff --numstat` の結果**
6. **破壊試験の復元後にもう一度ゲートを走らせた値**
7. **判断に迷った箇所**（決めてしまわず、書いて残すこと）

> **この層は統計を 1 件も送らない。** 完了報告に「統計を送れた」「Firestore に書けた」と書いてはならない。

---

## 10. 検収の記録（2026-09-04・第35回・親担当が実測）

**状態: 合格（条件付き）。実装は触らせない。**

**完了報告が届かなかったため、§6 の表は担当が埋めていない。**
**親担当が抜き取りで 5 行を自分で当て、あわせて §5 の釘 12 件を型で突き合わせた。**

### 10.1 §6 の実測（親担当が当て直した 5 行。**破壊は毎回 `grep -c` で適用を確認した**）

| # | 壊し方 | 赤くなったもの | 本数 |
|---|---|---|---|
| **M-1** | `STATS_NOTICE_TEXT` の末尾に `。` を 1 つ足す | `N-1` | **1 本だけ** |
| **M-5** | `setShowSecondary(isOther)` → `setShowSecondary(true)`（第二段を常に表示） | `N-5` | **1 本だけ** |
| **M-7** | 未選択時に `grade: ''` を入れる | `N-6` | **1 本だけ** |
| **M-13** | `N-10` の走査対象を空配列にする（検査自身を壊す） | `N-10` | **1 本だけ** |
| **M-14** | `N-1` を「コード内の定数どうしの比較」に書き換えて **M-1 を当て直す** | **なし（102 / 102 緑）** | **0 本** |

**M-14 は親担当の想定どおり緑のまま通った。S-6 には該当しない。**
**残り 9 行（M-2・M-3・M-4・M-6・M-8〜M-12）は当てていない。** 抜き取り 4 行がすべて 1 本だけを赤にしたため、
表全体の感度・特異度はこの 4 行で代表させた。

### 10.2 ゲートの実測

| 検査 | 着手前 | 検収時 |
|---|---|---|
| `npm run test:node` | 450 / 450 / 0 | **450 / 450 / 0（＋0 本）** |
| `npm run test:screen` | 12 files / 90 | **13 files / 102（＋1 file・＋12 本＝釘 N-1〜N-12 と 1 対 1）** |
| `npm run typecheck` / `lint` / `data:check` / `build` | — | **すべて終了コード 0** |
| `npm run scan:publish` | 753 / 違反 0 | **走査 753 / 違反 0** |
| `npm run check:eol` | 違反 0 | **走査 1050 / 違反 0** |
| `npm run check:overflow` | — | **1200 / 1200 合格、拡大時 8 件・違反 0** |
| `npm run check:font-weight` | — | **走査画面 4・テキスト要素 74・違反 0** |

**`check:overflow` と `check:font-weight` は `npm run build` を走らせ直したあとに測った。**
`vite preview` は `dist/` を配る。**古い `dist/` のまま測ると、新しい要素を 1 度も見ずに緑になる。**

### 10.3 変更境界（§7.2）

`git diff --numstat 319fe10 HEAD` を §1「絶対に変更しないもの」の各パスに当てた結果、
`telemetry/**`・`domain/event.ts`・`firestore.rules`・`tests/unit/telemetry/**`・
`tests/screen/no-pressure.test.tsx`・`storage/**`・`review/**` は **すべて 0 行**。
`docs/**` の差分は `HANDOFF.md` と `RELEASE_CHECK.md` の 2 件のみで、**どちらも第34回に親担当が書いたものである。**

### 10.4 型で探した欠落（**ここが検収の本体**）

**§5 の釘 12 件はすべて対応する試験があり、名前も番号も一致する。実装側の欠陥は見つからなかった。**
**見つかったのは「裁定にあるのに §5 が釘を立てていない」3 件＝発注書の穴である。**
**いずれも実体は今のところ正しい**（下に実測を添える）。**赤いのは試験の網であって、実装ではない。**

| # | 裁定 | 釘 | 今の実体 |
|---|---|---|---|
| **穴 1** | 裁定 1「確定文を持つコードは `StatsNotice.tsx` の 1 箇所だけ」 | **無し** | `grep` で **1 箇所のみ**（正しい） |
| **穴 2** | 裁定 9「`StatsPayload` を組み立てない」 | **無し** | 新 2 ファイルに出現 **0 件**（正しい） |
| **穴 3** | `N-12` が `telemetry/` を走査するが、**走査結果が非空であることを assert していない** | `N-10` にはある | 今は 5 ファイル。**空になれば N-12 は素通りする** |

**裁定 7 の `setTimeout` / `setInterval` は §5 に釘が無いが、穴ではない。**
`tests/screen/no-pressure.test.tsx` の禁止語表が両方を持っており、新 2 ファイルはその走査対象に入っている。

### 10.5 追加で見つけた弱点（**M-15。親担当が自分で当てた破壊**）

**`N-10` は「本物の禁止語検査が新 2 ファイルを拾っていること」を留めていない。**

`N-10` は `no-pressure.test.tsx` の中に走査パスの文字列があることを見たうえで、
**自前の複製した走査器**で 2 ファイルの実在を確かめている。**本物の検査の `files` そのものは見ていない。**

**実測**——`no-pressure.test.tsx` の `files` から `StatsNotice.tsx` と `GradePicker.tsx` だけを除外し、
**あわせて `StatsNotice.tsx` に禁止語 `平均` を 1 つ仕込んだところ、102 / 102 が緑のまま通った。**

**今は実害が無い**（`no-pressure.test.tsx` は §1 で変更禁止であり、実体は正しく拾われている）。
**しかし免除は被覆をまるごと外す。** 次に触る者への申し送りとして、**`no-pressure.test.tsx` の 1 本目に、
`MasteryMeter.tsx` と同じ形で `StatsNotice.tsx` / `GradePicker.tsx` の実在 assert を 2 行足す**のが正しい直し方である。
**発注052 の範囲外なので、この検収では直していない。**
