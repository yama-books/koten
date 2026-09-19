# 活用表アプリ 全体ロードマップ

更新: 2026-09-19

## 0. この文書の役割

このファイルを、長期作業の「現在地」と「次の安全な再開地点」を示す正本とする。

作業は必ずフェーズ単位で区切り、各フェーズ内も作品・データ群などの小単位でチェックポイントを作る。

### 記録ルール

各チェックポイント完了時に最低限、次を更新する。

1. `ROADMAP.md` の現在地
2. `PROGRESS_2026-09-19.md` の実施内容
3. 必要に応じて `HANDOFF.md` の再開地点
4. 機械可読な集計JSON
5. 主要データ変更後はruntime整合検査

取得障害・権利不明・底本差などで止まった項目は、推測で埋めず「保留理由」を記録して次へ進む。

---

## 1. 全体フェーズ

### Phase A. 文法正本・データ設計の固定
Status: **COMPLETE**

完了条件:
- 学校文法の正本を『新しい古典文法 四訂新版』付録に固定
- CHJ / UniDicを実例探索用に限定
- 活用表ドリルと実例ドリルを分離
- `paradigmVerified` と `corpusAttested` を分離
- `normalizedKey` / `target` / `anchor` の役割分離
- CHJ raw本文をGitHub公開しない方針を固定

成果物:
- `HANDOFF.md`
- `IMPLEMENTATION.md`
- `data/corpus-status.json`

---

### Phase B. 基礎コーパス選抜・監査
Status: **COMPLETE**

完了条件:
- 動詞 360例
- 形容詞 140例
- 助動詞第一陣 180例
- 形容動詞 120例
- target / anchor監査
- 希少セルの扱いを決定

主要到達点:
- 動詞360: 公開ブロッカー0
- 形容詞140
- 助動詞180: target/anchor監査済み
- 形容動詞120: raw再照合 120/120、target監査 120/120

---

### Phase C. 形容動詞二層runtime接続
Status: **COMPLETE**

完了条件:
- 活用表用paradigm JSON
- lemma pool
- 実例index
- runtime adapter
- main index接続
- fallback
- no-example guard
- smoke / integration audit

確認値:
- 語幹117
- main追加116
- 実例索引120
- runtime整合 PASS
- 助動詞「たし」誤セル `たかれ` 修正済み

---

### Phase D. 形容動詞の公開可能本文監査
Status: **IN PROGRESS**

目的:
CHJ本文を公開側へ複製せず、権利・底本・語形を確認できる公開本文から実例を再構成する。

4ゲート:
1. sourceFound
2. rightsVerified
3. targetVerified
4. excerptReviewed

全4ゲート通過前は `exampleEnabledPublic=false`。

#### D1. 作品単位監査
現在地: **16 / 21作品 監査status確定（publicationReady 11 / partial 4 / blocked 1）、59 / 120例 公開接続済み**

完了作品:
1. 竹取物語 4
2. 土佐日記 5
3. 徒然草 5
4. 古今和歌集 4
5. 伊勢物語 4
6. 蜻蛉日記 4
7. 今昔物語集 4
8. 大和物語 4
9. 平中物語 3
10. 宇治拾遺物語 6
11. 枕草子 2 / 6（partial）
12. 更級日記 4 / 5（partial）
13. 紫式部日記 5

保留:
- 方丈記: 5例中targetVerified 2。残り3は固定底本のページ取得障害により保留

次の作業順:
1. 源氏物語 5
2. 平治物語 7
3. 保元物語 10
4. 平家物語 16
5. 方丈記再訪
6. 十訓抄引用漢詩4例再訪（same-work witness方針）
7. 枕草子保留4例再訪（同一語形を保つ再利用可能版が得られた場合）
8. 更級日記保留1例再訪（同一箇所を含む再利用可能版が得られた場合）
9. 落窪物語再訪（検索可能な公開本文が得られた場合）

順番は「少数例・信頼できる公開ソースが見つかりやすい作品」を優先し、障害があれば次作品へ進む。

#### D2. Phase D 完了条件
- 21作品すべてについて、次のいずれかを確定
  - publicationReady
  - partial
  - blocked-with-reason
- 公開可能な全例を `adjectival-noun-public-examples.json` に反映
- source registry集計が実データと一致
- runtime validation errors = 0
- 未公開例の理由が追跡可能

注意:
「120例すべてを無理に公開する」ことは完了条件ではない。
公開可能性を確認できない例は、表ドリルのみで残す。

---

### Phase E. 公開実例runtime・UIの最終接続確認
Status: **PENDING**

開始条件:
- Phase Dの作品監査が一巡

作業:
- 公開実例がある語幹の表示確認
- 同一lemmaに複数公開実例がある場合の選択規則
- 出典・ライセンス表示
- targetハイライト
- publicTargetとCHJ targetの分離
- 公開実例なし語幹のno-example表示
- iOS / desktopブラウザ確認

完了条件:
- runtime validation PASS
- smoke PASS
- 主要画面で用例表示崩れなし
- 出典表示確認
- fallback確認

---

### Phase F. 助動詞180例の正本候補更新
Status: **PENDING**

作業:
- 一次資料確認結果を180例へ反映
- `たし` 補助活用:
  - `たかる` は表ドリル
  - `たかれ` は置かない
- `まじかる` 等の希少セル注記
- normalizedKey / target分離を維持

完了条件:
- 180例の学校文法セル再監査
- runtime投入用軽量JSON
- 公開ブロッカー0または理由記録

---

### Phase G. 形容動詞希少セル追加探索
Status: **PENDING / LOW PRIORITY**

対象:
- タリ活用 `たら`
- タリ活用 `たれ`
- ナリ活用特殊形 `な / なん / なっ`

原則:
- 実例が見つからなくても活用表から削除しない
- 人工例で埋めない

完了条件:
- 探索範囲と結果を記録
- corpusAttested状態を更新

---

### Phase H. 総合回帰・公開版確認
Status: **PENDING**

作業:
- 文法表の一次資料一致
- 動詞・形容詞・形容動詞・助動詞横断
- 表ドリル / 実例ドリル分離
- target / anchor / publicTarget
- 出典
- fallback
- mobile表示
- GitHub Pages

完了条件:
- 全自動検査PASS
- 主要実機スモークPASS
- HANDOFFを公開運用状態へ更新
- READMEの到達点を更新

---

## 2. 現在地

**Phase D / D1「公開可能本文の作品単位監査」**

現在:
- 16 / 21作品 監査status確定
- publicationReady: 11
- partial: 4（方丈記 / 十訓抄 / 枕草子 / 更級日記）
- blocked-with-reason: 1（落窪物語）
- 59 / 120例 公開実例接続
- 次: **源氏物語 5例**

---

## 3. 作品単位の標準チェックポイント

1作品について以下を1セットとする。

1. 対象例とlemma/form/trackを抽出
2. 公開本文ソースを決定
3. 底本・権利・ライセンス確認
4. target照合
5. excerpt監査
6. pilot JSON作成/更新
7. public examplesへ追加
8. source registry更新
9. PROGRESS更新
10. HANDOFF更新
11. runtime整合検査

この11項目完了を「1作品完了」とする。

---

## 4. 中断時の再開規則

中断した場合は最初に:
1. `ROADMAP.md`
2. `HANDOFF.md` 末尾
3. `PROGRESS_2026-09-19.md` 末尾
4. `data/public-text-source-registry.json`
5. `data/adjectival-noun-public-examples.json`

を確認する。

最後に完了した作品の次から再開し、途中作品についてはpilot JSONまたはPROGRESSに「未完了」と明示されている場合のみ続行する。

---

## 5. 次回チェックポイント

**Milestone D-16: 源氏物語5例**

完了時に:
- 公開実例総数
- 完了作品数
- registry集計
- runtime errors
をROADMAPに反映する。


## 6. 権利監査の効率化ルール

Phase Dでは、権利確認を実例単位で繰り返さない。

### 作品単位ゲート
`work + provider + edition` ごとに:
- sourceFound
- rightsVerified
- editionFixed

### 用例単位ゲート
各recordごとに:
- targetVerified
- publicTarget
- excerptReviewed

CHJ / 中納言収録済みであることは、公開候補探索の強い事前フィルターとして扱う。
ただしCHJ本文そのものの再配布権とは分けて管理する。

これにより、同じ作品の5例なら「権利調査5回」ではなく「権利調査1回＋語形監査5回」で処理する。
