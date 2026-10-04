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
  }
};
