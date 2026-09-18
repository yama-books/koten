# RESEARCH_LOG_2026-09-19

## 1. 作業範囲

前セッションの引継ぎ後、Phase 0 の書誌台帳を一次情報中心に監査した。

対象は国語研「変体仮名字形データベース」に登録された15 witness。

## 2. 確認した一次情報

### 国立国語研究所「日本語史研究資料」

- 春色梅児与美
  - https://dglb01.ninjal.ac.jp/ninjaldl/bunken.php?title=umegoyomi
- 比翼連理花廼志満台
  - https://dglb01.ninjal.ac.jp/ninjaldl/bunken.php?title=hananosimadai
- 諸国方言物類称呼
  - https://dglb01.ninjal.ac.jp/ninjaldl/bunken.php?title=buturuisyoko
- 和漢朗詠集（室町中期写本）
  - https://dglb01.ninjal.ac.jp/ninjaldl/bunken.php?title=wakanroei
- 伊勢物語（嵯峨本第二種）
  - https://dglb01.ninjal.ac.jp/ninjaldl/bunken.php?title=isesaga

上記ページから、年代・著編者・請求記号・資料ID・所蔵・公開画像の CC BY 4.0 を確認した。

### 国文学研究資料館

国語研字形DBの `伊勢物語（国文研200014445）` は、国文学研究資料館所蔵・長谷章久旧蔵の
`伊勢物語（伝飛鳥井雅親筆本）`、請求記号 `長谷93-7` に対応する。

- 資料紹介
  - https://www.nijl.ac.jp/search-find/articles/gallery/200911.html
- 国書データベース画像利用条件
  - https://kokusho.nijl.ac.jp/page/usage-nijl.html

国文研所蔵古典籍画像は現在 Public Domain とされる。

ただし、資料紹介は伝承筆者を示す一方で書写年を一点確定していない。
このため `sources.json` では「室町時代写（伝飛鳥井雅親筆。書写年未確定）」と留保付きで記録した。

## 3. sources.json 更新

以下を構造化して追加・確定した。

- creator
- date
- period
- genre
- medium
- holding_institution
- shelfmark
- source_material_id
- bibliographic_source_url
- license
- license_source_url

`review_status` は `source-checked` へ更新。

### 合冊資料の注意

- 『春色梅児与美』巻一〜巻三は、国語研書誌では初編の合冊1冊として同一請求記号・資料IDを共有する。
- 『比翼連理花廼志満台』初編上中下も、国語研書誌では初編合冊1冊として同一請求記号・資料IDを共有する。
- 字形DBでは、それぞれを別 witness として扱う現在の方針を維持する。

## 4. データモデル更新

`DATA_MODEL.md` の資料スキーマに書誌根拠URL・請求記号・資料ID等を追加した。

viewer の実例参照URLと、所蔵機関の書誌URL／ライセンス根拠URLを分離して保持する。

## 5. 次工程

Phase 1 分布コーパスから、

- 同一作品内の異 witness で分布差が大きい字体
- 特定資料へ集中する字体
- 同じ字母の異体間で優勢が逆転する字体

を機械的に候補化する。

候補化は実文脈採取の優先順位付けにのみ使い、歴史的規則の断定には使わない。


## 6. Phase 2 候補抽出

47音価の派生分布データから、実文脈採取の優先候補を機械的に抽出した。

生成:
- `data/context-sampling-candidates.json`

抽出条件:
- 比較値は `share_within_kana_same_diacritic`
- 同一 work 内で share の最大差が 0.25 以上
- 最大観察件数が5件以上
- 同じ `kana × jibo × diacritic=none` 内で witness ごとの最多字体が入れ替わる例を別途抽出

これは採取優先順位であり、歴史的正しさのスコアではない。

### 特に強い候補: 『伊勢物語』2資料

国文研200014445 と嵯峨本第二種の間で、同じ字母を持つ字体の優勢が大きく逆転する例が複数確認できた。

- や / 字母「也」
  - 国文研本: 𛃞 が 246件、同区分内約93.9%
  - 嵯峨本: や が 123件、同区分内約77.4%
- り / 字母「利」
  - 国文研本: り が 901件、約89.5%
  - 嵯峨本: 𛃲 が 469件、約74.9%
- て / 字母「天」
  - 国文研本: て が 687件、約88.1%
  - 嵯峨本: 𛁳 が 402件、約85.0%
- さ / 字母「左」
  - 国文研本: さ が 222件、約59.7%
  - 嵯峨本: 𛀿 が 197件、約84.9%
- を / 字母「遠」
  - 国文研本: 𛄜 が 353件、約86.5%
  - 嵯峨本: を が 170件、約75.2%

このため、Phase 2 の最初の実文脈採取は『伊勢物語』2資料から始める価値が高い。

## 7. 次の実作業

1. 『伊勢物語』2資料で「や・り・て・さ・を」を初回採取対象にする
2. 各字体について原資料位置へ遡る
3. 語・語内位置・前後文字・連綿を記録する
4. 根拠位置を追跡できたものだけ `attested-examples.json` へ追加する
5. viewer から位置情報を安定取得できない場合は、推測で埋めず採取方法を再設計する
