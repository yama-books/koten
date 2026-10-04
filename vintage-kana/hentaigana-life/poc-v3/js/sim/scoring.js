window.HKLife=window.HKLife||{};
HKLife.Scoring={
  candidates(world,actor){
    const p=actor.hiddenPersonality,t=actor.transient;
    const nearActor=world.actors.filter(a=>a.id!==actor.id&&a.presence!=="away").sort((a,b)=>HKLife.Utils.distance(actor,a)-HKLife.Utils.distance(actor,b))[0];
    const nearPunct=world.punctuation.filter(x=>(x.state||"resting")==="resting"&&!x.holder).sort((a,b)=>HKLife.Utils.distance(actor,a)-HKLife.Utils.distance(actor,b))[0];
    const zone=HKLife.WorldState.zoneAt(actor.x,actor.y);
    const out=[];
    const add=(id,weight,ctx={})=>out.push({value:{id,...ctx},weight:Math.max(.01,weight)});

    add("idle",1.1+(p.caution*.35)+(1-p.playfulness)*.2);
    add("wander",.65+p.mobility*.75+t.boredom*.25);
    add("rest",.25+t.fatigue*1.6+p.settling*.3);
    if(nearActor){
      add("look_actor",.25+p.curiosity*.65+p.empathy*.15,{targetId:nearActor.id});
      add("approach",.15+p.approach*.8+p.curiosity*.2,{targetId:nearActor.id});
      add("retreat",.08+p.caution*.55+(actor.source==="惡"?.45:0),{targetId:nearActor.id});
    }
    if(actor.carrying){
      const heldAge=Math.max(0,world.ticks-(actor.carryingSinceTick??world.ticks));
      add("place_punctuation",.3+p.environmentInterest*.32+p.craftingInterest*.28+Math.min(.7,heldAge/30*.7),{tokenId:actor.carrying});
    }else if(nearPunct){
      const d=HKLife.Utils.distance(actor,nearPunct);
      add("inspect_punctuation",.16+p.curiosity*.72+(d<16?.35:0),{tokenId:nearPunct.id});
      add("touch_punctuation",.08+p.playfulness*.5+p.environmentInterest*.35+(d<10?.3:0),{tokenId:nearPunct.id});
      add("pick_punctuation",.05+p.playfulness*.24+p.environmentInterest*.28+p.craftingInterest*.18+(d<10?.28:0),{tokenId:nearPunct.id});
    }
    if(zone?.tags.includes("diggable")){
      const digBias=(actor.source==="希"?.18:0)+(actor.source==="隱"?.12:0);
      add("dig",.03+p.environmentInterest*.18+p.playfulness*.09+digBias);
    }
    HKLife.Logger.internal(world,"candidate-set",{actorId:actor.id,candidates:out.map(x=>({id:x.value.id,weight:+x.weight.toFixed(3)}))});
    return out;
  },
  choose(world,actor){
    return HKLife.Utils.weighted(this.candidates(world,actor));
  }
};
