# Claude Code / Sonnet 実行プロンプト
## 古典活用表アプリ 910例 marker・歴史的仮名遣い監査

あなたは `yama-books/koten` の古典活用表アプリをローカルで監査します。

最初に必ず次を読んでください。

1. `conj/LOCAL_HANDOFF_2026-09-21.md`
2. `conj/HANDOFF.md`
3. `conj/index.html`
4. `conj/adjv-runtime-adapter.js`
5. `conj/data/` の関連JSON

## 最重要前提

この案件はここまで非ローカル環境中心で進められており、ローカル既存履歴との連続性を前提にしません。
既存branchへ merge / rebase / reset をしないでください。
作業branchは `conj-local-handoff-20260921` を使用してください。

GitHub上の現行 `main` と旧 `conj-main` にはmerge-baseがありますが、ローカル引継ぎ上は「既存履歴へ自動統合しない」という安全側の前提で扱います。

## 最初に行うこと

以下を実行して状況を記録してください。

```powershell
git status
git branch --show-current
git log -8 --oneline
git remote -v
```

未コミット変更があれば、変更・stash・reset・cleanせず、内容を報告してください。

## 今回の目的

内部QAデータ910例について、
1. marker/highlight範囲
2. target / anchor 境界
3. 歴史的仮名遣いの学習表示
4. raw quotation と display の分離
を一括監査してください。

**最初は修正ではなく監査です。**

## 既知テストケース1: 「思へらず」

公開画面で「思へらず」の例について、markerが「ず」まで伸びて見える現象を確認しています。

確認してください:
- 該当example ID
- 品詞
- 問われている活用語
- raw target
- normalized/analysis key
- anchor
- marker生成後の文字列
- marker開始/終了位置
- 「ず」が別助動詞かどうか
- データ誤りか、markerロジック誤りか

動詞「思ふ」の活用形が対象なら、期待markerは原則「思へ」までと考えています。
ただしデータを見てから確定してください。

## 既知テストケース2: 「変る」

学習用表示として現代の読みを誘発しやすいため、
`変る` ではなく `かはる` を主表示する方が教材としてよい可能性があります。

確認してください:
- raw quotationは変更しない
- raw targetも出典に忠実に保持
- analysis keyをrawへ上書きしない
- display lemma / display targetだけを歴史的仮名遣いにできる構造か
- 同種例が他に何件あるか

「漢字を必ず付ける」方針にはしません。
歴史的仮名遣いを学ばせるため、ひらがなのみが適切な例も候補にしてください。

## 910例の自動監査

全例を走査し、最低限次の列を出してください。

- id
- category
- lemma
- conjugationType
- conjugationForm
- rawQuotation
- rawTarget
- normalizedKey
- displayLemma
- displayTarget
- anchor
- markerText
- markerStart
- markerEnd
- prefixContext
- suffixContext
- exactTargetMatch
- markerCrossesBoundary
- kanaDisplayConcern
- kanjiAid
- status
- reason

status候補:
- PASS
- REVIEW_MARKER
- REVIEW_KANA
- REVIEW_BOTH
- DATA_ERROR

## marker監査ルール

以下を疑義として抽出してください。

- markerText !== 表示上想定target
- markerがtargetより長い
- markerが後続助動詞・助詞まで含む可能性
- anchor内にtargetが複数回出る
- 正規化により開始終了位置がずれる
- 異体字/踊り字/歴史的仮名遣い変換でsubstring位置が壊れる
- HTML生成時にmarker範囲が広がる
- punctuationを余分に含む

## 歴史的仮名遣い監査ルール

次を疑義として抽出してください。

- 漢字表記のみで歴史的仮名遣いが学習者に見えない
- displayが現代仮名遣い
- rawとdisplayが同一フィールドで上書きされている
- displayLemmaとtargetReadingが矛盾
- 漢字補助が現代語義へ誤誘導する
- 同じlemmaでdisplay方針が不統一

ただし、自動変換で確定しないでください。
疑義リストを作り、人間確認へ回してください。

## 出力

最初の成果物:

- `conj/audit/marker-kana-audit-v1.csv`
- `conj/audit/marker-kana-audit-v1.md`
- `conj/audit/audit_marker_kana.py` または同等スクリプト
- 回帰テスト
- 「思へらず」「変る」の個別調査結果

Markdownには:
- 全910例件数
- PASS件数
- REVIEW_MARKER件数
- REVIEW_KANA件数
- REVIEW_BOTH件数
- DATA_ERROR件数
- 代表的疑義
- 修正案
を載せてください。

## 修正フェーズ

監査結果が出たあと、
1. 明白なmarker実装バグ
2. 安全なdisplay-only修正
3. データそのものの要再監査
に分けてください。

明白でないものを自動修正しないでください。

## 絶対禁止

- raw quotationの自動書換え
- CHJ raw本文のGitHub公開
- quotation/final compliance gateの解除
- `main` への直接commit/push
- `git reset --hard`
- `git clean -fd`
- 既存ローカル作業を破棄
- 曖昧な文法判定の自動確定

## 文法正本

学校文法は『新しい古典文法 四訂新版』付録を最優先します。
CHJ / UniDicは候補発見・検索補助であり、学校文法表示の正本ではありません。

## 終了時

作業終了時には、
- 変更ファイル
- 監査件数
- 疑義件数
- 自動修正したもの
- 未確定のもの
- テスト結果
- commit SHA
を `conj/LOCAL_HANDOFF_2026-09-21.md` 末尾または別PROGRESSへ追記してください。

公開反映はまだ行わず、まず監査結果を人間へ提示してください。
