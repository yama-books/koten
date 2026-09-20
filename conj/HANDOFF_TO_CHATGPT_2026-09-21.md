# 引継ぎ: Claude Code側の910例監査 → ChatGPT側へ（2026-09-21）

対象repo: `yama-books/koten`
このセッションで作業したbranch: `conj-local-handoff-20260921`
関連PR: https://github.com/yama-books/koten/pull/12
（このファイルをpushした時点でのPR状態は未マージ。マージ・公開URLへの
反映はユーザー側で実施予定）

## 1. 今回Claude Code側で完了したこと

### 1-1. 公開版 `conj/index.html`（129項目）の助動詞marker修正 — 完了・PR化済み

`conj/CLAUDE_CODE_AUDIT_PROMPT_2026-09-21.md` の指示に基づき監査を実施。
既知テストケース「思へらず」を追ったところ、**910例側ではなく**、
公開版 `conj/index.html` に直接埋め込まれた129項目データ（`const items=[...]`、
動詞89/形容詞11/形容動詞1/助動詞28）の中にあることが判明した。

助動詞28件全件を「`target`が自身の活用表の値（`forms`/`forms2`）と
完全一致するか」で点検した結果、11件は既に一致していたが、**17件が
先頭の動詞語幹・別の助動詞、または末尾の別助動詞（ず/む/ぬ）を
`target`に巻き込んでいた**。「思へらず」(`ri_aux`) はこの17件の1つで、
`target:"らず"` が「り」の未然形「ら」＋別助動詞「ず」を1文字列に
してしまっていたのが原因。

17件すべてを、対象語自身の活用形だけを指す値に修正した。うち2件
（`su_aux`「せ」・`tsu_aux`「つ」）は短縮後の文字列が例文中に2回
現れるため、`highlight()`関数に`occurrence`引数を追加して対応した
（内部QA版`app.js`の`highlightTarget`と同じ仕組み）。修正結果は
ブラウザで`render()`を直接呼び出して17件全ての`<mark>`位置を実機
確認済み。

この修正は既に `conj-local-handoff-20260921` へコミット・push済みで、
PR #12 としてユーザー自身が作成済み。**マージ・GitHub Pagesへの反映は
これから**（ユーザーが実施予定）。

もう1つの既知テストケース「変る」(`kawaru`) は別種の懸念（下記2-2）で、
このPRには含めていない。

### 1-2. 内部QA 910例の監査 — 完了（修正なし、公開なし）

Google Driveの内部QA ZIP（`katsuyo_v0.4.18_internal_package_2026-09-20.zip`,
File ID `11KeHzW9REX6NHI5NxgbIpOc49Dw6R320`）を取得・展開し、`manifest.json`
の内訳（verb360 / adjective140 / adjectivalVerb120 / auxiliary290 = 910）
と一致することを確認した上で、実際の内部QA `app.js` の
`highlightTarget()` / `displayExample()` ロジックをそのまま再現した
Pythonスクリプトで全910例を機械監査した。

結果: PASS 772 / REVIEW_MARKER 21 / REVIEW_KANA 110 / REVIEW_BOTH 7 /
DATA_ERROR 0。129項目側で見つかった「別語混入」型のバグ（後続助動詞の
巻き込み）は910例側では確認されなかった（詳細は下記4節）。

**910例はこのセッションでは一切公開・統合していない。** 理由は
`conj/data/manifest.json` に明記された通り
`"publicEnabled": "false until quotation-ready and final compliance pass"`
であり、quotation gate・final compliance ともに未完のため。CHJ raw本文の
GitHub公開も絶対禁止事項として維持している。

## 2. ChatGPT側で引き続き判断・実装してほしいこと

### 2-1. 910例を実アプリへ統合する互換層の設計・実装

`conj/HANDOFF.md` 末尾に既に書かれている通り、現行 `conj/index.html` は
「1活用表項目 = 1用例」が密結合の129項目形式であり、910例をそのまま
流し込めない。910例側は既に「活用表ドリル」と「実例ドリル」を分離した
二層構造（`displayLemma`/`displayTarget`と`lemma`/`originalTarget`の
分離、`occurrence`ベースのマーカー指定）を持っているため、この二層構造を
活かした互換層を先に設計する必要がある。

今回129項目側に追加した`highlight()`の`occurrence`引数拡張は、この
互換層の一部として流用できるはず（同じ考え方を先取りした形）。

### 2-2. 「変る」型の歴史的仮名遣い表示方針の決定

`kawaru`（変る、百人一首90番）: raw quotation・raw target（`変ら`）は
変更不要。問題は表示レイヤーで、`lemma`がkanji表記のみだと学習者が
歴史的仮名遣い（かはる、は行転呼音）を想起できない。

調査の結果、`.lemma`フィールドはmarker一致には一切使われておらず
（表示ラベル専用）、`lemma`だけを`"かはる"`に書き換えても安全であることを
確認済み。ただし:
- 「漢字を必ず付ける」方針にはしない
- 逆に全動詞を機械的にひらがな化もしない
- 対象語彙の選定（どの動詞が歴史的仮名遣い学習上重要か）は人間側の
  判断が必要

910例側（動詞360件）は全件、読み仮名系フィールド（`targetReading`/
`kanjiAid`）がスキーマ上存在しないため、この種の懸念を機械的に検出
できない。動詞カテゴリへの読み仮名フィールド追加自体も検討課題。

詳細な判断材料は `conj/audit/KNOWN_CASES_INVESTIGATION.md` の
「既知テストケース2」節を参照。

### 2-3. 910例側 REVIEW_MARKER 21件・REVIEW_KANA 110件・REVIEW_BOTH 7件の個別確認

`conj/audit/marker-kana-audit-v1.csv`（**CHJ raw本文を含むためgit管理外。
ローカルのみ**、パスは下記4節参照）に全910件の判定が入っている。

REVIEW_MARKERの大半は「target-length-outlier」ヒューリスティックの
過検出（複合動詞・長い活用形が単に長いだけ）である可能性が高い。
129項目側で有効だった「対象語自身の活用形と完全一致するか」という
精密な判定は、910例側では`forms`配列に相当するものが無く
（`conjugation_master.json`の正本セル値と個別に突合する必要がある）、
今回は実装していない。次の一手として推奨:
`conjugation_master.json`（75 entries / 82 rows / 492 cells）の正本
セル値と、910例各件の`normalizedKey`/`originalTarget`を突合する
第2パスの監査スクリプトを書くこと。

## 3. Claude Code側で判断・実装しなかったこと（意図的にスコープ外）

- 910例の`main`への統合・公開
- quotation gate / final compliance gateの解除
- 「変る」型のlemma書き換え実装（判断材料の提示のみ）
- 910例REVIEW対象138件の個別文法判定
- `conjugation_master.json`とのクロス突合による第2パス監査

## 4. 成果物の場所

このセッションのworktree: `D:\dev\koten-conj-audit`（branch
`conj-local-handoff-20260921`）。`D:\dev\koten`（`worktree-qr-sync-engine`,
無関係の別プロジェクト作業）とは独立。

### git管理下（PR #12 に含まれる）

- `conj/index.html` — 助動詞17件のmarker修正 + `highlight()`の
  occurrence対応
- `conj/audit/audit_marker_kana.py` — 910例監査スクリプト
- `conj/audit/audit_public_129.py` — 129項目監査スクリプト
- `conj/audit/test_marker_regression.py` — 回帰テスト
  （`python -m pytest conj/audit/test_marker_regression.py -v`）
- `conj/audit/KNOWN_CASES_INVESTIGATION.md` — 既知テストケース調査結果
- `conj/audit/marker-kana-audit-v1.md` — 910例監査サマリ（集計のみ、
  raw本文なし）
- `conj/audit/index-html-129-audit.csv` / `.txt` — 129項目監査結果
  （百人一首等の公開済みテキストのみ、raw本文の懸念なし）
- `conj/PROGRESS_AUDIT_2026-09-21.md` — このセッションの進捗記録
- このファイル

### git管理外（`.gitignore`に追加済み、ローカルのみ）

- `conj/_qa_source/` — Drive ZIPの展開先（910例のCHJ raw本文を含む）
- `conj/audit/marker-kana-audit-v1.csv` — 910例監査結果の全件CSV
  （`rawQuotation`列にCHJ raw本文を含むため）

**910例の全件監査結果を確認したい場合は、`D:\dev\koten-conj-audit` の
上記ローカルファイルを直接見るか、`conj/audit/audit_marker_kana.py`を
再実行してください**（Drive内部QA ZIPの再取得が必要）。

## 5. 次回再開文（ChatGPT向け）

`conj/HANDOFF_TO_CHATGPT_2026-09-21.md`から再開。PR #12
（`conj-local-handoff-20260921` → `main`、129項目の助動詞marker修正17件）
のマージ状況を確認。910例の実アプリ統合は未着手。まず互換層設計
（2-1節）と「変る」型歴史的仮名遣い表示方針（2-2節）を人間/ChatGPT側で
決定し、`conj/HANDOFF.md`・`conj/LOCAL_HANDOFF_2026-09-21.md`の既存方針
（実例未確認セルを人工例で水増ししない、rawとdisplayを分離する、target/anchor
を混同しない）を維持しながら実装を進める。
