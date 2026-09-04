# 発注053（052 検収の申し送り ＋ 実機確認の不具合）

- **宛先**: Sol（Codex）
- **起票**: 2026-09-04・第35回・親担当（Claude Opus 5）
- **状態**: **発行済み（2026-09-04・第35回に改訂して発行。§2 の記入を担当側へ移した）**
- **規模**: 小〜中（試験の網の補修 4 件 ＋ 実機不具合 n 件）

---

## 0. 着手条件（**渡すときの指示にこの 1 行を書き写すこと**）

> **着手してよい。ただし最初にやるのは §2 を自分で書くことである。**
> **実機確認の不具合は、依頼者があなたに直接伝えている。**
> **その報告を §2 の書式に落としてから、コードに手を付けること。**

**改訂前は「§2 が埋まるまで着手しない」（旧 S-2）だった。** **この 1 点を取り下げる。**
**理由**——**依頼者は実機の内容をあなたに直接伝えており、親担当がそれを書き写すと資源が二重に要る。**
**052 で破壊試験の実測を担当側へ移したのと同じ扱いである**（D-61 条件 3 の意図的な緩和）。
**省略ではなく、書く主体を移しただけである。** **だから §2 は空欄のままにしてはならない。**

**着手時に作業ツリーが clean でなければ、並行作業を疑って止まること**（S-1）。
**見覚えのない差分を自分の残骸と決めつけて消さないこと。** 第34回に親担当がその事故を起こしている。

**基準線（着手前の値。ここからずれていたら S-1）**

| 検査 | 値 |
|---|---|
| `git diff --stat b1fbc29 HEAD -- packages tests` | **0 行。** 実装が最後に動いたのは `b1fbc29` で、以後の commit は `docs/` だけである。**`docs/` の commit は基準線を動かさない**（発行の前後で親担当が本書を書き換えるため、`git log -1` を基準にすると必ずずれる） |
| `git status --porcelain -uall` | **0 行** |
| `npm run test:node` | **450 / 450 / 0** |
| `npm run test:screen` | **13 files / 102** |

---

## 1. この発注は 2 つの束でできている

| 束 | 中身 | 出所 |
|---|---|---|
| **束 A** | **発注052 の検収で見つかった「試験の網の穴」4 件** | 本書 §3。**親担当が実測済み。内容は確定している** |
| **束 B** | **実機確認で見つかった不具合 n 件** | 本書 §2。**依頼者があなたに直接伝えた内容を、あなたが §2 へ書き写す** |

**束 A は実装の欠陥ではない。** 発注052 の実装は検収で合格しており、**実体は今のところ全部正しい。**
**直すのは試験の網であって、実装ではない。** **束 A の作業で `StatsNotice.tsx` と `GradePicker.tsx` の
中身を変えてはならない**（§4 の変更境界）。

**束 B の中身は親担当の手元に無い。** **依頼者があなたに直接伝えている。**
**だから §2 を書くのはあなたである。** **コードに触る前に書く。**

---

## 2. 実機確認の不具合（**あなたが書く。着手して最初にやること**）

**依頼者から受け取った実機確認の報告を、ここへ書き写す。**
**1 件につき次の 5 つを書く。**

| 欄 | 中身 |
|---|---|
| 現象 | **依頼者が見たものだけを書く。推測を混ぜない。** あなたの診断は別行に分けて書く |
| 端末・条件 | iOS Safari / Android Chrome / iPad Safari、幅、文字サイズ、`prefers-reduced-motion` の別。**聞いていない欄は「未確認」と書く。埋めない** |
| 再現手順 | URL から始める。**公開版は `https://yama-books.github.io/koten/100/`** |
| 変更したファイル | §4 の「変更してよいファイル」の枠の中に収まっているか |
| 釘 | **その不具合を二度と通さない試験を 1 本。** 名前は `R-1:` のように付ける |

**書くときの禁止事項が 3 つある。**

1. **依頼者が言っていないことを §2 に書かない。** 補って書くと、**次の担当がそれを実機の観測として読む。**
   **推測は「（Sol の診断）」と明記して分ける。**
2. **仕様の裁定が要る不具合が混ざっていたら、その 1 件は直さずに §2 へ「要裁定」として書き、手を止めて報告する**（S-5）。
   文言・情報設計・privacy invariant がこれに当たる。**自分で決めない。**
3. **報告に §2 の全文をそのまま載せること**（§9-9）。**親担当は検収でこれを依頼者の記憶と突き合わせる。**

### B-1: 選んだ範囲の歌が一巡せず、同じ歌の問題が続く

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者は「同じ問題がたくさん出てきてしまう」「範囲の歌が全部出ない」と報告した。写真では 61〜70 番の範囲に対し、問題・結果で一部の歌だけが扱われている。 |
| 端末・条件 | iPhone のブラウザ（画面から Safari 系と判断できるが、機種・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認）。公開版。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → 61〜70 番を選ぶ → 穴埋めまたは試験前の確認を開始 → 出題される歌番号を最後まで確認する。 |
| 変更したファイル | `packages/hyakunin/src/domain/entry.ts`、`tests/screen/device-findings.test.tsx`。 |
| 釘 | `R-1:` 10首の範囲を10問で計画したとき、各歌が1回ずつ現れ、同じ歌の全問題を先に消費しない。 |

（Sol の診断）`inCardOrder` が歌ごとの全問題を連結したあと、`slice` / `takeWeighted` が配列の先頭だけを取るため、若い番号の歌へ偏る。

### B-2: 「答えを見る」が採点操作になっており、問題形式も判別しにくい

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者は、入力後に「答えを見る」を押すと「正解」と出る一方、次には穴埋めでない問題が表示され、入力せず「答えを見る」だけでも進むため、答え合わせか答えの開示か分からないと報告した。穴埋めへ操作を集約し、採点操作を明確にしたいと希望した。 |
| 端末・条件 | iPhone のブラウザ。公開版。機種・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → 試験前の確認を開始 → 穴埋めに回答して「答えを見る」 → 次問へ進み、穴埋めでない表示と操作名を確認する。 |
| 変更したファイル | `packages/hyakunin/src/ui/screens/Session.tsx`、`packages/hyakunin/src/domain/entry.ts`、`tests/screen/device-findings.test.tsx`。 |
| 釘 | `R-2:` 練習の穴埋めでは未入力の採点を行わず、入力後の操作名が「答え合わせ」であり、穴埋め練習に作者問題を混ぜない。 |

（Sol の診断）全問題を同じ自由入力UIで描画し、作者選択肢を使わず、空文字も判定へ渡している。

### B-3: 縦書きの回答開示で配置が崩れ、正解が空欄へ戻らない

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者は「答えを見る」を押したあと表示が崩れたと報告した。写真では縦書き本文が一列のまま画面下へ長く伸び、下部操作がブラウザUIに隠れている。正解時は空欄だった位置へ正解を補って表示すること、空欄を角の丸い四角で囲むことを希望した。 |
| 端末・条件 | iPhone のブラウザ。公開版。写真の時刻は21:06/21:08。機種・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → 縦書きで穴埋め問題を開始 → 回答して開示 → 本文、空欄、正解、下部操作の配置を確認する。 |
| 変更したファイル | `packages/hyakunin/src/ui/screens/Session.tsx`、`packages/hyakunin/src/styles.css`、`tests/screen/device-findings.test.tsx`。 |
| 釘 | `R-3:` 未回答時は下線文字でなく丸角の空欄要素を描画し、正解開示後は同じ位置へ正解を入れ、縦書き本文を句単位の複数列として描画する。 |

（Sol の診断）問題文を一つの縦書き `h1` として描画し、空欄を `＿＿＿` の文字列のまま扱い、開示後も問題文を再構成していない。

### B-4: 問題報告の操作と保存メッセージが学習画面を占有する

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者は「問題を報告」ボタンが大きすぎ、表示しなくてもよいかもしれないと述べた。また押したあとの「この端末に保存しました」が出続けると報告した。 |
| 端末・条件 | iPhone のブラウザ。公開版。機種・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → 問または歌の確認画面を開く → 「問題を報告」を押す → 次の問題へ進み、表示の大きさと保存メッセージの残留を確認する。 |
| 変更したファイル | `packages/hyakunin/src/ui/components/ReportButton.tsx`、`packages/hyakunin/src/ui/screens/Session.tsx`、`packages/hyakunin/src/styles.css`、`tests/screen/device-findings.test.tsx`。 |
| 釘 | `R-4:` 問題報告は主操作でない小さな補助操作として回答開示後に現れ、保存メッセージは問題が変わると残らない。 |

（Sol の診断）`ReportButton` のローカル状態を問題変更時に初期化せず、同一コンポーネントが再利用されている。

### B-5: 歌を見ても「未着手」のままになる

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者は、一度見たはずの歌も結果で「未着手」と表示されると報告し、習熟度・作者未確認の判断基準が通っていない可能性を指摘した。 |
| 端末・条件 | iPhone のブラウザ。公開版。機種・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → 歌を見る入口で任意の歌を表示 → 学習結果または履歴で同じ歌の状態を確認する。 |
| 変更したファイル | `packages/hyakunin/src/domain/record.ts`、`packages/hyakunin/src/ui/screens/Home.tsx`、`tests/screen/device-findings.test.tsx`。 |
| 釘 | `R-5:` 歌の確認画面で歌を表示したとき閲覧イベントを1件保存し、その歌を未着手として扱わない。 |

（Sol の診断）歌の確認画面は閲覧イベントを保存していない。作者だけに回答した場合の既存規則は、イベントがあれば未着手ではなく、作者イベントがあれば「作者 未確認」を外す実装になっている。

### B-6: 読みと向きのラジオボタンが多く、読み切替が問題文へ反映されない

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者は、読みを一つのボタンにし、1回押すと歴史的仮名遣い、2回押すと現代仮名遣いへ変化させたいと希望した。「ヒントを見る」ではなく「読みを確認する」とする。向きもラジオボタンでなく、一つのボタンを押すたび縦書きと横書きが変わる形を希望した。 |
| 端末・条件 | 端末・ブラウザ・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → 歌または問題を表示 → 読みと向きの操作を確認 → 読みを切り替えて問題本文の変化を確認する。 |
| 変更したファイル | `packages/hyakunin/src/ui/components/ReadingToggle.tsx`、`packages/hyakunin/src/ui/components/WritingModeToggle.tsx`、`packages/hyakunin/src/ui/screens/Home.tsx`、`packages/hyakunin/src/ui/screens/Session.tsx`、`packages/hyakunin/src/domain/flow.ts`、`packages/hyakunin/src/styles.css`、`tests/screen/device-findings.test.tsx`、`tools/overflow-check/index.ts`、`tools/font-weight-check/index.ts`。 |
| 釘 | `R-6:` 読みは一つのボタンで原文→歴史的仮名遣い→現代仮名遣いの順に変化し、向きは一つのボタンで縦横が交互に変わり、問題ごとのヒント状態は次問へ漏れない。 |

（Sol の診断）現在の `ReadingToggle` / `WritingModeToggle` はラジオ群である。問題画面は設定を変えても静的な `question.prompt` を描画し続け、`advance` は `hintUsed` を次問で戻していない。

### B-7: トップの入口が多く、学習順と練習・本番の違いが分かりにくい

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者はトップページのボタンがスマートフォンでごちゃつき、何をどの順で行うか分かる案内を希望した。トップを「歌を確認する」と穴埋めへ進む入口に整理し、穴埋め内で練習と本番を選ぶ案を示した。「試験前の確認」は意味が伝わりにくく、本番側だけは練習との違いを短く説明する必要があると述べた。 |
| 端末・条件 | スマートフォン。ブラウザ・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → トップページを表示 → 五つの入口と開始前画面を確認する。 |
| 変更したファイル | `packages/hyakunin/src/ui/screens/Home.tsx`、`packages/hyakunin/src/ui/screens/RangePicker.tsx`、`packages/hyakunin/src/main.tsx`、`packages/hyakunin/src/styles.css`、`tests/screen/device-findings.test.tsx`、`tools/overflow-check/index.ts`。 |
| 釘 | `R-7:` トップの主入口は「歌を確認する」と穴埋めへ進む入口に整理され、穴埋め選択では練習と本番の差を短い説明付きで示す。 |

### B-8: 本番側で自動採点と紙・ペンの自己採点を選べない

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者は、試験前の確認に入力欄がある一方、当初の紙とペンによる自己採点になっておらず、自動採点と自己採点を設定する経路が分からないと報告した。画面入力か紙に書くかを本番側で選べるようにすることを希望した。 |
| 端末・条件 | 端末・ブラウザ・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → 試験前の確認を選択 → 開始前画面と問題画面で回答方式の選択肢を確認する。 |
| 変更したファイル | `packages/hyakunin/src/ui/screens/RangePicker.tsx`、`packages/hyakunin/src/ui/screens/Session.tsx`、`packages/hyakunin/src/main.tsx`、`tests/screen/device-findings.test.tsx`。 |
| 釘 | `R-8:` 本番側だけで「画面で答える」と「紙に書く」を選べ、紙では入力欄を出さず、答えを開いたあと本人が自己採点できる。 |

### B-9: 内部ID・ゼロ埋め番号・「首」の表記が画面に出る

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者は「対象: p063」の意味が分からず、番号の示し方を削るか分かりやすくしたいと述べた。歌番号は `001` でなく `1, 2, 3...` とし、確認・練習では邪魔にならない位置へ表示し、本番では隠すことを希望した。結果の「首ごとの状態」は「歌ごとの状態」へ変えるよう指定した。写真には結果表の見出し「首」と `p002`、推薦の `p001` も写っている。 |
| 端末・条件 | iPhone のブラウザ。公開版。機種・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → 問題画面と結果画面を表示 → 対象ID、習熟度変化、推薦、歌ごとの状態の表記を確認する。 |
| 変更したファイル | `packages/hyakunin/src/ui/screens/Session.tsx`、`packages/hyakunin/src/ui/screens/Result.tsx`、`packages/hyakunin/src/styles.css`、`tests/screen/device-findings.test.tsx`。 |
| 釘 | `R-9:` 公開画面に `p001` / `001` / 「対象:」を出さず通常数字を使い、本番問題では番号を隠し、結果見出しを「歌」「歌ごとの状態」とする。 |

### B-10: 学習中にトップへ戻る操作がない

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者は、覚える画面へ入るとトップへ戻れないと報告し、戻るボタンと中断確認を希望した。 |
| 端末・条件 | 端末・ブラウザ・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → 穴埋め学習を開始 → 学習途中にトップへ戻る操作を探す。 |
| 変更したファイル | `packages/hyakunin/src/ui/screens/Session.tsx`、`packages/hyakunin/src/main.tsx`、`packages/hyakunin/src/styles.css`、`tests/screen/device-findings.test.tsx`。 |
| 釘 | `R-10:` 学習中に戻る操作があり、押すと中断確認を出し、「続ける」では留まり、「トップへ戻る」では保存済み記録を残して戻る。 |

### B-11: 文節単位の穴埋めが無い（**依頼者裁定で保留**）

| 欄 | 中身 |
|---|---|
| 現象 | 依頼者は、句単位だけでなく文節単位の穴埋めも希望した。 |
| 端末・条件 | 端末・ブラウザ・CSS幅・文字サイズ・`prefers-reduced-motion` は未確認。生成済み公開問題は500問すべて句単位。 |
| 再現手順 | `https://yama-books.github.io/koten/100/` → 穴埋め学習を複数問行う → 隠される単位を確認する。 |
| 変更したファイル | **今回の053では未変更。** 依頼者が2026-09-04に「ひとまず保留とし、他を先に進める」と裁定した。 |
| 釘 | 今回は追加しない。文節候補を将来公開する場合は、人確認済み候補だけが出題されることを留める。 |

（Sol の診断）実行時スキーマは文節相当の `phrase` を受け入れるが、生成済み問題は `ku` だけである。`APP_SPEC` §7.1 は文節境界を問ごとに人が確認し、未確認候補を公開しないと定める。Sol が文節境界を新規決定することはできない。依頼者裁定により本件だけを保留し、B-1〜B-10を進める。

**同梱の候補（採否はあなたが決めてよい。既定は「入れない」）**

| 候補 | 内容 | 既定 |
|---|---|---|
| 公開版の 404 | `/koten/100/存在しないパス` が GitHub の既定 404 を返す。**Pages はサイト直下の `404.html` しか使わない** | **入れない。** 実機の報告に 404 が含まれていたときだけ束 B に合流させ、`.github/workflows/` を変更してよいファイルへ足す |

---

## 3. 束 A ——発注052 の検収で見つかった 4 件（**確定。決め直さない**）

**根拠はすべて `docs/CODEX_WORK_ORDER_052.md` §10 にある。先に読むこと。**

### A-1: `N-10` が本物の禁止語検査への配線を留めていない（**最優先**）

**現状**——`tests/screen/stats-onboarding.test.tsx` の `N-10` は、
`no-pressure.test.tsx` の中に走査パスの文字列があることを見たうえで、
**自前に複製した走査器**で 2 ファイルの実在を確かめている。**本物の検査の `files` そのものは見ていない。**

**親担当の実測（2026-09-04）**——`no-pressure.test.tsx` の `files` から
`StatsNotice.tsx` と `GradePicker.tsx` だけを除外し、**あわせて `StatsNotice.tsx` に禁止語 `平均` を仕込んだところ、
`test:screen` は 102 / 102 が緑のまま通った。** **免除は被覆をまるごと外す。**

**直し方（これに従う）**——`tests/screen/no-pressure.test.tsx` の
**1 本目のテスト `no-pressure: UI source targets are non-empty and include Session` に、
既存の `MasteryMeter.tsx` の assert と同じ形で 2 行足す。**

```ts
assert.ok(files.some((file) => file.endsWith('StatsNotice.tsx')), 'StatsNotice.tsx が対象に入っていない');
assert.ok(files.some((file) => file.endsWith('GradePicker.tsx')), 'GradePicker.tsx が対象に入っていない');
```

**足すのはこの 2 行だけである。**
**既存の assert・`forbidden` の配列・`uiRoots` の定義・`collectUiSources` の中身を、1 文字も変えてはならない。**
**とくに `join(process.cwd(), 'packages/shared/src/ui')` という文字列は `N-10` が名指しで見ている。**
**この行を書き換えると `N-10` が赤くなる**（そうなったら S-3）。

> **注意**——`no-pressure.test.tsx` は**発注052 では変更禁止だった。**
> **この発注では、上の 2 行を足すことだけを許可する。** それ以外の変更は境界違反である。

### A-2: 裁定 1「確定文を持つコードは 1 箇所だけ」に釘が無い

**発注052 の裁定 1 は「コードがこの文字列を持つのは `StatsNotice.tsx` の 1 箇所だけにする」と定めているのに、
それを見る試験が無い。** **実体は今のところ 1 箇所である**（親担当が `grep` で確認済み）。

**釘 `N-13` を `tests/screen/stats-onboarding.test.tsx` に 1 本足す。**

- 走査対象は **`packages/` 配下の `.ts` / `.tsx` / `.json`** とする。**`tests/` と `docs/` は含めない**
  （**試験自身と正本の文書を数えてしまう**）。
  **`node_modules/` と `dist/` も除外する**（build 成果物は原本ではない。**除外しないと build の有無で赤緑が変わる**）。
- **走査したファイルが 0 件でないことを先に assert する**（空振りで緑になる試験を書かない）。
- 確定文を含むファイルが **ちょうど 1 件**で、それが `StatsNotice.tsx` であることを見る。
- **試験ファイルの中に確定文そのものを書かないこと。** `STATS_NOTICE_TEXT` を import して使う。

### A-3: 裁定 9「`StatsPayload` を組み立てない」に釘が無い

**釘 `N-14` を 1 本足す。** `StatsNotice.tsx` と `GradePicker.tsx` の本文に
**`StatsPayload` が現れないこと**を見る。**`N-11` に混ぜない**（`N-11` は通信・直接ストレージ・時刻を見る釘である。
1 本が 1 つのことを見る）。

### A-4: `N-12` が走査結果の非空を assert していない

**現状**——`N-12` は `packages/shared/src/telemetry/` を走査して学年の具体値が無いことを見るが、
**走査結果が空でも緑になる。** 今は 5 ファイルあるので実害は無い。

**直し方**——`N-12` の中に、**走査したファイルが 0 件でないことの assert を 1 行足す**（`N-10` と同じ形）。
**新しい試験は作らない。本数は増えない。**

---

## 4. 変更境界

### 束 A で変更してよいファイル（**この 3 つだけ**）

| ファイル | 変更の範囲 |
|---|---|
| `tests/screen/no-pressure.test.tsx` | **A-1 の 2 行を足すだけ。** それ以外は 1 文字も変えない |
| `tests/screen/stats-onboarding.test.tsx` | `N-13` `N-14` を足し、`N-12` に非空 assert を 1 行足す |
| `docs/CODEX_WORK_ORDER_053.md` | **§2・§4 の束 B 行・§6 の表を書く**（**この発注書だけは書いてよい**） |

**束 A では `StatsNotice.tsx` と `GradePicker.tsx` を 1 バイトも触らない。**
**束 A は試験の網の補修であって、実装の変更ではない。**

### 束 B で変更してよいファイル（**枠で示す。個別の列挙は §2 を書くときにあなたが埋める**）

```
packages/hyakunin/src/**          ← 画面・配線・スタイル
packages/shared/src/ui/**         ← 共有コンポーネント（StatsNotice.tsx / GradePicker.tsx を含む）
tests/screen/**                   ← 釘 R-n を置く場所
tools/overflow-check/index.ts     ← UI変更に伴う検査導線の更新（2026-09-05・開発者裁定）
tools/font-weight-check/index.ts  ← UI変更に伴う検査導線の更新（2026-09-05・開発者裁定）
```

**2026-09-05 開発者裁定**——「UI変更によるテスト変更も許可する」。旧UIの「見るだけ」とラジオボタンを操作していた上記2検査器を、現行の「歌を確認する」と単一切替ボタンへ追随させる変更を許可範囲へ追加する。

**束 B で実際に変更したファイル**

- `packages/hyakunin/src/domain/entry.ts`
- `packages/hyakunin/src/domain/flow.ts`
- `packages/hyakunin/src/domain/record.ts`
- `packages/hyakunin/src/main.tsx`
- `packages/hyakunin/src/styles.css`
- `packages/hyakunin/src/ui/components/ReadingToggle.tsx`
- `packages/hyakunin/src/ui/components/ReportButton.tsx`
- `packages/hyakunin/src/ui/components/WritingModeToggle.tsx`
- `packages/hyakunin/src/ui/screens/Home.tsx`
- `packages/hyakunin/src/ui/screens/RangePicker.tsx`
- `packages/hyakunin/src/ui/screens/Result.tsx`
- `packages/hyakunin/src/ui/screens/Session.tsx`
- `tests/screen/device-findings.test.tsx`
- `tests/screen/entries.test.tsx`
- `tests/screen/main-wiring.test.tsx`
- `tests/screen/range-picker.test.tsx`
- `tests/screen/result.test.tsx`
- `tests/screen/session.test.tsx`
- `tests/screen/viewer.test.tsx`
- `tools/overflow-check/index.ts`
- `tools/font-weight-check/index.ts`

**束 B では `StatsNotice.tsx` と `GradePicker.tsx` を変更してよい。** 実機の不具合がそこに出ているなら直す。
**ただし守るのはファイルの禁止ではなく釘である**——**`N-1` 〜 `N-14` と `W-9` と `no-pressure` が緑のままであること。**
**とくに `N-1`（確定文）・`N-2`（操作は確認 1 つだけ）・`N-3` 〜 `N-5`（学年の区分と二段階）・
`N-6`（学年は任意）・`N-9`（案内の出る条件）は発注052 の裁定そのものである。**
**画面の直しでこれらが赤くなったら、直し方が裁定に反している。S-5 で止まること。**

**§2 を書き終えたら、束 B で実際に触ったファイルを上の枠の中から名指しで列挙し、§4 に行として残すこと。**

### 絶対に変更しないもの（**束 A・束 B に共通**）

```
packages/shared/src/telemetry/**
packages/shared/src/domain/event.ts
packages/shared/src/storage/**
firebase/firestore.rules
tests/unit/telemetry/**
review/**  ・  一次資料の Markdown  ・  docs/**（本書を除く）
```

**完了時に `git diff --numstat` を上の各パスに当て、すべて 0 行であることを報告すること。**
**`packages/` は現在すべて追跡下にあるので、`git diff` で「変更されていないこと」を機械判定できる**
（発注021 の時点とは事情が違う）。

### 例外——破壊試験のあいだだけの一時的な改変

**§6 の破壊試験は、変更禁止のファイル（`StatsNotice.tsx` `Home.tsx` など）を一時的に壊すことを求める。**
**これは境界違反ではない。ただし次の 3 つを守ること。**

1. **壊す前に `cp` で控えを取り、測ったら `cp` で戻す**（Python で書き戻すと改行が化ける）。
2. **壊したことを `grep -c` で確かめてから測る**（置換が 0 件だった事故が実際に起きている）。
3. **1 行ごとに戻す。** 複数の破壊を重ねない。**最後に `git status --porcelain -uall` が
   「変更してよいファイル」の分だけであることを確かめ、その出力を報告に載せる。**

**恒久的な変更が許されるのは「変更してよいファイル」の表にある 3 つだけである。**

---

## 5. 釘の一覧（**束 A の受入の中心**）

| # | 何を釘で留めるか | 出所 |
|---|---|---|
| **A-1** | `no-pressure.test.tsx` の走査結果に `StatsNotice.tsx` と `GradePicker.tsx` が**実際に含まれる** | 052 検収 §10.5 |
| **N-13** | 確定文を持つ `packages/` 配下のファイルが**ちょうど 1 件**で、それが `StatsNotice.tsx` である。**走査非空を先に assert** | 052 裁定 1 |
| **N-14** | `StatsNotice.tsx` と `GradePicker.tsx` に `StatsPayload` が現れない | 052 裁定 9 |
| **N-12′** | `N-12` の走査結果が**非空**である | 052 検収 §10.4 穴 3 |
| **R-n** | **§2 の不具合 1 件につき 1 本。** 直したことではなく、**その不具合が二度と通らないこと**を留める | 実機確認 |

**束 A で増える本数は `test:screen` が ＋2 本**（`N-13` `N-14`）。
**A-1 と N-12′ は既存テストの中の assert なので本数は増えない。**
**したがって束 A だけを終えた時点の期待値は `test:screen` = 13 files / 104、`test:node` = 450 / 450 / 0 である。**

---

## 6. 破壊試験（**期待値は空欄。あなたが実測して埋める**）

**発注052 と同じ形である。** 各行を 1 つずつ当て、赤くなった試験名を書き込むこと。
**1 行の破壊で 2 本以上が赤くなったら、その旨を明記する。**
**破壊のあとは `cp` で復元する**（Python で書き戻すと改行が化ける）。
**「壊したのに全部緑」だったときは、まず破壊が本当に適用されたかを `grep -c` で確かめること。**

| # | 壊し方 | 赤くなるべきもの（**実測して記入**） |
|---|---|---|
| **M-20** | `no-pressure.test.tsx` の `files` から新 2 ファイルだけを除外し、**あわせて `StatsNotice.tsx` に `平均` を 1 語仕込む** | `no-pressure: UI source targets are non-empty and include Session` の1本が赤。親担当の修正前実測は 102 / 102 の緑、修正後の担当実測は 113 / 114。 |
| **M-21** | `Home.tsx` に確定文をもう 1 箇所コピーする | `N-13: 統計案内の確定文を持つ packages 配下の原本は StatsNotice 1件だけ` の1本が赤。 |
| **M-22** | `N-13` の走査対象を空配列にする（**検査自身を壊す**） | `N-13: 統計案内の確定文を持つ packages 配下の原本は StatsNotice 1件だけ` の1本が赤。 |
| **M-23** | `StatsNotice.tsx` に `import type { StatsPayload } from '...';` を 1 行足す | `N-14: 統計案内と学年選択は StatsPayload を組み立てない` の1本が赤。 |
| **M-24** | `N-12` の走査対象を空配列にする（**検査自身を壊す**） | `N-12: telemetry 配下は学年区分の具体値を持たない` の1本が赤。 |
| **M-25** | `learn` を歌横断選択から、歌ごとに連結して先頭10問を取る旧方式へ戻す | `R-1: 範囲の10歌を一巡してから同じ歌を再出題する` の1本が赤。 |
| **M-26** | 未入力でも「答え合わせ」を押せる状態へ戻す | `R-2: 練習は穴埋めだけを選び未入力では採点できない` の1本が赤。 |
| **M-27** | 丸角空欄を `＿＿＿` の文字列表示へ戻す | `R-3: 丸角空欄と五つの句を保ち開示時に正解を空欄へ入れる` の1本が赤。 |
| **M-28** | 問題報告を回答前から常時表示する旧配置へ戻す | `R-4: 問題報告は開示後だけ補助操作として現れ次問へ残らない` の1本が赤。なお `key` だけを外した予備破壊は適用済みでも114 / 114の緑だったため、旧配置そのものへ戻して再測定した。 |
| **M-29** | 歌の確認時の閲覧イベント記録を止める | `R-5: 歌の確認画面は表示した歌の閲覧イベントを保存する` の1本が赤。 |
| **M-30** | 次問へ進むとき `hintUsed` を戻さない旧状態へ戻す | `R-6: 読みと向きは単一ボタンで巡回し次問はヒント未使用に戻る` の1本が赤。 |
| **M-31** | 練習と本番の短い説明を取り除く | `R-7: トップは二入口で穴埋め内に練習と本番の短い説明を出す` の1本が赤。 |
| **M-32** | 本番開始前の紙回答選択を取り除く | `R-8: 本番だけ紙回答を選べ紙では開示後に自己採点する` の1本が赤。 |
| **M-33** | 結果画面の通常数字を内部ID `p010` 表示へ戻す | **2本が赤**——`R-9: 公開表示は通常数字と歌表記を使い本番では番号を隠す` と `result: 変化がある歌を表に表示する`。 |
| **M-34** | 学習中の「戻る」を中断確認なしの直接復帰へ戻す | `R-10: 戻る操作は中断確認を経て続行かトップ復帰を選べる` の1本が赤。 |

**M-20 は「直った証拠」そのものである。** **必ず両方向で報告すること**——
**直す前に緑だったこと**（親担当が実測済み。あなたも一度確かめてよい）と、**直したあと赤くなること**。
**M-21 と M-23 は `packages/` を壊す破壊であり、復元後に `git diff --numstat` が 0 行に戻ることまで確かめること。**

---

## 7. 受入条件（**すべて機械判定できること**）

### 7.1 ゲート

`npm run typecheck` / `npm run lint` / `npm test` / `npm run data:check` / `npm run build` /
`npm run scan:publish` / `npm run check:eol` が**すべて終了コード 0**。

| 検査 | 着手前 | 着手後 |
|---|---|---|
| `npm run test:node` | 450 / 450 / 0 | **450 / 450 / 0（束 A では増えない）＋ 束 B で足した本数** |
| `npm run test:screen` | 13 files / 102 | **13 files / 104（束 A のみ）＋ 束 B で足した本数** |
| `npm run scan:publish` | 走査 753 / 違反 0 | **違反 0** |
| `npm run check:eol` | 違反 0 | **違反 0** |

**束 B で画面に手を入れたときは、`npm run check:overflow` と `npm run check:font-weight` も走らせること。**

> **`npm run build` を走らせてから測ること。** `check:overflow` は `vite preview` 経由で `dist/` を配る。
> **build し直さずに測ると、直したはずの画面を 1 度も見ずに緑になる。**
> **Windows 固有の 3 点**（`tools/overflow-check/index.ts` が手本である）——
> `npm.cmd` の直接 spawn は `EINVAL` になる／`vite preview` は `localhost` に束縛され `::1` のみ応答する
> （`127.0.0.1` では応答しない）／**実行前に孤児プロセスによるポート占有を確認する。**
> **`check:font-weight` は self-host していない太さを使うと落ちる**（Zen Maru Gothic は 500 と 700 のみ）。

### 7.2 変更境界

`git diff --numstat` が §4「絶対に変更しないもの」の各パスに対して **0 行**。

### 7.3 静的

- **`W-9`（`tests/unit/telemetry/registry.test.ts`）が緑のままであること**
- **`N-1` 〜 `N-14` と `no-pressure` の全本が緑のままであること**
  （`N-10` は A-1 の編集で赤くなりうる。赤くなったら S-3。**束 B の画面直しで赤くなったら S-5**）

---

## 8. 停止条件（**該当したら手を止めて親担当へ報告する。`docs/` を自分で編集しない**）

| # | 条件 |
|---|---|
| **S-1** | 着手時に作業ツリーが clean でない、または基準線の値が §0 の表と違う（**並行作業がある**） |
| **S-2** | **依頼者から実機確認の説明を受け取っていない、または §2 に書けるだけの情報が無い。** **推測で §2 を埋めない。** 何が足りないかを名指しして報告する |
| **S-3** | **A-1 の 2 行を足すと `N-10` が赤くなった。** `no-pressure.test.tsx` の既存の行を消さないと直せないと判断した |
| **S-4** | **M-20 が「直す前から赤」だった。** 親担当の実測と食い違う。試験の設計を報告すること |
| **S-5** | **実機不具合の直し方に仕様の裁定が要る**（文言・情報設計・privacy invariant）。**自分で決めない**（D-58） |
| **S-6** | 実機不具合の原因が `telemetry/**` `storage/**` `domain/event.ts` にあると判断した |
| **S-7** | `scan:publish` に違反が出た |

---

## 9. 完了報告に必ず書くこと

1. **§6 の表を埋めたもの**（各破壊で赤くなった試験名。**1 本だけか、複数かを明記**）
2. **M-20 の両方向**（直す前は緑・直したあとは赤）
3. **足した試験の本数**（`test:node` と `test:screen` それぞれ）
4. **§7.1 の全ゲートの実測値**（画面に触ったときは `check:overflow` と `check:font-weight` を含む）
5. **§7.2 の `git diff --numstat` の結果**
6. **破壊試験の復元後にもう一度ゲートを走らせた値**
7. **独自に決めたことを全件**。**なければ「なし」と明記すること**
8. **判断に迷った箇所**（決めてしまわず、書いて残す）
9. **§2 に書いた全文をそのまま報告に載せること。** **親担当は検収でこれを依頼者の記憶と突き合わせる。**
   **依頼者が言ったことと、あなたが診断したことの区別が付く形で書くこと。**
10. **束 B で実際に触ったファイルの一覧**（§4 の枠の中に収まっているか）

---

**実行していない検査を成功と書かない。**
**一度も実行できていないコードを完成としない。**
**検査ツールは完走しなかったときに合格を出してはならない。**
