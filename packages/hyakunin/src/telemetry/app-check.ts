import { appCheckToken } from '@koten/shared/app-check';

/**
 * 統計送信が `X-Firebase-AppCheck` に載せるトークン。取得不能時は `null` を返し、
 * 統計送信も学習画面も止めない。
 *
 * **2026-09-21 に自前の reCAPTCHA 実装をやめ、同期と同じ App Check へ寄せた。**
 * 以前はここで reCAPTCHA Enterprise を `render=<サイトキー>` で読み込み、
 * App Check の交換 API を自分で叩いていた。同期側（Firebase SDK）は
 * 同じサイトキーを `render=explicit` で読むため、**先に読んだ方が後の方を壊していた**——
 *   - SDK が先: ここの `enterprise.execute(siteKey, …)` が失敗して常に `null`。
 *     施行（enforce）を入れると、同期している端末からの統計が全部拒否される。
 *   - ここが先: 右下に reCAPTCHA のバッジが出る。
 * 寄せた結果、読み込みは `render=explicit` の 1 回だけになり、どちらも起きない。
 *
 * 差し替え可能にしてあるのは試験のためで、本番はこの既定のまま使う。
 */
export async function getAppCheckToken(deps: { token?: () => Promise<string | null> } = {}): Promise<string | null> {
  // **ここでも受け止める。** 既定の `appCheckToken` は自分で受け止めるが、
  // 呼び出し側から見た約束は「取れなければ null」である。約束を実装1つに預けない。
  try { return await (deps.token ?? appCheckToken)(); }
  catch { return null; }
}
