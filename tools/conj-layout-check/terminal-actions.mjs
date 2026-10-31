import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const root = path.resolve(import.meta.dirname, '../..');
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
  try {
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2' };
    res.setHeader('content-type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(await readFile(url.pathname.endsWith('/conj-quiz-ui.css') && process.env.CONJ_TERMINAL_BASELINE_CSS ? process.env.CONJ_TERMINAL_BASELINE_CSS : file));
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
let cases = 0;
try {
  browser = await (process.argv.includes('--webkit') ? webkit : chromium).launch({
    ...(process.env.CONJ_BROWSER_PATH ? { executablePath: process.env.CONJ_BROWSER_PATH } : {})
  });
  for (const viewport of [{width:375,height:667},{width:768,height:1024},{width:820,height:1180},{width:1024,height:768},{width:1180,height:820},{width:1440,height:900}]) {
    const page = await browser.newPage({ viewport, hasTouch: true });
    await page.addInitScript(() => localStorage.setItem('conjInstallNoticeDismissed', 'true'));
    await page.goto(`http://127.0.0.1:${server.address().port}/conj/`);
    await page.waitForFunction(() => !document.getElementById('quizMode').disabled);
    await page.evaluate(() => document.fonts.ready);
    for (const itemId of ['nu_verb', 'kanasi', 'itadura', 'beshi_aux']) {
      await page.evaluate(itemId => {
        document.getElementById('quizMode').value = 'lemma';
        const ex = quizMasterPractice.lemma.find(entry => entry.itemId === itemId);
        if (!ex) throw Error('Missing example: ' + itemId);
        current = {...ex.tableItem}; answers = {}; selected = null; answered = false; blankSlots = new Set();
        quizState = quizEngine.createQuizState({example:ex,quizMode:'lemma',choiceScope:'near',supportLevel:0,rowMode:'omitted'});
        quizState.masteryStage = 0; quizChoices = []; render();
      }, itemId);
      for (const state of ['question', 'hint', 'full', 'answer']) {
        await page.evaluate(state => {
          if (state === 'hint' || state === 'full') hintQuiz();
          if (state === 'answer') {
            document.getElementById('quizLemmaInput').value = lemmaHeadingText(current);
            gradeQuiz();
          }
        }, state);
        await page.waitForTimeout(120);
        const result = await page.evaluate(() => {
          const visible = el => {const r=el.getBoundingClientRect();return r.width && r.height;};
          const controls = [...document.querySelectorAll('.actions button')].filter(visible);
          const content = [...document.querySelectorAll('#quizAnswerPanel,#examplePanel,#tablePanel')].filter(visible);
          const overlaps = [];
          for(let i=0;i<content.length;i++) for(let j=i+1;j<content.length;j++) {
            const x=content[i].getBoundingClientRect(), y=content[j].getBoundingClientRect();
            if(x.left<y.right-1 && y.left<x.right-1 && x.top<y.bottom-1 && y.top<x.bottom-1) overlaps.push(content[i].id+'/'+content[j].id);
          }
          for (const a of content) for (const b of controls) {
            const x=a.getBoundingClientRect(), y=b.getBoundingClientRect();
            if (x.left<y.right-1 && y.left<x.right-1 && x.top<y.bottom-1 && y.top<x.bottom-1) overlaps.push(a.id+'/'+b.id);
          }
          const input=document.getElementById('quizAnswerPanel').getBoundingClientRect();
          const card=document.querySelector('main.card').getBoundingClientRect();
          return { overlaps, overflow:document.documentElement.scrollWidth>innerWidth+1,
            inputCenterOffset:Math.abs((input.left+input.right-card.left-card.right)/2),
            transform:document.querySelector('main.card .study-layout').style.transform,
            actionGap:document.querySelector('.actions').getBoundingClientRect().top-document.getElementById('quizAnswerPanel').getBoundingClientRect().bottom };
        });
        assert.deepEqual(result.overlaps, [], `${viewport.width}x${viewport.height} ${itemId} ${state}: content overlaps actions`);
        assert.equal(result.overflow, false, `${viewport.width}x${viewport.height} ${itemId} ${state}: horizontal overflow`);
        assert.ok(result.inputCenterOffset<5, `${viewport.width}x${viewport.height} ${itemId} ${state}: input must span the example/table columns and stay centered ${JSON.stringify(result)}`);
        if (!process.env.CONJ_TERMINAL_BASELINE_CSS) {
          assert.equal(result.transform, '', 'terminal input must remain in normal flow');
          assert.ok(result.actionGap>=12, `${viewport.width}x${viewport.height} ${itemId} ${state}: actions must leave space below the input and grade ${JSON.stringify(result)}`);
        }
        if (process.env.CONJ_TERMINAL_ARTIFACT_DIR && itemId==='nu_verb' && state==='hint') {
          await page.screenshot({path:path.join(process.env.CONJ_TERMINAL_ARTIFACT_DIR,`terminal-${viewport.width}.png`),fullPage:true});
        }
        cases++;
      }
    }
    console.log(`${viewport.width}x${viewport.height}: 16 terminal-form states passed`);
    await page.close();
  }
  console.log(`terminal-actions: ${cases} cases passed`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
