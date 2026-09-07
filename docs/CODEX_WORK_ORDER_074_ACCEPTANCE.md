# 発注074 検収書（V-1）

- 作成：2026-09-07。**実装担当（Opus 5）が書いた引き継ぎである。検収者はこの文書の数値を信用しないこと。**
- **基準線は commit `de50841`。実装はその上の4コミットとして載っている**（2本目は検収 V-1 の指摘への対応、3本目は文言の修正、4本目は裁定の記録）。本書で基準線を書くのはここ1か所だけである。
- **検収者は実装しなかったセッションであること**（発注074 §22）。この文書を読んだだけでは実装側にならない。

---

## 0. 検収者の立場（**最初に読む**）

- **直さない。測る。** 赤が出たら直さずに記録して止まる。実装担当の報告が誤っていることが分かるのが検収の成果である。
- **報告の数値を転記しない。** 下の期待値は「実装担当がそう主張している」だけである。**必ず再実行して自分の目で数える。**
- **想定外の差分を見つけたら、消す前に誰が書いたか確かめる。** この作業ツリーには Codex と Opus の両方が書いている。
- **`git commit` / `git push` はしない。**
- **検収を途中で止めると、当てた破壊が作業ツリーに残る。** 2026-09-07 に実際に起きた。
  **次の検収者は、始める前に `git status --short` が空であることを必ず確かめること。**
  空でなければ、内容を見て「前の検収者の破壊」か「実装担当の編集」かを同定してから戻す。
- **検収の最中、実装担当は作業ツリーに書かない。** 2026-09-07 の再検収では、実装担当が並行して編集し、
  **検収者が当てた破壊を `git checkout` で消してしまった。** 破壊試験と編集は同じファイル空間で競合する。
  `git status --short` が空にならないときは、**消す前に誰が書いたかを確かめて止まること。**

---

## 1. いま何が終わっていて、何が終わっていないか

**発注074 の17工程すべてが実装済みで、受入条件に未達は無い。** 裁定待ちの項目も無い。

工程17 は、発注書が想定していなかった方法で満たしている。**受入条件は緩めていない**（§5）。

---

## 2. 差分の範囲（**これ以外に差分があれば異常**）

**作業ツリーは clean であること**（`git status --short` が空）。実装は基準線の上の**4コミット**である。

```bash
git log --oneline de50841..HEAD
git diff --stat de50841..HEAD
```

**差分が次の31件であること。増減があれば止まって報告する。**

**新規（5件）**

```
docs/CODEX_WORK_ORDER_074_ACCEPTANCE.md
packages/hyakunin/src/ui/settings.ts
tests/screen/order074-contract.test.tsx
tests/screen/order074-screens.test.tsx
tests/screen/settings-source.test.tsx
```

**変更（26件）**

```
docs/APP_SPEC.md
docs/CODEX_WORK_ORDER_074.md
docs/HANDOFF.md
packages/hyakunin/src/domain/review.ts
packages/hyakunin/src/main.tsx
packages/hyakunin/src/styles.css
packages/hyakunin/src/ui/screens/Home.tsx
packages/hyakunin/src/ui/screens/RangePicker.tsx
packages/hyakunin/src/ui/screens/Result.tsx
packages/hyakunin/src/ui/screens/Session.tsx
packages/shared/src/release-notes.ts
packages/shared/src/ui/components/GradePicker.tsx
tests/screen/device-findings.test.tsx
tests/screen/home.test.tsx
tests/screen/main-wiring.test.tsx
tests/screen/order069-contract.test.tsx
tests/screen/order073-contract.test.tsx
tests/screen/range-picker.test.tsx
tests/screen/restore.test.tsx
tests/screen/result.test.tsx
tests/screen/review-flow.test.tsx
tests/screen/session.test.tsx
tests/screen/stats-onboarding.test.tsx
tests/unit/readme-claims.test.ts
tests/unit/review.test.ts
tools/overflow-check/index.ts
```

**§18 の変更境界に入っていないファイルが3つある。いずれも裁定の対象である。**

| ファイル | 事情 |
|---|---|
| `packages/shared/src/release-notes.ts` | 工程3 本文が定義の削除を求めている。境界の一覧には無い |
| `docs/CODEX_WORK_ORDER_074.md` | 「実装担当記入」欄への追記。発注書自身が記入欄を持つ |
| `docs/CODEX_WORK_ORDER_074_ACCEPTANCE.md` | 本書。依頼者の指示で新規作成した |

---

## 3. 走らせるもの（**この順で**）

```bash
npm test && npm run lint && npm run typecheck && npm run data:check && npm run scan:publish && npm run check:eol && npm run check:font-weight
```

そのあと、**必ず build のあとに** overflow を回す。**実行中にビルドし直さない。**

**先にポート4173に残留が無いことを確かめる。** 前のセッションの preview サーバが生きていると、
走査器は自分で「ポート 4173 は使用中です」と落ちる（**正しい門である**。古いサーバを測らないための門）。
`TIME_WAIT` だけなら数十秒で消える。`LISTENING` があれば、その PID を止めてから始める。

```powershell
netstat -ano | Select-String ":4173"
npm run build
npm run check:overflow
```

### 3.1 期待値（**数を自分で読むこと**）

| 検査 | 期待 |
|---|---|
| `npm test`（node） | pass **526**・fail 0 |
| `npm test`（画面） | **24 files / 262件** すべて緑 |
| `lint` / `typecheck` | 出力なし・exit 0 |
| `data:check` | exit 0 |
| `scan:publish` | 走査 **758** 件・違反 0 |
| `check:eol` | 走査 **1115** 件・違反 0（`git ls-files` を走査するので、新規5ファイルを含む） |
| `check:font-weight` | 走査画面 4 件・テキスト要素 **51** 件・違反 0 |
| `check:overflow` | **exit 0**・**全群 違反0**（下表の件数どおり） |

`check:overflow` の走査群と件数（**件数の門が入っているので、足りなければ自分で落ちる**）：

| 群 | 件数 |
|---|---|
| 閲覧画面（100首 × 3表示 × 6幅） | 1800 |
| 拡大時 | 12 |
| 初回設定ダイアログ | 12 |
| 出題画面（練習） | 12 |
| **本番の出題画面（本発注で新設・穴埋め/作者）** | **24** |
| 作者問題 | 12 |
| 復元カード | 24 |
| 057の新しい表示 | 24 |
| 本番採点一覧 | 12 |
| 本番の範囲選択 | 24 |

**合否は exit code と各群の行で読むこと。**
**末尾の「合計 1800 件、合格 1800 件、不合格 0 件（違反 0 件）」と「全件合格」は、閲覧画面だけの別カウンタである。**
他の群が赤でもこの2行は出る。**この行だけを見て合格と判断しない**（検収 V-1 の指摘）。

**`check:overflow` は exit 0 で終わる。違反が1件でも出たら、実装担当の報告が誤っている。**

---

## 4. 破壊試験の再現（**要約を信じず、自分で当てる**）

**19件すべてを回す必要はない。最低でも次の5件を自分で当て直すこと。**
壊したあとは `git checkout -- <file>` で戻す（実装はコミット済みなので、これで基準の状態に戻る）。
**戻したことを `git status --short` が空であることで必ず確かめる。**

```bash
# …置換して npm test…
git checkout -- packages/hyakunin/src/main.tsx
git status --short   # 空であること
```

| # | 置換前 → 置換後 | 期待する赤 |
|---|---|---|
| 1 | `main.tsx`：`const [settings, setSettings] = useState<UserSettings \| null>(null);` → 既定値リテラル（`{ key: 'user', reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false, noticeConfirmed: false }`）。あわせて `<Home port={port} onSettings={setSettings}` → `<Home port={port}` | **4件**：074-1a／1b／1c／1d |
| 14 | `review.ts`：`(question.type === 'blank' && !/＿+/.test(question.prompt))` → `question.type !== 'blank' \|\| !/＿+/.test(question.prompt)` | **1件**：[node]「再確認は指定された穴埋めと作者問題を残し、空欄のない穴埋めや壊れた問題を拒否する」 |
| 15 | `review.ts`：門の条件を `planned.some((question) => !question)` だけにする | **2件**：review-flow の拒否側／[node] 同上 |
| 11 | `Session.tsx`：`{item.type !== "author" && hasKanaDifference(item) && (` → `{hasKanaDifference(item) && (` | **1件**：074-12a |
| 18 | `styles.css`：`.poem-sheet--vertical { width: min(100%, 30rem); margin-inline: auto; }` → `margin-inline: auto;` を外す（**発注073 の当て直し**） | **1件**：073-1（**単独のまま**であることを確かめる） |

残り14件の結果は `docs/HANDOFF.md` 冒頭の実装記録にある。**赤が2件以上になったもの（5・7・10・15・16・19）は、同じ主張が複数の試験に元からあるためで、実装担当はそれを承知で残している。**
とくに **19（初回設定の DOM 順）の重複は `de50841` に既存**である（`tests/screen/stats-onboarding.test.tsx` の 073-4 と `order073-contract.test.tsx` の 073-4a）。074 の釘は関与していない。

### 4.1 **道具を疑う（実装担当が実際に踏んだ2件）**

- **`node --test` の既定の出力は TAP ではない。** 破壊試験の結果を `not ok` で拾うと、**node 側の赤を1件も拾えないまま「0件赤」と出る。** `--test-reporter=tap` を使うこと。
- **破壊試験の復元は、バックアップを取ったあとの修正を巻き戻す。** 実装担当はこれで `answer-retained__label` の修正を一度失った。**`npm test` では気づけない**（この条件を見ているのは `check:overflow` の `retainedInputFillsRow` だけ）。破壊試験のあとは必ず `git diff` で作業ツリーを確かめること。

---

## 5. 工程17 をどう満たしたか（**受入条件は緩めていない**）

**`darken` だけでは満たせなかった。** 手描きの原画の地色は純白ではなく中間色の灰（246,246,246）で、
本文の背景は暖色（251,246,238）である。`darken` は各成分の暗いほうを採るので、
**R が 5 暗い成分だけ残り、わずかに暗い四角**が見えていた（外周の最大の差 10／255）。

**描画時に画像を 5% 明るくしてから `darken` させる**と、地色が背景の上へ持ち上がり、`darken` が背景そのものを選ぶ。

```css
.feedback-mark img, .perfect-mark img { mix-blend-mode: darken; }
.feedback-mark img, .perfect-mark img { filter: brightness(1.05); }
```

| `brightness()` | 外周の最大の差 | 線の濃さ | 背景と完全一致した画素 |
|---|---|---|---|
| 1.0 | **10** | 154 | 41% |
| 1.04 | 1 | 151 | 95% |
| **1.05（採用）** | **0** | 150 | 95% |
| 1.10 | 0 | 146 | 95% |

**画像（`assets/feedback/**`）の差分は0行である。** 代償は線が 2.6% 薄くなることだけ。
`check:overflow` の `feedbackMarkCornerMatchesBackground` は**厳密一致のまま**で、違反0で通る。

**検収で確かめること**：`tools/overflow-check/index.ts` が **`mix-blend-mode` だけでなく `filter` も読んで**
合成していること（`markStyle.filter` を `context.filter` へ渡す行）。**片方だけでは画面と違う色を測って緑になる。**
`--color-paper` を暗くすると 1.05 の余裕は失われる。そのときは走査が落ちる。

## 6. 実装担当が自分で見つけて上げていること（**検収で確かめる対象**）

| # | 内容 |
|---|---|
| 1 | **`check:overflow` に `--quick`（走査を1首2幅＝12件へ縮める）が入っていたので差し戻した。** `tools/overflow-check/index.ts` に `quick` の文字が無いこと、`const widths = [320, 375, 414, 768, 1024, 1440];` と `const expectedCases = 1800;` が literal で書かれていることを確かめる |
| 2 | **工程1 で設定が保存されるようになった副作用**：走査が横書きのまま次の回へ入ると、縦書きのつもりで横書きを測る。`ensureVertical()` で揃えている。**これが無いと出題画面14件・作者問題28件の違反が出るが、実装の不具合ではない** |
| 3 | **工程3 ㉓は「バージョンのみ」である。** 版の行ごと消してはいない。ホームのフッタに `0.1.0` が出ること |
| 4 | **工程12 は枠が4か所ある。** 紙の自己採点だけでなく、画面で答える側の△の枠も直してある |
| 5 | **工程5 の探索結果は9か所**（該当2・修正済み、境界例2）。**一覧は `docs/HANDOFF.md` の074記録にある**（探し方と検索語つき）。**`RecordTransfer.tsx` と `Home.tsx` の `.entry-introduction` を「該当」と数えるなら3件になり、§20 の「止まる」条件に触れる。2026-09-07 の依頼者裁定で「数えない・監査で改めて裁定する」と決まっている**（`HANDOFF.md` の074記録） |
| 7 | **工程4・工程8 の釘は、検収 V-1 の指摘を受けて後から足した**（074-4／074-8、走査器の `horizontalRuleCount`）。**発注 §19 の破壊試験17件は、この2工程を1件も壊していない。** 足した釘が本当に効くかを、`.question-text` と `.answer-mode` の `border-block-end` を `border-block` へ戻して確かめること（**074-4 が赤・走査の `horizontalRuleCount` が 4本を報告する**）。なお「隣り合う線の位置が一致していないこと」を測る形は**常に緑になった**ので採らなかった（間隔は戻しても 42.6px のまま） |
| 6 | **線の本数（工程4）**：ホーム **6本 → 4本**、本番の設定面 **7本 → 4本**（実画面で計測。押せる部品の枠は数えていない） |

---

## 7. 発注書側の誤り（**直さずに記録してある**）

1. **§22 が「§12 の条件」と書いているが、停止条件は §20。**
2. **冒頭の基準線が `aea2acc` だが、発注は `de50841` で発行されている。**
3. **§17.2 の前提が誤り**（§5 の実測）。
4. **§3 は `KNOWN_LIMITATIONS` の定義削除を求めるが、§18 の変更境界に `packages/shared/src/release-notes.ts` が入っていない。**
5. **§12.2 は「枠は4か所」と書きながら、直す対象を紙の1か所しか示していない。**
6. **§19-10 の破壊は原理的に単独赤にならない**（既存の R-10・review-flow がボタンを文言で探すため）。実装担当は 074-1 系を器で探す形へ直し、6本→3本まで減らしている。

---

## 8. 止まって報告する条件

- **§3.1 の期待値と1つでも食い違ったとき。** 数を合わせようとしない。
- **`check:overflow` に違反が1件でも出たとき。**
- **§2 の差分一覧と増減があったとき。**
- **破壊試験で、期待した釘が赤くならなかったとき。** これは**釘が効いていない**という意味であり、実装が緑であることの証拠にならない。
- **`filter: brightness(1.05)` を「効いていない」と判断したとき。** 走査器が `filter` を読んでいるかを先に確かめる。

---

## 9. 引き渡し文

**基準線は冒頭に1か所だけ書いてある。ここでは繰り返さない。**
現在の保存済みプロジェクト（`C:/Users/user/AI開発/koten`）で検収してください。**実装は基準線の上の4コミットです。**
**破壊試験のあとは `git checkout -- <file>` で戻して構いません**（コミット済みなので未コミット差分を失う心配はありません）。
**新しい worktree を作らないでください**（`@koten/*` がワークスペースの symlink 経由で元リポジトリへ解決され、基準線の測定になりません。実装担当が実際に踏みました）。

**`check:overflow` は1回およそ12分かかります。** 資源の見積もりに入れてください。
**`npm run build` のあとに回し、実行中にビルドし直さないでください。**

検収者記入：未着手。
