window.HKLife=window.HKLife||{};
HKLife.Background={
  canDig(world,actor){return HKLife.WorldState.hasZoneTag(actor.x,actor.y,"diggable")},
  addHole(world,actor){
    const nearby=world.area.modifications.some(m=>m.kind==="hole"&&HKLife.Utils.distance(m,actor)<7);
    if(nearby)return false;
    const hole={id:HKLife.Utils.uid("hole"),kind:"hole",x:actor.x+HKLife.Utils.clamp((Math.random()-.5)*5,-3,3),y:actor.y+3,createdBy:actor.id,createdAt:world.clockMinutes};
    const soil={id:HKLife.Utils.uid("soil"),kind:"soil-pile",x:hole.x+4,y:hole.y+1,createdBy:actor.id,createdAt:world.clockMinutes};
    world.area.modifications.push(hole,soil);
    return{hole,soil};
  },
  cell(world,x,y){
    world.area.usage=world.area.usage||{cells:{},lastDecayTick:0};
    const g=HKLife.WORLD_CONFIG.usage.gridPct;
    const gx=Math.max(0,Math.min(Math.floor(x/g),Math.floor(100/g)-1));
    const gy=Math.max(0,Math.min(Math.floor(y/g),Math.floor(100/g)-1));
    const key=gx+":"+gy;
    const c=world.area.usage.cells[key]||(world.area.usage.cells[key]={walk:0,periodPlacements:0,lastTick:world.ticks});
    return{key,c,x:(gx+.5)*g,y:(gy+.5)*g};
  },
  hasNear(world,kind,x,y,dist=5){return world.area.modifications.some(m=>m.kind===kind&&Math.hypot(m.x-x,m.y-y)<=dist)},
  recordMovement(world,actor){
    if(!HKLife.WorldState.hasZoneTag(actor.x,actor.y,"walkable"))return[];
    const {c,x,y}=this.cell(world,actor.x,actor.y);c.walk++;c.lastTick=world.ticks;
    const changes=[];
    if(c.walk>=HKLife.WORLD_CONFIG.usage.pathThreshold&&!this.hasNear(world,"path",x,y,4)){
      const path={id:HKLife.Utils.uid("path"),kind:"path",x,y,createdAt:world.clockMinutes,createdTick:world.ticks,strength:1};
      world.area.modifications.push(path);
      const ch={kind:"persistent-modification",id:path.id,before:null,after:"path"};changes.push(ch);
      HKLife.Logger.observation(world,"path-formed","何度も通られたところに、うっすら道ができた。",{modificationId:path.id,stateChanges:[ch]});
    }
    return changes;
  },
  recordPlacement(world,token,actor,interpretation){
    const changes=[];const {c,x,y}=this.cell(world,token.x,token.y);c.lastTick=world.ticks;
    if(token.kind==="period"){
      c.periodPlacements++;
      if(c.periodPlacements>=HKLife.WORLD_CONFIG.usage.periodCacheThreshold&&!this.hasNear(world,"period-cache",x,y,6)){
        const cache={id:HKLife.Utils.uid("cache"),kind:"period-cache",x,y,createdAt:world.clockMinutes,createdTick:world.ticks};
        world.area.modifications.push(cache);
        const ch={kind:"persistent-modification",id:cache.id,before:null,after:"period-cache"};changes.push(ch);
        HKLife.Logger.observation(world,"period-cache-formed","句点がよく置かれる場所が、だんだん置場らしくなった。",{modificationId:cache.id,stateChanges:[ch]});
      }
    }
    return changes;
  },
  decay(world){
    const u=world.area.usage;if(!u)return;
    const cfg=HKLife.WORLD_CONFIG.usage;
    if(world.ticks-u.lastDecayTick<cfg.decayEveryTicks)return;
    for(const [key,c] of Object.entries(u.cells)){
      c.walk=Math.floor(c.walk*cfg.decayFactor);c.periodPlacements=Math.floor(c.periodPlacements*cfg.decayFactor);
      if(c.walk===0&&c.periodPlacements===0)delete u.cells[key];
    }
    u.lastDecayTick=world.ticks;
  },
  process(world){
    this.decay(world);
    for(const token of world.punctuation){
      if(!token.planted||token.sprouted||!token.sproutDueTick||world.ticks<token.sproutDueTick)continue;
      token.sprouted=true;
      const sprout={id:HKLife.Utils.uid("sprout"),kind:"sprout",x:token.x,y:token.y-2,sourceTokenId:token.id,createdAt:world.clockMinutes,createdTick:world.ticks};
      world.area.modifications.push(sprout);
      const ch={kind:"persistent-modification",id:sprout.id,before:null,after:"sprout",sourceTokenId:token.id};
      HKLife.Logger.observation(world,"sprout","埋められていた句点のそばから、小さな芽が出た。",{tokenId:token.id,modificationId:sprout.id,stateChanges:[ch]});
    }
  }
};
