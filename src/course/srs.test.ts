import { expect, it } from 'vitest';
import { Grade, newCard, review } from './srs.ts';

const now = new Date(2026, 0, 1, 12).getTime();

it('grows intervals and resets on a lapse', () => {
  let s = newCard();
  const steps: [Grade, number][] = [
    [Grade.Good, 1],
    [Grade.Good, 6],
    [Grade.Good, 15], // 6 * 2.5
    [Grade.Again, 0],
    [Grade.Good, 1],
  ];
  for (const [g, interval] of steps) {
    s = review(s, g, now);
    expect(s.interval).toBe(interval);
  }
  expect(s.ease).toBeLessThan(2.5);
});

it('keeps ease at 1.3 or more', () => {
  let s = newCard();
  for (let i = 0; i < 20; i++) s = review(s, Grade.Again, now);
  expect(s.ease).toBe(1.3);
});

it('brings a forgotten card back within the hour', () => {
  expect(review(newCard(), Grade.Again, now).due).toBeLessThan(now + 3_600_000);
});

it('schedules by calendar days', () => {
  expect(new Date(review(newCard(), Grade.Good, now).due).getDate()).toBe(2);
});
