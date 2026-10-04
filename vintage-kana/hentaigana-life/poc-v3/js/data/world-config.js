window.HKLife=window.HKLife||{};
HKLife.WORLD_CONFIG={
  "version": 2,
  "population": {
    "residentSlots": 6,
    "fluidSlots": 2,
    "visitorSlots": 2
  },
  "clock": {
    "startMinutes": 720,
    "minutesPerTick": 2,
    "dayLengthMinutes": 1440
  },
  "area": {
    "id": "park-main",
    "name": "公園・基準生活エリア",
    "zones": [
      {
        "id": "open-ground",
        "label": "広場",
        "x1": 10,
        "y1": 42,
        "x2": 75,
        "y2": 90,
        "tags": ["walkable","diggable","playable"]
      },
      {
        "id": "pond-edge",
        "label": "池のほとり",
        "x1": 3,
        "y1": 55,
        "x2": 28,
        "y2": 94,
        "tags": ["walkable","water-edge","wet","collectable"]
      },
      {
        "id": "tree-shade",
        "label": "木陰",
        "x1": 76,
        "y1": 28,
        "x2": 96,
        "y2": 72,
        "tags": ["walkable","shade","hideable"]
      },
      {
        "id": "bridge",
        "label": "橋",
        "x1": 70,
        "y1": 52,
        "x2": 91,
        "y2": 78,
        "tags": ["walkable","narrow","edge"]
      }
    ],
    "persistentModificationKinds": ["hole","soil-pile","nest","sprout","period-cache","path","workbench"],
    "traceKinds": ["footprint","ripple","leaf","color-stain"]
  },
  "weather": ["clear","light-rain"],
  "timePhases": [
    {"id":"morning","start":300,"end":660,"label":"朝"},
    {"id":"day","start":660,"end":1020,"label":"昼"},
    {"id":"evening","start":1020,"end":1200,"label":"夕"},
    {"id":"night","start":1200,"end":300,"label":"夜"}
  ],
  "punctuationHistory": {
    "recentLimit": 200,
    "moveRecentLimit": 80,
    "kindRecentLimit": 80,
    "maxHeldTicks": 30
  },
  "engine": {
    "tickMs": 1300,
    "snapshotEveryTicks": 12,
    "maxOfflineEvents": 18,
    "visibleLogLimit": 120,
    "internalLogLimit": 600
  }
};
