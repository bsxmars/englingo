// The course map as the learner sees it: levels, modules and lessons with progress.
import type { CourseIndex, Level, LessonMeta, ModuleMeta } from './types.ts';

export interface LessonView {
  lesson: LessonMeta;
  done: boolean;
  solved: number;
  exerciseTotal: number;
}

export interface ModuleView {
  module: ModuleMeta;
  lessons: LessonView[];
  done: number;
  total: number;
}

export interface LevelView {
  level: Level;
  modules: ModuleView[];
  done: number;
  total: number;
  next: LessonMeta | null; // first unfinished lesson of the level
}

export function modules(c: CourseIndex, done: Set<string>, solved: Set<string>): ModuleView[] {
  return c.modules.map((m) => {
    const lessons = m.lessons.map((id) => {
      const l = c.lessons[id]!;
      return {
        lesson: l,
        done: done.has(id),
        solved: l.exercises.filter((ex) => solved.has(ex.id)).length,
        exerciseTotal: l.exercises.length,
      };
    });
    return { module: m, lessons, done: lessons.filter((l) => l.done).length, total: lessons.length };
  });
}

/** levels groups modules by level, in course order. */
export function levels(c: CourseIndex, done: Set<string>, solved: Set<string>): LevelView[] {
  const out: LevelView[] = [];
  for (const m of modules(c, done, solved)) {
    let lv = out.at(-1);
    if (!lv || lv.level.code !== m.module.level) {
      lv = { level: c.levels.find((l) => l.code === m.module.level)!, modules: [], done: 0, total: 0, next: null };
      out.push(lv);
    }
    lv.modules.push(m);
    lv.done += m.done;
    lv.total += m.total;
    lv.next ??= m.lessons.find((l) => !l.done)?.lesson ?? null;
  }
  return out;
}

/** currentLevel is the level the learner is working on: the last one with
 * progress that is not finished yet, otherwise the first unfinished one. */
export function currentLevel(lvs: LevelView[]): LevelView | null {
  for (let i = lvs.length - 1; i >= 0; i--) {
    const lv = lvs[i]!;
    if (lv.done > 0 && lv.done < lv.total) return lv;
  }
  return lvs.find((lv) => lv.done < lv.total) ?? lvs[0] ?? null;
}

/** allSolved reports whether every exercise of the lesson has been solved at least once. */
export const allSolved = (l: LessonMeta, solved: Set<string>) => l.exercises.every((ex) => solved.has(ex.id));

/** levelOf is the level code of a lesson. */
export const levelOf = (c: CourseIndex, lessonID: string) =>
  c.modules.find((m) => m.id === c.lessons[lessonID]?.module)?.level ?? '';
