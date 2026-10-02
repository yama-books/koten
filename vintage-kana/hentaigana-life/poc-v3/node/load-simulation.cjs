"use strict";
const path=require("node:path");

function loadSimulation(){
  globalThis.window=globalThis;
  const root=path.resolve(__dirname,"..");
  const files=[
    "js/data/version-info.js",
    "js/data/poc-cast.js",
    "js/data/world-config.js",
    "js/data/action-catalog.js",
    "js/data/punctuation-catalog.js",
    "js/core/utils.js",
    "js/core/event-bus.js",
    "js/core/logger.js",
    "js/core/world-state.js",
    "js/sim/punctuation.js",
    "js/sim/background.js",
    "js/sim/scoring.js",
    "js/sim/actions.js",
    "js/sim/step.js"
  ];
  for(const rel of files) require(path.join(root,rel));
  return globalThis.HKLife;
}

module.exports={loadSimulation};
