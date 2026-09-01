# Codex向け発注文書 035: `main.tsx` の配線を試験可能にし、残った試験の穴 2 件を塞ぐ

発注先: **Terra**
親担当: Claude Opus（第16回セッション）
発注日: 2026-09-02
基準となるコミット: **`ae72911`**（発注032・033 の検収完了後。作業ツリー clean）

---

## 0. この発注の位置づけ（**先に読むこと**）

発注032・033 の検収で、**どの試験も捕まえない穴が 2 件残った。** それを塞ぐのが本発注である。

| 穴 | 内容 |
|---|---|
| **(a)** | **`?from=10&to=20` から一問目までの通し試験が無い。** `session.test.tsx` は `Session` へ fixture を直接渡し、`range-picker.test.tsx` は範囲を props で受けてそのまま返すことを見るだけである。**範囲が失われる事故を、現在どの試験も捕まえない** |
| **(b)** | **裁定 6 の設定移行（`localStorage` の `hyakunin:orientation` の引き継ぎ）に試験が無い。** 実装は `Home.tsx` にあるが、032 でも 033 でも試験されていない |

**(a) を塞ぐには `main.tsx` を変更しなければならない。** 理由は §3 の裁定 1 に実測とともに書いた。
そのついでに、**`main.tsx` の実在する配線欠陥を 1 件直す**（裁定 3。親担当が実測で証明済み）。

- **発注034（P8-A 純関数）と並行して走らせてよい。** 対象ファイルが 1 件も重ならない。
- **`npm test` の総件数は判定材料にならない**（2 本が同時に増やすため）。
- 034 は `SessionPort` に `listEvents()` を足す。**本発注の試験は `createMemoryPort()` を
  分割代入（`{ ...createMemoryPort(), saveLocalReport }`）で使うこと。**
  そうすれば 034 が口を足しても足さなくても `typecheck` が通る。**port を手書きで全部並べないこと。**

### 着手前に必ず確認すること

`git log --oneline -1` が `ae72911` 以降であること。
`sha256sum packages/hyakunin/src/main.tsx tests/screen/no-pressure.test.tsx` を数十秒あけて 2 回取り、
**変動していないこと**（親担当や他の発注が破壊試験を走らせている窓に当たると、赤は回帰と区別できない）。

---

## 1. 変更境界

### 変更・作成してよいファイル

| ファイル | 扱い |
|---|---|
| `packages/hyakunin/src/main.tsx` | **変更**（裁定 1・2・3 の範囲だけ） |
| `tests/screen/main-wiring.test.tsx` | **新規作成**（穴 (a)） |
| `tests/screen/settings-migration.test.tsx` | **新規作成**（穴 (b)） |
| `tests/screen/no-pressure.test.tsx` | **追記のみ**（裁定 5。既存 3 試験の中身を変えない） |

### 絶対に変更しないファイル・領域

| 対象 | 理由 |
|---|---|
| `packages/hyakunin/src/ui/**` | **`Home.tsx` を含め 1 文字も触らない。** 発注032・033 で検収済み |
| `packages/hyakunin/src/domain/**` | **発注034 が並行して触っている。** 衝突する |
| `packages/hyakunin/src/data/**` | 生成物とスキーマ。触らない |
| `packages/shared/**` | 検収済み。読むだけ |
| `tests/screen/{entries,harness,home,range-picker,restore,session,viewer}.test.tsx` | 検収済みの 34 件。**中身を変えない** |
| `tests/unit/**` | 発注034 の領域 |
| **`vitest.config.ts`** | **裁定 4。設定で解決しない** |
| `package.json` / `tsconfig.base.json` | 依存も設定も増やさない |
| `review/**` / `docs/**` / 一次資料一式 | 憲章 §3・S-1 |

### 発注034 との分離（**並行実行の根拠**）

- 034 = `domain/{result,session,ports}.ts` ＋ `ui/adapters/indexeddb-port.ts` ＋ `tests/unit/`
- 035（本発注）= `main.tsx` ＋ `tests/screen/`

**1 件も重ならない。**

---

## 2. 先に読むもの

| 順 | 文書・ファイル | 何のために |
|---|---|---|
| 1 | `packages/hyakunin/src/main.tsx` | 現在の配線（33 行） |
| 2 | `packages/hyakunin/src/ui/screens/Home.tsx` | 範囲の解釈と設定移行の実装（**読むだけ。変更しない**） |
| 3 | `tests/screen/session.test.tsx` | 既存の画面試験の書き方（`act` の使い方・mount の作法） |
| 4 | `tests/screen/no-pressure.test.tsx` | 否定アサーションの作法 |
| 5 | `docs/APP_SPEC.md` §4・§5.1 | 範囲URLと回の流れの正本 |

---

## 3. 裁定済み事項（**これに従う。決め直さない**）

### 裁定 1（D-43）: **`App` をエクスポートし、`render()` の呼び出しをマウント先の存在で条件づける。**

**実測（2026-09-02、親担当）**: `main.tsx` を画面試験から import すると次で落ちる。

```
TypeError: Cannot read properties of null (reading '__k')
  at main.tsx:33  render(<ErrorBoundary><App /></ErrorBoundary>, document.getElementById('app')!)
```

試験環境に `#app` が無いため `getElementById` が `null` を返し、非 null 表明 `!` がそれを通してしまう。
**したがって通し試験は、`main.tsx` を変えずには 1 行も書けない。**

次の 2 点だけを行う。

```ts
export function App({ port = defaultPort }: { port?: ApplicationPort } = {}) { /* 既存の中身 */ }

const mount = document.getElementById('app');
if (mount) render(<ErrorBoundary><App /></ErrorBoundary>, mount);
```

- **`!`（非 null 表明）を使わない。** 落ちるべきでない場所で落ちる。
- **`if (mount)` を `?.` や `??` で書き換えない。** 分岐が読めることに意味がある。
- **本番の挙動を変えないこと**——`index.html` には `#app` があるので、`mount` は常に真である。

### 裁定 2（D-44）: **`App` は port を props で受け取り、既定引数で本物を使う。**

D-35 は「本物への接続は `ui/adapters/indexeddb-port.ts` の 1 ファイルだけが行う」と定める。
**この裁定はそれを緩めない。** 本物を作る場所は 1 箇所のままで、**注入点を作るだけ**である。

```ts
const defaultPort = createIndexedDbPort();
```

- **`vi.mock` で保存層を差し替えてはならない**（D-35）。試験は `createMemoryPort()` を props で渡す。
- **既定引数にすること。** `port` を必須にすると `main.tsx` 末尾の呼び出し側にも書く必要が生じ、
  本番経路が試験の都合で変わる。

### 裁定 3（D-45）: **セッションの生成を、描画中から状態遷移へ移す。**

**これは実在する欠陥である。親担当が probe で実測した。**

現在の `main.tsx` は `screen === 'session'` の分岐の**描画中に**次を実行している。

```ts
const sessionId = crypto.randomUUID();                    // main.tsx:27
void port.saveSession(createSession({ sessionId, ... })); // main.tsx:28
```

`Session` は `onSettings={setSettings}` を受け取っているので、**学習中に読み表示を切り替えると
`App` が再描画され、この 2 行がもう一度走る。** 実測: 保存回数が 1 → 2 に増え、
`sessionId` が `id-0` → `id-1` に変わった。

**帰結は 2 つあり、どちらも実害である。**

1. **回の途中で `sessionId` が変わる。** `Session` は `sessionId` を props から直接 `buildEvent` へ渡すため、
   切替の前後でイベントの `sessionId` が食い違う。
   **`computeMastery` は同一回の再回答を `sessionId` + `questionId` で数えており（加点半分・`APP_SPEC` §8.1）、
   この判定が壊れる。**
2. **未完了セッションが溜まり続ける。** `loadLastSession` は `!completed` の最後の 1 件を返すため、
   「前回の学習を復元しますか」が指すものが実際の中断地点でなくなる。

**直し方**: `sessionId` とセッションの保存を、`RangePicker` の `onStart`（＝ `screen` を `'session'` へ
移す遷移）で 1 回だけ行い、結果を `selected` と同じ state へ載せる。**描画中に副作用を書かない。**

- **`planQuestions` の呼び出しも描画中から出すこと**（同じ理由。`Math.random()` を含む `createSeed` が
  再描画のたびに別の種を作る）。
- **`useEffect` で書かないこと。** 遷移のハンドラで行う。`useEffect` にすると、
  「描画 → 効果 → 保存」の順になり、**保存前に 1 問目が描かれる**窓ができる。

### 裁定 4（D-46）: **画面試験で `localStorage` が要るときは、試験の中で差し込む。`vitest.config.ts` を触らない。**

**実測（2026-09-02、親担当）。この環境の jsdom では `window.localStorage` が使えない。**

```
'localStorage' in window = true     ← 定義はある
window.localStorage      = undefined ← 読むと undefined
sessionStorage           = object    ← こちらは正常
location.origin          = http://localhost
```

原因は jsdom の欠落ではない。**Node 26 の実験的グローバル `localStorage`
（`--localstorage-file` 未指定のため `undefined`）が jsdom の定義を覆っている。**
試験実行時に毎回出ている `ExperimentalWarning: localStorage is not available because
--localstorage-file was not provided` がその正体である。

**`HANDOFF §6` の「jsdom に `localStorage` はある」という記録は、素の `new JSDOM()` での実測であって、
vitest の jsdom 環境には当てはまらない。本裁定が優先する。**

**回避策は試験の中の単純代入でよい**（親担当が実測で確認済み。代入も `defineProperty` も通り、読み戻せる）。

```ts
const store = new Map<string, string>();
(window as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => { store.set(key, value); },
  removeItem: (key) => { store.delete(key); },
  clear: () => store.clear(), key: () => null, get length() { return store.size; },
} as Storage;
```

- **`afterEach` で必ず後片付けすること**（他の試験へ漏らさない）。
- **`vitest.config.ts` に `--localstorage-file` や `globals` を足さない。**
  設定を変えると既存 37 件の実行条件が変わり、検収済みの結果が無効になる。

### 裁定 5: **`no-pressure` の禁止語に 3 語を足す。**

P8 の History 画面は「全体・学年別の集計を出さない」ことが受入条件である（計画 P8）。
**画面ができてから禁止するのでは順序が逆である。** 先に門を立てる。

`tests/screen/no-pressure.test.tsx` の `forbidden` 配列へ **1 つのパターンを足す**。

```
/平均|学年別|みんなの/
```

**「全体」を単独で禁止語にしてはならない。** 入口の表示名 `'全体確認'` が
`Home.tsx` と `RangePicker.tsx` に実在し、**既存が赤くなる**（親担当が実測で確認済み）。
**`平均` `学年別` `みんなの` の 3 語は現在 `ui/` に 0 件である**（同上）。

**既存の 3 試験の中身を変えないこと。** 配列へ 1 行足すだけである。

### 裁定 6: **通し試験は `fetch` を差し替えて、実際の読み込み経路を通す。**

**`Home.tsx` の `poems` / `questions` props は使わないこと。** それを使うと `loadJson` も
`parsePoems` も通らず、**「範囲が失われる事故」の経路の半分を飛ばしてしまう。**

`globalThis.fetch` を差し替え、`new URL(...)` の末尾のファイル名で応答を選ぶ。
**親担当が実測で成立を確認済みである**——`?from=10&to=20` で実データを読み、
閲覧の進捗表示が `10番 · 1/11首` になることまで通った。

```ts
(globalThis as unknown as { fetch: typeof fetch }).fetch = async (url) => {
  const name = String(url).split('/').pop()!;
  return { ok: true, status: 200, json: async () => JSON.parse(bodies[name] ?? '[]') } as Response;
};
```

- **`poems.json` は実物を読むこと**（`readFileSync` で `packages/hyakunin/src/data/generated/poems.json`）。
  fixture に差し替えると、100 首の実データで範囲が効くことを見なくなる。
- **`questions.blank.json` は fixture を返すこと。** 実物は `[]` であり、
  `isEntryAvailable` が `quick` を利用不可にするため**一問目へ到達できない**（D-28 の縮退。仕様どおり）。
  **fixture の問は必ず 10〜20 番の首に属させること。**
- **`afterEach` で `fetch` を元に戻すこと。**

---

## 4. 実装範囲

### 4.1 `tests/screen/main-wiring.test.tsx`（新規・穴 (a)）

**次の 4 本を書く。1 試験 1 目的とする**（計画 §12.3）。

| # | 試験名（この名前で書くこと） | 見るもの |
|---|---|---|
| 1 | `main-wiring: the range in the URL reaches the first question` | `?from=10&to=20` から `App` を描画し、入口を選び、`RangePicker` で開始したとき、**Session の 1 問目の首が 10〜20 番の範囲に入る** |
| 2 | `main-wiring: the range in the URL is not widened to the whole set` | 同じ経路で、**1 問目が 1 番や 100 番になっていないこと**（範囲喪失の直接の検出） |
| 3 | `main-wiring: an invalid range falls back to the whole set and says so` | `?from=abc&to=zzz` のとき全範囲へ戻り、**その旨が画面に出る**（`Home.tsx` の `hadInvalidQuery`） |
| 4 | `main-wiring: the session id does not change when settings change mid-session` | **裁定 3 の回帰試験。** 学習中に読み表示を切り替えても、`port` に保存されたセッションが **1 件のまま**であり、`sessionId` が変わらないこと |

**4 本目が裁定 3 の唯一の守りである。** `port.saveSession` の呼び出し回数を数えられる形で
memory port を包むこと（`createMemoryPort()` を分割代入し、`saveSession` だけ数える薄い包みにする）。

### 4.2 `tests/screen/settings-migration.test.tsx`（新規・穴 (b)）

**次の 3 本を書く。**

| # | 試験名 | 見るもの |
|---|---|---|
| 1 | `settings-migration: a stored orientation becomes the writing mode` | `localStorage` に `hyakunin:orientation = 'horizontal'` があり、保存済み設定が無いとき、**設定の `writing` が `'horizontal'` になって保存される** |
| 2 | `settings-migration: the legacy key is removed after migrating` | 移行後に `hyakunin:orientation` が `localStorage` から**消えている**（二度目に効かない） |
| 3 | `settings-migration: saved settings win over the legacy key` | **保存済み設定がある場合、`hyakunin:orientation` を読まない。** 保存済みの `writing` がそのまま残る |

**3 本目を落とさないこと。** これが無いと「常に移行する」実装（＝利用者の設定を毎回上書きする）が
通ってしまう。**2 本目と 3 本目は互いを代替しない。**

### 4.3 `packages/hyakunin/src/main.tsx`（変更）

裁定 1・2・3 のとおり。**それ以外を変えない。**
**画面の見た目・文言・クラス名を 1 文字も変えないこと**（既存 37 件が見ている）。

---

## 5. 受入条件（**すべて機械判定できること**）

**A-2・A-3 のコマンドは親担当が実際に走らせて確認済みである。そのまま使うこと。**

| # | 条件 | 判定コマンド |
|---|---|---|
| A-1 | 型・書式・生成物の検査が通る | `npm run typecheck` / `npm run lint` / `npm run data:check` がすべて終了コード 0 |
| A-2 | 画面試験が **45 件以上**（着手時 37 ＋ 新規 7 以上） | `npm run test:screen` |
| A-3 | Node 試験が**減っていない**（276 件以上・fail 0） | `npm run test:node` |
| A-4 | 2 製品の build が通る | `npm run build` が終了コード 0 |
| A-5 | `scan:publish` が **751 件・違反 0**（増えていない） | `npm run scan:publish` |
| A-6 | **`ui/` を 1 文字も触っていない** | `git status --porcelain -- packages/hyakunin/src/ui packages/shared/src/ui` が**空** |
| A-7 | **`domain/` と `tests/unit/` を触っていない**（発注034 の領域） | `git status --porcelain -- packages/hyakunin/src/domain tests/unit` が**空** |
| A-8 | **`vitest.config.ts` を触っていない**（裁定 4） | `git diff --exit-code vitest.config.ts` が終了コード 0 |
| A-9 | **既存 6 本の画面試験を触っていない** | `git status --porcelain -- tests/screen/entries.test.tsx tests/screen/harness.test.tsx tests/screen/home.test.tsx tests/screen/range-picker.test.tsx tests/screen/restore.test.tsx tests/screen/session.test.tsx tests/screen/viewer.test.tsx` が**空** |
| A-10 | **`main.tsx` に非 null 表明が無い**（裁定 1） | `grep -n "getElementById('app')!" packages/hyakunin/src/main.tsx` が **0 件** |
| A-11 | **`App` がエクスポートされている** | `grep -cn "export function App" packages/hyakunin/src/main.tsx` が **1** |
| A-12 | **`vi.mock` を使っていない**（D-35） | `grep -rn "vi\.mock" tests/screen/` が **0 件** |
| A-13 | **通し試験が `Home` の `poems` / `questions` props を使っていない**（裁定 6） | `grep -nE "poems=\|questions=" tests/screen/main-wiring.test.tsx` が **0 件** |
| A-14 | `review/` と生成物に差分が無い | `git status --porcelain review packages/hyakunin/src/data/generated` が**空** |
| A-15 | `package.json` を変えていない | `git diff --exit-code package.json` が終了コード 0 |
| A-16 | 一次資料のハッシュが不変 | `sha256sum 百人一首_*.md 古典文法_一次データ索引.md` が着手前と一致 |

### 5.1 破壊試験（**受入の中心。ここが本題である**）

**「試験を足しました。全部緑です」は受け付けない。**
下の 8 件を**自分で 1 件ずつ当て、対応する試験が名指しで赤くなることを確かめ、復元すること。**
**パッチの前後で `sha256sum` が変わったことを毎回確かめること。**

| # | 壊し方（**論理を 1 箇所だけ反転させる**） | 赤くなるべき試験 |
|---|---|---|
| **C-1** | `main.tsx` で `RangePicker` から受け取った範囲を捨て、`{ from: 1, to: 100 }` を渡す | `main-wiring:` の 1 番と 2 番 |
| **C-2** | `planQuestions` へ渡す番の一覧を、範囲でなく 1〜100 にする | `main-wiring:` の 1 番と 2 番 |
| **C-3** | `Home.tsx` を**触らずに**、`main.tsx` 側で `hadInvalidQuery` の経路を潰す（不正な範囲でも通知を出さない配線にする） | `main-wiring:` の 3 番だけ |
| **C-4** | 裁定 3 を戻す（セッション生成を描画中へ戻す） | **`main-wiring:` の 4 番だけ。****これが裁定 3 の唯一の守りである** |
| **C-5** | `Home.tsx` の設定移行の読み取りを**一時的に**無効化する（`hyakunin:orientation` を読まない） | `settings-migration:` の 1 番だけ |
| **C-6** | 移行後の `removeItem` を消す | `settings-migration:` の 2 番だけ |
| **C-7** | 保存済み設定があっても移行を優先する | `settings-migration:` の 3 番だけ |
| **C-8** | `no-pressure.test.tsx` の検査対象を**空配列**に差し替える | `no-pressure:` が**赤くなる**（発注032 の B-13 の性質が保たれていること） |

**C-3・C-5・C-6・C-7 は `Home.tsx` を一時的に触る。**
**測定が済んだら必ず復元し、`sha256sum packages/hyakunin/src/ui/screens/Home.tsx` が
着手前の値と一致することを完了報告に書くこと。** 着手前の値は次である。

```
0f6e47111c2e0de6afffd18db59a7fda196143bd82bd9a2e3178598eecefd999  Home.tsx
```

**C-8 が最重要である。** 否定アサーションは、検査対象が空でも緑になる。
**このプロジェクトはこの型の事故を 4 回踏んでいる。**

### 5.2 破壊試験の予告が外れたときの扱い（**隠さずに報告すること**）

**発注書の予告が誤っていた例が過去に 3 件ある**（030 の 2 件、032 の B-6、033 の C-4）。
**反転が下層のガードを経由して波及し、予告より多くの試験を赤にすることがある。**
たとえば C-4 は、裁定 3 を戻すと 4 番だけでなく他の試験も巻き添えにする可能性がある。

**そうなったら、それは試験の欠陥とは限らない。原因を特定して報告すること。**
**黙って予告に合わせて試験を書き換えてはならない**（それは受入条件の緩和である）。

### 5.3 実行環境の注意（Windows）

- **`--test` にディレクトリを渡すと動かない。** グロブを引用符つきで渡すこと。
- 画面試験は `npx vitest run tests/screen/main-wiring.test.tsx` のようにファイル単体で走らせられる。
- **`window.localStorage` は使えない**（裁定 4）。`sessionStorage` は使える。

---

## 6. 停止して報告する条件

| # | 条件 |
|---|---|
| **S-1** | `ui/` を恒久的に変更しないと受入条件を満たせないと判断した（**破壊試験のための一時的な変更は除く**） |
| **S-2** | `vitest.config.ts` を変えないと `localStorage` の試験が書けないと判断した |
| **S-3** | 新しい依存が要ると判断した |
| **S-4** | 裁定 1〜6 のいずれかが構造上実装できないと判断した |
| **S-5** | 破壊試験のどれかが「1 本も赤くならない」または「予告より多くを赤にする」 |
| **S-6** | `main.tsx` の変更が既存 37 件のどれかを赤くした（**本発注は既存を 1 本も赤くしてはならない**） |
| **S-7** | `docs/**` `review/**` 一次資料を変更する必要が出た |

**S-5 は不合格ではない。** 報告すれば正しい仕事である。

---

## 7. 完了報告に含めること

**次の 8 項目をすべて書くこと。欠けた完了報告は差し戻す。**

1. §5 の A-1〜A-16 の**実測値**（「成功しました」ではなく、コマンドの出力の数値）
2. §5.1 の破壊試験 C-1〜C-8 について、**壊し方・赤くなった試験名・復元後のハッシュ一致**の 3 点を 1 件ずつ
3. **C-4 と C-8 の結果を独立の節に書くこと**（それぞれ裁定 3 と偽合格封じの唯一の守りであるため）
4. **`Home.tsx` の SHA-256 が `0f6e4711…` に戻っていること**（C-3・C-5〜C-7 で一時的に触るため）
5. `git status --porcelain` の全文
6. `sha256sum packages/hyakunin/src/main.tsx tests/screen/*.tsx` の値
7. **独自に決めたこと**を 1 件残らず列挙する
8. **できなかったこと**があれば隠さずに書く。**「できませんでした」も実測で検証される**

**親担当は全コマンドを再実行し、破壊試験 8 本を自分で 1 件ずつ反転させて検収する。**
**報告の数値は転記しない。**
