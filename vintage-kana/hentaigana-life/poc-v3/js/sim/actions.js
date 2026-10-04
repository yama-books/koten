window.HKLife=window.HKLife||{};
HKLife.Actions={
  async perform(world,actor,choice,engine){
    const target=choice.targetId&&HKLife.WorldState.findActor(world,choice.targetId);
    const token=choice.tokenId&&world.punctuation.find(x=>x.id===choice.tokenId);
    const emitState=(state)=>HKLife.Bus.emit("actor-state",{actorId:actor.id,state});
    const pause=ms=>engine.wait(ms);
    const recordCarry=(how)=>{
      const change=HKLife.Punctuation.followHolder(world,actor,how);
      if(change)HKLife.Logger.internal(world,"state-change",{actorId:actor.id,action:choice.id,stateChanges:[change]});
    };

    HKLife.Logger.internal(world,"action-start",{actorId:actor.id,action:choice.id});
    actor.observationStats.events++;

    if(choice.id==="idle"){
      if(Math.random()<.22)HKLife.Logger.observation(world,"idle",`${actor.source}はしばらく何もせずにいる。`,{actorId:actor.id});
      actor.transient.boredom=HKLife.Utils.clamp(actor.transient.boredom+.03,0,1);
      actor.transient.fatigue=HKLife.Utils.clamp(actor.transient.fatigue-.02,0,1);
      return;
    }

    emitState("looking");await pause(250+actor.hiddenPersonality.caution*300);
    emitState("thinking");await pause(260+actor.hiddenPersonality.caution*450);
    emitState("acting");

    if(choice.id==="wander"){
      actor.x=HKLife.Utils.clamp(actor.x+(Math.random()-.5)*18,7,93);
      actor.y=HKLife.Utils.clamp(actor.y+(Math.random()-.5)*12,18,90);
      HKLife.Background.recordUsage(world,actor.x,actor.y,"walk",actor.id);
      recordCarry("carry-wander");
      actor.transient.boredom=HKLife.Utils.clamp(actor.transient.boredom-.1,0,1);
      if(Math.random()<.32)HKLife.Logger.observation(world,"wander",`${actor.source}がふらりと場所を変えた。`,{actorId:actor.id});
    }

    if(choice.id==="look_actor"&&target){
      HKLife.Logger.observation(world,"look",`${actor.source}が${target.source}をしばらく見ている。`,{actorId:actor.id,targetId:target.id});
    }

    if(choice.id==="approach"&&target){
      const dx=target.x-actor.x,dy=target.y-actor.y;
      actor.x=HKLife.Utils.clamp(target.x-dx/(Math.hypot(dx,dy)||1)*7,6,94);
      actor.y=HKLife.Utils.clamp(target.y-dy/(Math.hypot(dx,dy)||1)*7,15,92);
      HKLife.Background.recordUsage(world,actor.x,actor.y,"walk",actor.id);
      recordCarry("carry-approach");
      actor.observationStats.approaches++;
      actor.relationships[target.id]=actor.relationships[target.id]||{familiarity:0,trust:0,caution:0};
      actor.relationships[target.id].familiarity=HKLife.Utils.clamp(actor.relationships[target.id].familiarity+.02,0,1);
      HKLife.Logger.observation(world,"approach",`${actor.source}が${target.source}の近くへ行った。`,{actorId:actor.id,targetId:target.id});
    }

    if(choice.id==="retreat"&&target){
      const dx=actor.x-target.x,dy=actor.y-target.y,mag=Math.hypot(dx,dy)||1;
      actor.x=HKLife.Utils.clamp(actor.x+dx/mag*9,6,94);
      actor.y=HKLife.Utils.clamp(actor.y+dy/mag*9,15,92);
      HKLife.Background.recordUsage(world,actor.x,actor.y,"walk",actor.id);
      recordCarry("carry-retreat");
      HKLife.Logger.observation(world,"retreat",`${actor.source}が${target.source}から少し距離を取った。`,{actorId:actor.id,targetId:target.id});
    }

    if(choice.id==="inspect_punctuation"&&token){
      const interp=HKLife.Punctuation.interpret(world,actor,token);
      if(interp){
        HKLife.Logger.observation(world,"interpret",`${actor.source}は${token.glyph}を「${interp.label}」のように見ているらしい。`,{actorId:actor.id,tokenId:token.id,interpretation:interp.id});
      }
    }

    if(choice.id==="touch_punctuation"&&token){
      const interp=HKLife.Punctuation.interpret(world,actor,token);
      actor.observationStats.punctuationTouches++;
      const change=HKLife.Punctuation.moveToken(world,token,actor.x+(Math.random()-.5)*10,actor.y+(Math.random()-.5)*7,actor.id,"touch");
      HKLife.Logger.observation(world,"touch-punctuation",`${actor.source}が${token.glyph}に触れた${interp?`。${interp.label}として扱っているようにも見える。`:"。"}`,{actorId:actor.id,tokenId:token.id,interpretation:interp?.id||null,stateChanges:change?[change]:[]});
    }

    if(choice.id==="pick_punctuation"&&token){
      const changes=HKLife.Punctuation.pick(world,actor,token);
      if(changes.length){
        actor.observationStats.punctuationPicks++;
        HKLife.Logger.observation(world,"pick-punctuation",`${actor.source}が${token.glyph}を拾った。`,{actorId:actor.id,tokenId:token.id,stateChanges:changes});
      }
    }

    if(choice.id==="place_punctuation"&&actor.carrying){
      const carried=world.punctuation.find(t=>t.id===actor.carrying);
      const interp=carried&&HKLife.Punctuation.interpret(world,actor,carried);
      const placed=HKLife.Punctuation.place(world,actor,Math.random,"place");
      if(placed.token){
        actor.observationStats.punctuationPlaces++;
        HKLife.Logger.observation(world,"place-punctuation",`${actor.source}が${placed.token.glyph}を地面へ置いた${interp?`。${interp.label}として置いたようにも見える。`:"。"}`,{actorId:actor.id,tokenId:placed.token.id,interpretation:interp?.id||null,stateChanges:placed.changes});
      }
    }

    if(choice.id==="dig"){
      const hole=HKLife.Background.addHole(world,actor);
      if(hole){
        actor.observationStats.digs++;
        HKLife.Background.recordUsage(world,hole.x,hole.y,"dig",actor.id);
        const changes=[
          {kind:"persistent-modification-created",scope:"world",physical:true,id:hole.id,before:null,after:{kind:"hole",x:hole.x,y:hole.y},by:actor.id},
          {kind:"persistent-modification-created",scope:"world",physical:true,id:hole.soilPileId,before:null,after:{kind:"soil-pile"},by:actor.id}
        ];
        HKLife.Logger.observation(world,"dig",`${actor.source}が地面を掘り、小さな穴が残った。`,{actorId:actor.id,modificationId:hole.id,stateChanges:changes});
        HKLife.Bus.emit("toast",`${actor.source}が穴を掘った`);
      }
    }

    if(choice.id==="rest"){
      if(actor.carrying){
        const placed=HKLife.Punctuation.place(world,actor,Math.random,"rest");
        if(placed.token){
          actor.observationStats.punctuationPlaces++;
          HKLife.Logger.observation(world,"place-punctuation",`${actor.source}は休む前に${placed.token.glyph}をそっと置いた。`,{actorId:actor.id,tokenId:placed.token.id,stateChanges:placed.changes});
        }
      }
      actor.transient.fatigue=HKLife.Utils.clamp(actor.transient.fatigue-.2,0,1);
      if(Math.random()<.35)HKLife.Logger.observation(world,"rest",`${actor.source}がしばらく休んでいる。`,{actorId:actor.id});
    }

    actor.transient.fatigue=HKLife.Utils.clamp(actor.transient.fatigue+.025,0,1);
    emitState("");await pause(180);
  }
};
