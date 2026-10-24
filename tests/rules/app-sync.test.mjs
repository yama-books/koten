import test,{before,after,beforeEach} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,getDocs,collection,query,limit,deleteDoc,serverTimestamp,setLogLevel} from 'firebase/firestore';
setLogLevel('silent');let env;const group='a'.repeat(64),other='b'.repeat(64),id='c'.repeat(64);
const db=(uid='alice')=>env.authenticatedContext(uid).firestore();
const record=(d,g=group,app='conj')=>doc(d,'sharedGroups',g,'apps',app,'records',id);
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-koten-rules',firestore:{host:'127.0.0.1',port:8088,rules:await readFile('../../firebase/firestore.rules','utf8')}});});
beforeEach(async()=>env.clearFirestore());after(async()=>env.cleanup());
async function enroll(d,uid='alice',g=group){await setDoc(doc(d,'sharedGroups',g),{version:1,enc:'enc:fixture'});await setDoc(doc(d,'sharedGroups',g,'members',uid),{version:1});}
test('new sync: anonymous auth alone cannot read or write records',async()=>{
  await assertFails(getDoc(record(db())));await assertFails(setDoc(record(db()),{enc:'enc:fixture',createdAt:serverTimestamp()}));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'sharedGroups',group)));
});
test('new sync: invitation capability enrolls only self, then allows isolated app records',async()=>{
  const d=db();await enroll(d);
  await assertFails(setDoc(doc(d,'sharedGroups',group,'members','bob'),{version:1}));
  for(const app of ['conj','vintage-kana'])await assertSucceeds(setDoc(record(d,group,app),{enc:'enc:fixture',createdAt:serverTimestamp()}));
  await assertSucceeds(getDoc(record(d)));await assertFails(getDoc(record(db('outsider'))));
  await assertFails(getDoc(record(d,other)));await assertFails(setDoc(record(d,group,'unknown'),{enc:'enc:fixture',createdAt:serverTimestamp()}));
});
test('new sync: refuses group discovery, unbounded queries, plaintext, extra fields, updates and deletion',async()=>{
  const d=db();await enroll(d);const c=collection(d,'sharedGroups',group,'apps','conj','records');
  await assertFails(getDocs(collection(d,'sharedGroups')));await assertFails(getDocs(c));
  await assertSucceeds(getDocs(query(c,limit(200))));await assertFails(getDocs(query(c,limit(201))));
  await assertFails(setDoc(record(d),{enc:'plain',createdAt:serverTimestamp()}));
  await assertFails(setDoc(record(d),{enc:'enc:fixture',extra:1,createdAt:serverTimestamp()}));
  await assertSucceeds(setDoc(record(d),{enc:'enc:fixture',createdAt:serverTimestamp()}));
  await assertFails(setDoc(record(d),{enc:'enc:changed',createdAt:serverTimestamp()}));await assertFails(deleteDoc(record(d)));
});
test('new hyakunin: membership required, session completion allowed, foreign group denied',async()=>{
  const d=db();await enroll(d);
  const event=doc(d,'sharedGroups',group,'apps','hyakunin','events','synthetic-event');
  const session=doc(d,'sharedGroups',group,'apps','hyakunin','sessions','synthetic-session');
  await assertSucceeds(setDoc(event,{enc:'enc:fixture'}));await assertFails(setDoc(event,{enc:'enc:overwrite'}));
  await assertSucceeds(setDoc(session,{enc:'enc:started'}));await assertSucceeds(setDoc(session,{enc:'enc:complete'}));
  await assertFails(getDoc(doc(db('outsider'),'sharedGroups',group,'apps','hyakunin','events','synthetic-event')));
  await assertFails(getDoc(doc(d,'sharedGroups',other,'apps','hyakunin','events','synthetic-event')));
  await assertSucceeds(setDoc(doc(d,'sharedGroups',group,'apps','hyakunin','settings','current'),{enc:'enc:preferences'}));
  await assertFails(deleteDoc(doc(d,'sharedGroups',group,'apps','hyakunin','settings','current')));
});
