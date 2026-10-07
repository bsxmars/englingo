import { describe, expect, it } from 'vitest';
import {
  activeDays,
  cardState,
  emptyProgress,
  exerciseState,
  markLessonDone,
  newCardsSince,
  saveAttempt,
  saveCard,
  saveDraft,
  saveWriting,
  scores,
  solvedExercises,
} from './progress.ts';
import { Grade, review } from './srs.ts';
import { day } from './text.ts';

const now = Date.now();

it('marks a lesson done once', () => {
  const p = emptyProgress();
  markLessonDone(p, 'm/l', now);
  markLessonDone(p, 'm/l', now + 1000);
  expect(p.lessonsDone).toEqual({ 'm/l': now });
});

describe('exercise state', () => {
  it('starts empty', () => {
    expect(exerciseState(emptyProgress(), 'ex')).toEqual({ draft: '', attempts: 0, solved: false, best: 0, last: [] });
  });
  it('sums up attempts', () => {
    const p = emptyProgress();
    saveAttempt(p, { ex: 'ex-pp', answers: ['a', 'b'], results: [true, false], passed: false, at: now });
    saveAttempt(p, { ex: 'ex-pp', answers: ['a', 'c'], results: [true, true], passed: true, at: now });
    saveAttempt(p, { ex: 'ex-pp', answers: ['x', 'c'], results: [false, true], passed: false, at: now });
    expect(p.drafts['ex-pp']).toBe('["x","c"]');
    saveDraft(p, 'ex-pp', '["a",""]');
    expect(exerciseState(p, 'ex-pp')).toEqual({ draft: '["a",""]', attempts: 3, solved: true, best: 2, last: [false, true] });
    expect(scores(p).get('ex-pp')).toEqual({ attempts: 3, best: 2, last: [false, true] });
  });
});

it('counts a submitted writing as solved', () => {
  const p = emptyProgress();
  const at = 1_700_000_000_000;
  saveWriting(p, { ex: 'w1', text: 'Cher Sam, ...', words: 150, checked: [true, false], at });
  expect(solvedExercises(p).has('w1')).toBe(true);
  const st = exerciseState(p, 'w1');
  expect([st.solved, st.attempts, st.draft]).toEqual([true, 1, 'Cher Sam, ...']);
  expect([...activeDays(p)]).toEqual([day(at)]);
});

it('keeps the first review time of a card', () => {
  const p = emptyProgress();
  const st = cardState(p, 'c1');
  expect([st.ease, st.reps]).toEqual([2.5, 0]);
  const t0 = 1_700_000_000_000;
  const next = review(st, Grade.Good, t0);
  saveCard(p, 'c1', next, Grade.Good, t0);
  expect(cardState(p, 'c1')).toEqual(next);
  const t1 = t0 + 86_400_000;
  saveCard(p, 'c1', review(next, Grade.Good, t1), Grade.Good, t1);
  expect(newCardsSince(p, t0)).toBe(1);
  expect(newCardsSince(p, t0 + 1000)).toBe(0);
  expect(p.reviews).toHaveLength(2);
});
