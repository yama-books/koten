"use strict";
const path=require("node:path");

// Shared browser/Node simulation files, in load order. Also the core of the compatibility fingerprint (compat.cjs).
const SIMULATION_FILES=Object.freeze([
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
  "js/sim/population.js",
  "js/sim/scoring.js",
  "js/sim/actions.js",
  "js/sim/step.js"
]);

function loadSimulation(){
  globalThis.window=globalThis;
  const root=path.resolve(__dirname,"..");
  for(const rel of SIMULATION_FILES) require(path.join(root,rel));
  return globalThis.HKLife;
}

module.exports={loadSimulation,SIMULATION_FILES};
