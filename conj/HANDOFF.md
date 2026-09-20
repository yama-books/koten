# HANDOFF: 古典活用表ドリル `conj`

更新: 2026-09-20

## 1. 目的

古典文法の活用を、活用表暗記だけでなく実際の古典本文の用例と結びつけて学習できるアプリを作る。

重要原則は次の二層構造。

1. **活用表ドリル**: 一次資料に載る正規の活用セルをすべて学習する。
2. **実例ドリル**: 実在が確認できた歴史的用例だけを出題する。

実例が確認できないセルを、人工例で水増ししない。

## 2. 学校文法の正本

最優先の一次資料は『新しい古典文法 四訂新版』付録。

CHJ / UniDicのラベルは候補発見・コーパス検索に用いるが、学校文法表示をそのまま決定しない。

### 今回一次資料で確定した重要事項

- `たし` 補助活用連体形: `たかる`
- `たし` に補助活用命令形 `たかれ` は置かない
- ナリ活用: なら / なり・に / なり / なる / なれ / なれ
- タリ活用: たら / たり・と / たり / たる / たれ / たれ

## 3. Google Drive

作業フォルダ:
- 名称: `活用表アプリ`
- Folder ID: `14yu_3H1MeHkc9rQbwl6_HGhoL_mqHqbU`

主要資料:
- `活用表アプリ_コーパス収集・監査ログ`
  - File ID: `1wQOPXy0Ia245QenqyuIEbHkLKkTsh3qpk9FEpZk9TXs`
- 旧HANDOFF:
  - `HANDOFF_活用表アプリ_コーパス増補_2026-09-18`
  - File ID: `1lE0wLOatT_9cDJavkcAFUlK35Duf1_53Dxz_cALDFD8`
- 動詞360例 公開前注記分類済:
  - File ID: `1gbQjqqBuutZTYoU1kPudwtZ0KPRrXBtp`
- 動詞360＋形容詞140、500例マイルストーン:
  - File ID: `1_wXHHe4j-yPxuENmS-leMsnudsWXcVzT`
- 助動詞5種180例 一次採用候補:
  - File ID: `1ELVAclhwDd08bUY6VzOUgcD0TTM9gPrz`
- 助動詞5種180例 学校文法セル監査AI案:
  - File ID: `1pL6VsYgzdQfyI-kgrOQZlO3ZJpXHVTXB`
- 形容動詞最新検索:
  - Folder ID: `1t5HuAv8eLxXEF4J5AlS-MS1RzDK3FoKT`
  - ナリ活用CSV: `10DBk_65n-63AyRfeiPVAohhRQvpqNtz6`
  - タリ活用CSV: `1-uJawlrPIY5XYnxzOQV_QoZMXc-Nl7Hf`
- 形容動詞120例 公開前本文・anchor監査:
  - File ID: `1b-LU-wVx-hKinWEuMDlUqphAzfObYyw7xfKg8Ab4Ov8`
  - 120 / 120で raw CSV 再照合・target検出・anchor一意化を通過

## 4. 既存データ

### 動詞

六活用形各60例、計360例。
公開前整理後:
- 公開可 329
- 公開可（教材注記あり）31
- 公開ブロッカー 0

### 形容詞

140例。
動詞360と合わせて500例。

### 助動詞第一陣

対象:
- ず
- べし
- まじ
- まほし
- たし

一次採用候補180例。

target / anchor最終確認:
- anchor必須: 8例
- 8例すべて、anchor内にtargetが1回だけ存在
- 原文targetと正規化キーの表記差: 32例
- 32例すべて、原文targetが本文中に存在
- target / anchor起因の公開ブロッカー: 0

代表的な正規化と原文表示の分離:
- `ざり -> さり`: 9
- `べかり -> へかり`: 7
- `ず -> ズ`: 5
- `ざる -> さる`: 4
- `べかる -> へかる`: 2
- その他: `ず -> す`, `ざり -> ゝり`, `まじき -> ましき`, `まじかり -> ましかり`, `ま欲く -> マ欲ク`

**解析用キーと画面表示用targetを分離すること。**

## 5. 助動詞の希少セル

### べし
- `べかる`: 一次資料上の正規セル
- CHJ 6例
- 『蜻蛉日記』『金葉和歌集』『保元物語』『平治物語』
- 実例ドリル出題可

### まじ
- `まじかる`: 一次資料上の正規セル
- 既存CHJ検索では表面形0
- 外部資料では `まじかる + なり` が音便・表記上 `まじかなる` となる用例を確認
- 実例採用時は音便・本文異同の注記を残す

### まほし
- `まほしかる`: 一次資料上の正規セル
- CHJ 3例、すべて『徒然草』
- 実例ドリル出題可

### たし
CHJ全体検索では1,277件。古典側（奈良〜江戸）233件。

重要セル:
- `たから`: 古典側8例
- `たかり`: 2例
- 終止形: 古典側58例（表記異形を含む）
- `たかる`: CHJ全1,277件で0
- 外部調査でも確実な歴史的実例は未取得

方針:
- `たかる` は活用表ドリルで学習
- 実例ドリルでは出題しない
- 状態は「一次資料上の正規セル / 実例未確認」
- 実例探索は低優先の継続調査へ移行

## 6. 形容動詞の最新分析

検索対象は平安仮名文学・鎌倉説話随筆・鎌倉軍記の主要作品。

### ナリ活用

raw: 4,644件

表面形:
- `に`: 3,312
- `なる`: 819
- `なり`: 283（このほか文境界表記 `|(なり)#...` が3件）
- `なら`: 153
- `なれ`: 59
- `也`: 9
- その他音便・異形: 少数

時代:
- 平安 2,362
- 鎌倉 2,282

`なれ` 59例の内訳:
- `なれば`: 26
- `なれど`: 9
- `なれども`: 5
- 文末 `なれ。`: 18。全例で前に係助詞 `こそ` を確認し、係り結びの已然形
- `なれかし`: 1。命令形候補

したがって、今回の `なれ` 群は已然形58、命令形候補1まで切り分けられる。

### タリ活用

raw: 46件

表面形:
- `と`: 22
- `たる`: 16
- `たり`: 8
- `たら`: 0
- `たれ`: 0

時代:
- 平安 1
- 鎌倉 45

作品:
- 平家物語 28
- 十訓抄 9
- 保元物語 5
- 平治物語 2
- 枕草子 1
- 宇治拾遺物語 1

今回の対象ではタリ活用が極端に少なく、未然形・已然形・命令形の実例は取れていない。
活用表では一次資料どおり学習し、実例ドリルでは無理に均等化しない。

## 7. 形容動詞120例の一次選抜

一次選抜を完了。

- ナリ活用 96
- タリ活用 24
- 平安 58 / 鎌倉 62
- target監査 120 / 120通過

ナリ活用96の配分:
- 未然形「なら」15
- 連用形「に」20
- 連用形「なり」8
- 終止形「なり」16
- 連体形「なる」18
- 已然形「なれ」18
- 命令形「なれ」1

タリ活用24の配分:
- 連用形「と」8
- 連用形「たり」1
- 終止形「たり」7
- 連体形「たる」8
- 未然形「たら」0
- 已然形・命令形「たれ」0

選抜メタデータ:
- `conj/data/adjectival-noun-selection-120.json`

原文本文はGitHubへ複製せず、sample ID・開始位置・作品・原文target等の軽量メタデータだけを保持する。

## 8. 次にやること

1. 現行 `index.html` にはまだ120例を直接流し込まない
   - 現行は「1活用表項目 = 1用例」が密結合
   - 新設した二層データを並列ロードできる互換層を先に作る
2. 形容動詞の表ドリルは次の軽量データを使う
   - `conj/data/adjectival-noun-paradigms.json`
   - `conj/data/adjectival-noun-lemma-pool.json`
3. 実例ドリル候補は `conj/data/adjectival-noun-example-index-120.json` を入口にする
   - 本文・anchorはDriveの公開前監査シートに保持
   - CHJ取得本文をそのままGitHubへ自動複製しない
   - 公開本文は再配布可能な典拠または公開可否を確認したものへ差し替えてから接続する
4. `conj/data/adjectival-noun-integration-audit.json` の全件通過を回帰条件にする
5. タリ活用 `たら / たれ` は必要なら作品・時代を拡張して探索する
6. ナリ活用の特殊形 `な／なん／なっ` 6件は音便・縮約研究候補として別管理する
7. 助動詞180例を一次資料確認済みの正本候補へ更新する

## 9. 禁止・注意

- CHJ生コーパス全量をGitHubへ公開しない
- CHJラベルを学校文法の正本として扱わない
- 実例未確認セルに人工例を入れて「実例」としない
- 原文の表記を正規化キーで上書きしない
- `target` と `anchor` の役割を混同しない

---

## 10. 継続セッション更新（2026-09-19）

直前の「`なり`分類未完／120例選抜前」という終了時追記は、コミット順と現行データに照らすと古い状態を後から追記したものだったため、ここで訂正する。

### 実際の現行状態

- `なり` の連用形／終止形分類は完了
  - 連用形 `なり`: 56
  - 終止形 `なり`: 237
  - `也` 9件は連用2・終止7
- 形容動詞120例の一次選抜・target監査は完了
- Driveのraw CSVを再取得して120例を再照合
  - raw行未検出: 0
  - originalTarget未検出: 0
  - anchor一意化失敗: 0
- Driveに公開前本文・anchor監査シートを作成
  - File ID: `1b-LU-wVx-hKinWEuMDlUqphAzfObYyw7xfKg8Ab4Ov8`
  - 保存先: `活用表アプリ`
- GitHubに二層データを追加
  - `data/adjectival-noun-paradigms.json`
  - `data/adjectival-noun-example-index-120.json`
  - `data/adjectival-noun-lemma-pool.json`
  - `data/adjectival-noun-integration-audit.json`
- 統合監査
  - 120 / 120が正規の活用セルへ対応
  - 実例禁止セル参照: 0
  - target監査通過: 120 / 120
- 表ドリル用語幹プール
  - 計117語幹
  - ナリ94 / タリ23

### 現行アプリの棚卸し

`conj/index.html` の埋め込み `items` は129項目。
- 動詞 89
- 形容詞 11
- 形容動詞 1
- 助動詞 28

現在は各項目に `target` と `example` が直結している。このため120例をそのまま `items` に追加せず、活用表データと実例データを分離した互換層を先に実装する。



## 11. 2026-09-20 漢字補助74件監査・v0.4.18・lexical反映準備

Drive正本HANDOFF §39の要約。詳細な辞書照合・監査表はDrive側を正本とする。

- 語注監査v0.3の最終260例シートから漢字補助74行を抽出し、採用原文＋辞書／高校学習資料の複数系統で一巡監査。
- 判定: **A=52 / B=20 / C=2 / D=0**。
- C判定:
  - `adj-078 をかし`: 「可笑し」は現代語「おかしい」へ意味を狭めやすいため、かな主表示で漢字補助を出さない。
  - `adj-082 あやし`: 当該『土佐日記』用例は解釈が分岐し、「怪し」を出すと一解釈へ誘導するため漢字補助を出さない。
- 主な補助表記更新:
  - `はかなし`: 儚し → 果無し
  - `うつくし`: 美し・愛し → 愛し・美し
  - `ありがほ`: あり顔 → 有り顔
  - `こころこと`: 心こと → 心異
  - `ひたぐろ`: ひた黒・直黒 → 直黒
  - `てはなち`: 手はなち → 手放ち
- raw原文・originalTargetは変更しない。
- v0.4監査workbook: Drive ID `1S8iCD6prD2syGinVfirLbMwtexzkSEH4`。
- v0.4.18内部QA ZIP: Drive ID `11KeHzW9REX6NHI5NxgbIpOc49Dw6R320`。
- sidecarは schemaVersion 1.0 / annotations 110 を維持し、kanjiAidのみ8件更新または削除。
- 全 `qa/test_*.py`、`validate_data` 910/910、conjugation_master validator、`node --check app.js` はPASS。
- public buildはRC=2で意図どおりBLOCK。publicEnabled / quotation gate / final compliance は910件すべて未解除。

### 元縦書きUIへの接続方針

`conj/index.html` は `adjv-runtime-adapter.js` を介して、形容動詞117語幹（ナリ94／タリ23）を活用表項目として追加する。追加項目は `exampleAvailable=false` で、公開側の実例indexは no-raw-text を維持している。

lexical sidecarは**実例ID単位**で、`learnerGloss` は用例文脈依存。一方、表ドリルは**語幹単位**であるため、glossを単純に語幹へマージしない。

次の実装規則:

1. 表ドリルでは `sourceExampleIds` に属する注釈間で一致する安定情報だけをlemma-levelへ昇格する。
2. `displayLemma / kanjiAid / targetReading` は一致確認後に表示可能。
3. `learnerGloss` は特定実例が画面に出ている場合だけ表示する。
4. CHJ raw本文は公開条件確定までGitHubへ追加しない。
5. mainは触らず `conj-main` で進める。次はadapter実装準備→320/360/390/430pxで100dvh・形容動詞横ずれQA。


## 12. 2026-09-20 夜 公開前統合: lemma lexical adapter / mobile static QA

本日中公開を目標に、§11（Drive正本 §39）から元の縦書きUIへの統合を再開。

### 実装済み

- conj/data/adjectival-noun-lexical-annotations.json を追加。
  - v0.4 lexical sidecar から形容動詞の lemma-level で安全に昇格できる情報だけを抽出。
  - 71 annotation。
  - learnerGloss は文脈依存なので明示的に除外。
  - 保持するのは displayLemma / kanjiAid / targetReading / questionFrequency。
- adjv-runtime-adapter.js を更新。
  - sourceExampleIds の全例に同じ値がある場合だけ lemma-level へ昇格。
  - 1例でも未注釈・不一致ならそのフィールドは昇格しない。
  - 歴史的仮名遣いの displayLemma を主表示にし、ナリ／タリを付けて活用表見出しを構成。
  - learnerGloss が lemma-level ファイルに混入した場合は validation error。
  - TARI の questionFrequency=lower は questionWeight=0.6 に変換。
- 元の conj/index.html を更新。
  - 漢字補助を主見出しの下に小さく表示。
  - targetReading がある場合は漢字補助の読みも併記。
  - weighted picker を追加し、TARI lower を通常項目より低頻度にした。
  - v38 の iPhone viewport fit / table centering は維持。

### 回帰確認

- adapter JavaScript: V8 compile PASS。
- runtime validation: PASS。
- 形容動詞 table items: 117。
- lexical annotations: 71。
- TARI lower weight 0.6: 23 / 23。
- 代表確認:
  - adjv-045 → ありがほなり / 漢字補助 有り顔 / 読み ありがお
  - adjv-048 → こころことなり / 心異
  - adjv-059 → ひたぐろなり / 直黒
  - adjv-087 → はなやかなり / 声花
  - adjv-097 → さつさつたり / 颯々 / さっさつ / weight 0.6
- index.html inline JS compile PASS。
- CSS brace balance 0。
- 100dvh narrow-screen rule、max-height 760px rule、形容動詞連用形の左右2分割を静的確認。

### 公開方針

今回公開対象にするのは元の縦書きUI＋軽量な表ドリルデータ＋lemma lexical metadata。
形容動詞120例の CHJ raw本文は公開側へ追加しない。
したがって、v0.4.18 内部QAパッケージの 910例 quotation/final-compliance BLOCK は解除せず維持する。
内部910例パッケージを公開物へ置き換えない。

main はこの時点では未変更。公開直前に main の現行 conj へ安全な差分だけ反映する。


## 13. 2026-09-20 夜 main 公開反映

ユーザー指示「本日中に公開を目指す。進めてください」に基づき、安全な公開対象だけ main へ反映。

main 反映:
- lexical metadata追加: commit 90e5aea2552af0f7787ff0bd732037b10018ec5b
- safe lemma adapter: commit 45439f3f3ea2a00369193b35d735c9aef39b9acc
- v38 mobile fit + lexical aid + weighted picker: commit 7a1d0b51d763dff1f288b24c3c2176e1c13a98ac
- 「試作データ」badge削除: commit 8ddcd482452f5b5c9d71cef9d8fd638398ad4731

main readback:
- index blob: 4ade71a463b1e10b26f978df1d21f1a95074e2ab
- adapter blob: a93835a7aa4d7af44f026021c22e46f06b7c9f40
- lexical annotation: 71件

公開物には形容動詞120例の CHJ raw本文を追加していない。
内部 v0.4.18 / 910例の quotation gate / final compliance BLOCK は別系統として維持。
次の最優先は公開URLでの実機目視QA。特に iPhone幅、100dvh、形容動詞の横位置、漢字補助表示、117語幹ロードを確認する。
