window.HKLife=window.HKLife||{};
HKLife.Simulation={
  async step(world,{wait=async()=>{},rng=Math.random}={}){
    world.ticks++;
    world.clockMinutes=(world.clockMinutes+HKLife.WORLD_CONFIG.clock.minutesPerTick)%1440;
    const actor=HKLife.Utils.pick(world.actors,rng);
    const choice=HKLife.Scoring.choose(world,actor);
    await HKLife.Actions.perform(world,actor,choice,{wait});
    return{actorId:actor.id,action:choice.id,choice};
  }
};
