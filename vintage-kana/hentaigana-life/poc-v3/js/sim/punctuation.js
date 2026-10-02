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
    token.interpretations[actor.id]=chosen.id;
    token.history.push({at:world.clockMinutes,actorId:actor.id,interpretation:chosen.id});
    return chosen;
  }
};
