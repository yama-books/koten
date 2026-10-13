# VK-02 動画保存: 技術選定・第一実装チェックポイント

更新: 2026-10-13
状態: **PoC作成・単体テスト登録。実アニメーション録画は未実装、公開しない。**
正本起点: `main` `039063230233037973f5db5f1cfee43b6d45d1a7`（PR #97まで反映）
作業ブランチ: `vintage-kana-video-export-vk02-poc-20261013`
対象: 正式入口 `vintage-kana/index.html`、将来のクライアント側動画保存機能。
公開URLの変更・mainへのpush・Pagesデプロイはこの作業では行わない。

## 目的（統合計画のVK-02）

- ひらがな→変体仮名（forward）、変体仮名→ひらがな（reverse）の**実際に見た演出**を、再生できる動画として保存する。
- 演出中の不要なUI/スキップボタン/入力欄/デバッグ表示をファイルに含めない。
- 対応形式とファイル名は実際のブラウザ機能から判定する。MP4非対応機でMP4と偽装しない。
- 中止・失敗で再生/入力復帰を壊さない。学習履歴・字体対応・既存動画演出を変更しない。

## 2026-10-13 現行コード監査（直接確認した事実）

1. 本番の `index.html` は `#stage` / `#core` / `#whiteRoom` / `#flash` などの**DOM要素とCSS/WAAPI**で描画している。各字は `.glyph` 要素で `setT()` が `translate3d / scale / rotateZ / rotateX / rotateY` を設定している。
2. 各位相は `frameTween(duration,onFrame,token)` による requestAnimationFrame 進行。後半の刻印には `Element.animate()`、CSS keyframes、`sleep()`、画面シェイクが共存。単一のCanvas／映像ストリームは存在しない。
3. 変換方向は `getConversionMode()` で取得し、`transformText(source,mode)` で字形を置換。字形切替は閃光の `p>.88`。事前 `ensureMotionTargetFont()` を維持する。
4. `playToken` は再生取り消し、`skip` は瞬時完成、`backToInput()` は結果から入力へ戻す。録画機能はこれらの所有権・キャンセル時の資源解放と整合させる必要がある。
5. UIは現在 `#convert`、`#skip`、結果画面の `#playAgain` 等。動画保存ボタンはまだない。
6. `tools/pages-assemble/index.ts` は `vintage-kana/` をほぼ無加工で公開配信する。未完成PoCを誤って公開しないよう、今回は **`tools/vintage-kana-video-poc/` のみに実験HTMLを置く**。

## ブラウザ API の事前調査（仕様・外部資料）

- `HTMLCanvasElement.captureStream()` はその**Canvasの画素**からMediaStreamを得る。DOMやCSS3Dの `#stage` 自体を直接録画するAPIではない。出典: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
- `MediaRecorder` はMediaStreamを動画化する。 `MediaRecorder.isTypeSupported(mimeType)` でMIME候補を事前照合するが、リソース不足時など実際の録画失敗もあり得る。出典: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static
- `getDisplayMedia()` は画面選択ダイアログを要し、iOS Safariでは利用不可。デスクトップで「ユーザーがタブを選ぶ」迂回路として評価可能だが、録画範囲にアプリ外の画面が混入し得るため、そのままVK-02本採用にはしない。出典: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia
- `html2canvas` はブラウザ描画を保存するネイティブキャプチャではなく、対応CSSを再解釈する。filter等が未対応、transformは限定対応。既存の3D・発光・マスク演出に対して画質一致を保証できない。出典: https://html2canvas.hertzen.com/features/

## 判断（現時点の設計提案。動作検証による最終採用ではない）

### 採用候補: 共通シーン状態 → 画面DOM + 録画用Canvas

**本番との再現一致を最優先**する。そのため、可能な部分から既存フレームの位置/角度/scale/opacity/背景状態をシーン状態として切り出し、DOMとCanvasの各レンダラに同一の時刻・乱数パラメータを与える。Canvasは独立のoffscreen描画面とする。録画中はそのCanvasにだけ描画し、 `captureStream(30)` を `MediaRecorder` で保存する。

- 最初は「背景 + 1〜5字 + 前半の1モード」の**視覚一致PoC**で段階判定し、合格した場合に全10モード・各相へ拡張する。
- Canvas2DだけでCSS3Dの透視投影・ぼかし・グラデーション・マスク・刻印WAAPIと完全一致する保証はない。Canvas2Dで不足する場合はWebGL/WebGPU等の別描画方式も比較し、近似で満足したと推定しない。
- 独立した録画再生により元と違う乱数・字形にならないよう、同じ再生の固定シード/演出選択/文字列/変換方向を「シーン記録」に固定する。安易に `play()` を二度呼ばない。
- 長時間録画や発熱を考慮し、720p/30fpsを初期計測条件にする。性能が不足する機器では解像度/速度を下げる**提案**をUIで出せるようにする（未実装）。
- user motion preference / 色 / 音声の扱いは現行演出の仕様を保持。録画画面のキーボード・ボタン・デバッグUIの描画は禁止。

### 不採用（当面）

- `MediaRecorder(document.querySelector("#stage"))`: DOM elementはこのAPIの直接入力にならず、成立しない。
- `canvas.captureStream()` だけを本番へ付ける: 本番はCanvasに何も描いていないため空の動画になる。
- `getDisplayMedia()` 一択: iPhone/iPadに対応できず、利用者にタブ選択を要求、プライバシーやUI混入リスクがある。
- `html2canvas` 等で毎フレームDOMスクリーンショット化: CSS3D/フィルタ再現性と端末負荷が未確認であるため、先に採用しない。
- 端末が対応していない動画形式の拡張子を強制して保存する処理。

## 今回作成したPoCと実装境界

- `tools/vintage-kana-video-poc/video-capability.js`: Canvasの `captureStream` とMediaRecorder存在確認、MP4 H.264 → MP4 → WebM VP9/VP8 → WebM の順でMIME実行時判定。対応不明時は理由を返し録画しない。forward/reverseのファイル名も分ける。
- `tools/vintage-kana-video-poc/index.html`: **本番から完全に分離した簡易な2.8秒の文字エフェクト**で、Canvas→captureStream(30)→MediaRecorder→Blob→試写→利用者が保存を選ぶ処理、キャンセル、トラック停止、ObjectURL revokeを実装。方向を2つから選べるが、これは**本番の実演出ではなくAPI接続の試験**。
- `tests/unit/vintage-kana-video-export.test.ts`: canvas非対応、MediaRecorder不在、MP4/WebM選択、候補判定例外、方向別ファイル名、PoCの隔離と中止処理の回帰テスト。
- **本番`vintage-kana/index.html`には変更なし。** データの読み書き・既存の学習機能にも影響なし。
- PoCは `tools/` 配下であり現行Pages組立ての公開対象外。通常の公開URLでは検証できないので、作業コピーやHTTPサーバで `/tools/vintage-kana-video-poc/` にアクセスして実ブラウザ確認する。

## 受入検査と未検証事項

検証対象:
1. Chromium・WebKitと可能なら実機Safariで `MediaRecorder.isTypeSupported` の結果と**実際に得られるBlob MIME / 拡張子**を採取。形式は端末で違ってよい。
2. 生成ファイルの再生（先頭/中盤/終端があるか、破損・無音・フリーズ・FPS脱落・余白/切れなし）を確認。ブラウザ上の再生に加え保存したファイルを開いて確認。
3. 保存動作はブラウザ/端末で違うため、iPhoneの「ファイルに保存」や共有など利用者操作の経路を実機で確認。サポートしない場合は説明を明示。
4. 録画途中にキャンセルした場合のトラック停止、生成Blob未提示、ObjectURLの解放、通常再生に戻ること。
5. 実演出をCanvasへ移した後に初めて、前半10モード・両方向・1/5/20/80字・改行・幅320/390/768/1280・段階ごとの描画一致・閃光字形切替・スキップを検証する。**現在のPoC合格だけではこの条件を満たさない。**

**この記録時点の検査:** コード登録と静的・単体テスト準備のみ。Node CI、Playwright/WebKit、実端末動画録画、映像比較、fps測定は未実行/結果未確定。したがって **VK-02全体は未完了**。本番公開は許可されていない。

## 次の作業（他担当への引継ぎを兼ねる）

1. GitHub Actionsで新設ユニットテストおよび既存テスト結果を確認し、失敗があればPoC専用ブランチで修正。
2. PoCをChromium/WebKitで実行し、MIME候補、録画start/stop、実生成バイト数、再生可能性、キャンセル後の資源解放をログ化する。WebKitのみのPlaywright結果をiOS実機対応の証明とはみなさない。
3. DOMとCanvasの画面一致PoC（phase12/phase4のまず1モード、通常・白背景、フォント字形）を作り、スクリーンショット比較とFPSを計測。全相で保証できなければ本番動画ボタンを出さない。
4. 小画面・長文に対応できると確認できたら、専用PRでデザインとボタン位置、保存導線をレビュー。明示的な公開指示まで `main` へマージしない。

## 公開済みVK-01との関係

- VK-01は PR #93、mainマージ `a1c031dea8a1393701443522193ef22f0b540cc0`、Pages run 38314811317とCI run 38314811259でsuccess。再実装しない。
- 現在のmainはPR #97まで進んでいる。PR #94/95/96/97の解読・キーボード・クイズモーションを巻き戻さない。
- iPhone/iPad Safari実機での自然な動き、fps、skip/入力復帰はVK-01の残る**人による確認**として継続し、VK-02のPoCと混同しない。


## 2026-10-13 API単体実ブラウザ・スモーク検査（実行済み）

本番アプリやGitHub上PoCのブラウザ起動とは**別の**最小Canvas録画スクリプトを、隔離されたLinuxのヘッドレスChromium 144で実行した。これはブラウザ録画APIの可否のみを確かめる一次検査。

- 実行環境: Linux、Playwright Python版、/usr/bin/chromium（HeadlessChrome/144.0.0.0）。
- `canvas.captureStream(30)`: function、`MediaRecorder`: function。
- `isTypeSupported`: `video/mp4;codecs=avc1.42E01E`、`video/mp4`、`video/webm;codecs=vp9`、`video/webm;codecs=vp8`、`video/webm` は全てtrue（このブラウザに限る）。
- Canvas 320×180で約1.4秒、文字「あ」から「𛀂」へ変化させた短いテスト映像を録画。得たBlobは **2959 bytes**、Recorderの返すMIMEは `video/mp4;codecs=avc1.420015`（要求した型の文字列とは異なるがMP4/H.264）。
- 同じブラウザで `video.src=URL.createObjectURL(blob)` に戻し、loadedmetadata **成功**、長さ **1.420233秒**、解像度 **320×180**、`video.play()`成功。
- 別の短い試験で 3228 bytes / 2 chunks の出力も確認した。**これは本番Webアプリの描画検査ではない**。
- WebKit・実機Safari・WebM選択での生成/再生・保存UI・キャンセル動作・実コードPoCのクリック操作はこのスモーク検査ではまだ未検証。

上の結果は「このLinux ChromiumでCanvas録画・再生が成立する」範囲だけを支持する。ユーザーのiOS SafariでMP4保存できる保証ではない。


## 独立ブラウザPoCテストを追加（後続の検査ゲート）

- `tools/vintage-kana-video-poc/check.mjs` を追加。Playwrightで隔離PoCのHTMLを開き、Chromium・WebKitに対し、両方向で実録画Blobの生成・MIME/拡張子の照合・プレビュー表示、および録画取り消し後に保存リンクを出さないことを確認する。対応録画APIがない場合は非対応表示を検証する。
- `.github/workflows/vintage-kana-video.yml` を追加。VK-02専用ブランチのPoC/テスト変更でNodeユニットテストとPlaywright Chromium/WebKitテストを実行する。公開ワークフローではない。
- [PoCブラウザQA run 38379301233](https://github.com/yama-books/koten/actions/runs/38379301233) は本記録時点で**queued（未判定）**。成功扱いにしない。実際の結果・ログを確認し、非対応判定とテストエラーを混同しない。
- PoCの録画と本番演出の動画化は別問題である。PoCのブラウザQAが成功してもVK-02本機能は完了ではない。
