import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, threshold, planRound, assessRound, project, recommendNext, VERSION } from '../../packages/hyakunin/experimental/tomofuda/core.mjs';
import { auditReadings } from '../../packages/hyakunin/experimental/tomofuda/audit.mjs';

// Artificial readings, not a source of Hyakunin Isshu text or kimariji.
const rows = ['あいうえおか','あいうえおき','あいさ','たな'].map((reading,i)=>({id:`x${i}`,no:i+1,reading}));
const catalog = buildCatalog(rows,{strict:false,readingVersion:'synthetic'});
const m = {id:'synthetic',version:VERSION,chapter:1,title:'synthetic',groupId:'prefix:あいうえお',poemIds:['x0','x1'],prerequisites:[],tasks:[{id:'check',kind:'take',hint:'none',each:2,total:4}]};
const round = planRound(catalog,m,'check',{targetId:'x0',rng:()=>0.5});
const answer = (id:string, selectedId='x0', extra={}) => ({id,runId:'r1',visible:6,earlyCount:0,errors:0,hint:'none',phase:'upper',outcome:'correct',selectedId,revealed:false,...extra});

test('strict gate and audit reject partial input',()=>{
  assert.throws(()=>buildCatalog(rows,{readingVersion:'synthetic'}),/100/);
  assert.throws(()=>auditReadings(rows,'synthetic'),/100/);
});
test('nested contrasts have true branch points only',()=>{
  assert.equal(catalog.byGroup.get('prefix:あいうえお').parentId,'prefix:あい');
  assert.equal(catalog.byGroup.has('prefix:あいう'),false);
  assert.equal(threshold(catalog,'x0',['x0','x2']),3);
  assert.equal(round.threshold,6);
});
test('board preserves rival and rejects overflow',()=>{
  assert.deepEqual(new Set(round.board),new Set(['x0','x1']));
  assert.throws(()=>planRound(catalog,m,'check',{targetId:'x0',boardSize:1}));
});
test('no early, corrected, revealed or assisted answer counts',()=>{
  for(const extra of [{visible:5},{earlyCount:1},{errors:1},{hint:'both'},{revealed:true},{phase:'lower'}])
    assert.equal(assessRound(catalog,m,round,answer('e','x0',extra)).valid,false);
  assert.equal(assessRound(catalog,m,round,answer('ok')).groupEvidence,true);
});
test('quota per song, duplicate IDs and unlock',()=>{
  const next={...m,id:'next',prerequisites:[m.id]};
  const a=assessRound(catalog,m,round,answer('a'));
  const b=assessRound(catalog,m,round,answer('b'));
  let p=project(catalog,[m,next],[a,b,a]);
  assert.equal(p.states.get(m.id).tasks[0].total,2);
  assert.equal(p.states.get(next.id).unlocked,false);
  assert.equal(recommendNext(m,p.states.get(m.id),[],{rng:()=>0.5}).targetId,'x1');
  assert.throws(()=>project(catalog,[m,next],[a,{...a,errors:1}]),/conflicting/);
  const r=planRound(catalog,m,'check',{targetId:'x1'});
  p=project(catalog,[m,next],[a,b,assessRound(catalog,m,r,answer('c','x1')),assessRound(catalog,m,r,answer('d','x1'))]);
  assert.equal(p.states.get(m.id).complete,true);
  assert.equal(p.states.get(next.id).unlocked,true);
});
test('recovery recommendation consumes previous trouble',()=>{
  const s=project(catalog,[m],[]).states.get(m.id);
  const recent=['a','b'].map(id=>({id,missionId:m.id,taskId:'check',earlyCount:1}));
  assert.equal(recommendNext(m,s,recent).action,'waitReview');
  assert.equal(recommendNext(m,s,recent,{recoveredThroughId:'b'}).action,'practice');
});
