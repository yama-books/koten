import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { StatsPayload } from '../../../packages/shared/src/telemetry/registry.ts';

const telemetryDirectory = join(process.cwd(), 'packages', 'shared', 'src', 'telemetry');

export function telemetrySources(): Array<{ file: string; text: string }> {
  const sources = readdirSync(telemetryDirectory)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({ file, text: readFileSync(join(telemetryDirectory, file), 'utf8') }));
  if (sources.length < 4) throw new Error('Telemetry implementation files are missing');
  return sources;
}

export function payload(): StatsPayload {
  return {
    clientNumber: 'abcdefghijklmnopqrst', localDate: '2026-09-03', product: 'hyakunin', grade: '',
    pageViews: 0, buttonCounts: { start: 0, answer: 0, hint: 0, reveal: 0, history: 0, report: 0 },
    entryCounts: { quick: 0, view: 0, learn: 0, review: 0, exam: 0 }, questionTypeCounts: { blank: 0, author: 0 },
    attemptCount: 0, masteryAvg: 0, masteryMax: 0, masteryDistribution: [0, 0, 0, 0, 0], isOfficial: true,
    appVersion: '1.0.0', dataVersion: 1, masteryRulesVersion: 1, expiresAt: '2027-10-08',
  };
}
