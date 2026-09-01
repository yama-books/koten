export type FallbackResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'capacity-exceeded' | 'write-failed'; value: T; shouldExport: boolean; error: unknown };

export function writeFallback<T>(storage: Storage | undefined, key: string, value: T): FallbackResult<T> {
  const fullKey = `koten:${key}`;
  try {
    if (!storage) throw new Error('LocalStorage is unavailable');
    storage.setItem(fullKey, JSON.stringify(value));
    return { ok: true, value };
  } catch (error) {
    const quota = error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22);
    return { ok: false, reason: quota ? 'capacity-exceeded' : 'write-failed', value, shouldExport: quota, error };
  }
}

export function readFallback<T>(storage: Storage | undefined, key: string): T | undefined {
  try {
    const raw = storage?.getItem(`koten:${key}`);
    return raw === null || raw === undefined ? undefined : JSON.parse(raw) as T;
  } catch { return undefined; }
}
