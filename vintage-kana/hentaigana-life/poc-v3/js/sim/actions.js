window.HKLife=window.HKLife||{};
HKLife.Actions={
  async perform(world,actor,choice,engine){
    const target=choice.targetId&&HKLife.WorldState.findActor(world,choice.targetId);
    const token=choice.tokenId&&world.punctuation.find(x=>x.id===choice.tokenId);
    const emitState=state=>HKLife.Bus.emit("actor-state",{actorId:actor.id,state});
    const pause=ms=>engine.wait(ms);
    const moved=()=>{
      const changes=HKLife.Punctuation.followCarrier(world,actor);
      HKLife.Background.recordMovement(world,actor);
      if(changes.length)HKLife.Logger.internal(world,"state-change",{actorId:actor.id,stateChanges:changes});
    };

    HKLife.Logger.internal(world,"action-start",{actorId:actor.id,action:choice.id});
    actor.observationStats.events++;

    if(choice.id==="idle"){
      if(Math.random()<.22)HKLife.Logger.observation(world,"idle",actor.source+"はしばらく何もせずにいる。",{actorId:actor.id});
      actor.transient.boredom=HKLife.Utils.clamp(actor.transient.boredom+.03,0,1);
      actor.transient.fatigue=HKLife.Utils.clamp(actor.transient.fatigue-.02,0,1);
      return;
    }

    emitState("looking");await pause(250+actor.hiddenPersonality.caution*300);
    emitState("thinking");await pause(260+actor.hiddenPersonality.caution*450);
    emitState("acting");

    if(choice.id==="wander"){
      actor.x=HKLife.Utils.clamp(actor.x+(Math.random()-.5)*18,7,93);
      actor.y=HKLife.Utils.clamp(actor.y+(Math.random()-.5)*12,18,90);moved();
      actor.transient.boredom=HKLife.Utils.clamp(actor.transient.boredom-.1,0,1);
      if(Math.random()<.32)HKLife.Logger.observation(world,"wander",actor.source+"がふらりと場所を変えた。",{actorId:actor.id});
    }

    if(choice.id==="look_actor"&&target&&target.presence?.state!=="away")HKLife.Logger.observation(world,"look",actor.source+"が"+target.source+"をしばらく見ている。",{actorId:actor.id,targetId:target.id});

    if(choice.id==="approach"&&target&&target.presence?.state!=="away"){
      const dx=target.x-actor.x,dy=target.y-actor.y,mag=Math.hypot(dx,dy)||1;
      actor.x=HKLife.Utils.clamp(target.x-dx/mag*7,6,94);actor.y=HKLife.Utils.clamp(target.y-dy/mag*7,15,92);moved();
      actor.observationStats.approaches++;
      actor.relationships[target.id]=actor.relationships[target.id]||{familiarity:0,trust:0,caution:0};
      actor.relationships[target.id].familiarity=HKLife.Utils.clamp(actor.relationships[target.id].familiarity+.02,0,1);
      HKLife.Logger.observation(world,"approach",actor.source+"が"+target.source+"の近くへ行った。",{actorId:actor.id,targetId:target.id});
    }

    if(choice.id==="retreat"&&target&&target.presence?.state!=="away"){
      const dx=actor.x-target.x,dy=actor.y-target.y,mag=Math.hypot(dx,dy)||1;
      actor.x=HKLife.Utils.clamp(actor.x+dx/mag*9,6,94);actor.y=HKLife.Utils.clamp(actor.y+dy/mag*9,15,92);moved();
      HKLife.Logger.observation(world,"retreat",actor.source+"が"+target.source+"から少し距離を取った。",{actorId:actor.id,targetId:target.id});
    }

    if(choice.id==="inspect_punctuation"&&token){
      const interp=HKLife.Punctuation.interpret(world,actor,token);
      if(interp)HKLife.Logger.observation(world,"interpret",actor.source+"は"+token.glyph+"を「"+interp.label+"」のように見ているらしい。",{actorId:actor.id,tokenId:token.id,interpretation:interp.id});
    }

    if(choice.id==="touch_punctuation"&&token&&token.state==="resting"){
      const interp=HKLife.Punctuation.interpret(world,actor,token);
      actor.observationStats.punctuationTouches++;
      const from={x:token.x,y:token.y},to={x:HKLife.Utils.clamp(token.x+(Math.random()-.5)*4,4,96),y:HKLife.Utils.clamp(token.y+(Math.random()-.5)*3,10,94)};
      token.x=to.x;token.y=to.y;HKLife.Punctuation.recordMove(world,token,from,to,actor.id,"touch");
      const ch={kind:"punctuation-position",id:token.id,before:from,after:to};
      HKLife.Logger.observation(world,"touch-punctuation",actor.source+"が"+token.glyph+"に触れた"+(interp?"。"+interp.label+"として扱っているようにも見える。":"。"),{actorId:actor.id,tokenId:token.id,interpretation:interp?.id||null,stateChanges:[ch]});
    }

    if(choice.id==="pick_punctuation"&&token){
      const interp=HKLife.Punctuation.interpret(world,actor,token);
      const changes=HKLife.Punctuation.pick(world,actor,token);
      if(changes.length){actor.observationStats.picks++;HKLife.Logger.observation(world,"pick-punctuation",actor.source+"が"+token.glyph+"を拾った。",{actorId:actor.id,tokenId:token.id,interpretation:interp?.id||null,stateChanges:changes})}
    }

    if(choice.id==="place_punctuation"&&token&&actor.carrying===token.id){
      const changes=HKLife.Punctuation.place(world,actor,token);
      actor.observationStats.places++;
      HKLife.Logger.observation(world,"place-punctuation",actor.source+"が"+token.glyph+"を別の場所へ置いた。",{actorId:actor.id,tokenId:token.id,interpretation:token.interpretations?.[actor.id]||null,stateChanges:changes});
    }

    if(actor.carrying&&actor.carryStartedTick!==null&&world.ticks-actor.carryStartedTick>=HKLife.WORLD_CONFIG.carry.maxCarryTicks){
      const held=world.punctuation.find(p=>p.id===actor.carrying);
      if(held){
        const changes=HKLife.Punctuation.place(world,actor,held);
        actor.observationStats.places++;
        HKLife.Logger.observation(world,"place-punctuation",actor.source+"は持っていた"+held.glyph+"をそっと置いた。",{actorId:actor.id,tokenId:held.id,stateChanges:changes});
      }
    }

    if(choice.id==="dig"){
      const made=HKLife.Background.addHole(world,actor);
      if(made){
        actor.observationStats.digs++;
        const changes=[
          {kind:"persistent-modification",id:made.hole.id,before:null,after:"hole"},
          {kind:"persistent-modification",id:made.soil.id,before:null,after:"soil-pile"}
        ];
        HKLife.Logger.observation(world,"dig",actor.source+"が地面を掘り、小さな穴が残った。",{actorId:actor.id,modificationId:made.hole.id,stateChanges:changes});
        HKLife.Bus.emit("toast",actor.source+"が穴を掘った");
      }
    }

    if(choice.id==="rest"){
      if(actor.carrying){
        const held=world.punctuation.find(p=>p.id===actor.carrying);
        if(held){
          const changes=HKLife.Punctuation.place(world,actor,held);
          actor.observationStats.places++;
          HKLife.Logger.observation(world,"place-punctuation",actor.source+"は休む前に"+held.glyph+"を置いた。",{actorId:actor.id,tokenId:held.id,stateChanges:changes});
        }
      }
      actor.transient.fatigue=HKLife.Utils.clamp(actor.transient.fatigue-.2,0,1);
      if(Math.random()<.35)HKLife.Logger.observation(world,"rest",actor.source+"がしばらく休んでいる。",{actorId:actor.id});
    }

    actor.transient.fatigue=HKLife.Utils.clamp(actor.transient.fatigue+.025,0,1);
    emitState("");await pause(180);
  }
};
