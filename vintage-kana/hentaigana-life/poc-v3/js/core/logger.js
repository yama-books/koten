window.HKLife=window.HKLife||{};
HKLife.Logger={
  observation(world,type,text,data={}){
    const entry={id:HKLife.Utils.uid("obs"),tick:world.ticks,worldMinute:world.clockMinutes,at:new Date().toISOString(),type,text,...data};
    world.observationLog.unshift(entry);world.observationLog=world.observationLog.slice(0,HKLife.WORLD_CONFIG.engine.visibleLogLimit);HKLife.Bus.emit("observation",entry);return entry;
  },
  internal(world,type,data={}){
    const entry={id:HKLife.Utils.uid("int"),tick:world.ticks,worldMinute:world.clockMinutes,at:new Date().toISOString(),type,...data};
    world.internalLog.unshift(entry);world.internalLog=world.internalLog.slice(0,HKLife.WORLD_CONFIG.engine.internalLogLimit);HKLife.Bus.emit("internal",entry);return entry;
  }
};
