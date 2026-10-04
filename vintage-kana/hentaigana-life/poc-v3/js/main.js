window.addEventListener("DOMContentLoaded",async()=>{
  const saved=await HKLife.Storage.load();
  const expected=Number(HKLife.VERSION_INFO.worldSchemaVersion);
  const world=saved&&saved.version===expected?saved:HKLife.WorldState.create();
  await HKLife.Engine.init(world);HKLife.Stage.init(world);HKLife.Panels.init(world);
  HKLife.Bus.on("run-state",running=>{document.body.classList.toggle("running",running);document.getElementById("run-label").textContent=running?"観察中":"停止中";document.getElementById("run-toggle").textContent=running?"■ 停止":"▶ 開始"});
  document.getElementById("run-toggle").onclick=()=>HKLife.Engine.running?HKLife.Engine.stop():HKLife.Engine.start();
  document.getElementById("save-now").onclick=async()=>{await HKLife.Storage.save(world);HKLife.Stage.toast("世界を保存しました")};
  document.getElementById("reset-world").onclick=async()=>{if(!confirm("PoC v3の保存世界を初期化しますか？"))return;HKLife.Engine.stop();await HKLife.Storage.clear();location.reload()};
  document.getElementById("speed").oninput=e=>{HKLife.Engine.setSpeed(e.target.value);document.getElementById("speed-label").textContent=e.target.value+"x"};
  document.getElementById("clear-visible-log").onclick=()=>{document.getElementById("observation-log").innerHTML=""};
  document.querySelectorAll("[data-intervention]").forEach(btn=>btn.onclick=()=>{
    const kind=btn.dataset.intervention;
    if(kind==="period"||kind==="comma"){
      const p=HKLife.WorldState.makePunctuation(kind,20+Math.random()*60,48+Math.random()*32);p.restingSinceTick=world.ticks;world.punctuation.push(p);
      HKLife.Logger.observation(world,"intervention",p.glyph+"がひとつ置かれた。",{tokenId:p.id,stateChanges:[{kind:"punctuation-created",id:p.id,before:null,after:p.kind}]});
    }
    if(kind==="rain"){
      world.weather="light-rain";HKLife.Logger.observation(world,"weather","小さな雨が降り始めた。");
      setTimeout(()=>{world.weather="clear";HKLife.Logger.observation(world,"weather","雨がやんだ。");HKLife.Bus.emit("world-change",world)},9000);
    }
    if(kind==="quiet"){HKLife.Engine.stop();HKLife.Logger.observation(world,"quiet","しばらく静かな時間にした。")}
    HKLife.Bus.emit("world-change",world);
  });
  HKLife.Bus.emit("world-change",world);setInterval(()=>HKLife.Storage.save(world),30000);
});
