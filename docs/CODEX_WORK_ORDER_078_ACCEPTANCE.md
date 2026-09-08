# 発注078 実装記録 — 「わからない！」の開示を「✓ 回答なし / 要確認！ / 正解」で示す

記録: 2026-09-08 / Claude Code（Opus 5、推論強度 medium 相当・既定設定）
状態: **実装済み・未コミット。** commit・push・公開は別指示まで行っていない。
**本書は実装者の記録である。独立検収は、実装していない別セッションが `docs/CODEX_HANDOFF.md` §2 の手順で行う。**

## 1. 基準線と完成差分

基準HEAD `44531daf449598937706ba70ac1d9caa69b63bde`（着手時・完了時とも同じ。コミットしていない）。

着手時の `git diff --numstat 44531da HEAD -- packages tests` は **0 行**、
作業ツリーの `git diff --numstat -- packages tests` も **0 行**であった。**他者の製品差分は無い状態で始めた。**

完成時の `git diff --numstat 44531da -- packages tests tools docs/APP_SPEC.md`：

```
1	1	docs/APP_SPEC.md
7	1	packages/hyakunin/src/styles.css
42	12	packages/hyakunin/src/ui/screens/Session.tsx
102	8	tests/screen/session.test.tsx
75	0	tools/overflow-check/index.ts
```

**発注書の変更境界に無い `tools/overflow-check/index.ts` を触っている。** 理由は受入条件9（実描画）で、
既存の走査群はどれも「わからない！」の開示行を通らないため、測る対象が存在しなかった。
足したのは新しい走査群 1 つだけで、既存の群の判定は変えていない。**境界外の変更として検収で確かめること。**

## 2. 採った実装

| 場所 | 変更 |
|---|---|
| `Session.tsx` §module | `UNANSWERED_FEEDBACK`（`mark: "check"`）を置いた。**`buildFeedback` は通していない**——通すと、判定の無い状態に誤答の判定を与えたように読める |
| `Session.tsx` `unanswered` | `phase === "revealed" && !submitted && judgement === null`。紙の自己採点は `judgement` が入るのでここへ来ない |
| `Session.tsx` 回答行 | `<div class="answer-field answer-unanswered">` に 見出し「自分の答え」／`FeedbackMark kind="incorrect" visualOnly silent`／`<p class="answer-unanswered__value">回答なし</p>`。**input・textarea・contenteditable・無効化した欄を一切置いていない** |
| `Session.tsx` 判定欄 | 「答えを確認しました。」を廃し、誤答と同じ `AnswerFeedback` を本文・作者の両方へ通した。作者は `isAuthor` で既存の正式名・読みの規則に乗る |
| `styles.css` | `.answer-unanswered .feedback-mark`（印の列）と `.answer-unanswered__value` を追加。行の高さの下限は回答欄と同じ `max(44px, 2.5rem)`。**文字縮小はしていない。** 死んだ `.unknown-feedback` を削除 |
| `tools/overflow-check` | 走査群「わからないの開示」を追加。幅6 × 文字2 × 歌本文/作者 ＝ **24 件ちょうど**の門つき |
| `docs/APP_SPEC.md` §7.3 | 077 の一行を、本文・作者・途中入力・保存失敗・本番を含む形へ書き直した |

## 3. 受入条件の結果

| # | 条件 | 結果 | 証拠 |
|---|---|---|---|
| 1 | 本文・保存成功 | 合格 | `session.test.tsx` 「078: 本文の「わからない！」は 回答なし → 要確認！ → 正解 の順に示す」。`正解：白妙の（しろたへの）` と順序（`compareDocumentPosition`）を直接見ている。「答えを確認しました」の不在も見る |
| 2 | 作者・保存成功 | 合格 | 「078: 作者の「わからない！」も同じ状態表示で正式名と読みを示す」＋既存の 077 試験（`正解：持統天皇　持統天皇`） |
| 3 | 通知の一意性 | 合格 | 「078: 「要確認！」の通知は一度だけ…」。`countOf('要確認！') === 1`、印は `aria-hidden="true"`・`aria-label` 無し・`img alt=""`、「回答なし」は `aria-hidden` の下に無い |
| 4 | 架空回答の禁止 | 合格 | 「078: 途中入力を自分の答えとして残さず、編集できる欄も作らない」。`.answer-controls input, textarea, [contenteditable]` が 0 件、`.answer-retained` が無い、`とちゅうまで` が画面に無い |
| 5 | 保存失敗 | 合格 | 「078: 保存に失敗したときは 回答なし・要確認！・正解を出さない」＋既存 2 試験。途中入力が `readOnly:false` で残り再試行できることも見る |
| 6 | 本番の陰性例 | 合格 | 「078: 本番は解答中にU2の表示と正解を出さない」＋既存の 077 本番作者試験。採点一覧側は `feedback-timing.test.tsx` F-5（「要確認（わからなかった）」・`grade-mark--viewed`）が無改変で緑 |
| 7 | 記録意味 | 合格 | 「078: 表示を変えても記録は閲覧のまま…」。`kind: "view"` / `outcome: "viewed"` / `itemKey: "p010:text"` / `questionId: "q10a"`、事象は 1 件 |
| 8 | 実回答の回帰 | 合格 | 同上の後半（実回答では `.answer-unanswered` が無く `.answer-retained` が在る、「回答なし」が出ない）＋既存 076 群 24 本が無改変で緑 |
| 9 | 実描画 | 合格 | `check:overflow` の新群 **24 件・違反 0**。幅 320/375/414/768/1024/1440 × 文字 100%/200% × 歌本文/作者。印と「回答なし」の矩形の交差、「次へ」の 44px、`回答なし` の実効文字寸法が `16px × 倍率` を下回らないこと、頁のあふれと切れを見る |

## 4. 走らせた検査（全て自分で実行した。転記ではない）

```
npm run typecheck        exit 0
npm run lint             exit 0
npm test                 exit 0   （test:node 530 件 / test:screen 24 files 299 件、いずれも fail 0）
npm run data:check       exit 0
npm run build            exit 0
npm run check:overflow   exit 0   合計 1800 件、合格 1800 件、違反 0 件（build のあとに実行）
npm run check:eol        exit 0   走査 1121 件、違反 0 件
npm run scan:publish     exit 0
npm run check:font-weight exit 0
```

`test:screen` は **299 件**（着手時 292 件 ＋ 078 の 7 本）。減った試験は無い。

## 5. 破壊試験（実装者が自分で当てた。**独立検収は別の行を選ぶこと**）

`cp` で控え、`grep -c` で当たりを確かめ、測って、`cp` で戻し、`git diff` で復元を確かめた。

| # | 壊した場所 | 当たりの確認 | 結果 |
|---|---|---|---|
| **M-1** | `Session.tsx:736` の `visualOnly silent` → `visualOnly` | `grep -c 'visualOnly silent'` が 3→**2** | **1 本だけ赤**（「078: 「要確認！」の通知は一度だけ…」）。他 61 本は緑 |
| **M-2** | `Session.tsx:788` の `isAuthor={isAuthorChoice}` → `isAuthor={false}` | 該当行を `sed -n` で目視確認 | **2 本赤**（078 作者・077 作者）。作者の表記規則が両方から釘付けされている |
| **M-3** | `styles.css:281` の `grid-column: 2` → `1`（印と「回答なし」を重ねる）。**build し直してから測った** | `grep -c 'answer-unanswered__value { grid-column: 1;'` が **1** | `check:overflow` が **24 件すべてで `markDoesNotCoverValue: true`**、終了コード 1。他の判定キーは緑のまま＝この鍵が重なりだけを見ている |

復元後、`git diff --numstat` は意図した差分（styles.css 7/1、Session.tsx 42/12）だけを示し、
`grep` で 3 箇所とも元の値へ戻っていることを確かめた。全ゲートを再実行して上記の exit 0 を得ている。

## 6. 未確認・引き継ぎ

- **U3（再確認画面の高さ）には触っていない。** U2 の行は「見出し＋印/回答なし」の 2 行分で、
  従来の「答えを確認しました。」1 行より縦に伸びる。`check:overflow` は横のあふれを見る道具で、**縦の詰まりは測っていない。**
  再確認の常設中断案内と競合するかは U3 で扱うこと。
- **`tools/overflow-check/index.ts` は発注書の変更境界の外である**（§1 末尾）。境界の拡張を認めるか、検収で判断すること。
- 実機（iOS Safari / Android Chrome / iPad Safari）では見ていない。`docs/RELEASE_CHECK.md` §6 の H-08 の一巡に含めること。
- **commit していない。** 作業ツリーに 5 ファイルの差分がある状態で引き渡す。
