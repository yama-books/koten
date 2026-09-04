import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { StatsPayload } from '../../../packages/shared/src/telemetry/registry.ts';

const telemetryDirectory = join(process.cwd(), 'packages', 'shared', 'src', 'telemetry');
export const TELEMETRY_FILES = ['client-number.ts', 'queue.ts', 'registry.ts', 'sanitize.ts'] as const;
export const TELEMETRY_EXEMPT_FILES = ['transport.ts'] as const;

export function telemetrySources(): Array<{ file: string; text: string }> {
  return TELEMETRY_FILES.map((file) => ({ file, text: readFileSync(join(telemetryDirectory, file), 'utf8') }));
}
export function telemetryExemptSources(): Array<{ file: string; text: string }> { return TELEMETRY_EXEMPT_FILES.map((file) => ({ file, text: readFileSync(join(telemetryDirectory, file), 'utf8') })); }

export function telemetryDirectoryFiles(): string[] {
  return readdirSync(telemetryDirectory).filter((file) => file.endsWith('.ts'));
}

export function payload(): StatsPayload {
  return {
    clientNumber: 'k3m9qz7x2w5b8n4v6t1r', localDate: '2026-09-03', product: 'hyakunin', grade: '',
    pageViews: 7, buttonCounts: { start: 3, answer: 12, hint: 1, reveal: 4, history: 2, report: 0 },
    entryCounts: { quick: 5, view: 1, learn: 8, review: 2, exam: 0 }, questionTypeCounts: { blank: 9, author: 6 },
    attemptCount: 15, masteryAvg: 62.5, masteryMax: 100, masteryDistribution: [4, 3, 2, 1, 5], isOfficial: true,
    appVersion: '1.0.0', dataVersion: 3, masteryRulesVersion: 2, expiresAt: '2027-10-08',
  };
}
