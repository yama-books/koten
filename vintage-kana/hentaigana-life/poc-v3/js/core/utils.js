window.HKLife=window.HKLife||{};
HKLife.Utils={
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  pick(arr,rng=Math.random){return arr[Math.floor(rng()*arr.length)]},
  distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)},
  uid(prefix="id"){return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`},
  formatClock(mins){
    mins=((mins%1440)+1440)%1440;
    const h=Math.floor(mins/60),m=Math.floor(mins%60);
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
  },
  timePhase(mins){
    mins=((mins%1440)+1440)%1440;
    if(mins>=300&&mins<660)return "朝";
    if(mins>=660&&mins<1020)return "昼";
    if(mins>=1020&&mins<1200)return "夕";
    return "夜";
  },
  weighted(items,rng=Math.random){
    const total=items.reduce((s,x)=>s+Math.max(0,x.weight),0);
    if(total<=0)return items[0]?.value;
    let r=rng()*total;
    for(const x of items){r-=Math.max(0,x.weight);if(r<=0)return x.value}
    return items.at(-1)?.value;
  }
};
