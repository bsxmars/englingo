// The learner's progress, loaded from IndexedDB once and kept in memory.
// Every change updates memory first, so the page reacts at once, then
// writes the record.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import course from 'virtual:course';
import * as P from '../course/progress.ts';
import type { CardState } from '../course/srs.ts';
import * as db from './db.ts';

export const useProgress = defineStore('progress', () => {
  const data = ref<P.ProgressData>(P.emptyProgress());
  const ready = ref(false);
  const error = ref('');

  async function load() {
    try {
      data.value = await db.loadProgress();
    } catch (e) {
      // Private mode or blocked storage: the course still works, progress lasts until the tab closes.
      error.value = (e as Error).message || String(e);
    }
    ready.value = true;
    void db.persist();
  }

  const done = computed(() => new Set(Object.keys(data.value.lessonsDone)));
  const solved = computed(() => P.solvedExercises(data.value));
  const scores = computed(() => P.scores(data.value));

  const save = (p: Promise<unknown>) =>
    p.catch((e) => {
      error.value = (e as Error).message || String(e);
    });

  return {
    data,
    ready,
    error,
    load,
    done,
    solved,
    scores,
    exercise: (id: string) => P.exerciseState(data.value, id),

    /** Resolves once written: callers navigate away right after. */
    async markLessonDone(id: string) {
      if (!course.lessons[id]) return;
      const at = P.markLessonDone(data.value, id, Date.now());
      await save(db.putLesson(id, at));
    },
    saveAttempt(ex: string, answers: string[], results: boolean[], passed: boolean) {
      const a = P.saveAttempt(data.value, { ex, answers, results, passed, at: Date.now() });
      void save(Promise.all([db.addAttempt(a), db.putDraft(ex, data.value.drafts[ex]!)]));
    },
    saveDraft(ex: string, text: string) {
      if (data.value.drafts[ex] === text) return;
      P.saveDraft(data.value, ex, text);
      void save(db.putDraft(ex, text));
    },
    async saveWriting(ex: string, text: string, words: number, checked: boolean[]) {
      const w = P.saveWriting(data.value, { ex, text, words, checked, at: Date.now() });
      await save(
        db.addWriting({ ...w }).then((id) => {
          w.id = id;
        }),
      );
      void save(db.putDraft(ex, text));
    },
    card: (id: string) => P.cardState(data.value, id),
    saveCard(id: string, st: CardState, grade: number) {
      const [card, review] = P.saveCard(data.value, id, st, grade, Date.now());
      void save(db.saveReview(card, review));
    },

    exportFile: () => JSON.stringify(db.toFile(data.value), null, 1),
    async importFile(text: string) {
      const p = db.fromFile(text);
      await db.replaceProgress(p);
      data.value = p;
    },
  };
});
