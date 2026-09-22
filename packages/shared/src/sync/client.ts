/// <reference types="vite/client" />
// このファイルはFirestoreエミュレータ/実サーバへの接続が前提のため単体テストを持たない。
// Task 4(ルール試験)とTask 9(engine.tsの結合試験、依存注入でこのモジュールを差し替える)が
// この層を経由して検証する。
import { appConfig } from '../app-config.ts';
import { firebaseApp, startAppCheck } from '../app-check.ts';
import type { SyncKind } from './codec.ts';

export type RemoteRecord = { id: string; payload: unknown };

let firestorePromise: Promise<unknown> | null = null;
const devicePreview = typeof import.meta.env !== 'undefined' && import.meta.env.VITE_QR_SYNC_EMULATOR === '1';

async function getFirestore(): Promise<import('firebase/firestore').Firestore> {
  // **App Check は Firestore より先に起こす。** あとからでは既に張った接続にトークンが乗らない。
  const [firestoreModule, app] = await Promise.all([
    import('firebase/firestore'),
    firebaseApp(),
  ]);
  await startAppCheck();
  if (!firestorePromise) firestorePromise = Promise.resolve(devicePreview
    ? firestoreModule.initializeFirestore(app as never, { host: window.location.host, ssl: window.location.protocol === 'https:', experimentalForceLongPolling: true })
    : firestoreModule.getFirestore(app as never));
  return firestorePromise as Promise<import('firebase/firestore').Firestore>;
}

export async function createRecord(
  houseId: string,
  kind: SyncKind,
  id: string,
  payload: { enc: string },
): Promise<'created' | 'already-exists' | 'error'> {
  const { doc, getDoc, setDoc } = await import('firebase/firestore');
  const db = await getFirestore();
  const reference = doc(db, 'households', houseId, kind, id);
  try {
    await setDoc(reference, payload);
    return 'created';
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'permission-denied') {
      try { if ((await getDoc(reference)).exists()) return 'already-exists'; }
      catch { /* App Check or network failure: keep the item queued. */ }
    }
    return 'error';
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

export async function readSettings(houseId: string): Promise<unknown | null> {
  const { doc, getDoc } = await import('firebase/firestore');
  const db = await getFirestore();
  const snapshot = await getDoc(doc(db, 'households', houseId, 'settings', 'current'));
  return snapshot.exists() ? snapshot.data() : null;
}

export function watchCollection(houseId: string, kind: SyncKind, onRecords: (records: RemoteRecord[]) => void, onError: (error: unknown) => void = () => {}): () => void {
  let unsubscribed = false;
  let unsubscribe: (() => void) | null = null;
  void getFirestore().then(async (db) => {
    if (unsubscribed) return;
    const { collection, onSnapshot } = await import('firebase/firestore');
    if (unsubscribed) return;
    unsubscribe = onSnapshot(collection(db, 'households', houseId, kind), (snapshot) => {
      onRecords(snapshot.docChanges().filter((change) => change.type !== 'removed').map(({ doc: docSnap }) => ({ id: docSnap.id, payload: docSnap.data() })));
    }, onError);
  }).catch(onError);
  return () => {
    unsubscribed = true;
    unsubscribe?.();
  };
}

export function watchSettings(houseId: string, onSettings: (payload: unknown | null) => void, onError: (error: unknown) => void = () => {}): () => void {
  let unsubscribed = false;
  let unsubscribe: (() => void) | null = null;
  void getFirestore().then(async (db) => {
    if (unsubscribed) return;
    const { doc, onSnapshot } = await import('firebase/firestore');
    if (unsubscribed) return;
    unsubscribe = onSnapshot(doc(db, 'households', houseId, 'settings', 'current'), (snapshot) => {
      onSettings(snapshot.exists() ? snapshot.data() : null);
    }, onError);
  }).catch(onError);
  return () => {
    unsubscribed = true;
    unsubscribe?.();
  };
}
