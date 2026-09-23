# HANDOFF: 古典活用表ドリル `conj`

更新: 2026-09-24

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


---

## 11. ホーム画面アイコン・表示名（2026-09-24）

ホーム画面アイコン対応は **main 反映・GitHub Pages 公開反映まで完了**。公開URLでの反映は依頼者が確認済み。

### 現行構成

- `conj/icon.svg`
  - 1024×1024 のSVGコンテナ
  - 採用済みの「ネコチャン＋縦長吹き出し＋縦書き1列『活用練習』」画像を埋め込み
  - 画像実体はSVG内のWebPデータとして保持し、別PNGは置かない構成
- `conj/manifest.webmanifest`
  - `name`: 「古典文法活用ノート」
  - `short_name`: 「活用ノート」
  - `display`: `standalone`
  - icon は `./icon.svg`（`sizes: "any"`）
- `conj/index.html`
  - favicon: `./icon.svg`
  - apple-touch-icon: `./icon.svg`
  - manifest: `./manifest.webmanifest`
  - `theme-color` 設定済み
  - `apple-mobile-web-app-title`: 「活用ノート」

**アイコン画像内の文字は「活用練習」だが、ホーム画面に保存したときのアプリ名は「活用ノート」**。これは現行の確定状態として扱う。

### 関連コミット

- `5152510242bf810c765beecb760a53a4e561cda4` — `feat(conj): add home screen icon`
- `5f686405d048913faf218fc67832614f49dba9ba` — `fix(conj): use approved home screen icon artwork`
- `be777a04ebec2f956a2d650c68c0d15ba1c5a472` — `fix(conj): repair approved icon asset`
- `3fdc62ff0907ef76a0112d22f000b9d0ddaf2438` — タイトル下キャプション削除・タイトルを丸ゴシックへ
- `b371c4debe5f07c7d5a491cdb0f3f8cc2670e729` — ホーム画面保存時の表示名を「活用ノート」へ

このアイコン対応については **追加作業なし**。端末固有の表示不具合が報告された場合のみ再調査する。


---

## 12. ChatGPT 非ローカル再開指示・停止記録（2026-09-24）

### 最重要: 今回はローカル作業ではない

**正本は GitHub `yama-books/koten` の `main`。対象は `conj/`。**

- `C:\\Users\\user\\AI開発\\koten` などのローカルリポジトリは、今回の作業では使用しない。
- GitHub 上の `yama-books/koten` を直接読み、GitHub 上で作業する。
- 「非公開リポジトリなのでローカルから読む」という旧資料の一般指示を、今回の `yama-books/koten` の `conj` 作業へ誤適用しない。
- `conj` 以外は原則変更しない。例外は `conj` 専用テスト `tests/unit/conj-record-screen.test.ts` など、引継ぎで明示された対象のみ。
- 実装は一度に進めず、**残作業を1節ずつ実装 → 検証 → 作業記録 → いったん停止**する。コンテキストが長くなったら、区切りのよい地点で本HANDOFFを更新して次セッションへリレーする。

### 今回の停止状態

このセッションでは、認識修正後に GitHub `yama-books/koten/main` へ接続し、`conj/` の存在と以下を確認した。

- `conj/HANDOFF.md` が現行の引継ぎファイルとして存在する。
- `tests/unit/conj-record-screen.test.ts` を取得できた。
- 同テストには現在、`.review-copy small` の `font-size:8px` や、記録画面の既存CSS値を直接検査するテストが残っている。作業1でCSSを直す際は、テストを削除せず、新しいレイアウト意図・最低文字サイズに合わせて更新する。
- `conj/index.html` は GitHub 上に存在し、確認時の blob SHA は `95381ceef189a491d09a73f15d91f5903b81eea7`、サイズは約 2.9 MB（2,924,151 bytes）。
- このセッションの GitHub connector の通常 `fetch_file` では、巨大な `conj/index.html` の本文が空文字で返った。**これはファイルが空という意味ではない。** 次セッションでは、GitHub の別の取得経路（blob/API等）または部分取得可能な方法を使い、実体を読んでから編集すること。ローカルへ切り替える理由にはしない。
- コード実装・CSS変更・テスト変更・ブランチ作成・PR作成・mainへの実装反映・Pages公開は、このセッションではまだ行っていない。

### 次に着手するのは「作業1」だけ

**作業1: 記録画面の PC 表示崩れを直す。**

対象:
- `conj/index.html`
- `tests/unit/conj-record-screen.test.ts`

確認・修正する主なCSS:
- `.record-overview`
- `.record-grid`
- `.record-stat`
- `.record-breakdown-panel`
- `.record-breakdown`
- `.record-review`
- `.review-copy`
- スマホ用 `@media(max-width:700px)` / `@media(max-width:350px)`

症状:
1. PC幅で「取り組んだ問題／正答数／正答率」の箱が、ドーナツ横の凡例へ重なる。
2. 8〜9px指定が多く、文字が小さすぎる。
3. 「要確認」カードの活用種類名（上二段活用・下二段活用等）が途中改行される。

受入条件:
- PC 1024〜1280px とスマホ 375〜390px の両方で要素が重ならない。
- 本文文字は原則12px以上、補足文字も10px以上を目安にする。
- 活用種類名は1行（`white-space:nowrap` とカード幅を調整）。
- 現在の8px等の値を直に期待するテストは、新しい意図を検査する形へ書き換える。単にテストを削除しない。

### 作業1の完了後

- 必要なテスト／CI相当の確認結果を記録する。
- 変更ファイル、受入条件の結果、未確認点、コミット／PR／公開の状態を本HANDOFFへ追記する。
- **作業2（配色のCSS変数化）へは同じセッションで自動的に進まず、一度停止する。**

### その後の残作業順

1. 作業1: 記録画面のPC表示崩れ修正
2. 作業2: 配色の土台（直書き色をCSS変数へ）
3. 作業3: 配色切替・既定コーヒー化（系統数5/6は人確認事項）
4. 作業4: 設定画面（配色・記録の書き出し／読み込み／消去）
5. 作業4.6: ホーム画面追加案内の「×」改行修正
6. 作業4.7: CHJ引用用例の縦書き「…」と抜粋端の監査
7. 作業5: 全体確認・公開

作業4.5「ホーム画面への追加案内」の基本実装は完了済みなので、再実装しない。


---

## 13. 作業1 完了記録（2026-09-24）

### 実施範囲

今回実施したのは **作業1「記録画面のPC表示崩れ修正」だけ**。作業2「配色の土台（直書き色をCSS変数へ）」以降には着手していない。

実際に変更したファイル:
- `conj/index.html`
- `tests/unit/conj-record-screen.test.ts`
- `conj/HANDOFF.md`（本記録のみ）

### 実装内容

`conj/index.html` の既存v44レイアウトを巻き戻さず、末尾に **v46: record layout readability guard** を追加した。

- PC側は `860px` 以上で `.record-shell` を最大 `900px` まで広げる。
- PC側の `.record-detail-grid` は、内訳側に `minmax(420px,1fr)` を確保する。
- `.record-overview` は「内訳」と「3統計」の領域を明示的に分離し、内訳側は `minmax(220px,1fr)`、統計側は `150px` とした。
- `.record-overview .record-breakdown-panel` の凡例側を `max-content` ではなく `minmax(0,1fr)` に変更し、凡例が統計欄へ侵入しない構造にした。
- `859px` 以下では `.record-detail-grid` を1列にし、中間幅でも窮屈な2列配置を作らない。
- `700px` 以下では内訳と統計の幅を再配分し、凡例側も `minmax(0,1fr)` のまま収める。
- `460px` 以下では「要確認」カードを1列に落とす。375〜390pxはこの分岐に入る。
- `.review-kind-line strong` に `white-space:nowrap` を追加し、「上二段活用」「下二段活用」等を途中改行しない。

### PC表示の受入条件

対象: 1024〜1280px。

**CSS構造上は受入条件を満たすことを確認済み。** `box-sizing:border-box` の現行前提で、1024px以上では900pxのrecord shell内に、内訳側420px以上＋要確認側を確保する。内訳カード内も、ドーナツ・凡例・150pxの統計列を別グリッド領域へ分離したため、旧状態の「凡例が統計箱へ重なる」原因だった `max-content` のはみ出しを除去した。

ただし、今回の非ローカルGitHub connector環境には実ブラウザを任意viewportで起動する経路がなく、**1024 / 1280pxの実ピクセル描画スクリーンショット確認は未実施**。構造・CSS契約の検証までを完了としている。

### スマホ表示の受入条件

対象: 375〜390px。

**CSS構造上は受入条件を満たすことを確認済み。** `max-width:460px` で要確認カードを1列化し、`max-width:700px` では内訳の凡例列を縮小可能な `minmax(0,1fr)` とした。旧v44の後段指定で2列に戻っていた要確認カードを、v46の後段指定で確実に1列へ戻している。

ただしPCと同様、**375 / 390pxの実ブラウザ描画確認は未実施**。

### 最低文字サイズ対応

v46で記録画面の主要表示を次の下限へ上書きした。

- 主要表示: 12px以上
  - 統計ラベル
  - ポイントラベル
  - 内訳ラベル／件数
  - 要確認フィルタ
  - 空状態表示
- 補足表示: 10px以上
  - ドーナツ中央の「問」
  - 誤答率ラベル
  - `review-copy small`
  - 品詞バッジ

旧CSS中の8〜9px指定そのものは過去の版として残るが、**v46が後段で上書きする**。新しいテストは旧値の存在ではなく最終ガードの下限を検査する。

### 活用種類名のnowrap対応

`.review-kind-line strong` に:

- `white-space:nowrap`
- `overflow-wrap:normal`

を設定。スマホではカード自体を1列化して横幅を確保するため、nowrapだけで無理に押し込む構造にはしていない。

### テスト更新内容

`tests/unit/conj-record-screen.test.ts` の旧テスト
`conj: review status stays readable and summary stats use compact rows`
を、
`conj: record screen keeps summary, legend, and review cards readable across widths`
へ置き換えた。

削除ではなく、以下の表示意図を検査するテストへ更新した。

- PC用record shell／detail gridの幅確保
- `record-overview` の内訳・統計の領域分離
- 凡例側が `max-content` で外へ張り出さないこと
- 700px以下でも凡例側が縮小可能であること
- 460px以下で要確認カードが1列になること
- 活用種類名がnowrapであること
- 主要表示が12px以上であること
- 補足表示が10px以上であること
- 「取り組んだ問題」表示自体が残っていること

### 実行した検証と結果

GitHub上の更新後blobに対し、新テストと同じ条件を直接評価した。

結果:
- desktop shell幅ガード: PASS
- desktop detail grid幅ガード: PASS
- overview領域分離: PASS
- breakdown凡例の `minmax(0,1fr)`: PASS
- breakdownの `max-content` 除去: PASS
- 700px以下の凡例縮小ガード: PASS
- 460px以下の要確認1列化: PASS
- 活用種類名nowrap: PASS
- 主要表示の最小font-size: **12px**
- 補足表示の最小font-size: **10px**
- 旧 `font-size:8px` を期待するテスト: **残存なし**

PR作成後にGitHubのチェック状態も確認したが、PR head commitに対する **Actions workflow run 0件 / commit status 0件** だった。このため、GitHub側の自動CIとしての `npm test` は実行されていない。非ローカル作業の制約を守るため、ローカルへ切り替えてのnpm実行は行っていない。

### 未確認事項

- 1024px / 1280px の実ブラウザ描画スクリーンショット
- 375px / 390px の実ブラウザ描画スクリーンショット
- `npm run test:node -- ...` 相当のNode実行（GitHub側にPR CIが起動しなかったため）
- GitHub Pagesの公開URL実体。公開URLを外部Web経路から取得しようとしたが、このセッションではアクセスできず、GitHub connectorにもPages build状態を読むアクションがないため、**Pages反映は未確認**。

次の担当者が実機／ブラウザで見る場合は、上記4幅を優先する。表示不具合がなければ作業1を再実装しない。

### コミット／PR／main／Pages状態

- 実装commit: `2a02739d79a8600a5c4e6b12885057f268bc26d1` — `fix(conj): stabilize record screen layout`
- テストcommit: `fcea4890fc1b2792c9c30d5e33064cad93e7c524` — `test(conj): assert record screen readability`
- PR: **#32** `fix(conj): stabilize record screen layout`
- PR状態: **merged**
- main merge commit: `738dff508846d57e2382865d3b577b7b38188d35`
- main反映: **完了**
- Pages公開反映: **未確認**（公開URL／Pages build状態をこの環境から確認できなかったため）

### 停止位置

**作業1はここで停止。作業2「配色の土台（直書き色をCSS変数へ）」へは進まない。**


---

## 14. 作業2 着手前停止記録（2026-09-24）

### 今回実施したこと

作業2「配色の土台（直書き色をCSS変数へ）」へ着手する前段として、GitHub `yama-books/koten` の `main` を正本に以下を再確認した。

- §12「ChatGPT 非ローカル再開指示・停止記録（2026-09-24）」を再読。
- §13「作業1 完了記録（2026-09-24）」を再読。
- 作業1は完了済みであり、再実装・巻き戻ししないことを確認。
- `conj/index.html` を `main` から部分取得しようとしたが、GitHub connector の通常 `fetch_file` では今回も本文が空文字で返った。
- ただし現行 `conj/index.html` の blob SHA は **`a487ac57c37b8f61f747e3b44f307fe2c574b7d9`** と取得できており、ファイル自体が空ではない。
- 前回記録時の blob SHA `95381ceef189a491d09a73f15d91f5903b81eea7` から更新されているため、次回は必ず現行 `main` の blob/API 等の別取得経路を使う。過去blobを固定利用しない。

### 今回は未実施

ユーザー指示により、ここで停止したため以下は未実施。

- 色指定の棚卸し
- CSSカスタムプロパティ設計
- 直書き色のCSS変数化
- `conj/index.html` の変更
- テスト追加・更新
- 作業2用ブランチ／PR
- 作業2のcommit
- mainへの作業2反映
- Pages公開確認

したがって、**作業2は未着手のまま**である。

### 次回の再開位置

次のセッションでは、まず本節と§12・§13を読む。その後、

1. `conj/index.html` の現行 `main` blob `a487ac57c37b8f61f747e3b44f307fe2c574b7d9` を入口に、`fetch_blob` 等のGitHub側の別取得経路で本文を取得する。
2. 現行CSSの色指定を用途別に棚卸しする。
3. 作業1のv46記録画面ガードを維持したまま、作業2「配色の土台」だけを実装する。
4. 既定配色は変えない。
5. テスト・検証・HANDOFF追記まで完了したら停止する。
6. **作業3「配色切替・既定コーヒー化」へは進まない。**

### 停止位置

**作業2は未着手。次回は現行mainの巨大 `conj/index.html` をGitHub blob/API経路で取得するところから再開する。**


---

## 15. 作業2 進行記録（2026-09-24・着手）

### 状態

**作業2「配色の土台（直書き色をCSS変数へ）」へ着手済み。未着手ではない。**

- 正本: GitHub `yama-books/koten` の `main`
- 作業ブランチ: `work/conj-css-color-foundation-20260924`
- ローカルファイルは使用していない。
- §12〜§14を再読し、作業1のv46記録画面ガードを維持する前提を確認した。
- 現行mainの `conj/index.html` blob `a487ac57c37b8f61f747e3b44f307fe2c574b7d9` を `fetch_blob` 経路で取得できた。
- 色指定の棚卸しを開始した。現行 `:root` には既存の色変数がある一方、CSS本文には `#fff`、状態色、半透明背景・影などの直書き指定が多数残っている。

### 次の作業

1. CSS内の色指定を用途別に全件棚卸しする。
2. 巨大なデザイントークン化は避け、現行用途に必要な最小限の意味変数を追加する。
3. 既定色を変えずに直書き色を対応変数へ置換する。
4. 作業2用テストを追加／更新し、作業1 v46ガードも回帰確認する。
5. 本節を完了記録へ更新し、PR・main反映後に停止する。

**作業3以降には進まない。**


### 作業2 中間チェックポイント（CSS変数化実装済み・テスト前）

- `conj/index.html` のCSS配色土台を実装済み。
- 実装commit: `203437800ec8a0c54bd1bac541c0fc1f9d3552e0` — `refactor(conj): route palette colors through CSS variables`
- `:root` の色変数は既存分を含め **70個**。単なる連番トークンではなく、surface/text、accent/learning state、translucent layer、level/help、record/review、elevation の用途別に整理した。
- `.record-screen` に局所定義されていた `--record-verb / --record-adj / --record-adjv / --record-aux / --record-empty` は、後続テーマ切替から上書きできるよう `:root` へ移した。値は変更していない。
- CSS本文の固体色（hex）は `:root` 外で0件まで置換した。
- 背景・境界・outlineに使うテーマ依存の直書き `rgba(...)` も変数化した。
- `box-shadow` の半透明色、`transparent` は装飾・透明指定として現時点では直書きを残した。これらまで機械的にトークン化することは作業2の目的に不要と判断した。
- 作業1の `v46: record layout readability guard` は変更前後で文字列一致を確認し、変更していない。
- 既定色の値はすべて元の値をCSS変数へ移しただけで、意図的な配色変更は行っていない。

**現在は「実装済み・テスト更新前」。作業2は明確に進行中。**


### 作業2 中間チェックポイント（テスト更新・静的検証完了）

- テストcommit: `297ddc027b3b0a4b9c0d974af60b4597c3292894` — `test(conj): guard semantic palette variables`
- `tests/unit/conj-record-screen.test.ts` に作業2用ガードを追加。既存テストは削除していない。
- 新規ガードは、主要CSS変数の既定値が従来色と一致すること、`:root` 外のCSS本文に固体色hexが残っていないこと、非shadow用途の直書き `rgba(...)` が残っていないこと、主要UIが用途別変数を参照することを検査する。
- GitHub connector上で変更前main blobと変更後branch blobを直接比較して、以下を確認した。
  - `<style>` 外のHTML/JS: **完全一致**
  - 作業1 v46ブロック: **完全一致**
  - `:root` 外の固体色hex: **0件**
  - 背景・境界・outline等の非shadow直書きrgba: **0件**
  - `:root` 色変数: **70個**
  - record分類色5種: 従来値のまま `:root` に存在
  - 460px以下の要確認1列化: 維持
  - 活用種類名nowrap: 維持
  - 主要文字12px以上／補足文字10px以上のv46ガード: 維持

### テスト実行上の注意

この非ローカルconnector環境では任意のNodeコマンドを直接起動する実行器がないため、現時点では `node --test` / npm test のプロセス実行はしていない。代わりに、追加テストと同じ正規表現・不変条件をGitHub上の実blobに対して直接評価し、すべてPASSした。PR作成後にGitHub Actionsの有無も確認する。

**現在は「実装・テスト更新・静的検証済み、PR作成前」。作業3には未着手。**


---

## 16. 作業2 完了記録（2026-09-24）

### 実施範囲

今回実施したのは **作業2「配色の土台（直書き色をCSS変数へ）」だけ**。作業3「配色切替・既定コーヒー化」以降には着手していない。

実際に変更したファイル:
- `conj/index.html`
- `tests/unit/conj-record-screen.test.ts`
- `conj/HANDOFF.md`

### CSS変数の整理方針

既存の `:root` 変数を残しつつ、直書き色を「値」ではなく用途で参照できるように整理した。最終的な `:root` のカスタムプロパティは70個。巨大なテーマ定義を別層に増設したのではなく、現行単一配色を安全に切り替えられる最小の意味層として、次の6群に整理している。

- Core surfaces and text
- Accent and learning states
- Translucent theme layers
- Level/help text
- Record screen and review states
- Decorative elevation

既存変数 `--bg / --card / --ink / --muted / --line / --line-strong / --soft / --soft2 / --good / --bad / --accent / --accent-strong / --accent-soft / --peach-soft / --lavender-soft / --shadow` は値を変えていない。

### 新設・移設した主なCSS変数と移行元

Core / surface:
- `#304b45 -> --heading-ink`
- `#ffffff（accent上の文字） -> --on-accent`
- `#fbfefd -> --surface-faint`
- `#fdfefd -> --card-gradient-end`
- 背景としての `#fff` は既存 `--card:#ffffff` へ統一

Accent / learning state:
- `#50776d -> --tag-ink`
- `#84938f -> --zero-ink`
- `#f4faf8 -> --subrow-bg`
- `#abc9c0 -> --blank-border`
- `#c8ddd7 -> --blank-filled-border`
- `#eef9f5 -> --editable-hover`
- `#e8f7f2 -> --editable-selected`
- `#8fb8ad -> --editor-border`
- `#b8d5cd -> --aux-border`
- `#f3faf8 -> --aux-bg`
- `#506c65 -> --aux-ink`
- `#f1f8f5 -> --table-label-bg`
- `#334d47 -> --table-label-ink`
- `#9fc4b9 -> --control-hover-border`
- `#f2faf7 -> --control-hover-bg`

Translucent theme layer:
- `rgba(210,241,233,.62) -> --page-glow-primary`
- `rgba(226,236,250,.48) -> --page-glow-secondary`
- `rgba(255,255,255,.88) -> --toolbar-bg`
- `rgba(142,211,191,.36) -> --example-mark-bg`
- `rgba(0,0,0,.35) -> --source-backdrop`
- `rgba(111,166,150,.16) -> --focus-ring-soft`
- `rgba(111,166,150,.24) -> --focus-ring`
- `rgba(255,255,255,.82) -> --level-meter-bg`
- `rgba(255,255,255,.72) -> --surface-glass`

Level/help:
- `#82938e -> --level-tick-ink`
- `#657872 -> --level-desc-ink`
- `#667873 -> --level-note-ink`
- `#c9dcd6 -> --level-aux-border`

Record/review:
- 既存の `--record-verb:#935568 / --record-adj:#b77d55 / --record-adjv:#39756f / --record-aux:#3d566b / --record-empty:#e8eef1` は、`.record-screen` の局所定義から `:root` へ移設。値は不変。
- `#e7f1ee -> --record-donut-base`
- `#d2dfe5 -> --record-points-border`
- `#eef3f6 -> --record-points-bg-end`
- `#e0e5e7 -> --record-review-border`
- `#fcfcfb -> --record-review-bg`
- `#fbfcfc -> --record-stat-bg`
- `#f2f5f6 -> --record-empty-bg`
- `#f3d8df -> --review-error-border-base`
- `#906674 -> --review-error-ink-base`
- `#ead9df -> --review-error-border`
- `#f8eff2 -> --review-error-bg`
- `#825d69 -> --review-error-ink`
- `#f5f7f7 -> --review-hover-bg`
- `rgba(220,231,238,.5) -> --record-glow-primary`
- `rgba(222,237,234,.44) -> --record-glow-secondary`
- `rgba(29,45,42,.5) -> --review-backdrop`
- `rgba(92,119,112,.22) -> --review-modal-border`

### あえて変数化しなかった色・理由

「直書き色ゼロ」は機械目標にしていない。次は意図的に残した。

- `box-shadow` 内の半透明 `rgba(...)`: 現在は色相そのものより elevation / 奥行き表現の固定装飾として働いており、今回これを個別トークン化すると変数層だけが肥大化するため残した。
- `transparent`: 色相を持たない透明指定なので変数化しない。
- `<meta name="theme-color" content="#f7fbfa">`: CSSではなくHTMLメタデータ。作業3で実テーマ切替を入れる場合に、必要ならテーマと同期する。
- JS内のrecord色フォールバック（`#935568 / #b77d55 / #39756f / #3d566b / #e8eef1`）: 通常経路では `getComputedStyle(...).getPropertyValue("--record-*")` が必ず先に使われる防御用fallbackで、CSS配色の正本ではない。今回はJSロジックを変更しない範囲を優先した。
- SVG / 埋め込み画像の固定色: 今回は画像資産のテーマ化を対象外とした。

### 現行配色の維持

**維持できている。**

- すべての新規変数には置換前の値をそのまま設定した。
- 変更前main blobと変更後branch blobを比較し、`<style>` 外のHTML/JSが完全一致することを確認した。
- CSSは色参照経路だけを変更しており、HTML構造・JSロジック・寸法・レイアウト値は変更していない。
- 実ブラウザのスクリーンショットによるピクセル比較は未実施。

### 作業1 v46記録画面ガード

**維持済み。**

変更前後の `/* ===== v46: record layout readability guard ===== */` 以降を文字列比較し、完全一致を確認した。

したがって以下も維持:
- PC側の記録画面領域分離
- 460px以下で「要確認」カード1列
- 活用種類名 `white-space:nowrap`
- 主要文字12px以上
- 補足文字10px以上

### テスト更新

`tests/unit/conj-record-screen.test.ts` に
`conj: palette defaults are semantic CSS variables and preserve the current colors`
を追加した。既存テストは削除していない。

追加ガード:
- 主要CSS変数の既定値が従来色と一致
- `:root` 外のCSS本文に固体色hexが残らない
- `:root` 外で残る直書き `rgba(...)` は `box-shadow` 用だけ
- ページ背景・hover/selected・review error・review hover・record背景が意味変数を参照
- 既存v46テストはそのまま残し、回帰検査を継続

### 実行した検証と結果

PR #37 の GitHub Actions CI run #1306 で、以下を含む **verify job 全体がsuccess**。

- `npm run check:eol`: success
- `npm ci`: success
- `npm run typecheck`: success
- `npm run lint`: success
- `npm test`: success
- `npm run data:check`: success
- `npm run build`: success
- Playwright Chromium install: success
- `npm run check:font`: success
- `npm run check:font-assets`: success
- `npm run check:font-weight`: success
- `npm run check:overflow`: success
- `npm run scan:publish`: success

加えてGitHub connector上の実blob監査:
- `:root` 外の固体色hex: 0件
- 背景・境界・outline等の非shadow直書きrgba: 0件
- `<style>` 外のHTML/JS: 変更前mainと完全一致
- v46 block: 変更前mainと完全一致

### commit / PR / main

- 着手記録commit: `f66e1f262aeaca3f0266f43b2b567432941108f4`
- 実装commit: `203437800ec8a0c54bd1bac541c0fc1f9d3552e0`
- 中間記録commit: `926f7b0c5ea7e4471c012103a7d9c1380cf8519b`
- テストcommit: `297ddc027b3b0a4b9c0d974af60b4597c3292894`
- 検証記録commit: `4e9d604336009aeb7b13f16d23cf77223b46232c`
- PR: **#37** `refactor(conj): establish semantic color variable foundation`
- PR状態: **merged**
- main merge commit: `729c24b21d23e47e63b45ca2f43fc4b4757e975b`
- main反映: **完了**

### Pages公開状態

mainへの反映は完了。GitHub connectorにはPages build状態を直接読むアクションがなく、公開URL `https://yama-books.github.io/koten/conj/` もこのセッションの外部Web取得経路ではアクセスできなかったため、**Pages公開実体の反映確認は未確認**。

### 未確認事項

- 公開URL上でのPages反映
- 変更前後の実ブラウザ・スクリーンショットによるピクセル比較

CIの `check:overflow` を含む機械検証は全項目成功している。

### 最終停止位置

**作業2完了。次は作業3: 配色切替・既定コーヒー化。**

ただし配色系統数5/6は人確認事項であり、AIだけで決めない。作業3はこのセッションでは開始しない。


---

## 17. 作業2 補足修正チェックポイント（2026-09-24）

### 追加指示と優先関係

作業2のPR #37がmainへ反映された後、ユーザーから次の追加指示を受けた。

> ドーナツグラフと記録欄の品詞別の色は固定。今回は変更しないこと。

この指示を作業2の最終境界として優先する。§16のうち、`--record-verb / --record-adj / --record-adjv / --record-aux / --record-empty` を `:root` へ移して後続テーマから上書き可能にした、という部分だけは本節で補正する。その他の作業2成果・意味変数化・CI成功記録は維持する。

### main進行の検出と stale branch の扱い

本セッション開始時に作成した `codex/conj-work2-color-tokens-20260924` は、作業中にmainが7コミット進み、同時進行のPR #37が作業2を完了・mergeしていたため **mergeしない**。巻き戻し事故を避けるため、このstale branchの変更は正本へ採用しない。

補正は現行mainから新規に作成した以下のbranchだけで行う。

- `codex/conj-work2-fixed-record-colors-20260924`

### 実装した補正

変更ファイル:
- `conj/index.html`
- `tests/unit/conj-record-screen.test.ts`
- `conj/HANDOFF.md`

`conj/index.html`:
- `:root` から以下を除外した。
  - `--record-verb:#935568`
  - `--record-adj:#b77d55`
  - `--record-adjv:#39756f`
  - `--record-aux:#3d566b`
  - `--record-empty:#e8eef1`
  - `--record-donut-base:#e7f1ee`
- 品詞4色と空状態色は、作業2以前と同じく `v42 .record-screen` の局所固定変数へ戻した。値は一切変更していない。
- ドーナツ基底色は `background:#e7f1ee` の固定指定へ戻した。
- JS側の品詞色・空状態色fallbackも従来値のまま変更していない。
- 記録画面以外の作業2意味変数化は維持した。

### テスト更新

既存の作業2テストを削除せず、境界だけを追加指示へ合わせて更新した。

- 通常テーマ用の色は引き続き `:root` の意味変数であることを検査。
- record品詞色・ドーナツ色が `:root` に存在しないことを検査。
- `v42 .record-screen` に品詞色4種＋空状態色が従来値のまま固定されることを検査。
- ドーナツ基底色 `#e7f1ee` が固定指定であることを検査。
- 上記固定色を除いたCSS本文に固体色hexが残らないことを検査。
- rgba直書きは従来どおりbox-shadow用途だけであることを検査。

### connector上の静的検証

現行mainの作業2完了blobと補正後blobを直接比較し、以下を確認した。

- record色6項目が `:root` から除外: PASS
- 品詞4色＋空状態色が `.record-screen` に従来値で存在: PASS
- ドーナツ基底色 `#e7f1ee` 固定: PASS
- 固定record色を除く `:root` 外の固体色hex: 0件
- 非shadow用途の直書きrgba: 0件
- 作業1 `v46: record layout readability guard`: **補正前mainとバイト単位で完全一致**
- 460px以下の要確認1列化: PASS
- 活用種類名 `white-space:nowrap`: PASS

### 現時点のcommit

- 補正実装: `2eae70a272235acbb7cc5683cb40f63c56721806` — `fix(conj): keep record palette fixed`
- テスト更新: `c09715d7615e2a8a6a8150f40a484885a50be845` — `test(conj): keep record colors outside theme tokens`

PR / GitHub Actions / main / Pages 状態は次のチェックポイントで追記する。

### 停止境界

作業3へは進んでいない。補正PRを検証・main反映し、作業2の最終状態を固定した時点で停止する。

### PR / CI / main / Pages 確定記録

- HANDOFF補足記録commit: `d2166b168fa279ccecb7a6134dbd957929f20583` — `docs(conj): record fixed record-color boundary`
- PR: **#38** `fix(conj): keep record palette fixed`
- GitHub Actions: **CI run #1318 / verify = success**
- CIで成功した主な工程:
  - `npm run check:eol`
  - `npm ci`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run data:check`
  - `npm run build`
  - Playwright Chromium install
  - `npm run check:font`
  - `npm run check:font-assets`
  - `npm run check:font-weight`
  - `npm run check:overflow`
  - `npm run scan:publish`
- PR状態: **merged**
- main merge commit: `d32a9af8955ab0ce2760bf657ba8b7d54623aa82`
- main反映: **完了**
- Pages公開状態: **未確認**。公開URL `https://yama-books.github.io/koten/conj/` を外部Web経路から確認したが、この環境ではURLへアクセスできなかった。GitHub connectorにもPages build状態を直接取得するアクションはない。

### 作業2 最終停止位置

**作業2完了。次は作業3: 配色切替・既定コーヒー化。**

ただし、ドーナツグラフと記録欄の品詞別カラーは固定色として扱い、後続テーマ切替の対象にしない。配色系統数5/6は引き続き人確認事項であり、AIだけで決めない。**作業3には未着手のまま停止する。**



---

## 18. 作業2 完了状態監査・中間記録（2026-09-24）

今回は新規実装ではなく、現行 `main` 上で作業2がすでに完了しているかを確認する監査セッション。

### ここまでにGitHub実体で確認できたこと

- 正本: `yama-books/koten`
- 基準ブランチ: `main`
- 対象: `conj/`
- ローカルファイルは使用していない。
- コード変更・CSS追加置換・作業3への着手は行っていない。
- `main` と `codex/conj-work2-css-vars-20260924` の比較では、作業ブランチ側の差分は `conj/HANDOFF.md` の記録だけで、未反映の `conj/index.html` 実装は存在しない。
- 現行 `main` の `conj/index.html` blob SHA は `7ccf2172ccdfe49fee9cfa75caad8a736f6c3326`。
- PR #38 merge commit `d32a9af8955ab0ce2760bf657ba8b7d54623aa82` 以降、現行 `main` で進んだ変更は `conj/HANDOFF.md` だけで、`conj/index.html` と `tests/unit/conj-record-screen.test.ts` のblobはPR #38 merge時点から変化していない。

### PR / CI 監査

PR #37:
- `refactor(conj): establish semantic color variable foundation`
- 状態: **merged**
- merge commit: `729c24b21d23e47e63b45ca2f43fc4b4757e975b`
- GitHub Actions CI: **success**

PR #38:
- `fix(conj): keep record palette fixed`
- 状態: **merged**
- merge commit: `d32a9af8955ab0ce2760bf657ba8b7d54623aa82`
- GitHub Actions CI: **success**

したがって、少なくとも **作業2本体のPR #37と固定色補正PR #38はいずれもGitHub上でmerge済みで、両PRのCIも成功している** ことをHANDOFF記録ではなくGitHub実体で再確認した。

### 監査の停止位置

この記録は監査の中間チェックポイントであり、作業2を再実装する根拠ではない。
次は現行 `main` の実体について、CSS変数化・固定色境界・作業1 v46ガード・テスト内容を引き続き監査する。
作業3には進まない。


---

## 19. 作業2 完了状態監査・再開チェックポイント（2026-09-24）

ユーザー指示により、監査を小刻みに区切って進める。

### 再開時点で確定していること

- 完全非ローカル作業。正本は `yama-books/koten`、基準ブランチは `main`、対象は `conj/`。
- 新規実装は行わない。作業3へ進まない。
- 現行 `main` HEAD は `cfe62fb4d4b46b0050be31ff02d4be38c4f98eb4`。
- `conj/index.html` blob SHA は `7ccf2172ccdfe49fee9cfa75caad8a736f6c3326`。
- `tests/unit/conj-record-screen.test.ts` blob SHA は `84c6f610d8d459b21c87b6c5b2ab30971edc45d9`。
- 上記2 blob は前セッション監査時と同一で、監査開始後の実装巻き戻りは検出されていない。
- PR #37 / #38 は merged、両CI success であることは前段監査でGitHub実体確認済み。再調査しない。
- 作業2完了判定までの残監査は、(1) CSS実体、(2) 作業1 v46ガード、(3) テスト最終監査、の3段階。

### 今回の実施範囲

このチェックポイント記録後、**第1段階のCSS実体監査のみ**を行う。
第2段階 v46ガード、第3段階 テスト最終監査には進まない。
コード変更・CSS置換・PR作成は行わない。


### 第1段階完了: CSS実体監査（2026-09-24）

対象: 現行 `main` の `conj/index.html` blob `7ccf2172ccdfe49fee9cfa75caad8a736f6c3326`。
GitHub blob経路で全文を取得して監査した。

結果:
- `:root` の意味CSS変数は64個。
- 記録欄固定色 `--record-verb / --record-adj / --record-adjv / --record-aux / --record-empty` は `:root` に存在しない。
- 上記5色は `.record-screen` に局所固定変数として、最終仕様どおり
  `#935568 / #b77d55 / #39756f / #3d566b / #e8eef1` で存在する。
- ドーナツ基底色は `.record-donut` の `background:#e7f1ee` として固定指定されている。
- `:root` 外のsolid hexは6件だけで、上記固定5色＋ドーナツ基底色の6色と完全一致。固定対象外のsolid hex直書きは0件。
- `:root` 外の直書き `rgb/rgba` は14件。すべて `box-shadow` / `text-shadow` 用で、背景・境界・outline等の非shadow用途は0件。
- ページ背景、カード、本文・補助文字、境界、アクセント、hover/active系、正解・不正解系、記録画面一般UI、review UI、編集セルhover/selectedは意味変数参照を確認。
- ボタン系も個別確認し、`.chip/.ghost/.primary`、active primary、record header button、focus-visible、review filters、review toggle が意味変数を参照している。直書きrgbaはshadow用途のみ。
- 作業2直前のmain（PR #37 mergeの第1親 `3eeed9b67298e85a8fe5db6ce201ab85d0e23713`、旧index blob `a487ac57c37b8f61f747e3b44f307fe2c574b7d9`）とも色集合を照合。旧CSSに存在した色は `#fff` を除き現行の変数値または固定色として保持され、`#fff` は現行 `#ffffff` と同値。現行 `:root` に旧CSSになかった新規色値は0件。
- 作業2直前版と現行版で `<style>` 外のHTML/JSはバイト単位で一致。したがって、作業2の色整理に伴うHTML構造・JSロジックの混入変更は検出されなかった。

**第1段階「CSS実体監査」はPASS。作業2のCSS変数化・既定配色維持・固定色境界に欠落や巻き戻りは検出されなかった。**

この時点で停止。第2段階「作業1 v46ガード最終確認」と第3段階「テスト最終監査」は未実施のまま残す。


### 監査一時停止記録（2026-09-24）

ユーザー指示によりここで一時停止する。

- 直前のチェックポイント記録commit: `30f7681b1de94723e7712a413e2c3fc86f3e0df3`
- 作業2完了判定の残監査3段階のうち、第1段階「`conj/index.html` のCSS実体監査」を開始した。
- GitHub blob `7ccf2172ccdfe49fee9cfa75caad8a736f6c3326` を対象に、`:root` の意味変数、record固定色、ドーナツ固定色、直書きhex/rgba、主要UIの変数参照を一括確認する処理を開始した。
- ただし処理結果の確定前にセッションを区切ったため、**第1段階は未完了として扱う**。途中結果を完了判定に使用しない。
- 第2段階 v46ガード監査、第3段階 テスト最終監査には未着手。
- コード変更、CSS置換、PR作成、作業3への着手は行っていない。

次回は第1段階を、項目をさらに小分けにして再開する。
