import { appConfig } from '@koten/shared/app-config';

type RecaptchaEnterprise = {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
};

type AppCheckResponse = { token?: unknown };
type Exchange = (url: string, init: RequestInit) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

declare global {
  interface Window { grecaptcha?: { enterprise?: RecaptchaEnterprise }; }
}

function loadRecaptchaEnterprise(siteKey: string): Promise<RecaptchaEnterprise | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve(null);
  if (window.grecaptcha?.enterprise) return Promise.resolve(window.grecaptcha.enterprise);

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.onerror = () => resolve(null);
    script.onload = () => resolve(window.grecaptcha?.enterprise ?? null);
    document.head.append(script);
  });
}

async function recaptchaToken(enterprise: RecaptchaEnterprise, siteKey: string): Promise<string> {
  await new Promise<void>((resolve) => enterprise.ready(resolve));
  return enterprise.execute(siteKey, { action: 'stats' });
}

/**
 * reCAPTCHA Enterprise の応答を App Check トークンへ交換する。
 * 取得不能時は null を返す。統計送信や学習画面を止めない。
 */
export async function getAppCheckToken(deps: {
  load?: (siteKey: string) => Promise<RecaptchaEnterprise | null>;
  exchange?: Exchange;
} = {}): Promise<string | null> {
  try {
    const enterprise = await (deps.load ?? loadRecaptchaEnterprise)(appConfig.appCheckSiteKey);
    if (enterprise === null) return null;
    const recaptchaEnterpriseToken = await recaptchaToken(enterprise, appConfig.appCheckSiteKey);
    const app = `projects/${appConfig.firebase.messagingSenderId}/apps/${appConfig.firebase.appId}`;
    const response = await (deps.exchange ?? fetch)(
      `https://firebaseappcheck.googleapis.com/v1/${app}:exchangeRecaptchaEnterpriseToken?key=${appConfig.firebase.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recaptchaEnterpriseToken, limitedUse: false }),
      },
    );
    if (!response.ok) return null;
    const value = await response.json() as AppCheckResponse;
    return typeof value.token === 'string' && value.token !== '' ? value.token : null;
  } catch {
    return null;
  }
}
