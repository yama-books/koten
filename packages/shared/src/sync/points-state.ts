import type { PointsApp, PointsValue } from './points-projection.ts';
export const POINTS_APPS: PointsApp[] = ['hyakunin', 'vintage-kana', 'conj'];
export type PointsEntry = PointsValue & { stale?: boolean };
export type PointsState = { enabled: boolean; entries: Partial<Record<PointsApp, PointsEntry>> };
/** Memory-only cache scoped to one explicitly selected group. Old requests are
 * discarded on stop/switch; unrelated applications never share a local ledger. */
export function pointsState(own: PointsApp, readOwn: () => Promise<number>, fetch: (code: string, app: PointsApp) => Promise<PointsValue>, changed: (state: PointsState) => void) {
  let code: string | null = null, epoch = 0;
  let entries: PointsState['entries'] = {};
  const emit = () => changed({ enabled: !!code, entries: { ...entries } });
  return {
    select(next: string | null) {
      if (code === next) return;
      code = next; epoch++; entries = {}; emit();
    },
    async refresh(online = true) {
      const generation = epoch, selected = code;
      if (!selected) return;
      const current = () => generation === epoch && selected === code;
      try {
        const points = await readOwn();
        if (!Number.isSafeInteger(points) || points < 0) throw Error();
        if (current()) { entries[own] = { points }; emit(); }
      } catch { if (current()) { entries[own] = { points: null, note: '端末内の記録を確認できません' }; emit(); } }
      await Promise.all(POINTS_APPS.filter(app => app !== own).map(async app => {
        if (!current()) return;
        if (!online) { entries[app] = { ...entries[app], points: entries[app]?.points ?? null, stale: true }; emit(); return; }
        try { const value = await fetch(selected, app); if (current()) { entries[app] = value; emit(); } }
        catch { if (current()) { entries[app] = { ...entries[app], points: entries[app]?.points ?? null, stale: true }; emit(); } }
      }));
    },
    stop() { code = null; epoch++; entries = {}; emit(); },
  };
}
