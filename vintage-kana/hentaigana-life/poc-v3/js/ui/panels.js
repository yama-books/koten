window.HKLife=window.HKLife||{};
HKLife.Panels={
  selectedId:null,
  init(world){
    this.selectedId=HKLife.WorldState.presentActors(world)[0]?.id||world.actors[0]?.id;
    HKLife.Bus.on("select-actor",id=>{this.selectedId=id;HKLife.Stage.select(id);this.renderActor(world)});
    HKLife.Bus.on("world-change",w=>{this.renderWorld(w);this.renderActor(w);this.renderLogs(w)});
    HKLife.Bus.on("observation",()=>this.renderLogs(HKLife.Engine.world));
    HKLife.Bus.on("internal",()=>this.renderDebug(HKLife.Engine.world));
    this.renderWorld(world);this.renderActor(world);this.renderLogs(world);HKLife.Stage.select(this.selectedId);
  },
  renderActor(world){
    const a=world.actors.find(x=>x.id===this.selectedId)||HKLife.WorldState.presentActors(world)[0]||world.actors[0];if(!a)return;
    const obs=a.observationStats,present=a.presence?.state!=="away",held=a.carrying&&world.punctuation.find(p=>p.id===a.carrying);
    document.getElementById("actor-detail").innerHTML=
      '<div class="big">'+a.glyph+'</div>'+
      '<div class="known"><strong>読み:</strong> '+a.kana+'<br><strong>字母:</strong> '+a.source+'</div>'+
      '<div class="hint">'+(present?"いま公園にいます。":"いまは公園を離れています。")+'<br>'+
      (held?"運んでいるもの: "+held.glyph+"<br>":"")+
      '性格値は表示しません。<br>観察: '+obs.events+'件 / 接近 '+obs.approaches+' / 記号接触 '+obs.punctuationTouches+' / 拾う '+(obs.picks||0)+' / 置く '+(obs.places||0)+' / 掘削 '+obs.digs+'</div>';
  },
  renderWorld(world){
    const present=HKLife.WorldState.presentActors(world),fluid=present.filter(a=>a.residence==="fluid").length;
    const activePunct=world.punctuation.filter(p=>p.state!=="merged").length;
    const count=k=>world.area.modifications.filter(x=>x.kind===k).length;
    document.getElementById("world-clock").textContent=HKLife.Utils.formatClock(world.clockMinutes);
    document.getElementById("time-phase").textContent=HKLife.Utils.timePhase(world.clockMinutes);
    document.getElementById("weather").textContent=world.weather==="light-rain"?"小雨":"晴";
    document.getElementById("world-summary").innerHTML=
      '<span class="k">個体</span><span>'+present.length+' / '+world.actors.length+'（流動 '+fluid+'）</span>'+
      '<span class="k">記号</span><span>'+activePunct+'</span>'+
      '<span class="k">穴</span><span>'+count("hole")+'</span>'+
      '<span class="k">道</span><span>'+count("path")+'</span>'+
      '<span class="k">句点置場</span><span>'+count("period-cache")+'</span>'+
      '<span class="k">芽</span><span>'+count("sprout")+'</span>'+
      '<span class="k">世界時刻</span><span>'+HKLife.Utils.formatClock(world.clockMinutes)+'</span>';
  },
  renderLogs(world){const box=document.getElementById("observation-log");box.innerHTML=world.observationLog.map(e=>'<div class="log-entry"><time>'+HKLife.Utils.formatClock(e.worldMinute)+'</time><span>'+e.text+"</span></div>").join("");this.renderDebug(world)},
  renderDebug(world){const box=document.getElementById("debug-log");if(!box)return;box.textContent=world.internalLog.slice(0,14).map(e=>JSON.stringify(e)).join("\n")}
};
