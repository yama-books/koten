import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { pagesFiles, staticApps } from '../../tools/pages-assemble/index.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (name: string) => readFileSync(path.join(root, name), 'utf8');

test('敬語訳アシストは予習ノートから2経路で開ける', () => {
  const html = read('checkpoint/index.html');
  const ui = read('checkpoint/ui2.js');
  const integration = read('checkpoint/keigo-integration.js');
  assert.match(html, /id="openKeigo"/);
  assert.match(html, /id="openKeigoFromPoint"/);
  assert.match(html, /id="keigoDialog"[^>]*aria-modal="true"/);
  assert.match(html, /id="keigoFrame"[^>]*title="敬語訳アシスト"/);
  assert.match(html, /src="keigo-integration\.js"/);
  assert.match(ui, /openKeigoFromPoint"\)\.hidden\s*=\s*h\.type\s*!==\s*"honorific"/);
  assert.match(integration, /currentPoint\(\)/);
  assert.match(integration, /input\.selectionStart/);
  assert.match(integration, /input\.selectionEnd/);
  new Script(integration, { filename: 'checkpoint/keigo-integration.js' });
});

test('本文受け渡しは同一オリジンのmessageで行い、URLに本文を埋めない', () => {
  const integration = read('checkpoint/keigo-integration.js');
  const assistant = read('checkpoint/keigo-assist/index.html');
  assert.match(integration, /type:\s*"keigo-assist:load"/);
  assert.match(integration, /payload:\s*pending/);
  assert.match(integration, /window\.location\.origin/);
  assert.match(integration, /rangeOrNull\(h\.start,\s*h\.end/);
  assert.match(integration, /MAX_PASSAGE_LENGTH = 10000/);
  assert.doesNotMatch(integration, /URLSearchParams|encodeURIComponent|localStorage/);
  assert.match(assistant, /event\.origin!==window\.location\.origin/);
  assert.match(assistant, /event\.source!==window\.parent/);
  assert.match(assistant, /event\.data\?\.type!=='keigo-assist:load'/);
  assert.match(assistant, /typeof p\.text!=='string'\|\|p\.text\.length>10000/);
  assert.match(assistant, /selectedStart/);
  assert.match(assistant, /selectedEnd/);
});

test('Pages 配信には敬語訳アシスト本体と連携スクリプトを含む', () => {
  const app = staticApps.find(x => x.dir === 'checkpoint');
  assert.ok(app);
  const published = new Set(pagesFiles(app));
  assert.ok(published.has('keigo-assist/index.html'));
  assert.ok(published.has('keigo-integration.js'));
  assert.ok(published.has('index.html'));
});

test('Pages は main 以外から公開できない', () => {
  const workflow = read('.github/workflows/deploy-pages.yml');
  assert.match(workflow, /branches: \[main\]/);
  assert.ok((workflow.match(/if: github\.ref == 'refs\/heads\/main'/g) ?? []).length >= 2,
    'build と deploy の両方に main 制限が必要');
  assert.match(workflow, /  deploy:\n[\s\S]*?    permissions:\n      contents: read\n      pages: write\n      id-token: write/);
  assert.doesNotMatch(workflow.split('  build:')[0], /pages: write/);
});
