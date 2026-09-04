import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The machine-readable publish allowlist. It lives at the repository root, not under
 * `docs/`, because `docs/` is not published: a list kept there cannot be read from the
 * published tree, and both `scan:publish` and `npm test` fail there on the first run.
 */
export const allowlistPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', 'publish-allowlist.txt');

/** Reads `[name]` sections of a deliberately small line format. Blank and `#` lines are ignored. */
export function parseAllowlist(text: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let current: string[] | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    if (line.startsWith('[') && line.endsWith(']')) { current = sections[line.slice(1, -1)] = []; continue; }
    if (!current) throw new Error(`publish-allowlist.txt: 節の外に行がある: ${line}`);
    current.push(line);
  }
  return sections;
}

export function readAllowlist(file = allowlistPath) {
  const sections = parseAllowlist(readFileSync(file, 'utf8'));
  const sources = sections.sources ?? [];
  const buildExtensions = (sections['build-extensions'] ?? []).map((line) => line.toLowerCase());
  if (sources.length === 0) throw new Error('publish-allowlist.txt: [sources] が無いか空である');
  if (buildExtensions.length === 0) throw new Error('publish-allowlist.txt: [build-extensions] が無いか空である');
  return { sources, buildExtensions };
}
