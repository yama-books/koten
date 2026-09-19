# SESSION CHECKPOINT — vintage-kana — 2026-09-19 21:06 JST 一時停止

## 停止理由

チャット／ツール実行が硬直気味になったため、依頼者指示によりここで一時停止する。
本記録以降は新規の研究・実装を進めない。

本セッションは GitHub/Web-only で進行し、ローカル
`C:\Users\user\AI開発\koten`
には触れていない。

## 正本上の現在位置

一次公開MVPの研究区切りは達成済み。

`data/attested-examples.json`:
- total: 49
- source-checked以上: 49
- context_alignment_status=exact: 10
- context-checked: 10
- human-confirmed: 0

Phase 2C のMVP目標 `context-checked=10` は達成済み。
研究の追加採取は主工程から外し、一次公開準備へ移行済み。

## 今回の重要な技術進展

国語研公式 `hnsd-001.txt` が通常Web取得で1巨大行として扱われる問題について、
短命の GitHub Actions 取得ブリッジで公式URLを直接取得し、
UTF-8・改行正規化済みの本文を読み取れる経路を成立させた。

確認値:
- source: `https://www2.ninjal.ac.jp/textdb_dataset/hnsd/txt/hnsd-001.txt`
- decoding: UTF-8 BOM
- bytes: 41,239
- chars: 14,193

同じ系統でIIIF manifestも取得し、
HNSD初編上 U+1B094 / 𛂔 / ね / 年 の5件を同一底本の
公式翻字・原画像・字形DB座標で対応させた。

追加済みの5件:
- 2ウ / hnsd001-014 / ID0052 / 「くらしかねたる」
- 3オ / hnsd001-015 / ID0119 / 「むね」
- 8ウ / hnsd001-026 / ID0111 / 「かねて」
- 13ウ / hnsd001-036 / ID0103 / 「むね」
- 15オ / hnsd001-039 / ID0054 / 「むね」

5件とも:
- `context_alignment_status: exact`
- `review_status: context-checked`

連綿は原画像確認済みだが安全な二値判定ができないため
`renmen: unknown` としている。
これは「未確認」ではなく「画像確認済み・判定不能」。

## UI / 公開準備

既に一次公開UI 0.5〜読解UI 0.6まで進行している。

現行で確認済み:
- 47音価
- 観察済み変体仮名138字体
- 字形一覧
- 字母クイズ
- 利用者選択式「書いてみる」
- human-confirmed限定の「実資料を読む」
- 読解問題で答えを初期非表示
- 答え表示時に仮名・字母・実資料中の語・周辺翻字を表示
- 原画像直リンク
- inline JavaScript構文検査 PASS

`PUBLICATION_REVIEW_QUEUE.md` に一次公開候補5件を固定済み。
アプリ側は `review_status === "human-confirmed"` のみ公開読解教材へ出すため、
未確認例が公開面へ漏れない。

## 一次公開までの残タスク

必須:
1. 公開候補5件を人間が原画像・翻字・表示で確認
2. 最低3件、推奨5件を `human-confirmed` へ昇格
3. PC実ブラウザで Noto Serif Hentaigana と4タブ操作を確認
4. モバイル幅でレイアウト確認
5. GitHub Pages実配信を確認
6. 典拠リンク遷移を確認
7. 公開版表記の最終調整

技術的な後始末:
- 一時的な GitHub Actions 取得ブリッジ
- `vintage-kana/tmp/` の取得物
は、再開後に不要性を確認して整理する。
停止時点では検証再現性を優先して残す。

## 一次公開までの進捗概算

**約80〜85%完了 / 残り約15〜20%**。

研究・データ基盤と主要MVP UIはほぼ成立している。
残りは量の多い実装ではなく、人間確認・実ブラウザ・配信面の品質保証が中心。
このため件数は少ないが、公開ゲートとしては省略しない。

## 再開地点

次回は研究追加ではなく、次から再開する。

1. `PUBLICATION_REVIEW_QUEUE.md` の P1〜P5 を人間確認
2. 確認済みだけ `human-confirmed` へ昇格
3. 読解UIへ表示されることを確認
4. PC / mobile / GitHub Pages QA
5. 一次公開

HNSDや伊勢物語の追加研究へは、一次公開後に戻る。
