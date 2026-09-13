import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

/**
 * 統計報告ツールは**公開ツリーに無い**（`publish-allowlist.txt` に載せていない）。
 * ところが `tests/**` は公開される。素直に import すると**公開側の CI が壊れる。**
 * `tools/publish-transfer` の試験と同じ守り方である。
 */
export const toolPresent = existsSync(join(root, 'tools', 'stats-report', 'aggregate.ts'));

/**
 * `docs/` も公開の許可リストに無い。**在ることが「ここは作業用リポジトリである」の印になる。**
 * この印が要るのは、上の守りが**赤ではなく skip で失敗する**からである——
 * 置き場を変えたら試験が全部飛び、緑のまま何も検査しなくなる。
 */
export const workRepository = existsSync(join(root, 'docs'));

export const toolTest = toolPresent ? test : test.skip;
