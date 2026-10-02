window.HKLife=window.HKLife||{};
HKLife.WorldState={
  create(){
    const actors=HKLife.POC_CAST.map(c=>({
      ...c,
      x:c.home.x,y:c.home.y,
      transient:{fatigue:.15,boredom:.25,alert:.1,mood:.6},
      relationships:{},
      memories:[],
      observationStats:{events:0,approaches:0,punctuationTouches:0,digs:0},
      color:{kind:"black",source:"default"}
    }));
    return{
      version:1,seed:Math.floor(Math.random()*1e9),clockMinutes:HKLife.WORLD_CONFIG.clock.startMinutes,
      weather:"clear",ticks:0,createdAt:Date.now(),savedAt:null,lastRealTime:Date.now(),
      actors,
      area:{
        id:HKLife.WORLD_CONFIG.area.id,
        modifications:[],
        traces:[]
      },
      punctuation:[
        this.makePunctuation("period",23,66),
        this.makePunctuation("comma",43,74),
        this.makePunctuation("period",62,61)
      ],
      creatures:[],plants:[],craftedObjects:[],recipes:[],
      observationLog:[],internalLog:[]
    };
  },
  makePunctuation(kind,x,y){
    const def=HKLife.PUNCTUATION_CATALOG.tokenKinds[kind];
    return{id:HKLife.Utils.uid(kind),kind,glyph:def.glyph,x,y,holder:null,links:[],history:[],interpretations:{}};
  },
  findActor(world,id){return world.actors.find(a=>a.id===id)},
  zoneAt(x,y){
    return HKLife.WORLD_CONFIG.area.zones.find(z=>x>=z.x1&&x<=z.x2&&y>=z.y1&&y<=z.y2)||null;
  }
};
