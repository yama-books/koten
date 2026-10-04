window.HKLife=window.HKLife||{};
HKLife.Simulation={
  async step(world,{wait=async()=>{},rng=Math.random}={}){
    world.ticks++;
    world.clockMinutes=(world.clockMinutes+HKLife.WORLD_CONFIG.clock.minutesPerTick)%1440;
    HKLife.Population.step(world,rng);
    HKLife.Punctuation.tickTransforms(world,rng);
    HKLife.Background.tick(world,rng);
    const present=HKLife.Population.present(world);
    if(!present.length)return{actorId:null,action:"world-only",choice:null};
    const actor=HKLife.Utils.pick(present,rng);
    const choice=HKLife.Scoring.choose(world,actor);
    await HKLife.Actions.perform(world,actor,choice,{wait});
    return{actorId:actor.id,action:choice.id,choice};
  }
};
