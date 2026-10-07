// Checking an exercise: every item, the score and whether it counts as solved.
import { choice, text } from './check.ts';
import type { Exercise } from './types.ts';

export interface ItemResult {
  ok: boolean;
  expected: string;
  explain: string;
}

export interface Graded {
  results: ItemResult[];
  oks: boolean[];
  score: number;
  total: number;
  passed: boolean;
}

/** grade checks answers (option indexes for choice items, text otherwise). */
export function grade(ex: Exercise, answers: string[]): Graded {
  if (answers.length !== ex.items.length) throw new Error(`want ${ex.items.length} answers, got ${answers.length}`);
  const results = ex.items.map((it, i) => {
    const given = answers[i]!;
    const ok = it.choice ? choice(given, it.answer) : text(given, it.answers);
    return { ok, expected: it.expected, explain: it.explain };
  });
  const oks = results.map((r) => r.ok);
  const score = oks.filter(Boolean).length;
  return { results, oks, score, total: ex.items.length, passed: score >= ex.pass };
}
