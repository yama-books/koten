import { appConfig } from '../app-config.ts';

export type AppCheckPlan = 'start' | 'skip-disabled' | 'skip-emulator';

/**
 * App Check を起こすかどうかだけを決める。**実際の初期化から切り離してあるのは、
 * ここだけが試験できるからである**（`client.ts` は実サーバ接続が前提で試験を持たない）。
 *
 * - `skip-emulator`: 端末確認用ビルドは同一 origin のエミュレータへ繋ぐ。
 *   エミュレータは App Check を見ないし、Cloudflare の一時ドメインは reCAPTCHA の
 *   許可ドメインに入れられない（起動のたびに変わる）。**入れてはいけない。**
 * - `skip-disabled`: `appCheckEnabled` が偽の間は reCAPTCHA を1度も読み込まない。
 *   右下のバッジも Google への往復も出さない。
 */
export function appCheckPlan(options: { enabled?: boolean; devicePreview: boolean }): AppCheckPlan {
  if (options.devicePreview) return 'skip-emulator';
  return (options.enabled ?? appConfig.appCheckEnabled) ? 'start' : 'skip-disabled';
}
