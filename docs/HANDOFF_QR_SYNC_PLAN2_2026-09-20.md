# QR 同期 Plan 2 作業メモ（2026-09-20）

## 実装した範囲

- 百人一首ホームに新機能の短い案内を置き、「試してみる」から同期設定を開く。常設の入口は「これまでの記録」内の「データ管理」タブに置く。案内は「OK」でこのタブ中、「今後は表示しない」で継続して閉じられる。
- 設定画面には自分の端末同士をつなぐ順序を番号付きで示す。同期の作成、QR とリンクの表示、共有コードの表示、停止確認を追加。
- QR は同一 origin / pathname の `?join=<16文字の合言葉>` を含む招待 URL。カメラと画像ファイルを `jsqr` で読み取る。手入力の合言葉も使える。
- 参加側は `settings/current` を取得して合言葉で復号できることを確かめ、利用者が「確認して参加する」を押した後に同期を始める。読み取っただけでは参加しない。
- 保存した合言葉があれば起動時に同期し、停止時は購読を解除する。新規記録の保存時とオンライン復帰時に送信待ちを再試行する。購読エラーは 30 秒後に再接続する。
- 初回参加時には同期以前の端末内記録も送信待ちへ積む。受信は追加分だけを書き込み、同じ ID のセッションは完了済みの版を優先する。
- 遠隔設定は初回 snapshot を受けるまで送らない。送る値は読み・表示方向・順番・音・学年だけで、合言葉、統計の選択、端末 ID は含めない。
- Firestore ルールで記録コレクションの `list` とセッションの暗号文 `update` を許可。`get` の存在確認で、拒否された書き込みを重複と決めつけない。
- `qrcode@1.5.4`（MIT）、`jsqr@1.4.0`（Apache-2.0）、`@types/qrcode@1.5.5` を追加。ライセンス本文は `packages/hyakunin/public/licenses/` に同梱。

## 見本から採用した流れ

`moyashimisosoup/shukudai-notebook` の `assets/app.js`、`assets/sync.js`、`firestore.rules` を参照した。特に招待 URL の QR 化、カメラ停止、同期先の復号確認を経てから参加を確定する流れ、初回設定受信前の送信抑止を採用した。Koten では画像ファイル読み取りも追加した。

見本の端末名・役割・端末解除は Koten の同一生徒端末モデルにはまだ導入していない。見本の Firebase 認証とルールをそのまま移植せず、既存の合言葉由来 `houseId` と暗号化レコードに合わせてルールを修正した。

## 検証と残る確認

- `npm run typecheck`、`npm run lint`、`npm test`、`npm run build`、`npm run scan:publish`、`tests/rules` の `npm test` は成功。ルール試験は Node のファイル並列実行で同じエミュレータを消し合っていたため、直列実行にした。
- Firebase 本番ルールのデプロイ、App Check の登録ドメイン確認と施行、実端末 2 台を使ったカメラ・オフライン・PWA の確認は未実施。`appCheckEnabled` と `firebaseEnabled` は従来どおり false。同期は `features.sync` から起動する。
- 既存 handoff が指す `docs/superpowers/specs/...` と `docs/superpowers/plans/...` はこのチェックアウトに存在しない。Firestore の初回読み取り件数コストも未裁定のまま。

## 2026-09-21 の画面調整と次の作業

- ホームの案内は「複数の端末で学習状況を共有できます」に修正。ホーム末尾の「データ管理」入口は削除し、常設の入口を「これまでの記録」→「データ管理」に統一。「OK」はこのタブの間だけ非表示、「今後は表示しない」は次回以降も非表示。
- 同期画面は冒頭を「複数の端末で記録を共有」にし、①「共有する端末で読み取って」「新しい同期グループを作る」、②「別の端末のQRを読み取る」「カメラを開く」「画像を選ぶ」に修正。確認文も同期グループを基準にした。
- 実端末画像で QR の白い枠が右にはみ出していた。原因は枠の幅に padding が加算されていたこと。`box-sizing: border-box` で修正し、320px と 390px の幅で枠がカード内に収まること、生成 QR が復号できることを確認。停止後の通知も同期画面の青緑へ統一した。
- 習熟度 80% のうち、作者未確認で本文が満点に達した歌は、記録一覧と結果の詳細に青系の「作者も確認」バッジを表示する。80% 全般を「本日の上限」とは呼ばない。生徒の報告を特定するには歌番号と学習記録が必要。同日の 90% 上限や出題方式・段の上限は別途調査する。
- 一時 HTTPS の Cloudflare Quick Tunnel は失効しうる。今回の検証ではローカルの同一 origin プレビューを使用し、独立した2保存領域の参加・双方向記録反映を確認した。プレビュー用 Firestore 接続は URL の protocol に合わせる。
- 横幅の広い画面の旧 URL 画像で、ホーム案内の「スマホ」が途中で折り返されていた。案内を2文の自然な改行に整理し、端末名の途中では改行しないようにした。320px・390px・1024px 幅で案内と QR のレイアウトを検査した。

## 2026-09-21 01:10 の追補

### 送信待ちを同期しない端末に溜めない（引き継ぎ §6-5 の残件）

`appendEvent` / `saveSession` / `saveReport` は同期の有無を知らないまま `syncOutbox` へ 1 件積む。
保存の口の側で出し分けると、設定を読む取引と記録を書く取引が別になり、参加した瞬間に書かれた 1 件が
どちらからも漏れる競合が残る。そこで**捨てる側で出し分けた**——`main.tsx` の同期効果が「同期していない」と
判定したときに `port.clearSyncQueue()` で待ち行列を空にする（`clearSyncOutbox`）。

- 記録そのものは消えない。捨てた分は参加時に `seedSyncOutbox` が端末内の全記録から積み直す。
- `settings` が null の間は「同期しているか」がまだ分からないので捨てない。
- 効果の依存に `settings === null` を足した。**`syncEnabled` を持たない設定では読み込み前後でどちらも
  `undefined` になり、読み終えたことを依存の変化として拾えなかった**（最初の実装はこれで動かなかった）。
- `@koten/shared` の `exports` に `./storage/repo/sync-outbox` を追加した（無いと画面試験が解決できない）。

破壊試験：`clearSyncOutbox` を `clear()` から `count()` に変えると該当の 1 件だけが赤。
`if (settings)` の番人を外すと「設定を読み終える前は捨てない」の 1 件だけが赤。

### 横長画面の改行位置

同期画面の冒頭が 1024px 幅で「取り扱いに注意し／てください。」と語の途中で折り返していた。
ホームの案内と同じ直し方に揃えた——文の切れ目に `<br />` を置き、途中で切れると読みにくい塊
（招待リンク・共有コード・取り扱いに注意・共有コードの末尾）に `.sync-nowrap`（`white-space: nowrap`）を付けた。
「参加の確認」の本文にも同じ処置をした。実測：1024px で 1 文 1 行の 2 行、320px と 390px では 3 行のままで
横スクロールも QR のはみ出しも無い。`<br>` は `textContent` に現れないので既存の画面試験の文言照合は変わらない。

### 規則試験と端末確認が同じ港を奪い合っていた問題

両方が `firebase/firebase.json` の 8088 を使っていたため、端末確認を動かしたままでは
`tests/rules` が `Could not start Firestore Emulator, port taken.` で走らなかった。
端末確認用に `firebase/firebase.device-preview.json`（8089）を足し、`proxy.mjs` と `start.ps1` を向け直した。
アプリは同一 origin の proxy 越しに繋ぐので、アプリ側の設定は変えていない。

### この時点で通った検査

`typecheck` / `lint` / `test:node` 790 件 / `test:screen` 365 件 / `data:check` /
`scan:publish`（走査 766 件・違反 0）/ `tests/rules` 35 件（S-1〜S-10 を含む）——すべて成功。
規則試験は端末確認を動かしたまま走らせて通した。
`smoke.mjs` の独立2保存領域の双方向確認も、新しい港の構成で成功。

### まだ残っていること

実端末のカメラ・オフライン復帰・PWA、本番 Firebase ルールの反映、App Check の登録ドメイン確認と施行、
公開版への反映。`appCheckEnabled` と `firebaseEnabled` は false のまま、同期は `features.sync`（true）で動く。
習熟度 80% の生徒の報告は、歌番号と学習記録が出てから調べる。

## 2026-09-21 App Check の現状調査と実装

### Firebase 本番ルール

`firebase deploy --only firestore:rules --project koten-fde43` で反映済み（人手＋ChatGPT 側で実施）。
ローカルの `tests/rules` は 35/35 green。`firebase init` は実行していない。

### 調べて分かったこと

**App Check は「統計送信」の経路にしか無く、同期の経路には1行も無かった。**

| 経路 | 実装 | 状態 |
|---|---|---|
| 統計送信（生 fetch） | `packages/hyakunin/src/telemetry/app-check.ts`。reCAPTCHA Enterprise を自前で読み、`exchangeRecaptchaEnterpriseToken` で App Check トークンへ交換し、`X-Firebase-AppCheck` を手で付ける | `appCheckEnabled` が偽なので**トークンを取りに行かない** |
| 同期（Firebase SDK） | **無し。** `sync/client.ts` は `initializeApp` と `getFirestore` だけで、`initializeAppCheck` を呼んでいなかった | **全通信が未検証** |

`firestore.rules` には `request.app` が1つも無い（施行前なので正しい）。
`FIREBASE_APPCHECK_DEBUG_TOKEN` はリポジトリのどこにも無い。

**コンソールの Verified 1% / Unverified 99% はこれで説明がつく。** トークンを送っている経路が無い。

### 入れた実装（最小差分・施行はしていない）

- `packages/shared/src/sync/app-check.ts` を新設。**起こすかどうかの判断だけ**を純関数に切り出した
  （`client.ts` は実サーバ接続が前提で試験を持てないため、判断だけでも釘付けできるようにした）。
- `sync/client.ts` は Firebase app を作った直後、**Firestore を作る前に** App Check を起こす。
  順序が逆だとトークンが乗らない。`firebase/app-check` は動的 import。
- **端末確認用ビルド（`VITE_QR_SYNC_EMULATOR=1`）では起こさない。** エミュレータは App Check を見ないし、
  Cloudflare の一時ドメインは起動のたびに変わるので reCAPTCHA の許可ドメインに入れられない。
- **失敗しても投げない。** 施行が入るまで規則はトークンを見ないので、転んでも同期は動く。
- **debug token は入れなかった。** 実サーバ相手の確認は `localhost`（登録済みドメイン）から行えるし、
  トンネル経路はエミュレータなので App Check を通らない。秘密を Git に入れる経路を作らずに済む。

### 順序の誤りを1つ直した

`app-config.ts` のコメントにあった「登録ドメインの確認 → 規則へ `request.app != null` → 施行 → ここを真」は
**逆順で、正規の利用者が全員弾かれる**。施行を入れた時点で端末はまだトークンを送っていないからである。
`docs/FIREBASE_CONSOLE_TODO.md` の「ドメイン修正 → クライアント実装 → 指標の確認 → 施行」が正しい。
コメントを正しい順序へ書き直し、`tests/unit/sync/app-check.test.ts` の **A-5** で釘付けした——
**規則が `request.app` を要求しているのに `appCheckEnabled` が偽なら赤くなる。**
破壊試験：規則に `request.app != null` を足すと A-5 だけが赤。

### enforcement の状態

**未適用（Unenforced）のまま。触っていない。** `appCheckEnabled` も **false のまま**。
指標が Verified 側へ移るのを見るには `appCheckEnabled` を真にした版を公開する必要があるが、
これは(1)右下に reCAPTCHA のバッジが出る利用者向けの変化で、(2)2026-09-13 の裁定（案2）の釘
（`tests/unit/telemetry/sender.test.ts` の「App Check が無効な間、既定の経路は reCAPTCHA を読み込まない」）
を赤にするため、**依頼者の判断を待っている。**

### 実行した検査

`typecheck` / `lint` / `test:node` **795件** / `test:screen` **365件** / `data:check` /
`scan:publish`（766件・違反0）/ `tests/rules` **35件** —— すべて成功。

### 残作業

1. `appCheckEnabled` を真にするかの判断（上記）。真にするなら sender.test.ts の釘も更新する。
2. 実サーバ相手に同期して指標が Verified へ移ることの確認。**本番 Firestore へ記録が残る**
   （規則が delete を拒むのでアプリからは消せない）ことを承知のうえで行う。
3. 指標を見てから、規則の `request.app != null` と施行を**同時に**入れる。
4. 実端末のカメラ・オフライン復帰・PWA。
5. 公開版への反映。

## 2026-09-21 `appCheckEnabled` を真にした（施行はまだ）

依頼者の裁定により手順 3 へ進んだ。`appCheckEnabled: true`。**施行（enforce）は入れていない。**
`firestore.rules` にも `request.app` は入れていない。

2026-09-13 の裁定（案2）の釘を差し替えた。旧「App Check が無効な間、既定の経路は reCAPTCHA を
読み込まない」→ 新「App Check が有効なら、既定の経路は reCAPTCHA を読みに行く」。
破壊試験：`appCheckEnabled` を偽へ戻すと、この1件だけが赤。

### 実サーバでの実測（localhost:5173・本番 koten-fde43）

同期グループを1つ作り、`performance` の資源記録で経路を確かめた。

| 段 | 実測 |
|---|---|
| reCAPTCHA Enterprise の読み込み | `enterprise.js?render=explicit`（App Check SDK が読む） |
| App Check トークン交換 | `content-firebaseappcheck.googleapis.com/v1/projects/koten-fde43/apps/…:exchangeRecaptchaEnterpriseToken` が1件 |
| Firestore | `firestore.googleapis.com` の Listen 1件・Write 2件、いずれも `projects/koten-fde43` |
| コンソールのエラー | **0件**（交換が失敗すれば SDK が必ず吼える） |

**本番へ書いた記録**：合言葉 `zqxrdhtbfwwfzgez`、
houseId `5522c674feee450477a3ef3f4241295dc89b42e3f2ec1db3f4a012b797bcae64`。
`households/<houseId>/settings/current` ほか数件。**規則が delete を拒むのでアプリからは消せない。**
不要になったらコンソールから消すこと。

### reCAPTCHA のバッジ——**経路によって出方が違う**

| どちらが先に reCAPTCHA を読むか | 読み込む URL | バッジ | 統計のトークン |
|---|---|---|---|
| App Check SDK（同期する端末） | `render=explicit` | **0×0。見えない** | **取れない（null）** |
| 統計送信（同期しない端末） | `render=<サイトキー>` | **256×60。右下に見える** | 取れる |

### 【要判断】2つの App Check 実装が干渉している

**同期側の App Check SDK が先に reCAPTCHA を読むと、統計側の `getAppCheckToken()` が null を返す。**
`enterprise.js?render=explicit` で読み込まれた grecaptcha に対して
`enterprise.execute(siteKey, …)` を呼んでも、そのサイトキーは render されていないため失敗する。
`loadRecaptchaEnterprise` は `window.grecaptcha?.enterprise` があれば再読み込みしないので、ここで詰まる。

**いまは害が無い。** 施行前なので規則はトークンを見ず、統計はヘッダ無しで通る（`appCheckEnabled` が
偽だった頃と同じ状態）。**しかし施行を入れると、同期する端末からの統計が全部拒否される。**

**手順 5（施行）の前にこれを解く必要がある。** 素直な解は「統計側も App Check SDK のトークンを使う」
だが、**`transport.ts` を生 fetch だけに保つという既存の方針（T-17・T-18 の釘）と正面衝突する。**
方針の裁定が要るため、ここでは直していない。

### 実行した検査

`typecheck` / `lint` / `test:node` **795件** / `test:screen` **365件**（32ファイル）/ `data:check` /
`scan:publish`（766件・違反0）—— すべて成功。`tests/rules` はこの変更の前に 35/35 成功。

### enforcement の状態

**未適用（Unenforced）。触っていない。** 有効化の前に、上の干渉の解決と指標の確認が要る。
