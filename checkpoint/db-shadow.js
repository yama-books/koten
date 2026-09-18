/*
 * Checkpoint DB shadow detector
 * DB-driven migration aid only. It never changes learner-visible marking by itself.
 */

function checkpointSurfacePolicy(surface){
  const entries=window.CHECKPOINT_DATA?.surfaceMatchPolicy?.entries;
  if(!Array.isArray(entries)) return null;
  return entries.find(x=>x.surface===surface) || null;
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
      hits.push({
        surface,start:i,end:i+surface.length,
        auxiliaryCandidates:entry.auxiliaryCandidates||entry.candidates||[],
        discriminationCandidates:entry.discriminationCandidates||[],
        projectCandidates:entry.projectCandidates||[],
        detectionConfidence:entry.detectionConfidence||"exact-surface",
        analysisConfidence:entry.analysisConfidence||"candidate-only",
        sourceRefs:entry.sourceRefs||[],
        matchPolicy:policy?.policy||null
      });
      pos=i+Math.max(1,surface.length);
    }
  }
  return hits.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
}

function resolveDbShadowHits(text){
  const raw=rawSurfaceIndexHits(text);
  const whole=knownWholeInflectedHits(text);
  const suppressed=[];
  const resolved=[];

  for(const h of raw){
    const container=whole.find(w =>
      h.start>=w.start && h.end<=w.end &&
      h.surface!==w.surface &&
      (!w.trigger || w.trigger===h.surface)
    );
    if(container){
      suppressed.push({...h,suppressedReason:"known-larger-inflected-word",suppressedBy:container.surface});
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
  const comparableLegacy=(legacyHits||[]).filter(h=>h.type==="grammar" || h.type==="identify");
  const key=h=>`${h.start}:${h.end}:${h.pattern||h.surface}`;
  const legacyKeys=new Set(comparableLegacy.map(key));
  const dbKeys=new Set(dbHits.map(key));
  const dbOnly=dbHits.filter(h=>!legacyKeys.has(key(h)));
  const legacyOnly=comparableLegacy.filter(h=>!dbKeys.has(key(h)));
  const both=dbHits.filter(h=>legacyKeys.has(key(h)));

  const audit={
    timestamp:new Date().toISOString(),
    textLength:text.length,
    dbRawHitCount:state.raw.length,
    dbResolvedHitCount:dbHits.length,
    dbSuppressedCount:state.suppressed.length,
    knownWholeFormHitCount:state.whole.length,
    legacyComparableHitCount:comparableLegacy.length,
    matchedCount:both.length,
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
      reason:h.suppressedReason,suppressedBy:h.suppressedBy||null
    })),
    note:"shadow audit only; learner-visible detector remains legacy/hybrid until audited."
  };
  window.CHECKPOINT_LAST_SHADOW_AUDIT=audit;
  return audit;
}
