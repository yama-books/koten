# NINJAL公式字体 統合作業 指示書（2026-09-23）

宛先: ChatGPT Thinking 担当
発行: ローカル担当（Claude Code）
対象リポジトリ: `yama-books/koten`
対象ブランチ: `vintage-kana-main`

この文書は **データ側の統合だけ** を切り出したものです。
UI・出題ロジック・ブラウザ確認が必要な作業はローカル側に残してあります。

---

## 0. 絶対に守ること

- `main` へ直接 push しない。
- force-push しない。ブランチを削除しない。
- **`vintage-kana/index.html` の `<style>` ブロック（CSS）と、`FALLBACK_GLYPHS` 以外の JavaScript には一切触らない。**
  ローカル側が同じファイルの UI を並行して編集します。
  あなたが触ってよいのは `FALLBACK_GLYPHS` の配列の中身だけです。
- GitHub Pages への公開はしない。公開はローカル側が行います。
- 判断に迷ったら止めて報告してください。推測で別の箇所を変えないこと。

---

## 1. 背景と現状

変体仮名メーカーは、国立国語研究所（NINJAL）の「学術情報交換用変体仮名」を扱う学習アプリです。

公式カタログは **293行**（Unicodeあり 265 / なし 28）。
現在アプリが持っているのは **138字** だけです。

この138字は無作為抽出でも高頻度上位でもありません。
**15資料のいずれかに1回以上現れた字の全部**です（最小の観測回数は1、10件が1回のみ）。
つまり閾値ではなく「観測の有無」で切られています。

今回の作業は、ここに **Unicodeのある公式265字を全部入れる** ことです。

### 重要な前提（読み飛ばさないこと）

**観測0回を「使われていない」と扱ってはいけません。**
観測0回は「この15資料には出てこなかった」という意味にすぎず、
NINJAL公式一覧に掲載されていること自体が学術的な典拠です。

過去の監査文書には `observed === true` で生成・出題の母集団を絞る案が書かれていますが、
**この方針は採用しません**。ユーザー判断により却下されています。
除外はせず、頻度は「重み」としてのみ使います。

その重み付けは **すでにローカル側で実装・公開済み** です。
`index.html` の `autoWeight()` / `pickWeighted()` がそれで、
出現回数の平方根に下限（`AUTO_WEIGHT_FLOOR=2`）を足した値を重みにしています。
観測0回の字体も下限の重みで低頻度に出ます。**この関数群には触らないでください。**

実測（る・6字体）:

| 字体 | 観測 | 一様なら | 重み付き |
| --- | --- | --- | --- |
| U+1B0FB | 3848回 | 16.7% | 47.6% |
| U+1B0FA | 16回 | 16.7% | 4.5% |
| （観測0回） | 0回 | — | 1.46% |

265字にしても、この重み付けが効いているので生成文は資料の実態から大きく外れません。

### Unicode未付与28件について

**今回は扱いません。** 一覧にも出しません。
字形の提示手段が公式サイトの画像だけで、再配布条件の確認が済んでいないためです。
リンクだけ張る案も、ユーザー判断により「不十分感を与える」として見送りになりました。

**カタログ（293行）はそのまま保持してください。** 監査可能性のために必要です。
`ui-glyph-master.json` に入れるのが265件、という切り分けです。

---

## 2. 作業手順

### 第1段 — 監査ブランチを取り込む（挙動を変えない）

```
git fetch origin
git switch vintage-kana-main
git pull --ff-only origin vintage-kana-main
git merge origin/vintage-kana-ninjal-audit
```

`vintage-kana-ninjal-audit` は `vintage-kana-main` と共通祖先 `8036500` を持ち、
**追加のみ6ファイル・変更ファイルの重複ゼロ** です。コンフリクトは出ない想定です。
出たら止めて報告してください。

入るもの:

| ファイル | 内容 |
| --- | --- |
| `vintage-kana/data/ninjal-glyph-catalog.json` | 公式カタログ正本 293件 |
| `vintage-kana/NINJAL_GLYPH_AUDIT_2026-09-20.md` | 監査本文 |
| `vintage-kana/NINJAL_AUDIT_HANDBACK_2026-09-20.md` | 監査からの引き継ぎ |
| `vintage-kana/NINJAL_GLYPH_AUDIT_TASK_2026-09-20.md` | 監査の指令書 |
| `tools/ninjal-catalog/index.mjs` | 取得・突合の再現スクリプト |
| `tests/unit/ninjal-glyph-catalog.test.ts` | 自動テスト |

マージ直後は `ui-glyph-master.json` は138件のまま、アプリの見た目も出題も変わりません。

**この段でやること**: `tests/unit/ninjal-glyph-catalog.test.ts` の最後のテスト
「監査時点で判明している不一致が、直らないまま増えていない」の期待値更新。

監査が挙げていた要修正3件は **すでに本線で修正済み** です。

| Unicode | 修正内容 | 状態 |
| --- | --- | --- |
| `U+1B0D8` | 「る／留」→「も／毛」 | 適用済み |
| `U+1B0E6` | 字母「由」→「遊」 | 適用済み |
| `U+1B10C` | `inOfficialCatalog: false` 付与 | 適用済み |

したがって期待値は次のようになるはずです。

```
kanaMismatch: []
jiboMismatch: []
characterMismatch: []
currentCacheOnly: ["U+1B10C"]   // 据え置き
```

`node tools/ninjal-catalog/index.mjs`（通信なし）を実行して実際の差分を確認し、
その結果に合わせてください。**通信する `--fetch` / `--verify` は実行しないこと。**

ここで `npm test` と `npm run check:vintage-kana` が通ることを確認してからコミット。

---

### 第2段 — スキーマを広げる（まだ件数を増やさない）

`vintage-kana/data/ui-glyph-master.json` の **各行に3つのフィールドを足す**。
**件数は138件のまま**にしてください。

```jsonc
{
  "kana": "を",
  "glyph_id": "U+1B11C",
  "character": "𛄜",
  "jibo": "遠",
  "totalObserved": 3538,
  "witnessCount": 15,

  "ninjal_id": "470050020",        // 公式カタログの id。公式外なら null
  "inOfficialCatalog": true,       // 公式一覧に載っているか
  "renderability": "unicode-text"  // 今回入れるものは全てこの値
}
```

- `ninjal_id` はカタログの `ninjal_id` と符号位置で突合して埋める。
- `U+1B10C` だけは公式一覧に無いので `ninjal_id: null` / `inOfficialCatalog: false`。
  **削除しないこと。** 観測353回・12資料あり、観測事実を捨てることになります。
- トップレベルの `glyphCount` / `kanaCount` も実数に合わせて更新。

同じ内容を `index.html` の `FALLBACK_GLYPHS` にも反映してください。
**両者は常に同値である必要があります。** 片方だけ直すと、
データ取得に失敗したときだけ挙動が変わるという厄介なバグになります。

同値であることを検査するテストが無ければ、ここで追加してください。
`tests/unit/vintage-kana-rc25.test.ts` に足すのが自然です。

この段でも件数は変わらないので、**既存のテストとQAが全部通るはず**です。
通らなければ、構造変更のどこかが壊しています。件数を増やす前に必ず直してください。

コミットを分けてください（スキーマ変更と件数追加を同じコミットにしない）。

---

### 第3段 — Unicodeのある公式265件を入れる

`ui-glyph-master.json` を **265件** にします。

- 追加する127件は、カタログの `renderability` が Unicode を持つ行。
- 追加行の `totalObserved` / `witnessCount` は **0** を入れる。
  分布データに出てこないという事実をそのまま書くだけで、これは欠損ではありません。
- `U+1B10C`（公式外・観測353回）は **残す**。したがって合計は 265 + 1 = **266件** になります。
  この1件のずれは意図的なものです。`glyphCount` もその実数にしてください。
- `FALLBACK_GLYPHS` も同値に同期。

**やってはいけないこと**:

- 観測0回の行を除外する
- `observed` という真偽フィールドを足して母集団を絞る
- `autoWeight` / `pickWeighted` / `pickAutomatic` を書き換える
- 出題や生成のロジックに手を入れる

重み付けはすでに入っているので、**データを入れるだけで期待した挙動になります。**

### 第3段のあとに必ず確認すること

```
node --experimental-strip-types --test "tests/unit/vintage-kana-rc25.test.ts"
```

既存のテストがいくつか落ちる可能性があります。件数を前提にしたものがあれば、
**期待値を新しい件数へ更新**してください。ロジック側を変えて通すのは禁止です。

---

### 第4段 — SOURCES.md の数字を直す

`vintage-kana/SOURCES.md` の「264字体」という記述は、
Unicodeのある行しか数えておらず未付与28行を取りこぼしています。

**「293行／うちUnicode付き265」** という書き方に改めてください。
「47音価・215字母」はそのままで構いません。

---

## 3. 検証

各コミットで次を全部通してください。**通っていないものを通ったと報告しないこと。**

```
npm run check:eol
npm run typecheck
npm run lint
npm test
npm run data:check
npm run build
npm run scan:publish
npm run check:overflow
npm run check:vintage-kana
npm run check:font
npm run check:font-assets
npm run check:font-weight
```

`check:vintage-kana` は 320/360/390/430px の実ブラウザ検査です。
**265件に増やすと記録画面の1行あたりの字数が増え、ここが落ちる可能性があります。**
落ちた場合は **CSS を直さずに、落ちた内容をそのまま報告してください。**
レイアウトの調整はローカル側がブラウザを見ながら行います。

---

## 4. 完了時の報告に含めてほしいもの

- マージがコンフリクトなしだったか
- 各段のコミットハッシュとメッセージ
- `ui-glyph-master.json` の最終件数と、`FALLBACK_GLYPHS` と同値であることの確認方法
- `ninjal-glyph-catalog.test.ts` の期待値をどう更新したか
- 上記12コマンドそれぞれの成否（落ちたものは出力付きで）
- 仕様の判断に迷った箇所

push は `vintage-kana-main` まで。**PR作成と公開は不要です。**

---

## 5. ローカル側に残っている作業（参考）

あなたの担当外ですが、順序の理解のために書いておきます。

1. 265件投入後の記録画面・一覧のレイアウトQA（各幅）
2. 混同ペア表の作成と、4択の誤答候補の出し分け
   - **習熟度が低いうちは混同ペアを誤答候補から除外**
   - **習熟度が上がったら逆に優先して並べる**（見分けの訓練にする）
3. 字母逆引きの単答契約を複数正解へ
   （同じ字母に複数字体が50組115行あり、正解なのに不正解になる）

2と3はあなたが入れたデータの上で動くので、第3段まで終われば着手できます。

---

## 6. 参考文書

- `vintage-kana/HANDOFF.md` §56〜§59（直近の経緯）
- `vintage-kana/NINJAL_AUDIT_HANDBACK_2026-09-20.md`（マージ後に読めます）
  - ただし §6 の `observed` による母集団固定の案は **採用しません**。§1 の前提を優先してください。
