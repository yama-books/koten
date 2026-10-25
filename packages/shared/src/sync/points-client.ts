import { appRemote, groupHyakuninEvents, joinGroup } from './group-client.ts';
import { readAppRecords } from './app-engine.ts';
import { appPoints, hyakuninPoints, type PointsApp, type PointsValue } from './points-projection.ts';

export async function fetchPoints(code: string, app: PointsApp): Promise<PointsValue> {
  // Join only an explicitly selected invitation, using the same membership route
  // as record sync. This also supports existing legacy hyakunin invitations.
  await joinGroup(code);
  return app === 'hyakunin' ? hyakuninPoints(await groupHyakuninEvents(code))
    : appPoints(app, await readAppRecords(app, code, await appRemote(code, app)));
}
