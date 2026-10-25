import { useEffect, useRef } from 'preact/hooks';
import { mountPoints } from '@koten/shared/sync/points-view';
import type { ApplicationPort } from '../adapters/indexeddb-port.ts';
import { computePoints } from '@koten/shared/domain/points/compute';

export function GroupPoints({ port, code }: { port?: ApplicationPort; code?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !port) return;
    const view = mountPoints(ref.current, 'hyakunin', async () => computePoints(await port.listEvents()).total, async () => {
      const settings = await port.loadSettings();
      return !!settings?.syncEnabled && settings.syncCode === code;
    });
    view.select(code ?? null);
    return () => view.dispose();
  }, [port, code]);
  return <div ref={ref} data-koten-points hidden />;
}
