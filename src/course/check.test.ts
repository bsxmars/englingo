import { describe, expect, it } from 'vitest';
import { choice, text } from './check.ts';

describe('text', () => {
  const cases: [string, string[], boolean][] = [
    ['have lived', ['have lived'], true],
    ['  Have   Lived ', ['have lived'], true],
    ["'ve lived", ['have lived'], true],
    ['I’ve lived here.', ['I have lived here'], true],
    ["I haven't seen him", ['I have not seen him'], true],
    ["I can't swim", ['I cannot swim'], true],
    ['I can not swim', ["I can't swim"], true],
    ["won't", ['will not'], true],
    ["I'd gone", ['I had gone'], true],
    ["I'd go", ['I would go'], true],
    ['I had gone', ["I'd gone"], true],
    ['Although it rained we went out', ['Although it rained, we went out.'], true],
    ['Is she coming?', ['is she coming'], true],
    ['lived', ['have lived'], false],
    ['has lived', ['have lived', 'have been living'], false],
    ['have been living', ['have lived', 'have been living'], true],
    ['', ['have lived'], false],
    ['its', ["it's"], false],
    ["it's raining", ['it is raining'], true],
    ['It has been raining', ["It's been raining"], true],
    ["there's no point", ['there is no point'], true],
    ["that's what I said", ['That is what I said.'], true],
    ["She's left", ['she has left'], true],
    ["John's car", ['John is car'], false],
    ["Who'd have thought", ['who would have thought'], true],
    ['“Yes”', ['yes'], true],
  ];
  for (const [given, answers, want] of cases) {
    it(`${JSON.stringify(given)} vs ${JSON.stringify(answers)}`, () => expect(text(given, answers)).toBe(want));
  }
});

it('choice', () => {
  expect(choice('2', 2) && choice(' 0 ', 0)).toBe(true);
  expect(choice('1', 2) || choice('', 0) || choice('x', 0)).toBe(false);
});
