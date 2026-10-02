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
  // history keeps only the newest entries; historySummary keeps all-time counts (events.jsonl holds the full record).
  recordHistory(token,entry,previous){
    if(!token.historySummary){
      token.historySummary=this.emptyHistorySummary();
      for(const old of token.history)this.countHistory(token.historySummary,old,undefined);
    }
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
