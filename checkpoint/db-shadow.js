/*
 * Checkpoint DB shadow detector
 * DB-driven migration aid only. It never changes learner-visible marking by itself.
 */

function checkpointSurfacePolicy(surface){
  const entries=window.CHECKPOINT_DATA?.surfaceMatchPolicy?.entries;
  if(!Array.isArray(entries)) return null;
  return entries.find(x=>x.surface===surface) || null;
}

function checkpointKakariRoutes(surface){
  const routes=window.CHECKPOINT_DATA?.kakariMusubiRoutes?.routes;
  if(!Array.isArray(routes)) return [];
  return routes.filter(x=>x.surface===surface);
}

function checkpointKakariParticleProfile(particle){
  const profiles=window.CHECKPOINT_DATA?.kakariMusubiRoutes?.particleProfiles;
  if(!Array.isArray(profiles)) return null;
  return profiles.find(x=>(x.particles||[]).includes(particle)) || null;
}

function kakariSupportForResolvedParticle(surface,particle,scopeLinked=false){
  const route=checkpointKakariRoutes(surface).find(x=>(x.particles||[]).includes(particle));
  if(!route) return null;
  return {
    surface,particle,
    expectedEndingForm:route.expectedEndingForm,
    supportCandidateIds:route.supportCandidateIds||[],
    scopeLinkRequired:route.scopeLinkRequired!==false,
    scopeLinked:!!scopeLinked,
    status:scopeLinked ? "scope-linked-candidate-support" : "route-available-awaiting-scope",
    evidence:"kakari_musubi_evidence.json + discrimination_source_usb3212.json"
  };
}

function knownWholeInflectedHits(text){
  const groups=window.CHECKPOINT_DATA?.adjectiveSurfaceCollisionEvidence?.collisionGroups;
  if(!Array.isArray(groups)) return [];
  const out=[];
  const seen=new Set();
  for(const group of groups){
    for(const ex of (group.examples||[])){
      const surface=ex.target;
      if(!surface) continue;
      let pos=0;
      while(true){
        const i=text.indexOf(surface,pos);
        if(i<0) break;
        const key=`${i}:${i+surface.length}:${surface}`;
        if(!seen.has(key)){
          seen.add(key);
          out.push({
            surface,start:i,end:i+surface.length,
            category:"known-whole-inflected-word",
            lemma:ex.lemma,
            conjugationClass:ex.conjugationClass,
            form:ex.form,
            trigger:group.trigger,
            detectionConfidence:"audited-exact-whole-form",
            analysisConfidence:"source-audited-form",
            sourceRef:{
              driveFileId:window.CHECKPOINT_DATA?.adjectiveSurfaceCollisionEvidence?.source?.driveFileId||null,
              sourceRow:ex.sourceRow
            }
          });
        }
        pos=i+Math.max(1,surface.length);
      }
    }
  }
  return out.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
}

function kakariSignalsForHit(text,hit){
  const routes=checkpointKakariRoutes(hit.surface);
  if(!routes.length) return [];
  const out=[];
  for(const route of routes){
    for(const particle of (route.particles||[])){
      const profile=checkpointKakariParticleProfile(particle);
      if(profile?.automaticSurfaceScan===false) continue;
      const p=text.lastIndexOf(particle,Math.max(0,hit.start-1));
      if(p<0) continue;
      const between=text.slice(p+particle.length,hit.start);
      if(between.length>80) continue;
      if(/[。！？\n]/.test(between)) continue;
      out.push({
        particle,
        particleStart:p,
        distance:hit.start-(p+particle.length),
        expectedEndingForm:route.expectedEndingForm,
        supportCandidateIds:route.supportCandidateIds||[],
        scopeLinkRequired:route.scopeLinkRequired!==false,
        signalConfidence:"surface-only-scope-unverified",
        evidence:"kakari_musubi_evidence.json + discrimination_source_usb3212.json"
      });
    }
  }
  return out.sort((a,b)=>a.distance-b.distance);
}

function rawSurfaceIndexHits(text){
  const index=window.CHECKPOINT_DATA?.surfaceIndex;
  const surfaces=index?.surfaces;
  if(!Array.isArray(surfaces)) return [];
  const hits=[];
  for(const entry of surfaces){
    const surface=entry.surface;
    if(!surface) continue;
    let pos=0;
    while(true){
      const i=text.indexOf(surface,pos);
      if(i<0) break;
      const policy=checkpointSurfacePolicy(surface);
      const hit={
        surface,start:i,end:i+surface.length,
        auxiliaryCandidates:entry.auxiliaryCandidates||entry.candidates||[],
        discriminationCandidates:entry.discriminationCandidates||[],
        projectCandidates:entry.projectCandidates||[],
        detectionConfidence:entry.detectionConfidence||"exact-surface",
        analysisConfidence:entry.analysisConfidence||"candidate-only",
        sourceRefs:entry.sourceRefs||[],
        matchPolicy:policy?.policy||null
      };
      hit.contextSignals=kakariSignalsForHit(text,hit);
      hits.push(hit);
      pos=i+Math.max(1,surface.length);
    }
  }
  return hits.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
}

function preferredLargerDbContainer(raw,hit){
  const candidates=raw.filter(x=>{
    if(x===hit) return false;
    if(!(x.start<=hit.start && x.end>=hit.end)) return false;
    if((x.end-x.start)<=(hit.end-hit.start)) return false;
    return checkpointSurfacePolicy(x.surface)?.policy==="largest-meaningful-unit-first";
  });
  candidates.sort((a,b)=>(b.end-b.start)-(a.end-a.start) || a.start-b.start);
  return candidates[0]||null;
}

function resolveDbShadowHits(text){
  const raw=rawSurfaceIndexHits(text);
  const whole=knownWholeInflectedHits(text);
  const suppressed=[];
  const resolved=[];

  for(const h of raw){
    const wholeContainer=whole.find(w =>
      h.start>=w.start && h.end<=w.end &&
      h.surface!==w.surface &&
      (!w.trigger || w.trigger===h.surface)
    );
    if(wholeContainer){
      suppressed.push({...h,suppressedReason:"known-larger-inflected-word",suppressedBy:wholeContainer.surface});
      continue;
    }

    const dbContainer=preferredLargerDbContainer(raw,h);
    if(dbContainer){
      suppressed.push({...h,suppressedReason:"larger-db-surface-preferred",suppressedBy:dbContainer.surface});
      continue;
    }

    if(h.matchPolicy==="context-required"){
      suppressed.push({...h,suppressedReason:"context-required-not-yet-resolved"});
      continue;
    }
    resolved.push(h);
  }

  resolved.push(...whole);
  resolved.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
  return {raw,resolved,suppressed,whole};
}

function detectFromSurfaceIndex(text){
  return resolveDbShadowHits(text).resolved;
}

function shadowAuditLegacyVsDb(text, legacyHits){
  const state=resolveDbShadowHits(text);
  const dbHits=state.resolved;
  const comparableLegacyRaw=(legacyHits||[]).filter(h=>h.type==="grammar" || h.type==="identify");
  const key=h=>`${h.start}:${h.end}:${h.pattern||h.surface}`;
  const legacyByKey=new Map();
  for(const h of comparableLegacyRaw) if(!legacyByKey.has(key(h))) legacyByKey.set(key(h),h);
  const comparableLegacy=[...legacyByKey.values()];
  const legacyKeys=new Set(legacyByKey.keys());
  const dbKeys=new Set(dbHits.map(key));
  const dbOnly=dbHits.filter(h=>!legacyKeys.has(key(h)));
  const legacyOnly=comparableLegacy.filter(h=>!dbKeys.has(key(h)));
  const both=dbHits.filter(h=>legacyKeys.has(key(h)));
  const signalHits=state.raw.filter(h=>(h.contextSignals||[]).length);
  const signals=signalHits.flatMap(h=>(h.contextSignals||[]).map(s=>({
    surface:h.surface,start:h.start,end:h.end,
    particle:s.particle,particleStart:s.particleStart,distance:s.distance,
    expectedEndingForm:s.expectedEndingForm,
    supportCandidateIds:s.supportCandidateIds,
    scopeLinkRequired:s.scopeLinkRequired,
    signalConfidence:s.signalConfidence
  })));

  const audit={
    timestamp:new Date().toISOString(),
    textLength:text.length,
    dbRawHitCount:state.raw.length,
    dbResolvedHitCount:dbHits.length,
    dbSuppressedCount:state.suppressed.length,
    knownWholeFormHitCount:state.whole.length,
    legacyComparableRawHitCount:comparableLegacyRaw.length,
    legacyComparableUniqueHitCount:comparableLegacy.length,
    legacyDuplicateHitCount:comparableLegacyRaw.length-comparableLegacy.length,
    legacyComparableHitCount:comparableLegacy.length,
    matchedCount:both.length,
    kakariSignalHitCount:signalHits.length,
    kakariSignalCount:signals.length,
    kakariSignals:signals,
    dbOnly:dbOnly.map(h=>({
      surface:h.surface,start:h.start,end:h.end,
      category:h.category||"surface-index",
      analysisConfidence:h.analysisConfidence
    })),
    legacyOnly:legacyOnly.map(h=>({
      surface:h.pattern,start:h.start,end:h.end,type:h.type
    })),
    suppressedDbHits:state.suppressed.map(h=>({
      surface:h.surface,start:h.start,end:h.end,
      reason:h.suppressedReason,suppressedBy:h.suppressedBy||null,
      contextSignals:h.contextSignals||[]
    })),
    note:"shadow audit only; kakari-musubi signals are candidate support and never resolve scope by themselves."
  };
  window.CHECKPOINT_LAST_SHADOW_AUDIT=audit;
  return audit;
}
