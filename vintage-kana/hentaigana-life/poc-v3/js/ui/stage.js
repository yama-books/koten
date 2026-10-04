window.HKLife=window.HKLife||{};
HKLife.Stage={
  actorEls:new Map(),punctEls:new Map(),
  init(world){
    this.stage=document.getElementById("stage");this.actorLayer=document.getElementById("actor-layer");
    this.punctLayer=document.getElementById("punctuation-layer");this.worldLayer=document.getElementById("world-layer");
    this.render(world);
    HKLife.Bus.on("world-change",w=>this.render(w));
    HKLife.Bus.on("actor-state",e=>this.setActorState(e.actorId,e.state));
    HKLife.Bus.on("toast",t=>this.toast(t));
  },
  syncActors(world){
    const present=new Set(HKLife.WorldState.presentActors(world).map(a=>a.id));
    for(const [id,el] of this.actorEls)if(!present.has(id)){el.remove();this.actorEls.delete(id)}
    for(const a of HKLife.WorldState.presentActors(world)){
      if(this.actorEls.has(a.id))continue;
      const el=document.createElement("div");el.className="actor";el.dataset.id=a.id;
      el.innerHTML='<div class="label">'+a.source+(a.variant||"")+'</div><div class="glyph">'+a.glyph+"</div>";
      el.onclick=()=>HKLife.Bus.emit("select-actor",a.id);
      this.actorLayer.appendChild(el);this.actorEls.set(a.id,el);
    }
  },
  render(world){
    this.syncActors(world);
    for(const a of HKLife.WorldState.presentActors(world)){const el=this.actorEls.get(a.id);if(el){el.style.left=a.x+"%";el.style.top=a.y+"%"}}
    this.punctLayer.innerHTML="";
    for(const p of world.punctuation){
      if(p.state==="merged")continue;
      const el=document.createElement("div");el.className="punct"+(p.state==="held"?" held":"");el.style.left=p.x+"%";el.style.top=p.y+"%";el.textContent=p.glyph;el.title=p.state==="held"?"運ばれている":"";
      this.punctLayer.appendChild(el);
    }
    this.worldLayer.innerHTML="";
    for(const m of world.area.modifications){
      const el=document.createElement("div");el.className="world-mark "+m.kind;el.style.left=m.x+"%";el.style.top=m.y+"%";
      if(m.kind==="sprout")el.textContent="〽";else if(m.kind==="period-cache")el.textContent="···";
      this.worldLayer.appendChild(el);
    }
  },
  setActorState(id,state){const el=this.actorEls.get(id);if(!el)return;el.classList.remove("looking","thinking","acting");if(state)el.classList.add(state)},
  select(id){for(const [aid,el] of this.actorEls)el.classList.toggle("selected",aid===id)},
  toast(text){const el=document.getElementById("toast");el.textContent=text;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1200)}
};
