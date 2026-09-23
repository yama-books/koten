# App Check の引き継ぎ（2026-09-23）

**次に読む人へ:** この文書だけで拾えるように書いてある。前のセッションの記憶は要らない。

**作業の中心はコードではなく Firebase / Google Cloud コンソールである。**
クライアント実装はもう入っていて、**トークンの交換が 403 で失敗している**のが唯一の壁である。

---

## 0. 最初に読む：**施行（enforce）を入れてはいけない**

**App Check のトークンが 1 枚も発行されていない。** この状態で Firestore の施行をオンにすると、
**同期も統計送信も全滅する**（正規の利用者が全員弾かれる）。

指標が Verified 側へ十分移るまで、施行は触らない。`firestore.rules` へ `request.app != null` を
足すのも施行と同時である（いまルールに `request.app` は 1 つも無い。確認済み）。

---

## 1. いまの状態（すべて実測で確認済み）

| 項目 | 値 |
|---|---|
| プロジェクト | `koten-fde43`（表示名 `koten`） |
| Web アプリ | `koten-web`、App Check 登録済み、プロバイダは reCAPTCHA Enterprise |
| サイトキー | `6LfypaYtAAAAAOpjJ_83HMURnkXIH_iJ9kuwEl0O` |
| `appCheckEnabled` | **`true`**（`packages/shared/src/app-config.ts`） |
| `firebaseEnabled` | `false`（同期は `features.sync` で動くので無関係） |
| Firestore の施行 | **未適用（Unenforced）** |
| 規則の `request.app` | **無し**（0 件） |
| 指標 | Verified 1% / Unverified 99% |
| 公開先 | `https://yama-books.github.io/koten/100/` |

---

## 2. クライアント実装（作業は不要。**壊さないこと**）

App Check は **1 か所だけ**で起こす。`packages/shared/src/app-check.ts` がその持ち場である。

- `firebaseApp()` … この端末で Firebase app を 1 つだけ作る
- `startAppCheck()` … `initializeAppCheck` を 1 度だけ呼ぶ。失敗しても投げない
- `appCheckToken()` … 統計送信が `X-Firebase-AppCheck` に載せるトークン。取れなければ `null`

使う側は 2 つ。

- 同期: `packages/shared/src/sync/client.ts`（**Firestore を作る前に**起こす。逆だとトークンが乗らない）
- 統計: `packages/hyakunin/src/telemetry/app-check.ts`（自分では何もせず、上から受け取るだけ）

### 以前あった罠（2026-09-21 に解消済み。**戻さないこと**）

実装が 2 つあり、同じサイトキーの `enterprise.js` を**違う読み込み方**で要求していた。

- SDK が先（同期する端末）→ 統計側の `enterprise.execute(siteKey, …)` が失敗して常に `null`。
  **施行を入れると、同期している端末からの統計が全部拒否される。**
- 統計側が先（同期しない端末）→ `render=<サイトキー>` で読むため、**右下にバッジが出る**。

1 か所へ寄せた結果、読み込みは `render=explicit` の 1 回だけになり、**バッジも出ない**
（`.grecaptcha-badge` が 0×0 であることを実測済み）。

### これを守る釘（`tests/unit/app-check.test.ts`）

- **A-5** … 規則が `request.app` を要求しているのに `appCheckEnabled` が偽なら赤。順序の逆転を防ぐ
- **A-6** … `initializeAppCheck` の呼び出しは packages 全体で 1 か所だけ。2 つ目が生えたら赤
- **A-7** … reCAPTCHA を自前で読む記述と交換 API の直叩きが packages のどこにも無い

**釘を外して先へ進まないこと。** 赤くなったら、それは順序か重複の誤りである。

---

## 3. **唯一の壁：トークン交換が 403**

### 症状

同期を始めると、SDK が下記を呼び、**403 が返る**。

```
POST https://content-firebaseappcheck.googleapis.com/v1/
  projects/koten-fde43/apps/1:324835470506:web:b81389fcaa9bbfe49834d3
  :exchangeRecaptchaEnterpriseToken?key=<apiKey>
```

ブラウザのコンソールにはこう出る。

```
@firebase/app-check: AppCheck: 403 error.
Attempts allowed again after 01d:00m:00s (appCheck/initial-throttle)
```

**SDK は 24 時間のバックオフに入る。** 一度踏むと同じブラウザでは翌日まで再試行しない。
試すときは**保存領域を消した別のブラウザ profile**か、別の端末を使うこと。

### 分かっていること

- **localhost でも公開版（`yama-books.github.io`）でも同じく 403。**
- **統合の前（実装が 2 つだった頃）から起きていた。** 実装の寄せ集めが原因ではない。
- reCAPTCHA Enterprise のスクリプト自体は読み込めている（`enterprise.js?render=explicit` が 200）。
  失敗しているのは**その後のトークン交換**である。
- 施行が未適用なので、**いまは実害が出ていない**。同期も統計も動く。
  ただし **Verified の指標は永久に上がらない**ので、このままでは施行へ進めない。

### 疑うべきところ（コンソール作業）

上から順に確認する。**1 つ直すごとに指標を見ること。**

1. **Firebase App Check API が有効か**
   Google Cloud コンソール → API とサービス → `Firebase App Check API` が有効か。
   無効だと交換要求が 403 になる。**ここが一番あやしい。**
2. **reCAPTCHA Enterprise API が有効か / 課金が有効か**
   Enterprise は課金アカウントの紐付けが要る。無料枠内でも紐付け自体は必要である。
3. **API キーの制限**
   `AIzaSyCDOo2YfCxkTWAGpPotCzabWtpJN_kK0Ko` に「API の制限」がかかっていて、
   App Check API が許可一覧から漏れていないか。HTTP リファラ制限も確認する
   （`yama-books.github.io/*` と `localhost` が要る）。
4. **reCAPTCHA Enterprise キーの許可ドメイン**
   `yama-books.github.io` と `localhost` が入っているか。
   記録では 2026-09-06 に追加済みだが、**画面で確かめ直すこと。**
5. **App Check のプロバイダ登録**
   Firebase コンソール → App Check → アプリ `koten-web` に、上のサイトキーが
   reCAPTCHA Enterprise として登録されているか。キーの取り違えが無いか。

### 確かめ方（コードを触らずに）

公開版を開き、開発者ツールのコンソールで下記を実行する。
**`@firebase/app-check` の警告が出なければ交換が通っている。**

```js
// 同期を作る → ネットワークで exchangeRecaptchaEnterpriseToken の応答コードを見る
performance.getEntriesByType('resource')
  .map(e => e.name).filter(n => /firebaseappcheck/.test(n))
```

---

## 4. 正しい順序（**入れ替えないこと**）

`app-config.ts` のコメントにも同じ順序が書いてある。

1. 登録ドメインの確認 …… **済み**
2. クライアント実装 …… **済み**（上の §2）
3. `appCheckEnabled` を真にして公開 …… **済み**（施行はまだ入れない）
4. **← いまここ。** 403 を解き、指標が Verified 側へ移るのを数日見る
5. Verified が十分になってから、規則へ `request.app != null` と施行を**同時に**入れる

**3 と 5 を入れ替えると、施行の瞬間に正規の利用者が全員弾かれる。**
かつてコメントに逆順が書かれていたのを 2026-09-21 に訂正してある。

---

## 5. 施行へ進むときの手順（**403 が解けてからの話**）

1. `firebase/firestore.rules` の `households` の各 `allow` に `request.app != null` を足す
2. `tests/rules` を通す（`cd tests/rules && npm test`。**JDK 21 が要る**）
3. **規則を本番へ反映する**
   ```
   cd D:\dev\koten\firebase
   firebase deploy --only firestore:rules --project koten-fde43
   ```
   **`.github/workflows/rules.yml` は試験を走らせるだけでデプロイしない。**
   「Firestore Rules: success」はテストの成功であって、反映ではない。ここは何度も誤解された。
4. Firebase コンソール → App Check → API → Cloud Firestore を「適用」にする
5. **すぐに同期と統計を実機で確かめる。** 弾かれたら 4 を戻す

---

## 6. 触ってはいけないもの

- `appCheckEnabled` を偽へ戻すこと。戻すと A-5 の前提が崩れ、指標も止まる
- `initializeAppCheck` を別の場所でもう一度呼ぶこと（A-6 が赤くなる）
- 統計側で reCAPTCHA を自前で読むこと（A-7 が赤くなる。バッジと干渉が戻る）
- 端末確認用ビルド（`VITE_QR_SYNC_EMULATOR=1`）で App Check を起こすこと。
  エミュレータは見ないし、Cloudflare の一時ドメインは許可ドメインに入れられない

---

## 7. 環境

- Node 26 … `D:\dev\tools\node-v26.9.0-win-x64`
- JDK 21 … `D:\dev\tools\temurin-21\jdk-21.0.12.1+1`（`tests/rules` に要る）
- 検査 … `npm run typecheck` / `lint` / `test:node` / `test:screen` / `check:eol` /
  `scan:publish` / `check:overflow`、規則は `cd tests/rules && npm test`
- リモートは SSH（`git@github.com:yama-books/koten.git`）。
  HTTPS だと `gh` のトークンが書き込み不可で 403 になる

---

## 8. App Check と関係なく残っている宿題

- 実機確認（カメラ・オフライン復帰・PWA）
- 習熟度 80% の生徒の報告。**歌番号と学習記録が出てから**調べる
