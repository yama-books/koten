window.HKLife=window.HKLife||{};
HKLife.Background={
  canDig(world,actor){
    const z=HKLife.WorldState.zoneAt(actor.x,actor.y);
    return !!z?.tags.includes("diggable");
  },
  addHole(world,actor){
    const nearby=world.area.modifications.some(m=>m.kind==="hole"&&HKLife.Utils.distance(m,actor)<7);
    if(nearby)return false;
    const hole={id:HKLife.Utils.uid("hole"),kind:"hole",x:actor.x+HKLife.Utils.clamp((Math.random()-.5)*5,-3,3),y:actor.y+3,createdBy:actor.id,createdAt:world.clockMinutes};
    const soil={id:HKLife.Utils.uid("soil"),kind:"soil-pile",x:hole.x+4,y:hole.y+1,createdBy:actor.id,createdAt:world.clockMinutes};
    hole.soilPileId=soil.id;
    world.area.modifications.push(hole,soil);
    return hole;
  },
  cell(world,x,y){
    const size=HKLife.WORLD_CONFIG.placeMeaning.gridPercent;
    const cx=Math.max(0,Math.min(Math.floor(99/size),Math.floor(x/size)));
    const cy=Math.max(0,Math.min(Math.floor(99/size),Math.floor(y/size)));
    const key=`${cx}:${cy}`;
    world.area.usage=world.area.usage||{};
    world.area.usage[key]=world.area.usage[key]||{walk:0,"period-place":0,dig:0,x:(cx+.5)*size,y:(cy+.5)*size};
    return{key,data:world.area.usage[key]};
  },
  hasModification(world,kind,key){
    return world.area.modifications.some(m=>m.kind===kind&&m.cellKey===key);
  },
  recordUsage(world,x,y,type,actorId=null){
    const {key,data}=this.cell(world,x,y);
    data[type]=Math.min(255,(data[type]||0)+1);
    const cfg=HKLife.WORLD_CONFIG.placeMeaning;
    if(type==="walk"&&data.walk>=cfg.pathWalkThreshold&&!this.hasModification(world,"path",key)){
      const path={id:HKLife.Utils.uid("path"),kind:"path",cellKey:key,x:data.x,y:data.y,strength:1,createdAt:world.clockMinutes,createdBy:actorId};
      world.area.modifications.push(path);
      const change={kind:"persistent-modification-created",scope:"world",physical:true,id:path.id,before:null,after:{kind:"path",cellKey:key,x:path.x,y:path.y},by:actorId};
      HKLife.Logger.observation(world,"place-meaning","歩いた跡が重なり、地面に細い道が見え始めた。",{actorId,stateChanges:[change],modificationId:path.id});
      return change;
    }
    if(type==="period-place"&&data["period-place"]>=cfg.periodCacheThreshold&&!this.hasModification(world,"period-cache",key)){
      const cache={id:HKLife.Utils.uid("period-cache"),kind:"period-cache",cellKey:key,x:data.x,y:data.y,createdAt:world.clockMinutes,createdBy:actorId};
      world.area.modifications.push(cache);
      const change={kind:"persistent-modification-created",scope:"world",physical:true,id:cache.id,before:null,after:{kind:"period-cache",cellKey:key,x:cache.x,y:cache.y},by:actorId};
      HKLife.Logger.observation(world,"place-meaning","何度も。が置かれた場所が、小さな句点置場のようになった。",{actorId,stateChanges:[change],modificationId:cache.id});
      return change;
    }
    return null;
  },
  decayUsage(world){
    world.area.usage=world.area.usage||{};
    const day=Math.floor(world.ticks/(HKLife.WORLD_CONFIG.clock.dayLengthMinutes/HKLife.WORLD_CONFIG.clock.minutesPerTick));
    if(world.area.usageLastDecayDay===undefined)world.area.usageLastDecayDay=day;
    if(day<=world.area.usageLastDecayDay)return;
    const factor=HKLife.WORLD_CONFIG.placeMeaning.dailyDecay;
    for(const cell of Object.values(world.area.usage)){
      cell.walk=Number(((cell.walk||0)*factor).toFixed(2));
      cell["period-place"]=Number(((cell["period-place"]||0)*factor).toFixed(2));
      cell.dig=Number(((cell.dig||0)*factor).toFixed(2));
    }
    world.area.usageLastDecayDay=day;
  },
  tickGrowth(world,rng=Math.random){
    const cfg=HKLife.WORLD_CONFIG.placeMeaning;
    for(const token of world.punctuation){
      if(token.growth?.state!=="planted"||world.ticks<token.growth.sproutAtTick)continue;
      const zone=HKLife.WorldState.zoneAt(token.x,token.y);
      const wet=!!zone?.tags.includes("wet");
      const chance=(wet?cfg.sproutWetChance:cfg.sproutBaseChance)+(world.weather==="light-rain"?cfg.sproutRainBonus:0);
      if(rng()>=chance)continue;
      const sprout={id:HKLife.Utils.uid("sprout"),kind:"sprout",x:token.x,y:token.y,sourceTokenId:token.id,createdAt:world.clockMinutes,createdBy:token.growth.plantedBy};
      world.area.modifications.push(sprout);
      token.growth={...token.growth,state:"sprouted",sproutedAtTick:world.ticks,sproutId:sprout.id};
      const changes=[
        {kind:"seed-growth",scope:"world",physical:true,id:token.id,before:"planted",after:"sprouted"},
        {kind:"persistent-modification-created",scope:"world",physical:true,id:sprout.id,before:null,after:{kind:"sprout",x:sprout.x,y:sprout.y,sourceTokenId:token.id}}
      ];
      HKLife.Logger.observation(world,"sprout","種のように置かれていた。のそばから、小さな芽が出た。",{actorId:token.growth.plantedBy||null,tokenId:token.id,modificationId:sprout.id,stateChanges:changes});
      return true;
    }
    return false;
  },
  tick(world,rng=Math.random){
    this.decayUsage(world);
    this.tickGrowth(world,rng);
  }
};
