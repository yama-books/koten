// このファイルはFirestoreエミュレータ/実サーバへの接続が前提のため単体テストを持たない。
// Task 4(ルール試験)とTask 9(engine.tsの結合試験、依存注入でこのモジュールを差し替える)が
// この層を経由して検証する。
import { appConfig } from '../app-config.ts';
import type { SyncKind } from './codec.ts';

export type RemoteRecord = { id: string; payload: unknown };

let appPromise: Promise<unknown> | null = null;
let firestorePromise: Promise<unknown> | null = null;

async function getFirestore(): Promise<import('firebase/firestore').Firestore> {
  const [{ initializeApp, getApps }, firestoreModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore'),
  ]);
  if (!appPromise) {
    appPromise = Promise.resolve(getApps()[0] ?? initializeApp(appConfig.firebase));
  }
  const app = await appPromise;
  if (!firestorePromise) firestorePromise = Promise.resolve(firestoreModule.getFirestore(app as never));
  return firestorePromise as Promise<import('firebase/firestore').Firestore>;
}

export async function createRecord(
  houseId: string,
  kind: SyncKind,
  id: string,
  payload: { enc: string },
): Promise<'created' | 'already-exists' | 'error'> {
  const { doc, setDoc } = await import('firebase/firestore');
  const db = await getFirestore();
  try {
    await setDoc(doc(db, 'households', houseId, kind, id), payload);
    return 'created';
  } catch (error) {
    const code = (error as { code?: string }).code;
    return code === 'permission-denied' ? 'already-exists' : 'error';
  }
}

export async function putSettings(houseId: string, payload: { enc: string }): Promise<'ok' | 'error'> {
  const { doc, setDoc } = await import('firebase/firestore');
  const db = await getFirestore();
  try {
    await setDoc(doc(db, 'households', houseId, 'settings', 'current'), payload);
    return 'ok';
  } catch {
    return 'error';
  }
}

export function watchCollection(houseId: string, kind: SyncKind, onRecords: (records: RemoteRecord[]) => void): () => void {
  let unsubscribed = false;
  let unsubscribe: (() => void) | null = null;
  getFirestore().then(async (db) => {
    if (unsubscribed) return;
    const { collection, onSnapshot } = await import('firebase/firestore');
    unsubscribe = onSnapshot(collection(db, 'households', houseId, kind), (snapshot) => {
      onRecords(snapshot.docs.map((docSnap) => ({ id: docSnap.id, payload: docSnap.data() })));
    });
  });
  return () => {
    unsubscribed = true;
    unsubscribe?.();
  };
}

export function watchSettings(houseId: string, onSettings: (payload: unknown | null) => void): () => void {
  let unsubscribed = false;
  let unsubscribe: (() => void) | null = null;
  getFirestore().then(async (db) => {
    if (unsubscribed) return;
    const { doc, onSnapshot } = await import('firebase/firestore');
    unsubscribe = onSnapshot(doc(db, 'households', houseId, 'settings', 'current'), (snapshot) => {
      onSettings(snapshot.exists() ? snapshot.data() : null);
    });
  });
  return () => {
    unsubscribed = true;
    unsubscribe?.();
  };
}
