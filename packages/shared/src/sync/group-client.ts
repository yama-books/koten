import { firebaseApp, startAppCheck } from '../app-check.ts';
import { decryptField, encryptField, houseIdFor, isCiphertext, normalizeCode } from './crypto.ts';
import { isPairingCode } from './pairing.ts';
import { readSettings, putSettings, getFirestore } from './client.ts';
import type { AppId, AppRemote } from './app-engine.ts';

let connection: Promise<{ db: import('firebase/firestore').Firestore; uid: string }> | null = null;
let authEmulatorConfigured = false;
async function connect() {
  if (!connection) connection = (async () => {
    const [{ getAuth, signInAnonymously, connectAuthEmulator }, app] = await Promise.all([import('firebase/auth'), firebaseApp()]);
    await startAppCheck();
    const auth = getAuth(app as never);
    const emulator = import.meta.env?.VITE_APP007_EMULATOR === '1';
    if (emulator && !authEmulatorConfigured) { connectAuthEmulator(auth, 'http://127.0.0.1:9098', { disableWarnings: true }); authEmulatorConfigured = true; }
    await auth.authStateReady();
    const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
    const db = await getFirestore();
    return { db, uid: user.uid };
  })().catch(error => { connection = null; throw error; });
  return connection;
}
/** A separate domain-derived invitation capability. Unlike the legacy houseId,
 * this path is never included in exported records or public diagnostics. Knowing
 * the invitation grants membership; anonymous UID alone does not. No directory
 * listing is permitted by the rules. The invitation cannot revoke prior members. */
export async function groupCapability(code: string): Promise<string> {
  if (!isPairingCode(code)) throw new Error('共有コードの形式が違います。');
  return houseIdFor(`koten.group-capability.v1|${normalizeCode(code)}`);
}
async function groupRef(code: string) {
  const [{ db, uid }, { doc }, capability] = await Promise.all([connect(), import('firebase/firestore'), groupCapability(code)]);
  return { db, uid, ref: doc(db, 'sharedGroups', capability), capability };
}
async function groupMarker(code: string): Promise<{ version: number; legacyHyakunin?: boolean } | null> {
  const [{ ref }, { getDocFromServer }] = await Promise.all([groupRef(code), import('firebase/firestore')]);
  const snapshot = await getDocFromServer(ref);
  if (!snapshot.exists()) return null;
  const enc = snapshot.data().enc;
  if (!isCiphertext(enc)) throw new Error('同期グループを検証できません。');
  const marker = await decryptField('koten:group:v1', code, enc) as { version: number; legacyHyakunin?: boolean };
  if (marker?.version !== 1) throw new Error('対応していない同期グループです。');
  return marker;
}
async function validGroup(code: string): Promise<boolean> { return !!await groupMarker(code); }
export async function hyakuninGroupMode(code: string): Promise<'shared-v1' | 'legacy'> {
  const marker = await groupMarker(code);
  if (marker) return marker.legacyHyakunin ? 'legacy' : 'shared-v1';
  if (await verifyGroup(code)) return 'legacy';
  throw new Error('共有グループを確認できません。');
}
export async function verifyGroup(code: string): Promise<boolean> {
  if (await validGroup(code)) return true;
  const legacy = await readSettings(await houseIdFor(code)) as { enc?: unknown } | null;
  if (!isCiphertext(legacy?.enc)) return false;
  const preferences = await decryptField('settings', code, legacy.enc) as Record<string, unknown>;
  return !!preferences && ['no-ruby','historical','modern'].includes(String(preferences.reading));
}
export async function createGroup(code: string, legacyJoin = false): Promise<void> {
  const [{ db, uid, ref, capability }, { doc, getDocFromServer, setDoc }] = await Promise.all([groupRef(code), import('firebase/firestore')]);
  if (!await validGroup(code)) {
    if (legacyJoin && !await verifyGroup(code)) throw new Error('共有グループが見つかりません。');
    const enc = await encryptField('koten:group:v1', code, { version: 1, legacyHyakunin: legacyJoin });
    try { await setDoc(ref, { version: 1, enc }); }
    catch { if (!await validGroup(code)) throw new Error('共有グループを保存できませんでした。'); }
  }
  const member = doc(db, 'sharedGroups', capability, 'members', uid);
  if (!(await getDocFromServer(member)).exists()) await setDoc(member, { version: 1 });
  // Seed only absent legacy preferences. Old hyakunin clients keep their records
  // and can use an invitation issued by either independent static application.
  const houseId = await houseIdFor(code);
  if (!await readSettings(houseId)) {
    const enc = await encryptField('settings', code, { reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false });
    if (await putSettings(houseId, { enc }) !== 'ok') throw new Error('百人一首との互換設定を作れませんでした。');
  }
}
export async function joinGroup(code: string): Promise<void> { await createGroup(code, true); }
/** Server-only reads keep an absent/offline app distinct from a zero balance.
 * Existing group membership and encryption apply; no aggregate is published. */
export async function groupHyakuninEvents(code: string): Promise<unknown[]> {
  const [{ db, capability }, f, mode] = await Promise.all([groupRef(code), import('firebase/firestore'), hyakuninGroupMode(code)]);
  const records = mode === 'shared-v1' ? f.collection(db, 'sharedGroups', capability, 'apps', 'hyakunin', 'events') : f.collection(db, 'households', await houseIdFor(code), 'events');
  const events: unknown[] = [];
  let cursor: import('firebase/firestore').QueryDocumentSnapshot | undefined;
  for (;;) {
    const page = await f.getDocsFromServer(f.query(records, f.orderBy(f.documentId()), ...(cursor ? [f.startAfter(cursor)] : []), f.limit(200)));
    for (const doc of page.docs) {
      const enc = doc.data().enc;
      if (!isCiphertext(enc)) throw Error('百人一首の暗号形式が違います。');
      const event = await decryptField('events', code, enc) as { eventId?: string };
      if (event?.eventId !== doc.id) throw Error('百人一首の記録IDが一致しません。');
      events.push(event);
    }
    if (events.length > 50000) throw Error('集計件数が上限を超えました。');
    if (page.size < 200) return events;
    cursor = page.docs.at(-1);
  }
}
export async function appRemote(code: string, app: AppId): Promise<AppRemote> {
  const { db, capability } = await groupRef(code);
  const f = await import('firebase/firestore');
  const records = f.collection(db, 'sharedGroups', capability, 'apps', app, 'records');
  const seen = new Map<string, { id: string; enc: string }>();
  let cursor: import('firebase/firestore').QueryDocumentSnapshot | undefined;
  return {
    async list() {
      for (;;) {
        const q = f.query(records, f.orderBy('createdAt'), f.orderBy(f.documentId()), ...(cursor ? [f.startAfter(cursor)] : []), f.limit(200));
        const page = await f.getDocsFromServer(q);
        for (const doc of page.docs) seen.set(doc.id, { id: doc.id, enc: doc.data().enc });
        if (seen.size > 50000) throw new Error('同期件数が上限を超えました。記録は端末に保持しています。');
        if (page.size > 0) cursor = page.docs.at(-1);
        if (page.size < 200) return [...seen.values()];
      }
    },
    async put(id, enc) {
      const target = f.doc(records, id);
      try { await f.setDoc(target, { enc, createdAt: f.serverTimestamp() }); }
      catch (error) {
        // Another device may have uploaded the same immutable record. Validate
        // its plaintext before treating a denied update as acknowledged.
        const old = await f.getDocFromServer(target);
        if (!old.exists()) throw error;
        const aad = `app:${app}:${id}`;
        if (JSON.stringify(await decryptField(aad, code, old.data().enc)) !== JSON.stringify(await decryptField(aad, code, enc))) throw new Error('同期IDの内容が競合しました。');
      }
    },
  };
}
