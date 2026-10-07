// The progress page: results by topic, weak exercises, streak.
import { count, type Score } from './progress.ts';
import type { CourseIndex, ExerciseMeta, Level, LessonMeta, ModuleMeta } from './types.ts';
import { day, pct } from './text.ts';

export interface Tally {
  ok: number;
  total: number;
}

/** One test (diagnostic or final) with its result per topic. */
export interface TestColumn {
  ex: ExerciseMeta;
  lesson: LessonMeta;
  taken: boolean;
  byTopic: Map<string, Tally>;
}

export interface TopicRow {
  module: ModuleMeta;
  tests: Tally[]; // aligned with the test columns; total 0 when not taken
  practice: Tally; // latest attempts at the module's own exercises
}

export interface TopicTable {
  level: Level;
  tests: TestColumn[];
  rows: TopicRow[];
}

/** Tests are exercises whose items name a topic. */
export const isTest = (ex: ExerciseMeta) => ex.topics.length > 0;

function testResult(ex: ExerciseMeta, lesson: LessonMeta, sc: Score | undefined): TestColumn {
  const t: TestColumn = { ex, lesson, taken: false, byTopic: new Map() };
  if (!sc || sc.last.length !== ex.topics.length) return t;
  t.taken = true;
  ex.topics.forEach((topic, i) => {
    const tl = t.byTopic.get(topic) ?? { ok: 0, total: 0 };
    tl.total++;
    if (sc.last[i]) tl.ok++;
    t.byTopic.set(topic, tl);
  });
  return t;
}

const exercisesOf = (c: CourseIndex, m: ModuleMeta) =>
  m.lessons.flatMap((id) => c.lessons[id]!.exercises.map((ex) => ({ ex, lesson: c.lessons[id]! })));

/** topicTable is the table of the level's topics: tests as columns, modules as rows. */
export function topicTable(c: CourseIndex, level: string, sc: Map<string, Score>): TopicTable | null {
  const mods = c.modules.filter((m) => m.level === level);
  const tests = mods.flatMap((m) =>
    exercisesOf(c, m)
      .filter(({ ex }) => isTest(ex))
      .map(({ ex, lesson }) => testResult(ex, lesson, sc.get(ex.id))),
  );
  const rows: TopicRow[] = [];
  for (const m of mods) {
    const own = exercisesOf(c, m);
    // Test modules are the columns, not rows.
    if (own.length > 0 && own.every(({ ex }) => isTest(ex))) continue;
    const practice: Tally = { ok: 0, total: 0 };
    for (const { ex } of own) {
      const s = sc.get(ex.id);
      if (isTest(ex) || !s) continue;
      practice.ok += count(s.last);
      practice.total += s.last.length;
    }
    // Every topic module is listed, untested ones with dashes: the table
    // doubles as the list of the level's topics.
    rows.push({ module: m, tests: tests.map((t) => t.byTopic.get(m.id) ?? { ok: 0, total: 0 }), practice });
  }
  if (rows.length === 0) return null;
  return { level: c.levels.find((l) => l.code === level)!, tests, rows };
}

export interface Weak {
  ex: ExerciseMeta;
  lesson: LessonMeta;
  pct: number;
}

/** weak lists up to six exercises of the level whose latest attempt had mistakes. */
export function weak(c: CourseIndex, level: string, sc: Map<string, Score>): Weak[] {
  const out: Weak[] = [];
  for (const m of c.modules) {
    if (m.level !== level) continue;
    for (const { ex, lesson } of exercisesOf(c, m)) {
      const s = sc.get(ex.id);
      if (isTest(ex) || !s || s.last.length === 0) continue;
      const p = pct(count(s.last), s.last.length);
      if (p < 100) out.push({ ex, lesson, pct: p });
    }
  }
  out.sort((a, b) => a.pct - b.pct || (a.ex.id < b.ex.id ? -1 : a.ex.id > b.ex.id ? 1 : 0));
  return out.slice(0, 6);
}

const addDays = (t: number, n: number) => {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
};

/** streak counts consecutive active days ending today, or yesterday when today has no activity yet. */
export function streak(active: Set<string>, now: number): number {
  let d = now;
  if (!active.has(day(d))) d = addDays(d, -1);
  let n = 0;
  while (active.has(day(d))) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export interface DayView {
  date: string;
  active: boolean;
  today: boolean;
}

export function lastDays(active: Set<string>, now: number, n: number): DayView[] {
  return Array.from({ length: n }, (_, i) => {
    const date = day(addDays(now, i - n + 1));
    return { date, active: active.has(date), today: i === n - 1 };
  });
}

export function exerciseCounts(c: CourseIndex, level: string, solved: Set<string>) {
  let total = 0;
  let done = 0;
  for (const m of c.modules) {
    if (m.level !== level) continue;
    for (const { ex } of exercisesOf(c, m)) {
      total++;
      if (solved.has(ex.id)) done++;
    }
  }
  return { total, done };
}
