/**
 * 公開許可リストに載せていない（内部扱いの）conj のデータ（docs/PUBLISH_MANIFEST.md §4.3）。
 *
 * - `adjectival-noun-chj-quotations.json`：CHJ の本文の引用。アプリへの掲載は裁定済み（引用）だが、
 *   ソースファイルとしての再配布は未確認。
 * - `adjectival-noun-example-index-120.json`：CHJ 由来の書誌データ（サンプル ID・文字位置・JapanKnowledge の
 *   リンク。本文は無い）。形容動詞の実行時データ（`ConjAdjvRuntime.load`）の 1 本なので、これが無いと
 *   形容動詞 115 語は出題されない（百人一首の いたづらなり だけが残る）。
 *
 * どちらも**GitHub Pages には配信する**（tools/pages-assemble）が、公開ツリーへは複写しない。
 * したがって公開ツリーでは、これらを前提にする検査を実行できない。
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
export const exampleIndexPath = 'conj/data/adjectival-noun-example-index-120.json';
/** 許可リストに載せず、Pages にだけ置く conj のデータ（リポジトリ直下からの相対パス）。 */
export const heldConjData: readonly string[] = [chjQuotationsPath, exampleIndexPath];

/** 許可リストの表（非公開）がある＝作業リポジトリ。 */
export const isWorkingRepository = existsSync(path.join(root, 'docs', 'PUBLISH_MANIFEST.md'));

/**
 * 内部扱いのデータを前提にした検査を行うか。作業リポジトリでは**常に true**（ファイルが消えていれば、
 * それを読む検査がそのまま落ちる）。公開ツリーでは、ファイルがあるときだけ true。
 */
export function heldDataExpected(repositoryPath: string, conjDir = path.join(root, 'conj')): boolean {
  return isWorkingRepository || existsSync(path.join(conjDir, path.relative('conj', repositoryPath)));
}

/** CHJ の引用（用例本文の半分近く）を前提にした検査を行うか。 */
export function chjQuotationsExpected(conjDir?: string): boolean {
  return heldDataExpected(chjQuotationsPath, conjDir);
}

/** 形容動詞の実行時データ（115 語の出題）を前提にした検査を行うか。 */
export function adjvRuntimeExpected(conjDir?: string): boolean {
  return heldDataExpected(exampleIndexPath, conjDir);
}
