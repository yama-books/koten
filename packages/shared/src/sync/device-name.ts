/**
 * 端末の呼び名を UA から**大雑把に**推測する（依頼者・2026-09-22）。
 *
 * **機種名は取れない。** ブラウザは「iPhone SE」のような具体名を教えないので、
 * ここで返すのは種類の当て推量である。だから画面では**書き換えられる初期値**として出し、
 * 「端末名（任意・共有先端末からの確認用）」と断る。当たっていなくても直せばよい。
 */
export function guessDeviceName(userAgent: string): string {
  if (/iPad/i.test(userAgent)) return 'iPad';
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/Android/i.test(userAgent)) return /Mobile/i.test(userAgent) ? 'Android スマホ' : 'Android タブレット';
  if (/Macintosh/i.test(userAgent)) return 'Mac';
  if (/Windows/i.test(userAgent)) return 'Windows PC';
  if (/CrOS/i.test(userAgent)) return 'Chromebook';
  return 'この端末';
}

/** 保存してよい長さに整える。空白だけなら名前なしとして扱う。 */
export function normalizeDeviceName(value: string): string | undefined {
  const trimmed = value.trim().slice(0, 24);
  return trimmed === '' ? undefined : trimmed;
}
