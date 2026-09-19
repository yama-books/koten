/*
 * Checkpoint DB shadow detector
 * DB-driven migration aid only. It never changes learner-visible marking by itself.
 */

function checkpointSurfacePolicy(surface){
  const entries=window.CHECKPOINT_DATA?.surfaceMatchPolicy?.entries;
  if(!Array.isArray(entries)) return null;
  return entries.find(x=>x.surface===surface) || null;
}

function checkpointLocalBoundaryPolicy(){
  return window.CHECKPOINT_DATA?.localBoundaryPolicy || null;
}

function checkpointCharClass(ch){
  if(!ch) return "boundary";
  const policy=checkpointLocalBoundaryPolicy();
  if((policy?.punctuationChars||[]).includes(ch)) return "punctuation";
  if(/\s/.test(ch)) return "space";
  if(/[\u3400-\u9fff\uf900-\ufaff]/.test(ch)) return "han";
  if(/[\u3040-\u309f]/.test(ch)) return "hiragana";
  if(/[\u30a0-\u30ff]/.test(ch)) return "katakana";
  if(/[A-Za-z]/.test(ch)) return "latin";
  if(/[0-9０-９]/.test(ch)) return "digit";
  return "other";
}

function localBoundarySignalsForHit(text,hit){
  const policy=checkpointLocalBoundaryPolicy();
  if(!policy || policy.mode!=="signal-only") return null;
  const previousChar=hit.start>0 ? text.slice(hit.start-1,hit.start) : "";
  const nextChar=hit.end<text.length ? text.slice(hit.end,hit.end+1) : "";
  const previous2=text.slice(Math.max(0,hit.start-2),hit.start);
  const next2=text.slice(hit.end,Math.min(text.length,hit.end+2));
  const punctuation=new Set(policy.punctuationChars||[]);
  const quoteOpeners=new Set(policy.quoteOpeners||[]);
  const quoteClosers=new Set(policy.quoteClosers||[]);
  const sentenceStops=new Set(policy.sentenceStops||[]);
  return {
    previousChar,nextChar,previous2,next2,
    previousClass:checkpointCharClass(previousChar),
    hitFirstClass:checkpointCharClass((hit.surface||"").slice(0,1)),
    hitLastClass:checkpointCharClass((hit.surface||"").slice(-1)),
    nextClass:checkpointCharClass(nextChar),
    atTextStart:hit.start===0,atTextEnd:hit.end===text.length,
    leftPunctuation:punctuation.has(previousChar),rightPunctuation:punctuation.has(nextChar),
    leftQuoteClose:quoteClosers.has(previousChar),rightQuoteOpen:quoteOpeners.has(nextChar),
    leftSentenceStop:sentenceStops.has(previousChar),rightSentenceStop:sentenceStops.has(nextChar),
    leftScriptTransition:!!previousChar && checkpointCharClass(previousChar)!==checkpointCharClass((hit.surface||"").slice(0,1)),
    rightScriptTransition:!!nextChar && checkpointCharClass((hit.surface||"").slice(-1))!==checkpointCharClass(nextChar),
    mode:"signal-only"
  };
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



function indexedLargerDbContainer(raw,hit){
  if([...(hit.surface||"")].length!==1) return null;
  const candidates=raw.filter(x=>{
    if(x===hit) return false;
    if(!(x.start<=hit.start && x.end>=hit.end)) return false;
    if((x.end-x.start)<=(hit.end-hit.start)) return false;
    const hasIndexedAnalysis=(x.auxiliaryCandidates||[]).length ||
      (x.discriminationCandidates||[]).length ||
      (x.projectCandidates||[]).length;
    return !!hasIndexedAnalysis;
  });
  candidates.sort((a,b)=>(b.end-b.start)-(a.end-a.start) || a.start-b.start);
  return candidates[0]||null;
}

function leftSurfaceResolverRules(surface){
  const rules=window.CHECKPOINT_DATA?.contextResolverRules?.leftSurfaceRules;
  if(!Array.isArray(rules)) return [];
  return rules.filter(x=>x.surface===surface);
}

function hardBoundaryResolverRules(surface){
  const rules=window.CHECKPOINT_DATA?.contextResolverRules?.hardBoundaryRules;
  if(!Array.isArray(rules)) return [];
  return rules.filter(x=>x.surface===surface);
}

function resolveByHardBoundary(text,hit){
  const rules=hardBoundaryResolverRules(hit.surface);
  if(!rules.length) return null;
  const candidateIds=hitCandidateIds(hit);
  const previousChar=hit.start>0 ? text.slice(hit.start-1,hit.start) : "";
  for(const r of rules){
    if(Array.isArray(r.previousChars) && r.previousChars.length && !r.previousChars.includes(previousChar)) continue;
    const supported=(r.supportCandidateIds||[]).filter(id=>candidateIds.has(id));
    if(r.mode==="singleCandidateResolve" && supported.length===1){
      return {
        status:"resolved-by-source-hard-boundary",
        mode:r.mode,
        supportCandidateIds:supported,
        previousChar,
        sourceCue:r.sourceCue||null,
        safety:r.safety||null,
        evidence:"context_resolver_rules.json + discrimination_source_usb3212.json"
      };
    }
    if(supported.length){
      return {
        status:"candidate-support-only",
        mode:r.mode||"supportOnly",
        supportCandidateIds:supported,
        previousChar,
        sourceCue:r.sourceCue||null,
        safety:r.safety||null
      };
    }
  }
  return null;
}

function resolveByLeftIndexedSurface(text,hit){
  const rules=leftSurfaceResolverRules(hit.surface);
  if(!rules.length) return null;
  const candidateIds=hitCandidateIds(hit);
  for(const r of rules){
    const prev=r.previousSurface||"";
    if(!prev) continue;
    const start=hit.start-prev.length;
    if(start<0 || text.slice(start,hit.start)!==prev) continue;
    const supported=(r.supportCandidateIds||[]).filter(id=>candidateIds.has(id));
    if(r.mode==="singleCandidateResolve" && supported.length===1){
      return {
        status:"resolved-by-source-left-surface",
        mode:r.mode,
        supportCandidateIds:supported,
        previousSurface:prev,
        previousFormEvidence:r.previousFormEvidence||null,
        sourceCue:r.sourceCue||null,
        evidence:(r.evidenceFiles||[]).join(" + ")||"context_resolver_rules.json"
      };
    }
    if(supported.length){
      return {
        status:"candidate-support-only",
        mode:r.mode||"supportOnly",
        supportCandidateIds:supported,
        previousSurface:prev,
        previousFormEvidence:r.previousFormEvidence||null,
        sourceCue:r.sourceCue||null
      };
    }
  }
  return null;
}


function auditedPreviousFormEvidence(text,hitStart){
  const entries=window.CHECKPOINT_DATA?.auditedInflectedFormIndex?.entries;
  if(!Array.isArray(entries)) return null;
  const matches=[];
  for(const e of entries){
    const surface=e.surface;
    if(!surface || !e.consensusForm) continue;
    if(e.boundaryConfidence!=="kanji-anchored") continue;
    const start=hitStart-surface.length;
    if(start<0) continue;
    if(text.slice(start,hitStart)!==surface) continue;
    matches.push({
      surface,start,end:hitStart,
      form:e.consensusForm,
      pos:e.consensusPos||null,
      conjugationClass:e.consensusClass||null,
      analyses:e.analyses||[]
    });
  }
  if(!matches.length) return null;
  matches.sort((a,b)=>(b.surface.length-a.surface.length) || a.start-b.start);
  const maxLen=matches[0].surface.length;
  const top=matches.filter(x=>x.surface.length===maxLen);
  const forms=[...new Set(top.map(x=>x.form))];
  const classes=[...new Set(top.map(x=>x.conjugationClass).filter(Boolean))];
  if(forms.length!==1) return null;
  return {
    surface:top[0].surface,
    start:top[0].start,
    end:hitStart,
    form:forms[0],
    conjugationClass:classes.length===1?classes[0]:null,
    matches:top,
    evidence:"audited_inflected_form_index_500.json"
  };
}

function classMatchesRule(actualClass,includes){
  if(!Array.isArray(includes) || !includes.length) return true;
  if(!actualClass) return false;
  return includes.some(x=>actualClass.includes(x));
}

function contextResolverEntry(surface){
  const entries=window.CHECKPOINT_DATA?.contextResolverRules?.entries;
  if(!Array.isArray(entries)) return null;
  return entries.find(x=>x.surface===surface) || null;
}


function rightContextResolverRules(surface){
  const rules=window.CHECKPOINT_DATA?.contextResolverRules?.rightContextRules;
  if(!Array.isArray(rules)) return [];
  return rules.filter(x=>x.surface===surface);
}

function resolveByBidirectionalContext(text,hit,previousEvidence){
  if(!previousEvidence) return null;
  const rules=rightContextResolverRules(hit.surface);
  if(!rules.length) return null;
  const candidateIds=hitCandidateIds(hit);
  for(const r of rules){
    if(r.previousForm && r.previousForm!==previousEvidence.form) continue;
    if(!classMatchesRule(previousEvidence.conjugationClass,r.previousClassIncludes)) continue;
    const next=(r.nextStartsWith||[]).find(s=>text.startsWith(s,hit.end));
    if(!next) continue;
    const supported=(r.supportCandidateIds||[]).filter(id=>candidateIds.has(id));
    if(r.mode==="singleCandidateResolve" && supported.length===1){
      return {
        status:"resolved-by-audited-bidirectional-context",
        mode:r.mode,
        supportCandidateIds:supported,
        previousEvidence,
        nextSurface:next,
        sourceCue:r.sourceCue||null,
        evidence:"context_resolver_rules.json + discrimination_source_usb3212.json"
      };
    }
    if(supported.length){
      return {
        status:"candidate-support-only",
        mode:r.mode||"supportOnly",
        supportCandidateIds:supported,
        previousEvidence,
        nextSurface:next,
        sourceCue:r.sourceCue||null,
        evidence:"context_resolver_rules.json + discrimination_source_usb3212.json"
      };
    }
  }
  return null;
}


function resolveContextRequiredHit(text,hit){
  const hardBoundaryResolution=resolveByHardBoundary(text,hit);
  if(hardBoundaryResolution) return hardBoundaryResolution;
  const leftSurfaceResolution=resolveByLeftIndexedSurface(text,hit);
  if(leftSurfaceResolution) return leftSurfaceResolution;
  const cfg=contextResolverEntry(hit.surface);
  if(!cfg) return null;
  const prev=auditedPreviousFormEvidence(text,hit.start);
  if(!prev) return {
    status:"awaiting-audited-preceding-form",
    mode:cfg.mode,
    supportCandidateIds:[],
    previousEvidence:null
  };
  const bidirectional=resolveByBidirectionalContext(text,hit,prev);
  if(bidirectional) return bidirectional;

  const matchedRules=(cfg.rules||[]).filter(r =>
    r.previousForm===prev.form &&
    classMatchesRule(prev.conjugationClass,r.previousClassIncludes)
  );
  const ids=[...new Set(matchedRules.flatMap(r=>r.supportCandidateIds||[]))];
  if(!ids.length) return {
    status:"audited-form-found-no-rule-match",
    mode:cfg.mode,
    supportCandidateIds:[],
    previousEvidence:prev
  };
  const candidateIds=new Set([
    ...(hit.discriminationCandidates||[]).map(x=>x.id).filter(Boolean),
    ...(hit.projectCandidates||[]).map(x=>x.id).filter(Boolean)
  ]);
  const supported=ids.filter(id=>candidateIds.has(id));
  if(!supported.length) return {
    status:"rule-support-not-present-in-hit-candidates",
    mode:cfg.mode,
    supportCandidateIds:ids,
    previousEvidence:prev
  };
  if(cfg.mode==="singleCandidateResolve" && supported.length===1){
    return {
      status:"resolved-by-audited-connection",
      mode:cfg.mode,
      supportCandidateIds:supported,
      previousEvidence:prev,
      evidence:"context_resolver_rules.json + audited_inflected_form_index_500.json"
    };
  }
  return {
    status:"candidate-support-only",
    mode:cfg.mode,
    supportCandidateIds:supported,
    previousEvidence:prev,
    evidence:"context_resolver_rules.json + audited_inflected_form_index_500.json"
  };
}



function knownBoundaryTokenHits(text){
  const entries=window.CHECKPOINT_DATA?.knownTokenBoundaryIndex?.entries;
  if(!Array.isArray(entries)) return [];
  const out=[];
  const seen=new Set();
  for(const e of entries){
    if(!e.canSuppressInternalSurface || !e.surface) continue;
    let pos=0;
    while(true){
      const i=text.indexOf(e.surface,pos);
      if(i<0) break;
      const key=`${i}:${i+e.surface.length}:${e.surface}`;
      if(!seen.has(key)){
        seen.add(key);
        out.push({
          surface:e.surface,start:i,end:i+e.surface.length,
          trust:e.trust||"medium",sources:e.sources||[]
        });
      }
      pos=i+Math.max(1,e.surface.length);
    }
  }
  return out.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
}

function trustedLargerTokenContainer(boundaryHits,hit){
  const candidates=boundaryHits.filter(x =>
    x.start<=hit.start && x.end>=hit.end &&
    x.surface!==hit.surface &&
    (x.end-x.start)>(hit.end-hit.start)
  );
  candidates.sort((a,b)=>(b.end-b.start)-(a.end-a.start) || a.start-b.start);
  return candidates[0]||null;
}




function exactAbeParticleEvidenceForHit(text,hit){
  const entries=window.CHECKPOINT_DATA?.abeSeimeiParticleEvidence?.entries;
  if(!Array.isArray(entries)) return null;
  const matches=[];
  for(const e of entries){
    if(!e.phrase || !e.focusSurface || !e.analysisUnit) continue;
    let pos=0;
    while(true){
      const p=text.indexOf(e.phrase,pos);
      if(p<0) break;
      const focusOffset=Number.isInteger(e.focusOffset)?e.focusOffset:e.phrase.indexOf(e.focusSurface);
      const unitOffset=Number.isInteger(e.analysisUnitOffset)?e.analysisUnitOffset:e.phrase.indexOf(e.analysisUnit);
      const focusStart=p+focusOffset;
      const focusEnd=focusStart+e.focusSurface.length;
      if(hit.start===focusStart && hit.end===focusEnd && hit.surface===e.focusSurface){
        matches.push({
          id:e.id||null,
          phrase:e.phrase,
          phraseStart:p,
          phraseEnd:p+e.phrase.length,
          focusSurface:e.focusSurface,
          analysisUnit:e.analysisUnit,
          analysisUnitStart:p+unitOffset,
          analysisUnitEnd:p+unitOffset+e.analysisUnit.length,
          action:e.action,
          candidateId:e.candidateId||null,
          sourceAnalysis:e.sourceAnalysis||"",
          evidenceStatus:e.evidenceStatus||"passage-specific-reviewed"
        });
      }
      pos=p+Math.max(1,e.phrase.length);
    }
  }
  if(!matches.length) return null;
  matches.sort((a,b)=>(b.analysisUnit.length-a.analysisUnit.length)||(b.phrase.length-a.phrase.length));
  return matches[0];
}

function exactAbeEvidenceForHit(text,hit){
  const entries=window.CHECKPOINT_DATA?.abeSeimeiGrammarEvidence?.entries;
  if(!Array.isArray(entries)) return null;
  const matches=[];
  for(const e of entries){
    if(!e.phrase || !e.focusSurface || !e.analysisUnit) continue;
    let pos=0;
    while(true){
      const p=text.indexOf(e.phrase,pos);
      if(p<0) break;
      const focusOffset=Number.isInteger(e.focusOffset)?e.focusOffset:e.phrase.indexOf(e.focusSurface);
      const unitOffset=Number.isInteger(e.analysisUnitOffset)?e.analysisUnitOffset:e.phrase.indexOf(e.analysisUnit);
      const focusStart=p+focusOffset;
      const focusEnd=focusStart+e.focusSurface.length;
      if(hit.start===focusStart && hit.end===focusEnd && hit.surface===e.focusSurface){
        matches.push({
          phrase:e.phrase,
          phraseStart:p,
          phraseEnd:p+e.phrase.length,
          focusSurface:e.focusSurface,
          analysisUnit:e.analysisUnit,
          analysisUnitStart:p+unitOffset,
          analysisUnitEnd:p+unitOffset+e.analysisUnit.length,
          action:e.action,
          candidateId:e.candidateId||null,
          auxiliaryLemma:e.auxiliaryLemma||null,
          sourceAnalysis:e.sourceAnalysis||"",
          evidenceStatus:e.evidenceStatus||"user-source-reviewed"
        });
      }
      pos=p+Math.max(1,e.phrase.length);
    }
  }
  if(!matches.length) return null;
  matches.sort((a,b)=>(b.analysisUnit.length-a.analysisUnit.length)||(b.phrase.length-a.phrase.length));
  return matches[0];
}

function hitHasAuxiliaryLemma(hit,lemma){
  return (hit.auxiliaryCandidates||[]).some(x=>x.lemma===lemma);
}



function exactHyakuninBunsetuBoundaryForHit(text,hit){
  const entries=window.CHECKPOINT_DATA?.hyakuninBunsetuBoundaryEvidence?.entries;
  if(!Array.isArray(entries)) return null;
  const matches=[];
  for(const e of entries){
    if(!e.passage || !Array.isArray(e.explicitLexicalUnits)) continue;
    let passagePos=0;
    while(true){
      const p=text.indexOf(e.passage,passagePos);
      if(p<0) break;
      for(const unit of e.explicitLexicalUnits){
        if(!unit.surface || !Array.isArray(unit.suppressInternalSurfaces)) continue;
        let localPos=0;
        while(true){
          const u=e.passage.indexOf(unit.surface,localPos);
          if(u<0) break;
          const start=p+u;
          const end=start+unit.surface.length;
          if(unit.suppressInternalSurfaces.includes(hit.surface) &&
             hit.start>=start && hit.end<=end &&
             (end-start)>(hit.end-hit.start)){
            matches.push({
              poem:e.poem||null,
              passage:e.passage,
              passageStart:p,
              passageEnd:p+e.passage.length,
              lexicalUnit:unit.surface,
              lexicalUnitStart:start,
              lexicalUnitEnd:end,
              partOfSpeech:unit.partOfSpeech||null,
              reason:unit.reason||"",
              source:"hyakunin_bunsetu_boundary_evidence.json"
            });
          }
          localPos=u+Math.max(1,unit.surface.length);
        }
      }
      passagePos=p+Math.max(1,e.passage.length);
    }
  }
  if(!matches.length) return null;
  matches.sort((a,b)=>(b.lexicalUnit.length-a.lexicalUnit.length));
  return matches[0];
}


function exactHyakuninEvidenceForHit(text,hit){
  const entries=window.CHECKPOINT_DATA?.hyakuninDisambiguationEvidence?.entries;
  if(!Array.isArray(entries)) return null;
  const matches=[];
  for(const e of entries){
    if(!e.phrase || !e.focusSurface || !e.analysisUnit) continue;
    let pos=0;
    while(true){
      const p=text.indexOf(e.phrase,pos);
      if(p<0) break;
      const focusStart=p+(Number.isInteger(e.focusOffset)?e.focusOffset:e.phrase.indexOf(e.focusSurface));
      const focusEnd=focusStart+e.focusSurface.length;
      if(hit.start===focusStart && hit.end===focusEnd && hit.surface===e.focusSurface){
        matches.push({
          poem:e.poem,
          phrase:e.phrase,
          phraseStart:p,
          phraseEnd:p+e.phrase.length,
          focusSurface:e.focusSurface,
          analysisUnit:e.analysisUnit,
          analysisUnitStart:p+(Number.isInteger(e.analysisUnitOffset)?e.analysisUnitOffset:e.phrase.indexOf(e.analysisUnit)),
          analysisUnitEnd:p+(Number.isInteger(e.analysisUnitOffset)?e.analysisUnitOffset:e.phrase.indexOf(e.analysisUnit))+e.analysisUnit.length,
          analysis:e.analysis,
          caution:e.caution||"",
          evidenceStatus:e.evidenceStatus||"context-reviewed"
        });
      }
      pos=p+Math.max(1,e.phrase.length);
    }
  }
  if(!matches.length) return null;
  matches.sort((a,b)=>(b.analysisUnit.length-a.analysisUnit.length) || (b.phrase.length-a.phrase.length));
  return matches[0];
}

function hitCandidateIds(hit){
  return new Set([
    ...(hit.discriminationCandidates||[]).map(x=>x.id).filter(Boolean),
    ...(hit.projectCandidates||[]).map(x=>x.id).filter(Boolean)
  ]);
}



function exactAbeKakariLinks(text){
  const entries=window.CHECKPOINT_DATA?.abeSeimeiKakariEvidence?.entries;
  if(!Array.isArray(entries)) return [];
  const links=[];
  for(const e of entries){
    if(!e.phrase || !e.particle) continue;
    let pos=0;
    while(true){
      const p=text.indexOf(e.phrase,pos);
      if(p<0) break;
      const particleLocal=Number.isInteger(e.particleOffset) ? e.particleOffset : e.phrase.indexOf(e.particle);
      const particleStart=p+particleLocal;
      let endingStart=null,endingEnd=null;
      if(e.endingSurface){
        const local=e.phrase.lastIndexOf(e.endingSurface);
        if(local>=0){
          endingStart=p+local;
          endingEnd=endingStart+e.endingSurface.length;
        }
      }
      links.push({
        id:e.id||null,
        phrase:e.phrase,
        phraseStart:p,
        phraseEnd:p+e.phrase.length,
        particle:e.particle,
        particleStart,
        particleEnd:particleStart+e.particle.length,
        relation:e.relation||"係り結び",
        expectedEndingForm:e.expectedEndingForm||null,
        endingSurface:e.endingSurface||null,
        endingStart,endingEnd,
        sourceAnalysis:e.sourceAnalysis||"",
        scopeLinked:true,
        evidence:"abe_seimei_kakari_evidence.json"
      });
      pos=p+Math.max(1,e.phrase.length);
    }
  }
  return links;
}

function kakariLinksForHit(links,hit){
  return (links||[]).filter(x =>
    x.endingSurface &&
    x.endingStart===hit.start &&
    x.endingEnd===hit.end &&
    x.endingSurface===hit.surface
  );
}


function resolveDbShadowHits(text){
  const raw=rawSurfaceIndexHits(text);
  const whole=knownWholeInflectedHits(text);
  const boundaryHits=knownBoundaryTokenHits(text);
  const exactKakariLinks=exactAbeKakariLinks(text);
  const suppressed=[];
  const resolved=[];

  for(const h of raw){
    const abeParticleEvidence=exactAbeParticleEvidenceForHit(text,h);
    if(abeParticleEvidence){
      if(abeParticleEvidence.action==="suppressInsideLargerUnit"){
        suppressed.push({
          ...h,
          suppressedReason:"source-exact-particle-larger-unit",
          suppressedBy:abeParticleEvidence.analysisUnit,
          exactParticleEvidence:abeParticleEvidence
        });
        continue;
      }
      if(abeParticleEvidence.action==="resolveCandidate" &&
         abeParticleEvidence.candidateId &&
         hitCandidateIds(h).has(abeParticleEvidence.candidateId)){
        resolved.push({
          ...h,
          analysisConfidence:"source-exact-particle",
          contextResolution:{
            status:"resolved-by-source-exact-particle",
            mode:"exact-passage-particle",
            supportCandidateIds:[abeParticleEvidence.candidateId],
            exactParticleEvidence:abeParticleEvidence,
            evidence:"abe_seimei_particle_evidence.json"
          }
        });
        continue;
      }
    }

    const abeExactEvidence=exactAbeEvidenceForHit(text,h);
    if(abeExactEvidence){
      if(abeExactEvidence.action==="suppressInsideLargerUnit"){
        suppressed.push({
          ...h,
          suppressedReason:"source-exact-phrase-larger-unit",
          suppressedBy:abeExactEvidence.analysisUnit,
          exactPhraseEvidence:abeExactEvidence
        });
        continue;
      }
      if(abeExactEvidence.action==="resolveCandidate" &&
         abeExactEvidence.candidateId &&
         hitCandidateIds(h).has(abeExactEvidence.candidateId)){
        resolved.push({
          ...h,
          analysisConfidence:"source-exact-phrase",
          contextResolution:{
            status:"resolved-by-source-exact-phrase",
            mode:"exact-user-source",
            supportCandidateIds:[abeExactEvidence.candidateId],
            exactPhraseEvidence:abeExactEvidence,
            evidence:"abe_seimei_grammar_evidence.json"
          }
        });
        continue;
      }
      if(abeExactEvidence.action==="resolveAuxiliaryLemma" &&
         abeExactEvidence.auxiliaryLemma &&
         hitHasAuxiliaryLemma(h,abeExactEvidence.auxiliaryLemma)){
        resolved.push({
          ...h,
          analysisConfidence:"source-exact-phrase",
          contextResolution:{
            status:"resolved-by-source-exact-phrase",
            mode:"exact-user-source",
            supportAuxiliaryLemma:abeExactEvidence.auxiliaryLemma,
            exactPhraseEvidence:abeExactEvidence,
            evidence:"abe_seimei_grammar_evidence.json"
          }
        });
        continue;
      }
    }

    const bunsetuBoundaryEvidence=exactHyakuninBunsetuBoundaryForHit(text,h);
    if(bunsetuBoundaryEvidence){
      suppressed.push({
        ...h,
        suppressedReason:"source-exact-bunsetu-lexical-unit",
        suppressedBy:bunsetuBoundaryEvidence.lexicalUnit,
        bunsetuBoundaryEvidence
      });
      continue;
    }

    const exactPhraseEvidence=exactHyakuninEvidenceForHit(text,h);
    if(exactPhraseEvidence){
      const candidateId=exactPhraseEvidence.analysis?.candidateId||null;
      const largerUnit=exactPhraseEvidence.analysisUnit.length>h.surface.length;
      if(exactPhraseEvidence.analysis?.kind==="non_auxiliary"){
        suppressed.push({
          ...h,
          suppressedReason:"audited-exact-phrase-nonauxiliary",
          suppressedBy:exactPhraseEvidence.analysisUnit,
          exactPhraseEvidence
        });
        continue;
      }
      if(largerUnit){
        suppressed.push({
          ...h,
          suppressedReason:"audited-exact-phrase-larger-unit",
          suppressedBy:exactPhraseEvidence.analysisUnit,
          exactPhraseEvidence
        });
        continue;
      }
      if(candidateId && hitCandidateIds(h).has(candidateId)){
        resolved.push({
          ...h,
          analysisConfidence:"audited-exact-phrase",
          contextResolution:{
            status:"resolved-by-audited-exact-phrase",
            mode:"exact-context-reviewed",
            supportCandidateIds:[candidateId],
            exactPhraseEvidence,
            evidence:"hyakunin_disambiguation_evidence.json"
          }
        });
        continue;
      }
    }

    const boundaryContainer=trustedLargerTokenContainer(boundaryHits,h);
    if(boundaryContainer){
      suppressed.push({
        ...h,
        suppressedReason:"known-larger-token",
        suppressedBy:boundaryContainer.surface,
        boundaryEvidence:{
          trust:boundaryContainer.trust,
          sources:boundaryContainer.sources
        }
      });
      continue;
    }

    const indexedContainer=indexedLargerDbContainer(raw,h);
    if(indexedContainer){
      suppressed.push({
        ...h,
        suppressedReason:"indexed-larger-surface",
        suppressedBy:indexedContainer.surface,
        boundaryEvidence:{
          basis:"strict containment by a longer indexed grammar/discrimination surface"
        }
      });
      continue;
    }

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
      const contextResolution=resolveContextRequiredHit(text,h);
      if(contextResolution?.status==="resolved-by-audited-connection" || contextResolution?.status==="resolved-by-audited-bidirectional-context" || contextResolution?.status==="resolved-by-source-left-surface" || contextResolution?.status==="resolved-by-source-hard-boundary"){
        resolved.push({
          ...h,
          contextResolution,
          analysisConfidence:"connection-supported-candidate"
        });
        continue;
      }
      suppressed.push({
        ...h,
        contextResolution,
        boundarySignals:localBoundarySignalsForHit(text,h),
        suppressedReason:contextResolution?.status==="candidate-support-only"
          ? "context-supported-but-not-unique"
          : "context-required-not-yet-resolved"
      });
      continue;
    }
    resolved.push(h);
  }

  resolved.push(...whole);
  for(const h of resolved){
    const links=kakariLinksForHit(exactKakariLinks,h);
    if(links.length){
      h.scopeLinkedKakari=links;
      h.analysisConfidence=h.analysisConfidence==="candidate-only"
        ? "scope-linked-candidate-support"
        : h.analysisConfidence;
    }
  }
  resolved.sort((a,b)=>a.start-b.start || (b.end-b.start)-(a.end-a.start));
  return {raw,resolved,suppressed,whole,boundaryHits,exactKakariLinks};
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
    knownBoundaryTokenHitCount:state.boundaryHits?.length||0,
    exactKakariLinkCount:state.exactKakariLinks?.length||0,
    exactKakariSupportedHitCount:dbHits.filter(h=>(h.scopeLinkedKakari||[]).length).length,
    contextResolvedCount:dbHits.filter(h=>h.contextResolution?.status==="resolved-by-audited-connection").length,
    exactPhraseResolvedCount:dbHits.filter(h=>h.contextResolution?.status==="resolved-by-audited-exact-phrase").length,
    sourceExactPhraseResolvedCount:dbHits.filter(h=>h.contextResolution?.status==="resolved-by-source-exact-phrase").length,
    sourceExactParticleResolvedCount:dbHits.filter(h=>h.contextResolution?.status==="resolved-by-source-exact-particle").length,
    sourceExactParticleSuppressedCount:state.suppressed.filter(h=>h.suppressedReason==="source-exact-particle-larger-unit").length,
    sourceExactPhraseSuppressedCount:state.suppressed.filter(h=>h.suppressedReason==="source-exact-phrase-larger-unit").length,
    bidirectionalContextResolvedCount:dbHits.filter(h=>h.contextResolution?.status==="resolved-by-audited-bidirectional-context").length,
    leftSurfaceResolvedCount:dbHits.filter(h=>h.contextResolution?.status==="resolved-by-source-left-surface").length,
    hardBoundaryResolvedCount:dbHits.filter(h=>h.contextResolution?.status==="resolved-by-source-hard-boundary").length,
    exactPhraseSuppressedCount:state.suppressed.filter(h=>String(h.suppressedReason||"").startsWith("audited-exact-phrase-")).length,
    bunsetuBoundarySuppressedCount:state.suppressed.filter(h=>h.suppressedReason==="source-exact-bunsetu-lexical-unit").length,
    contextSupportedButSuppressedCount:state.suppressed.filter(h=>h.suppressedReason==="context-supported-but-not-unique").length,
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
      contextSignals:h.contextSignals||[],
      contextResolution:h.contextResolution||null,
      boundarySignals:h.boundarySignals||null
    })),
    note:"shadow audit only; kakari-musubi signals are candidate support and never resolve scope by themselves."
  };
  window.CHECKPOINT_LAST_SHADOW_AUDIT=audit;
  return audit;
}
