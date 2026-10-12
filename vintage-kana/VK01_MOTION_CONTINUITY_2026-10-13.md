# VK-01 変換アニメーション相境界の連続性監査

更新: 2026-10-13
ブランチ: `vintage-kana-motion-continuity-vk01`（PR #91をマージした `main` の `9c35434da6e53d426bd78ae5a93f24792e4df1a8` 起点）
公開: **未反映・未マージ**。

## 調査で確認できたこと

- 第1〜2相の `sideFrontPose` から第4相の `sideShakePose` に切り替わる瞬間、初期の揺れ周波数が（同期の場合）約1.42→2.7に変わり、同じ時刻で波の値が一致しない。
- `columnFrontPose`→`columnBouncePose` では、特に独立動作の基準振幅、Z軸や回転の式が異なる。
- `diagonalFrontPose`→`diagonalShakePose` でも初期波の周波数と回転・深さが異なる。竜巻系、チック／ピンボール系も入出力の式と livingScale が異なる。
- 第4相→第5相では `scaleMode` や配置変化によって `setT` の始点が一致しない可能性がある。これはコードによる**不連続リスクの確認**で、映像上の症状の頻度・見え方は別途ブラウザ実測が必要。
- 白化の `setWhiteLevel` は単調増加。第5相の閃光中の文字差し替え（`p>.88`）と字体の先行読込は維持する。

## 今回の実装（第1段階）

- `vintage-kana/motion-seam.js`: 出る側の最後約100msの位置(x,y,z)・scale・回転(rot,rx,ry)・透明度をサンプリング。
- 新しい相の最初260〜380ms（第4相）／340ms（第5相）だけ、以前の位置と末尾速度から出発して新相のポーズへ smoothly blend。極端な計測速度は上限を設けて補間の暴走を防止する。
- **第1・2相→第4相、第4相→第5相**の両境界を対象。第5相→第6相は閃光がほぼ不透明の間に姿勢が切り替わる元の仕組みを維持。白化の時程・演出選択の重みは変更しない。
- `index.html` と開発用 `prototypes/cinematic-motion-v1/index.html` の双方に適用。各相の既存軌跡は補間終了後にそのまま再開し、動きの性格は変更しない。
- 複製表示の変換、閃光中の字形差替え、回転音や追加演出のコードには手を入れない。

## QA・受入基準

1. 単体テスト: 位置・透明度の始点一致(C0)、推定進行速度が始点で継続(C1)、終点の原パターン復帰、全10モード相当の多文字サンプル、失敗時安全性。
2. Chromium・WebKit: 各前半10モード、順変換/逆変換、短文・中程度の文字数、幅320/390/768/1280の代表条件でフレーム境界の動きと見え方を確認。十分な時間・環境がなければ未実施項目を記載する。
3. 閃光中の文字差替え・Hentaigana字体読み込み・入力復帰・skip・再生中止・実機での描画負荷を回帰確認。
4. レビュー用PRを作成し、検証が済むまでは `main` へマージしない。

## 次の作業

- 専用CIで `tests/unit/vintage-kana-motion-seam.test.ts` を実行してテスト失敗を修復。
- Chromium/WebKitの代表モードで実映像検査、必要に応じて境界前後の数値・連続フレームのスクリーンショットを残す。
- 実測結果を本書に更新し、初期の白飛び・大きな速度の変化・長文での性能低下が残れば補間幅を調整する。

## 2026-10-13 ブラウザ検査による補正
- Chromium `front-side-sync` は第1/2→第4相、第4→第5相の補間確認に合格。
- WebKit `front-diagonal-sync` では、第4→第5相の最初64msに水平方向で135.36pxの差（基点 `-102.3885` → 補間後 `32.9700`）が観測され、専用QAが検出した。単なるテスト条件緩和はせず修正。
- 初速度を引き継ぐC1連続性を保ちながら、旧相の速度による外挿を42msの指数減衰を持つ時間積分に変更。補正が次相に過度に残らないようにする。
- 追加ユニットテストで最大級の暴れた速度を再現する。WebKit/Chromium再実行の結果は追って記録。

## 2026-10-13 対象モードを全10種に拡張
- Playwrightの仮想フレーム時計で同一ページを最後まで進め、`phase12 → phase4` と `phase4 → phase5` の最初80msを数値記録。
- 前半の **10モード**（orbit, formation, chick, column同期/独立, float-pinball, side同期/独立, diagonal同期/独立）をそれぞれ明示した隠し検査プリセットで再現。
- 横幅320/390/768/1280px、1/5/10/20文字級、改行・逆変換を代表組合せで検査する。検査条件の追加は演出選択のランダム分布を変更しない。
- この変更は**検査を拡大した段階**であり、全モードの合否はCI終了まで未確定。

## 2026-10-13 停止チェックポイント（ユーザー指示による作業凍結）

**ここから先は実装・追加試験・マージ・公開を進めずに停止。**

- 正本ブランチ: `vintage-kana-motion-continuity-vk01`、記録開始時の HEAD `c869a66fe284e103f615b58c38ac15df4256165b`。PR #91 のマージ済み main `9c35434da6e53d426bd78ae5a93f24792e4df1a8` から独立。main へは未マージ・Pages未公開。
- コード: `vintage-kana/motion-seam.js` に末尾ポーズ/速度のサンプリングと、次相への短時間補間を追加。対象: フェーズ1・2 → 4、フェーズ4 → 5。
- 適用: `vintage-kana/index.html` および `vintage-kana/prototypes/cinematic-motion-v1/index.html`。閃光時の `p>.88` 字形切替と `ensureMotionTargetFont` は維持。
- 検証: `tests/unit/vintage-kana-motion-seam.test.ts`、`tools/vintage-kana-motion-check/index.mjs`、`.github/workflows/vintage-kana-motion.yml`。直近コード変更は「前半10モードと両相境界」へブラウザ検査を拡張したコミット `c869a66`。
- 旧版の失敗記録: 当初の実ブラウザ検査では `input is not defined`（テストDOM参照の誤り）を修正。その後 WebKit 第4→5相入口の水平方向約135px差を検出、旧相の速度外挿に42ms指数減衰を導入して修正。**検査を弱めて回避したわけではない**。
- 旧コミットの検証証跡: [専用QA run 38289784395](https://github.com/yama-books/koten/actions/runs/38289784395) は **success**（単体、Chromium、WebKit）。ただしこの成功は最新 `c869a66` の全10モード拡張版に対する合否ではない。
- 停止時の最新専用QA: [run 38290192240](https://github.com/yama-books/koten/actions/runs/38290192240) は確認時点で **in_progress**（Chromiumブラウザ検査中）。同一HEADの [run 38290186056](https://github.com/yama-books/koten/actions/runs/38290186056) も in_progress。確認後にCI結果が確定している可能性があるので再開時必ず再取得。
- 同一HEADの習熟度リング回帰QA: [run 38290192250](https://github.com/yama-books/koten/actions/runs/38290192250) は確認時点で in_progress（既存記録検査中）。共通 [CI run 38290192277](https://github.com/yama-books/koten/actions/runs/38290192277) も in_progress。百人一首の既知 `check:overflow` 6件は別セッション担当、VK-01修正範囲に含めない。
- 未判定: 全10モード×2境界のChromium/WebKit合否、長文・改行・逆変換・320px等の拡張条件、実映像での質感・フレーム落ち、字形切替・skip・入力復帰、実機Safari、CI全体。テストが通っても映像審査は別途必要。

**再開手順**
1. 上記ブランチの最新HEADとmainとの差分を取得。並行更新があれば差分を優先して調整し、過去のSHAを上書きしない。
2. 専用QA（特に `38290192240` と `38290186056`）および回帰QA、共通CIの結論と失敗ログを読み、結果を本節へ追記。
3. **失敗なら原因を数値とスクリーンショットで再現して修正**。全10モードで第1・2→4、第4→5のポーズ・速度・透明度の境界を監査し、映像演出と文字の読みやすさを維持する。
4. Chromium/WebKit、短文/長文、スマートフォン相当幅、forward/reverse、閃光中の変体仮名置換を回帰確認し、結果を保存。
5. 独立PRを作成しレビューを経て統合判断。**この停止指示はマージ・本番公開を許可しない。**

### 2026-10-13 全モード拡張QAで検出した大画面の速すぎる遷移
- 同一SHAのCIで、Chromeの `side-shake-random` / 1280px / phase4→5、最初64msに `x=444.306→274.013`（差170.293px、次相の未補間値-361.944）が発生。ランダム種による再現確率があるため、合格した別CIだけで済ませず修正。
- 早い段階で新相の遠いポーズへ引き寄せる補間が原因。ブレンド係数を3次の `easeInOut` とし、第5相の補間幅を460msに拡張。速度の42ms指数減衰は維持。テスト閾値は変えない。
- Chromium/WebKit全10モードを再検査してから完了判断。

## 2026-10-13 再開後の検証と追加回帰試験
- 再開時のブランチHEADは `a7b654d5ece22c10f88ca80e2d6d978427e2f79b`。停止時の `c3c4f612` より後に既存実装の補正がコミット済みだったため、作り直さず継続した。
- 旧拡張QA [38290192240](https://github.com/yama-books/koten/actions/runs/38290192240) は Chromium `front-side-random` / 1280px / forward / phase4→5 / 64ms に `dx=170.293px` を検出してFAIL。同一HEADの [38290186056](https://github.com/yama-books/koten/actions/runs/38290186056) はPASSし、乱数依存の再発リスクを確認した。
- 補正コミット `a7b654d5`: 位相5への補間幅460ms、C0/C1を維持する3次 `easeInOut` に変更（指数減衰42msと検査閾値130pxは維持）。このHEADの[専用QA 38290594194](https://github.com/yama-books/koten/actions/runs/38290594194) は Chromium/WebKitとも**10/10モードPASS**、[習熟度リングQA 38290594216](https://github.com/yama-books/koten/actions/runs/38290594216) もPASSした。
- ただし当該10モード検査は1モード1条件であり、各モードの全幅/長さ/方向を横断するものではなかった。コミット `944bb433` で**10モード×5条件=50ケース/エンジン**（320/390/768/1280px、1/5/10/20文字相当、改行、順変換/逆変換）に拡大した。乱数をテストページだけ固定してseedをログに出し、再現性を確保。1ケースで2つの相境界を検査し、130px閾値は変更なし。
- コミット `9fd07b82` で、1280px時のX始点444.306・目標-361.944の大距離を再現する単体回帰テストを追加。64ms/79msの移動量、初期位置・速度、補間終端の収束を検査する。
- **上記50ケース×2ブラウザの結果は未確定**（新規専用QA [38312939198](https://github.com/yama-books/koten/actions/runs/38312939198)）。終了結果を確認するまでVK-01は最終受入にしない。
- 同時点の共通CIは百人一首側 `check:overflow` 6件で失敗。別担当のため本ブランチで修正・テスト緩和はしない。現在のmainは他作業PR #94を含む `ace435ba` に更新されており、VK-01のPR #93との統合時差分監査が必要。
- 実機Safari・実画面での印象評価・フレーム落ちの測定は未実施。**mainへのマージ、公開は行っていない**。

### 2026-10-13 拡張QA完走（再開後の最終機械検査）
- [専用QA run 38312939198](https://github.com/yama-books/koten/actions/runs/38312939198) **SUCCESS**。最新の実装・テストコミット `9fd07b82` に対し、Chromium **50/50**、WebKit **50/50**、合計100/100ケースPASS。1ケースでphase12→4とphase4→5の両境界を検査。全10モード、代表幅320/390/768/1280px、1/5/10/20文字、改行、順逆変換を含む。テスト乱数seedはログに記録。
- 最初80ms未満の観測最大差：Chromium `dx=112.91px`（front-side-random / 1280px / 20文字 / forward / seed 31737）、`dy=112.98px`（front-diagonal-random / 1280px / 改行10字 / reverse / seed 41946）。WebKitも `dx=112.91px`, `dy=112.98px`。いずれも元からの閾値130pxを満たす。
- 同実行で新設の1280px/64ms/79msの大距離単体回帰テストもPASS。ブラウザQAの各条件は位置の有限性を確認し、pageerrorも0件。
- [習熟度リング専用QA run 38312939203](https://github.com/yama-books/koten/actions/runs/38312939203) はSUCCESS。閃光字体切替 `p>.88` と `ensureMotionTargetFont()` は変更なし。
- **判定: VK-01の機械検査は受入条件を満たした。** 未検証: 実機Safari/iPhone、実映像の人による自然さ評価、フレーム落ちの定量評価。これらはレビュー時の確認事項。PR #93はドラフトのまま、mainマージ・Pages公開は行わない。
