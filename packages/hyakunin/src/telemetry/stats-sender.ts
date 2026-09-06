import { appConfig } from '@koten/shared/app-config';
import { sanitizeStats } from '@koten/shared/telemetry/sanitize';
import { anonymousSignUpRequest, interpretCreateStatus, statsCreateRequest, type HttpRequestSpec } from '@koten/shared/telemetry/transport';
import { getAppCheckToken } from './app-check.ts';

/**
 * 統計送信の**唯一の出口**。ここ以外から統計を外へ出さないこと。
 *
 * 置き場は `ui/` の外である。`tests/screen/no-pressure.test.tsx` が **UI のソースに `fetch(` を出さない**ことを
 * 走査しており、学習の画面から通信が生えないようにしている。**免除せずに場所を移した。**
 *
 * `packages/shared/src/telemetry/**` にも送信を書かない。W-10（telemetry に送信の語を出さない）と
 * T-17（`transport.ts` は送信 API を呼ばない）がそれを守っており、**この設計ならどの釘も外さずに済む。**
 * telemetry は「送る形を作る」までを受け持ち、実際に出すのはこの層である。
 */
export type SendResult = 'sent' | 'retry' | 'blocked';

/** 送信の実体。試験では差し替える。 */
export type HttpSend = (spec: HttpRequestSpec) => Promise<{ status: number; text: string }>;

export function createHttpSend(): HttpSend {
  return async (spec) => {
    const response = await fetch(spec.url, { method: spec.method, headers: spec.headers, body: spec.body });
    return { status: response.status, text: await response.text() };
  };
}

/**
 * 1 日分を 1 件送る。**例外を投げない**——通信の失敗で学習の画面を壊さないため（§11）。
 *
 * `allowed` は `canSendStats()` の結果を渡す。**偽なら 1 度も `send` を呼ばない**——
 * 「送信関数を呼んでいない」ではなく「リクエストが出ていない」ことを試験で見るため、
 * 判定はこの関数の**最初**に置く。
 */
export async function sendStats(input: { payload: unknown; allowed: boolean; send: HttpSend; getToken?: () => Promise<string | null> }): Promise<SendResult> {
  if (!input.allowed) return 'blocked';

  // 送る直前で必ず通す。ここを迂回する経路を作らないこと（発注061 受入条件）。
  const payload = sanitizeStats(input.payload, { strict: false });
  if (payload === null) return 'blocked';

  try {
    const appCheckToken = await (input.getToken ?? getAppCheckToken)();
    const signUp = await input.send(anonymousSignUpRequest(appConfig.firebase));
    if (signUp.status !== 200) return 'retry';
    const idToken: unknown = (JSON.parse(signUp.text) as { idToken?: unknown }).idToken;
    if (typeof idToken !== 'string' || idToken === '') return 'retry';

    const created = await input.send(statsCreateRequest(appConfig.firebase, { payload, idToken, appCheckToken }));
    return interpretCreateStatus(created.status);
  } catch {
    // 圏外・遮断・JSON の破損。すべて再送へ回す。画面にはエラーを出さない。
    return 'retry';
  }
}
