# HANDOFF: 古典活用表ドリル `conj`

更新: 2026-09-19

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

### 本番接続前の検証ブランチ

- branch: `conj-adjv-runtime-preview`
- `index.html` 接続試作 commit: `a230c00f6d6baf9eb4294537cd6aed668cc3816a`
- `main` の `index.html` は未変更

試作内容:
- `adjv-runtime-adapter.js` を読み込む
- 形容動詞の表ドリル用117語幹を生成
- 既存 `いたづらなり` と重複する1語幹を除外し、116項目を追加
- 本文なし項目では用例欄を自動非表示・トグル無効化
- JSON読込失敗時は従来の埋め込みデータだけで起動する
- JavaScript構文チェック: 通過
- アダプタ実データ検証: 通過
  - tableItems 117
  - exampleRefs 120
  - validation errors 0

ブラウザ実機での最終表示確認前なので、まだ `main` へは反映しない。



---


## 11. 現行正本・main接続後（2026-09-19）

この節が第10節の「本番未接続」記述を更新する。

### データ監査

- 形容動詞120例は選抜・target監査済み
- raw CSVへの再照合: 120 / 120
- originalTarget再検出: 120 / 120
- anchor一意化失敗: 0
- 統合監査: 120 / 120が正規の活用セルへ対応
- 実例禁止セル参照: 0

Drive正本:
- `活用表アプリ_形容動詞120例_公開前本文・anchor監査_2026-09-19`
- File ID: `1b-LU-wVx-hKinWEuMDlUqphAzfObYyw7xfKg8Ab4Ov8`
- CHJ本文・anchorはDriveにのみ保持し、GitHubへ複製しない

GitHub二層データ:
- `data/adjectival-noun-paradigms.json`
- `data/adjectival-noun-lemma-pool.json`
- `data/adjectival-noun-example-index-120.json`
- `data/adjectival-noun-integration-audit.json`
- `adjv-runtime-adapter.js`

### mainへの接続

commit: `6baf8cfdedfe3aad39d4f68cf2fedbbc76c6c13d`

- 起動時に `adjv-runtime-adapter.js` をロード
- 表ドリル用117語幹を生成
- 既存 `いたづらなり` と重複する1語幹を除外
- **116項目を追加**
- 本文なし項目では用例欄を自動非表示・用例トグルを無効化
- JSON読込失敗時は従来の埋め込みデータだけで起動
- main内JavaScript構文チェック: PASS
- runtimeデータ検証: PASS

### 一次資料差分修正

現行 `index.html` の助動詞「たし」から、補助活用命令形 `たかれ` を除去済み。補助活用連体形 `たかる` は保持する。

### 現在の次工程

1. 本番画面で形容動詞の表ドリル挙動を実機確認
2. 形容動詞実例120件について、再配布可能な本文ソースまたは公開可否確認済み本文を準備
3. 実例本文を公開可能なものだけ段階接続
4. タリ活用 `たら / たれ` は必要に応じて検索範囲拡張
5. 助動詞180例を一次資料確認済み正本候補へ更新


### 配備後スモーク検査

`adjv-runtime-smoke.html` を更新し、runtime JSONの整合だけでなく、配備された `index.html` が
- `adjv-runtime-adapter.js` を読み込むこと
- `loadAdjvRuntimeItems` を持つこと
- 助動詞 `たし` に `たかる` があり `たかれ` がないこと
を検査するようにした。

commit: `8492c240dbc70c3d865f492160ecd9f1eb6212dc`

## 12. 配備スモーク再検証（2026-09-19）

main接続後の状態を再確認した。

- 正規runtime層は `adjv-runtime-adapter.js` + 4つの軽量JSON
- CHJ本文・anchorはDrive正本にのみ保持する方針を維持
- 一時的に作成された本文断片入りGitHubファイルは削除済み
- `adjv-runtime-smoke.html` の旧説明をmain接続済みに更新
- スモークを117語幹 / 116追加 / 120実例索引 / 本文非混入 / no-example表示まで拡張
- inline smoke scriptに literal `</script>` が含まれていた既存不具合を修正
- 修正後のinline JavaScript構文検査はPASS

関連commit:
- policy整合修復: `49c8e993c96c68f99d7a97ed38b804d73948edde`
- smoke強化: `12b68374f31553af283f499996b723342df26dcf`
- script終端不具合修正: `29fc1e33cd91a61e5575d3c093d9d785bdf4ab15`

次工程は、公開可能な本文ソースを作品単位で整理し、確認済み実例だけを段階的に実例ドリルへ接続すること。

## 13. runtime全整合検査（2026-09-19）

形容動詞二層runtimeについて、現行mainを含む横断検査を実施し全項目PASS。

正本監査:
- `data/adjectival-noun-integration-audit.json`
- `deploymentSmoke.status = "passed"`
- commit: `5aea4f74f8ab11edd187afc3a85f03c6bfc028e1`

確認値:
- 語幹117（ナリ94 / タリ23）
- main追加116
- 実例索引120
- 公開本文混入0
- main接続・fallback・no-example guardすべてPASS
- 「たし」は `たかる` を保持し、誤った `たかれ` は無し

次は、120実例について**本文再配布可否を作品・提供元単位で確認する段階**。CHJ本文は引き続きDriveから公開側へ複製しない。

## 14. 公開実例本文ソース監査

形容動詞120例について、CHJ本文をGitHubへ複製せず、再利用条件を確認できる公開本文から実例を再構成する工程を開始。

追加:
- `PUBLIC_TEXT_SOURCE_POLICY.md`
  - 4ゲート: sourceFound / rightsVerified / targetVerified / excerptReviewed
  - 全ゲート通過前は `exampleEnabledPublic = false`
- `data/public-text-source-registry.json`
  - 21作品の候補台帳
  - 第1次探索でWikisource候補17作品

パイロット進捗:
- 方丈記: 権利確認5/5、target照合2/5、公開0
  - `data/public-text-pilot-hojoki.json`
- 古今和歌集: 権利確認4/4、target照合4/4、公開0
  - `data/public-text-pilot-kokin.json`
- 徒然草: 権利確認5/5、target照合5/5、公開0
  - `data/public-text-pilot-tsurezure.json`

合計:
- rightsVerified作品: 3
- targetVerified例: 11 / 120
- excerptReviewed: 0
- 公開実例接続: 0

原文表記差は `publicTarget` で分離し、CHJ側targetを上書きしない。
次は土佐日記・竹取物語等を同じゲートで監査し、target照合を増やす。


## 15. 公開本文4ゲート: 竹取物語完了（2026-09-19）

『竹取物語』（國民文庫・Wikisource）の4例は、sourceFound / rightsVerified / targetVerified / excerptReviewed の全ゲートを通過した。

- adjv-035 `まめなら`
- adjv-044 `けうらなり`
- adjv-064 `清（けう）らなる`
- adjv-082 `強（あながち）に`

`data/adjectival-noun-public-examples.json` に4例を接続済み。公開実例総数は7。

次の安全な開始地点:
1. 土佐日記5例のexcerptReviewedを進める
2. 徒然草5例
3. 古今和歌集4例
4. 各作品完了ごとにpublic examples / source registry / PROGRESSを更新
5. 作品単位で4ゲート完了するまでは未監査例を公開しない


## 16. 公開本文4ゲート: 土佐日記完了（2026-09-19）

『土佐日記』（國文大觀・Wikisource）5例について4ゲート完了。

公開実例総数は11。作品単位完了は竹取物語・土佐日記の2作品。

次の開始地点は徒然草5例のexcerptReviewed。完了後、古今和歌集4例へ進む。


## 17. 公開本文4ゲート: 徒然草完了（2026-09-19）

『徒然草』（國文大觀・Wikisource）5例について4ゲート完了。公開実例総数15。

次の開始地点は古今和歌集4例のexcerptReviewed。作品完了ごとに同じ小刻み記録を続ける。


## 18. 公開本文4ゲート: 古今和歌集完了（2026-09-19）

『古今和歌集』4例について4ゲート完了。公開実例総数18、作品単位完了4作品。

次は未照合例を推測で埋めず、候補本文が明確な別作品を1作品ずつ監査する。各作品完了ごとにPROGRESS/HANDOFFへ記録する。


## 19. 公開本文4ゲート: 伊勢物語完了（2026-09-19）

『伊勢物語』（群書類從・Wikisource）4例について4ゲート完了。公開実例総数22、作品単位完了5作品。

方丈記は未照合3例を保留したまま。次は少数例の作品を1作品ずつ監査し、各完了時に記録する。


## 20. 公開本文4ゲート: 蜻蛉日記完了（2026-09-19）

『蜻蛉日記』（國文大觀・Wikisource）4例について4ゲート完了。公開実例総数26、作品単位完了6作品。

表記差「ねんごろなる」→公開版「懇なる」はpublicTargetだけで保持し、CHJ targetは変更しない。次は今昔物語集4例。


## 21. 公開本文4ゲート: 今昔物語集完了（2026-09-19）

『今昔物語集』4例は、Wikisourceではなく明示CC BY-SA 4.0の「やたがらすナビ」版（芳賀矢一校訂『攷証今昔物語集』1921底本）で4ゲート完了。

公開実例総数30、作品単位完了7作品。

重要: 提供元優先順位は排他的ではない。底本・電子化方針・再利用ライセンスが明示された公開本文は、個別監査の上で使用できる。次は未発見作品を1作品ずつ探索する。


## 22. 再開確認・継続方式固定（2026-09-19）

中断後に正本を再確認。公開実例30件・完了7作品までGitHubへ保存済み。

次の開始地点:
- 未発見作品を1作品ずつ探索
- 優先: 大和物語 / 落窪物語 / 平中物語 / 十訓抄
- 4ゲート完了した作品だけ公開実例へ追加
- 作品ごとに即時チェックポイントを作る
- 障害作品は保留理由を記録して次へ進む

この節を最新の継続起点とする。


## 23. 公開本文4ゲート: 大和物語完了（2026-09-19）

『大和物語』4例をやたがらすナビ版で4ゲート完了。公開実例総数34、作品単位完了8作品。

次は同サイト収録済みの平中物語3例。作品ごとの即時記録方式を継続する。


## 24. ROADMAP正本化（2026-09-19）

長期作業の進捗管理を `conj/ROADMAP.md` に移した。

以後、再開時は ROADMAP → HANDOFF末尾 → PROGRESS末尾 → registry → public examples の順に確認する。

現在地:
- Phase D / D1
- 8 / 21作品完了
- 34 / 120例公開接続
- 次のMilestone: D-09 平中物語3例

1作品完了ごとにチェックポイントを保存し、途中障害は理由を記録して次作品へ進む。


## 25. Milestone D-09 平中物語完了（2026-09-19）

『平中物語』3例をやたがらすナビ版で4ゲート完了。

- 公開実例: 37 / 120
- 完了作品: 9 / 21
- 次: Milestone D-10 落窪物語4例

ROADMAPを現在地の正本として継続する。


## 26. Milestone D-10 落窪物語はblocked-with-reason（2026-09-19）

『落窪物語』は公開可能な画像資料（CODH CC BY-SA 4.0）を確認したが、対象4語形を検索可能な再利用本文で照合できないため公開保留。

推測転記はしない。次は D-11 十訓抄9例。


## 27. Milestone D-11 十訓抄 partial（2026-09-19）

十訓抄9例を監査一巡。5例をsame-work公開本文から接続、引用漢詩4例はparallel witnessのみのため未公開。

- 公開実例総数: 42
- 十訓抄 status: partial
- 次: D-12 宇治拾遺物語6例


## 28. Milestone D-12 宇治拾遺物語完了（2026-09-19）

『宇治拾遺物語』6例を、やたがらすナビ陽明文庫本で4ゲート完了。

現在地:
- 監査status確定: 13 / 21作品
- publicationReady: 10
- partial: 2
- blocked-with-reason: 1
- 公開実例: 48 / 120
- runtime errors: 0

作品単位の権利・底本確認 + 用例単位のtarget/excerpt監査方式を継続する。

次: Milestone D-13 枕草子6例。


## 29. Milestone D-13 枕草子 partial（2026-09-19）

『枕草子』6例を監査一巡し、國文大觀版で文法形まで一致する2例を公開接続。4例は版差・固定版照合不足のため保留。

現在地:
- 監査status確定: 14 / 21作品
- publicationReady: 10
- partial: 3
- blocked-with-reason: 1
- 公開実例: 50 / 120
- runtime errors: 0

次: Milestone D-14 更級日記5例。


## 30. Milestone D-14 更級日記 partial（2026-09-19）

『更級日記』5例を監査一巡し、Wikisource旧版本で同一箇所・同一文法形まで確認できた4例を公開接続。adjv-033「安らかなら」は固定版の当該箇所欠落により保留。

現在地:
- 監査status確定: 15 / 21作品
- publicationReady: 10
- partial: 4
- blocked-with-reason: 1
- 公開実例: 54 / 120
- runtime errors: 0

次: Milestone D-15 紫式部日記5例。


## 31. Milestone D-15 紫式部日記完了（2026-09-19）

『紫式部日記』5例を渋谷栄一校訂Wikisource版で4ゲート完了。

現在地:
- 監査status確定: 16 / 21作品
- publicationReady: 11
- partial: 4
- blocked-with-reason: 1
- 公開実例: 59 / 120
- runtime errors: 0

同版のライセンスはCC BY-SA 3.0として保持。

次: Milestone D-16 源氏物語5例。


## 29. 中納言表記優先ルール（2026-09-19）

公開本文との異同について、根拠不明の場合は校正済みCHJ / 中納言表記を優先する。

- chjTarget = 文法分類上の基準
- publicTarget = 公開版の実表記
- 表記差のみ: 接続可
- 文法形差・語形差で根拠不明: 公開接続しない
- 版・底本・校訂方針に妥当な根拠あり: 注記付きで例外可
- 同語形の別箇所への置換は禁止

次の作業はROADMAPの D-14 更級日記5例から継続。


## 32. Milestone D-17 平治物語 blocked（2026-09-19）

『平治物語』は有朋堂文庫1927年版のPDスキャンを作品単位ソースとして確保したが、7選抜例を同版で安全に検索・照合できる本文層がなく、targetVerifiedを通せないためblocked-with-reason。

- 権利問題: 解消
- 本文照合: 未解決
- 公開実例: 64 / 120
- 監査status確定: 18 / 21

次: D-18 保元物語10例。


## 33. Milestone D-18 保元物語 blocked（2026-09-19）

『保元物語』は有朋堂文庫1927年版のPDスキャンを確保したが、10選抜例を同版で安全に検索・照合できる本文層がなくblocked-with-reason。

- 権利問題: 解消
- 本文照合: 未解決
- 公開実例: 64 / 120
- 監査status確定: 19 / 21

次: D-19 堤中納言物語5例。


## 34. Milestone D-19 堤中納言物語 blocked（2026-09-19）

『堤中納言物語』はPD/CC BY-SAの画像資料を確保できたが、CHJ選抜5例を再利用可能な検索本文で同一箇所照合できないためblocked-with-reason。

- 公開実例: 64 / 120
- 監査status確定: 20 / 21
- Phase D未確定は平家物語のみ

次: D-20 平家物語16例。
