# HANDOFF: 古典活用表ドリル `conj`

更新: 2026-10-05

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


### 第1段階-① 完了: `:root` と固定色境界（2026-09-24）

GitHub上の現行 `main` の `conj/index.html` をblob経路で監査した。

- 現行blob SHA: `7ccf2172ccdfe49fee9cfa75caad8a736f6c3326`（前回監査値と一致）
- `:root` のCSSカスタムプロパティ: 64個
- 作業2で必要な通常UI用の意味変数群: 欠落なし
- 次の固定色は `:root` に存在しない: `--record-verb / --record-adj / --record-adjv / --record-aux / --record-empty / --record-donut-base`
- `.record-screen` の局所固定色:
  - `--record-verb:#935568`: PASS
  - `--record-adj:#b77d55`: PASS
  - `--record-adjv:#39756f`: PASS
  - `--record-aux:#3d566b`: PASS
  - `--record-empty:#e8eef1`: PASS
- ドーナツ基底色 `#e7f1ee` の固定指定: PASS

結論: **第1段階-①「:root と固定色境界」はPASS。** PR #38で確定した固定色境界の巻き戻りは認められない。

ここで停止する。第1段階-②「直書きhex/rgba監査」には未着手。


### 監査リレー停止記録（2026-09-24・CSS監査①）

ユーザー指示によりここでセッションを停止し、次セッションへリレーする。

#### このセッションで確定している前提

- 完全非ローカル作業。正本は `yama-books/koten`、基準ブランチは `main`、対象は `conj/`。
- 作業2の再実装はしない。作業3へ進まない。
- コード変更・CSS変更・PR作成は行っていない。
- 前回までに、作業2完了判定の残監査を次の3段階に分割した。
  1. `conj/index.html` のCSS実体監査
  2. 作業1 v46ガード最終監査
  3. `tests/unit/conj-record-screen.test.ts` 最終監査
- さらに第1段階を次の3小段階へ分割した。
  - ① `:root` と固定色境界
  - ② 直書きhex / rgba
  - ③ 主要UIの意味変数参照

#### 今回の停止位置

- ユーザー指示により **①だけ** を開始した。
- 対象blobは従来どおり `conj/index.html` の `7ccf2172ccdfe49fee9cfa75caad8a736f6c3326` を使用する方針で開始した。
- ①では次だけを確認する処理を開始した。
  - 通常UI用の意味CSS変数が `:root` に存在するか
  - `--record-verb / --record-adj / --record-adjv / --record-aux / --record-empty` が `:root` に戻っていないか
  - 上記5色が `.record-screen` の局所固定変数として従来値で存在するか
  - ドーナツ基底色 `#e7f1ee` が固定指定のままか
- ただし、**ツール結果が会話へ返却される前にユーザーが停止を指示したため、①のPASS/FAILは未確定として扱う。**
- ①を完了扱いにしない。途中結果を推測・再構成しない。
- ②「直書きhex / rgba」、③「主要UIの意味変数参照」、第2段階v46、第3段階テスト監査には進んでいない。

#### 次セッションの再開位置

まず①だけを再実行して結果を確定し、そこで一度停止する。
①がPASSなら次のセッションで②へ進む。FAILなら修正せず差異だけ報告する。

## 20. 作業2完了監査 完遂・作業3実装（2026-09-24・Claude Code）

Claude Codeへ引き継がれ、クラウド環境で作業を再開した。`main` を再fetchし、HEAD `e99cebe`（PR #39 `fix(conj): preserve fixed donut base color`）が既にマージ済みであることを確認した。①-C（`.record-donut` が後置 `background:var(--record-empty)` で上書きされる問題）はこのPRで既に修正・ガードテスト追加済みであり、追加の修正は不要だった。

### 作業2完了判定・残監査の結論

- ①-A `:root`：PASS（既存確認を再確認のみ）
- ①-B `.record-screen` 局所固定変数：PASS
- ①-C `.record-donut` 固定色：PASS（PR #39で解消済み。`background:#e7f1ee` のみが有効、後置の `var(--record-empty)` 上書きは削除済み）
- ② 直書きhex/rgba：PASS。`:root` 外のsolid hexは6件（記録品詞4色+空状態色+ドーナツ基底色）のみで、想定外の直書きは0件。rgba/rgbは14件で全件 `box-shadow` 用途のみ（`text-shadow` の使用自体なし）。
- ③ 主要UIの意味変数参照：PASS。`.chip/.ghost/.primary`、`.review-filters`、`.review-toggle` 等の主要UIはすべて `var(--...)` 経由。②で全hex/rgbaを網羅したため独立の漏れはなし。
- v46ガード監査：PASS。`v46: record layout readability guard` ブロックとそのテストは変更なく機能。
- テストファイル監査：PASS。31/31（当時）テストが成功、work1/work2のガードテストは削除されていない。

**作業2は正式に完了確定。**

### 作業3「配色切替・既定コーヒー化」実装

ユーザーから「作業3以降もすべて、まとめて継続してください」との指示を受け、実装に着手した。配色系統数（5/6）は過去記録で「人確認事項」と明記されていたため、ユーザーに確認し、**5系統**の回答を得た。

実装内容：

- `:root` の色トークン（Core surfaces/Accent/Translucent layers/Level help text/Record screen neutrals/Decorative elevation の6群、`good`/`bad`/`review-error-*`/`source-backdrop` を除く）を、HSL色相回転（既存パレットの相対的な色相差を保ったまま、基準色相を目標色相へ回転）によって5系統ぶん機械的に生成した。
  - **コーヒー**（既定・新規）：色相 約32°
  - **抹茶**（旧来の既定配色をそのまま保持。色相回転なし）
  - **藍**：色相 約224°
  - **墨**：彩度を大幅に落としたほぼ無彩色
  - **桜**：色相 約342°
- 生成方法：`:root{...}` を新しい既定（コーヒー）値に置き換え、`:root[data-theme="matcha|indigo|sumi|sakura"]{...}` の4オーバーライドブロックを追加。`good`/`bad`/`review-error-*`/`source-backdrop` は正誤フィードバック・エラー色として全テーマで固定値のまま。記録画面のPOS別色とドーナツ基底色（`.record-screen` 局所変数・`.record-donut` 固定hex）はテーマ切替の対象外のまま。
- UI：`<label class="theme-control">` に `<select id="themeSelect">` を追加（`source-credits-link` と `installGuide` の間には置かず、`installGuide` の後・`sourceCredits` ダイアログの前に配置し、既存の隣接テストと衝突しないようにした）。
- JS：`<head>` 内の早期スクリプトで `localStorage.getItem("conjTheme")` を読み、非デフォルトテーマなら `<html data-theme="...">` を即時設定（FOUC防止）。本体スクリプトに `CONJ_THEMES`／`applyConjTheme`／`initThemeSwitcher` を追加し、`bootConj()` の先頭で呼び出す。選択変更時に `localStorage` へ保存し、`<meta name="theme-color">` を現在の `--bg` に同期。
- `<meta name="theme-color">` の既定値を新デフォルト（コーヒー）の `--bg:#fbf9f7` に更新。

### テスト更新

`tests/unit/conj-record-screen.test.ts` の `conj: palette defaults are semantic CSS variables...` テストを、5テーマ構成・既定コーヒー・universal色（good/bad/review-error-*/source-backdrop）が全テーマで同一値・record/donut固定色が全テーマブロックに漏れていないことを検査する内容に更新した（削除ではなく更新）。テーマ切替UIとFOUC防止スクリプトを検証する新規テストを1本追加した。

### 検証結果

- `node --test tests/unit/conj-record-screen.test.ts`：32/32 pass
- `npm run test:node`（全体）：651件中633 pass、18 fail。failしたのは `conj/` 以外（`tests/unit/record.test.ts` 等、`main` 上で元々失敗する既存の無関係な失敗）であることを `git stash` で作業前の `main` に対しても同じ失敗が起きることを確認して切り分け済み。
- `npm run test:screen`（vitest）：32ファイル388件 all pass
- Playwrightで5テーマすべてのトップ画面を目視確認（配色が意図通り切り替わる）。記録画面をコーヒー・桜の2テーマで比較し、ドーナツ・POS別配色・要確認チップの色が完全に同一であることを確認した。テーマ選択がlocalStorageへ永続化され、リロード後も復元されることを確認した。

作業4「設定画面（配色・記録の書き出し／読み込み／消去）」には着手していない。

## 21. 作業4「設定画面」実装（2026-09-24・Claude Code）

ユーザーから「作業4以降の内容についても続けて着手してください」との指示を受け、PR #40のブランチに引き続き実装した。

### 実装内容

- ヘッダーの `.header-record`（「記録」ボタンの隣）に「設定」ボタン（`#openSettings`）を追加した。
- 作業3で追加した独立の配色セレクタ（`.theme-control`、`installGuide`と`sourceCredits`の間に単独配置）を廃止し、`<dialog class="settings-dialog" id="settingsDialog">` に統合した。ダイアログは`source-credits`と同じ`showModal()`/`close()`パターンで開閉する。
  - 「配色」セクション：既存の`#themeSelect`（5系統）をそのまま移設。id・選択肢は変更していないため、`initThemeSwitcher()`等の既存JSは無改修で動作する。
  - 「記録」セクション：「記録を書き出す」(`#exportRecord`)・「記録を読み込む」(`#importRecordTrigger`+隠しfile input `#importRecordFile`)・「記録を消去する」(`#eraseRecord`)の3操作と、結果を示す`#settingsRecordStatus`を追加。
- 記録データは`localStorage`の`katsuyoProtoV37`キー1個に格納された単一JSONオブジェクト（`stats`）であることを確認し、これを対象に実装した。
  - 書き出し：`{app:"conj-katsuyo-record",exportVersion:1,exportedAt,stats}`の形でJSONファイルをダウンロードする。
  - 読み込み：選択ファイルを読み、`{stats:...}`包装・生の`stats`どちらの形式も許容した上で、既存の`normalizeStats()`（起動時のロードと同じサニタイザ）を必ず通してから`stats`変数とlocalStorageへ反映する。不正なJSON・想定外の形は例外を捕捉し、危険系トーンのメッセージを表示するだけで状態を変更しない。
  - 消去：誤操作防止のため、ネイティブ`confirm()`は使わず2クリック方式（1回目でボタン文言が「本当に消去しますか？」に変わり、2回目で実行）とした。ダイアログを閉じると確認状態はリセットされる。
  - 3操作共通で`refreshAfterRecordChange()`を呼び、ヘッダーの累計正答（`updateScore()`）と、記録画面が開いていれば`renderRecord()`を再描画する。
- 消去ボタンの警告色として新しいuniversalトークン`--danger-ink`（`#a5384a`）を`:root`に追加した。`good`/`bad`/`review-error-*`と同じ扱いで、5テーマいずれでも同一値になる（テーマ別オーバーライドブロックには追加していないため、CSSのカスケードにより自動的に`:root`の値が全テーマで有効になる）。
- 記録画面が開いている間の`Enter`キー処理をスキップする既存ガード（`sourceCredits`用）と同様に、`settingsDialog`が開いている間もスキップするガードを追加した。

### テスト更新

`tests/unit/conj-record-screen.test.ts` に新規テスト1本を追加した（既存テストは削除せず維持）。設定ダイアログの構造、danger-inkがuniversalトークンであること、export/import/eraseの主要ロジック（`normalizeStats()`を必ず通す、2クリック消去、`refreshAfterRecordChange()`呼び出し、確認状態のリセット、Enterキーガード）を検査する。

### 検証結果

- `node --test tests/unit/conj-record-screen.test.ts`：33/33 pass
- `npm run test:node`（全体）：859/859 pass（work3セッション時点で無関係に失敗していた18件も含め、今回はすべて成功。詳細な原因切り分けはしていないが、`conj/`関連は全件passしており本作業には影響なし）
- `npm run test:screen`（vitest）：32ファイル388件 all pass
- Playwrightで実機確認：設定ダイアログの表示、記録データを書き出し→消去（スコアが0に戻ることを確認）→書き出したファイルを読み込み（スコアが元の値に復元されることを確認）の一連の流れが正しく動作することを確認した。

### ユーザー追加指示によるUI修正（同セッション内）

上記実装の直後、ユーザーから次の2点の追加指示を受け、同じPR #40ブランチ上で修正した。

1. 「配色選択はプルダウンではなく、色の雰囲気を示しつつボタン選択できるようにしてください」
   - `<select id="themeSelect">` を廃止し、`<div class="theme-picker" id="themePicker" role="group">` 配下に5つの `<button class="theme-swatch" data-theme="...">` を配置する構成に変更した。各ボタンは丸い色見本（`.theme-swatch__dot`）＋テーマ名のラベルを持つ。
   - 色見本は各テーマの `--accent` 固定値（コーヒー`#a68c6f`／抹茶`#6fa696`／藍`#6f7ea6`／墨`#878e8c`／桜`#a66f7f`）を直書きした装飾用の固定色とした。現在アクティブなテーマに関わらず「そのテーマ自体の色」を常に示す必要があるため、意図的に`var(--accent)`を使わず固定hexにしている。既存の作業3 CSS実体監査テスト（「`:root`外の想定外直書きhexは0件」）は、この5色を明示的に許容するよう更新した（`themedBody`の除外リストに追加）。
   - 選択中のテーマは `aria-pressed="true"` で表現し、`initThemeSwitcher()` をselect用からbutton群用に書き換えた。
2. 「消去の場合は、本当に消去しますか？もとには戻せません、との確認が出るようにする」
   - 従来の「同じボタンをもう一度押す」2クリック方式から、明示的な確認パネル方式に変更した。「記録を消去する」を押すと、そのボタンが隠れて `#eraseConfirm`（「本当に消去しますか？もとには戻せません。」＋「消去する」／「キャンセル」ボタン）が表示される。「消去する」を押した場合のみ実際に消去する。ダイアログを閉じる、または「キャンセル」を押すと元の状態に戻る。
   - JS関数名を`eraseRecord()`から`armEraseRecord()`（確認パネル表示）／`confirmEraseRecord()`（実消去）に分割した。

テスト（`tests/unit/conj-record-screen.test.ts`）も上記の新UI構造・新関数名に合わせて全面的に更新した（削除ではなく書き換え）。

### 修正後の再検証

- `node --test tests/unit/conj-record-screen.test.ts`：33/33 pass
- `npm run test:node`（全体）：859/859 pass
- `npm run test:screen`（vitest）：32ファイル388件 all pass
- Playwrightで実機確認：配色ボタンをクリックして即座にテーマが切り替わりアクティブ表示になること、記録消去が確認パネル経由でのみ実行され「キャンセル」で取り消せること、を確認した。

## 22. 作業4.6・作業4.7 実装（2026-09-24・Claude Code）

`conj/HANDOFF.md`の残作業順（§17付近）に記載の作業4.6「ホーム画面追加案内の「×」改行修正」・作業4.7「CHJ引用用例の縦書き「…」と抜粋端の監査」に着手した。指示書にはタイトルのみで詳細仕様がなかったため、実装前に実際の描画をPlaywrightで確認して不具合の実体を特定した。

### 作業4.6：ホーム画面追加案内の「×」改行修正

- `.install-guide`は`flex-wrap:wrap;justify-content:center`のため、狭い画面で案内文が複数行に折り返すと、閉じるボタン「×」だけが単独で中央寄せの行に取り残され、不格好に見える不具合を確認した（幅340pxで実機確認）。
- 修正：`.install-guide`に`position:relative`と右側の余白（`padding-right:26px`）を追加し、`.install-guide__dismiss`を`position:absolute;top:2px;right:4px`でバナー右上に固定した。「×」をflexの折り返し対象から外すことで、本文の折り返し行数に関わらず孤立行が発生しなくなる。
- ガードテストを1本追加（CSSの該当プロパティを検査）。

### 作業4.7：CHJ引用用例の縦書き「…」と抜粋端の監査

- `.example-text`は`writing-mode:vertical-rl;text-orientation:upright`。`text-orientation:upright`はかな・漢字を正立させるためのものだが、水平三点リーダー「…」もつられて正立し、本来なら縦書きの読み進行に合わせて縦に3点が並ぶべきところ、横に3点が並んだまま表示される不具合をPlaywrightのズーム画像で確認した。
- `conj/data/adjectival-noun-chj-quotations.json`の`records[].excerpt`には、契約上の抜粋範囲を示すため文頭・文末に「…」を付与した例が多数含まれており、この不具合の影響を直接受ける。
- 修正：`highlight()`関数が返すHTMLに対し、新設のヘルパー`markVerticalEllipsis()`で全ての「…」を`<span class="v-ellipsis">…</span>`にラップするようにした。CSS側で`.v-ellipsis{text-orientation:sideways}`を追加し、この文字だけ90度回転させて縦の読み進行に合わせた。`<mark>`によるハイライトと共存することを確認済み。
- `renderRecord()`側は変更していない（ハイライト対象外の記録画面には影響しない）。`exampleText`・`reviewExampleText`の両方が`highlight()`を経由するため、両画面に自動的に適用される。
- ガードテストを1本追加：CSSルールの存在、`highlight()`が実際に「…」をラップすること（単独の場合・`<mark>`と共存する場合の両方）、実データ（CHJ引用JSON）中の「…」を含む抜粋が実際にラップされることを検査する。

### ユーザー追加指示によるUI修正（同セッション内、続き）

作業4.6/4.7の作業中、ユーザーから追加指示を受けた：「『設定』は縦書きではないです。そもそもかわいい歯車のアイコンなどで文字なしで設定とわかる状態がのぞましい。」

- ヘッダーの「設定」ボタンをテキストラベルから、歯車アイコン（Material Iconsの`settings`グリフを転用したSVG、`fill="currentColor"`）のみのアイコンボタンに変更した。`aria-label="設定"`でアクセシビリティ上のラベルは維持し、視覚的なテキストは撤去した。
- `.icon-button`（丸型・中央寄せのアイコンボタン共通クラス）と`.settings-icon`（18×18px）を追加。
- 対応するテストを更新（ボタンにテキスト「設定」が含まれないことを明示的に検査する行を追加）。

### 検証結果（本節全体）

- `node --test tests/unit/conj-record-screen.test.ts`：35/35 pass
- `npm run test:node`（全体）：861/861 pass
- `npm run test:screen`（vitest）：32ファイル388件 all pass
- Playwrightで実機確認：狭い画面でのホーム画面案内バナーの「×」がバナー右上に固定され孤立行が出ないこと、CHJ抜粋の「…」が縦読み方向に沿って回転して表示されること、設定ボタンが文字なしの歯車アイコンとして表示され開閉が正常に動作することを確認した。

## 23. ユーザー追加指示：記録画面をPCでもスマホ幅で表示（2026-09-24・Claude Code）

作業5「全体確認・公開」の確認中、ユーザーから追加指示を受けた：「記録画面については、PC版での文字サイズがあまりに小さいため、拡大してスマホと同様のレイアウトと画面幅で表示してもよいと思います。」

### 調査結果

- `v46: record layout readability guard`は、PC(`min-width:860px`)で`.record-shell`を最大900pxまで、`.record-detail-grid`を2カラム(`minmax(420px,1fr) minmax(0,1fr)`)まで広げていた。
- 一方、文字サイズ自体(統計ラベル12px・数値16〜18px等)はPC/スマホ問わず同一値のまま据え置きだった。
- 結果として、PCでは「同じ小さい文字が、より広い箱の中に間延びして表示される」状態になっていた。
- v46は元々「作業1:記録画面のPC表示崩れ修正」の成果物で、当時の不具合は「PCで2カラムにした際、凡例が統計欄に重なる」という構造崩れであり、「幅が狭いこと」自体が問題だったわけではない。したがって、スマホと同じ狭い幅・1カラムに統一しても当時の不具合は再発しない。

### 実装内容

- v46の`@media(min-width:860px){ .record-shell{width:min(100%,900px)} .record-detail-grid{...2カラム...} }`と、対応する`@media(max-width:859px){ .record-detail-grid{grid-template-columns:1fr} }`を削除した。
- 代わりに`.record-detail-grid{grid-template-columns:1fr}`をメディアクエリなしで(=常時)適用するよう変更した。
- `.record-shell`の幅は、v44で設定済みの`width:min(100%,640px)`がそのまま常時有効になる(v46によるPC専用の900px拡大がなくなったため)。
- 文字サイズ自体は変更していない(据え置き)。箱が狭くなることで相対的に大きく見える、という方針どおり。
- コメントを`/* ===== v48: keep the compact single-column record layout at every width, PC included, ===== */`として追加し、変更意図を明記した。

### テスト更新

`tests/unit/conj-record-screen.test.ts`の`conj: record screen keeps summary, legend, and review cards readable across widths`テストのうち、PC専用の900px拡大・2カラム化を検査していた2つのassertionを、「`.record-detail-grid`が常時1カラムであること」「`.record-shell`が900pxに広がる指定が存在しないこと」「640px幅指定が残っていること」を検査する内容に更新した(削除ではなく置き換え)。

### 検証結果

- `node --test tests/unit/conj-record-screen.test.ts`：35/35 pass
- `npm run test:node`（全体）：861/861 pass
- `npm run test:screen`（vitest）：32ファイル388件 all pass
- Playwrightで1280px・1024px・390pxの3幅を実機確認：PC(1280px/1024px)ではスマホ同様の狭い中央寄せカードで表示され、文字が間延びせず読みやすくなったことを確認。390px(スマホ)側は変更前と見た目が変わっていないことを確認した。

作業5「全体確認・公開」のうち、コード側の全体確認はこの追加修正を含めて完了。GitHub Pagesへの公開反映確認は、`main`へのマージ後に行う必要がある。

## 24. PR #40マージ・公開後のユーザー報告対応（2026-09-24・Claude Code）

PR #40は`main`へマージ済み（マージコミット `267f139`）。マージ後、GitHub Pagesの実機（iPhone 16e、ホーム画面追加済みのスタンドアロン表示）でユーザーから2件の不具合報告と2件のUI修正依頼を受け、新規ブランチ `claude/conj-showexample-fix-20260924` で対応した。

### 報告1：「用例」チェックボックスを操作すると採点・答えを見るボタンが反応しなくなる（重大・再現確認済み）

ユーザー報告：用例チェックのON/OFFどちらでも必ず発生。「答えを見る」「採点」両方が押せなくなる。他の品詞を選び直すと直る。

**原因を特定した。** これは今回の一連のPRとは無関係な、既存の潜在バグだった（Chromiumでも100%再現し、WebKit固有の問題ではない）。

- `#showExample`のonchangeハンドラは`current&&render()`という形で、チェック操作のたびに問題全体を再描画する`render()`をまるごと呼んでいた。
- `render()`は「新しい問題を表示するときの初期化」を前提に書かれており、末尾で`answered`変数の実際の値に関わらず、無条件に採点／答えを見るボタンを表示し、次の問題ボタンを隠す処理を含んでいた。
- そのため、ユーザーが「答えを見る」または「採点」を押して`answered=true`になった**後**に用例チェックを操作すると、`render()`が呼ばれてボタン表示だけが「未回答時」の見た目に戻ってしまう（内部の`answered`は`true`のまま）。
- この状態で「採点」または「答えを見る」を押しても、`grade()`関数の先頭にある`if(answered)return;`のガードで即座に無視され、何も起こらない（＝ボタンが反応しないように見える）。
- 品詞を選び直すと`nextQuestion()`が呼ばれ、`answered=false`に正しくリセットされるため、症状が消える。

**修正内容：**

- `render()`内の「用例パネルの表示/非表示・レイアウトのgrid-template-columns切替・高さ再計算」の部分を、新規関数`applyExampleVisibility()`として切り出した。
- `#showExample`のonchangeハンドラを`current&&render()`から`current&&applyExampleVisibility()`に変更した。これにより、チェック操作時は用例パネルの表示切替だけが行われ、採点／答えを見る／次の問題ボタンの表示状態（＝実際の`answered`の値）には一切触れなくなる。
- `render()`自体は`applyExampleVisibility()`を呼び出す形にリファクタリングしたので、新しい問題を表示する際の挙動は変更していない。

Playwrightで、①答えを見る→用例チェック操作→ボタンの表示状態が正しく維持される（採点等が誤って再表示されない）、②答えを見る→用例チェック操作→次の問題ボタンで正常に次へ進める、③未回答の状態で用例チェックを操作しても通常通り動作する、の3パターンを確認した。

ガードテストを1本追加した：`applyExampleVisibility()`がボタン要素に一切触れないこと、onchangeハンドラが`applyExampleVisibility()`を呼ぶこと（`render()`を直接呼ばないこと）、`render()`が内部で`applyExampleVisibility()`を呼ぶことを検査する。

### 報告2：記録画面「要確認」カードが2列でなく1列になった（調査の結果：コード変更なし）

ユーザーの実機（iPhone、論理幅390px）で「要確認」カードが1列になっている件を調査した。`.record-review`のgrid-template-columnsは390px幅において、**今回のPR適用前後で完全に同一**（460px以下では常に1列、460px超では2列という既存仕様のまま）であることを、baseline（PR #40マージ前のmain）と現行コードの両方で直接比較して確認した。JSによる動的な列数制御も存在しない。したがって、今回のセッションの変更が原因ではないと判断した。ユーザーからの追加情報待ち（別のブレークポイントに関する要望であれば別途対応）。

### UI修正依頼1：設定ダイアログの配色ボタンを1行に収める

`.theme-picker`を`flex-wrap:wrap`から`flex-wrap:nowrap`＋`overflow-x:auto`に変更し、`.theme-swatch`のpadding/font-sizeを詰めた。390px幅の設定ダイアログ（実効幅358px程度）で5つのボタンが1行に収まることをPlaywrightで確認した。

### UI修正依頼2：「コーヒー」の表記を「珈琲」に変更

配色ボタンの表示テキストのみ「コーヒー」→「珈琲」に変更した。内部の識別子（`data-theme="coffee"`、`CONJ_THEMES`配列、`localStorage`のキー値`"coffee"`）は変更していない。

### 検証結果

- `node --test tests/unit/conj-record-screen.test.ts`：36/36 pass
- `npm run test:node`（全体）：862/862 pass
- `npm run test:screen`（vitest）：32ファイル388件 all pass
- Playwrightで実機確認：用例チェックボックスの不具合修正、配色ボタン1行収まり、「珈琲」表記を確認

## 25. 記録画面の要確認モーダルにおける活用形表題のずれを修正（2026-09-24・Claude Code）

ユーザー報告：「記録欄の要確認カードを押したときに出るウインドウ」で、活用形の表題（未然形／連用形／終止形／連体形／已然形／命令形）の表示位置がずれている。

### 原因調査

- 送っていただいたスクリーンショット（iPhone実機、Safari）を拡大して確認したところ、各表題の文字が行の中央ではなく、行の下寄りに偏って表示されていることを確認した（回答欄の文字列は正しく中央揃えなのに対し、表題側だけが下にずれる）。
- このセッションの環境（Linuxサンドボックス、Yu Mincho/Hiragino Minchoフォント非搭載）ではChromiumで再現できなかった。これは、**Safariには`writing-mode:vertical-rl`（縦書き）のテキストを含む表セルで`vertical-align:middle`が正しく機能しない既知の癖がある**ため、Chromiumでは問題なく中央揃えになる一方、Safari実機でだけこの表示ずれが起きていたと判断した。
- `.katsuyo th.label`（表題セル）は`.katsuyo td,.katsuyo th{vertical-align:middle}`という共通ルールに依存しており、この`vertical-align`だけで縦書きテキストを中央揃えしていたことが根本原因。

### 実装内容

- 表題セルの生成コードが、活用表の形状（一段・二段・形容詞スタック等）ごとに4箇所、レビューモーダル用に別途4箇所、計8箇所に分散して重複していたことも判明したため、これを機に統一した。
- 単一のヘルパー関数`makeLabelCell(name)`を新設（既存の`reviewLabelCell(name)`を改名・拡張）。`<th class="label">`の中に`<span class="label-text">`を追加し、テキストをこの内側のspanに入れるよう変更した。
- CSSで`.katsuyo th.label .label-text{display:flex;width:100%;height:100%;align-items:center;justify-content:center}`を追加。`vertical-align`に頼らず、flexboxで明示的に中央揃えする方式に変更した。flexboxによる中央揃えは`vertical-align`+縦書きの組み合わせのような癖がなく、ブラウザ間で一貫した挙動になる。
- 活用表本体（`renderTable()`内の4箇所）とレビューモーダル（4箇所）の両方が同じ`makeLabelCell()`を通るようにしたため、今後どちらか一方だけ挙動がずれる心配もなくなった。

### 検証結果

- Playwrightで表題セル(`th.label`)とその内側の`span.label-text`の`getBoundingClientRect()`を比較し、上下の余白（`topGap`/`bottomGap`）が完全に一致すること（0.5px/0.5px）を確認した。これはこのサンドボックスの代替フォントでも検証可能な、フォントに依存しない幾何学的な中央揃えの証拠。
- 主表・レビューモーダル双方のスクリーンショットで構造が壊れていないこと（カ変の命令形のような2値セルを含む）を確認した。
- ガードテストを1本追加：CSSルールの存在、`makeLabelCell()`が期待通りの構造（`label`クラスのth・`label-text`クラスのspan）を生成すること、旧来の重複コードパターンが残っていないこと、8箇所すべてが`makeLabelCell()`を経由していることを検査。
- `node --test`：38/38 pass、`npm run test:node`（全体）：864/864 pass、`npm run test:screen`：388/388 pass。

このバグはSafari実機でのみ顕在化する既知のクロスブラウザ差異であり、この環境で目視による最終確認はできていない。ユーザーによる実機再確認をお願いしたい。

## 26. 記録画面「要確認」カードを2列固定に変更（2026-09-24・Claude Code）

PR #41マージ後、ユーザーから「記録欄はなぜ2段でなくなったのかわかりません。2段に収まるよう調整。」との追加指示を受けた。

### 判明した経緯

`.record-review`（「要確認」カード一覧）のCSSを再調査した結果、**460px以下で1列に強制する`@media(max-width:460px)`ブロックが2箇所存在し、これは今回の一連のPR群（#40, #41）より前から存在する、古い（v43世代とv46世代）意図的な設計だった**ことが分かった。ベース（メディアクエリなし）の既定値は`repeat(2,minmax(0,1fr))`（2列）であり、460px以下でのみ1列＋カード内部を横並び（バッジ56px＋テキスト）に変える、という設計。

ユーザーの実機（iPhone、論理幅390px）はこの460px以下の分岐に該当するため、以前から一貫して1列表示だったと考えられる（前回セッションで確認した「コード上は変化なし」という結論と矛盾しない）。今回、ユーザーから「2列にしてほしい」という明確なご要望を得たため、既存仕様の変更として対応した。

### 実装内容

- `.record-review`を460px以下で1列に強制していた2つの`@media(max-width:460px)`ブロック（`.record-review{grid-template-columns:1fr}`および付随する`.record-review li`/`.review-toggle`の内部レイアウト上書き）を削除した。
- これにより、既定の2列（`repeat(2,minmax(0,1fr))`）が360px以上のすべての幅で有効になる。
- ただし360px未満（iPhone SE初代・一部の旧型Android等、現行主要端末には存在しない極端に狭い画面）では、2列だと活用の種類名やラベルが欠けて読めなくなることをPlaywrightで確認したため、`v49`として`@media(max-width:359px)`のセーフティネットを新設し、その範囲でのみ1列＋内部横並びレイアウトに戻すようにした。
- 320px・350px・359px・360px・375px・390px・428px・500px・700pxの各幅で実際にレンダリングされる`grid-template-columns`の計算値を直接検証し、360px以上で確実に2列になること、359px以下で1列に戻ることを確認した。

### テスト更新

`tests/unit/conj-record-screen.test.ts`の`conj: record screen keeps summary, legend, and review cards readable across widths`テストのうち、「460px以下で1列にする」ことを検査していたassertionを、「460px以下で1列にする指定が存在しないこと」「v49の359pxセーフティネットが存在すること」「既定の2列指定が残っていること」を検査する内容に更新した。

### 検証結果

- `node --test tests/unit/conj-record-screen.test.ts`：36/36 pass
- `npm run test:node`（全体）：862/862 pass
- `npm run test:screen`（vitest）：32ファイル388件 all pass
- Playwrightで320〜700pxの9幅を確認。390px（ユーザー実機相当）で「要確認」カードが2列表示になり、活用種類名が欠けずに表示されることを確認した。

## 27. 出題の偏り是正（2026-09-24・Claude Code）

ユーザー報告：「未出題のままずっとカ行変格活用が出ないなど著しく偏りがある。出題回数の少ないものを優先的に選んで、かつランダムで出題するようにできないか。」

### 原因

`pickWeightedQuestion(list)`は`item.questionWeight`（存在しなければ1）だけを重みとした単純な重み付きランダム抽選で、**出題履歴（過去に何回出題されたか）を一切考慮していなかった**。カ行変格活用は文語で「来（く）」1語しかなく、プール内の他の項目と同じ重み1で扱われるため、理論上も稀に長期間選ばれない「ドロー・ギャップ」が起こりやすい（純粋な独立試行のランダム抽選では、特定の1項目が長く出ない期間が統計的に十分あり得る）。

### 実装内容

- 新規関数`itemAttemptCounts()`を追加。`stats.slots`（`{itemId}:{行}:{番号}`形式のキーを持つ、既存の記録データ）を集計し、項目ID単位の累計出題（正解+不正解）回数を返す。この集計ロジックは`reviewKinds()`内の既存の項許集計パターンと同じ考え方を再利用したもの。
- `pickWeightedQuestion(list)`の重み計算を`baseWeight`から`baseWeight/(累計出題回数+1)`に変更。既存の`questionWeight`（意図的な出題比率調整）は尊重しつつ、出題回数が少ない項目ほど選ばれやすくなる。完全に決定的にはならず、あくまで重み付きランダムのまま。
- 出題回数が増えるにつれて自然にその項目の重みは下がっていくため、特別なリセット処理や上限は設けていない。

### 検証結果

- ガードテストを1本追加：`itemAttemptCounts()`が`stats.slots`から正しく項目単位の合計を出すこと、および未出題項目(出題回数0)が、出題済み項目群だけがある20項目のプールの中で「1/20（5%）」を大きく上回る頻度（4000回試行中15%超）で選ばれること、かつ他の項目も引き続き選ばれ得ること（完全排他にならないこと）を検証。
- `node --test`：37/37 pass、`npm run test:node`（全体）：863/863 pass、`npm run test:screen`：388/388 pass。
- Node上でのシミュレーション（20万回試行）：出題履歴なしの項目が理論値2.5%に対し約27%まで引き上がることを確認。
- Playwrightで実アプリのデータを使い、カ変（「来（く）」）以外の全動詞項目に出題実績20回を人為的に与えた状態で300回連続出題した結果、カ変が51回（約17%）選ばれ、実際に大幅に出やすくなることを確認した（他の全動詞種類も0ではなく選ばれ続けることも確認）。

## 28. ホーム画面追加の案内をvintage-kanaと同じ文言・仕組みにそろえる（2026-09-24・Claude Code）

右上の×だけだったinstall-guideを、vintage-kanaと同じ「文 → 主ボタン → 今は追加しない／今後は表示しない」の構成に変更した。

### 変更内容

- HTML/CSS: `.install-guide`をvintage-kanaの`.installGuide`と同じ枠付きブロック・縦積みレイアウトに変更。色はconjのテーマトークン（`--line`/`--muted`/`--card`/`--accent-soft`/`--accent-strong`/`--on-accent`）のみを使用し、vintage-kana固有の色は持ち込んでいない。
- 文面: `<wbr>`で文節区切りのみを折り返し位置にする方式に統一（iOS向け・追加ボタンあり・メニュー案内の3種）。
- 「今は追加しない」はsessionStorage（`conjInstallNoticeSessionHidden`）、「今後は表示しない」は既存のlocalStorageキー（`conjInstallNoticeDismissed`、既存利用者の記録を維持するため変更していない）で使い分け。
- 不具合修正: 「ホーム画面に追加する」のネイティブ確認をキャンセルした場合に案内が永久に消えていたのを修正。`prompt()`は一度しか呼べないため、呼ぶ前にイベント参照をnullにして追加ボタンを隠し、`userChoice`が`accepted`なら永久非表示、`dismissed`または例外ならセッションのみ非表示にする。

### テスト更新

`tests/unit/conj-record-screen.test.ts`のinstall guide関連テストを更新。×が無いこと・3つのボタンが存在すること・session/localStorageの使い分け・`userChoice`分岐を検証する内容に置き換えた。iOS文言のテストは`<wbr>`を除去してから照合する方式にした。設置場所のテストは変更なしで通っている。

### 検証結果

- `npm run test:node`：864/864 pass（ワークツリー作成直後は`@koten/shared`が未解決で18件失敗したが、`npm install`で解消。install-guide変更とは無関係の環境要因）。
- ブラウザで390px幅の3文面（メニュー案内・追加ボタンあり）を確認、いずれも1行に収まった。「ホーム画面に追加する」→キャンセル相当（`userChoice`が`dismissed`）でセッションのみ非表示になり永久には消えないことを確認。
- Playwright WebKit（`devices["iPhone 13"]`）でiOS向け文言（共有アイコン付き、追加ボタンなし）のスクリーンショットを1枚取得し、リポジトリ外に保存した（コミット対象外）。

## 29. PC・iPad向けレイアウト調整（2026-09-26〜27・Claude Code、PR #50〜#55）

同じ作業で百人一首（`packages/hyakunin`）と vintage-kana も調整した。3アプリ共通の注意点もここにまとめる。

### conj の現状

- **活用表の拡大**（701px以上）：`syncStudyHeights()` が、カード下端が画面内に収まる倍率（最大1.7）を求め、`.card .study-layout` に `transform: scale()` を掛ける。
  - 拡大で増えた高さは `margin-bottom` で確保する。横スクロールは `.card{overflow-x:clip}` で防ぐ。
  - **拡大の基準点は表（`#tablePanel`）の中心**。v52 の配置（`1fr auto 1fr` で表をカード中央、用例は左に添える）を保つため。基準点を用例と表を合わせた範囲の中心にすると、表が左へずれる（PR #55 で修正）。
  - 用例の高さ合わせ（`syncStudyHeightsAtCurrentZoom`）は、`getBoundingClientRect` が拡大後の値を返すため、既知の高さ（100px）を実測した比率で換算している。
- **CSS の `zoom` は使わない**。iPad Safari で表の列幅・行位置が崩れた（PR #51 で `transform` に変更）。
- **活用形の見出し（未然形…）は `writing-mode` を使わない**。幅 `1em` の横書きの箱で1字ずつ折り返して縦に積む（PR #54）。
  - iPad Safari は表のセル内の縦書きの寸法を誤る。セル自体を縦書きにすると列が広がり、内側の要素を縦書きにすると文字が横に並んだ。
  - テスト `conj-record-screen.test.ts` で、`th.label` と `.label-text` に `writing-mode` が無いことを確認している。
- **自動フォーカス**：マウス操作の端末（`(hover: hover) and (pointer: fine)`）では、出題直後に `focusFirstBlank()` で最初の空欄を編集状態にする。ツールバー操作中やダイアログ表示中は除く。
- **記録画面**（800px以上）：640px の組みのまま `.record-shell` を 1.2〜1.5倍に `transform` で拡大する。
  - 内訳カードは「ドーナツ・凡例｜区切り線｜正答数・正答率」を一定の間隔でまとめて中央に置き、左右の余白をそろえる。
- **設定の配色ボタン**：`.theme-picker` に `padding:6px; margin:-6px` を与え、フォーカス枠が横スクロール枠で切れないようにした。

### 3アプリ共通

- ホーム画面追加の案内：スマホは文言を中央、ボタンを2等分にする。PC・タブレットは文言を左、ボタンを右にそろえた1行にする。
  - 百人一首も同じ文言（iOS は共有マークつき）と「今は追加しない／今後は表示しない」にそろえた。
  - 百人一首は文字200%表示で折り返すこと（`check:overflow` の「拡大時の走査」768px で違反が出た）。
- 百人一首：48rem以上かつ高さ50rem以上では `html` の文字サイズを画面の高さに合わせて16〜22pxにする。回答欄への自動フォーカスと、Enter での答え合わせあり。記録画面の歌の暗転表示は `grid-template-areas` で配置している。
- vintage-kana（721px以上）：記録画面の枠を一覧と同じ幅にする（`.quizBox:has(#quizRecord:not([hidden]))`）。行カードは5列×2段の正方形、字形カードは `minmax(150px,1fr)` で、字形一覧と同じ列数になる。

### 検証の注意

- ローカルの Playwright はヘッドレスシェルが無いので `executablePath:'/opt/pw-browsers/chromium'` を使う。
  - `npm run check:overflow` は、ヘッドレスシェルの場所をこの chromium へのシンボリックリンクに向けた `PLAYWRIGHT_BROWSERS_PATH` で実行できる。
- Chromium では Safari 固有の崩れ（zoom・縦書き）を再現できない。iPad の実機での確認が必要。

## 30. 語釈帯・見出しの差分ルビ・助動詞の接続・はなまるの見出し語固定（2026-09-28・Claude Code、未コミット）

設計: [DESIGN_GLOSS_LAYOUT_2026-09-28.md](DESIGN_GLOSS_LAYOUT_2026-09-28.md)（A案、§3・§4.6・§6）。CSS は `v53` ブロック（`index.html` の末尾）。

### 実装したもの

- **見出しの差分ルビ**：現代仮名遣いが違う語（33語・38問）だけ、変わる字に `<ruby>` を付ける（例 `し[づ→ず]かなり`、`[じやう→じょう][じやう→じょう]たり`）。ルビの帯は全品詞で常に確保し（700px以下 `padding-top:12px; margin-top:2px`、701px以上 `17px/4px`・`rt` 15px）、`rt` は答え合わせ（採点・答えを見る）の後に表示。表示後は `#lemma` に `aria-label`（現代仮名遣い）を付ける。
- **語釈帯** `<dl id="gloss">`（`#auxInfo` は廃止）：`.study-layout` のグリッドの中に置き、スマホは表の下の行（幅 `min(100%-32px,300px)` 固定、見出し列 6.2em 右寄せ）、701px以上は表の右の列（`"example table gloss"`）。`render()` で中身を組み `visibility:hidden` で場所を確保し、答えの後に表示するので、表・見出し・ボタン・拡大率（`transform`）は答えの前後で変わらない。用例を隠すと `.study-layout.no-example` になり「この用例では」行は DOM から消える。
- **形容動詞**：「意味」＝`basicGloss`、「この用例では」＝`contextNote`（用例表示中だけ）。語釈は表示中の用例 ID（`exampleId`：公開本文は `sourceExampleId`、CHJ は `id`）で引き、作品が一致しなければ出さない（`ConjAdjvRuntime.glossForExample`）。百人一首 `itadura` は基本義「無駄だ・むなしい」のみ（`itemGlosses`）。
- **助動詞**：`#kind` を `下二段型 | 未然形接続` にし、Lv5–7 は活用型と同じく答えの後にバッジ表示（レベル説明を「…・活用型・接続なし」に変更）。語釈帯に「意味」と、`connection` が `connectionShort` と違う語だけ「接続」（完全形）。この用例での意味（`exampleMeanings` の各要素）は `status:"audited"` かつ意味が2つ以上の語だけマーカー＋太字で強調する。
- **Lv5–7 のバッジ**が出ても表が動かないよう、バッジの高さを出題中の行と同じにした（従来は数px動いていた）。
- **復習ダイアログ**（記録→要確認）：同じ描画関数で、ルビと語釈帯を最初から表示。
- **はなまる**（`placePerfectStamp()`）：見出し語の基字の範囲に固定。大きさ＝見出しの文字サイズ×4.35（96〜156px）、最前面（z-index 20）・`multiply`。48×48 の線のマスクで、ルビ・漢字補助・活用型の行・品詞タグ（重み0.6）との交差が最小の位置を選ぶ。採点直後・`resize`・`fonts.ready` で再計算。表示中は `#kind`・`#lemmaAid` を `--ink` にする。
- **`--muted` のコントラスト**：珈琲 `#7f776d→#7a7269`、抹茶 `#6d7f7a→#667773`、墨 `#757776→#717372`（藍・桜は元から 4.5:1 以上）。5テーマで `--ink/--muted/--tag-ink/--accent-strong` が `--card`・`--bg` に対し 4.5:1 以上であることをテストで確認。
- **高さの低いスマホ**（高さ760px以下）では、語釈帯のある問題だけ活用表の行を低くしてボタンを画面内に残す（`--mobile-form-row-h` 上限 55px）。→ 高さ700px以下では §31 の `fitMobileRows()` に置き換えた。

### データ

- `data/adjectival-noun-glosses.json`：`audit/build_adjv_glosses.py` で v0.6 ワークブック（`runtime候補`・`監査ストック`の作品）から生成。records 120件・lemmaReadings 116件（ルビは仮名遣いの規則単位で位置合わせ。手作業の上書きは 0件）・itemGlosses（itadura）。作品の照合・`displayGloss` の再構成・ルビの再構成に1件でも失敗すると書き出さずに止まる。
  - 再生成: `python conj/audit/build_adjv_glosses.py [v0.6.xlsx のパス]`（既定は `~/Downloads/…v0.6_adjv001-120.xlsx`）
- `data/aux-example-meanings.json`：設計書 §6.5 の候補表 28件。1つの用例に複数の意味を認められるよう `exampleMeanings`（配列）で持つ。**28件すべてユーザーの監査済み（audited、2026-09-28）**。複数に印を付けるのは、べし＝当然・推量、む（百人一首三番「かも寝む」）＝推量・意志の2件。らむ（百人一首二十二番）は現在推量のみ。ほかは設計書 §6.5 の候補どおり。意味が1つの語（ず・まほし・き・らし・断定のたり・たし）は強調しない。各要素は問題の `meaning` の要素と一致し、`target`・`occurrence` は問題データと一致しなければ使わない。
- 既存の `adjectival-noun-lexical-annotations.json` には混ぜていない（用例単位の情報を入れない方針のため）。

### 検証

- `tests/unit/conj-gloss.test.ts`（§8 の 1–6・10・11、v53 の CSS、コントラスト）。
- `audit/gloss-layout-impl_2026-09-28/check-layout.cjs`：375×812・360×740・820×1180・1180×820・1440×900 で、見出し・表・ボタンの位置と拡大率が答えの前後で同じ、はなまるがカード内・最前面、語釈帯の幅が一定などを確認する。第2引数に変更前のアプリ（`git archive` で取り出したもの）の URL を渡すと、表の下がり量とボタンが画面内に収まっているかも比べる。スクリーンショットも同じフォルダ。

### 残っている注意

- 表はルビの帯の分だけ下がる（スマホ・PCとも約9px。360×740 は約11px）。PC 1440×900 のタリ活用（表の上に本活用・補助活用の見出しが出る語）はカード下端が画面を約1px越える（ボタンは画面内）。1180×820 などは従来どおり収まらない（§4.6 参考、`syncStudyHeights()` は縮小しない）。
- ~~375×667（iPhone SE）では、ボタン下端が 画面667px に対し しづかなり 667・ばうばうたり 681・形容詞「悲し」672（変更前 613・628・661）。表の上に見出しが出る語と形容詞で少しはみ出す。行の高さをさらに下げるかは要判断。~~ → §31 で解決（全245問でボタンが画面内）。
- 助動詞では、はなまるの線が「…接続」の一部にかかる（`multiply` で文字は読める。§4.6 のとおり）。
- iPad Safari 固有の崩れ（ルビ・`:has()`・グリッドの右の列）は Chromium で再現できないため、実機で確認すること。`:has()` 非対応の古い Safari では、はなまる表示中の文字色・ボタン上の余白・低いスマホの行高さ調整が効かないだけで、表示は崩れない。
- ~~iPad 縦（820×1180）で、語釈の右の列が広い助動詞（べし・む・らむなど）は、表の拡大率が下がる（べし 1.37→1.11、む・らむ 1.24）。表の下に空白が残る。~~ → §31 で解決（べし 1.42、む・らむ 1.54）。

### 今後の要実装：助動詞の用例の増補（2026-09-28 ユーザー指示・大きめの作業）

- **現状**: 助動詞28語は `index.html` の組み込みデータで、**1語につき用例が1つだけ**（多くが百人一首）。
- **目標**: 集めてある用例（§4 の助動詞第一陣180例〔ず・べし・まじ・まほし・たし〕ほか、Drive の収集データ）から、**少なくとも各助動詞のすべての活用形に当てはまるまで**用例を収録する。
  - 形容動詞と同じく「活用表ドリル＋実例ドリル」の二層にし、実例が確認できないセルは人工例で埋めない（§1 の原則）。
- **実装時に合わせて直すもの**
  - `data/aux-example-meanings.json` のキーは、今は問題 id（1語1用例が前提）。用例ごとの id（例: `aux-beshi-001`）に切り替える。`target`・`occurrence` との照合は今の仕組みを使える。
  - 用例ごとの意味の監査を、形容動詞 v0.6 と同じ流れ（監査ストック → runtime 候補 → JSON）で行う。1つの用例に複数の意味を認める場合は `exampleMeanings` に複数入れる（べし・むの前例あり）。
  - 形容動詞と同じく、用例を1語に複数持つ場合の出題の選び方（どの用例を出すか）を決める。今の形容動詞は公開本文優先で先頭の1例に固定している。
  - 語釈帯（意味・接続）とはなまるの配置は、そのまま使える。
  - 本文の表記方針（原文 target と正規化キーの分離、今昔物語集の表記など）は §4・既存の方針に従う。

## 31. 高さの低いスマホのボタン位置と、iPad 縦の表の拡大率（2026-09-28・Claude Code、未コミット）

§30 の「残っている注意」のうち2点を直した。CSS は `v54` ブロック（v53 の後）。

### 高さの低いスマホ（375×667・360×640・390×664）：答えの後もボタンを画面内に

- **`fitMobileRows()`**（`syncStudyHeights()` から、700px 以下の幅で呼ぶ）：カードの下端が「画面の高さ − 4px」を越える問題だけ、`--mobile-form-row-h` をカードに直接与えて活用表の行を低くする。**下限 44px**。語釈帯は出題時から場所を確保しているので、行の高さは出題時に決まり、答えの前後では何も動かない。越えない問題（動詞の多く・375×812 のほとんど）は従来の行の高さのまま。
  - 入力中（`.card .editor` にフォーカス）に、同じ問題・同じ幅で画面の高さだけが変わったとき（ソフトウェアキーボード）は決め直さない。
- **高さ 700px 以下だけ**（`@media(max-width:700px) and (max-height:700px)`）の CSS：
  - 活用形の見出し（未然形…の縦積み）の行間 1.18→1.02。従来は見出しの3字が 49.5px あり、行を 50.5px より低くできなかった。
  - 余白を詰める：`.wrap` 上 10→6px、`header` 下 8→4px、`.toolbar` 下 9→5px、カード上下 9→7px、注記 `row-note` の最小高 18→10px、語釈帯 上 12→6px・内側 10→6px・行間 6→4px、ボタンの上 16→8px。
  - v53 の「語釈帯のある問題は行 55px まで」の一律の上限は、この高さでは外し、`fitMobileRows()` に任せる（語釈が1行の語は行を高く保てる）。
- 幅 700px 以下すべて：
  - `header{gap:10px}`。幅 360px で題名が 1px 足りずに2行になり、見出しの帯が 14px 高くなっていた（変更前から）。
  - 固定表示の3〜5字の語形（`.display.fit-3/4/5`。まほしから・まじから など）は `min(従来の大きさ, (行の高さ−4px)/字数×1.03)` にする。行が十分高ければ従来どおり。変更前から 375×667・360×740 で「まほしから」がセルから 2〜4px はみ出していた。
- **トレードオフ**：行の高さは問題ごとに変わる（375×667 で 49.8〜58px。v53 でも語釈帯の有無で 50.5/58px と変わっていた）。行が低い問題では、用例の縦書きが `fitExampleText` で小さくなることがある。高さ 700px 以下の余白は設計書 §3.2 の値より詰まる。ルビの帯を品詞タグの行に重ねる案は、タグも見出しも中央寄せでルビとぶつかるため採らなかった。
- 計測（ボタン下端 / 画面の高さ。答えの後。変更前 = bdaa05e）

| 画面 | しづかなり | ばうばうたり | ふさやかなり（2行の語釈） | 悲し（形容詞） | べし・まじ | 来（動詞） | はみ出す問題（全245問） |
|---|---|---|---|---|---|---|---|
| 375×667 | 667→654 | 681→654 | 704→654 | 672→650 | 695→655 | 655→633 | 43→**0** |
| 360×640 | 681→627 | 695→627 | 718→627 | 686→627 | 709/727→628/630 | 669→628 | 240→**0** |
| 390×664 | 667→651 | 681→651 | 704→651 | 672→650 | 695→652 | 655→633 | 62→**0** |
| 375×812 | 777→777 | 791→791 | 814→798 | 736→736 | 804→798 | 709→709 | 1→**0** |

  - 行の高さの最小：375×667 49.8px、360×640 44.0px（まじ）、390×664 49.3px。375×812 は ふさやかなり 65.3px・べし／まじ 67px（カード下端が画面を越えていた3問だけ）、ほかは 68px のまま。
  - 360×740 は題名が1行になった分（14px）上へ詰まり、ふさやかなり・まじ（変更前はボタンが画面外）だけ行が 54／52.5px になった。ほかは変わらない。

### iPad 縦：右の列の語釈が表の拡大を妨げないように

- `syncStudyHeights()` を `measureStudyZoom()`（高さ・横幅それぞれで許される倍率）に分けた。右の列の語釈が横幅の制約になっているとき（語釈を除けばもっと拡大できるとき）だけ、語釈に `max-width`（px）を与えて列を狭める。幅は「高さの許す倍率で、カードの内側の右端に収まる幅」、下限は 8em（語釈の文字サイズ基準）。語釈は従来どおり「・」「／」のまとまりごとに折り返す。
  - 語釈を表の下へ戻さない。カードからはみ出さない（`check-layout.cjs` で、語釈の右端がカードの内側の右端以内であることを確認）。
  - 語釈の中身は出題時から組んであるので、答えの前後で幅も倍率も変わらない。拡大しない画面（1180×820・1024×768・1440×900）では何もしない。
- 計測（表の拡大率。変更前 → 変更後。`check-layout.cjs` の値）

| 問題 | 820×1180 | 768×1024 |
|---|---|---|
| べし | 1.11 → **1.42** | 1.05 → 1.14 |
| まじ | 1.12 → 1.42 | 1.06 → 1.14 |
| む・らむ | 1.24 → 1.54 | 1.15 → 1.24 |
| る | 1.47 → 1.54 | 1.24 → 1.24 |
| じやうじやうたり（117） | 1.35 → 1.51 | 1.21 → 1.21 |
| ふさやかなり（052） | 1.24 → 1.54 | 1.15 → 1.24 |

  - 全245問で比べると、820×1180 は 81問で上がり下がった問題 0、768×1024 は 34問で上がり 0。1180×820・1024×768・1440×900 は全問で変わらない（拡大なし）。768×1024 のべし・まじは高さで決まる上限（1.14）に達している。

### 検証

- `check-layout.cjs`：375×667・360×640・390×664・768×1024・1024×768 を追加し、問題に ふさやかなり・まじ・まほし・来（動詞）・悲し（形容詞）を追加。追加の確認：スマホの行が 44px 以上、固定の語形がセルからはみ出さない（1px 以内）、高さの低いスマホで答えの後のボタンが画面内、iPad・PC の語釈がカードの内側に収まる、820×1180 の べし・まじ・む・らむ・117 の拡大率が 1.3 以上、変更前より拡大率が下がらない。150 の組み合わせですべて合格（`layout-check.log`）。
- `check-stamp-all-adjv.cjs`：375×667・360×640・768×1024 を追加。7画面 × 形容動詞116語で、はなまるの交差 0。
- `tests/unit/conj-gloss.test.ts` に v54 の静的な確認を追加。

### 残っている注意

- 360×640 の まじ は行が下限の 44px でもカード下端が 638px（画面 640px。ボタン下端 630px）。これ以上低い画面や、ブラウザのツールバーで画面が狭い場合は、下限 44px を守るためボタンが画面外に出ることがある。
- PC 1440×900 の べし・まじ・まほし（表の上に見出しが出る助動詞）は、変更前からボタン下端 911px で画面を越える（§4.6 参考、`syncStudyHeights()` は縮小しない）。今回は変えていない。
- 活用形の見出しの行間を詰めたため、行 44px 付近では字形の上下が罫線に 1px ほど近づく。iPhone SE の実機で見え方を確認すること。

## 32. 語釈帯・はなまる・表の拡大の検査を CI へ（2026-09-28・Claude Code）

§30・§31 の保証は手動の `check-layout.cjs`・`check-stamp-all-adjv.cjs` でしか確かめていなかったので、要所を `npm run check:conj-layout`（`tools/conj-layout-check/index.ts`）にして CI（`check:overflow` の次）で毎回実行する。

- **配信**：公開サイトと同じ配置で、`/conj/` ← `conj/`、`/100/` ← `packages/hyakunin/dist/` をポート 4177 で配信する（`ci.yml` のポート表）。conj は Klee One・Zen Maru Gothic を `../100/` から取り込むので、**`npm run build` の後に実行する**（dist が無ければ理由を出して止まる）。Web フォント（@font-face 368 件）を全部読み込んでから測るので、CI（ubuntu）でも Windows でも同じ字形で測る。
  - CI の ubuntu には `npx playwright install --with-deps chromium` が CJK のフォールバック（fonts-ipafont-gothic・fonts-wqy-zenhei）を入れる。`fonts-noto-cjk` の追加は不要と判断した。
  - 判定はフォントで変わる絶対値に頼らず、答えの前後の一致・44px 以上・画面内・交差 0 などの不変条件にした。`--no-web-fonts`（/100/ を配信しない。端末のフォールバックで測る）でも全件合格することを確認した。
- **見るもの**（7画面 375×812・360×740・375×667・360×640・820×1180・768×1024・1440×900 × 12問 = 84件）
  - 答えの前後で、見出しの上端・表の上端・ボタンの上端・カードの高さ・`.study-layout` の `transform` が同じ。
  - 語釈帯は出題中 `hidden`・答えの後 `visible`（大きさ 0 でない）、差分ルビの `rt` も同じ。動詞・形容詞には語釈帯が無い。「この用例では」は注記のある形容動詞で用例を表示しているときだけ（用例を隠すと消える）。
  - スマホ：語釈帯は表の下で、幅は画面ごとに一定。行 44px 以上。高さ 700px 以下では答えの後のボタンが画面内。
  - iPad・PC：語釈は表の右の列で、カードの内側に収まる。820×1180 のべしの拡大率 1.3 以上。
  - はなまる：配置済み・z-index 20・`multiply`・カードの内側。形容動詞は学習用の文字と交差しない（`data-hits` 0）。形容動詞は全問（116問）を 375×667 と 820×1180 で走査する。
  - 助動詞の強調（べし・む・らむ・めり）が `data/aux-example-meanings.json` と一致する。
- 手元で約45秒。落ちることは、`CONJ_LAYOUT_CONJ_DIR` で conj/ の写しを配信して確かめた（語釈帯を `display:none`、答えの後だけ語釈帯を出す、ルビを常に表示、`fitMobileRows()` と語釈の列の狭めを外す、はなまるの `multiply` を外す）。
- スクリーンショット・変更前の版との比較・10画面 × 15問の詳しい計測は、従来どおり `audit/gloss-layout-impl_2026-09-28/check-layout.cjs` を手動で使う。
- Chromium では iPad Safari 固有の崩れは再現できない（§29）。この検査は実機の確認の代わりにはならない。

### Enter での入力順の修正（2026-09-28）

- **不具合**: 二つの列を持つ表（形容動詞の「なり・に」、形容詞の本活用・補助活用、べし など）では、Enter で進むと列の間を行き来し続けて編集が閉じず、Enter で採点へ進めなかった。全245問×Lv4・Lv7 のうち 214件が該当。
- **修正**: `editableOrder()` で順番を一本にした（基本形の列 main を上から下へ → 第二形の列 sub を上から下へ → そのほか。同じ活用形を二つに分けたマスは続けて進む）。
  - 最後の空欄の Enter で編集が閉じ、そのまま採点される（一列の表の従来の動き「入力→Enter→採点→Enter→次の問題」と同じ）。
  - 出題直後の自動フォーカスも、この順番の先頭に置く。
- **検査**: `check:conj-layout` に、PC で全問を Lv4・Lv7 のキーボードだけで解く走査（490件）を追加した。
  - 修正前の conj では不合格 211件で失敗し、修正後は 0件。

## 33. 「活用形を判別」「活用の種類を判別」問題バンク基礎実装（2026-09-29・ChatGPT）

基準: Google Drive `活用表アプリ_conj_活用判別モード_計画書_2026-09-28.md`。この作業ではユーザー指示により **GitHub `yama-books/koten` の現行 `main` を実装上の正本**とし、Drive の代表監査・runtime仕様・master仕様を監査資料として照合した。ローカルは使用していない。

### 現行実装との差分確認

- 現行 `conj` は引き続き `index.html` 中心で、`conj/data/conjugation_master.json` / `conj/app.js` / `conj/PROGRESS.md` は GitHub `main` には存在しない。
- 形容動詞は外部データ層が進んでいる一方、助動詞は `index.html` の `items` に28語が組み込まれ、現在の活用型は各項目の `kind` が保持している。
- Drive の master 仕様書には 2026-09-20 時点で 75 entries / 82 rows / 492 cells / pending 0 の完成記録があるが、その JSON 実体は現行 GitHub には置かれていない。このため今回の **助動詞の活用種類正答は、GitHub 現行 `item.kind` を正本**として解決した。
- 計画書にある一般名 `形容動詞型` より、現行 GitHub は `形容動詞（ナリ活用）型` / `形容動詞（タリ活用）型`、また `ラ変型（伝聞・推定）` のように細分化されている。今後も GitHub 現行値を勝手に丸めない。

### 代表127例の変換・QA

Drive `活用表アプリ_代表サンプル公開前監査_2026-09-19` の `代表監査127` を変換して検査した。

- 127/127 読込。
- 内訳: 動詞59 / 形容詞21 / 形容動詞18 / 助動詞29。
- 分類: `standard` 89 / `attention` 38 / `hold` 0。
- AI監査状態: 127/127 `ai-audited`。
- 人間承認: **127/127 承認済み**。Drive の `人間承認ダッシュボード` / `人間承認バッチ` で A1/A2/A3/V1/V2/V3 がすべて「代表監査承認＋同層一括承認」であることを2026-09-29に再確認。`代表監査127` タブの旧い `監査判定=未確認` 列より、専用の人間承認タブを優先する。
- `publicEnabled`: 127/127 **false のまま**。
- `【】` は監査用強調記号なので公開用引用へ持ち込まないことを確認。
- 助動詞29件は5語のみで、GitHub 現行型へ全件一意に解決:
  - `ず → 特殊型`
  - `たし / べし → 形容詞（ク活用）型`
  - `まじ / まほし → 形容詞（シク活用）型`
- 同形targetの位置:
  - `aux-012 / 013 / 054 / 055 / 124 / 150` は元助動詞監査の **一意な anchor** を根拠にする。
  - `verb-091` は既存の修正済み監査どおり **zero-based `targetOccurrence: 3`（4個目の「き」）**。
  - 現行 `highlight(text,target,occurrence)` も occurrence を0始まりで扱っているため整合する。

### public リポジトリ境界

GitHub API で `yama-books/koten` が **public** であることを確認した。代表127は人間承認済みだが、quotation / final compliance 等の公開ゲート前の CHJ 引用が含まれるため、完全な `quotationExcerpt` / `originalTarget` / `anchor` / `attentionNote` を feature branch へ書き出すと、その時点で外部公開になり得る。

したがって今回は公開ゲートを維持し、GitHub には **回答キーとQAに必要な非引用メタデータのみ**を置いた。完全な問題文は **残る引用公開ゲート・final compliance 等**を通過するまで GitHub へ入れない。

### この branch に追加したもの

branch: `feature/conj-conjugation-quiz-bank-20260929`

- `conj/data/conjugation-quiz-bank-127.meta.json`
  - 127件の品詞・lemma・活用種類・系列・活用形・standard/attention・quiz eligibility・承認/公開ゲート。
  - 引用本文・target・anchor・注意文は意図的に含めない。
  - 位置情報は `positionStrategy` と、公開して問題のない `targetOccurrence` のみ保持。
- `conj/data/conjugation-quiz-config.json`
  - 活用形6択。
  - 形容詞2択 / 形容動詞2択。
  - 動詞は代表127に現れる39活用種類を候補pool化。
  - 助動詞は GitHub 現行28語から得た12種類の `kind` を候補pool化。
- `conj/conjugation-quiz-engine.js`
  - 活用種類の候補集合を純粋関数で生成。
  - 動詞は同じ行の通常活用を最優先、次に同系統、その他の順。
  - 助動詞は型ラベルの系統を使って近接候補を優先。
  - 候補生成と表示時shuffleを分離。
- `tests/unit/conj-conjugation-quiz-bank.test.ts`
  - 127件数・品詞内訳・分類・公開ゲート。
  - held quotation が public repo のmetadataへ混入しないこと。
  - 重複target位置。
  - 助動詞5語の正答型。
  - 全127問で選択肢数・重複なし・正答包含。
  - 「カ行上二段活用」は `カ行四段 / カ行下二段 / カ行上一段` を近接誤答にすること。

### 現在の停止点

**問題データQAの論理検査は通過。UIはまだ変更していない。** 計画書の順序どおり、まず追加テストを CI で通す。その後、引用本文を公開repoへ出さない境界を維持したまま、UI骨格をどこまで先行実装するかを決める。

人間承認は完了済み。完全な127問題を公開出題へ接続する残条件は、引用境界・quotation公開判定・final compliance 等の公開ゲート通過であり、今回のAI QAはそれらを代替しない。

## 34. 助動詞の用例の増補（2026-09-28〜29・Claude Code、ブランチ `claude/conj-aux-examples-expansion`）

§30「今後の要実装」の実装。用例ごとの意味は 2026-09-28 にユーザーが監査済み（下の「意味の監査の反映」）。

### 結果

- 助動詞28語の活用表のセルは計152（本活用・補助活用、1つのセルに2語形あるもの〔まし未然形 ましか・ませ〕は別に数える。下の命令形4セルを○にした後の数）。
- **実例あり 145セル**：1セル1例、計145例。内訳は従来の組み込み28例（そのまま引き継ぎ）＋新規117例（監査で断定たり「と」の1例を取り下げ）。
  - 新規の出所：CHJ の KWIC 書き出し（Drive「活用表アプリ」の kwic-*.csv、計139,049行）から原文の文を切り出したもの。うち52例は収集済みの助動詞290例（katsuyo_v0418 `auxiliary_examples.json`）から選んだもの（`provenance.collectedId`）。今昔物語集の「しめよ」1例だけは、CHJ 原文が「返シ令得ヨ」と漢文式で target が連続しないため、公開本文（やたがらすナビ、CC BY-SA 4.0、巻27第43話）を使った。
- **実例なし 7セル**（活用表ドリルのみ。人工例は作らない）：じ 已然形、けり 未然形「けら」、断定なり 命令形、断定たり 連用形「と」（監査で例文を立てないと決定）・已然形・命令形、たし 補助連体形「たかる」（§5）。
- **補助活用命令形「べかれ・まじかれ・まほしかれ・たかれ」を○に修正**（ユーザー指示「○を答える問題となっているはず」、2026-09-28）。『新しい古典文法』付録 p.1 の助動詞一覧表ではいずれも「○」（§2 の「たかれを置かない」と同じ）。従来は答えがこれらの語形になっていた。空のセルは「○」を正解として受け付け、Lv4 以上で出題される。
- 参考（表にない一次資料の括弧書き）：む 未然形「(ま)」、ごとし 未然形「(ごとく)」、らし 連体形「(らしき)」は現行の表に無い。今回は触れていない。

### データ

- `data/aux-examples.json`（新規）：`cells`（全156セルと状態 example / unattested / not-in-primary-source）と `records`（146例）。
  - 用例 id は `aux-<語>-<連番>`（例 `aux-beshi-004`）。`track`（main/sub）・`formIndex`・`normalizedKey`（表の語形）でセルに結び付ける。
  - `target` は原文表記、`normalizedKey` は表の語形（§4 の分離）。違うのは4例だけ：`ず→す`・`ざり→さり`（和歌集の無濁点本文）、`むずれ→んずれ`、`まじかる→まじかん`（撥音便。note 付き。源氏物語・若紫「違ふまじかなるものを」は撥音無表記の同例）。
  - CHJ の例は `source`＝作品名のみ（用例の下は作品名、出典は一覧に1回）。`provenance` に sampleId・開始位置・巻名を残す。CHJ の「#」（歌と地の文の境など）は全角空白にした。長い文は「、」区切りのまとまりで切り出し、切った側に「…」。
- `data/aux-example-meanings.json`：**キーを問題 id から用例 id に変更**（schemaVersion 2.0）。組み込み28例は監査済みのまま引き継ぎ、新規117例もユーザー監査で audited。意味が1つの語（ず・まほし・き・らし・断定たり・たし）は自動で1つ。
- 生成：`python conj/audit/aux_examples/build.py [--kwic-root DIR] [--aux290 FILE]`
  - `picks.py`＝セルごとの用例の選択、`meanings.py`＝意味の案と根拠、`builtin-items-bdaa05e.json`＝以前 index.html に組み込んでいた28例の固定値（本文だけに使う。表のセルは `extract-aux-tables.cjs` で現行の index.html から読む）。
  - `--review-out FILE` で、監査用に前後の文つきの全文を書き出す（CHJ の文脈を含むのでリポジトリの外に置く）。
  - 原文の照合（target の位置・引用の手がかり・表のセル）に1件でも失敗すると書き出さずに止まる。監査済みの意味は、同じ用例・同じ意味のときだけ引き継ぐ。
  - 監査用の一覧 `audit/aux_examples/audit-stock.md` も同時に出す。

### 画面

- `index.html` の助動詞28項目から `poem/source/target/occurrence/example` を外した（表・意味・接続はそのまま）。
- `loadAuxExamples()`：`ConjAdjvRuntime.loadAuxExamples()`（形の検証）→ 表のセルと照合（`auxExampleCellProblem`）→ 意味を用例 id で結合（`auxExampleMeaningProblem`）。通らない記録は使わない。読み込めなければ助動詞は活用表ドリルのみ。
- 出題：`nextQuestion()` で `assignAuxExample(current)`。そのセッションで見せた回数が少ない用例ほど選ばれやすく、直前と同じ用例は避ける（重み付きランダム）。記録（stats）は従来どおり問題 id 単位。復習ダイアログは、まだ出していない語なら先に1つ選ぶ。
- 出典一覧（`renderSourceCredits`）は助動詞の全用例から作る（CHJ の作品・組み込み例の作品・やたがらすナビ）。
- `adjv-runtime-adapter.js?v=20260928-aux-examples` に更新（キャッシュ対策）。

### 検証

- `npm test`：node 891/891、vitest 389/389。`npm run check:eol`：違反0。
- `tests/unit/conj-aux-examples.test.ts`（新規8本）：全セルの状態、各用例が表のセルにあること、target が本文にあること、表記差4例の固定、組み込み28例が一字一句同じこと、アダプタの拒否、出題時の選び方、出典一覧。
- `audit/gloss-layout-impl_2026-09-28/check-layout.cjs`：助動詞は組み込み例（監査済みの強調の確認用）を出すように変更し、最長の新規例（`aux-tashi-006`、52字）を追加。5画面幅×11問、全55組で通過。
- `audit/test_marker_regression.py` はローカルの `_qa_source`（koten-conj-audit 側）の抽出物で通過（組み込み例は変えていない）。

### 意味の監査の反映（2026-09-28・ユーザー監査）

- ユーザーが監査ページ（別セッション）で新規118例を判定：承認106・修正11・取り下げ1。書き出し `jodoshi-audit-results.json` のうち、判定・方針・校訂表記だけを `audit/aux_examples/audit-2026-09-28.json` に写した（CHJ の前後の文は入れない）。`build.py` はこれを読み、**145例すべて audited**。
- **主と別解**：`aux-example-meanings.json` に `altMeanings`（別解）を追加（schemaVersion 2.0 のまま）。画面では主＝マーカー＋太字（従来どおり）、別解＝点線の下線＋「別解」の文字ラベル（`.gloss-alt`・`.gloss-alt-tag`、v55 ブロック）。別解は主と同じ条件（監査済み・意味が2つ以上）のときだけ出す。別解のある用例：べし002・004・007・008、けむ001、まじ001・002・003・004・006・008。
- **方針**（監査ファイルの `policies`）：校訂表記（濁点・読点）で表示／まほし・たしは「願望」（`index.html` の たし の意味も「願望」に変更）／原因推量は独立の意味／「え〜まじ」の不可能は別解／禁止を主にするのは相手に向けた文／疑問詞が主語の文は人称の原則を保留／「に＋係助詞＋あり」は定型として注記／断定「たり」連用形「と」は例文を立てない。
- **校訂表記8例**（ず001・ず004・まし004・き004・たり完了001・らし002・らし003・たり断定001）：`display` で差し替え。元の CHJ 表記は `provenance.sourceOrthography` に残し、違いが濁点・読点・踊り字の展開だけであることを `build.py` とテストで確かめる。これで表の語形と target が違うのは「んずれ」「まじかん」の2例だけになった。
- **らる002**：ユーザーの差し替え先（十訓抄・大江山「局の前を過ぎられけるを」）は教材サイトの本文だったため、**同じ箇所を CHJ（十訓抄 第三・一）から引用**した（公開本文の方針に合わせるため。巻・話番号「第三・一」も CHJ で確認できた）。
- **断定たり連用形「と」**：例文を立てない（実例なしのセル。理由を note に記載）。用例 id `aux-tari-assert-003` は欠番（`cells[].retiredExampleId`）にし、監査記録と id がずれないようにした。
- **備考（pattern）**：なり断定003「定型「にあり」」、たり断定002「連用形「と」について」。ユーザー指示（解説は過剰にしない・ふきだしでかわいらしく）により、語釈帯の「備考」行には見出しの小さなボタンだけを置き、押すとふきだし（`.note-bubble`、ポップのアニメーション。`prefers-reduced-motion` では動かさない）で短い文（`pattern.short`、50字以内）を出す。全文（`pattern.text`）は監査ファイルに残す。スマホは上向き、701px 以上は下向きに開き、「意味」「接続」を隠さない。表・語釈帯の高さは変えない（スマホ 375×812 で「次の問題」は画面内）。Esc・外側のクリック・次の問題で閉じる。
- 検証：`npm test`（node 895・vitest 389）、`check:eol` 0件、`check-layout.cjs` 65組すべて通過（別解の まじ003・備考の なり断定003 を追加）。

### 未了・要判断

1. 本文の照合：CHJ の底本が新編全集の作品は CHJ で確認できた。べし007＝新編全集＜41＞平治物語 p.418「何者が信頼を失ふべかるらん」（現行の本文どおり。流布本の「べかなる」とは底本が違う）。まじ001＝新編全集＜34＞大鏡 pp.228–229 で文脈を確認（道長「かの左衛門督は、えなられじ」→ 斉信「まかりなるまじくは、由なし。なし賜ぶべきなり」。判定どおり）。らし003「たぎつせ」はユーザーが承認（2026-09-29）。まじ001 はジャパンナレッジSchool（いつもの Chrome、ユーザーのログイン済みセッション）で新編全集＜34＞大鏡 pp.228–229 も確認した：本文は CHJ と同じで、現代語訳は「（あの兄の左衛門督）が栄進しないということであれば、遠慮するのも意味がないことです」（判定の主＝打消推量と合う）。JKS は詳細検索の「全文・部分一致」で本文から探せる。ビューアは画像表示で、連続して画面を取ると応答が遅くなる。これで本文の照合は完了。
2. （済）監査ページのメモ：まじ004・まじ008 は元のメモを【初見の印象】として残し、【裁定 2026-09-28・最新】を明記した（監査ページの db を更新）。監査ファイルにも `firstImpression` として記録。
3. 完了前チェック（`jev_gate`）：2026-09-29 にユーザーの了承を得て実行（結果は PR に記載）。

## 34. 活用判別モード UI設計の停止点・次回引継ぎ（2026-09-29・ChatGPT）

### 現在地

前節 §33 の問題バンク基礎実装は **PR #59 `conj: add conjugation identification quiz data QA foundation` として main へマージ済み**。

- PR: #59
- head: `feature/conj-conjugation-quiz-bank-20260929`
- merged at: 2026-09-29 JST
- 問題バンク基礎:
  - 代表127例
  - standard 89
  - attention 38
  - hold 0
  - 人間承認 127/127 済み
  - `publicEnabled=false` は維持
- 追加済み:
  - `conj/data/conjugation-quiz-bank-127.meta.json`
  - `conj/data/conjugation-quiz-config.json`
  - `conj/conjugation-quiz-engine.js`
  - `tests/unit/conj-conjugation-quiz-bank.test.ts`

### ユーザーの追加方針

用例数は初期127例で固定せず、**将来的に現在の5〜10倍程度まで拡張する方針**。

目安:
- 現在: 127例
- 将来: 約500〜1000例以上

UI設計では、問題数増加時にも出題・絞り込み・復習導線が破綻しないようにする。ただし、将来規模を理由に現行アプリの見た目や操作体系を別物へ作り替えない。

### 今回のUI案について

今回、活用判別モードの画面案を複数の生成画像として試作したが、**ユーザーから「そういうことではなく、現在のGitHub上のアプリのデザインをもとにUI設計してほしい」と明確な修正指示があった**。

したがって、今回生成した以下のような方向性は **採用案ではなく破棄扱い** とする。

- 新しい独立ダッシュボード風のヘッダー／ナビゲーション
- 現行 `conj` に存在しない大規模なカード型ホーム画面
- 現行UIの色・余白・タイポグラフィ・ボタン体系を確認せずに作ったモック
- 「別アプリ」のように見える問題バンク／復習ダッシュボード

**次回は今回の生成画像をデザイン参照にしない。**

### 次回UI設計の最重要原則

**GitHub main 上の現在の `conj/index.html` の実デザインを母体にする。**

新モードは「現行アプリに自然に一画面／一機能が増えたように見えること」を目標とする。

必ず現行実装から確認するもの:

1. CSSテーマトークン
   - `--bg`
   - `--card`
   - `--ink`
   - `--muted`
   - `--accent-soft`
   - `--accent-strong`
   - `--line`
   - 現行5テーマ（藍・桜・珈琲・抹茶・墨）の適用方法

2. 現在の画面骨格
   - `.wrap`
   - header
   - toolbar
   - card
   - study-layout
   - 問題表示
   - ボタン列
   - 記録画面
   - 設定画面
   - モーダル／復習ダイアログ

3. 現行レスポンシブ仕様
   - 360×640
   - 375×667
   - 375×812
   - 390×664
   - 768×1024
   - 820×1180
   - 1440×900
   - `fitMobileRows()`
   - `syncStudyHeights()` / `measureStudyZoom()`
   - PC・iPad・スマホで既に解決済みのレイアウト制約

4. 現在の操作感
   - 既存の「答え合わせ」「答えを見る」「次の問題」等のボタン位置・形状
   - レベル／品詞選択UI
   - 設定画面の部品
   - 記録画面カード
   - キーボード操作
   - 自動フォーカス
   - PWAホーム画面追加案内

### 次回の具体的な再開手順

1. **main の最新 `conj/index.html` を実際に読む。**
   - 巨大ファイル全体を無目的に読むのではなく、CSS定義・主要DOM・画面切替・ボタン・設定・記録画面の必要箇所を検索して抜き出す。

2. **現行デザインの構成を短く棚卸しする。**
   - 色
   - 文字
   - 余白
   - 枠線
   - カード
   - ボタン
   - 画面幅別配置
   - 現在ある画面遷移
   を整理する。

3. **可能なら現行 main の `conj` をそのままレンダリングして実画面スクリーンショットを取得する。**
   - GitHubコードから現行HTMLを取得して表示する。
   - 公開サイトやローカルコピーが使える場合も、正本は GitHub main。
   - スクリーンショット取得が難しい場合は、現行HTML/CSSから忠実に再現した静的プロトタイプを作る。

4. その現行画面をベースに、最小差分で次の入口を追加する設計を作る。
   - 「活用形を判別」
   - 「活用の種類を判別」

5. **最初に設計スクリーンショットを提示し、ユーザー確認を得る。**
   - この段階では本番UIへ大規模変更しない。
   - 現行デザインとの差分が一目で分かる案を優先。
   - スマホ版も現行UIに合わせる。

6. 承認後に実装へ進む。

### UI設計で維持すべき新モード仕様

- 活用形判別: 六択
  - 未然形
  - 連用形
  - 終止形
  - 連体形
  - 已然形
  - 命令形
- 活用種類判別:
  - 形容詞: ク / シク
  - 形容動詞: ナリ / タリ
  - 動詞: 正答＋近接誤答3
  - 助動詞: 正答型＋近接誤答3
- 出題範囲:
  - 動詞
  - 形容詞
  - 形容動詞
  - 助動詞
- `standard` / `attention` の区別を維持。
- attention は通常出題で過剰に出さない。
- 将来500〜1000例以上へ増えても、問題データをDOMへ全展開する前提にしない。
- 学習履歴は将来的に既存記録画面へ統合する方向。
- CHJ本文を public GitHub に追加する公開ゲートは今回のUI設計とは別問題として維持。

### 次回にやらないこと

- 今回の生成画像をそのままHTML化しない。
- 新しいブランドデザイン／新規ナビゲーションへ全面刷新しない。
- 現行テーマ色を青一色へ置換しない。
- 既存の活用表ドリル画面を捨てて別SPA風UIへ作り替えない。
- public quote / final compliance が未解決の本文を公開GitHubへ追加しない。
- 問題数拡張（500〜1000例）そのものをUI設計と同時に実施しない。

### 次回開始用の一文

> GitHub `yama-books/koten` の main を正本として、`conj/HANDOFF.md` §34 から再開。今回生成したダッシュボード風UI案は採用せず、まず最新 `conj/index.html` の実際のCSS・DOM・現行画面を確認する。現行アプリの色・タイポグラフィ・カード・ボタン・レスポンシブ挙動をそのまま母体に、「活用形を判別」「活用の種類を判別」の最小差分UIを設計し、実装前に現行版準拠のスクリーンショット案を提示する。用例は将来5〜10倍（約500〜1000例以上）へ拡張できる設計とする。


## 35. 活用判別モードの実装から公開までの経過（2026-09-29〜10-02・要約）

§34（ChatGPT）の停止点のあと、2026-09-29〜10-01 はローカルの作業記録として HANDOFF の §35〜§47 に書かれていた。この節はその要約で、公開リポジトリ向けに、ローカルの作業場所・非公開資料の所在・内部の検査ツールのやり取りを省いている。§34 の「次回開始用の一文」（UI設計から再開）は、ここまでの公開で達成済み。以後は §36 から再開する。

### 公開の経過（すべて main にマージ済み）

- [PR #61](https://github.com/yama-books/koten/pull/61)：活用判別モード（活用形を判別・活用の種類を判別）の基礎。設定の学習モードから切り替え、既存の6段表 renderer を再利用。6択の縦書き選択肢、候補範囲の4段階（near → part_of_speech → cross_pos → all）、部分表→全表のヒント、動詞の型と行の別採点。新規ファイルは `conj-quiz-engine.mjs` / `conj-quiz-adapter.mjs` / `conj-quiz-ui.js` / `conj-quiz-ui.css`、検査は `tools/conj-quiz-check`。この時点では代表用例127件がすべて `publicEnabled=false` で、画面は「準備中」。
- [PR #62](https://github.com/yama-books/koten/pull/62)：通常画面から判別モードへ入れるように、カード上部に「活用表／活用形を判別／活用の種類を判別」の3ボタンを追加。高さ700px以下のスマホでは帯を出さず、ヘッダーに切替の入口を置く。
- [PR #63](https://github.com/yama-books/koten/pull/63)：127件が保留でも練習できるよう、公開済みの活用表 master から引用なしの問題（ID `master:form:…` / `master:type:…`）を作る。承認済み用例があればそちらを優先する。
- [PR #64](https://github.com/yama-books/koten/pull/64)・[#65](https://github.com/yama-books/koten/pull/65)：例文を出典付きの実例に限定。ローカル試作で作った独自の短文は撤去済みで、公開していない。現行 master の『小倉百人一首』、公開条件を確認済みの形容動詞用例64件、百人一首由来の助動詞14件で、活用種類180件・活用形124件。即時採点（既存の丸画像）、ヒントは「ヒントを見る」→「表全体を見る」の2段、習熟に応じて候補範囲を広げる（閾値は暫定の設計値）。#65 で『土佐日記』「いたづらなれ」1件の欠落を補正し、公開問題304件が原データ本文と文字列一致することを確認。
- [PR #66](https://github.com/yama-books/koten/pull/66)〜[#68](https://github.com/yama-books/koten/pull/68)：例文が解答ボタンの裏に隠れる不具合を修正（表を隠している間は歌を二行書きにする）。選択肢は固定順に変更（用言：四段→上一→上二→下一→下二→カ変→サ変→ナ変→ラ変→ク→シク→ナリ→タリ。助動詞：動詞型→形容詞型→形容動詞型→特殊型→無変化型。活用形：未然→命令）。ヒント後・回答後に操作ボタンが画面外へ出ないよう最小限スクロールする。記録画面に登場アニメーションを追加。
- [PR #69](https://github.com/yama-books/koten/pull/69)：記録画面を習熟度表示に改修。全体の習熟度バー、「活用の種類」の円（品詞で切替）、「活用形」の横棒。判別モードの回答も正答数・ポイント・ドーナツ・正答率に算入する。保存は `stats.quiz.totals`（correct/total/byPos/byForm/byItem/byCell）で、旧形式は一度だけ移行。旧「活用判別の記録」表と `#quizRecordSummary` は廃止。
- [PR #73](https://github.com/yama-books/koten/pull/73)（2026-10-02 マージ、`e70c85d`）：代表用例127件のうち一次資料監査を終えた125件を、判別モードの出題として公開。公開可否（quotation / final compliance / release QA）はユーザーの人間判断で、AI監査はこれを代替しない。
  - `conj/data/conjugation-quiz-bank-127.meta.json`：125件の `publicEnabled` と3ゲートを approved にした。aux-289・aux-290 は一次資料が未確認のため false・pending のまま。一次資料照合の結果は欄 `primarySourceAudit` に記録（集計：一致105／表記差17／表記差・訓読差3／本文差0／未確認2）。
  - 新規 `conj/data/conjugation-quiz-examples.json`：125件の引用（CHJ原表記）・作品名・sampleId・start。照合本文は載せない。Pages に配信するが、ソース許可リストには載せない（aux-examples.json と同じ扱い）。
  - 出典一覧の CHJ 欄に125件の作品名を追加。散文の引用がカードの外へはみ出す不具合を修正（`quiz-example-layout`）。

### 公開しないもの（境界）

- 照合本文や別版表記の詳細、未承認の2件の本文は公開ファイルに入れない。これらはリポジトリ外の非公開データにあり、ユーザーの明示承認なしに GitHub・Pages へ転載しない。
- 2026-09-29〜10-01 のローカル作業メモ（旧 §35〜§47・`PROGRESS_2026-09-29_quiz.md`）は、ローカルパスや非公開資料の所在を含むため公開しない。この節がその公開用の要約。

## 36. 現在の状態と次の作業地点（2026-10-05）

- 正本は GitHub `yama-books/koten` の main。conj の最新の変更は `2935a0f`（125件の公開）。ローカルの checkout も 2026-10-05 に main へ同期済み。
- 公開中の判別モード：承認済み用例（125件）がある品詞ではそれを優先するため、百人一首などの master 由来の問題は判別モードに出にくくなった（PR #63 以来の設計どおり）。master 問題を混ぜるかどうかは未検討。

### 未裁定・未確認

- 実機 iPhone / iPad / Safari での確認は記録がない（Playwright の WebKit 検査のみ）。
- 既存の活用表ドリルで、iPad 横（1180×820）は最大104px、PC（1440×900）は24px、「採点」が画面外へ出る。判別モード追加の前からある問題。PC・タブレット幅に限って表を最小0.8倍まで縮めると解消するが、ドリル全体に効くため保留している。採用するかは要裁定。
- 判別モードの上部（モードタブ・表示設定の行・問い・品詞タグ）が縦に4段重なり、PC・iPad 横で表の拡大余地を圧迫している。設定の行を問いの行へまとめる案がある。
- WebKit では幅800px以上で、拡大した記録画面の scrollWidth が画面幅を超える（overflow-x:hidden のため利用者は横スクロールできない）。
- aux-289・aux-290 の一次資料確認。

### 検査（変更時に通すもの）

`npm test`、`npm run lint`、`npm run typecheck`、`npm run build`、`npm run scan:publish`、`npm run check:eol`、`check:conj-layout`（先に build が必要）、`check:conj-quiz`（Chromium・WebKit）。PR #73 時点で Node 938/938・Vitest 414/414、check:conj-quiz は各ブラウザで公開125件 2000/2000・fixture 320/320・master 80/80。

### 次回開始用の一文

> GitHub `yama-books/koten` の main を正本として、`conj/HANDOFF.md` §35〜§36 を読んでから再開する。判別モードは公開済み（出典付き実例＋代表用例125件）。微調整は既存の6段表 renderer・5テーマ・既存の丸画像・固定順の選択肢・記録画面の習熟度表示を保ち、§36 の未裁定事項は、ユーザーの判断を得てから変更する。非公開の本文や未承認の2件を公開ファイルへ入れない。

## 37. 判別モードの用例に校訂表記を追加（2026-10-05・Claude Code）

- `conj/data/conjugation-quiz-examples.json` の18件に `display`（`excerpt` / `target` / `orthography`）を追加した。画面にはこちらを表示・強調する。CHJ の原表記は `quotationExcerpt` / `originalTarget` にそのまま残す。助動詞の用例（§34 の「校訂表記8例」）と同じ考え方。
- 整える範囲は、濁点の補い・踊り字の展開・標準の歴史的仮名遣いへの統一（うへ→うゑ、をそく→おそく）と、「折る」の漢字表記（いなおらじ→いな折らじ、おられぬ→折られぬ、おらばや→折らばや）。後の2つはユーザーの判断による。
- 対象：adj-005・adj-011・adj-036・adj-083・adj-140・verb-026・verb-035・verb-046・verb-064・verb-091・verb-108・verb-121・verb-124・verb-222・verb-241・verb-267・verb-299・verb-333（主に古今・後撰・拾遺・新古今の無濁点本文）。
- `tests/unit/conj-conjugation-quiz-bank.test.ts` で、表示と原表記の差が、濁点・踊り字と、ID ごとに許可した置き換え（折→お、ゑ→へ、お→を）だけであること、対象語の出現数が変わらないことを確かめる。読込版は 20261005-11。
- 新しく濁点などを整える用例を足すときは、`display` を加え、上のテストの対象一覧と許可する置き換えを更新する。
