# LOCAL HANDOFF: 古典活用表アプリ 全例表示監査

更新: 2026-09-21
対象repo: `yama-books/koten`
引継ぎbranch: `conj-local-handoff-20260921`
公開URL: https://yama-books.github.io/koten/conj/

> ## 最重要前提
> 本件はここまで**非ローカル環境（ChatGPT / GitHub / Google Drive）を中心に開発**してきた。
> ローカル側の既存作業履歴と `main` の連続性・共通祖先を前提にせず扱うこと。
> 既存ローカルbranchへ安易に merge / rebase / reset / cherry-pick しない。
> **この引継ぎbranchを新規に fetch / checkout して、そこからローカル作業を開始する。**
>
> なお、GitHub上の現行 `main` と旧 `conj-main` には現時点で merge-base が存在する。
> したがって「Gitグラフ上、文字どおり共通祖先が存在しない」と断定する意味ではない。
> 本注記は、非ローカル開発からローカルへ移す際に、既存ローカル履歴との自動統合を仮定しないための**運用上の前提**である。

---

## 1. 現在地

公開版はすでに `main` へ反映済み。

公開済みの主な内容:
- 元の縦書きUI
- 形容動詞117語幹（ナリ94 / タリ23）の表ドリル統合
- safe lemma lexical adapter
- 漢字補助・読みの安定情報だけをlemma-levelへ昇格
- learnerGlossは文脈依存のためlemma-levelへ単純統合しない
- タリ活用 lower frequency を weight=0.6 として扱う
- iPhone向け100dvh / mobile fit 調整
- 「試作データ」badge削除

公開URL:
- https://yama-books.github.io/koten/conj/

公開版へはCHJ由来の形容動詞120例raw本文を追加していない。
内部QA版910例の quotation gate / final compliance / publicEnabled BLOCK は別系統として維持。

---

## 2. 今回のローカル移行の目的

次工程をClaude Code / Sonnet等へ切り出し、**910例の全例表示監査**を行う。

主題は2つ。

### A. マーカー範囲監査

公開版で確認した既知例:
- 「思へらず」の用例で、マーカーが後続の「ず」まで渡って見えるケースあり。

確認すべきこと:
- 活用対象語だけをmarker/highlightしているか。
- 後続する助動詞・助詞・別語まで範囲が伸びていないか。
- `target` / `anchor` / 表示用target / 解析用key の役割が混同されていないか。
- 原文中に同一文字列が複数ある場合、正しい位置だけを選べているか。
- marker生成ロジックのsubstring/正規化処理が境界を越えていないか。

「思へらず」は最初の回帰テストケースとする。
動詞「思ふ」の活用形を問う問題であるなら、marker期待範囲は原則「思へ」まで。
「らず」側が別の助動詞要素なら、markerへ含めない。

ただし、**データ上の品詞・target指定を実物確認してから確定**すること。
見た目だけでrawを書き換えない。

### B. 歴史的仮名遣い・学習表示監査

既知例:
- 「変る」

教材上、学習用見出しは
- `かはる`
のような歴史的仮名遣いを主表示候補とする。

原則:
- raw引用本文は出典表記を保持。
- raw本文を勝手に現代仮名遣い・歴史的仮名遣いへ正規化しない。
- 解析用keyと学習用displayを分離。
- 学習表示は歴史的仮名遣いのひらがなを基本とする。
- 漢字補助は学習上有用な場合のみ。
- 「変る」のように漢字表示が仮名遣い学習を隠す場合、displayは「かはる」だけでも可とする方向で監査。
- ただし全例を機械的にひらがな化しない。

---

## 3. 全910例で監査する項目

最低限、各例について以下を機械チェックする。

1. id
2. 品詞
3. 活用種類
4. 活用形
5. raw quotation
6. raw target
7. analysis key / normalized key
8. display target / display lemma
9. anchor
10. marker開始位置
11. marker終了位置
12. marker文字列
13. targetとmarkerの一致
14. 前後1〜3文字
15. 後続助動詞・助詞への越境疑義
16. 歴史的仮名遣いdisplayの妥当性
17. 漢字補助の有無
18. 人間確認要否
19. 判定理由

出力は
- PASS
- REVIEW_MARKER
- REVIEW_KANA
- REVIEW_BOTH
- DATA_ERROR
など、機械判定と人間確認を分ける。

**自動修正より先に監査表を作る。**

---

## 4. Sonnetに任せる範囲

Sonnet等の反復処理向けモデルには以下を担当させる。

- 910例の一括走査
- marker境界候補の検出
- target/anchor不整合の抽出
- 歴史的仮名遣いdisplay疑義の抽出
- rawとdisplayが不自然に混同されている候補抽出
- 疑義一覧をCSV/JSON/Markdownで生成
- 回帰テスト候補生成

任せないもの:
- raw引用本文の自動書換え
- 出典本文の改変
- 文法判断が曖昧な例の自動確定
- quotation/final compliance gate解除
- CHJ raw本文の公開
- `main` への直接push

---

## 5. 人間/ChatGPT側で最終判断する範囲

- 「思へらず」型の文法境界確定
- 歴史的仮名遣いの教材表示方針
- 漢字補助の採否
- 多義語・複合語・助動詞接続の曖昧例
- 公開可否
- quotation/final compliance

---

## 6. 既存の重要方針

学校文法の一次資料:
- 『新しい古典文法 四訂新版』付録

重要原則:
- 活用表ドリルと実例ドリルを分離。
- 実例未確認セルを人工例で水増ししない。
- CHJ / UniDicラベルを学校文法の正本にしない。
- 原文表記を正規化keyで上書きしない。
- targetとanchorを混同しない。
- 元の縦書きUIが正本。
- lemma-levelへ文脈依存learnerGlossを単純昇格しない。

---

## 7. 現在のデータ規模

内部QA全体:
- 910例
- 動詞 360
- 形容詞 140
- 形容動詞 120
- 助動詞 290

conjugation_master:
- 75 entries
- 82 rows
- 492 cells
- pending 0

形容動詞表ドリル:
- 117語幹
- ナリ94
- タリ23

語注sidecar:
- schemaVersion 1.0
- annotations 110

漢字補助74件監査:
- A=52
- B=20
- C=2
- D=0

---

## 8. 重要な既存成果物

Google Drive:
- v0.4語注監査 workbook
  - File ID: `1S8iCD6prD2syGinVfirLbMwtexzkSEH4`
- v0.4.18内部QA ZIP
  - File ID: `11KeHzW9REX6NHI5NxgbIpOc49Dw6R320`
- Drive HANDOFF
  - File ID: `1Bi9seH7fSMPLb7WPc5lkrdbL7jgqrrT3Yy2iXM0Y4QU`

GitHub:
- `conj/HANDOFF.md`
- `conj/index.html`
- `conj/adjv-runtime-adapter.js`
- `conj/data/`

---

## 9. ローカル取得手順

作業ディレクトリ:
`C:\Users\user\AI開発\koten`

### すでにrepoがある場合

PowerShell:

```powershell
cd "C:\Users\user\AI開発\koten"

git status
git remote -v
git fetch origin

git branch --all
git switch --track origin/conj-local-handoff-20260921
```

同名local branchがすでにある場合:

```powershell
git switch conj-local-handoff-20260921
git pull --ff-only origin conj-local-handoff-20260921
```

### 重要

未コミット変更がある場合は、**勝手にreset/clean/stashしない**。
まず `git status` を保存し、人間へ報告する。

以下は禁止:
- `git reset --hard`
- `git clean -fd`
- 既存local branchへの強制merge/rebase
- `main` への直接commit/push

---

## 10. 最初に読む順番

1. このファイル
   - `conj/LOCAL_HANDOFF_2026-09-21.md`
2. Claude Code用プロンプト
   - `conj/CLAUDE_CODE_AUDIT_PROMPT_2026-09-21.md`
3. `conj/HANDOFF.md`
4. `conj/index.html`
5. `conj/adjv-runtime-adapter.js`
6. `conj/data/`
7. 必要ならDriveのv0.4.18内部QA ZIP

---

## 11. 最初の成果物

最初の実装変更より前に、以下を作る。

- `conj/audit/marker-kana-audit-v1.csv`
- `conj/audit/marker-kana-audit-v1.md`
- 再現手順
- 既知例「思へらず」「変る」の判定
- 自動監査スクリプト
- 回帰テスト

疑義件数を確定してから修正フェーズへ入る。

---

## 12. 公開ポリシー

公開版UIの軽量データと内部910例QAは分離したまま維持。

CHJ由来raw本文について:
- quotation gate未完
- final compliance未完
- publicEnabled未解除

したがって、全例監査を終えても、**それだけを理由に910例raw本文を公開しない**。

---

## 13. 次回再開文

`LOCAL_HANDOFF_2026-09-21.md から再開。conj-local-handoff-20260921 を使用し、mainへ直接変更しない。まず910例の marker / target / anchor / 歴史的仮名遣いdisplay を全件監査。「思へらず」のmarker越境と「変る→かはる」を既知テストケースにし、自動修正前に疑義一覧を作る。CHJ raw公開BLOCKは維持。`
