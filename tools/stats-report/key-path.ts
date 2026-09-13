/**
 * 鍵の置き場をどこから受け取るか。
 *
 * **環境変数だけにしない。** `KOTEN_STATS_KEY=... node ...` は bash の書式で、
 * PowerShell では「用語 'KOTEN_STATS_KEY=...' は認識されません」で止まる（2026-09-14 に実際に踏んだ）。
 * **`--key <パス>` ならどちらのシェルでも同じ 1 行で済む。**
 *
 * ここを純粋関数にしてあるのは、`fetch.ts` が試験の外にあるからである——
 * **試験しない部分を小さくするのが、試験しない判断の対価である。**
 */
export type KeySource = { path: string; from: '--key' | 'KOTEN_STATS_KEY' } | { path: null; from: null };

export function resolveKeyPath(argv: readonly string[], env: Record<string, string | undefined>): KeySource {
  const flag = argv.indexOf('--key');
  // **引数を環境変数より先に見る。** 古い環境変数が残った窓で、指定したはずの鍵が使われない事故を避ける。
  if (flag >= 0) {
    const value = argv[flag + 1];
    if (value === undefined || value === '' || value.startsWith('--')) throw new Error('--key のあとにパスがありません');
    return { path: value, from: '--key' };
  }
  const fromEnv = env.KOTEN_STATS_KEY;
  if (typeof fromEnv === 'string' && fromEnv !== '') return { path: fromEnv, from: 'KOTEN_STATS_KEY' };
  return { path: null, from: null };
}
