# ライセンス確認表（P0）

作成目的: `docs/IMPLEMENTATION_PLAN.md` §10「P0 境界固定と公開衛生」の受入条件を満たすため、
公開に関わる権利関係を成果物ごとに整理し、確認済みの事実と未確認の事実を区別する。

## 0. 凡例

| 確認状態 | 意味 |
|---|---|
| 確認済み（一次情報） | この作業の中で、配布元が公開している一次情報（ライセンス原文・公式リポジトリ）を実際に取得し、内容を確認した。 |
| 未確認（人間確認待ち） | 一次情報を確認していない、または一次情報だけでは判断できず、権利者本人・依頼者への確認が必要。人間確認 H-02 の対象。 |
| 対象外 | このフェーズでは扱わない、または方針としてまだ確定できない。 |

「確認済み（一次情報）」は Web 上の一次資料を Claude が確認した記録であり、**人間による最終承認ではない**。
最終承認は必ず人間確認 H-02 で行う（`docs/IMPLEMENTATION_PLAN.md` §15 の人間確認表、`docs/HANDOFF.md` §5）。

---

## 1. 自プロジェクトの成果物

| 対象 | ライセンス | 根拠 | 確認状態 |
|---|---|---|---|
| プログラムコード | Apache License 2.0 | `LICENSE`（本リポジトリ） | 確認済み（自己所有物） |
| 独自コンテンツ（設計文書・説明文・独自の構造化/注釈/派生データ・独自作成の図表画像） | CC BY 4.0 | `LICENSE-CONTENT.md` | 確認済み（自己所有物） |
| 公開名義 | `koten contributors`（仮） | `NOTICE`、`docs/IMPLEMENTATION_PLAN.md` §14.4 | 正式名称は人間確認 H-10（P12）で決定。それまでは仮称のまま扱う。 |

小倉百人一首の原典本文そのもの、および一次資料PDFはこのCC BY 4.0の対象に含まれない（`LICENSE-CONTENT.md` 「対象外・別条件」）。詳細は本表の第5節・第4節を参照。

---

## 2. フォント

Zen Maru Gothic（UI用）と Klee One（本文・出題語用）は、いずれも Google Fonts で配布され、
実体は `google/fonts` GitHub リポジトリの OFL ディレクトリにホストされていることを確認した。
両フォントとも `OFL.txt` として SIL Open Font License, Version 1.1（以下 OFL 1.1）が同梱されている。

### 2.1 Zen Maru Gothic

| 項目 | 内容 | 出典 |
|---|---|---|
| 配布元 | Google Fonts | https://fonts.google.com/specimen/Zen+Maru+Gothic |
| ライセンスファイル実体 | `ofl/zenmarugothic/OFL.txt`（google/fonts リポジトリ） | https://github.com/google/fonts/tree/main/ofl/zenmarugothic |
| ライセンス名・著作権表示 | "SIL Open Font License, Version 1.1" / "Copyright 2021 The Zen Maru Gothic Project Authors" | https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/OFL.txt |
| Reserved Font Name の宣言 | OFL.txt 内に、著作権表示の後で特定のフォント名を Reserved Font Name として指定する記述は**見当たらなかった**（定義文のみ存在） | 同上（本文を確認） |
| 確認状態 | 確認済み（一次情報） | — |

### 2.2 Klee One

| 項目 | 内容 | 出典 |
|---|---|---|
| 配布元 | Google Fonts | https://fonts.google.com/specimen/Klee+One |
| ライセンスファイル実体 | `ofl/kleeone/OFL.txt`（google/fonts リポジトリ） | https://github.com/google/fonts/tree/main/ofl/kleeone |
| ライセンス名・著作権表示 | "SIL Open Font License, Version 1.1" / "Copyright 2020 The Klee Project Authors (https://github.com/fontworks-fonts/Klee)" | https://raw.githubusercontent.com/google/fonts/main/ofl/kleeone/OFL.txt |
| Reserved Font Name の宣言 | 同上、特定フォント名の Reserved Font Name 指定は**見当たらなかった** | 同上（本文を確認） |
| 確認状態 | 確認済み（一次情報） | — |

### 2.3 OFL 1.1 の該当条項（実装に必要な3点）

以下は SIL OFL の公式 FAQ（一次情報）の記述に基づく。カッコ内は FAQ の項番。

| 論点 | 内容 | 出典 |
|---|---|---|
| self-host（自己ホスト）による再配布 | 明示的に許可されている。FAQ 原文: "Yes! Go ahead! ... loading the fonts dynamically as webfonts through CSS @font-face declarations is a much better method."（2.1） | https://openfontlicense.org/documents/OFL-FAQ.txt |
| 同梱すべきライセンスファイルと表示義務 | 通常の配布では OFL の全文を含める必要がある（別ファイルまたはフォントのメタデータ内）。FAQ 原文: "The only situation in which an OFL font can be distributed without the text of the OFL (either in a separate file or in font metadata), is when a font is embedded in a document or bundled within a program."（1.10）。`docs/IMPLEMENTATION_PLAN.md` §14.3 の方針（`public/fonts/` に各ライセンスファイルを同梱し `THIRD_PARTY_NOTICES.md` に列挙）はこの条項に整合する。 | 同上 |
| サブセット化（字形の削減）の可否 | 許可されるが「改変」とみなされる。FAQ 原文: "Removing any parts of the font when delivering a webfont to a browser, including unused glyphs and smart font code, is considered modification."（2.6）。改変時の制約は主に Reserved Font Name（RFN）の扱いに関するもの（RFN が指定された名称は改変版の名称に使えない）。上記 2.1・2.2 のとおり、取得した OFL.txt 本文には両フォントとも RFN の個別指定が見当たらなかったため、名称変更の義務は生じないと考えられる。ただし RFN 不指定の確認は Claude によるテキスト確認であり、人間による最終確認は行っていない。 | 同上 |

### 2.4 一次情報の再確認記録（2026-08-30）

本節 2.1・2.2 の記述は、起草後に別の担当が**同じ一次情報を取得し直して照合した**。結果は次のとおり。

| 照合項目 | 結果 |
|---|---|
| Zen Maru Gothic の著作権表示 | `Copyright 2021 The Zen Maru Gothic Project Authors (https://github.com/googlefonts/zen-marugothic)` として一致 |
| Klee One の著作権表示 | `Copyright 2020 The Klee Project Authors (https://github.com/fontworks-fonts/Klee)` として一致 |
| ライセンス名 | 両者とも SIL Open Font License, Version 1.1 と明記 |
| Reserved Font Name の個別指定 | 両者とも `OFL.txt` 中の "Reserved Font Name" の出現は**定義文（第33行）1 箇所のみ**。著作権表示の後に特定のフォント名を RFN として指定する記述は存在しない |

したがって「RFN の個別指定なし」は、起草者の読み落としではなく実体としてそうであることを確認した。
**これは 2 回とも機械による確認であったが、2026-08-30 に依頼者の追認を得て H-02 は完了した。**

### 2.4 未確認のまま残した点

- 上記はすべて Web 一次情報の確認であり、**人間による最終確認（H-02）ではない**。
- OFL 1.1 の条文そのもの（`openfontlicense.org` の公式ライセンス全文ページ）は個別に取得していない。今回確認したのは各フォントの `OFL.txt`（ライセンス全文を含む）と OFL の公式 FAQ の該当箇所のみ。
- `public/fonts/` へのライセンスファイル同梱と `THIRD_PARTY_NOTICES.md` への記載は、実装フェーズ（P1以降）でまだ行われていない。本表はその方針が妥当であることの根拠を示すのみで、実施を確認したものではない。

---

## 3. `assets/feedback/` の画像3点

対象: `correct-maru.png` / `needs-review-check.png` / `perfect-hanamaru.png`

### 3.1 論点

`assets/feedback/README.md` は次のように記述している。

> 初回公開版で使用する手書き風フィードバック素材です。いずれも**依頼者提供画像を参考に、輪郭を滑らかに整えた透過PNG**です。

一方 `LICENSE-CONTENT.md` は、この3点を「koten contributors が権利を持つ」成果物として列挙し、CC BY 4.0 で提供するとしている。

この2つの記述の間には、**確認されていない前提**がある。「依頼者提供画像を参考にした」加工物を koten contributors が CC BY 4.0 で第三者に再配布・改変許諾できるためには、少なくとも次のいずれかが成立している必要がある。

1. 依頼者提供画像自体の著作権を依頼者（またはkoten contributors）が保有しており、加工・再配布・再許諾の権利がある。
2. 依頼者提供画像の権利者から、CC BY 4.0 での公開（第三者による自由な再配布・改変を含む）について明示的な許諾を得ている。
3. 「参考にした」加工の程度が、依頼者提供画像の表現をコピーしたものではなく、独立した創作性を持つ別著作物と評価できる（この場合でも、依頼者提供画像がどこかの著作物を模写・トレースしたものであれば、その原著作物の権利がさらに及ぶ可能性がある）。

現時点でこれらのいずれについても、確認できる記録がリポジトリ内に存在しない。したがって、**この3点をCC BY 4.0で提供できる法的根拠は、まだ確立していない**。

### 3.1.1 依頼者の回答（2026-08-30・**この論点は解消した**）

依頼者本人より次の回答を得た。

> feedback 画像 3 点は私の手書きオリジナルです。

これにより §3.1 の Q1・Q2 は解消する。3 点の元画像は依頼者自身の著作物であり、
`assets/feedback/README.md` のいう「依頼者提供画像を参考に、輪郭を滑らかに整えた」加工版は、
**依頼者自身の著作物の派生物**である。第三者の権利が及ぶ経路は、依頼者が第三者の作品を
模写・トレースしていない限り存在しない。

したがって `LICENSE-CONTENT.md` が 3 点を CC BY 4.0 の対象として列挙していることの根拠が成立する。
CC BY 4.0 での提供は、権利者である依頼者自身が `LICENSE-CONTENT.md` で行った意思表示である。

**停止条件 S-2 は、feedback 画像 3 点については解除する。**

残る確認（軽微。P12 までに片付けばよい）:

- 元画像が他者の作品の模写・トレースでないこと（依頼者の手書きオリジナルという回答から、通常は問題にならない）。
- `assets/feedback/README.md` の「権利表示は、公開前のライセンス確認結果に従う」を、確定した表示（`© 2026 koten contributors / CC BY 4.0`）へ更新すること。

### 3.2 表

| ファイル | 記述されている来歴 | ライセンス（`LICENSE-CONTENT.md`上） | 再配布根拠の確認状態 |
|---|---|---|---|
| `correct-maru.png` | **依頼者の手書きオリジナル**を元に輪郭を整えた透過PNG | CC BY 4.0 | **確認済み（2026-08-30・依頼者回答）** |
| `needs-review-check.png` | 同上 | CC BY 4.0 | **確認済み（2026-08-30・依頼者回答）** |
| `perfect-hanamaru.png` | 同上 | CC BY 4.0 | **確認済み（2026-08-30・依頼者回答）** |

### 3.3 依頼者に確認すべき具体的な質問（H-02用）

- Q1. 「依頼者提供画像」は依頼者ご自身が描いたものですか。それとも第三者（外注イラストレーター、素材サイト、生成AIなど）から入手したものですか。
- Q2. 依頼者提供画像について、依頼者は著作権を保有していますか。保有していない場合、権利者から改変・再配布・再許諾の許可を得ていますか。
- Q3. 今回のアプリで使用する加工版（`correct-maru.png` 等3点）を、CC BY 4.0（第三者による自由な再配布・改変・商用利用を含む）で公開することについて、明示的に許可しますか。
- Q4. 上記の許可が得られない場合、「参考にした」具体的な内容（輪郭のみか、構図やキャラクターデザイン自体か）を教えてください。独自性の程度を判断する材料にします。

この質問と回答は書面（メール等）で記録し、リポジトリ非公開領域（`docs/HANDOFF.md` など）に確認結果の要旨を残すことを推奨する。

---

## 4. 原資料PDF

対象: `USB-3211_新しい古典文法_付録一覧.pdf` / `USB-3212_紛らわしい語の識別.pdf` / `USB-3215_原資料_未整理.pdf`

| 項目 | 内容 |
|---|---|
| 再配布可否 | **未確認**。中身は本作業では読んでいない（読む必要がない）。 |
| 扱い | 公開対象外。`CONSTITUTION.md` §4「公開しないもの」の「原資料PDFのうち再配布許可を確認していないもの」に該当する。 |
| 公開リポジトリへの扱い | 公開リポジトリ・Git履歴・raw URL・配布物のいずれにも含めない。README にも所在を書かない（`docs/IMPLEMENTATION_PLAN.md` §14.3）。 |
| 現状のリスク | 現行の非公開リポジトリ（`github.com/moyashimisosoup/koten`、H-01で非公開と確認済み）には存在するが、`docs/PUBLISH_MANIFEST.md`（許可リスト方式）により、公開移管対象から機械的に除外する。 |

---

## 5. 小倉百人一首の原典本文

| 項目 | 内容 |
|---|---|
| 本文自体の権利 | パブリックドメイン。新たな権利を主張しない（`LICENSE-CONTENT.md` 「対象外・別条件」）。 |
| 独自部分との区別 | 校訂・配列・注釈・構造化など、独自の創作性が認められうる部分は、原典本文と区別して `NOTICE` に記載する方針（`docs/IMPLEMENTATION_PLAN.md` §14.3）。 |
| 現状 | 方針は決まっているが、`NOTICE` への具体的な書き分け（どの範囲が独自部分か）はまだ書かれていない（本ファイル作成時点の `NOTICE` は、コード/コンテンツ/フォント等の一般的な帰属表示のみ）。 |

---

## 6. 今後追加される第三者コード（Vite / TypeScript / Preact 等）

未確定。これらの依存関係はP1以降のフェーズで導入されるため、現時点では個々のライブラリ名・バージョン・ライセンスをこの表に記載しない（未導入のものについて記載すると、実態と異なる記録になるため）。

P1以降、依存関係が確定した時点で `THIRD_PARTY_NOTICES.md` を生成し、各ライブラリのライセンス種別・著作権表示・原文リンクを機械的に列挙する（`docs/IMPLEMENTATION_PLAN.md` §14.3）。

### 6.1 jsdom（画面テスト基盤）

| 項目 | 内容 |
|---|---|
| 用途 | 開発時の Vitest 画面テスト用 DOM 環境（devDependency、公開物には含めない） |
| バージョン | 30.0.1 |
| ライセンス | MIT License |
| 著作権表示 | Copyright (c) 2010 Elijah Insua |
| 一次情報 | `node_modules/jsdom/LICENSE.txt`（ローカルにインストールされた配布物の原文） |
| 確認日 | 2026-09-01 |

---

## 7. 人間確認 H-02 の一覧と停止条件

`docs/IMPLEMENTATION_PLAN.md` §15 の人間確認表より: 「H-02 | フォント（Zen Maru Gothic / Klee One）と `assets/feedback/` 3点の再配布条件を確認する | P0 | 未着手。遅れると P3 が止まる（S-2）」

### 7.1 確認すべき相手と内容

| 項目 | 誰に確認するか | 何を確認するか |
|---|---|---|
| フォント2種 | 人間（プロジェクト運営者）が本表 第2節の内容を最終確認する | 第2節に記載した Web一次情報の確認結果が正しいか、OFL 1.1の条件（self-host可・ライセンスファイル同梱義務・サブセット化可）で実装方針（`public/fonts/` 同梱＋`THIRD_PARTY_NOTICES.md`列挙）を進めてよいか。 |
| feedback画像3点 | 依頼者本人 | 第3.3節のQ1〜Q4。 |

### 7.2 停止条件 S-2 との関係

`docs/IMPLEMENTATION_PLAN.md` の停止条件 S-2:「フォントまたは feedback 画像の再配布条件が確認できない」。

- フォントについては、本表第2節・第2.3節の一次情報確認により、OFL 1.1の一般条件下でself-host・同梱・サブセット化がいずれも可能であることを示す根拠が揃っており、**2026-08-30 に依頼者の追認を得た**（「確認OK」）。**S-2 はフォントについて解除する。**
- feedback画像3点については、**2026-08-30 に依頼者より「手書きオリジナルである」との回答を得て解消した**（§3.1.1）。S-2 は画像については解除する。

### 7.3 確認できなかった場合の代替手段

- **フォント**: OFL 1.1以外の条件が判明した場合、または依頼者・運営者が別フォントを希望する場合は、同じくOFL 1.1またはApache-2.0等の再配布条件が明確なフォント（例: 他のGoogle Fonts収録の日本語フォント）に差し替える。差し替え時は本表を更新し、差し替え理由を記録する。
- **feedback画像3点**: 依頼者の許可が得られない場合、または権利関係が不明確なままの場合は、依頼者提供画像を一切参照せずに新規に描き起こす（ゼロからの独自制作）か、再配布条件が明確なフリー素材（CC0またはOFL相当で提供されているもの）に置き換える。どちらの場合も、置き換え後の素材について本表に新しい行を追加し、確認済み根拠を記載する。

### 7.4 本表の位置づけ

本表はP0時点での調査結果の記録であり、人間確認H-02の完了を代替するものではない。`docs/IMPLEMENTATION_PLAN.md` §10 P0 ブロックの受入条件が求める「フォント2種とfeedback画像3点の再配布条件が記録され、原資料PDFが『未確認』と明記されている」状態は、本表により満たしている。ただし、feedback画像3点については「再配布条件が記録されている」＝「未確認かつ論点が明示されている」状態であり、「再配布してよいことが確認された」状態ではない点に注意すること。
