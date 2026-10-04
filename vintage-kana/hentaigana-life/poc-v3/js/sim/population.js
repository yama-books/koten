window.HKLife=window.HKLife||{};
HKLife.Population={
  range(pair,rng=Math.random){
    const [min,max]=pair;return min+Math.floor(rng()*(max-min+1));
  },
  present(world){return world.actors.filter(a=>a.presence!=="away")},
  fluids(world){return world.actors.filter(a=>a.residence==="fluid")},
  history(actor,entry){
    actor.presenceHistory=actor.presenceHistory||[];
    actor.presenceHistory.push(entry);
    const limit=HKLife.WORLD_CONFIG.population.presenceHistoryLimit;
    if(actor.presenceHistory.length>limit)actor.presenceHistory.splice(0,actor.presenceHistory.length-limit);
  },
  ensure(world,rng=Math.random){
    world.population=world.population||{nextCheckTick:0,lastCheckTick:null};
    for(const actor of this.fluids(world)){
      actor.presence=actor.presence||"present";
      actor.visit=actor.visit||{arrivedAtTick:actor.presence==="present"?world.ticks:null,leaveAtTick:null,lastReason:null};
      if(actor.presence==="present"&&!Number.isInteger(actor.visit.leaveAtTick)){
        actor.visit.leaveAtTick=world.ticks+this.range(HKLife.WORLD_CONFIG.population.stayTicks,rng);
      }
    }
    if(!Number.isInteger(world.population.nextCheckTick)){
      world.population.nextCheckTick=world.ticks+this.range(HKLife.WORLD_CONFIG.population.visitCheckTicks,rng);
    }
  },
  affinityWeight(world,actor){
    const affinity=actor.visitAffinity||{type:"generic",base:.5};
    let weight=affinity.base??.5;
    const phase=HKLife.Utils.timePhase(world.clockMinutes);
    if(affinity.phases?.includes(phase))weight+=.22;
    if(affinity.type==="wet"){
      const wetTokens=world.punctuation.filter(t=>t.state!=="merged"&&HKLife.WorldState.zoneAt(t.x,t.y)?.tags.includes("wet")).length;
      weight+=Math.min(.8,wetTokens*.14)+(world.weather==="light-rain"?.42:0);
    }
    if(affinity.type==="earth"){
      const earth=world.area.modifications.filter(m=>m.kind==="hole"||m.kind==="soil-pile").length;
      weight+=Math.min(.9,earth*.045);
    }
    if(affinity.type==="movement"){
      const moves=world.punctuation.reduce((sum,t)=>sum+(t.moveSummary?.moves||0),0);
      weight+=Math.min(.85,moves/35);
    }
    if(affinity.type==="plant"){
      const sprouts=world.area.modifications.filter(m=>m.kind==="sprout").length;
      weight+=Math.min(1,sprouts*.32);
    }
    let familiarity=0;
    for(const other of this.present(world)){
      familiarity+=(other.relationships?.[actor.id]?.familiarity||0)+(actor.relationships?.[other.id]?.familiarity||0);
    }
    return Math.max(.05,weight+Math.min(.4,familiarity*.18));
  },
  leave(world,actor,rng=Math.random){
    if(actor.carrying){
      const placed=HKLife.Punctuation.place(world,actor,rng,"leave");
      if(placed.token)HKLife.Logger.observation(world,"place-punctuation",`${actor.source}は帰る前に${placed.token.glyph}を置いた。`,{actorId:actor.id,tokenId:placed.token.id,stateChanges:placed.changes});
    }
    const before=actor.presence;
    actor.presence="away";actor.visit.leaveAtTick=null;actor.visit.leftAtTick=world.ticks;
    this.history(actor,{type:"leave",tick:world.ticks,worldMinute:world.clockMinutes});
    const change={kind:"actor-presence",scope:"world",physical:true,id:actor.id,before,after:"away"};
    HKLife.Logger.observation(world,"actor-leave",`${actor.source}が公園を出ていった。`,{actorId:actor.id,stateChanges:[change]});
  },
  arrive(world,actor,rng=Math.random){
    actor.presence="present";actor.x=rng()<.5?6:94;actor.y=44+rng()*38;
    actor.visit.arrivedAtTick=world.ticks;
    actor.visit.leaveAtTick=world.ticks+this.range(HKLife.WORLD_CONFIG.population.stayTicks,rng);
    actor.visit.lastReason=actor.visitAffinity?.type||"generic";
    this.history(actor,{type:"arrive",tick:world.ticks,worldMinute:world.clockMinutes,reason:actor.visit.lastReason});
    const change={kind:"actor-presence",scope:"world",physical:true,id:actor.id,before:"away",after:"present"};
    HKLife.Logger.observation(world,"actor-arrive",`${actor.source}が公園へやってきた。`,{actorId:actor.id,stateChanges:[change]});
  },
  step(world,rng=Math.random){
    this.ensure(world,rng);
    const due=this.fluids(world).filter(a=>a.presence==="present"&&Number.isInteger(a.visit?.leaveAtTick)&&world.ticks>=a.visit.leaveAtTick);
    if(due.length)this.leave(world,due[0],rng);
    if(world.ticks<world.population.nextCheckTick)return;
    world.population.lastCheckTick=world.ticks;
    world.population.nextCheckTick=world.ticks+this.range(HKLife.WORLD_CONFIG.population.visitCheckTicks,rng);
    const presentCount=this.fluids(world).filter(a=>a.presence==="present").length;
    if(presentCount>=HKLife.WORLD_CONFIG.population.fluidSlots)return;
    const away=this.fluids(world).filter(a=>a.presence==="away");
    if(!away.length)return;
    const actor=HKLife.Utils.weighted(away.map(a=>({value:a,weight:this.affinityWeight(world,a)})),rng);
    if(actor)this.arrive(world,actor,rng);
  }
};
