import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VINTAGE_KANA_CHECK_PORT ?? 4177);
const baseUrl = `http://127.0.0.1:${port}/vintage-kana/index.html`;
const widths = [320, 360, 390, 430];
const findings = [];

const glyphMaster = JSON.parse(
  await readFile(path.join(root, "vintage-kana/data/ui-glyph-master.json"), "utf8"),
);
const glyphs = glyphMaster.glyphs ?? [];

function add(width, key, observed) {
  findings.push({ width, key, observed });
}

function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  }[ext] ?? "application/octet-stream";
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const file = path.resolve(root, rel);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": mime(file), "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", resolve);
});

function masteryEvents(target, perGlyphPlan) {
  const events = [];
  let seq = 0;
  for (const g of glyphs) {
    for (const [day, count] of perGlyphPlan) {
      for (let i = 0; i < count; i += 1) {
        seq += 1;
        events.push({
          id: `qa-${target}-${seq}`,
          at: `${day}T03:00:${String(i).padStart(2, "0")}Z`,
          localDate: day,
          setId: `qa-set-${target}-${seq}`,
          mode: "reading",
          masteryMethod: "choice",
          outcome: "correct",
          glyph: g.character,
          glyphId: g.glyph_id,
          kana: g.kana,
          jibo: g.jibo,
        });
      }
    }
  }
  return events;
}

const thirtyEvents = masteryEvents(30, [
  ["2026-09-15", 4],
  ["2026-09-16", 2],
]);
const sixtyFiveEvents = masteryEvents(65, [
  ["2026-09-15", 4],
  ["2026-09-16", 4],
  ["2026-09-17", 4],
  ["2026-09-18", 1],
]);

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) => route.abort());

  for (const width of widths) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height: 850 });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator('[data-view="quiz"]').click();
    await page.waitForSelector(".choice", { state: "visible" });
    await page.waitForFunction(() => document.querySelectorAll(".choice").length === 4);

    const measured = await page.evaluate(() => {
      const rect = (el) => el?.getBoundingClientRect();
      const tabs = [...document.querySelectorAll(".utilityTabs .tab")].map((el) => rect(el));
      const quizModes = [...document.querySelectorAll(".quizModeBtn")].map((el) => rect(el));
      const quizScreens = [...document.querySelectorAll(".quizScreenBtn")].map((el) => rect(el));
      const choices = [...document.querySelectorAll(".choice")].map((el) => rect(el));
      const unique = (values) => [...new Set(values.map((v) => Math.round(v)))];
      const helpText = document.querySelector(".learnHelp summary > span:last-child");
      const help = rect(document.querySelector(".learnHelp summary"));
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        tabHeights: tabs.map((r) => r?.height ?? 0),
        quizModeHeights: quizModes.map((r) => r?.height ?? 0),
        quizScreenHeights: quizScreens.map((r) => r?.height ?? 0),
        helpHeight: help?.height ?? 0,
        helpTextDisplay: helpText ? getComputedStyle(helpText).display : "",
        choiceCount: choices.length,
        choiceHeights: choices.map((r) => r?.height ?? 0),
        choiceColumns: unique(choices.map((r) => r?.left ?? 0)).length,
        choiceRows: unique(choices.map((r) => r?.top ?? 0)).length,
      };
    });

    if (measured.overflow > 1) add(width, "noPageOverflow", measured.overflow);
    if (measured.tabHeights.some((h) => h < 44)) add(width, "topTabs44", measured.tabHeights);
    if (measured.quizModeHeights.some((h) => h < 44)) add(width, "quizModes44", measured.quizModeHeights);
    if (measured.quizScreenHeights.some((h) => h < 44)) add(width, "quizScreens44", measured.quizScreenHeights);
    if (measured.helpHeight < 44) add(width, "help44", measured.helpHeight);
    if (measured.choiceCount !== 4) add(width, "choiceCount", measured.choiceCount);
    if (measured.choiceColumns !== 2 || measured.choiceRows !== 2) add(width, "choiceGrid2x2", { columns: measured.choiceColumns, rows: measured.choiceRows });
    if (measured.choiceHeights.some((h) => h < 78)) add(width, "choiceHeight78", measured.choiceHeights);
    if (width <= 380 && measured.helpTextDisplay !== "none") add(width, "compactHelpAtNarrowWidth", measured.helpTextDisplay);
    if (width > 380 && measured.helpTextDisplay === "none") add(width, "fullHelpAboveNarrowWidth", measured.helpTextDisplay);

    await page.evaluate(() => showQuizScreen("record"));
    await page.waitForSelector(".recordRowGroup");
    const record = await page.evaluate(() => {
      const rows = document.querySelector("#rowMastery");
      const groups = [...document.querySelectorAll(".recordRowGroup")];
      const first = groups[0];
      const second = groups[1];
      const a = first?.getBoundingClientRect();
      const b = second?.getBoundingClientRect();
      const closed = {
        count: groups.length,
        sameRow: Boolean(a && b && Math.abs(a.top - b.top) < 2),
        square: Boolean(a && Math.abs(a.width - a.height) < 3),
      };
      if (first) first.open = true;
      const open = first?.getBoundingClientRect();
      const container = rows?.getBoundingClientRect();
      const cards = [...(first?.querySelectorAll(".glyphMasteryCard") ?? [])];
      const cardRects = cards.map((el) => el.getBoundingClientRect());
      const unique = (values) => [...new Set(values.map((v) => Math.round(v)))];
      const ring = first?.querySelector(".glyphMasteryRing");
      const glyph = first?.querySelector(".glyphMasteryGlyph");
      const jibo = first?.querySelector(".glyphMasteryJibo");
      const percent = first?.querySelector(".glyphMasteryPercent");
      const ringRect = ring?.getBoundingClientRect();
      const cardRect = cards[0]?.getBoundingClientRect();
      return {
        ...closed,
        openFullWidth: Boolean(open && container && Math.abs(open.width - container.width) < 3),
        cardCount: cards.length,
        cardColumns: unique(cardRects.map((r) => r.left)).length,
        cardsSquare: cardRects.every((r) => Math.abs(r.width - r.height) < 3),
        ringContained: Boolean(ringRect && cardRect && ringRect.left >= cardRect.left - 1 && ringRect.right <= cardRect.right + 1 && ringRect.top >= cardRect.top - 1 && ringRect.bottom <= cardRect.bottom + 1),
        glyphFontSize: glyph ? Number.parseFloat(getComputedStyle(glyph).fontSize) : 0,
        jiboFontSize: jibo ? Number.parseFloat(getComputedStyle(jibo).fontSize) : 0,
        percentOutsideRing: Boolean(percent && ring && !ring.contains(percent)),
        meterValue: ring?.getAttribute("aria-valuenow") ?? "",
        percentText: percent?.textContent?.trim() ?? "",
      };
    });
    if (record.count !== 10) add(width, "recordRowCount", record.count);
    if (!record.sameRow) add(width, "recordTwoColumns", record);
    if (!record.square) add(width, "recordClosedSquare", record);
    if (!record.openFullWidth) add(width, "recordOpenFullWidth", record);
    if (record.cardCount < 1) add(width, "recordGlyphCardsPresent", record);
    const expectedColumns = width <= 360 ? 2 : 3;
    if (record.cardColumns !== expectedColumns) add(width, "recordGlyphCardColumns", { expectedColumns, ...record });
    if (!record.cardsSquare) add(width, "recordGlyphCardsSquare", record);
    if (!record.ringContained) add(width, "recordGlyphRingContained", record);
    if (!(record.glyphFontSize > record.jiboFontSize)) add(width, "recordGlyphDominatesJibo", record);
    if (!record.percentOutsideRing) add(width, "recordPercentBelowRing", record);
    if (record.meterValue !== "0" || record.percentText !== "0%") add(width, "recordGlyphMeterMatchesPercent", record);

    await page.close();
  }

  // 30%: same-row distractors are preferred before global distractors.
  {
    const context30 = await browser.newContext();
    await context30.addInitScript((events) => {
      localStorage.setItem("vintage-kana:learning-events:v1", JSON.stringify(events));
    }, thirtyEvents);
    const page = await context30.newPage();
    await page.setViewportSize({ width: 390, height: 850 });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator('[data-view="quiz"]').click();
    await page.waitForSelector(".choice", { state: "visible" });
    await page.waitForFunction(() => document.querySelectorAll(".choice").length === 4);
    const state = await page.evaluate(() => ({
      hint: document.querySelector("#quizMethodHint")?.textContent?.trim(),
      glyph: document.querySelector("#quizGlyph")?.textContent?.trim(),
      choices: [...document.querySelectorAll(".choice")].map((el) => el.textContent?.trim() ?? ""),
    }));
    const entry = glyphs.find((g) => g.character === state.glyph);
    const rows = [
      [..."あいうえお"],[..."かきくけこ"],[..."さしすせそ"],[..."たちつてと"],[..."なにぬねの"],
      [..."はひふへほ"],[..."まみむめも"],[..."やゆよ"],[..."らりるれろ"],[..."わゐゑをん"],
    ];
    const row = rows.find((r) => r.includes(entry?.kana)) ?? [];
    const availableFocused = [...new Set(glyphs.filter((g) => row.includes(g.kana)).map((g) => g.kana))]
      .filter((k) => k !== entry?.kana);
    const distractors = state.choices.filter((x) => x !== entry?.kana);
    const focusedCount = distractors.filter((x) => row.includes(x)).length;
    const expectedFocused = Math.min(3, availableFocused.length);
    if (state.hint !== "4択") add(390, "mastery30StillChoice", state);
    if (focusedCount !== expectedFocused) add(390, "mastery30FocusedRow", { state, expectedFocused, focusedCount, row });
    await context30.close();
  }

  // 65%: both reading and jibo switch to free input.
  {
    const context65 = await browser.newContext();
    await context65.addInitScript((events) => {
      localStorage.setItem("vintage-kana:learning-events:v1", JSON.stringify(events));
    }, sixtyFiveEvents);
    const page = await context65.newPage();
    await page.setViewportSize({ width: 390, height: 850 });
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator('[data-view="quiz"]').click();
    await page.waitForSelector("#quizFreeAnswer", { state: "visible" });
    await page.waitForFunction(() => document.querySelector("#quizFreeAnswer")?.hidden === false);
    const reading = await page.evaluate(() => ({
      hint: document.querySelector("#quizMethodHint")?.textContent?.trim(),
      placeholder: document.querySelector("#quizFreeInput")?.getAttribute("placeholder"),
      fontSize: getComputedStyle(document.querySelector("#quizFreeInput")).fontSize,
    }));
    if (reading.hint !== "入力" || reading.placeholder !== "読みを入力") add(390, "mastery65ReadingFreeInput", reading);
    if (Number.parseFloat(reading.fontSize) < 16) add(390, "freeInputNoIosZoom", reading.fontSize);

    await page.evaluate(() => {
      document.querySelector('[data-quiz-mode="jibo"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await page.waitForFunction(() => document.querySelector("#quizFreeInput")?.getAttribute("placeholder") === "字母を入力");
    const jibo = await page.evaluate(() => ({
      hint: document.querySelector("#quizMethodHint")?.textContent?.trim(),
      placeholder: document.querySelector("#quizFreeInput")?.getAttribute("placeholder"),
    }));
    if (jibo.hint !== "入力" || jibo.placeholder !== "字母を入力") add(390, "mastery65JiboFreeInput", jibo);
    await context65.close();
  }

  // Exact mastery progression contract: +20/day, cap65, cap90 same day, next-day +2.
  {
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.locator('[data-view="quiz"]').click();
    await page.waitForSelector(".choice", { state: "visible" });
    await page.waitForFunction(() => document.querySelectorAll(".choice").length === 4);
    const glyph = glyphs[0];
    const progression = await page.evaluate((g) => {
      const make = (day, method, count, prefix) => Array.from({ length: count }, (_, i) => ({
        id: `${prefix}-${day}-${i}`,
        at: `${day}T03:00:${String(i).padStart(2, "0")}Z`,
        localDate: day,
        setId: `${prefix}-set-${day}-${i}`,
        mode: "reading",
        masteryMethod: method,
        outcome: "correct",
        glyph: g.character,
        glyphId: g.glyph_id,
        kana: g.kana,
        jibo: g.jibo,
      }));
      learningEvents = [
        ...make("2026-09-15", "choice", 4, "a"),
        ...make("2026-09-16", "choice", 4, "b"),
        ...make("2026-09-17", "choice", 4, "c"),
        ...make("2026-09-18", "choice", 1, "d"),
      ];
      const at65 = computeGlyphMastery(g.character);
      learningEvents.push(
        ...make("2026-09-19", "free-input", 3, "e"),
        ...make("2026-09-20", "free-input", 1, "f"),
        ...make("2026-09-20", "free-input", 2, "g"),
      );
      const at90SameDay = computeGlyphMastery(g.character);
      learningEvents.push(...make("2026-09-21", "free-input", 1, "h"));
      const nextDay = computeGlyphMastery(g.character);
      return { at65, at90SameDay, nextDay };
    }, glyph);
    if (progression.at65 !== 65) add(390, "choiceCap65", progression);
    if (progression.at90SameDay !== 90) add(390, "sameDayStopsAt90", progression);
    if (progression.nextDay !== 92) add(390, "nextDayPlus2", progression);
    await page.close();
  }

  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

console.log(`check:vintage-kana: widths ${widths.join("/")}px, findings ${findings.length}`);
for (const finding of findings) console.log(JSON.stringify(finding));
if (findings.length) process.exitCode = 1;
