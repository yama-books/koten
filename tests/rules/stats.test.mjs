import test, { after, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, Timestamp, setLogLevel } from 'firebase/firestore';

setLogLevel('silent');

const projectId = 'demo-koten-rules';
let env;
const id = 'abcdefghijklmnopqrst_2026-09-03_hyakunin';
const idFor = (d) => `${d.clientNumber}_${d.localDate}_${d.product}`;

function fixture(official = false) {
  return {
    clientNumber: 'abcdefghijklmnopqrst', localDate: '2026-09-03', product: 'hyakunin', grade: '初級',
    pageViews: 12, buttonCounts: { start: 1, answer: 2, hint: 3, reveal: 4, history: 5, report: 6 },
    entryCounts: { quick: 7, view: 8, learn: 9, review: 10, exam: 11, author: 12 },
    questionTypeCounts: { blank: 12, author: 13 }, attemptCount: 14, masteryAvg: 72.5, masteryMax: 99,
    masteryDistribution: [1, 2, 3, 4, 5], isOfficial: official, appVersion: '1.2.3', dataVersion: 2,
    masteryRulesVersion: 3, expiresAt: Timestamp.fromDate(new Date('2027-09-03T00:00:00Z'))
  };
}
const ref = (name) => doc(env.authenticatedContext('client').firestore(), name, id);

before(async () => { env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8088, rules: (await fs.readFile('../../firebase/firestore.rules', 'utf8')) } }); });
beforeEach(async () => { await env.clearFirestore(); });
after(async () => { await env.cleanup(); });

test('E-1 test collection accepts valid false payload and exact ID', async () => assertSucceeds(setDoc(ref('stats_days_test'), fixture(false))));
test('E-2 official collection accepts valid true payload and exact ID', async () => assertSucceeds(setDoc(ref('stats_days_official'), fixture(true))));
test('E-3 mismatched isOfficial is rejected in both collections', async () => { await assertFails(setDoc(ref('stats_days_test'), fixture(true))); await assertFails(setDoc(ref('stats_days_official'), fixture(false))); });
test('E-4 each document ID component must match payload', async () => { for (const [key, badId] of [['clientNumber','zzzzzzzzzzzzzzzzzzzzzz_2026-09-03_hyakunin'],['localDate','abcdefghijklmnopqrst_2026-09-04_hyakunin'],['product','abcdefghijklmnopqrst_2026-09-03_kanazukai']]) { await assertFails(setDoc(doc(env.authenticatedContext('client').firestore(),'stats_days_test', badId), fixture(false)), key); } });
test('E-5 second set/create is rejected as update', async () => { await assertSucceeds(setDoc(ref('stats_days_test'), fixture())); await assertFails(setDoc(ref('stats_days_test'), fixture())); });
test('E-6 get and list are rejected', async () => { await assertFails(getDoc(ref('stats_days_test'))); await assertFails(getDocs(collection(env.authenticatedContext('client').firestore(),'stats_days_test'))); });
test('E-7 update and delete are rejected', async () => { await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(),'stats_days_test',id), fixture(false)); await setDoc(doc(ctx.firestore(),'stats_days_official',id), fixture(true)); }); await assertFails(updateDoc(ref('stats_days_test'), { grade: '上級' })); await assertFails(deleteDoc(ref('stats_days_official'))); });
test('E-8 missing and extra keys are rejected in both collections', async () => { for (const c of ['stats_days_test','stats_days_official']) { const d=fixture(c.endsWith('official')); delete d.grade; await assertFails(setDoc(ref(c),d)); const e=fixture(c.endsWith('official')); e.extra=true; await assertFails(setDoc(ref(c),e)); } });
test('E-9a clientNumber must match the 20-character lowercase alphanumeric constraint', async () => { const d=fixture(); d.clientNumber='ABC'; await assertFails(setDoc(doc(env.authenticatedContext('client').firestore(),'stats_days_test',idFor(d)),d), 'clientNumber matches'); });
test('E-9b localDate must match the YYYY-MM-DD constraint', async () => { const d=fixture(); d.localDate='2026-09-03T00:00:00Z'; await assertFails(setDoc(doc(env.authenticatedContext('client').firestore(),'stats_days_test',idFor(d)),d), 'localDate matches'); });
test('E-9c product must be hyakunin or kanazukai', async () => { const d=fixture(); d.product='other'; await assertFails(setDoc(doc(env.authenticatedContext('client').firestore(),'stats_days_test',idFor(d)),d), 'product allowlist'); });
test('E-10 pageViews and attemptCount constraints', async () => { for (const key of ['pageViews','attemptCount']) for (const value of [-1,1.5,'1']) { const d=fixture(); d[key]=value; await assertFails(setDoc(ref('stats_days_test'),d)); } });
test('E-11 mastery bounds and type', async () => { for (const key of ['masteryAvg','masteryMax']) for (const value of [-1,101,'50']) { const d=fixture(); d[key]=value; await assertFails(setDoc(ref('stats_days_test'),d)); } });
test('E-12 version values are non-negative integers', async () => { for (const key of ['dataVersion','masteryRulesVersion']) for (const value of [-1,1.5]) { const d=fixture(); d[key]=value; await assertFails(setDoc(ref('stats_days_test'),d)); } });
test('E-13 count maps reject missing required and unknown keys', async () => { for (const key of ['buttonCounts','questionTypeCounts']) { const d=fixture(); delete d[key][Object.keys(d[key])[0]]; await assertFails(setDoc(ref('stats_days_test'),d)); const e=fixture(); e[key].extra=1; await assertFails(setDoc(ref('stats_days_test'),e)); } const legacy=fixture(); delete legacy.entryCounts.author; await assertSucceeds(setDoc(ref('stats_days_test'),legacy)); const missing=fixture(); delete missing.entryCounts.quick; await assertFails(setDoc(ref('stats_days_test'),missing)); const extra=fixture(); extra.entryCounts.extra=1; await assertFails(setDoc(ref('stats_days_test'),extra)); });
test('E-14 every count-map value is a non-negative integer', async () => { for (const key of ['buttonCounts','entryCounts','questionTypeCounts']) for (const child of Object.keys(fixture()[key])) for (const value of [-1,1.5,'1']) { const d=fixture(); d[key][child]=value; await assertFails(setDoc(ref('stats_days_test'),d), `${key}.${child}`); } });
test('E-15 every distribution position is a non-negative integer', async () => { for (const i of [0,1,2,3,4]) for (const value of [-1,1.5,'1']) { const d=fixture(); d.masteryDistribution[i]=value; await assertFails(setDoc(ref('stats_days_test'),d), `masteryDistribution[${i}]`); } const a=fixture(); a.masteryDistribution=[1,2,3,4]; await assertFails(setDoc(ref('stats_days_test'),a)); const b=fixture(); b.masteryDistribution=[1,2,3,4,5,6]; await assertFails(setDoc(ref('stats_days_test'),b)); });
test('E-16 Date/Timestamp expiresAt accepted', async () => { const d=fixture(); d.expiresAt = new Date('2027-09-03T00:00:00Z'); await assertSucceeds(setDoc(ref('stats_days_test'),d)); });
test('E-17 string expiresAt rejected', async () => { const d=fixture(); d.expiresAt='2027-09-03'; await assertFails(setDoc(ref('stats_days_test'),d)); });
test('E-18 unknown collection rejected', async () => assertFails(setDoc(doc(env.authenticatedContext('client').firestore(),'unknown', 'x'), fixture())));
test('E-19 indexes configure TTL and disable single-field indexes for both collections', async () => { const x=JSON.parse(await fs.readFile('../../firebase/firestore.indexes.json','utf8')); assert.deepEqual(x.indexes,[]); assert.deepEqual(x.fieldOverrides.map(v=>[v.collectionGroup,v.fieldPath,v.ttl,v.indexes]), [['stats_days_test','expiresAt',true,[]],['stats_days_official','expiresAt',true,[]]]); });
test('E-20 workflow has required triggers, paths, Node 24, Java 21, and npm ci', async () => { const y=await fs.readFile('../../.github/workflows/rules.yml','utf8'); for (const s of ['push:','pull_request:','workflow_dispatch:','ubuntu-24.04','node-version: 24','distribution: temurin','java-version: 21','java -version','npm ci --prefix tests/rules']) assert.match(y,new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))); for (const path of ['firebase/**','tests/rules/**','packages/shared/src/telemetry/registry.ts','package.json','.github/workflows/rules.yml']) assert.equal(y.split(path).length - 1, 2, `${path} must be present under push and pull_request`); });
test('E-21 fixture count and distribution values are not all identical', () => { const d=fixture(); assert.equal(new Set(Object.values(d.buttonCounts).concat(Object.values(d.entryCounts),Object.values(d.questionTypeCounts))).size > 1,true); assert.equal(new Set(d.masteryDistribution).size > 1,true); });
test('E-22 grade must be a string', async () => { const d=fixture(); d.grade=123; await assertFails(setDoc(ref('stats_days_test'),d), 'grade is string'); });
test('E-23 appVersion must be a string', async () => { const d=fixture(); d.appVersion=5; await assertFails(setDoc(ref('stats_days_test'),d), 'appVersion is string'); });
