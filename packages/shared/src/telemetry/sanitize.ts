import { isStatsPayload, STATS_KEYS, type StatsPayload } from './registry.ts';

export function sanitizeStats(value: unknown, options: { strict: boolean }): StatsPayload | null {
  if (!isStatsPayload(value)) {
    if (options.strict) throw new Error('Invalid statistics payload');
    return null;
  }

  return Object.fromEntries(STATS_KEYS.map((key) => [key, value[key]])) as StatsPayload;
}
