# 百人一首 本文校正一覧（PDF原本表記／現MD許容解答）

> 対象: `百人一首_本文・作者_一次データ.md` の**本文のみ**。作者欄は対象外。  
> 原資料: `USB-3215_原資料_未整理.pdf`（目次ページ2–3に相当する画像2ページ）。  
> 目的: ローカルセッションで、PDF画像の表記を正本表示へ反映しつつ、現MD表記を入力時の許容解答として保持するための校正一覧。

## 用語と運用ルール

- **原本表記**: PDF画像に印刷されている表記。表示・正本化の優先形。
- **許容解答**: 現在のMDに入っている表記。誤答扱いせず、入力判定では正答として許容する候補。
- この一覧は**本文の表記差だけ**を扱う。作者名・作者読みは扱わない。
- 原本表記と許容解答は、どちらかを削除して一本化しない。`primary/original` と `acceptedAnswer` のように別レイヤーで保持する。
- PDF原本に合わせる際、外部の一般的な百人一首本文へ勝手に正規化しない。
- 1行 = 1句内の1表記差。複数箇所ある句は別行にする。
- **確認状態**は現時点で `pdf_visual_checked_candidate`。PDF画像との照合は済んでいるが、正本MDへの一括反映はまだ行わない。

## 機械処理用フィールド

```yaml
schema:
  poem: 1-100
  ku: 1-5
  pdf_page: 1-2
  accepted_answer: 現MDの表記
  original_form: PDF原本表記
  review_status: pdf_visual_checked_candidate
```

差分歌数: **75首**  
差分行数: **127件**  
差分なし: **25首**

## 校正一覧

| 歌 | 句 | PDF頁 | 許容解答（現MD） | 原本表記（PDF） | 確認状態 |
|---:|---:|---:|---|---|---|
| 1 | 3 | 1 | `とまをあらみ` | `苫をあらみ` | pdf_visual_checked_candidate |
| 3 | 5 | 1 | `ひとりかもねむ` | `ひとりかも寝む` | pdf_visual_checked_candidate |
| 4 | 4 | 1 | `ふじの高嶺に` | `富士の高嶺に` | pdf_visual_checked_candidate |
| 5 | 2 | 1 | `紅葉ふみ分け` | `もみぢふみわけ` | pdf_visual_checked_candidate |
| 5 | 4 | 1 | `声きく時ぞ` | `声聞くときぞ` | pdf_visual_checked_candidate |
| 5 | 5 | 1 | `秋は悲しき` | `秋はかなしき` | pdf_visual_checked_candidate |
| 7 | 5 | 1 | `出でし月かも` | `いでし月かも` | pdf_visual_checked_candidate |
| 8 | 3 | 1 | `しかぞ住む` | `しかぞすむ` | pdf_visual_checked_candidate |
| 9 | 3 | 1 | `徒に` | `いたづらに` | pdf_visual_checked_candidate |
| 10 | 3 | 1 | `別れては` | `わかれては` | pdf_visual_checked_candidate |
| 10 | 5 | 1 | `逢坂の関` | `あふ坂の関` | pdf_visual_checked_candidate |
| 11 | 3 | 1 | `漕ぎ出でぬと` | `こぎいでぬと` | pdf_visual_checked_candidate |
| 11 | 4 | 1 | `人にはつげよ` | `人には告げよ` | pdf_visual_checked_candidate |
| 11 | 5 | 1 | `あまの釣舟` | `あまのつり舟` | pdf_visual_checked_candidate |
| 12 | 2 | 1 | `雲のかよひぢ` | `雲のかよひ路` | pdf_visual_checked_candidate |
| 13 | 2 | 1 | `峯より落つる` | `峰よりおつる` | pdf_visual_checked_candidate |
| 13 | 4 | 1 | `恋ぞつもりて` | `こひぞつもりて` | pdf_visual_checked_candidate |
| 14 | 1 | 1 | `陸奥の` | `みちのくの` | pdf_visual_checked_candidate |
| 14 | 4 | 1 | `みだれそめにし` | `乱れそめにし` | pdf_visual_checked_candidate |
| 14 | 5 | 1 | `我ならなくに` | `われならなくに` | pdf_visual_checked_candidate |
| 15 | 2 | 1 | `春の野に出でて` | `春の野にいでて` | pdf_visual_checked_candidate |
| 16 | 1 | 1 | `立ち別れ` | `立ちわかれ` | pdf_visual_checked_candidate |
| 16 | 5 | 1 | `今帰り来む` | `いま帰り来む` | pdf_visual_checked_candidate |
| 17 | 2 | 1 | `神代も聞かず` | `神代もきかず` | pdf_visual_checked_candidate |
| 18 | 5 | 1 | `人目よくらむ` | `人めよくらむ` | pdf_visual_checked_candidate |
| 19 | 1 | 1 | `なにはがた` | `難波潟` | pdf_visual_checked_candidate |
| 19 | 2 | 1 | `短き芦の` | `みじかき芦の` | pdf_visual_checked_candidate |
| 19 | 3 | 1 | `ふしの間も` | `ふしのまも` | pdf_visual_checked_candidate |
| 20 | 2 | 1 | `今はた同じ` | `いまはたおなじ` | pdf_visual_checked_candidate |
| 20 | 3 | 1 | `なにはなる` | `難波なる` | pdf_visual_checked_candidate |
| 21 | 1 | 1 | `今来むと` | `いまこむと` | pdf_visual_checked_candidate |
| 21 | 4 | 1 | `有明の月を` | `ありあけの月を` | pdf_visual_checked_candidate |
| 21 | 5 | 1 | `待ち出でつるかな` | `待ちいでつるかな` | pdf_visual_checked_candidate |
| 23 | 1 | 1 | `月見れば` | `月みれば` | pdf_visual_checked_candidate |
| 23 | 2 | 1 | `ちぢにものこそ` | `ちぢに物こそ` | pdf_visual_checked_candidate |
| 23 | 3 | 1 | `悲しけれ` | `かなしけれ` | pdf_visual_checked_candidate |
| 24 | 2 | 1 | `ぬさも取りあへず` | `ぬさもとりあへず` | pdf_visual_checked_candidate |
| 24 | 4 | 1 | `紅葉のにしき` | `もみぢのにしき` | pdf_visual_checked_candidate |
| 25 | 1 | 1 | `名にし負はば` | `名にしおはば` | pdf_visual_checked_candidate |
| 25 | 4 | 1 | `人に知られで` | `人にしられで` | pdf_visual_checked_candidate |
| 26 | 2 | 1 | `峯の紅葉葉` | `峰のもみぢ葉` | pdf_visual_checked_candidate |
| 26 | 4 | 1 | `今ひとたびの` | `いまひとたびの` | pdf_visual_checked_candidate |
| 27 | 3 | 1 | `泉川` | `いづみ川` | pdf_visual_checked_candidate |
| 28 | 4 | 1 | `人目も草も` | `人めも草も` | pdf_visual_checked_candidate |
| 30 | 1 | 1 | `有明の` | `ありあけの` | pdf_visual_checked_candidate |
| 30 | 4 | 1 | `暁ばかり` | `あかつきばかり` | pdf_visual_checked_candidate |
| 30 | 5 | 1 | `憂きものはなし` | `うきものはなし` | pdf_visual_checked_candidate |
| 31 | 2 | 1 | `有明の月と` | `ありあけの月と` | pdf_visual_checked_candidate |
| 32 | 4 | 1 | `流れもあへぬ` | `ながれもあへぬ` | pdf_visual_checked_candidate |
| 32 | 5 | 1 | `紅葉なりけり` | `もみぢなりけり` | pdf_visual_checked_candidate |
| 33 | 5 | 1 | `花の散るらむ` | `花のちるらむ` | pdf_visual_checked_candidate |
| 34 | 2 | 1 | `知る人にせむ` | `しる人にせむ` | pdf_visual_checked_candidate |
| 35 | 2 | 1 | `心も知らず` | `心もしらず` | pdf_visual_checked_candidate |
| 35 | 3 | 1 | `ふる里は` | `ふるさとは` | pdf_visual_checked_candidate |
| 36 | 3 | 2 | `明けぬるを` | `あけぬるを` | pdf_visual_checked_candidate |
| 38 | 3 | 2 | `誓ひてし` | `ちかひてし` | pdf_visual_checked_candidate |
| 38 | 4 | 2 | `人の命の` | `人のいのちの` | pdf_visual_checked_candidate |
| 40 | 1 | 2 | `忍ぶれど` | `しのぶれど` | pdf_visual_checked_candidate |
| 40 | 2 | 2 | `色に出でにけり` | `色にいでにけり` | pdf_visual_checked_candidate |
| 40 | 4 | 2 | `ものや思ふと` | `物や思ふと` | pdf_visual_checked_candidate |
| 40 | 5 | 2 | `人の問ふまで` | `人のとふまで` | pdf_visual_checked_candidate |
| 41 | 4 | 2 | `人知れずこそ` | `人しれずこそ` | pdf_visual_checked_candidate |
| 42 | 1 | 2 | `契りきな` | `ちぎりきな` | pdf_visual_checked_candidate |
| 43 | 1 | 2 | `逢ひ見ての` | `あひみての` | pdf_visual_checked_candidate |
| 43 | 4 | 2 | `昔はものを` | `昔は物を` | pdf_visual_checked_candidate |
| 44 | 1 | 2 | `逢ふことの` | `あふことの` | pdf_visual_checked_candidate |
| 44 | 2 | 2 | `絶えてしなくは` | `たえてしなくは` | pdf_visual_checked_candidate |
| 46 | 1 | 2 | `由良の門を` | `由良のとを` | pdf_visual_checked_candidate |
| 46 | 2 | 2 | `渡る舟人` | `わたる舟人` | pdf_visual_checked_candidate |
| 46 | 3 | 2 | `かぢを絶え` | `かぢをたえ` | pdf_visual_checked_candidate |
| 46 | 4 | 2 | `行方も知らぬ` | `ゆくへも知らぬ` | pdf_visual_checked_candidate |
| 48 | 4 | 2 | `くだけてものを` | `くだけて物を` | pdf_visual_checked_candidate |
| 48 | 5 | 2 | `思ふ頃かな` | `思ふころかな` | pdf_visual_checked_candidate |
| 49 | 5 | 2 | `ものをこそ思へ` | `物をこそ思へ` | pdf_visual_checked_candidate |
| 50 | 3 | 2 | `命さへ` | `いのちさへ` | pdf_visual_checked_candidate |
| 52 | 1 | 2 | `明けぬれば` | `あけぬれば` | pdf_visual_checked_candidate |
| 52 | 3 | 2 | `知りながら` | `しりながら` | pdf_visual_checked_candidate |
| 52 | 4 | 2 | `なほ恨めしき` | `なほうらめしき` | pdf_visual_checked_candidate |
| 53 | 3 | 2 | `明くる間は` | `あくるまは` | pdf_visual_checked_candidate |
| 53 | 5 | 2 | `ものとかは知る` | `ものとかはしる` | pdf_visual_checked_candidate |
| 54 | 2 | 2 | `行く末までは` | `ゆくすゑまでは` | pdf_visual_checked_candidate |
| 54 | 4 | 2 | `今日を限りの` | `今日をかぎりの` | pdf_visual_checked_candidate |
| 54 | 5 | 2 | `命ともがな` | `いのちともがな` | pdf_visual_checked_candidate |
| 55 | 2 | 2 | `絶えて久しく` | `たえて久しく` | pdf_visual_checked_candidate |
| 56 | 4 | 2 | `今ひとたびの` | `いまひとたびの` | pdf_visual_checked_candidate |
| 56 | 5 | 2 | `逢ふこともがな` | `あふこともがな` | pdf_visual_checked_candidate |
| 57 | 1 | 2 | `めぐり逢ひて` | `めぐりあひて` | pdf_visual_checked_candidate |
| 57 | 3 | 2 | `わかぬ間に` | `わかぬまに` | pdf_visual_checked_candidate |
| 58 | 1 | 2 | `有馬山` | `ありま山` | pdf_visual_checked_candidate |
| 59 | 5 | 2 | `月を見しかな` | `月をみしかな` | pdf_visual_checked_candidate |
| 62 | 5 | 2 | `関は許さじ` | `関はゆるさじ` | pdf_visual_checked_candidate |
| 63 | 1 | 2 | `今はただ` | `いまはただ` | pdf_visual_checked_candidate |
| 63 | 5 | 2 | `いふよしもがな` | `言ふよしもがな` | pdf_visual_checked_candidate |
| 69 | 1 | 2 | `あらし吹く` | `あらしふく` | pdf_visual_checked_candidate |
| 72 | 1 | 2 | `音に聞く` | `音にきく` | pdf_visual_checked_candidate |
| 75 | 3 | 2 | `命にて` | `いのちにて` | pdf_visual_checked_candidate |
| 76 | 2 | 2 | `こぎ出でて見れば` | `こぎいでてみれば` | pdf_visual_checked_candidate |
| 76 | 4 | 2 | `雲居にまがふ` | `雲ゐにまがふ` | pdf_visual_checked_candidate |
| 77 | 5 | 2 | `逢はむとぞ思ふ` | `あはむとぞ思ふ` | pdf_visual_checked_candidate |
| 78 | 3 | 2 | `鳴く声に` | `なく声に` | pdf_visual_checked_candidate |
| 78 | 4 | 2 | `幾夜寝覚めぬ` | `幾夜ねざめぬ` | pdf_visual_checked_candidate |
| 79 | 3 | 2 | `絶え間より` | `たえ間より` | pdf_visual_checked_candidate |
| 79 | 4 | 2 | `もれ出づる月の` | `もれいづる月の` | pdf_visual_checked_candidate |
| 79 | 5 | 2 | `影のさやけさ` | `かげのさやけさ` | pdf_visual_checked_candidate |
| 80 | 2 | 2 | `心も知らず` | `心もしらず` | pdf_visual_checked_candidate |
| 80 | 4 | 2 | `乱れて今朝は` | `みだれてけさは` | pdf_visual_checked_candidate |
| 80 | 5 | 2 | `ものをこそ思へ` | `物をこそ思へ` | pdf_visual_checked_candidate |
| 81 | 4 | 2 | `ただ有明の` | `ただありあけの` | pdf_visual_checked_candidate |
| 82 | 2 | 2 | `さても命は` | `さてもいのちは` | pdf_visual_checked_candidate |
| 84 | 1 | 2 | `長らへば` | `ながらへば` | pdf_visual_checked_candidate |
| 84 | 2 | 2 | `またこの頃や` | `またこのごろや` | pdf_visual_checked_candidate |
| 85 | 2 | 2 | `物思ふ頃は` | `物思ふころは` | pdf_visual_checked_candidate |
| 86 | 2 | 2 | `月やはものを` | `月やは物を` | pdf_visual_checked_candidate |
| 87 | 4 | 2 | `霧立ちのぼる` | `霧たちのぼる` | pdf_visual_checked_candidate |
| 88 | 2 | 2 | `葦のかりねの` | `芦のかりねの` | pdf_visual_checked_candidate |
| 89 | 1 | 2 | `玉の緒よ` | `玉のをよ` | pdf_visual_checked_candidate |
| 89 | 2 | 2 | `絶えなば絶えね` | `たえなばたえね` | pdf_visual_checked_candidate |
| 90 | 5 | 2 | `色は変はらず` | `色はかはらず` | pdf_visual_checked_candidate |
| 92 | 2 | 2 | `潮干に見えぬ` | `潮干にみえぬ` | pdf_visual_checked_candidate |
| 92 | 4 | 2 | `人こそ知らね` | `人こそしらね` | pdf_visual_checked_candidate |
| 92 | 5 | 2 | `かわく間もなし` | `かわくまもなし` | pdf_visual_checked_candidate |
| 93 | 2 | 2 | `常にもがもな` | `つねにもがもな` | pdf_visual_checked_candidate |
| 93 | 5 | 2 | `綱手かなしも` | `つなでかなしも` | pdf_visual_checked_candidate |
| 97 | 1 | 2 | `来ぬ人を` | `こぬ人を` | pdf_visual_checked_candidate |
| 98 | 3 | 2 | `夕暮は` | `夕ぐれは` | pdf_visual_checked_candidate |
| 99 | 5 | 2 | `もの思ふ身は` | `物思ふ身は` | pdf_visual_checked_candidate |
| 100 | 2 | 2 | `ふるき軒端の` | `ふるき軒ばの` | pdf_visual_checked_candidate |

## 差分なしとして確認した歌

2, 6, 22, 29, 37, 39, 45, 47, 51, 60, 61, 64, 65, 66, 67, 68, 70, 71, 73, 74, 83, 91, 94, 95, 96

## ローカル実装時の扱い

推奨データ構造:

```yaml
poem: 1
ku: 3
original_form: "苫をあらみ"
accepted_answers:
  - "とまをあらみ"
source:
  file: "USB-3215_原資料_未整理.pdf"
  page: 1
review_status: pdf_visual_checked_candidate
```

### 反映時の原則

1. 表示本文・正本本文は `original_form` を使う。
2. 現MDの表記は `accepted_answers` に移し、入力時には正答として扱う。
3. 許容解答から原本表記への自動置換だけで、許容解答そのものを失わない。
4. 同じ句に複数差分がある場合、句全体を上書きする前に全差分をまとめて確認する。
5. 正本MDへ反映した後も、この校正一覧は監査ログとして残す。
