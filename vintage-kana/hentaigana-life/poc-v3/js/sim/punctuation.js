window.HKLife=window.HKLife||{};
HKLife.Punctuation={
  interpret(world,actor,token){
    if(!token||token.state==="merged")return null;
    const options=HKLife.PUNCTUATION_CATALOG.pocInterpretations[token.kind]||[];
    const zone=HKLife.WorldState.zoneAt(token.x,token.y);
    const tags=new Set(zone?.tags||[]);
    const weighted=options.map(o=>{
      let weight=.25+(o.actorBias?.[actor.source]||0);
      if(o.contexts.some(c=>tags.has(c)))weight+=.35;
      const old=token.interpretations[actor.id];
      if(old===o.id)weight+=.12;
      return{value:o,weight};
    });
    const chosen=HKLife.Utils.weighted(weighted);
    if(!chosen)return null;
    this.recordHistory(token,{at:world.clockMinutes,actorId:actor.id,interpretation:chosen.id},token.interpretations[actor.id]);
    token.interpretations[actor.id]=chosen.id;
    return chosen;
  },
  emptyHistorySummary(){return{total:0,dropped:0,reinterpretations:0,byInterpretation:{},byActor:{},firstAt:null,lastAt:null}},
  emptyMoveSummary(){return{moves:0,dropped:0,totalDistance:0,byActor:{},byHow:{},firstTick:null,lastTick:null}},
  ensurePhysicalState(token){
    token.state=token.state||"resting";
    token.moveHistory=token.moveHistory||[];
    token.moveSummary=token.moveSummary||this.emptyMoveSummary();
    token.kindHistory=token.kindHistory||[];
    token.parts=token.parts||[];
    token.interpretations=token.interpretations||{};
    if(token.restingSinceTick===undefined)token.restingSinceTick=0;
  },
  recordMove(world,token,from,to,actorId,how){
    this.ensurePhysicalState(token);
    const distance=Math.hypot((to.x||0)-(from.x||0),(to.y||0)-(from.y||0));
    const summary=token.moveSummary;
    summary.moves++;
    summary.totalDistance=Number((summary.totalDistance+distance).toFixed(3));
    if(actorId)summary.byActor[actorId]=(summary.byActor[actorId]||0)+1;
    summary.byHow[how]=(summary.byHow[how]||0)+1;
    if(summary.firstTick===null)summary.firstTick=world.ticks;
    summary.lastTick=world.ticks;
    token.moveHistory.push({tick:world.ticks,worldMinute:world.clockMinutes,from,to,actorId:actorId||null,how});
    const limit=HKLife.WORLD_CONFIG.punctuationHistory.moveRecentLimit;
    if(token.moveHistory.length>limit){
      const excess=token.moveHistory.length-limit;
      token.moveHistory.splice(0,excess);summary.dropped+=excess;
    }
    return{kind:"punctuation-move",scope:"world",physical:true,id:token.id,before:from,after:to,by:actorId||null,how};
  },
  moveToken(world,token,x,y,actorId,how){
    this.ensurePhysicalState(token);
    const from={x:token.x,y:token.y},to={x:HKLife.Utils.clamp(x,4,96),y:HKLife.Utils.clamp(y,10,94)};
    if(Math.hypot(to.x-from.x,to.y-from.y)<.01)return null;
    token.x=to.x;token.y=to.y;
    return this.recordMove(world,token,from,to,actorId,how);
  },
  pick(world,actor,token){
    this.ensurePhysicalState(token);
    if(actor.carrying||token.holder||token.state!=="resting")return[];
    const before={holder:token.holder,state:token.state};
    token.holder=actor.id;token.state="held";token.restingSinceTick=null;
    actor.carrying=token.id;actor.carryingSinceTick=world.ticks;
    const changes=[{kind:"punctuation-holder",scope:"world",physical:true,id:token.id,before,after:{holder:actor.id,state:"held"},by:actor.id}];
    const moved=this.moveToken(world,token,actor.x+2,actor.y+1,actor.id,"pick");
    if(moved)changes.push(moved);
    return changes;
  },
  placementTarget(world,actor,token,rng=Math.random){
    const interp=token.interpretations?.[actor.id];
    let x=actor.x+(rng()-.5)*8,y=actor.y+(rng()-.5)*6;
    if(interp==="seed"){
      const holes=world.area.modifications.filter(m=>m.kind==="hole");
      if(holes.length){const h=holes.sort((a,b)=>HKLife.Utils.distance(actor,a)-HKLife.Utils.distance(actor,b))[0];x=h.x;y=h.y;}
    }else if(interp==="egg"&&actor.home){
      x=actor.x*.65+actor.home.x*.35;y=actor.y*.65+actor.home.y*.35;
    }else if(interp==="stone"){
      const piles=world.area.modifications.filter(m=>m.kind==="soil-pile");
      if(piles.length){const p=piles.sort((a,b)=>HKLife.Utils.distance(actor,a)-HKLife.Utils.distance(actor,b))[0];x=p.x+(rng()-.5)*5;y=p.y+(rng()-.5)*3;}
    }
    return{x:HKLife.Utils.clamp(x,4,96),y:HKLife.Utils.clamp(y,10,94)};
  },
  place(world,actor,rng=Math.random,how="place"){
    const token=actor.carrying&&world.punctuation.find(t=>t.id===actor.carrying);
    if(!token)return{token:null,changes:[]};
    this.ensurePhysicalState(token);
    const interpretation=token.interpretations?.[actor.id]||null;
    const before={holder:token.holder,state:token.state};
    const target=this.placementTarget(world,actor,token,rng);
    token.holder=null;token.state="resting";token.lastPlacedBy=actor.id;token.restingSinceTick=world.ticks;
    actor.carrying=null;actor.carryingSinceTick=null;
    const changes=[{kind:"punctuation-holder",scope:"world",physical:true,id:token.id,before,after:{holder:null,state:"resting"},by:actor.id,how}];
    const moved=this.moveToken(world,token,target.x,target.y,actor.id,how);
    if(moved)changes.push(moved);
    if(token.kind==="period"&&interpretation==="seed"){
      const zone=HKLife.WorldState.zoneAt(token.x,token.y);
      const nearHole=world.area.modifications.some(m=>m.kind==="hole"&&HKLife.Utils.distance(m,token)<7);
      if(nearHole||zone?.tags.includes("diggable")){
        const old=token.growth||null;
        token.growth={state:"planted",plantedAtTick:world.ticks,sproutAtTick:world.ticks+45+Math.floor(rng()*46),plantedBy:actor.id};
        changes.push({kind:"seed-planted",scope:"world",physical:true,id:token.id,before:old,after:token.growth,by:actor.id});
      }
    }
    return{token,changes};
  },
  followHolder(world,actor,how){
    const token=actor.carrying&&world.punctuation.find(t=>t.id===actor.carrying);
    if(!token)return null;
    return this.moveToken(world,token,actor.x+2,actor.y+1,actor.id,how||"carry");
  },
  recordKind(world,token,from,to,reason,actorId=null){
    this.ensurePhysicalState(token);
    token.kindHistory.push({tick:world.ticks,worldMinute:world.clockMinutes,from,to,reason,actorId});
    const limit=HKLife.WORLD_CONFIG.punctuationHistory.kindRecentLimit;
    if(token.kindHistory.length>limit)token.kindHistory.splice(0,token.kindHistory.length-limit);
  },
  setKind(world,token,to,reason,actorId=null){
    this.ensurePhysicalState(token);
    if(token.kind===to)return null;
    const from=token.kind;
    this.recordKind(world,token,from,to,reason,actorId);
    token.kind=to;token.glyph=HKLife.PUNCTUATION_CATALOG.tokenKinds[to].glyph;
    token.interpretations={};
    return{kind:"punctuation-kind",scope:"world",physical:true,id:token.id,before:from,after:to,reason,by:actorId};
  },
  mergeCommas(world,a,b){
    const token=HKLife.WorldState.makePunctuation("dakuten",(a.x+b.x)/2,(a.y+b.y)/2);
    token.parts=[a.id,b.id];token.createdAtTick=world.ticks;
    a.state="merged";b.state="merged";a.mergedInto=token.id;b.mergedInto=token.id;
    world.punctuation.push(token);
    const changes=[
      {kind:"punctuation-merged",scope:"world",physical:true,id:a.id,before:"resting",after:"merged",into:token.id},
      {kind:"punctuation-merged",scope:"world",physical:true,id:b.id,before:"resting",after:"merged",into:token.id},
      {kind:"punctuation-created",scope:"world",physical:true,id:token.id,before:null,after:{kind:"dakuten",parts:[a.id,b.id]}}
    ];
    HKLife.Logger.observation(world,"punctuation-transform","二つの、が寄り添い、゛のような形になった。",{tokenId:token.id,stateChanges:changes});
    return true;
  },
  splitDakuten(world,token){
    const parts=(token.parts||[]).map(id=>world.punctuation.find(t=>t.id===id)).filter(Boolean);
    if(parts.length!==2)return false;
    const changes=[];
    for(let i=0;i<parts.length;i++){
      const part=parts[i];part.state="resting";part.mergedInto=null;part.holder=null;
      const before={state:"merged"};
      part.x=HKLife.Utils.clamp(token.x+(i?2:-2),4,96);part.y=HKLife.Utils.clamp(token.y+(i?1:-1),10,94);
      part.restingSinceTick=world.ticks;
      changes.push({kind:"punctuation-restored",scope:"world",physical:true,id:part.id,before,after:{state:"resting",x:part.x,y:part.y},from:token.id});
    }
    token.state="merged";
    changes.push({kind:"punctuation-split",scope:"world",physical:true,id:token.id,before:"resting",after:"merged",parts:token.parts});
    HKLife.Logger.observation(world,"punctuation-transform","゛がほどけ、もとの二つの、に分かれた。",{tokenId:token.id,stateChanges:changes});
    return true;
  },
  tickTransforms(world,rng=Math.random){
    const cfg=HKLife.WORLD_CONFIG.punctuationTransforms;
    const active=world.punctuation.filter(t=>(t.state||"resting")==="resting"&&!t.holder);
    const commas=active.filter(t=>t.kind==="comma");
    for(let i=0;i<commas.length;i++){
      const b=commas.slice(i+1).find(x=>HKLife.Utils.distance(commas[i],x)<4);
      if(b&&rng()<cfg.commaMergeChance)return this.mergeCommas(world,commas[i],b);
    }
    for(const token of active){
      const zone=HKLife.WorldState.zoneAt(token.x,token.y);
      const wet=!!zone?.tags.includes("wet");
      if(token.kind==="period"){
        const chance=(wet?cfg.periodToHandakutenWetChance:cfg.periodToHandakutenDryChance)+(world.weather==="light-rain"?cfg.rainBonusChance:0);
        if(rng()<chance){
          const change=this.setKind(world,token,"handakuten",wet?"wetness":"rain-or-ambient");
          HKLife.Logger.observation(world,"punctuation-transform",wet?"水辺の。が、いつの間にか輪のような゜になっていた。":"。が、ふっと中空の゜のような形になった。",{tokenId:token.id,stateChanges:[change]});
          return true;
        }
      }else if(token.kind==="handakuten"){
        const chance=wet?cfg.handakutenToPeriodWetChance:cfg.handakutenToPeriodDryChance;
        if(rng()<chance){
          const change=this.setKind(world,token,"period",wet?"settled-in-water":"drying");
          HKLife.Logger.observation(world,"punctuation-transform","゜の輪がしぼみ、。のような丸へ戻った。",{tokenId:token.id,stateChanges:[change]});
          return true;
        }
      }else if(token.kind==="dakuten"&&token.parts?.length===2&&rng()<cfg.dakutenSplitChance){
        return this.splitDakuten(world,token);
      }
    }
    return false;
  },
  recordHistory(token,entry,previous){
    if(!token.historySummary){
      token.historySummary=this.emptyHistorySummary();
      for(const old of token.history||[])this.countHistory(token.historySummary,old,undefined);
    }
    token.history=token.history||[];
    this.countHistory(token.historySummary,entry,previous);
    token.history.push(entry);
    const limit=HKLife.WORLD_CONFIG.punctuationHistory.recentLimit;
    if(token.history.length>limit){
      const excess=token.history.length-limit;
      token.history.splice(0,excess);
      token.historySummary.dropped+=excess;
    }
  },
  countHistory(summary,entry,previous){
    summary.total++;
    if(previous!==undefined&&previous!==entry.interpretation)summary.reinterpretations++;
    summary.byInterpretation[entry.interpretation]=(summary.byInterpretation[entry.interpretation]||0)+1;
    const byActor=summary.byActor[entry.actorId]||(summary.byActor[entry.actorId]={});
    byActor[entry.interpretation]=(byActor[entry.interpretation]||0)+1;
    if(summary.firstAt===null)summary.firstAt=entry.at;
    summary.lastAt=entry.at;
  }
};
