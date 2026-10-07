import { expect, it } from 'vitest';
import { currentLevel, type LevelView } from './levels.ts';

const lv = (code: string, done: number, total: number) =>
  ({ level: { code, track: '', exam: '' }, modules: [], done, total, next: null }) as LevelView;

it.each([
  ['fresh start', [lv('b1', 0, 5), lv('b2', 0, 5)], 'b1'],
  ['working on the second', [lv('b1', 2, 5), lv('b2', 1, 5)], 'b2'],
  ['first finished', [lv('b1', 5, 5), lv('b2', 0, 5)], 'b2'],
  ['all finished', [lv('b1', 5, 5), lv('b2', 5, 5)], 'b1'],
])('%s', (_, lvs, want) => expect(currentLevel(lvs)?.level.code).toBe(want));
