/**
 * 公開許可リストで「条件つき」として保留している conj のデータ（docs/PUBLISH_MANIFEST.md §4.3）。
 *
 * `conj/data/adjectival-noun-chj-quotations.json`（CHJ の引用）は、アプリへの掲載は裁定済み（引用）だが、
 * ソースファイルとしての再配布は未確認なので、公開ツリーへは複写しない。**GitHub Pages には配信する**
 * （tools/pages-assemble）。したがって公開ツリーでは、このファイルを読む検査を実行できない。
 *
 * 作業リポジトリかどうかは `docs/PUBLISH_MANIFEST.md` の有無で決める。docs/ は公開しない
 * （PUBLISH_MANIFEST §6）ので、公開ツリーには決して現れない。環境変数にしないのは、付け忘れると
 * 作業リポジトリの検査が黙って弱まるからである——この方式では、弱まるのは docs/ が無いときだけ。
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const chjQuotationsPath = 'conj/data/adjectival-noun-chj-quotations.json';

/** 許可リストの表（非公開）がある＝作業リポジトリ。 */
export const isWorkingRepository = existsSync(path.join(root, 'docs', 'PUBLISH_MANIFEST.md'));

/**
 * CHJ の引用を前提にした検査を行うか。作業リポジトリでは**常に true**（ファイルが消えていれば、
 * それを読む検査がそのまま落ちる）。公開ツリーでは、ファイルがあるときだけ true。
 */
export function chjQuotationsExpected(conjDir = path.join(root, 'conj')): boolean {
  return isWorkingRepository || existsSync(path.join(conjDir, 'data', path.basename(chjQuotationsPath)));
}
