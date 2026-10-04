window.HKLife=window.HKLife||{};
HKLife.Population={
  range(min,max){return min+Math.floor(Math.random()*(max-min+1))},
  initialize(world){
    const cfg=HKLife.WORLD_CONFIG.population;
    for(const actor of world.actors){
      actor.presence=actor.presence||{state:"present",arrivedAtTick:0,leaveAtTick:null,visits:1,awaySinceTick:null};
      if(actor.residence==="fluid"&&actor.presence.state==="present"){
        actor.presence.leaveAtTick=world.ticks+this.range(cfg.stayMinTicks,cfg.stayMaxTicks);
      }
    }
    world.population=world.population||{};
    world.population.nextCheckTick=world.ticks+this.range(cfg.checkMinTicks,cfg.checkMaxTicks);
    world.population.lastChangeTick=world.population.lastChangeTick||0;
  },
  arrivalWeight(world,actor){
    const a=actor.arrivalAffinity||{},mods=world.area.modifications||[];
    const holes=mods.filter(m=>m.kind==="hole").length;
    const soils=mods.filter(m=>m.kind==="soil-pile").length;
    const sprouts=mods.filter(m=>m.kind==="sprout").length;
    const caches=mods.filter(m=>m.kind==="period-cache").length;
    const moved=(world.punctuation||[]).reduce((s,p)=>s+(p.moveSummary?.moves||0),0);
    const carrying=HKLife.WorldState.presentActors(world).filter(x=>x.carrying).length;
    return Math.max(.01,(a.base??1)+(a.holes||0)*Math.min(4,holes)+(a.soilPiles||0)*Math.min(4,soils)+(a.sprouts||0)*Math.min(3,sprouts)+(a.caches||0)*Math.min(2,caches)+(a.movedTokens||0)*Math.min(1,moved/20)+(a.carrying||0)*carrying+(a.punctuation||0)*(world.punctuation?.filter(p=>p.state!=="merged").length||0)+(world.weather==="light-rain"?(a.rain||0):0));
  },
  arrive(world,actor){
    const cfg=HKLife.WORLD_CONFIG.population;
    actor.presence.state="present";
    actor.presence.arrivedAtTick=world.ticks;
    actor.presence.leaveAtTick=world.ticks+this.range(cfg.stayMinTicks,cfg.stayMaxTicks);
    actor.presence.awaySinceTick=null;
    actor.presence.visits=(actor.presence.visits||0)+1;
    actor.x=Math.random()<.5?6:94;
    actor.y=28+Math.random()*56;
    world.population.lastChangeTick=world.ticks;
    const change={kind:"actor-presence",id:actor.id,before:"away",after:"present"};
    HKLife.Logger.observation(world,"arrival",actor.source+"が公園へやって来た。",{actorId:actor.id,stateChanges:[change]});
    return change;
  },
  depart(world,actor){
    const changes=[];
    if(actor.carrying){
      const token=world.punctuation.find(p=>p.id===actor.carrying);
      if(token)changes.push(...HKLife.Punctuation.dropAt(world,actor,token,actor.x,actor.y,"departure"));
    }
    actor.presence.state="away";
    actor.presence.awaySinceTick=world.ticks;
    actor.presence.leaveAtTick=null;
    world.population.lastChangeTick=world.ticks;
    const change={kind:"actor-presence",id:actor.id,before:"present",after:"away"};
    changes.push(change);
    HKLife.Logger.observation(world,"departure",actor.source+"が公園を離れていった。",{actorId:actor.id,stateChanges:changes});
    return changes;
  },
  process(world){
    const cfg=HKLife.WORLD_CONFIG.population;
    if(world.ticks<world.population.nextCheckTick)return;
    const fluids=world.actors.filter(a=>a.residence==="fluid");
    const present=fluids.filter(a=>a.presence?.state==="present");
    let departedId=null;
    const due=present.filter(a=>a.presence.leaveAtTick!==null&&a.presence.leaveAtTick<=world.ticks);
    if(due.length){
      const actor=HKLife.Utils.pick(due);
      departedId=actor.id;
      this.depart(world,actor);
    }
    const stillPresent=fluids.filter(a=>a.presence?.state==="present");
    if(stillPresent.length<cfg.fluidSlots){
      const away=fluids.filter(a=>a.presence?.state==="away"&&a.id!==departedId);
      if(away.length){
        const chosen=HKLife.Utils.weighted(away.map(a=>({value:a,weight:this.arrivalWeight(world,a)})));
        if(chosen)this.arrive(world,chosen);
      }
    }
    world.population.nextCheckTick=world.ticks+this.range(cfg.checkMinTicks,cfg.checkMaxTicks);
  }
};
