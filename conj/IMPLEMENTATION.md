# `conj` 実装仕様メモ

更新: 2026-09-19

## 1. 二層ドリル

### 活用表ドリル

一次資料の活用表をそのまま学習対象にする。

実例が見つからない活用形も学習対象から削除しない。

### 実例ドリル

監査済みの歴史的用例だけを使う。

`exampleEnabled = false` のセルは活用表では出題できるが、実例ドリルには出さない。

代表例:
- `たし / 補助活用 / 連体形 / たかる`
  - paradigmVerified: true
  - corpusAttested: false
  - tableEnabled: true
  - exampleEnabled: false

## 2. 推奨データ構造

```js
{
  lemma: "たし",
  kind: "auxiliary",
  series: "補助活用",
  form: "連体形",
  canonicalSurface: "たかる",

  paradigmVerified: true,
  paradigmSource: "新しい古典文法 四訂新版 付録",

  corpusAttested: false,
  corpusCount: 0,
  exampleEnabled: false,
  tableEnabled: true,

  reviewStatus: "primary-source-verified",
  note: "CHJ全体および外部探索で確実な実例未確認"
}
```

## 3. 実例レコード

```js
{
  lemma: "べし",
  kind: "auxiliary",
  series: "補助活用",
  form: "連体形",

  normalizedKey: "べかる",
  target: "へかる",
  anchor: "...初花ともやいふへかるらん...",
  targetOccurrence: 0,

  source: {
    work: "金葉和歌集",
    era: "平安"
  },

  reviewStatus: "corpus-audited",
  note: "原文表記と正規化キーを分離"
}
```

## 4. キー・target・anchor

### normalizedKey

解析・検索・集計用の正規化形。

例:
- `べかる`
- `ざり`
- `まじかり`

### target

画面でハイライトする原文表記。

例:
- `へかる`
- `さり`
- `ましかり`

**原文表示をnormalizedKeyで上書きしない。**

### anchor

同じtargetが本文内に複数存在する場合、対象位置を一意にする短い原文断片。

監査済み180例ではanchor必須8例すべてについて、anchor内target数=1を確認済み。

## 5. 監査状態

推奨値:

- `raw`
- `ai-proposed`
- `corpus-audited`
- `primary-source-verified`
- `publishable`
- `publishable-with-note`

一次資料で活用セルを確認したことと、歴史的実例を確認したことは別フィールドで持つ。

## 6. corpusAttested と paradigmVerified を分離する

重要。

```js
{
  paradigmVerified: true,
  corpusAttested: false
}
```

という状態を正式に許容する。

これにより、`たかる` のようなセルを表から削除したり、人工例で穴埋めしたりせずに済む。

## 7. 形容動詞

UniDicでは学校文法の「形容動詞」をそのまま一語として扱わず、語幹を形状詞、語尾を助動詞として解析する場合がある。

そのためCHJ取得時の形態論構造と、アプリで表示する学校文法構造を分離する。

アプリ側は一次資料に合わせて:

### ナリ活用
- 未然: なら
- 連用: なり / に
- 終止: なり
- 連体: なる
- 已然: なれ
- 命令: なれ

### タリ活用
- 未然: たら
- 連用: たり / と
- 終止: たり
- 連体: たる
- 已然: たれ
- 命令: たれ

を正本表示とする。

## 8. 頻度と教材出題率

コーパス頻度と教材出題率を同一にしない。

例:
- ナリ活用 raw 4,644
- タリ活用 raw 46

実頻度だけで抽出するとタリ活用がほぼ消えるため、教材側では教育的補正を行う。ただし60:60のような過度な均等化もしない。

暫定として形容動詞120例をナリ96 / タリ24で検討する。

## 9. GitHubとDrive

GitHubには次だけを置く:
- 公開アプリ
- 軽量な正本データ
- 集計
- source ID
- 監査状態
- 引継ぎ・実装仕様

Driveに残す:
- CHJ raw CSV
- 大容量中間ファイル
- 監査用Excel
- 一次資料
- 詳細な作業ログ

## 10. 現行index.htmlへの接続

現時点では `conj/index.html` を壊さない。

次の段階で:
1. 既存データ構造を棚卸し
2. 新しい軽量JSONを並列ロード
3. 既存表示と差分比較
4. target / anchor表示を確認
5. 表ドリルと実例ドリルの出題源を分離
6. 問題なければ旧埋め込みデータから順次移行

## 11. 最低限のテスト

- 一次資料の活用表と表示が一致
- `たかる` は活用表には出るが、実例問題には出ない
- `べかる` の原文 `へかる` が正しくハイライトされる
- 同一target複数出現時にanchorで正しい位置を選ぶ
- ナリ活用の `なり` を連用形／終止形で誤分類しない
- 係り結び `こそ ... なれ` を命令形にしない
- CHJ raw本文をGitHub公開データへ混入させない

## 12. 形容動詞の二層データ配線

2026-09-19から、形容動詞は活用表と実例をファイル単位でも分離する。

### 活用表側
- `data/adjectival-noun-paradigms.json`
  - ナリ／タリの正規セル
  - `paradigmVerified`
  - `corpusAttested`
  - `exampleEnabled`
- `data/adjectival-noun-lemma-pool.json`
  - 表ドリルで提示できる監査済み語幹
  - 117語幹（ナリ94 / タリ23）
  - 活用セルの正本にはしない

### 実例側
- `data/adjectival-noun-example-index-120.json`
  - 120例の軽量メタデータ
  - `paradigmId / formIndex / track` で活用表セルを参照
  - CHJ本文・anchorは含めない
- Drive公開前監査シート
  - File ID: `1b-LU-wVx-hKinWEuMDlUqphAzfObYyw7xfKg8Ab4Ov8`
  - 本文断片・anchorを保持

### 回帰監査
- `data/adjectival-noun-integration-audit.json`
- 120 / 120が正規セルへ対応すること
- `exampleEnabled=false` のセルを実例が参照しないこと
- 120 / 120でtarget監査済みであること

### 現行index.htmlとの互換方針
現行 `items` は `lemma / forms / forms2 / target / example` を同一オブジェクトに持つ。
新データをこの形へ永久変換して戻すのではなく、次の順で移行する。

1. 表ドリル用ソースと実例用ソースを別ロード
2. 表示時だけ必要な互換ビューを組み立てる
3. 表ドリルは本文がなくても成立させる
4. 実例ドリルは `exampleEnabled=true` かつ公開可能本文のあるレコードだけ選ぶ
5. 旧 `items` を一括削除せず、品詞単位で段階移行する


