/// <reference types="vite/client" />
// App Check の唯一の持ち場。**同期と統計送信の両方がここから受け取る。**
//
// 以前は2つ実装があった——同期は Firebase SDK、統計は自前で reCAPTCHA を読み、
// App Check の交換 API を直に叩いていた。両方が同じサイトキーの
// `enterprise.js` を、**違う読み込み方**（`render=explicit` と `render=<サイトキー>`）で
// 要求するため、先に読んだ方が後の方を壊す：
//   - SDK が先だと、統計側の `enterprise.execute(siteKey, …)` が失敗して null になる。
//     施行（enforce）を入れると、同期している端末からの統計が全部拒否される。
//   - 統計側が先だと、右下に reCAPTCHA のバッジが出る。
// 1 か所へ寄せると、読み込みは `render=explicit` の 1 回だけになり、両方とも直る。
import { appConfig } from './app-config.ts';

export type AppCheckPlan = 'start' | 'skip-disabled' | 'skip-emulator';

/** 端末確認用ビルド（同一 origin のエミュレータへ繋ぐ版）かどうか。 */
export const devicePreview = typeof import.meta.env !== 'undefined' && import.meta.env.VITE_QR_SYNC_EMULATOR === '1';

/**
 * App Check を起こすかどうかだけを決める。**実際の初期化から切り離してあるのは、
 * ここだけが試験できるからである**（初期化は実サーバ接続が前提で試験を持たない）。
 *
 * - `skip-emulator`: エミュレータは App Check を見ないし、Cloudflare の一時ドメインは
 *   reCAPTCHA の許可ドメインに入れられない（起動のたびに変わる）。**入れてはいけない。**
 * - `skip-disabled`: `appCheckEnabled` が偽の間は reCAPTCHA を1度も読み込まない。
 */
export function appCheckPlan(options: { enabled?: boolean; devicePreview: boolean }): AppCheckPlan {
  if (options.devicePreview) return 'skip-emulator';
  return (options.enabled ?? appConfig.appCheckEnabled) ? 'start' : 'skip-disabled';
}

let appPromise: Promise<unknown> | null = null;
let appCheckPromise: Promise<unknown | null> | null = null;

/**
 * Firebase app をこの端末で 1 つだけ作る。**同期も統計もこれを共有する。**
 * 端末確認用ビルドだけは別プロジェクトのエミュレータへ向ける。
 */
export function firebaseApp(): Promise<unknown> {
  if (!appPromise) {
    appPromise = (async () => {
      const { initializeApp, getApps } = await import('firebase/app');
      return getApps()[0] ?? initializeApp(devicePreview ? { ...appConfig.firebase, projectId: 'demo-koten-device' } : appConfig.firebase);
    })();
  }
  return appPromise;
}

/**
 * App Check を 1 度だけ起こす。起こさない決まりのときは `null` を返す。
 * **失敗しても投げない**——施行が入るまで規則はトークンを見ないので、転んでも学習は続く。
 */
function appCheck(): Promise<unknown | null> {
  if (!appCheckPromise) {
    appCheckPromise = (async () => {
      if (appCheckPlan({ devicePreview }) !== 'start') return null;
      try {
        const [{ initializeAppCheck, ReCaptchaEnterpriseProvider }, app] = await Promise.all([
          import('firebase/app-check'),
          firebaseApp(),
        ]);
        return initializeAppCheck(app as never, {
          provider: new ReCaptchaEnterpriseProvider(appConfig.appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch { return null; }
    })();
  }
  return appCheckPromise;
}

/**
 * Firestore を触る前に呼ぶ。**Firestore より先でなければトークンが乗らない。**
 * SDK は初期化した app を覚えているので、同期側は戻り値を使わない。
 */
export async function startAppCheck(): Promise<void> {
  await appCheck();
}

/**
 * 統計送信が `X-Firebase-AppCheck` に載せるトークン。取れなければ `null`。
 * **取れなくても統計は送る**——App Check の失敗で学習も送信も止めない。
 */
export async function appCheckToken(): Promise<string | null> {
  try {
    const instance = await appCheck();
    if (instance === null) return null;
    const { getToken } = await import('firebase/app-check');
    const result = await getToken(instance as never);
    return typeof result.token === 'string' && result.token !== '' ? result.token : null;
  } catch { return null; }
}
