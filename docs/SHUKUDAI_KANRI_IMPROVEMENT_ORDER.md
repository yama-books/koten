# shukudai-kanri 改善発注文書

最終更新: 2026-08-30  
位置づけ: 実装ではなく、既存の shukudai-kanri（統計・報告・同期運用を含む内部基盤）への提案発注

この文書は『古典学習帳』の良いプライバシー設計を維持したまま、運用の安全性・検証可能性・障害切り分けを上げるための優先順位と受入条件を示す。ここで発注するのは内部基盤の改善であり、一次資料、公開アプリ、旧設計書を編集する作業ではない。実装開始前に現行構成、データ保管場所、権限、コスト、保持期間を棚卸しし、差異があれば裁定を求める。

## 0. 読み取り時点の現状（発注前提）

現行リポジトリを読み取り専用で確認した範囲では、回帰の大半が `tests/sync-regression.test.js` に集まり、同期・表示・クリック統計・ルールの検査が同じ suite に載っている。`assets/sync.js` の `metrics/registrations` は、合言葉の SHA-256 marker と count 文書を Firestore transaction で更新する構成である。`firestore.rules` は registrations の count 増加、`metrics_days` の create-only、20文字乱数 ID、日付・version・expiresAt・event map の上限を既に検査している。

また、`assets/metrics.js` は当日分を端末に貯め、過去日だけを匿名で送信し、端末側の送信値には正確な時刻を入れない。プレビュー（`?new=1`）を別 namespace にし、送信失敗時に貯めを残す回帰も存在する。これらは保つべき挙動であり、改善では「より多く集める」方向へ変更しない。上記の実装状態は変わり得るため、発注着手時に実ファイル・rules・Firebase コンソールの TTL を再確認し、以下の受入条件に対する不足を差分として記録する。

## 1. 守る不変条件

- 氏名・学校名・連絡先、回答本文、画面文言、手書き内容、学習履歴そのもの、正確な時刻を収集しない。
- 安定した端末追跡 ID を作らない。日単位の無作為な device-day token と、必要最小限の匿名認証の集計を混同しない。
- 統計の利用者向け案内と実装を一致させ、test と official をデータ・権限・集計で分離する。送信失敗は学習を止めない。
- 目的外の payload、未知フィールド、自由長の文字列、過大な件数を受け入れない。
- TTL を経過した raw report/outbox を自動削除し、バックアップや export に残らないことを検証する。
- 登録グループ数、daily active devices、実人数を別の概念として定義する。現在の匿名方式で測れない実人数を「unique users」として表示しない。

## 2. 優先順位一覧

| 優先 | 改善項目 | 先に解くリスク |
|---|---|---|
| P0 | 巨大 sync-regression の分割、イベントレジストリ、registrations 競合改善、rules CLI/CI + Emulator | 変更の見逃し、競合による二重登録、ルール逸脱を公開してしまう危険 |
| P1 | schema/event version と test/official 環境、送信健全性、Firebase 設定一元化、payload privacy invariant | 互換性破壊、送信停止、環境混入、収集してはいけない値の混入 |
| P1 | TTL 検証、非公開文書整合、匿名 auth churn 評価 | 保持期間超過、内部情報の露出、匿名利用者数の過大計上 |
| P2 | 登録グループ数 / daily active devices / 実人数の指標分離 | 指標の取り違え、個人追跡と誤解される分析 |

## 3. 発注項目と受入条件

### P0-A: 巨大 sync-regression の分割

提案: 現在の一枚岩の同期回帰 suite を、`storage/migration`、`merge/idempotency`、`outbox/retry`、`auth/environment`、`rules/security`、`telemetry/privacy`、少数の cross-layer smoke に分ける。fixture と Emulator の起動を共有し、失敗時に責務が一つに絞れるようにする。

受入条件:

- 各 suite を単独実行でき、失敗名だけで原因領域と必要な fixture が分かる。
- 全 suite は公開前に一括実行でき、分割前と同等以上のケースを網羅する。
- CSS/文言だけの変更は該当 smoke、保存/統計/ルール変更は該当回帰、release は full を実行する判断表がある。
- flaky テストは再試行で隠さず、原因・許容時間・退避方法を記録する。

非対象: テストを削って緑にすること、公開アプリの UI を変更すること、一次資料の校正。

### P0-B: イベントレジストリ

提案: イベント名、目的、version、許可 payload、必須/任意、値域、環境、保持期間、PII 禁止、発火条件、集計先を型付き registry にする。クライアント送信・Functions・ルール・分析定義を同じ registry から検査し、廃止イベントは期限と移行先を持たせる。

受入条件:

- registry 外のイベント名、payload キー、自由文字列、version 欠落が CI で失敗する。
- 各イベントに privacy classification と TTL があり、レビュー可能な一覧を生成できる。
- 代表イベントを test 環境で送受信し、official へ混入しない。

非対象: 学習履歴のクラウド同期、個人別ダッシュボード、目的外のイベント追加。

### P0-C: registrations の競合改善

提案: 登録と環境紐付けの書き込みを冪等なキーで保護する。単一の可変 count 文書への競合更新だけに依存せず、create-only の登録 marker と、管理者側またはサーバー側の集計を候補として比較する。同時登録、再送、匿名 auth の再発行、タブ二重起動でも一件へ収束する状態遷移と結果コードを定める。

受入条件:

- 同一論理登録の同時 N 件が一件に収束し、二重カウント・環境混在がない。
- 失敗/再試行/タイムアウト時の clientEventId と結果が追跡でき、payload 本文は保存しない。
- test/official の境界、取り消し、TTL、権限拒否を Emulator で再現できる。

非対象: 必須ログイン化、端末横断の利用者追跡、学校アカウントとの連携。

### P0-D: rules CLI/CI + Emulator

提案: Firestore/Storage の rules をローカル CLI から固定版 Emulator にロードし、許可・拒否をテストする。レビュー時に rules、registry、schema の組合せを CI で実行し、production へ直接接続しない。

受入条件:

- 未認証、匿名認証済み、管理者、別環境の各 read/write を許可・拒否表で検証する。
- report のサイズ、項目、TTL、環境、レート制限を rules またはサーバー側で拒否する。
- CI は Emulator 起動失敗、rules の構文エラー、テスト不足を成功扱いにしない。

非対象: ルールを緩めるための test-only bypass、管理者認証の簡略化、本番データへの試験書き込み。

### P1-A: schema/event version と test/official 環境

提案: データ schema version と event schema version を分離して明示し、互換範囲、移行、廃止日を管理する。test/official は Firebase project または強い namespace・権限で分離し、同じ build が意図せず official に送信しない起動時 guard を置く。

受入条件:

- 旧/現/未知 version の受入・拒否・移行が fixture と Emulator で確認できる。
- 環境名、公開日時、集計対象が保存され、official 集計は正式公開日時以後だけになる。
- production config が test config と取り違えられず、CI で相互接続を検出する。

非対象: 過去 raw payload の無期限保存、旧 schema の無条件受入、test データの正式統計への合算。

### P1-B: 送信健全性

提案: outbox の上限、指数バックオフ、ジッター、重複排除、期限切れ、送信結果コード、成功率/遅延/破棄数の集計を実装する。健全性メトリクス自身も許可 payload と TTL を守り、個人別監視にしない。

受入条件:

- オフライン、429、5xx、認証期限切れ、ブラウザ終了、再送で学習画面がブロックされない。
- 上限超過時は古い/低優先イベントを定義どおりに破棄し、履歴を代わりに破棄しない。
- 同一 clientEventId は一度だけ集計され、成功率・失敗率・TTL 破棄が環境別に見える。

非対象: 送信成功を理由に履歴を削除すること、レジストリ外イベントの救済送信、個々の利用者を追う監視。

### P1-C: Firebase 設定一元化

提案: Firebase project、app、環境、公開日時、機能 flag、TTL、registry version を一つの型付き設定入口で管理する。ビルド時/実行時の優先順位を明記し、キーの重複・直書き・秘密情報のバンドルを検査する。

受入条件:

- クライアント、Functions、rules CLI、CI が同じ環境定義を参照し、重複設定の drift が検出される。
- production build の bundle とログに秘密鍵、管理者資格情報、test endpoint がない。
- 設定欠落・環境不一致は fail closed し、学習本体は Firebase なしで動く。

非対象: 秘密鍵をクライアントへ隠して配布すること、環境を一つに統合すること、将来同期の実装。

### P1-D: 匿名 auth churn の評価

提案: Firebase 匿名認証がブラウザデータ削除、Safari 制限、再インストール、複数タブ、ネットワーク復旧でどれだけ再発行されるかを、個人を追跡しない試験環境の集計で測る。匿名 auth の UID は raw 分析に保存せず、日単位集計・短 TTL に限定する。churn の大小にかかわらず実人数は推定せず、認証なし local-first を既定に保つ。

受入条件:

- 代表端末で churn シナリオを再現し、再発行率、送信失敗率、重複登録率を test で把握する。
- churn を抑えるための安定端末 ID や fingerprint を追加しない。
- 管理画面・README は「匿名認証セッション」「登録グループ」「日次利用端末」のどれかを明記し、まとめて「利用者数」と呼ばない。

非対象: メール/学校アカウントの導入、永続 UID による端末横断追跡、churn を隠す補正。

### P1-E: 非公開文書整合

提案: 公開 build、リポジトリ履歴、raw URL、配布物、管理画面の表示を走査し、内部発注文書・作業メモ・未確認レビュー・原資料 PDF・秘密情報が外へ出ないことを定期検査する。README/仕様/使い方/画面文言の機能・統計説明の一致も検査する。

受入条件:

- denylist だけに頼らず、秘密パターン、Firebase config、内部パス、実データ、未許可 PDF、公開範囲外リンクを CI と release checklist で検出する。
- 非公開文書の変更が公開 build に混入しない。公開物に残った場合は公開停止・削除・履歴影響の裁定を行う。
- 利用者向け匿名統計文言と実際の payload/privacy invariant が一致する。

非対象: 非公開文書を公開用にコピーすること、推測しにくい URL を保護策とみなすこと、過去漏えいを隠すこと。

### P1-F: TTL 検証

提案: raw report、outbox、匿名登録補助データ、健全性ログごとに保持目的・TTL・削除主体・バックアップの扱いを台帳化する。Firestore TTL だけに依存せず、期限前後の Emulator/検証環境テストと定期監査を行う。

受入条件:

- 期限切れの raw payload が query、管理画面、export、バックアップ復元後に残らない、または残る場合の例外と期限を明示する。
- TTL 遅延を測定し、上限超過時のアラートと再実行手順がある。
- test/official の TTL が混ざらず、削除処理が学習履歴を対象にしない。

非対象: 学習履歴のクラウド保存を追加すること、無期限のバックアップ、TTL を理由に監査証跡を丸ごと残すこと。

### P1-G: payload privacy invariant

提案: 送信境界の直前に schema validator/redactor を置き、コードレビューだけでなく property-based/fixture/静的検査で禁止フィールドを常時検証する。

受入条件:

- `text`、`answer`、`prompt`、画面文言、自由入力、氏名/学校/連絡先、exact timestamp、stable device ID、auth token、stack trace 等を含む payload を必ず拒否する（フィールド名変更も検査する）。
- 許可値域・最大長・件数・日単位時刻・学年区分・環境・schema/event version を検証する。
- redaction 後に送信したこと、拒否理由が安全なコードであることをテストし、拒否値そのものをログに出さない。

非対象: 匿名化すれば自由文を収集できるという扱い、payload に履歴を埋め込むこと、管理者だけの例外。

### P2-A: 登録グループ数・daily active devices・実人数の区別

提案: 指標の定義を registry と管理画面に固定する。

- **登録グループ数**: 合言葉由来の重複防止 marker により、一度以上初期設定された共有グループを数える。
- **daily active devices (DAD)**: 日単位の無作為な device-day token が一度以上アプリで活動した数。日をまたいで同じ端末と結び付けない。
- **実人数 / unique humans**: 現行方式では測定しない。複数端末、再インストール、匿名 auth churn があるため、登録グループ数やDADから換算しない。
- 指標を合算・相互変換せず、比率や順位を利用者へ示さない。少数値も正確に表示するが、個人を特定する情報と結合しない。

受入条件:

- 同じ device-day の再送は DAD 一件、同じ登録 marker の再送は登録グループ一件に収束することを fixture で再現する。
- dashboard、export、README が登録グループ数とDADの単位・日付バケットを明記し、「利用者数」「実人数」とだけ表示しない。
- stable device ID、正確な時刻、個人別履歴なしで集計でき、privacy invariant と TTL を通る。

非対象: 複数日・複数端末の個人照合、実人数の推計、広告、ランキング。

## 4. 提案する実装順序と証跡

1. 現行 sync-regression の棚卸し、イベント/スキーマ/環境/保持台帳を作る。
2. registry、privacy invariant、rules CLI/Emulator を先に置き、失敗する fixture を含める。
3. registrations の冪等・競合対策と送信 outbox を分割 suite で検証する。
4. test/official の version guard、Firebase 設定一元化、TTL、auth churn を実機/Emulator で確認する。
5. 登録グループ数/DAD/実人数の境界を管理画面・文書に反映し、公開前 full suite と秘密情報/非公開文書走査を実行する。

各発注の完了証跡は、変更差分、実行コマンド、Emulator 結果、代表 fixture、失敗時のログ（payload の値を含めない）、未解決リスク、ロールバック手順とする。

## 5. 停止・裁定条件

以下では改善をマージせず、影響、代替案、データ保持への影響を報告する。

- privacy invariant を満たすには履歴・自由入力・安定識別子を送る必要がある。
- test/official、TTL、rules の境界を Emulator/CI で再現できない。
- 競合改善が既存の匿名統計・登録状態を消す、二重計上する、または不可逆に変える。
- 匿名 auth churn の補正が人を追跡する fingerprint を要求する。
- 登録グループ数/DAD/実人数を区別できないまま「利用者数」「実人数」として公開する必要がある。
- 非公開文書、原資料、秘密情報、実利用データの混入を release で除去できない。
- TTL、バックアップ、削除権限の実態が不明で、保持期限を説明できない。

本発注文書の完了は、提案された受入条件と非対象がレビュー済みになった時点であり、実装完了を意味しない。
