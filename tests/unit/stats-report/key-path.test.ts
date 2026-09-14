import assert from 'node:assert/strict';
import { toolPresent, toolTest } from './guard.ts';

const { resolveKeyPath } = toolPresent ? await import('../../../tools/stats-report/key-path.ts') : { resolveKeyPath: null as never };

toolTest('鍵の置き場: --key で受け取る', () => {
  // PowerShell には `VAR=値 コマンド` が無い。**引数ならどちらのシェルでも同じ 1 行で済む。**
  assert.deepEqual(resolveKeyPath(['node', 'fetch.ts', '--key', 'C:/k/koten.json'], {}), { path: 'C:/k/koten.json', from: '--key' });
});

toolTest('鍵の置き場: 環境変数でも受け取る', () => {
  assert.deepEqual(resolveKeyPath(['node', 'fetch.ts'], { KOTEN_STATS_KEY: '/home/k.json' }), { path: '/home/k.json', from: 'KOTEN_STATS_KEY' });
});

toolTest('鍵の置き場: 引数が環境変数に勝つ', () => {
  // 古い環境変数が残った窓で、指定したはずの鍵が使われない事故を避ける。
  assert.equal(resolveKeyPath(['--key', 'あたらしい'], { KOTEN_STATS_KEY: 'ふるい' }).path, 'あたらしい');
});

toolTest('鍵の置き場: --key のあとが無ければ、黙って環境変数へ落ちない', () => {
  // 落ちると「指定したのに別の鍵で読めた／読めない」になり、原因が分からなくなる。
  assert.throws(() => resolveKeyPath(['--key'], { KOTEN_STATS_KEY: 'ふるい' }), /--key のあとにパスがありません/);
  assert.throws(() => resolveKeyPath(['--key', '--check'], {}), /--key のあとにパスがありません/);
});

toolTest('鍵の置き場: どちらも無ければ null を返す（呼び手が案内を出す）', () => {
  assert.deepEqual(resolveKeyPath(['node', 'fetch.ts'], {}), { path: null, from: null });
  assert.deepEqual(resolveKeyPath([], { KOTEN_STATS_KEY: '' }), { path: null, from: null });
});
