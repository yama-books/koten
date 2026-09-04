import test from 'node:test';
import assert from 'node:assert/strict';
import { masteryDisplay } from '../../../packages/shared/src/domain/mastery/color.ts';

test('color: 境界ちょうどをgray/red/yellow/blue/greenへ固定する', () => {
  assert.deepEqual(masteryDisplay(0), { percent: 0, color: 'gray', description: '習熟度 0%' });
  assert.equal(masteryDisplay(1).color, 'red');
  assert.equal(masteryDisplay(29).color, 'red');
  assert.equal(masteryDisplay(30).color, 'yellow');
  assert.equal(masteryDisplay(59).color, 'yellow');
  assert.equal(masteryDisplay(60).color, 'blue');
  assert.equal(masteryDisplay(84).color, 'blue');
  assert.equal(masteryDisplay(85).color, 'green');
  assert.equal(masteryDisplay(100).color, 'green');
});
