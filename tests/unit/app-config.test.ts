import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { appConfig } from '../../packages/shared/src/app-config.ts';

test('P1: all feature flags remain disabled', () => {
  assert.ok(Object.values(appConfig.features).every((flag) => flag === false));
});

test('P1: product UI does not hard-code the provisional display name', () => {
  const uiRoots = ['hyakunin', 'kanazukai'].map((unit) => path.join('packages', unit, 'src', 'ui'));
  const visit = (directory: string): string[] => readdirSync(directory).flatMap((entry) => {
    const item = path.join(directory, entry);
    return statSync(item).isDirectory() ? visit(item) : [item];
  });
  for (const file of uiRoots.flatMap(visit)) assert.doesNotMatch(readFileSync(file, 'utf8'), /古典学習帳/);
});
