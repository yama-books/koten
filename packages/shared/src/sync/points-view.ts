import { fetchPoints } from './points-client.ts';
import { POINTS_APPS, pointsState, type PointsState } from './points-state.ts';
import type { PointsApp } from './points-projection.ts';
const names = { hyakunin: '百人一首', 'vintage-kana': '変体仮名', conj: '活用' };
const format = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export function mountPoints(target: HTMLElement, own: PointsApp, readOwn: () => Promise<number>, isCurrent: () => Promise<boolean> = async () => true) {
  let disposed = false;
  const style = document.createElement('style');
  style.textContent = '.koten-points{font:inherit;font-size:13px;line-height:1.65;margin:12px 0 18px;padding:12px 16px;border:1px solid var(--line,#d6cfc5);border-radius:12px;min-width:0;text-align:left;color:var(--ink,inherit)}.koten-points[hidden]{display:none}.koten-points p{margin:0}.koten-points strong{font-size:1.3em;font-variant-numeric:tabular-nums}.koten-points dl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:3px 12px;margin:8px 0}.koten-points dt,.koten-points dd{margin:0;overflow-wrap:anywhere}.koten-points dd{text-align:right;font-variant-numeric:tabular-nums}.koten-points small{display:block;color:var(--muted,#666);font-size:11px}';
  document.head.append(style); target.classList.add('koten-points'); target.setAttribute('aria-label', '同期グループのポイント');
  function render(state: PointsState) {
    if (disposed) return;
    target.hidden = !state.enabled;
    target.replaceChildren();
    if (!state.enabled) return;
    const known = POINTS_APPS.filter(app => state.entries[app]?.points != null);
    const p = document.createElement('p');
    p.textContent = known.length === 3 ? '合計ポイント ' : '確認できた合計 ';
    const total = document.createElement('strong');
    const sum = known.reduce((n, app) => n + state.entries[app]!.points!, 0);
    total.textContent = known.length && Number.isSafeInteger(sum) ? format(sum) : '未確認';
    total.dataset.pointsTotal = ''; p.append(total); target.append(p);
    const dl = document.createElement('dl');
    for (const app of POINTS_APPS) {
      const entry = state.entries[app], dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = names[app];
      dd.dataset.pointsApp = app;
      dd.textContent = entry?.points == null ? '未確認' : format(entry.points) + (entry.stale ? '（前回取得）' : '');
      if (entry?.note) { const note = document.createElement('small'); note.textContent = entry.note; dd.append(note); }
      dl.append(dt, dd);
    }
    target.append(dl);
    const note = document.createElement('small');
    note.textContent = 'このアプリは端末内、ほかは同じ同期グループで確認できた記録です。' + (POINTS_APPS.some(app => state.entries[app]?.stale) ? ' オフライン・取得失敗時は前回の値を表示します。' : '');
    target.append(note);
  }
  const state = pointsState(own, readOwn, fetchPoints, render);
  let busy = false, again = false;
  const refresh = async () => {
    if (disposed) return;
    if (busy) { again = true; return; }
    busy = true;
    try { do { again = false; const current = await isCurrent(); if (disposed) return; if (!current) state.stop(); else await state.refresh(navigator.onLine); } while (again && !disposed); }
    catch { state.stop(); }
    finally { busy = false; }
  };
  const update = () => { void refresh(); };
  const events = ['koten:record-saved', 'koten:remote-records', 'online', 'offline', 'focus', 'storage'];
  for (const event of events) window.addEventListener(event, update);
  const timer = window.setInterval(() => { if (!document.hidden) update(); }, 60000);
  render({ enabled: false, entries: {} });
  return {
    select(code: string | null) { state.select(code); update(); },
    refresh: update,
    dispose() { disposed = true; state.stop(); window.clearInterval(timer); for (const event of events) window.removeEventListener(event, update); style.remove(); },
  };
}
