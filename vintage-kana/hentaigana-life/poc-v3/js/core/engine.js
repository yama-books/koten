window.HKLife=window.HKLife||{};
HKLife.Engine={
  world:null,running:false,speed:1,timer:null,busy:false,
  wait(ms){return new Promise(r=>setTimeout(r,ms/this.speed))},
  async init(world){this.world=world;this.applyOfflineCatchup();HKLife.Bus.emit("world-ready",world)},
  applyOfflineCatchup(){
    const w=this.world;if(!w?.savedAt)return;
    const elapsed=Math.max(0,Date.now()-w.savedAt);if(elapsed<60000)return;
    const hours=elapsed/3600000,count=Math.min(HKLife.WORLD_CONFIG.engine.maxOfflineEvents,Math.floor(hours*3));if(count<=0)return;
    w.clockMinutes=(w.clockMinutes+Math.floor(hours*60))%1440;
    for(let i=0;i<count;i++){
      const present=HKLife.WorldState.presentActors(w),a=HKLife.Utils.pick(present);if(!a)break;
      if(Math.random()<.18&&HKLife.Background.canDig(w,a))HKLife.Background.addHole(w,a);
      else{a.x=HKLife.Utils.clamp(a.x+(Math.random()-.5)*10,7,93);a.y=HKLife.Utils.clamp(a.y+(Math.random()-.5)*8,18,90);HKLife.Punctuation.followCarrier(w,a);HKLife.Background.recordMovement(w,a)}
    }
    HKLife.Logger.observation(w,"offline","留守中に"+count+"件ほど小さな生活変化があったようだ。",{elapsedHours:+hours.toFixed(2)});
  },
  start(){if(this.running)return;this.running=true;HKLife.Bus.emit("run-state",true);this.schedule(50)},
  stop(){this.running=false;clearTimeout(this.timer);HKLife.Bus.emit("run-state",false)},
  setSpeed(v){this.speed=Number(v)||1},
  schedule(delay=HKLife.WORLD_CONFIG.engine.tickMs){clearTimeout(this.timer);this.timer=setTimeout(()=>this.tick(),delay/this.speed)},
  async tick(){
    if(!this.running||this.busy)return;this.busy=true;
    const w=this.world;await HKLife.Simulation.step(w,{wait:ms=>this.wait(ms)});HKLife.Bus.emit("world-change",w);
    if(w.ticks%HKLife.WORLD_CONFIG.engine.snapshotEveryTicks===0)await HKLife.Storage.save(w);
    this.busy=false;if(this.running)this.schedule();
  }
};
