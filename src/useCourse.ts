// The course map with the learner's progress, and the level they are on.
import { computed } from 'vue';
import course from 'virtual:course';
import { currentLevel, levels } from './course/levels.ts';
import { usePrefs } from './stores/prefs.ts';
import { useProgress } from './stores/progress.ts';

export { course };

export const moduleOf = (lessonID: string) => course.modules.find((m) => m.id === course.lessons[lessonID]?.module)!;
export const levelInfo = (code: string) => course.levels.find((l) => l.code === code)!;

export function useCourse() {
  const progress = useProgress();
  const prefs = usePrefs();
  const lvs = computed(() => levels(course, progress.done, progress.solved));
  /** The level every page shows: the one picked in the header, or the one in progress. */
  const level = computed(() => lvs.value.find((l) => l.level.code === prefs.level) ?? currentLevel(lvs.value)!);
  return { course, levels: lvs, level };
}
