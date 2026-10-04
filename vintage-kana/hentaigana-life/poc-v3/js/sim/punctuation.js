window.HKLife=window.HKLife||{};
HKLife.Punctuation={
  interpret(world,actor,token){
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
  recordHistory(token,entry,previous){
    if(!token.historySummary){
      token.historySummary=this.emptyHistorySummary();
      for(const old of token.history)this.countHistory(token.historySummary,old,undefined);
    }
    this.countHistory(token.historySummary,entry,previous);
    token.history.push(entry);
    const limit=HKLife.WORLD_CONFIG.punctuationHistory.recentLimit;
    if(token.history.length>limit){const excess=token.history.length-limit;token.history.splice(0,excess);token.historySummary.dropped+=excess}
  },
  countHistory(summary,entry,previous){
    summary.total++;
    if(previous!==undefined&&previous!==entry.interpretation)summary.reinterpretations++;
    summary.byInterpretation[entry.interpretation]=(summary.byInterpretation[entry.interpretation]||0)+1;
    const byActor=summary.byActor[entry.actorId]||(summary.byActor[entry.actorId]={});
    byActor[entry.interpretation]=(byActor[entry.interpretation]||0)+1;
    if(summary.firstAt===null)summary.firstAt=entry.at;
    summary.lastAt=entry.at;
  },
  recordMove(world,token,from,to,actorId,how){
    const dist=Math.hypot(to.x-from.x,to.y-from.y);
    token.moveSummary=token.moveSummary||{moves:0,totalDistance:0,byActor:{}};
    token.moveSummary.moves++;
    token.moveSummary.totalDistance=+(token.moveSummary.totalDistance+dist).toFixed(3);
    if(actorId)token.moveSummary.byActor[actorId]=(token.moveSummary.byActor[actorId]||0)+1;
    token.moveHistory=token.moveHistory||[];
    token.moveHistory.push({tick:world.ticks,worldMinute:world.clockMinutes,from,to,by:actorId||null,how});
    const limit=HKLife.WORLD_CONFIG.punctuationHistory.moveRecentLimit;
    if(token.moveHistory.length>limit)token.moveHistory.splice(0,token.moveHistory.length-limit);
  },
  pick(world,actor,token){
    if(!token||token.state!=="resting"||actor.carrying)return[];
    const before={holder:token.holder,state:token.state,x:token.x,y:token.y};
    token.holder=actor.id;token.state="held";token.x=actor.x+2;token.y=actor.y-3;
    actor.carrying=token.id;actor.carryStartedTick=world.ticks;
    const change={kind:"punctuation-holder",id:token.id,before,after:{holder:actor.id,state:"held",x:token.x,y:token.y}};
    this.recordMove(world,token,{x:before.x,y:before.y},{x:token.x,y:token.y},actor.id,"pick");
    return[change];
  },
  followCarrier(world,actor){
    if(!actor.carrying)return[];
    const token=world.punctuation.find(p=>p.id===actor.carrying);
    if(!token)return[];
    const from={x:token.x,y:token.y};const to={x:actor.x+2,y:actor.y-3};
    token.x=to.x;token.y=to.y;
    this.recordMove(world,token,from,to,actor.id,"carry");
    return[{kind:"punctuation-position",id:token.id,before:from,after:to}];
  },
  preferredPlace(world,actor,token){
    const interpId=token.interpretations?.[actor.id]||null;
    if(interpId==="seed"){
      const holes=world.area.modifications.filter(m=>m.kind==="hole");
      if(holes.length){const h=HKLife.Utils.pick(holes);return{x:h.x,y:h.y,interpretation:interpId}}
      return{x:HKLife.Utils.clamp(actor.x+(Math.random()-.5)*8,12,72),y:HKLife.Utils.clamp(actor.y+(Math.random()-.5)*8,46,88),interpretation:interpId};
    }
    if(interpId==="egg")return{x:HKLife.Utils.clamp(actor.home.x+(Math.random()-.5)*8,5,95),y:HKLife.Utils.clamp(actor.home.y+(Math.random()-.5)*6,16,92),interpretation:interpId};
    const r=HKLife.WORLD_CONFIG.carry.placeRadius;
    return{x:HKLife.Utils.clamp(actor.x+(Math.random()-.5)*r,4,96),y:HKLife.Utils.clamp(actor.y+(Math.random()-.5)*r,10,94),interpretation:interpId};
  },
  dropAt(world,actor,token,x,y,how){
    const before={holder:token.holder,state:token.state,x:token.x,y:token.y};
    token.holder=null;token.state="resting";token.x=x;token.y=y;token.lastPlacedBy=actor.id;token.restingSinceTick=world.ticks;
    actor.carrying=null;actor.carryStartedTick=null;
    this.recordMove(world,token,{x:before.x,y:before.y},{x,y},actor.id,how);
    return[{kind:"punctuation-holder",id:token.id,before,after:{holder:null,state:"resting",x,y}}];
  },
  place(world,actor,token){
    const target=this.preferredPlace(world,actor,token);
    const changes=this.dropAt(world,actor,token,target.x,target.y,"place");
    if(target.interpretation==="seed"){
      const zone=HKLife.WorldState.zoneAt(token.x,token.y);
      const nearHole=world.area.modifications.some(m=>m.kind==="hole"&&HKLife.Utils.distance(m,token)<7);
      if(zone?.tags.includes("diggable")||nearHole){
        const before=token.planted;
        token.planted=true;token.plantedAtTick=world.ticks;token.sproutDueTick=world.ticks+HKLife.WORLD_CONFIG.usage.sproutDelayTicks;
        changes.push({kind:"punctuation-planted",id:token.id,before,after:true});
      }
    }
    changes.push(...HKLife.Background.recordPlacement(world,token,actor,target.interpretation));
    return changes;
  },
  setKind(world,token,newKind,reason){
    if(token.kind===newKind)return[];
    const oldKind=token.kind,def=HKLife.PUNCTUATION_CATALOG.tokenKinds[newKind];
    token.kindHistory=token.kindHistory||[];
    token.kindHistory.push({tick:world.ticks,worldMinute:world.clockMinutes,from:oldKind,to:newKind,reason});
    const lim=HKLife.WORLD_CONFIG.punctuationHistory.kindRecentLimit;
    if(token.kindHistory.length>lim)token.kindHistory.splice(0,token.kindHistory.length-lim);
    token.kind=newKind;token.glyph=def.glyph;
    token.interpretations={};
    const change={kind:"punctuation-kind",id:token.id,before:oldKind,after:newKind,reason};
    HKLife.Logger.observation(world,"punctuation-transform",oldKind==="period"?"。が輪のような゜へ変わった。":"゜がつぶれるように。へ戻った。",{tokenId:token.id,stateChanges:[change]});
    return[change];
  },
  processEnvironment(world){
    const cfg=HKLife.WORLD_CONFIG.transforms;
    const candidates=world.punctuation.filter(p=>p.state==="resting"&&(p.kind==="period"||p.kind==="handakuten"));
    if(!candidates.length)return;
    const token=HKLife.Utils.pick(candidates);
    const zone=HKLife.WorldState.zoneAt(token.x,token.y);
    const wet=!!zone?.tags.includes("wet")||world.weather==="light-rain";
    if(token.kind==="period"&&wet&&Math.random()<cfg.wetPeriodToHandakutenChance)this.setKind(world,token,"handakuten","wet-weighted");
    else if(token.kind==="handakuten"&&!wet&&Math.random()<cfg.dryHandakutenToPeriodChance)this.setKind(world,token,"period","dry-weighted");
  }
};
