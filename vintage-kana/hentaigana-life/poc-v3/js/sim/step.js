window.HKLife=window.HKLife||{};
HKLife.Simulation={
  async step(world,{wait=async()=>{},rng=Math.random}={}){
    world.ticks++;
    world.clockMinutes=(world.clockMinutes+HKLife.WORLD_CONFIG.clock.minutesPerTick)%1440;
    HKLife.Population.process(world);
    HKLife.Punctuation.processEnvironment(world);
    HKLife.Background.process(world);
    const present=HKLife.WorldState.presentActors(world);
    const actor=HKLife.Utils.pick(present,rng);
    if(!actor)return{actorId:null,action:"none",choice:null};
    const choice=HKLife.Scoring.choose(world,actor);
    await HKLife.Actions.perform(world,actor,choice,{wait});
    return{actorId:actor.id,action:choice.id,choice};
  }
};
