import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../conj/index.html', import.meta.url), 'utf8');
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
assert.ok(styleMatch);
const css = styleMatch[1];
const rootMatch = css.match(/:root\{([\s\S]*?)\n\}/);
assert.ok(rootMatch);
const root = rootMatch[1];

function token(name: string) {
  const escaped = name.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const match = root.match(new RegExp(escaped + ':([^;]+);'));
  assert.ok(match, name);
  return match[1].trim();
}

test('conj: semantic color foundation preserves the current default palette', () => {
  const expected: Record<string, string> = {
    '--bg': '#f7fbfa',
    '--card': '#ffffff',
    '--ink': '#2c3b38',
    '--muted': '#6d7f7a',
    '--line': '#dceae6',
    '--line-strong': '#bfd5cf',
    '--accent': '#6fa696',
    '--accent-strong': '#477d70',
    '--on-accent': '#fff',
    '--page-glow-mint': 'rgba(210,241,233,.62)',
    '--page-glow-sky': 'rgba(226,236,250,.48)',
    '--surface-toolbar': 'rgba(255,255,255,.88)',
    '--surface-table-subrow': '#f4faf8',
    '--surface-table-heading': '#f1f8f5',
    '--surface-cell': '#fbfefd',
    '--surface-cell-hover': '#eef9f5',
    '--surface-cell-selected': '#e8f7f2',
    '--surface-control-hover': '#f2faf7',
    '--surface-helper': '#f3faf8',
    '--surface-record-card': '#fcfcfb',
    '--surface-record-stat': '#fbfcfc',
    '--surface-record-empty': '#f2f5f6',
    '--surface-record-points': '#eef3f6',
    '--surface-review-rate': '#f8eff2',
    '--surface-review-hover': '#f5f7f7',
    '--card-gradient-end': '#fdfefd',
    '--text-tag': '#50776d',
    '--text-zero': '#84938f',
    '--text-helper': '#506c65',
    '--text-review-rate': '#825d69',
    '--text-record-heading': '#304b45',
    '--text-table-heading': '#334d47',
    '--border-blank': '#abc9c0',
    '--border-blank-filled': '#c8ddd7',
    '--border-editor': '#8fb8ad',
    '--border-helper': '#b8d5cd',
    '--border-record-points': '#d2dfe5',
    '--border-record-card': '#e0e5e7',
    '--border-review-rate': '#ead9df',
    '--border-hover': '#9fc4b9',
    '--highlight-example': 'rgba(142,211,191,.36)',
    '--focus-ring': 'rgba(111,166,150,.16)',
    '--focus-ring-strong': 'rgba(111,166,150,.24)',
    '--overlay-source': 'rgba(0,0,0,.35)',
    '--overlay-review': 'rgba(29,45,42,.5)',
    '--record-glow-sky': 'rgba(220,231,238,.5)',
    '--record-glow-mint': 'rgba(222,237,234,.44)',
  };
  for (const [name, value] of Object.entries(expected)) assert.equal(token(name), value, name);
});

test('conj: themed UI colors use variables while donut and POS colors remain fixed', () => {
  assert.match(css, /body\{background:[\s\S]*?var\(--page-glow-mint\)[\s\S]*?var\(--page-glow-sky\)/);
  assert.match(css, /td\.editable:hover\{background:var\(--surface-cell-hover\)\}/);
  assert.match(css, /td\.selected\{background:var\(--surface-cell-selected\)\}/);
  assert.match(css, /\.review-rate\{[\s\S]*?border-color:var\(--border-review-rate\);[\s\S]*?background:var\(--surface-review-rate\);/);

  assert.match(css, /--record-verb:#935568/);
  assert.match(css, /--record-adj:#b77d55/);
  assert.match(css, /--record-adjv:#39756f/);
  assert.match(css, /--record-aux:#3d566b/);
  assert.match(css, /--record-empty:#e8eef1/);
  assert.match(css, /\.record-donut\{[\s\S]*?background:#e7f1ee;[\s\S]*?rgba\(62,107,96,\.06\)/);
  assert.match(css, /\.breakdown-dot\{[\s\S]*?rgba\(255,255,255,\.9\)/);
});

test('conj: non-fixed CSS no longer carries theme color literals outside :root', () => {
  const scrubbed = css
    .replace(/:root\{[\s\S]*?\n\}/, '')
    .replace(/\.record-donut\{[\s\S]*?\n\}/g, '')
    .replace(/\.breakdown-dot\{[\s\S]*?\n\}/g, '')
    .replace(/\s*--record-(?:verb|adj|adjv|aux|empty):#[0-9a-fA-F]+;/g, '');
  assert.doesNotMatch(scrubbed, /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/);
});

test('conj: work2 keeps v46 record readability guards and the fixed browser theme fallback', () => {
  assert.match(css, /\/\* ===== v46: record layout readability guard ===== \*\//);
  assert.match(css, /@media\(max-width:460px\)\{[\s\S]*?\.record-review\{grid-template-columns:1fr\}/);
  assert.match(css, /\.review-kind-line strong\{[\s\S]*?white-space:nowrap;/);
  assert.match(html, /<meta name="theme-color" content="#f7fbfa">/);
});
