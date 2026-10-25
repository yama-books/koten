import { computePoints } from '../domain/points/compute.ts';
import { isEvent } from '../domain/event.ts';
import type { AppRecord } from './app-engine.ts';
import '../../../../conj/record-transfer.js';
import '../../../../vintage-kana/record-transfer.js';
import '../../../../vintage-kana/points.js';

export type PointsApp = 'hyakunin' | 'vintage-kana' | 'conj';
export type PointsValue = { points: number | null; note?: string };
type Ledger = { version: number; baselineId: string; baseline: { points: number }; events: unknown[]; backups: unknown[] };
const apis = (typeof window === 'undefined' ? globalThis : window) as unknown as {
  ConjRecordTransfer: { validateLedger: (v: unknown) => Ledger; project: (v: Ledger) => { points: number } };
  VintageKanaRecordTransfer: { decodeArchive: (text: string) => { learningEvents: unknown[]; decipherHistory: unknown[] } };
  VintageKanaPoints: { total: (learning: unknown[], decipher: unknown[]) => number };
};
function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + stable(v)).join(',') + '}';
  return JSON.stringify(value);
}
/** A repeated record contributes once. Conflicting IDs never silently pick a total. */
function unique<T>(values: readonly T[], key: (v: T) => string): T[] {
  const found = new Map<string, T>();
  for (const value of values) {
    const id = key(value);
    if (found.has(id) && stable(found.get(id)) !== stable(value)) throw Error('ポイントの記録IDが競合しています。');
    found.set(id, value);
  }
  return [...found.values()];
}
function checked(points: number): PointsValue {
  if (!Number.isSafeInteger(points) || points < 0) throw Error('ポイントを確認できません。');
  return { points };
}
export function hyakuninPoints(values: unknown[]): PointsValue {
  if (!values.length) return { points: null };
  if (!values.every(isEvent)) throw Error('百人一首の記録形式が違います。');
  return checked(computePoints(unique(values, e => e.eventId)).total);
}
export function appPoints(app: 'conj' | 'vintage-kana', values: AppRecord[]): PointsValue {
  const records = unique(values, r => r.type + ':' + r.id);
  if (!records.length) return { points: null };
  if (app === 'vintage-kana') {
    if (records.some(r => !['learning', 'decipher'].includes(r.type) || (r.value as { id?: string })?.id !== r.id)) throw Error('変体仮名の記録形式が違います。');
    const archive = apis.VintageKanaRecordTransfer.decodeArchive(JSON.stringify({ app: 'vintage-kana-record', exportVersion: 1, decipherLevel: 1,
      learningEvents: records.filter(r => r.type === 'learning').map(r => r.value), decipherHistory: records.filter(r => r.type === 'decipher').map(r => r.value) }));
    return checked(apis.VintageKanaPoints.total(archive.learningEvents, archive.decipherHistory));
  }
  if (records.some(r => !['baseline', 'answer'].includes(r.type) || (r.type === 'answer' && (r.value as { id?: string })?.id !== r.id))) throw Error('活用の記録形式が違います。');
  const baselines = records.filter(r => r.type === 'baseline').sort((a, b) => a.id.localeCompare(b.id));
  if (!baselines.length) throw Error('活用の基準記録がありません。');
  // Validate all records, including preserved alternative baselines. Never add
  // backups to the primary total or infer which legacy history belongs first.
  const ledger = apis.ConjRecordTransfer.validateLedger({ version: 1, baselineId: baselines[0]!.id, baseline: baselines[0]!.value,
    backups: baselines.slice(1).map(r => ({ id: r.id, stats: r.value })), events: records.filter(r => r.type === 'answer').map(r => r.value) });
  const withPoints = baselines.filter(r => (r.value as { points: number }).points > 0);
  if (withPoints.length > 1) return { points: null, note: '旧累計の基準を確認してください' };
  const primary = withPoints[0] ?? baselines[0]!;
  return checked(apis.ConjRecordTransfer.project({ ...ledger, baselineId: primary.id, baseline: primary.value as Ledger['baseline'] }).points);
}
