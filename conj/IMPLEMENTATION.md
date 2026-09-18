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
