window.HKLife=window.HKLife||{};
HKLife.WorldState={
  create(){
    const actors=HKLife.POC_CAST.map(c=>({
      ...c,
      x:c.home.x,y:c.home.y,
      transient:{fatigue:.15,boredom:.25,alert:.1,mood:.6},
      relationships:{},memories:[],
      observationStats:{events:0,approaches:0,punctuationTouches:0,digs:0,picks:0,places:0},
      color:{kind:"black",source:"default"},
      carrying:null,carryStartedTick:null,
      presence:{
        state:c.residence==="fluid"&&c.initialPresence===false?"away":"present",
        arrivedAtTick:c.residence==="fluid"&&c.initialPresence===false?null:0,
        leaveAtTick:null,visits:c.residence==="fluid"&&c.initialPresence===false?0:1,
        awaySinceTick:c.residence==="fluid"&&c.initialPresence===false?0:null
      }
    }));
    const world={
      version:Number(HKLife.VERSION_INFO.worldSchemaVersion),
      seed:Math.floor(Math.random()*1e9),clockMinutes:HKLife.WORLD_CONFIG.clock.startMinutes,
      weather:"clear",ticks:0,createdAt:Date.now(),savedAt:null,lastRealTime:Date.now(),
      actors,
      population:{nextCheckTick:0,lastChangeTick:0},
      area:{id:HKLife.WORLD_CONFIG.area.id,modifications:[],traces:[],usage:{cells:{},lastDecayTick:0}},
      punctuation:[
        this.makePunctuation("period",23,66),
        this.makePunctuation("comma",43,74),
        this.makePunctuation("period",62,61)
      ],
      creatures:[],plants:[],craftedObjects:[],recipes:[],
      observationLog:[],internalLog:[]
    };
    HKLife.Population.initialize(world);
    return world;
  },
  makePunctuation(kind,x,y){
    const def=HKLife.PUNCTUATION_CATALOG.tokenKinds[kind];
    return{
      id:HKLife.Utils.uid(kind),kind,glyph:def.glyph,x,y,
      state:"resting",holder:null,links:[],
      history:[],historySummary:HKLife.Punctuation.emptyHistorySummary(),interpretations:{},
      moveHistory:[],moveSummary:{moves:0,totalDistance:0,byActor:{}},
      kindHistory:[],lastPlacedBy:null,restingSinceTick:0,
      planted:false,plantedAtTick:null,sproutDueTick:null,sprouted:false
    };
  },
  findActor(world,id){return world.actors.find(a=>a.id===id)},
  presentActors(world){return world.actors.filter(a=>a.presence?.state!=="away")},
  zoneAt(x,y){
    return HKLife.WORLD_CONFIG.area.zones.find(z=>x>=z.x1&&x<=z.x2&&y>=z.y1&&y<=z.y2)||null;
  }
};
