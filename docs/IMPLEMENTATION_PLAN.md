# 古典学習帳 実装計画

作成日: 2026-08-30
発注: [`OPUS_PLANNING_WORK_ORDER.md`](OPUS_PLANNING_WORK_ORDER.md)
上位文書: [`CONSTITUTION.md`](../CONSTITUTION.md) → [`APP_SPEC.md`](APP_SPEC.md) → 本書
叩き台: [`OPUS_IMPLEMENTATION_PLAN.md`](OPUS_IMPLEMENTATION_PLAN.md)（残置。本書が実行計画）

本書は内部作業資料である。公開リポジトリへ移す対象から外す。
本書の作成にあたり、コードの実装、一次資料の編集、コミット、push は行っていない。

矛盾したときの優先順は `CONSTITUTION.md` §1 に従う。本書と `APP_SPEC.md` が食い違う場合は `APP_SPEC.md` を正とし、本書の該当箇所を誤りとして直す。

---

## 1. 前提確認と仕様理解

### 1.1 作るもの

中高生が、自分の試験範囲の番（1〜100）を URL または画面で指定し、説明を読まずに「とりあえず始める」から百人一首の本文・読み・作者を想起して確認できる、静的な公開 Web アプリ。学習履歴は端末内に残り、JSON または貼付文字列で別端末へ移せる。指導上の参考として匿名の利用統計と問題報告を集める。

### 1.2 本計画が前提として受け入れた確定事項

発注書 §4 の確定事項はすべて前提として受け入れ、再提案しない。実装上とくに拘束力が強いものを、後段で参照するために番号付きで再掲する。

| 番号 | 確定事項 | 本書での主な反映先 |
|---|---|---|
| F-01 | Vite + TypeScript + Preact | §3, §4, P1 |
| F-02 | 静的 Web アプリ、local-first、IndexedDB | §3, §6, P4 |
| F-03 | 必須ログインとクラウド同期は初回公開に含めない | §7, P9 |
| F-04 | Firebase は匿名統計と問題報告に限定。無料枠内が運用目標 | §7, P9 |
| F-05 | 一次資料（正本）を変換・出題生成から書き換えない | §5, P2 |
| F-06 | 未確認の派生データを公開出題に混ぜない | §5, P2, P6 |
| F-07 | 生成 AI だけで公開問題・正解・正本を確定しない | §5, §15, P6 |
| F-08 | 番＝`cardNo`、首＝数量、問＝`questionId` を混同しない | §6, §8 |
| F-09 | 初回の一巡は番順。一巡後に区切りで番順／ランダム | §6, P6 |
| F-10 | 問題・選択肢・回答対象は縦書き、操作・進捗・結果は横書き | §8, P3 |
| F-11 | 習熟度は％・メーター・5色。固定の短い段階名を付けない | §6, §8, P5 |
| F-12 | 自動で次問へ進めない（「次へ」または Enter） | §8, P7 |
| F-13 | 統計の個別オプトアウトは初回公開に設けない | §7, P9 |
| F-14 | 学年は「中一・中二・中三・その他」の二段階 | §7, P9 |
| F-15 | 少人数を理由に集計値を隠さず丸めない | §7, P9 |
| F-16 | 公開名義に現在の個人 SNS アカウント名を使わない | §14, P12 |
| F-17 | 原資料 PDF は再配布許可を確認するまで公開対象外 | §14, P0, P12 |
| F-18 | アプリ名「古典学習帳」は仮称。一箇所で差し替える | §4, P1 |
| F-19 | コード Apache-2.0 ／独自コンテンツ CC BY 4.0 ／フォントは元ライセンス | §14, P0 |
| F-20 | 効果音は初期状態で使わない | §8, P3 |

### 1.3 読んだ資料と、そこから確定した実装上の事実

| 資料 | 実装計画に効く確定事項 |
|---|---|
| `CONSTITUTION.md` | 裁定優先順（§1）、公開の定義に Git 履歴・raw URL・配布物を含む（§4）、検証の段階（§9）、公開判定 8 項目（§10） |
| `docs/APP_SPEC.md` | 範囲 URL の正規化規則（§4）、5 入口（§5）、習熟度イベント表と減点値（§8.1）、export 最上位形式と `schemaVersion: 1`（§9.1）、`Poem`／`Question` の形（§10.1）、受入条件 12 項目（§15） |
| `docs/DESIGN_SYSTEM.md` | OKLCH トークン一式、書体 3 役割、8 状態表、必須確認幅 4 種、禁止事項、和歌の収め方（余白 → 字下げ → 人確認済み改行候補の順） |
| `docs/LEARNING_SCIENCE_AUDIT.md` | `itemKey = poemId × skill` の提案（未確定事項 1）、承認済み初期係数、推薦の優先順 4 段、公開前判定基準 7 項目 |
| `docs/DESIGN_AUDIT.md` | 実装と並行して必要な人間確認 6 件、Firebase 構成は複数案比較のうえ裁定を求める |
| `README.md` | 公開名義は暫定 `koten contributors`、公開／非公開リポジトリ分離 |
| `百人一首_本文・作者_一次データ.md` | 7 列（番号・作者・初句〜五句）の表。100 行、欠番なし、空セルなし（§2.1 で実測） |
| `百人一首_読み_歴史的仮名遣い.md` | 同 7 列 100 行。踊り字を仮名展開済み。末尾に異同注記 |
| `百人一首_読み_現代仮名遣い.md` | 同 7 列 100 行。末尾に異同注記 |
| `百人一首_読み_異同確認.md` | 9 件の重要異同と判定。「PDF 採用値」と「異表記」を分離する方針 |
| `古典文法_一次データ索引.md` | 出典は桐原書店『新しい古典文法 四訂新版』。例文全文の収録には別途許諾確認が要る |
| `古典関係アプリ_設計計画書_2026-08-29.md` | 検討履歴。範囲の固定プリセットと助動詞の初回搭載は新仕様で否定済み。`歌 × 学習項目` の記録単位は新仕様でも生きている |
| `shukudai-kanri`（参照のみ） | Firestore REST 直書き＋匿名アカウント使い捨て、クライアントとルールの二重 allowlist、`node --test` 単一ファイル回帰、禁止経路の grep 型否定アサーション、版数一致テスト、`* text=auto eol=lf` の `.gitattributes` |

### 1.4 本計画で確定させた解釈（仕様の空白を埋めた箇所）

以下は仕様の再検討ではなく、仕様が明示していない実装上の穴を埋めたものである。実装者はこの解釈で進めてよい。

1. **`poemId = "p" + ゼロ埋め 3 桁の cardNo`**（例 `p001`）。`APP_SPEC` §2 の「初回公開では `poemId = cardNo` としてよい」を満たしつつ、数値と文字列の取り違えを型で防ぐ。
2. **`skill`（学習項目）を 6 種に固定する**: `text-kami-to-shimo` ／ `text-shimo-to-kami` ／ `reading-historical` ／ `reading-modern` ／ `author-name` ／ `author-reading`。助動詞系は初回公開に含めないため列挙しない。
3. **「一巡」の定義**: 指定範囲に属する全首が、その範囲について 1 回以上「出題された」状態。まとまり（最大 20 首）単位ではなく範囲単位で判定する。`APP_SPEC` §5 の「最初の一巡は番号順」はこの意味とする。
4. **「別の日」の判定**は端末ローカル日付（`YYYY-MM-DD`）の文字列不一致とする。正確な時刻は保存も送信もしない（`APP_SPEC` §2 の「日」定義に従う）。
5. **「同一回半分」の適用単位**は `(sessionId, questionId)` とする。同じ回で同じ問に 2 回目以降回答したとき、加点を切り捨てで半分にする（+5→+2、+7→+3、+9→+4）。減点は半分にしない。
6. **「ヒント一段軽い」の適用順**は `free-input → kanji-to-kana → choice → self-o → view` とし、下限は `view`。読み表示を回の中で一度でも開いたら、その問はヒント使用として記録する（`APP_SPEC` §6 末尾の「答えの箇所に直接関係するかを問わず」に従う）。
7. **`dataVersion` と `appVersion` を分離する**。`dataVersion` は生成データの版、`appVersion` は配信ビルドの版。イベントには両方を保存し、規則版 `masteryRulesVersion` はさらに別に持つ。

---

## 2. 現在のリポジトリ状態

### 2.1 実測した一次資料の健全性

3 ファイルを機械的に検査した結果（読み取りのみ、変更なし）:

| 検査 | 結果 |
|---|---|
| 番号行の件数 | 本文 100 ／歴史的 100 ／現代 100 |
| 番号の範囲と欠番 | いずれも 1〜100、欠番なし、重複なし |
| 列数 | いずれも全行 7 列 |
| 空セル | なし |
| `異同確認.md` の判定と本文一次データの一致 | 9 件すべて一致（3 = 柿本人麻呂 ／ 5 = 猿丸大夫 ／ 7 = 安倍仲麿 ／ 13 = つくばねの ／ 28 = 源宗于朝臣 ／ 32 = 山川に ／ 46 = 曾禰好忠 ／ 66 = 前大僧正行尊 ／ 70 = いづこも同じ ／ 74 = 山おろしよ） |

**注意すべき文書上のずれ（データ不整合ではない）**: `百人一首_読み_異同確認.md` は第 5 首・第 7 首を「現行転記は猿丸太夫／安倍仲麻呂であり、PDF どおりに直す候補」と記述しているが、`百人一首_本文・作者_一次データ.md` はすでに `猿丸大夫` ／ `安倍仲麿` に修正済みである。異同確認文書側の「現行転記」欄が古い。

**一次資料は変更しない。** この 9 件を P2 の validator の固定 fixture として取り込み、「異同確認の判定値と本文一次データが一致していること」を CI で恒久的に検査する。文書側の表現を直すかどうかは人間の裁量とし、本計画は判断しない（人間確認 H-07）。

### 2.2 レイアウト設計に効く実測値

| 項目 | 最大値 | 平均 | 該当番 |
|---|---:|---:|---|
| 本文 上の句（初句＋二句＋三句） | 18 字 | — | 57 |
| 本文 下の句（四句＋五句） | 14 字 | — | 3 |
| 歴史的仮名遣い 上の句 | 19 字 | — | 4 |
| 現代仮名遣い 上の句 | 19 字 | — | 4 |
| 現代仮名遣い 下の句 | 16 字 | — | 21 |
| 作者名（漢字） | **12 字** | **4.6 字** | 76（法性寺入道前関白太政大臣） |
| 作者名（歴史的仮名遣い） | 25 字 | 9.0 字 | 76 |
| 作者名（現代仮名遣い） | 27 字 | 9.1 字 | 76 |
| 本文 上の句が 17 字以上の首 | 6 首 | — | 44, 52, 53, 57, 59, 70 |

作者名の長さの分布（現代仮名遣い）:

| 閾値 | 該当首数 | 該当番 |
|---|---:|---|
| 12 字超 | 10 首 | 49, 53, 66, 72, 76, 80, 83, 91, 95, 96 |
| 16 字超 | 4 首 | 76(27), 91(23), 83(17), 96(17) |
| 18 字超 | **2 首** | 76(27 字)、91(23 字) |

縦書き 1 列の必要高さは概ね「字数 × 行の高さ」で決まる。上の句 18〜19 字を 1 列に収める設計は、320×568 相当の実効表示高さでは字を小さくしすぎる。

**作者名も縦書きを既定とする（2026-08-30 裁定）。** 当初「作者名は横書き固定」を提案したが、実測により不要と分かった。

- 漢字表記は最大 12 字・平均 4.6 字で、本文の上の句 18 字より短い。**縦書きで何の問題もない。**
- 仮名表記でも 17 字までは、字送りと `DESIGN_SYSTEM` の「一段だけ下げる」の範囲で収まる。320×568 の実効表示高さを 400px と仮定すると、17 字で 1 字あたり約 23px であり可読域にある。これで **96 首が収まる**。
- 残る 2 首（76 番 27 字、91 番 23 字）だけ、**本文とまったく同じ扱い**とする。すなわち `layout-hints.json` の人確認済み改行候補で 2 列に割る。いずれも官職名の自然な切れ目があり、句の途中を切らずに割れる。

  ```text
  76 番  法性寺入道 / 前関白太政大臣      （11 字 + 16 字）
  91 番  後京極摂政 / 前太政大臣          （11 字 + 12 字）
  ```

- **4〜5 択の選択肢も縦書きで成立する。** 24px 相当で 5 列は約 180px、76 番を含み 6 列でも約 216px であり、320px 幅に収まる。
- **例外は自由入力欄のみ横書きとする。** `writing-mode: vertical-rl` を `<input>` / `<textarea>` に当てると、iOS Safari と Android Chrome で IME 変換中の候補表示位置とキャレット挙動が実装差を生む。入力欄は `APP_SPEC` §6 の「入力欄」＝横書き対象に該当するため、仕様どおり横書きでよい。

**P3 のあふれ検査は、上の句 17 字以上の 6 首（44, 52, 53, 57, 59, 70）と、作者名が 16 字を超える 4 首（76, 91, 83, 96）を必ず含む代表セット 10 首で先に回す。** 全 100 首検査はその後に行う。76 番・91 番の改行位置は H-03 で実機確認して確定させる。

### 2.3 リポジトリの Git 状態（重大）

```text
remote origin : https://github.com/moyashimisosoup/koten.git
commit 数     : 2（4a61a65, d001ce5）
追跡中        : 原資料 PDF 3 点 ＋ 一次データ Markdown 5 点
未追跡        : CONSTITUTION.md, README.md, LICENSE*, NOTICE, docs/, assets/, 旧設計書
.gitignore    : 存在しない
.gitattributes: 存在しない
```

判明した事実:

1. **再配布許可を確認していない原資料 PDF 3 点（合計約 5.2 MB、桐原書店の教科書付録を含む）が、コミット `d001ce5` に入っている。** `CONSTITUTION.md` §4 は「公開」に Git 履歴・raw URL・配布物を含めると定めている。したがってこのリポジトリの履歴は、そのままでは公開できない。
2. **remote が `moyashimisosoup`（個人アカウント名）を指している。** 確定事項 F-16 は、この名義を公開名義に使わないと定めている。
3. `.gitignore` と `.gitattributes` がないため、今後の作業で秘密情報や実利用データを誤って追跡する余地があり、改行コード由来の不安定なテスト失敗も防げない。

### 2.3.1 H-01 の確認結果（2026-08-30・解決済み。**対応不要**）

依頼者の確認により、次が判明した。

- **`github.com/moyashimisosoup/koten` は非公開（private）リポジトリである。**
- 用途は、原資料 PDF の一時置き場と、それ以外のファイルの Codex との共有である。
- **今後も非公開のまま使い続ける。** 公開は別リポジトリで行う予定である。

したがって:

1. **停止条件 S-1 は発動していなかった。** 憲章 §4 の「公開」は公開リポジトリ・Git 履歴・raw URL・配布物を指す。非公開リポジトリはこれに当たらない。許可未確認の原資料 PDF が外部へ配信された事実はない。
2. **リポジトリの削除も履歴書き換えも行わない。** Git の仕様上、いったんコミットしたファイルを通常操作で履歴から消すことはできず、消すには `git filter-repo` 等での履歴書き換えと force push が必要になる。これは Codex 側のクローンを壊し、得られるものは非公開リポジトリの容量削減だけである。実益がない。
3. **PDF を作業ツリーから削除することもしない。** 原資料として参照する必要があり、非公開である限り憲章に抵触しない。

**維持すべき条件は 1 つだけである。**

> このリポジトリを public にしない。public アカウントへ transfer しない。fork を公開しない。

この条件は P12 の設計（新規アカウント・新規履歴での移管、裁定 D-03）によって構造的に守られる。現リポジトリの履歴が公開経路に乗る手順は計画上どこにも存在しない。

**したがって現リポジトリは、非公開の作業用兼 Codex 共有用リポジトリとして現状のまま使い続ける。** §2.3 の判明事項のうち 1 は対応不要となり、2（remote が個人アカウント名）は「公開名義として使わない」ことで足りる（公開は別リポジトリのため）。3（`.gitignore` / `.gitattributes` の不在）のみ P0 で対応する。

### 2.4 アプリ実装の状態

アプリコードは存在しない。`package.json`、`tsconfig.json`、`vite.config.ts`、テスト、CI 設定のいずれもない。Node は v26.5.1 ／ npm 11.17.0 が使える。`assets/feedback/` に丸・チェック・花丸の透過 PNG 3 点と用途 README がある（未追跡）。

したがって本計画は「新規実装」であり、既存コードへの後付けではない。

---

## 3. 推奨アーキテクチャと選定理由

### 3.1 全体像

```text
[正本 Markdown]  ──読み取りのみ──┐
[人確認台帳 YAML] ────────────────┤
                                  ├─→ tools/build-data（Node/TS。ローカル＋CI）
                                  │      parse → normalize → apply-review → validate → emit
                                  │
                                  └─→ app/src/data/generated/*.json（再生成可能な派生物）
                                             │
                                             ↓ 静的同梱
                                    [Vite + TS + Preact SPA]
                                             │
                        ┌────────────────────┼────────────────────┐
                        ↓                    ↓                    ↓
                 IndexedDB（履歴の正本）  画面（縦横分離）    outbox → Firebase
                 events / sessions /      5 入口・結果        匿名統計・問題報告
                 settings / reports                          （失敗しても学習は続く）
```

### 3.2 選定理由と、その選定が守るもの

| 決定 | 理由 | これが守る条項 |
|---|---|---|
| データ生成をアプリ実行時ではなくビルド前工程に置く | 正本 Markdown を実行時にパースしないため、表示都合の書き換えが構造的に起きない。生成物の再現性を CI で検査できる | 憲章 §3 |
| 生成物と「人確認台帳」を別ファイルにする | 人確認の結果を正本へ書き戻さずに JSON へ反映できる。台帳が唯一の書き込み先になる | 憲章 §3、F-05、F-06 |
| IndexedDB を唯一の履歴正本とし、統計送信キューを物理的に別ストアにする | 送信失敗が履歴に触れない。「統計送信の失敗は学習を妨げない」を設計で保証する | 憲章 §5, §6 |
| 習熟度を保存値ではなくイベント列からの導出値にする | 規則版を上げても過去イベントから再計算でき、統合時に保存値を盲目的に上書きしない | 憲章 §5、`APP_SPEC` §9.2 |
| 管理確認ページを公開ビルドとは別の Vite エントリにする | `import.meta.env.DEV` のツリーシェイキング頼みにせず、公開ビルドに物理的に含めない | 憲章 §4 |
| 公開対象ツリーを `app/` に隔離する | 移管時に「移す対象だけをコピーする」が機械的に決まる。内部資料の混入を人の注意力に頼らない | 憲章 §4、F-17 |
| Preact ＋ 素の CSS（トークンは CSS 変数） | バンドルを小さく保ち、`writing-mode` と `prefers-reduced-motion` を CSS で直接扱う。UI フレームワークの既定デザインが `DESIGN_SYSTEM` の禁止事項と衝突しない | `DESIGN_SYSTEM` 禁止事項 |
| ルーティングは URL クエリのみ | GitHub Pages の base path 下で 404 を作らない。`?from=10&to=20` が仕様の主入口である | `APP_SPEC` §4 |
| 統計は Firestore REST 直書き＋匿名アカウント使い捨て（`shukudai-kanri` 実績） | Functions を持たず無料枠を守れる。トークンを永続化しない。詳細は §7 と裁定 D-02 | F-04、憲章 §6 |

### 3.3 採らなかった案

| 却下案 | 理由 |
|---|---|
| Next.js ／ SvelteKit 等のフルスタック | 確定事項 F-01 に反する。静的配信のみで足りる |
| 実行時に Markdown をパースして表示 | 正本が実行時依存になり、検証タイミングが公開後にずれる |
| 習熟度を数値カラムで保存し逐次更新 | 規則版更新時に再計算できず、統合で不整合が残る |
| ハッシュルーティング（`#/`） | 範囲 URL がクエリで指定される仕様と噛み合わず、共有 URL が読みにくい |
| PWA の初回公開必須化 | `APP_SPEC` §13 が「完全な PWA 化は初回公開後でもよい」としている。P11 の任意項目に下げる |
| `shukudai-kanri` の「日単位使い捨て利用番号」をそのまま流用 | 憲章 §6 が「同じブラウザ保存領域で**継続する**無作為な利用番号」と反復利用の集計を要求している。使い捨てでは反復利用を数えられない。ガード手法（allowlist・サニタイズ・経路禁止）だけを流用する |
| 現リポジトリに remote を足して公開する | §2.3 のとおり履歴に許可未確認 PDF が含まれる。P12 は新規履歴での移管とする |

---

## 4. 予定ディレクトリ・主要モジュール

### 4.1 リポジトリ全体（現・非公開作業リポジトリ）

```text
koten/                                   ← 非公開の作業リポジトリ（現状）
├─ .gitignore                            ← P0 で新規作成
├─ .gitattributes                        ← P0 で新規作成（* text=auto eol=lf）
├─ CONSTITUTION.md                       ← 非公開側に残す
├─ README.md                             ← 公開用に再構成して移す（P12）
├─ LICENSE / LICENSE-CONTENT.md / NOTICE ← 公開側へコピー
├─ USB-*.pdf                             ← 移管対象外（F-17）
├─ 百人一首_*.md / 古典文法_*.md          ← 正本。読み取り専用。公開側へコピー
├─ 古典関係アプリ_設計計画書_2026-08-29.md ← 内部資料。移管対象外
├─ docs/                                 ← 内部資料。移管対象外
│   ├─ APP_SPEC.md / DESIGN_SYSTEM.md / LEARNING_SCIENCE_AUDIT.md / DESIGN_AUDIT.md
│   ├─ OPUS_PLANNING_WORK_ORDER.md / OPUS_IMPLEMENTATION_PLAN.md
│   ├─ SHUKUDAI_KANRI_IMPROVEMENT_ORDER.md
│   ├─ IMPLEMENTATION_PLAN.md            ← 本書
│   ├─ ADR/                              ← P0 で新規
│   ├─ PUBLISH_MANIFEST.md               ← P0 で新規（移管対象の唯一の正本リスト）
│   └─ HANDOFF.md                        ← 作成済み。追跡する（Codex と共有するため）
├─ assets/feedback/*.png                 ← 公開側へコピー
├─ review/                               ← P2 / P6 で新規。人確認台帳（YAML）。公開側へコピー
└─ app/                                  ← ★ここだけが公開対象ツリー
```

### 4.2 公開対象ツリー `app/`

```text
app/
├─ package.json                    scripts: dev / build / preview / test / test:rules /
│                                           data:build / data:check / overflow:check /
│                                           review:dev / scan:publish
├─ tsconfig.json / tsconfig.node.json
├─ vite.config.ts                  base は環境変数から。公開ビルドの入口は index.html のみ
├─ vitest.config.ts / eslint.config.js
├─ index.html
├─ .github/workflows/
│   ├─ ci.yml                      typecheck / lint / unit / data:check / scan:publish
│   └─ deploy-pages.yml            main への push で build → Pages（P12 で有効化）
├─ public/
│   ├─ fonts/                      self-host WOFF2（サブセット）
│   ├─ feedback/                   correct-maru.png / needs-review-check.png / perfect-hanamaru.png
│   └─ 404.html                    Pages 用（index.html へ委譲）
├─ src/
│   ├─ main.tsx                    エントリ。ルート描画とグローバルエラー境界
│   ├─ app-config.ts               ★仮称・公開名義・各種版・機能フラグの単一定義（F-18）
│   ├─ styles/
│   │   ├─ tokens.css              DESIGN_SYSTEM のトークンをそのまま写す
│   │   ├─ base.css                reset、lang、フォント読込、44px 最小タップ
│   │   ├─ vertical.css            .poem / .question-text の writing-mode と列制御
│   │   └─ motion.css              prefers-reduced-motion 分岐
│   ├─ data/
│   │   ├─ generated/              ★build-data の出力。手編集禁止（CI で検査）
│   │   │   ├─ poems.json / variants.json / layout-hints.json
│   │   │   ├─ questions.blank.json / questions.author.json
│   │   │   └─ manifest.json
│   │   └─ load.ts                 生成 JSON の読込と実行時スキーマ検査
│   ├─ domain/
│   │   ├─ ids.ts                  CardNo / PoemId / QuestionId / SessionId / ItemKey のブランド型
│   │   ├─ poem.ts                 Poem 型と参照ヘルパ
│   │   ├─ question.ts             Question 型、normalization 規則、正誤判定
│   │   ├─ range.ts                URL 範囲の解析・正規化・20 首分割・残り優先
│   │   ├─ order.ts                番順／ランダム、seed 生成と固定
│   │   ├─ event.ts                Event 型、kind、method、delta の定義
│   │   ├─ mastery/
│   │   │   ├─ rules.v1.ts         イベント表・上限・減点・同一回半分・別日 90 超（規則版 1）
│   │   │   ├─ compute.ts          イベント列 → 首の習熟度（純関数）
│   │   │   └─ color.ts            5 色境界と％・メーター表示値
│   │   ├─ recommend.ts            次の一件（LEARNING_SCIENCE_AUDIT の優先順 4 段）
│   │   └─ session.ts              回の状態機械
│   ├─ storage/
│   │   ├─ db.ts                   IndexedDB open / upgrade / トランザクション
│   │   ├─ schema.ts               ストア定義とスキーマ版
│   │   ├─ repo/                   events / sessions / settings / reports / outbox
│   │   ├─ fallback.ts             IndexedDB 不可時の LocalStorage フォールバック
│   │   ├─ export.ts               書き出し（JSON ファイル／貼付文字列）
│   │   ├─ import.ts               検証 → プレビュー → 統合
│   │   ├─ merge.ts                重複排除（eventId / sessionId / reportId）
│   │   └─ reset.ts                初期化（表示設定・学年は残す）
│   ├─ telemetry/
│   │   ├─ registry.ts             ★送信イベント定義と許可フィールドの allowlist
│   │   ├─ client-number.ts        無作為な利用番号の生成・保持
│   │   ├─ sanitize.ts             allowlist 外・自由文・時刻の除去（違反は例外）
│   │   ├─ queue.ts                outbox とリトライ（学習を妨げない）
│   │   └─ transport.ts            匿名認証と送信。公開 Web 設定のみを扱う
│   ├─ reports/
│   │   ├─ form.ts                 報告カテゴリと任意注記（ローカル保持）
│   │   └─ send.ts                 統計とは別経路。注記の送信前確認
│   └─ ui/
│       ├─ components/             Button / TextField / ChoiceList / Meter / VerticalPoem /
│       │                          FeedbackMark / LiveRegion / ConfirmDialog / ErrorNotice
│       ├─ screens/                Home / RangePicker / Session / Result / History /
│       │                          Settings / Transfer / Guide / ErrorScreen
│       └─ a11y/                   focus 管理、読み上げ順、aria-live
├─ tools/
│   ├─ build-data/                 parse-poems / parse-readings / parse-variants /
│   │                              apply-review / validate / emit / hash
│   ├─ review-page/                ★非公開の管理確認ページ（別 Vite エントリ）
│   ├─ overflow-check/             Playwright で 100 首 × 4 幅の機械あふれ検査
│   └─ scan-publish/               秘密情報・内部資料・除外対象の混入検査
├─ tests/
│   ├─ unit/                       domain / storage / telemetry の単体
│   ├─ data/                       生成物の参照整合・再現性・fixture
│   ├─ screen/                     代表画面のレンダリングと a11y スモーク
│   └─ rules/                      Firestore ルールのテスト
└─ firebase/
    ├─ firestore.rules
    ├─ firestore.indexes.json
    └─ firebase.json               Emulator 設定。実プロジェクト ID は環境変数
```

### 4.3 `app-config.ts` が一箇所で持つもの（F-18）

表示名（仮称）、公開名義、リポジトリ URL、`appVersion`、`dataVersion`、`masteryRulesVersion`、正式公開日時、Firebase の使用可否フラグ、`isOfficial`（test ／ official 区分）、機能フラグ（助動詞・同期・かるた・対戦・現代語訳＝すべて false）。

画面と README の文言は必ずここを参照し、文字列を直書きしない。名称確定時の変更点をこの 1 ファイルと文言リソースに閉じ込める。CI に「`src/ui/` 配下に仮称の文字列リテラルが現れないこと」の grep 型否定アサーションを置く。

### 4.4 2 プロダクト構成（裁定 D-06 の推奨案）

依頼者の指示により、このリポジトリには**並行プロダクト**が同居する。

| # | プロダクト | 設計書 |
|---|---|---|
| 1 | 古典学習帳（百人一首アプリ） | 本書と `docs/APP_SPEC.md` |
| 2 | 歴史的仮名遣い確認ツール | `docs/superpowers/specs/2026-08-30-歴史的仮名遣い確認ツール-design.md` |

先方設計書は「`CONSTITUTION.md`、`docs/DESIGN_SYSTEM.md`、習熟度モデル、保存スキーマを共有し、公開単位とデータだけを分ける」と定めている。§4.1〜§4.2 の単一プロダクト構成をこれに合わせて組み替える。

#### 推奨する構成

```text
koten/                                  ← 非公開の作業リポジトリ
├─ docs/                                内部資料（両プロダクト共通。移管対象外）
├─ 百人一首_*.md                         プロダクト 1 の正本（読み取り専用）
├─ 仮名遣い規則_一次データ.md             プロダクト 2 の正本（未作成。先方設計書 §4.1）
├─ 仮名遣い語彙_一次データ.md             プロダクト 2 の正本（未作成。先方設計書 §4.2）
├─ review/
│   ├─ hyakunin/                        プロダクト 1 の人確認台帳
│   └─ kanazukai/                       プロダクト 2 の人確認台帳
├─ packages/
│   ├─ shared/                          ★共有層（どちらの公開単位にも入る）
│   │   ├─ src/domain/mastery/          習熟度の係数・計算・色（両者共通）
│   │   ├─ src/domain/event.ts          Event 型（product 判別子つき）
│   │   ├─ src/storage/                 IndexedDB / export / import / merge / reset
│   │   ├─ src/telemetry/               利用番号 / registry / sanitize / queue
│   │   ├─ src/ui/components/           DESIGN_SYSTEM の部品と 8 状態
│   │   └─ src/styles/                  tokens.css / base.css / motion.css
│   ├─ hyakunin/                        公開単位 1
│   │   ├─ index.html / vite.config.ts / src/（縦書き・範囲 URL・5 入口・出題）
│   └─ kanazukai/                       公開単位 2
│       ├─ index.html / vite.config.ts / src/（横書き単語・規則診断・3 モード）
├─ tools/                               build-data / review-page / overflow-check / scan-publish
├─ tests/
└─ firebase/                            共通（コレクション設計は下記）
```

`packages/shared` は npm workspace のローカルパッケージとし、公開ビルド時は各公開単位にバンドルする。ランタイム依存として配布しない。

#### 公開の単位

**推奨: 公開リポジトリは 1 つ。GitHub Pages の別パスで 2 つを配信する**（`/hyakunin/`、`/kanazukai/`）。

理由:

- 共有層を複製せずに済む。`CONSTITUTION.md` と `DESIGN_SYSTEM.md` が 1 本のまま保てる。
- 相互リンク（先方設計書「百人一首アプリからリンクしてよい」）が同一オリジンで完結する。
- 先方設計書が「分離が必要になった時点で別リポジトリへ切り出す」としており、初手で分けない方針と整合する。

代替案は公開リポジトリを 2 つに分ける案だが、共有層の複製かパッケージ公開が必要になり、初回公開の作業量が増える。採らない。

`docs/PUBLISH_MANIFEST.md` の許可リストは、共通部（正本 Markdown、LICENSE 一式、`review/`）と公開単位別部（`packages/*`）に分けて書く。

#### 共有スキーマで決めておくこと

先方設計書 §8 は「同じ書き出しファイルで両方の履歴を運べる。`itemKey` のみ異なる」としている。これを成立させるために次を固定する。

| # | 決めること | 内容 |
|---|---|---|
| 1 | `Event` に `product` を足す | `"hyakunin"` / `"kanazukai"`。`itemKey` は前者が `poemId × skill`、後者が `wordId × rule` であり、判別子がないと衝突する |
| 2 | IndexedDB は **1 つの DB** | `events` ストアに `product` インデックスを足す。DB を分けると 1 ファイルでの書き出しができない |
| 3 | 書き出し形式 | `APP_SPEC` §9.1 は `schemaVersion: 1` で `product` を持たない。**仕様改訂が必要**（人間確認 H-13）。`schemaVersion: 2` へ上げ、`events[].product` を必須にする案を推奨 |
| 4 | 初期化（reset） | 対象をプロダクト単位で選べるようにする。「百人一首の履歴だけ消す」ができないと、片方の利用者が困る |
| 5 | 無作為な利用番号 | **1 つを共有する。** 同じブラウザ保存領域で継続する番号を 2 つ持つ理由がない。統計案内の表示も 1 回でよい |
| 6 | 統計 payload | `stats_days_{env}` の 1 ドキュメント（1 利用番号 × 1 日）を維持し、**その中に product 別の集計を持つ**。コレクションを product ごとに分けると書込回数が倍増し、無料枠の余裕（§7.7）を削る |
| 7 | 習熟度の係数 | 共有。先方設計書 §6 が「ヒント段階を方式の軸に読み替えて既存係数をそのまま適用する」としており、`rules.v1.ts` を 1 本で保てる |
| 8 | 問題報告 | 共有。報告に `product` と対象 ID を持たせる |

#### 本計画への影響

| 節 | 変更 |
|---|---|
| §4.1、§4.2 | 上記構成へ置き換える（`app/` → `packages/{shared,hyakunin,kanazukai}`） |
| §6.1 | `events` ストアに `product` インデックスを足す |
| §6.2 | `Event` に `product` を足す |
| §6.6 | 書き出し `schemaVersion` を 2 へ（H-13 の決着後）。初期化をプロダクト単位で選べるようにする |
| §7.4 | コレクションは env のみで分け、product はドキュメント内の次元とする |
| §14.2 | 許可リストを共通部と公開単位別部に分ける |
| P1 | 足場を 3 パッケージ分作る。規模が「小〜中」から「中」へ上がる |
| P3 | 共有層に置く。プロダクト 2 は単語モードが横書きのため、縦書き部品は `packages/hyakunin` 側 |
| P5 | 共有層に置く。係数は 1 本 |

**裁定 D-01 は実質決着した。** 先方設計書が `itemKey` を前提としており、§6.3 の推奨案（イベントは `itemKey` で記録、表示は首単位）と一致する。D-06 と同時に正式裁定してよい。

---

## 5. 一次資料から公開データまでの流れ

### 5.1 一方向パイプライン

```text
入力（読み取り専用）
  百人一首_本文・作者_一次データ.md        … 番・作者・五句
  百人一首_読み_歴史的仮名遣い.md          … 番・作者読み・五句
  百人一首_読み_現代仮名遣い.md            … 番・作者読み・五句
  百人一首_読み_異同確認.md                … 9 件の判定と根拠 URL
入力（人が書き込む唯一の場所）
  review/authors.yaml        … 作者の別名・有職読み・確認状態・確認者・根拠
  review/blanks.yaml         … 穴埋め候補（単語／文節／句）・確認状態・根拠
  review/kugire.yaml         … 句切れ（表示上の便宜であることを示す印を必須）
  review/layout.yaml         … 縦書き改行候補（実機確認済みのみ）
  review/readings.yaml       … 読みの確認状態と要確認印

  ↓ tools/build-data
  1. parse      Markdown 表を厳密パース（列数・番号の連続・空セルを即エラー）
  2. normalize  NFC 正規化、全角空白・長音・踊り字の扱いを固定
  3. apply-review  review/*.yaml を突き合わせ、reviewStatus を確定
  4. validate   §5.3 の検査群
  5. emit       generated/*.json ＋ manifest.json

出力（再生成可能な派生物・手編集禁止）
  poems.json / variants.json / layout-hints.json
  questions.blank.json / questions.author.json
  manifest.json
```

**正本への書き戻しは、どの工程でも行わない。** `tools/build-data` は入力パスに対して読み取りのみでファイルを開く。CI で「生成器が正本 Markdown を書き込みモードで開いていないこと」を静的検査する。

### 5.2 生成物の中身（形のみ。実装コードは書かない）

```text
poems.json[]        cardNo, poemId, ku[5], text, kami, shimo,
                    author { canonical, aliases[], confirmed },
                    reading { historical{ku[5],author}, modern{ku[5],author}, status },
                    sourceRef, dataVersion

variants.json[]     cardNo, field, adopted, alternatives[], kind("異本文"|"異表記"|"読み方式"),
                    decision, evidenceUrls[]

layout-hints.json[] cardNo, breaks[]（人確認済みの改行位置）, confirmedBy, confirmedOn, device

questions.*.json[]  questionId, poemId, skill, type, blankUnit, prompt, answer,
                    candidates[], normalization, reviewStatus, sourceRef,
                    confirmationMode("individual"|"batch"), confirmedBy, confirmedOn,
                    proposedBy("human"|"ai"), batchEvidenceRef?

manifest.json       dataVersion, generatorVersion, generatedOn(日付のみ),
                    sourceHashes{ファイル名: sha256}, counts{...}, reviewCounts{...}
```

### 5.3 validator が失敗として検出するもの

| # | 検査 | 失敗時の意味 |
|---|---|---|
| V-01 | 3 ファイルとも番号 1〜100 が過不足なく 1 回ずつ | 転記漏れ・重複 |
| V-02 | 各行 7 列、空セルなし | 表の破損 |
| V-03 | 本文・歴史的・現代の 3 表で番号が一対一対応 | 参照切れ |
| V-04 | `異同確認.md` の 9 件の判定値が本文一次データと一致（§2.1 の実測値を fixture 化） | 正本が判定と食い違った |
| V-05 | `poems.json` の `text` が `ku[5]` の連結と一致 | 生成時の取りこぼし |
| V-06 | 読みが仮名（ひらがな・長音・小書き）以外を含まない | 読み欄への漢字混入 |
| V-07 | `reviewStatus !== "human-confirmed"` の問が `questions.*.json` の公開対象に含まれない | 未確認データの公開混入（F-06） |
| V-08 | `layout-hints.json` の全項目に `confirmedBy` と `confirmedOn` がある | 未確認の改行候補の採用 |
| V-09 | `kugire.yaml` の全項目に「表示上の便宜」印がある | 句切れを唯一の解釈として出す（憲章 §3） |
| V-10 | 作者の `aliases` がすべて `review/authors.yaml` に確認記録を持つ | 未確認別名を正解にした |
| V-11 | 同じ入力で 2 回生成した結果がバイト一致 | 再現性の喪失（順序・時刻の混入） |
| V-12 | `manifest.sourceHashes` が実ファイルの sha256 と一致 | 正本が生成後に変わった |
| V-13 | 作者 4〜5 択の誤答候補が、正解と同一表記でない・重複しない・4 件以上ある | 出題の破綻 |
| V-14 | `generated/` 配下に Git 差分があるのに `data:build` を通っていない | 生成物の手編集 |
| V-15 | `confirmationMode: "batch"` の項目に `batchEvidenceRef` がある（§5.5） | 根拠のない一括承認 |

V-01〜V-15 はすべて CI の `data:check` で走らせ、1 件でも失敗したらビルドを止める。

### 5.4 人間確認結果を JSON へ戻す手順

1. `npm run data:build` を実行し、`review/` に未記載の候補が `generated/manifest.json` の `reviewCounts.pending` として出る。
2. `npm run review:dev` でローカル専用の確認ページを開く（公開ビルドには含まれない）。候補・根拠・該当首の本文を並べて表示する。
3. 人が各候補に `approved` ／ `rejected` ／ `hold` と、確認者・確認日・根拠メモを付ける。ページは `review/*.yaml` に**追記**する（正本 Markdown には触れない）。
4. `npm run data:build` を再実行。`approved` のものだけが `reviewStatus: "human-confirmed"` として `questions.*.json` に入る。
5. `npm run data:check` が V-07 を含めて通ることを確認し、`review/*.yaml` と `generated/` を同一コミットで記録する。

`review/*.yaml` は公開対象に含める（判断の根拠を公開できる形にするため）。ただし報告の生テキスト・実利用データは含めない。

### 5.5 生成 AI の扱い（F-07）

生成 AI は `review/blanks.yaml` の**候補案の下書き**にだけ使ってよい。案には `proposedBy: "ai"` を必ず付け、人が `approved` にするまで `reviewStatus` は `review` に留まる。`proposedBy: "ai"` かつ `approved` の項目に確認者・確認日がない場合、V-07 とは別に validator が失敗する。

裁定 D-05（§15.1）により、承認は 1 件ずつの目視に限らず、**機構の妥当性を確認したうえでの一括承認**を認める。この場合も次を必須とする。

- `confirmationMode: "batch"` を記録する（`"individual"` と区別できるようにする）。
- `batchEvidenceRef` に、根拠となった機構確認の記録（どの代表サンプルで何を確認したか）への参照を持たせる。
- `confirmedBy` と `confirmedOn` は一括承認でも必須とする。

validator は、`confirmationMode: "batch"` かつ `batchEvidenceRef` が空の項目を V-15 として失敗させる。F-07（生成 AI だけで公開問題を確定しない）は、人が機構を確認して一括承認する行為で満たす。

---

## 6. 学習イベント・習熟度・保存のデータモデル

### 6.1 IndexedDB スキーマ（`dbVersion: 1`）

| ストア | keyPath | インデックス | 用途 |
|---|---|---|---|
| `events` | `eventId` | `poemId`, `sessionId`, `localDate`, `itemKey` | 学習イベント（追記のみ） |
| `sessions` | `sessionId` | `startedOn` | 回。範囲・入口・順序・seed・完了状態 |
| `settings` | `key`（単一レコード `"user"`） | — | 読み表示・縦横・順序・効果音・学年・案内確認 |
| `reports` | `reportId` | `status` | 問題報告（ローカル保持） |
| `outbox` | `outboxId` | `kind` | 統計・報告の送信待ち（履歴とは別ストア） |
| `meta` | `key` | — | `dbVersion`, `lastMigratedOn`, `backup` |

**`events` は追記のみ**とする。訂正は打ち消しイベントを足す形にし、既存レコードを書き換えない。これにより統合時の重複排除が `eventId` の一致判定だけで済む。

### 6.2 Event の形（`APP_SPEC` §10.2 準拠）

```text
Event {
  eventId, poemId, questionId?, sessionId,
  itemKey,                        // `${poemId}:${skill}`
  kind,                           // view | self-rate | answer
  method,                         // view | self-x | self-tri | self-o |
                                  // choice | kanji-to-kana | free-input | paper-handwriting
  outcome,                        // correct | incorrect | skipped | viewed
  hintUsed,                       // boolean（読み表示の使用）
  effectiveMethod,                // hintUsed 適用後の一段軽い method
  delta,                          // 規則版から算出した増減
  localDate,                      // YYYY-MM-DD
  sameSessionRepeat,              // boolean
  appVersion, dataVersion, masteryRulesVersion
}
```

生の入力文、紙の内容、画面文言、正確な時刻は保存しない。誤答時の入力文字列も保存しない（`APP_SPEC` §10.2 の「生の入力文を送らない」を、ローカル保存にも広げる。結果画面の「入力」表示は保存せず、その回のメモリ内でのみ扱う）。

### 6.3 習熟度の粒度（**裁定 D-01 が必要**）

`APP_SPEC` §8 は「習熟度は首単位の内部指標」と定める。`LEARNING_SCIENCE_AUDIT` は「`itemKey = poemId × skill` を独立した履歴単位にし、歌全体の正解を作者の正解に流用しない」を実装前に固定すべき未確定事項として挙げている。

**本計画の設計（裁定待ちの推奨案）**:

- イベントは常に `itemKey = poemId × skill` を持って記録する（監査の要求を満たす）。
- **表示・上限・5 色は首単位**とし、`APP_SPEC` §8.1 の上限表をそのまま首の値に適用する（仕様を満たす）。
- **おすすめと「要確認一覧」は `itemKey` 単位**で選ぶ。これにより「本文は言えるが作者が出てこない」を推薦できる。
- 首の習熟度は `itemKey` 別スコアの平均ではなく、首単位の累積計算とする。`skill` は分析・推薦の副次キーに留める。

この設計なら仕様と監査の両方を満たすが、「首の値と `itemKey` 別の値が食い違って見える」表示上の課題が残る。裁定 D-01 で確定させる。

### 6.4 習熟度計算（規則版 1・純関数）

入力は `(該当首の全イベント列, rules.v1)`、出力は `0〜100 の整数`。副作用なし。

適用順:

1. イベントを `localDate` → `eventId` の安定順に並べる。
2. `hintUsed` なら `effectiveMethod` を一段軽くする（下限 `view`）。
3. `sameSessionRepeat` なら加点を切り捨てで半分（減点は半分にしない）。
4. `delta` を累積する。減点は選択式・ヒント後 −3、漢字候補→ひらがな −4、自由入力・紙手書き −5。
5. 各イベントの `method` に対応する上限を、そのイベントによる到達上限として適用する。
6. 90 を超える値は、`localDate` が既存の 90 到達日と異なり、かつ `method ∈ {free-input, paper-handwriting}` かつ `outcome === "correct"` のイベントでのみ付与する。
7. 最後に 0〜100 へ収める。

**時間経過だけで％を下げない**（`LEARNING_SCIENCE_AUDIT`）。「そろそろ確認」は推薦側で別に扱う。

### 6.5 再計算と規則版更新

`masteryRulesVersion` が上がったときは、起動時に全首を再計算し、`meta.backup` に旧計算結果を退避する。再計算できない旧版イベント（未知の `method` を含む）は破棄せず `meta.backup` に保持し、画面に「要確認」を出す（`APP_SPEC` §9.2）。

### 6.6 export / import / 統合

- 書き出しの最上位形式は `APP_SPEC` §9.1 の形をそのまま使う（`schemaVersion: 1`）。`exportedAt` は日付のみ。
- 読み込みは「検証 → プレビュー（版・件数・対象範囲）→ 統合前バックアップ → 統合」の順。
- 重複排除は `eventId` ／ `sessionId` ／ `reportId` の完全一致のみ。
- 統合後は保存値を上書きせず、必ずイベントから再計算する。
- 拒否条件: 不正 JSON、未知の最上位キー、`schemaVersion` が未来、件数が上限超過、別アプリ形式。拒否理由を画面に出す。
- 初期化は `events` / `sessions` / `reports` を対象とし、`settings`（読み表示・縦横・順序・効果音・学年・案内確認）は残す。
- 統合と初期化は、対象と件数を示した確認を必須にする。それ以外の安全な操作に確認ダイアログを挟まない（憲章 §7）。

### 6.7 端末間の移し方（具体的な操作）

| 経路 | 操作 |
|---|---|
| 同一端末のバックアップ | 「学習データを書き出す」→ JSON ファイルを保存 |
| スマホ → スマホ（ファイル） | 書き出した JSON を共有シート経由でメッセージアプリ等へ送り、受信側で「読み込む」→ ファイル選択 |
| スマホ → スマホ（文字列） | 「貼り付け用の文字列をコピー」→ 任意のメモ・メッセージへ貼る → 受信側で「文字列から読み込む」へ貼り付け |
| iPad ↔ スマホ | 上記どちらも同じ。iOS Safari のファイル選択は「ファイル」アプリ経由で JSON を選ぶ |

文字列経路は、ファイル選択が使えない環境（一部の iOS Safari 設定、共有アプリ制限）への保険として必ず両方実装する。文字列が長くなるため、書き出し時に件数と概算文字数を先に表示する。

---

## 7. Firebase 構成とセキュリティ境界

### 7.1 送るもの・送らないもの

| 送る | 送らない |
|---|---|
| 無作為な利用番号（継続、ブラウザ保存領域単位） | 氏名・学校名・連絡先・クラス |
| 学年区分（中一／中二／中三／その他＋第二段階） | 回答本文・入力文字列・手書き画像 |
| 暦日（`YYYY-MM-DD`。時刻なし） | 正確な時刻、タイムゾーン、IP をアプリデータとして |
| ページ閲覧数、主要ボタン回数、入口別回数 | 端末固有 ID・広告 ID・フィンガープリント |
| 問種別回数、取組回数 | 個別の問題別履歴 |
| 習熟度の集計値（平均・最大・分布） | 画面文言、自由記述（統計経路では） |
| `isOfficial`（test ／ official 区分）、`dataVersion`、`appVersion` | 学習履歴そのもの |

### 7.2 無作為な利用番号

憲章 §6 は「同じブラウザ保存領域で**継続する**無作為な利用番号」を求める。`shukudai-kanri` の「日単位使い捨て ID」はこの要件を満たさない（反復利用を数えられない）ため、流用しない。

- `crypto.getRandomValues` から 20 文字（`[a-z0-9]`）を生成し、`settings` ストアに保存して継続使用する。
- 氏名・端末情報・時刻から導出しない。他の識別子と結合しない。
- ブラウザデータ削除・別端末では別番号になる。**管理画面に「番号数は実人数ではない」旨を常時表示**する（憲章 §6）。
- 初期化（学習履歴のリセット）では番号を作り直さない。番号は `settings` に属し、`reset.ts` の対象外である。

### 7.3 送信経路の構成（**裁定 D-02 が必要**）

`DESIGN_AUDIT` は「Firebase 構成は Opus が複数案を比較して裁定を求める」としている。2 案を比較する。

| | 案 A: Firestore REST 直書き | 案 B: Cloud Functions 経由 |
|---|---|---|
| 検証の置き場所 | Firestore Rules（`hasOnly` ＋型＋正規表現） | サーバー側コードで自由に検証 |
| 実績 | `shukudai-kanri` で稼働中。匿名 signUp → create → 匿名アカウント delete の 3 往復 | なし |
| 無料枠 | Firestore の書込のみ。Functions の起動回数を消費しない | Functions 呼出＋Firestore 書込。Blaze で従量課金が乗る |
| レート制限 | Rules では時間ベースの制限を書けない | App Check ＋ Functions 側で実装できる |
| 自由記述の検証 | 不可（Rules は文字列長・正規表現までしか見られない） | 可能 |
| 集計 | 生ドキュメントを管理者が Admin SDK で読んで集計 | 書込時に集計を更新できる |
| 障害時の学習影響 | なし（outbox に残す） | なし（outbox に残す） |

**推奨: 案 A（Firestore REST 直書き）＋ App Check。** 理由は F-04（無料枠内が運用目標）と、実績のある設計をそのまま持ち込めること。ただし**問題報告の任意注記は自由記述であり、案 A の Rules では内容を検証できない**。発注書 §6.5 は「任意注記は統計 payload へ混ぜず、別の検証済み報告経路にする」と定めているため、**注記付き報告だけを Functions 経由（案 B）にする混合構成**を推奨する。裁定 D-02 で確定させる。

### 7.4 コレクション設計（推奨案）

| コレクション | 1 ドキュメントの意味 | クライアント権限 | TTL |
|---|---|---|---|
| `stats_days_{env}` | 1 利用番号の 1 日ぶんの集計 | create のみ（get / list / update / delete すべて false） | 400 日 |
| `reports_{env}` | 1 件の問題報告（注記なし） | create のみ | 400 日 |
| `reports_noted_{env}` | 注記付き報告。Functions のみが書く | クライアントは全禁止 | 400 日 |

`{env}` は `test` ／ `official`。**別コレクションで物理分離**する（同一コレクション内のフラグにしない）。正式公開日時より前のデータは `test` にしか入らないよう、`app-config.ts` の `isOfficial` を単一の判定点にする。

`list` は全パスで禁止する（`shukudai-kanri` と同じ方針）。管理者は Admin SDK でルールを通らない経路から読む。ルール内に管理者判定を置かない。

### 7.5 payload の allowlist を二重にする

1. **クライアント側** `telemetry/registry.ts` に、イベント名と許可フィールドを列挙する。`sanitize.ts` が allowlist 外のキー・自由文・時刻らしき値を検出したら**送信せず例外を投げ、開発時に落とす**（本番では握りつぶして送信を捨てる。学習は妨げない）。
2. **Rules 側** で `request.resource.data.keys().hasOnly([...])` ＋ 型検査 ＋ 正規表現（`d.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}')` 等）＋ 版固定を書く。
3. **テストで 1 と 2 の一致を検査する。** `registry.ts` の許可キー集合と `firestore.rules` の `hasOnly` 引数をそれぞれ読み出し、集合が等しいことを assert する（`shukudai-kanri` の実績パターン）。

さらに、`telemetry/` 配下のソースに対する grep 型の否定アサーションを置く: `textContent` / `innerHTML` / `getAttribute` / `value` / `Date.now` / `toISOString` / `getTimezoneOffset` を書かないこと。危険な経路を「弾く」のではなく「書かない」ことをテストで守る。

### 7.6 outbox と送信失敗

- 統計・報告は必ず `outbox` ストアに書いてから送る。送信成功で削除する。
- 送信は起動後に一度だけ遅延実行する。失敗したら次回起動でやり直す。リトライループを回さない。
- **送信失敗を通常画面に一切出さない。** `console.error` も出さない（学習中の生徒が開発者ツールを開く可能性は低いが、憲章 §6 の「通常画面へ警告を出さない」を広めに解釈する）。
- 重複送信の排除は「同じドキュメント ID で create のみ許可」＋「409 ALREADY_EXISTS を成功とみなす」で行う。サーバー側に状態を持たない。
- `outbox` が上限（例 30 日ぶん）を超えたら古いものから捨てる。捨てたことは学習画面に出さない。

### 7.7 無料枠の試算と警告基準

初回公開の想定規模を「利用番号 200 ／ 1 番号あたり 1 日 1 ドキュメント ／ 稼働 60 日」と置く。

| 項目 | 概算 | Firestore 無料枠（1 日） | 余裕 |
|---|---:|---:|---|
| 書込（統計） | 200 件/日 | 20,000 | 100 倍 |
| 書込（報告） | 20 件/日 と仮定 | 20,000 | 1,000 倍 |
| 読取（管理者集計） | 12,000 件/回、週 1 回 | 50,000 | 集計を週 1 回に制限すれば収まる |
| 保存量 | 220 件 × 60 日 × 約 1 KB ≒ 13 MB | 1 GB | 75 倍 |

**警告基準**: 1 日の書込が 2,000 件（無料枠の 10%）を超えた日が 2 日続いたら実装を止めて原因を確認する。Firebase の予算アラートを無料枠相当額で設定する（人間確認 H-05）。読取は管理者集計の頻度で決まるため、**管理者集計は日次ではなく手動実行**とする。

この試算は仮定に依存する。実測が仮定を超えた場合は停止条件 S-5 とする。

---

## 8. UI 部品・画面・状態遷移

### 8.1 画面と遷移

```text
Home（第一操作＝「とりあえず始める」）
 ├─ とりあえず始める ──┐
 ├─ 見るだけ ──────────┤
 ├─ おぼえる ──────────┼→ 範囲確認（URL 指定があればそれを表示）
 ├─ 全体確認 ──────────┤    │
 ├─ 試験前の確認 ──────┘    ├→ [21 首以上] まとまり選択（最大 20 首・残り優先）
 ├─ これまでの記録（History）│
 ├─ 設定（Settings）        └→ Session
 ├─ データの移動（Transfer）        │ 問を解く → 即時フィードバック
 └─ 使い方（Guide）                 │ →「次へ」／ Enter（自動で進まない）
                                    ↓
                                  Result（範囲・問数・内訳・習熟度変化・おすすめ 1 件）
                                    ├→ 要確認・誤答だけ再確認
                                    ├→ 同じ範囲を別順で
                                    └→ 終了 / 別範囲
```

中断からの復元は Home に「前回の続きから」を出す。復元しない選択も同じ場所に置く。

### 8.2 縦書きと読み上げ順の両立

- DOM は常に自然な読み順（`初句 → 二句 → 三句 → 四句 → 五句`）で 1 本だけ持つ。
- 視覚上の縦書きは `writing-mode: vertical-rl` を親要素に当てて実現する。**読み上げ用のテキストを別途重複して置かない**（二重読み上げを防ぐ）。
- 上の句・下の句は 2 つの `<p>` に分ける。3 列以上に割る必要がある首では、`layout-hints.json` の人確認済み改行位置で `<span>` に分ける。`<span>` は読み上げ順を変えない。
- 進捗（「12 番・3 問目/8」）、操作、結果は同じ DOM 内で横書きのまま置く。縦書きブロックの前に範囲情報、後に回答欄という順序にする（`DESIGN_SYSTEM` のレイアウト順 1〜4）。
- 穴埋めの空所は `<span role="text" aria-label="ここが空欄">` 相当の代替テキストを持つ。記号だけで示さない。

### 8.3 和歌の収まらない場合の段階（`DESIGN_SYSTEM` 準拠）

1. 余白と列間を詰める。
2. 文字サイズを可読範囲内で一段だけ下げる。
3. `layout-hints.json` の人確認済み改行候補で 2〜3 列に分ける。5 列構成も正式な候補とする。
4. それでも入らない首は**実装で自動処理せず、`layout-hints.yaml` の未確認として報告し、人が実機で決める**。

自動で句の途中を折らない。句切れは表示上の便宜であり、問題の正解として見せない。

### 8.4 状態

`DESIGN_SYSTEM` の 8 状態（default / hover / focus-visible / active / disabled / loading / error / success）を全操作部品に実装する。加えて画面状態として次を持つ。

| 状態 | 出す場所 | 文言の要件 |
|---|---|---|
| 初回 | Home | 統計案内の確定文を表示。オプトアウト UI は置かない |
| 読み込み中 | Session 開始時 | ラベルを保ち、二重送信を防ぐ |
| 空 | History（履歴なし） | 「まだ記録がありません」＋始める導線 |
| 範囲エラー | Session 開始時 | 「範囲を読み込めなかったため全範囲を表示しています」（`APP_SPEC` §4 の確定文） |
| 保存失敗 | Session | 再試行と書き出しを提示。回答を失わせない |
| 容量不足 | Session | 同上＋古いデータの書き出しを促す |
| オフライン | 全画面 | 学習は継続。統計送信の失敗は出さない |
| 統合競合 | Transfer | 件数と対象を示して確認 |
| 要確認（読み） | Session | 読みの `status === "review"` の首で「要確認」を表示し、正解を自動断定しない |
| 完了 | Result | 全問正解時のみ花丸 |

### 8.5 正誤表現（色に依存しない）

| 結果 | 記号 | 文言 | 補助 |
|---|---|---|---|
| 正解 | `correct-maru.png` | 「正解」 | 習熟度の変化を％で併記 |
| 不正解 | `needs-review-check.png` | 「要確認！」＋次の行動 | 同上 |
| 自己評価 × | `needs-review-check.png` | 「要確認！」 | 同上 |
| 自己評価 △ | 記号なし | 「少しあやしい」 | チェック印は必須にしない |
| 自己評価 ○ | 記号なし | 「確認できた」 | |
| 全問正解 | `perfect-hanamaru.png` | 「今回の範囲を確認しました」 | Result のみ |

画像は縦横比を維持し、代替テキストまたは隣接する状態文を必ず置く。表示は約 0.3 秒の `opacity` ／ `transform` に限り、`prefers-reduced-motion: reduce` で停止する。

### 8.6 習熟度の表示

％（数値）、メーター（`role="meter"` 相当の可視バー）、5 色（灰／赤／黄／青／緑）を必ず同時に出す。固定の短い段階名を付けない。色の境界は未着手＝灰、1〜29 赤、30〜59 黄、60〜84 青、85〜100 緑。理由文（「前回から間隔が空いたため」等）は必要なときだけ 1 行で添える。

---

## 9. 実装フェーズと依存関係

初回公開までを **P0〜P12 の 13 フェーズ**とする。P0 はコードを書かない準備フェーズである。

```text
P0 境界固定・公開衛生（コードなし）
 └→ P1 最小実行基盤
     ├→ P2 一次資料パイプライン ──┬→ P3 表示基盤（縦書き・トークン・あふれ検査）
     │                             └→ P6 出題生成と選題
     └→ P4 保存・移行（IndexedDB / export / import / 初期化）
         ├→ P5 習熟度エンジン ──→ P6
         └→ P9 匿名統計・問題報告

P3 + P6 ──→ P7 学習画面（5 入口・回の流れ）
P5 + P7 ──→ P8 結果・おすすめ・要確認再試行
P2 + P9 ──→ P10 ローカル確認ページ（非公開）
すべて ────→ P11 実機・アクセシビリティ・公開前検証
P11 ──────→ P12 公開移管とロールバック
```

**並行可能な組**: (P2, P4)、(P3, P5)、(P9, P10 の骨格)。単独作業者の場合は上の順に直列で進めてよい。

**最初の実装 PR は P0 と P1 のみ**（§17）。

---

## 10. 各フェーズの仕様（変更予定ファイルと受入条件を含む）

各フェーズは発注書 §8 の形式で記述する。発注書 §7 の第 10 項（各フェーズの変更予定ファイル）と第 11 項（各フェーズの受入条件）は、形式上どちらもフェーズ記述の必須欄であるため、本節の各ブロック内に置いた。§11 は、それらが `APP_SPEC` §15 と憲章 §10 の受入条件を過不足なく覆っていることの対応表である。

「概算規模」は実装者日数の幅であり、確定納期ではない。

### P0 境界固定と公開衛生

```text
フェーズ名: P0 境界固定と公開衛生
目的: 公開してよいものと公開しないものを機械的に判定できる状態にし、以後の作業で
      許可未確認の原資料・秘密情報・内部資料が公開側へ漏れる経路を閉じる。
前提: H-01（origin リポジトリの公開設定確認）が完了していること。
      S-1 に該当する場合は本フェーズより先に進まない。
実施内容:
  1. `.gitignore` を作る（node_modules, dist, .env*, *.local,
     実利用データ, バックアップ, サービスアカウント JSON を除外）。
     `docs/HANDOFF.md` は除外しない。現リポジトリは非公開かつ Codex との共有経路
     であり、追跡していないと Codex から読めない（§2.3.1）。公開側への流出は
     PUBLISH_MANIFEST の許可リストで防ぐ。
  2. `.gitattributes` を作る（`* text=auto eol=lf`、PNG/PDF を binary）。
     改行コード由来の不安定なテスト失敗を先に潰す。
  3. `docs/PUBLISH_MANIFEST.md` を作る。移管対象を「含めるものの列挙」で書く。
     除外リストではなく許可リストにする（列挙漏れが公開側に出ない向きに倒す）。
  4. `docs/ADR/0001-frontend-stack.md`（Vite+TS+Preact の決定・却下案・変更条件）
     `docs/ADR/0002-data-pipeline.md`（正本を書き換えない一方向生成）
     `docs/ADR/0003-publish-boundary.md`（app/ 隔離と新規履歴での移管）を書く。
  5. ライセンス確認表 `docs/LICENSE_AUDIT.md` を作る。
     コード Apache-2.0 / 独自コンテンツ CC BY 4.0 / フォント（Zen Maru Gothic,
     Klee One）の元ライセンスと再配布条件 / assets/feedback の権利表示 /
     原資料 PDF の再配布可否（未確認と明記）を表にする。
  6. `docs/HANDOFF.md`（作成済み・追跡する）に、着手前に読む・終了時に書き足す
     運用を規約として明記する。
作成・変更予定ファイル:
  作成: .gitignore / .gitattributes / docs/PUBLISH_MANIFEST.md /
        docs/ADR/0001..0003.md / docs/LICENSE_AUDIT.md
  既存:  docs/HANDOFF.md（作成済み。追跡対象として commit する）
変更しないファイル:
  百人一首_*.md / 古典文法_*.md / USB-*.pdf / 古典関係アプリ_設計計画書_2026-08-29.md /
  docs/APP_SPEC.md / docs/DESIGN_SYSTEM.md / docs/LEARNING_SCIENCE_AUDIT.md /
  docs/DESIGN_AUDIT.md / docs/OPUS_IMPLEMENTATION_PLAN.md / CONSTITUTION.md
依存関係: なし（最初のフェーズ）
人間確認: H-01（origin の公開設定）、H-02（フォントと画像のライセンス）
対象テスト: なし（コードなし）。PUBLISH_MANIFEST とリポジトリ実体の突き合わせを目視。
受入条件:
  - `.gitignore` と `.gitattributes` が存在し、秘密情報・実利用データ・
    サービスアカウント JSON が除外されている。
  - `docs/HANDOFF.md` が追跡対象であり、かつ PUBLISH_MANIFEST に載っていない。
  - PUBLISH_MANIFEST が「含めるものの列挙」で書かれ、原資料 PDF・docs/・旧設計書が
    含まれていない。
  - ADR 3 件に、決定・却下案・変更条件が書かれている。
  - LICENSE_AUDIT に、フォント 2 種と feedback 画像 3 点の再配布条件が記録され、
    原資料 PDF が「未確認」と明記されている。
ロールバック: 作成したファイルを削除する（既存ファイルを変更しないため副作用なし）。
停止条件: S-1（origin が公開設定で PDF が配信されている）。
          S-2（フォントまたは feedback 画像の再配布条件が確認できない）。
概算規模: 小（1〜2 日）
```

### P1 最小実行基盤

```text
フェーズ名: P1 最小実行基盤
目的: Vite + TypeScript + Preact が GitHub Pages 相当の base path で動き、
      型・Lint・テスト・CI が回る土台を作る。仮称を一箇所で差し替えられる状態にする。
前提: P0 完了。
実施内容:
  1. `app/` を作り、package.json / tsconfig / vite.config / vitest.config /
     eslint.config を置く。base は環境変数から読む。
  2. `src/app-config.ts` に表示名・公開名義・appVersion・dataVersion・
     masteryRulesVersion・isOfficial・機能フラグを定義する。
  3. `src/main.tsx` と最小の Home 画面、グローバルエラー境界、ErrorScreen。
  4. `public/404.html`（Pages でのリロード対策）。
  5. CI（typecheck / lint / unit / scan:publish）。この時点で scan:publish は
     「app/ 配下に禁止パターンがないこと」だけを見る。
  6. `tools/scan-publish/` の初版: 秘密情報らしき文字列、ローカル絶対パス
     （利用者名を含む）、内部資料ファイル名の混入を検出する。
作成・変更予定ファイル:
  作成: app/package.json / app/tsconfig.json / app/tsconfig.node.json /
        app/vite.config.ts / app/vitest.config.ts / app/eslint.config.js /
        app/index.html / app/public/404.html /
        app/src/main.tsx / app/src/app-config.ts /
        app/src/ui/screens/Home.tsx / app/src/ui/screens/ErrorScreen.tsx /
        app/tools/scan-publish/index.ts /
        app/.github/workflows/ci.yml /
        app/tests/unit/app-config.test.ts
変更しないファイル: P0 と同じ読み取り専用群。docs/ 配下の既存文書。
依存関係: P0
人間確認: なし
対象テスト:
  - unit: app-config の値が揃っていること、機能フラグがすべて false であること。
  - 静的: `src/ui/` に仮称の文字列リテラルが現れないこと（grep 型否定アサーション）。
  - 手動: base path 付きでビルドし、サブパス配信でリロードできること。
受入条件:
  - `npm run build` が通り、`npm run preview` をサブパス配信してリロードで 404 に
    ならない。
  - 320 / 375 / 414 / 768px で Home に横あふれがなく、キーボードで可視フォーカスが
    見え、操作領域が 44px 以上ある。
  - Home の第一操作が「とりあえず始める」である。
  - CI が typecheck / lint / unit / scan:publish を実行して緑になる。
  - 仮称を app-config.ts の 1 箇所で変えると全画面の表示が変わる。
ロールバック: `app/` を削除する。一次資料と docs/ に影響しない。
停止条件: GitHub Pages の base path で SPA が配信できない構成的な問題が出た場合
          （その場合は配信方式を裁定に上げる）。
概算規模: 小〜中（2〜4 日）
```

### P2 一次資料パイプライン

```text
フェーズ名: P2 一次資料パイプライン
目的: 正本 Markdown と人確認台帳から、検証済みの型付き JSON を再現可能に生成する。
      正本は一切書き換えない。
前提: P1 完了。
実施内容:
  1. `tools/build-data/parse-*.ts`: 3 つの Markdown 表を厳密パースする。
     列数・番号の連続・空セルの異常は即エラーにする（黙って読み飛ばさない）。
  2. `normalize`: NFC 正規化、全角空白・長音・小書きの扱いを固定。
     踊り字は正本側で展開済みのため、追加の展開は行わない。
  3. `parse-variants`: `百人一首_読み_異同確認.md` の表と末尾の注記を読み、
     `variants.json` を作る。§2.1 の 9 件を固定 fixture にする。
  4. `review/` の初期 YAML を作る（authors / readings / kugire / layout / blanks）。
     この時点では authors と readings のみ埋め、blanks は P6 で埋める。
  5. `apply-review` → `validate`（§5.3 の V-01〜V-14）→ `emit`。
  6. `manifest.json` に sourceHashes（sha256）と各種件数を書く。
  7. `src/data/load.ts` に実行時スキーマ検査を置く（生成物が壊れていたら
     ErrorScreen へ）。
作成・変更予定ファイル:
  作成: app/tools/build-data/{parse-poems,parse-readings,parse-variants,
        normalize,apply-review,validate,emit,hash}.ts /
        review/{authors,readings,kugire,layout,blanks}.yaml /
        app/src/data/load.ts /
        app/src/domain/{ids,poem}.ts /
        app/tests/data/{parse,validate,reproducibility,variants-fixture}.test.ts
  変更: app/package.json（data:build / data:check スクリプト追加）/
        app/.github/workflows/ci.yml（data:check 追加）
  生成: app/src/data/generated/*.json（手編集禁止）
変更しないファイル:
  百人一首_本文・作者_一次データ.md / 百人一首_読み_歴史的仮名遣い.md /
  百人一首_読み_現代仮名遣い.md / 百人一首_読み_異同確認.md /
  古典文法_一次データ索引.md / USB-*.pdf
依存関係: P1
人間確認: H-04（読みの確認状態。`status: "review"` を残す首の決定）
対象テスト:
  - data: V-01〜V-14 の全件。
  - data: 同一入力での 2 回生成がバイト一致（再現性）。
  - 静的: build-data が正本パスを書き込みモードで開いていないこと（grep 型否定）。
受入条件:
  - `npm run data:build` を 2 回実行して生成物がバイト一致する。
  - 正本 Markdown の mtime とハッシュが実行前後で変わらない。
  - V-01〜V-14 のいずれかを故意に壊した fixture で `data:check` が失敗する
    （検査が実際に効いていることを確認する）。
  - `reviewStatus !== "human-confirmed"` の項目が `questions.*.json` に入らない。
  - `variants.json` に 9 件の異同が primary / alternatives / 根拠 URL つきで残る。
ロールバック: `app/src/data/generated/` と `app/tools/build-data/` を削除する。
              `review/*.yaml` は人の作業結果なので削除しない。
停止条件: S-3（正本と異同記録の不一致を、根拠なしに一方へ潰す必要が生じた）。
          S-4（100 首の番・本文・作者・読みの参照整合が取れない）。
概算規模: 中（4〜7 日）
```

### P3 表示基盤（トークン・フォント・縦書き・あふれ検査）

```text
フェーズ名: P3 表示基盤
目的: DESIGN_SYSTEM のトークン・書体・8 状態を部品として実装し、100 首すべてが
      必須 4 幅で読める縦書き表示を確立する。
前提: P1 完了、P2 完了（実データで検査するため）。
実施内容:
  1. `styles/tokens.css` に DESIGN_SYSTEM の OKLCH トークンをそのまま写す。
     画面中に色値を直書きしない（CI で grep 検査）。
  2. フォントの self-host。日本語サブセットを分割し、WOFF2 を `public/fonts/` に置く。
     フォールバック時の行送りを確認する。
  3. `styles/vertical.css`: `.poem` / `.question-text` の writing-mode と列制御。
     DOM は自然な読み順のみを 1 本持つ（重複読み上げを作らない）。
  4. `ui/components/`: Button / TextField / ChoiceList / Meter / VerticalPoem /
     FeedbackMark / LiveRegion / ConfirmDialog / ErrorNotice を 8 状態つきで実装。
  5. `tools/overflow-check/`: Playwright で 320/375/414/768px × 100 首 ×
     読み 3 表示を描画し、`scrollWidth > clientWidth` と要素のはみ出しを検出。
     まず §2.2 の代表セット（44, 52, 53, 57, 59, 70, 76）で回し、次に全 100 首。
  6. あふれ候補を `review/layout.yaml` の未確認項目として出力する。
     自動で改行位置を決めない。
  7. 作者名の表示は横書きに固定する（§2.2 の実測値による）。
作成・変更予定ファイル:
  作成: app/src/styles/{tokens,base,vertical,motion}.css /
        app/src/ui/components/*.tsx /
        app/src/ui/a11y/{focus,LiveRegion}.ts /
        app/public/fonts/*.woff2 /
        app/tools/overflow-check/index.ts /
        app/tests/screen/{components,vertical}.test.tsx
  変更: app/src/main.tsx（スタイル読込）/ app/package.json（overflow:check）
  追記: review/layout.yaml（機械検出したあふれ候補。人が確認して確定させる）
変更しないファイル: 一次資料一式、docs/DESIGN_SYSTEM.md
依存関係: P1, P2
人間確認: H-03（あふれ候補の実機確認と改行位置の決定）、H-02（フォントライセンス）
対象テスト:
  - screen: 8 状態のレンダリング、focus-visible のリングがアニメーションしないこと。
  - screen: 縦書き要素の DOM 順が初句〜五句であること、読み上げ用の重複テキストが
    ないこと。
  - 静的: CSS に生の色値（`#`, `rgb(`, `oklch(` の直書き）が tokens.css 以外に
    現れないこと。
  - overflow:check: 4 幅 × 100 首で新規のあふれがゼロ（既知の未確認は一覧で残る）。
受入条件:
  - 320 / 375 / 414 / 768px で、代表セット 7 首と全 100 首に横あふれ・文字切れが
    ない（未確認として残る首は `review/layout.yaml` に列挙され、数がゼロである）。
  - 200% 拡大で主要ボタンが 2 行に折れない。
  - `prefers-reduced-motion: reduce` でフィードバック表示の動きが止まる。
  - 効果音が初期状態で鳴らない。
  - フォント読込に失敗してもフォールバックで本文が読める。
  - 色・記号・文言・読み上げのいずれか 1 つに依存した表現がない。
ロールバック: `styles/` と `ui/components/` を削除する。データ層に影響しない。
停止条件: S-6（主要実機で縦書きが読めない、または 320px で操作不能が残る）。
概算規模: 中〜大（5〜9 日。実機確認の待ち時間を含む）
```

### P4 保存・移行（IndexedDB / export / import / 初期化）

```text
フェーズ名: P4 保存・移行
目的: 学習イベントを端末内に確実に残し、書き出し・読み込み・重複排除統合・初期化が
      既存記録を失わせずに動く状態にする。
前提: P1 完了。P2 とは並行可能。
実施内容:
  1. `storage/schema.ts` に §6.1 のストア定義と dbVersion を置く。
  2. `storage/db.ts`: open / upgrade / トランザクション。upgrade 失敗時に
     既存データを消さない経路にする。
  3. `storage/repo/`: events（追記のみ）/ sessions / settings / reports / outbox。
  4. `storage/fallback.ts`: IndexedDB が使えない環境で LocalStorage へ退避。
     容量上限に達したら書き出しを促す。
  5. `storage/export.ts`: APP_SPEC §9.1 の最上位形式。JSON ファイルと貼付文字列の
     両方を出す。件数と概算文字数を先に表示する。
  6. `storage/import.ts`: 検証 → プレビュー → 統合前バックアップ → 統合。
  7. `storage/merge.ts`: eventId / sessionId / reportId の完全一致で重複排除。
  8. `storage/reset.ts`: events / sessions / reports のみを対象。settings は残す。
  9. `ui/screens/Transfer.tsx` と ConfirmDialog（対象と件数を示す）。
作成・変更予定ファイル:
  作成: app/src/storage/{schema,db,fallback,export,import,merge,reset}.ts /
        app/src/storage/repo/{events,sessions,settings,reports,outbox}.ts /
        app/src/domain/event.ts /
        app/src/ui/screens/Transfer.tsx /
        app/tests/unit/storage/{db,merge,import,export,reset,fallback}.test.ts
  変更: app/src/ui/screens/Home.tsx（データの移動への導線）
変更しないファイル: 一次資料一式、app/src/data/generated/
依存関係: P1
人間確認: なし
対象テスト:
  - unit: 同一ファイルを 2 回読み込んでも二重加算されない。
  - unit: 既存記録が読み込みで消えない（両方向マージで収束すること）。
  - unit: 初期化後も settings（読み表示・縦横・順序・効果音・学年・案内確認・
    利用番号）が残る。
  - unit: 不正 JSON / 未来の schemaVersion / 未知の最上位キー / 件数超過を
    理由つきで拒否する。
  - unit: dbVersion upgrade で既存イベントが失われない。
  - unit: 容量不足の例外で回答が失われず、再試行と書き出しが提示される。
受入条件:
  - 回答直後のリロード、ブラウザ再起動、DB upgrade、容量不足の 4 シナリオで
    記録を失わない。
  - 同一エクスポートを 2 回インポートしてイベント件数が変わらない。
  - 初期化で本文・表示設定・正本・利用番号が消えない。
  - 統合と初期化が、対象と件数を示した確認を経てのみ実行される。
  - 安全な操作（範囲選択、次へ、読み表示切替）に確認ダイアログが出ない。
ロールバック: `storage/` を削除する。ただし利用者端末に作られた DB は残るため、
              リリース後のロールバックでは dbVersion を下げない
              （下げると既存端末が壊れる）。
停止条件: S-7（IndexedDB 移行で既存履歴の消失・重複加算・復元不能が疑われる）。
概算規模: 中（4〜7 日）
```

### P5 習熟度エンジン

```text
フェーズ名: P5 習熟度エンジン
目的: APP_SPEC §8.1 のイベント表を純関数として実装し、上限・減点・同一回半分・
      別日 90 超・ヒント一段軽いを自動テストで固定する。
前提: P4 完了（Event 型の確定）。裁定 D-01 の決着。
実施内容:
  1. `domain/mastery/rules.v1.ts`: イベント表・上限・減点値を定数として持つ。
     APP_SPEC の値をそのまま写し、コード側で係数を再定義しない。
  2. `domain/mastery/compute.ts`: イベント列 → 0〜100 の純関数（§6.4 の適用順）。
  3. `domain/mastery/color.ts`: 5 色境界と％・メーターの表示値。
  4. `domain/recommend.ts`: LEARNING_SCIENCE_AUDIT の優先順 4 段。同点は番の昇順。
     一度に 1 件だけ返す。
  5. 規則版更新時の全再計算と `meta.backup` への退避。
作成・変更予定ファイル:
  作成: app/src/domain/mastery/{rules.v1,compute,color}.ts /
        app/src/domain/recommend.ts /
        app/tests/unit/mastery/{increments,caps,decrements,same-session,
        hint-downgrade,over-90,recompute}.test.ts /
        app/tests/unit/recommend.test.ts
  変更: app/src/storage/repo/events.ts（itemKey インデックス）
変更しないファイル: docs/APP_SPEC.md, docs/LEARNING_SCIENCE_AUDIT.md
依存関係: P4、裁定 D-01
人間確認: H-06（習熟度係数・色境界・おすすめ順の試験運用）
対象テスト（suite を目的別に分ける。1 本に集約しない）:
  - increments: 閲覧 +1 / 見るだけ ×△○ +1/+2/+3 / 選択式 +5 /
    漢字候補→ひらがな +7 / 自由入力 +9 / 紙手書き +9。
  - caps: 上限 20 / 20 / 30 / 35 / 65 / 80 / 90 / 90 が各方式で効く。
    閲覧だけを 100 回繰り返しても 20 を超えない。
  - decrements: −3（選択式・ヒント後）/ −4（漢字候補→ひらがな）/
    −5（自由入力・紙手書き）。0 未満にならない。
  - same-session: 同一 (sessionId, questionId) の 2 回目以降が切り捨て半分。
    減点は半分にならない。別問題は通常どおり加算される。
  - hint-downgrade: free-input → kanji-to-kana → choice → self-o → view の
    一段下げ。下限が view。ヒントだけの正答が自力正答の加分にならない。
  - over-90: 同一日の想起では 90 を超えない。別日かつ自由入力／紙手書きの
    正答でのみ超える。表示上限 100。
  - recompute: 規則版を上げて全再計算しても、イベントが失われず backup が残る。
  - recommend: 優先順 4 段の順序、同点時の番昇順、1 件のみ返すこと。
受入条件:
  - APP_SPEC §15 の 7 番（イベント表の増分・上限・ヒント・減点・同一回半分・
    90 超の別日想起）が自動テストで検証されている。
  - 閲覧だけで 20% を超えない（憲章 §2「閲覧だけで高い習熟度に到達させない」）。
  - 習熟度が保存値ではなくイベント列から導出されている（保存値を直接書く経路が
    存在しないことを静的検査で確認）。
  - 時間経過だけで％が下がらない。
ロールバック: `domain/mastery/` を削除する。イベントは残るため再実装で復元できる。
停止条件: 裁定 D-01 が未決のまま実装を進める必要が生じた場合。
概算規模: 中（3〜5 日）
```

### P6 出題生成と選題

```text
フェーズ名: P6 出題生成と選題
目的: 人確認済みの候補だけから穴埋め・作者問題を作り、範囲・順序・20 首分割・
      残り優先に従って出題列を決める。
前提: P2 完了、P5 完了。
実施内容:
  1. `review/blanks.yaml` を埋める工程を回す（§5.4 の手順）。
     生成 AI は候補案の下書きのみ。`proposedBy: "ai"` を必ず付ける。
  2. `tools/build-data` に穴埋め候補（単語／文節／句）と作者 3 形式の生成を足し、
     `questions.blank.json` / `questions.author.json` を出す。
  3. `domain/range.ts`: URL の `from` / `to` 解析。片側指定、範囲外、非整数、
     空文字、解釈不能を安全に 1〜100 へ戻し、確定文を表示する。
     21 首以上を最大 20 首のまとまりへ分割。次回は未確認の残りを優先。
  4. `domain/order.ts`: 初回は番順。一巡後に区切りで番順／ランダムを選べる。
     ランダムは回の開始時に固定した並びを使い、回の途中で並び直さない。
     二巡目以降が毎回同じにならない seed を作り `session.seed` に保存する。
  5. `domain/question.ts`: normalization 規則と正誤判定。
     作者の別名照合は確認済み別名のみ。不一致は不正解または要確認。
  6. 候補数不足時は水増しせず別形式へ切り替える。
作成・変更予定ファイル:
  作成: app/src/domain/{range,order,question,session}.ts /
        app/tools/build-data/{emit-blanks,emit-authors}.ts /
        app/tests/unit/{range,order,question}.test.ts /
        app/tests/data/questions.test.ts
  変更: review/blanks.yaml（人確認の追記）/ review/authors.yaml /
        app/src/data/generated/questions.*.json（再生成）
変更しないファイル: 一次資料一式
依存関係: P2, P5（裁定 D-05 は 2026-08-30 に決着済み。§15.1 の一括承認運用で実装する）
人間確認: H-04（出題機構の妥当性確認）、H-05（作者名の異形・別称・有職読みの正答範囲）
対象テスト:
  - range: `?from=10&to=20` / `?from=30` のみ / `?to=40` のみ / 逆順 /
    0 / 101 / 小数 / 空文字 / 文字列 / 欠落。21 首以上の 20 首分割。
    「あと○首」の表示値。次回の残り優先。
  - order: 初回一巡が番順。一巡後の切替が区切りでのみ起きる。
    同一 seed で並びが再現し、別 seed で変わる。回の途中で並び直さない。
  - question: 表記ゆれの許容範囲、完全一致を要求する部分、確認済み別名のみの照合。
  - data: reviewStatus が human-confirmed でない候補が出題に出ない。
    作者 4〜5 択の誤答が 4 件以上あり、正解と重複しない。
受入条件:
  - APP_SPEC §15 の 3 番（範囲 URL）と 5 番（穴埋め 3 単位・助詞を含む人確認済み
    候補・作者 3 形式）が動く。
  - 未確認候補が公開出題に 1 件も混ざらない。
  - 候補数不足の首で、水増しせずに別形式へ切り替わる。
  - 学習中に URL だけを変えても現在の回が変わらない。
ロールバック: 生成した questions を空にし、`review/blanks.yaml` は残す。
停止条件: S-8（人確認のない助詞境界・句切れ・別名を正解として公開する必要が生じた）。
概算規模: 大（7〜12 日。人確認の待ち時間が支配的）
```

### P7 学習画面（5 入口・回の流れ）

```text
フェーズ名: P7 学習画面
目的: 5 つの入口から、範囲を失わずに一問目へ到達し、回答・即時フィードバック・
      「次へ」で進む流れを完成させる。
前提: P3 完了、P6 完了。
実施内容:
  1. Home（第一操作＝とりあえず始める）、RangePicker、Session。
  2. 5 入口の差分を実装する。
     quick: 番順・穴埋めと作者確認を少量ずつ混ぜる・設定を決めず開始。
     view: 1 回 10 首目安・回答を要求しない・区切りで ○△× を任意付与。
     learn: 穴埋めと想起中心・ヒントと答えの表示。
     review: 範囲の全首を一巡・本文／読み／作者を均等に。
     exam: 1 問ずつ想起 → 答えを表示 → ○△× で自己採点。
           画面手書き欄は任意。文字認識・画像保存は行わない。
  3. 読み 3 表示の切替（ルビなし／歴史的仮名遣いルビ／全文現代仮名遣い）。
     切替は設定として保存する。切替が正解そのものを変えない。
     使用したらヒント利用として記録する。
  4. 縦横切替（「横書きで表示」）を問・閲覧画面に置く。設定として保存。
  5. 「次へ」ボタンと Enter で進む。自動で次問へ送らない。
  6. 「問題を報告」を各問・閲覧画面に置く（送信は P9）。
  7. 中断からの復元と、復元しない選択。
作成・変更予定ファイル:
  作成: app/src/ui/screens/{Session,RangePicker,Settings,Guide}.tsx /
        app/src/ui/components/{ReadingToggle,WritingModeToggle,HandwritingPad}.tsx /
        app/tests/screen/session.test.tsx /
        app/tests/unit/session-flow.test.ts
  変更: app/src/ui/screens/Home.tsx / app/src/domain/session.ts /
        app/src/storage/repo/events.ts（イベント書込の呼び出し）
変更しないファイル: 一次資料一式、生成 JSON
依存関係: P3, P6
人間確認: なし（実機確認は P11）
対象テスト:
  - screen: 5 入口それぞれで一問目に到達する。範囲が失われない。
  - screen: 自動で次問へ進まない（タイマー経過で遷移しないこと）。
    Enter と「次へ」の両方で進む。
  - screen: 読み表示を使うと hintUsed が立ち、正解そのものは変わらない。
  - screen: 読みの status が review の首で「要確認」が出て、正解を自動断定しない。
  - unit: 回答 → 保存 → 表示の順序（保存前に答えを見せない）。
  - screen: 手書き欄なしでも exam を完了できる。
受入条件:
  - APP_SPEC §15 の 4 番（5 入口・番号順/ランダム・縦横・読み 3 表示）が動く。
  - 初回利用者が URL 範囲を失わずに一問目へ到達できる。
  - 回答が保存された後に答えが表示される（順序が逆でない）。
  - ドラッグ・音声・手書き認識が必須操作になっていない。
  - 進捗が「12 番・3 問目/8」の形で番・首・問を区別して表示される。
ロールバック: `ui/screens/Session.tsx` を最小画面へ戻す。データ層に影響しない。
停止条件: S-6（主要実機・320px・キーボード・読み上げで操作不能が残る）。
概算規模: 大（8〜12 日）
```

### P8 結果・おすすめ・要確認再試行

```text
フェーズ名: P8 結果・おすすめ・要確認再試行
目的: 回の終わりに、範囲・問数・内訳・習熟度の変化・おすすめ 1 件を示し、
      任意の再確認へつなぐ。
前提: P5 完了、P7 完了。
実施内容:
  1. Result 画面: 対象範囲、問題数、正解／要確認／閲覧の内訳、習熟度の変化、
     次のおすすめ 1 件。順位・他者比較を置かない。
  2. 全問正解時のみ花丸を加える。
  3. 一巡後、首ごとに「閲覧」「正答」「要確認」「誤答」「次に確認する理由」を示す。
  4. 要確認・誤答だけの再確認、同じ範囲を別順での再確認。自動で再開しない。
  5. History 画面: 本人の習熟度（％・メーター・5 色）と要確認一覧。
     全体・学年別の集計はここに出さない。
作成・変更予定ファイル:
  作成: app/src/ui/screens/{Result,History}.tsx /
        app/src/ui/components/{MasteryMeter,ReviewList,Recommendation}.tsx /
        app/tests/screen/{result,history}.test.tsx
  変更: app/src/domain/session.ts（完了状態）/ app/src/domain/recommend.ts
変更しないファイル: 一次資料一式
依存関係: P5, P7
人間確認: H-06（おすすめ順の試験運用）
対象テスト:
  - screen: 全問正解でのみ花丸が出る。1 問でも要確認があれば出ない。
  - screen: おすすめが常に 1 件だけ。終了・別範囲の選択が妨げられない。
  - screen: 順位・偏差値・他者比較・連続日数の表示が存在しない
    （grep 型否定アサーション）。
  - screen: 習熟度が％・メーター・5 色の 3 つで同時に示される。
  - screen: 自動で次の回が始まらない。
受入条件:
  - APP_SPEC §15 の 6 番（○・△・全問花丸・結果・任意再確認・番/首/問の区別）が動く。
  - 習熟度に固定の短い段階名が付いていない。
  - 生徒画面に全体・学年別集計が出ない。
ロールバック: Result を最小表示に戻す。
停止条件: なし（表示層のため、問題があれば裁定ではなく修正で扱う）。
概算規模: 中（4〜6 日）
```

### P9 匿名統計と問題報告

```text
フェーズ名: P9 匿名統計と問題報告
目的: 個人を特定しない統計と問題報告を、学習を妨げない経路で受け取る。
      test / official を物理的に分ける。
前提: P4 完了、P7 完了。裁定 D-02 の決着。
実施内容:
  1. `telemetry/registry.ts`: イベント名と許可フィールドの allowlist。
  2. `telemetry/client-number.ts`: 継続する無作為な利用番号（§7.2）。
  3. `telemetry/sanitize.ts`: allowlist 外・自由文・時刻の検出。開発時は例外、
     本番は送信を捨てる。
  4. `telemetry/queue.ts`: outbox。起動後に一度だけ遅延送信。失敗は次回起動へ。
     画面に出さない。
  5. `telemetry/transport.ts`: 匿名認証 → create → 匿名アカウント削除。
     トークンを永続化しない。409 を成功とみなす。
  6. 統計案内（初回表示）: APP_SPEC §11 の確定文をそのまま使う。
     オプトアウト UI を置かない。
  7. 学年選択の二段階（中一／中二／中三／その他 → 小学生／高一／高二／高三／大人）。
  8. `reports/`: カテゴリ（本文／読み／作者／候補／表示／その他）と任意の短い注記。
     注記はローカル保持。送信する場合は内容と匿名性を送信前に確認する。
     注記付き報告は統計とは別コレクション・別経路（裁定 D-02）。
  9. `firebase/firestore.rules`: create のみ、list 全禁止、hasOnly ＋型＋正規表現
     ＋版固定 ＋ map サイズ上限 ＋ TTL 用 expiresAt。
 10. App Check の有効化。
作成・変更予定ファイル:
  作成: app/src/telemetry/{registry,client-number,sanitize,queue,transport}.ts /
        app/src/reports/{form,send}.ts /
        app/src/ui/components/{StatsNotice,GradePicker,ReportForm}.tsx /
        app/firebase/{firestore.rules,firestore.indexes.json,firebase.json} /
        app/tests/unit/telemetry/{registry,sanitize,queue,client-number}.test.ts /
        app/tests/rules/{stats,reports}.test.ts /
        app/tests/unit/telemetry/allowlist-parity.test.ts
  変更: app/src/app-config.ts（isOfficial、正式公開日時、Firebase 使用フラグ）/
        app/src/storage/repo/outbox.ts
変更しないファイル: 一次資料一式
依存関係: P4, P7、裁定 D-02
人間確認: H-05（Firebase プロジェクト作成・予算アラート・App Check 登録）
対象テスト:
  - privacy invariant: 自由文・回答本文・正確な時刻・端末固有 ID・広告 ID・
    フィンガープリント・秘密情報を payload に入れようとすると拒否される。
  - allowlist-parity: registry.ts の許可キー集合と firestore.rules の hasOnly が
    一致する。
  - 静的（grep 型否定）: telemetry/ に textContent / innerHTML / getAttribute /
    Date.now / toISOString / getTimezoneOffset が現れない。
  - rules（Firestore Emulator 上で実行する）: create のみ許可、list 全禁止、
    update / delete 拒否、型・正規表現・版固定・map サイズ上限。
    Emulator は `firebase/firebase.json` の設定で起動し、実プロジェクトへ接続しない。
  - rules（テキスト検査。Emulator を起動せずに CI で回す）: 各 match ブロックの
    allow 行の総数が期待値と一致すること。後から許可が増えたら落ちる。
  - queue: オフラインで学習が完了する。送信失敗が画面に出ない。
    409 を成功として outbox から消す。同じ日を二重送信しない。
  - client-number: 初期化で利用番号が作り直されない。氏名・時刻から導出しない。
  - env: isOfficial=false のとき official コレクションへ書かない。
受入条件:
  - APP_SPEC §15 の 9 番（統計案内・無作為番号・正式/テスト区分・少人数を含む
    集計精度・送信失敗時の学習継続）と 10 番（報告のローカル保存・送信・
    管理者確認・公開除外）が検証できる。
  - 案内表示・オフライン・Firebase 障害のいずれでも学習が完了する。
  - 個別オプトアウト画面が存在しない。
  - 集計値が少人数を理由に隠されたり丸められたりしない。
  - 管理画面に「番号数は実人数ではない」旨が表示される。
  - 公開バンドルにサービスアカウント鍵・管理者認証情報が含まれない。
ロールバック: `app-config.ts` の Firebase 使用フラグを false にする。
              学習機能は影響を受けない（outbox に溜まるだけ）。
停止条件: S-9（統計 payload が個人特定・自由入力・個別の問題別履歴・正確な時刻・
          端末固有 ID につながる、または匿名区分が検証できない）。
          S-10（Rules・認証・TTL・test/official 境界をテストで再現できない）。
          S-5（無料枠の警告基準を超えた）。
概算規模: 大（7〜11 日）
```

### P10 ローカル確認ページ（非公開）

```text
フェーズ名: P10 ローカル確認ページ
目的: 人確認と問題報告の処理を、公開ビルドに含まれない別エントリで行う。
前提: P2 完了、P9 完了。
実施内容:
  1. `tools/review-page/` を別 Vite エントリとして作る。
     公開ビルド（`npm run build`）の入口は index.html のみとし、
     review-page をビルド対象に含めない。
  2. 候補確認: `review/*.yaml` への追記（approved / rejected / hold ＋
     確認者・確認日・根拠メモ）。正本 Markdown には触れない。
  3. 報告確認: 状態（未確認／確認中／採用／却下）での絞り込み、正本と問の参照、
     修正案・根拠・確認者・確認日の記録。
     確認済みになるまで当該問題を公開出題から外せる。
  4. 管理者集計: Admin SDK で読む。手動実行。日次自動化しない（無料枠のため）。
  5. `tools/scan-publish/` に「dist/ に review-page の識別子が現れないこと」の
     検査を足す。
作成・変更予定ファイル:
  作成: app/tools/review-page/{index.html,main.tsx,*.tsx} /
        app/tools/review-page/vite.config.ts /
        app/tests/unit/publish-exclusion.test.ts
  変更: app/package.json（review:dev）/ app/tools/scan-publish/index.ts /
        docs/PUBLISH_MANIFEST.md（review-page を除外対象と明記）
  追記: review/*.yaml（人の確認結果）
変更しないファイル: 一次資料一式、app/src/ 配下（公開アプリ）
依存関係: P2, P9
人間確認: H-04, H-05（このページを使って行う）
対象テスト:
  - publish-exclusion: `npm run build` の出力に review-page 由来の識別子・
    ファイルが含まれない。
  - unit: 除外指定した問が出題列に出ない。
受入条件:
  - 公開ビルドの成果物に管理確認ページが物理的に含まれない。
  - `review/*.yaml` への追記だけで公開出題の可否が変わる。
  - 報告の生テキストと未集計データが公開リポジトリへ入らない。
ロールバック: `tools/review-page/` を削除する。公開アプリに影響しない。
停止条件: 公開ビルドに管理ページが混入し、除外を機械的に保証できない場合。
概算規模: 中（4〜6 日）
```

### P11 実機・アクセシビリティ・公開前検証

```text
フェーズ名: P11 実機・アクセシビリティ・公開前検証
目的: 憲章 §10 の公開判定と APP_SPEC §15 の受入条件 12 項目を、代表環境で
      実際に確認して記録する。
前提: P0〜P10 完了。
実施内容:
  1. 全テスト、production build、秘密情報走査を実行する。
  2. 必須 4 幅（320/375/414/768px）で全画面を確認する。
  3. iOS Safari、Android Chrome、iPad Safari で主要導線を一巡する。
     縦書き、キーボード、200% 拡大、向き変更、読み上げ順、
     prefers-reduced-motion を確認する。
  4. 100 首の実機あふれ確認（P3 の機械検査で残った候補を人が確認する）。
  5. 既知の制約を使い方と変更履歴に明記する。「完全対応」と書かない。
  6. README・仕様・使い方・画面文言の一致を確認する。
  7. 確認結果を `docs/RELEASE_CHECK.md` に記録する（内部資料）。
作成・変更予定ファイル:
  作成: docs/RELEASE_CHECK.md（内部資料。移管対象外）/
        app/src/ui/screens/Guide.tsx の既知の制約セクション
  変更: README.md（公開用の内容へ）/ app/src/app-config.ts（appVersion）
変更しないファイル: 一次資料一式、CONSTITUTION.md、docs/APP_SPEC.md
依存関係: P0〜P10 すべて
人間確認: H-03, H-08（実機一巡）
対象テスト: 全 suite ＋ production build ＋ 秘密情報 scan ＋ overflow:check 全 100 首
受入条件（憲章 §10 と APP_SPEC §15 を全件）:
  - 100 首の番・本文・作者・3 種の読みの参照整合が取れる。
  - 正本と生成 JSON の不一致を検出できる。
  - 範囲 URL、学習履歴、統合、初期化が代表環境で動く。
  - 縦書きが代表幅で読め、横書き切替が機能する。
  - 匿名統計と正式・テスト区分が検証できる。
  - 公開物に秘密情報、内部資料、許可未確認の原資料がない。
  - README、仕様、使い方、画面文言が一致する。
  - 既知の制約を「完全対応」で隠していない。
  - 3 種の実機、キーボード、読み上げ、200% 拡大で重大な操作不能がない。
ロールバック: 公開しない（このフェーズは判定であり、変更ではない）。
停止条件: S-6（主要実機で操作不能）。S-11（公開判定 8 項目のいずれかを満たせない）。
概算規模: 中〜大（5〜8 日。実機確認の待ち時間を含む）
```

### P12 公開移管とロールバック

```text
フェーズ名: P12 公開移管とロールバック
目的: 新しい GitHub アカウントの公開リポジトリへ、移す対象だけを新規履歴で移し、
      GitHub Pages で配信できる状態にする。
前提: P11 の受入条件をすべて満たしていること。
実施内容:
  1. 新しい GitHub アカウントを用意する（F-16。個人 SNS 名を使わない）。
  2. **空の新規リポジトリを作り、`git init` から始める。**
     現リポジトリの remote を付け替えない。履歴を引き継がない。
     理由: §2.3 のとおり現履歴に許可未確認の原資料 PDF が含まれるため、
     `git filter-repo` での除去よりも、新規履歴のほうが漏えい経路が少ない。
  3. `docs/PUBLISH_MANIFEST.md` の許可リストに従って、対象ファイルだけを
     新ツリーへコピーする（`app/`、一次データ Markdown、LICENSE 一式、
     NOTICE、assets/feedback、review/*.yaml、公開用 README）。
  4. コピー後に `npm run scan:publish` を実行し、内部資料・秘密情報・
     ローカル絶対パス（利用者名を含む）・原資料 PDF の混入がゼロであることを
     確認する。1 件でもあれば移管を中止する。
  5. 公開名義を `koten contributors`（または確定した正式名）に統一する。
     コミットの author 名・メールに個人 SNS 名を残さない。
  6. GitHub Pages を有効化し、base path をビルド設定に反映する。
  7. `deploy-pages.yml` を有効化する。Secrets には Firebase の公開 Web 設定のみ
     を置き、サービスアカウント鍵・管理者認証情報を置かない。
  8. 移管後に clone → build → Pages 配信 → 範囲 URL → 学習 → 保存 →
     書き出し／読み込み → 問題報告 を再確認する。
  9. ロールバック手順を `docs/ROLLBACK.md` に書く。
作成・変更予定ファイル:
  作成: （新リポジトリ側）公開ツリー一式 /
        docs/ROLLBACK.md（内部資料）/ docs/MIGRATION_LOG.md（内部資料）
  変更: app/src/app-config.ts（公開名義・リポジトリ URL・正式公開日時）/
        app/.github/workflows/deploy-pages.yml（有効化）
変更しないファイル:
  現リポジトリの一次資料・docs/・原資料 PDF（そのまま非公開側に残す）
依存関係: P11
人間確認: H-01, H-09（新アカウント作成と所有権・Pages・Actions・Secrets の確認）
対象テスト:
  - scan:publish が新ツリーで 0 件。
  - Pages 配信後のスモーク（範囲 URL、一問目到達、保存、リロード復元）。
  - 公開リポジトリの全ファイル一覧が PUBLISH_MANIFEST と一致する。
受入条件:
  - 公開リポジトリの履歴に原資料 PDF が 1 コミットも存在しない。
  - 公開リポジトリと Pages 配信物に、内部発注文書・docs/・実利用データ・
    秘密情報・ローカル絶対パスが含まれない。
  - 公開名義とコミット author に個人 SNS 名が含まれない。
  - Pages URL で `?from=10&to=20` が動く。
  - ロールバック手順が書かれ、1 つ前のビルドへ戻せる。
ロールバック:
  - Pages を無効化し、公開リポジトリを private に戻す。
  - 配信物に問題があった場合は、1 つ前のタグのビルドを再デプロイする。
  - データ生成に問題があった場合は、`dataVersion` を戻して再生成する
    （利用者端末の履歴は dataVersion に依存しないため失われない）。
停止条件: S-12（移管時に秘密情報・内部資料・未許可原資料・実利用データが
          履歴や配布物に残る）。
概算規模: 中（3〜5 日）
```

---

## 11. 受入条件のたどり（APP_SPEC §15 との対応）

`APP_SPEC` §15 の 12 項目と憲章 §10 の 8 項目が、どのフェーズで満たされるか。

| APP_SPEC §15 | 内容 | 満たすフェーズ | 検証手段 |
|---|---|---|---|
| 1 | 文書と画面文言の一致、公開名に内部名を含まない | P1, P11, P12 | grep 型否定＋目視 |
| 2 | 100 首の参照整合と正本／派生の不一致検出 | P2 | V-01〜V-14（CI） |
| 3 | 範囲 URL と 20 首分割 | P6 | unit（range） |
| 4 | 5 入口・番号順/ランダム・縦横・読み 3 表示 | P7 | screen |
| 5 | 穴埋め 3 単位・人確認済み候補・作者 3 形式 | P6 | unit ＋ data |
| 6 | ○△・全問花丸・結果・任意再確認・番/首/問の区別 | P8 | screen |
| 7 | 習熟度のイベント表・上限・ヒント・減点・同一回半分・90 超 | P5 | unit（7 suite） |
| 8 | 逐次保存・書き出し・重複排除マージ・初期化確認 | P4 | unit（storage） |
| 9 | 統計案内・無作為番号・正式/テスト区分・集計精度・送信失敗時の学習継続 | P9 | unit ＋ rules |
| 10 | 報告のローカル保存・送信・管理者確認・公開除外 | P9, P10 | unit ＋ publish-exclusion |
| 11 | 4 幅・3 実機・キーボード・読み上げ・200% 拡大 | P3, P11 | overflow:check ＋ 実機 |
| 12 | 公開物に秘密情報・実利用データ・未許可原資料・内部資料がない | P0, P10, P12 | scan:publish |

| 憲章 §10 | 満たすフェーズ |
|---|---|
| 100 首の参照整合 | P2 |
| 正本と生成 JSON の不一致検出 | P2 |
| 範囲 URL・履歴・統合・初期化 | P4, P6 |
| 縦書きの可読性と横書き切替 | P3, P7 |
| 匿名統計と正式・テスト区分 | P9 |
| 公開物の清浄性 | P0, P12 |
| 文書と画面文言の一致 | P11 |
| 既知の制約を隠さない | P11 |

---

## 12. リスクベースのテスト計画

### 12.1 基本方針

**テストは「失敗したときに何を失うか」で選ぶ。件数は目標にしない。**

実行順は常に「変更箇所の静的検査 → 対象 unit → 代表画面 → 関連回帰」とする。小さな文言・色・余白の変更で、無関係な全 suite を毎回回さない。

反対に、次の 6 領域は**自動テストなしで変更しない**（憲章 §9）。

1. 正本変換（`tools/build-data`）
2. 習熟度計算（`domain/mastery`）
3. 履歴統合（`storage/merge`, `storage/import`）
4. 削除・初期化（`storage/reset`）
5. Firebase payload と送信（`telemetry/`）
6. Firestore Rules（`firebase/firestore.rules`）

### 12.2 変更の種類ごとの必須検証

| 変更 | 必須検証 | 回さないもの |
|---|---|---|
| 文言・色・余白 | typecheck / lint、該当画面の 4 幅スモーク、キーボード確認 | データ変換、習熟度、統計、Rules |
| 表示・部品 | 上記＋ screen suite の該当ファイル、読み上げ順の確認 | データ変換、Rules |
| 出題生成・選題 | 上記＋ `unit/range`, `unit/order`, `unit/question`, `data/questions` | storage、telemetry |
| 正本変換・生成スキーマ | `data:check` 全件（V-01〜V-14）、再現性、100 首の参照整合、差分レポート | screen、telemetry |
| 習熟度・規則版 | `unit/mastery` 7 suite 全件、再計算、`unit/recommend` | data、telemetry |
| 履歴・統合・削除 | `unit/storage` 全件、DB migration、重複、リロード、初期化、export/import | data、telemetry |
| Firebase payload / 送信 / Rules | `unit/telemetry` 全件、`allowlist-parity`、`tests/rules` 全件、privacy invariant、test/official 分離、失敗・再試行・TTL | data、screen |
| リリース | 全 suite ＋ production build ＋ 秘密情報 scan ＋ `overflow:check` 全 100 首 ＋ 3 実機一巡 | — |

### 12.3 suite の分け方

原因領域が分かるように分割し、巨大な 1 枚テストへ集約しない。

```text
tests/unit/mastery/    increments / caps / decrements / same-session /
                       hint-downgrade / over-90 / recompute
tests/unit/storage/    db / merge / import / export / reset / fallback
tests/unit/telemetry/  registry / sanitize / queue / client-number / allowlist-parity
tests/unit/            range / order / question / recommend / session-flow / app-config
tests/data/            parse / validate / reproducibility / variants-fixture / questions
tests/screen/          components / vertical / session / result / history
tests/rules/           stats / reports
```

開発中は名前で絞って走らせる。全件は公開直前に 1 度だけ回す。

### 12.4 重点シナリオ

自動テストと手動確認の両方で必ず通す。

| # | シナリオ | 守るもの |
|---|---|---|
| R-01 | 回答直後にリロード | 記録の消失防止 |
| R-02 | ブラウザ再起動後に再開 | 同上 |
| R-03 | IndexedDB の dbVersion upgrade | 履歴の移行 |
| R-04 | ストレージ容量不足の例外 | 回答を失わせない |
| R-05 | 同一エクスポートを 2 回インポート | 二重加算の防止 |
| R-06 | 異なる 2 端末のエクスポートを相互にインポート（両方向） | マージの収束 |
| R-07 | オフラインで一巡を完走 | 学習の継続 |
| R-08 | Firebase 到達不能で一巡を完走 | 送信失敗が学習を妨げない |
| R-09 | 端末時刻を翌日にずらして 90 超の別日想起 | 別日条件の判定 |
| R-10 | 「次へ」の二重タップ | 二重加算・二重遷移の防止 |
| R-11 | 学習中に URL のクエリだけを変更 | 現在の回が変わらない |
| R-12 | 範囲に無効値（0 / 101 / 小数 / 文字列 / 空） | 安全な 1〜100 への復帰と確定文の表示 |
| R-13 | 読みの status が review の首を出題 | 正解の自動断定を避ける |
| R-14 | 候補数が不足する作者問 | 水増しせず別形式へ切替 |

### 12.5 grep 型の否定アサーション（経路そのものを禁止する）

「弾く」より「書かない」ほうが強い。次を CI の静的検査に置く。

| 対象 | 禁止するもの |
|---|---|
| `src/telemetry/` | `textContent` / `innerHTML` / `getAttribute` / `Date.now` / `toISOString` / `getTimezoneOffset` |
| `src/ui/` | 仮称の文字列リテラル（`app-config.ts` 経由のみ許可） |
| `src/`（tokens.css 以外） | 生の色値（`#` 記法 / `rgb(` / `oklch(` の直書き） |
| `src/ui/screens/Result.tsx`, `History.tsx` | 「順位」「偏差値」「連続」「ランキング」「あなたの能力」 |
| `tools/build-data/` | 正本パスを書き込みモードで開く API |
| `dist/`（ビルド後） | `review-page` 由来の識別子、内部資料のファイル名 |

### 12.6 テストで守らない（守れない）ことの明示

Rules は map 内の各値の型を走査できない。したがって `stats_days` の集計値 map の各値が整数であることはルールでは保証できない。**create のみ許可・update/delete 不可**にすることで、被害を「他人が偽の 1 日ぶんを追加できる」に留め、既存データの改ざん・巻き戻しは不可能にする。この限界は `firestore.rules` にコメントとして残し、管理画面の集計に「外れ値の目視確認」を運用手順として置く。

同様に、Rules では時間ベースのレート制限を書けない。App Check とドキュメント ID の一意性（1 利用番号 × 1 日 = 1 ドキュメント）で代替する。

---

## 13. 実機・アクセシビリティ確認計画

### 13.1 必須確認表

| 環境 | 確認する導線 | 重点 |
|---|---|---|
| iOS Safari（実機スマホ） | 5 入口の一巡、範囲 URL、保存、書き出し／読み込み、報告 | 縦書きの列送り、句読点と行末、ファイル選択、キーボード表示時のレイアウト |
| Android Chrome（実機スマホ） | 同上 | 縦書き、戻る操作、IME の変換確定と Enter の競合 |
| iPad Safari | 同上＋向き変更 | 縦書きの列数変化、分割表示、200% 拡大 |
| デスクトップ Chrome / Firefox | 同上＋キーボードのみ操作 | フォーカス順、可視フォーカス、Enter で次へ |
| スクリーンリーダー（VoiceOver / TalkBack） | 一問の読み上げ | 本文の読み順、空欄の代替テキスト、正誤の aria-live、二重読み上げがないこと |

### 13.2 幅ごとの確認

320 / 375 / 414 / 768px で、Home / RangePicker / Session（3 読み表示 × 縦横） / Result / History / Transfer / Settings / Guide / ErrorScreen を確認する。

- ルートに横スクロールを発生させない。`overflow-x: hidden` で隠して解決しない。
- 主要ボタン・タブ・CTA が 1 行のまま。長い文言は短くする。
- タップ領域 44px 以上。アイコンだけの操作にも視認できる名前を付ける。
- 長い見出しに `min-width: 0; overflow-wrap: anywhere;`。
- 画面幅が狭いときに設定パネルを折りたたみ、歌本文の読みやすさを削らない。

### 13.3 100 首のあふれ確認手順

1. `npm run overflow:check` を 4 幅 × 100 首 × 読み 3 表示で実行し、候補を機械抽出する。
2. まず §2.2 の代表セット（44, 52, 53, 57, 59, 70, 76）を実機で確認する。
3. 機械が挙げた候補を実機で確認し、`DESIGN_SYSTEM` の段階（余白 → 一段小さく → 人確認済み改行）で決める。
4. 決めた改行位置を `review/layout.yaml` に確認者・確認日・確認端末つきで記録する。
5. `npm run data:build` で `layout-hints.json` に反映し、再度あふれ検査を回す。
6. 未確認のまま残る首がゼロになるまで繰り返す。ゼロにならない場合は停止条件 S-6。

### 13.4 アクセシビリティの受入項目

| 項目 | 判定 |
|---|---|
| `lang="ja"`、見出しレベル、ラベルと入力の関連 | 目視＋自動 |
| キーボードのみで 5 入口すべてを完走できる | 手動 |
| 可視フォーカスが全操作部品にある。リング出現をアニメーションしない | 目視 |
| 200% 拡大で操作不能・文字切れがない | 手動 |
| 読み上げ順が本文の自然な順序（初句〜五句）になる | 手動 |
| 縦書き用と読み上げ用のテキストが重複していない | 手動＋ screen test |
| `prefers-reduced-motion: reduce` で動きが止まる | 手動 |
| 正誤・保存状態・範囲エラーが `aria-live` で通知される | 手動 |
| 色を無効にしても正誤と習熟度が分かる（記号・文言・％） | 目視 |
| ドラッグ・音声・手書き認識が必須になっていない | 手動 |
| 本文 4.5:1、UI 境界・大きな文字 3:1 のコントラスト | 自動＋目視 |
| 自由入力にラベル・入力例・エラー位置がある | 目視 |

### 13.5 PWA の扱い

初回公開では完全な PWA 化を必須にしない（`APP_SPEC` §13）。ただし「一度取得した範囲と画面は可能な範囲でキャッシュする」ため、静的資産に `?v=` 形式の配信番号を付け、`index.html` と版数表テストで一致を強制する（`shukudai-kanri` の実績パターン）。配信番号と公開版番号は別物として扱い、公開版番号は指示があるまで上げない。

---

## 14. 公開・移管・ロールバック計画

### 14.1 移管の原則

**現リポジトリの履歴を公開しない。** §2.3 のとおり、コミット `d001ce5` に再配布許可を確認していない原資料 PDF 3 点が含まれる。憲章 §4 は Git 履歴・raw URL・配布物を「公開」に含めている。

したがって P12 は次の方式を採る。

- 新しい GitHub アカウントに**空のリポジトリを作り、`git init` から始める**。
- 現リポジトリに remote を足さない。`git push` で移さない。
- `git filter-repo` での履歴書き換えも採らない（書き換え後も参照が残る経路、fork、キャッシュの問題があり、新規履歴のほうが確実に安全）。
- 移す対象は `docs/PUBLISH_MANIFEST.md` の**許可リスト**で決める。除外リストにしない。

### 14.2 移す／移さないの一覧

| 移す | 移さない |
|---|---|
| `app/` 一式（`tools/review-page/` を除く） | `USB-*.pdf`（F-17） |
| 一次データ Markdown 5 点 | `docs/` 一式（本書・発注書・仕様・監査・叩き台） |
| `LICENSE` / `LICENSE-CONTENT.md` / `NOTICE` | `古典関係アプリ_設計計画書_2026-08-29.md` |
| `assets/feedback/*.png` ＋ その README | `docs/HANDOFF.md` / `docs/RELEASE_CHECK.md` / `docs/MIGRATION_LOG.md` |
| `review/*.yaml`（判断の根拠） | `app/tools/review-page/`（管理確認ページ） |
| 公開用に書き直した `README.md` | 実利用データ・未集計報告・バックアップ |
| `firebase/firestore.rules`（実値なし） | サービスアカウント鍵・管理者認証情報・API 秘密鍵 |
| 第三者ライセンス一覧（`THIRD_PARTY_NOTICES.md`） | ローカル絶対パス（利用者名を含む） |

### 14.3 ライセンス表示

- コード: Apache-2.0（`LICENSE`）
- 独自の文書・派生データ・画像: CC BY 4.0（`LICENSE-CONTENT.md`）
- フォント: 元ライセンス（`public/fonts/` に各ライセンスファイルを同梱し、`THIRD_PARTY_NOTICES.md` に列挙）
- `assets/feedback/` の 3 点: 権利表示は P0 の `LICENSE_AUDIT.md` の確認結果に従う（人間確認 H-02）
- 小倉百人一首の原典本文はパブリックドメイン。校訂・注釈・構造化した独自部分と区別して `NOTICE` に書く。
- 原資料 PDF: 公開対象外。README にも所在を書かない。

### 14.4 公開名義

`koten contributors`（または確定した正式名）に統一する。コミットの author 名・メールに個人 SNS 名を残さない。新リポジトリでの最初のコミット前に `git config user.name` / `user.email` を設定する（H-09）。

### 14.5 GitHub Actions と Secrets

| ワークフロー | 内容 |
|---|---|
| `ci.yml` | typecheck / lint / unit / data:check / scan:publish。PR と push で実行 |
| `deploy-pages.yml` | `main` への push で build → Pages。base path を環境変数で渡す |

Secrets には **Firebase の公開 Web 設定のみ**を置く。サービスアカウント鍵・管理者認証情報・トークンを置かない。Firestore Rules のデプロイは手作業とし、デプロイ後に `tests/rules` を実サーバー相当で再確認する。

### 14.6 ロールバック

| 事象 | 戻し方 |
|---|---|
| 配信物の不具合 | 1 つ前のタグのビルドを再デプロイする |
| データ生成の誤り | `dataVersion` を戻して再生成する。利用者端末の履歴は `dataVersion` に依存しないため失われない |
| 習熟度規則の誤り | `masteryRulesVersion` を戻す。イベントは残っているため再計算で復元できる |
| 統計の誤送信 | `app-config.ts` の Firebase 使用フラグを false にして再デプロイする。学習機能は影響を受けない |
| 秘密情報の混入が発覚 | 公開リポジトリを直ちに private にし、該当の資格情報を失効させる。履歴からの削除だけで済ませない |
| DB スキーマの誤り | **`dbVersion` を下げない**（既存端末が壊れる）。新しい `dbVersion` で前方修正する |

`docs/ROLLBACK.md` にこの表と、各手順の具体的なコマンド・所要時間・影響範囲を書く。

---

## 15. 人間確認が必要な並行作業

実装と並行して人が判断する項目。**すべて一次資料を書き換えず、確認状態と根拠を持つ派生データ（`review/*.yaml`）として管理する。**

| # | 内容 | 必要になるフェーズ | 状態 |
|---|---|---|---|
| H-01 | `origin` の扱い | P0（着手前） | **完了（2026-08-30）。対応不要。** 非公開リポジトリと確認。今後も非公開のまま Codex 共有用として使い続ける。削除も履歴書き換えも行わない。§2.3.1 |
| H-02 | フォント（Zen Maru Gothic / Klee One）と `assets/feedback/` 3 点の再配布条件を確認する | P0 | 未着手。遅れると P3 が止まる（S-2） |
| H-03 | 縦書きの改行候補と 100 首の実機表示を確認し、`review/layout.yaml` を確定させる。**76 番・91 番の作者名の 2 列分割位置を含む** | P3 | 未着手。P3 の受入と P11 |
| H-04 | 出題機構の妥当性確認（穴埋め候補・読みの確認状態）。§15.1 参照 | P2, P6 | 方針確定（2026-08-30）。個別全件承認ではなく機構確認が主目的 |
| H-05 | 作者名の異形・別称・有職読みの正答範囲を決める。Firebase プロジェクト作成・予算アラート・App Check 登録 | P6, P9 | 未着手 |
| H-06 | 習熟度係数・色境界・おすすめ順の試験運用（依頼者自身の利用で確認する） | P5, P8 | 未着手。公開判定に必要 |
| H-07 | `百人一首_読み_異同確認.md` の「現行転記」欄が古い件（§2.1）を、文書として直すかどうか判断する | 任意 | 保留可（データは正しい） |
| H-08 | iOS Safari / Android Chrome / iPad Safari の実機一巡 | P11 | 未着手。公開判定（S-6） |
| H-09 | 新 GitHub アカウントの作成、所有権・Pages・Actions・Secrets の確認、公開名義の確定 | P12 | 未着手 |
| H-10 | 正式名称の決定（仮称「古典学習帳」からの差し替え） | P12 | 未着手 |

### 15.1 H-04 の位置づけ（2026-08-30 裁定）

依頼者の裁定により、H-04 の目的は**「出題機構に不備がないかの確認」**であり、候補を 1 件ずつ承認していく作業ではないと確定した。根拠は、一次資料（本文・作者・読み・異同）の確認がすでに済んでいることである。

実装上の扱い:

- **句単位の穴埋め**は、正本の五句分割（PDF のスペース区切り）にそのまま一致するため、新規の境界判断が発生しない。機構の妥当性を確認できれば `human-confirmed` として扱ってよい。
- **単語・文節単位**と**助詞を含む候補**は、`APP_SPEC` §7.1 が「問ごとに人が確認し、`reviewStatus`・確認者・根拠メモを保存する」と定めている。この条文自体は変わらない。したがって、`review/blanks.yaml` に確認記録を持つ形式は維持し、確認の**進め方**を「代表サンプルで機構を確認 → 機構が妥当なら残りを一括承認し、承認者・承認日・承認根拠（機構確認結果への参照）を記録」とする。全件を目視する運用にはしない。
- この運用では、`reviewStatus: "human-confirmed"` の意味が「1 件ずつ目視した」から「妥当性を確認した機構が生成し、人が一括承認した」に変わる。**`review/blanks.yaml` の各項目に `confirmationMode: "individual" | "batch"` を持たせ、どちらで承認したかをデータ上区別する。** 一括承認の項目には、根拠となった機構確認の記録への参照を必須にする。
- 生成 AI が下書きした候補（`proposedBy: "ai"`）は、一括承認の対象にしてよいが、`confirmationMode: "batch"` と AI 由来であることの両方が残る。F-07（生成 AI だけで公開問題を確定しない）は、人が機構を確認して一括承認する行為で満たす。

**この運用は `APP_SPEC` §7.1 の文言（「問ごとに人が確認」）を、機構単位の確認で代替する解釈である。** 依頼者の裁定として記録するが、公開前（P11）に `APP_SPEC` の該当箇所を実運用に合わせて更新するか、現行文言のままとするかを一度確認する（H-11 として下に追加）。

| # | 内容 | 必要になるフェーズ | 状態 |
|---|---|---|---|
| H-11 | `APP_SPEC` §7.1 の「問ごとに人が確認」を、§15.1 の一括承認運用に合わせて更新するかを決める | P11 | 未着手 |

### 15.2 助動詞機能の範囲（2026-08-30 裁定）

依頼者の裁定により、後続段階の助動詞機能は**「百人一首の本文中から助動詞を抜き出す」**機能であり、桐原書店『新しい古典文法 四訂新版』の例文・設問を収録するものではないと確定した。

- したがって**例文の利用許諾は不要**である。
- `古典文法_一次データ索引.md` が記録している助動詞の**意味・接続・活用型といった文法事実**は、判定規則として参照してよい。事実そのものに著作権は及ばない。
- ただし、原表の**分類の表現・語順・レイアウトをそのまま転記**すると、編集著作物としての表現を複製することになり得る。判定規則はアプリ側の言葉で再構成し、`sourceRef` として書誌情報とページのみを記録する。
- 助動詞の判定（`なり`・`たり`・`る`・`れ` が助動詞か活用語尾か等）は、`古典文法_一次データ索引.md` の「確認上の注意」のとおり単独表記では決まらない。**百人一首本文への適用結果は人確認済みの派生データとして持ち**、未確認のものを正解にしない（F-06 と同じ扱い）。

初回公開の範囲外であることは変わらない。P12 以降で扱う。

---

## 16. 未解決リスクと停止条件

### 16.1 停止条件

次のいずれかが起きたら実装を進めず、事実・影響・代替案・暫定回避策を記録して裁定を求める。**計画上の回避策だけで処理しない。**

| # | 停止条件 | 該当フェーズ |
|---|---|---|
| ~~S-1~~ | ~~`origin` が公開設定で、許可未確認の原資料 PDF が配信されている~~ **不発動（2026-08-30）。`origin` は非公開と確認。配信の事実はない。§2.3.1** | ~~P0~~ |
| S-1' | 現リポジトリが public 化される、public アカウントへ transfer される、または fork が公開される | 全般 |
| S-2 | フォントまたは feedback 画像の再配布条件が確認できない | P0, P3 |
| S-3 | 正本と原資料・異同記録の不一致を、根拠なしに一方へ潰す必要が生じた | P2 |
| S-4 | 100 首の番・本文・作者・読みの参照整合が取れない | P2 |
| S-5 | Firebase の実測が §7.7 の警告基準（1 日 2,000 書込）を 2 日続けて超えた | P9 |
| S-6 | 主要実機・320px・キーボード・読み上げで操作不能が残る | P3, P7, P11 |
| S-7 | IndexedDB 移行で既存履歴の消失・重複加算・復元不能が疑われる | P4 |
| S-8 | 人確認のない助詞境界・句切れ・別名を、正解または「確定」として公開する必要が生じた | P6 |
| S-9 | 統計 payload が個人特定・自由入力・個別の問題別履歴・正確な時刻・端末固有 ID につながる、または匿名区分が検証できない | P9 |
| S-10 | Firestore Rules・認証・TTL・test/official 境界をテストで再現できない | P9 |
| S-11 | 憲章 §10 の公開判定 8 項目のいずれかを満たせない | P11 |
| S-12 | 移管時に秘密情報・内部資料・未許可原資料・実利用データが履歴や配布物に残る | P12 |
| S-13 | 依存パッケージ・Pages・Firebase のライセンス・設定・費用・利用規約が確認できない | 全般 |
| S-14 | 重大な仕様変更が初回公開を遅らせるのに、段階実装または安全な縮小案がない | 全般 |

### 16.2 停止条件に至らない残存リスク

| リスク | 影響 | 現時点の扱い |
|---|---|---|
| 縦書きの実機差（iOS/Android で列送り・句読点位置が異なる） | 一部の首で読みにくい | P3 で代表セット先行検査 → P11 で実機確認。`layout.yaml` で首ごとに対処 |
| 作者名 27 字（76 番）・23 字（91 番）の縦書き表示 | この 2 首だけ 1 列に収まらない | 本文と同じ扱いとし、人確認済み改行候補で 2 列に割る（§2.2）。他の 98 首は縦書き 1 列で収まる |
| 一括承認（`confirmationMode: "batch"`）の妥当性 | 生成機構に系統的な誤りがあると、誤った候補が一括で公開出題に入る | 代表サンプルの選び方と確認内容を `batchEvidenceRef` に残す。公開後は問題報告（P9）で検出し、`review/blanks.yaml` を `rejected` にすれば即座に出題から外れる |
| IME の変換確定 Enter と「次へ」の Enter の競合 | Android で誤って次問へ進む | P7 で `isComposing` を見る。R-10 の重点シナリオに含める |
| 習熟度係数が実運用で不自然に動く | 学習体験の劣化 | H-06 の試験運用。`masteryRulesVersion` で差し替え可能にしてある |
| 匿名利用番号が「継続」するため、`shukudai-kanri` より追跡可能性が上がる | プライバシー上の懸念 | 憲章 §6 の要求。番号を他の識別子と結合せず、実人数と表示しない。allowlist とサニタイズで補う |
| Firestore Rules が map 内の値の型を検査できない | 偽の集計値を 1 日ぶん追加され得る | §12.6 のとおり create のみ許可で被害を限定し、管理画面で外れ値を目視確認 |
| 生成 AI が下書きした穴埋め候補が大量に `hold` のまま残る | 出題の偏り | `manifest.reviewCounts` で可視化し、確認済みの範囲だけで出題する |

---

## 17. 最初の実装 PR で行う範囲

**最初の PR は P0 と P1 のみとする。** データもUI も入れない。

理由: P0 が終わるまで、以後どのファイルを作っても「公開してよいものかどうか」を機械的に判定できない。とくに H-01 の結果によっては、リポジトリの扱い自体が変わる。

### 含めるもの

1. `.gitignore` / `.gitattributes`
2. `docs/PUBLISH_MANIFEST.md`（許可リスト形式）
3. `docs/ADR/0001-frontend-stack.md` / `0002-data-pipeline.md` / `0003-publish-boundary.md`
4. `docs/LICENSE_AUDIT.md`
5. `docs/HANDOFF.md` を追跡対象として commit する（作成済み）
6. `app/` の骨格: `package.json` / `tsconfig` / `vite.config.ts` / `vitest.config.ts` / `eslint.config.js` / `index.html` / `public/404.html`
7. `app/src/app-config.ts`（仮称・各種版・機能フラグをすべて false で）
8. `app/src/main.tsx` / `Home.tsx`（第一操作＝「とりあえず始める」。押しても未実装の案内を出すだけ） / `ErrorScreen.tsx`
9. `app/tools/scan-publish/index.ts`（初版）
10. `app/.github/workflows/ci.yml`
11. `app/tests/unit/app-config.test.ts`（機能フラグが全 false、仮称が 1 箇所であること）

### 含めないもの

- 一次資料の変換（P2）
- デザイントークンとフォント（P3。P1 では最小の素の CSS のみ）
- IndexedDB（P4）
- 習熟度（P5）
- 出題（P6）
- Firebase（P9）
- 公開リポジトリへの push（P12）

### この PR の受入条件

- `npm run build` が通り、サブパス配信でリロードしても 404 にならない。
- CI が typecheck / lint / unit / scan:publish を実行して緑になる。
- 320 / 375 / 414 / 768px で Home に横あふれがなく、可視フォーカスがあり、操作領域が 44px 以上。
- 仮称を `app-config.ts` の 1 箇所で変えると表示が変わる。
- `PUBLISH_MANIFEST.md` に、原資料 PDF・`docs/`・旧設計書が含まれていない。

### この PR の前に人がやること

- **H-01: `github.com/moyashimisosoup/koten` が public か private かを確認する。** public であれば、この PR の前に S-1 の裁定が要る。

---

## 付録: 裁定が必要な事項

発注書 §10 の形式に従う。5 件。うち **D-03 と D-05 は 2026-08-30 に裁定済み**、**D-01・D-02・D-04 が未決**である。

| 番号 | 論点 | 状態 |
|---|---|---|
| D-01 | 習熟度の粒度（首単位 / 首 × 学習項目） | **未決**。P5 が止まる |
| D-02 | 統計・報告の受け口（Firestore 直書き / Functions / 混合） | **未決**。P9 が止まる |
| D-03 | 公開移管の方式 | **裁定済み**。新規履歴。現リポジトリは非公開のまま存続させる |
| D-04 | 本文用書体（Klee One / 比較候補） | **未決**。P3 が止まる |
| D-05 | 穴埋め候補の人確認スコープ | **裁定済み**。機構確認を主目的とする。§15.1 |

```text
裁定番号: D-01
論点: 習熟度の粒度を「首単位」に留めるか、「首 × 学習項目（itemKey）」まで分けるか。
判明した事実:
  - APP_SPEC §8 は「習熟度は首単位の内部指標」と定め、§8.1 の上限表も
    「そのイベントによる首の習熟度上限」と書いている。
  - LEARNING_SCIENCE_AUDIT の「未確定で、実装前に固定すべき点」1 は、
    `歌 × 学習項目` を独立した履歴単位にし、歌全体の正解を作者や助動詞の
    正解に流用しないことを求めている。
  - 両文書は矛盾していないが、どちらの粒度で「％を表示し、5 色を塗るか」が
    決まっていない。
  - 本文の実測では、作者名の長さと本文の長さが大きく違う（§2.2）。
    本文は言えるが作者が出てこない、という状態は実際に起こりやすい。
利用者への影響:
  - 首単位のみ: 画面が簡潔になる。ただし「本文は言えるのに緑にならない」理由が
    分かりにくい。
  - itemKey 単位も表示: 何を確認すべきかが具体的になる。ただし 1 首に 6 個の
    メーターが並び、主要画面の判断が増える（憲章 §7 に反する方向）。
推奨案:
  イベントは常に itemKey を持って記録する。表示・上限・5 色は首単位とし、
  APP_SPEC §8.1 の上限表をそのまま首の値に適用する。おすすめと要確認一覧だけを
  itemKey 単位で選び、理由文で「作者をもう一度」のように具体的に示す。
代替案:
  (a) 完全に首単位（itemKey を記録しない）。監査の要求を満たさないため非推奨。
  (b) 首の値を itemKey 別スコアの平均にする。上限表の解釈が変わるため、
      APP_SPEC §8.1 の改訂が必要になる。
決めない場合に停止するフェーズ: P5（習熟度エンジン）。P4 のイベント形も待たされる。
```

```text
裁定番号: D-02
論点: 匿名統計と問題報告の受け口を、Firestore REST 直書きにするか、
      Cloud Functions を挟むか、混合にするか。
判明した事実:
  - DESIGN_AUDIT が「Opus が複数案を比較して裁定を求める」と指定している。
  - shukudai-kanri は Firestore REST 直書き（匿名 signUp → create →
    匿名アカウント delete の 3 往復）で稼働しており、Functions を持たない。
  - Firestore Rules は allowlist・型・正規表現・サイズ上限までは書けるが、
    時間ベースのレート制限と自由記述の内容検証は書けない。
  - APP_SPEC §12 は問題報告に「任意の短い注記」を認めている。
    発注書 §6.5 は、注記を統計 payload へ混ぜず別経路にすると定めている。
  - F-04 は無料枠内を運用目標としている。Functions は Blaze で従量課金が乗る。
利用者への影響:
  - 直書きのみ: 無料枠に収まりやすい。注記の内容検証をクライアントだけで行うため、
    不適切な内容がそのまま保存され得る。
  - Functions のみ: 検証は強いが、無料枠を外れる可能性がある。
  - 混合: 注記なし報告と統計は直書き、注記付き報告だけ Functions。
    構成が 2 系統になり、テストとルールが増える。
推奨案:
  混合。統計と注記なし報告は Firestore REST 直書き ＋ App Check。
  注記付き報告のみ Cloud Functions 経由で、長さ上限・文字種・レート制限を
  サーバー側で検証する。
代替案:
  (a) 直書きのみとし、初回公開では注記欄をローカル保持だけにして送信しない
      （送るのは問題識別子とカテゴリのみ）。無料枠と実装量を最小にできる。
      APP_SPEC §12 の「任意の短い注記を加えられる」はローカルで満たす。
  (b) Functions のみ。費用の実測が必要。
決めない場合に停止するフェーズ: P9（匿名統計と問題報告）。P10 の管理者集計も待つ。
```

```text
裁定番号: D-03
論点: 公開リポジトリへの移管方式。新規履歴で作り直すか、現履歴を書き換えるか。
判明した事実:
  - 現リポジトリの remote は github.com/moyashimisosoup/koten である。
  - コミット d001ce5 に、再配布許可を確認していない原資料 PDF 3 点
    （約 5.2 MB、桐原書店の教科書付録を含む）が入っている。
  - 憲章 §4 は「公開」に公開リポジトリ・Git 履歴・raw URL・配布物を含める。
  - 確定事項は「新しい GitHub アカウントの公開リポジトリと GitHub Pages を
    初期公開先とする」であり、現リポジトリを公開するとは定めていない。
  - このリポジトリが現在 public か private かは未確認（人間確認 H-01）。
利用者への影響:
  直接の影響はない。ただし権利者との関係と、憲章の公開判定に直結する。
推奨案:
  新しいアカウントに空のリポジトリを作り、`git init` から始める。
  現リポジトリに remote を足さず、push もしない。
  移す対象は PUBLISH_MANIFEST の許可リストで決め、コピー後に scan:publish で
  0 件を確認する。現リポジトリは非公開の作業用として残す。
代替案:
  (a) `git filter-repo` で PDF を履歴から除去して push する。
      書き換え後も fork・キャッシュ・既存 clone に残る経路があり、
      新規履歴より安全性が低い。
  (b) 現リポジトリを private のまま作業用に使い続け、公開は新規履歴で行う
      （推奨案と同じ結論）。
決めない場合に停止するフェーズ: P12（公開移管）。

裁定（2026-08-30・依頼者）:
  推奨案（新規アカウント・新規履歴での移管）を採用する。
  加えて H-01 の確認により、現リポジトリ github.com/moyashimisosoup/koten は
  非公開であり、原資料 PDF の置き場と Codex との共有経路として今後も非公開のまま
  使い続けると確定した。したがって次を行わない。
    - リポジトリの削除
    - git filter-repo 等による履歴書き換えと force push
    - 作業ツリーからの原資料 PDF の削除
  理由: 非公開である限り憲章 §4 の「公開」に当たらず、履歴書き換えは Codex 側の
  クローンを壊すだけで実益がない。停止条件 S-1 は発動していなかった。
  代わりに、現リポジトリを public 化しない・public アカウントへ transfer しない
  ことを維持条件（S-1')とする。公開は P12 で別リポジトリ・新規履歴により行う。
```

```text
裁定番号: D-04
論点: 本文用書体を Klee One のままとするか、比較候補へ差し替えるか。
判明した事実:
  - DESIGN_SYSTEM は UI に Zen Maru Gothic 500/700、和歌本文に Klee One 600 を
    指定し、self-host WOFF2 を求めている。
  - 同時に「self-host・容量・縦書き品質に問題がある場合は、源柔ゴシック系と
    word リポジトリで採用済みのフォントを比較候補にする。見た目だけで差し替えない」
    としている。
  - 日本語フォントのサブセットなしの WOFF2 は 1 書体あたり数 MB 規模になり得る。
    Zen Maru Gothic は 2 ウェイト必要なため、合計が初回読込に効く。
  - 本文には旧字体・異体字（曾禰、躬恒、遍昭 等）と濁点付き仮名が含まれる。
    サブセット時に欠落すると本文が壊れる。
  - 本計画時点で実ファイルの容量・縦書き品質・サブセット後の字形は未測定である。
利用者への影響:
  読込が重いと、通信の遅い端末で本文表示が遅れる。字形が欠けると本文が読めない。
  フォールバック時に行送りが崩れると縦書きの列がずれる。
推奨案:
  P3 で、Klee One と比較候補（源柔ゴシック系、word リポジトリ採用済み書体）を
  実機で比較する。比較軸はライセンス、サブセット後の容量、iOS/Android の縦書き品質、
  濁点・旧字体の字形、フォールバック時の行送り。
  比較結果を ADR に記録してから採用を確定する。見た目だけで差し替えない。
代替案:
  (a) Klee One を確定として進め、容量が問題になったら段階読込にする。
  (b) 本文もシステムフォント（Hiragino Mincho / Noto Serif JP）にする。
      DESIGN_SYSTEM が「システムフォントだけの画面にはしない」としているため
      非推奨。
決めない場合に停止するフェーズ: P3（表示基盤）。フォント確定まで
  あふれ検査の数値が確定しない。
```

```text
裁定番号: D-05
論点: 初回公開時点で、穴埋め候補の人確認をどこまで済ませるか。
判明した事実:
  - APP_SPEC §7.1 は、穴埋めを単語・文節・句の 3 単位で作り、助詞を含む候補は
    問ごとに人が確認し reviewStatus・確認者・根拠メモを保存すると定めている。
  - 憲章と F-06 は、人確認されていない候補を公開出題に出さないと定めている。
  - 100 首 × 3 単位で、候補は数百件規模になる。実測では 1 首あたり五句、
    上の句 18 字までの本文があり、単語・文節の境界判断は 1 件ずつ必要である。
  - 初回公開範囲には「単語・文節・句の穴埋め候補」が含まれている。
  - 確定事項は「初回公開を優先し、機能は二段階以上に分ける」である。
利用者への影響:
  - 全件確認を待つ: 公開が数週間単位で遅れ得る。
  - 確認済みだけで公開: 首や単位によって出題が薄くなる。範囲を選んだのに
    穴埋めが出ない首が生じる。
推奨案:
  「句単位を全 100 首で先に確認する」を初回公開の必須条件とする。
  句の境界は正本の五句分割（PDF のスペース区切り）に一致するため、
  新規の境界判断がほぼ不要で、確認負荷が最も低い。
  単語・文節は確認済みの分だけ出題し、未確認の首では句単位へ自動的に切り替える。
  未確認件数を manifest.reviewCounts で可視化し、公開後に段階的に増やす。
代替案:
  (a) 3 単位すべてを全 100 首で確認してから公開する。確実だが遅い。
  (b) 初回公開は句単位のみとし、単語・文節を後続段階へ送る。
      APP_SPEC §15 の 5 番（3 単位の穴埋め）を満たさなくなるため、
      受入条件の改訂が要る。
決めない場合に停止するフェーズ: P6（出題生成と選題）。
  人確認の作業量が決まらないため、P6 以降の日程が引けない。

裁定（2026-08-30・依頼者）:
  一次資料（本文・作者・読み・異同）の確認が済んでいるため、人確認の目的は
  「出題機構に不備がないかの確認」であり、候補を 1 件ずつ承認する作業ではない。
  したがって推奨案・代替案のいずれとも異なる第 3 の案を採る。
  すなわち、句・単語・文節の 3 単位すべてを初回公開に含めたうえで、
  確認の進め方を「代表サンプルで機構を確認 → 機構が妥当なら残りを一括承認」とする。
  APP_SPEC §15 の 5 番（3 単位の穴埋め）は満たされ、受入条件の改訂は不要。
  実装上の扱いと、APP_SPEC §7.1 の文言との関係は §15.1 に記載した。
  残課題: reviewStatus に confirmationMode（individual / batch）を持たせること、
  および H-11（APP_SPEC §7.1 の文言を更新するか）。
```

---

## 完了報告

- **作成したファイル**: `docs/IMPLEMENTATION_PLAN.md`（本書）のみ。
- **調査した主要資料**: `CONSTITUTION.md`、`docs/APP_SPEC.md`、`docs/DESIGN_SYSTEM.md`、`docs/LEARNING_SCIENCE_AUDIT.md`、`docs/DESIGN_AUDIT.md`、`README.md`、`docs/OPUS_IMPLEMENTATION_PLAN.md`、百人一首の本文・作者／歴史的仮名遣い／現代仮名遣い／異同確認の 4 点、`古典文法_一次データ索引.md`、`古典関係アプリ_設計計画書_2026-08-29.md`、および `shukudai-kanri` の `AGENTS.md` / `PRODUCT_POLICY.md` / `metrics.js` / `firestore.rules` / `sync-regression.test.js`（読み取りのみ）。
- **初回公開までのフェーズ数**: 13（P0〜P12）。最初のフェーズは **P0 境界固定と公開衛生**（コードを書かない準備フェーズ）。
- **裁定が必要な件数**: 5 件（D-01〜D-05）。加えて人間確認 10 件（H-01〜H-10）。**H-01 は全作業に先行する。**
- **実装は開始していない。** アプリコード、設定ファイル、CI のいずれも作成していない。
- **一次資料を変更していない。** 百人一首・古典文法の Markdown 5 点、原資料 PDF 3 点、旧設計書、既存の仕様・監査・叩き台文書のいずれにも書き込んでいない。コミット・push も行っていない。
