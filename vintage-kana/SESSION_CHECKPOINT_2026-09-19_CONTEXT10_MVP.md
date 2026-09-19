# SESSION_CHECKPOINT_2026-09-19_CONTEXT10_MVP

## 1. 到達点

Phase 2C の一次公開MVP区切り `context-checked=10` を達成。

`data/attested-examples.json`:
- total: 49
- source-checked: 39
- source-checked以上: 49
- exact: 10
- exact-text以上到達: 10
- context-checked: 10
- human-confirmed: 0
- 変体仮名字形: 44
- 『伊勢物語』: 33

## 2. context-checked の内訳

### 『諸国方言物類称呼』巻五 / brsk005
5件:
- U+1B012 𛀒（え）4件
- U+3048 え 1件
- 全件原画像確認済み
- 全件 `renmen=true`

### 『比翼連理花廼志満台』初編上 / hnsd001
5件:
- U+1B094 𛂔（ね / 字母 年）
- 2ウ / 3オ / 8ウ / 13ウ / 15オ
- 国語研公式翻字・IIIF manifest・同一底本原画像で照合
- 全件原画像確認済み
- 接筆は二値判定が安全でないため `renmen=unknown`。未確認ではなく確認済み判定不能。

## 3. 技術的成果

- 国語研高解像度画像を取得して字形DB座標と照合する経路成立。
- 長大公式TXTをGitHub Actionsで一時取得し、UTF-8・改行正規化するブリッジ成立。
- IIIF manifestから viewer page ↔ 丁ラベル ↔ 原画像寸法を機械的に対応可能。
- 別伝本・OCR推測・検索スニペットでの代用は行っていない。

## 4. 重要な判断

一次公開を優先するため、ここでPhase 2の追加採取を主工程から外す。
研究を「完成」させるのではなく、公開可能な最小セットを完成させる。

次工程:
1. 既存UI・試作・データ接続監査
2. 字体・字母クイズMVP
3. context-checked 10件から公開対象例を選定
4. 公開対象例のみ human-confirmed
5. 字体詳細・実例・読解UI接続
6. 出典・ライセンス・フォント・モバイル/PC QA
7. 一次公開

## 5. 制約

- 現セッションはローカル非接触。
- GitHub `yama-books/koten` main を正本として作業。
- 一時取得ブリッジは証拠を本体へ記録後に削除する。
- 公開読解問題には原則 human-confirmed のみを使う。

## 6. 再開位置

**一次公開MVP製品化 / Phase 4・5**

最初に `vintage-kana/` の現行アプリ構成を監査し、
旧試作から残す機能と撤廃済み機能を分けた上で、
最小公開UIへ接続する。
