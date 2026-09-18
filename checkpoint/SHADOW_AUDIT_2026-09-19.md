# Checkpoint DB shadow audit
更新: 2026-09-19

## 結果

既存4サンプル、計990文字で legacy の文法・識別 hit と DB shadow detector を比較した。

legacy 側には、同一位置・同一表面形に複数ルールが重なる hit があったため、**位置＋表面形で重複排除した値を主指標**とする。

| 指標 | 件数 |
|---|---:|
| legacy raw hit | 348 |
| legacy unique位置 | 310 |
| legacy内の重複 hit | 38 |
| DB raw hit | 310 |
| DB resolved | 69 |
| DB suppressed | 241 |
| DB only | 0 |

- surface_index の legacy unique 被覆: **310 / 310 = 100%**
- 現時点で安全に通した位置: **69 / 310 = 22.3%**
- suppressed 241の内訳:
  - context-required: **207**
  - larger-db-surface-preferred: **34**
- DB未収録による欠落: **0**

これは正答率ではない。DB側は短い表面形を文脈未解決のまま通さないため、resolvedを意図的に絞っている。

> 訂正: 初回監査では legacy raw 348を分母にして「89.1%被覆」と記録したが、38件の重複ルールを含んでいた。unique位置で比較すると **100%被覆** だった。

## 主な改善

- `ぬ・ね・ば・む` を context-required に追加。
- `なむ・らむ・にて・ばや` 等の内部にある短い表面形を、長い意味単位があるときは抑制。
- 形容詞監査例 `かひなけれ` / `みしかゝり` では `けれ` / `しか` の内部一致を正しく抑制。
- 係り結び30例を `kakari_musubi_routes.json` に接続。

## 係り結びの重要判断

係助詞らしい文字列と近い表面形を距離だけで結んだ試行では、
長文の `とぞ申しける` で `申し` 内部の `し`、`ける` 内部の `る` に候補支持が飛んだ。

このため **raw文字列距離による自動係り先推定は不採用**。

現在は:

1. 係助詞を品詞として同定
2. 係り先の範囲を決める
3. その後 `kakariSupportForResolvedParticle()` を呼ぶ
4. 候補を「支持」するだけで正解確定はしない

という設計。

ルートAPIの回帰テストは8/8成功。
形容詞内部一致抑制は2/2成功。

## legacy unique 310位置の分類

- 69: DB resolved
- 207: context-required
- 34: より大きいDB表面形に吸収
- 0: DB未収録

したがって、次のボトルネックは「表面形DBを増やすこと」より、**context-required 207位置を安全に解く文脈resolver**。

頻度が多い順では `て` 28、`に` 28、`と` 27、`し` 25、`る` 24、`を` 21、`ば` 17、`な` 14、`せ` 10 など。

## 次

まず接続・語の切れ目で比較的安全に絞れる表面形から resolver を増やす。
係り結びは形態境界と係り先範囲解析ができるまで route API 待機とする。


## 監査済み活用形による context resolver

500例マイルストーンから、原文targetが2文字以上で、品詞・活用形が一意だった **413表面形** を
`audited_inflected_form_index_500.json` に分離した。

ただし、日本語本文には空白境界がないため、仮名だけの表面形をそのまま語境界とみなすのは危険だった。
試験では「ごとく」内部の「とく」を動詞「溶く」と誤認できてしまうケースを確認した。

そこで自動resolverでは:

- kanji-anchored: 209表面形 → 使用可
- kana-only: 204表面形 → tokenizer / 形態境界解析まで保留

とした。

接続規則は `context_resolver_rules.json` に分離し、USB-3212で候補の接続が明示されている範囲だけを使用する。

### 再監査

既存4サンプル・legacy unique 310位置に対して:

- DB raw: 310
- DB resolved: **70**（従来69）
- DB suppressed: **240**
- matched: **70**
- DB only: 0
- context resolverで新規resolved: **1**

新規resolvedは安倍晴明サンプルの **「開いて見れば」**。

`見れ` が500例監査済みDBで「見る・已然形」と一致し、
USB-3212の「已然形＋ば → 確定条件候補」という経路に合うため、
`ば` を `conjunctive_ba_fixed` の候補支持としてshadow側だけでresolvedへ昇格した。

これは正解の自動表示ではなく、**出典付き接続証拠で一候補に絞れたという内部状態**である。

resolved率は **70 / 310 = 22.6%**。
増加は1位置だけだが、曖昧な仮名境界を無理に解かないことを優先した。


## 既知語境界レイヤ

`known_token_boundary_index.json` を追加した。

材料は:
- 500例のうち kanji-anchored で監査済みの活用語形
- `basic_lexicon.json` の curated 表面形
- `inflecting_words.json` の curated / corpus-audited 表面形

の統合。現在 **290表面形**。

短い識別候補が、より長い既知語の内部に完全包含されるときは、
短い候補を独立した文法語として扱わず `known-larger-token` でshadow抑制する。

4サンプルでは **20位置**を追加で内部一致と判定できた。
代表例:

- `参らせ` 内の `せ`
- `例のごとく` 内の `と`
- `なでふ` 内の `な`
- `召し` / `申し` 内の `し`
- `寄せ` 内の `せ`
- `いかが` 内の `が`
- `悪しく` 内の `し`
- `かかる` 内の `る`

この結果、resolvedは70のままだが suppressed 240 の内訳は:

- context-required: **188**
- larger-db-surface-preferred: **32**
- known-larger-token: **20**

となった。これは「正解が20増えた」のではなく、**誤って独立候補にしそうな20位置を安全に黙らせた**改善。

## 百人一首 exact phrase evidence

既存監査 `hyakunin_isshu_bunsetsu_audit_2026-09-05.md` の
「古文解析アプリ向け 要注意表面形」17例を
`hyakunin_disambiguation_evidence.json` に構造化した。

方針は一般化ではなく完全一致限定。

- `枯れぬ` / `知らぬ` / `見えね` 等は exact phrase で候補支持
- `明けぬる` / `明けぬれば` / `なりぬれど` / `にほひぬる` は、`ぬ`一字ではなく `ぬる・ぬれ` を大きい分析単位として優先
- `いぬめり` は動詞「往ぬ」の内部なので、助動詞らしい `ぬ` hit を抑制

回帰は **17/17 PASS**。


## 双方向 context resolver

USB-3212の識別cueには、前接活用形だけでなく「後ろに何が続くか」を見る項目がある。
これを `context_resolver_rules.json` に明示した。

現段階で自動resolvedを許すのは:

- `連用形 + に + けり` → 完了「ぬ」連用形候補
- `連用形 + て + む / けり / き / まし` → 完了「つ」未然・連用形候補

ただし前接語は、500例監査DBの kanji-anchored exact form に一致する場合に限る。

配線回帰:
- `言ひてけり`
- `言ひにけり`
- `悪しくてけり`
- `思ひてむ`

4/4 PASS。

これらのテスト文字列自体を新しいコーパス証拠とは扱わない。
目的は、すでにある前接証拠とUSB-3212の後続cueを正しく組み合わせられるかの単体確認。

## 4サンプル再監査 v0.5

百人一首 exact phrase evidence の `知らぬ` が識別サンプルにも一致したため、
その `ぬ` 1位置が追加resolvedとなった。

- legacy unique: 310
- DB raw: 310
- DB resolved: **71**
- DB suppressed: **239**
- resolved率: **22.9%**
- DB only: 0

suppressed 239の内訳:
- context-required: **187**
- larger-db-surface-preferred: **32**
- known-larger-token: **20**

resolved率の上昇そのものより、出典のない推測を増やさずに
「内部一致を黙らせる」「完全一致監査句だけを通す」を分離できたことを重視する。
