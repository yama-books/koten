/** APP-007 friend-card learning foundation. No DOM, storage, network or dependencies. */
export const VERSION = 'tomofuda-0.1';
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const chars = s => Array.from(s.normalize('NFC'));
const uniq = a => [...new Set(a)];
const canonical = x => Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;
const sameSet = (a,b) => a.length === b.length && a.every(x=>b.includes(x));
const common = (a,b) => { let n=0; while(n<a.length && n<b.length && a[n]===b[n]) n++; return n; };
export function buildCatalog(rows, {strict=true, readingVersion}={}) {
  assert(typeof readingVersion==='string' && readingVersion.length>0,'readingVersion required');
  assert(Array.isArray(rows) && rows.length>0,'empty catalog');
  if(strict) assert(rows.length===100,'100 canonical poems required');
  const byId = new Map(), nums=new Set();
  for(const r of rows){
    assert(typeof r.id==='string' && r.id && !byId.has(r.id),'duplicate/invalid poem id');
    assert(Number.isInteger(r.no)&&r.no>=1&&r.no<=100&&!nums.has(r.no),'duplicate/invalid poem number');
    assert(typeof r.reading==='string' && /^[\p{Script=Hiragana}ー]+$/u.test(r.reading.normalize('NFC')),'supply canonical contiguous hiragana reading');
    const p={...r,reading:r.reading.normalize('NFC'),tokens:chars(r.reading)};
    byId.set(r.id,p); nums.add(r.no);
  }
  const poems=[...byId.values()].sort((a,b)=>a.no-b.no);
  const root={prefix:'',ids:[],children:new Map()};
  for(const p of poems){
    let n=root; n.ids.push(p.id);
    for(const c of p.tokens){if(!n.children.has(c))n.children.set(c,{prefix:n.prefix+c,ids:[],children:new Map()});n=n.children.get(c);n.ids.push(p.id);}
  }
  for(const p of poems){
    const matches=poems.filter(q=>q.id!==p.id).map(q=>common(p.tokens,q.tokens));
    const k=1+Math.max(0,...matches);
    assert(k<=p.tokens.length,`identical or prefix reading: ${p.id}`);
    p.fixedLength=k;p.fixed=p.tokens.slice(0,k).join('');
    if(strict) assert(typeof p.kimariji==='string',`missing reviewed kimariji: ${p.id}`);
    if(p.kimariji!==undefined) assert(p.kimariji.normalize('NFC')===p.fixed,`kimariji mismatch: ${p.id}: ${p.kimariji} / ${p.fixed}`);
  }
  const groups=[], first=[];
  function walk(n,parent=null){
    let next=parent;
    // Only true branch points; do not repeat unary prefixes.
    if(n.prefix && n.children.size>1 && n.ids.length>=2){
      const g={id:`prefix:${n.prefix}`,prefix:n.prefix,poemIds:[...n.ids],parentId:parent,childIds:[],branches:[...n.children].map(([nextChar,x])=>({nextChar,poemIds:[...x.ids]}))};
      groups.push(g);next=g.id;
      if(parent) groups.find(x=>x.id===parent).childIds.push(g.id);
    }
    for(const c of n.children.values())walk(c,next);
  }
  walk(root);
  for(const [prefix,n] of root.children)first.push({prefix,poemIds:[...n.ids]});
  const byGroup=new Map(groups.map(g=>[g.id,g]));
  const histogram={};for(const p of poems)histogram[p.fixedLength]=(histogram[p.fixedLength]??0)+1;
  if(strict){ const expected={1:7,2:42,3:37,4:6,5:2,6:6}; assert(JSON.stringify(Object.entries(histogram).sort())===JSON.stringify(Object.entries(expected).sort()),'unexpected 100-poem length histogram: review reading convention'); }
  return {readingVersion,strict,poems,byId,groups,byGroup,first,histogram};
}
export function threshold(catalog,targetId,ids){
  const p=catalog.byId.get(targetId);assert(p&&ids.includes(targetId)&&uniq(ids).length===ids.length,'invalid contrast set');
  return 1+Math.max(0,...ids.filter(x=>x!==targetId).map(x=>{const q=catalog.byId.get(x);assert(q,'unknown contrast poem');return common(p.tokens,q.tokens);}));
}
export const missionKinds=['compare','find','match','reverse','wait','take','mix','review','final'];
export const hints=['both','poem','none'];
export function validateMissions(catalog,missions,{requireCoverage=false}={}){
  const map=new Map();
  for(const m of missions){
    assert(m.id&&!map.has(m.id)&&m.version===VERSION,'duplicate/invalid mission');map.set(m.id,m);
    assert(m.poemIds.length>0&&uniq(m.poemIds).length===m.poemIds.length&&m.poemIds.every(x=>catalog.byId.has(x)),'bad mission poems');
    assert(m.tasks.length>0&&uniq(m.tasks.map(t=>t.id)).length===m.tasks.length,'bad tasks');
    if(m.groupId){const g=catalog.byGroup.get(m.groupId);assert(g&&sameSet(g.poemIds,m.poemIds),'group must be complete');}
    for(const t of m.tasks){
      assert(missionKinds.includes(t.kind)&&hints.includes(t.hint),'bad task');
      assert(Number.isInteger(t.each)&&t.each>=0&&Number.isInteger(t.total)&&t.total>=t.each*m.poemIds.length,'bad quota');
      if(t.kind==='compare')assert(t.each===0&&t.total===0,'compare is explicit acknowledgment');
      else assert(t.each>=1&&t.total>=1,'scored task must cover each poem');
      if(['wait','mix','final'].includes(t.kind))assert(t.hint==='none','assessment must be unassisted');
    }
  }
  const visited=new Set(),active=new Set();
  function visit(id){assert(map.has(id),'missing prerequisite');assert(!active.has(id),'prerequisite cycle');if(visited.has(id))return;active.add(id);for(const x of map.get(id).prerequisites)visit(x);active.delete(id);visited.add(id);}
  for(const m of missions)visit(m.id);
  if(requireCoverage){const covered=new Set(missions.filter(m=>m.tasks.some(t=>['take','mix','final'].includes(t.kind)&&t.hint==='none')).flatMap(m=>m.poemIds));assert(catalog.poems.every(p=>covered.has(p.id)),'uncovered poems');}
  return map;
}
const task=(id,kind,hint,each,total)=>({id,kind,hint,each,total});
const standard=(n)=>[task('see','compare','both',0,0),task('guided','take','both',1,n),task('recall','reverse','none',1,n),task('check','take','none',2,n*2)];
/** Curated first two chapters; remaining coverage is generated as provisional route, not reviewed curriculum. */
export function buildCurriculum(catalog){
  const missions=[], covered=new Set();
  const getNos=ns=>ns.map(n=>{const p=catalog.poems.find(p=>p.no===n);assert(p,`missing initial poem ${n}`);return p.id;});
  const add=(id,chapter,title,ids,prerequisites,tasks,groupId)=>{const m={id,version:VERSION,chapter,title,poemIds:ids,prerequisites,tasks,...(groupId?{groupId}:{})};missions.push(m);if(tasks.some(t=>['take','mix','final'].includes(t.kind)&&t.hint==='none'))ids.forEach(x=>covered.add(x));return id;};
  const intro=getNos([87,18,57]), more=getNos([22,70]), last=getNos([81,77]), seven=[...intro,...more,...last];
  assert(seven.every(id=>catalog.byId.get(id).fixedLength===1),'intro one-letter mismatch');
  add('c1-start',1,'はじめの三枚',intro,[],[task('see','compare','both',0,0),task('guided','match','both',1,3),task('take','take','both',2,6),task('check','take','none',1,3)]);
  add('c1-next',1,'新しい二枚',more,['c1-start'],standard(2));
  add('c1-five',1,'五枚の札取り',[...intro,...more],['c1-next'],[task('mix','mix','none',1,5)]);
  add('c1-last',1,'残りの二枚',last,['c1-five'],standard(2));
  add('c1-final',1,'七枚のまとめ',seven,['c1-last'],[task('reverse','reverse','none',1,7),task('check','final','none',1,7)]);
  const pairs=['う','つ','し','も','ゆ'];const pairM=[];
  for(const p of pairs){const g=catalog.byGroup.get(`prefix:${p}`);assert(g?.poemIds.length===2,`invalid two-card group ${p}`);pairM.push(add(`c2-${p}`,2,`「${p}」の友札`,g.poemIds,['c1-final'],standard(2),g.id));}
  add('c2-final',2,'二枚札のまとめ',uniq(pairM.flatMap(id=>missions.find(m=>m.id===id).poemIds)),pairM,[task('check','final','none',1,10)]);
  // Small deep groups first. Larger groups get scheduled as whole-board assessment only if <=12.
  // 13+ groups are browsing/review scopes; not a claim of complete simultaneous discrimination.
  const small=catalog.groups.filter(g=>g.prefix.length>=2&&g.poemIds.length===2&&g.childIds.length===0).sort((a,b)=>a.prefix.length-b.prefix.length||a.prefix.localeCompare(b.prefix,'ja'));
  const c3=[],c4=[],c5=[],c6=[];
  for(const g of small.filter(g=>g.poemIds.every(id=>catalog.byId.get(id).fixedLength!==6))){c3.push(add(`c3-${g.prefix}`,3,`「${g.prefix}」の友札`,g.poemIds,['c2-final'],standard(2),g.id));}
  for(const g of small.filter(g=>g.poemIds.every(id=>catalog.byId.get(id).fixedLength===6))){c4.push(add(`c4-${g.prefix}`,4,`「${g.prefix}」の大山札`,g.poemIds,c3.length?c3:['c2-final'],[task('see','compare','both',0,0),task('guided','take','both',1,2),task('wait','wait','none',1,2),task('check','take','none',2,4)],g.id));}
  const prev=c4.length?c4:c3.length?c3:['c2-final'];
  for(const g of catalog.groups.filter(g=>g.prefix.length>=2&&g.poemIds.length>=3&&g.poemIds.length<=12).sort((a,b)=>b.prefix.length-a.prefix.length||a.prefix.localeCompare(b.prefix,'ja'))){
    const deps=uniq([...prev,...c5.filter(id=>missions.find(m=>m.id===id).poemIds.every(x=>g.poemIds.includes(x)))]);
    c5.push(add(`c5-${g.prefix}`,5,`「${g.prefix}」を見分けよう`,g.poemIds,deps,standard(g.poemIds.length),g.id));
  }
  // Full coverage: missing poems are taught alongside all nearest fixed-prefix rivals; no group split.
  const previous=c5.length?c5:prev;
  for(const p of catalog.poems){if(covered.has(p.id))continue;
    const rivals=catalog.poems.filter(q=>q.id!==p.id&&common(p.tokens,q.tokens)===p.fixedLength-1).map(q=>q.id);
    // All closest rivals may be large (first-character families). Preserve exact contrast by refusing >12.
    const ids=uniq([p.id,...rivals]);
    if(ids.length>12){ // teach each missing poem with deterministic small sibling sets; coverage, not whole-family proof
      for(const rival of rivals){if(!covered.has(p.id)||!covered.has(rival)){c6.push(add(`c6-${p.no}-${catalog.byId.get(rival).no}`,6,'出だしを見分けよう',[p.id,rival],previous,standard(2)));}}
    }else c6.push(add(`c6-${p.no}`,6,'友札を広げよう',ids,previous,standard(ids.length)));
  }
  // Final chapters are small review sets (no claim that all 100 are simultaneously displayed).
  const finalDeps=c6.length?c6:previous;
  for(let i=0;i<catalog.poems.length;i+=8){const ids=catalog.poems.slice(i,i+8).map(p=>p.id);add(`c7-${i/8+1}`,7,`百首の確認 ${i/8+1}`,ids,finalDeps,[task('check','final','none',1,ids.length)]);}
  validateMissions(catalog,missions,{requireCoverage:true});return missions;
}
/** Deterministic shuffle with injected random; explicit board/target separation. */
function shuffle(a,rng){a=[...a];for(let i=a.length-1;i>0;i--){const v=rng();assert(v>=0&&v<1,'invalid random');const j=Math.floor(v*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function planRound(catalog,mission,taskId,{targetId,boardSize,extraIds=[],rng=Math.random}={}){
  const t=mission.tasks.find(x=>x.id===taskId);assert(t&&t.kind!=='compare','not a scored task');
  assert(mission.poemIds.includes(targetId),'target outside mission');
  const mandatory=mission.poemIds;
  const size=boardSize??mandatory.length;
  assert(Number.isInteger(size)&&size>=mandatory.length&&size<=12,'board capacity; split learning scope explicitly');
  const extras=shuffle(uniq(extraIds).filter(id=>!mandatory.includes(id)&&catalog.byId.has(id)),rng).slice(0,size-mandatory.length);
  assert(extras.length===size-mandatory.length,'not enough eligible distractors');
  const board=shuffle([...mandatory,...extras],rng);
  return {missionId:mission.id,taskId,kind:t.kind,hint:t.hint,targetId,board,threshold:threshold(catalog,targetId,board),fixedLength:catalog.byId.get(targetId).fixedLength};
}
/** Pure evidence construction. UI must supply readable token count and first-action/error facts from engine. */
export function assessRound(catalog,mission,round,attempt){
  const t=mission.tasks.find(x=>x.id===round.taskId);assert(t&&round.missionId===mission.id&&round.kind===t.kind&&round.hint===t.hint,'round/task mismatch');
  assert(typeof attempt.id==='string'&&attempt.id&&typeof attempt.runId==='string'&&attempt.runId,'stable attempt/run id required');
  assert(uniq(round.board).length===round.board.length&&round.board.length<=12&&round.board.every(x=>catalog.byId.has(x))&&mission.poemIds.includes(round.targetId)&&mission.poemIds.every(x=>round.board.includes(x)),'invalid board');
  assert(Number.isInteger(attempt.visible)&&attempt.visible>=0&&attempt.visible<=catalog.byId.get(round.targetId).tokens.length,'invalid readable count');
  assert(Number.isInteger(attempt.earlyCount)&&attempt.earlyCount>=0&&Number.isInteger(attempt.errors)&&attempt.errors>=0,'invalid errors');
  assert(hints.includes(attempt.hint)&&typeof attempt.revealed==='boolean','actual hint and reveal flag required');
  assert(['upper','gap','lower','afterLower'].includes(attempt.phase),'invalid phase');
  assert(['correct','wrong','skip','timeout','interrupted'].includes(attempt.outcome),'invalid outcome');
  const gate=threshold(catalog,round.targetId,round.board);
  const take=['take','mix','review','final','wait'].includes(t.kind);
  const actualCorrect=attempt.outcome==='correct'&&(t.kind==='wait'?true:t.kind==='find'?attempt.selectedPosition===gate:attempt.selectedId===round.targetId);
  const timingOk=!take||(attempt.visible>=gate&&attempt.earlyCount===0&&['upper','gap'].includes(attempt.phase));
  const valid=actualCorrect&&attempt.errors===0&&timingOk&&attempt.hint===t.hint&&!attempt.revealed;
  const p=catalog.byId.get(round.targetId);
  const closestPresent=round.board.some(id=>id!==p.id&&common(p.tokens,catalog.byId.get(id).tokens)===p.fixedLength-1);
  return {id:attempt.id,runId:attempt.runId,version:VERSION,readingVersion:catalog.readingVersion,missionId:mission.id,taskId:t.id,poemId:p.id,board:[...round.board],kind:t.kind,hint:attempt.hint,visible:attempt.visible,gate,fixedLength:p.fixedLength,earlyCount:attempt.earlyCount,errors:attempt.errors,phase:attempt.phase,outcome:attempt.outcome,selectedId:attempt.selectedId??null,selectedPosition:attempt.selectedPosition??null,revealed:attempt.revealed,valid,closestPresent,unassisted:valid&&take&&t.kind!=='wait'&&round.board.length>=2&&attempt.hint==='none',groupEvidence:valid&&take&&t.kind!=='wait'&&attempt.hint==='none'&&closestPresent&&!!mission.groupId};
}
export function acknowledge(catalog,mission,taskId,id){assert(mission.tasks.some(t=>t.id===taskId&&t.kind==='compare')&&typeof id==='string'&&id,'invalid acknowledgment');return {id,version:VERSION,readingVersion:catalog.readingVersion,missionId:mission.id,taskId,kind:'compare',valid:true};}
/** Projection; identical event reimports deduplicated, conflicting IDs rejected. No writes. */
export function project(catalog,missions,events){
  const map=validateMissions(catalog,missions), seen=new Map(), scoped=[];
  for(const e of events){if(e.version!==VERSION||e.readingVersion!==catalog.readingVersion)continue;assert(typeof e.id==='string'&&e.id,'missing event id');const old=seen.get(e.id);if(old){assert(JSON.stringify(canonical(old))===JSON.stringify(canonical(e)),'conflicting duplicate event id');continue;}seen.set(e.id,e);if(!map.has(e.missionId))continue;const m=map.get(e.missionId),t=m.tasks.find(t=>t.id===e.taskId);assert(t&&t.kind===e.kind,'unknown event task');if(t.kind==='compare'){scoped.push(acknowledge(catalog,m,t.id,e.id));continue;}scoped.push(assessRound(catalog,m,{missionId:m.id,taskId:t.id,kind:t.kind,hint:t.hint,targetId:e.poemId,board:e.board},e));}
  const states=new Map(), verified=new Set();
  for(const m of missions){
    const tasks=m.tasks.map(t=>{const counts=Object.fromEntries(m.poemIds.map(id=>[id,0]));const evidence=scoped.filter(e=>e.missionId===m.id&&e.taskId===t.id&&e.kind===t.kind&&e.valid===true);if(t.kind==='compare')return {id:t.id,done:evidence.length>0,total:0,counts};
      for(const e of evidence){if(e.hint===t.hint&&Object.hasOwn(counts,e.poemId)){counts[e.poemId]++;}}
      const total=Object.values(counts).reduce((a,b)=>a+b,0);return {id:t.id,counts,total,done:total>=t.total&&Object.values(counts).every(n=>n>=t.each)};});
    states.set(m.id,{id:m.id,tasks,complete:tasks.every(t=>t.done),unlocked:false});
  }
  const allowed=(id)=>{const m=map.get(id);return m.prerequisites.every(x=>states.get(x).complete&&allowed(x));};
  for(const s of states.values())s.unlocked=allowed(s.id);
  for(const e of scoped)if(states.get(e.missionId).unlocked&&e.unassisted&&['take','mix','final','review'].includes(e.kind))verified.add(e.poemId);
  return {states,verifiedPoemIds:[...verified],recommended:missions.find(m=>{const s=states.get(m.id);return s.unlocked&&!s.complete;})?.id??null};
}
/** Suggest only; recovery cannot count as a harder task. */
export function recommendNext(mission,state,recent=[],{recoveredThroughId,rng=Math.random}={}){
  const t=mission.tasks.find(t=>!state.tasks.find(s=>s.id===t.id).done);if(!t)return {action:'complete'};
  if(t.kind==='compare')return {action:'compare',taskId:t.id};
  const s=state.tasks.find(s=>s.id===t.id);const eligible=[...mission.poemIds].sort((a,b)=>s.counts[a]-s.counts[b]);
  const tied=eligible.filter(id=>s.counts[id]===s.counts[eligible[0]]);const targetId=shuffle(tied,rng)[0];const local=recent.filter(e=>e.missionId===mission.id&&e.taskId===t.id);const recoveredIndex=local.findIndex(e=>e.id===recoveredThroughId);const last=local.slice(recoveredIndex+1).slice(-3);
  if(last.filter(e=>e.earlyCount>0).length>=2)return {action:'waitReview',taskId:t.id,targetId,countsForTask:false};
  if(last.filter(e=>e.errors>0||e.outcome==='wrong').length>=2)return {action:'compareReview',taskId:t.id,targetId,countsForTask:false};
  if(last.filter(e=>['lower','afterLower'].includes(e.phase)).length>=2)return {action:'hintReview',taskId:t.id,targetId,hint:'both',countsForTask:false};
  return {action:'practice',taskId:t.id,targetId,hint:t.hint,countsForTask:true};
}
