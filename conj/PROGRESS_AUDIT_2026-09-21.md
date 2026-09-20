# 監査フェーズ進捗（2026-09-21）

`conj/CLAUDE_CODE_AUDIT_PROMPT_2026-09-21.md` の指示どおり、**修正ではなく
監査・疑義一覧作成まで**を実施。branch `conj-local-handoff-20260921`
（新規worktree `D:\dev\koten-conj-audit` 上、`D:\dev\koten` のQR同期エンジン
作業とは独立）。`main`・既存local branchへのcommit/push/merge/rebase/reset
は一切行っていない。

## 実施内容

1. Google Drive の内部QA ZIP (`katsuyo_v0.4.18_internal_package_2026-09-20.zip`,
   File ID `11KeHzW9REX6NHI5NxgbIpOc49Dw6R320`) を取得・展開し、
   `conj/data/manifest.json` の内訳（verb360 / adjective140 /
   adjectivalVerb120 / auxiliary290 = 910）と一致することを確認。
   ローカル展開先: `conj/_qa_source/`（**git管理外・未コミット**）。
2. 910例全件に対し、実際の内部QA `app.js` の `highlightTarget()` /
   `displayExample()` ロジックをそのままPythonで再現し、marker開始/終了
   位置・PASS/REVIEW判定を機械算出するスクリプトを作成:
   `conj/audit/audit_marker_kana.py`
3. 既知テストケース「思へらず」「変る」を910例データ内で検索したが
   **どちらも存在しなかった**。調査の結果、両方とも公開版
   `conj/index.html` に埋め込まれた別データセット（129項目、
   `const items=[...]`）にあることが判明。129項目データを
   `conj/_qa_source/index-html-items-129.json` として抽出し
   （`conj/_qa_source/extract_items.cjs`）、同様の監査スクリプトを作成:
   `conj/audit/audit_public_129.py`
4. 個別調査結果: `conj/audit/KNOWN_CASES_INVESTIGATION.md`
5. 回帰テスト: `conj/audit/test_marker_regression.py`
   （`python -m pytest conj/audit/test_marker_regression.py -v` で実行可、
   pytest未導入環境でもスタンドアロン実行可）

## 監査件数

### 910例（内部QA、`marker-kana-audit-v1.csv` / `.md`）

| status | 件数 |
|---|---|
| PASS | 772 |
| REVIEW_MARKER | 21 |
| REVIEW_KANA | 110 |
| REVIEW_BOTH | 7 |
| DATA_ERROR | 0 |

品詞別: 動詞360(PASS344/REVIEW_MARKER16) / 形容詞140(PASS36/REVIEW_MARKER4/REVIEW_KANA93/REVIEW_BOTH7)
/ 形容動詞120(PASS102/REVIEW_MARKER1/REVIEW_KANA17) / 助動詞290(PASS290)。

構造的注記（個別行ではなくスキーマ全体の欠落、詳細はmd参照）:
- 動詞360例は全件、読み仮名（targetReading/kanjiAid相当）フィールドが
  スキーマ上存在しない。「変る→かはる」型の歴史的仮名遣い懸念は動詞
  カテゴリについて機械的に検出不能（要人間レビュー）。
- 助動詞290例も同様にtargetReading未設定だが、lemma自体が既に平仮名
  なので表示上の懸念は低いと推定。

**REVIEW_MARKER のうち "target-length-outlier" ヒューリスティックは
過検出が多い**（複合動詞・長い活用形が単に長いだけで境界越境ではない
ケースが多数含まれる）。人間確認前提の候補リストであり、確定した
データ誤りではない。

### 129項目（公開版 `conj/index.html`、`index-html-129-audit.csv`）

- 全129項目でtargetがexample内から発見できた（サイレント欠落なし）。
- 助動詞28件について「targetが自身の活用形（forms/forms2）と完全一致
  するか」を全件点検した結果、**11件は既に完全一致**（この形式が本来の
  設計であることの裏付け）、**17件が逸脱**していた。
  - うち3件は人間確認済みの確定データ誤り（後続の別助動詞を巻き込み）:
    - `ri_aux`（り）: `target:"らず"` → 正 `"ら"`（既知テストケース1）
    - `ru_aux`（る）: `target:"しのばれむ"` → 正 `"れ"`（先頭の動詞語幹
      「しのば」・末尾の別助動詞「む」の両方を含んでいた。当初提案した
      「しのばれ」は人間により訂正）
    - `raru_aux`（らる）: `target:"あてられぬ"` → 正 `"られ"`（同様に
      先頭「あて」・末尾「ぬ」を含んでいた）
  - 残り14件（su_aux/zu/mu_aux/ji_aux/mashi_aux/ki_aux/tsu_aux/
    tari_comp_aux/kemu_aux/ramu_aux/rashi_aux/meri_aux/
    nari_hearsay_aux/nari_assert_aux）は同種の逸脱候補として機械抽出
    したのみで、**個別の人間確認はまだ**。詳細は
    `KNOWN_CASES_INVESTIGATION.md` の一覧表を参照。
- `kawaru`（変る、既知テストケース2）は marker越境ではなく
  **表示レイヤーの歴史的仮名遣い懸念**。raw target `"変ら"` 自体は正しい。
  lemma表示を漢字のみにするか、かな主表示にするかは人間判断が必要。

## 自動修正したもの

**なし。** 指示どおり、本フェーズでは修正を一切行っていない。

## 未確定のもの（人間/ChatGPT側判断が必要）

- `ri_aux` / `ru_aux` / `raru_aux` の `target` 修正の実施可否・実施方法
  （データ修正のみで足りると判断しているが、実施はまだ）
- 「変る」型の歴史的仮名遣い表示方針（lemma書き換えか、新規フィールド
  追加による二層化か）と、動詞カテゴリ全体での対象語彙の選定
- 910例側 REVIEW_MARKER 21件・REVIEW_KANA 110件・REVIEW_BOTH 7件の
  個別確認（`marker-kana-audit-v1.csv` 参照）
- 910例側の動詞カテゴリに、`ri_aux`型と同種の後続助動詞混入バグが
  存在するかどうかの精密検証（今回の長さヒューリスティックは過検出が
  多く、`conjugation_master.json` の正本セル値と突合するより精密な
  第2パスが望ましい）

## テスト結果

```
python conj/audit/test_marker_regression.py
  PASS: test_all_items_target_found_in_example
  PASS: test_all_aux_targets_end_with_one_of_their_own_conjugation_forms
  ri_aux / ru_aux / raru_aux: still buggy, as expected (xfail)

python -m pytest conj/audit/test_marker_regression.py -v
  2 passed, 3 xfailed
```

## commit SHA

**未commit。** 以下の理由でgit管理下に置いていない:
- `conj/_qa_source/` はDriveから取得した内部QA生データの展開先であり、
  そもそも一時作業領域（`.gitignore`対象とすべき）
- `conj/audit/marker-kana-audit-v1.csv` と
  `conj/audit/index-html-129-audit.csv` は **CHJ由来のraw引用文を含む**
  ため、「CHJ raw本文のGitHub公開」絶対禁止に抵触する可能性がある。
  スクリプト本体（`.py`）とMarkdownの調査結果は生本文を含まないため
  commit候補になりうるが、**CSVをどう扱うか（除外する／redactした版を
  別途作る／完全に手元限定にする）は人間の判断を仰いでからにする**。

現在のワークツリー状態: `D:\dev\koten-conj-audit` 上、上記ファイルはすべて
未追跡（`git status`で `??` 表示）。`conj-local-handoff-20260921` への
commit実施は次の指示待ち。
