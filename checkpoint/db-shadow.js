/*
 * Checkpoint DB shadow detector
 * DB-driven migration aid only. It never changes learner-visible marking by itself.
 */
function detectFromSurfaceIndex(text){
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
      hits.push({
        surface,start:i,end:i+surface.length,
        auxiliaryCandidates:entry.auxiliaryCandidates||entry.candidates||[],
        discriminationCandidates:entry.discriminationCandidates||[],
        projectCandidates:entry.projectCandidates||[],
        detectionConfidence:entry.detectionConfidence||"exact-surface",
        analysisConfidence:entry.analysisConfidence||"candidate-only",
        sourceRefs:entry.sourceRefs||[]
      });
      pos=i+Math.max(1,surface.length);
    }
  }
  return hits.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
}

function shadowAuditLegacyVsDb(text, legacyHits){
  const dbHits=detectFromSurfaceIndex(text);
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
    dbHitCount:dbHits.length,
    legacyComparableHitCount:comparableLegacy.length,
    matchedCount:both.length,
    dbOnly:dbOnly.map(h=>({surface:h.surface,start:h.start,end:h.end,analysisConfidence:h.analysisConfidence})),
    legacyOnly:legacyOnly.map(h=>({surface:h.pattern,start:h.start,end:h.end,type:h.type})),
    note:"shadow audit only; learner-visible detector remains legacy/hybrid until audited."
  };
  window.CHECKPOINT_LAST_SHADOW_AUDIT=audit;
  return audit;
}
