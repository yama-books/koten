# PUBLICATION_REVIEW_QUEUE — 一次公開用 human-confirmed 候補

作成: 2026-09-19
目的: 一次公開の「実資料を読む」に出す最小セットを、人間が原画像と翻字で最終確認する。

## 判定方法

各候補について次の3点を人間が確認する。

1. 原画像の指定丁・対象位置の文字が、記載した仮名・字母として読める
2. 記載した公式翻字中の対象文字と対応している
3. アプリに表示する語・短句が誤読を招かない

確認後、公開可なら `review_status: human-confirmed` + `publication_status: approved` にする。
AI/モデルによる既存の `context-checked` は人間確認の代用にしない。

### 字形確認の範囲

国語研字形DBの `glyph_id / character` は代表字体IDとして保持する。
人間確認の通常スコープは `kana-jibo-context` とし、原画像の手書き筆跡とUnicodeフォント代表字形の輪郭完全一致までは要求しない。
厳密なUnicode字形同定が必要な場合だけ `exact-glyph` として別途確認する。

---

## P1 — 『諸国方言物類称呼』巻五 4オ

- example_id: `att-brsk005-u1b012-brsk005-009-id0346-x0474-y2151`
- 字体: 𛀒
- 対応する仮名: え
- 字母: 衣
- 表示候補: **見えず**
- 翻字: 「正字とは見えず」
- viewer page: `brsk005-009`
- occurrence: `ID0346`
- 座標: X=474 / Y=2151
- 原画像: https://dglb01.ninjal.ac.jp/ninjaldl/buturuisyoko/005/jpg/brsk005-009.jpg
- 公式翻字: https://www2.ninjal.ac.jp/textdb_dataset/brsk/txt/brsk-005.txt
- モデル確認: context-checked / renmen=true

人間確認:
- [x] 字体 — OK（対象は原画像「見えず」の「え」）
- [x] 翻字対応 — OK
- [x] 公開表示 — OK
- 判定: **human-confirmed / publication approved**
- 確認範囲: **kana-jibo-context**
- 注記: 確認用HTMLの赤十字マーカーは別字「を」にずれていた。マーカー表示ミスであり、原画像の読み「え」・字母「衣」・翻字対応・公開表示は承認。U+1B012は国語研DB上の代表字体IDとして扱う。

## P2 — 『諸国方言物類称呼』巻五 6ウ

- example_id: `att-brsk005-u1b012-brsk005-014-id0153-x1181-y1197`
- 字体DB代表表示: U+1B012 / 𛀒
- 対応する仮名: え
- 字母: 衣
- 表示候補: **見えない**
- 翻字: 「のべて見えないと云」
- viewer page: `brsk005-014`
- occurrence: `ID0153`
- 座標: X=1181 / Y=1197
- 原画像: https://dglb01.ninjal.ac.jp/ninjaldl/buturuisyoko/005/jpg/brsk005-014.jpg
- 公式翻字: https://www2.ninjal.ac.jp/textdb_dataset/brsk/txt/brsk-005.txt
- モデル確認: context-checked / renmen=true

人間確認:
- [x] 読み・字母 — OK（「見えない」の「え」／字母「衣」）
- [x] 翻字対応 — OK
- [x] 公開表示 — OK
- 判定: **human-confirmed / publication approved**
- 確認範囲: **kana-jibo-context**
- 注記: 原画像の筆跡は現代標準形「え」に近く見えるが、現代標準形「え」も字母は「衣」。P1と同じ基準で、Unicodeフォント代表字形との輪郭完全一致を公開条件にはしない。U+1B012は国語研字形DB上の代表字体IDとして保持する。

## P3 — 『比翼連理花廼志満台』初編上 3オ

- example_id: `att-hnsd001-u1b094-hnsd001-015-id0119-x1611-y1645`
- 字体: 𛂔
- 対応する仮名: ね
- 字母: 年
- 表示候補: **むね**
- 翻字: 「お春はむねをくるしめて」
- viewer page: `hnsd001-015`
- occurrence: `ID0119`
- 座標: X=1611 / Y=1645
- 原画像: https://dglb01.ninjal.ac.jp/ninjaldl/hananosimadai/001/jpg/hnsd001-015.jpg
- 公式翻字: https://www2.ninjal.ac.jp/textdb_dataset/hnsd/txt/hnsd-001.txt
- モデル確認: context-checked / renmen=unknown（原画像確認済み判定不能）

人間確認:
- [x] 字体 — OK（添付画像の2文字目を「ね」と確認）
- [x] 翻字対応 — OK
- [x] 公開表示 — OK
- 判定: **human-confirmed / publication approved**
- 確認範囲: **kana-jibo-context**

## P4 — 『比翼連理花廼志満台』初編上 8ウ

- example_id: `att-hnsd001-u1b094-hnsd001-026-id0111-x0522-y1719`
- 字体: 𛂔
- 対応する仮名: ね
- 字母: 年
- 表示候補: **かねて**
- 翻字: 「汲｛くみ｝とりかねておもはずもなみだに」
- viewer page: `hnsd001-026`
- occurrence: `ID0111`
- 座標: X=522 / Y=1719
- 原画像: https://dglb01.ninjal.ac.jp/ninjaldl/hananosimadai/001/jpg/hnsd001-026.jpg
- 公式翻字: https://www2.ninjal.ac.jp/textdb_dataset/hnsd/txt/hnsd-001.txt
- モデル確認: context-checked / renmen=unknown（原画像確認済み判定不能）

人間確認:
- [x] 字体 — OK（「かねて」の「ね」＝U+1B094 𛂔 / 字母「年」）
- [x] 翻字対応 — OK
- [x] 公開表示 — OK
- 判定: **human-confirmed / publication approved**
- 確認範囲: **kana-jibo-context**
- 注記: 公式翻字は「汲み」と平文化せず、「汲」に「くみ」の振り仮名が付く構造を保持する。

## P5 — 『比翼連理花廼志満台』初編上 15オ

- example_id: `att-hnsd001-u1b094-hnsd001-039-id0054-x0627-y2254`
- 字体: 𛂔
- 対応する仮名: ね
- 字母: 年
- 表示候補: **むね**
- 翻字: 「おはるはむねもてき」
- viewer page: `hnsd001-039`
- occurrence: `ID0054`
- 座標: X=627 / Y=2254
- 原画像: https://dglb01.ninjal.ac.jp/ninjaldl/hananosimadai/001/jpg/hnsd001-039.jpg
- 公式翻字: https://www2.ninjal.ac.jp/textdb_dataset/hnsd/txt/hnsd-001.txt
- モデル確認: context-checked / renmen=unknown（原画像確認済み判定不能）

人間確認:
- [x] 字体 — OK（「ね」であることを確認）
- [x] 翻字対応 — OK
- [x] 公開表示 — NG（「むねもてき」は意味・切り出しが不明瞭）
- 判定: **publication-excluded / context-checked維持**
- 注記: 史料実例としては有効。一次公開教材には出さず、文脈解釈を再確認できた場合のみ再候補化。

---

## 一次公開ゲート

- 現在 publication approved: **4件（P1〜P4）**
- 最低3件 approved: 「実資料を読む」MVP公開可 → **達成**
- P5は史料実例として保持するが一次公開教材から除外
- UIは `review_status=human-confirmed AND publication_status=approved` のみ表示
