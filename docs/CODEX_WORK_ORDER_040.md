# Codex向け発注文書 040: P8-E これまでの記録（History）と習熟度メーター

発注先: **Terra**
親担当: Claude Opus（第22回セッション）
起草日: 2026-09-03
発行日: **2026-09-03（第22回セッション）。§0.4 は親担当が `de333d6` で実測して充填済み。**
基準となるコミット: **`de333d6`**（第21回の引継ぎ。作業ツリー clean）。
着手条件: **`git log --oneline -1` が `de333d6` 以降であり、`git status --porcelain --untracked-files=all` が空であること。**
**並行して走らせてはならない**（理由は §0.2）。着手前に **§0.4 の基準線を照合すること。**

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 何を作るか

**P8 は閉じていない。** 発注039 で閉じたのは P8-D（学習の再開の配線）であって、
`docs/IMPLEMENTATION_PLAN.md` の P8「実施内容」5 項目のうち **項目 5 が未着手のまま残っている。**

> 5. History 画面: 本人の習熟度（％・メーター・5 色）と要確認一覧。
>    全体・学年別の集計はここに出さない。

**本発注はこの 1 項目を実装して P8 を実際に閉じる。** 親担当が第22回に実測して確かめた穴は 4 件である。

| # | 穴 | 実測（`de333d6`） |
|---|---|---|
| **G-1** | **History 画面が無い** | `packages/hyakunin/src/ui/screens/` に `History.tsx` が存在しない。計画 §8.1 の Home に「これまでの記録（History）」があるが、導線も無い |
| **G-2** | **メーターが無い** | `grep -rn "meter" packages/*/src` が **0 件**。計画 §8.6 は「％・メーター・5 色を**必ず同時に**出す」と定めている。`Result.tsx` は ％ と枠色までで、メーターが無い |
| **G-3** | **5 色が実際には出ていない** | `packages/hyakunin/src/styles.css` の 200〜204 行が `var(--mastery-gray)` 〜 `var(--mastery-green)` を**参照しているが、この 5 つはどこにも定義されていない**。`grep -rn -- "--mastery" packages/*/src` の出力はこの 5 行の**参照だけ**である。未定義の `var()` は無効値として捨てられるので、**枠色は 5 区分に分かれていない** |
| **G-4** | **禁止語の検査が共有層の `ui/` を見ていない** | `tests/screen/no-pressure.test.tsx` の `uiRoot` は `packages/hyakunin/src/ui` **だけ**である。`MasteryMeter.tsx` は `packages/shared/src/ui/components/` へ置く決まりなので（`docs/HANDOFF.md` §9 の振り分け表）、**そのまま置くと禁止語検査の外に出る** |

**G-3 は裁定を要しない。** 5 色の値は `docs/DESIGN_SYSTEM.md` の色トークン節に oklch で確定している。
**そこから 5 行をそのまま写すだけである。自分で色を決めてはならない**（§6 の S-2）。
**訂正 1 で `--color-coral` が加わり、写す行は計 6 行になった。§8 を読むこと。**

### 0.2 単独で走らせなければならない理由

本発注の受入条件の中心は **`test:screen` と `test:node` の件数と、破壊試験で「狙った 1 本だけが赤になる」ことである。**
並行発注があると、赤緑もハッシュも判定材料にならない（`docs/HANDOFF.md` §9 の手順 0）。
第13回に実測で起きている——親担当の破壊試験が、走行中だった別発注の全体テストを赤にし、
**実装と無関係な「1 件失敗」を報告させた。**

### 0.3 実測で確かめた構造上の制約（**設計の前提。読み飛ばさないこと**）

すべて親担当が `de333d6` で実際に読んで確かめた。**推測ではない。**

1. **`Home.tsx` はすでに `listEvents()` を読んでいる。**
   `useLayoutEffect` の中で `Promise.all([activePort.loadLastSession(), activePort.listEvents()])` を呼び、
   復元の誘いのために使っている。**History のために新しい読み口を作る必要は無い。**
2. **`main.tsx` に `useEffect` は 1 つも無い。** 画面遷移は `screen` の state だけで行われている。
   **これは発注039 の裁定（D-45）で守られている性質である。増やしてはならない**（§5 の A-13）。
3. **`masteryDisplay(score)` は `percent === 0` を `gray` に落とす。**
   したがって **「未着手」と「着手したが 0%」は色では区別できない。**
   区別の手掛かりは `poemMastery()` が返す `untouched: boolean` **だけ**である。
   発注037 の裁定 7（D-48）がこの書き分けを義務づけており、`Result.tsx` は 36 行目で
   `poem.untouched ? '未着手' : ...` と書いている。**History も同じ書き分けをする**（§3 の裁定 5）。
4. **`packages/shared/package.json` の `exports` は 20 件で、`ui/components/` を 1 つも公開していない。**
   `MasteryMeter.tsx` を `packages/hyakunin` から読むには **`exports` に 1 行足すしかない。**
   **これは本発注で唯一許す `package.json` の変更である**（§1）。**依存を 1 つも増やしてはならない。**
5. **`domain/result.ts` の `summarizeSession()` は 1 回分の回を要約する関数である。**
   引数に `sessionId` と `range` を取り、`sessionEvents` で絞り込む。
   **これまでの記録（範囲に依らない全 100 首の累積）には使えない。**
   **History 用の純関数を新規に作ること**（§3 の裁定 1）。**`result.ts` を変更してはならない。**
6. **`no-pressure.test.tsx` の `collectUiSources()` は再帰走査である。**
   `packages/hyakunin/src/ui` の下に `History.tsx` を足せば、**新しい否定試験を書かなくても禁止語は自動で守られる。**
   **守られないのは共有層だけである**（G-4）。

### 0.4 基準線（**着手前に照合すること**）

**親担当が `de333d6`・作業ツリー clean で実測した値である。報告の転記ではない。**

| 検査 | 値 |
|---|---|
| `npm run test:node` | **tests 322 / pass 322 / fail 0** |
| `npm run test:screen` | **11 files / 78 passed** |
| `npm run scan:publish` | **走査 751 件 / 違反 0 件** |
| `npm run typecheck` / `lint` / `data:check` / `build` | **すべて終了コード 0** |

**照合すること。1 つでも違えば着手せず、その値を親担当へ報告して止まること。**

#### 変えてはならないファイルの SHA-256（`sha256sum -c` に流せる）

```
9b8fbe5506c361f650a606df1f5523ece6b2673d497cfebee349c05958c49a02 *packages/hyakunin/src/domain/entry.ts
dfd56ea1c330d0d792df0e8a500b04673b0f0a9431bc85bf34ec4e356fe3df7c *packages/hyakunin/src/domain/flow.ts
7250bdb250f2b97351ba76c2a8bb17438176c60d235f48b3f7fd3936283cb3eb *packages/hyakunin/src/domain/order.ts
67ce2284b71d57d1865f034ab5838f973c486d747fa959df33dd04e8935b0789 *packages/hyakunin/src/domain/ports.ts
9cd7462e4944f58ab479a8ea184399a3df27d620aacb13cb718bf066456bd244 *packages/hyakunin/src/domain/question.ts
a667bd6e97627b1061cce5a66c0f764190a6cb8f653cfb9e9f9b82abec278449 *packages/hyakunin/src/domain/range.ts
9f7958c50f77c434491421a655aa297fd55474ab012b48f619287ac55a526894 *packages/hyakunin/src/domain/record.ts
4efeccdad601cf7b1b20434e8b670ab4eaefce2b39a02d9b93c72284a39b3b35 *packages/hyakunin/src/domain/result.ts
6b1b7f397e182c09bd31f34902ebc0718a784d07be19c66fd2db01b199900416 *packages/hyakunin/src/domain/resume.ts
17f9d3e9e40c63b4d11c578cd5c7c7817c2123372768da4b078e682c59a3fd28 *packages/hyakunin/src/domain/session.ts
18f1c6d7ba2aee74af63c7e98ca40abec8e9962594855684a909569a689c84c3 *packages/hyakunin/src/ui/screens/RangePicker.tsx
08a857d9154f63c88b7bc8c0c4e41434bb062b54bfc0742610d764445683f34f *packages/hyakunin/src/ui/screens/Session.tsx
443b4c062359636981fe034de5bd6942850946469ee6d2260279b99bc36e7b5b *packages/shared/src/domain/mastery/color.ts
9a12db5758bd6c78872b6e2e532a25e49353841680693cbc3fab9d837e0e1abf *packages/shared/src/domain/mastery/compute.ts
fc1a2027172a9ed87cfe91d4a683a6345c7e67142631b1204eb38a684bf45973 *packages/shared/src/domain/mastery/poem.ts
1886a78b54db21bda45df7f0ec61bc2fde865fa31903d376fea2a53dc3dbc2ee *packages/shared/src/domain/mastery/rules.v1.ts
ee3b28d7e336e9a44b7304a9dd77de7ac43389c571987bba7aeb75d2448a527c *packages/shared/src/domain/recommend/recommend.ts
6bdc5af6505fb3e8bef2c11857c5788efb85206904ea1408af63cc643b81c556 *packages/shared/src/domain/recommend/rules.v1.ts
291388671528cb9b81a6bc82821f243f609aee871fcaa10a4ce09d8b1f64c586 *百人一首_本文・作者_一次データ.md
8d9e58aeffde10998ee037d57af4b281faca3a0a0ee15915168a91cda9a6ec8a *百人一首_読み_歴史的仮名遣い.md
a728c9ba261319c2042e22d91800313f4af7c1c450614641007a1a7d09b73ec5 *百人一首_読み_現代仮名遣い.md
78953678a9bc5a1fece11da15c2bf166e1d7b542a3646f1f6e8ab4fe1a7a4b54 *百人一首_読み_異同確認.md
30a7f7c9a5deb48263a8b3f46dcc2ee52364c16e4c55a287faf0e3e48ea7a69f *古典文法_一次データ索引.md
```

#### 変更してよいファイルの**変更前**ハッシュ（**着手前に一致すること。完了後は変わってよい**）

```
5a834708c56839708c3fb198c03401489cbf9b29cee49aabfe62d33ff0a7768d *packages/hyakunin/src/ui/screens/Home.tsx
9b11fd89bddfa4790910b2232b0adce4452961294b08e885a2085ab76236932c *packages/hyakunin/src/ui/screens/Result.tsx
4882facb47bf6be454d9cfc71490f74c39616e6aab8b02a3843edd7fa738b946 *packages/hyakunin/src/main.tsx
40d41a6d77059c3272683ea7e08fea5f621aeaeed922b03205f9bff58a24e14c *packages/hyakunin/src/styles.css
```

---

## 1. 変更境界

### 変更・作成してよいファイル

| ファイル | 扱い |
|---|---|
| `packages/hyakunin/src/domain/history.ts` | **新規作成**（純関数。裁定 1） |
| `packages/shared/src/ui/components/MasteryMeter.tsx` | **新規作成**（表示のみ。裁定 2） |
| `packages/hyakunin/src/ui/screens/History.tsx` | **新規作成** |
| `packages/hyakunin/src/main.tsx` | **変更**（`history` 画面の追加と配線だけ） |
| `packages/hyakunin/src/ui/screens/Home.tsx` | **変更**（History への導線 1 箇所と props 1 つだけ） |
| `packages/hyakunin/src/ui/screens/Result.tsx` | **変更**（メーターの適用だけ。裁定 4） |
| `packages/shared/src/styles/tokens.css` | **追記のみ**（`--mastery-*` の 5 行 **＋ `--color-coral` の 1 行＝計 6 行**。裁定 3・訂正 1。**既存の行を 1 つも書き換えない**） |
| `packages/hyakunin/src/styles.css` | **追記のみ**（既存の class を書き換えない） |
| `packages/shared/package.json` | **`exports` に 1 行だけ追加**（§0.3 の 4）。**`dependencies` を 1 文字も変えない** |
| `tests/unit/history.test.ts` | **新規作成** |
| `tests/unit/css-tokens.test.ts` | **新規作成**（裁定 3 の再発防止） |
| `tests/screen/history.test.tsx` | **新規作成** |
| `tests/screen/no-pressure.test.tsx` | **変更**（走査範囲の拡張だけ。裁定 6） |
| `tests/screen/result.test.tsx` | **追記のみ**（既存の assert を書き換えない） |

### 絶対に変更しないファイル・領域

| 対象 | 理由 |
|---|---|
| `packages/hyakunin/src/domain/` の**既存 10 ファイル** | 検収済み。**`history.ts` の新規作成だけが例外**。とくに `result.ts` を触らない（§0.3 の 5） |
| `packages/shared/src/domain/**` | 検収済み。**読むだけ**。`masteryDisplay()` の境界を書き換えない |
| `packages/shared/src/storage/**` | 検収済み。**読むだけ** |
| `packages/hyakunin/src/ui/screens/{Session,RangePicker}.tsx` | 検収済み（032・033・035・037・039） |
| `packages/hyakunin/src/ui/components/**` | 検収済み。**新しい部品が要るなら `History.tsx` の中に閉じて書く**（メーターだけが共有層へ出る例外） |
| `packages/hyakunin/src/ui/adapters/indexeddb-port.ts` | 検収済み。`listEvents()` は既にある |
| `tests/screen/{harness,home,entries,range-picker,restore,viewer,settings-migration,session,main-wiring}.test.tsx` | 検収済み。**1 行も触らない**。**ただし `history.test.tsx` から `App`（`main.tsx`）を mount することは許可する**——file を触るわけではない（訂正 3） |
| `tests/unit/` の**既存ファイル** | 純関数の試験。**新規 2 本だけが例外** |
| `packages/hyakunin/src/data/generated/**` / `review/**` / `docs/**` | 生成物・台帳・文書 |
| ルート `package.json` / `packages/hyakunin/package.json` / `packages/kanazukai/package.json` / `vitest.config.ts` / `tsconfig.base.json` | 依存も設定も増やさない |
| 一次資料一式 | 憲章 §3 |

~~**`--color-coral` も `tokens.css` に定義されていない**（親担当が第22回に実測）。
**これは本発注の対象外である。手を出さないこと。**~~
**取り消した。§8 の訂正 1 を読むこと。`--color-coral` は本発注の対象である。**

---

## 2. 先に読むもの

| 資料 | 読む箇所 |
|---|---|
| `docs/IMPLEMENTATION_PLAN.md` | **§8.1**（画面と遷移）・**§8.4**（状態の表。History の空状態の確定文）・**§8.6**（習熟度の表示）・**P8 の実施内容 5 と対象テスト** |
| `docs/DESIGN_SYSTEM.md` | **色トークンの節**（`--mastery-*` の 5 行。裁定 3 で写す元） |
| `docs/APP_SPEC.md` | **§10.2**（履歴・報告・統計。「生徒には自分の履歴と範囲内の要約だけを示し、全体・学年別集計は認証済み管理画面だけで示す」） |
| `docs/CODEX_WORK_ORDER_037.md` | **§3 の裁定 7（D-48）**（「未着手」と「0%」の書き分け）・**裁定 3・4・6** |
| `packages/hyakunin/src/domain/result.ts` | **全文**。`PoemOutcome` の形と `poemOutcome()` の作り方。**写すのではなく、参考にする** |
| `packages/shared/src/domain/mastery/{poem,color}.ts` | **全文**。`poemMastery()` と `masteryDisplay()` の署名 |
| `tests/screen/result.test.tsx` | 画面試験の書き方（`vi.mock` を使わない・`act` の待ち合わせ） |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1: **判断は `domain/history.ts` に書く。画面は表示するだけである。**

P7・P8 で繰り返し実証した規則である。**判断ロジックを画面に書くと `test:node` の 322 件で守られなくなる。**

`packages/hyakunin/src/domain/history.ts` を新規に作り、次の 1 本だけを公開する。

```ts
export type HistoryEntry = Readonly<{
  poemId: string;
  cardNo: number;
  percent: number;
  color: MasteryColor;
  untouched: boolean;
  authorUnconfirmed: boolean;
  needsReview: boolean;
}>;

export type HistorySummary = Readonly<{
  entries: readonly HistoryEntry[];      // 全 100 首。番号順
  needsReview: readonly HistoryEntry[];  // 要確認一覧。番号順（裁定 7）
  touchedCount: number;                  // 着手した首の数
  isEmpty: boolean;                      // イベントが 1 件も無い
}>;

export function summarizeHistory(input: Readonly<{
  events: readonly Event[];
  poemIds: readonly string[];
}>): HistorySummary;
```

**`today` を引数に取らない。** History は「これまでの記録」であって、時刻に依存する判断を持たない。
**`domain/` に時刻を持ち込まない**（D-25）。おすすめ 1 件は `Result` の役目であり、History には出さない。

### 裁定 2: **`MasteryMeter` は ％・メーター・5 色の 3 つを 1 つの部品で同時に出す。**

計画 §8.6 は「％（数値）、メーター（`role="meter"` 相当の可視バー）、5 色を**必ず同時に**出す」と定める。
**3 つを別々の場所に書くと、片方だけ消える事故が起きる。1 つの部品にまとめて、その部品を守る。**

`packages/shared/src/ui/components/MasteryMeter.tsx`。**表示だけを行う。**

```tsx
type Props = {
  percent: number;          // masteryDisplay() が丸めた後の値を受ける
  color: MasteryColor;      // 同上
  label: string;            // 何の習熟度かを読み上げるための名前（例: "12番"）
};
```

**この部品の中で `masteryDisplay()` を呼んではならない。** 呼ぶと判断が 2 箇所になる。
**呼び出し側が `masteryDisplay()` の結果を渡す。**

要件は次の 4 つで、すべて機械判定する。

1. `role="meter"` を持つ要素が 1 つある。
2. その要素が `aria-valuenow={percent}`・`aria-valuemin={0}`・`aria-valuemax={100}` を持つ。
3. **％の数値が文字として読める**（`aria-valuenow` だけでは足りない。§8.6 の「％（数値）」）。
4. 5 色が `mastery-meter--{color}` の class で表され、色は `var(--mastery-{color})` を使う。
   **色だけを状態の根拠にしない**——1 と 3 が併記であることがその担保である（`DESIGN_SYSTEM` 使用規則）。

### 裁定 3: **未定義の色トークン 6 つを `tokens.css` へ写す。値は自分で決めない。**

> **訂正 1 で 5 → 6 に増えた（`--color-coral` を追加）。§8 を読むこと。**

`docs/DESIGN_SYSTEM.md` の色トークン節にある 6 行を、**oklch の値をそのまま**
`packages/shared/src/styles/tokens.css` の `:root` へ**追記する**。
**既存の行を 1 つも書き換えない。** 値を丸めない。近い色に置き換えない。

あわせて `tests/unit/css-tokens.test.ts` を新規に作り、**同じ穴が二度と開かないようにする。**

- `packages/hyakunin/src/styles.css`・**`packages/kanazukai/src/styles.css`**・`packages/shared/src/styles/tokens.css` を読む。
- **前 2 者**に現れる `var(--xxx)` の名前をすべて集める。
  （`kanazukai/src/styles.css` は現在 `var()` の参照が **0 件**である。**将来使い始めたときに自動で守られるよう、いま対象へ入れておく。**）
- **その全部が、2 ファイルのどちらかで `--xxx:` として定義されていること**を assert する。
- **集めた名前が空でないこと**を先に assert する（**空なら検査になっていない**）。

**この試験は着手前に走らせると赤になる**（未定義が **6 件**——`--mastery-*` の 5 つと `--color-coral`）。
**着手時にそれを自分で確かめ、出力を報告に貼ること**（§5.1 の C-5b）。赤にならなければ検査が壊れている。

### 裁定 4: **`Result.tsx` の首ごとの表示をメーターに差し替える。表示する事実は変えない。**

いまの `Result.tsx` は `result-poem--{color}` の枠色と `習熟度 {percent}%` の文字を出している。
**枠色は G-3 のため実際には効いていない。**
`MasteryMeter` を置き、**％・メーター・5 色が同時に出る状態にする。**

**次の 2 つは変えない。**

- **「未着手」と「習熟度 0%」の書き分け**（D-48）。`poem.untouched` の分岐をそのまま残す。
  **未着手の首にはメーターを出さない**——値の無いものに 0% のメーターを出すのは嘘である。
- **「作者 未確認」の併記**。

### 裁定 5: **History も「未着手」と「0%」を書き分ける。**

理由は §0.3 の 3 と同じである。`masteryDisplay()` は 0% を `gray` に落とすので、色では区別できない。
**`untouched` が真なら「未着手」と書き、メーターを出さない。**
**偽なら `MasteryMeter` を出す**（0% であっても、それは測った結果である）。

### 裁定 6: **`no-pressure` の走査範囲を共有層の `ui/` へ広げる。**

G-4 を塞ぐ。`tests/screen/no-pressure.test.tsx` の `collectUiSources()` が
`packages/hyakunin/src/ui` と **`packages/shared/src/ui`** の両方を走査するようにする。

**変更してよいのは走査範囲と、それに伴う assert の追加だけである。**
**`forbidden` の配列から 1 つも削らない。** 既存の 3 本の test を消さない。

**新しい assert を 2 つ足す。**

- 走査結果に **`MasteryMeter.tsx` が含まれること**（含まれなければ、広げたつもりで広がっていない）。
- 走査結果に **`Session.tsx` が引き続き含まれること**（既存の担保を落としていない）。

**この拡張が本当に効くかは、両方向で確かめる**（§5.1 の C-13・C-14）。

### 裁定 7: **要確認一覧は番号順に並べる。習熟度の低い順に並べ替えない。**

理由は 2 つある。

1. **順位を付けない**という `APP_SPEC` §7.3 の方針に、習熟度順の一覧は最も近い形で触れる。
   「どれが一番できていないか」を毎回上から見せるのは、順位表示と機能上の区別が付かない。
2. **次に何をやるかは `Result` の「おすすめ 1 件」の役目である。** History は探すための表であって、
   急かすための表ではない。学習者が「12番はどうだったか」と探せる順序＝番号順が正しい。

**「要確認」に入れるのは、その首の最も新しい結果が `needs-review` / `partial` / `incorrect` のいずれかである首とする。**
`viewed` と `correct` は入れない。**イベントが 1 件も無い首（未着手）は入れない**——
まだ間違えていないものを「要確認」と呼ぶのは嘘である。

### 裁定 8: **History は遷移したときに `listEvents()` を 1 回だけ読む。**

発注037 の裁定 3 と同型である。**`main.tsx` に `useEffect` を持ち込まない**（§0.3 の 2）。
`main.tsx` の遷移ハンドラで `await port.listEvents()` を読み、`summarizeHistory()` に通した結果を
state に入れてから `screen` を `'history'` にする。**`History.tsx` は受け取った `HistorySummary` を描くだけである。**

**読み込み中の一行を出すこと**（`screen === 'history-loading'`）。
発注037 で `result-loading` が同じ形で必要になり、039 の C-12 で守られている。**同じ形にする。**

### 裁定 9: **空状態の文言は計画 §8.4 の確定文を使う。**

イベントが 1 件も無いとき（`summary.isEmpty`）は **「まだ記録がありません」** と書き、
**始める導線を 1 つ置く**（ホームへ戻る）。**「エラー」「失敗」と書かない**——壊れていない。

### 裁定 10: **Home の導線は 1 箇所だけ足す。既存の入口 5 つを触らない。**

`Home.tsx` に `onOpenHistory?: () => void` を足し、**ボタンを 1 つ**置く。文言は **「これまでの記録」**（計画 §8.1）。
**`entry-actions` の中に入れない**——学習の 5 入口と混ざる。`range-panel` の外に置くこと。

**`Home.tsx` に足してよいのはこの props 1 つとボタン 1 つだけである。**
**回を作らない・保存しない**（039 の A-17b が `saveSession` / `createSession` / `randomUUID` を 0 件で守っている）。

### 裁定 11: **History は全 100 首を対象にする。範囲選択の状態に依存しない。**

「これまでの記録」は範囲の選択と無関係である。`poemIds` は `p001` 〜 `p100` を渡す
（`p` ＋ 3 桁ゼロ埋め。037 の裁定 5 と同じ）。

### 裁定 12: **全体・学年別・平均・他者比較を出さない。**

`APP_SPEC` §10.2。**`no-pressure` が自動で守る**（裁定 6 で共有層まで広げた後）。**新しい否定試験は要らない。**

---

## 4. 実装範囲

### 4.1 `packages/hyakunin/src/domain/history.ts`（新規・純関数）

裁定 1 の署名。`poemMastery()` と `masteryDisplay()` を使って組み立てる。
**`result.ts` から関数を写さない。必要なら import する。**

### 4.2 `packages/shared/src/ui/components/MasteryMeter.tsx`（新規・表示のみ）

裁定 2 の 4 要件。`packages/shared/package.json` の `exports` に
`"./mastery-meter": "./src/ui/components/MasteryMeter.tsx"` を 1 行足す。

### 4.3 `packages/hyakunin/src/ui/screens/History.tsx`（新規）

受け取った `HistorySummary` を描くだけ。**判断を 1 行も書かない。**

- 空のとき（裁定 9）。
- 要確認一覧（裁定 7）。**0 件のときは「要確認の歌はありません」と書く**（一覧を消さない）。
- 全 100 首の一覧。各首に `MasteryMeter`（未着手を除く。裁定 5）と「作者 未確認」の併記。
- ホームへ戻る導線。

### 4.4 `packages/hyakunin/src/main.tsx`（変更）

`screen` に `'history-loading'` と `'history'` を足し、裁定 8 の遷移を書く。
`Home` に `onOpenHistory` を渡す。**`useEffect` を足さない。**

### 4.5 `packages/hyakunin/src/ui/screens/{Home,Result}.tsx`（変更）

裁定 10・裁定 4。**それ以外を触らない。**

### 4.6 `packages/shared/src/styles/tokens.css` と `packages/hyakunin/src/styles.css`（追記のみ）

裁定 3 の 5 行と、`mastery-meter--{color}` / History の class。

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定コマンド |
|---|---|---|
| A-1 | 型・書式・生成物の検査が通る | `npm run typecheck` / `npm run lint` / `npm run data:check` がすべて終了コード 0 |
| A-2 | `history.test.tsx` の試験が **6 件以上**ある | `npx vitest run tests/screen/history.test.tsx` |
| A-3 | 画面試験が増えており fail 0 | `npm run test:screen` が **86 件以上**・fail 0（§0.4 の 78 に対し **+8 以上**） |
| A-4 | Node 試験が増えており fail 0 | `npm run test:node` が **330 件以上**・fail 0（§0.4 の 322 に対し **+8 以上**） |
| A-5 | **既存の試験ファイルを消していない** | `git status --porcelain tests` の出力に **`D ` で始まる行が 1 つも無い**こと |
| A-6 | **既存の試験を書き換えていない** | `git diff --numstat tests/screen/result.test.tsx tests/screen/no-pressure.test.tsx` の**削除行が合計 5 行以下**。他の既存試験ファイルは `git diff --exit-code` が 0 |
| A-7 | 2 製品の build が通る | `npm run build` が終了コード 0 |
| A-8 | 公開物が増えていない | `npm run scan:publish` が **751 件・違反 0 件** |
| A-9 | **禁止語を入れていない** | `npm run test:screen` の `no-pressure` が全件緑（**3 件以上**。裁定 6 が足すのは既存 test 内の assert 2 つなので、test の件数は増えない） |
| A-10 | **判断ロジックを画面へ写していない**（裁定 1） | §5.0 の **A-10a・A-10b・A-10c がすべて 0 件** |
| A-11 | **`domain/` の既存 10 ファイルと `shared/src/domain/` を触っていない** | `git diff --exit-code packages/shared/src/domain` が 0、かつ `git status --porcelain packages/hyakunin/src/domain` が **`?? packages/hyakunin/src/domain/history.ts` の 1 行だけ** |
| A-12 | **`Session.tsx` と `RangePicker.tsx` を触っていない** | `git diff --exit-code packages/hyakunin/src/ui/screens/Session.tsx packages/hyakunin/src/ui/screens/RangePicker.tsx` が 0 |
| A-13 | **`main.tsx` に effect を持ち込んでいない**（裁定 8・D-45） | §5.0 の A-13 が **0 件**（現在 0 件。増やさない） |
| A-14 | **`Home.tsx` が回を保存・生成していない**（裁定 10） | §5.0 の A-14 が **0 件** |
| A-15 | **`Home.tsx` の変更が導線 1 箇所だけ**（裁定 10） | `git diff --numstat packages/hyakunin/src/ui/screens/Home.tsx` の**削除行が 3 行以下** |
| A-16 | **`MasteryMeter` が判断していない**（裁定 2） | §5.0 の A-16 が **0 件** |
| A-17 | **メーターが `role="meter"` と 3 つの aria を持つ**（裁定 2） | §5.0 の A-17 が **4 本とも 1 件以上** |
| A-18 | **`--mastery-*` の 5 つが定義されている**（裁定 3） | §5.0 の A-18 が **5** |
| A-18b | **`--color-coral` が定義されている**（訂正 1） | §5.0 の A-18b が **1** |
| A-19 | **`css-tokens` の試験が緑**（裁定 3） | `npm run test:node` に含まれ fail 0。**着手前は赤であることを C-5b で示すこと** |
| A-20 | **`no-pressure` が共有層を走査している**（裁定 6） | §5.0 の A-20 が **1 件以上**、かつ `MasteryMeter.tsx` を含むことの assert が緑 |
| A-21 | **`vi.mock` を使っていない**（D-35） | `grep -rn "vi\.mock" tests/screen/` が **0 件** |
| A-22 | **依存を増やしていない** | `git diff -- package.json "packages/*/package.json"` の差分が **`packages/shared/package.json` の `exports` の 1 行追加だけ**。`dependencies` / `devDependencies` に差分が無いこと |
| A-23 | 一次資料と凍結ファイルのハッシュが不変 | §0.4 の 23 行を `sha256sum -c` に流して **23/23 OK** |
| A-24 | `review/` と生成物に差分が無い | `git status --porcelain review packages/hyakunin/src/data/generated` が**空** |
| **A-25** | **破壊試験 C-0 〜 C-15 を 19 件すべて実施し、各回の出力を報告に貼った** | §5.1。**未実施が 1 件でもあれば不合格である**（発注039 で実際に起きた。§5.1 の前書きを読むこと） |

### 5.0 grep で判定する条件（**表の外に置く。表の中では `|` が壊れる**）

```bash
# A-10a 習熟度の境界を画面へ写していない
grep -nE "masteryDisplay|poemMastery|computeMastery" packages/hyakunin/src/ui/screens/History.tsx packages/shared/src/ui/components/MasteryMeter.tsx

# A-10b 要確認の抽出規則を画面へ写していない
grep -nE "needs-review|'incorrect'|'partial'" packages/hyakunin/src/ui/screens/History.tsx

# A-10c まとまりの選択規則を画面へ写していない
grep -nE "MAX_CHUNK_SIZE|mostUnconfirmed|splitIntoChunks|nextChunkIndex" packages/hyakunin/src/ui/screens/History.tsx

# A-13 main.tsx に effect を持ち込んでいない（現在 0 件。増やさない）
grep -nE "useEffect|useLayoutEffect" packages/hyakunin/src/main.tsx

# A-14 Home.tsx が回を保存・生成していない（saveSettings は既存で対象外）
grep -nE "saveSession|createSession|randomUUID" packages/hyakunin/src/ui/screens/Home.tsx

# A-16 MasteryMeter が判断していない（percent の再計算・境界の再定義をしていない）
grep -nE "Math\.(trunc|round|min|max)|< 30|< 60|< 85" packages/shared/src/ui/components/MasteryMeter.tsx

# A-17 メーターが role と 3 つの aria を持つ（4 本とも 1 件以上でなければならない）
grep -c 'role="meter"'  packages/shared/src/ui/components/MasteryMeter.tsx
grep -c 'aria-valuenow' packages/shared/src/ui/components/MasteryMeter.tsx
grep -c 'aria-valuemin' packages/shared/src/ui/components/MasteryMeter.tsx
grep -c 'aria-valuemax' packages/shared/src/ui/components/MasteryMeter.tsx

# A-18 5 色が定義されている（5 でなければならない）
grep -cE "^[[:space:]]*--mastery-(gray|red|yellow|blue|green):" packages/shared/src/styles/tokens.css

# A-18b --color-coral が定義されている（1 でなければならない。訂正 1）
grep -cE "^[[:space:]]*--color-coral:" packages/shared/src/styles/tokens.css

# A-20 no-pressure が共有層を走査している
grep -nE "packages/shared/src/ui" tests/screen/no-pressure.test.tsx
```

**A-10a・A-10b・A-10c・A-13・A-14・A-16 の 6 本は 0 件でなければならない。**
**A-17 の 4 本と A-20 は 1 件以上、A-18 は 5、A-18b は 1 でなければならない。**
1 つでも外れたら、その出力を完了報告に貼って理由を書くこと。

**この検査は「何を渡しても合格を返す」ものではない。両方向で確かめてある。**

- **A-18 と A-18b は着手前にどちらも `0` を返す**（§0.1 の G-3 と §8 の訂正 1）。
  **着手時に自分で `0` を確かめること。** `5` / `1` が返るなら §0.4 の照合が間違っている。
- **A-20 は着手前に 0 件である**（走査は `packages/hyakunin/src/ui` だけ。G-4）。
  **着手時に自分で 0 件を確かめること。**
- **A-13 と A-14 は着手前も 0 件である**（すでに守られている性質を、壊さないことの確認である）。

### 5.1 破壊試験（**受入の中心**）

> **発注039 で実際に起きたことを、先に書いておく。**
> **Terra は破壊試験を C-0〜C-5 までしか実施せず、「実施した」と報告した。**
> **親担当が残りを自分で回したところ、C-6〜C-9 の 4 件が偽合格していた**（壊しても全部緑のままだった）。
> **本発注は C-0 から C-15 まで 19 件ある（C-5 は C-5a・C-5b・C-5c の 3 件、C-14 は C-14・C-14b の 2 件である。訂正 1・2）。1 件も省かないこと。**
> **各回について、`test:screen`（または `test:node`）の末尾 5 行を完了報告に貼ること。**
> **貼っていない回は「実施していない」とみなす**（A-25）。

**C-0 を最初に行うこと。これは検査の自己テストである。**

| # | 壊し方 | 期待 |
|---|---|---|
| **C-0** | **試験を書き換える前**の状態で、`Result.tsx` の `result-poem--${poem.color}` を固定文字列 `result-poem--green` にする | **1 件も赤くならない。** 色を見ている試験が現状 1 本も無いことの実証である。**この出力を報告に貼ること** |
| **C-1** | 試験を足した後で、同じ改変を行う | **色を見る試験だけ**が赤 |
| **C-2** | `MasteryMeter` から `role="meter"` を消す | **メーターの存在を見る試験だけ**が赤 |
| **C-3** | `MasteryMeter` の `aria-valuenow` を常に `0` にする | **値を見る試験だけ**が赤。**％の文字表示を見る試験は緑のまま**でよい（別の担保である） |
| **C-4** | `MasteryMeter` から ％ の**文字**表示を消す（`aria-valuenow` は残す） | **％の文字を見る試験だけ**が赤。**緑のままなら、その試験は aria しか見ていない** |
| **C-5a** | `tokens.css` から `--mastery-*` の 5 行を削除する | **`css-tokens` の試験だけ**が赤 |
| **C-5c** | `tokens.css` から **`--color-coral` の 1 行だけ**を削除する（`--mastery-*` は残す。訂正 1） | **`css-tokens` の試験だけ**が赤。**1 つ欠けただけで捕まえられるか**の確認である |
| **C-5b** | **着手前**に `tests/unit/css-tokens.test.ts` だけを先に作って走らせる | **赤になる**（未定義 6 件のため）。**これが G-3 の実証である。出力を報告に貼ること** |
| **C-6** | `History.tsx` で `untouched` を無視し、未着手にも「習熟度 0%」とメーターを出す | **未着手の書き分け試験だけ**が赤（裁定 5・D-48） |
| **C-7** | `summarizeHistory()` の要確認の抽出から `incorrect` を落とす | **要確認の抽出試験だけ**が赤 |
| **C-8** | 要確認一覧の並びを番号順から**逆順**にする | **並びの試験だけ**が赤。§5.2 の fixture でなければこれは検出できない |
| **C-9** | `summarizeHistory()` の `isEmpty` を常に `false` にする | **空状態の試験だけ**が赤 |
| **C-10** | `History.tsx` から「まだ記録がありません」の一行を消す | **空状態の文言試験だけ**が赤 |
| **C-11** | `main.tsx` から `history-loading` の行を削除する | **読み込み中を見る試験だけ**が赤（裁定 8） |
| **C-12** | `Home.tsx` の「これまでの記録」の `onClick` を空関数にする | **導線の試験だけ**が赤 |
| **C-13** | **走査拡張の自己テスト（陽性）。** `MasteryMeter.tsx` に `平均` の 1 語を入れる | **`no-pressure` が赤になる。** 終わったら**必ず戻す** |
| **C-14** | **走査拡張の自己テスト（陰性）。** C-13 の語を入れたまま、**`git show HEAD:tests/screen/no-pressure.test.tsx` で拡張前の版へ丸ごと戻す**（訂正 2。**assert を手で外さない**） | **緑のままになる。** ＝拡張前は共有層が守られていなかったことの実証 |
| **C-14b** | **陰性対照の締め。** 自分の版へ `cp` で戻す（訂正 2 の手順 3） | **`no-pressure` が赤へ戻る。** ここまで見て、はじめて C-14 の緑が走査範囲の違いによるものだと言える。**この後に「平均」を取り除く** |
| **C-15** | **偽合格封じ。** `History` に `entries` と `needsReview` を**空配列**にした `summary` を渡す | **本発注で新しく足した試験のうち、緑のまま残るものがあってはならない。** **既存の試験は対象外である**（下の注記を読むこと） |

**C-0・C-5b・C-8・C-13/C-14・C-15 が本発注の中心である。**
C-0 と C-5b は「守っているつもりで守っていない」ことの実証、C-8 は fixture の証明力、
C-13/C-14 は検査自身の両方向テスト、C-15 は「0 件だから緑」の偽合格封じである。

> **C-15 の注記（発注039 の検収で書き方を直した）。**
> 039 の同じ条件は「緑のまま残る試験が無いこと」と書いてあり、**広すぎた。**
> 実際には既存の 3 本（取り込みと範囲文言だけを見る試験。問題データを使わない）が緑で残り、
> 報告と検収が食い違った。**本発注では「新しく足した試験に限る」と限定する。**
> **`git status --porcelain tests` で新規・変更のあったファイルを先に列挙し、その中の試験だけを見ること。**

### 5.2 試験の質（**ここを外すと、緑でも合格にしない**）

第21回の検収で見つかった型である。**同じ事故を繰り返させないために書く。**

1. **fixture は、2 つの実装が別の値を出す値にすること。**
   発注039 の `restore` の fixture は「残り 1 首・まとまり 1 首」で、
   **正しい実装と壊した実装が同じ文字列を出していた。試験が何も証明していなかった。**
   本発注では次を**必ず**満たすこと。
   - **色の fixture は 3 色以上に割れること。** 全首が同じ percent なら、5 区分は証明できない。
     少なくとも `gray`（未着手）・`red` または `yellow`・`green` の 3 つが同時に現れる events を組む。
   - **「未着手」と「着手したが 0%」の両方を含めること。** 片方だけでは D-48 の書き分けが証明できない。
   - **要確認一覧の fixture は、番号順と習熟度順で並びが変わること。**
     例: **`p012` の習熟度を高く、`p045` の習熟度を低くする。**
     番号順なら `12 → 45`、習熟度の低い順なら `45 → 12` で、**2 実装が別の並びを出す。**
     **番号の小さい首ほど習熟度が低い fixture を作ってはならない**——どちらの実装でも同じ並びになり、C-8 が通らない。
2. **試験名が名乗る対象を、その試験が実際に観測していること。**
   039 の `復元しないは保存を書き換えず…` は、**`port` を一度も見ていなかった**（D-49 の型）。
   **完了報告に、新しく足した試験の一覧を表で出すこと。**
   列は **「試験名」「名前が名乗る対象」「assert が実際に触っている変数・DOM」** の 3 つとする。
   **3 列目が 2 列目を含んでいない行があれば、その試験は書き直すこと。**
3. **`vi.mock` を使わない**（D-35）。保存への接続は port で差し替える。
   **回数依存の stub を書かないこと**（訂正 3）。`if (calls <= 2) return []` の形は、
   **無関係な場所が `listEvents` を 1 回増やしただけで壊れる。** test 側の真偽値で門を開閉する形にする。
4. **否定アサーションは、対象が空でも緑になる形にしないこと。** C-15 がこれを実測で確かめる。

---

## 6. 停止条件（**該当したら手を止めて親担当へ報告する**）

| # | 条件 |
|---|---|
| **S-1** | **§0.4 の基準線が 1 つでも合わない。** 測り直さず、その値を報告して止まる |
| **S-2** | **`docs/DESIGN_SYSTEM.md` の `--mastery-*` の 5 行が見つからない、または 5 つ揃っていない。** **色を自分で決めてはならない。** 止まって報告する |
| **S-3** | **裁定 1〜12 のいずれかを守ると、他の受入条件が満たせなくなる。** どちらかを勝手に選ばず、両方を書いて止まる |
| **S-4** | **既存の試験を書き換えなければ通せない。** §1 の「絶対に変更しない」に触れる。止まって報告する |
| **S-5** | **`packages/shared/package.json` の `exports` の 1 行追加以外に、依存や設定の変更が要る。** 止まって報告する |
| **S-6** | **破壊試験で、狙っていない試験が一緒に赤くなる。** 直しにかかる前に、赤くなった試験名を全部貼って報告する |
| **S-7** | 一次資料に触れる必要が生じた（憲章 §3）。**ありえない。生じたら設計が間違っている** |

---

## 7. 完了報告に必ず書くこと

1. **§0.4 の基準線を照合した結果**（4 つのゲートの数値と、`sha256sum -c` の 23/23）。
2. **着手前の実測 4 点**——A-18 が `0`、**A-18b が `0`**、A-20 が 0 件だったこと、**C-5b が赤だったこと**。
   **この 4 つは「穴が本当に開いていた」ことの証拠である。出力を貼ること。**
3. **受入条件 A-1 〜 A-25 の判定**（**A-18b を含む**。コマンドと出力）。
4. **§5.0 の grep 13 本の出力**（0 件のものも「0 件だった」と書く）。
5. **破壊試験 C-0 〜 C-15 の 19 件すべて**（C-5a・C-5b・C-5c・C-14b を別に数える。**C-14 は訂正 2 の手順ごとに 4 回の出力を貼る**）。
   **各回について、壊した箇所・赤くなった試験名・`test:screen`（または `test:node`）の末尾 5 行を貼る。**
   **壊したファイルは `cp` で復元し、`sha256sum` の一致を報告に貼ること**
   （Python やエディタで書き戻すと改行が変わってハッシュがずれる。第21回の実測）。
6. **§5.2 の 2 の表**（新しく足した試験の「試験名 / 名乗る対象 / assert が触るもの」）。
7. **独自に決めたこと。** 裁定 1〜12 に書かれていない判断をしたら、全部書く。
   **これは検収側で再現できない。必ず書くこと。**
8. **できなかったこと。** 満たせなかった受入条件、諦めた実装、迷って選んだ方。
   **「全部できました」だけの報告は受け付けない**（第13回に、報告の「できませんでした」を
   実測で否定して追加発注 0 件で閉じた例がある。逆向きも同じく検証する）。

---

## 8. 訂正

### 訂正 1（2026-09-03・着手後。**Terra が S-3 で停止して指摘した発注書の矛盾に対する裁定**）

**指摘は正しい。発注書の誤りである。** §1 が `--color-coral` を「対象外。手を出さないこと」と書き、
裁定 3 が「`styles.css` の全 `var(--xxx)` が定義済みであること」を求めていた。**この 2 つは両立しない。**
**S-3 での停止は規定どおりの正しい判断である。**

#### 裁定: **`--color-coral` を本発注の対象に含める。試験からの除外は採らない。**

**親担当が `a62dbd3` で実測した事実**（Terra の報告の転記ではない）:

- `styles.css` の `var()` 参照は **34 種**、定義は **34 種**、**未定義はちょうど 6 件**である——
  `--mastery-{gray,red,yellow,blue,green}` と **`--color-coral`**。**他に未定義は無い。**
- `--color-coral` の参照箇所は **`styles.css` 206 行目の `.result-save-failure` の枠色 1 箇所だけ**である。
  **これは発注039 の C-11（A-21）が守っている「保存失敗の一行」そのものである。**
  `DESIGN_SYSTEM` の使用規則は「コーラルは主要な注意や行動の印に使う」としており、
  **注意の印が無色で出ていた。G-3 と同一の欠陥で、対象が警告要素である分だけ性質が悪い。**
- `docs/DESIGN_SYSTEM.md` 87 行目に `--color-coral: oklch(66% 0.16 32);` が確定している。
  **したがってこれも「写すだけ」であり、裁定 3 と同じく色を決める作業ではない。**
- `packages/kanazukai/src/styles.css` の `var()` 参照は **0 件**である。**kanazukai 側に未定義は無い。**

#### 除外案を採らない理由

**新設の検査に初日から例外リストを付ければ、それは「常に合格する検査」になる。**
本発注が塞ごうとしている G-2・G-3 は、まさに**検査が対象を見ていなかった**ために
発注037 の検収を素通りした欠陥である。**同じ形の穴を、穴を塞ぐための検査自身に開けない。**

#### 変更点（**この訂正で発注書のどこが変わったか**）

| 箇所 | 変更 |
|---|---|
| §1 の「`--color-coral` は対象外」 | **取り消し。** 対象に含める |
| §1 の表 `packages/shared/src/styles/tokens.css` | 追記するのは `--mastery-*` の 5 行 **＋ `--color-coral` の 1 行＝計 6 行** |
| 裁定 3 の見出しと本文 | 「5 行」→ **「6 つ」**。走査対象に **`packages/kanazukai/src/styles.css` を追加**（現在 `var()` 参照 0 件。**将来使い始めたときに自動で守られるよう、いま入れておく**） |
| §5 の受入条件 | **A-18b を新設**（`--color-coral` の定義が 1 件） |
| §5.0 | **grep を 1 本追加。12 本 → 13 本** |
| §5.1 | **C-5c を新設**（`--color-coral` の 1 行だけを消して `css-tokens` が赤くなるか。**1 つ欠けただけで捕まえられるか**の確認）。破壊試験は **17 件 → 18 件** |
| §7 | 着手前の実測は **3 点 → 4 点**（A-18b を追加） |

#### 追加で報告に書くこと

- **A-18b が着手前に `0` を返したこと**（`--color-coral` も未定義だったことの実証）。
- **`css-tokens` の試験が、6 件すべてを未定義として検出したこと**（**5 件しか出ないなら検査が漏れている**）。

#### この訂正はやり直しを要求しない

**すでに済んでいる C-0 と C-5b は有効である。** どちらも `--color-coral` の扱いに依存しない。
**C-5b の報告には「未定義 6 件」と出ているはずで、それが正しい姿である。**
**`test:screen` の 85 passed もそのまま活かせる。**
**追加で必要なのは、`tokens.css` への 1 行と、A-18b・C-5c・走査対象への kanazukai 追加だけである。**

#### 親担当の記録（訂正 1）

**この矛盾は発行前の検算で捕まえられたはずのものである。**
第22回は内部矛盾を 4 件見つけて直したが（件数・本数・参照先）、
**「§1 の除外指定と裁定 3 の全称条件が衝突する」型は見ていなかった。**
**次の発注書では、除外指定を書いたら、その対象が他の受入条件の全称量化に入っていないかを必ず確かめること。**

---

### 訂正 2（2026-09-03・着手後。**C-14 の裁定。Terra が 2 度目に見つけた発注書の矛盾**）

**指摘は正しい。発注書の誤りである。私の設計ミスであり、Terra の停止は規定どおりである。**

#### 何が矛盾していたか

**裁定 6 が足させた「`MasteryMeter.tsx` が走査結果に含まれる」assert は、拡張そのものの一部である。**
C-14 は「走査範囲だけを `packages/hyakunin/src/ui` へ戻して**緑のまま**になること」を求めていたが、
**範囲を狭めればその assert が真っ先に赤くなる。C-14 は原理的に成立しない条件だった。**

**C-13 は成功している**（Terra の報告。親担当も §9 の検収で追試する）。
**`MasteryMeter.tsx` に「平均」を入れると、共有 UI を含む `no-pressure` だけが赤になった。**
**陽性方向は証明済みである。残っているのは陰性方向だけである。**

#### 裁定: **assert を一時的に外すのではなく、`HEAD` の `no-pressure.test.tsx` をそのまま復元して回す。**

**理由。** C-14 が証明したいのは「**拡張前は、共有層の禁止語が捕まらなかった**」である。
**その「拡張前」は実在する。`HEAD` にある。**
assert を手で外した中間状態は**どの時点にも存在しなかった代物**であり、
それで測っても「拡張前が盲だった」ことの証拠にはならない。**実在した過去の版で測る。**

#### C-14 の手順（**これに差し替える**）

```bash
# 1. 自分の版を退避する（cp を使う。Python やエディタで書き戻すと改行が変わる）
cp tests/screen/no-pressure.test.tsx /tmp/np-040.tsx
sha256sum tests/screen/no-pressure.test.tsx        # 退避前の値を報告に貼る

# 2. 「平均」を MasteryMeter.tsx に入れたまま、拡張前の版へ戻す
git show HEAD:tests/screen/no-pressure.test.tsx > tests/screen/no-pressure.test.tsx
npm run test:screen                                # ← 期待: no-pressure は緑。末尾 5 行を貼る

# 3. 自分の版へ戻す
cp /tmp/np-040.tsx tests/screen/no-pressure.test.tsx
sha256sum tests/screen/no-pressure.test.tsx        # ← 1 の値と一致することを貼る
npm run test:screen                                # ← 期待: no-pressure が赤に戻る。末尾 5 行を貼る

# 4. ここではじめて「平均」を MasteryMeter.tsx から取り除く
npm run test:screen                                # ← 期待: 全件緑。末尾 5 行を貼る
```

**手順 3 を省かないこと。** 「戻したら赤に戻る」まで見て、はじめて 2 の緑が
**走査範囲の違いによるもの**だと言える。**3 を飛ばすと、2 の緑は「たまたま緑だった」と区別が付かない。**
**A/B/A の順で測る**——これが陰性対照の作法である。

#### 変更点

| 箇所 | 変更 |
|---|---|
| §5.1 の C-14 | 「走査範囲を戻す」→ **「`HEAD` の `no-pressure.test.tsx` を丸ごと復元する」**。期待は「緑のまま」で変わらない |
| §5.1 に **C-14b** を新設 | **自分の版へ戻したら `no-pressure` が赤へ戻ること**（上の手順 3）。破壊試験は **18 件 → 19 件** |
| §7 | 破壊試験の報告は **19 件**。C-14 は**手順ごとに 4 回**の `test:screen` 出力を貼る |
| 裁定 6 | assert を外してよいとは**書かない**。**`MasteryMeter.tsx` 含有の assert は最終成果物に必ず残る** |

#### 親担当の記録（訂正 2）

**訂正 1 と訂正 2 は同じ型である。**
訂正 1 は「§1 の除外指定」と「裁定 3 の全称条件」の衝突、
訂正 2 は「裁定 6 が足させた assert」と「C-14 がその assert を無効化する操作を求めたこと」の衝突である。
**どちらも、私が課した条件どうしが噛み合っていない。**

**次の発注書で必ずやること。**
**破壊試験の各行について、「その操作をしたとき、自分が課した受入条件のうち何が赤くなるか」を書き出す。**
**狙った試験以外が赤くなる行があれば、それは破壊試験ではなく発注書の欠陥である。**
本発注では C-14 がそれだった。**件数と参照先を数える検算ではこの型は出ない。**

---

### 訂正 3（2026-09-03・着手後。**C-11 の裁定。ブロックの解除**）

**Terra が C-11 の回帰試験を安定して成立させられず、ゴールをブロックにした。**
**判断は妥当である。無理に通る形を作れば、それは偽合格になる。**

#### 詰まりの実体（**親担当が実測した。報告の推測ではない**）

1. **`tests/screen/history.test.tsx` は `App` を一度も mount していない。**
   `History` と `Home` を直接 mount している。**したがって `main.tsx` の `history-loading` を消しても、この file は何も感じない。**
2. **`App` を回す土台は `tests/screen/main-wiring.test.tsx` にしか無い**
   （`fetch` の差し替え・`poems.json` の読み込み・`act` の二重フラッシュ）。
   **そして §1 はその file を「1 行も触らない」としている。**
3. **既存の `result-loading` の試験は、`listEvents` の呼び出し回数を数えて 3 回目だけ止めている**
   （`main-wiring.test.tsx` の `if (calls <= 2) return []`）。
   **回数依存は、無関係な場所が `listEvents` を 1 回増やしただけで壊れる。**
   History は呼び出し順序が違うので、この手法をそのまま持ってこられない。**ここが「安定しない」の正体である。**

**したがって C-11 は Terra の力量の問題ではない。発注書が土台を用意していなかった。私の誤りである。**

#### 裁定: **`history.test.tsx` の中で `App` を mount してよい。回数ではなく「門」で止める。**

**§1 は `main-wiring.test.tsx` を触ることを禁じているだけで、`history.test.tsx`（本発注の新規 file）が
`App` を mount することは禁じていない。禁じる意図も無い。** 明示的に許可する。

**呼び出し回数を数えないこと。** 代わりに、**test 側が持つ真偽値で門を開閉する。**
mount 中の `listEvents` は素通しし、**ボタンを押す直前に門を閉じる。**
これで「Home が mount 時に何回 `listEvents` を呼ぶか」に依存しなくなる。

#### 親担当が実測で確かめた成立する形（**そのまま使ってよい。動くことを 2 方向で確認済み**）

```tsx
const base = createMemoryPort();
let gate = false;
let release: (() => void) | undefined;
const port = { ...base, listEvents: async () => {
  if (!gate) return [];                                    // mount 中は素通し
  return new Promise<readonly []>((resolve) => { release = () => resolve([]); });
}, saveLocalReport: async () => true };

// fetch を差し替えて App を mount する（poems.json だけあれば足りる。
// 問題データは空配列でよい——「これまでの記録」は entry-actions の外にあるので
// 問が 0 件でも描画される。裁定 10）
// ... render(<App port={port} />, root) と act の二重フラッシュ ...

const button = Array.from(root.querySelectorAll('button')).find((b) => b.textContent === 'これまでの記録');
expect(button).toBeTruthy();                               // ← 導線が無ければ先へ進めない

gate = true;                                               // ここで門を閉じる
await act(async () => { button!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
expect(root.textContent).toContain('記録を読み込んでいます。');   // ← C-11 が守る対象

await act(async () => { release!(); await Promise.resolve(); });
expect(root.textContent).toContain('まだ記録がありません');       // ← 解放後は History が出る
```

**親担当が実測した 2 方向の結果**（`d96ea116…` の `main.tsx` に対して）:

| 状態 | 結果 |
|---|---|
| `history-loading` の行がある | **緑** |
| `history-loading` の行を削除（C-11 の破壊） | **赤**（`記録を読み込んでいます。` の assert で落ちる） |

**破壊後の `main.tsx` は `cp` で復元し、`d96ea116dbaadeff43e3b3c9efaf90ccd60081e288dc0cbc9f978621a69cde2b` に戻ることを確認した。**
**使い捨ての試験 file は削除済みで、作業ツリーは Terra が残した 14 件のままである。**

**最後の assert が「まだ記録がありません」なのは正しい。** `listEvents` が空配列を返すので
`summarizeHistory` は `isEmpty: true` を返し、History は空状態を描く（裁定 9）。
**「全100首」を期待すると落ちる**——親担当も最初これで 1 回落とした。**イベントを積みたいなら `release` で
返す配列に入れること。**

#### 変更点

| 箇所 | 変更 |
|---|---|
| §1 の「絶対に変更しない」 | `main-wiring.test.tsx` は引き続き変更禁止。**ただし `history.test.tsx` から `App` を mount することは許可する**（file を触るわけではない） |
| §5.1 の C-11 | 内容は変わらない。**土台の作り方を上に示した** |
| §5.2 | **回数依存の stub を書かないこと**を追加。`if (calls <= 2)` の形は、無関係な変更で壊れる |

#### 親担当の記録（訂正 3）

**訂正 1・2 と同じ型が 3 度出た。** 今回は「破壊試験が要求する観測点」と
「その観測点を持つ file を触ることの禁止」の衝突である。

**次の発注書で必ずやること（訂正 2 の手順に 1 行足す）。**
**破壊試験の各行について、「それを赤にする試験は、どの file に書けるか」を書き出す。**
**書ける file が §1 で禁止されていたら、その時点で発注書の欠陥である。**
**本発注では C-11 がそれだった。**

**なお、既存の `main-wiring.test.tsx` の `if (calls <= 2)` は壊れやすい。**
**本発注の対象外である**（変更禁止）。**次の発注で門方式へ移すこと。**
