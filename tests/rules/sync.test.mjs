import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, setLogLevel } from 'firebase/firestore';

setLogLevel('silent');

const projectId = 'demo-koten-rules';
let env;
const houseId = 'a'.repeat(64);
const otherHouseId = 'b'.repeat(64);
const db = () => env.authenticatedContext('client').firestore();
const cipher = (n = 1) => `enc:${'A'.repeat(n)}`;

before(async () => { env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8088, rules: (await fs.readFile('../../firebase/firestore.rules', 'utf8')) } }); });
beforeEach(async () => { await env.clearFirestore(); });
after(async () => { await env.cleanup(); });

test('S-1 creating an event document with a ciphertext payload succeeds', async () =>
  assertSucceeds(setDoc(doc(db(), 'households', houseId, 'events', 'evt-1'), { enc: cipher() })));

test('S-2 creating a session/report document with a ciphertext payload succeeds', async () => {
  await assertSucceeds(setDoc(doc(db(), 'households', houseId, 'sessions', 's-1'), { enc: cipher() }));
  await assertSucceeds(setDoc(doc(db(), 'households', houseId, 'reports', 'r-1'), { enc: cipher() }));
});

test('S-3 creating with a non-ciphertext payload is rejected', async () =>
  assertFails(setDoc(doc(db(), 'households', houseId, 'events', 'evt-2'), { enc: 'plain-text' })));

test('S-4 creating with extra fields is rejected', async () =>
  assertFails(setDoc(doc(db(), 'households', houseId, 'events', 'evt-3'), { enc: cipher(), extra: 1 })));

test('S-5 overwriting an existing record document is rejected (create only)', async () => {
  await assertSucceeds(setDoc(doc(db(), 'households', houseId, 'events', 'evt-4'), { enc: cipher() }));
  await assertFails(setDoc(doc(db(), 'households', houseId, 'events', 'evt-4'), { enc: cipher(2) }));
});

test('S-6 event update and delete are rejected; session completion update succeeds', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), 'households', houseId, 'events', 'evt-5'), { enc: cipher() }));
  await assertFails(updateDoc(doc(db(), 'households', houseId, 'events', 'evt-5'), { enc: cipher(2) }));
  await assertFails(deleteDoc(doc(db(), 'households', houseId, 'events', 'evt-5')));
  await assertSucceeds(setDoc(doc(db(), 'households', houseId, 'sessions', 's-complete'), { enc: cipher() }));
  await assertSucceeds(setDoc(doc(db(), 'households', houseId, 'sessions', 's-complete'), { enc: cipher(2) }));
});

test('S-7 get and list on a record collection succeed', async () => {
  await assertSucceeds(setDoc(doc(db(), 'households', houseId, 'events', 'evt-6'), { enc: cipher() }));
  await assertSucceeds(getDoc(doc(db(), 'households', houseId, 'events', 'evt-6')));
  const snapshot = await assertSucceeds(getDocs(collection(db(), 'households', houseId, 'events')));
  assert.equal(snapshot.size, 1);
});

test('S-8 settings/current can be created and overwritten (last write wins)', async () => {
  await assertSucceeds(setDoc(doc(db(), 'households', houseId, 'settings', 'current'), { enc: cipher() }));
  await assertSucceeds(setDoc(doc(db(), 'households', houseId, 'settings', 'current'), { enc: cipher(2) }));
});

test('S-9 a settings document id other than "current" is rejected', async () =>
  assertFails(setDoc(doc(db(), 'households', houseId, 'settings', 'other'), { enc: cipher() })));

test("S-10 access under a different houseId does not see the first household's data", async () => {
  await assertSucceeds(setDoc(doc(db(), 'households', houseId, 'events', 'evt-7'), { enc: cipher() }));
  const snap = await getDoc(doc(db(), 'households', otherHouseId, 'events', 'evt-7'));
  assert.equal(snap.exists(), false);
});
