"use strict";
// Real-time pacing for observer.cjs. It runs outside the simulation and never feeds wall time into world state.
// Missed time is not made up: after a stall longer than one tick (PC sleep, a stopped process, a slow disk),
// the schedule restarts from now instead of running a burst of ticks.
function createPacer(tickMs,now){
  let next=now()+tickMs,resets=0,maxLagMs=0;
  return{
    // Milliseconds to wait before the next tick.
    delay(){
      if(tickMs<=0)return 0;
      const t=now(),lag=t-next;
      if(lag>maxLagMs)maxLagMs=lag;
      if(lag>tickMs){resets++;next=t+tickMs;return 0;}
      const d=Math.max(0,next-t);next+=tickMs;return d;
    },
    stats(){return{resets,maxLagMs:Math.round(maxLagMs)};}
  };
}

module.exports={createPacer};
