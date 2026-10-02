"use strict";
const fs = require("node:fs");
const path = require("node:path");

const USAGE = "usage: node node/analyze-run.cjs --run <run-directory> [--out <output-directory>]";
function parseArgs(argv) {
  let runDir = null, outDir = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--run" && argv[i + 1]) runDir = path.resolve(argv[++i]);
    else if (argv[i] === "--out" && argv[i + 1]) outDir = path.resolve(argv[++i]);
    else throw new Error(USAGE);
  }
  if (!runDir) throw new Error(USAGE);
  if (outDir) {
    const rel = path.relative(runDir, outDir);
    if (!rel.startsWith("..") && !path.isAbsolute(rel)) throw new Error("--out must be outside the run directory; omit --out to write into the run directory");
  }
  return { runDir, outDir: outDir || runDir };
}
// Never replace an existing summary: checked up front, then created with "wx".
function writeOutputsExclusive(outDir, files) {
  const existing = files.map(([name]) => path.join(outDir, name)).filter(f => fs.existsSync(f));
  if (existing.length) throw new Error(`analysis output already exists; refusing to overwrite: ${existing.join(", ")}`);
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, content] of files) fs.writeFileSync(path.join(outDir, name), content, { encoding: "utf8", flag: "wx" });
}
function increment(obj, key) { obj[key] = (obj[key] || 0) + 1; }
function percent(n, total) { return total ? Number((100 * n / total).toFixed(2)) : 0; }
function readEvents(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.length && bytes[bytes.length - 1] !== 10 && bytes[bytes.length - 1] !== 13) throw new Error("末尾eventが不完全: events.jsonl does not end with a newline");
  const lines = bytes.toString("utf8").split(/\r?\n/).filter(Boolean);
  const events = [];
  let expectedSequence = 1, invalid = 0;
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event.sequence !== expectedSequence || !event.eventType || !event.stream || !Array.isArray(event.actorIds)) invalid++;
      expectedSequence++;
      events.push(event);
    } catch { invalid++; expectedSequence++; }
  }
  return { events, invalid };
}
function readSnapshots(dir) {
  const snapshotDir = path.join(dir, "snapshots");
  if (!fs.existsSync(snapshotDir)) return { snapshots: [], invalid: 0 };
  const names = fs.readdirSync(snapshotDir).filter(n => n.endsWith(".json"));
  const snapshots = [];
  let invalid = 0;
  for (const name of names) {
    try { snapshots.push(JSON.parse(fs.readFileSync(path.join(snapshotDir, name), "utf8"))); }
    catch { invalid++; }
  }
  snapshots.sort((a, b) => (a.tick || 0) - (b.tick || 0));
  return { snapshots, invalid };
}
function countKind(world, kind) { return (world?.area?.modifications || []).filter(x => x.kind === kind).length; }
function main() {
  const { runDir: dir, outDir } = parseArgs(process.argv.slice(2));
  const { events, invalid: invalidEvents } = readEvents(path.join(dir, "events.jsonl"));
  const { snapshots, invalid: invalidSnapshots } = readSnapshots(dir);
  const eventTypeCounts = {}, actionCounts = {}, characters = {}, interpretations = {}, interpretationsByCharacter = {}, approachesByCharacter = {}, approachPairs = {}, timeOfDayActionCounts = {}, streamCounts = { observation: 0, internal: 0 };
  let punctuationContacts = 0, digAttempts = 0, successfulDigEvents = 0, retreats = 0;
  for (const event of events) {
    increment(eventTypeCounts, event.eventType);
    increment(streamCounts, event.stream);
    const payload = event.payload || {};
    const actor = payload.actorId || event.actorIds?.[0] || "unknown";
    if (event.eventType === "action-start") {
      const action = event.action || payload.action || "unknown";
      increment(actionCounts, action);
      characters[actor] ||= { actions: {}, total: 0, idle: 0 };
      increment(characters[actor].actions, action);
      characters[actor].total++;
      if (action === "idle") characters[actor].idle++;
      if (action === "dig") digAttempts++;
      const mins = event.worldTime?.minutes;
      if (mins !== undefined) {
        const period = mins < 300 || mins >= 1200 ? "night" : mins < 660 ? "morning" : mins < 1020 ? "day" : "evening";
        increment(timeOfDayActionCounts, `${period}:${action}`);
      }
    }
    if (event.eventType === "approach" && payload.targetId) {
      increment(approachesByCharacter, actor);
      increment(approachPairs, `${actor} -> ${payload.targetId}`);
    }
    if (event.eventType === "retreat") retreats++;
    if (event.eventType === "dig") successfulDigEvents++;
    if (event.eventType === "touch-punctuation") punctuationContacts++;
    if (["touch-punctuation", "interpret"].includes(event.eventType) && event.interpretation) {
      increment(interpretations, event.interpretation);
      interpretationsByCharacter[actor] ||= {};
      increment(interpretationsByCharacter[actor], event.interpretation);
    }
  }
  const totalActions = Object.values(actionCounts).reduce((a, b) => a + b, 0);
  for (const character of Object.values(characters)) {
    character.idleRatePercent = percent(character.idle, character.total);
    character.actionPercentages = Object.fromEntries(Object.entries(character.actions).map(([k, v]) => [k, percent(v, character.total)]));
  }
  const firstWorld = snapshots[0]?.world, lastWorld = snapshots.at(-1)?.world;
  const summary = {
    runId: path.basename(dir), generatedAt: new Date().toISOString(), totalTicks: lastWorld?.ticks ?? null, totalEvents: events.length,
    eventTypeCounts, actionCounts, actionPercentages: Object.fromEntries(Object.entries(actionCounts).map(([k, v]) => [k, percent(v, totalActions)])),
    characterActivity: characters, approachFrequency: approachesByCharacter, retreatCount: retreats, approachPairs,
    punctuationContacts, interpretationCounts: interpretations, interpretationsByCharacter, digAttempts, successfulDigEvents,
    background: {
      holesInitial: countKind(firstWorld, "hole"), holesFinal: countKind(lastWorld, "hole"), holesAdded: countKind(lastWorld, "hole") - countKind(firstWorld, "hole"),
      soilPilesInitial: countKind(firstWorld, "soil-pile"), soilPilesFinal: countKind(lastWorld, "soil-pile"), soilPilesAdded: countKind(lastWorld, "soil-pile") - countKind(firstWorld, "soil-pile")
    },
    timeOfDayActionCounts, streamCounts,
    integrity: { invalidOrMissingEvents: invalidEvents, sequenceEnd: events.at(-1)?.sequence ?? 0, sequenceContinuous: invalidEvents === 0, snapshotsRead: snapshots.length, invalidSnapshots: invalidSnapshots > 0 }
  };
  const typeRows = Object.entries(eventTypeCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join("\n");
  const actionRows = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} | ${percent(v, totalActions)}% |`).join("\n");
  const md = [
    `# Run analysis: ${summary.runId}`, "", `- Ticks: ${summary.totalTicks ?? "unknown"}`, `- Events: ${summary.totalEvents}`,
    `- Invalid or missing events: ${invalidEvents}`, `- Snapshots read: ${snapshots.length}`, `- Invalid snapshots: ${invalidSnapshots}`,
    `- Observation / internal events: ${streamCounts.observation} / ${streamCounts.internal}`, `- Punctuation contacts: ${punctuationContacts}`,
    `- Approach / retreat actions: ${Object.values(approachesByCharacter).reduce((a, b) => a + b, 0)} / ${retreats}`,
    `- Dig attempts / successful dig events: ${digAttempts} / ${successfulDigEvents}`,
    `- Holes added / soil piles added: ${summary.background.holesAdded} / ${summary.background.soilPilesAdded}`,
    "", "## Event types", "", "| Type | Count |", "|---|---:|", typeRows || "| (none) | 0 |",
    "", "## Actions", "", "| Action | Count | Share |", "|---|---:|---:|", actionRows || "| (none) | 0 | 0% |",
    "", "## Character activity", "", JSON.stringify(characters, null, 2), "", "## Interpretations", "", JSON.stringify({ counts: interpretations, byCharacter: interpretationsByCharacter }, null, 2), ""
  ].join("\n");
  writeOutputsExclusive(outDir, [["analysis-summary.json", JSON.stringify(summary, null, 2) + "\n"], ["analysis-summary.md", md]]);
  console.log(JSON.stringify({ ok: true, runDir: dir, outDir, totalTicks: summary.totalTicks, totalEvents: summary.totalEvents, invalidEvents }, null, 2));
}
try { main(); } catch (error) { console.error(error.message || error); process.exitCode = 1; }
