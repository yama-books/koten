import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = readFileSync(path.join(root, 'checkpoint/keigo-assist/index.html'), 'utf8');

function openedPage() {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://yama-books.github.io/koten/checkpoint/keigo-assist/' });
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(script, 'single-file assistant must include its script');
  dom.window.eval(script[1]);
  const $ = (id: string) => dom.window.document.getElementById(id)!;
  return { dom, $ };
}

test('敬語訳アシストは注記・多段パネルを出さず質問を一つずつ表示する', () => {
  const { dom, $ } = openedPage();
  assert.equal($('candidateArea').hidden, false);
  assert.equal($('wizard').hidden, false);
  assert.equal($('summary').hidden, true);
  assert.equal($('stepCount').textContent, '1 / 3');
  assert.equal(dom.window.document.querySelectorAll('footer, aside, #export, #deeper-hint, #my-translation').length, 0);
  assert.ok($('candidates').querySelectorAll('button').length >= 2);
  dom.window.close();
});

test('場面→動作主→用法の回答で整理と訳のヒントへ進む', () => {
  const { dom, $ } = openedPage();
  const doc = dom.window.document;
  (doc.querySelector('[data-value="narration"]') as HTMLButtonElement).click();
  ($('next') as HTMLButtonElement).click();
  assert.match($('question').textContent || '', /動作/);
  const agent = $('answerInput') as HTMLInputElement;
  agent.value = '中宮';
  agent.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  ($('next') as HTMLButtonElement).click();
  assert.match($('question').textContent || '', /働き/);
  (doc.querySelector('[data-value="oosu-respect"]') as HTMLButtonElement).click();
  ($('next') as HTMLButtonElement).click();
  assert.equal($('summary').hidden, false);
  assert.equal($('wizard').hidden, true);
  assert.equal($('resultAgent').textContent, '中宮');
  assert.equal($('resultKind').textContent, '尊敬');
  assert.equal($('resultTarget').textContent, '中宮');
  assert.match($('hintText').textContent || '', /動作主|言葉|発している/);
  ($('editAnswers') as HTMLButtonElement).click();
  assert.equal($('wizard').hidden, false);
  dom.window.close();
});

test('選択範囲を手動追加でき、受け取った本文の選択語を優先する', () => {
  const { dom, $ } = openedPage();
  const textarea = $('passage') as HTMLTextAreaElement;
  const start = textarea.value.indexOf('女房');
  textarea.setSelectionRange(start, start + 2);
  ($('add-selection') as HTMLButtonElement).click();
  assert.equal($('wordLabel').textContent, '「女房」');
  const text = '帝、御覧じて、思し召す。';
  const s = text.indexOf('思し召す');
  dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
    source: dom.window,
    origin: dom.window.location.origin,
    data: { type: 'keigo-assist:load', payload: { text, selectedStart: s, selectedEnd: s + 4 } },
  }));
  assert.equal(textarea.value, text);
  assert.equal($('wordLabel').textContent, '「思し召す」');
  assert.equal($('stepCount').textContent, '1 / 3');
  dom.window.close();
});

test('謙譲用法なら相手を尋ね、回答後に敬意の方向を整理する', () => {
  const { dom, $ } = openedPage();
  ($('passage') as HTMLTextAreaElement).value = '宮に参る。';
  ($('analyze') as HTMLButtonElement).click();
  (dom.window.document.querySelector('[data-value="narration"]') as HTMLButtonElement).click();
  ($('next') as HTMLButtonElement).click();
  ($('answerInput') as HTMLInputElement).value = '女房';
  $('answerInput').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  ($('next') as HTMLButtonElement).click();
  (dom.window.document.querySelector('[data-value="mairu-humble-move"]') as HTMLButtonElement).click();
  assert.equal($('stepCount').textContent, '3 / 4');
  ($('next') as HTMLButtonElement).click();
  assert.match($('question').textContent || '', /誰に対して/);
  ($('answerInput') as HTMLInputElement).value = '宮';
  $('answerInput').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  ($('next') as HTMLButtonElement).click();
  assert.equal($('resultKind').textContent, '謙譲');
  assert.equal($('resultTarget').textContent, '宮');
  dom.window.close();
});
