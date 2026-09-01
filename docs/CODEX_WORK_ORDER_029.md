# Codex向け発注文書 029: 画面テスト基盤の新設（P7 の前提を埋める）

発注日: 2026-09-01（第13回セッション）
階層: **Terra**（**Luna では出さない。理由は §0.3**）
優先度: 高（**P7 はこれが無いと着手できない**）
対象: ルート `package.json` / ルート `vitest.config.ts`（新規） / `tests/screen/`（新規） / `.github/workflows/ci.yml`

> **出す順序に注意。** 本発注は**ルート `package.json` と `node_modules` を変える**。
> **発注026・027・028 と同時に走らせないこと。**
> 3 本の検収が済んでから単独で出す。理由は §0.4。

---

## 0. この発注の位置づけ（**先に読むこと**）

### 0.1 なぜ必要か

計画 P7 は `tests/screen/session.test.tsx` を要求している。**しかしそれを走らせる仕組みが無い。**
親担当が 2026-09-01 に実測した事実は次のとおりである。**調査し直さなくてよい。**

| 事実 | 実測 |
|---|---|
| ルートの `npm test` | `node --experimental-strip-types --test "tests/**/*.test.ts"` **のみ**。`.tsx` は 1 件も拾わない |
| `packages/hyakunin/vitest.config.ts` | 存在するが **`test` 設定が無い**（`plugins: [preact()]` だけ） |
| `packages/hyakunin/package.json` | **`test` スクリプトが無い。** vitest は入っているが**一度も走っていない** |
| DOM 環境 | **無い。** `jsdom` も `happy-dom` も入っていない |
| `tests/unit/hyakunin-viewer-navigation.test.ts` | **ソース文字列の正規表現検査であり、描画結果を見ていない**（`docs/HANDOFF.md` 進度記録 2026-08-31 に記録済み） |

**したがって「画面が壊れていないこと」を機械で確かめる手段が、このリポジトリには 1 つも無い。**
これは裁定 **D-14 の 4**（「`Transfer.tsx` の描画確認は 012 の範囲外。導線接続と描画確認は P7 でまとめて行う」）が
先送りにしたものである。**本発注がそれを回収する。**

### 0.2 **この発注のいちばん危険な点（必ず読むこと）**

**走っていない試験 suite は、0 件で緑になる。**

発注015 で「5 つの検査が CI に配線されていなかった」ことが見つかり、
発注005 では「サーバ起動に失敗して 1 件も検査していない状態でも『1200 件合格』と出力する」道具が見つかった。
**本発注はまさにその形の事故を起こしやすい。**

**したがって受入の中心は「試験を書いたこと」ではなく、次の 3 つである。**

1. **新しい suite が実際に走っていること**（`npm test` の出力に件数が現れる）。
2. **わざと嘘の assert を書いたら赤くなること**（基盤の自己テスト）。
3. **suite が 0 件になったら気づけること**（下限アサート）。

**「画面テストを追加しました。全部緑です」は受け付けない。**

### 0.3 なぜ Terra か（**Luna へ振り替えないこと**）

**発注005 で、Luna は Playwright を導入できず、`tools/overflow-check` を一度も実行しないまま
「完成した」と報告した**（`docs/HANDOFF.md` 進度記録 第2回）。
**依存の導入は、失敗しても実装コードは書けてしまうため、報告と実測が乖離しやすい作業である。**
本発注は依存の導入そのものが本体なので **Terra で出す。**

### 0.4 なぜ単独で出すか

本発注は**ルート `package.json` と `node_modules` を変える。**
発注026・027・028 が同時に走っていると、それらの `npm test` / `typecheck` が
**依存の入れ替え中に落ちる**。回帰と区別がつかない。
**026・027・028 の検収が済んでから、単独で出すこと。**

---

## 1. 先に読むもの

| ファイル | 読む箇所 | 何のために |
|---|---|---|
| `package.json`（ルート） | `scripts` 全部 | **既存のスクリプト名と挙動を変えないため**（§3 の裁定 3） |
| `packages/hyakunin/vitest.config.ts` | 全部 | 既存の preact プラグイン設定 |
| `packages/hyakunin/src/ui/screens/Home.tsx` | 全部 | **描画対象。** `useState` / `useEffect` / `loadJson` / `localStorage` を使う |
| `.github/workflows/ci.yml` | 全部 | 配線先 |
| `docs/IMPLEMENTATION_PLAN.md` | §12.3（suite の分け方）、P7 の「対象テスト」 | `tests/screen/` の位置づけ |
| `docs/PUBLISH_MANIFEST.md` | §5.1 | **`tests/screen/` を公開物へ混ぜないこと** |

---

## 2. 変更境界

### 変更・作成してよいファイル

| ファイル | 変更の種類 |
|---|---|
| `package.json`（ルート） | **`devDependencies` に 1 件追加。`scripts` に 2 件追加、`test` を 1 行変更**（§3 の裁定 1・3） |
| `package-lock.json` | `npm install` の結果として変わる |
| `vitest.config.ts`（**リポジトリ直下・新規**） | §4.2 |
| `tests/screen/harness.test.tsx` | **新規。基盤の自己テスト**（§4.3） |
| `tests/screen/home.test.tsx` | **新規。既存 `Home.tsx` の描画試験**（§4.4） |
| `.github/workflows/ci.yml` | **変更しない見込み**（§4.5 を読んでから判断する） |
| `docs/LICENSE_AUDIT.md` | **追加のみ。** 新依存のライセンスを記録（§3 の裁定 2） |

### 絶対に変更しないファイル・領域

- **`packages/**` を 1 文字も変更しない。** とくに `Home.tsx`。
  **試験を通すためにアプリ側を書き換えることを禁じる。**
  `Home.tsx` が試験しにくい形であっても、**直さずに §6 で止まること。**
- `tools/**`、`tests/data/**`、`tests/unit/**`、`review/**`、`docs/**`（`LICENSE_AUDIT.md` を除く）
- **一次資料 Markdown 5 本と PDF。読み取りもしなくてよい。**
- **`packages/hyakunin/vitest.config.ts` と `packages/kanazukai/vitest.config.ts` を変更しない**（§3 の裁定 4）。
- **新しい npm 依存を 1 件を超えて入れない**（§3 の裁定 1）。

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1（D-27）: **新しい devDependency は `jsdom` の 1 件だけとする。**

**`@testing-library/preact` を入れないこと。** 描画と操作は次で足りる。

| 必要なもの | 使うもの | 追加依存 |
|---|---|---|
| DOM 環境 | **`jsdom`**（vitest の `environment: 'jsdom'`） | **これ 1 件だけ** |
| 描画 | `preact` の `render` | **無し**（既存の依存） |
| 状態更新の待ち合わせ | **`preact/test-utils` の `act`** | **無し**（preact に同梱） |
| 要素の取得 | `document.querySelector` / `textContent` | 無し |
| 操作 | `element.dispatchEvent(new Event('click', { bubbles: true }))` 等 | 無し |

理由: **依存は 1 件ごとに S-13（ライセンス・設定・費用の確認）を背負う。**
`@testing-library/*` は便利だが、`preact/test-utils` の `act` と素の DOM API で本発注の範囲は書ける。
**便利さのために依存を増やさない。** 必要になったら、そのとき理由つきで追加する。

**`happy-dom` を選ばないこと。** 速いが、実装差が出たときに「ブラウザではどうなのか」を
`check:overflow`（実 Chromium）と突き合わせる必要が生じる。**本数を増やさないため `jsdom` に固定する。**

### 裁定 2: **`jsdom` のライセンスを一次情報で確認し、`docs/LICENSE_AUDIT.md` へ記録する（S-13）。**

**記憶で「MIT である」と書かないこと。** `npm install` 後に
`node_modules/jsdom/LICENSE.txt`（無ければ `LICENSE`）を**実際に読み**、
ライセンス名・著作権表示・確認日を `docs/LICENSE_AUDIT.md` へ追記する。
**バージョンも書く**（`node -p "require('jsdom/package.json').version"`）。

**devDependency は公開物に含まれない**ため再配布条件は問題にならないが、**記録は残す。**

### 裁定 3: **既存のスクリプト名と挙動を壊さない。**

**`npm test` は今後も「全部の試験を走らせる」ものであり続ける。** ただし内訳を 2 本に割る。

```json
"test": "npm run test:node && npm run test:screen",
"test:node": "node --experimental-strip-types --test \"tests/**/*.test.ts\"",
"test:screen": "vitest run"
```

**`test:node` の中身は現在の `test` と 1 文字も違えないこと。**
発注026・027・028 の受入条件は `node --experimental-strip-types --test "<glob>"` を
直接使っており、**この形が変わると過去の発注書がすべて無効になる。**

### 裁定 4: **vitest の設定はリポジトリ直下に新規で置き、既存のパッケージ側設定を触らない。**

`packages/{hyakunin,kanazukai}/vitest.config.ts` は**将来パッケージ内の試験に使う余地を残す。**
本発注が使うのは**リポジトリ直下の新しい `vitest.config.ts` 1 本**である。

### 裁定 5: **`tests/screen/` を公開物に含めない。**

`docs/PUBLISH_MANIFEST.md` §5.1 は build 成果物の許可リストであり、`tests/` は元から対象外である。
**`npm run scan:publish` が走査 751 件・違反 0 件のままであることを確認する**（受入条件 A-8）。

---

## 4. 実装範囲

### 4.1 依存の追加

```bash
npm install --save-dev --save-exact jsdom
```

**`--save-exact` を付けること**（版が勝手に上がると、CI で「昨日は緑・今日は赤」が起きる）。

### 4.2 `vitest.config.ts`（リポジトリ直下・新規）

最低限、次を満たすこと。

- `@preact/preset-vite` の plugin を使う（既存のパッケージ側設定と同じ）。
- `test.environment` を `'jsdom'` にする。
- `test.include` を **`['tests/screen/**/*.test.tsx']`** にする。
  **`tests/**/*.test.ts` を拾わせないこと**（`test:node` と二重に走る）。

### 4.3 `tests/screen/harness.test.tsx` — **基盤の自己テスト（本発注の中心）**

**アプリを描画する前に、「この基盤は嘘をつかないか」を確かめる試験を置く。**

| 試験名（この名前を使うこと） | 内容 |
|---|---|
| `harness: a jsdom document exists` | `document.body` が存在し、`document.createElement('div')` が動く |
| `harness: preact renders into the document` | 素の component を `render` し、`document.body.textContent` に文字列が現れる |
| `harness: act flushes a state update` | `useState` を持つ component を描画し、`act` の中でボタンを押すと表示が変わる |
| `harness: localStorage is available` | `window.localStorage.setItem` / `getItem` が往復する（`Home.tsx` が使う） |

**この 4 本が緑にならない限り、§4.4 へ進まないこと。**
**進んでしまうと、アプリ側の不具合と基盤の不具合が区別できなくなる。**

### 4.4 `tests/screen/home.test.tsx` — 既存画面の描画試験

**`Home.tsx` を 1 文字も変えずに**描画できることを示す。

| 試験名（この名前を使うこと） | 内容 |
|---|---|
| `home: renders the product display name` | 描画後、`appConfig.products.hyakunin.displayName` が画面に現れる |
| `home: shows the range inputs` | 範囲の入力欄（`from` / `to`）が DOM に存在する |

**データ読み込み（`loadJson`）は非同期であり、jsdom には `fetch` の実体が無い場合がある。**
**読み込みに失敗して `ErrorScreen` へ倒れる場合、それを試験の期待値にしてよい**
（`Home.tsx` の設計どおりの挙動であり、D-08 の不変条件そのものである）。
**アプリ側を直して読み込みを通そうとしないこと**（§2・§6）。
**どちらの経路を期待値にしたかを、完了報告に必ず書くこと。**

### 4.5 CI 配線

**`.github/workflows/ci.yml` は `npm test` を既に呼んでいる。**
裁定 3 により `npm test` が `test:screen` を含むので、**配線は自動的に済む見込みである。**

**ただし「見込み」で終わらせないこと。** 受入条件 A-4 で、
**`npm test` の出力に画面 suite の件数が現れること**を実測して報告する。
**現れなければ配線されていない。** そのときは `ci.yml` へ明示的に足す。

---

## 5. 受入条件（**すべて機械判定できること**）

| # | 条件 | 判定方法 |
|---|---|---|
| A-1 | `npm run typecheck` / `npm run lint` が終了コード 0 | 各コマンド |
| A-2 | **`npm run test:node` の件数が着手時と同じ**（1 件も減っていない） | 着手時と完了時の 2 回。**減っていたら既存試験を壊している** |
| A-3 | **`npm run test:screen` が 6 件以上 pass / 0 fail** | コマンド。§4.3 の 4 本 ＋ §4.4 の 2 本 |
| A-4 | **`npm test`（統合）の出力に、node 側と画面側の**両方の**件数が現れる** | 出力そのままを報告に貼る。**§4.5 の配線確認である** |
| A-5 | **新しい devDependency が `jsdom` の 1 件だけ** | `git diff package.json` の出力そのままを貼る。**2 件以上なら不合格**（裁定 1） |
| A-6 | **`docs/LICENSE_AUDIT.md` に `jsdom` の版・ライセンス名・著作権表示・確認日がある** | 追記した箇所を報告に貼る。**`node_modules/jsdom/LICENSE*` を実際に読んだ内容であること**（裁定 2） |
| A-7 | **`packages/` に差分が無い** | `git status --porcelain packages` が空。**アプリ側を試験のために直していないこと** |
| A-8 | `npm run scan:publish` が走査 751 件・違反 0 件 | コマンド（裁定 5） |
| A-9 | `npm run data:check` が終了コード 0 | コマンド |
| A-10 | **`test:node` の中身が現在の `test` と 1 文字も違わない** | `git diff package.json` を貼る（裁定 3） |

### 5.1 破壊試験（**受入の中心。ここが本題である**）

**新しい基盤が「嘘をつかない」ことを示す。**
**壊したら必ず元へ戻し、戻した後の `git status --porcelain` を報告に貼る。**

| # | 壊し方 | 期待 |
|---|---|---|
| **B-1** | `harness.test.tsx` の `act` の試験の期待値を、**わざと違う文字列**にする | **その 1 本だけが赤くなる。** 他の 5 本は緑のまま |
| **B-2** | `home.test.tsx` の期待文字列を**わざと違う文字列**にする | **その 1 本だけが赤くなる** |
| **B-3** | `vitest.config.ts` の `environment` を `'node'` に変える | **DOM を使う試験が赤くなる**（`document is not defined` 等）。**緑のまま通ってはならない** |
| **B-4** | `vitest.config.ts` の `test.include` を、**1 件も一致しないパターン**にする | **`test:screen` が「0 件で成功」になるかどうかを実測して報告する。** なるなら **A-11 を追加実装すること**（下記） |
| **B-5** | `package.json` の `test` から `&& npm run test:screen` を落とす | **`npm test` の出力から画面 suite の件数が消える。** これが「配線されている」ことの証明である |

#### A-11（**B-4 の結果しだいで必須になる**）

**vitest が「0 件で成功」を返すなら、それを塞ぐこと。**
`vitest.config.ts` に **`test.passWithNoTests: false`** を置く（既定で false なら、そのことを実測して報告する）。

**理由: 走っていない suite が緑を返すのは、発注005 で実際に起きた事故と同じ形である。**
**「1 件も走らなかった」と「全部通った」を、出力で区別できなければならない。**

**どれかが期待どおりにならなかった場合、「全部緑でした」と報告せず、
どれがどうならなかったかを報告して止まること。**

### 5.2 実行環境の注意（Windows）

- **`npm run check:overflow` を走らせないこと**（ポート 4173 を占有する。本発注と無関係である）。
- `jsdom` はネイティブビルドを含まない。**ビルドツールの導入は要らない。**
  **要ると判断したら §6 で止まること。**

---

## 6. 停止して報告する条件

- **`Home.tsx` を直さないと試験が書けないと判断した。** **直さずに**止まり、何をどう直したいかを報告する。
  **これは実装の設計上の問題である可能性が高く、親担当が判断する。**
- **依存が `jsdom` 1 件で済まないと判断した。** **入れずに**止まり、何が足りないかを報告する。
- **`test:node` の書き方を変えないと統合できないと判断した。** **変えずに**止まる（裁定 3。過去の発注書が無効になる）。
- **`jsdom` の `LICENSE` ファイルが見つからない、または内容が読めない。** **記憶で補わずに**止まる（S-13）。
- §2 で許した以外のファイルが必要になった。**作らずに**止まる。
- ネイティブビルドツール（`node-gyp` 等）の導入が必要になった。**入れずに**止まる。

---

## 7. 完了報告に含めること

1. **着手時と完了時の `npm run test:node` の件数**（両方。**減っていないこと**）。
2. `npm run test:screen` の件数と、`npm test`（統合）の出力**そのまま**。
3. `git diff package.json` の出力**そのまま**（A-5・A-10）。
4. **`docs/LICENSE_AUDIT.md` へ追記した内容**と、**読んだ `LICENSE` ファイルのパス**。
5. **破壊試験 B-1〜B-5 の一覧と、それぞれの実測結果**
   （**B-4 は「0 件で成功したか否か」を明記する。A-11 を実装したなら、その内容も**）。
6. **§4.4 でどちらの経路を期待値にしたか**（データ読み込み成功／`ErrorScreen` へ倒れる）。
7. `npm run typecheck` / `lint` / `data:check` / `scan:publish` の結果。
8. `git status --porcelain` の出力そのまま（**`packages/` が空であること**）。
9. **判断に迷って自分で決めた事項があれば、全部列挙する。**
